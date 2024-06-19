import { interval, startWith, switchMap } from 'rxjs';
import { ArduinoService } from '../../../core/services/arduino/arduino.service';
import { WorkExecution } from './../../../core/models/work-execution';
import { Sensor, config } from './../../../core/utils/global';
import { ChangeDetectorRef, Component, EventEmitter, Injectable, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
import { DatabaseService } from '../../../core/services';
import { LocalConf } from '../../../core/models/local_conf';
import { ToastController } from '@ionic/angular';
import { ValveState, ActivateLeftValve, DeactivateLeftValve, ActivateRightValve, DeactivateRightValve } from '../../../core/state/valve.state';
import { Select, Store } from '@ngxs/store';
import { Observable } from 'rxjs';
// import { WebSocketClientService } from 'src/app/core/services/services';
// import { Sensor, SocketEvent,config } from 'src/app/core/utils/global';
@Injectable({
  providedIn: 'root',
})
@Component({
  selector: 'app-volume',
  templateUrl: './volume.component.html',
  styleUrls: ['./volume.component.scss'],
})
export class VolumeComponent  implements OnInit,OnChanges {
  leftControlActive$: Observable<boolean>;
  rightControlActive$: Observable<boolean>;
  bothControlsActive$: Observable<boolean>;

  @Input("wExecution") wExecution! : WorkExecution;
  @Input("leftControlActive") leftControlActive : boolean = false;
  @Input("rightControlActive") rightControlActive : boolean = false;
  @Input("maxCurrentVolume") maxVolume : number = 0;
  @Input("currentVolume") volume : number = 0;
  @Input("currentPh") currentPh : number = 0;
  @Input("latitudGPS") latitudGPS : number = 0;
  @Input("longitudGPS") longitudGPS : number = 0;


    // Output
  // @Output() leftControlActiveChange: EventEmitter<boolean> = new EventEmitter<boolean>();
  // @Output() rightControlActiveChange: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output("onLeftChange") onLeftChange = new EventEmitter<boolean>();
  @Output("onRightChange") onRightChange = new EventEmitter<boolean>();
  // @Output("leftControlActiveOP") leftControlActiveOP = new EventEmitter<boolean>();
  // @Output("rightControlActiveOP") rightControlActiveOP = new EventEmitter<boolean>();

  public derechaActiva: boolean = false;
  public izquierdaActiva: boolean = false;
  public bothControlsActive: boolean = false;
  private container! : Wave;
  public recargarTanque : boolean = false;
  // En tu componente de Angular
  hidden: boolean = false;
  public shouldBlink: boolean = false;
  localConfig! : LocalConf;
  minVolume: number = 0;
  // currentVolume = 20;
  percentVolume = 0;
  derecha: boolean = false;
  izquierda: boolean = false;
  distanciaTramo = 0;
  consumoTotal = 0;

  public alertaRecarga : boolean = false;
  toast: any; // Variable para almacenar el toast


  distance: number = 0;
  distanceCalculo : number = 0;

  valueVelocidad = 0;
  valueCalculo = 0;
  work;
  consumo = 0;
  prenderValvulas : boolean = true;
  valorIsRunning : boolean = false;
  banderaValvulas : boolean = false;

  distance2: number = 0;
  private valvulasApagadas: boolean = false;  // Bandera para controlar si las válvulas ya han sido apagadas

  //volumenInicial = 200; // Define tu volumen inicial aquí
  constructor(public arduinoService :ArduinoService, private store: Store , private dbService: DatabaseService,private changeDetectorRef: ChangeDetectorRef, public toastController : ToastController) {

   }

  ngOnChanges(changes: SimpleChanges) {
    if(this.wExecution){

      this.setVolume(this.volume);
      console.log("VOLUME" , this.volume);
    }
    // this.shouldBlink= true;
  }

  async ngOnInit() {
    //this.setVolume(40);
    // this.animateWaves();
    // this.shouldBlink= true;
    this.leftControlActive$ = this.store.select(ValveState.leftValveActive);
    this.rightControlActive$ = this.store.select(ValveState.rightValveActive);
    this.bothControlsActive$ = this.store.select(ValveState.bothValvesActive); // Debes definir this.bothValvesActive en el ValveState
    this.localConfig = await this.dbService.getLocalConfig();
    let obtenerLabor = await this.dbService.getLastWorkExecution();
    let workListado = await this.dbService.getWorkData();
    this.consumo = JSON.parse(this.wExecution.configuration).consume;

    // Obtener el id del último trabajo ejecutado
    const workId = obtenerLabor.work;

    // Buscar el objeto en workListado cuyo id coincida con workId
    this.work = workListado.find(item => item.id === workId);
    
    // Imprimir el nombre de la labor si se encontró el trabajo
    if (this.work.name) {
        //console.log(this.work.name);
    } else {
        console.log('No se encontró la labor correspondiente.');
    }

    this.minVolume = this.localConfig.vol_alert_on;
    const intervalObservable = interval(1000); // Puedes ajustar el intervalo según sea necesario

    this.arduinoService.getSensorObservable(Sensor.ACCUMULATED_HECTARE).subscribe((value: number) => {
      this.valorIsRunning = this.arduinoService.isRunning;
      let ancho = JSON.parse(this.wExecution.configuration).width;
      //console.log("valor metros", value);
      this.valueVelocidad = value;
      this.distance = (value * ancho)/10000;
      this.distance = parseFloat(this.distance.toFixed(4));    
      //console.log("Valor de la distancia" , this.distance.toFixed(2));
    });

    // Suponiendo que tienes una variable volumenInicial definida en tu clase

    interval(1000).pipe(
      startWith(0), // Emite un valor inicial para que comience inmediatamente
      switchMap(() => this.arduinoService.getSensorObservable(Sensor.VOLUME))
    ).subscribe((valorDelSensor: number) => {

      // Actualiza el volumen actual en tu clase
      this.consumoTotal = this.arduinoService.datosCaudal;
      this.volume = this.arduinoService.currentRealVolume;
      this.volume = parseFloat(this.volume.toFixed(2));
      
      
      if (this.volume < this.minVolume && this.arduinoService.isRunning) {
        this.recargarTanque = true;
        this.arduinoService.previousAccumulatedVolume = 0;
        if (!this.valvulasApagadas) {
          //COMENTADO POR AHORA
        /*   this.toggleAmbasValvulas();
          this.valvulasApagadas = true;  // Marca las válvulas como apagadas */
        }
      } else if (this.volume >= this.minVolume) {
        this.shouldBlink = false;
        this.recargarTanque = false;
        this.valvulasApagadas = false;  // Restablece la bandera cuando el volumen está por encima del mínimo
      }
    });


    this.container = new Wave({
      unit: 10, // wave size
      info: {
        infoSeconds: 0,
        infoTime: 0,
      },
      animationFrame: .014,
      timeoutSecond: 35,
      el: '#animation-frame',
      colorList: ['#0ff'] ,
      opacity: [0.8] ,
      zoom: [3],
      startPosition: [0],
      lineWidth: 1 ,
      xAxis: 10,
      yAxis: 0,
      stroke: true,
      fill: true,
      // canvasWidth: 400,
      // canvasHeight: 300,
    });
  }

  get maxCurrentVolume(): number {
    return config.maxVolume;
  }

  get currentPercentVolume(): number {
    this.percentVolume = parseFloat((100 * this.volume / config.maxVolume).toFixed(2));
    // console.log(this.percentVolume, "percent volume 1");
    this.percentVolume = isNaN(this.percentVolume) ? 0 : this.percentVolume;
    return this.percentVolume;
  }

  setVolume(volume: number){
    this.volume = parseFloat(volume.toFixed(2));
    this.percentVolume = isNaN(this.percentVolume) ? 0 : this.percentVolume;
    this.container.xAxis = this.map(this.volume, 0, this.maxCurrentVolume, this.container.canvas.height, 0);
    console.log(this.container.xAxis);
    this.container.update();
  }

  // toggleValvulaDerecha($event : any):void{
  //   this.arduinoService.toggleValvulaDerecha();
  // }
  toggleValvulaDerecha():void{
    this.store.selectOnce(ValveState.rightValveActive).subscribe(isActive => {
      if (isActive) {
        this.arduinoService.deactivateRightValve();
      } else {
        this.arduinoService.activateRightValve();
      }
    });
  }

  /* Sirve para apagar las 2 valvulas */
  apagarValvulas():void{
    this.leftControlActive = false;
    this.rightControlActive = false;
    this.bothControlsActive = false;
    console.log("ESTADO IZQUIERDA", this.rightControlActive);
    console.log("ESTADO DERECHA", this.leftControlActive);
    this.arduinoService.deactivateLeftValve();
    this.arduinoService.deactivateRightValve();
    //this.changeDetectorRef.detectChanges();
  }

  toggleValvulaIzquierda():void{
    this.store.selectOnce(ValveState.leftValveActive).subscribe(isActive => {
      if (isActive) {
        this.arduinoService.deactivateLeftValve();
      } else {
        this.arduinoService.activateLeftValve();
      }
    });
  }

  toggleAmbasValvulas(): void {
    this.store.selectOnce(ValveState.bothValvesActive).subscribe(isActive => {
      console.log("is active" , isActive);
      console.log("ARDUINO SERVICE IS RUNNING" , this.valorIsRunning);
      if (isActive && this.banderaValvulas) {
        console.log("Entro a esta condiucion de desactivar");
        this.arduinoService.deactivateBothValves();
      } else if(this.valorIsRunning) {
        console.log("Entro a esta condiucion de activar");
        this.arduinoService.activateBothValves();
        this.banderaValvulas = true;
      }
    });
  }

  map(value : number, fromLow : number, fromHigh : number, toLow : number, toHigh : number) {
    return (value - fromLow) * (toHigh - toLow) / (fromHigh - fromLow) + toLow;
  }
}


class Wave {
  unit: any;
  info: any;
  animationFrame: any;
  timeoutSecond: any;
  canvas: any;
  colorList: any;
  opacity: any;
  zoom: any;
  startPosition: any;
  lineWidth: any;
  xAxis: any;
  yAxis: any;
  stroke: any;
  fill: any;
  constructor(private config : any) {
    this.unit = config.unit || 100 //tamaño de onda
    this.info = config.info || {}; // Información de dibujo común al lienzo
    this.info.seconds = config.infoSeconds || 0;
    this.info.time = config.infoTime || 0; //Velocidad de flujo
    this.animationFrame = config.animationFrame || .014; //número de segundos en un cuadro de animación
    this.timeoutSecond = config.timeoutSecond || 35 // velocidad de dibujo
    this.canvas = document.querySelector(config.el) || document.createElement('canvas'); //Selección del elemento canvas
    this.colorList = config.colorList || ['#0ff', '#ff0', '#f00', '#00f', '#f0f'] ; // Información de color para cada lienzo.
    this.opacity = config.opacity || [0.8, 0.5, 0.3, 0.2, 0.8] ; //a través de
    this.zoom = config.zoom || [3, 4, 1.6, 3, 2]; //Ancho de onda Longitud de longitud de onda
    this.startPosition = config.startPosition || [0, 0, 0, 100, 0]; //retraso en la posición inicial de la onda
    this.lineWidth = config.lineWidth || 1 ; //ancho de línea
    this.xAxis = config.xAxis || Math.floor (this.canvas.height / 2); //eje x
    this.yAxis = config.yAxis || -1; //eje Y
    this.stroke = config.stroke || true; //Solo línea ondulada
    this.fill = config.fill || false; //llenar

    // this.canvas.width = config.canvasWidth || document.documentElement.clientWidth; // Ajustar el ancho del lienzo al ancho de la ventana
    // this.canvas.height = config.canvasHeight || 200; //altura de la ola desde abajo
    this.canvas.contextCache = this.canvas.getContext("2d");

    if (this.canvas.parentNode === null) {
      const body = document.querySelector('body')!;
      body.appendChild(this.canvas);
    }
    this.update();
    //this.setPH(0);
  }

  update() {
    this.draw(this.canvas, this.colorList);
    this.info.seconds = this.info.seconds + this.animationFrame;
    this.info.time = this.info.seconds * Math.PI;
    setTimeout(this.update.bind(this), this.timeoutSecond);
  }

  draw(canvas: any, color: any) {
    var context = canvas.contextCache;
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < this.colorList.length; i++) {
      this.drawWave(canvas, color[i], this.opacity[i], this.zoom[i], this.startPosition[i]);
    }
  }

  drawWave(canvas: any, color: any, alpha: any, zoom: any, delay: any) {
    var context = canvas.contextCache;
    context.globalAlpha = alpha;
    context.beginPath();
    this.drawSine(canvas, this.info.time / 0.5, zoom, delay);
    if (this.stroke) {
      context.strokeStyle = color;
      context.lineWidth = this.lineWidth;
      context.stroke();
    }
    if (this.fill) {
      context.lineTo(canvas.width + 10, canvas.height);
      context.lineTo(0, canvas.height);
      context.closePath();
      context.fillStyle = color;
      context.fill();
    }
  }

  drawSine(canvas: any, t: any, zoom: any, delay: any) {
    var xAxis = this.xAxis;
    var yAxis = this.yAxis;
    var context = canvas.contextCache;
    var x = t;
    var y = Math.sin(x) / zoom;
    context.moveTo(yAxis, this.unit * y + xAxis);
    for (let i = yAxis; i <= canvas.width + 10; i += 10) {
      x = t + (-yAxis + i) / this.unit / zoom;
      y = Math.sin(x - delay) / 3;
      context.lineTo(i, this.unit * y + xAxis);
    }
  }


}