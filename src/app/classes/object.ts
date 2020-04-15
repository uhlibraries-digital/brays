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
  do_ark: string;
  containers: any[];

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

    let fieldErrors = this.metadata.filter((field) => {
      return !field.valid;
    });

    return requiredMetadata.length === 0 && fieldErrors.length === 0;
  }

  private padLeft(value: any, length: number, character: string): string {
    value = String(value);
    if (value.length > length) { return value; }
    return Array(length - value.length + 1).join(character || " ") + value;
  }

}
