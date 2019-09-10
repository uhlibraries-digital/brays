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

import { dirname, basename, extname } from 'path';
import { statSync } from 'fs';
import { AutofillComponent } from 'app/components/autofill/autofill.component';

import { Object } from 'app/classes/object';
import { File } from 'app/classes/file';

import { ObjectService } from 'app/services/object.service';
import { MapService } from 'app/services/map.service';
import { ValidationService } from 'app/services/valication.service';
import { ElectronService } from 'app/services/electron.service';

@Component({
  selector: "digital-objects",
  templateUrl: './digital-objects.component.html',
  styleUrls: [ './digital-objects.component.scss' ]
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
      this.contextMenu.popup(this.electronService.remote.getCurrentWindow());
    }
  }

  constructor(
    private validationService: ValidationService,
    private objectService: ObjectService,
    private map: MapService,
    private viewContainerRef: ViewContainerRef,
    private resolver: ComponentFactoryResolver,
    private electronService: ElectronService) {
  }

  ngOnInit() {
    this.objectService.objectChanged.subscribe(object => this.object = this.selectedObject = object);
    this.objectService.objectsLoaded.subscribe((objects) => {
      this.objects = objects;
      this.validationService.validateAll();
    });
    this.objectService.selectedObjectsChanged.subscribe(objects => this.selectedObjects = objects);

    this.buildContextMenu();
    this.map.getMapFields();
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
    this.contextMenu = new this.electronService.Menu();
    this.contextMenu.append(new this.electronService.MenuItem(
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
    // This forces the Lifecycle hooks
    this.autofillComponentRef.instance.focusInputField();
    this.autofillComponentRef.instance.dismissAutofill.subscribe(() => {
      this.autofillComponentRef.destroy();
    });
    this.autofillComponentRef.changeDetectorRef.detectChanges();
  }

  hasOcr(file: File): boolean {
    let ocrFilename = `${basename(file.name, extname(file.name))}_alto.xml`;
    let ocrPath = `${dirname(file.path)}/${ocrFilename}`
    try {
      statSync(ocrPath);
    }
    catch(e) {
      return false;
    }
    return true;
  }

}
