import 'zone.js/dist/zone-mix';
import 'reflect-metadata';
import 'polyfills';
import { BrowserModule, Title } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

/* Components */
import { ActivityComponent } from './components/activity/activity.component';
import { AppComponent } from './app.component';
import { AutofillComponent } from './components/autofill/autofill.component';
import { DigitalObjectsComponent } from './components/digital-objects/digital-objects.component';
import { EdtfHumanizeComponent } from './components/edtf-humanize/edtf-humanize.component';
import { MetadataComponent } from './components/metadata/metadata.component';
import { NotificationComponent } from './components/notification/notification.component';
import { PromptComponent } from './components/prompt/prompt.component';
import { VocabularyAutocompleteComponent } from './components/vocabulary-autocomplete/vocabulary-autocomplete.component';

/* Modules */
// import { AppRoutingModule } from './app-routing.module';

/* Services */
import { AvalonService } from './services/avalon.service';
import { ContentDmService } from './services/content-dm.service';
import { ElectronService } from './services/electron.service';
import { GreensService } from './services/greens.service';
import { LocalStorageService } from './services/local-storage.service';
import { LoggerService } from './services/logger.service';
import { MapService } from './services/map.service';
import { MetadataExportService } from './services/metadata-export.service';
import { MintService } from './services/mint.service';
import { ObjectService } from './services/object.service';
import { PreferencesService } from './services/preferences.service';
import { ProgressBarService } from './services/progress-bar.service';
import { PromptService } from './services/prompt.service';
import { VocabularyService } from './services/vocabulary.service';
import { WatchService } from './services/watch.service';

/* Directives */
import { Autosize } from './directives/autosize.directive';
import { ObligationHighlight } from './directives/obligation-highlight.directive';
import { StatusColor } from './directives/status-color.directive';
import { Validate } from './directives/validate.directive';
import { VocabularyAutocomplete } from './directives/vocabulary-autocomplete.directive';

@NgModule({
  declarations: [
    ActivityComponent,
    AppComponent,
    AutofillComponent,
    DigitalObjectsComponent,
    EdtfHumanizeComponent,
    MetadataComponent,
    NotificationComponent,
    PromptComponent,
    VocabularyAutocompleteComponent,

    Autosize,
    ObligationHighlight,
    StatusColor,
    Validate,
    VocabularyAutocomplete
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    NgbModule.forRoot()
  ],
  providers: [
    AvalonService,
    ContentDmService,
    ElectronService,
    GreensService,
    LocalStorageService,
    LoggerService,
    MapService,
    MetadataExportService,
    MintService,
    ObjectService,
    PreferencesService,
    ProgressBarService,
    PromptService,
    VocabularyService,
    WatchService
  ],
  entryComponents: [
    VocabularyAutocompleteComponent,
    AutofillComponent
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
