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

import { Object } from 'app/classes/object';
import { Field } from 'app/classes/field';
import { File } from 'app/classes/file';
import { MapField } from 'app/classes/map-field';

import { MapService } from './map.service';
import { LoggerService } from './logger.service';
import { ElectronService } from './electron.service';
import { WatchService } from './watch.service';


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
  saving: EventEmitter<any> = new EventEmitter();
  projectFileLocationChanged: EventEmitter<any> = new EventEmitter();

  constructor(
    private mapService: MapService,
    private log: LoggerService,
    private electronService: ElectronService,
    private watch: WatchService) {
      this.objects = [];
      this.selectedObjects = [];
      this.saving.emit(false);

      this.watch.projectChanged.subscribe((filename) => {
        this.updateProject(filename);
      })
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
    this.saving.emit(true);
    let objects = [];
    for (let object of this.objects.slice(1)) {
      let metadata = {};
      for (let field of object.metadata) {
        field.joinValues();
        metadata[field.name] = field.value;
      }
      object.originalData.metadata = metadata;
      object.originalData.productionNotes = object.productionNotes;
      object.originalData.do_ark = object.do_ark || '';
      objects.push(object.originalData);
    }
    this.projectData.objects = objects;

    let dataString = JSON.stringify(this.projectData);
    let filename = this.objects[0].input_file;

    writeFile(filename, dataString, (err) => {
      this.loading.emit(false);
      this.saving.emit(false);
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
      let object = this.createObject(pObject, i++, filename);
      this.objects.push(object);
    }

    this.objectsLoaded.emit(this.objects);
    this.loading.emit(false);
    this.watch.projectFile(filename);
    return this.objects;
  }

  private createObject(pObject: any, index: number, filename: string): Object {
    let object: Object = new Object();
    object.originalData = pObject;
    object.uuid = pObject.uuid;
    object.id = index;
    object.metadata = this.processMetadata(pObject);

    if (object.getFieldValue('dcterms.title') === '' && pObject.title) {
      object.setField('dcterms.title', pObject.title);
    }
    if (object.getFieldValue('dc.date') === '' && pObject.dates) {
      object.setField('dc.date', pObject.dates.join('; '));
    }
    if (object.getFieldValue('dcterms.source') === '' && pObject.pm_ark) {
      object.setField('dcterms.source', pObject.pm_ark || '');
    }
    object.setField('uhlib.aSpaceUri', ((pObject.artificial ? pObject.parent_uri : pObject.uri) || ''));
    object.metadataHash = hash(object.metadata);
    object.title = this.padLeft(index, 3, '0') + ': ' + object.getFieldValue('dcterms.title');
    object.base_path = dirname(filename);
    object.input_file = filename;
    object.path = dirname(filename);
    object.productionNotes = pObject.productionNotes || '';
    object.do_ark = pObject.do_ark || '';

    let acFiles = pObject.files.filter(file => file.purpose === 'access-copy');
    object.files = this.processObjectFiles(acFiles, dirname(filename));

    return object;
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
      metadata.push(new Field(fullname, value, field));
    }
    return metadata;
  }

  private processObjectFiles(objectFiles: any[], basepath: string): File[] {
    let files: File[] = [];
    for (let objectFile of objectFiles) {
      let file = new File();
      file.path = basepath + '/' + objectFile.path.replace(/\\/g, '/');
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
    if (value.length > length) { return value; }
    return Array(length - value.length + 1).join(character || " ") + value;
  }

  private updateProject(filename): void {
    readFile(filename, 'utf8', (err, data) => {
      if (err) {
        this.log.error(err.message);
      }
      this.processUpdate(data, filename);
    });
  }

  private processUpdate(data: any, filename: string): void {
    this.projectData = JSON.parse(data);
    let i = 1;
    for (let pObject of this.projectData.objects) {
      let object = this.objects.find((o) => {
        return pObject.uuid && o.uuid === pObject.uuid;
      });
      if (!object) {
        let newObject = this.createObject(pObject, i++, filename);
        this.objects.push(newObject);
      }
      else {
        this.updateObject(object, pObject, i++, filename);
      }
    }

    /**
     * Remove any objects that got deleted from the project file
     */
    let markForRemoval = this.objects.filter((o) => {
      let f = this.projectData.objects.find(p => p.uuid === o.uuid);
      return !f && o.uuid;
    });
    for (let remove of markForRemoval) {
      let index = this.objects.findIndex(o => o.uuid && o.uuid === remove.uuid)
      this.objects.splice(index, 1);
    }

    /**
     * Re-order the object.id with the new id/index after removal
     */
    for (let i = 1; i < this.objects.length; i++) {
      this.objects[i].id = i;
      this.objects[i].title = this.padLeft(i, 3, '0') + ': ' + this.objects[i].getFieldValue('dcterms.title');
    }

    /**
     * Re-sort the objects by id
     */
    this.objects.sort((a, b) => {
      return a.id - b.id;
    });
  }

  private updateObject(object: any, pObject: any, index: number, filename: string): void {
    object.originalData = pObject;
    object.id = index;
    object.title = this.padLeft(index, 3, '0') + ': ' + object.getFieldValue('dcterms.title');
    if (object.getFieldValue('dc.date') === '' && pObject.dates) {
      object.setField('dc.date', pObject.dates.join('; '));
    }
    if (object.getFieldValue('dcterms.source') === '' && pObject.pm_ark) {
      object.setField('dcterms.source', pObject.pm_ark || '');
    }
    object.setField('uhlib.aSpaceUri', ((pObject.artificial ? pObject.parent_uri : pObject.uri) || ''));
    object.productionNotes = pObject.productionNotes || '';

    let acFiles = pObject.files.filter(file => file.purpose === 'access-copy');
    object.files = this.processObjectFiles(acFiles, dirname(filename));
  }

}
