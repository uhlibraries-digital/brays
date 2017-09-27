import { Injectable, Output, EventEmitter } from '@angular/core';

import { ProgressBar } from './progress-bar';

@Injectable()
export class ProgressBarService {

  progressbars: ProgressBar[] = [];

  @Output() changed:EventEmitter<any> = new EventEmitter();

  newProgressBar(max: number, description?: string): string {
    let pb = new ProgressBar(max, description);

    this.progressbars.push(pb);
    this.changed.emit(this.progressbars);

    return pb.id;
  }

  setProgressBar(id: string, value: number): void {
    let bar = this.progressbars.find((pb) => {
      return pb.id === id;
    });
    if (bar) {
      bar.value = value;
      this.changed.emit(this.progressbars);
    }
  }

  clearProgressBar(id: string): void {
    let index = this.progressbars.findIndex((pb) => {
      return pb.id === id;
    });
    if (index === -1) { return; }
    this.progressbars.splice(index, 1);
  }

  clear(): void {
    this.progressbars = [];
    this.changed.emit(this.progressbars);
  }



}
