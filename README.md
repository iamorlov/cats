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
npm run hunt                 # 50 new cats into tools/wall-hunter/preview (40–60: -- --count 60)
```

The hunter never touches the project. It saves the photos to `tools/wall-hunter/preview` under the names they will have here (`wall-<next>.jpg`) and puts the whole batch on one sheet, `tools/wall-hunter/last-run.jpg`. Then:

1. Delete the ones you don't like from `preview` and run `npm run hunt` again. While the batch isn't copied in, a run only renumbers what's left without gaps, redraws the sheet and prints the `WALLS` value; the deleted photos never come back.
2. Copy `preview` into `public/assets/walls` and set `WALLS` in `src/app/slideshow.ts`.
3. The next `npm run hunt` sees the batch in the project, clears `preview` and hunts a new one.

It searches Wikimedia Commons ([tools/wall-hunter](tools/wall-hunter/hunt.mjs)), photos rated "quality" or "featured" first, and only takes ones that are:

- **free to redistribute:** CC0, public domain released by the author, or CC BY / CC BY-SA (any version). Never NC or ND, "public domain because old" or a US-government work. The Commons page, author and licence of every cat go into `tools/wall-hunter/sources.json`.
- **real:** a system camera (Canon EOS, Nikon D/Z, Sony α, Fujifilm X…) or a flagship phone from 2018 on (iPhone XS/11+, Pixel 3+, Galaxy S9+, Huawei P30+) in the EXIF, no category hinting at AI, renders, artwork, watermarks, borders or a licence dispute.
- **about the cat:** a cat word in the file name, filed in a cat category, no people tagged, no lynx, skull or Sno-Cat.
- **good enough for a wall:** a sharp subject on a softer background, sane exposure, in colour, not a duplicate of an existing wall. Every limit sits at about the worst 5 % of the walls picked by hand.

It only takes photos **shot 16:9** (within 1 %) at Full HD or more and never crops them: automatic crops kept cutting cats. They are scaled to 1920×1080 with mozjpeg q90. Only about 3 % of photos are 16:9, so the search reads sizes 500 files at a time and fetches the rest only for those. A Commons search stops after 10,000 results; the broad searches that hit that are read again in width bands (1920–2999 px, 3000–3999 px…) to reach the rest.

**Credit.** A CC BY / BY-SA photo carries its credit inside the file: EXIF Artist/Copyright for anyone who downloads it, and a JPEG comment the site reads to show "Photo: author · licence · resized" in the top left corner while the photo is up. Nothing to copy besides the `.jpg`. A wall whose credit can't be read is skipped rather than shown without it.

Whichever way cats arrive, `public/assets/walls` must stay numbered without gaps and `WALLS` must match the count: `npm test` fails otherwise.

## Weather

Conditions come from [Open-Meteo](https://open-meteo.com) and the city name from [BigDataCloud](https://www.bigdatacloud.com/free-api/free-reverse-geocode-to-city-api). Both are free and need no API key. The browser asks for location only when "Show weather" is on, and coordinates are rounded to about 1 km before they leave it.
