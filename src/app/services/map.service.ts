import { Injectable, Output, EventEmitter }    from '@angular/core';
import { Headers, Http } from '@angular/http';

import 'rxjs/add/operator/toPromise';

import { MapField } from 'app/classes/map-field';

@Injectable()
export class MapService {

  mapFields: MapField[];
  mapFieldsChange: EventEmitter<MapField[]> = new EventEmitter<MapField[]>();

  constructor(private http: Http) { }

  loadMapFields(url: string): Promise<MapField[]> {
    return this.http.get(url)
      .toPromise()
      .then((response) => {
        this.mapFields = response.json() as MapField[];
        this.mapFieldsChange.emit(this.mapFields);
        return this.mapFields;
      })
      .catch(this.handleError);
  }

  getMapFields(): MapField[] {
    this.mapFieldsChange.emit(this.mapFields);
    return this.mapFields;
  }

  getMapFieldByFullName(name: string): MapField {
    return this.mapFields.find(field => name === (field.namespace + '.' + field.name));
  }

  private handleError(error: any): Promise<any> {
    console.error('An error occured', error);
    return Promise.reject(error.message || error);
  }

}
