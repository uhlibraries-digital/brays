import { Directive, ElementRef, ViewContainerRef, ComponentFactoryResolver, ComponentRef, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { VocabularyAutocompleteComponent } from './vocabulary-autocomplete.component';

import { VocabularyService } from '../shared/vocabulary.service';

@Directive({
  selector: "[vocab-autocomplete]"
})
export class VocabularyAutocomplete {

  componentRef: ComponentRef<VocabularyAutocompleteComponent>;
  vocabList: string[];
  dropdownVisible: boolean = false;

  selectedIndex: number;
  filteredList: string[];
  dropdownLag: number = 85;

  constructor(
    private resolver: ComponentFactoryResolver,
    private el: ElementRef,
    private viewContainerRef: ViewContainerRef,
    private vocabularyService: VocabularyService) {
  }

  @Input('source-range')  range: string;
  @Input('source-range2') range2: string;

  @Input() ngModel: string;

  @Output() ngModelChange:EventEmitter<any> = new EventEmitter()

  @HostListener('focus') onFocus() {
    this.showAutocomplete();
  }
  @HostListener('focusout') onFocusout() {
    this.hideAutocomplete(); // NEEDS WORK WHEN WANTING TO CLICK YOUR SELECTION
  }
  @HostListener('keyup', ['$event']) onKeyup(e) {
    if (!this.dropdownVisible) { return; }

    if (e.code === 'Escape') {
      this.hideAutocomplete();
    }

    this.setFilteredList();
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
  }

  showAutocomplete() {
    this.vocabList = this.vocabularyService.getPrefLabelsByRange(this.range);
    if (this.range2) {
      this.vocabList = this.vocabList.concat(
        this.vocabularyService.getPrefLabelsByRange(this.range2));
    }
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
      this.setFilteredList();
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

  setSelection() {
    let selectedText = this.filteredList[this.selectedIndex];
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
    this.filteredList = this.vocabList.filter((value) => {
      return value.toLowerCase().indexOf(this.ngModel.toLowerCase()) === 0;
    });
    //console.log(this.filteredList);
    if (this.ngModel === '') {
      this.filteredList = null;
    }
    this.vocabularyService.setList(this.filteredList);
  }

  ngOnDestroy() {
    this.ngModelChange.unsubscribe();
  }

}
