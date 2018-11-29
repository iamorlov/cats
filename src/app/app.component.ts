import { Component ,OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  random:number = Math.floor(Math.random()*11);
  cat:string = "wall-" + this.random +".jpg";
  cat_wall:string = "/assets/walls/" + this.cat;
  cats = document.getElementById("loveCats");

  constructor() {
    console.log(this.cats);
    setInterval(() => {
      this.random = Math.floor(Math.random()*11);
      this.cat = "wall-" + this.random +".jpg";
      this.cat_wall = "/assets/walls/" + this.cat;
    }, 2000);
  };

  ngOnInit() {};

  openFullscreen() {
    this.cats.requestFullscreen();
  };
}
