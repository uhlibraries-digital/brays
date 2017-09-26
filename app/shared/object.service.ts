import { Injectable, Output, EventEmitter } from '@angular/core';
import { remote } from 'electron';
import { createReadStream } from 'fs';
import { statSync } from 'fs';
import { writeFile } from 'fs';
import { basename } from 'path';
import { getType } from 'mime';

import * as parse from 'csv-parse';
import * as stringify from 'csv-stringify';
import * as hash from 'object-hash';

import { Object } from './object';
import { Field } from './field';
import { File } from './file';
import { MapService } from './map.service';
import { LoggerService } from './logger.service';
import { MapField } from './map-field';

let {dialog} = remote;

@Injectable()
export class ObjectService {
  object: Object;
  objects: Object[];
  selectedObjects: Object[];

  @Output() objectChanged = new EventEmitter();
  @Output() objectsLoaded = new EventEmitter();
  @Output() fileChanged = new EventEmitter();
  @Output() selectedObjectsChanged = new EventEmitter();
  @Output() loading = new EventEmitter();

  constructor(
    private mapService: MapService,
    private log: LoggerService) {
    this.objects = [];
    this.selectedObjects = [];
  }

  getObjects(): Promise<Object[]> {
    this.loading.emit(true);
    let filename = this.openFile();
    return this.readFile(filename)
      .then(value => value as Object[])
      .catch((err) => {
        this.log.error(err);
        this.loading.emit(false);
      });
  }

  getObject(id: number): Object {
    if (id === undefined) {
      return this.object;
    }
    return this.objects.find(object => object.id === id);
  }

  setObject(object: Object) {
    if (object) {
      let base_title = object.title.match(/.*:\s/).toString();
      object.title = base_title + object.getFieldValue('dcterms.title');
      object.metadataHash = hash(object.metadata);
    }
    this.object = object;
    this.objectChanged.emit(object);
  }

  pushSelectedObject(object: Object): void {
    this.selectedObjects.push(object);
    this.selectedObjectsChanged.emit(this.selectedObjects);
  }

  clearSelectedObjects(): void {
    this.selectedObjects = [];
    this.selectedObjectsChanged.emit(this.selectedObjects);
  }

  removeSelectedObject(index: number): void {
    this.selectedObjects.splice(index, 1);
    this.selectedObjectsChanged.emit(this.selectedObjects);
  }

  getSelectedObjects(): Object[] {
    return this.selectedObjects;
  }

  findIndexInSelectedObjects(object: Object): number {
    return this.selectedObjects.findIndex((el) => {
      return object === el;
    });
  }

  autofill(fieldName: string, fieldValue: string): void {
    if (this.selectedObjects.length > 0){
      this.autofillObjects(this.selectedObjects, fieldName, fieldValue);
      return;
    }
    if (this.object) {
      this.autofillObjects(this.objects.slice(1), fieldName, fieldValue);
    }
  }

  setFile(file: File): void {
    this.fileChanged.emit(file);
  }

  saveObjects(): void {
    if (this.objects.length === 0) {
      console.log('No objects to save');
      return;
    }
    this.loading.emit(true);

    let headers: string[] = this.objects[0].headers;

    let csv = stringify({delimiter: ','});
    let data = '';
    csv.on('readable', () => {
      let row: any;
      while (row = csv.read()) {
        data += row;
      }
    });
    csv.on('finish', () => {
      writeFile(this.objects[0].input_file, data, (err) => {
        this.loading.emit(false);
        if (err) {
          this.log.error(err.message);
          throw err;
        }
      });
    });
    csv.on('error', (err) => {
      this.loading.emit(false);
      this.log.error(err.message);
    });

    csv.write(headers.concat('productionNotes'));
    for( let object of this.objects ){
      let csvrow: string[] = [];
      for ( let header of headers ) {
        csvrow.push(object.getFieldValue(header));
      }
      csvrow.push(object.productionNotes);
      csv.write(csvrow);

      for ( let file of object.files ) {
        csvrow = [];
        for ( let header of headers ) {
          csvrow.push(file.getFieldValue(header));
        }
        csvrow.push(''); // need blank column for productionNotes
        csv.write(csvrow);
      }
    }
    csv.end();
  }

  openFile(): any {
    return dialog.showOpenDialog({
      filters: [
        { name: 'CSV', extensions: ['csv'] }
      ],
      title: "Open Project"
    });
  }

  processFile(err, data, filename): any[] {
    if (err) {
      this.loading.emit(false);
      this.log.error(err.message);
      throw err;
    }
    if (data === undefined) {
      this.loading.emit(false);
      this.log.error('There is no data in the file');
      throw Error('There is no data in the file');
    }

    this.objects = [];
    let base_path: string = filename.match(/.*[/\\]/).toString();
    let header = data[0];
    let newheader = [data[0][0]];
    let pnIndex: number = header.indexOf('productionNotes');

    for ( let field of this.mapService.mapFields ) {
      newheader.push(field.namespace + '.' + field.name);
    }

    for ( var i = 1; i < data.length; i++ ) {
      let metadata: Field[] = [];
      let title: string;

      metadata.push(new Field(header[0], data[i][0], null));
      for ( let field of this.mapService.mapFields ) {
        let fullname: string = field.namespace + '.' + field.name;
        let index: number = header.indexOf(fullname);
        let value: string;
        if ( index >= 0) {
          value = data[i][index];
        }
        metadata.push(new Field(fullname, value, field));
        if (fullname === 'dcterms.title') {
          title = value;
        }
      }

      try {
        if (statSync(base_path + data[i][0]).isDirectory()) {
          let object: Object = new Object();
          object.id = i;
          object.headers = newheader;
          object.base_path = base_path;
          object.input_file = filename;
          object.path = base_path + data[i][0];
          object.title = basename(data[i][0]) + ': ' + title;
          object.metadata = metadata;
          object.metadataHash = hash(metadata);
          object.files = [];
          object.productionNotes = data[i][pnIndex] || '';

          this.objects.push(object);
        }
        else {
          let file: File = new File();
          file.id = i;
          file.path = base_path + data[i][0];
          file.mime = getType(base_path + data[i][0]);
          file.metadata = metadata;
          file.name = basename(data[i][0]);

          let object: Object = this.objects.pop();
          object.files.push(file);
          this.objects.push(object);
        }
      }
      catch(e) {
        console.error(e);
        this.log.error("No such file or directory '" + base_path + data[i][0] + "'");
      }
    }

    this.objectsLoaded.emit(this.objects);
    this.loading.emit(false);
    return this.objects;
  }

  readFile(filename) {
    return new Promise((resolve, reject) => {
      if (filename === undefined) {
        reject(Error('No file selected.'))
      }
      else {
        filename = filename.toString();
        createReadStream(filename).pipe(
          parse(
            { delimiter: ',' },
            (err, data) => {
              resolve(this.processFile(err, data, filename));
            }
          )
        );
      }
    });
  }

  private autofillObjects(objects: Object[], fieldName: string, fieldValue: string): void {
    for ( let object of objects ) {
      let field = object.getField(fieldName);
      field.setValue(fieldValue);
      object.metadataHash = hash(object.metadata);
    }
  }

}
