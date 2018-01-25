import { Injectable, EventEmitter, Output } from '@angular/core';
import { writeFile } from 'fs';
import * as stringify from 'csv-stringify';

import { ObjectService } from './object.service';
import { LoggerService } from './logger.service';
import { ElectronService } from './electron.service';

@Injectable()
export class MetadataExportService {

  location: string;
  objects: any = [];

  constructor(
    private objectService: ObjectService,
    private log: LoggerService,
    private electronService: ElectronService){
    this.objectService.objectsLoaded.subscribe(objects => this.objects = objects);
  }

  export(): void {
    this.location = this.saveDialog();
    if (!this.location) { return; }

    this.process();
  }

  private process(): void {
    let objects = this.objects.slice(1);
    let csv = stringify({delimiter: ','});
    let data = '';

    this.objectService.loading.emit(true);

    csv.on('readable', () => {
      let row: any;
      while (row = csv.read()) {
        data += row;
      }
    });
    csv.on('finish', () => {
      writeFile(this.location, data, (err) => {
        this.objectService.loading.emit(false);
        if (err) {
          this.log.error(err.message);
          throw err;
        }
        this.log.success('Done exporting metadata');
      });
    });
    csv.on('error', (err) => {
      this.objectService.loading.emit(false);
      this.log.error(err.message);
    });

    csv.write(['ID'].concat(this.getMetadataFields(objects[0])));
    for (let o of objects) {
      csv.write([o.getId()].concat(this.getMetadataValues(o)));
    }

    csv.end();
  }

  private getMetadataFields(object: any): any[] {
    return object.metadata.slice()
      .filter((field) => {
        return field.map.visible;
      })
      .map((field) => {
        return field.map.label;
      });
  }

  private getMetadataValues(object: any): any[] {
    return object.metadata.slice()
      .filter((field) => {
        return field.map.visible;
      })
      .map((field) => {
        return field.value;
      });
  }

  private saveDialog(): string {
    return this.electronService.dialog.showSaveDialog({
      title: 'Metadata Export...',
      defaultPath: 'metadata.csv',
      buttonLabel: 'Export',
      filters: [
        { name: 'Comma-separated values', extensions: ['csv'] }
      ],
    });
  }

}
