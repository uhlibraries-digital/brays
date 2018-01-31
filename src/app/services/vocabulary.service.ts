import { Injectable, Output, EventEmitter } from '@angular/core';
import { Headers, Http } from '@angular/http';
import 'rxjs/add/operator/toPromise';
import 'rxjs/add/operator/timeout';

@Injectable()
export class VocabularyService {
  store: any;
  @Output() list = new EventEmitter();
  @Output() listIndex = new EventEmitter();
  @Output() listValue = new EventEmitter();

  constructor(private http: Http) { }

  loadVocabulary(url: string): Promise<any> {
    if (url === '') {
      this.store = null;
      return Promise.resolve(this.store);
    }
    return this.http.get(url)
      .timeout(600000)
      .toPromise()
      .then((response) => {
        let data: string = response.text();
        this.store = this.parse(data);
        return this.store;
      })
      .catch((err) => {
        return this.handleError(err);
      });
  }

  getPrefLabelsByRange(range_label: string): any {
    if (!this.store) { return null; }
    if (!range_label) { return null; }

    range_label = range_label.toLowerCase()
    if (!(range_label in this.store)) { return null; }

    let node = this.store[range_label];
    return this.getPrefLabelsByNode(node);
  }

  getPrefLabelsByNode(node: any): any {
    let list: string[] = [];
    if ('narrow' in node) {
      for( let label in node['narrow'] ) {
        let n: any = node['narrow'][label];
        list.push(n.prefLabel);
        if ('narrow' in n) {
          list = list.concat(this.getPrefLabelsByNode(n));
        }
      }
    }
    else {
      list.push(node.prefLabel);
    }

    return list;
  }

  setList(list: string[]): void {
    this.list.emit(list);
  }

  setListIndex(index: number): void {
    this.listIndex.emit(index);
  }

  setListValue(value: string): void {
    this.listValue.emit(value);
  }

  private handleError(error: any): Promise<any> {
    console.error('An error occured getting vocabulary', error);
    return Promise.reject(error.message || error);
  }

  private parse(data: string): any {
    let data_nodes = data.match(/[^A-Za-z ]:(?:[^\"]|(?:\".*?\"))*?[.]/gm);
    let nodes = {};

    if (!data_nodes) {
      throw Error('Unable to parse vocabulary turtle data');
    }

    for ( let n of data_nodes ) {
      let identifier = /^:([^\s]*)/m.exec(n);
      let label_reg = n.match(/prefLabel \"([^\"]*)\"/m);
      let label: string = (label_reg) ? label_reg[1] : null;
      let children_array = n.match(/:narrower :[^;\.]*[;\.]/gm);
      nodes[identifier[1]] = { 'prefLabel': label };

      if (children_array) {
        nodes[identifier[1]]['narrow'] = {};
        for ( let c of children_array ) {
          let id = /\s:(.*)[;\.]/g.exec(c);
          nodes[identifier[1]]['narrow'][id[1]] = nodes[id[1]];
        }
      }
    }
    return nodes;
  }

}
