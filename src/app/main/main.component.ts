import { Login } from './../core/models/login';
import { interval, startWith, switchMap } from 'rxjs';
// import { WebSocketClientService } from './../core/services/websocket-client/web-socket-client.service';
import { DatabaseService} from './../core/services/database/database.service';
import { WaterVolumes, WorkExecution, WorkExecutionDetail } from './../core/models/work-execution';
import { SocketData, WorkExecutionConfiguration } from './../core/models/models';
import { Sensor, SocketEvent, WorkDataChange, WorkStatusChange, config} from './../core/utils/global';
import { Person } from './../core/models/person';
import { environment } from './../../environments/environment';
import { Component, OnInit, ViewChild,AfterViewInit , ElementRef} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as moment from 'moment';
import { AlertController, IonLoading,AlertInput , ModalController } from '@ionic/angular';
import Swal from 'sweetalert2';
import { SettingsComponent } from './settings/settings.component';
import { ArduinoService } from '../core/services/arduino/arduino.service';
import { LocalConf } from '../core/models/local_conf';
import { ModalInicioAppComponent } from './modal-inicio-app/modal-inicio-app.component';
import { VolumeComponent } from './control/volume/volume.component';
import { ElectronService } from '../core/services';







@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit,AfterViewInit{
  peopleData : Person[] = [];
  //canStart: boolean = true; // Por ejemplo, si esta propiedad es necesaria para el *ngIf del botón
  addGpsButtonOnClass: boolean = false;
  @ViewChild('loader') loader!: IonLoading;
  loading_message = 'Verificando configuraciones...';
  lastWorkExecution: WorkExecution | null = null;
  // login: Array<Login> = [];
  login : Login  | null = null;
  // workerData : Person  | null = null;
  supervisorData : Person  | null = null;
  localConfig : LocalConf;

  /* Variables para el calculo del tiempo */
  cronometroProductivo: number = 0;
  cronometroImproductivo: number = 0;
  enModoProductivo: boolean = false;
  velocidadCronometro: number = 1;
  //previousAccumulatedVolume : number = 0 ;
  valorTanque : number = 0;
  volume: number;

  volumenTanque: number = 0;


  workStatus : WorkStatusChange = WorkStatusChange.STOP;
  classButtonPower = "power-button-off";
  classButtonGps = "classButtonGps";
  numericInputValue: string = ''; // Valor del campo de entrada numérica
  islocalServerConnected : boolean = false; //Status of websocket connection (local server)
  finished : number  = 0;
  alertInputs : any = [
    {
      label: "Nuevo volumen",
      type: 'number',
      placeholder: '1000',  
      id:'txt_vol',
      name : 'txt_vol',
      min: 1,
      appKeyboard : 'numeric',
      attributes : {
        required: true,
      },
    },
  ];

   // Variable para almacenar el estado del botón de encendido
   powerButtonOn: boolean = false;

  constructor(private databaseService: DatabaseService,
    private router: Router,
    private alertController : AlertController,
    private route : ActivatedRoute,
    public alerta: SettingsComponent,
    private modalController: ModalController,
    public arduinoService : ArduinoService,
    public volumenCompont : VolumeComponent,
    public electronService : ElectronService
    ) {
      // console.log(this.login, "main.component... constructor");

     }

  async ngOnInit() {
    await this.databaseService.openConnection();
    

    this.login = await this.databaseService.getLogin();
    this.lastWorkExecution = await this.databaseService.getLastWorkExecution();

    if(this.lastWorkExecution) {
      this.finished = this.lastWorkExecution.id;
      //Obtener las coordenadas del trabajo lastWorkExecution JSON.parse()
      let details = await this.databaseService.getWorkExecutionDetailReal(this.lastWorkExecution.id);
      details.forEach((wDetail : WorkExecutionDetail) => {
        config.gps.push(JSON.parse(wDetail.gps));
      });
    }
    
    config.lastWorkExecution = this.lastWorkExecution;
    this.localConfig = await this.databaseService.getLocalConfig();
  }

  async openIfNotConnected(){
    await this.databaseService.openConnection();
    const intervalObservable = interval(1000); // Puedes ajustar el intervalo según sea necesario
/*     interval(1000).pipe(
      startWith(0), // Emite un valor inicial para que comience inmediatamente
      switchMap(() => this.arduinoService.getSensorObservable(Sensor.CURRENT_TANK))
    ).subscribe((valorDelSensor: number) => {
        this.electronService.log("SE EJECUTA ESTE INVERVALO");
        this.valorTanque = valorDelSensor;  
        console.log("VALOR INICIAL DE VOLUME" , this.valorTanque);
        if(this.valorTanque > 0){
          this.workStatus = WorkStatusChange.START;
          this.classButtonPower = this.workStatus == WorkStatusChange.START  ? "power-button-on" : "power-button-off";
          this.powerButtonOn = true;
          this.arduinoService.isRunning = true;
          this.someFunction();
        }
    }); */
  }

  async someFunction() {
    try {
        const waterVolumes = await this.databaseService.getLastWaterVolume(this.lastWorkExecution.id);
        const inicialVolume = waterVolumes.volume; // Extraer la propiedad `volume`
        this.arduinoService.initialVolume = inicialVolume;
    } catch (error) {
        console.error('Error fetching last water volume:', error);
    }
}

  async ngAfterViewInit() {

    this.loadPersonValues();

    if(this.lastWorkExecution){
      this.loading_message = 'Verificando configuraciones...';
      await this.loader.present();
    }
  }

  async loadPersonValues(){

    await this.openIfNotConnected();

    await this.databaseService.getLastWorkExecution()
    .then((result : WorkExecution) => {
      if(result?.sended)
        this.lastWorkExecution = result;
    })
    .catch((error) => {
      this.alerta.mostrarAlertaChica("<p>Hubo un error al cargar el último trabajo configurado.</p>")
      console.log(error);
    });

    //  ------------------------------------------------------------------

    await this.databaseService.getLogin().then((result) => {
      this.login = result;
      // console.log(this.login, "await database");
    })
    .catch((error)=>{
      console.log(error);
    });

    // if(this.cookieService.check("session"))
    // {
    //   this.login = this.peopleData.find(p => p.id == parseInt(this.cookieService.get("session")))!;
    // }
    // else if(this.lastWorkExecution)
    // {
    //   this.workerData = this.peopleData.find(p => p.id == this.lastWorkExecution?.worker)!;
    // }


    // if(this.cookieService.check("supervisor")){
    //   this.supervisorData = this.peopleData.find(p => p.id == parseInt(this.cookieService.get("supervisor")))!;
    // }

    // await this.databaseService.closeConnection(environment.dbName, false);
  }

  get currentRoute(): string{
    return this.router.url;
  }

  changeStatusExecution(){

  }

  cerrarSesion(){
    this.arduinoService.activateRightValve();
    this.volumenCompont.rightControlActive = true;
    this.arduinoService.resetVolumenInit();
    //this.arduinoService.volumenAcumulado = 0;
    this.arduinoService.currentRealVolume = 0;
    this.arduinoService.initialVolume = 0;
    this.arduinoService.datosCaudal = 0;
    this.router.navigate(['/','login']);
  }

  private listenTime : moment.Moment = moment();
  onStartListenPower($event : any){
    this.listenTime = moment();
  }
  
  async onClickPower(){
    //this.arduinoService.volumenAcumulado = 0;
    this.lastWorkExecution = await this.databaseService.getLastWorkExecution();
    //console.log(this.lastWorkExecution, "dio click al boton verde");
    // console.log(this.loadPersonValues, "person values");
    if(!this.lastWorkExecution)
      this.loadPersonValues();
      let command : SocketData = {
        event:SocketEvent.WORK_STATUS_CHANGES,
        type: WorkStatusChange.STOP,
        data : {id : this.lastWorkExecution!.id}
      };

      command.data.id = (await this.databaseService.getLastWorkExecution()).id;
      //console.log(command, "array de socket data");
      //console.log(command.data.id, "id");

      // Start/Pause
      command.type = this.workStatus == WorkStatusChange.STOP || WorkStatusChange.FINISH ? WorkStatusChange.START : WorkStatusChange.STOP;
      //console.log(command.type, "command type");

    /*In this case the pause option will not be enabled, it will pause only when the volume of water in the tank is close to empty,
    then it will be the moment when the operator finishes the work application or fills the tank again, if so, once the tank is filled,
    the new volume of water in the tank must be entered.*/

    if (command.type == WorkStatusChange.START){
      const modal = await this.modalController.create({
        component: ModalInicioAppComponent, // Reemplaza YourModalComponent por el nombre de tu componente modal
        backdropDismiss : false,
        componentProps: {
          lastWorkExecutionId: this.lastWorkExecution!.id
        }
      });

      modal.onDidDismiss().then(async (data) => {
        if (data && data.data) {
          //this.arduinoService.resetTanque();
          this.arduinoService.resetVolumenInit();
          //this.arduinoService.restaurarConsumoTotal = 0;
          //this.arduinoService.previousAccumulatedVolume = 0;
          this.volumenTanque = parseFloat(data.data);
          if (!isNaN(this.volumenTanque)) {
            this.localConfig = await this.databaseService.getLocalConfig();
            //console.log("GETLOCALCONFIG" , this.localConfig);
            this.lastWorkExecution = await this.databaseService.getLastWorkExecution();
            await this.openIfNotConnected();
            //console.log("GETLASTWORK" , this.lastWorkExecution);
            let volume : WaterVolumes = { id :0 ,volume: this.volumenTanque,work_exec_id : this.lastWorkExecution!.id };
            //console.log(volume, "volume");
            let conf = JSON.parse(this.lastWorkExecution!.configuration) as WorkExecutionConfiguration;
            //console.log("CONF.VOLUMEN" , conf.volume);
            //console.log("VAL" ,this.volumenTanque);
            conf.volume = this.volumenTanque - this.arduinoService.currentRealVolume;
            //console.log(volume, this.lastWorkExecution!, "info a guardar");
            // console.log(this.lastWorkExecution!, "this.lastWorkExecution!.configuration");
            this.lastWorkExecution!.configuration = JSON.stringify(conf);
            await this.databaseService.saveWaterVolumes(volume,this.lastWorkExecution!);
            // console.log(this.databaseService.saveWaterVolumes(volume,this.lastWorkExecution!));
            // await this.databaseService.closeDB();
            command.data.current_volume = this.volumenTanque;

            //Regular la presión cada vez que se configure el volumen del tanque
            //this.arduinoService.regulatePressureWithBars(parseFloat(`${conf.pressure}`));
            //Configurar el volumen mínimo e inicial en el servicio.
            //console.log(this.localConfig.vol_alert_on, "this.localConfig.vol_alert_on");
            this.arduinoService.inicializarContenedor(this.volumenTanque,this.localConfig.vol_alert_on);            
            this.workStatus = WorkStatusChange.START;
            this.powerButtonOn = true;
            this.classButtonPower = this.workStatus == WorkStatusChange.START  ? "power-button-on" : "power-button-off";

            //this.volumenCompont.apagarValvulas();
            // Tu lógica para guardar el volumen y realizar acciones con él
            //console.log("Volumen capturado:", volume);
          }
        }
      });

      await modal.present();
    }
  }

  async onEndListenPower($event: any){
    this.lastWorkExecution = await this.databaseService.getLastWorkExecution();
    let command : SocketData = {
      event:SocketEvent.WORK_STATUS_CHANGES,
      type: WorkStatusChange.STOP,
      data : {id : this.lastWorkExecution!.id}
    }
      //Confirm and finish the work execution
      this.alertController.create({
        header: '¡Atención!',
        subHeader: 'Finalizar Aplicación',
        message: `¿Está seguro que desea finalizar la aplicación de trabajo?`,
        buttons: [
          {
            text: 'Si',
            handler: () => {
              // console.log(event, "evento apagar")
              // this.loading_message = 'Finalizando aplicación...';
              // this.loader.present();
              // console.log(command.type, "1");
              // const LastWorkExecution = this.databaseService.getLastWorkExecution;

              let id : WorkExecution = this.lastWorkExecution;
              this.databaseService.finishWorkExecution(id);
              command.type = WorkStatusChange.FINISH;
              this.workStatus = WorkStatusChange.FINISH;
              this.classButtonPower = this.workStatus == WorkStatusChange.FINISH ?"power-button-off": "power-button-on";
              config.lastWorkExecution = false;
              this.arduinoService.isRunning = false;
              this.finished;
              //this.arduinoService.resetVolumenInit();
              this.arduinoService.currentRealVolume = 0;
              this.arduinoService.initialVolume = 0;
              this.arduinoService.datosCaudal = 0;
              this.volumenCompont.apagarValvulas();
              this.router.navigate(['/','main','settings']);
              //Se dejara la valvula derecha activada
              // console.log(finalizar, "finalizar");
            }
          },
          {
            text: 'No',
            handler: () => {
              console.log('Let me think');
            }
          },
        ]
      }).then((res) => {
        res.present();
      });
    
  }

  get canStart(): boolean{
    if(config.lastWorkExecution){
      return config.lastWorkExecution.configuration != "";
    }
    return false;
  }
}
