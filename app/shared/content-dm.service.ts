import { Injectable } from '@angular/core';
import { remote } from 'electron';
import { basename } from 'path';
import { createReadStream, createWriteStream, writeFile } from 'fs';
import * as mkdirp from 'mkdirp';
import * as stringify from 'csv-stringify';

import { ObjectService } from './object.service';
import { LoggerService } from './logger.service';
let { dialog } = remote;
let { BrowserWindow } = remote;

@Injectable()
export class ContentDmService {

  private objects: any;
  private location: string;

  private singles: any[];
  private activityBucket: any[];
  private totalProcess: number;
  private processNumber: number;
  private window: any;

  constructor(
    private objectService: ObjectService,
    private log: LoggerService){
    this.objectService.objectsLoaded.subscribe(objects => this.objects = objects);
  }

  export(): void {
    this.location = this.saveDialog();
    if (!this.location) { return; }

    this.activityBucket = [];
    this.processNumber = 0;

    this.startActivity();
    this.process();
    this.endActivity();
  }

  private process(): void {
    this.singles = [];
    let objects = this.objects.slice(1);

    this.totalProcess = objects
      .map((object) => {
        return object.files.length;
      })
      .reduce((total, number) => {
        return total + number;
      }) + objects.length;

    this.window = BrowserWindow.getFocusedWindow();
    this.window.setProgressBar(0);

    for(let object of objects) {
      if (object.files.length > 1) {
        this.processCompoundObject(object);
      }
      else {
        this.processSingleObject(object);
      }
      this.window.setProgressBar(++this.processNumber / this.totalProcess);
    }
    if (this.singles.length > 0) {
      this.createTextFile(this.singles, this.location + '/Singles.txt');
    }
  }

  private processCompoundObject(object: any): void {
    let header = this.getMetadataFields(object).concat(
      ['Transcript', 'File Name', 'Object File Name']
    );
    let objectRow = this.getMetadataValues(object).concat(['', '', '']);

    let csv = [header];
    csv.push(objectRow);

    let path = this.location + '/' + basename(object.path);
    mkdirp.sync(path);
    let i = 1;
    for (let file of object.files) {
      let row = Array(header.length).fill('');
      row[0] = 'File ' + ("000" + (i++)).slice(-3);
      row[row.length-1] = row[row.length-2] = file.name;
      csv.push(row);

      this.copyFile(file.path, path + '/' + file.name);
    }
    this.createTextFile(csv, path + '.txt');
  }

  private processSingleObject(object: any): void {
    let file = object.files[0] || undefined;
    if (!file) { return; }

    if (this.singles.length === 0) {
      this.singles.push(this.getMetadataFields(object).concat(
        ['Transcript', 'File Name', 'Object File Name']
      ));
    }
    this.singles.push(this.getMetadataValues(object).concat(
      ['', file.name, file.name]
    ));
    let path = this.location + '/Singles';
    mkdirp.sync(path);
    this.copyFile(file.path, path + '/' + file.name);
  }

  private saveDialog(): string {
    return dialog.showSaveDialog({
      title: 'CONTENTdm Export...',
      buttonLabel: 'Export'
    });
  }

  private getMetadataFields(object: any): any[] {
    return object.metadata.slice(1)
      .filter((field) => {
        return field.map.visible;
      })
      .map((field) => {
        return field.map.label;
      })
  }

  private getMetadataValues(object: any): any[] {
    return object.metadata.slice(1)
      .filter((field) => {
        return field.map.visible;
      })
      .map((field) => {
        return field.value;
      })
  }

  private copyFile(src: string, dest: string): void {
    this.startActivity();
    try{
      let ws = createWriteStream(dest);
      ws.on('finish', () => {
        this.endActivity();
        this.window.setProgressBar(++this.processNumber / this.totalProcess);
      });

      createReadStream(src).pipe(ws);
    }
    catch(e) {
      this.endActivity();
      this.window.setProgressBar(++this.processNumber / this.totalProcess);
      this.log.error(e.message);
    }
  }

  private createTextFile(data: any[], path: string): void {
    this.startActivity();

    let output = data.map((row) => {
      return row.join("\t");
    }).join("\n");

    writeFile(path, output, (err) => {
      this.endActivity();
      if (err) {
        this.log.error(err.message);
        throw err;
      }
    });
  }

  private startActivity(): void {
    this.activityBucket.push('active');
    this.objectService.loading.emit(true);
  }

  private endActivity(): void {
    this.activityBucket.pop();
    if (this.activityBucket.length === 0) {
      this.objectService.loading.emit(false);
      this.log.info('Done exporting CONTENTdm package');
    }
  }

}
