import { Component, DestroyRef, inject, model, signal } from '@angular/core';
import { Settings } from './settings';
import { Slideshow, WALLS } from './slideshow';

export type Panel = 'sounds' | 'settings' | 'info';

/** `id` is the file name in public/assets/sounds. */
const SOUNDS = [
  { id: 'purring', title: 'Cat purring' },
  { id: 'rain', title: 'Rain' },
  { id: 'fire', title: 'Campfire' },
  { id: 'birds', title: 'Birds' },
  { id: 'night', title: 'Wild night' },
  { id: 'waves', title: 'Ocean waves' },
  { id: 'cafe', title: 'Cafe' },
  { id: 'city_street', title: 'City street' },
];

interface Channel {
  element: HTMLAudioElement;
  gain: GainNode;
}

@Component({
  selector: 'app-controls',
  templateUrl: './controls.html',
  styleUrl: './controls.scss',
})
export class Controls {
  readonly panel = model<Panel | null>(null);
  readonly nyan = model(false);

  protected readonly settings = inject(Settings);
  protected readonly slideshow = inject(Slideshow);
  protected readonly sounds = SOUNDS;
  protected readonly intervals = [5, 10, 30, 60];
  protected readonly walls = WALLS;
  protected readonly playing = signal<ReadonlySet<string>>(new Set());

  private audio?: AudioContext;
  /** Created on first play: nothing downloads until a sound is wanted. */
  private readonly channels = new Map<string, Channel>();

  constructor() {
    inject(DestroyRef).onDestroy(() => void this.audio?.close());
  }

  protected toggle(panel: Panel): void {
    this.panel.update((open) => (open === panel ? null : panel));
  }

  protected volume(id: string): number {
    return this.settings.volumes()[id] ?? 1;
  }

  protected setVolume(id: string, value: number): void {
    this.settings.volumes.update((volumes) => ({ ...volumes, [id]: value }));
    const channel = this.channels.get(id);
    if (channel) channel.gain.gain.value = value;
  }

  protected toggleSound(id: string): void {
    const { element } = this.channel(id);
    if (this.playing().has(id)) {
      element.pause();
      this.setPlaying(id, false);
    } else {
      void this.audio?.resume();
      element.play().catch((error) => {
        console.error(`Failed to play ${id}:`, error);
        this.setPlaying(id, false);
      });
      this.setPlaying(id, true);
    }
  }

  // Volume goes through a Web Audio gain node: iOS ignores HTMLMediaElement.volume.
  private channel(id: string): Channel {
    let channel = this.channels.get(id);
    if (!channel) {
      this.audio ??= new AudioContext();
      const element = new Audio(`assets/sounds/${id}.mp3`);
      element.loop = true;
      const gain = this.audio.createGain();
      gain.gain.value = this.volume(id);
      this.audio.createMediaElementSource(element).connect(gain).connect(this.audio.destination);
      channel = { element, gain };
      this.channels.set(id, channel);
    }
    return channel;
  }

  private setPlaying(id: string, on: boolean): void {
    this.playing.update((playing) => {
      const next = new Set(playing);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }
}
