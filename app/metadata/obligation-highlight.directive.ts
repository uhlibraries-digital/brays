import { Directive, ElementRef, Renderer, Input, OnInit, HostListener } from '@angular/core';
import { Field } from '../shared/field';

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
    let color: string;

    switch(this.field.map.obligation) {
      case 'required':
      case 'requiredWhenAvailable':
        color = '#d92626'; // red
        break;
      case 'recommended':
        color = '#e2c08d'; // yellow
        break;
      case 'stronglyRecommended':
        color = '#f98728';
        break;
      default:
        color = null;
    }

    if (this.field.value !== '') {
      color = null;
    }

    this.renderer.setElementStyle(this.el.nativeElement, 'borderColor', color);
  }



}
