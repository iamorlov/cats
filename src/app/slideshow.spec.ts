import { readdirSync } from 'node:fs';
import { WALLS, creditFrom, shuffle } from './slideshow';

/** SOI, a JFIF header, optional comments, then the start of image data. */
function jpeg(...comments: string[]): Uint8Array {
  const segment = (marker: number, body: Uint8Array) => [
    0xff,
    marker,
    (body.length + 2) >> 8,
    (body.length + 2) & 0xff,
    ...body,
  ];
  return new Uint8Array([
    0xff,
    0xd8,
    ...segment(0xe0, new TextEncoder().encode('JFIF\0\x01\x01\0\0\x01\0\x01\0\0')),
    ...comments.flatMap((text) => segment(0xfe, new TextEncoder().encode(text))),
    ...segment(0xda, new Uint8Array(10)),
    ...new TextEncoder().encode('cats-credit {"after":"image data"}'),
  ]);
}

describe('slideshow', () => {
  it('WALLS matches the wallpapers on disk', () => {
    const files = new Set(readdirSync('public/assets/walls'));
    expect(files.size).toBe(WALLS);
    for (let i = 0; i < WALLS; i++) expect(files.has(`wall-${i}.jpg`)).toBe(true);
  });

  it('reads the credit tools/wall-hunter writes into the JPEG comment', () => {
    const credit = {
      author: 'Jane Doe',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
      source: 'https://commons.wikimedia.org/wiki/File:Cat.jpg',
    };
    expect(creditFrom(jpeg('some other comment', 'cats-credit ' + JSON.stringify(credit)))).toEqual(
      credit,
    );
    expect(creditFrom(jpeg())).toBeUndefined(); // CC0 and hand-picked walls carry none
    expect(creditFrom(jpeg('just a comment'))).toBeUndefined();
  });

  it('shuffle visits every cat exactly once', () => {
    const order = shuffle(100);
    expect([...order].sort((a, b) => a - b)).toEqual([...Array(100).keys()]);
  });
});
