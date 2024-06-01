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
import { Store } from '@ngxs/store';
import { ActivateLeftValve, DeactivateLeftValve, ActivateRightValve, DeactivateRightValve , ActivateBothValves, DeactivateBothValves } from '../../state/valve.state';

//import { getDistance} from 'geolib';

import isOnline from 'is-online';


//Este se comporta como el device_manager

@Injectable({
  providedIn: 'root',
})

export class ArduinoService {
  public isServiceRestarting: boolean = true;
  listArduinos : ArduinoDevice[] = [];  
  public tiempoProductivo : Chronos = new Chronos(1,"Productivo", false);
  public tiempoImproductivo : Chronos = new Chronos(2,"Improductivo", false);
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
  //volumenInicial = 0;

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

  // Almacena el valor anterior del acumulador de volumen
  previousAccumulatedVolume = 0;

  // private sensorSubjectMap: Map<Sensor, Subject<Sensor>> = new Map();
  private sensorSubjectMap: Map<Sensor, Subject<number|number[]>> = new Map();

  constructor( private electronService: ElectronService , private databaseService : DatabaseService , private store: Store) {
    this.setupSensorSubjects();
    this.checkInternetConnection();
    this.getDistancia();

    this.databaseService.getLastWorkExecution().then((workExecution : WorkExecution) => {
      if(workExecution){
        this.tiempoProductivo.set_initial(workExecution.working_time.format("HH:mm:ss"));
        this.tiempoImproductivo.set_initial(workExecution.downtime.format("HH:mm:ss"));
      }
    });
    
    for(let i = 1; i <= Configuration.nDevices; i++){
      this.listArduinos.push(
        new ArduinoDevice(Configuration[`device${i}`],115200,true,electronService)
      );
    }

    // Variable para almacenar el último volumen registrado
    let ultimoVolumenRegistrado = 0;


    //Iteracion para recorre los valores de los sensores y guardarlos localmente
    let instance = this;

      // Declarar una variable para almacenar el volumen anterior
    let volumenAnterior = 0;


    // Almacena el estado anterior de conexión de los sensores
    let previousSensorConnections = {
      sensorVolume: false,
      sensorPressure: false,
      sensorGps: false
    };

    setInterval(async () => {
      this.checkInternetConnection();
      let onExecution = false;

      // Define una bandera para controlar si el restablecimiento de currentRealVolume ya ha ocurrido
      let isCurrentRealVolumeReset = false;


      // Agregar sensores para futuros cambios
      instance.data = {
        ...instance.data,
        [Sensor.PPM]: 0,
        [Sensor.PH]: 0,
        [Sensor.TEMPERATURE]: 0,
        [Sensor.HUMIDITY]: 0,
        [Sensor.VOLUME_CONTAINER]: 0,
        [Sensor.DISTANCE_NEXT_SECTION]: 0,
        [Sensor.ACCUMULATED_HECTARE] : parseFloat(instance.accumulated_distance.toFixed(2)), //Velocidad 
      }

      let currentWork: WorkExecution = await instance.databaseService.getLastWorkExecution();
      instance.listArduinos.forEach(arduino => {
        arduino.message_from_device.forEach((sensor) => {
        });
        instance.data = { ...instance.data, ...instance.mapToObject(arduino.message_from_device) };
        arduino.message_from_device = new Map<Sensor, number | number[]>();
      });
      


      if(instance.isServiceRestarting){
        try {
          let currentWork: WorkExecution = await instance.databaseService.getLastWorkExecution();
          let prueba = await instance.databaseService.getLastWorkExecutionCurrent(currentWork.id);
          console.log("DATA", prueba.data);
      
          if (prueba && prueba.data) {
              instance.dataCurrent = JSON.parse(prueba.data)[Sensor.CURRENT_TANK];
              instance.currentRealVolume = instance.dataCurrent;
              instance.restaurarConsumoTotal = JSON.parse(prueba.data)[Sensor.ACCUMULATED_CONSUMO];
              instance.valvulaDerecha = JSON.parse(prueba.data)[Sensor.VALVE_RIGHT];
              instance.valvulaIzquierda = JSON.parse(prueba.data)[Sensor.VALVE_LEFT];

              console.log("VALVULA DERECHA" , instance.valvulaDerecha , "VALVULA IZQUIERDA" , instance.valvulaIzquierda);

              console.log("DATA", prueba.data);
              console.log("CONSUMO TOTTAL RESTAURADO", instance.restaurarConsumoTotal);
            
              instance.restaurarDistancia = JSON.parse(prueba.data)[Sensor.ACCUMULATED_HECTARE];
              instance.accumulated_distance = parseFloat(instance.restaurarDistancia.toFixed(2));


              //instance.datosCaudal = instance.previousAccumulatedVolume;
              console.log("ENTRO AL SERVICIO, IMPRESION DE LA PRUEBA", instance.currentRealVolume);
          }
        } catch (error) {
            console.error("Error al obtener o procesar los datos:", error);
        }
        this.isServiceRestarting = false; // Reinicio completado
      }else{
        //instance.currentRealVolume = instance.initialVolume;
      }


      if(instance.data[Sensor.VOLUME] > 0){
        //console.log("DATOS CAUDAL SERVICIO" , instance.datosCaudal);
        //Guardamos en datosCaudal el valor del volumen acumulado
        instance.datosCaudal = instance.data[Sensor.VOLUME] + instance.previousAccumulatedVolume;
        //console.log("DATOS CAUDAL SERVICIO" , instance.datosCaudal);
        instance.datosCaudal = parseFloat(instance.datosCaudal.toFixed(2));
        //console.log("VOLUMEN RESETEADO", instance.volumenReseteado);
      }

       // Aquí puedes colocar la parte relacionada con el sensor
      let sensorVolume = Sensor.WATER_FLOW; // El sensor que deseas verificar
      let sensorPressure = Sensor.PRESSURE; // El sensor que deseas verificar
      let sensorGps = Sensor.GPS; // El sensor que deseas verificar
      instance.coneectedCaudal = instance.isSensorConnected(sensorVolume);
      instance.connectedPresion = instance.isSensorConnected(sensorPressure);
      instance.connectedGps = instance.isSensorConnected(sensorGps);

      /* Verificar el estado de conexion y desconexion del arduino */
      if(instance.coneectedCaudal){
        instance.data[Sensor.STATUS_WATTERFLOW] = 1;
      }else{
        instance.data[Sensor.STATUS_WATTERFLOW] = 0;
      }

      if(instance.connectedGps){
        instance.data[Sensor.STATUS_GPS] = 1;
      }else{
        instance.data[Sensor.STATUS_GPS] = 0;
      }

      if(instance.connectedPresion){
        instance.data[Sensor.STATUS_PRESSURE] = 1;
      }else{
        instance.data[Sensor.STATUS_PRESSURE] = 0;
      }

      //Para la reconexion de la presion - Regula de acuerdo a la ultima presion guardada
      if(instance.connectedPresion !== previousSensorConnections.sensorPressure){
        console.log(`El sensor ${sensorPressure} se ${this.connectedPresion ? 'conectó' : 'desconectó'}`);
        previousSensorConnections.sensorPressure = this.connectedPresion;

        
        this.regulatePressureWithBars(0);
        console.log("COMANDO regular" , 0);

        setTimeout(async () => {
          const pressureReconexion = await JSON.parse(currentWork.configuration).pressure;
          this.regulatePressureWithBars(pressureReconexion);
          instance.data[Sensor.VALVE_RIGHT] = instance.valvulaDerecha;
          instance.data[Sensor.VALVE_LEFT] = instance.valvulaIzquierda;
          
          if(instance.valvulaDerecha || instance.valvulaIzquierda){
            instance.activateRightValve();        
            instance.activateLeftValve();
          }

          console.log("COMANDO regular despues de 2 s" , pressureReconexion);
          console.log("COMANDO DERECHA" , instance.data[Sensor.VALVE_RIGHT]);
          console.log("COMANDO IZQUIERDA" , instance.data[Sensor.VALVE_LEFT]);
        }, 2000);
      
      }

      // Si se reconecta el sensor de caudal, recupera el valor del acumulador de volumen
      // Dentro de tu bloque de código donde manejas la reconexión del sensor de caudal
      if (this.coneectedCaudal && !previousSensorConnections.sensorVolume && !isCurrentRealVolumeReset) {
        if(currentWork){
          let currentWorkPrueba: WorkExecutionDetail = await instance.databaseService.getLastWorkExecutionDetail(currentWork.id);
          if (currentWorkPrueba) {
            instance.previousAccumulatedVolume = JSON.parse(currentWorkPrueba.data)[Sensor.ACCUMULATED_VOLUME];
            instance.data[Sensor.ACCUMULATED_RESTAURAR] = instance.previousAccumulatedVolume;
            instance.datosCaudal = instance.previousAccumulatedVolume;
            console.log("RESTABLECIDO 1", instance.previousAccumulatedVolume);
            // Marcar que el restablecimiento de currentRealVolume ya ha ocurrido
            isCurrentRealVolumeReset = true;
            previousSensorConnections.sensorVolume = true;
          }
        }   
      }

      // Compara el estado actual con el estado anterior para detectar cambios
      if (this.coneectedCaudal !== previousSensorConnections.sensorVolume) {
        console.log(`El sensor ${sensorVolume} se ${this.coneectedCaudal ? 'conectó' : 'desconectó'}`);
        previousSensorConnections.sensorVolume = this.coneectedCaudal;

        // Si se desconecta el sensor de caudal, guarda el último valor válido del acumulador de volumen
        if (!this.coneectedCaudal) {
          if(currentWork){
            let currentWorkPrueba : WorkExecutionDetail = await instance.databaseService.getLastWorkExecutionDetail(currentWork.id);  
            if(currentWorkPrueba){
              //instance.previousAccumulatedVolume = JSON.parse(currentWorkPrueba.data)[Sensor.ACCUMULATED_VOLUME];
              console.log("RESTABLECIDO 2" , instance.previousAccumulatedVolume);
            }
          }
        }
      }

      this.hasGPSData = this.data[Sensor.GPS] !== undefined && instance.data[Sensor.GPS] !== null && instance.data[Sensor.GPS] != this.gpsVar;
      
      if (instance.hasGPSData) {
        instance.dataGps = true;
      } else {
        instance.dataGps = false;
      }

      this.gpsVar = instance.data[Sensor.GPS];
      

      if(instance.datosCaudal > 0 && instance.datosCaudal != undefined){
        instance.data[Sensor.ACCUMULATED_VOLUME] = instance.datosCaudal;
          // Verificar si el volumen ha cambiado y sumarlo a acumuladoTotal
          let volume = parseFloat(instance.data[Sensor.VOLUME]);
          if (!isNaN(volume)) {
            // Sumar el valor actual de volume a acumuladoTotal
            instance.acumuladoTotal = volume + instance.volumenReseteado;
            instance.data[Sensor.ACCUMULATED_CONSUMO] = instance.acumuladoTotal + instance.restaurarConsumoTotal;
          }
      }

      //console.log("VOLUMEN ACUMULADO TOTAL" , instance.acumuladoTotal);


      // Continuar solo si hay datos del GPS
        Object.entries(this.data).forEach((value) => {
          let sensor = parseInt(value[0]) as Sensor;
          instance.notifySensorValue(sensor, sensor == Sensor.GPS ? value[1] as number[] : value[1] as number);
          //console.log(sensor);
        }); 

        //console.log(onExecution);
        if (!onExecution) {
          onExecution = true;
          
          if (instance.data[`${Sensor.WATER_FLOW}`] >= 1) {
            instance.tiempocondicion = 1;
            
            //Hallar la distancia - la velocidad se divide entre 3.6 para la conversion de metros por segundos
            //instance.data[Sensor.DISTANCE_NEXT_SECTION] = instance.data[Sensor.SPEED] / 3.6;
            instance.data[Sensor.DISTANCE_NEXT_SECTION] = (Math.random() * 10) / 3.6;
            console.log("Distancia por tramo" , instance.data[Sensor.DISTANCE_NEXT_SECTION]);
            instance.accumulated_distance += instance.data[`${Sensor.DISTANCE_NEXT_SECTION}`];
            console.log("ACUMULADO DE HECTAREAS" , instance.accumulated_distance);
                
          }else {
            instance.tiempocondicion = 4;
          }
          instance.reealNow =  moment();
          const iteration = async () => {
            let currentWork: WorkExecution = await instance.databaseService.getLastWorkExecution();
    
            if (currentWork) {
              if (instance.data[`${Sensor.WATER_FLOW}`] >= 1 && instance.data[`${Sensor.ACCUMULATED_VOLUME}`] >= 0) {
                //console.log("CURRENT ANTES DE MODIFICAR" , instance.currentRealVolume);
                //console.log("PREVIOUS VOLUME" , instance.previousAccumulatedVolume);
                instance.currentRealVolume = instance.initialVolume - instance.datosCaudal;
                //console.log("CURRENT DESPUES DE MODIFICAR" , instance.currentRealVolume);
                instance.data[Sensor.CURRENT_TANK] = instance.currentRealVolume;
               
                instance.tiempoProductivo.start();
                instance.tiempoImproductivo.stop();
  
                instance.data[Sensor.VOLUME] = parseFloat((instance.data[Sensor.ACCUMULATED_VOLUME] - volumenAnterior).toFixed(2));
                volumenAnterior = instance.data[Sensor.ACCUMULATED_VOLUME];
 
              } else {
                instance.data[Sensor.VOLUME] = 0;
                instance.tiempoImproductivo.start();
                instance.tiempoProductivo.stop();
              }
    
              currentWork.downtime = instance.tiempoImproductivo.time();
              currentWork.working_time = instance.tiempoProductivo.time();

/*                
              const downtime = moment.duration(currentWork.downtime.format('HH:mm:ss'));
              const workingTime = moment.duration(currentWork.working_time.format('HH:mm:ss'));
              
              // Sumar los tiempos
              const totalTime = moment.duration(downtime).add(workingTime);
              
                          // Convertir el tiempo total a segundos
              const totalSeconds = totalTime.asSeconds();

              // Multiplicar los segundos por 60 y dividir por 1000
              const resultSeconds = (totalSeconds * 60) / 1000;

              // Convertir los segundos resultantes a una duración de moment.js
              const resultDuration = moment.duration(resultSeconds, 'seconds');

              // Obtener las horas, minutos y segundos del tiempo resultante
              const resultHours = Math.floor(resultDuration.asHours());
              const resultMinutes = Math.floor(resultDuration.minutes());
              const resultSecondsOnly = Math.floor(resultDuration.seconds());

              // Formatear el resultado en H:mm:ss
              const formattedResult = `${resultHours}:${resultMinutes.toString().padStart(2, '0')}:${resultSecondsOnly.toString().padStart(2, '0')}`;

              console.log("TIEMPO PRODUCTIVO" , currentWork.working_time.format('HH:mm:ss'));
              console.log("TIEMPO IMPRODUCTIVO" , currentWork.downtime.format('HH:mm:ss'));
              console.log("Total Time (H:mm:ss):", totalTime.hours() + ":" + totalTime.minutes().toString().padStart(2, '0') + ":" + totalTime.seconds().toString().padStart(2, '0'));
              console.log("Formatted Result (H:mm:ss):", formattedResult);
                   */
              await this.databaseService.updateTimeExecution(currentWork);
            }

            instance.reealNow = instance.reealNow.startOf('seconds');
            
            //console.log("VARIABLE ISRUNNING" , instance.isRunning);
            
            //Is running en true para guardar datos
            if (currentWork && instance.isRunning) {
              let gps = instance.data[Sensor.GPS];

              // Evaluar los eventos
              let events: string[] = [];
              let has_events = false;
    
              instance.caudalNominal = JSON.parse(currentWork.configuration).water_flow;
              instance.info = JSON.parse(currentWork.configuration).pressure;
              instance.speedalert = JSON.parse(currentWork.configuration).speed;

              instance.precision = {
                ...instance.precision,
                [Sensor.WATER_FLOW] : Math.round(100 - ((Math.abs(instance.data[`${Sensor.WATER_FLOW}`] - instance.caudalNominal)/instance.caudalNominal) * 100)),
                [Sensor.PRESSURE] : Math.round(100 - ((Math.abs(instance.data[`${Sensor.PRESSURE}`] - instance.info) / instance.info) * 100)),
                [Sensor.SPEED] : Math.round(100  - ((Math.abs(instance.data[`${Sensor.SPEED}`] - instance.speedalert) / instance.speedalert) * 100)),
              }

              if (instance.data[Sensor.WATER_FLOW] > instance.caudalNominal * 0.90 && instance.data[Sensor.WATER_FLOW] < instance.caudalNominal * 1.1) {
                // Caudal Verde
              } else if ((instance.data[Sensor.WATER_FLOW] > instance.caudalNominal * 0.50 && instance.data[Sensor.WATER_FLOW] < instance.caudalNominal * 0.9) ||
                (instance.data[Sensor.WATER_FLOW] < instance.caudalNominal * 1.5 && instance.data[Sensor.WATER_FLOW] > instance.caudalNominal * 1.1)) {
                has_events = true;
                events.push("EL CAUDAL ESTA FUERA DEL RANGO ESTABLECIDO");
              } else {
                has_events = true;
                events.push("EL CAUDAL ESTA FUERA DEL RANGO ESTABLECIDO");
              }
    
              if (instance.data[Sensor.PRESSURE] > instance.info * 0.90 && instance.data[Sensor.PRESSURE] < instance.info * 1.1) {
                // Presión Verde
              } else if ((instance.data[Sensor.PRESSURE] > instance.info * 0.50 && instance.data[Sensor.PRESSURE] < instance.info * 0.9) ||
                (instance.data[Sensor.PRESSURE] < instance.info * 1.5 && instance.data[Sensor.PRESSURE] > instance.info * 1.1)) {
                has_events = true;
                events.push("LA PRESIÓN ESTA FUERA DEL RANGO ESTABLECIDO");
              } else {
                has_events = true;
                events.push("LA PRESIÓN ESTA FUERA DEL RANGO ESTABLECIDO");
              }
    
              if (instance.data[Sensor.SPEED] > instance.speedalert * 0.90 && instance.data[Sensor.SPEED] < instance.speedalert * 1.1) {
                // Velocidad Verde
              } else if ((instance.data[Sensor.SPEED] > instance.speedalert * 0.50 && instance.data[Sensor.SPEED] < instance.speedalert * 0.9) ||
                (instance.data[Sensor.SPEED] < instance.speedalert * 1.5 && instance.data[Sensor.SPEED] > instance.speedalert * 1.1)) {
                has_events = true;
                events.push("LA VELOCIDAD ESTA FUERA DEL RANGO ESTABLECIDO");
              } else {
                has_events = true;
                events.push("LA VELOCIDAD ESTA FUERA DEL RANGO ESTABLECIDO");
              }

              if ((instance.data[Sensor.PRESSURE] < instance.info * 0.50 || instance.data[Sensor.PRESSURE] > instance.info * 1.5) ||
                (instance.data[Sensor.WATER_FLOW] < instance.caudalNominal * 0.50 || instance.data[Sensor.WATER_FLOW] > instance.caudalNominal * 1.5) ||
                (instance.data[Sensor.SPEED] < instance.speedalert * 0.50 || instance.data[Sensor.SPEED] > instance.speedalert * 1.5)) {
                has_events = true;
                events.push("AL MENOS UN SENSOR FUERA DEL RANGO DEL 50%");
              }
                  
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
              //console.log("wExecutionDetail : " , JSON.stringify(wExecutionDetail));
              //console.log("precision" , JSON.stringify(this.precision));
              //Guardar solo cuando haya datos del gps

              await instance.databaseService.saveWorkExecutionDataDetail(wExecutionDetail);
              instance.reealNow = instance.reealNow.startOf('seconds');

              //Reiniciar el volumen
              instance.data[Sensor.VOLUME] = 0;
             
            } 
            onExecution = false;
          }
          //let currentTime = moment();
          //console.log("Current time: " + instance.reealNow.format("YYYY-MM-DD H:mm:ss.SSS"));
          if (instance.reealNow.diff(instance.now, 'seconds') >= instance.tiempocondicion) {
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

    // Aquí deberías incluir la lógica para enviar el comando al dispositivo, por ejemplo:
    this.findBySensor(regulatorId).sendCommand(`${regulatorId}|${barPressure}`);

    console.log("Comando Regulador" , `${regulatorId}|${barPressure}`);
  }

  //Metodo para resetear el volumen inicial y minimo
  public resetVolumenInit(): void {
    const command = 'B';
    this.findBySensor(Sensor.VOLUME).sendCommand(command);
    this.volumenReseteado += this.datosCaudal;
    console.log("VOLUMEN RESETEADO" , this.volumenReseteado);
  }

  //Metodo para poder saber si un Arduino/Sensor esta conectado o no
  public isSensorConnected(sensor: Sensor): boolean {
    // Encuentra el Arduino que contiene el sensor
    const arduino = this.listArduinos.find(a => a.sensors.includes(sensor));
    // Si se encuentra el Arduino y está conectado, el sensor también está conectado
    return !!arduino && arduino.isConnected;
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
    this.store.dispatch(new ActivateLeftValve());
    console.log("IZQUIERDA ACTIVADA" , this.izquierdaActivada);
    const command = Sensor.VALVE_LEFT + '|1\n'; // Comando para activar la válvula izquierda
    console.log("Comand" , command);
    this.findBySensor(Sensor.VALVE_LEFT).sendCommand(command);
  }

  // Método para desactivar la válvula izquierda
  public deactivateLeftValve(): void {
    this.izquierdaActivada = false;
    this.store.dispatch(new DeactivateLeftValve());
    console.log("IZQUIERDA DESACTIVADA" , this.izquierdaActivada);
    const command = Sensor.VALVE_LEFT  + '|0\n'; // Comando para desactivar la válvula izquierda
    console.log("Comand" , command);
    this.findBySensor(Sensor.VALVE_LEFT).sendCommand(command);
    //console.log("Comando desactivar valvula izquierda", command);
  }

  // Método para activar la válvula derecha
  public activateRightValve(): void {
    this.derechaActivada = true;
    this.store.dispatch(new ActivateRightValve());
    console.log("DERECHA ACTIVADA" , this.derechaActivada);
    const command = Sensor.VALVE_RIGHT + '|1\n'; // Comando para activar la válvula derecha
    console.log("Comand" , command);
    //console.log(command, "comand");
    this.findBySensor(Sensor.VALVE_RIGHT).sendCommand(command);
  }

  // Método para desactivar la válvula derecha
  public deactivateRightValve(): void {
    this.derechaActivada = false;
    this.store.dispatch(new DeactivateRightValve());
    console.log("DERECHA DESCAACTIVADA" , this.derechaActivada);
    const command = Sensor.VALVE_RIGHT + '|0\n'; // Comando para desactivar la válvula derecha
    console.log("Comand" , command);
    this.findBySensor(Sensor.VALVE_RIGHT).sendCommand(command);
    //console.log("Comando desactivar valvula derecha", command);
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
    }
  }
}