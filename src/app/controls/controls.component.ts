import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-controls',
  templateUrl: './controls.component.html',
  styleUrls: ['./controls.component.css']
})
export class ControlsComponent implements OnInit {
  music:boolean = false;
  info:boolean = false;
  settings:boolean = false;

  nature_song:boolean = true; // default active tab
  rain_song:boolean = false;
  ambient_song:boolean = false;
  house_song:boolean = false;

  constructor() { }

  // main navigation

  showPlayer() {
    this.music = !this.music;
  }

  showInfo() {
    this.info = !this.info;
  }

  showSettings() {
    this.settings = !this.settings;
  }

  // music

  musicOne() {
    if(this.nature_song == false) {
      this.nature_song = !this.nature_song;
      this.rain_song = false;
      this.ambient_song = false;
      this.house_song = false;
    }
  }

  musicTwo() {
    if(this.rain_song == false) {
      this.rain_song = !this.rain_song;
      this.ambient_song = false;
      this.nature_song = false;
      this.house_song = false;
    }
  }

  musicThree() {
    if(this.ambient_song == false) {
      this.ambient_song = !this.ambient_song;
      this.rain_song = false;
      this.nature_song = false;
      this.house_song = false;
    }
  }

  musicFour() {
    if(this.house_song == false) {
      this.house_song = !this.house_song;
      this.rain_song = false;
      this.nature_song = false;
      this.ambient_song = false;
    }
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