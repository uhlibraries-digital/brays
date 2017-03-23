import { Injectable } from '@angular/core';
import { remote } from 'electron';
import { basename } from 'path';
import { createReadStream, createWriteStream, writeFile } from 'fs';
import * as mkdirp from 'mkdirp';
import * as stringify from 'csv-stringify';

import { ObjectService } from './object.service';
import { LoggerService } from './logger.service';
let { dialog } = remote;

@Injectable()
export class ContentDmService {

  private objects: any;
  private location: string;

  private singles: any[];

  constructor(
    private objectService: ObjectService,
    private log: LoggerService){
    this.objectService.objectsLoaded.subscribe(objects => this.objects = objects);
  }

  export(): void {
    this.location = this.saveDialog();
    if (!this.location) { return; }

    this.objectService.loading.emit(true);
    this.process();
    this.objectService.loading.emit(false);
    this.log.info('Done exporting CONTENTdm package');
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
    let header = this.getMetadataFields(object).concat(['Object File Name']);
    let objectRow = this.getMetadataValues(object).concat(['']);

    let csv = [header];
    csv.push(objectRow);

    let path = this.location + '/' + basename(object.path);
    mkdirp.sync(path);
    let i = 1;
    for (let file of object.files) {
      let row = Array(header.length).fill('');
      row[0] = 'File ' + ("000" + (i++)).slice(-3);
      row[row.length-1] = file.name;
      csv.push(row);

      this.copyFile(file.path, path + '/' + file.name);
    }
    this.createTextFile(csv, path + '.txt');
  }

  private processSingleObject(object: any): void {
    let file = object.files[0] || undefined;
    if (!file) { return; }

    if (this.singles.length === 0) {
      this.singles.push(this.getMetadataFields(object).concat(['Object File Name']));
    }
    this.singles.push(this.getMetadataValues(object).concat([file.name]));
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
    try{
      createReadStream(src).pipe(createWriteStream(dest));
    }
    catch(e) {
      this.objectService.loading.emit(false);
      this.log.error(e.message);
    }
  }

  private createTextFile(data: any[], path: string): void {
    let csv = stringify({ delimiter: '\t'});
    let output = '';
    csv.on('readable', () => {
      let row: any;
      while (row = csv.read()) {
        output += row;
      }
    });
    csv.on('finish', () => {
      writeFile(path, output, (err) => {
        if (err) {
          this.objectService.loading.emit(false);
          this.log.error(err.message);
          throw err;
        }
      });
    });
    csv.on('error', (err) => {
      this.objectService.loading.emit(false);
      this.log.error(err.message);
    });

    for(let row of data) {
      csv.write(row);
    }
    csv.end();
  }

}
