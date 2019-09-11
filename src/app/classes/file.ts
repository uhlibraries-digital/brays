import { Field } from './field';
import { statSync } from 'fs';
import { dirname, basename, extname } from 'path';

export class File{
  id: number;
  path: string;
  name: string;
  mime: string;
  metadata: Field[];
  tiffProcessing: boolean;
  tiffImagePreviewPath: string;
  tiffError: boolean;

  getField(name: string): Field {
    return this.metadata.find(field => name === field.name);
  }

  getFieldValue(name: string): string {
    let field: Field = this.getField(name);
    return (!field) ? null : field.value;
  }

  ocrPath(): string {
    const ocrFilename = `${basename(this.name, extname(this.name))}_alto.xml`;
    return `${dirname(this.path)}/${ocrFilename}`
  }

  hasOcr(): boolean {
    try {
      statSync(this.ocrPath());
    }
    catch(e) {
      return false;
    }
    return true;
  }
}
