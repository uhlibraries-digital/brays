import { Injectable, EventEmitter } from '@angular/core';
import { createReadStream } from 'fs';
import {
  statSync,
  writeFile,
  readFile
} from 'fs';
import { basename, dirname } from 'path';

import * as hash from 'object-hash';
import * as mime from 'mime';

import { Object } from '../classes/object';
import { Field } from '../classes/field';
import { File } from '../classes/file';
import { MapField } from '../classes/map-field';

import { MapService } from './map.service';
import { LoggerService } from './logger.service';
import { ElectronService } from './electron.service';


@Injectable()
export class ObjectService {
  object: Object;
  objects: Object[];
  selectedObjects: Object[];
  projectData: any;

  objectChanged: EventEmitter<any> = new EventEmitter();
  objectsLoaded: EventEmitter<any> = new EventEmitter();
  fileChanged: EventEmitter<any> = new EventEmitter();
  selectedObjectsChanged: EventEmitter<any> = new EventEmitter();
  loading: EventEmitter<any> = new EventEmitter();

  constructor(
    private mapService: MapService,
    private log: LoggerService,
    private electronService: ElectronService) {
    this.objects = [];
    this.selectedObjects = [];
  }

  getObjects(): Promise<any> {
    this.loading.emit(true);
    let filename = this.openFile();

    return new Promise((resolve, reject) => {
      if (!filename) {
        reject(Error('No file selected'));
      }
      filename = filename.toString();
      readFile(filename, 'utf8', (err, data) => {
        if (err) {
          this.log.error(err.message);
          reject(err);
        }
        resolve(this.processFile(err, data, filename));
      });
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
      let title_regex = object.title.match(/.*:\s/);
      let base_title = title_regex ? title_regex.toString() : '';
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
    this.loading.emit(true);
    let objects = [];
    for (let object of this.objects.slice(1)) {
      let metadata = {};
      for (let field of object.metadata) {
        field.joinValues();
        metadata[field.name] = field.value;
      }
      object.originalData.metadata = metadata;
      object.originalData.productionNotes = object.productionNotes
      objects.push(object.originalData);
    }
    this.projectData.objects = objects;

    let dataString = JSON.stringify(this.projectData);
    let filename = this.objects[0].input_file;

    writeFile(filename, dataString, (err) => {
      this.loading.emit(false);
      if (err) {
        this.log.error(err.message);
        throw err;
      }
    });
  }

  openFile(): any {
    return this.electronService.dialog.showOpenDialog({
      filters: [
        { name: 'Project File', extensions: ['carp'] }
      ],
      title: "Open Project"
    });
  }

  processFile(err, data, filename): Object[] {
    this.projectData = JSON.parse(data);
    this.objects = [];

    this.objects.push(this.collectionObject(this.projectData, filename));

    let i = 1;
    for (let pObject of this.projectData.objects) {
      let object: Object = new Object();
      object.originalData = pObject;
      object.id = i;
      object.metadata = this.processMetadata(pObject);
      object.metadataHash = hash(object.metadata);
      object.title = this.padLeft(i, 3, '0') + ': ' + object.getFieldValue('dcterms.title');
      object.base_path = dirname(filename);
      object.input_file = filename;
      object.path = dirname(filename);
      object.productionNotes = pObject.productionNotes || '';

      let acFiles = pObject.files.filter(file => file.purpose === 'access-copy');
      object.files = this.processObjectFiles(acFiles, dirname(filename));

      this.objects.push(object);
      i++;
    }

    this.objectsLoaded.emit(this.objects);
    this.loading.emit(false);
    return this.objects;
  }

  private collectionObject(project: any, filename: string): Object {
    let object: Object = new Object();
    object.id = 0;
    object.title = project.collectionTitle || '';
    object.input_file = filename;
    object.metadata = this.processMetadata({
      'metadata': {
        'dcterms.title': object.title
      }
    });
    object.metadataHash = hash(object.metadata);
    object.path = dirname(filename);
    object.productionNotes = '';

    return object;
  }

  private processMetadata(object: any): Field[] {
    let metadata: Field[] = [];
    if (!object.metadata) {
      object.metadata = {};
    }
    for (let field of this.mapService.mapFields) {
      let fullname: string = field.namespace + '.' + field.name;
      let value = object.metadata[fullname] || '';

      if (fullname === 'uhlib.aSpaceUri') {
        value = (object.artificial ? object.parent_uri : object.record_uri) || '';
      }
      if (fullname === 'dcterms.source') {
        value = object.pm_ark;
      }

      metadata.push(new Field(fullname, value, field));
    }
    return metadata;
  }

  private processObjectFiles(objectFiles: any[], basepath: string): File[] {
    let files: File[] = [];
    for (let objectFile of objectFiles) {
      let file = new File();
      file.path = basepath + '/' + objectFile.path;
      file.name = basename(file.path);
      file.mime = mime.getType(file.path);
      file.metadata = [];
      files.push(file);
    }
    return files;
  }

  private autofillObjects(objects: Object[], fieldName: string, fieldValue: string): void {
    for ( let object of objects ) {
      let field = object.getField(fieldName);
      field.setValue(fieldValue);
      object.metadataHash = hash(object.metadata);
    }
  }

  private padLeft(value: any, length: number, character: string): string {
    value = String(value);
    return Array(length - value.length + 1).join(character || " ") + value;
  }

}
