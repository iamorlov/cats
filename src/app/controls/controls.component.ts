import { Component, OnInit, HostListener, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-controls',
  templateUrl: './controls.component.html',
  styleUrls: ['./controls.component.css']
})
export class ControlsComponent implements OnInit {

  @Output() updated = new EventEmitter<string>();

  images = 650; // Count of cat walls ♥

  music = false;
  info = false;
  settings = false;

  filter_storage: string = localStorage.getItem('filter');
  filters: any = ['No filter', '1977', 'aden', 'amaro', 'ashby', 'brannan',
  'brooklyn', 'charmes', 'clarendon', 'crema', 'dogpatch', 'earlybird',
  'gingham', 'ginza', 'hefe', 'helena', 'hudson', 'inkwell', 'juno', 'kelvin',
  'lark', 'lofi', 'ludwig', 'maven', 'mayfair', 'moon', 'nashville', 'perpetua',
  'poprocket', 'reyes', 'rise', 'sierra', 'skyline', 'slumber', 'stinson',
  'sutro', 'toaster', 'valencia', 'vesper', 'walden', 'willow', 'xpro-II'];

  catSound = false;
  rainSound = false;
  nightSound = false;
  oceanSound = false;
  fireSound = false;
  cafe = false;
  cityStreet = false;
  birds = false;

  easter_egg = false;
  changed_temperature = false;

  isCelsius = true;

  cat_audio: any = new Audio('/assets/sounds/purring.mp3');
  rain_audio: any = new Audio('/assets/sounds/rain.mp3');
  night_audio: any = new Audio('/assets/sounds/night.mp3');
  ocean_audio: any = new Audio('/assets/sounds/waves.mp3');
  fire_audio: any = new Audio('/assets/sounds/fire.mp3');
  cafe_audio: any = new Audio('/assets/sounds/cafe.mp3');
  city_audio: any = new Audio('/assets/sounds/city_street.mp3');
  birds_audio: any = new Audio('/assets/sounds/birds.mp3');

  temperature: string = localStorage.getItem('temperature');

  constructor() { }

  @HostListener('document:keypress', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.keyCode === 32) {
      if (this.music || this.info || this.settings) {
        this.music = false;
        this.info = false;
        this.settings = false;
      } else {
        this.info = true;
      }
    }
  }

  // main navigation

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

  // Sounds

  playSound(id: string) {
    const playButton = document.getElementById(id);
    playButton.classList.toggle('is--playing');

    switch (id) {
      case 'catSound':
        if (!this.catSound) {
          this.cat_audio.addEventListener('ended', function() {
            this.currentTime = 0;
            this.play();
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
          this.rain_audio.addEventListener('ended', function() {
            this.currentTime = 0;
            this.play();
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
          this.night_audio.addEventListener('ended', function() {
            this.currentTime = 0;
            this.play();
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
          this.ocean_audio.addEventListener('ended', function() {
            this.currentTime = 0;
            this.play();
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
          this.fire_audio.addEventListener('ended', function() {
            this.currentTime = 0;
            this.play();
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
          this.cafe_audio.addEventListener('ended', function() {
            this.currentTime = 0;
            this.play();
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
          this.city_audio.addEventListener('ended', function() {
            this.currentTime = 0;
            this.play();
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
          this.birds_audio.addEventListener('ended', function() {
            this.currentTime = 0;
            this.play();
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

  // easter easterEgg

  easterEgg() {
    this.easter_egg = !this.easter_egg;
    sessionStorage.setItem('cat_doom', 'doom_cats');
    this.updated.emit('doom cats');
  }

  easterEggStop() {
      this.easter_egg = false;
      sessionStorage.clear();
      this.updated.emit('doom ends');
  }

  // instagram filters

  chooseFilter(filter) {
    localStorage.removeItem('filter');
    localStorage.setItem('filter', filter);
    this.updated.emit('changed filter');
  }

  // clock

  toggleClock() {
    const checkbox = document.getElementById('show-clock');
    if (checkbox['checked'] === true) {
      localStorage.setItem('clock', 'true');
    }
    if (checkbox['checked'] === false) {
      localStorage.setItem('clock', 'false');
    }
    this.updated.emit('changed clock');
  }

  // weather

  toggleWeather() {
    const checkbox = document.getElementById('show-weather');
    if (checkbox['checked'] === true) {
      localStorage.setItem('weather', 'true');
    }
    if (checkbox['checked'] === false) {
      localStorage.setItem('weather', 'false');
    }
    this.updated.emit('changed weather');
  }

  changeMetric(scale: string) {
    if (scale === 'fahrenheit') {
      localStorage.setItem('temperature', 'fahrenheit');
      this.isCelsius = false;
    } else {
      localStorage.setItem('temperature', 'celsius');
      this.isCelsius = true;
    }
    this.updated.emit('changed temperature');
    this.changed_temperature = true;
  }

  ngOnInit() {

    if (!this.temperature) {
      localStorage.setItem('temperature', 'celsius'); // Let Celsius be dafault
    }
    if (this.temperature === 'celsius') {
      this.isCelsius = true;
    } else {
      this.isCelsius = false;
    }

    if (localStorage.getItem('filter') === null) {
      localStorage.setItem('filter', 'No filter');
    }

    (function() {
      const checked_clock = localStorage.getItem('clock');
      if (checked_clock === 'true') {
        document.getElementById('show-clock')['checked'] = checked_clock;
      }
      const checked_weather = localStorage.getItem('weather');
      if (checked_weather === 'true') {
        document.getElementById('show-weather')['checked'] = checked_weather;
      }
    })();

    setInterval(() => {
      this.filter_storage = localStorage.getItem('filter');
    }, 100);
  }

}
