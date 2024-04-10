// arduino.service.ts
import { Injectable, Input } from '@angular/core';
import { SerialPort} from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline'
import { ElectronService } from '../electron/electron.service';
import { ArduinoDevice } from './arduino.device';
import { Subject, Observable } from 'rxjs';
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
//import { getDistance} from 'geolib';

import isOnline from 'is-online';


//Este se comporta como el device_manager

@Injectable({
  providedIn: 'root',
})

export class ArduinoService {
  listArduinos : ArduinoDevice[] = [];  
  public tiempoProductivo : Chronos = new Chronos(1,"Productivo", false);
  public tiempoImproductivo : Chronos = new Chronos(2,"Improductivo", false);
  localConfig! : LocalConf;
  minVolume = 0;
  initialVolume: number = 0; // Valor inicial del contenedor
  currentRealVolume: number = this.initialVolume; // Inicializa con el valor inicial
  timer: any;
  currentTime: number = 0;

  now = moment();
  reealNow = moment();

  detail_number = 0;
  DEBUG = true;
  devicesCant : string[] = [];

  private messageInterval:any;

  private last_date = new Date();

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
  volumenInicial = 100;

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
  public conectInternet = false; // Variable para verificar si hay internet o no
  
  inputPressureValue: number | undefined;
  lastVolume: number | null = null;
  hasGPSData = true;

  // private sensorSubjectMap: Map<Sensor, Subject<Sensor>> = new Map();
  private sensorSubjectMap: Map<Sensor, Subject<number|number[]>> = new Map();

  constructor( private electronService: ElectronService , private databaseService : DatabaseService) {
    this.setupSensorSubjects();
    this.checkInternetConnection();
    this.getDistancia();

    this.databaseService.getLastWorkExecution().then((workExecution : WorkExecution) => {
      if(workExecution){
        //console.log("workExecution",workExecution);
        this.tiempoProductivo.set_initial(workExecution.working_time.format("HH:mm:ss"));
        this.tiempoImproductivo.set_initial(workExecution.downtime.format("HH:mm:ss"));
      }
    });
    
    for(let i = 1; i <= Configuration.nDevices; i++){
      this.listArduinos.push(
        new ArduinoDevice(Configuration[`device${i}`],115200,true,electronService)
      );
    }

    //Iteracion para recorre los valores de los sensores y guardarlos localmente
    let instance = this;

    setInterval(async () => {
      //await this.checkInternetConnection();
      let onExecution = false;
    
      // Agregar sensores para futuros cambios
      instance.data = {
        ...instance.data,
        [Sensor.PPM]: 0,
        [Sensor.PH]: 0,
        [Sensor.TEMPERATURE]: 0,
        [Sensor.HUMIDITY]: 0,
        [Sensor.VOLUME_CONTAINER]: 0,
        [Sensor.DISTANCE_NEXT_SECTION]: 0,
        [Sensor.ACCUMULATED_VOLUME] : parseFloat(instance.accumulated_volume.toFixed(2)),
        [Sensor.ACCUMULATED_HECTARE] : parseFloat(instance.accumulated_distance.toFixed(2)), //Velocidad 
      }
      
      instance.listArduinos.forEach(arduino => {
        arduino.message_from_device.forEach((sensor) => {
        });
        instance.data = { ...instance.data, ...instance.mapToObject(arduino.message_from_device) };
        arduino.message_from_device = new Map<Sensor, number | number[]>();
      });
      
      this.hasGPSData = this.data[Sensor.GPS] !== undefined && instance.data[Sensor.GPS] !== null && instance.data[Sensor.GPS] != this.gpsVar;
      if (instance.hasGPSData) {
        instance.dataGps = true;
        //console.log("Si hay datos del gps.");
      } else {
        instance.dataGps = false;
        //console.log("¡Alerta! No hay datos del GPS.", this.dataGps);
        // Aquí puedes agregar cualquier lógica de alerta que necesites
      }

      this.gpsVar = instance.data[Sensor.GPS];

      // Continuar solo si hay datos del GPS
        Object.entries(this.data).forEach((value) => {
          let sensor = parseInt(value[0]) as Sensor;
          instance.notifySensorValue(sensor, sensor == Sensor.GPS ? value[1] as number[] : value[1] as number);
        }); 
    
        if (!onExecution) {
          onExecution = true;
    
          if (instance.data[`${Sensor.WATER_FLOW}`] >= 1) {
            instance.tiempocondicion = 990;
            //Hallar la distancia - la velocidad se divide entre 3.6 para la conversion de metros por segundos
            instance.data[Sensor.DISTANCE_NEXT_SECTION] == await instance.data[Sensor.SPEED] / 3.6;
          }else {
            instance.tiempocondicion = 3990;
          }
          instance.reealNow =  moment();
          const iteration = async () => {
            let currentWork: WorkExecution = await instance.databaseService.getLastWorkExecution();
    
            if (currentWork) {
              if (instance.data[`${Sensor.WATER_FLOW}`] >= 1) {
                instance.tiempoProductivo.start();
                instance.tiempoImproductivo.stop();
                instance.accumulated_volume += instance.data[`${Sensor.VOLUME}`];
                instance.accumulated_distance += instance.data[`${Sensor.DISTANCE_NEXT_SECTION}`];

              } else {
                instance.tiempoImproductivo.start();
                instance.tiempoProductivo.stop();
              }
    
              currentWork.downtime = instance.tiempoImproductivo.time();
              currentWork.working_time = instance.tiempoProductivo.time();
    
              await this.databaseService.updateTimeExecution(currentWork);
            }
    
            if (currentWork && instance.isRunning) {
              let gps = instance.data[Sensor.GPS];

              // Evaluar los eventos
              let events: string[] = [];
              let has_events = false;
    
              //console.log("Trabajo" , currentWork);

              instance.caudalNominal = JSON.parse(currentWork.configuration).water_flow;
              instance.info = JSON.parse(currentWork.configuration).pressure;
              instance.speedalert = JSON.parse(currentWork.configuration).speed;

              instance.precision = {
                ...instance.precision,
                [Sensor.WATER_FLOW] : Math.round(100 - ((Math.abs(instance.data[`${Sensor.WATER_FLOW}`] - instance.caudalNominal)/instance.caudalNominal) * 100)),
                [Sensor.PRESSURE] : Math.round(100 - ((Math.abs(instance.data[`${Sensor.PRESSURE}`] - instance.info) / instance.info) * 100)),
                [Sensor.SPEED] : Math.round(100  - ((Math.abs(instance.data[`${Sensor.SPEED}`] - instance.speedalert) / instance.speedalert) * 100)),
              }

              if (instance.data[Sensor.WATER_FLOW] < instance.caudalNominal * 0.5 || instance.data[Sensor.WATER_FLOW] > instance.caudalNominal * 1.5) {
                has_events = true;
                events.push("EL CAUDAL ESTA FUERA DEL RANGO ESTABLECIDO");
              }
    
              if (instance.data[Sensor.PRESSURE] < instance.info * 0.5 || instance.data[Sensor.PRESSURE] > instance.info * 1.5) {
                has_events = true;
                events.push("LA PRESIÓN ESTA FUERA DEL RANGO ESTABLECIDO");
              }
    
              if (instance.data[Sensor.SPEED] < instance.speedalert * 0.5 || instance.data[Sensor.SPEED] > instance.speedalert * 1.5 || instance.data[Sensor.SPEED] < instance.speedalert * 0.5 || await instance.data[Sensor.SPEED] > instance.speedalert * 1.5) {
                has_events = true;
                events.push("LA VELOCIDAD ESTA FUERA DEL RANGO ESTABLECIDO");
              }

              if(instance.data[Sensor.PRESSURE] < instance.info || instance.data[Sensor.PRESSURE] > instance.info * 1.5 || await instance.data[Sensor.WATER_FLOW] < instance.caudalNominal * 0.5 || await instance.data[Sensor.WATER_FLOW] > instance.caudalNominal * 1.5){
                has_events = true;
                events.push("CAUDAL , PRESIÓN Y VELOCIDAD FUERA DE RANGO");
              }
    
              // if (!has_events) {
              //   events.push("NO HAY EVENTOS REGISTRADOS");
              // }
              
              
              let wExecutionDetail: WorkExecutionDetail = {
                id_work_execution: currentWork.id,
                time: instance.reealNow,
                sended: false,
                data: JSON.stringify(instance.data),
                precision: JSON.stringify(instance.precision),
                gps: JSON.stringify(gps),
                has_events: has_events,
                events: events.join(", "),
                id: 0,
              };
              console.log("wExecutionDetail : " , JSON.stringify(wExecutionDetail));
              //console.log("precision" , JSON.stringify(this.precision));
              //Guardar solo cuando haya datos del gps

              await instance.databaseService.saveWorkExecutionDataDetail(wExecutionDetail);
              /* if (this.dataGps) {
                
              } else {
                console.log("No se guardo en la DB");
              } */
            }
    
            onExecution = false;
          }
          //let currentTime = moment();
          console.log("Current time: " + instance.reealNow.format("YYYY-MM-DD H:mm:ss.SSS"));
          if (instance.reealNow.diff(instance.now, 'milliseconds') >= instance.tiempocondicion) {
            instance.now = instance.reealNow;
            await iteration();
          }
        }
      
    }, 200);
    
  }

  findBySensor(sensor : number): ArduinoDevice{
    return this.listArduinos.find(p => p.sensors.some(x => x == sensor))!;
  }

  getDistancia(){
    //console.log(this.distance, "RETORNO DE DISTANCIA")
    return this.distance;
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

      // Convertir el valor de bares según sea necesario, por ejemplo, asumamos que está en la misma unidad que se usó en el script original
      const barPressure = bars;

      //console.log('Enviando comando de regulación de presión...', barPressure);

      // Aquí deberías incluir la lógica para enviar el comando al dispositivo, por ejemplo:
      this.findBySensor(regulatorId).sendCommand(`${regulatorId}|${barPressure}`);
      //console.log("Comando" , `${regulatorId}|${barPressure}`);
    }

    //Metodo para resetear el volumen inicial y minimo
    public resetVolumenInit(): void {
      const command = 'B';
      this.findBySensor(Sensor.VOLUME).sendCommand(command);
    }

    inicializarContenedor(inicial: number, minimo: number): void {
      this.initialVolume = inicial;
      this.currentRealVolume = inicial;
      this.minVolume = minimo;
      this.isRunning = true;
    }

    //Metodo para resetear la pression inicial y minimo
    public resetPressure(): void {
      const command = 'B';
      this.findBySensor(Sensor.PRESSURE).sendCommand(command);
    }

    //
    public conteoPressure(): void {
      const command = 'E';
      this.findBySensor(Sensor.PRESSURE).sendCommand(command);
    }

    // Método para activar la válvula izquierda
    public activateLeftValve(): void {
      this.izquierdaActivada = true;
      const command = Sensor.VALVE_LEFT + '|1\n'; // Comando para activar la válvula izquierda
      this.findBySensor(Sensor.VALVE_LEFT).sendCommand(command);
    }

    // Método para desactivar la válvula izquierda
    public deactivateLeftValve(): void {
      this.izquierdaActivada = false;
      const command = Sensor.VALVE_LEFT  + '|0\n'; // Comando para desactivar la válvula izquierda
      this.findBySensor(Sensor.VALVE_LEFT).sendCommand(command);
      //console.log("Comando desactivar valvula izquierda", command);
    }

    // Método para activar la válvula derecha
    public activateRightValve(): void {
      this.derechaActivada = true;
      const command = Sensor.VALVE_RIGHT + '|1\n'; // Comando para activar la válvula derecha
      //console.log(command, "comand");
      this.findBySensor(Sensor.VALVE_RIGHT).sendCommand(command);
    }

    // Método para desactivar la válvula derecha
    public deactivateRightValve(): void {
      this.derechaActivada = false;
      const command = Sensor.VALVE_RIGHT + '|0\n'; // Comando para desactivar la válvula derecha
      this.findBySensor(Sensor.VALVE_RIGHT).sendCommand(command);
      //console.log("Comando desactivar valvula derecha", command);
    }

    //Regular la presion
    regulatePressure(): void {
      if (this.inputPressureValue !== undefined) {
        //console.log(this.inputPressureValue);
      this.regulatePressureWithBars(this.inputPressureValue);
      }
    }

    //Limpiar datos el arduino mediante el comando
    resetVolumen(): void {
      this.resetVolumenInit();
      this.minVolume = 0;
      this.currentRealVolume = 0;
      // this.maxVolume = 0;
    }

    getDistance(coord1, coord2) {
      const R = 6371; // Radio de la Tierra en kilómetros
      const dLat = this.deg2rad(coord2.latitude - coord1.latitude);
      const dLon = this.deg2rad(coord2.longitude - coord1.longitude);
      const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(this.deg2rad(coord1.latitude)) * Math.cos(this.deg2rad(coord2.latitude)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceInKm = R * c; // Distancia en kilómetros
      const distanceInMeters = distanceInKm * 1000; // Convertir a metros
      return distanceInMeters;
    }
  
    deg2rad(deg) {
        return deg * (Math.PI / 180);
    }

    async checkInternetConnection() {
      try {
          const online = await isOnline();
          if (online) {
              this.conectInternet = true;
              //console.log('El procesador tiene conexión a Internet.');
          } else {
              this.conectInternet = false;
              //console.log('El procesador no tiene conexión a Internet.');
          }
      } catch (error) {
          console.error('Error al verificar la conexión a Internet:', error);
      }
    } 

    /* Algoritmo para el tiempo productivo */
    /* IniciarApp(valorWatterflow : number): void {
      console.log("Ingreso a la funcion iniciarApp")
      if (this.isRunning && valorWatterflow > 0) {
        //console.log("Ingreso a la condicion si es true la varibale isRunning")
        this.resumeTimerProductive();
        this.pauseTimerImproductive();
        //console.log("valor del caudal", valorWatterflow);
      } else if(valorWatterflow <= 0){
        //console.log("Ingreso al else if si es false la variable y esta menos dee 0")
        //this.isRunning = false;
        this.resumeTimerImproductive();
        this.pauseTimerProductive();
      }
    } */


  //Este es el encargado de generar y emitir eventos de actualización
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
    //console.log(`Nuevo valor para ${sensorType}: ${value}`)
    if (this.sensorSubjectMap.has(sensorType)) {
        this.sensorSubjectMap.get(sensorType)!.next(value);
        if (sensorType === Sensor.VOLUME  && tiempoActual - this.ultimoTiempoNotificacion >= 1000 ) {
            this.ultimoTiempoNotificacion = tiempoActual;
            let volumenInicial = this.initialVolume;
            //console.log("Volumen inicial" , volumenInicial);
            // Resta la diferencia del valor anteriormente descontado
            let valor = value as number;
            this.volumenAcumul = valor + this.volumenAcumul;
            //console.log("Volumen acumul" , this.volumenAcumul);
            this.currentRealVolume = volumenInicial - this.volumenAcumul;
            //console.log("Current Volumen" , this.currentRealVolume);
        }
    }
  }


  //Notifica eventos del sensor de watterflow
 /*  public notifySensorWatterflow(sensor: Sensor, val: number) {
    if (sensor === Sensor.WATER_FLOW && val > 0) {
      // Calcula la reducción de volumen en función del caudal
      const volumeReduction = val * 60.0 / 1000.0; // Convierte el caudal de mL/s a litros/minuto

      // Actualiza el volumen actual
      this.currentVolume -= volumeReduction;

      if (this.currentVolume < this.minVolume) {
        // Realiza acciones adicionales cuando el volumen alcanza el mínimo
        console.log('Volumen mínimo alcanzado');
        // Puedes realizar otras acciones o detener el flujo según tus necesidades
      }

      // También puedes emitir eventos o notificar sobre cambios en el volumen
      this.notifyVolumeChange(this.currentVolume);
    }
  } */

 /*  private notifyVolumeChange(volume: number): void {
    // Emite un evento o realiza acciones cuando cambia el volumen
    console.log(`Volumen actual: ${volume} litros`);
  } */

}