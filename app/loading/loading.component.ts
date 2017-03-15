import { Component, OnInit } from '@angular/core';

import { ObjectService } from '../shared/object.service';


@Component({
  selector: 'loading',
  templateUrl: './loading/loading.component.html',
  styles: [ require('./loading.component.scss') ]
})
export class LoadingComponent implements OnInit {

  private loading: Boolean = false;

  constructor(
    private objects: ObjectService) {
  }

  ngOnInit(): void {
    this.objects.loading.subscribe(loading => this.loading = loading);
  }

}
