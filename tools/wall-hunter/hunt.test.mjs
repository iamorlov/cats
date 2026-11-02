import assert from 'node:assert/strict';
import { test } from 'node:test';
import sharp from 'sharp';
import {
  credit,
  distance,
  framed,
  is16by9,
  photographer,
  render,
  screen,
  series,
  withComment,
} from './hunt.mjs';

test('only photos shot 16:9 at Full HD or more', () => {
  assert.equal(is16by9({ width: 1920, height: 1080 }), true);
  assert.equal(is16by9({ width: 6000, height: 3376 }), true); // 1.777…, a pixel off
  assert.equal(is16by9({ width: 5184, height: 2912 }), true); // Canon's 16:9 mode, 0.1 % off
  assert.equal(is16by9({ width: 6000, height: 4000 }), false); // 3:2
  assert.equal(is16by9({ width: 4000, height: 3000 }), false); // 4:3
  assert.equal(is16by9({ width: 1280, height: 720 }), false); // 16:9 but too small
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
  assert.equal(screen(page({ size: [6000, 4000] })), 'not 16:9');
  assert.equal(screen(page({ model: 'iPhone 13' })), 'not a system camera');
  assert.equal(screen(page({ title: 'File:Tucker Sno-Cat pic2.JPG' })), 'cat not the subject');
  assert.equal(screen(page({ title: 'File:Street market 17.jpg' })), 'cat not the subject');
  assert.equal(screen(page({ categories: 'Cats|Images with watermarks' })), 'category');
  assert.equal(
    screen(page({ title: 'File:A young boy cuddles a kitten.jpg' })),
    'person in the photo',
  );
  assert.equal(screen(page({ title: 'File:Manx cat in a mansion.jpg' })), null);
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
  assert.equal((await comment(3880, 2160)).changes, 'trimmed to 16:9, resized');
});

test('dHash distance counts differing bits', () => {
  assert.equal(distance(0b1011n, 0b0001n), 2);
  assert.equal(distance(0xffffn, 0xffffn), 0);
});
