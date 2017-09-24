import { Component, Renderer, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Title } from '@angular/platform-browser';

import { ipcRenderer, remote } from 'electron';
let {dialog} = remote;

import { MapService } from './shared/map.service';
import { ObjectService } from './shared/object.service';
import { VocabularyService } from './shared/vocabulary.service';
import { ContentDmService } from './shared/content-dm.service';
import { AvalonService } from './shared/avalon.service';
import { LocalStorageService } from './shared/local-storage.service';

@Component({
  selector: 'app',
  templateUrl: './app.component.html',
  styles: [ require('./app.component.scss') ],
  encapsulation: ViewEncapsulation.None
})
export class AppComponent implements OnInit {

  private preferences: any;

  @ViewChild('preferencesDisplay') preferencesDisplay: any;

  constructor(
    private objectService: ObjectService,
    private mapService: MapService,
    private modalService: NgbModal,
    private titleService: Title,
    private renderer: Renderer,
    private vocabularyService: VocabularyService,
    private cdm: ContentDmService,
    private avalon: AvalonService,
    private storage: LocalStorageService) {
  }

  ngOnInit() {

    this.preferences = this.storage.get('preferences');
    if ((typeof this.preferences) !== 'object' || !this.preferences) {
      this.setupPreferences();
    }
    else {
      this.loadApp();
    }

    ipcRenderer.on('show-preferences', (event, arg) => {
      this.showPreferences();
    });
    ipcRenderer.on('export-cdm', (event, arg) => {
      this.cdm.export();
    });
    ipcRenderer.on('export-avalon', (event, arg) => {
      this.avalon.export();
    });
  }

  onDragHandle(event: MouseEvent) {
    if (!event.x || !event.y) return;
    let panel = document.querySelector('.objects-panel');
    this.renderer.setElementStyle(panel, 'width', event.x + 'px' );
  }

  private loadApp(): void {
    this.mapService.loadMapFields(this.preferences.map)
      .then((fields) => {
        this.objectService.getObjects()
          .then((objects) => {
            this.titleService.setTitle(objects[0].getFieldValue('dcterms.title'));
          }).catch((err) => {
            this.handleError('Error opening project', err);
          });
      }).catch((err) => {
        this.handleError('Unable to load MAP', err);
      });
    this.vocabularyService.loadVocabulary(this.preferences.vocab);
  }

  private setupPreferences(): void {
    this.preferences = {
      'map': '',
      'vocab': ''
    };
    this.showPreferences();
  }

  private showPreferences(): void {
    this.modalService.open(this.preferencesDisplay, {
      backdrop: 'static',
      keyboard: false,
      size: 'lg'
    }).result.then((result) => {
      this.storage.set('preferences', this.preferences);
      this.loadApp();
    },
    (rejected) => {
      this.preferences = this.storage.get('preferences');
    });
  }

  private handleError(msg: string, err: any): void {
    dialog.showErrorBox(msg, err.message);
    let focusWindow = remote.getCurrentWindow();
    focusWindow.destroy();
  }

}
