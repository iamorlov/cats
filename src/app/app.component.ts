import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements OnInit {
  images = 420; // Count of cat walls ♥
  random: number = Math.floor(Math.random() * this.images);
  random_new: number;
  cat: string = 'wall-' + this.random + '.jpg';
  preload: string = '/assets/walls/' + this.cat;
  clock: string = localStorage.getItem('clock');
  meows: string = localStorage.getItem('meow');
  time: number = Date.now();
  filter: string;
  easter_egg: string;

  constructor() {
    setInterval(() => {
      const random_new = Math.floor(Math.random() * this.images);
      this.preload = '/assets/walls/wall-' + random_new + '.jpg';
      setTimeout(() => {
        this.cat = 'wall-' + random_new + '.jpg';
      }, 3000);
    }, 8000);

    setInterval(() => {
      this.time = Date.now();
      this.clock = localStorage.getItem('clock');
      this.meows = localStorage.getItem('meow');
      this.filter = localStorage.getItem('filter');
      this.easter_egg = sessionStorage.getItem('cat_doom');
    }, 100);
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

  ngOnInit( ) {
    sessionStorage.clear();

    document.body.addEventListener('click', function() {
      if (localStorage.getItem('meow') === 'true') {
        const meow_random: number = Math.floor(Math.random() * 8);
        const meow_audio: any = new Audio('/assets/meows/' + meow_random + '.mp3');
        meow_audio.play();
      }
    });

  console.log(`%c
      |\\__/,|   (\`\\
    _.|o o  |_   ) )
---(((---(((---------
----- MEOW ----------
------------ iamorlov
            `, 'font-family:monospace');
  }
}
