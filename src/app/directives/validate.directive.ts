import { Directive, ElementRef, Renderer, Input, OnInit, HostListener } from '@angular/core';
import { ValidationService } from 'app/services/valication.service';
import { Field } from 'app/classes/field';

@Directive({
  selector: '[validate]'
})
export class Validate implements OnInit {

  @Input('validate') field: Field;
  @Input('ngModel') checkValue: string;

  constructor(
    private el: ElementRef,
    private renderer: Renderer,
    private validationService: ValidationService) {
  }

  @HostListener('ngModelChange', ['$event']) onChange(event: any) {
    this.checkValue = event;
    this.validate();
  }

  @HostListener('change') onFieldChange() {
    this.field.valid = this.validationService.validFieldValues(this.field);
  }

  ngOnInit(): void {
    this.validate();
  }

  validate(): void {
    let valid = this.validationService.validate(this.field, this.checkValue);

    this.field.valid = valid;
    let error = this.field.validationErrors.toString();

    this.renderer.setElementClass(this.el.nativeElement, 'validation-bad', !valid);
    this.renderer.setElementAttribute(this.el.nativeElement, 'title', error);
  }
}
