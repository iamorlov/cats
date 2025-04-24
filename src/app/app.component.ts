import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { WeatherService } from './weather/weather.service';
import { weatherIcons } from './weather/weather-icons';
import { interval, Subscription } from 'rxjs';

interface WeatherIcon {
  icon: string;
}
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly IMAGES_COUNT = 1050; // Total number of cat wallpapers
  private readonly KELVIN_TO_CELSIUS = 273.15;
  private subscriptions = new Subscription();

  public images = this.IMAGES_COUNT;
  public random: number = Math.floor(Math.random() * this.images);
  public random_new: number = 0;
  public cat: string = `wall-${this.random}.jpg`;
  public preload: string = `/assets/walls/${this.cat}`;
  public time: number = Date.now();
  public filter: string | null = null;
  public easter_egg: string | null = null;
  public temp_c: boolean = true;
  public temp_f: boolean = false;
  public time_eur: boolean = true;
  public time_usa: boolean = false;

  public clock: string | null = localStorage.getItem('clock');
  public weather: string | null = localStorage.getItem('weather');
  public temperature: string | null = localStorage.getItem('temperature');
  public timeformat: string | null = localStorage.getItem('format');
  public lat: string | null = localStorage.getItem('geo_lat');
  public lan: string | null = localStorage.getItem('geo_lan');

  public weatherJSON: any = null;
  public weather_temp_c: number = 0;
  public weather_temp_f: number = 0;
  public weather_icon: string = '';
  public weather_icons: { [key: number]: WeatherIcon } = weatherIcons;

  constructor(private weatherService: WeatherService) {}

  ngOnInit(): void {
    this.initializeSettings();
    this.startClock();
    this.startBackgroundCycle();
    this.getGeoLocation();
    this.logAppInfo();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initializeSettings(): void {
    sessionStorage.clear();

    this.temperature = localStorage.getItem('temperature') || 'celsius';
    this.temp_c = this.temperature === 'celsius';
    this.temp_f = this.temperature === 'fahrenheit';

    this.timeformat = localStorage.getItem('format') || '24H';
    this.time_eur = this.timeformat === '24H';
    this.time_usa = this.timeformat === '12H';
  }

  private startClock(): void {
    this.subscriptions.add(
      interval(1000).subscribe(() => {
        this.time = Date.now();
      })
    );
  }

  private startBackgroundCycle(): void {
    this.subscriptions.add(
      interval(9000).subscribe(() => {
        this.random_new = Math.floor(Math.random() * this.images);
        this.preload = `/assets/walls/wall-${this.random_new}.jpg`;
        // Preload image
        const img = new Image();
        img.src = this.preload;
        setTimeout(() => {
          this.cat = `wall-${this.random_new}.jpg`;
        }, 3000);
      })
    );
  }

  public getGeoLocation(): void {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.lat = String(position.coords.latitude);
        this.lan = String(position.coords.longitude);
        localStorage.setItem('geo_lat', this.lat);
        localStorage.setItem('geo_lan', this.lan);
        this.getWeatherJSON(this.lat, this.lan);
      },
      () => {
        console.error(
          'Something meow wrong! Please provide access to location and refresh the page :3'
        );
      }
    );
  }

  public getWeatherJSON(lat: string | null, lan: string | null): void {
    if (lat && lan) {
      this.subscriptions.add(
        this.weatherService.getWeather(Number(lat), Number(lan)).subscribe({
          next: (data) => this.processWeatherData(data),
          error: () =>
            console.error('Failed to fetch weather data. Please try again.'),
        })
      );
    } else {
      console.error(
        'Something meow wrong! Please provide access to location and refresh the page :3'
      );
    }
  }

  private processWeatherData(data: any): void {
    this.weatherJSON = data;
    const code = data.weather[0].id;
    let icon = this.weather_icons[code]?.icon || 'unknown';
    if (!(code > 699 && code < 800) && !(code > 899 && code < 1000)) {
      icon = `day-${icon}`;
    }
    this.weather_icon = `wi wi-${icon}`;
    this.weather_temp_c = Math.round(data.main.temp - this.KELVIN_TO_CELSIUS);
    this.weather_temp_f = Math.round((this.weather_temp_c * 9) / 5 + 32);
  }

  public getFullScreen(): void {
    document.body.requestFullscreen().catch(() => {
      console.error('Failed to enter fullscreen mode.');
    });
  }

  public changeSettings(event: string): void {
    switch (event) {
      case 'changed weather':
        this.weather = localStorage.getItem('weather');
        break;
      case 'changed temperature':
        this.temperature = localStorage.getItem('temperature') || 'celsius';
        this.temp_c = this.temperature === 'celsius';
        this.temp_f = this.temperature === 'fahrenheit';
        break;
      case 'changed clock':
        this.clock = localStorage.getItem('clock');
        break;
      case 'changed time format':
        this.timeformat = localStorage.getItem('format') || '24H';
        this.time_eur = this.timeformat === '24H';
        this.time_usa = this.timeformat === '12H';
        break;
      case 'changed filter':
        this.filter = localStorage.getItem('filter');
        break;
      case 'nyan cats':
        this.easter_egg = sessionStorage.getItem('cat_nyan');
        break;
      case 'nyan ends':
        sessionStorage.clear();
        this.easter_egg = null;
        break;
      default:
        console.warn(`Unknown setting event: ${event}`);
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (event.code === 'Enter') {
      const download = document.getElementById('download') as HTMLButtonElement;
      download?.click();
    }
  }

  private logAppInfo(): void {
    console.log(
      `%c
      |\\__/,|   (\`\\
    _.|o o  |_   ) )
  ---(((---(((---------
  ----- MEOW ----------
  ------------ iamorlov
      `,
      'font-family:monospace'
    );
    console.log('Слава Україні!');
  }
}
