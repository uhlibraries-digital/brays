import { Directive, ElementRef, Renderer, Input, OnInit, HostListener } from '@angular/core';
import { Field } from '../shared/field';

const edtf = require('edtf');

@Directive({
  selector: '[validate]'
})
export class Validate implements OnInit {

  @Input('validate') field: Field;
  @Input() checkValue: String;

  error: string;

  constructor(
    private el: ElementRef,
    private renderer: Renderer) {
  }

  @HostListener('change') onChange() {
    this.validate();
  }

  ngOnInit(): void {
    this.validate();
  }

  validate(): void {
    let validateFields = ['dc.date'];
    if (validateFields.indexOf(this.field.name) < 0) {
      return;
    }

    let valid: boolean = false;
    this.error = '';

    if (this.field.name === 'dc.date') {
      valid = this.isValidEDTF();
    }

    this.renderer.setElementClass(this.el.nativeElement, 'validation-bad', !valid);
    this.renderer.setElementAttribute(this.el.nativeElement, 'title', this.error);
  }

  isValidEDTF(): boolean {
    if (this.checkValue === '') {
      return true;
    }

    try {
      let test = edtf(this.checkValue);
    }
    catch(e) {
      this.error = 'Invalid Extended Date Time Format (EDTF)';
      return false;
    }

    return true;
  }


}
