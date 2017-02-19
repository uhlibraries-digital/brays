const edtf = require('edtf');

import { Field } from './field';
import { File } from './file';

export class Object{
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

  getField(name: string): Field {
    return this.metadata.find(field => name === field.name);
  }

  getFieldValue(name: string): string {
    let field: Field = this.getField(name);
    if (!field) { return null; }
    field.joinValues();
    return field.value;
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
          edtf.parse(d);
        }
      }
      catch(e) {
        goodDate = false;
      }
    }

    return requiredMetadata.length === 0 && goodDate;
  }

}
