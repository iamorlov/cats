import { Service, WritableSignal, effect, signal } from '@angular/core';

export type Units = 'celsius' | 'fahrenheit';
export type TimeFormat = '24H' | '12H';

/** User settings, kept in localStorage under the keys the Angular 16 version used, so nobody loses theirs. */
@Service()
export class Settings {
  readonly clock = stored('clock', false);
  readonly weather = stored('weather', false);
  readonly units = stored<Units>('temperature', 'celsius');
  readonly timeFormat = stored<TimeFormat>('format', '24H');
  readonly interval = stored('interval', 10);
  readonly volumes = stored<Record<string, number>>('volumes', {});

  constructor() {
    // The old version cached exact coordinates here; the browser caches positions itself now.
    forget('geo_lat');
    forget('geo_lan');
  }
}

/** A signal mirrored to localStorage. */
function stored<T>(key: string, fallback: T): WritableSignal<T> {
  const value = signal(read(key, fallback));
  effect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value()));
    } catch {
      // storage disabled: settings live for this visit only
    }
  });
  return value;
}

/** Values are JSON now; the old version stored raw strings ('true', 'celsius', '24H'). */
function read<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return fallback;
  }
  if (raw === null) return fallback;
  let parsed: unknown = raw;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // a raw string from the old version
  }
  return parsed !== null && typeof parsed === typeof fallback ? (parsed as T) : fallback;
}

function forget(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // storage disabled: nothing to forget
  }
}
