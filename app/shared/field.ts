import { MapField } from './map-field';

export class Field{
  name: string;
  map: MapField;
  value: string;


  constructor(name: string, value: string, map: MapField) {
    this.name = name;
    this.value = value;
    this.map = map;
  }
}
