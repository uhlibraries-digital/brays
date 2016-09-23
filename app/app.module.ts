import { NgModule } from '@angular/core';
import { BrowserModule, Title } from '@angular/platform-browser';
import { FormsModule }   from '@angular/forms';
import { HttpModule }    from '@angular/http';

import { AppComponent } from './app.component';
import { DigitalObjectsComponent } from './digital-objects/digital-objects.component';
import { MetadataComponent } from './metadata/metadata.component';
import { VocabularyAutocompleteComponent } from './metadata/vocabulary-autocomplete.component';

import { ObjectService } from './shared/object.service';
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
    DigitalObjectsComponent,
    MetadataComponent,
    VocabularyAutocompleteComponent,
    FocusHighlight,
    Autosize
  ],
  entryComponents: [
    VocabularyAutocompleteComponent
  ],
  providers: [
    ObjectService,
    MapService,
    Title,
    VocabularyService
  ],
  bootstrap: [ AppComponent ]
})

export class AppModule { }