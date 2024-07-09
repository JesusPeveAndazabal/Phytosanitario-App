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
      this.sendCommand('RECONFIGURE');
      /* this.setupSensorSubjects(); */
  }

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
          console.log('Arduino disconnected. Reconnecting...' , this.isReconnecting);

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
          }/* else if(messageBuffer[0] >= '0'){
            instance.mode = 1;
            //console.log("MODO DE CAUDAL" , instance.mode);
            instance.sensors = [5,2];
            //console.log("SENSIRES DE CAUDAL" , instance.sensors);
            instance.port.write(Buffer.from('OK\n', 'utf-8'));
            instance.isRunning = true;
            const parser = instance.port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
            //console.log("PARSER DE CAUDAL" , parser);
            instance.listenToDevice(parser);
            clearInterval(instance.messageInterval);
            //console.log("MENSAJE DE CAUDAL" , instance.messageInterval);
          } */

        }else if(instance.manualSetting){
          instance.isRunning = true;
        }
      },1000);
    } catch (error) {
      console.error('Error connecting to Arduino:', error);
    }
  }

  private listenToDevice(parser: any): void {
    parser.on('data', (data: string) => {
      //console.log(data);
      const values = data.trim().split('|');
      // Assuming values represent sensor readings
      this.electronService.log("VALORES DE VALUES " , values);

      
      values.forEach((value : string, index : number) => {
        //Sensor id es igual a sensor type
        const sensorId = this.sensors[index];
        //El valor de cada sensor
        let numericValue : number | number[];
        if(sensorId == Sensor.GPS){
          numericValue = value.split(',').map(v => parseFloat(v));
          let valSensor = JSON.parse(`{"${Sensor.GPS}" : ${JSON.stringify(numericValue)}}`);
          this.electronService.log("valSensor" , valSensor);
          this.store.dispatch(new Gps(valSensor));
        }
        else{
          switch (sensorId){
            
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
            
            case Sensor.VOLUME:
                const volumeValue = parseFloat(value);
                if (!isNaN(volumeValue)) {
                  let valSensorVolume = JSON.parse(`{"${Sensor.VOLUME}" : ${volumeValue}}`);
                  //this.electronService.log("VOLUMEN", valSensorVolume);
                  this.store.dispatch(new Volumen(valSensorVolume));
                } else {
                  this.port.write(Buffer.from('OK\n', 'utf-8'));
                  //this.electronService.log("ERROR", `Invalid value for VOLUME: ${value}`);
                }
                break;
                
            case Sensor.PRESSURE:
              let valSensorPressure = JSON.parse(`{"${Sensor.PRESSURE}" : ${value}}`);
              //this.electronService.log("PRESSURE" , valSensorPressure);
              this.store.dispatch(new Pressure(valSensorPressure));
              break;

            case Sensor.VALVE_RIGHT:
              let valSensorValveRight = JSON.parse(`{"${Sensor.VALVE_RIGHT}" : ${value}}`);
              //this.electronService.log("valSensorValveRight" , valSensorValveRight);
              this.store.dispatch(new RightValve(valSensorValveRight));
              break;

            case Sensor.VALVE_LEFT:
              let valSensorValveLeft = JSON.parse(`{"${Sensor.VALVE_LEFT}" : ${value}}`);
              //this.electronService.log("valSensorValveLeft" , valSensorValveLeft);
              this.store.dispatch(new LeftValve(valSensorValveLeft));
              break;
              
            case Sensor.SPEED:
              let valSensorSpeed = JSON.parse(`{"${Sensor.SPEED}" : ${value}}`);
              //this.electronService.log("valSensorSpeed" , valSensorSpeed);
              this.store.dispatch(new Speed(valSensorSpeed));
              break;
          }
        }

        numericValue = parseFloat(value);

        //Sensor type = 2/5
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

  private saveCurrentValues(): void {
    // Guardar los valores actuales de los sensores
    this.savedValues = new Map(this.message_from_device);
    //console.log("GUARDADO" , this.savedValues);
  }

/*   private restoreSavedValues(): void {
   // Verifica si hay valores guardados para restaurar
  if (this.savedValues.size > 0) {
    // Itera sobre los valores guardados y los envía al dispositivo Arduino nuevamente
    this.savedValues.forEach((SensorType, numericValue) => {
      // Envía el valor al dispositivo Arduino utilizando el servicio adecuado
      this.message_from_device.set(SensorType, numericValue);
    });
    // Limpia los valores guardados después de restaurarlos
    this.savedValues.clear();
    }
  } */

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

  public disconnect(): void {
    if (this.port) {
      this.port.close((error : any) => {
        if (error) {
          console.error('Error closing connection:', error);
        } else {
          console.log('Disconnected from Arduino');
          this.isConnected = false;
          /* this.restoreSavedValues(); */
        }
      });
    }
  }


  public  mapToObject(map: Map<any, any>): { [key: string]: any } {
    const obj: { [key: string]: any } = {};
    map.forEach((value, key) => {
      obj[key.toString()] = value;
    });
    return obj;
  }
}