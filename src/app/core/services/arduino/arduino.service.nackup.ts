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
import { getDistance} from 'geolib';
import isOnline from 'is-online';

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

    //Iteracion para recorre los valores de los sensores y guardarlos localmente
    let instance = this;

    // Almacena el estado anterior de conexiÃ³n de los sensores

    let previousSensorConnections = {
      sensorVolume: false,
      sensorPressure: false,
      sensorGps: false
    };

    setInterval(async () => {

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

      //FOREACH QUE RECORRE LA ISTA DE ARDUINOS CONECTADOS
      instance.listArduinos.forEach(arduino => {
        arduino.message_from_device.forEach((sensor) => {
        });

        instance.data = { ...instance.data, ...instance.mapToObject(arduino.message_from_device) };
        arduino.message_from_device = new Map<Sensor, number | number[]>();

        if(instance.data[Sensor.VOLUME] > 0){
          instance.volumenTx = instance.data[Sensor.VOLUME];
          //instance.volumenArduino = instance.data[Sensor.VOLUME];
          //this.electronService.log("ACUMULADO VOLUMEN" , instance.volumenTx);
        }

      });

      //instance.electronService.log("LECTURA DEL VOLUMEN", instance.data[Sensor.VOLUME]);
      
      if(instance.isServiceRestarting){
        try {

          let currentWork: WorkExecution = await instance.databaseService.getLastWorkExecution();
          let prueba = await instance.databaseService.getLastWorkExecutionCurrent(currentWork.id);

          if (prueba && prueba.data) {

              instance.dataCurrent = JSON.parse(prueba.data)[Sensor.CURRENT_TANK];

              if(instance.volumenTx > 0){
                const waterVolumes = await this.databaseService.getLastWaterVolume(currentWork.id);
                instance.currentRealVolume = waterVolumes.volume - instance.volumenTx;
              }else if(instance.volumenTx <= 0){
                instance.currentRealVolume = instance.dataCurrent;
                instance.volumenReinicio = true;
              }

              instance.restaurarConsumoTotal = JSON.parse(prueba.data)[Sensor.ACCUMULATED_RESTAURAR];
              //this.electronService.log("RESTAURAR CONSUMO TOTAL" , instance.restaurarConsumoTotal);

              instance.valvulaDerecha = JSON.parse(prueba.data)[Sensor.VALVE_RIGHT];
              instance.valvulaIzquierda = JSON.parse(prueba.data)[Sensor.VALVE_LEFT];

              instance.restaurarDistancia = JSON.parse(prueba.data)[Sensor.ACCUMULATED_HECTARE];
              instance.accumulated_distance = parseFloat(instance.restaurarDistancia.toFixed(2));
          }

        } catch (error) {
            console.error("Error al obtener o procesar los datos:", error);
        }

        this.isServiceRestarting = false; // Reinicio completado

      

      }else{
        //instance.currentRealVolume = instance.initialVolume;
      }

      //instance.electronService.log("REINICIO SEGUNDO" , instance.reealNow.format('HH:mm:ss'));

      //CONDICION PARA OBTNER EL CONSUMO DE DATOS CAUDAL
      if(instance.data[Sensor.VOLUME] >= 1){

        //Guardamos en datosCaudal el valor del volumen acumulado
        if(!instance.volumenReinicio){
          //Si se reinicia el procesador 
          instance.datosCaudal = instance.data[Sensor.VOLUME];
        }else if(instance.volumenReinicio){
          //Si se reinicia de forma por caimnaes
          instance.datosCaudal = instance.data[Sensor.VOLUME] + instance.previousAccumulatedVolume;
        }
        //instance.electronService.log("ACUMULADO TOTAL", instance.acumuladoTotal)
        instance.acumuladoTotal = instance.volumenReseteado + instance.datosCaudal;
        instance.data[Sensor.ACCUMULATED_VOLUME] = parseFloat(instance.acumuladoTotal.toFixed(2));

        instance.currentRealVolume = instance.datosCaudal;
        //instance.electronService.log("DATOS CAUDAL" , instance.datosCaudal);
      }

      //instance.electronService.log("CAUDAL SEGUNDO SEGUNDO" , instance.reealNow.format('HH:mm:ss'));

      //CONEXIONES Y DESCONEXIONES DEL ARDUINO
       // AquÃ­ puedes colocar la parte relacionada con el sensor
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

      //instance.electronService.log("CONEXIONES Y DESCONEXION" , instance.reealNow.format('HH:mm:ss'));

      //Para la reconexion de la presion - Regula de acuerdo a la ultima presion guardada

      if(instance.connectedPresion !== previousSensorConnections.sensorPressure){

        //this.electronService.log(`El sensor ${sensorPressure} se ${this.connectedPresion ? 'conectÃ³' : 'desconectÃ³'}`);

        previousSensorConnections.sensorPressure = this.connectedPresion;

        instance.regulatePressureWithBars(0);

        setTimeout(async () => {
          instance.electronService.log("ENTRO AL SETTIMEOUT" )
          //Borrar mas adelantado
          const pressureReconexion = await JSON.parse(currentWork.configuration).pressure;
          instance.regulatePressureWithBars(pressureReconexion);

          if(instance.valvulaDerecha || instance.valvulaIzquierda){
            instance.activateRightValve();        
            instance.activateLeftValve();
  
            instance.data[Sensor.VALVE_RIGHT] = instance.valvulaDerecha;
            instance.data[Sensor.VALVE_LEFT] = instance.valvulaIzquierda;
          }
        }, 1000);

      }

      // Si se reconecta el sensor de caudal, recupera el valor del acumulador de volumen
      // Dentro de tu bloque de cÃ³digo donde manejas la reconexiÃ³n del sensor de caudal

      if (this.coneectedCaudal && !previousSensorConnections.sensorVolume && !isCurrentRealVolumeReset) {
        
        if(currentWork){
          
          let currentWorkPrueba: WorkExecutionDetail = await instance.databaseService.getLastWorkExecutionDetail(currentWork.id);
          if (currentWorkPrueba) {
            instance.previousAccumulatedVolume = JSON.parse(currentWorkPrueba.data)[Sensor.ACCUMULATED_VOLUME];
            instance.data[Sensor.ACCUMULATED_RESTAURAR] = instance.previousAccumulatedVolume;
            instance.datosCaudal = instance.previousAccumulatedVolume;
            isCurrentRealVolumeReset = true;
            previousSensorConnections.sensorVolume = true;
          }
        }   
      }

      // Compara el estado actual con el estado anterior para detectar cambios
      if (this.coneectedCaudal !== previousSensorConnections.sensorVolume) {
        /* this.electronService.log(`El sensor ${sensorVolume} se ${this.coneectedCaudal ? 'conectÃ³' : 'desconectÃ³'}`); */
        previousSensorConnections.sensorVolume = this.coneectedCaudal;

        // Si se desconecta el sensor de caudal, guarda el Ãºltimo valor vÃ¡lido del acumulador de volumen

        if (!this.coneectedCaudal) {

          if(currentWork){

            let currentWorkPrueba : WorkExecutionDetail = await instance.databaseService.getLastWorkExecutionDetail(currentWork.id);  

            if(currentWorkPrueba){
              //instance.previousAccumulatedVolume = JSON.parse(currentWorkPrueba.data)[Sensor.ACCUMULATED_VOLUME];
              /* this.electronService.log("RESTABLECIDO 2" , instance.previousAccumulatedVolume); */
            }

          }

        }

      }

      //OBTENER EL VALOR DEL GPS
      this.hasGPSData = this.data[Sensor.GPS] !== undefined && instance.data[Sensor.GPS] !== null && instance.data[Sensor.GPS] != this.gpsVar;

      //SI HAY DATOS ESTA EN TRUE Y SINO EN FALSE      
      if (instance.hasGPSData) {
        instance.dataGps = true;
      } else {
        instance.dataGps = false;
      }
      this.gpsVar = instance.data[Sensor.GPS];

      //MNOTIFICAR POR CADA CAMBIO DE LOS SENSORES
      Object.entries(this.data).forEach((value) => {

        let sensor = parseInt(value[0]) as Sensor;

        instance.notifySensorValue(sensor, sensor == Sensor.GPS ? value[1] as number[] : value[1] as number);

      }); 

      //instance.electronService.log("GPS Y DESCONEXION" , instance.reealNow.format('HH:mm:ss'));

      //OBTENER LA HORA ACTUAL PARA GUARDAR LOS SEGUNDOS
      instance.reealNow =  moment();

      if (!onExecution) {

        onExecution = true;

        const iteration = async () => {
          if (currentWork) {

            //CONDICION TIEMPO PRODUCTIVO E IMPRODUUCTIVO
            if (instance.data[Sensor.WATER_FLOW] > 0) {
              //instance.electronService.log("HAY CAUDAL");
                instance.tiempocondicion = 1;
              instance.tiempoProductivo.start();
              instance.tiempoImproductivo.stop();
              
              //Validacion de presion para la distancia recorrida
              if(instance.data[Sensor.PRESSURE] > 1.5 && instance.banderaDistancia && instance.data[Sensor.SPEED] > 0){

                // Registra las coordenadas GPS actuales
                instance.coordenadaInicial = instance.data[Sensor.GPS];
                //this.electronService.log("COORDENADA INICIAL" , instance.coordenadaInicial);
                instance.banderaDistancia = false;

              }else if(instance.data[Sensor.PRESSURE] <= 1.5 && !instance.banderaDistancia && instance.data[Sensor.SPEED] > 0){

                // Registra las coordenadas finales 
                instance.coordenadaFinal = instance.data[Sensor.GPS];

                const distanciaRecorridaMetros = getDistance(

                  { latitude : instance.coordenadaInicial[0] , longitude : instance.coordenadaInicial[1]},

                  { latitude : instance.coordenadaFinal[0] , longitude :instance.coordenadaFinal[1]},0.01

                );
                //Se acumulara la distancia en caso hay recorrido productivo
                instance.accumulated_distance += distanciaRecorridaMetros;
                instance.banderaDistancia = true;
              }

            } else{
              //ESTO ES PARA UANDO NO HAY CAUDAL 
              //instance.electronService.log("NO HAY CAUDAL");
              instance.tiempocondicion = 4;
              //instance.data[Sensor.VOLUME] = 0;
              instance.tiempoImproductivo.start();
              instance.tiempoProductivo.stop();
            }

    
            //instance.electronService.log("FIN DE CONDICION CAUDAL", instance.reealNow.format('HH:mm:ss'));

            //ACTUALIZAMOS EL VALOR EN LA VARIABLE CURRENT_TANK
            instance.data[Sensor.CURRENT_TANK] = instance.currentRealVolume;

            currentWork.downtime = instance.tiempoImproductivo.time();
            currentWork.working_time = instance.tiempoProductivo.time();

            await this.databaseService.updateTimeExecution(currentWork);
          }

          //SI HAY ALGU TRABAJO Y LA VARIABLE ESTA EN INSRUNNING = TRUE

          if (currentWork && instance.isRunning) {

            let gps = instance.data[Sensor.GPS];

            // Evaluar los eventos
            let events: string[] = [];
            let has_events = false;


            //PARA HALLAR LA PRECISION
            instance.precision = {
              ...instance.precision,
              [Sensor.WATER_FLOW] : 100,
              [Sensor.PRESSURE] : 100,
              [Sensor.GPS] : 100

              /* [Sensor.WATER_FLOW] : Math.round(100 - ((Math.abs(instance.data[`${Sensor.WATER_FLOW}`] - instance.caudalNominal)/instance.caudalNominal) * 100)),
              [Sensor.PRESSURE] : Math.round(100 - ((Math.abs(instance.data[`${Sensor.PRESSURE}`] - instance.info) / instance.info) * 100)),
              [Sensor.SPEED] : Math.round(100  - ((Math.abs(instance.data[`${Sensor.SPEED}`] - instance.speedalert) / instance.speedalert) * 100)), */
            }

            //EVENTO DE CAUDAL
            if (instance.data[Sensor.WATER_FLOW] > instance.caudalNominal * 0.90 && instance.data[Sensor.WATER_FLOW] < instance.caudalNominal * 1.1) {
            // Caudal Verde
            }else if ((instance.data[Sensor.WATER_FLOW] > instance.caudalNominal * 0.50 && instance.data[Sensor.WATER_FLOW] < instance.caudalNominal * 0.9) ||
              (instance.data[Sensor.WATER_FLOW] < instance.caudalNominal * 1.5 && instance.data[Sensor.WATER_FLOW] > instance.caudalNominal * 1.1)) {
              has_events = true;
              events.push("EL CAUDAL ESTA FUERA DEL RANGO ESTABLECIDO");
            } else {
              has_events = true;
              events.push("EL CAUDAL ESTA FUERA DEL RANGO ESTABLECIDO");
            }

            //EVENTO DE PRESION
            if (instance.data[Sensor.PRESSURE] > instance.info * 0.90 && instance.data[Sensor.PRESSURE] < instance.info * 1.1) {
            } else if ((instance.data[Sensor.PRESSURE] > instance.info * 0.50 && instance.data[Sensor.PRESSURE] < instance.info * 0.9) ||
              (instance.data[Sensor.PRESSURE] < instance.info * 1.5 && instance.data[Sensor.PRESSURE] > instance.info * 1.1)) {
              has_events = true;
              events.push("LA PRESION ESTA FUERA DEL RANGO ESTABLECIDO");
            } else {
              has_events = true;
              events.push("LA PRESION ESTA FUERA DEL RANGO ESTABLECIDO");
            }

            //EVENTO DE VELOCIDAD
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

            //EVENTOS DE CAUDAL - VELOCIDAD Y PRESION
            if ((instance.data[Sensor.PRESSURE] < instance.info * 0.50 || instance.data[Sensor.PRESSURE] > instance.info * 1.5) ||
              (instance.data[Sensor.WATER_FLOW] < instance.caudalNominal * 0.50 || instance.data[Sensor.WATER_FLOW] > instance.caudalNominal * 1.5) ||
              (instance.data[Sensor.SPEED] < instance.speedalert * 0.50 || instance.data[Sensor.SPEED] > instance.speedalert * 1.5)) {
              has_events = true;
              events.push("AL MENOS UN SENSOR FUERA DEL RANGO DEL 50%");
            }

            //instance.electronService.log("FIN DE EVENTOS", instance.reealNow.format('HH:mm:ss'));

            instance.reealNow = instance.reealNow.startOf('seconds');
           
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

            //instance.electronService.log("SE GUARDA EN LA BASE DE DATOS" , instance.reealNow.format('HH:mm:ss'));

            //GUARDAR ENM LA BASE DE DATOS  
            await instance.databaseService.saveWorkExecutionDataDetail(wExecutionDetail);

            //Reiniciar el volumen
            //instance.data[Sensor.VOLUME] = 0;
          } 
          
          onExecution = false;

        }

        //instance.electronService.log("FINALIZAR ITERACION" , instance.reealNow.format('HH:mm:ss'));

        //instance.electronService.log("********************************************************************");

        if (instance.reealNow.diff(instance.now, 'seconds') >= instance.tiempocondicion) {
          instance.now = instance.reealNow;
          //instance.electronService.log("SEGUNDO QUE SE EJECUTA" , instance.now.format('HH:mm:ss'));
          await iteration();
          instance.reealNow = instance.reealNow.startOf('seconds');
        }
      }
      //instance.data[Sensor.VOLUME] = 0;
    }, 200);
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



    //this.electronService.log("Comando Regulador" , `${regulatorId}|${barPressure}`);

  }

  //Metodo para resetear el volumen inicial y minimo
  public resetVolumenInit(): void {

    const command = 'B';

    this.findBySensor(Sensor.VOLUME).sendCommand(command);

    this.volumenReseteado = this.datosCaudal;

    this.calcularConsumo = true;

    this.electronService.log("VOLUMEN RESETEADO" , this.volumenReseteado);

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

    this.currentRealVolume = inicial;

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