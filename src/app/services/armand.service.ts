import { Injectable } from '@angular/core';
import { createReadStream, createWriteStream, writeFile, statSync, rename } from 'graceful-fs';
import * as mkdirp from 'mkdirp';
import * as stringify from 'csv-stringify';
import { basename } from 'path';

import { ElectronService } from './electron.service';
import { ObjectService } from './object.service';
import { LoggerService } from './logger.service';
import { ProgressBarService } from './progress-bar.service';
import { MintService } from './mint.service';

@Injectable()
export class ArmandService {

  private win: any;
  private location: string;
  private objects: any;
  private activityBucket: any[];
  private totalProgress: number = 0;
  private fileProcess: any = {};
  private progressBarId: string = '';

  constructor(
    private objectService: ObjectService,
    private log: LoggerService,
    private electronService: ElectronService,
    private barService: ProgressBarService,
    private mint: MintService){
      this.objectService.objectsLoaded.subscribe(objects => this.objects = objects);
  }

  export(): void {
    this.location = this.saveDialog();
    if (!this.location) { return; }

    this.activityBucket = [];
    this.totalProgress = 0;
    this.fileProcess = {};

    this.win = this.electronService.remote.getCurrentWindow();

    this.mint.arks(this.objects.slice(1))
      .then(() => {
        this.objectService.saveObjects();
        return this.process();
      })
      .catch((err) => {
        this.log.error(err.message);
      });

  }

  private async process(): Promise<any> {
    const objects = this.objects.slice(1);

    this.startActivity();
    this.setProgressBar(0);

    this.setTotalProgress(objects);
    const csvFilename = `${this.location}/${basename(this.location)}.csv`

    mkdirp.sync(this.location);
    const csvData = await this.processObjects(objects);
    const csv = await this.csvString(csvData);

    writeFile(csvFilename, csv, (err) => {
      this.endActivity();
      return err ? Promise.reject(err) : Promise.resolve();
    })

    return Promise.resolve();
  }

  private async processObjects(objects: ReadonlyArray<any>): Promise<Array<string>> {
    if (objects.length === 0) {
      return []
    }

    let items: Array<any> = [['Object Type', 'Filename']
      .concat(
        objects[0].metadata.map((field) => {
          return field.map.label;
        })
      )
      .concat(['doUuid'])
    ]

    for (let object of objects) {
      const metadata = this.getMetadata(object);
      const type = this.getObjectType(object);
      items.push([type, ''].concat(metadata).concat(object.uuid))

      for (let file of object.files) {
        items.push(['File', `${file.name}`]);
        await this.copyFile(file.path, `${this.location}/${file.name}`);
        if (file.hasOcr()) {
          items.push(['OCR', `${file.ocrFilename()}`]);
          await this.copyOcrFile(file.ocrPath(), `${this.location}/${file.ocrFilename()}`);
        }
      }
    }

    return Promise.resolve(items);
  }

  private getMetadata(object: any): Array<string> {
    return object.metadata.map((field) => {
      if (field.name === 'dc.rights') {
        return this.rightsToUri(field.value);
      }
      return field.value
    })
  }

  private getObjectType(object): string {
    const type = object.metadata.find(field => field.name === 'dcterms.type');
    return type.value || 'Generic';
  }

  private rightsToUri(value: string): string {
    switch(value) {
      case 'In Copyright':
        return 'http://rightsstatements.org/vocab/InC/1.0/';
      case 'In Copyright - Copyright Owner Unlocatable or Unidentifiable':
        return 'http://rightsstatements.org/vocab/InC-RUU/1.0/';
      case 'In Copyright - Educational Use Permitted':
        return 'http://rightsstatements.org/vocab/InC-EDU/1.0/';
      case 'No Copyright - United States':
        return 'http://rightsstatements.org/vocab/NoC-US/1.0/';
      case 'Public Domain':
        return 'https://creativecommons.org/publicdomain/mark/1.0/';
      case 'Rights Undetermined':
        return 'http://rightsstatements.org/vocab/UND/1.0/';
    }
    return '';
  }

  private async copyFile(src: string, dest: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.startActivity();

      let ws = createWriteStream(`${dest}.part`, { highWaterMark: Math.pow(2,20) });
      ws.on('finish', () => {
        this.endActivity();
        rename(`${dest}.part`, dest, (err) => {
          return err ? reject(err) : resolve();
        })
      });
      ws.on('error', (err) => {
        this.endActivity();
        return reject(err);
      })

      let rs = createReadStream(src, { highWaterMark: Math.pow(2,20) });
      rs.on('data', (buffer) => {
        this.fileProcess[src] += buffer.length;
        let sum = 0;
        for (let psum in this.fileProcess) {
          sum += this.fileProcess[psum];
        }
        this.setProgressBar(sum / this.totalProgress);
      });

      rs.pipe(ws);
    })
  }

  private setTotalProgress(objects: ReadonlyArray<any>): void {
    objects.map((object) => {
      object.files.map((file) => {
        const stat = statSync(file.path);
        this.totalProgress += stat.size;
        this.fileProcess[file.path] = 0;
      })
    })
  }

  private async copyOcrFile(src: string, dest: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const writeStream = createWriteStream(`${dest}.part`);
      writeStream.on('finish', () => {
        rename(`${dest}.part`, dest, (err) => {
          return err ? reject(err) : resolve();
        })
      });
      writeStream.on('error', (err) => {
        return reject(err);
      });

      const readStream = createReadStream(src);
      readStream.pipe(writeStream);
    })
  }

  private saveDialog(): string {
    return this.electronService.dialog.showSaveDialog({
      title: 'Armand Export...',
      buttonLabel: 'Export'
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
      this.log.success('Done exporting Armand package');
      this.clearProgressBar();
    }
  }

  private setProgressBar(progress): void {
    this.win.setProgressBar(progress || -1);
    if (!this.progressBarId) {
      this.progressBarId = this.barService.newProgressBar(1, 'Exporting Armand package');
    }
    this.barService.setProgressBar(this.progressBarId, progress);
  }

  private clearProgressBar(): void {
    this.setProgressBar(0);
    this.barService.clearProgressBar(this.progressBarId);
    this.progressBarId = '';
  }

  private async csvString(data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const csv: stringify.Stringifier = stringify({ delimiter: ',' })
      let csvData: string = ''
  
      csv.on('readable', () => {
        let row: any
        while (row = csv.read()) {
          csvData += row
        }
      }).on('finish', () => {
        resolve(csvData)
      }).on('error', (err) => {
        reject(err)
      })
  
      data.map((row: any) => csv.write(row))
      csv.end()
    })
  }

}