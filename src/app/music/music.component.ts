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

  ngOnInit() {
  }

}
