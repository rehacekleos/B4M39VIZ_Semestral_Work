import { Component } from '@angular/core';
import { Options } from '@angular-slider/ngx-slider';
import { AppComponent } from "./app.component";

@Component({
  selector: 'slider',
  templateUrl: './slider.component.html'
})

export class SliderComponent {

  constructor(public app: AppComponent) {
    this.app = app;
  }

  minValue: number = 0;
  maxValue: number = 129;
  options: Options = {
    floor: 0,
    ceil: 129
  };

  public onSliderChanged(min: number, max: number) {
    // console.log("onSliderChanged", min, max);
    this.app.filterAirports(min, max);
  }
}
