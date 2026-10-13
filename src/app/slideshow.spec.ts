import { readdirSync } from 'node:fs';
import { WALLS, shuffle } from './slideshow';

describe('slideshow', () => {
  it('WALLS matches the wallpapers on disk', () => {
    const files = new Set(readdirSync('public/assets/walls'));
    expect(files.size).toBe(WALLS);
    for (let i = 0; i < WALLS; i++) expect(files.has(`wall-${i}.jpg`)).toBe(true);
  });

  it('shuffle visits every cat exactly once', () => {
    const order = shuffle(100);
    expect([...order].sort((a, b) => a - b)).toEqual([...Array(100).keys()]);
  });
});
