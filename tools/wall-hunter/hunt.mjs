// Wall hunter: finds real cat photos on Wikimedia Commons, then iNaturalist, that are CC0, public
// domain or CC BY / BY-SA / BY-NC (credit travels inside the file, the site shows it) and shot 16:9
// or 3:2 at Full HD or more (3:2 loses 16 % of its height, never the part in focus), and saves them to
// tools/wall-hunter/preview/ under the names they will have in the project (wall-<next>.jpg). It
// never touches the project itself: you look the batch over, copy it into public/assets/walls and
// set WALLS by hand.
//
//   npm run hunt                 # a batch of 50 walls in preview/
//   npm run hunt -- --count 60   # 40…60 per batch
//
// Don't like some? Delete them from preview/ and run again: the rest is renumbered without gaps, the
// deleted ones never come back, and new photos fill the batch up again. Once the batch is copied
// into the project, the next run starts a new one.
//
// Every photo is recorded in sources.json (source page, author, licence, crop): the proof it may be
// redistributed. Rejected and never-copied ones are remembered there too, so later runs skip them.

import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import sharp from 'sharp';

const here = (path) => fileURLToPath(new URL(path, import.meta.url));
const WALLS_DIR = here('../../public/assets/walls/'); // read only
const SOURCES = here('./sources.json');
const PREVIEW = here('./preview/');
const LAST_RUN = here('./last-run.jpg'); // outside preview/, so it can't be copied in with the walls by accident

const API = 'https://commons.wikimedia.org/w/api.php';
// Wikimedia asks every client to say who it is and how to reach its owner.
const UA = 'CatsNonStopWallHunter/1.0 (https://catsnons.top; https://github.com/iamorlov/cats)';

/** JPEG, at least Full HD, no people tagged. */
const BASE = '-haswbstatement:P180=Q5 filemime:jpeg filew:>1919 fileh:>1079';
/**
 * Where to look, best first; a run stops as soon as it has enough. Cat photos the Commons community
 * rated "quality" or "featured", then everything tagged "depicts: house cat", then cat words in file
 * names (plenty of cat photos carry no tags).
 */
const FINDERS = [
  'haswbstatement:P180=Q146 incategory:Quality_images',
  'haswbstatement:P180=Q146 incategory:Featured_pictures_on_Wikimedia_Commons',
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
const INAT = 'https://api.inaturalist.org/v1/observations';
/**
 * House cats (Felis catus) on iNaturalist annotated alive: a tenth of the annotated ones are dead,
 * so unannotated ones can't be trusted. Newest first, 200 per request.
 */
const INAT_QUERY = {
  taxon_id: '118552',
  term_id: '17',
  term_value_id: '18',
  photo_license: 'cc0,cc-by,cc-by-sa,cc-by-nc,cc-by-nc-sa',
  order_by: 'id',
  order: 'desc',
  per_page: '200',
};
/**
 * iNaturalist licence codes and what the credit says (iNaturalist uses the 4.0 licences). The site is
 * personal and non-commercial, so NC fits; ND doesn't, a resize is a change.
 */
const INAT_LICENSES = {
  cc0: ['CC0 1.0', 'https://creativecommons.org/publicdomain/zero/1.0/'],
  'cc-by': ['CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/'],
  'cc-by-sa': ['CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/'],
  'cc-by-nc': ['CC BY-NC 4.0', 'https://creativecommons.org/licenses/by-nc/4.0/'],
  'cc-by-nc-sa': ['CC BY-NC-SA 4.0', 'https://creativecommons.org/licenses/by-nc-sa/4.0/'],
};

/** Marks the JPEG comment that carries a photo's credit to the site (read by src/app/slideshow.ts). */
const CREDIT_TAG = 'cats-credit ';
/** Variety: the rest of a prolific author's photos wait for the next run. */
const PER_AUTHOR = 2;

const OUT_W = 1920;
const OUT_H = 1080;
const RATIO = OUT_W / OUT_H;
const JPEG = { quality: 90, mozjpeg: true }; // visually lossless; the existing walls average ~q85

// Calibrated on the 1131 hand-picked walls: each limit sits at about their worst 5 %.
export const LIMITS = {
  sharpness: 400, // Laplacian variance of the sharpest tile: below this nothing is in focus
  isolation: 4.5, // sharpest tile vs the median one: a sharp cat on a soft background, not sharp clutter
  lumaMin: 30,
  lumaMax: 205,
  blown: 0.04, // share of pure-white pixels (pure black is fine: studio shots on black are some of the best walls)
  colorfulness: 10, // black-and-white and sepia scans score ~0
  focus: 0.31, // share of the frame in focus: above it, a cat somewhere in a sharp field (measured 2026-11-02)
  duplicate: 8, // dHash Hamming distance at or under which two pictures are the same photo
  subject: 0.2, // a tile with this share of the sharpest tile's detail is in focus: part of the cat
};

/** A cat word in the file name, in the languages Commons uploads mostly come in: the cat is the subject. */
export const CAT_TITLE =
  /\b(cats?|kittens?|kitty|kitties|katzen?|kätzchen|kater|mieze|chats?|chatons?|minou|gat[oa]s?|gatit[oa]s?|gatt[oi]|gattin[oi]|kot(ek|y|ka)?|ko[cč]ka|kocour|ma[cč]ka|ma[cč]ak|kedi\w*|kissa\w*|katt(en|unge)?|kat|poes|pusa|kucing|m[eè]o|felis|macska|pisic\w*)\b|кот(ик|ён|ята|ы|а)?(?![а-яё])|кошк|котён|кіт|кішк|кошен|猫|ねこ|ネコ|고양이|گربه|قطة|قطط|חתול|γάτ|बिल्ली|แมว/iu;

/**
 * Things called "cat" that are not a house cat or not alive, and titles where the cat is a prop:
 * "<gadget> with cat", "How to take your cat's blood pressure", or a dog in the frame ("Can e gato"
 * is Galician for "dog and cat").
 */
export const NOT_A_HOUSE_CAT =
  /wild ?cat|wildkatze|jungle cat|lynx|bobcat|ringtail|civet|leopard|tiger|lion|cheetah|serval|caracal|ocelot|margay|puma|cougar|jaguar|manul|pallas|sno-?cat|catfish|catamaran|caterpillar|cat (ba|island|bay)|skull|skeleton|mummy|statue|sculpture|figurine|plush|(toy|stuffed) (cat|kitten)|robot|\bwith (a |the |my )?(cat|kitten)\b|\bhow to\b|\b(dogs?|pupp(y|ies)|perros?|hunde?|chiens?|cane|can e)\b|собак/i;

/** A person named in the title: the people tag is often missing. */
export const PEOPLE =
  /\b(boys?|girls?|man|men|woman|women|child|children|kids?|bab(y|ies)|toddlers?|people|person|owners?|lady|family|hands?|arms|lap|holding|held|cuddl\w*|hug\w*|selfie|junge|mädchen|frau|mann|kinder?|niñ[oa]s?|mujer|hombre|garçon|fille|femme|homme|enfant)\b|мальчик|девоч|женщин|мужчин|ребён|ребен|дет(и|ей)|хозя/iu;

/** Some category about cats: the photo is filed as a cat photo, not just named like one. */
export const CAT_CATEGORY =
  /\bcats\b|\bkittens\b|felis (silvestris )?catus|\bkatzen\b|\bchats\b|\bgat[oi]s?\b|\bkoty\b|\bkediler\b/i;

/**
 * Interchangeable-lens and premium cameras, by EXIF model. Measured on Commons: these give the sharp
 * cat on a soft background the existing walls have; phones and point-and-shoots give street snapshots.
 */
export const GOOD_CAMERA =
  /\bEOS\b|NIKON (D\d|Z ?\d|Df)|\b(ILCE|ILCA|SLT|NEX)-|DSLR-A|DSC-RX|\bX-(T|H|Pro|E|S|M|A)\d|X100|GFX|\bE-(M|P|PL)\d|\bOM-\d|\bE-\d{1,3}\b|DMC-(G|GH|GX|GF|FZ[12]000|LX100)|DC-(G|GH|GX|S)\d|PENTAX K|LEICA|SIGMA (fp|sd)/i;

/**
 * Flagship phones from 2018 on: iPhone XS/XR/11+, Pixel 3+, Galaxy S9+/Note 9+ (SM- codes, or
 * "Galaxy S2x"), Huawei P30/P40/Mate 20-40. Older and budget phones stay out: noise and smeared detail.
 */
export const FLAGSHIP_PHONE =
  /iPhone (1\d|X[SR])|Pixel ([3-9]|1\d)|SM-(G9[6-9]|S9[0-3]|N9[6-8])\d|Galaxy S2\d|\b(ELE|VOG|ANA|ELS|LYA|LIO|NOH|NOP)-/i;

/** Categories that mean "not a clean, real, pleasant cat photo" or "licence in doubt". */
export const BLOCKED =
  /watermark|with borders|border removal|remove border|ai-generated|artificial intelligence|midjourney|dall-e|stable diffusion|low quality|blurr|out of focus|deletion|copyright violation|missing permission|without (a )?source|license review needed|unverified|artwork|museum|painting|drawing|illustration|prints? by|engraving|caricature|cartoon|sculpture|statue|figurine|plush|in art\b|logo|poster|postcard|stamp|collage|montage|meme|screenshot|x-ray|dead|injur|wound|sick|disease|surgery|veterinar|necropsy|taxiderm|skeleton|roadkill|personality rights/i;

async function main() {
  const { values } = parseArgs({ options: { count: { type: 'string', default: '50' } } });
  const sources = existsSync(SOURCES)
    ? JSON.parse(await readFile(SOURCES, 'utf8'))
    : { walls: {}, rejected: {}, hashes: {} };
  await mkdir(PREVIEW, { recursive: true });

  const count = Number(values.count);
  if (!Number.isInteger(count) || count < 40 || count > 60)
    throw new Error('--count must be 40…60');

  const site = await numbers(WALLS_DIR);
  if (site.length && site.at(-1) !== site.length - 1)
    throw new Error(`public/assets/walls is not numbered 0…${site.length - 1} without gaps`);

  // Where the last batch stands. All copied into the project: done, start a new one. None copied:
  // still under review, so close the gaps deletions left and fill it up. Some copied: names may not
  // move, ask.
  const inPreview = await numbers(PREVIEW);
  const pending = [];
  for (const n of inPreview) {
    const [mine, theirs] = [join(PREVIEW, `wall-${n}.jpg`), join(WALLS_DIR, `wall-${n}.jpg`)];
    if (!existsSync(theirs) || !(await readFile(mine)).equals(await readFile(theirs)))
      pending.push(n);
  }
  if (pending.length && pending.length < inPreview.length)
    throw new Error(
      'Part of the batch in tools/wall-hunter/preview is already in public/assets/walls and part is not.\n' +
        'Copy the rest too, then run again.',
    );
  let kept = [];
  let deleted = 0;
  if (pending.length) ({ kept, deleted } = await renumber(sources, site.length));
  else {
    await rm(PREVIEW, { recursive: true, force: true });
    await mkdir(PREVIEW);
    forgetUncopied(sources);
  }

  const known = new Set([
    ...Object.values(sources.walls).map(keyOf),
    ...Object.keys(sources.rejected),
  ]);
  let next = site.length + kept.length;
  const hashes = await wallHashes(site, sources.hashes);
  for (const name of kept) {
    sources.hashes[name] ??= (await dhash(sharp(join(PREVIEW, name)))).toString(16);
    hashes.set(name, BigInt('0x' + sources.hashes[name])); // no duplicates of the kept ones either
  }
  if (kept.length)
    console.log(
      `Kept ${kept.length} in preview, renumbered ${kept[0]} … ${kept.at(-1)}` +
        (deleted ? `; the ${deleted} you deleted won't come back.` : '.'),
    );
  const wanted = count - kept.length;

  const stats = {};
  const reject = (key, reason) => {
    stats[reason] = (stats[reason] ?? 0) + 1;
    sources.rejected[key] = reason;
  };

  // Variety counts over the whole batch, kept photos included; a shoot you deleted from stays out.
  const saved = [];
  const byAuthor = new Map();
  const shoots = new Set(sources.dropped);
  for (const name of kept) {
    const owner = photographer(sources.walls[name]);
    byAuthor.set(owner, (byAuthor.get(owner) ?? 0) + 1);
    shoots.add(shoot(sources.walls[name]));
  }
  // ponytail: one candidate at a time keeps both sites happy; ~2–4 s each, fine for a manual run.
  for await (const found of wanted > 0 ? everywhere(known) : []) {
    if (saved.length >= wanted) break;
    if (known.has(found.key)) continue;
    known.add(found.key); // the finders overlap
    if (found.reason) {
      reject(found.key, found.reason);
      continue;
    }
    const owner = photographer(found.record);
    if ((byAuthor.get(owner) ?? 0) >= PER_AUTHOR || shoots.has(shoot(found.record))) continue;
    let verdict;
    let jpeg;
    try {
      verdict = await analyze(await download(found.thumb), hashes);
      if (!verdict.reason)
        jpeg = await render(await download(found.url), verdict.crop, found.credit);
    } catch (error) {
      console.warn(`  skip ${found.title}: ${error.message}`); // network trouble: try again next run
      continue;
    }
    if (verdict.reason) {
      reject(found.key, verdict.reason);
      continue;
    }
    const name = `wall-${next}.jpg`;
    await writeFile(join(PREVIEW, name), jpeg);
    hashes.set(name, verdict.hash);
    byAuthor.set(owner, (byAuthor.get(owner) ?? 0) + 1);
    shoots.add(shoot(found.record));
    saved.push(name);
    sources.walls[name] = {
      ...found.record,
      crop: Object.fromEntries(Object.entries(verdict.crop).map(([k, v]) => [k, +v.toFixed(4)])),
      added: new Date().toISOString().slice(0, 10),
    };
    sources.hashes[name] = verdict.hash.toString(16);
    await save(sources); // a crash mid-run must not lose where the saved photos came from
    next++;
    const license = found.record.license;
    console.log(`  ${name}  ← ${found.title}  (${license}, ${Math.round(jpeg.length / 1024)} KB)`);
  }
  await save(sources);

  console.log(
    'Rejected:',
    Object.entries(stats)
      .sort((a, b) => b[1] - a[1])
      .map(([r, n]) => `${r} ${n}`)
      .join(', ') || 'none',
  );
  if (saved.length < wanted)
    console.log('Commons and iNaturalist ran out of fresh candidates for now.');
  const batch = [...kept, ...saved];
  if (!batch.length) return;
  await contactSheet(
    batch.map((name) => join(PREVIEW, name)),
    LAST_RUN,
  );
  console.log(`
preview holds ${batch[0]} … ${batch.at(-1)}: ${saved.length} new${kept.length ? ` after the ${kept.length} kept` : ''}.
  1. Look them over: tools/wall-hunter/last-run.jpg (the whole batch, in numbering order).
  2. Delete the ones you don't like from preview and run npm run hunt again: it closes the gaps and
     fills the batch up with new ones.
  3. Happy with all of them? Copy preview into public/assets/walls and set WALLS = ${next} in
     src/app/slideshow.ts.`);
}

/**
 * Every candidate, best source first: { key, title, thumb, url, credit, record }, or
 * { key, reason } for one turned down on metadata alone. Keys: Commons page id, or "inat:<observation>".
 */
async function* everywhere(known) {
  console.log('Searching Wikimedia Commons, best-rated cats first…');
  for await (const page of search(known)) {
    const reason = screen(page);
    yield reason ? { key: String(page.pageid), reason } : fromCommons(page);
  }
  console.log('Commons is done, on to iNaturalist…');
  yield* inaturalist(known);
}

function fromCommons(page) {
  const info = page.imageinfo[0];
  const text = (key) =>
    String(info.extmetadata?.[key]?.value ?? '')
      .replace(/<[^>]+>/g, '')
      .trim();
  return {
    key: String(page.pageid),
    title: page.title,
    thumb: info.thumburl,
    url: info.url,
    credit: credit(page),
    record: {
      pageid: page.pageid,
      title: page.title,
      url: info.descriptionurl,
      license: text('LicenseShortName'),
      licenseUrl: text('LicenseUrl'),
      author: text('Artist'),
      original: `${info.width}x${info.height}`,
    },
  };
}

/**
 * iNaturalist observations, newest first, past the ones already seen. Only those with a free photo
 * shot 16:9 or 3:2 come out; everything else is skipped unrecorded, like Commons files of other sizes.
 */
export async function* inaturalist(known) {
  for (let below; ;) {
    const { results } = await inat({ ...INAT_QUERY, ...(below && { id_below: below }) });
    if (!results?.length) return;
    for (const observation of results) {
      const found = fromInaturalist(observation);
      if (found && !known.has(found.key)) yield found;
    }
    below = results.at(-1).id;
  }
}

/**
 * The observation's first free 16:9 or 3:2 photo as a candidate, or null. One per observation: the
 * other photos are the same cat a second later. No EXIF and no categories here, so the photo checks
 * (focus, exposure, colour, frame, trail-camera stamp) do all the work.
 */
export function fromInaturalist(observation) {
  const photo = observation.photos?.find(
    (p) =>
      INAT_LICENSES[p.license_code] &&
      /\/square\.jpe?g$/i.test(p.url) &&
      p.original_dimensions &&
      shape(p.original_dimensions),
  );
  if (!photo) return null;
  const [license, licenseUrl] = INAT_LICENSES[photo.license_code];
  const author = observation.user.name?.trim() || observation.user.login;
  const source = `https://www.inaturalist.org/photos/${photo.id}`;
  const title = `iNaturalist ${observation.id} by ${author}`;
  const { width, height } = photo.original_dimensions;
  return {
    key: `inat:${observation.id}`,
    title,
    thumb: photo.url.replace('/square.', '/large.'), // 1024 px
    url: photo.url.replace('/square.', '/original.'), // 2048 px, iNaturalist keeps no bigger
    credit: photo.license_code === 'cc0' ? null : { author, license, licenseUrl, source },
    record: {
      inat: observation.id,
      photo: photo.id,
      title,
      url: source,
      license,
      licenseUrl,
      author,
      original: `${width}x${height}`,
    },
  };
}

/** sources.json key of a saved wall's source. */
function keyOf(record) {
  return record.inat ? `inat:${record.inat}` : String(record.pageid);
}

/**
 * A Commons search stops after 10,000 results, and the two broadest finders have more. Read again
 * in width bands, each well under the cap (measured 2026-11-02: +1008 16:9 photos the first pass
 * can't reach, versus +702 from re-sorting by date).
 */
const CAP = 10_000;
const WIDTH_BANDS = [
  'filew:1920,2999',
  'filew:3000,3999',
  'filew:4000,4999',
  'filew:5000,5999',
  'filew:>5999',
];

/**
 * Commons search results, finder by finder, best first. A finder that hits the cap gets a second
 * pass in width bands once the first pass of every finder is done.
 */
export async function* search(known) {
  const capped = [];
  for (const finder of FINDERS)
    if ((yield* matches(`${finder} ${BASE}`, known)) >= CAP) capped.push(finder);
  for (const finder of capped)
    for (const band of WIDTH_BANDS)
      if ((yield* matches(`${finder} ${BASE} ${band}`, known)) >= CAP)
        console.warn(`  "${finder}" at ${band} hits the search cap too: split that band`);
}

/**
 * One search read to the end, in relevance order. Only about a third of photos are shot 16:9 or 3:2,
 * so it asks for sizes alone, 500 at a time, and fetches full metadata just for those not known yet.
 * Returns how many results the search gave.
 */
async function* matches(query, known) {
  let total = 0;
  let more = {};
  do {
    const response = await api({
      generator: 'search',
      gsrnamespace: '6',
      gsrsearch: query,
      gsrlimit: '500',
      prop: 'imageinfo',
      iiprop: 'size',
      ...more,
    });
    const pages = response.query?.pages ?? [];
    total += pages.length;
    const wide = pages
      .filter(
        (page) => page.imageinfo && shape(page.imageinfo[0]) && !known.has(String(page.pageid)),
      )
      .sort((a, b) => a.index - b.index);
    for (let i = 0; i < wide.length; i += 50) yield* await details(wide.slice(i, i + 50));
    more = response.continue;
  } while (more);
  return total;
}

/** Everything the checks need, for up to 50 pages, kept in the order given. */
async function details(pages) {
  const response = await api({
    pageids: pages.map((page) => page.pageid).join('|'),
    prop: 'imageinfo',
    iiprop: 'url|size|commonmetadata|extmetadata',
    iiurlwidth: '960',
    iiextmetadatafilter: 'LicenseShortName|LicenseUrl|Artist|Categories',
  });
  const full = new Map((response.query?.pages ?? []).map((page) => [page.pageid, page]));
  return pages.map((page) => full.get(page.pageid)).filter((page) => page?.imageinfo);
}

/**
 * '16:9' when shot so (within 1 %: a few pixels' trim at most), '3:2' for the usual camera frame (a
 * 16:9 window loses 16 % of its height), else null. At least Full HD after the crop either way.
 */
export function shape({ width, height }) {
  if (width < OUT_W || height < OUT_H) return null;
  if (Math.abs(width / height / RATIO - 1) <= 0.01) return '16:9';
  if (Math.abs(width / height / 1.5 - 1) <= 0.01) return '3:2';
  return null;
}

/** Cheap checks on metadata alone. Returns why a file is out, or null. */
export function screen(page) {
  const info = page.imageinfo[0];
  const ext = (key) => String(info.extmetadata?.[key]?.value ?? '');
  const categories = ext('Categories');
  const model = String((info.commonmetadata ?? []).find((m) => m.name === 'Model')?.value ?? '');
  // CC0 or CC BY / BY-SA (any version: the site credits the author), or public domain by the
  // author's own release. Not NC or ND, not "PD because old" or "PD-USGov": those hold only for
  // some uses or in some countries.
  const license = ext('LicenseShortName');
  const free =
    /^cc0/i.test(license) ||
    /^CC BY(-SA)?( \d|$)/i.test(license) ||
    (/public domain/i.test(license) && /PD-(self|user|author)/i.test(categories));
  if (!free) return 'licence';
  if (/^CC BY/i.test(license) && !author(page)) return 'no author to credit';
  if (!shape(info)) return 'not 16:9 or 3:2';
  // Also proves a camera took it: scans, renders and AI pictures carry no camera model.
  if (!GOOD_CAMERA.test(model) && !FLAGSHIP_PHONE.test(model)) return 'not a system camera';
  if (
    !CAT_TITLE.test(page.title) ||
    NOT_A_HOUSE_CAT.test(page.title) ||
    !CAT_CATEGORY.test(categories)
  )
    return 'cat not the subject';
  // Untagged people still show up in titles; a person, often a child, is not ours to publish.
  if (PEOPLE.test(page.title)) return 'person in the photo';
  if (BLOCKED.test(categories)) return 'category';
  return null;
}

/**
 * "Feral cat 5.jpg" and "Feral cat 7.jpg", "Ada (1)" and "Ada (2)" by one photographer, or one
 * iNaturalist observation: one shoot, one wall per batch, and none at all once you delete one.
 */
export function shoot(record) {
  if (record.inat) return `inat:${record.inat}`;
  const title = record.title
    .replace(/^File:|\.\w+$/g, '')
    .replace(/\(.*?\)|[\d_.,-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return `${photographer(record)}|${title}`;
}

function author(page) {
  return String(page.imageinfo[0].extmetadata?.Artist?.value ?? '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/** One key per person: "Trougnouf" and "Trougnouf (Benoit Brummer)" are the same photographer. */
export function photographer(record) {
  const name = record.author
    .replace(/\s*\(.*?\)/g, '')
    .trim()
    .toLowerCase();
  return record.inat ? `inat:${name}` : name;
}

/**
 * What the site must show with a CC BY / BY-SA photo: author, licence, where it came from, and that
 * it was changed (render() adds what). Null when nothing is owed: CC0 and public domain.
 */
export function credit(page) {
  const info = page.imageinfo[0];
  const license = String(info.extmetadata?.LicenseShortName?.value ?? '');
  if (!/^CC BY/i.test(license)) return null;
  return {
    author: author(page),
    license,
    licenseUrl: String(info.extmetadata?.LicenseUrl?.value ?? ''),
    source: info.descriptionurl,
  };
}

/**
 * Looks at the ~1000 px thumbnail: where does the 16:9 window go, and is the photo in it sharp, well
 * exposed, colourful, frameless and new? Returns { crop, hash } or { reason }. A 16:9 photo only
 * loses the ≤1 % it is off by, evenly; a 3:2 one loses 16 % of its height away from the cat.
 */
export async function analyze(thumb, hashes = new Map()) {
  const { data: grey, info } = await sharp(thumb)
    .rotate() // upright, as render() sees the original
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const [w, h] = [info.width, info.height];
  let box;
  if (w / h >= RATIO) {
    box = {
      left: Math.floor((w - Math.round(h * RATIO)) / 2),
      top: 0,
      width: Math.round(h * RATIO),
      height: h,
    };
  } else {
    const height = Math.round(w / RATIO);
    const top =
      h - height <= h * 0.02 ? Math.floor((h - height) / 2) : placeWindow(grey, w, h, height);
    if (top === null) return { reason: 'cat would be cut' };
    box = { left: 0, top, width: w, height };
  }
  const crop = { x: box.left / w, y: box.top / h, w: box.width / w, h: box.height / h };

  const framed = sharp(thumb).rotate().extract(box).resize(960, 540, { fit: 'fill' });
  const rgb = await framed.clone().removeAlpha().raw().toBuffer();
  const luma = await framed.clone().greyscale().raw().toBuffer();
  const metrics = measure(rgb, luma, 960, 540);
  const reason = verdict(metrics);
  if (reason) return { reason, metrics };

  const hash = await dhash(sharp(luma, { raw: { width: 960, height: 540, channels: 1 } }));
  for (const known of hashes.values())
    if (distance(hash, known) <= LIMITS.duplicate) return { reason: 'duplicate', metrics };
  return { crop, hash, metrics };
}

/** Why the picture falls short of the existing walls, or null. */
export function verdict(m) {
  if (m.sharpness < LIMITS.sharpness) return 'blurry';
  if (m.isolation < LIMITS.isolation) return 'busy background';
  if (m.luma < LIMITS.lumaMin) return 'too dark';
  if (m.luma > LIMITS.lumaMax) return 'too bright';
  if (m.blown > LIMITS.blown) return 'blown out';
  if (m.colorfulness < LIMITS.colorfulness) return 'no colour';
  if (m.focus > LIMITS.focus) return 'everything in focus';
  if (m.framed) return 'frame or border';
  if (m.stamped) return 'camera stamp';
  return null;
}

/**
 * Where a 16:9 window `height` rows tall goes in a taller frame: its top row, or null when no window
 * holds the cat. The cat is what's in focus: on a 16×16 grid, a tile with LIMITS.subject of the
 * sharpest tile's detail is part of it, and the window keeps every row of such tiles plus two more
 * above: focus sits on the eyes, and the ears over them are often soft. Of the windows that do, it
 * takes the one that cuts away the least detail: blurred background goes first.
 */
export function placeWindow(luma, w, h, height) {
  const grid = 16;
  const tiles = new Float64Array(grid * grid);
  const rows = new Float64Array(h); // detail per pixel row
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const l = 4 * luma[i] - luma[i - 1] - luma[i + 1] - luma[i - w] - luma[i + w];
      rows[y] += l * l;
      tiles[Math.floor((y * grid) / h) * grid + Math.floor((x * grid) / w)] += l * l;
    }
  }
  const peak = Math.max(...tiles);
  let [first, last] = [grid, -1];
  for (let t = 0; t < tiles.length; t++)
    if (tiles[t] >= peak * LIMITS.subject) {
      first = Math.min(first, Math.floor(t / grid));
      last = Math.max(last, Math.floor(t / grid));
    }
  const [top, bottom] = [
    Math.floor((Math.max(0, first - 2) * h) / grid),
    Math.ceil(((last + 1) * h) / grid),
  ];
  if (bottom - top > height) return null;
  const sum = [0];
  for (const r of rows) sum.push(sum.at(-1) + r);
  let best = null;
  for (let t = Math.max(0, bottom - height); t <= Math.min(h - height, top); t++)
    if (
      best === null ||
      sum[t] + sum[h] - sum[t + height] < sum[best] + sum[h] - sum[best + height]
    )
      best = t;
  return best;
}

/**
 * A trail camera's info bar along the top or bottom edge: 2–12 % of the height of rows that are
 * nearly all black or white (text on a plain bar, a logo; a photo row has over half mid-tones), with
 * some text, ending in a straight line across most of the width. Studio backgrounds are two-tone at
 * the edge too, but the cat never meets them in a straight line.
 */
export function stamped(luma, w, h) {
  for (const edge of [0, 1]) {
    const row = (depth) => (edge ? h - 1 - depth : depth) * w;
    let rows = 0;
    let [darkAll, lightAll] = [0, 0];
    for (; rows < h * 0.12; rows++) {
      let [dark, light] = [0, 0];
      for (let x = 0; x < w; x++) {
        const v = luma[row(rows) + x];
        if (v < 50) dark++;
        else if (v > 190) light++;
      }
      if (Math.max(dark, light) < w * 0.5 || dark + light < w * 0.8) break;
      darkAll += dark;
      lightAll += light;
    }
    const text = Math.min(darkAll, lightAll); // the bar is one tone, the text the other
    if (rows < h * 0.02 || rows >= h * 0.12 || text < rows * w * 0.005) continue;
    let step = 0; // columns where the bar's last row and the picture's first differ sharply
    for (let x = 0; x < w; x++)
      if (Math.abs(luma[row(rows - 2) + x] - luma[row(rows + 1) + x]) > 40) step++;
    if (step >= w * 0.5) return true;
  }
  return false;
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
    focus: focus(luma, w, h),
    framed: framed(luma, w, h),
    stamped: stamped(luma, w, h),
  };
}

/**
 * Share of the frame in focus: 16×9 tiles with LIMITS.subject of the sharpest tile's detail. A wall
 * is a cat sharp against something soft (median 0.13); a snapshot from across a yard has the whole
 * yard in focus and a small cat somewhere in it.
 */
export function focus(luma, w, h) {
  const tiles = new Float64Array(16 * 9);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const l = 4 * luma[i] - luma[i - 1] - luma[i + 1] - luma[i - w] - luma[i + w];
      tiles[Math.floor((y * 9) / h) * 16 + Math.floor((x * 16) / w)] += l * l;
    }
  }
  const peak = Math.max(...tiles);
  return tiles.filter((v) => v >= peak * LIMITS.subject).length / tiles.length;
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

/** dHash of every wall in the project, cached in sources.json (the first run takes a minute). */
async function wallHashes(walls, cache) {
  const hashes = new Map();
  for (const name of walls.map((n) => `wall-${n}.jpg`)) {
    cache[name] ??= (await dhash(sharp(join(WALLS_DIR, name)))).toString(16);
    hashes.set(name, BigInt('0x' + cache[name]));
  }
  return hashes;
}

/**
 * Full-resolution original → the analysed 16:9 window → 1920×1080 JPEG. A photo that needs credit
 * carries it inside the file: EXIF Artist/Copyright for anyone who downloads it, and a JPEG comment
 * the site reads to show the caption. Copying the .jpg is all it takes.
 */
export async function render(original, crop, owed) {
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
  let image = sharp(original).rotate().extract(box).resize(OUT_W, OUT_H, { fit: 'fill' });
  if (!owed) return image.jpeg(JPEG).toBuffer();
  // The licence asks to say what we changed: always the size, often a crop.
  owed = {
    ...owed,
    changes: box.width < w || box.height < h ? 'cropped to 16:9, resized' : 'resized',
  };
  image = image.withExif({
    IFD0: {
      Artist: owed.author,
      Copyright: `${owed.license} ${owed.licenseUrl}. Source: ${owed.source}. Changes: ${owed.changes}.`,
    },
  });
  return withComment(await image.jpeg(JPEG).toBuffer(), CREDIT_TAG + JSON.stringify(owed));
}

/** Adds a JPEG comment (COM) segment right after the APPn headers. */
export function withComment(jpeg, text) {
  const payload = Buffer.from(text, 'utf8');
  if (payload.length > 65533) throw new Error('comment too long for one JPEG segment');
  let at = 2; // after SOI
  while (jpeg[at] === 0xff && jpeg[at + 1] >= 0xe0 && jpeg[at + 1] <= 0xef)
    at += 2 + jpeg.readUInt16BE(at + 2);
  const header = Buffer.from([0xff, 0xfe, 0, 0]);
  header.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([jpeg.subarray(0, at), header, payload, jpeg.subarray(at)]);
}

/**
 * The batch is under review: photos deleted from preview/ are forgotten for good, and the rest are
 * renumbered from `first` (the project's next free number) so they continue the project without gaps.
 * Returns the names they now have and how many were deleted.
 */
async function renumber(sources, first) {
  const deleted = forgetUncopied(sources); // before renumbering hands a deleted photo's name to another
  const left = await numbers(PREVIEW);
  const moves = left
    .map((n, i) => [`wall-${n}.jpg`, `wall-${first + i}.jpg`])
    .filter(([from, to]) => from !== to);
  // Two passes through temporary names: safe whichever way the numbers shift.
  for (const [from] of moves) await rename(join(PREVIEW, from), join(PREVIEW, `${from}.tmp`));
  for (const [from, to] of moves) await rename(join(PREVIEW, `${from}.tmp`), join(PREVIEW, to));
  for (const map of [sources.walls, sources.hashes]) {
    const moved = moves.filter(([from]) => from in map).map(([from, to]) => [to, map[from]]);
    for (const [from] of moves) delete map[from];
    for (const [to, value] of moved) map[to] = value;
  }
  await save(sources);
  return { kept: left.map((_, i) => `wall-${first + i}.jpg`), deleted };
}

/** Wall numbers in a folder, ascending. */
async function numbers(dir) {
  if (!existsSync(dir)) return [];
  return (await readdir(dir))
    .map((file) => file.match(/^wall-(\d+)\.jpg$/)?.[1])
    .filter(Boolean)
    .map(Number)
    .sort((a, b) => a - b);
}

/** Drops a photo's record and blocks its source for good. */
function forget(sources, name, reason) {
  const record = sources.walls[name];
  if (record) sources.rejected[keyOf(record)] = reason;
  delete sources.walls[name];
  delete sources.hashes[name];
}

/**
 * A photo that left preview without reaching the project was turned down: don't offer it again, nor
 * the rest of its shoot.
 */
function forgetUncopied(sources) {
  let deleted = 0;
  for (const name of Object.keys(sources.walls))
    if (!existsSync(join(WALLS_DIR, name)) && !existsSync(join(PREVIEW, name))) {
      sources.dropped = [...new Set([...(sources.dropped ?? []), shoot(sources.walls[name])])];
      forget(sources, name, 'deleted from preview');
      deleted++;
    }
  return deleted;
}

function save(sources) {
  return writeFile(SOURCES, JSON.stringify(sources, null, 2) + '\n');
}

/** One picture of the whole batch, in numbering order, to eyeball before copying it in. */
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

function api(params) {
  return getJson(
    `${API}?${new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', maxlag: '5', ...params })}`,
  );
}

async function inat(params) {
  await new Promise((r) => setTimeout(r, 1000)); // iNaturalist asks for about a request a second
  return getJson(`${INAT}?${new URLSearchParams(params)}`);
}

async function getJson(url) {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, { headers: { 'User-Agent': UA } });
    const body = response.ok ? await response.json() : null;
    if (body && !body.error) return body;
    if (attempt === 4)
      throw new Error(
        `${new URL(url).host} ${response.status}: ${JSON.stringify(body?.error ?? '')}`,
      );
    await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt)); // maxlag or rate limit: back off
  }
}

async function download(url) {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, { headers: { 'User-Agent': UA } });
    if (response.ok) return Buffer.from(await response.arrayBuffer());
    // Commons rate-limits media downloads: wait as long as it asks, then a bit longer each time.
    // (iNaturalist's come from Amazon's open-data bucket and don't.)
    if (![429, 503].includes(response.status) || attempt === 4)
      throw new Error(`${response.status} ${url}`);
    const wait = Number(response.headers.get('retry-after')) || 5 * 2 ** attempt;
    console.warn(`  Commons asks to slow down, waiting ${wait} s…`);
    await new Promise((r) => setTimeout(r, wait * 1000));
  }
}

// Last line on purpose: by now every const above is initialised (a run that started earlier hit
// "Cannot access … before initialization" twice).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
