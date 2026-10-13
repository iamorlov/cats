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

Put `wall-<n>.jpg` into `public/assets/walls`, continuing the numbering, and bump `WALLS` in `src/app/slideshow.ts`. `npm test` fails if the two disagree.

## Weather

Conditions come from [Open-Meteo](https://open-meteo.com) and the city name from [BigDataCloud](https://www.bigdatacloud.com/free-api/free-reverse-geocode-to-city-api). Both are free and need no API key. The browser asks for location only when "Show weather" is on, and coordinates are rounded to about 1 km before they leave it.
