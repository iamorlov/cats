import { Component, OnInit, HostListener } from '@angular/core';

@Component({
  selector: 'app-controls',
  templateUrl: './controls.component.html',
  styleUrls: ['./controls.component.css']
})
export class ControlsComponent implements OnInit {
  music = false;
  info = false;
  settings = false;

  nature_song = false; // default active tab
  rain_song = false;
  ambient_song = false;
  house_song = false;

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

  easter_egg = false;

  cat_audio: any = new Audio('/assets/sounds/purring.mp3');
  rain_audio: any = new Audio('/assets/sounds/rain.mp3');
  night_audio: any = new Audio('/assets/sounds/night.mp3');
  ocean_audio: any = new Audio('/assets/sounds/waves.mp3');
  fire_audio: any = new Audio('/assets/sounds/fire.mp3');

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

  catSoundPlay() {
    this.cat_audio.addEventListener('ended', function() {
      this.currentTime = 0;
      this.play();
    }, false);
    this.cat_audio.play();
    this.catSound = !this.catSound;
  }

  catSoundStop() {
    this.cat_audio.currentTime = 0;
    this.cat_audio.pause();
    this.catSound = !this.catSound;
  }

  rainSoundPlay() {
    this.rain_audio.addEventListener('ended', function() {
      this.currentTime = 0;
      this.play();
    }, false);
    this.rain_audio.play();
    this.rainSound = !this.rainSound;
  }

  rainSoundStop() {
    this.rain_audio.currentTime = 0;
    this.rain_audio.pause();
    this.rainSound = !this.rainSound;
  }

  nightSoundPlay() {
    this.night_audio.addEventListener('ended', function() {
      this.currentTime = 0;
      this.play();
    }, false);
    this.night_audio.play();
    this.nightSound = !this.nightSound;
  }

  nightSoundStop() {
    this.night_audio.currentTime = 0;
    this.night_audio.pause();
    this.nightSound = !this.nightSound;
  }

  oceanSoundPlay() {
    this.ocean_audio.addEventListener('ended', function() {
      this.currentTime = 0;
      this.play();
    }, false);
    this.ocean_audio.play();
    this.oceanSound = !this.oceanSound;
  }

  oceanSoundStop() {
    this.ocean_audio.currentTime = 0;
    this.ocean_audio.pause();
    this.oceanSound = !this.oceanSound;
  }

  fireSoundPlay() {
    this.fire_audio.addEventListener('ended', function() {
      this.currentTime = 0;
      this.play();
    }, false);
    this.fire_audio.play();
    this.fireSound = !this.fireSound;
  }

  fireSoundStop() {
    this.fire_audio.currentTime = 0;
    this.fire_audio.pause();
    this.fireSound = !this.fireSound;
  }

  // music

  musicOne() {
    if (this.nature_song === false) {
      this.nature_song = !this.nature_song;
      this.rain_song = false;
      this.ambient_song = false;
      this.house_song = false;
    }
  }

  musicTwo() {
    if (this.rain_song === false) {
      this.rain_song = !this.rain_song;
      this.ambient_song = false;
      this.nature_song = false;
      this.house_song = false;
    }
  }

  musicThree() {
    if (this.ambient_song === false) {
      this.ambient_song = !this.ambient_song;
      this.rain_song = false;
      this.nature_song = false;
      this.house_song = false;
    }
  }

  musicFour() {
    if (this.house_song === false) {
      this.house_song = !this.house_song;
      this.rain_song = false;
      this.nature_song = false;
      this.ambient_song = false;
    }
  }

  // easter easterEgg

  easterEgg() {
    this.easter_egg = !this.easter_egg;
    sessionStorage.setItem('cat_doom', 'doom_cats');
  }

  easterEggStop() {
      this.easter_egg = false;
      sessionStorage.clear();
  }

  // instagram filters

  chooseFilter(filter) {
    localStorage.removeItem('filter');
    localStorage.setItem('filter', filter);
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
  }

  // clock

  toggleWeather() {
    const checkbox = document.getElementById('show-weather');
    if (checkbox['checked'] === true) {
      localStorage.setItem('weather', 'true');
    }
    if (checkbox['checked'] === false) {
      localStorage.setItem('weather', 'false');
    }
  }

  // meow sounds

  toggleMeows() {
    const checkbox = document.getElementById('show-meows');
    if (checkbox['checked'] === true) {
      localStorage.setItem('meow', 'true');
    }
    if (checkbox['checked'] === false) {
      localStorage.setItem('meow', 'false');
    }
  }

  ngOnInit() {
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
      const checked_meow = localStorage.getItem('meow');
      if (checked_meow === 'true') {
        document.getElementById('show-meows')['checked'] = checked_meow;
      }
    })();

    setInterval(() => {
      this.filter_storage = localStorage.getItem('filter');
    }, 100);
  }

}
