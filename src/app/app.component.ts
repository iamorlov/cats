import { Component ,OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  random:number = Math.floor(Math.random()*3);
  cat:string = "wall-" + this.random +".jpg";
  
  constructor() {
    setInterval(function(){
      this.random = Math.floor(Math.random()*3);
      console.log(random);
    }, 2000);
  }
  ngOnInit() {};
}
