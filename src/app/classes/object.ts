const edtf = require('edtf');

import { Field } from './field';
import { File } from './file';

export class Object{
  uuid: string;
  id: number;
  base_path: string;
  input_file: string;
  path: string;
  title: string;
  headers: string[];
  metadata: Field[];
  files: File[];
  metadataHash: string;
  productionNotes: string;
  originalData: any;

  getField(name: string): Field {
    return this.metadata.find(field => name === field.name);
  }

  getFieldValue(name: string): string {
    let field: Field = this.getField(name);
    if (!field) { return null; }
    field.joinValues();
    return field.value;
  }

  setField(name: string, value: string) {
    let field = this.metadata.find(field => name === field.name);
    field.setValue(value);
  }

  getId(): string {
    return this.padLeft(this.id, 3, '0');
  }

  isGood(): boolean {
    let requiredMetadata: Field[] = this.metadata.filter((metadata) => {
      return (
        metadata.map &&
        metadata.map.obligation === 'required' &&
        metadata.value === '' &&
        metadata.map.visible);
    });

    let goodDate = true; // Assume a good date incase field is empty
    let date = this.getFieldValue('dc.date');
    if (date && date !== '') {
      try {
        let dates = date.split('; ');
        for (let d of dates) {
          let test = edtf(d);
        }
      }
      catch(e) {
        goodDate = false;
      }
    }

    return requiredMetadata.length === 0 && goodDate;
  }

  private padLeft(value: any, length: number, character: string): string {
    value = String(value);
    return Array(length - value.length + 1).join(character || " ") + value;
  }

}
