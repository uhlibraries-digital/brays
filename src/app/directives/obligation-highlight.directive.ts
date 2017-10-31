import { Directive, ElementRef, Renderer, Input, OnInit, HostListener } from '@angular/core';
import { Field } from '../classes/field';

@Directive({
  selector: '[obligationHighlight]'
})
export class ObligationHighlight implements OnInit {

  @Input('obligationHighlight') field: Field;

  constructor(
    private el: ElementRef,
    private renderer: Renderer) {
  }

  @HostListener('change') onChange() {
    this.highlight();
  }

  ngOnInit(): void {
    this.highlight();
  }

  highlight(): void {
    let oclass: string;
    let remove: boolean = false;

    switch(this.field.map.obligation) {
      case 'required':
        oclass = 'obligation-required';
        break;
      case 'recommended':
        oclass = 'obligation-recommened';
        break;
      case 'requiredWhenAvailable':
      case 'stronglyRecommended':
        oclass = 'obligation-strong';
        break;
      default:
        oclass = '';
    }

    remove = this.field.value.replace('; ', '') === '';

    if (oclass) {
      this.renderer.setElementClass(this.el.nativeElement, oclass, remove);
    }
  }

}
