import { NgModule } from '@angular/core';
import { BrowserModule, Title } from '@angular/platform-browser';
import { FormsModule }   from '@angular/forms';
import { HttpModule }    from '@angular/http';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { AppComponent } from './app.component';
import { NotificationComponent } from './notification/notification.component';
import { ActivityComponent } from './activity/activity.component';
import { DigitalObjectsComponent } from './digital-objects/digital-objects.component';
import { MetadataComponent } from './metadata/metadata.component';
import { EdtfHumanizeComponent } from './metadata/edtf-humanize.component';
import { VocabularyAutocompleteComponent } from './shared/vocabulary-autocomplete.component';
import { AutofillComponent } from './digital-objects/autofill.component';
import { PromptComponent } from './prompt/prompt.component';

import { ObjectService } from './shared/object.service';
import { LoggerService } from './shared/logger.service';
import { MapService } from './shared/map.service';
import { VocabularyService } from './shared/vocabulary.service';
import { ContentDmService } from './shared/content-dm.service';
import { AvalonService } from './shared/avalon.service';
import { PromptService } from './prompt/prompt.service';
import { LocalStorageService } from './shared/local-storage.service';
import { ProgressBarService } from './shared/progress-bar.service';

import { Autosize } from './shared/autosize.directive';
import { ObligationHighlight } from './metadata/obligation-highlight.directive';
import { VocabularyAutocomplete } from './shared/vocabulary-autocomplete.directive';
import { Validate } from './metadata/validate.directive';
import { StatusColor } from './digital-objects/status-color.directive';

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    NgbModule.forRoot()
  ],
  declarations: [
    AppComponent,
    NotificationComponent,
    ActivityComponent,
    DigitalObjectsComponent,
    MetadataComponent,
    EdtfHumanizeComponent,
    VocabularyAutocompleteComponent,
    AutofillComponent,
    PromptComponent,
    Autosize,
    ObligationHighlight,
    VocabularyAutocomplete,
    Validate,
    StatusColor
  ],
  entryComponents: [
    VocabularyAutocompleteComponent,
    AutofillComponent
  ],
  providers: [
    LoggerService,
    ObjectService,
    MapService,
    Title,
    VocabularyService,
    ContentDmService,
    AvalonService,
    PromptService,
    LocalStorageService,
    ProgressBarService
  ],
  bootstrap: [ AppComponent ]
})

export class AppModule { }
