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
import { AcumuladoRestaurar, AcumuladoVolumen, AcumularDistancia, SensorState, SetResetApp, UpdateCurrentTank , Volumen, restaurarDistancia, volumenRecuperado } from './eventsSensors';
import { WindowMaximizeIcon } from 'primeng/icons/windowmaximize';
import { waitForAsync } from '@angular/core/testing';
import { RedisService } from './redis.service';
import { Subscription } from 'rxjs';


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
  distanciaNgxs : number = 0;

  banderaPresion : boolean = false;
  configWork;

  sensorValues: string[] = [];
  currentWork: WorkExecution;
  lastPressure: number | null = null //Comparar las presiones;


  // private sensorSubjectMap: Map<Sensor, Subject<Sensor>> = new Map();

  private sensorSubjectMap: Map<Sensor, Subject<number|number[]>> = new Map();

  constructor( private electronService: ElectronService , private databaseService : DatabaseService , private store: Store, private redisService : RedisService) {

    this.setupSensorSubjects();
    this.checkInternetConnection();

    this.databaseService.getLastWorkExecution().then((workExecution : WorkExecution) => {
      
      if(workExecution){
        this.currentWork = workExecution;
        //this.electronService.log("CURRENTWORK" , this.currentWork);
        this.tiempoProductivo.set_initial(workExecution.working_time.format("HH:mm:ss"));
        this.tiempoImproductivo.set_initial(workExecution.downtime.format("HH:mm:ss"));
      } 

    });

    //Bucle para recorrer los dispositivos 
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
          this.valvulaIzquierda = dataValues[`${Sensor.VALVE_LEFT}`];
          this.valvulaDerecha = dataValues[`${Sensor.VALVE_RIGHT}`];

          //console.log("VOLUMEN RECUPERADO" , this.volumenRecuperado); 

          //Actualiza el estado del volumen
          this.store.dispatch(new volumenRecuperado ({ [`${Sensor.VOLUMEN_RECUPERADO}`]: this.volumenRecuperado }));
          // Actualiza el estado del volumen acumulado
          this.store.dispatch(new AcumuladoRestaurar({ [`${Sensor.ACCUMULATED_RESTAURAR}`]: this.volumenTotalRecuperado }));
          // Actualiza el estado con los valores restaurados
          this.store.dispatch(new UpdateCurrentTank(this.currentTankRecuperado, true));
          //Para restaurar la distancia acumulada 
          this.store.dispatch(new restaurarDistancia({ [`${Sensor.ACCUMULATED_HECTARE}`]: this.accumulated_distance }));
          this.store.dispatch(new SetResetApp (false));
        }

      });

      this.isServiceRestarting = false
    }
  
    let database$ = this.store.select(SensorState.evaluarDispositivos).subscribe({
      next: async (value) =>{

        try {
          if(value && value.data && this.currentWork && this.currentWork.configuration){

            //OBTENER LA HORA ACTUAL PARA GUARDAR LOS SEGUNDOS
            this.reealNow =  moment();
            
            let data = JSON.parse(value.data);

            //Para poder regular la presion a la configurada anteriormente
            if(!this.banderaPresion){
              let presion = JSON.parse(this.currentWork.configuration).pressure;
              this.regulatePressureWithBars(presion);
              if(this.valvulaIzquierda && this.valvulaDerecha){
                this.activateRightValve(); 
                this.activateLeftValve();       
              }else if(this.valvulaIzquierda){
                this.activateLeftValve(); 
              }else if(this.valvulaDerecha){
                this.activateRightValve(); 
              }

              this.banderaPresion = true;
            }


            //Para hallar la presion de acuerdo a la velocidad - Comentar de acuerdo al uso
           /*  this.regularPresionSiCambio(data[`${Sensor.SPEED}`]);
            this.electronService.log("Velocidad" , data[`${Sensor.SPEED}`]); */
            
            //Condicion para verificar los eventos y actualiarlos sea el caso
            if(this.currentWork && this.currentWork.configuration){

              //Para compara los eventos
              this.caudalNominal = JSON.parse(this.currentWork.configuration).water_flow;
              this.info = JSON.parse(this.currentWork.configuration).pressure;
              this.speedalert = JSON.parse(this.currentWork.configuration).speed;
              
              //Condicion para tiempo productivo e improductivo y condicion de guardado en la base de datos
              if(data[`${Sensor.WATER_FLOW}`] > 0){
                this.tiempoProductivo.start();
                this.tiempoImproductivo.stop();
                this.tiempocondicion = 1;
              }else{
                this.tiempoImproductivo.start();
                this.tiempoProductivo.stop();
                this.tiempocondicion = 4;
              }

               // Evaluar los eventos
              let events: string[] = [];
              let has_events = false;

              //Almacenar el tiempo productivo e improductivo
              this.currentWork.downtime = this.tiempoImproductivo.time();
              this.currentWork.working_time = this.tiempoProductivo.time();

              //Actualizar el tiempo de ejecucion del trabajo 
              await this.databaseService.updateTimeExecution(this.currentWork);
              

              //Condicion para hallar la distancia recorrida productiva - NO NOLVIDAR PONER LA CONDICION DE LA VELOCIDAD > 0 
              if(data[`${Sensor.WATER_FLOW}`] > 0 && this.banderaDistancia && data[`${Sensor.PRESSURE}`] > 1.5 && data[`${Sensor.SPEED}`] > 0){
                // Registra las coordenadas GPS actuales
                this.coordenadaInicial = data[`${Sensor.GPS}`];
                //this.coordenadaInicial = [-14.226863988770043, -75.7029061667782],
                this.electronService.log("Primera condicion y corrdenada Inicial" , this.coordenadaInicial);
                this.banderaDistancia = false;

              }else if(data[`${Sensor.WATER_FLOW}`] >= 0 && !this.banderaDistancia && data[`${Sensor.PRESSURE}`] <= 1.5 && data[`${Sensor.SPEED}`] > 0){

                // Registra las coordenadas finales 
                this.coordenadaFinal = data[`${Sensor.GPS}`];
                this.electronService.log("Segunda condicion y corrdenada Final" , this.coordenadaFinal);

                const distanciaRecorridaMetros = getDistance(
                  { latitude : this.coordenadaInicial[0] , longitude : this.coordenadaInicial[1]},
                  { latitude : this.coordenadaFinal[0] , longitude : this.coordenadaFinal[1]},0.01
                );
                      
                this.distanciaNgxs += distanciaRecorridaMetros;
                this.electronService.log("DISTANCIA PRODUCTIVA" , this.distanciaNgxs);

                this.store.dispatch(new AcumularDistancia({ [`${Sensor.ACCUMULATED_HECTARE}`]: this.distanciaNgxs }));
                this.banderaDistancia = true;
              }

              //Condicion para dar los eventod
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
              value.id_work_execution = this.currentWork.id;
              value.has_events = has_events;
              value.events = events.join(", ");
              value.time = value.time.startOf('seconds');
            }
            
            //Seconds - actualizar el valor de el time
            this.reealNow = this.reealNow.startOf('seconds');

            //Condicion para guardar en la base de datos cada 4 segundos si no hay caudal y si hay cada 1 segundo
            if (this.reealNow.diff(this.now, 'seconds') >= this.tiempocondicion) {
              this.now = this.reealNow;
              if(this.currentWork && this.isRunning){
                await this.databaseService.saveWorkExecutionDataDetail(value);
              } 
            }           
          } 
        } catch (error) {
            this.electronService.log("ERROR ARDUINO SERVICE" , error);
        }
 
      },

    });

  }

  //Funcion para buscar por sensor en los dispositivos - Actualmente solo funciona cuando se trabajara con arduinos o puertos seriales
  findBySensor(sensor : number): ArduinoDevice{
    return this.listArduinos.find(p => p.sensors.some(x => x == sensor))!;
  }
  
  //Metodo no usado por el momento
  public mapToObject(map: Map<any, any>): { [key: string]: any } {
    const obj: { [key: string]: any } = {};
    map.forEach((value, key) => {
      if (key !== undefined) {
        obj[key.toString()] = value;
      }
    });

    return obj;

  }

  // Función para calcular la presión basada en la velocidad
  public calcularPresion(velocidad: number): number {
    // Definición del factor de calibración y el offset
    const FACTOR_CALIBRACION: number = 1.50; // Ejemplo de valor
    const OFFSET: number = -1.99; // Ejemplo de valor, ajusta según sea necesario
    // Aplica la fórmula para calcular la presión
    const presion = FACTOR_CALIBRACION * velocidad + OFFSET;  
    const presionRedondeada = Math.round(presion * 10) / 10; // Redondea a un decimal
    this.electronService.log("PRESION CALCULADA" , presionRedondeada);
    return presionRedondeada;
  }

  // Método para enviar el valor de presión que se le asignará si hay un cambio significativo
  public regularPresionSiCambio(velocidad: number): void {

    const presionActual = this.calcularPresion(velocidad);
    this.electronService.log("Se obtuvo la presion actual" , presionActual);

    if (this.lastPressure === null || Math.abs(presionActual - this.lastPressure) >= 0.5) {
      this.regulatePressureWithBars(presionActual);
      this.electronService.log("Entro a la funcion para regular" , presionActual);
      this.lastPressure = presionActual;
    } else {
      console.log("No hay cambio significativo en la presión, no se enviará comando.");
    }

  }

  //Metodo para enviar el valor de presion que se le asignara
  public regulatePressureWithBars(bars: number): void {

    const regulatorId = Sensor.PRESSURE_REGULATOR;
    // Convertir el valor de bares segÃºn sea necesario, por ejemplo, asumamos que estÃ¡ en la misma unidad que se usÃ³ en el script original
    const barPressure = bars;
    // Aqui­ deberas incluir la logica para enviar el comando al dispositivo, por ejemplo:
    const command = JSON.stringify({ 22 : barPressure });
    this.redisService.sendCommand(command);
    this.electronService.log("Comando Regulador" , `${regulatorId}|${barPressure}`);
    
  }

  //Metodo para resetear el volumen inicial y minimo
  public resetVolumenInit(): void {

    const command = JSON.stringify({ 5 : 'B' }); // Formato del comando según tu requerimiento
    this.redisService.sendCommand(command);
    //envia 0 al volumen recuperado para reiniciarlo
    this.store.dispatch(new volumenRecuperado({ [`${Sensor.VOLUMEN_RECUPERADO}`]: 0 }));

  }
  
  //Metodo para poder saber si un Arduino/Sensor esta conectado o no
  public isSensorConnected(sensor: Sensor): boolean {
    // Encuentra el Arduino que contiene el sensor
    const arduino = this.listArduinos.find(a => a.sensors.includes(sensor));
    // Si se encuentra el Arduino y estÃ¡ conectado, el sensor tambiÃ©n estÃ¡ conectado
    return !!arduino && arduino.isConnected;

  }
  
  //Funcion para inicializar el trabajo con las siguientes variables
  inicializarContenedor(inicial: number, minimo: number): void {

    this.initialVolume = inicial;
    //console.log("initial arduino servie" , this.initialVolume);
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

  //Fucion sin utilizr actualmente
  public conteoPressure(): void {
    const command = 'E';
    this.findBySensor(Sensor.PRESSURE).sendCommand(command);
  }

  // MÃ©todo para activar la vÃ¡lvula izquierda
  public activateLeftValve(): void {

    this.izquierdaActivada = true;
    this.store.dispatch(new ActivateLeftValve());
    const command = JSON.stringify({ 20 : true });
    this.redisService.sendCommand(command);
    this.electronService.log("Comando activar valvula izquierda", command);

  }

  // MÃ©todo para desactivar la vÃ¡lvula izquierda
  public deactivateLeftValve(): void {

    this.izquierdaActivada = false;
    this.store.dispatch(new DeactivateLeftValve());
    const command = JSON.stringify({ 20 : false });
    this.redisService.sendCommand(command);
    this.electronService.log("Comando desactivar valvula izquierda", command);

  }

  // MÃ©todo para activar la vÃ¡lvula derecha
  public activateRightValve(): void {

    this.derechaActivada = true;
    this.store.dispatch(new ActivateRightValve());
    const command = JSON.stringify({ 21 : true });
    this.redisService.sendCommand(command);
    this.electronService.log("Comando activar valvula derecha", command);

  }

  // MÃ©todo para desactivar la vÃ¡lvula derecha
  public deactivateRightValve(): void {

    this.derechaActivada = false;
    this.store.dispatch(new DeactivateRightValve());
    const command = JSON.stringify({ 21 : false });
    this.redisService.sendCommand(command);
    this.electronService.log("Comando desactivar valvula derecha", command);

  }

  //Funcin para actuvar las 2 electrovalvulas
  public activateBothValves(): void {

    this.store.dispatch(new ActivateBothValves());
    const commandTwo= JSON.stringify({ 20 : true , 21 : true});
    this.redisService.sendCommand(commandTwo);
    this.electronService.log("Comando activar valvula derecha", commandTwo);

  }

  //Funcion para desactivar las 2 electrovalvulas
  public deactivateBothValves(): void {

    this.store.dispatch(new DeactivateBothValves());
    const commandTwo = JSON.stringify({ 20 : false , 21 : false });
    this.redisService.sendCommand(commandTwo);
    this.electronService.log("Comando desactivar valvula derecha", commandTwo);

  }

  //Funcion para saber si hay conexion a internet
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
    const sensorTypes: Sensor[] = Object.values(Sensor).filter(value => typeof value === 'number') as Sensor[];
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