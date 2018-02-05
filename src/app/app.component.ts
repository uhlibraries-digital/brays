import { Component, Renderer, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { ElectronService } from './services/electron.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Title } from '@angular/platform-browser';

import { MapService } from './services/map.service';
import { ObjectService } from './services/object.service';
import { ValidationService } from './services/valication.service';
import { VocabularyService } from './services/vocabulary.service';
import { ContentDmService } from './services/content-dm.service';
import { AvalonService } from './services/avalon.service';
import { LocalStorageService } from './services/local-storage.service';
import { MetadataExportService } from './services/metadata-export.service';
import { LoggerService } from './services/logger.service';
import { PreferencesService } from './services/preferences.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  private preferences: any;
  private preferenceIndex: number = 0;

  @ViewChild('preferencesDisplay') preferencesDisplay: any;

  constructor(
    private objectService: ObjectService,
    private mapService: MapService,
    private modalService: NgbModal,
    private titleService: Title,
    private renderer: Renderer,
    private validationService: ValidationService,
    private vocabularyService: VocabularyService,
    private cdm: ContentDmService,
    private avalon: AvalonService,
    private metaexport: MetadataExportService,
    private storage: LocalStorageService,
    private log: LoggerService,
    private preferenceService: PreferencesService,
    public electronService: ElectronService) { }

    ngOnInit() {
      this.preferenceService.preferencesChange.subscribe((data) => {
        this.preferences = data;
      });
      this.preferenceService.load();
      if (this.preferenceService.new) {
        this.showPreferences();
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
        .then((store) => {
          this.validationService.validateAll();
        })
        .catch((err) => {
          console.error(err);
          this.log.error(err + '. Make sure you have the correct URL for your vocabulary in Preferences.')
        });
    }

    private showPreferences(): void {
      this.preferenceIndex = 0;
      this.modalService.open(this.preferencesDisplay, {
        backdrop: 'static',
        keyboard: false,
        size: 'lg'
      }).result.then((result) => {
        this.preferenceService.set(this.preferences);
        this.loadApp();
      },
      (reason) => {
        this.preferences = this.preferenceService.data;
      });
    }

    private handleError(msg: string, err: any): void {
      this.electronService.dialog.showErrorBox(msg, err.message);
      let focusWindow = this.electronService.remote.getCurrentWindow();
      focusWindow.destroy();
    }
}
