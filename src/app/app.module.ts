import { BrowserModule } from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
// import { CoreModule } from './core/core.module';
import { IonicModule } from '@ionic/angular';
import { AppRoutingModule } from './app-routing.module';
import { ButtonModule } from 'primeng/button';
// NG Translate
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { AppComponent } from './app.component';
import { LoginModule } from './login/login.module';
import { ConfigComponent } from '../app/config/config.component';
import {ConfigComponentModule } from '../app/config/config.module';
import { AtomizerAuthInterceptor } from './core/security/atomizer-auth.interceptor';
import { DropdownModule } from 'primeng/dropdown';
import { Routes, RouterModule } from '@angular/router';
import { ArduinoService } from './core/services/arduino/arduino.service';
import { NgxsModule } from '@ngxs/store';
import { NgxsLoggerPluginModule } from '@ngxs/logger-plugin';
import { ValveState } from '../app/core/state/valve.state';
import { SensorState } from './core/services/arduino/eventsSensors';
// import { ElectronService } from './core/services';
// AoT requires an exported function for factories
const httpLoaderFactory = (http: HttpClient): TranslateHttpLoader =>  new TranslateHttpLoader(http, './assets/i18n/', '.json');

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    DropdownModule,
    BrowserModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AppRoutingModule,
    NgxsModule.forRoot([ValveState,SensorState]),
    NgxsLoggerPluginModule.forRoot(),
    IonicModule.forRoot(),
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: httpLoaderFactory,
        deps: [HttpClient]
      }
    }),
    
  ],
  bootstrap: [AppComponent],
  schemas : [CUSTOM_ELEMENTS_SCHEMA],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AtomizerAuthInterceptor,
      multi: true,
    },
    ArduinoService,

  ]
})

export class AppModule {}
