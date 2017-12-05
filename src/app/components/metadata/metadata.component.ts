import { Component, Input, OnInit, ElementRef, Renderer, ViewChild, ViewEncapsulation } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { existsSync, statSync } from 'fs';
let ConvertTiff = require('tiff-to-png');

import { Object } from '../../classes/object';
import { File } from '../../classes/file';

import { ObjectService } from '../../services/object.service';
import { ElectronService } from '../../services/electron.service';

import { ObligationHighlight } from '../../directives/obligation-highlight.directive';
import { VocabularyAutocomplete } from '../../directives/vocabulary-autocomplete.directive';
import { Validate } from '../../directives/validate.directive';

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
      return this.sanitizer.bypassSecurityTrustUrl('assets/spacer.png');
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
    return this.sanitizer.bypassSecurityTrustUrl('assets/spacer.png');
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
