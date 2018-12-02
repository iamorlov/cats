import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements OnInit {
  images: number = 88; // Count of cat walls ♥
  random: number = Math.floor(Math.random() * this.images);
  random_new: number;
  cat: string = "wall-" + this.random + ".jpg";
  preload: string = "/assets/walls/" + this.cat;
  clock:string = localStorage.getItem('clock');
  time:number = Date.now();

  constructor() {
    setInterval(() => {
      var random_new = Math.floor(Math.random() * this.images);
      this.preload = "/assets/walls/wall-" + random_new + ".jpg";
      setTimeout(() => {
        this.cat = "wall-" + random_new + ".jpg";
      }, 3000);
    }, 9000);

    setInterval(() => {
      this.time = Date.now();
      this.clock = localStorage.getItem('clock');
    }, 100);
  };

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

  ngOnInit() {
    console.log(this.clock);
  };
}
