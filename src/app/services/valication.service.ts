import { Injectable } from '@angular/core';

import { ObjectService } from './object.service';
import { VocabularyService } from './vocabulary.service';
import * as edtf from 'edtf';
import * as hash from 'object-hash';

import { Field } from 'app/classes/field';

@Injectable()
export class ValidationService {

  objects: any[];

  constructor(
    private vocab: VocabularyService,
    private objectService: ObjectService) {
      this.objectService.objectsLoaded.subscribe(objects => this.objects = objects);
    }

  validate(field: Field, checkValue: string): boolean {
    let valid: boolean;
    if (field.name === 'dc.date') {
      field.valid = this.isValidEDTF(field, checkValue);
    }
    else {
      field.valid = this.isValidVocab(field, checkValue);
    }
    return field.valid;
  }

  validateAll(): void {
    if (!this.objects) { return; }
    
    for (let object of this.objects) {
      for (let field of object.metadata) {
        let values = field.value.split(';').map(v => v.trim());
        for (let value of values) {
          this.validate(field, value);
        }
      }
      /**
       * Taking advantage of a metadata hash bug
       * Update the hash to get status colors to update
       */
      object.metadataHash = hash(object.metadata);
    }
  }

  private isValidEDTF(field: Field, checkValue: string): boolean {
    if (checkValue === '') {
      return true;
    }

    try {
      let test = edtf(checkValue);
    }
    catch(e) {
      field.validationErrors.push('Invalid Extended Date Time Format (EDTF)');
      return false;
    }

    return true;
  }

  private isValidVocab(field: Field, checkValue: string): boolean {
    if (checkValue === '') {
      return true;
    }
    if (!field.map.range) {
      return true;
    }

    let checkList = this.getVocabList(field);
    if (checkList.length > 0) {
      let test = checkList.find(term => term === checkValue);
      if (!test) {
        field.validationErrors.push(`Vocabulary term '${ checkValue }' not found`);
      }
      return test ? true : false;
    }

    return true;
  }

  private getVocabList(field: Field): string[] {
    let list = [];
    let ranges = field.map.range.filter((r) => {
      return r.uri;
    });
    for (let r of ranges) {
      let prefLabel = this.vocab.getPrefLabelsByRange(r.label);
      if (prefLabel) {
        list = list.concat(prefLabel);
      }
    }
    return list;
  }

}
