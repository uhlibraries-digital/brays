import { Injectable, EventEmitter, Output } from '@angular/core';
import { basename } from 'path';
import { createReadStream, createWriteStream, writeFile, statSync } from 'graceful-fs';
import * as mkdirp from 'mkdirp';
import * as stringify from 'csv-stringify';

import { ElectronService } from './electron.service';
import { ObjectService } from './object.service';
import { LoggerService } from './logger.service';
import { PromptService } from 'app/services/prompt.service';
import { ProgressBarService } from './progress-bar.service';
import { MintService } from './mint.service';
import { PreferencesService } from './preferences.service';

import { EdtfHumanizer } from 'app/classes/edtf-humanizer';

//const progress = require('progress-stream');

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
  private progressBarId: string = '';

  private preferences: string = '';

  private win: any;

  constructor(
    private objectService: ObjectService,
    private log: LoggerService,
    private prompt: PromptService,
    private electronService: ElectronService,
    private barService: ProgressBarService,
    private mint: MintService,
    private preferenceService: PreferencesService){
      this.objectService.objectsLoaded.subscribe(objects => this.objects = objects);
      this.preferenceService.preferencesChange.subscribe(data => this.preferences = data);
      this.preferences = this.preferenceService.data;
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

    this.win = this.electronService.remote.getCurrentWindow();

    this.startActivity();
    this.mint.arks(this.objects.slice(1))
      .then(() => {
        this.objectService.saveObjects();
        this.process();
        this.endActivity();
      })
      .catch(() => {
        this.log.error('Sorry something happend during minting. Export failed!');
        this.endActivity();
      });
  }

  private process(): void {
    let objects = this.objects.slice(1);
    let csv = stringify({delimiter: ','});
    let data = '';

    this.startActivity();
    this.setProgressBar(0);

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
        files.push('00:00:10');
        this.copyFile(file.path, this.location + '/content/' + file.name);
      }
      files = this.fillArray(files, '', fileCount * 2);
      csv.write(row.concat(files));
    }

    csv.end();
  }

  private saveDialog(): string {
    return this.electronService.dialog.showSaveDialog({
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
          if (field.name === 'dcterms.identifier'
            && object.do_ark !== '' && values.value === object.do_ark) {
              avalonField.type = 'digital object';
            }
          else if (field.name === 'dcterms.identifier') {
            avalonField.type = 'other';
          }
          if (avalonField.type) {
            return [values.value, values.value !== '' ? avalonField.type : ''];
          }
          return values.value;
        });
        if (avalonField.type) {
          values = values.reduce((prev, curr) => {
            return prev.concat(curr);
          })
        }
      }
      else {
        values.push(field.value);
        if (avalonField.type) {
          values.push(field.value !== '' ? avalonField.type : '');
        }
      }

      let fieldCount = avalonField.type ? avalonField.count * 2 : avalonField.count;

      values = this.fillArray(values, '', fieldCount);
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
      let Metaheader = object.metadata.slice()
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
            'type': field.map.crosswalk.avalon.type || null,
            'name': field.name,
            'count': count
          };
        });
      let hasFile = header.find((avfield) => {
        return avfield.label === 'File'
      });
      let fileCount = hasFile ? Math.max(hasFile.count, object.files.length) : object.files.length;
      header = Metaheader.concat([{'label': 'File', 'count': fileCount}]);
    }

    return header;
  }

  private buildAvalonHeader(): any[] {
    let header = [];
    for(let h of this.avalonFields) {
      for(let i = 0; i < h.count; i++) {
        header.push(h.label);
        if (h.type) {
          header.push(h.label + ' Type');
        }
        if (h.label === 'File') {
          header.push('Offset')
        }
      }
    }
    return header;
  }

  private getMetadataFields(object: any): any[] {
    return object.metadata.slice()
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

  private startActivity(): void {
    this.activityBucket.push('active');
    this.objectService.loading.emit(true);
  }

  private endActivity(): void {
    this.activityBucket.pop();
    if (this.activityBucket.length === 0) {
      this.objectService.loading.emit(false);
      this.log.success('Done exporting Avalon package');
      this.clearProgressBar();
    }
  }

  private setProgressBar(progress): void {
    this.win.setProgressBar(progress || -1);
    if (!this.progressBarId) {
      this.progressBarId = this.barService.newProgressBar(1, 'Exporting Avalon package');
    }
    this.barService.setProgressBar(this.progressBarId, progress);
  }

  private clearProgressBar(): void {
    this.setProgressBar(0);
    this.barService.clearProgressBar(this.progressBarId);
    this.progressBarId = '';
  }

}
