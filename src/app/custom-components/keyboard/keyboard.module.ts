import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KeyboardComponent } from './keyboard.component';
import { KeyboardDirective } from '../../core/directives/keyboard.directive';

@NgModule({
  declarations: [
    KeyboardDirective,
    KeyboardDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [KeyboardDirective]
})
export class KeyboardModule { }