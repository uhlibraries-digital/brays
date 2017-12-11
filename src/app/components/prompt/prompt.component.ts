import { Component,
         Output,
         EventEmitter,
         OnInit,
         ViewChild,
         AfterViewChecked,
         HostListener } from '@angular/core';

import { PromptService } from 'app/services/prompt.service';

@Component({
  selector: 'prompt',
  templateUrl: './prompt.component.html',
  styleUrls: [ './prompt.component.scss' ]
})
export class PromptComponent implements OnInit, AfterViewChecked {

  display: boolean = false;
  fieldValue: string = '';
  fieldLabel: string = '';

  @ViewChild('fieldInput') fieldInput;

  constructor(
    private prompt: PromptService){
  }

  @HostListener('document:keydown', ['$event']) onKeypress(e) {
    if (e.code === 'Escape') {
      this.close();
    }
  }

  keydownCheck(event): void {
    if (event.keyCode === 13) {
      this.submit();
    }
  }

  ngOnInit(): void {
    this.prompt.displayChange.subscribe((promptText) => {
      this.fieldLabel = promptText;
      this.display = true;
    });
  }

  ngAfterViewChecked(): void {
    this.focusInputField();
  }

  focusInputField(): void {
    if (this.fieldInput) {
      this.fieldInput.nativeElement.focus();
    }
  }

  close(): void {
    this.fieldValue = '';
    this.display = false;
  }

  submit(): void {
    this.display = false;
    this.prompt.submit(this.fieldValue);
  }

}
