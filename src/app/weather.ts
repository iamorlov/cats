import {
  Component,
  DestroyRef,
  computed,
  inject,
  linkedSignal,
  resource,
  signal,
} from '@angular/core';
import { Settings } from './settings';

interface Coords {
  lat: number;
  lon: number;
}

interface Conditions {
  temp: number;
  text: string;
  icon: string;
  city: string;
}

interface OpenMeteo {
  current: { temperature_2m: number; weather_code: number; is_day: number };
}

interface Place {
  city?: string;
  locality?: string;
}

/** Open-Meteo refreshes current conditions every 15 minutes. */
const REFRESH = 15 * 60_000;

/** WMO weather codes (Open-Meteo `weather_code`) → [description, day icon, night icon] from Weather Icons. */
export const WMO: Record<number, [string, string, string]> = {
  0: ['Clear sky', 'day-sunny', 'night-clear'],
  1: ['Mainly clear', 'day-sunny-overcast', 'night-alt-partly-cloudy'],
  2: ['Partly cloudy', 'day-cloudy', 'night-alt-cloudy'],
  3: ['Overcast', 'cloudy', 'cloudy'],
  45: ['Fog', 'day-fog', 'night-fog'],
  48: ['Freezing fog', 'day-fog', 'night-fog'],
  51: ['Light drizzle', 'day-sprinkle', 'night-alt-sprinkle'],
  53: ['Drizzle', 'day-sprinkle', 'night-alt-sprinkle'],
  55: ['Dense drizzle', 'day-sprinkle', 'night-alt-sprinkle'],
  56: ['Freezing drizzle', 'day-sleet', 'night-alt-sleet'],
  57: ['Freezing drizzle', 'day-sleet', 'night-alt-sleet'],
  61: ['Light rain', 'day-rain', 'night-alt-rain'],
  63: ['Rain', 'day-rain', 'night-alt-rain'],
  65: ['Heavy rain', 'day-rain', 'night-alt-rain'],
  66: ['Freezing rain', 'day-rain-mix', 'night-alt-rain-mix'],
  67: ['Freezing rain', 'day-rain-mix', 'night-alt-rain-mix'],
  71: ['Light snow', 'day-snow', 'night-alt-snow'],
  73: ['Snow', 'day-snow', 'night-alt-snow'],
  75: ['Heavy snow', 'day-snow', 'night-alt-snow'],
  77: ['Snow grains', 'day-snow', 'night-alt-snow'],
  80: ['Light showers', 'day-showers', 'night-alt-showers'],
  81: ['Showers', 'day-showers', 'night-alt-showers'],
  82: ['Violent showers', 'day-storm-showers', 'night-alt-storm-showers'],
  85: ['Snow showers', 'day-snow', 'night-alt-snow'],
  86: ['Heavy snow showers', 'day-snow', 'night-alt-snow'],
  95: ['Thunderstorm', 'day-thunderstorm', 'night-alt-thunderstorm'],
  96: ['Thunderstorm with hail', 'day-hail', 'night-alt-hail'],
  99: ['Thunderstorm with hail', 'day-hail', 'night-alt-hail'],
};

export function weatherCode(code: number, isDay: boolean): { text: string; icon: string } {
  const [text, day, night] = WMO[code] ?? ['Unknown', 'na', 'na'];
  return { text, icon: isDay ? day : night };
}

@Component({
  selector: 'app-weather',
  template: `
    @if (shown(); as w) {
      <i class="wi big" [class]="'wi-' + w.icon"></i>
      <span class="big">{{ temperature(w.temp) }}</span>
      <span class="place">
        @if (w.city) {
          <strong>{{ w.city }}</strong>
        }
        {{ w.text }}
      </span>
    } @else if (problem()) {
      <span class="place">{{ problem() }}</span>
    }
  `,
  styles: `
    .big {
      font-size: 2em;
    }
    .place {
      display: flex;
      flex-direction: column;
      font-size: 0.85em;
      line-height: 1.25rem;
    }
  `,
  host: { '[attr.title]': 'shown()?.text' },
})
export class Weather {
  private readonly settings = inject(Settings);
  private readonly coords = signal<Coords | undefined>(undefined);
  private readonly lost = signal('');
  private readonly data = resource({
    params: () => this.coords(),
    loader: ({ params, abortSignal }) => fetchConditions(params, abortSignal),
  });

  /** Last good reading: stays on screen while a refresh loads or fails. */
  protected readonly shown = linkedSignal<Conditions | undefined, Conditions | undefined>({
    source: () => (this.data.hasValue() ? this.data.value() : undefined),
    computation: (fresh, previous) => fresh ?? previous?.value,
  });

  protected readonly problem = computed(
    () => this.lost() || (this.data.error() ? 'Weather is unavailable right now' : ''),
  );

  constructor() {
    // Only exists while "Show weather" is on, so location is asked for only when it is needed.
    const locate = () =>
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          this.lost.set('');
          // ~1 km precision is plenty for weather, and less exact location goes to third parties.
          this.coords.set({ lat: round(coords.latitude), lon: round(coords.longitude) });
        },
        (error) =>
          this.lost.set(
            error.code === error.PERMISSION_DENIED
              ? 'Allow location access to see the weather'
              : 'Can’t find where you are',
          ),
        { maximumAge: REFRESH, timeout: 30_000 },
      );
    locate();
    const timer = setInterval(locate, REFRESH); // a new coords object reloads the resource
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected temperature(celsius: number): string {
    return this.settings.units() === 'fahrenheit'
      ? `${Math.round((celsius * 9) / 5 + 32)}°F`
      : `${Math.round(celsius)}°C`;
  }
}

async function fetchConditions({ lat, lon }: Coords, signal: AbortSignal): Promise<Conditions> {
  const [weather, place] = await Promise.all([
    getJson<OpenMeteo>(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day`,
      signal,
    ),
    // The city name is a nicety: show the weather even if reverse geocoding is down.
    getJson<Place>(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
      signal,
    ).catch((): Place => ({})),
  ]);
  const { temperature_2m, weather_code, is_day } = weather.current;
  return {
    temp: temperature_2m,
    ...weatherCode(weather_code, is_day === 1),
    city: place.city || place.locality || '',
  };
}

async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json() as Promise<T>;
}

const round = (degrees: number) => Math.round(degrees * 100) / 100;
