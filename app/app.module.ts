import { NgModule } from '@angular/core';
import { BrowserModule, Title } from '@angular/platform-browser';
import { FormsModule }   from '@angular/forms';
import { HttpModule }    from '@angular/http';

import { AppComponent } from './app.component';
import { NotificationComponent } from './notification/notification.component';
import { LoadingComponent } from './loading/loading.component';
import { DigitalObjectsComponent } from './digital-objects/digital-objects.component';
import { MetadataComponent } from './metadata/metadata.component';
import { EdtfHumanizeComponent } from './metadata/edtf-humanize.component';
import { VocabularyAutocompleteComponent } from './shared/vocabulary-autocomplete.component';
import { AutofillComponent } from './digital-objects/autofill.component';

import { ObjectService } from './shared/object.service';
import { LoggerService } from './shared/logger.service';
import { MapService } from './shared/map.service';
import { VocabularyService } from './shared/vocabulary.service';

import { FocusHighlight } from './shared/focus-highlight.directive';
import { Autosize } from './shared/autosize.directive';

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule
  ],
  declarations: [
    AppComponent,
    NotificationComponent,
    LoadingComponent,
    DigitalObjectsComponent,
    MetadataComponent,
    EdtfHumanizeComponent,
    VocabularyAutocompleteComponent,
    AutofillComponent,
    FocusHighlight,
    Autosize
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
    VocabularyService
  ],
  bootstrap: [ AppComponent ]
})

export class AppModule { }
