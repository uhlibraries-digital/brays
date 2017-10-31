import { Directive, ElementRef, Renderer, Input, OnInit } from '@angular/core';
import { Object } from '../classes/object';
import { Field } from '../classes/field';

@Directive({
  selector: '[status-color]'
})

export class StatusColor implements OnInit {
  oldTitle: string;
  oldMetadataHash: string;

  @Input('status-color') object: Object;

  constructor(
    private el: ElementRef,
    private renderer: Renderer) {
  }

  public setColorClass(): void {
    if ( this.object.isGood() ) {
      this.renderer.setElementClass(this.el.nativeElement, 'status-bad', false);
      this.renderer.setElementClass(this.el.nativeElement, 'status-good', true);
    }
    else {
      this.renderer.setElementClass(this.el.nativeElement, 'status-good', false);
      this.renderer.setElementClass(this.el.nativeElement, 'status-bad', true);
    }
  }

  ngOnInit(): void {
    this.oldTitle = this.object.title;
    this.oldMetadataHash = this.object.metadataHash;

    this.setColorClass();
  }

  ngDoCheck(): void {
    if (this.oldMetadataHash !== this.object.metadataHash) {
      this.setColorClass();
      this.oldMetadataHash = this.object.metadataHash;
    }
  }

}
