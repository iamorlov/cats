import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  private api_key = '0ff4143b2f608054241845b65cee0dea';

  constructor(private http: HttpClient) {}

  public getWeather(lat: number, lan: number) {
    // tslint:disable-next-line:max-line-length
    return this.http.get('https://api.openweathermap.org/data/2.5/weather?lat=' + lat + '&lon=' + lan + '&appid=' + this.api_key)
  }
}
