import { Component, OnInit } from '@angular/core';

import { LoggerService } from '../shared/logger.service';
import { ProgressBarService } from '../shared/progress-bar.service';

import { Entry } from '../shared/entry';
import { ProgressBar } from '../shared/progress-bar';

@Component({
  selector: 'notification',
  templateUrl: './notification/notification.component.html',
  styles: [ require('./notification.component.scss') ]
})
export class NotificationComponent implements OnInit {

  entries: Entry[];
  progressbars: ProgressBar[];

  constructor(
    private log: LoggerService,
    private progress: ProgressBarService) {
  }

  ngOnInit(): void {
    this.entries = [];
    this.log.changed.subscribe((entry) => {
      if (entry.notify) {
        this.entries.push(entry);
      }
    });
    this.progress.changed.subscribe((bars) => {
      this.progressbars = bars;
    })
  }

  notifyClass(n: any): string {
    let nClass = ['notification', n.type];
    return nClass.join(' ');
  }

  close(i: number): void {
    this.entries.splice(i, 1);
  }

  closeAll(): void {
    this.entries = [];
  }


}
