import { Component, OnInit } from '@angular/core';

import { ObjectService } from 'app/services/object.service';


@Component({
  selector: 'activity',
  templateUrl: './activity.component.html',
  styleUrls: [ './activity.component.scss' ]
})
export class ActivityComponent implements OnInit {

  loading: Boolean = false;

  constructor(
    private objects: ObjectService) {
  }

  ngOnInit(): void {
    this.objects.loading.subscribe(loading => this.loading = loading);
  }

}
