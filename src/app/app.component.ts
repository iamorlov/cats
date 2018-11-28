import { Component ,OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  random:number = 2;
  cat:string;
  ngOnInit() {
    setInterval(function(){
      var random = Math.floor(Math.random()*3);
      console.log(random);
      return random;
    }, 1000);
    var cat = "wall-" + this.random +".jpg";
  };
}
