import { Injectable,
         EventEmitter,
         Output } from '@angular/core';

@Injectable()
export class PromptService {

  callback: Function;

  @Output() response:EventEmitter<string> = new EventEmitter();
  @Output() displayChange:EventEmitter<string> = new EventEmitter();

  display(promptText: string, callback: Function): void {
    this.callback = callback;
    this.displayChange.emit(promptText);
  }

  submit(value: string) {
    this.callback.call(this, value);
  }

}
