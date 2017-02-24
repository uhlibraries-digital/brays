import { Component, Input, ViewEncapsulation, OnChanges } from '@angular/core';

import { EdtfHumanizer } from '../shared/edtf-humanizer';

@Component({
  selector: 'edtf-humanize',
  template: '<div class="humanize">{{humanizeDate}}</div>',
  styles: [ require('./edtf-humanize.component.scss') ],
  encapsulation: ViewEncapsulation.None
})
export class EdtfHumanizeComponent implements OnChanges {

  @Input('date') date: any;

  humanizeDate: string;

  ngOnChanges(changes: any): void {
    let newDate = changes.date.currentValue;
    this.humanizeDate = '';
    try {
      if (newDate !== '') {
        let date: EdtfHumanizer = new EdtfHumanizer(newDate);
        this.humanizeDate = date.humanize();
      }
    }
    catch(e) {
      this.humanizeDate = 'unkown';
      return;
    }
  }

}
