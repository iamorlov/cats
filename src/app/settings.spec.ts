import { TestBed } from '@angular/core/testing';
import { Settings } from './settings';

describe('Settings', () => {
  beforeEach(() => localStorage.clear());

  it('reads the raw strings the Angular 16 version stored', () => {
    localStorage.setItem('clock', 'true');
    localStorage.setItem('temperature', 'fahrenheit');
    localStorage.setItem('format', '12H');
    localStorage.setItem('geo_lat', '50.45');
    const settings = TestBed.inject(Settings);
    expect(settings.clock()).toBe(true);
    expect(settings.weather()).toBe(false);
    expect(settings.units()).toBe('fahrenheit');
    expect(settings.timeFormat()).toBe('12H');
    expect(localStorage.getItem('geo_lat')).toBeNull();
  });

  it('persists changes and ignores junk', () => {
    localStorage.setItem('interval', '"soon"');
    const settings = TestBed.inject(Settings);
    expect(settings.interval()).toBe(10);
    settings.interval.set(30);
    TestBed.tick();
    expect(localStorage.getItem('interval')).toBe('30');
  });
});
