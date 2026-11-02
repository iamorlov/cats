import assert from 'node:assert/strict';
import { test } from 'node:test';
import sharp from 'sharp';
import {
  credit,
  distance,
  focus,
  framed,
  fromInaturalist,
  photographer,
  placeWindow,
  render,
  screen,
  series,
  shape,
  stamped,
  withComment,
} from './hunt.mjs';

test('photos shot 16:9 or 3:2, Full HD or more after the crop', () => {
  assert.equal(shape({ width: 1920, height: 1080 }), '16:9');
  assert.equal(shape({ width: 6000, height: 3376 }), '16:9'); // 1.777…, a pixel off
  assert.equal(shape({ width: 5184, height: 2912 }), '16:9'); // Canon's 16:9 mode, 0.1 % off
  assert.equal(shape({ width: 6000, height: 4000 }), '3:2');
  assert.equal(shape({ width: 2048, height: 1365 }), '3:2'); // iNaturalist's largest
  assert.equal(shape({ width: 4000, height: 3000 }), null); // 4:3
  assert.equal(shape({ width: 1280, height: 720 }), null); // 16:9 but too small
  assert.equal(shape({ width: 1800, height: 1200 }), null); // 3:2, a 16:9 crop is under Full HD
});

const page = ({
  title = 'File:Tabby cat on a sofa.jpg',
  size = [6000, 3375],
  model = 'Canon EOS 5D Mark III',
  license = 'CC0',
  artist = '<a href="//commons.wikimedia.org/wiki/User:Jane">Jane Doe</a>',
  categories = 'Tabby cats|Cats on sofas',
} = {}) => ({
  title,
  imageinfo: [
    {
      width: size[0],
      height: size[1],
      descriptionurl: 'https://commons.wikimedia.org/wiki/File:Tabby_cat.jpg',
      commonmetadata: [{ name: 'Model', value: model }],
      extmetadata: {
        LicenseShortName: { value: license },
        LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0' },
        Artist: { value: artist },
        Categories: { value: categories },
      },
    },
  ],
});

test('metadata screen', () => {
  assert.equal(screen(page()), null);
  assert.equal(screen(page({ license: 'CC BY-SA 4.0' })), null);
  assert.equal(screen(page({ license: 'CC BY 2.0' })), null);
  assert.equal(screen(page({ license: 'CC BY 2.0', artist: '' })), 'no author to credit');
  assert.equal(screen(page({ license: 'CC BY-NC-SA 2.0' })), 'licence');
  assert.equal(screen(page({ license: 'CC BY-ND 4.0' })), 'licence');
  assert.equal(screen(page({ license: 'GFDL' })), 'licence');
  assert.equal(screen(page({ license: 'Public domain', categories: 'Cats|PD-USGov' })), 'licence');
  assert.equal(screen(page({ license: 'Public domain', categories: 'Cats|PD-self' })), null);
  assert.equal(screen(page({ size: [4000, 3000] })), 'not 16:9 or 3:2');
  assert.equal(screen(page({ size: [6000, 4000] })), null);
  for (const model of [
    'iPhone 8',
    'iPhone X',
    'SM-J701M',
    'Lumia 930',
    'Canon PowerShot SX50 HS',
    '',
  ])
    assert.equal(screen(page({ model })), 'not a system camera', model);
  for (const model of [
    'iPhone 13',
    'iPhone XS Max',
    'Pixel 7a',
    'SM-S911B',
    'Galaxy S23',
    'VOG-L29',
  ])
    assert.equal(screen(page({ model })), null, model);
  assert.equal(screen(page({ title: 'File:Tucker Sno-Cat pic2.JPG' })), 'cat not the subject');
  assert.equal(screen(page({ title: 'File:Street market 17.jpg' })), 'cat not the subject');
  assert.equal(screen(page({ categories: 'Cats|Images with watermarks' })), 'category');
  assert.equal(
    screen(page({ title: 'File:A young boy cuddles a kitten.jpg' })),
    'person in the photo',
  );
  assert.equal(screen(page({ title: 'File:Manx cat in a mansion.jpg' })), null);
  // the cat as a prop, or not a house cat
  for (const title of [
    'File:Olympus Air A01 with cat.jpg',
    "File:How To Take Your Cat's Blood Pressure - Omron BP791IT.jpg",
    'File:Half a jungle cat on the prowl.jpg',
    'File:Stuffed cat on a shelf.jpg',
  ])
    assert.equal(screen(page({ title })), 'cat not the subject', title);
  assert.equal(screen(page({ title: 'File:Kitten with toy mouse.jpg' })), null);
});

test('a white border is a frame, a studio black background is not', () => {
  const [w, h] = [960, 540];
  let seed = 1;
  const noise = () => ((seed = (seed * 16807) % 2147483647) % 200) + 30;
  const photo = new Uint8Array(w * h).map(noise);
  const withBorder = photo.map((v, i) =>
    i % w < 20 || i % w >= w - 20 || i < 20 * w || i >= (h - 20) * w ? 255 : v,
  );
  // black all round, the cat (noise) fading in towards the middle
  const studio = photo.map((v, i) => {
    const edge = Math.min(i % w, w - 1 - (i % w), Math.floor(i / w), h - 1 - Math.floor(i / w));
    return Math.round(v * Math.min(1, edge / 150));
  });
  assert.equal(framed(withBorder, w, h), true);
  assert.equal(framed(photo, w, h), false);
  assert.equal(framed(studio, w, h), false);
});

test('one photographer under two names is one photographer', () => {
  assert.equal(
    photographer(page({ artist: 'Trougnouf' })),
    photographer(
      page({
        artist:
          '<a href="//commons.wikimedia.org/wiki/User:Trougnouf">Trougnouf</a> (Benoit Brummer)',
      }),
    ),
  );
});

test('one shoot is one series', () => {
  const s = (title) => series({ title });
  assert.equal(s('File:Feral cat 5.jpg'), s('File:Feral cat 7.jpg'));
  assert.equal(s('File:My house cat, Ada (1).JPG'), s('File:My house cat, Ada (4).JPG'));
  assert.notEqual(s('File:Feral cat 5.jpg'), s('File:Kitten 5.jpg'));
});

test('credit is owed for CC BY / BY-SA only, and rides in a JPEG comment', async () => {
  assert.equal(credit(page()), null);
  const owed = credit(page({ license: 'CC BY-SA 4.0' }));
  assert.deepEqual(owed, {
    author: 'Jane Doe',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    source: 'https://commons.wikimedia.org/wiki/File:Tabby_cat.jpg',
  });
  const jpeg = await sharp({ create: { width: 64, height: 36, channels: 3, background: '#c86' } })
    .withExif({ IFD0: { Artist: 'Jane Doe' } })
    .jpeg()
    .toBuffer();
  const tagged = withComment(jpeg, 'cats-credit ' + JSON.stringify(owed));
  // the comment sits after the APP headers, and the JPEG still decodes
  const at = tagged.indexOf(Buffer.from([0xff, 0xfe]));
  const length = tagged.readUInt16BE(at + 2);
  const text = tagged.subarray(at + 4, at + 2 + length).toString('utf8');
  assert.deepEqual(JSON.parse(text.slice('cats-credit '.length)), owed);
  assert.equal((await sharp(tagged).metadata()).width, 64);
});

test('render says what it changed: resized, or trimmed when 16:9 was a few pixels off', async () => {
  const owed = credit(page({ license: 'CC BY 4.0' }));
  const comment = async (width, height) => {
    const original = await sharp({ create: { width, height, channels: 3, background: '#468' } })
      .jpeg()
      .toBuffer();
    const crop =
      width / height > 16 / 9
        ? { x: (1 - (height * 16) / 9 / width) / 2, y: 0, w: (height * 16) / 9 / width, h: 1 }
        : { x: 0, y: 0, w: 1, h: 1 };
    const jpeg = await render(original, crop, owed);
    assert.deepEqual(
      [(await sharp(jpeg).metadata()).width, (await sharp(jpeg).metadata()).height],
      [1920, 1080],
    );
    const at = jpeg.indexOf(Buffer.from([0xff, 0xfe]));
    return JSON.parse(
      jpeg
        .subarray(at + 4, at + 2 + jpeg.readUInt16BE(at + 2))
        .toString()
        .slice(12),
    );
  };
  assert.equal((await comment(3840, 2160)).changes, 'resized');
  assert.equal((await comment(3880, 2160)).changes, 'cropped to 16:9, resized');
});

test('a 3:2 crop keeps what is in focus and cuts the blurred background', () => {
  const [w, h] = [960, 640];
  const height = 540; // 16:9
  let seed = 7;
  const noise = () => (seed = (seed * 16807) % 2147483647) % 256;
  // flat grey with a sharp "cat" over the given rows, and a soft gradient elsewhere
  const photo = (from, to) =>
    Uint8Array.from({ length: w * h }, (_, i) => {
      const y = Math.floor(i / w);
      return y >= from && y < to && i % w > 300 && i % w < 660 ? noise() : 100 + y / 20;
    });
  const top = placeWindow(photo(20, 400), w, h, height);
  assert.ok(top !== null && top <= 20 && top + height >= 400, `window at ${top}`);
  const low = placeWindow(photo(250, 630), w, h, height);
  assert.ok(low !== null && low <= 250 && low + height >= 630, `window at ${low}`);
  assert.equal(placeWindow(photo(10, 630), w, h, height), null); // the cat fills the frame: no crop
});

test('a trail camera stamp is caught, a studio black background is not', () => {
  const [w, h] = [960, 540];
  let seed = 3;
  const noise = () => ((seed = (seed * 16807) % 2147483647) % 140) + 60;
  const photo = Uint8Array.from({ length: w * h }, noise);
  // black bar 30 px tall along the bottom with white "text" in it
  const bar = photo.map((v, i) => {
    const [x, y] = [i % w, Math.floor(i / w)];
    if (y < h - 30) return v;
    return y > h - 22 && y < h - 8 && x % 12 < 3 && x < 600 ? 255 : 0;
  });
  const studio = photo.map((v, i) => (Math.floor(i / w) >= h - 60 ? 4 : v));
  const light = bar.map((v, i) => (Math.floor(i / w) >= h - 30 ? 255 - v : v)); // dark text on white
  assert.equal(stamped(bar, w, h), true);
  assert.equal(stamped(light, w, h), true);
  assert.equal(stamped(photo, w, h), false);
  assert.equal(stamped(studio, w, h), false);
});

test('a cat in focus against a soft background, not a sharp field', () => {
  const [w, h] = [960, 540];
  let seed = 11;
  const noise = () => (seed = (seed * 16807) % 2147483647) % 256;
  const field = Uint8Array.from({ length: w * h }, noise);
  const portrait = field.map((v, i) => {
    const [x, y] = [i % w, Math.floor(i / w)];
    return x > 380 && x < 580 && y > 170 && y < 370 ? v : 120 + (x + y) / 40;
  });
  assert.ok(focus(field, w, h) > 0.9);
  assert.ok(focus(portrait, w, h) < 0.13);
});

test('an iNaturalist observation becomes one candidate with its credit', () => {
  const photo = (id, license_code, width, height) => ({
    id,
    license_code,
    url: `https://inaturalist-open-data.s3.amazonaws.com/photos/${id}/square.jpg`,
    original_dimensions: { width, height },
  });
  const observation = (photos, name = 'Ann Lee') => ({
    id: 42,
    user: { login: 'ann', name },
    photos,
  });
  const found = fromInaturalist(
    observation([
      photo(1, 'cc-by-nc', 1536, 2048),
      photo(2, null, 2048, 1152),
      photo(3, 'cc-by-nc', 2048, 1365),
    ]),
  );
  assert.equal(found.key, 'inat:42');
  assert.equal(found.url, 'https://inaturalist-open-data.s3.amazonaws.com/photos/3/original.jpg');
  assert.deepEqual(found.credit, {
    author: 'Ann Lee',
    license: 'CC BY-NC 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-nc/4.0/',
    source: 'https://www.inaturalist.org/photos/3',
  });
  assert.equal(fromInaturalist(observation([photo(4, 'cc0', 2048, 1152)], '')).credit, null);
  assert.equal(
    fromInaturalist(observation([photo(5, 'cc-by', 2048, 1152)], '')).credit.author,
    'ann',
  );
  assert.equal(fromInaturalist(observation([photo(6, 'cc-by-nd', 2048, 1152)])), null);
  assert.equal(fromInaturalist(observation([photo(7, 'cc-by', 1536, 2048)])), null);
});

test('dHash distance counts differing bits', () => {
  assert.equal(distance(0b1011n, 0b0001n), 2);
  assert.equal(distance(0xffffn, 0xffffn), 0);
});
