import { Injectable } from '@angular/core';
import { SerialPort} from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline'
import { ElectronService } from '../electron/electron.service';
import { Sensor } from '../../utils/global';
import { Store } from '@ngxs/store';

//Importacion del observable para el uso de las funciones reactivas para obtener los datos de los sensores
import { Observable, Subject } from 'rxjs';
import { WaterFlow , Volumen , Pressure , RightValve , LeftValve , Gps , Speed} from './eventsSensors';

export class ArduinoDevice {
  private isRunning: boolean = false;
  private manualSetting : boolean = true;
  sensors: number[] = [];
  mode: number = 0;
  private port: any;
  private message_to_device : string[] = [];
  public message_from_device: Map<Sensor, number|number[]> = new Map();

  // Guarda los valores 
  private savedValues:Map<Sensor, number | number[]> = new Map();;

  private messageInterval: any;
  private SensorWatterflow: any;
  private SensorVolumen:any;
  private on_status_changed: any;

  /* Variables para conexion y reconexion */
  private isReconnecting: boolean = false;
  public isConnected: boolean = false;


  //Creamos un sujeto (Subject) por cada sensor
  private sensorSubjectMap: Map<Sensor, Subject<number|number[]>> = new Map();

  private sensorWatterFlowSubject: Subject<Sensor> = new Subject<Sensor>();
  private sensorVolumeSubject: Subject<Sensor> = new Subject<Sensor>();

  //Este se comporta como el serial_device

  constructor(
    public path: string,public baudrate: number,public autoOpen: boolean,
    private electronService: ElectronService,
    private store: Store,
  ) {
      this.connectToDevice(path, baudrate,autoOpen);

      //Enviar este comando para requerir de nuevo que el dispositivo serial te mande de nuevo 'C|1|"Sensores"'
      this.sendCommand('RECONFIGURE');
  }

  //Metodo para conectarse con los dispositivo seriales - Ojo solo sirve esta logica si se trabaja con Arduinos o con los pines TX y RX
  private connectToDevice(port: string, baudrate: number,autoOpen : boolean): void {
    try {
      this.port = new this.electronService.serialPort.SerialPort({ path: port , baudRate: baudrate,autoOpen : autoOpen});
      this.isConnected = true;

      // Agrega el parser readline para facilitar la lectura de líneas
      // Método para manejar la reconexión en caso de desconexión
      const handleReconnect = () => {
        if (!this.isReconnecting) {
          this.isReconnecting = true;  
          this.isConnected = false;
          //console.log('Arduino disconnected. Reconnecting...' , this.isReconnecting);
          
          // Intentar reconectar después de un breve período
          setTimeout(() => {
              this.connectToDevice(port, baudrate, autoOpen);
              this.isReconnecting = false;
          }, 7000);
        }
      };

      // Manejar eventos de conexión y desconexión
      this.port.on('close', handleReconnect);
      this.port.on('error', handleReconnect);

      //variable para instanciar el this dentro de una funcion : clearInterval()
      let instance = this;

      //Metodo suplente del while
      this.messageInterval = setInterval(function(){
        //console.log("isConnected" , instance.isConnected);
        //Obtener en la variable message los datos de bufffer mediante read()
        let message: Uint8Array | null = instance.port.read();
        //console.log("MENSAJE" , message);
        if(message != null){
          //Conversion de los datos de la variable message y convertirlosm a formato utf-8
          const messagedecode: string = new TextDecoder('utf-8').decode(message);
          //console.log("MENSAHE CODEADO" , messagedecode);
          //Se separa por la funcion split
          let messageBuffer = messagedecode.split('|');
          //console.log("MESAJE DEL BUFFER" , messageBuffer);

          if(messageBuffer[0] == 'C'){
            instance.mode = parseInt(messageBuffer[1]);
            //console.log("MODO" , instance.mode);
            instance.sensors = messageBuffer[2].split(',').map((x: string) => parseInt(x, 10));
            //console.log("SENSIRES" , instance.sensors);
            instance.port.write(Buffer.from('OK\n', 'utf-8'));
            instance.isRunning = true;
            const parser = instance.port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
            //console.log("PARSER" , parser);
            instance.listenToDevice(parser);
            clearInterval(instance.messageInterval);
            //console.log("MENSAJE" , instance.messageInterval);
          }

        }else if(instance.manualSetting){
          instance.isRunning = true;
        }
      },1000);
    } catch (error) {
      console.error('Error connecting to Arduino:', error);
    }
  }

  //Metodo para obtener los valores que llegan de los arduinos
  private listenToDevice(parser: any): void {
    parser.on('data', (data: string) => {
      
      //Guardar en data y darle un split
      const values = data.trim().split('|');
      
      //Recorrer el valor y pasarle los parametros value y index que seri el indicador del sensor
      values.forEach((value : string, index : number) => {
        
        //Guardar en una constante el indice de cada sensor guardadoe en el array de Sensores
        const sensorId = this.sensors[index];

        //Crear array numerica de los valores
        let numericValue : number | number[];

        //Condicion para formatear la longitud - latitud para obtener las coordenadas del GPS
        if(sensorId == Sensor.GPS){
            numericValue = value.split(',').map(v => parseFloat(v));
            let valSensor = JSON.parse(`{"${Sensor.GPS}" : ${JSON.stringify(numericValue)}}`);
            this.electronService.log("valSensor" , valSensor);
            this.store.dispatch(new Gps(valSensor));
            this.port.write(Buffer.from('OK\n', 'utf-8'));
        }
        else{
          //Switch para evaluar cada caso de acuerdo al indice de cada Sensor conectado
          switch (sensorId){
            
            //Caso para el Caudal
            case Sensor.WATER_FLOW:
              const flowValue = parseFloat(value);
              if (!isNaN(flowValue)) {
                let valSensorFlow = JSON.parse(`{"${Sensor.WATER_FLOW}" : ${flowValue}}`);
                //this.electronService.log("CAUDAL", valSensorFlow);
                this.store.dispatch(new WaterFlow(valSensorFlow));
              } else {
                this.port.write(Buffer.from('OK\n', 'utf-8'));
                //this.electronService.log("ERROR", `Invalid value for WATER_FLOW: ${value}`);
              }
              
              break;
            
            //Caso para el Volumen
            case Sensor.VOLUME:
                const volumeValue = parseFloat(value);
                if (!isNaN(volumeValue)) {
                  let valSensorVolume = JSON.parse(`{"${Sensor.VOLUME}" : ${volumeValue}}`);
                  this.electronService.log("VOLUMEN", valSensorVolume);
                  this.store.dispatch(new Volumen(valSensorVolume));
                } else {
                  this.port.write(Buffer.from('OK\n', 'utf-8'));
                  //this.electronService.log("ERROR", `Invalid value for VOLUME: ${value}`);
                }
                break;
                
            //Caso para la presion
            case Sensor.PRESSURE:
              let valSensorPressure = JSON.parse(`{"${Sensor.PRESSURE}" : ${value}}`);
              //this.electronService.log("PRESSURE" , valSensorPressure);
              this.store.dispatch(new Pressure(valSensorPressure));
              break;

            //Caso para la valvula Derecha
            case Sensor.VALVE_RIGHT:
              let valSensorValveRight = JSON.parse(`{"${Sensor.VALVE_RIGHT}" : ${value}}`);
              //this.electronService.log("valSensorValveRight" , valSensorValveRight);
              this.store.dispatch(new RightValve(valSensorValveRight));
              break;

            //Caso para la valvula Izquierda
            case Sensor.VALVE_LEFT:
              let valSensorValveLeft = JSON.parse(`{"${Sensor.VALVE_LEFT}" : ${value}}`);
              //this.electronService.log("valSensorValveLeft" , valSensorValveLeft);
              this.store.dispatch(new LeftValve(valSensorValveLeft));
              break;
            
            //Caso para la velocidads
            case Sensor.SPEED:
              const valorSpeed = parseFloat(value)
              if(!isNaN(valorSpeed)){
                let valSensorSpeed = JSON.parse(`{"${Sensor.SPEED}" : ${valorSpeed}}`);
                //this.electronService.log("valSensorSpeed" , valSensorSpeed);
                this.store.dispatch(new Speed(valSensorSpeed));
              }

              break;
              
          }
        }

        //Guardar en la variable el valor parseado a Float de 'value'
        numericValue = parseFloat(value);

        const sensorType = sensorId;

        if(this.sensorSubjectMap.has(sensorType)){
          this.sensorSubjectMap.get(sensorType)!.next(numericValue);
        }
        this.message_from_device.set(sensorType, numericValue);
        //console.log("MESSAGE" , this.message_from_device);

        //this.arduinoService.notifySensorValue(sensorType, numericValue);
      });
      
      this.saveCurrentValues();
    });
  }

  /* METODO SIN USAR - ELIMINAR SI LO REQUIERA */
  private saveCurrentValues(): void {
    // Guardar los valores actuales de los sensores
    this.savedValues = new Map(this.message_from_device);
    //console.log("GUARDADO" , this.savedValues);
  }

  //Metodo para enviar comandos de la aplicacion a Dispositivo Serial
  public sendCommand(command: string): void {
    if (this.port && this.port.writable) {
      this.port.write(`${command}\n`, 'utf-8', (error : any) => {
        if (error) {
          console.error('Error writing to Arduino:', error);
        } else {
          //console.log('Command sent to Arduino:', command);
        }
      });
    }
  }

  //Metodo para manejar la desconexion
  public disconnect(): void {
    if (this.port) {
      this.port.close((error : any) => {
        if (error) {
          console.error('Error closing connection:', error);
        } else {
          //console.log('Disconnected from Arduino');
          this.isConnected = false;
          /* this.restoreSavedValues(); */
        }
      });
    }
  }

  /* METODO SIN USAR - ELIMINAR SI LO REQUIERA */
  public  mapToObject(map: Map<any, any>): { [key: string]: any } {
    const obj: { [key: string]: any } = {};
    map.forEach((value, key) => {
      obj[key.toString()] = value;
    });
    return obj;
  }
}