import { Component, Renderer, OnInit, ViewEncapsulation } from '@angular/core';
import { Title } from '@angular/platform-browser';

import { remote } from 'electron';
let {dialog} = remote;

import { MapService } from './shared/map.service';
import { ObjectService } from './shared/object.service';
import { VocabularyService } from './shared/vocabulary.service';

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
    private vocabularyService: VocabularyService) {
  }

  ngOnInit() {
    this.mapService.loadMapFields('https://uhlibraries-digital.github.io/bcdams-map/api/map.json').then(
      (fields) => {
        this.objectService.getObjects().then((objects) => {
          this.titleService.setTitle(objects[0].getFieldValue('dcterms.title'));
        },
        (err) => {
          dialog.showErrorBox('Error opening project', err.message);
          let focusWindow = remote.getCurrentWindow();
          focusWindow.destroy();
        })
      },
      (err) => {
        dialog.showErrorBox('Unable to load MAP', err.message);
        let focusWindow = remote.getCurrentWindow();
        focusWindow.destroy();
      }
    );
    this.vocabularyService.loadVocabulary('https://vocab.lib.uh.edu/en/hierarchy.ttl');
  }

  onDragHandle(event: MouseEvent) {
    if (!event.x || !event.y) return;
    let panel = document.querySelector('.objects-panel');
    this.renderer.setElementStyle(panel, 'width', event.x + 'px' );
  }

}
