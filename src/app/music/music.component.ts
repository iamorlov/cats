import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-music',
  templateUrl: './music.component.html',
  styleUrls: ['./music.component.css']
})
export class MusicComponent implements OnInit {
  music:boolean = false;
  info:boolean = false;
  settings:boolean = false;

  constructor() { }

  showPlayer() {
    this.music = !this.music;
  }

  showInfo() {
    this.info = !this.info;
  }

  showSettings() {
    this.settings = !this.settings;
  }

  toggleClock() {
    let checkbox = document.getElementById('show-clock');
    if(checkbox['checked'] == true) {
      localStorage.setItem('clock', 'true');
    }
    if(checkbox['checked'] == false) {
      localStorage.setItem('clock', 'false');
    }
  }

  ngOnInit() {
    (function() {
      var checked = localStorage.getItem('clock');
      if (checked == 'true') {
        document.getElementById("show-clock")['checked'] = checked;
      }
    })();
  }

}
