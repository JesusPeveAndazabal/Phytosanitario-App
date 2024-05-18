import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { WorkExecution } from '../../../core/models/work-execution';
import { WorkExecutionOrder } from '../../../core/models/workExecutionOrder';
import { DatabaseService } from '../../../core/services';
import { Implement } from '../../../core/models/Implements';
import * as moment from 'moment';
import { Login } from '../../../core/models/login';
import { config } from '../../../core/utils/global';
import { WorkExecutionConfiguration } from '../../../core/models/we-configuration';
import { ArduinoService } from '../../../core/services/arduino/arduino.service';
import { Router } from '@angular/router';
import { NozzleColor } from '../../../core/models/nozzle-color';
import { NozzleType } from '../../../core/models/nozzle-type';

@Component({
  selector: 'app-ordenes-trabajo',
  templateUrl: './ordenes-trabajo.component.html',
  styleUrls: ['./ordenes-trabajo.component.scss']
})
export class OrdenesTrabajoComponent implements OnInit {
  implementData : Array<Implement> = [];
  workExecutionOrder : WorkExecutionOrder[];
  wExecutionOrder : WorkExecutionOrder | undefined = undefined;
  selectedWorkOrder: WorkExecutionOrder | null = null;
  lastWorkExecution: WorkExecution | null = null;
  weConfiguration : WorkExecutionConfiguration | undefined;
  ejecucionesTrabajo : WorkExecution | null = null;
  ordenesTrabajoPorTipoImplemento: WorkExecutionOrder[] = [];
  login : Login;
  implementOrder : WorkExecutionOrder[] = [];
  configExecution:any;
  nozzleColor : Array<NozzleColor> = [];
  nozzleType : Array<NozzleType> = [];
  obtenerEjecuciones : WorkExecution[];
  tipoImplementoLogin:any;
  // Nueva variable para almacenar las IDs de las ejecuciones de trabajo finalizadas
  finishedWorkExecutionIds: number[] = [];
  selectedDate: string = '';
  nozzleSummary: any[] = []; // Declara la variable nozzleSummary

  constructor(private modalCtrl:ModalController , 
    private dbService : DatabaseService , 
    private arduinoService : ArduinoService,
    private router : Router){}

  async ngOnInit(){
    this.login = await this.dbService.getLogin();
    this.implementData = await this.dbService.getImplemenData();
    this.workExecutionOrder = await this.dbService.getWorkExecutionOrder();
    //Obtiene las ejecuciones de trabajo 
    this.ejecucionesTrabajo = await this.dbService.getLastWorkExecutionOrder();
    this.obtenerEjecuciones = await this.dbService.getWorkExecution();
    this.implementOrder = await this.dbService.getWorkExecutionOrder();
    this.nozzleColor = await this.dbService.getNozzleColorData();
    this.nozzleType = await this.dbService.getNozzleTypeData();
    let finishedWorkExecutions = await this.dbService.getWorkExecutionFinished();

    // Buscar implemento en la lista
    const implementoEncontrado = this.implementData.find(implemento => implemento.id === this.login.implement);

    // Identificar el tipo de implemento del usuario que ha iniciado sesión
    this.tipoImplementoLogin = implementoEncontrado?.typeImplement;

    // Filtrar las órdenes de trabajo según el tipo de implemento del usuario
    this.ordenesTrabajoPorTipoImplemento = this.workExecutionOrder.filter(order => order.type_implement === this.tipoImplementoLogin);

     // Filtrar las órdenes de trabajo para mostrar solo las de la fecha actual
    const fechaActual = moment().format('YYYY-MM-DD');
    this.ordenesTrabajoPorTipoImplemento = this.ordenesTrabajoPorTipoImplemento.filter(order => moment(order.date_start).format('YYYY-MM-DD') === fechaActual);

    //Ordena por fecha 
    this.ordenesTrabajoPorTipoImplemento.sort((a, b) => {
      return moment(a.date_start).valueOf() - moment(b.date_start).valueOf();
    });

    // Almacenar las IDs de las ejecuciones de trabajo finalizadas
    this.finishedWorkExecutionIds = finishedWorkExecutions.map(execution => execution.weorder);

    // Filtrar las órdenes de trabajo para mostrar solo las que no han sido finalizadas
    this.ordenesTrabajoPorTipoImplemento = this.ordenesTrabajoPorTipoImplemento.filter(order => !this.finishedWorkExecutionIds.includes(order.id));
    
    // Inicializar selectedDate con la fecha actual
    this.selectedDate = moment().format('YYYY-MM-DD');
    this.filterByDate();
  }

  filterByDate() {
    const fechaFiltrada = moment(this.selectedDate).format('YYYY-MM-DD');
    this.ordenesTrabajoPorTipoImplemento = this.workExecutionOrder.filter(order => moment(order.date_start).format('YYYY-MM-DD') === fechaFiltrada);
  }
  
  
  cancel() {
    return this.modalCtrl.dismiss(null, 'cancel','ordenes-trabajo');
  }

  selectOrder(order: WorkExecutionOrder) {
    this.selectedWorkOrder = order;
    this.configExecution = JSON.parse(this.selectedWorkOrder.configuration);
    console.log("THISCONFIG" , this.configExecution.nozzles);
  }

  isOrderFinished(order: WorkExecutionOrder): boolean {
    return this.finishedWorkExecutionIds.includes(order.id);
  }

  getNozzleType(id: number): NozzleType | undefined {
    //console.log("GETNOZZLETYPE" , this.nozzleType.find(type => type.id === id));
    return this.nozzleType.find(type => type.id === id);
  }

  getNozzleColor(id: number): NozzleColor | undefined {
    //console.log("NOZZLECOLOR", this.nozzleColor.find(color => color.id === id));
    return this.nozzleColor.find(color => color.id === id);
  }

  /* Funcion para formatear la fecha y la hora de la interfaza */
  formatDate(date: string | moment.Moment): string {
    // Verificar si la entrada es una cadena o un objeto Moment
    if (typeof date === 'string') {
      // Si es una cadena, convertirla a un objeto Moment
      date = moment(date);
    }
  
    // Formatear la fecha y hora
    const formattedDate = date.format('HH:mm:ss');
  
    // Devolver la fecha formateada
    return formattedDate;
  }

  async confirm(){
    let configExecution = JSON.parse(this.selectedWorkOrder.configuration);
    console.log(this.selectedWorkOrder);
    if (this.selectedWorkOrder) {
      let workExecution: WorkExecution = {
        id :1,
        weorder : this.selectedWorkOrder ? this.selectedWorkOrder.id : 0,
        implement : this.selectedWorkOrder ? this.login?.implement : 0, //Aca tengo que pasar el implemento del login
        work :this.selectedWorkOrder ? this.selectedWorkOrder.work : 0, //Esto deberia pasarse del login tampbien /Operador
        lot : this.selectedWorkOrder ? this.selectedWorkOrder.lot : 0,
        worker : this.selectedWorkOrder ? this.login?.operador : 0,
        supervisor : this.selectedWorkOrder ? this.selectedWorkOrder.supervisor:0,
        date : this.selectedWorkOrder ? moment(this.selectedWorkOrder.date_start , 'YYYY-MM-DD H:mm:ss') : moment(),
        configuration : await this.selectedWorkOrder.configuration,
        working_time : moment('0:00:00', 'H:mm:ss'),
        downtime : moment('0:00:00', 'H:mm:ss'),
        hectare : this.selectedWorkOrder ? this.selectedWorkOrder.hectare : 0,
        product : this.selectedWorkOrder ? this.selectedWorkOrder.product : '',
        is_finished : 0,
        id_from_server : 0,
        sended : 0,
        execution_from : 1,
        cultivation : this.selectedWorkOrder ? this.selectedWorkOrder.cultivation : 0,
        farm : 0,
        min_volume : 100,
      }

      /* Descomentar en prubeas para regular la presion */
      this.arduinoService.regulatePressureWithBars(configExecution.pressure);
      this.arduinoService.resetVolumenInit();
      this.arduinoService.currentRealVolume = 0;
      this.arduinoService.initialVolume = 0;
      this.arduinoService.datosCaudal = 0;
      this.arduinoService.deactivateLeftValve();
      this.arduinoService.deactivateRightValve();
      //Guardamos la ejecucion de Trabajo
      await this.dbService.saveWorkExecutionData(workExecution);
      this.lastWorkExecution = await this.dbService.getLastWorkExecution();
      config.lastWorkExecution = this.lastWorkExecution;
      // Por ejemplo, cerrar el modal
      await this.modalCtrl.dismiss(this.selectedWorkOrder, 'confirm', 'ordenes-trabajo');
      this.router.navigateByUrl('/main');
    }
  }

  get canStart(): boolean{
    if(config.lastWorkExecution){
      return config.lastWorkExecution.configuration != "";
    }
    return false;
  }
}
