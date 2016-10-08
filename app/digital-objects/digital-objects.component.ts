import { Component,
         ComponentFactoryResolver,
         Input,
         Output,
         EventEmitter,
         OnInit,
         ComponentRef,
         ViewContainerRef,
         ViewEncapsulation,
         HostListener } from '@angular/core';
import { remote } from 'electron';
let { Menu, MenuItem } = remote;

import { AutofillComponent } from './autofill.component';

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
  selectedObjects: Object[] = [];
  selectedFile: File;
  contextMenu: any;
  autofillComponentRef: ComponentRef<any>;

  @Output() object: EventEmitter<Object>;

  @HostListener('contextmenu', ['$event']) onContextMenu(e) {
    e.preventDefault();
    e.stopPropagation();

    if (
      this.selectedObjects.length > 0 ||
      this.selectedObject === this.objects[0]) {
      this.contextMenu.popup(remote.getCurrentWindow());
    }
  }

  constructor(
    private objectService: ObjectService,
    private map: MapService,
    private viewContainerRef: ViewContainerRef,
    private resolver: ComponentFactoryResolver) {
  }

  ngOnInit() {
    this.objectService.objectChanged.subscribe(object => this.object = this.selectedObject = object);
    this.objectService.objectsLoaded.subscribe(objects => this.objects = objects);
    this.objectService.selectedObjectsChanged.subscribe(objects => this.selectedObjects = objects);

    this.buildContextMenu();
  }

  getObjects() {
    this.objects = this.objectService.objects;
  }

  onSelect(object: Object, event){
    event.stopPropagation();
    if ( event.metaKey || event.ctrlKey ) {
      this.handleMultipleSelect(object);
      this.selectedObject = null;
      object = null;
    }
    else {
      this.selectedObject = object;
      this.objectService.clearSelectedObjects();
    }
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

  handleMultipleSelect(object: Object): void {
    if ( this.selectedObject !== null ) {
      this.objectService.pushSelectedObject(this.selectedObject);
    }

    let index = this.objectService.findIndexInSelectedObjects(object);
    if ( index > -1 ) {
      this.objectService.removeSelectedObject(index);
    }
    else {
      this.objectService.pushSelectedObject(object);
    }
  }

  inSelectedObjects(object: Object): boolean {
    let index = this.objectService.findIndexInSelectedObjects(object);
    return index > -1;
  }

  buildContextMenu(): void {
    this.contextMenu = new Menu();
    this.contextMenu.append(new MenuItem(
      {
        label: 'Autofill',
        click: () => {
          this.displayAutofill();
        }
      }
    ));
  }

  displayAutofill(): void {
    let factory = this.resolver.resolveComponentFactory(AutofillComponent);
    this.autofillComponentRef = this.viewContainerRef.createComponent(factory);
    this.autofillComponentRef.instance.dismissAutofill.subscribe(() => {
      this.autofillComponentRef.destroy();
    });
    // This forces the Lifecycle hooks
    this.autofillComponentRef.instance.focusInputField();
  }

}
