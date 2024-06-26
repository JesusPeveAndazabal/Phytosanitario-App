import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

// import { LoginComponent } from './login.component';
// import { LoginRoutingModule } from './login-routing.module';
import { IonicModule } from '@ionic/angular';
import {ButtonModule} from 'primeng/button';
import {CardModule} from 'primeng/card';
import {CheckboxModule} from 'primeng/checkbox';
import {InputTextModule} from 'primeng/inputtext';
import { FormsModule,ReactiveFormsModule } from '@angular/forms';
import {ChipsModule} from 'primeng/chips';
import { MainRoutingModule } from './main-routing.module';
import { MainComponent } from './main.component';
import { KeyboardModule } from '../custom-components/keyboard/keyboard.module';
import { ModalInicioAppComponent } from './modal-inicio-app/modal-inicio-app.component';

@NgModule({
  declarations: [MainComponent, ModalInicioAppComponent],
  providers:[],
  imports: [
    IonicModule,
    FormsModule,
    CommonModule,
    MainRoutingModule,
    ButtonModule,
    CardModule,
    CheckboxModule,
    InputTextModule,
    ReactiveFormsModule,
    ChipsModule,
    KeyboardModule
  ]
})
export class MainModule {}
