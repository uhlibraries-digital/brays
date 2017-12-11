import { Component, Input, OnInit, ElementRef, Renderer, ViewChild, ViewEncapsulation } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { existsSync, statSync } from 'fs';
let ConvertTiff = require('tiff-to-png');

import { Object } from 'app/classes/object';
import { File } from 'app/classes/file';

import { ObjectService } from 'app/services/object.service';
import { ElectronService } from 'app/services/electron.service';

import { ObligationHighlight } from 'app/directives/obligation-highlight.directive';
import { VocabularyAutocomplete } from 'app/directives/vocabulary-autocomplete.directive';
import { Validate } from 'app/directives/validate.directive';

@Component({
  selector: 'metadata',
  templateUrl: './metadata.component.html',
  styleUrls: [ './metadata.component.scss' ]
})

export class MetadataComponent implements OnInit {
  @Input() object: Object;
  @Input() selectedFile: File;

  showFlag: boolean = false;
  converter: any;

  private spacer: string = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAAlwSFlzAAALEwAACxMBAJqcGAAAA6RpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IlhNUCBDb3JlIDUuNC4wIj4KICAgPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4KICAgICAgPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIKICAgICAgICAgICAgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyIKICAgICAgICAgICAgeG1sbnM6ZXhpZj0iaHR0cDovL25zLmFkb2JlLmNvbS9leGlmLzEuMC8iPgogICAgICAgICA8eG1wOk1vZGlmeURhdGU+MjAxNy0wMi0xN1QxMzowMjo3MTwveG1wOk1vZGlmeURhdGU+CiAgICAgICAgIDx4bXA6Q3JlYXRvclRvb2w+UGl4ZWxtYXRvciAzLjU8L3htcDpDcmVhdG9yVG9vbD4KICAgICAgICAgPHRpZmY6T3JpZW50YXRpb24+MTwvdGlmZjpPcmllbnRhdGlvbj4KICAgICAgICAgPHRpZmY6Q29tcHJlc3Npb24+NTwvdGlmZjpDb21wcmVzc2lvbj4KICAgICAgICAgPHRpZmY6UmVzb2x1dGlvblVuaXQ+MjwvdGlmZjpSZXNvbHV0aW9uVW5pdD4KICAgICAgICAgPHRpZmY6WVJlc29sdXRpb24+NzI8L3RpZmY6WVJlc29sdXRpb24+CiAgICAgICAgIDx0aWZmOlhSZXNvbHV0aW9uPjcyPC90aWZmOlhSZXNvbHV0aW9uPgogICAgICAgICA8ZXhpZjpQaXhlbFhEaW1lbnNpb24+MTwvZXhpZjpQaXhlbFhEaW1lbnNpb24+CiAgICAgICAgIDxleGlmOkNvbG9yU3BhY2U+MTwvZXhpZjpDb2xvclNwYWNlPgogICAgICAgICA8ZXhpZjpQaXhlbFlEaW1lbnNpb24+MTwvZXhpZjpQaXhlbFlEaW1lbnNpb24+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgq9qnkFAAAAC0lEQVQIHWNgAAIAAAUAAY27m/MAAAAASUVORK5CYII=";

  constructor(
    private objectService: ObjectService,
    private renderer: Renderer,
    private el: ElementRef,
    private sanitizer: DomSanitizer,
    private electronService: ElectronService) {
    this.converter = new ConvertTiff({
      logLevel: 0,
      type: 'jpg'
    });
  }

  ngOnInit():void {
    this.objectService.objectChanged.subscribe((object) => {
      this.showFlag = false;
      this.object = object
    });
    this.objectService.fileChanged.subscribe(file => this.selectedFile = file);
  }

  madeChanges(object: Object):void {
    this.objectService.setObject(object);
  }

  save(): void {
    this.objectService.saveObjects();
  }

  isImage(file: File): boolean {
    return /^image\/*/.test(file.mime);
  }

  isTiff(file: File): boolean {
    return file.mime === 'image/tiff';
  }

  convertTiff(file: File): any {
    if (file.tiffProcessing || file.tiffError) {
      return this.sanitizer.bypassSecurityTrustUrl(this.spacer);
    }
    file.tiffImagePreviewPath = this.getCovertedTiffPath(file);
    if (file.tiffImagePreviewPath !== '') {
      return this.sanitizer.bypassSecurityTrustUrl(file.tiffImagePreviewPath);
    }

    let tiffs = [file.path];
    let tmpLocation = this.electronService.app.getPath('temp');

    this.converter.progress = (converted, total) => {
      file.tiffProcessing = false;
      file.tiffError = !converted[0].success;
      if (!file.tiffError) {
        file.tiffImagePreviewPath = converted[0].target + '/page1.jpg';
      }
    };
    file.tiffProcessing = true;
    file.tiffError = false;
    this.converter.convertArray(tiffs, tmpLocation);
    return this.sanitizer.bypassSecurityTrustUrl(this.spacer);
  }

  getCovertedTiffPath(file: File): string {
    let tmpLocation = this.electronService.app.getPath('temp');
    let path = tmpLocation + '/' +
      file.name.replace(/\.[^/.]+$/, "") + '/page1.jpg';

    if (existsSync(path)) {
      /**
        Refreash cache if older then 1 day by returning ''.
        Helps if the original ever changes.
      **/
      let stat = statSync(path);
      let diff = (new Date().getTime() - stat.mtime.getTime()) / 1000;
      return (diff > 86400) ? '' : path;
    }
    return '';
  }

  tiffProcessingClass(file: File): string {
    if (file.tiffProcessing && !file.tiffError) {
      return 'tiff-processing-icon fa-spin';
    }
    if (file.tiffError) {
      return 'tiff-processing-error';
    }
    return '';
  }

  imagePath(file: File): any {
    return this.sanitizer.bypassSecurityTrustUrl(file.path);
  }

  openFile(file: File): void {
    this.electronService.shell.openItem(file.path);
  }

  openUrl(uri: string): void {
    this.electronService.shell.openExternal(uri);
  }

  clearFlag(): void {
    this.object.productionNotes = '';
    this.showFlag = false;
    this.save();
  }

  addFlag(): void {
    this.showFlag = true;
    this.object.productionNotes = ' ';
    this.el.nativeElement.scrollTop = 0;
  }

  addRepeatable(values: any[], index: number = 0) {
    values.splice(index + 1, 0, {'value': ''});
  }

  removeRepeatable(values: any[], index: number) {
    values.splice(index, 1);
    this.save();
  }

}
