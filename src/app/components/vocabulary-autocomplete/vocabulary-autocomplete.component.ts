import { Component, Input, HostListener, ViewEncapsulation, ElementRef } from '@angular/core';

import { VocabularyService } from '../../services/vocabulary.service';

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
  styleUrls: [ './vocabulary-autocomplete.component.scss' ],
  encapsulation: ViewEncapsulation.None,
})
export class VocabularyAutocompleteComponent {

  vocabList: string[];
  selectedIndex: number = 0;
  oldSelectedIndex: number = -1;

  constructor(
    private vocabularyService: VocabularyService,
    private el: ElementRef) {
    this.vocabularyService.list.subscribe(list => this.vocabList = list);
    this.vocabularyService.listIndex.subscribe(index => this.selectIndex(index));
  }

  setSelection(item: string): void {
    this.vocabularyService.setListValue(item);
  }

  selectIndex(index: number): void {
    this.oldSelectedIndex = this.selectedIndex;
    this.selectedIndex = index;
    this.adjustDropdown();
  }

  adjustDropdown(): void {
    if (!this.el.nativeElement.querySelector('.selected')) { return; }

    let dropdownEl = this.el.nativeElement.querySelector('.autocomplete');
    let selectHeight = this.el.nativeElement.querySelector('.selected').offsetHeight;
    let selectTop = this.selectedIndex * selectHeight;
    let dropdownScrollTop = dropdownEl.scrollTop;
    let dropdownHeight = dropdownEl.offsetHeight;

    if (selectTop + selectHeight > dropdownHeight + dropdownScrollTop) {
      dropdownEl.scrollTop = (selectTop - dropdownHeight + selectHeight + 2);
    }
    else if (selectTop < dropdownScrollTop + selectHeight) {
      dropdownEl.scrollTop = selectTop - 2;
    }
  }

}
