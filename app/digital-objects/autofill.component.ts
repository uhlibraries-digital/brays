import { OnInit, Component, HostListener, Output, EventEmitter } from '@angular/core';
import { ViewChild, ViewChildren, QueryList, ElementRef, AfterViewInit } from '@angular/core';
import { VocabularyAutocomplete } from '../shared/vocabulary-autocomplete.directive';

import { ObjectService } from '../shared/object.service';
import { MapService } from '../shared/map.service';

import { MapField } from '../shared/map-field';

@Component({
  selector: 'autofill',
  templateUrl: './digital-objects/autofill.component.html',
  styles: [ require ('./autofill.component.scss') ]
})
export class AutofillComponent implements OnInit, AfterViewInit {

  selectedField: string;
  selectedRange: any;
  fieldValue: string;
  fieldValues: any[];
  fields: MapField[];
  fieldRepeatable: boolean;

  @Output() dismissAutofill = new EventEmitter();

  @ViewChild('fieldInput') fieldInput;
  @ViewChildren('fieldRepeatableInput') fieldRepeatableInput: QueryList<ElementRef>;

  constructor(
    private objectService: ObjectService,
    private map: MapService) {
  }

  ngOnInit(): void {
    this.fields = this.map.getMapFields();
    this.fieldRepeatable = false;
    this.fieldValues = [];
  }

  ngAfterViewInit(): void {
    this.fieldRepeatableInput.changes.subscribe(children => {
      if (this.fieldRepeatable) {
        children.last.nativeElement.focus();
      }
      else {
        this.focusInputField();
      }
    });
  }

  focusInputField(): void {
    this.fieldInput.nativeElement.focus();
  }

  autofillObjects(): void {
    if (this.selectedField) {
      if (this.fieldRepeatable) {
        this.fieldValue = this.fieldValues
          .map(val => { return val.value; }).join(';');
      }
      this.objectService.autofill(this.selectedField, this.fieldValue);
      this.objectService.saveObjects();
    }
    this.close();
  }

  onFieldChange(value: string): void {
    this.selectedField = value;
    this.fieldValues = [{value: ''}];

    let field = this.map.getMapFieldByFullName(this.selectedField);
    this.selectedRange = field.range;
    this.fieldRepeatable = field.repeatable;
    this.focusInputField();
  }

  close(): void {
    this.dismissAutofill.emit();
  }

  addRepeatable(index: number = 0): void {
    this.fieldValues.splice(index + 1, 0, {'value': ''});
  }

  removeRepeatable(index: number): void {
    this.fieldValues.splice(index, 1);
  }

  @HostListener('document:keydown', ['$event']) onKeypress(e) {
    if (e.code === 'Escape') {
      this.dismissAutofill.emit();
    }
  }

}
