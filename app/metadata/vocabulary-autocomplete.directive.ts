import { Directive,
         ElementRef,
         ViewContainerRef,
         ComponentFactoryResolver,
         ComponentRef,
         OnInit,
         Input,
         Output, EventEmitter, HostListener } from '@angular/core';
import { VocabularyAutocompleteComponent } from './vocabulary-autocomplete.component';

import { VocabularyService } from '../shared/vocabulary.service';

@Directive({
  selector: "[vocab-autocomplete]"
})
export class VocabularyAutocomplete implements OnInit {

  componentRef: ComponentRef<VocabularyAutocompleteComponent>;
  vocabList: string[];
  dropdownVisible: boolean = false;

  selectedIndex: number;
  filteredList: string[];

  constructor(
    private resolver: ComponentFactoryResolver,
    private el: ElementRef,
    private viewContainerRef: ViewContainerRef,
    private vocabularyService: VocabularyService) {
  }

  @Input('source-range')  range: string;
  @Input('source-range2') range2: string;

  @Input() ngModel: string;

  @Output() ngModelChange:EventEmitter<any> = new EventEmitter();

  @HostListener('keyup', ['$event']) onKeyup(e) {
    //if (!this.dropdownVisible) { return; }

    if (e.code === 'Escape') {
      this.hideAutocomplete();
    }
    else if (
      (e.which <= 90 && e.which >= 48) ||
      e.code === "Delete" ||
      e.code === 'Backspace') {
      this.setFilteredList();
    }
  }
  @HostListener('keydown', ['$event']) onKeydown(e) {
    if (e.code === 'ArrowUp' && this.dropdownVisible) {
      e.stopPropagation();
      e.preventDefault();

      this.selectedIndex = Math.max(0, --this.selectedIndex);
      this.vocabularyService.setListIndex(this.selectedIndex);
    }
    else if (e.code === 'ArrowDown' && this.dropdownVisible) {
      e.stopPropagation();
      e.preventDefault();

      this.selectedIndex = Math.min(this.filteredList.length - 1, ++this.selectedIndex);
      this.vocabularyService.setListIndex(this.selectedIndex);
    }
    else if (e.code === 'Enter' && this.dropdownVisible) {
      this.setSelection();
    }
    else if (e.code === 'Tab' && this.dropdownVisible) {
      e.stopPropagation();
      e.preventDefault();
      this.hideAutocomplete();
    }
  }

  ngOnInit(): void {
    this.vocabularyService.listValue.subscribe((value) => {
      this.setSelection(value);
    });
  }

  showAutocomplete() {
    if (this.vocabList) {
      let factory = this.resolver.resolveComponentFactory(VocabularyAutocompleteComponent);
      this.componentRef = this.viewContainerRef.createComponent(factory);
      this.dropdownVisible = true;

      let mdView = document.querySelector('metadata');
      mdView.addEventListener('scroll', () => {
        this.positionDropdown();
      });

      this.positionDropdown();
      this.selectedIndex = 0;
    }
  }

  hideAutocomplete() {
    if (this.componentRef) {
      this.componentRef.destroy();
    }

    let mdView = document.querySelector('metadata');
    mdView.removeEventListener('scroll', () => {
      this.positionDropdown();
    });

    this.vocabularyService.setList(null);
    this.dropdownVisible = false;
  }

  setSelection(selectedText: string = null) {
    if (!this.dropdownVisible) { return; }

    if (!selectedText) {
      selectedText = this.filteredList[this.selectedIndex];
    }
    this.ngModelChange.emit(selectedText);
    // Need to save the changes. Otherwise it won't do anything.
    let event = new Event('change');
    this.el.nativeElement.dispatchEvent(event);
    this.hideAutocomplete();
  }

  positionDropdown() {
    let element = this.componentRef.location.nativeElement;

    element.style.top = this.el.nativeElement.getBoundingClientRect().bottom;
    element.style.left = this.el.nativeElement.offsetLeft;
  }

  highlightText(value: string) {
    if (!value) { return }

    let oldTxtValue = this.ngModel;
    let txtValue = this.ngModel + value.substring(this.ngModel.length);
    this.ngModelChange.emit(txtValue);
  }

  setFilteredList(): void {
    if (!this.getVocabList()) { return; }

    this.filteredList = this.vocabList.filter((value) => {
      return value.toLowerCase().indexOf(this.ngModel.toLowerCase()) === 0;
    });
    if (this.ngModel === '') {
      this.filteredList = null;
      this.hideAutocomplete();
    }
    if (this.setFilteredList && !this.dropdownVisible) {
      this.showAutocomplete();
    }
    this.vocabularyService.setList(this.filteredList);
  }

  private getVocabList(): string[] {
    this.vocabList = this.vocabularyService.getPrefLabelsByRange(this.range);
    if (this.range2) {
      this.vocabList = this.vocabList.concat(
        this.vocabularyService.getPrefLabelsByRange(this.range2));
    }
    return this.vocabList;
  }

  @HostListener('document:click') onClick() {
    this.hideAutocomplete();
  }

}
