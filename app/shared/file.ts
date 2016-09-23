import { Field } from './field';

export class File{
  id: number;
  path: string;
  name: string;
  mime: string;
  metadata: Field[];

  getField(name: string): Field {
    return this.metadata.find(field => name === field.name);
  }

  getFieldValue(name: string): string {
    let field: Field = this.getField(name);
    return (!field) ? null : field.value;
  }
}
