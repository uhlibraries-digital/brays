import { OnInit, Component, HostListener, Output, EventEmitter, ViewChild } from '@angular/core';

import { ObjectService } from '../shared/object.service';
import { MapService } from '../shared/map.service';

import { MapField } from '../shared/map-field';

@Component({
  selector: 'autofill',
  templateUrl: './digital-objects/autofill.component.html',
  styles: [ require ('./autofill.component.scss') ]
})
export class AutofillComponent implements OnInit {

  selectedField: string;
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

  close(): void {
    this.dismissAutofill.emit();
  }

  @HostListener('document:keydown', ['$event']) onKeypress(e) {
    if (e.code === 'Escape') {
      this.dismissAutofill.emit();
    }
  }

}
