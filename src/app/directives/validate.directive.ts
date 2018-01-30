import { Directive, ElementRef, Renderer, Input, OnInit, HostListener } from '@angular/core';
import { VocabularyService } from 'app/services/vocabulary.service';
import { Field } from 'app/classes/field';

const edtf = require('edtf');

@Directive({
  selector: '[validate]'
})
export class Validate implements OnInit {

  @Input('validate') field: Field;
  @Input() checkValueIndex: Number;

  checkValue: string;

  constructor(
    private el: ElementRef,
    private renderer: Renderer,
    private vocab: VocabularyService) {
  }

  @HostListener('change') onChange() {
    this.validate();
  }

  ngOnInit(): void {
    this.validate();
  }

  validate(): void {
    let valid: boolean = false;
    this.field.validationErrors = [];

    let index = Number(this.checkValueIndex);
    if (index === -1) {
      this.checkValue = this.field.value;
    }
    else {
      this.checkValue = this.field.values[index].value;
    }

    if (this.field.name === 'dc.date') {
      valid = this.isValidEDTF();
    }
    else {
      valid = this.isValidVocab();
    }

    this.field.valid = valid;
    let error = this.field.validationErrors.toString();

    this.renderer.setElementClass(this.el.nativeElement, 'validation-bad', !valid);
    this.renderer.setElementAttribute(this.el.nativeElement, 'title', error);
  }

  isValidEDTF(): boolean {
    if (this.checkValue === '') {
      return true;
    }

    try {
      let test = edtf(this.checkValue);
    }
    catch(e) {
      this.field.validationErrors.push('Invalid Extended Date Time Format (EDTF)');
      return false;
    }

    return true;
  }

  isValidVocab(): boolean {
    if (this.checkValue === '') {
      return true;
    }
    if (!this.field.map.range) {
      return true;
    }

    let checkList = this.getVocabList();
    if (checkList.length > 0) {
      let test = checkList.find(term => term === this.checkValue);
      if (!test) {
        this.field.validationErrors.push("Vocabulary term '${ this.checkValue }' not found");
      }
      return test ? true : false;
    }

    return true;
  }

  getVocabList(): string[] {
    let list = [];
    let ranges = this.field.map.range.filter((r) => {
      return r.uri;
    });
    for (let r of ranges) {
      list = list.concat(this.vocab.getPrefLabelsByRange(r.label));
    }
    return list;
  }


}
