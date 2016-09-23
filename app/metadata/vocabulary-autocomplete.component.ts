import { Component, Input, HostListener, ViewEncapsulation } from '@angular/core';

import { VocabularyService } from '../shared/vocabulary.service';

@Component({
  selector: 'auto-complete',
  template: `
    <div class="autocomplete scrollbars">
      <ol *ngIf="vocabList">
        <li
          *ngFor="let v of vocabList; let i = index;"
          [class.selected]="i === selectedIndex"
          (click)="setSelection(v)">
          <span class="word">{{ v }}</span>
        </li>
      </ol>
    </div>
  `,
  styles: [ require('./vocabulary-autocomplete.component.scss') ],
  encapsulation: ViewEncapsulation.None,
})
export class VocabularyAutocompleteComponent {

  vocabList: string[];
  selectedIndex: number = 0;

  constructor(
    private vocabularyService: VocabularyService) {
    this.vocabularyService.list.subscribe(list => this.vocabList = list);
    this.vocabularyService.listIndex.subscribe(index => this.selectIndex(index));
  }

  setSelection(item: string): void {
    this.vocabularyService.setListValue(item);
  }

  selectIndex(index: number): void {
    this.selectedIndex = index;
    this.adjustDropdown();
  }

  adjustDropdown(): void {
    // FINISH THIS!!!!
  }

}