import { Component ,OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  random:number = Math.floor(Math.random()*11);
  cat:string = "wall-" + this.random +".jpg";

  constructor() {
    setInterval(() => {
      this.random = Math.floor(Math.random()*11);
      this.cat = "wall-" + this.random +".jpg";
    }, 4000);
  };

  ngOnInit() {};
}
