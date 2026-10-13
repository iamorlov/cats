import { Service, effect, inject, signal, untracked } from '@angular/core';
import { Settings } from './settings';

/** public/assets/walls/wall-0.jpg … wall-1130.jpg. Adding cats? Bump this; slideshow.spec.ts checks it. */
export const WALLS = 1131;

export interface Slide {
  /** Unique per showing, so the same cat shown again still gets a fresh layer. */
  id: number;
  url: string;
  /** Ken Burns zoom: random anchor and direction per slide. */
  origin: string;
  zoomOut: boolean;
  /** Seconds the zoom lasts: the whole time the slide is on screen. */
  duration: number;
  /** Flipped by hand: quick crossfade instead of the slow one. */
  fast: boolean;
}

const ORIGINS = [
  'center',
  'top',
  'bottom',
  'left',
  'right',
  'top left',
  'top right',
  'bottom left',
  'bottom right',
];

export const wallUrl = (index: number) => `assets/walls/wall-${index}.jpg`;

/** Random order of 0…n-1: every cat once before any repeats, and the order doubles as history for ←. */
export function shuffle(n: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

@Service()
export class Slideshow {
  private readonly settings = inject(Settings);
  private order = shuffle(WALLS);
  private pos = -1;
  private ticket = 0;
  private timer?: ReturnType<typeof setTimeout>;

  readonly slide = signal<Slide | null>(null);
  readonly paused = signal(false);

  constructor() {
    // A new interval or un-pausing starts a fresh countdown.
    effect(() => {
      this.settings.interval();
      this.paused();
      untracked(() => this.schedule());
    });
    void this.show(0, false);
  }

  next(): void {
    void this.show(this.pos + 1, true);
  }

  prev(): void {
    if (this.pos > 0) void this.show(this.pos - 1, true);
  }

  togglePause(): void {
    this.paused.update((paused) => !paused);
  }

  private async show(pos: number, fast: boolean): Promise<void> {
    if (pos >= WALLS) {
      this.order = shuffle(WALLS); // seen them all: new round
      pos = 0;
    }
    const ticket = ++this.ticket;
    const url = wallUrl(this.order[pos]);
    let ok = true;
    try {
      await decoded(url); // swap only once the picture is ready: no half-loaded frames
    } catch {
      ok = false; // broken file or offline: keep the current cat, move past this one next tick
    }
    if (ticket !== this.ticket) return; // a newer flip won the race
    this.pos = pos;
    if (ok) {
      this.slide.set({
        id: ticket,
        url,
        origin: ORIGINS[Math.floor(Math.random() * ORIGINS.length)],
        zoomOut: Math.random() < 0.5,
        duration: this.settings.interval() + 2,
        fast,
      });
      new Image().src = wallUrl(this.order[(pos + 1) % WALLS]); // warm the cache for the next cat
    }
    this.schedule();
  }

  private schedule(): void {
    clearTimeout(this.timer);
    if (this.paused()) return;
    // A hidden tab keeps its cat: no downloads nobody sees.
    this.timer = setTimeout(
      () => (document.hidden ? this.schedule() : void this.show(this.pos + 1, false)),
      this.settings.interval() * 1000,
    );
  }
}

function decoded(url: string): Promise<void> {
  const img = new Image();
  img.src = url;
  return img.decode();
}
