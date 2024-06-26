import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ConfigRoutingModule } from './config-routing.module';
import {ConfigComponent} from './config.component';
import { KeyboardModule } from '../custom-components/keyboard/keyboard.module';

@NgModule({
  declarations: [ConfigComponent],
  imports: [
    CommonModule,
    ConfigRoutingModule,
    ReactiveFormsModule,
    KeyboardModule
  ],
})
export class ConfigComponentModule {}

