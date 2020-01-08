import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpModule } from '@angular/http';

import { AppComponent } from './app.component';
import { ControlsComponent } from './controls/controls.component';
import { TruncatePipe } from './truncate.pipe';

import { Ng5SliderModule } from 'ng5-slider';

@NgModule({
  declarations: [
    AppComponent,
    ControlsComponent,
    TruncatePipe
  ],
  imports: [
    BrowserModule,
    HttpModule,
    Ng5SliderModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
