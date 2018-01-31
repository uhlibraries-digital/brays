import { Injectable }    from '@angular/core';
import { Headers, Http, RequestOptions } from '@angular/http';

import { GreensService } from './greens.service';
import { PreferencesService } from './preferences.service';
import { ProgressBarService } from './progress-bar.service';
import { LoggerService } from './logger.service';

import { Erc } from 'app/classes/erc';

import 'rxjs/add/operator/toPromise';

@Injectable()
export class MintService {

  private progressBarId: string = '';

  constructor(
    private minter: GreensService,
    private preferenceService: PreferencesService,
    private barService: ProgressBarService,
    private log: LoggerService) {
      this.preferenceService.preferencesChange.subscribe(data => this.updatePreferences(data));
      this.updatePreferences(this.preferenceService.data);
  }

  arks(objects: any): Promise<any> {
    if (!this.preferenceService.data.minter || this.preferenceService.data.minter.endpoint === '') {
      this.log.warn("Minter preferences are not set so I can't mint any objects.");
      return Promise.resolve();
    }

    this.progressBarId = this.barService.newProgressBar(1, 'Minting Arks');
    let minted = 0;
    let chunks = this.createChunks(objects, 8);
    return chunks.reduce(
      (acc, chunk) => acc.then(() => {
        return Promise.all(chunk.map(object => this.mintObject(object)));
      })
      .then(() => {
        minted += chunk.length;
        this.barService.setProgressBar(this.progressBarId, minted / objects.length);
      }),
      Promise.resolve()
    )
    .then(() => {
      this.barService.clearProgressBar(this.progressBarId);
      this.progressBarId = '';
    })
    .catch((err) => {
      this.barService.clearProgressBar(this.progressBarId);
      this.progressBarId = '';
    });
  }

  private mintObject(object: any): Promise<any> {
    if (object.do_ark) {
      return Promise.resolve();
    }
    let erc = new Erc(
      object.getFieldValue('dcterms.creator') || 'unknown',
      object.getFieldValue('dcterms.title'),
      object.getFieldValue('dc.date') || 'unknown'
    );
    return this.minter.mint(erc)
      .then((id) => {
        object.do_ark = id;
        let value = object.getFieldValue('dcterms.identifier');
        let newValue = id + (value ? '; ' : '') + value;
        object.setField('dcterms.identifier', newValue);
        return id;
      })
      .catch((err) => {
        this.log.error(err);
      });
  }

  private createChunks(objs: any, size: number): any[] {
    let chunks = [];
    for (let i = 0; i < objs.length; i += size) {
      chunks.push(objs.slice(i, i + size));
    }
    return chunks;
  }

  private updatePreferences(data: any): void {
    this.minter.setEndpoint(data.minter.endpoint, data.minter.prefix);
    this.minter.setApiKey(data.minter.key);
  }


}
