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
  ocr: boolean | null = null;

  getField(name: string): Field {
    return this.metadata.find(field => name === field.name);
  }

  getFieldValue(name: string): string {
    let field: Field = this.getField(name);
    return (!field) ? null : field.value;
  }

  ocrPath(): string {
    return `${dirname(this.path)}/${this.ocrFilename()}`
  }

  ocrFilename(): string {
    return `${basename(this.name, extname(this.name))}_alto.xml`;
  }

  hasOcr(): boolean {
    if (this.ocr === null) {
      try {
        statSync(this.ocrPath());
        this.ocr = true;
      }
      catch(e) {
        this.ocr = false;
      }
    }
    return this.ocr;
  }

  exportFilename(prefix?: string): string {
    const match = this.name.match(/^[0-9]{4,}_(.*)/);
    return match ? 
      `${prefix}_${match[1]}`.replace(/_[a-z]{2}\./i, '.') : 
      this.name.replace(/_[a-z]{2}\./i, '.');
  }

  exportOcrFilename(prefix?: string): string {
    const filename = this.exportFilename(prefix);
    return `${basename(filename, extname(filename))}_alto.xml`;
  }
}
