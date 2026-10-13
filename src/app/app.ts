import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Controls, Panel } from './controls';
import { Settings } from './settings';
import { Slideshow } from './slideshow';
import { Weather } from './weather';

@Component({
  selector: 'app-root',
  imports: [DatePipe, Controls, Weather],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  host: { '(document:keydown)': 'onKey($event)' },
})
export class App {
  protected readonly settings = inject(Settings);
  protected readonly slideshow = inject(Slideshow);
  /** A one-item list keyed by slide: @for re-creates the layer on every change, which runs the crossfade. */
  protected readonly slides = computed(() => {
    const slide = this.slideshow.slide();
    return slide ? [slide] : [];
  });
  protected readonly now = signal(Date.now());
  protected readonly panel = signal<Panel | null>(null);
  protected readonly canFullscreen = document.fullscreenEnabled;

  constructor() {
    const clock = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(clock));
    console.log(
      `%c
      |\\__/,|   (\`\\
    _.|o o  |_   ) )
  ---(((---(((---------
  ----- MEOW ----------
  ------------ iamorlov
      `,
      'font-family:monospace',
    );
    console.log('Слава Україні!');
  }

  protected fullscreen(): void {
    document.documentElement
      .requestFullscreen()
      .catch(() => console.error('Failed to enter fullscreen mode.'));
  }

  protected onKey(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return; // leave browser shortcuts alone
    const target = event.target as HTMLElement;
    if (target.closest('input')) return; // sliders and checkboxes own their keys
    const activates = event.code === 'Space' || event.code === 'Enter';
    if (activates && target.closest('button, a')) return; // let the focused button do its thing
    switch (event.code) {
      case 'Space':
        this.panel.update((open) => (open ? null : 'info'));
        break;
      case 'Enter':
        this.download();
        break;
      case 'ArrowRight':
        this.slideshow.next();
        break;
      case 'ArrowLeft':
        this.slideshow.prev();
        break;
      case 'KeyP':
        this.slideshow.togglePause();
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  private download(): void {
    const slide = this.slideshow.slide();
    if (!slide) return;
    const link = document.createElement('a');
    link.href = slide.url;
    link.download = slide.url.slice(slide.url.lastIndexOf('/') + 1);
    link.click();
  }
}
