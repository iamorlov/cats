import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-music',
  templateUrl: './music.component.html',
  styleUrls: ['./music.component.css']
})
export class MusicComponent implements OnInit {
  icon:any = document.getElementById("player-icon");
  music:boolean = false;

  constructor() { }

  showPlayer() {
    this.music = !this.music;
  }

  ngOnInit() {
  }

}