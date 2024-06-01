// import { WebSocketClientService } from './core/services/websocket-client/web-socket-client.service';
import { DatabaseService } from './core/services/database/database.service';
import { environment } from './../environments/environment';
import { Component, OnInit } from '@angular/core';
// import { AndroidFullScreen } from "@awesome-cordova-plugins/android-full-screen/ngx";
import { createSchema } from './core/utils/db-schemas';
import { ElectronService } from './core/services';
import { Configuration } from './core/utils/configuration';
import { concatMap, firstValueFrom, map, of, range, takeWhile, tap, timer } from 'rxjs';
import { ApiService } from './core/services/api/api.service';
import { WorkExecution, WorkExecutionDetail } from './core/models/work-execution';
import { ArduinoDevice } from './core/services/arduino/arduino.device';
import { ArduinoService } from './core/services/arduino/arduino.service';
import { ipcRenderer } from 'electron';

import * as log from 'electron-log';
import * as path from 'path';
import * as moment from 'moment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})

export class AppComponent implements OnInit {
  isWeb = false;
  private initPlugin= false;
  private onExecution = false; //Variable de control que evita envíos duplicados y sobre carga del tráfico.
  

  constructor(
    private databaseService : DatabaseService,
    private electronService: ElectronService,
    private apiService : ApiService) {

/*     // Configurar la ruta del archivo de registro
    log.transports.file.file = 'C:\\Users\\BETA\\3D Objects\\PROYECTO ACTUALIZADO\\migracion\\bd\\error.log';

    // Configurar el nivel de registro (opcional)
    log.transports.file.level = 'error'; // Solo registrar errores */


      this.databaseService.openConnection();

      if(this.electronService.isElectron){
        let file = electronService.fs.readFileSync(electronService.path.resolve("bd/","conf.env"),{encoding:'utf-8'});
        
        //Leyendo el archivo de configuración
        file.split(`\n`).forEach((el)=>{
          let par = el.split("=");
          switch(par[0]){
            case "TOKEN":
              Configuration.token = par[1];
              break;
            case "URL_REST":
              Configuration.urlRest = par[1];
              break;
            case "N_DEVICES":
              Configuration.nDevices = parseInt(par[1]);
              break;
            case "DEVICE_1":
              Configuration.device1 = par[1];
              break;
            case "DEVICE_2":
              Configuration.device2 = par[1];
              break;
            case "DEVICE_3":
              Configuration.device3 = par[1];
              break;
            case "DEVICE_4":
              Configuration.device4 = par[1];
              break;
          }
        });

        console.log("Configuration",Configuration);
      }
  }

  ngOnInit(): void {
    //console.log("App initialization", "app.component.ts");
      let records = [];
      let records1 = [];
      let sended = [];

      let instance = this;

      setInterval(()=>{
        if(!instance.onExecution){
          instance.onExecution = true;

          //Loop que envía los registros por guardar en el servidor vía API/REST
          const iteration = async () =>{
            await this.databaseService.getNotSendedExecution().then(async (records)=>{
              records.forEach(async (wExecution : WorkExecution) => {
                try{
                  let response : WorkExecution = wExecution;
                  console.log("RESPONSE" , response);

                  //Enviar por POST si es la primera vez que se envía al server
                  if(!wExecution.id_from_server){
                    try {
                      if (wExecution.configuration.trim() !== '') {
                          wExecution.configuration = await JSON.parse(wExecution.configuration);
                          wExecution.product = await JSON.parse(wExecution.product);
                          console.log("La cadena esta llena");
                      } else {
                          console.log("La cadena JSON está vacía");
                      }
                      // Resto del código
                    } catch (error) {
                        console.log("Error al analizar JSON:", error);
                    }
                    console.log("Antes de enviar al server " , wExecution);
                    response = await firstValueFrom(this.apiService.sendRegistroAsyncExecution(wExecution));
                    console.log("ENVIADO AL SERVER" , response);
                    if(response.id){
                      wExecution.id_from_server = response.id;
                      let workExecutionEnviado = await this.databaseService.updateExecutionSended(wExecution);
                    }                    
                  }
                  //Enviar por PUT si no es la primera vez que se envía al server
                  else{
                    //Actualizar
                    // Lógica para actualizar los registros en el servidor si es necesario
                    wExecution.configuration = JSON.parse(wExecution.configuration);
                    wExecution.product = JSON.parse(wExecution.product);
                    let workExecutionActualizado = await firstValueFrom(this.apiService.sendUpdateExecution(wExecution));
                  }

                  if(response.id){
                    if(response.id > 0 || response.id == -1){                      
                      let nonSendedExecutionDetail = await this.databaseService.getNotSendedExecutionDetail(wExecution.id)
                      let total = nonSendedExecutionDetail.length;
                      let page_size = 60;
                      let maxPages = Math.ceil(total / page_size);
                      

                      //let page_number = 1;

                      let counter = range(1,maxPages);
                      let iterador = counter.pipe(
                        concatMap(value => timer(1000)
                          .pipe(
                            //takeWhile(p_number => p_number <= maxPages )
                            tap((value )=> {
                              
                            })
                          ) 
                        )  
                      );
                      
                      iterador.subscribe({
                        next: async (p_number : number) =>{
                          let start = page_size * (p_number - 1);
                          console.log(wExecution.id + " = start & counter => "+start +" - "+ (start + page_size), moment().format("HH:mm:ss"));
                          let paquete = nonSendedExecutionDetail.slice(start,start + page_size);

                          try{
                            paquete.forEach(async (wDetail : WorkExecutionDetail) => {
                              wDetail.data = JSON.parse(wDetail.data);
                              try {
                                  if (wDetail.gps && wDetail.gps.trim() !== '') {
                                      wDetail.gps = JSON.parse(wDetail.gps);
                                      console.log(wDetail.gps);
                                      console.log("Detalle gps JSON" ,JSON.parse(wDetail.gps));
                                      console.log("La cadena JSON de gps se ha analizado correctamente");
                                  } else {
                                      console.log("La cadena JSON de gps está vacía");
                                  }
                              } catch (error) {
                                  console.log("Error al analizar JSON de gps:", error);
                              }
                              wDetail.gps = [wDetail.gps[1],wDetail.gps[0]];
                              wDetail.work_execution = wExecution.id_from_server;                  
                            });

                            let response = await firstValueFrom(this.apiService.sendRegistroAsyncExecutionDetail(paquete));

                            //Se asume que está guardando correctamente
                            paquete.forEach(async (wDetail : WorkExecutionDetail) => {
                              await this.databaseService.updateExecutionSendedDetail(wDetail);
                            });

                          }catch(exception){
                            console.log(exception);
                          }
                        }
                      });

                      // while(((page_number - 1) * page_size) < nonSendedExecutionDetail.length){
                      //   
                        
                      // }      
                    }
                  }
                }catch(exception){
                  console.log(exception);
                }
              });

            }).catch((err)=>{
              console.log(err)

            });

            instance.onExecution = false;
            records = [];
            records1 = [];
            sended = [];
          };



        iteration();

        }
      },9000);  
  }
} 
