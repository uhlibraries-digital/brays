import { Injectable, EventEmitter, Output } from '@angular/core';
import { remote } from 'electron';
import { basename } from 'path';
import { createReadStream, createWriteStream, writeFile, statSync } from 'fs';
import * as mkdirp from 'mkdirp';
import * as stringify from 'csv-stringify';

import { ObjectService } from './object.service';
import { LoggerService } from './logger.service';
import { PromptService } from '../prompt/prompt.service';

import { EdtfHumanizer } from './edtf-humanizer';

let { dialog } = remote;
const progress = require('progress-stream');

@Injectable()
export class AvalonService {

  private objects: any;
  private location: string;

  private avalonFields: any;
  private avalonUsername: string;

  private activityBucket: any[];

  private totalProgress: number = 0;
  private currentProgress: number = 0;
  private fileProcess: any = {};

  private win: any;

  constructor(
    private objectService: ObjectService,
    private log: LoggerService,
    private prompt: PromptService ){
    this.objectService.objectsLoaded.subscribe(objects => this.objects = objects);
  }

  export(): void {
    this.prompt.display('Your Avalon username', (value) => {
      this.avalonUsername = value;
      this.start();
    });
  }

  private start(): void {
    this.location = this.saveDialog();
    if (!this.location) { return; }

    this.activityBucket = [];
    this.totalProgress = 0;
    this.currentProgress = 0;
    this.fileProcess = {};

    this.win = remote.getCurrentWindow();

    this.startActivity();
    this.process();
    this.endActivity();
  }

  private process(): void {
    let objects = this.objects.slice(1);
    let csv = stringify({delimiter: ','});
    let data = '';

    this.startActivity();
    csv.on('readable', () => {
      let row: any;
      while (row = csv.read()) {
        data += row;
      }
    });
    csv.on('finish', () => {
      writeFile(this.location + '/batch_manifest.csv', data, (err) => {
        this.endActivity();
        if (err) {
          this.log.error(err.message);
          throw err;
        }
      });
    });
    csv.on('error', (err) => {
      this.endActivity();
      this.log.error(err.message);
    });

    this.avalonFields = this.buildAvalonFields();

    mkdirp.sync(this.location + '/content');

    let header = this.buildAvalonHeader();
    let info = this.fillArray(['Batch Ingest', this.avalonUsername], '', header.length);

    csv.write(info);
    csv.write(header);

    let fileCount = this.avalonFields.find((field) => {
      return field.label === 'File';
    }).count;

    for(let object of objects) {
      let row = this.processRow(object);
      let files = [];
      for (let file of object.files) {
        files.push('content/' + file.name);
        this.copyFile(file.path, this.location + '/content /' + file.name);
      }
      files = this.fillArray(files, '', fileCount);
      csv.write(row.concat(files));
    }

    csv.end();
  }

  private saveDialog(): string {
    return dialog.showSaveDialog({
      title: 'Avalon Export...',
      buttonLabel: 'Export'
    });
  }

  private processRow(object: any): any[] {
    let row = [];
    for (let avalonField of this.avalonFields) {
      let field = object.metadata.find((field) => {
        return field.name === avalonField.name;
      });
      if (!field) { continue; }

      let values = [];
      if (field.values) {
        values = field.values.map((values) => {
          return values.value;
        });
      }
      else {
        values.push(field.value);
      }
      values = this.fillArray(values, '', avalonField.count);
      row = row.concat(values);
    }
    return row;
  }

  private fillArray(array: any[], value: string, length: number): any[] {
    for (let i = array.length; i < length; i++) {
      array.push(value);
    }
    return array;
  }

  private buildAvalonFields(): any[] {
    let objects = this.objects.slice(1);
    let header = [];
    for (let object of objects) {
      header = object.metadata.slice(1)
        .filter((field) => {
          return field.map.crosswalk !== undefined && field.map.crosswalk.avalon !== undefined
        })
        .map((field) => {
          let count = field.values ? field.values.length : 1;

          let found = header.find((avfield) => {
            return avfield.label === field.map.crosswalk.avalon.label;
          });
          count = found ? Math.max(found.count, count) : count;

          return {
            'label': field.map.crosswalk.avalon.label,
            'name': field.name,
            'count': count
          };
        });
      let hasFile = header.find((avfield) => {
        return avfield.label === 'Field'
      });
      let fileCount = hasFile ? Math.max(hasFile.count, object.files.length) : object.files.length;
      header = header.concat([{'label': 'File', 'count': fileCount}]);
    }

    return header;
  }

  private buildAvalonHeader(): any[] {
    let header = [];
    for(let h of this.avalonFields) {
      for(let i = 0; i < h.count; i++) {
        header.push(h.label);
      }
    }
    return header;
  }

  private getMetadataFields(object: any): any[] {
    return object.metadata.slice(1)
      .filter((field) => {
        return field.map.visible &&
          field.map.crosswalk !== undefined &&
          field.map.crosswalk.filter((avfield) => {
            return avfield.avalon !== undefined;
          }) !== undefined;
      })
      .map((field) => {
        let avalon = field.map.crosswalk.find((avfield) => {
          return avfield.avalon !== undefined;
        });
        return avalon.avalon;
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

  private startActivity(): void {
    this.activityBucket.push('active');
    this.objectService.loading.emit(true);
  }

  private endActivity(): void {
    this.activityBucket.pop();
    if (this.activityBucket.length === 0) {
      this.objectService.loading.emit(false);
      this.log.info('Done exporting Avalon package');
      this.setProgressBar(0);
    }
  }

  private setProgressBar(progress): void {
    this.win.setProgressBar(progress || -1);
  }

}
