import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LIMITS, bestWindow, distance, framed, screen, series } from './hunt.mjs';

test('16:9 window follows the in-focus detail and notices a subject it would cut', () => {
  const softTopSharpBottom = [...Array(30).fill(1), ...Array(70).fill(10)];
  const { start, cut } = bestWindow(softTopSharpBottom, 70);
  assert.equal(start, 30);
  assert.ok(cut < 0.2);
  const catFillsFrame = Array(100).fill(10);
  assert.ok(bestWindow(catFillsFrame, 70).cut > LIMITS.cut);
});

test('metadata screen', () => {
  const page = ({
    title = 'File:Tabby cat on a sofa.jpg',
    size = [6000, 4000],
    model = 'Canon EOS 5D Mark III',
    license = 'CC0',
    categories = 'Tabby cats|Cats on sofas',
  } = {}) => ({
    title,
    imageinfo: [
      {
        width: size[0],
        height: size[1],
        commonmetadata: [{ name: 'Model', value: model }],
        extmetadata: { LicenseShortName: { value: license }, Categories: { value: categories } },
      },
    ],
  });
  assert.equal(screen(page()), null);
  assert.equal(screen(page({ license: 'CC BY-SA 4.0' })), 'licence');
  assert.equal(screen(page({ license: 'Public domain', categories: 'Cats|PD-USGov' })), 'licence');
  assert.equal(screen(page({ license: 'Public domain', categories: 'Cats|PD-self' })), null);
  assert.equal(screen(page({ size: [3000, 4000] })), 'not landscape');
  assert.equal(screen(page({ model: 'iPhone 13' })), 'not a system camera');
  assert.equal(screen(page({ title: 'File:Tucker Sno-Cat pic2.JPG' })), 'cat not the subject');
  assert.equal(screen(page({ title: 'File:Street market 17.jpg' })), 'cat not the subject');
  assert.equal(screen(page({ categories: 'Cats|Images with watermarks' })), 'category');
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

test('one shoot is one series', () => {
  const s = (title) => series({ title });
  assert.equal(s('File:Feral cat 5.jpg'), s('File:Feral cat 7.jpg'));
  assert.equal(s('File:My house cat, Ada (1).JPG'), s('File:My house cat, Ada (4).JPG'));
  assert.notEqual(s('File:Feral cat 5.jpg'), s('File:Kitten 5.jpg'));
});

test('dHash distance counts differing bits', () => {
  assert.equal(distance(0b1011n, 0b0001n), 2);
  assert.equal(distance(0xffffn, 0xffffn), 0);
});
