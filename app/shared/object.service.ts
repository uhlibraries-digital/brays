import { Injectable, Output, EventEmitter } from '@angular/core';
import { remote } from 'electron';
import { createReadStream } from 'fs';
import { statSync } from 'fs';
import { writeFile } from 'fs';
import { basename } from 'path';
import { lookup } from 'mime';

import * as parse from 'csv-parse';
import * as stringify from 'csv-stringify';
import * as hash from 'object-hash';

import { Object } from './object';
import { Field } from './field';
import { File } from './file';
import { MapService } from './map.service';
import { MapField } from './map-field';

let {dialog} = remote;

@Injectable()
export class ObjectService {
  object: Object;
  objects: Object[];

  @Output() objectChanged = new EventEmitter();
  @Output() objectsLoaded = new EventEmitter();
  @Output() fileChanged = new EventEmitter();

  constructor(private mapService: MapService) {
    this.objects = [];
  }

  getObjects(): Promise<Object[]> {
    let filename = this.openFile();
    return this.readFile(filename).then(value => value as Object[]);
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

  setFile(file: File) {
    this.fileChanged.emit(file);
  }

  saveObjects(){
    if (this.objects.length === 0) return;

    let csv: any[] = [];
    let headers: string[] = this.objects[0].headers;

    csv.push(headers.concat('productionNotes'));
    for( let object of this.objects ){
      let csvrow: string[] = [];
      for ( let header of headers ) {
        csvrow.push(object.getFieldValue(header));
      }
      csvrow.push(object.productionNotes);
      csv.push(csvrow);

      for ( let file of object.files ) {
        csvrow = [];
        for ( let header of headers ) {
          csvrow.push(file.getFieldValue(header));
        }
        csvrow.push(''); // need blank column for productionNotes
        csv.push(csvrow);
      }
    }

    if (csv.length === 0) {
      console.error('CSV array is blank!!!!');
      return;
    }
    this.writeFile(this.objects[0].input_file, csv);
  }

  openFile() {
    return dialog.showOpenDialog({
      filters: [
        { name: 'CSV', extensions: ['csv'] }
      ],
      title: "Open Project"
    });
  }

  processFile(err, data, filename) {
    if (err) {
      throw err;
    }
    if (data === undefined) {
      throw Error('There is no data in the file');
    }

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
        file.mime = lookup(base_path + data[i][0]);
        file.metadata = metadata;
        file.name = basename(data[i][0]);

        let object: Object = this.objects.pop();
        object.files.push(file);
        this.objects.push(object);
      }
    }

    console.log('csv (objects):');
    console.log(this.objects);
    this.objectsLoaded.emit(this.objects);
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

  writeFile(filename, data) {
    stringify(data, (err, output) => {
      if (err) throw err;
      writeFile(filename, output), (err) => {
        if (err) {
          dialog.showErrorBox('Error saving file', err.message);
        }
      }
    });
  }

}
