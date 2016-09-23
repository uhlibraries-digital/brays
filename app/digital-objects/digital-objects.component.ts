import { Component, Input, Output, EventEmitter, OnInit, ViewEncapsulation, HostListener } from '@angular/core';

import { Object } from '../shared/object';
import { File } from '../shared/file';
import { ObjectService } from '../shared/object.service';
import { MapService } from '../shared/map.service';

import { StatusColor } from './status-color.directive';

@Component({
  selector: "digital-objects",
  templateUrl: './digital-objects/digital-objects.component.html',
  styles: [ require ('./digital-objects.component.scss') ],
  encapsulation: ViewEncapsulation.None,
  directives: [
    StatusColor
  ]
})

export class DigitalObjectsComponent implements OnInit {
  objects: Object[];
  selectedObject: Object;
  selectedFile: File;

  @Output() object: EventEmitter<Object>;

  constructor(
    private objectService: ObjectService,
    private mapService: MapService) {
  }

  ngOnInit() {
    this.objectService.objectChanged.subscribe(object => this.object = this.selectedObject = object);
    this.objectService.objectsLoaded.subscribe(objects => this.objects = objects);
  }

  getObjects() {
    this.objects = this.objectService.objects;
  }

  onSelect(object: Object, event){
    event.stopPropagation();

    this.selectedObject = object;
    this.selectedFile = null;

    this.objectService.setObject(object);
    this.objectService.setFile(null);
  }

  onSelectFile(file: File, event){
    event.stopPropagation();

    if (this.selectedFile === file) {
      this.selectedFile = null;
    }
    else {
      this.selectedFile = file;
    }
    this.objectService.setFile(this.selectedFile);
  }

  isImage(file: File): boolean {
    return /^image\/*/.test(file.mime);
  }

}
