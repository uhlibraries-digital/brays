import { Injectable, Output, EventEmitter } from '@angular/core';
import { Headers, Http } from '@angular/http';
import 'rxjs/add/operator/toPromise';

@Injectable()
export class VocabularyService {
  store: any;
  @Output() list = new EventEmitter();
  @Output() listIndex = new EventEmitter();
  @Output() listValue = new EventEmitter();

  constructor(private http: Http) { }

  loadVocabulary(url: string): void {
    this.http.get(url)
      .toPromise()
      .then((response) => {
        let data: string = response.text();
        this.store = this.parse(data);
        console.log('vocabulary list:');
        console.log(this.store);
      })
      .catch(this.handleError);
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
        if ('narrow' in n) {
          list = list.concat(this.getPrefLabelsByNode(n));
        }
        else {
          list.push(n.prefLabel);
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
    let data_nodes = data.match(/[^A-Za-z ]:([^\.]*\..*)/gm);
    let nodes = {};

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
