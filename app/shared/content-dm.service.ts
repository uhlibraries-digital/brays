import { Injectable } from '@angular/core';
import { remote } from 'electron';
import { basename } from 'path';
import { createReadStream, createWriteStream, writeFile, statSync } from 'fs';
import * as mkdirp from 'mkdirp';
import * as stringify from 'csv-stringify';

import { ObjectService } from './object.service';
import { LoggerService } from './logger.service';

import { EdtfHumanizer } from './edtf-humanizer';

let { dialog } = remote;
const progress = require('progress-stream');

@Injectable()
export class ContentDmService {

  private objects: any;
  private location: string;

  private singles: any[];
  private activityBucket: any[];

  private totalProgress: number = 0;
  private fileProcess: any = {};

  private win: any;

  constructor(
    private objectService: ObjectService,
    private log: LoggerService){
    this.objectService.objectsLoaded.subscribe(objects => this.objects = objects);
  }

  export(): void {
    this.location = this.saveDialog();
    if (!this.location) { return; }

    this.activityBucket = [];
    this.totalProgress = 0;
    this.fileProcess = {};

    this.win = remote.getCurrentWindow();

    this.startActivity();
    this.process();
    this.endActivity();
  }

  private process(): void {
    this.singles = [];
    let objects = this.objects.slice(1);


    for(let object of objects) {
      if (object.files.length > 1) {
        this.processCompoundObject(object);
      }
      else {
        this.processSingleObject(object);
      }
    }
    if (this.singles.length > 0) {
      this.createTextFile(this.singles, this.location + '/Singles.txt');
    }
  }

  private processCompoundObject(object: any): void {
    let header = this.getMetadataFields(object).concat(
      ['Date (EDTF)', 'Transcript', 'File Name', 'Object File Name']
    );
    let objectRow = this.getMetadataValues(object).concat(
      [object.getFieldValue('dc.date'), '', '', '']
    );

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
        ['Date (EDTF)', 'Transcript', 'File Name', 'Object File Name']
      ));
    }
    this.singles.push(this.getMetadataValues(object).concat(
      [object.getFieldValue('dc.date'), '', file.name, file.name]
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
        let value = field.value;
        /**
         Huminizing the DC Date just for CONTENTdm
         You will need to set the CONTENTdm Date field in the template
         to 'string' in order to use this.
        */
        if (field.name === 'dc.date') {
          let dates = field.value.split('; ');
          let HDates = [];
          for (let d of dates) {
            let h = new EdtfHumanizer(d.trim());
            HDates.push(h.humanize());
          }
          value = HDates.join('; ');
        }
        return value;
      })
  }

  private copyFile(src: string, dest: string): void {
    this.startActivity();
    try{
      let stat = statSync(src);
      this.totalProgress += stat.size;
      this.fileProcess[src] = 0;
      let pro = progress({
        length: stat.size
      });
      pro.on('progress', (p) => {
        this.fileProcess[src] = p.transferred;
        let sum = 0;
        for (let psum in this.fileProcess) {
          sum += this.fileProcess[psum];
        }
        this.setProgressBar(sum / this.totalProgress);
      });

      let ws = createWriteStream(dest);
      ws.on('finish', () => {
        this.endActivity();
      });

      createReadStream(src).pipe(pro).pipe(ws);
    }
    catch(e) {
      this.endActivity();
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
      this.setProgressBar(0);
    }
  }

  private setProgressBar(progress): void {
    this.win.setProgressBar(progress || -1);
  }

}
