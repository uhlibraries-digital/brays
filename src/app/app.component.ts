import { Component, Renderer, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { ElectronService } from './services/electron.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Title } from '@angular/platform-browser';

import { MapService } from './services/map.service';
import { ObjectService } from './services/object.service';
import { VocabularyService } from './services/vocabulary.service';
import { ContentDmService } from './services/content-dm.service';
import { AvalonService } from './services/avalon.service';
import { LocalStorageService } from './services/local-storage.service';
import { MetadataExportService } from './services/metadata-export.service';
import { LoggerService } from './services/logger.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
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
    private metaexport: MetadataExportService,
    private storage: LocalStorageService,
    private log: LoggerService,
    public electronService: ElectronService) { }

    ngOnInit() {

      this.preferences = this.storage.get('preferences');
      if ((typeof this.preferences) !== 'object' || !this.preferences) {
        this.setupPreferences();
      }
      else {
        this.loadApp();
      }

      this.electronService.ipcRenderer.on('show-preferences', (event, arg) => {
        this.showPreferences();
      });
      this.electronService.ipcRenderer.on('export-cdm', (event, arg) => {
        this.cdm.export();
      });
      this.electronService.ipcRenderer.on('export-avalon', (event, arg) => {
        this.avalon.export();
      });
      this.electronService.ipcRenderer.on('export-metadata', (event, arg) => {
        this.metaexport.export();
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
          this.log.error('Unable to load MAP', err);
        });
      this.vocabularyService.loadVocabulary(this.preferences.vocab)
        .catch((err) => {
          this.log.error(err + '. Make sure you have the correct URL for your vocabulary in Preferences.')
        });
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
      (reason) => {
        this.preferences = this.storage.get('preferences');
      });
    }

    private handleError(msg: string, err: any): void {
      this.electronService.dialog.showErrorBox(msg, err.message);
      let focusWindow = this.electronService.remote.getCurrentWindow();
      focusWindow.destroy();
    }
}
