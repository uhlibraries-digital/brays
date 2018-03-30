import { Injectable } from '@angular/core';
import { basename } from 'path';
import { createReadStream, createWriteStream, writeFile, statSync } from 'graceful-fs';
import * as mkdirp from 'mkdirp';
import * as stringify from 'csv-stringify';

import { ObjectService } from './object.service';
import { LoggerService } from './logger.service';
import { ProgressBarService } from './progress-bar.service';
import { ElectronService } from './electron.service';

import { EdtfHumanizer } from 'app/classes/edtf-humanizer';

@Injectable()
export class ContentDmService {

  private objects: any;
  private location: string;

  private singles: any[];
  private activityBucket: any[];

  private totalProgress: number = 0;
  private fileProcess: any = {};
  private progressBarId: string = '';

  private win: any;

  constructor(
    private objectService: ObjectService,
    private log: LoggerService,
    private barService: ProgressBarService,
    private electronService: ElectronService){
    this.objectService.objectsLoaded.subscribe(objects => this.objects = objects);
  }

  export(): void {
    this.location = this.saveDialog();
    if (!this.location) { return; }

    this.activityBucket = [];
    this.totalProgress = 0;
    this.fileProcess = {};

    this.win = this.electronService.remote.getCurrentWindow();

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

    let path = this.location + '/' + this.padLeft(object.id, 3, '0');
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
    if (!file) {
      this.log.warn("'" + object.title + "' doesn't have any access files");
      return;
    }

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
    return this.electronService.dialog.showSaveDialog({
      title: 'CONTENTdm Export...',
      buttonLabel: 'Export'
    });
  }

  private getMetadataFields(object: any): any[] {
    return object.metadata.slice()
      .filter((field) => {
        return field.map.visible;
      })
      .map((field) => {
        return field.map.label;
      })
  }

  private getMetadataValues(object: any): any[] {
    return object.metadata.slice()
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
      let ws = createWriteStream(dest);
      ws.on('finish', () => {
        this.endActivity();
      });

      let rs = createReadStream(src);
      rs.on('data', (buffer) => {
        this.fileProcess[src] += buffer.length;
        let sum = 0;
        for (let psum in this.fileProcess) {
          sum += this.fileProcess[psum];
        }
        this.setProgressBar(sum / this.totalProgress);
      });

      rs.pipe(ws);
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
      this.log.success('Done exporting CONTENTdm package');
      this.clearProgressBar();
    }
  }

  private setProgressBar(progress: number): void {
    this.win.setProgressBar(progress || -1);
    if (!this.progressBarId) {
      this.progressBarId = this.barService.newProgressBar(1, 'Exporting CONTENTdm package');
    }
    this.barService.setProgressBar(this.progressBarId, progress);
  }

  private clearProgressBar(): void {
    this.setProgressBar(0);
    this.barService.clearProgressBar(this.progressBarId);
    this.progressBarId = '';
  }

  private padLeft(value: any, length: number, character: string): string {
    value = String(value);
    if (value.length > length) { return value; }
    return Array(length - value.length + 1).join(character || " ") + value;
  }

}
