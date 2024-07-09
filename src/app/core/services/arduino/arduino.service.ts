// arduino.service.ts
import { Injectable, Input } from '@angular/core';
import { SerialPort} from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline'
import { ElectronService } from '../electron/electron.service';
import { ArduinoDevice } from './arduino.device';
import { Subject, Observable, PartialObserver, Observer, windowWhen, windowCount, windowTime } from 'rxjs';
import { Sensor, SocketEvent, WorkStatusChange } from '../../utils/global';
import { DatabaseService  } from '../database/database.service';
import { Chronos } from '../../utils/utils';
import { Database, sqlite3 } from 'sqlite3';
import { Product } from '../../models/product';
import { Mode } from '../../utils/global';
import { devices } from 'playwright';
import { start } from 'repl';
import { Configuration } from '../../utils/configuration';
import * as moment from 'moment';
import { LocalConf } from '../../models/local_conf';
import { WorkExecution , WorkExecutionDetail } from '../../models/work-execution';
import { Store } from '@ngxs/store';
import { ActivateLeftValve, DeactivateLeftValve, ActivateRightValve, DeactivateRightValve , ActivateBothValves, DeactivateBothValves } from '../../state/valve.state';
import { getDistance} from 'geolib';
import isOnline from 'is-online';
import { AcumuladoRestaurar, AcumuladoVolumen, SensorState, SetResetApp, UpdateCurrentTank , Volumen, restaurarDistancia, volumenRecuperado } from './eventsSensors';
import { WindowMaximizeIcon } from 'primeng/icons/windowmaximize';
import { waitForAsync } from '@angular/core/testing';

//Este se comporta como el device_manager

@Injectable({
  providedIn: 'root',
})

export class ArduinoService {

  public isServiceRestarting: boolean = true;
  public tiempoProductivo : Chronos = new Chronos(1,"Productivo", false);
  public tiempoImproductivo : Chronos = new Chronos(2,"Improductivo", false);

  listArduinos : ArduinoDevice[] = [];  
  localConfig! : LocalConf;
  minVolume = 0;
  dataCurrent = 0;
  initialVolume: number = 0; // Valor inicial del contenedor
  currentRealVolume: number = 0;  // Inicializa con el valor inicial
  timer: any;
  currentTime: number = 0;
  now = moment();
  reealNow = moment();
  detail_number = 0;
  DEBUG = true;
  devicesCant : string[] = [];
  izquierdaActivada = false;
  derechaActivada = false;
  isRunning: boolean = false;
  timerProductive: any;
  currentTimeProductive: number = 0;
  timerImproductive: any;
  currentTimeImproductive: number = 0;

  //VARIABLES PARA LOS ENUMERADORES
  data : any = {};
  precision : any = {};
  volumenDescontado = 0;

  /* vARIABLES PARA LOS EVENTOS */

  caudalNominal: number = 0;
  speedalert: number = 0;
  info: number = 0;
  tiempocondicion = 0;

  accumulated_volume = 0;
  accumulated_distance = 0;
  public distance = 0;
  public distanciaHtml = 0;
  pointInicial;
  pointFinal;

  gpsVar = 0;

  // Variables para almacenar las coordenadas anteriores del GPS

  previousGpsCoordinates: number[] | null = null;
  gpsCoordinatesInicial: number[];
  gpsCoordinatesFinal: number[];
  gpsCoordinates: number[];
  volumenAcumul = 0;
  ultimoTiempoNotificacion: number = 0;

  public dataGps = false; // Variable para verificar si hay datos del GPS
  public consumoTotal;
  public conectInternet = false; // Variable para verificar si hay internet o no
  public datosCaudal = 0;
  public volumenReseteado = 0;

  public acumuladoTotal = 0;
  public volumenTanque = 0;


  /* Parametros para conexion */

  public coneectedCaudal: boolean;
  public connectedPresion:boolean;
  public connectedGps:boolean;

  inputPressureValue: number | undefined;
  lastVolume: number | null = null;
  hasGPSData = true;
  acumulado2 = 0;
  restaurarConsumoTotal : 0;
  restaurarDistancia : 0;

  valvulaDerecha : boolean = false;
  valvulaIzquierda : boolean = false;
  pruebaleft  : boolean = true;
  pruebaRight : boolean = true;


  calcularConsumo : boolean = false;
  volumenTx : number = 0;
  volumenReinicio : boolean = false;
  ConsumoReal : number = 0;
  volumenTramo : number = 0;

  
  // Declarar una variable para almacenar el volumen anterior
  volumenAnterior = 0;
  // Almacena el valor anterior del acumulador de volumen

  previousAccumulatedVolume = 0;
  coordenadaInicial : number[];
  coordenadaFinal : number[];
  banderaDistancia : boolean = true;
  banderaActivarValvulas : boolean = false;

  volumenArduino: number = 0; // Variable global para almacenar el volumen del Arduino
  volumenAcumulado: number = 0; // Volumen acumulado desde el Ãºltimo reinici
  lastRegulatedSpeed: number | null = null;
  speedThreshold: number = 1; // Define el umbral de diferencia de velocidad

  volumenRecuperado : number = 0; // Variable global para almacenar
  currentTankRecuperado : number = 0;
  volumenTotalRecuperado : number = 0;
  distanciaRestaurado : number = 0;

  banderaPresion : boolean = false;
  configWork;


  // private sensorSubjectMap: Map<Sensor, Subject<Sensor>> = new Map();

  private sensorSubjectMap: Map<Sensor, Subject<number|number[]>> = new Map();

  constructor( private electronService: ElectronService , private databaseService : DatabaseService , private store: Store) {

    this.setupSensorSubjects();
    this.checkInternetConnection();
    //this.getDistancia();

    this.databaseService.getLastWorkExecution().then((workExecution : WorkExecution) => {
      
      if(workExecution){
        this.tiempoProductivo.set_initial(workExecution.working_time.format("HH:mm:ss"));
        this.tiempoImproductivo.set_initial(workExecution.downtime.format("HH:mm:ss"));
      }      
    });

    for(let i = 1; i <= Configuration.nDevices; i++){

      this.listArduinos.push(
        new ArduinoDevice(Configuration[`device${i}`],115200,true,electronService,store)
      );

    }

    //COMPONENTE
    /* DISPARA */
    //ACCION
    /* MODIFICA O MUTA EL ESTADO */
    //ESTADO
    /* NOTIFICA AL COMPONENTE */

    if(this.isServiceRestarting){
    
      this.databaseService.getLastWorkExecutionDetail2().then((WorkExecutionDetail : WorkExecutionDetail) => {
       
        if(WorkExecutionDetail){
          this.store.dispatch(new SetResetApp (true));

          let dataValues = JSON.parse(WorkExecutionDetail.data);
          this.volumenRecuperado = dataValues[`${Sensor.VOLUME}`];
          this.volumenTotalRecuperado = dataValues[`${Sensor.ACCUMULATED_CONSUMO}`];
          this.currentTankRecuperado = dataValues[`${Sensor.CURRENT_TANK}`];
          this.accumulated_distance = dataValues[`${Sensor.ACCUMULATED_HECTARE}`];

          console.log("VOLUMEN RECUPERADO" , this.volumenRecuperado); 

          //Actualiza el estado del volumen
          this.store.dispatch(new volumenRecuperado ({ [`${Sensor.VOLUMEN_RECUPERADO}`]: this.volumenRecuperado }));
          // Actualiza el estado del volumen acumulado
          this.store.dispatch(new AcumuladoRestaurar({ [`${Sensor.ACCUMULATED_RESTAURAR}`]: this.volumenTotalRecuperado }));
          // Actualiza el estado con los valores restaurados
          this.store.dispatch(new UpdateCurrentTank(this.currentTankRecuperado, true));
          //Para restaurar la distancia acumulada 
          this.store.dispatch(new restaurarDistancia({ [`${Sensor.ACCUMULATED_DISTANCE}`]: this.accumulated_distance }));
          this.store.dispatch(new SetResetApp (false));
        }

      });
      this.isServiceRestarting = false
    }
  
    let database$ = this.store.select(SensorState.evaluarDispositivos).subscribe({
      next: async (value) =>{

          if(value && value.data){
            let currentWork: WorkExecution = await this.databaseService.getLastWorkExecution();

            //Para poder regular la presion a la configurada anteriormente
            if(!this.banderaPresion){
              let presion = JSON.parse(currentWork.configuration).pressure;
              this.regulatePressureWithBars(presion);
              this.activateRightValve();        
              this.activateLeftValve();
              this.banderaPresion = true;
              console.log("REGULO LA PRESION");
            }

            // Evaluar los eventos
            let events: string[] = [];
            let has_events = false;
            
            let data = JSON.parse(value.data);
            
            if(currentWork && currentWork.configuration){
                  //Para compara los eventos
                  this.caudalNominal = JSON.parse(currentWork.configuration).water_flow;
                  this.info = JSON.parse(currentWork.configuration).pressure;
                  this.speedalert = JSON.parse(currentWork.configuration).speed;
                  
                  if( data[Sensor.WATER_FLOW] > 0){
                    this.tiempoProductivo.start();
                    this.tiempoImproductivo.stop();
                  }else{
                    this.tiempoImproductivo.start();
                    this.tiempoProductivo.stop();
                  }

                  currentWork.downtime = this.tiempoImproductivo.time();
                  currentWork.working_time = this.tiempoProductivo.time();
      
                  await this.databaseService.updateTimeExecution(currentWork);
              
                //EVENTO DE CAUDAL
                if (data[Sensor.WATER_FLOW] > this.caudalNominal * 0.90 && data[Sensor.WATER_FLOW] < this.caudalNominal * 1.1) {
                  // Caudal Verde
                  }else if ((data[Sensor.WATER_FLOW] > this.caudalNominal * 0.50 && data[Sensor.WATER_FLOW] < this.caudalNominal * 0.9) ||
                    (data[Sensor.WATER_FLOW] < this.caudalNominal * 1.5 && data[Sensor.WATER_FLOW] > this.caudalNominal * 1.1)) {
                    has_events = true;
                    events.push("EL CAUDAL ESTA FUERA DEL RANGO ESTABLECIDO");
                  } else {
                    has_events = true;
                    events.push("EL CAUDAL ESTA FUERA DEL RANGO ESTABLECIDO");
                }
      
                //EVENTO DE PRESION
                if (data[Sensor.PRESSURE] > this.info * 0.90 && data[Sensor.PRESSURE] < this.info * 1.1) {
                  } else if ((data[Sensor.PRESSURE] > this.info * 0.50 && data[Sensor.PRESSURE] < this.info * 0.9) ||
                    (data[Sensor.PRESSURE] < this.info * 1.5 && data[Sensor.PRESSURE] > this.info * 1.1)) {
                    has_events = true;
                    events.push("LA PRESION ESTA FUERA DEL RANGO ESTABLECIDO");
                  } else {
                    has_events = true;
                    events.push("LA PRESION ESTA FUERA DEL RANGO ESTABLECIDO");
                }
      
                //EVENTO DE VELOCIDAD
                if (data[Sensor.SPEED] > this.speedalert * 0.90 && data[Sensor.SPEED] < this.speedalert * 1.1) {
                  // Velocidad Verde
                  } else if ((data[Sensor.SPEED] > this.speedalert * 0.50 && data[Sensor.SPEED] < this.speedalert * 0.9) ||
                    (data[Sensor.SPEED] < this.speedalert * 1.5 && data[Sensor.SPEED] > this.speedalert * 1.1)) {
                    has_events = true;
                    events.push("LA VELOCIDAD ESTA FUERA DEL RANGO ESTABLECIDO");
                  } else {
                    has_events = true;
                    events.push("LA VELOCIDAD ESTA FUERA DEL RANGO ESTABLECIDO");
                }
                
                //EVENTOS DE CAUDAL - VELOCIDAD Y PRESION
                if ((data[Sensor.PRESSURE] < this.info * 0.50 || data[Sensor.PRESSURE] > this.info * 1.5) ||
                    (data[Sensor.WATER_FLOW] < this.caudalNominal * 0.50 || data[Sensor.WATER_FLOW] > this.caudalNominal * 1.5) ||
                    (data[Sensor.SPEED] < this.speedalert * 0.50 || data[Sensor.SPEED] > this.speedalert * 1.5)) {
                    has_events = true;
                    events.push("AL MENOS UN SENSOR FUERA DEL RANGO DEL 50%");
                }
      
                /* Evaulu */
                value.id_work_execution = currentWork.id;
                value.has_events = has_events;
                value.events = events.join(", ");
                value.time = value.time.startOf('seconds');
            
            }
           
            if(currentWork && this.isRunning){
              await this.databaseService.saveWorkExecutionDataDetail(value);
            } 
          }
          
      },

    });

  }

  findBySensor(sensor : number): ArduinoDevice{

    return this.listArduinos.find(p => p.sensors.some(x => x == sensor))!;

  }


  public mapToObject(map: Map<any, any>): { [key: string]: any } {
    const obj: { [key: string]: any } = {};
    map.forEach((value, key) => {
      if (key !== undefined) {
        obj[key.toString()] = value;
      }
    });

    return obj;

  }


  //Metodo para enviar el valor de presion que se le asignara

  public regulatePressureWithBars(bars: number): void {

    const regulatorId = Sensor.PRESSURE_REGULATOR;



    // Convertir el valor de bares segÃºn sea necesario, por ejemplo, asumamos que estÃ¡ en la misma unidad que se usÃ³ en el script original

    const barPressure = bars;



    // AquÃ­ deberÃ­as incluir la lÃ³gica para enviar el comando al dispositivo, por ejemplo:

    this.findBySensor(regulatorId).sendCommand(`${regulatorId}|${barPressure}`);



    this.electronService.log("Comando Regulador" , `${regulatorId}|${barPressure}`);
    
  }

  //Metodo para resetear el volumen inicial y minimo

  public resetVolumenInit(): void {
    const command = 'B';
    this.findBySensor(Sensor.WATER_FLOW).sendCommand(command);
    
    //envia 0 al volumen recuperado para reiniciarlo
    this.store.dispatch(new volumenRecuperado({ [`${Sensor.VOLUMEN_RECUPERADO}`]: 0 }));
  }

  public resetTanque(){
    this.volumenAcumulado = 0;
    //this.electronService.log("VOLUMEN QUE DEBE RESETEARSE" , this.volumenAcumulado);
  }
  
  //Metodo para poder saber si un Arduino/Sensor esta conectado o no

  public isSensorConnected(sensor: Sensor): boolean {

    // Encuentra el Arduino que contiene el sensor

    const arduino = this.listArduinos.find(a => a.sensors.includes(sensor));

    // Si se encuentra el Arduino y estÃ¡ conectado, el sensor tambiÃ©n estÃ¡ conectado

    return !!arduino && arduino.isConnected;

  }



  inicializarContenedor(inicial: number, minimo: number): void {

    this.initialVolume = inicial;
    console.log("initial arduino servie" , this.initialVolume);

    // Despachar la acción para actualizar el campo currentTank y marcarlo como inicialización
    this.store.dispatch(new UpdateCurrentTank(inicial, true));

    this.currentRealVolume = inicial;

    // Despachar la acción para actualizar el campo currentTank
    //this.store.dispatch(new UpdateCurrentTank(inicial));

    this.minVolume = minimo;

    this.isRunning = true;

}



  //Metodo para resetear la pression inicial y minimo

  public resetPressure(): void {

    const command = 'B';

    this.findBySensor(Sensor.PRESSURE).sendCommand(command);

  }

  // Función para regular la presión basada en la velocidad
  public regulatePressureBasedOnSpeed(speed: number) {

    if (this.lastRegulatedSpeed !== null && Math.abs(speed - this.lastRegulatedSpeed) < this.speedThreshold) {
      // Si la diferencia entre la velocidad actual y la última regulada es menor que el umbral, no hacer nada
      return;
    }

    // Definir los rangos de velocidad y presión adecuados
    const pressureRanges = [
      { minSpeed: 1, maxSpeed: 1.47, targetPressure: 3},  // Ejemplo: 1.5 bar cuando velocidad < 10
      { minSpeed: 1.47, maxSpeed: 1.57, targetPressure: 3.5 }, // Ejemplo: 2.0 bar cuando velocidad entre 10 y 20
      { minSpeed: 1.57, maxSpeed: 1.67, targetPressure: 4}, // Ejemplo: 2.5 bar cuando velocidad entre 20 y 30
      { minSpeed: 1.67, maxSpeed: 6.08, targetPressure: 4.5},
      { minSpeed: 6.08, maxSpeed: 6.37, targetPressure: 5},
      { minSpeed: 6.37, maxSpeed: 6.68, targetPressure: 5.5},
      { minSpeed: 6.68, maxSpeed: 6.98, targetPressure: 6},
      { minSpeed: 6.98, maxSpeed: 7.23, targetPressure: 6.5},
      { minSpeed: 7.23, maxSpeed: 7.49, targetPressure: 7},
      { minSpeed: 7.49, maxSpeed: 7.74, targetPressure: 7.5},
      { minSpeed: 7.74, maxSpeed: 7.98, targetPressure: 8},
      { minSpeed: 7.98, maxSpeed: 8.22, targetPressure: 8.5},
      { minSpeed: 8.22, maxSpeed: 8.44, targetPressure: 9},
      { minSpeed: 8.44, maxSpeed: 8.68, targetPressure: 9.5},
      { minSpeed: 8.68, maxSpeed: 8.93, targetPressure: 10},
      { minSpeed: 8.93, maxSpeed: 9.11, targetPressure: 10.5},
      { minSpeed: 9.11, maxSpeed: 9.29, targetPressure: 11},
      { minSpeed: 9.29, maxSpeed: 9.48, targetPressure: 11.5},
      { minSpeed: 9.48, maxSpeed: 9.68, targetPressure: 12},
      { minSpeed: 9.68, maxSpeed: 9.85, targetPressure: 12.5},
      { minSpeed: 9.85, maxSpeed: 10.03, targetPressure: 13},
      { minSpeed: 10.03, maxSpeed: 10.21, targetPressure: 13.5},
      { minSpeed: 10.21, maxSpeed: 10.40, targetPressure: 14},
    ];

    // Buscar el rango de presión adecuado según la velocidad actual
    const targetPressure = pressureRanges.find(range => speed >= range.minSpeed && speed < range.maxSpeed)?.targetPressure;

    if (targetPressure !== undefined) {
      //this.electronService.log("TARGET PRESSURE" , targetPressure);
      // Lógica para ajustar la presión a targetPressure
      this.regulatePressureWithBars(targetPressure); // Esta función debería implementarse para ajustar la presión físicamente
       // Actualizar la última velocidad regulada
      this.lastRegulatedSpeed = speed;
    } else {
      //console.warn(`No se encontró un rango de presión para la velocidad ${speed}`);
      // Aquí podrías decidir qué hacer si no hay un rango definido para la velocidad actual
    }
  }



  //

  public conteoPressure(): void {

    const command = 'E';

    this.findBySensor(Sensor.PRESSURE).sendCommand(command);

  }

    // Definir una función para interpolar la presión a partir de la velocidad
  public interpolarPresion(velocidad: number): number {
      // Tabla de variaciones de presión con respecto a la velocidad
      const tablaVariaciones = [
          { velocidad: 1.67, presion: 4},
          { velocidad: 6.37, presion: 4.5},
          { velocidad: 6.69, presion: 5 },
          { velocidad: 7.02, presion: 5.5 },
          { velocidad: 7.33, presion: 6 },
          { velocidad: 7.61, presion: 6.5},
          { velocidad: 7.87, presion: 7},
          { velocidad: 8.12, presion: 7.5},
          { velocidad: 8.37, presion: 8},
          { velocidad: 8.63, presion: 8.5},
          { velocidad: 8.88, presion: 9},
          { velocidad: 9.11, presion: 9.5},
          { velocidad: 9.34, presion: 10},
          { velocidad: 9.58, presion: 10.5},
          { velocidad: 9.75, presion: 11},
          { velocidad: 9.96, presion: 11.5},
          { velocidad: 10.14, presion: 12},
          { velocidad: 10.33, presion: 12.5},
          { velocidad: 10.52, presion: 13},
          { velocidad: 10.73, presion: 13.5},
          { velocidad: 10.89, presion: 14}
      ];
  
      // Buscar los puntos en la tabla más cercanos a la velocidad dada
      let puntoMenor;
      let puntoMayor;
      for (const punto of tablaVariaciones) {
          if (punto.velocidad <= velocidad) {
              puntoMenor = punto;
          } else {
              puntoMayor = punto;
              break;
          }
      }
  
      // Interpolar la presión entre los dos puntos
      const presionInterpolada = puntoMenor.presion + (puntoMayor.presion - puntoMenor.presion) * (velocidad - puntoMenor.velocidad) / (puntoMayor.velocidad - puntoMenor.velocidad);
      return presionInterpolada;
    }



  // MÃ©todo para activar la vÃ¡lvula izquierda

  public activateLeftValve(): void {

    this.izquierdaActivada = true;

    this.store.dispatch(new ActivateLeftValve());

    //this.electronService.log("IZQUIERDA ACTIVADA" , this.izquierdaActivada);

    const command = Sensor.VALVE_LEFT + '|1\n'; // Comando para activar la vÃ¡lvula izquierda

    //this.electronService.log("Comand" , command);

    this.findBySensor(Sensor.VALVE_LEFT).sendCommand(command);

  }



  // MÃ©todo para desactivar la vÃ¡lvula izquierda

  public deactivateLeftValve(): void {

    this.izquierdaActivada = false;

    this.store.dispatch(new DeactivateLeftValve());

    this.electronService.log("IZQUIERDA DESACTIVADA" , this.izquierdaActivada);

    const command = Sensor.VALVE_LEFT  + '|0\n'; // Comando para desactivar la vÃ¡lvula izquierda

    this.electronService.log("Comand" , command);

    this.findBySensor(Sensor.VALVE_LEFT).sendCommand(command);

    //this.electronService.log("Comando desactivar valvula izquierda", command);

  }



  // MÃ©todo para activar la vÃ¡lvula derecha

  public activateRightValve(): void {

    this.derechaActivada = true;

    this.store.dispatch(new ActivateRightValve());

    this.electronService.log("DERECHA ACTIVADA" , this.derechaActivada);

    const command = Sensor.VALVE_RIGHT + '|1\n'; // Comando para activar la vÃ¡lvula derecha

    this.electronService.log("Comand" , command);

    //this.electronService.log(command, "comand");

    this.findBySensor(Sensor.VALVE_RIGHT).sendCommand(command);

  }



  // MÃ©todo para desactivar la vÃ¡lvula derecha

  public deactivateRightValve(): void {

    this.derechaActivada = false;

    this.store.dispatch(new DeactivateRightValve());

    this.electronService.log("DERECHA DESCAACTIVADA" , this.derechaActivada);

    const command = Sensor.VALVE_RIGHT + '|0\n'; // Comando para desactivar la vÃ¡lvula derecha

    this.electronService.log("Comand" , command);

    this.findBySensor(Sensor.VALVE_RIGHT).sendCommand(command);

    //this.electronService.log("Comando desactivar valvula derecha", command);

  }



  public activateBothValves(): void {

    this.store.dispatch(new ActivateBothValves());

    const commandLeft = Sensor.VALVE_LEFT + '|1\n';

    const commandRight = Sensor.VALVE_RIGHT + '|1\n';

    this.findBySensor(Sensor.VALVE_LEFT).sendCommand(commandLeft);

    this.findBySensor(Sensor.VALVE_RIGHT).sendCommand(commandRight);

  }

  

  public deactivateBothValves(): void {

    this.store.dispatch(new DeactivateBothValves());

    const commandLeft = Sensor.VALVE_LEFT + '|0\n';

    const commandRight = Sensor.VALVE_RIGHT + '|0\n';

    this.findBySensor(Sensor.VALVE_LEFT).sendCommand(commandLeft);

    this.findBySensor(Sensor.VALVE_RIGHT).sendCommand(commandRight);

  }



  // FunciÃ³n para calcular la presiÃ³n en funciÃ³n de la velocidad

  public calcularPresion(velocidad) {

    // AquÃ­ debes establecer la relaciÃ³n entre la velocidad y la presiÃ³n en tu sistema

    // Por ejemplo, podrÃ­as tener una relaciÃ³n lineal, una tabla de valores predefinidos, o una fÃ³rmula especÃ­fica

    // Por ahora, usarÃ© un ejemplo simple con una relaciÃ³n lineal:

    

    // Definir la relaciÃ³n entre la velocidad y la presiÃ³n (ejemplo simple)

    const factorConversion = 1.05; // Este valor debe ser ajustado segÃºn la relaciÃ³n especÃ­fica en tu sistema

    

    // Calcular la presiÃ³n en funciÃ³n de la velocidad usando la relaciÃ³n establecida

    const presion = (velocidad * factorConversion).toFixed(1);

    

    // Retornar el valor de presiÃ³n calculado

    return presion;

  }

    

/* 

  getDistance(coord1, coord2) {

    const R = 6371; // Radio de la Tierra en kilÃ³metros

    const dLat = this.deg2rad(coord2.latitude - coord1.latitude);

    const dLon = this.deg2rad(coord2.longitude - coord1.longitude);

    const a =

        Math.sin(dLat / 2) * Math.sin(dLat / 2) +

        Math.cos(this.deg2rad(coord1.latitude)) * Math.cos(this.deg2rad(coord2.latitude)) *

        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distanceInKm = R * c; // Distancia en kilÃ³metros

    const distanceInMeters = distanceInKm * 1000; // Convertir a metros

    return distanceInMeters;

  } */



/*   deg2rad(deg) {

      return deg * (Math.PI / 180);

  }

 */

  async checkInternetConnection() {

    try {

        const online = await isOnline();

        if (online) {

            this.conectInternet = true;

            //this.electronService.log('El procesador tiene conexiÃ³n a Internet.');

        } else {

            this.conectInternet = false;

            //this.electronService.log('El procesador no tiene conexiÃ³n a Internet.');

        }

    } catch (error) {

        console.error('Error al verificar la conexiÃ³n a Internet:', error);

    }

  } 





  //Este es el encargado de generar y emitir eventos de actualizaciÃ³n

  private setupSensorSubjects(): void {

      // Crear Subject para cada tipo de sensor

    const sensorTypes: Sensor[] = Object.values(Sensor)

      .filter(value => typeof value === 'number') as Sensor[];



    sensorTypes.forEach((sensorType) => {

      this.sensorSubjectMap.set(sensorType, new Subject<number>());

    });

  }



  //Observa los eventos emitidos por el subject

  public getSensorObservable(sensorType: Sensor): Observable<number|number[]> {

      return this.sensorSubjectMap.get(sensorType)!.asObservable();

  }



  //Notifica si cambio el valor de los sensores

  public notifySensorValue(sensorType: Sensor, value: number|number[]): void {

    const tiempoActual = Date.now();

    //this.electronService.log(`Nuevo valor para ${sensorType}: ${value}`)

    if (this.sensorSubjectMap.has(sensorType)) {

        this.sensorSubjectMap.get(sensorType)!.next(value);

    }

  }

}