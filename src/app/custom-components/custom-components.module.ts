import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { SelectFilterComponent } from './select-filter/select-filter.component';
import { IonSearchbar, IonicModule } from '@ionic/angular';
import { KeyboardWifiComponent } from './keyboard-wifi/keyboard-wifi.component';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule
  ],
  declarations: [
    SelectFilterComponent,
    KeyboardWifiComponent,
    
  ],
  exports : [
    SelectFilterComponent,
    
  ]
})
export class CustomComponentsModule {}
