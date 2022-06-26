import { Component, OnInit, Input, HostListener, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-controls',
  templateUrl: './controls.component.html',
  styleUrls: ['./controls.component.scss']
})
export class ControlsComponent implements OnInit {

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

  public cat_audio: any = new Audio('/assets/sounds/purring.mp3');
  public rain_audio: any = new Audio('/assets/sounds/rain.mp3');
  public night_audio: any = new Audio('/assets/sounds/night.mp3');
  public ocean_audio: any = new Audio('/assets/sounds/waves.mp3');
  public fire_audio: any = new Audio('/assets/sounds/fire.mp3');
  public cafe_audio: any = new Audio('/assets/sounds/cafe.mp3');
  public city_audio: any = new Audio('/assets/sounds/city_street.mp3');
  public birds_audio: any = new Audio('/assets/sounds/birds.mp3');

  public filters: any = ['No filter', '1977', 'aden', 'amaro', 'ashby', 'brannan',
  'brooklyn', 'charmes', 'clarendon', 'crema', 'dogpatch', 'earlybird',
  'gingham', 'ginza', 'hefe', 'helena', 'hudson', 'inkwell', 'juno', 'kelvin',
  'lark', 'lofi', 'ludwig', 'maven', 'mayfair', 'moon', 'nashville', 'perpetua',
  'poprocket', 'reyes', 'rise', 'sierra', 'skyline', 'slumber', 'stinson',
  'sutro', 'toaster', 'valencia', 'vesper', 'walden', 'willow', 'xpro-II'];

  public filter_storage: string | null = localStorage.getItem('filter');
  public temperature: string | null = localStorage.getItem('temperature');
  public timeformat: string | null = localStorage.getItem('format');

  constructor() { }

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
  showPlayer() {
    this.music = !this.music;
    this.info = false;
    this.settings = false;
  }

  showInfo() {
    this.info = !this.info;
    this.music = false;
    this.settings = false;
  }

  showSettings() {
    this.settings = !this.settings;
    this.info = false;
    this.music = false;
  }

  // Weather Settings
  toggleWeather() {
    const checkbox = document.getElementById('show-weather') as HTMLInputElement;
    if (checkbox['checked'] === true) {
      localStorage.setItem('weather', 'true');
    }
    if (checkbox['checked'] === false) {
      localStorage.setItem('weather', 'false');
    }
    this.settingsEmitter.emit('changed weather');
  }

  changeMetric(scale: string) {
    if (scale === 'fahrenheit') {
      localStorage.setItem('temperature', 'fahrenheit');
      this.isCelsius = false;
    } else {
      localStorage.setItem('temperature', 'celsius');
      this.isCelsius = true;
    }
    this.settingsEmitter.emit('changed temperature');
  }

  // Time Settings
  toggleClock() {
    const checkbox = document.getElementById('show-clock') as HTMLInputElement;
    if (checkbox['checked'] === true) {
      localStorage.setItem('clock', 'true');
    }
    if (checkbox['checked'] === false) {
      localStorage.setItem('clock', 'false');
    }
    this.settingsEmitter.emit('changed clock');
  }

  changeTime(scale: string) {
    if (scale === '12H') {
      localStorage.setItem('format', '12H');
      this.isNormalTime = false;
    } else {
      localStorage.setItem('format', '24H');
      this.isNormalTime = true;
    }
    this.settingsEmitter.emit('changed time format');
  }

  // Sounds
  public playSound(id: string) {
    const playButton = document.getElementById(id) as HTMLInputElement;
    playButton.classList.toggle('is--playing');

    switch (id) {
      case 'catSound':
        if (!this.catSound) {
          this.cat_audio.addEventListener('ended', () => {
            this.cat_audio.currentTime = 0;
            this.cat_audio.play();
          }, false);
          this.cat_audio.play();
          this.catSound = !this.catSound;
        } else {
          this.cat_audio.currentTime = 0;
          this.cat_audio.pause();
          this.catSound = !this.catSound;
        }
      break;
      case 'rainSound':
        if (!this.rainSound) {
          this.rain_audio.addEventListener('ended', () => {
            this.rain_audio.currentTime = 0;
            this.rain_audio.play();
          }, false);
          this.rain_audio.play();
          this.rainSound = !this.rainSound;
        } else {
          this.rain_audio.currentTime = 0;
          this.rain_audio.pause();
          this.rainSound = !this.rainSound;
        }
      break;
      case 'nightSound':
        if (!this.nightSound) {
          this.night_audio.addEventListener('ended', () => {
            this.night_audio.currentTime = 0;
            this.night_audio.play();
          }, false);
          this.night_audio.play();
          this.nightSound = !this.nightSound;
        } else {
          this.night_audio.currentTime = 0;
          this.night_audio.pause();
          this.nightSound = !this.nightSound;
        }
      break;
      case 'oceanSound':
        if (!this.oceanSound) {
          this.ocean_audio.addEventListener('ended', () => {
            this.ocean_audio.currentTime = 0;
            this.ocean_audio.play();
          }, false);
          this.ocean_audio.play();
          this.oceanSound = !this.oceanSound;
        } else {
          this.ocean_audio.currentTime = 0;
          this.ocean_audio.pause();
          this.oceanSound = !this.oceanSound;
        }
      break;
      case 'fireSound':
        if (!this.fireSound) {
          this.fire_audio.addEventListener('ended', () => {
            this.fire_audio.currentTime = 0;
            this.fire_audio.play();
          }, false);
          this.fire_audio.play();
          this.fireSound = !this.fireSound;
        } else {
          this.fire_audio.currentTime = 0;
          this.fire_audio.pause();
          this.fireSound = !this.fireSound;
        }
      break;
      case 'cafe':
        if (!this.cafe) {
          this.cafe_audio.addEventListener('ended', () => {
            this.cafe_audio.currentTime = 0;
            this.cafe_audio.play();
          }, false);
          this.cafe_audio.play();
          this.cafe = !this.cafe;
        } else {
          this.cafe_audio.currentTime = 0;
          this.cafe_audio.pause();
          this.cafe = !this.cafe;
        }
      break;
      case 'cityStreet':
        if (!this.cityStreet) {
          this.city_audio.addEventListener('ended', () => {
            this.city_audio.currentTime = 0;
            this.city_audio.play();
          }, false);
          this.city_audio.play();
          this.cityStreet = !this.cityStreet;
        } else {
          this.city_audio.currentTime = 0;
          this.city_audio.pause();
          this.cityStreet = !this.cityStreet;
        }
      break;
      case 'birds':
        if (!this.birds) {
          this.birds_audio.addEventListener('ended', () => {
            this.birds_audio.currentTime = 0;
            this.birds_audio.play();
          }, false);
          this.birds_audio.play();
          this.birds = !this.birds;
        } else {
          this.birds_audio.currentTime = 0;
          this.birds_audio.pause();
          this.birds = !this.birds;
        }
      break;
    }
  }

  // Instagram filters
  chooseFilter(filter: string) {
    localStorage.removeItem('filter');
    localStorage.setItem('filter', filter);
    this.settingsEmitter.emit('changed filter');
  }

  // Easter Egg :D
  easterEgg() {
    this.easter_egg = !this.easter_egg;
    sessionStorage.setItem('cat_nyan', 'nyan_cats');
    this.settingsEmitter.emit('nyan cats');
  }

  easterEggStop() {
    this.easter_egg = false;
    sessionStorage.clear();
    this.settingsEmitter.emit('nyan ends');
  }

  ngOnInit() {

    if (!this.temperature) {
      localStorage.setItem('temperature', 'celsius'); // Let Celsius be dafault
    }
    if (this.temperature === 'fahrenheit') {
      this.isCelsius = false;
    } else {
      this.isCelsius = true;
    }

    if (!this.timeformat) {
      localStorage.setItem('format', '24H'); // Let 24H be dafault
    }
    if (this.timeformat === '12H') {
      this.isNormalTime = false;
    } else {
      this.isNormalTime = true;
    }

    if (localStorage.getItem('filter') === null) {
      localStorage.setItem('filter', 'No filter');
    }

    (function() {
      const checked_clock = localStorage.getItem('clock');
      if (checked_clock === 'true') {
        const clock = document.getElementById('show-clock') as HTMLInputElement;
        clock['checked'] = (checked_clock === 'true');
      }
      const checked_weather = localStorage.getItem('weather');
      if (checked_weather === 'true') {
        const weather = document.getElementById('show-weather') as HTMLInputElement;
        weather['checked'] = (checked_weather === 'true');
      }
    })();

    setInterval(() => {
      this.filter_storage = localStorage.getItem('filter');
    }, 100);
  }

}
