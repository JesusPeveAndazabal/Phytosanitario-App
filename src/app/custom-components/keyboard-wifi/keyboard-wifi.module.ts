import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { KeyboardWifiDirective } from '../../core/directives/keyboard-wifi.directive';


@NgModule({
  declarations: [
    KeyboardWifiDirective,
    KeyboardWifiDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [KeyboardWifiDirective]
})
export class KeyboardWifiModule { }