import { Injectable } from '@angular/core';
import Redis from 'ioredis';
import { Observable, Subject } from 'rxjs';
import { Sensor } from '../../utils/global';
import { ElectronService } from '../electron/electron.service';
import { Store } from '@ngxs/store';
import { WaterFlow , Volumen , Pressure , RightValve , LeftValve , Gps , Speed } from './eventsSensors';

@Injectable({
  providedIn: 'root'
})
export class RedisService {
  private subscriberClient: Redis;
  private publisherClient: Redis;
  private isConnected: boolean = false;
  private commandSubject: Subject<string> = new Subject<string>();
  sensors: number[] = []; //Array para guardar los sensores
  mode: number = 0;
  private sensorSubjectMap: Map<Sensor, Subject<number|number[]>> = new Map();
  public message_from_device: Map<Sensor, number|number[]> = new Map();

  constructor(private store: Store, private electronService: ElectronService) {
    this.connectToRedis();
  }

  //Conexion para las instancias de Redis - Sub y Pub
  private connectToRedis(): void {
    const redisOptions = {
      host: '192.168.183.127', //Host  - cambiar la ip si se conectara a otra red
      //host : 'localhost',
      port: 6379, //Puerto predeterminado de redis
      maxRetriesPerRequest: 30, //Intentos para volver a conectarse
      connectTimeout: 10000,  // 10 segundos
    };

    this.subscriberClient = new Redis(redisOptions);
    this.publisherClient = new Redis(redisOptions);

    //Subscribirte al Cliente 
    this.subscriberClient.on('connect', () => {
      console.log('Conectaoo y suscrito a redis');
      
      //Variable booleana para determinar si se conecto el app con Redis
      this.isConnected = true;
      this.subscribeToCommands();
      this.subscribeToResponses();
    });

    //Controlador de error , en caso hubiera algun error al subscribirse o publicar
    this.publisherClient.on('error', (err) => {
      console.error('Error al conectar a Redis - publisher:', err);
    });

    this.subscriberClient.on('error', (err) => {
      console.error('Error al conectar a Redis - subscriber:', err);
    });
  }

  //Funcion para subscribirse al canala de 'commands'
  private subscribeToCommands(): void {
    if (!this.isConnected) {
      return;
    }

    this.subscriberClient.subscribe('commands');

    this.subscriberClient.on('message', (channel, message) => {
      this.processCommand(message);
    });
  }

  //Funcion para subscribirse al canal de responses
  private subscribeToResponses(): void {
    if (!this.isConnected) {
      return;
    }

    //Subscribirse a la instancia de redis y al anal responses
    this.subscriberClient.subscribe('responses');

    this.subscriberClient.on('message', (channel, message) => {
      console.log(message);
      this.processResponse(message);
    });
  }

  //Funcion para procesar los Comandos recibidos , no esta en funcionamiento actualmente   
  private processCommand(command: string): void {
    let commands = command.split('|');
    if (commands[0] === 'C') {
      this.sensors = commands[1].split(',').map((x: string) => parseInt(x, 10));
      console.log("SENSORES", this.sensors);
      console.log('Sending OK to Redis...');

      const response = 'OK';

      this.publisherClient.publish('responses', response, (err, res) => {
        if (err) {
          console.error('Error publishing response to Redis:', err);
        } else {
          console.log('Response published to Redis:', res);
        }
      });
    }
  }

  //Funcion para procesar las respuestas y/o valores que te envia el script de Python
  private processResponse(response: string): void {
    console.log(response);
    this.electronService.log("RESPONSES" , response);
      try {

        const parsedResponse = JSON.parse(response);
    
        for (const sensorId in parsedResponse) {
          if (parsedResponse.hasOwnProperty(sensorId)) {
            const value = parsedResponse[sensorId];
            this.commandSubject.next(`${sensorId}: ${value}`);
              
            let numericValue: number | null = null;
    
            if (typeof value === 'number' && !isNaN(value)) {
              numericValue = value;
            }
            //Se separa por tipos de sensores para disparar el evento y actualize el estado de cada sensor en el archivo eventsSensors.ts
            switch (parseInt(sensorId ,10)) {
              
              case Sensor.WATER_FLOW:
                if (numericValue !== null) {
                  const valSensorFlow = JSON.parse(`{"${Sensor.WATER_FLOW}" : ${numericValue}}`);
                  this.electronService.log("CAUDAL", valSensorFlow);
                  this.store.dispatch(new WaterFlow(valSensorFlow));
                }
                break;
    
              case Sensor.VOLUME:
                if (numericValue !== null) {
                  const valSensorVolume = JSON.parse(`{"${Sensor.VOLUME}" : ${numericValue}}`);
                  this.electronService.log("VOLUMEN", valSensorVolume);
                  this.store.dispatch(new Volumen(valSensorVolume));
                }
                break;

              case Sensor.PRESSURE:
                if (numericValue !== null) {
                  const valSensorPressure = JSON.parse(`{"${Sensor.PRESSURE}" : ${numericValue}}`);
                  this.electronService.log("PRESION", valSensorPressure);
                  this.store.dispatch(new Pressure(valSensorPressure));
                }
                break;
 
              case Sensor.VALVE_RIGHT:
                let valSensorValveRight = JSON.parse(`{"${Sensor.VALVE_RIGHT}" : ${value}}`);
                this.electronService.log("valSensorValveRight" , valSensorValveRight);
                this.store.dispatch(new RightValve(valSensorValveRight));
                break;

              case Sensor.VALVE_LEFT:
                let valSensorValveLeft = JSON.parse(`{"${Sensor.VALVE_LEFT}" : ${value}}`);
                this.electronService.log("valSensorValveLeft" , valSensorValveLeft);
                this.store.dispatch(new LeftValve(valSensorValveLeft));
                break;
    
              // Agregar otros casos según sea necesario
    
              default:
                console.log(`Sensor ID ${sensorId} no reconocido`);
                break;
            }
          }
        }
      } catch (error) {
        console.error('Error en el parseo de  JSON:', error);
        // Maneja el error según sea necesario
      }
  }
  
  //Funcion para enviar comandos al script de Python - En el arduino Service se hace uso de este metodo 
  public sendCommand(command: string): void {
    if (!this.isConnected) {
      console.error('No se encuentra conectado a Redis');
      return;
    }

    this.publisherClient.publish('commands', command, (err, res) => {
      if (err) {
        console.error('Error publicando comando a Redis:', err);
      } else {
        console.log('Comando publicado a Redis:', res);
      }
    });
  }

  //Funcion para obtener los comandos por medio de un Observable
  public getCommandObservable(): Observable<string> {
    return this.commandSubject.asObservable();
  }

  //Funcion para retornar el estado de la conexion de redis
  public isConnectedToRedis(): boolean {
    return this.isConnected;
  }

  //Funcion para controlar la desconexion de redis
  public disconnect(): void {
    if (this.subscriberClient) {
      this.subscriberClient.disconnect();
    }
    if (this.publisherClient) {
      this.publisherClient.disconnect();
    }
    this.isConnected = false;
  }
}
