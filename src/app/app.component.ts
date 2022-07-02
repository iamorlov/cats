import { Component, HostListener, OnInit } from '@angular/core';
import { WeatherService } from './weather.service';
import { weatherIcons } from './weather-icons';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent implements OnInit {
  public images = 1010; // Count of cat walls ♥
  public random: number = Math.floor(Math.random() * this.images);
  public random_new: number = 0;
  public cat: string = 'wall-' + this.random + '.jpg';
  public preload: string = '/assets/walls/' + this.cat;
  public time: number = Date.now();
  public filter: string | null = '';
  public easter_egg: string | null = '';
  public temp_c: boolean = true;
  public temp_f: boolean = false;
  public time_eur: boolean = true;
  public time_usa: boolean = false;
  public vm = this;

  public clock: string | null = localStorage.getItem('clock');
  public weather: string | null = localStorage.getItem('weather');
  public temperature: string | null = localStorage.getItem('temperature');
  public timeformat: string | null = localStorage.getItem('format');
  public lat: any = localStorage.getItem('geo_lat');
  public lan: any = localStorage.getItem('geo_lan');

  public weatherJSON: any = null;
  public weather_temp_c: number = 0;
  public weather_temp_f: number = 0;
  public weather_icon: string = '';
  public weather_icons: any = null;

  constructor(public weatherService: WeatherService) {
    setInterval(() => {
      this.time = Date.now();
    }, 1000);

    this.weather_icons = weatherIcons;
    this.getGeoLocation();
  }

  public getGeoLocation() {
    navigator.geolocation.getCurrentPosition(
      function success(position) {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        localStorage.setItem('geo_lat', String(latitude));
        localStorage.setItem('geo_lan', String(longitude));
      }
    );
    (setTimeout(() => {
      this.lat = localStorage.getItem('geo_lat');
      this.lan = localStorage.getItem('geo_lan');
      this.getWeatherJSON(this.lat, this.lan);
    }), 500);
  }

  public getWeatherJSON(lat: number, lan: number) {
    if (lat !== null || lan !== null) {
      return this.weatherService.getWeather(lat, lan)
      .subscribe(data => {
        this.weatherJSON = data;
        const prefix = 'wi wi-';
        const code = this.weatherJSON.weather[0].id;
        let icon = this.weather_icons[code].icon;
        if (!(code > 699 && code < 800) && !(code > 899 && code < 1000)) {
          icon = 'day-' + icon;
        }
        icon = prefix + icon;
        this.weather_icon = icon;
        this.weather_temp_c = Math.round(this.weatherJSON.main.temp - 273.15);
        this.weather_temp_f = Math.round((((this.weatherJSON.main.temp - 273.15) * 9) / 5) + 32);
      });
    } else {
      console.log('Something meow wrong! Please, provide access to tracking location and refresh the page :3');
      return 0;
    }
  }

  public getFullScreen() {
    const screen = document.body;
    screen['requestFullscreen']();
  }

  public changeSettings(event: string) {
    switch (event) {
      case 'changed weather':
        this.weather = localStorage.getItem('weather');
      break;
      case 'changed temperature':
        this.temperature = localStorage.getItem('temperature');
        if (this.temperature === 'celsius') {
          this.temp_c = true;
          this.temp_f = false;
        }
        if (this.temperature === 'fahrenheit') {
          this.temp_c = false;
          this.temp_f = true;
        }
      break;
      case 'changed clock':
        this.clock = localStorage.getItem('clock');
      break;
      case 'changed time format':
        this.timeformat = localStorage.getItem('format');
        if (this.timeformat === '24H') {
          this.time_eur = true;
          this.time_usa = false;
        }
        if (this.timeformat === '12H') {
          this.time_usa = true;
          this.time_eur = false;
        }
      break;
      case 'changed filter':
        this.filter = localStorage.getItem('filter');
      break;
      case 'nyan cats':
        this.easter_egg = sessionStorage.getItem('cat_nyan');
      break;
      case 'nyan ends':
        sessionStorage.clear();
        this.easter_egg = sessionStorage.getItem('cat_nyan');
      break;
      default:
        console.log('We doesn\'t meow what do you want with: ', event);
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (event.code === 'Enter') {
      const donwload = document.getElementById('download') as HTMLBaseElement;
      donwload.click();
    }
  }

  ngOnInit() {
    sessionStorage.clear();

    setInterval(() => {
      const random_new = Math.floor(Math.random() * this.images);
      this.preload = '/assets/walls/wall-' + random_new + '.jpg';
      setTimeout(() => {
        this.cat = 'wall-' + random_new + '.jpg';
      }, 3000);
    }, 9000);

    this.temperature = localStorage.getItem('temperature');
    if (this.temperature === 'celsius' || null) {
      this.temp_c = true;
      this.temp_f = false;
    }
    if (this.temperature === 'fahrenheit') {
      this.temp_c = false;
      this.temp_f = true;
    }

    this.timeformat = localStorage.getItem('format');
    if (this.timeformat === '24H' || null) {
      this.time_eur = true;
      this.time_usa = false;
    }
    if (this.timeformat === '12H') {
      this.time_usa = true;
      this.time_eur = false;
    }

  console.log(`%c
      |\\__/,|   (\`\\
    _.|o o  |_   ) )
---(((---(((---------
----- MEOW ----------
------------ iamorlov
            `, 'font-family:monospace');

  console.log('Слава Україні!');

  }
}
