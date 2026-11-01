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
npm run hunt                       # 50 new cats into tools/wall-hunter/preview (40–60: -- --count 60)
npm run hunt -- --drop 1150,1162   # remove the ones you don't like, closing the numbering gaps
```

The hunter never touches the project. It saves the photos to `tools/wall-hunter/preview` under the names they will have here (`wall-<next>.jpg`) and puts the whole batch on one sheet, `tools/wall-hunter/last-run.jpg`. Look it over, drop what you don't like, copy the rest into `public/assets/walls` and set `WALLS` in `src/app/slideshow.ts` to the number it prints. A new run starts only once the last batch is copied in; photos you never copied are remembered and not offered again.

It searches Wikimedia Commons ([tools/wall-hunter](tools/wall-hunter/hunt.mjs)) and only takes photos that are:

- **free to redistribute with no strings:** CC0, or public domain released by the author. Never "public domain because old" or a US-government work, which hold only in some countries. The Commons page, author and licence of every cat go into `tools/wall-hunter/sources.json`.
- **real:** a system camera (Canon EOS, Nikon D/Z, Sony α, Fujifilm X…) in the EXIF, no category hinting at AI, renders, artwork, watermarks, borders or a licence dispute.
- **about the cat:** a cat word in the file name, filed in a cat category, no people tagged, no lynx, skull or Sno-Cat.
- **good enough for a wall:** a sharp subject on a softer background, sane exposure, in colour, not a duplicate of an existing wall. Every limit sits at about the worst 5 % of the walls picked by hand.

It crops 16:9 around the sharpest part of the frame (dropping the photo if that would cut the cat) and saves 1920×1080 JPEGs with mozjpeg q90.

Whichever way cats arrive, `public/assets/walls` must stay numbered without gaps and `WALLS` must match the count: `npm test` fails otherwise.

## Weather

Conditions come from [Open-Meteo](https://open-meteo.com) and the city name from [BigDataCloud](https://www.bigdatacloud.com/free-api/free-reverse-geocode-to-city-api). Both are free and need no API key. The browser asks for location only when "Show weather" is on, and coordinates are rounded to about 1 km before they leave it.
