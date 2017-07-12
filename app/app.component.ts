import { Component, Renderer, OnInit, ViewEncapsulation } from '@angular/core';
import { Title } from '@angular/platform-browser';

import { ipcRenderer, remote } from 'electron';
let {dialog} = remote;

import { MapService } from './shared/map.service';
import { ObjectService } from './shared/object.service';
import { VocabularyService } from './shared/vocabulary.service';
import { ContentDmService } from './shared/content-dm.service';
import { AvalonService } from './shared/avalon.service';

@Component({
  selector: 'app',
  templateUrl: './app.component.html',
  styles: [ require('./app.component.scss') ],
  encapsulation: ViewEncapsulation.None
})
export class AppComponent implements OnInit {

  constructor(
    private objectService: ObjectService,
    private mapService: MapService,
    private titleService: Title,
    private renderer: Renderer,
    private vocabularyService: VocabularyService,
    private cdm: ContentDmService,
    private avalon: AvalonService) {
  }

  ngOnInit() {
    this.mapService.loadMapFields('https://vocab.lib.uh.edu/bcdams-map/api/brays.json')
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
    this.vocabularyService.loadVocabulary('https://vocab.lib.uh.edu/en/hierarchy.ttl?depth=5');

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

  private handleError(msg: string, err: any): void {
    dialog.showErrorBox(msg, err.message);
    let focusWindow = remote.getCurrentWindow();
    focusWindow.destroy();
  }

}
