import { OnInit, Component, HostListener, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { ViewChild, ViewChildren, QueryList, ElementRef, AfterViewInit } from '@angular/core';

import { VocabularyAutocomplete } from 'app/directives/vocabulary-autocomplete.directive';

import { ObjectService } from 'app/services/object.service';
import { MapService } from 'app/services/map.service';
import { ValidationService } from 'app/services/valication.service';

import { MapField } from 'app/classes/map-field';

@Component({
  selector: 'autofill',
  templateUrl: './autofill.component.html',
  styleUrls: [ './autofill.component.scss' ]
})
export class AutofillComponent implements OnInit, AfterViewInit {

  selectedField: string;
  selectedRange: any;
  selectedRangeValues: string[];
  fieldValue: string;
  fieldValues: any[];
  fields: MapField[];
  fieldRepeatable: boolean;
  fieldRangeValues: boolean;

  @Output() dismissAutofill = new EventEmitter();

  @ViewChild('fieldInput') fieldInput;
  @ViewChildren('fieldRepeatableInput') fieldRepeatableInput: QueryList<ElementRef>;

  constructor(
    private changeRef: ChangeDetectorRef,
    private objectService: ObjectService,
    private validationService: ValidationService,
    private map: MapService) {
  }

  ngOnInit(): void {
    this.fields = this.map.mapFields;
    this.map.mapFieldsChange.subscribe((fields) => {
      this.fields = fields;
    });
    this.fieldRepeatable = false;
    this.fieldRangeValues = false;
    this.selectedRangeValues = [];
    this.fieldValues = [];
  }

  ngAfterViewInit(): void {
    this.fieldRepeatableInput.changes.subscribe(children => {
      if (this.fieldRepeatable && !this.fieldRangeValues) {
        children.last.nativeElement.focus();
      }
      else {
        this.focusInputField();
      }
    });
  }

  focusInputField(): void {
    if (!this.fieldRangeValues) {
      this.fieldInput.nativeElement.focus();
    }
  }

  autofillObjects(): void {
    if (this.selectedField) {
      if (this.fieldRepeatable) {
        this.fieldValue = this.fieldValues
          .map(val => { return val.value; }).join(';');
      }
      this.objectService.autofill(this.selectedField, this.fieldValue);
      this.objectService.saveObjects();
      this.validationService.validateAll();
    }
    this.close();
  }

  onFieldChange(value: string): void {
    this.selectedField = value;
    this.fieldValues = [{value: ''}];

    let field = this.map.getMapFieldByFullName(this.selectedField);
    this.selectedRange = field.range;
    this.selectedRangeValues = this.rangeValues(field);
    this.fieldRangeValues = this.selectedRangeValues.length > 0;
    this.fieldRepeatable = field.repeatable;

    this.changeRef.detectChanges();
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

  rangeValues(field: MapField): string[] {
    let values = [];
    for (let r of field.range) {
      if (r.values) {
        values = values.concat(r.values);
      }
    }

    return values.length > 0 ? [''].concat(values) : [];
  }

  @HostListener('document:keydown', ['$event']) onKeypress(e) {
    if (e.code === 'Escape') {
      this.dismissAutofill.emit();
    }
  }

}
