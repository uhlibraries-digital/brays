import { OnInit, Component, HostListener, Output, EventEmitter, ViewChild } from '@angular/core';

import { VocabularyAutocomplete } from '../shared/vocabulary-autocomplete.directive';

import { ObjectService } from '../shared/object.service';
import { MapService } from '../shared/map.service';

import { MapField } from '../shared/map-field';

@Component({
  selector: 'autofill',
  templateUrl: './digital-objects/autofill.component.html',
  styles: [ require ('./autofill.component.scss') ],
  directives: [
    VocabularyAutocomplete
  ]
})
export class AutofillComponent implements OnInit {

  selectedField: string;
  selectedRange: string;
  fieldValue: string;
  fields: MapField[];

  @Output() dismissAutofill = new EventEmitter();

  @ViewChild('fieldInput') fieldInput;

  constructor(
    private objectService: ObjectService,
    private map: MapService) {
  }

  ngOnInit(): void {
    this.fields = this.map.getMapFields();
  }

  focusInputField(): void {
    this.fieldInput.nativeElement.focus();
  }

  autofillObjects(): void {
    if (this.selectedField) {
      this.objectService.autofill(this.selectedField, this.fieldValue);
      this.objectService.saveObjects();
    }
    this.close();
  }

  onFieldChange(value: string): void {
    this.focusInputField();

    this.selectedField = value;
    let field = this.map.getMapFieldByFullName(this.selectedField);
    this.selectedRange = field.range_label;
  }

  close(): void {
    this.dismissAutofill.emit();
  }

  @HostListener('document:keydown', ['$event']) onKeypress(e) {
    if (e.code === 'Escape') {
      this.dismissAutofill.emit();
    }
  }

}
