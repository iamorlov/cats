import { readFileSync } from 'node:fs';
import { WMO, weatherCode } from './weather';

describe('weather codes', () => {
  it('picks the day or night icon', () => {
    expect(weatherCode(0, true)).toEqual({ text: 'Clear sky', icon: 'day-sunny' });
    expect(weatherCode(0, false)).toEqual({ text: 'Clear sky', icon: 'night-clear' });
    expect(weatherCode(1234, true)).toEqual({ text: 'Unknown', icon: 'na' });
  });

  it('only uses icons that exist in the Weather Icons stylesheet', () => {
    const css = readFileSync('public/assets/weather/css/weather-icons.min.css', 'utf8');
    for (const [, day, night] of Object.values(WMO)) {
      expect(css).toContain(`.wi-${day}:before`);
      expect(css).toContain(`.wi-${night}:before`);
    }
  });
});
