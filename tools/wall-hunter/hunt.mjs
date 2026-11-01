// Wall hunter: finds real (camera-made) cat photos on Wikimedia Commons that are CC0 or public domain,
// crops them to 16:9 around the cat, and saves them as the next public/assets/walls/wall-<n>.jpg.
//
//   npm run hunt                    # 50 new walls
//   npm run hunt -- --count 60      # 40…60 per run
//   npm run hunt -- --dry-run       # write to tools/wall-hunter/preview/ instead, touch nothing else
//   npm run hunt -- --drop 1150,1162  # didn't like some? removes them, closes the gaps, never fetches them again
//
// Every saved wall is recorded in sources.json (Commons page, author, license, crop): that is the
// proof each photo may be redistributed. Rejected files are remembered there too, so later runs skip them.

import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import sharp from 'sharp';

const here = (path) => fileURLToPath(new URL(path, import.meta.url));
const WALLS_DIR = here('../../public/assets/walls/');
const SLIDESHOW = here('../../src/app/slideshow.ts');
const SOURCES = here('./sources.json');
const PREVIEW = here('./preview/');

const API = 'https://commons.wikimedia.org/w/api.php';
// Wikimedia asks every client to say who it is and how to reach its owner.
const UA = 'CatsNonStopWallHunter/1.0 (https://catsnons.top; https://github.com/iamorlov/cats)';

/** JPEG, at least Full HD, no people tagged. */
const BASE = '-haswbstatement:P180=Q5 filemime:jpeg filew:>1919 fileh:>1079';
/** Tagged "depicts: house cat", or a cat word in the file name (plenty of cat photos carry no tags). */
const FINDERS = [
  'haswbstatement:P180=Q146',
  ...[
    'cat',
    'kitten',
    'katze',
    'kätzchen',
    'chaton',
    'gato',
    'gatito',
    'gatto',
    'kot',
    'kotek',
    'kedi',
    'кот',
    'кошка',
    '猫',
  ].map((word) => `intitle:${word}`),
];
/** CC0, or "copyright status: public domain" (narrowed to the author's own release in screen()). */
const LICENSES = ['haswbstatement:P275=Q6938433', 'haswbstatement:P6216=Q19652'];
/** Variety: the rest of a prolific author's photos wait for the next run. */
const PER_AUTHOR = 2;

const OUT_W = 1920;
const OUT_H = 1080;
const RATIO = OUT_W / OUT_H;
const JPEG = { quality: 90, mozjpeg: true }; // visually lossless; the existing walls average ~q85

// Calibrated on the 1131 hand-picked walls: each limit sits at about their worst 5 %.
export const LIMITS = {
  cut: 0.6, // detail density in the cropped-off strips vs the kept frame: higher means the cat gets cut
  sharpness: 400, // Laplacian variance of the sharpest tile: below this nothing is in focus
  isolation: 4.5, // sharpest tile vs the median one: a sharp cat on a soft background, not sharp clutter
  lumaMin: 30,
  lumaMax: 205,
  blown: 0.04, // share of pure-white pixels (pure black is fine: studio shots on black are some of the best walls)
  colorfulness: 10, // black-and-white and sepia scans score ~0
  duplicate: 8, // dHash Hamming distance at or under which two pictures are the same photo
};

/** A cat word in the file name, in the languages Commons uploads mostly come in: the cat is the subject. */
export const CAT_TITLE =
  /\b(cats?|kittens?|kitty|kitties|katzen?|kätzchen|kater|mieze|chats?|chatons?|minou|gat[oa]s?|gatit[oa]s?|gatt[oi]|gattin[oi]|kot(ek|y|ka)?|ko[cč]ka|kocour|ma[cč]ka|ma[cč]ak|kedi\w*|kissa\w*|katt(en|unge)?|kat|poes|pusa|kucing|m[eè]o|felis|macska|pisic\w*)\b|кот(ик|ён|ята|ы|а)?(?![а-яё])|кошк|котён|кіт|кішк|кошен|猫|ねこ|ネコ|고양이|گربه|قطة|قطط|חתול|γάτ|बिल्ली|แมว/iu;

/** Things called "cat" that are not a house cat, or not alive. */
export const NOT_A_HOUSE_CAT =
  /wild ?cat|wildkatze|lynx|bobcat|ringtail|civet|leopard|tiger|lion|cheetah|serval|caracal|ocelot|margay|puma|cougar|jaguar|manul|pallas|sno-?cat|catfish|catamaran|caterpillar|cat (ba|island|bay)|skull|skeleton|mummy|statue|sculpture|figurine|plush|toy\b|robot/i;

/** Some category about cats: the photo is filed as a cat photo, not just named like one. */
export const CAT_CATEGORY =
  /\bcats\b|\bkittens\b|felis (silvestris )?catus|\bkatzen\b|\bchats\b|\bgat[oi]s?\b|\bkoty\b|\bkediler\b/i;

/**
 * Interchangeable-lens and premium cameras, by EXIF model. Measured on Commons: these give the sharp
 * cat on a soft background the existing walls have; phones and point-and-shoots give street snapshots.
 */
export const GOOD_CAMERA =
  /\bEOS\b|NIKON (D\d|Z ?\d|Df)|\b(ILCE|ILCA|SLT|NEX)-|DSLR-A|DSC-RX|\bX-(T|H|Pro|E|S|M|A)\d|X100|GFX|\bE-(M|P|PL)\d|\bOM-\d|\bE-\d{1,3}\b|DMC-(G|GH|GX|GF|FZ[12]000|LX100)|DC-(G|GH|GX|S)\d|PENTAX K|LEICA|SIGMA (fp|sd)/i;

/** Categories that mean "not a clean, real, pleasant cat photo" or "licence in doubt". */
export const BLOCKED =
  /watermark|with borders|border removal|remove border|ai-generated|artificial intelligence|midjourney|dall-e|stable diffusion|low quality|blurr|out of focus|deletion|copyright violation|missing permission|without (a )?source|license review needed|unverified|artwork|museum|painting|drawing|illustration|prints? by|engraving|caricature|cartoon|sculpture|statue|figurine|plush|in art\b|logo|poster|postcard|stamp|collage|montage|meme|screenshot|x-ray|dead|injur|wound|sick|disease|surgery|veterinar|necropsy|taxiderm|skeleton|roadkill|personality rights/i;

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

async function main() {
  const { values } = parseArgs({
    options: {
      count: { type: 'string', default: '50' },
      'dry-run': { type: 'boolean', default: false },
      drop: { type: 'string' },
    },
  });
  const sources = existsSync(SOURCES)
    ? JSON.parse(await readFile(SOURCES, 'utf8'))
    : { walls: {}, rejected: {}, hashes: {} };
  if (values.drop) return drop(values.drop.split(',').map(Number), sources);

  const count = Number(values.count);
  if (!Number.isInteger(count) || count < 40 || count > 60)
    throw new Error('--count must be 40…60');
  const dryRun = values['dry-run'];

  const known = new Set([
    ...Object.values(sources.walls).map((w) => String(w.pageid)),
    ...Object.keys(sources.rejected),
  ]);

  const files = (await readdir(WALLS_DIR)).filter((f) => /^wall-\d+\.jpg$/.test(f));
  let next = Math.max(-1, ...files.map((f) => Number(f.match(/\d+/)[0]))) + 1;
  if (next !== files.length)
    throw new Error(`walls are not numbered 0…${files.length - 1} without gaps`);
  const hashes = await wallHashes(files, sources.hashes);

  const outDir = dryRun ? PREVIEW : WALLS_DIR;
  if (dryRun) {
    await rm(PREVIEW, { recursive: true, force: true });
    await mkdir(PREVIEW, { recursive: true });
  }

  console.log('Asking Commons for CC0 / public-domain cat photos…');
  const pool = (await search()).filter((p) => !known.has(String(p.pageid)));
  const stats = {};
  const reject = (page, reason) => {
    stats[reason] = (stats[reason] ?? 0) + 1;
    sources.rejected[page.pageid] = reason;
  };
  const queue = [];
  for (const page of pool) {
    const reason = screen(page);
    if (reason) reject(page, reason);
    else queue.push(page);
  }
  queue.sort((a, b) => rank(b) - rank(a));
  console.log(`${pool.length} new on Commons, ${queue.length} pass the metadata checks`);

  const saved = [];
  const byAuthor = new Map();
  const seriesTaken = new Set();
  // ponytail: one candidate at a time keeps Commons happy; ~2–4 s each, fine for a manual run.
  for (const page of queue) {
    if (saved.length === count) break;
    if ((byAuthor.get(author(page)) ?? 0) >= PER_AUTHOR || seriesTaken.has(series(page))) continue;
    const info = page.imageinfo[0];
    let verdict;
    let jpeg;
    try {
      verdict = await analyze(await download(info.thumburl), hashes);
      if (!verdict.reason) jpeg = await render(await download(info.url), verdict.crop);
    } catch (error) {
      console.warn(`  skip ${page.title}: ${error.message}`); // network trouble: try again next run
      continue;
    }
    if (verdict.reason) {
      reject(page, verdict.reason);
      continue;
    }
    const name = `wall-${next}.jpg`;
    await writeFile(join(outDir, name), jpeg);
    hashes.set(name, verdict.hash);
    byAuthor.set(author(page), (byAuthor.get(author(page)) ?? 0) + 1);
    seriesTaken.add(series(page));
    saved.push(name);
    if (!dryRun) {
      sources.walls[name] = provenance(page, verdict.crop);
      sources.hashes[name] = verdict.hash.toString(16);
    }
    next++;
    console.log(`  ${name}  ← ${page.title}  (${Math.round(jpeg.length / 1024)} KB)`);
  }

  if (saved.length)
    await contactSheet(
      saved.map((name) => join(outDir, name)),
      join(PREVIEW, '..', 'last-run.jpg'),
    );
  if (!dryRun) {
    await writeFile(SOURCES, JSON.stringify(sources, null, 2) + '\n');
    if (saved.length) await bumpWalls(next);
  }

  console.log(
    `\nSaved ${saved.length}/${count}${dryRun ? ' (dry run, in tools/wall-hunter/preview)' : ''}.`,
  );
  console.log(
    'Rejected:',
    Object.entries(stats)
      .sort((a, b) => b[1] - a[1])
      .map(([r, n]) => `${r} ${n}`)
      .join(', ') || 'none',
  );
  console.log('Look them over: tools/wall-hunter/last-run.jpg');
  if (saved.length < count) console.log('Commons ran out of fresh candidates for now.');
}

/** Every CC0 / public-domain match, with the metadata the checks need and a 960 px thumbnail URL. */
export async function search() {
  const pages = new Map();
  for (const license of LICENSES)
    for (const finder of FINDERS) {
      let more = {};
      do {
        const response = await api({
          generator: 'search',
          gsrnamespace: '6',
          gsrsearch: `${finder} ${license} ${BASE}`,
          gsrlimit: '50',
          prop: 'imageinfo',
          iiprop: 'url|size|commonmetadata|extmetadata',
          iiurlwidth: '960',
          iiextmetadatafilter: 'LicenseShortName|AttributionRequired|Artist|Categories',
          ...more,
        });
        for (const page of response.query?.pages ?? [])
          if (page.imageinfo) pages.set(page.pageid, page);
        more = response.continue;
      } while (more);
      process.stdout.write(`\r  ${pages.size} files found`);
    }
  process.stdout.write('\n');
  return [...pages.values()];
}

/** Cheap checks on metadata alone. Returns why a file is out, or null. */
export function screen(page) {
  const info = page.imageinfo[0];
  const ext = (key) => String(info.extmetadata?.[key]?.value ?? '');
  const categories = ext('Categories');
  const model = String((info.commonmetadata ?? []).find((m) => m.name === 'Model')?.value ?? '');
  // CC0, or public domain by the author's own release. Not "PD because old" or "PD-USGov":
  // those are public domain in some countries only.
  const license = ext('LicenseShortName');
  const free =
    /cc0/i.test(license) ||
    (/public domain/i.test(license) && /PD-(self|user|author)/i.test(categories));
  if (!free || ext('AttributionRequired') === 'true') return 'licence';
  if (info.width / info.height < 1.3) return 'not landscape';
  if (Math.min(info.width, info.height * RATIO) < OUT_W) return 'too small for 16:9';
  // Also proves a camera took it: scans, renders and AI pictures carry no camera model.
  if (!GOOD_CAMERA.test(model)) return 'not a system camera';
  if (
    !CAT_TITLE.test(page.title) ||
    NOT_A_HOUSE_CAT.test(page.title) ||
    !CAT_CATEGORY.test(categories)
  )
    return 'cat not the subject';
  if (BLOCKED.test(categories)) return 'category';
  return null;
}

/** "Feral cat 5.jpg" and "Feral cat 7.jpg", "Ada (1)" and "Ada (2)": one shoot, one wall per run. */
export function series(page) {
  return page.title
    .replace(/^File:|\.\w+$/g, '')
    .replace(/\(.*?\)|[\d_.,-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function author(page) {
  return String(page.imageinfo[0].extmetadata?.Artist?.value ?? '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/** Curated pictures first, then the most pixels (better cameras). */
function rank(page) {
  const info = page.imageinfo[0];
  const curated = /featured picture|quality image|valued image/i.test(
    String(info.extmetadata?.Categories?.value ?? ''),
  );
  return (curated ? 1e9 : 0) + info.width * info.height;
}

/**
 * Looks at the 960 px thumbnail: where to cut 16:9, and whether the result is sharp, well exposed,
 * colourful, frameless and new. Returns { crop, hash } or { reason }.
 */
export async function analyze(thumb, hashes = new Map()) {
  const { data: gray, info } = await sharp(thumb)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const tall = w / h < RATIO;
  const { rows, cols } = detail(gray, w, h);
  const span = tall ? Math.round(w / RATIO) : Math.round(h * RATIO);
  const { start, cut } = bestWindow(tall ? rows : cols, span);
  const box = tall
    ? { left: 0, top: start, width: w, height: span }
    : { left: start, top: 0, width: span, height: h };
  const crop = { x: box.left / w, y: box.top / h, w: box.width / w, h: box.height / h };

  const framed = sharp(thumb).extract(box).resize(960, 540, { fit: 'fill' });
  const rgb = await framed.clone().removeAlpha().raw().toBuffer();
  const luma = await framed.clone().greyscale().raw().toBuffer();
  const metrics = { cut, ...measure(rgb, luma, 960, 540) };
  const reason = verdict(metrics);
  if (reason) return { reason, metrics };

  const hash = await dhash(sharp(luma, { raw: { width: 960, height: 540, channels: 1 } }));
  for (const known of hashes.values())
    if (distance(hash, known) <= LIMITS.duplicate) return { reason: 'duplicate', metrics };
  return { crop, hash, metrics };
}

/** Why the picture falls short of the existing walls, or null. */
export function verdict(m) {
  if (m.cut > LIMITS.cut) return 'cat would be cut';
  if (m.sharpness < LIMITS.sharpness) return 'blurry';
  if (m.isolation < LIMITS.isolation) return 'busy background';
  if (m.luma < LIMITS.lumaMin) return 'too dark';
  if (m.luma > LIMITS.lumaMax) return 'too bright';
  if (m.blown > LIMITS.blown) return 'blown out';
  if (m.colorfulness < LIMITS.colorfulness) return 'no colour';
  if (m.framed) return 'frame or border';
  return null;
}

/** Per-row and per-column sums of |gradient|: where the in-focus detail is. Pet shots keep the pet sharp. */
function detail(gray, w, h) {
  const rows = new Float64Array(h);
  const cols = new Float64Array(w);
  for (let y = 1; y < h; y++) {
    for (let x = 1; x < w; x++) {
      const i = y * w + x;
      const g = Math.abs(gray[i] - gray[i - 1]) + Math.abs(gray[i] - gray[i - w]);
      rows[y] += g;
      cols[x] += g;
    }
  }
  return { rows, cols };
}

/**
 * The window of `size` holding the most detail, and how dense the detail left outside it is compared
 * with the detail kept (0 = only blur is cut off, 1 = we cut as much detail as we keep).
 */
export function bestWindow(energy, size) {
  let sum = 0;
  for (let i = 0; i < size; i++) sum += energy[i];
  let best = sum;
  let start = 0;
  for (let i = size; i < energy.length; i++) {
    sum += energy[i] - energy[i - size];
    if (sum > best) [best, start] = [sum, i - size + 1];
  }
  const outside = energy.length - size;
  if (!outside || !best) return { start, cut: 0 };
  const total = energy.reduce((a, b) => a + b, 0);
  return { start, cut: (total - best) / outside / (best / size) };
}

/** Sharpness, exposure and colourfulness of the 960×540 crop. */
export function measure(rgb, luma, w, h) {
  // Laplacian variance per tile, 6×4. The sharpest tile is the focus (a sharp cat on a soft background
  // still scores high); sharpest vs median says whether the subject stands out from its background.
  const tiles = [];
  const tw = Math.floor(w / 6);
  const th = Math.floor(h / 4);
  for (let ty = 0; ty < 4; ty++) {
    for (let tx = 0; tx < 6; tx++) {
      let s = 0;
      let s2 = 0;
      let n = 0;
      for (let y = ty * th + 1; y < (ty + 1) * th - 1; y++) {
        for (let x = tx * tw + 1; x < (tx + 1) * tw - 1; x++) {
          const i = y * w + x;
          const l = 4 * luma[i] - luma[i - 1] - luma[i + 1] - luma[i - w] - luma[i + w];
          s += l;
          s2 += l * l;
          n++;
        }
      }
      tiles.push(s2 / n - (s / n) ** 2);
    }
  }
  tiles.sort((a, b) => a - b);
  const sharpness = tiles[tiles.length - 1];
  const isolation = sharpness / Math.max(1, tiles[tiles.length >> 1]);

  let sum = 0;
  let blown = 0;
  for (const v of luma) {
    sum += v;
    if (v >= 250) blown++;
  }

  // Hasler & Süsstrunk colourfulness.
  let rg = 0,
    rg2 = 0,
    yb = 0,
    yb2 = 0;
  const n = rgb.length / 3;
  for (let i = 0; i < rgb.length; i += 3) {
    const a = rgb[i] - rgb[i + 1];
    const b = (rgb[i] + rgb[i + 1]) / 2 - rgb[i + 2];
    rg += a;
    rg2 += a * a;
    yb += b;
    yb2 += b * b;
  }
  const sd = (s, s2) => Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2));
  const colorfulness = Math.hypot(sd(rg, rg2), sd(yb, yb2)) + 0.3 * Math.hypot(rg / n, yb / n);

  return {
    sharpness,
    isolation,
    luma: sum / luma.length,
    blown: blown / luma.length,
    colorfulness,
    framed: framed(luma, w, h),
  };
}

/**
 * A frame or drop-shadow border: lines parallel to an edge that are each even along the whole edge,
 * then the picture starts with a jump in brightness from one line to the next. A studio black
 * background is even too, but the cat comes in gradually, never as a straight step.
 */
export function framed(luma, w, h) {
  const line = (side, depth) => {
    const along = side < 2 ? w : h;
    let s = 0,
      s2 = 0,
      k = 0;
    for (let t = Math.floor(along * 0.05); t < along * 0.95; t++) {
      const [x, y] = [
        [t, depth],
        [t, h - 1 - depth],
        [depth, t],
        [w - 1 - depth, t],
      ][side];
      const v = luma[y * w + x];
      s += v;
      s2 += v * v;
      k++;
    }
    return { mean: s / k, sd: Math.sqrt(Math.max(0, s2 / k - (s / k) ** 2)) };
  };
  for (let side = 0; side < 4; side++) {
    let previous = line(side, 0);
    if (previous.sd >= 7) continue; // the picture runs right to the edge
    for (let depth = 1; depth < 32; depth++) {
      const current = line(side, depth);
      if (current.sd >= 7) {
        if (depth >= 3 && Math.abs(current.mean - previous.mean) > 20) return true;
        break;
      }
      previous = current;
    }
  }
  return false;
}

/** 64-bit difference hash: survives resizing and recompression, so re-uploads and existing walls match. */
export async function dhash(image) {
  const px = await image.greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer();
  let hash = 0n;
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) hash = (hash << 1n) | BigInt(px[y * 9 + x] > px[y * 9 + x + 1]);
  return hash;
}

export function distance(a, b) {
  let x = a ^ b;
  let bits = 0;
  for (; x; x >>= 1n) bits += Number(x & 1n);
  return bits;
}

/** dHash of every wall on disk, cached in sources.json (the first run takes a minute). */
async function wallHashes(files, cache) {
  const hashes = new Map();
  for (const name of files) {
    cache[name] ??= (await dhash(sharp(join(WALLS_DIR, name)))).toString(16);
    hashes.set(name, BigInt('0x' + cache[name]));
  }
  return hashes;
}

/** Full-resolution original → the analysed 16:9 window → 1920×1080 JPEG. */
async function render(original, crop) {
  const meta = await sharp(original).metadata();
  const upright = (meta.orientation ?? 1) >= 5; // EXIF-rotated: width and height swap after rotate()
  const w = upright ? meta.height : meta.width;
  const h = upright ? meta.width : meta.height;
  const box = {
    left: Math.round(crop.x * w),
    top: Math.round(crop.y * h),
    width: Math.min(Math.round(crop.w * w), w - Math.round(crop.x * w)),
    height: Math.min(Math.round(crop.h * h), h - Math.round(crop.y * h)),
  };
  return sharp(original)
    .rotate()
    .extract(box)
    .resize(OUT_W, OUT_H, { fit: 'fill' })
    .jpeg(JPEG)
    .toBuffer();
}

function provenance(page, crop) {
  const info = page.imageinfo[0];
  const text = (key) =>
    String(info.extmetadata?.[key]?.value ?? '')
      .replace(/<[^>]+>/g, '')
      .trim();
  return {
    pageid: page.pageid,
    title: page.title,
    url: info.descriptionurl,
    license: text('LicenseShortName'),
    author: text('Artist'),
    original: `${info.width}x${info.height}`,
    crop: Object.fromEntries(Object.entries(crop).map(([k, v]) => [k, +v.toFixed(4)])),
    added: new Date().toISOString().slice(0, 10),
  };
}

/** Deletes walls by number, renumbers the later ones down so there are no gaps, and blocks the sources. */
async function drop(numbers, sources) {
  const total = (await readdir(WALLS_DIR)).filter((f) => /^wall-\d+\.jpg$/.test(f)).length;
  const gone = new Set(numbers);
  for (const n of gone) {
    if (!Number.isInteger(n) || n < 0 || n >= total) throw new Error(`no wall-${n}.jpg`);
    const name = `wall-${n}.jpg`;
    await rm(join(WALLS_DIR, name));
    const record = sources.walls[name];
    if (record) sources.rejected[record.pageid] = 'dropped by hand';
    delete sources.walls[name];
    delete sources.hashes[name];
  }
  let to = Math.min(...gone);
  for (let n = to; n < total; n++) {
    if (gone.has(n)) continue;
    const [from, name] = [`wall-${n}.jpg`, `wall-${to}.jpg`];
    await rename(join(WALLS_DIR, from), join(WALLS_DIR, name));
    for (const map of [sources.walls, sources.hashes]) {
      if (from in map) map[name] = map[from];
      delete map[from];
    }
    to++;
  }
  await writeFile(SOURCES, JSON.stringify(sources, null, 2) + '\n');
  await bumpWalls(to);
  console.log(`Dropped ${gone.size}; ${to} walls now.`);
}

/** The app only shows walls 0…WALLS-1, so the constant moves with the files. */
async function bumpWalls(total) {
  const source = await readFile(SLIDESHOW, 'utf8');
  const updated = source.replace(/export const WALLS = \d+;/, `export const WALLS = ${total};`);
  if (updated === source) throw new Error('WALLS constant not found in slideshow.ts');
  await writeFile(SLIDESHOW, updated);
}

/** One picture of the whole run, in numbering order, to eyeball before committing. */
async function contactSheet(paths, out) {
  const cols = 6;
  const [tw, th] = [320, 180];
  const tiles = await Promise.all(
    paths.map(async (path, i) => ({
      input: await sharp(path).resize(tw, th).toBuffer(),
      left: (i % cols) * tw,
      top: Math.floor(i / cols) * th,
    })),
  );
  const rows = Math.ceil(paths.length / cols);
  await sharp({ create: { width: cols * tw, height: rows * th, channels: 3, background: '#222' } })
    .composite(tiles)
    .jpeg({ quality: 80 })
    .toFile(out);
}

async function api(params) {
  const url = `${API}?${new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', maxlag: '5', ...params })}`;
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, { headers: { 'User-Agent': UA } });
    const body = response.ok ? await response.json() : null;
    if (body && !body.error) return body;
    if (attempt === 4)
      throw new Error(`Commons API ${response.status}: ${JSON.stringify(body?.error ?? '')}`);
    await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt)); // maxlag or rate limit: back off
  }
}

async function download(url) {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, { headers: { 'User-Agent': UA } });
    if (response.ok) return Buffer.from(await response.arrayBuffer());
    // Commons rate-limits media downloads: wait as long as it asks, then a bit longer each time.
    if (![429, 503].includes(response.status) || attempt === 4)
      throw new Error(`${response.status} ${url}`);
    const wait = Number(response.headers.get('retry-after')) || 5 * 2 ** attempt;
    console.warn(`  Commons asks to slow down, waiting ${wait} s…`);
    await new Promise((r) => setTimeout(r, wait * 1000));
  }
}
