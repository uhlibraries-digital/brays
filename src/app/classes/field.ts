import { MapField } from './map-field';

export class Field{
  name: string;
  map: MapField;
  value: string;
  values: any[];
  valid: boolean;
  validationErrors: string[];

  constructor(name: string, value: string, map: MapField) {
    this.name = name;
    this.value = value || '';
    this.map = map;
    this.values = this.splitValues();
    this.valid = true;
    this.validationErrors = [];
  }

  setValue(value: string) {
    this.value = value;
    this.values = this.splitValues();
  }

  splitValues(): any[] {
    if (!this.map || !this.map.repeatable) { return null; }
    return this.value.split(';').map((val) => { return {'value': val.trim()}; });
  }

  joinValues() {
    if (!this.map || !this.map.repeatable) { return; }
    this.value = this.values.map((val) => { return val.value; }).join('; ');
  }
}
