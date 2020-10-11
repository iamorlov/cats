import { Component, HostListener, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import 'rxjs/add/operator/map';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements OnInit {
  images = 750; // Count of cat walls ♥
  random: number = Math.floor(Math.random() * this.images);
  random_new: number;
  cat: string = 'wall-' + this.random + '.jpg';
  preload: string = '/assets/walls/' + this.cat;
  clock: string = localStorage.getItem('clock');
  weather: string = localStorage.getItem('weather');
  temperature: string = localStorage.getItem('temperature');
  timeformat: string = localStorage.getItem('format');
  time: number = Date.now();
  filter: string;
  easter_egg: string;
  temp_c: boolean;
  temp_f: boolean;
  time_eur: boolean;
  time_usa: boolean;
  vm = this;

  // Weather api
  private api_key = '0ff4143b2f608054241845b65cee0dea';
  public lat: any = localStorage.getItem('geo_lat');
  public lan: any = localStorage.getItem('geo_lan');

  weatherJSON: any = {
    name: 'Refrest the page',
    main: {
      temp: 'loading...'
    },
    weather: {
      0: {
        description: 'loading...'
      }
    }
  };
  weather_icon: string;
  weather_temp_c: number;
  weather_temp_f: number;
  weather_icons = {
    '200': {
      'label': 'thunderstorm with light rain',
      'icon': 'storm-showers'
    },

    '201': {
      'label': 'thunderstorm with rain',
      'icon': 'storm-showers'
    },

    '202': {
      'label': 'thunderstorm with heavy rain',
      'icon': 'storm-showers'
    },

    '210': {
      'label': 'light thunderstorm',
      'icon': 'storm-showers'
    },

    '211': {
      'label': 'thunderstorm',
      'icon': 'thunderstorm'
    },

    '212': {
      'label': 'heavy thunderstorm',
      'icon': 'thunderstorm'
    },

    '221': {
      'label': 'ragged thunderstorm',
      'icon': 'thunderstorm'
    },

    '230': {
      'label': 'thunderstorm with light drizzle',
      'icon': 'storm-showers'
    },

    '231': {
      'label': 'thunderstorm with drizzle',
      'icon': 'storm-showers'
    },

    '232': {
      'label': 'thunderstorm with heavy drizzle',
      'icon': 'storm-showers'
    },

    '300': {
      'label': 'light intensity drizzle',
      'icon': 'sprinkle'
    },

    '301': {
      'label': 'drizzle',
      'icon': 'sprinkle'
    },

    '302': {
      'label': 'heavy intensity drizzle',
      'icon': 'sprinkle'
    },

    '310': {
      'label': 'light intensity drizzle rain',
      'icon': 'sprinkle'
    },

    '311': {
      'label': 'drizzle rain',
      'icon': 'sprinkle'
    },

    '312': {
      'label': 'heavy intensity drizzle rain',
      'icon': 'sprinkle'
    },

    '313': {
      'label': 'shower rain and drizzle',
      'icon': 'sprinkle'
    },

    '314': {
      'label': 'heavy shower rain and drizzle',
      'icon': 'sprinkle'
    },

    '321': {
      'label': 'shower drizzle',
      'icon': 'sprinkle'
    },

    '500': {
      'label': 'light rain',
      'icon': 'rain'
    },

    '501': {
      'label': 'moderate rain',
      'icon': 'rain'
    },

    '502': {
      'label': 'heavy intensity rain',
      'icon': 'rain'
    },

    '503': {
      'label': 'very heavy rain',
      'icon': 'rain'
    },

    '504': {
      'label': 'extreme rain',
      'icon': 'rain'
    },

    '511': {
      'label': 'freezing rain',
      'icon': 'rain-mix'
    },

    '520': {
      'label': 'light intensity shower rain',
      'icon': 'showers'
    },

    '521': {
      'label': 'shower rain',
      'icon': 'showers'
    },

    '522': {
      'label': 'heavy intensity shower rain',
      'icon': 'showers'
    },

    '531': {
      'label': 'ragged shower rain',
      'icon': 'showers'
    },

    '600': {
      'label': 'light snow',
      'icon': 'snow'
    },

    '601': {
      'label': 'snow',
      'icon': 'snow'
    },

    '602': {
      'label': 'heavy snow',
      'icon': 'snow'
    },

    '611': {
      'label': 'sleet',
      'icon': 'sleet'
    },

    '612': {
      'label': 'shower sleet',
      'icon': 'sleet'
    },

    '615': {
      'label': 'light rain and snow',
      'icon': 'rain-mix'
    },

    '616': {
      'label': 'rain and snow',
      'icon': 'rain-mix'
    },

    '620': {
      'label': 'light shower snow',
      'icon': 'rain-mix'
    },

    '621': {
      'label': 'shower snow',
      'icon': 'rain-mix'
    },

    '622': {
      'label': 'heavy shower snow',
      'icon': 'rain-mix'
    },

    '701': {
      'label': 'mist',
      'icon': 'sprinkle'
    },

    '711': {
      'label': 'smoke',
      'icon': 'smoke'
    },

    '721': {
      'label': 'haze',
      'icon': 'day-haze'
    },

    '731': {
      'label': 'sand, dust whirls',
      'icon': 'cloudy-gusts'
    },

    '741': {
      'label': 'fog',
      'icon': 'fog'
    },

    '751': {
      'label': 'sand',
      'icon': 'cloudy-gusts'
    },

    '761': {
      'label': 'dust',
      'icon': 'dust'
    },

    '762': {
      'label': 'volcanic ash',
      'icon': 'smog'
    },

    '771': {
      'label': 'squalls',
      'icon': 'day-windy'
    },

    '781': {
      'label': 'tornado',
      'icon': 'tornado'
    },

    '800': {
      'label': 'clear sky',
      'icon': 'sunny'
    },

    '801': {
      'label': 'few clouds',
      'icon': 'cloudy'
    },

    '802': {
      'label': 'scattered clouds',
      'icon': 'cloudy'
    },

    '803': {
      'label': 'broken clouds',
      'icon': 'cloudy'
    },

    '804': {
      'label': 'overcast clouds',
      'icon': 'cloudy'
    },


    '900': {
      'label': 'tornado',
      'icon': 'tornado'
    },

    '901': {
      'label': 'tropical storm',
      'icon': 'hurricane'
    },

    '902': {
      'label': 'hurricane',
      'icon': 'hurricane'
    },

    '903': {
      'label': 'cold',
      'icon': 'snowflake-cold'
    },

    '904': {
      'label': 'hot',
      'icon': 'hot'
    },

    '905': {
      'label': 'windy',
      'icon': 'windy'
    },

    '906': {
      'label': 'hail',
      'icon': 'hail'
    },

    '951': {
      'label': 'calm',
      'icon': 'sunny'
    },

    '952': {
      'label': 'light breeze',
      'icon': 'cloudy-gusts'
    },

    '953': {
      'label': 'gentle breeze',
      'icon': 'cloudy-gusts'
    },

    '954': {
      'label': 'moderate breeze',
      'icon': 'cloudy-gusts'
    },

    '955': {
      'label': 'fresh breeze',
      'icon': 'cloudy-gusts'
    },

    '956': {
      'label': 'strong breeze',
      'icon': 'cloudy-gusts'
    },

    '957': {
      'label': 'high wind, near gale',
      'icon': 'cloudy-gusts'
    },

    '958': {
      'label': 'gale',
      'icon': 'cloudy-gusts'
    },

    '959': {
      'label': 'severe gale',
      'icon': 'cloudy-gusts'
    },

    '960': {
      'label': 'storm',
      'icon': 'thunderstorm'
    },

    '961': {
      'label': 'violent storm',
      'icon': 'thunderstorm'
    },

    '962': {
      'label': 'hurricane',
      'icon': 'cloudy-gusts'
    }
  };

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (event.code === 'Enter') {
      console.log(232323);
      const donwload = document.getElementById('download');
      donwload.click();
    }
  }

  constructor(private http: HttpClient ) {
    setInterval(() => {
      this.time = Date.now();
    }, 1000);

    this.getGeoLocation();
  }

  getGeoLocation() {
    navigator.geolocation.getCurrentPosition(
      function success(position) {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        localStorage.setItem('geo_lat', String(latitude));
        localStorage.setItem('geo_lan', String(longitude));
      }
    );
    this.getWeatherJSON();
  }

  getWeatherJSON() {
    if (this.lat !== null || this.lan !== null) {
      // tslint:disable-next-line:max-line-length
      return this.http.get('https://api.openweathermap.org/data/2.5/weather?lat=' + this.lat + '&lon=' + this.lan + '&appid=' + this.api_key)
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
    }
  }

  getFullScreen() {
    const screen = document.body;
    if (screen['requestFullScreen']) {
      screen['requestFullScreen']();
    } else if (screen['mozRequestFullScreen']) {
      screen['mozRequestFullScreen']();
    } else if (screen['webkitRequestFullScreen']) {
      screen['webkitRequestFullScreen']();
    }
  }

  changeSettings(event: string) {
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
      case 'doom cats':
        this.easter_egg = sessionStorage.getItem('cat_doom');
      break;
      case 'doom ends':
        sessionStorage.clear();
        this.easter_egg = sessionStorage.getItem('cat_doom');
      break;
      default:
        console.log('We doesn\'t meow what do you want with: ', event);
    }
    console.log('changed: ', event);
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
    if (this.temperature === 'celsius') {
      this.temp_c = true;
      this.temp_f = false;
    }
    if (this.temperature === 'fahrenheit') {
      this.temp_c = false;
      this.temp_f = true;
    }

    this.timeformat = localStorage.getItem('format');
    if (this.timeformat === '24H') {
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
  }
}
