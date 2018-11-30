import { Component ,OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  images:number = 33;
  random:number = Math.floor(Math.random()*this.images);
  random_new:number;
  cat:string = "wall-" + this.random +".jpg";
  preload:string = "/assets/walls/" + this.cat;

  constructor() {
    setInterval(() => {
      var random_new = Math.floor(Math.random()*this.images);
      this.preload = "/assets/walls/wall-" + random_new +".jpg";
      setTimeout(() => {
        this.cat = "wall-" + random_new +".jpg";
      }, 2000);
    }, 5000);
  };

  ngOnInit() {};
}
