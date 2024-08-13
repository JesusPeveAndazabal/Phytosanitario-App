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
import { AcumuladoRestaurar, AcumuladoVolumen, ResetVolumenAcumulado, SensorState, UpdateCurrentTank, volumenRecuperado } from '../core/services/arduino/eventsSensors';
import { Store } from '@ngxs/store';
import { ConfigNetComponent } from './config-net/config-net.component';




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
    public electronService : ElectronService,
    public store : Store,
    ) {
      // console.log(this.login, "main.component... constructor");

     }

  async ngOnInit() {
    //Abrir la conexion a la base de datos
    await this.databaseService.openConnection();

    //Consultas a la base de datos
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

  //Funcion para abrir la base de datos y validar que el voluemn Inicial sea mayor a 0 para restablecer los valores del aplicativo
  async openIfNotConnected(){
    await this.databaseService.openConnection();
    //console.log("SE INICIO LA BD")
    let currenttank$ = this.store.select(SensorState.currentTank).subscribe({
      next : async (value) =>{
        this.arduinoService.checkInternetConnection();
        if(value > 0){
          //Valor de trabajo del valor del tanque
          this.workStatus = this.valorTanque;
          //console.log("Se repite tantas veces entro ala condicion");
          this.workStatus = WorkStatusChange.START;
          this.classButtonPower = this.workStatus == WorkStatusChange.START  ? "power-button-on" : "power-button-off";
          this.powerButtonOn = true;
          this.arduinoService.isRunning = true;
          this.obtenerVolumenInicial();
        }
      }
    });
    
  }

  //Funcion para consultar a la base de datos y verificar que haya un registro de un volumen configurado
  async obtenerVolumenInicial() {
    try {
        //console.log("Entro a esta funcion");
        if(this.lastWorkExecution){
          const waterVolumes = await this.databaseService.getLastWaterVolume(this.lastWorkExecution.id);
          const inicialVolume = waterVolumes.volume; // Extraer la propiedad `volume`
          this.arduinoService.initialVolume = inicialVolume;
        }
    } catch (error) {
        console.error('Error fetching last water volume:', error);
    }
  }

  //Funcion para verificar las configuraciones
  async ngAfterViewInit() {

    this.loadPersonValues();

    if(this.lastWorkExecution){
      this.loading_message = 'Verificando configuraciones...';
      await this.loader.present();
    }
  }

  async abrirInternet(){
    console.log("EVENTO CLICK PARA ABRIR MODAL DE INTERNET");
    const modal = await this.modalController.create({
       component: ConfigNetComponent,
       id : 'config-net-modal',
       backdropDismiss: false,
    });
    modal.present();
    const {data , role} = await modal.onDidDismiss();
  }

  //Funcion para cargar los valores de las personas
  async loadPersonValues(){

    //Abrir la conexion a la base de datos
    await this.openIfNotConnected();

    await this.databaseService.getLastWorkExecution()
    .then((result : WorkExecution) => {
      if(result?.sended)
        this.lastWorkExecution = result;
    })
    .catch((error) => {
      this.alerta.mostrarAlertaChica("<p>Hubo un error al cargar el último trabajo configurado.</p>")
      //console.log(error);
    });

    //  ------------------------------------------------------------------

    await this.databaseService.getLogin().then((result) => {
      this.login = result;
      // console.log(this.login, "await database");
    })
    .catch((error)=>{
      console.log(error);
    });
  }

  //Obtener el url de las rutas
  get currentRoute(): string{
    return this.router.url;
  }

  //Funcion para cerrar sesion
  cerrarSesion(){

    //Dejar activada la valvula derecha para el lavado del tractor
    this.arduinoService.activateRightValve();
    this.volumenCompont.rightControlActive = true;
    //Reiniciar el volumen total
    this.arduinoService.resetVolumenInit();
    //this.arduinoService.volumenAcumulado = 0;
    this.arduinoService.currentRealVolume = 0;
    this.arduinoService.initialVolume = 0;
    this.arduinoService.datosCaudal = 0;
    //Redireccionar al login 
    this.router.navigate(['/','login']);
  }

  private listenTime : moment.Moment = moment();
  onStartListenPower($event : any){
    this.listenTime = moment();
  }
  
  //Funcion que se dispara en caso el boton para llenar el tanque sea llenado y confirmado
  async onClickPower(){
    //Consultar a la base de datos si hay alguna ejecucion siendo utilizada
    this.lastWorkExecution = await this.databaseService.getLastWorkExecution();

    if(!this.lastWorkExecution)
      this.loadPersonValues();
      let command : SocketData = {
        event:SocketEvent.WORK_STATUS_CHANGES,
        type: WorkStatusChange.STOP,
        data : {id : this.lastWorkExecution!.id}
      };

      command.data.id = (await this.databaseService.getLastWorkExecution()).id;

      // Start/Pause
      command.type = this.workStatus == WorkStatusChange.STOP || WorkStatusChange.FINISH ? WorkStatusChange.START : WorkStatusChange.STOP;

    /*En este caso la opción de pausa no estará habilitada, se pausará solo cuando el volumen de agua en el tanque esté casi vacío,
    entonces será el momento en que el operador finalice la aplicación de trabajo o llene nuevamente el tanque, de ser así, una vez lleno el tanque,
    Se debe ingresar el nuevo volumen de agua en el tanque.*/

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
          this.volumenTanque = parseFloat(data.data);
          if (!isNaN(this.volumenTanque)) {
            this.localConfig = await this.databaseService.getLocalConfig();
            //console.log("GETLOCALCONFIG" , this.localConfig);
            this.lastWorkExecution = await this.databaseService.getLastWorkExecution();
            //Aqui llamamos a la funcion : 
            await this.openIfNotConnected();

            //Volumen de tipo WaterVolumen por el id
            let volume : WaterVolumes = { id :0 ,volume: this.volumenTanque,work_exec_id : this.lastWorkExecution!.id };

            //Parseamos la configuracion del traba
            let conf = JSON.parse(this.lastWorkExecution!.configuration) as WorkExecutionConfiguration;

            //Guardamos la resta para obtener el tanque actual
            conf.volume = this.volumenTanque - this.arduinoService.currentRealVolume;
            this.lastWorkExecution!.configuration = JSON.stringify(conf);

            //Guardamos el volume obtenido 
            await this.databaseService.saveWaterVolumes(volume,this.lastWorkExecution!);

            command.data.current_volume = this.volumenTanque;

            //Pasar la funcion de inciialzar Contenedor para iniciar el trabajo
            this.arduinoService.inicializarContenedor(this.volumenTanque,this.localConfig.vol_alert_on);
            
            //Actualizar el estado de la aplicacion , aca se ha iniciado 
            this.workStatus = WorkStatusChange.START;
            this.powerButtonOn = true;
            this.classButtonPower = this.workStatus == WorkStatusChange.START  ? "power-button-on" : "power-button-off";
            this.arduinoService.resetVolumenInit();
           
          }
        }
      });

      await modal.present();
    }
  }

  //Funcion para finalizar la aplicacion
  async onEndListenPower($event: any){
    //Consultar si hay algun tranajo en ejecucion
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

              let id : WorkExecution = this.lastWorkExecution;
              this.databaseService.finishWorkExecution(id);
              command.type = WorkStatusChange.FINISH;
              this.workStatus = WorkStatusChange.FINISH;
              this.classButtonPower = this.workStatus == WorkStatusChange.FINISH ?"power-button-off": "power-button-on";
              config.lastWorkExecution = false;
              this.arduinoService.isRunning = false;
              this.finished;
              this.arduinoService.resetVolumenInit();
              this.arduinoService.inicializarContenedor(0,this.localConfig.vol_alert_on); 
              this.store.dispatch(new ResetVolumenAcumulado());
              this.arduinoService.initialVolume = 0;
              this.arduinoService.datosCaudal = 0;
              this.volumenCompont.apagarValvulas(); //Apagamos las electrovalvulas
              this.router.navigate(['/','main','settings']); //Redireccionamos hacia las configuraciones iniciales
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
