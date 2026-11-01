# Cats non-stop!

A random slideshow of 1131 cute cats with ambient sounds, a clock and the weather. Live at [catsnons.top](https://catsnons.top).

Angular 22: standalone components, signals, zoneless, native `animate.enter` / `animate.leave`.

## Run

```bash
npm install
npm start        # http://localhost:4200
npm test         # Vitest
npm run build    # dist/cats: upload its contents to the server
```

Keys: `←` / `→` flip cats, `P` pauses, `Space` opens the menu, `Enter` downloads the current cat.

## Adding cats

```bash
npm run hunt                       # 50 new cats (40–60 per run: -- --count 60)
npm run hunt -- --dry-run          # preview in tools/wall-hunter/preview, change nothing
npm run hunt -- --drop 1150,1162   # remove ones you don't like, close the numbering gaps
```

The hunter ([tools/wall-hunter](tools/wall-hunter/hunt.mjs)) searches Wikimedia Commons and only takes photos that are:

- **free to redistribute with no strings:** CC0, or public domain released by the author. Never "public domain because old" or a US-government work, which hold only in some countries. The Commons page, author and licence of every cat go into `tools/wall-hunter/sources.json`.
- **real:** a system camera (Canon EOS, Nikon D/Z, Sony α, Fujifilm X…) in the EXIF, no category hinting at AI, renders, artwork, watermarks, borders or a licence dispute.
- **about the cat:** a cat word in the file name, filed in a cat category, no people tagged, no lynx, skull or Sno-Cat.
- **good enough for a wall:** a sharp subject on a softer background, sane exposure, in colour, not a duplicate of an existing wall. Every limit sits at about the worst 5 % of the walls picked by hand.

It crops 16:9 around the sharpest part of the frame (dropping the photo if that would cut the cat), saves `wall-<next>.jpg` at 1920×1080 with mozjpeg q90, and bumps `WALLS` in `src/app/slideshow.ts`. Look over `tools/wall-hunter/last-run.jpg` before committing.

To add cats by hand instead, put `wall-<n>.jpg` into `public/assets/walls`, continuing the numbering, and bump `WALLS`. `npm test` fails if the two disagree.

## Weather

Conditions come from [Open-Meteo](https://open-meteo.com) and the city name from [BigDataCloud](https://www.bigdatacloud.com/free-api/free-reverse-geocode-to-city-api). Both are free and need no API key. The browser asks for location only when "Show weather" is on, and coordinates are rounded to about 1 km before they leave it.
