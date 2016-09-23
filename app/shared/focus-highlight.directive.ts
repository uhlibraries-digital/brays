import { Directive, ElementRef, Renderer, HostListener } from '@angular/core';

@Directive({
  selector: '[focusHighlight]'
})
export class FocusHighlight {

  constructor(
    private el: ElementRef,
    private renderer: Renderer) {
  }

  @HostListener('focus') onFocus() {
    this.highlight('focused');
  }

  @HostListener('blur') onBlur() {
    this.highlight('focused', false);
  }

  private highlight(classStr: string, add: boolean = true) {
    this.renderer.setElementClass(this.el.nativeElement, classStr, add);
  }

}
