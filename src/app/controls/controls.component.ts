import { Component, OnInit, Input, HostListener, Output, EventEmitter, OnDestroy } from '@angular/core';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-controls',
  templateUrl: './controls.component.html',
  styleUrls: ['./controls.component.scss'],
})
export class ControlsComponent implements OnInit, OnDestroy {
  @Input() images: number = 0;
  @Output() settingsEmitter = new EventEmitter<string>();

  public music: boolean = false;
  public info: boolean = false;
  public settings: boolean = false;

  public catSound: boolean = false;
  public rainSound: boolean = false;
  public nightSound: boolean = false;
  public oceanSound: boolean = false;
  public fireSound: boolean = false;
  public cafe: boolean = false;
  public cityStreet: boolean = false;
  public birds: boolean = false;

  public easter_egg: boolean = false;

  public isCelsius: boolean = true;
  public isNormalTime: boolean = true;

  public cat_audio: HTMLAudioElement = new Audio('/assets/sounds/purring.mp3');
  public rain_audio: HTMLAudioElement = new Audio('/assets/sounds/rain.mp3');
  public night_audio: HTMLAudioElement = new Audio('/assets/sounds/night.mp3');
  public ocean_audio: HTMLAudioElement = new Audio('/assets/sounds/waves.mp3');
  public fire_audio: HTMLAudioElement = new Audio('/assets/sounds/fire.mp3');
  public cafe_audio: HTMLAudioElement = new Audio('/assets/sounds/cafe.mp3');
  public city_audio: HTMLAudioElement = new Audio('/assets/sounds/city_street.mp3');
  public birds_audio: HTMLAudioElement = new Audio('/assets/sounds/birds.mp3');

  // public filters: string[] = [
  //   'No filter',
  //   '1977',
  //   'aden',
  //   'amaro',
  //   'ashby',
  //   'brannan',
  //   'brooklyn',
  //   'charmes',
  //   'clarendon',
  //   'crema',
  //   'dogpatch',
  //   'earlybird',
  //   'gingham',
  //   'ginza',
  //   'hefe',
  //   'helena',
  //   'hudson',
  //   'inkwell',
  //   'juno',
  //   'kelvin',
  //   'lark',
  //   'lofi',
  //   'ludwig',
  //   'maven',
  //   'mayfair',
  //   'moon',
  //   'nashville',
  //   'perpetua',
  //   'poprocket',
  //   'reyes',
  //   'rise',
  //   'sierra',
  //   'skyline',
  //   'slumber',
  //   'stinson',
  //   'sutro',
  //   'toaster',
  //   'valencia',
  //   'vesper',
  //   'walden',
  //   'willow',
  //   'xpro-II',
  // ];

  // public filter_storage: string | null = localStorage.getItem('filter');
  public temperature: string | null = localStorage.getItem('temperature');
  public timeformat: string | null = localStorage.getItem('format');

  private subscriptions = new Subscription();
  private audioElements: { [key: string]: { audio: HTMLAudioElement; state: boolean } } = {
    catSound: { audio: this.cat_audio, state: this.catSound },
    rainSound: { audio: this.rain_audio, state: this.rainSound },
    nightSound: { audio: this.night_audio, state: this.nightSound },
    oceanSound: { audio: this.ocean_audio, state: this.oceanSound },
    fireSound: { audio: this.fire_audio, state: this.fireSound },
    cafe: { audio: this.cafe_audio, state: this.cafe },
    cityStreet: { audio: this.city_audio, state: this.cityStreet },
    birds: { audio: this.birds_audio, state: this.birds },
  };

  constructor() {}

  ngOnInit(): void {
    this.initializeSettings();
    // this.startFilterPolling();
    this.setupAudioLoops();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.stopAllAudio();
  }

  private initializeSettings(): void {
    // Set default temperature to Celsius
    this.temperature = this.temperature || 'celsius';
    localStorage.setItem('temperature', this.temperature);
    this.isCelsius = this.temperature === 'celsius';

    // Set default time format to 24H
    this.timeformat = this.timeformat || '24H';
    localStorage.setItem('format', this.timeformat);
    this.isNormalTime = this.timeformat === '24H';

    // Set default filter to 'No filter'
    // this.filter_storage = this.filter_storage || 'No filter';
    // localStorage.setItem('filter', this.filter_storage);

    // Initialize checkbox states
    this.updateCheckbox('clock', 'show-clock');
    this.updateCheckbox('weather', 'show-weather');
  }

  private updateCheckbox(key: string, elementId: string): void {
    const value = localStorage.getItem(key);
    if (value === 'true') {
      const checkbox = document.getElementById(elementId) as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = true;
      }
    }
  }

  // private startFilterPolling(): void {
  //   this.subscriptions.add(
  //     interval(100).subscribe(() => {
  //       this.filter_storage = localStorage.getItem('filter');
  //     })
  //   );
  // }

  private setupAudioLoops(): void {
    Object.values(this.audioElements).forEach(({ audio }) => {
      audio.loop = true; // Use native HTMLAudioElement loop property
    });
  }

  private stopAllAudio(): void {
    Object.values(this.audioElements).forEach(({ audio }) => {
      audio.pause();
      audio.currentTime = 0;
    });
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (event.code === 'Space') {
      if (this.music || this.info || this.settings) {
        this.music = false;
        this.info = false;
        this.settings = false;
      } else {
        this.info = true;
      }
    }
  }

  // Main navigation
  showPlayer(): void {
    this.music = !this.music;
    this.info = false;
    this.settings = false;
  }

  showInfo(): void {
    this.info = !this.info;
    this.music = false;
    this.settings = false;
  }

  showSettings(): void {
    this.settings = !this.settings;
    this.info = false;
    this.music = false;
  }

  // Weather Settings
  toggleWeather(): void {
    const checkbox = document.getElementById('show-weather') as HTMLInputElement;
    if (checkbox) {
      localStorage.setItem('weather', String(checkbox.checked));
      this.settingsEmitter.emit('changed weather');
    }
  }

  changeMetric(scale: string): void {
    this.temperature = scale;
    localStorage.setItem('temperature', scale);
    this.isCelsius = scale === 'celsius';
    this.settingsEmitter.emit('changed temperature');
  }

  // Time Settings
  toggleClock(): void {
    const checkbox = document.getElementById('show-clock') as HTMLInputElement;
    if (checkbox) {
      localStorage.setItem('clock', String(checkbox.checked));
      this.settingsEmitter.emit('changed clock');
    }
  }

  changeTime(scale: string): void {
    this.timeformat = scale;
    localStorage.setItem('format', scale);
    this.isNormalTime = scale === '24H';
    this.settingsEmitter.emit('changed time format');
  }

  // Sounds
  playSound(id: string): void {
    const playButton = document.getElementById(id) as HTMLInputElement;
    const audioConfig = this.audioElements[id];

    if (!audioConfig) {
      console.warn(`Unknown sound ID: ${id}`);
      return;
    }

    playButton?.classList.toggle('is--playing');
    const { audio, state } = audioConfig;

    if (!state) {
      audio.play().catch((error) => console.error(`Failed to play ${id}:`, error));
      audioConfig.state = true;
    } else {
      audio.pause();
      audio.currentTime = 0;
      audioConfig.state = false;
    }

    // Update component state
    this[id as keyof this] = audioConfig.state as any;
  }

  // Instagram filters
  // chooseFilter(filter: string): void {
  //   localStorage.setItem('filter', filter);
  //   this.filter_storage = filter;
  //   this.settingsEmitter.emit('changed filter');
  // }

  // Easter Egg
  easterEgg(): void {
    this.easter_egg = !this.easter_egg;
    sessionStorage.setItem('cat_nyan', 'nyan_cats');
    this.settingsEmitter.emit('nyan cats');
  }

  easterEggStop(): void {
    this.easter_egg = false;
    sessionStorage.clear();
    this.settingsEmitter.emit('nyan ends');
  }
}