import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { WorkExecution } from '../../../core/models/work-execution';
import { WorkExecutionOrder } from '../../../core/models/workExecutionOrder';
import { DatabaseService, ElectronService } from '../../../core/services';
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

  // Declara un nuevo array para almacenar los IDs de órdenes confirmadas
  confirmedWorkOrderIds: number[] = [];

  //selectedWorkOrderState: "PENDIENTE" | "EJECUTANDO" | "FINALIZADO" = "PENDIENTE"; // Valor por defecto
  selectedWorkOrderState: { [id: number]: string } = {};
  selectedWorkOrderId: number | null = null;
  selectedOrderId: number | null = null; // Variable para almacenar el ID de la orden seleccionada

  constructor(private modalCtrl:ModalController , 
    private dbService : DatabaseService , 
    private arduinoService : ArduinoService,
    private router : Router,
    private electronService : ElectronService){}

  async ngOnInit(){

    //Consultas a la base de datos
    this.login = await this.dbService.getLogin();
    this.implementData = await this.dbService.getImplemenData();
    this.workExecutionOrder = await this.dbService.getWorkExecutionOrder();
    this.ejecucionesTrabajo = await this.dbService.getLastWorkExecutionOrder();
    this.obtenerEjecuciones = await this.dbService.getWorkExecution();
    this.implementOrder = await this.dbService.getWorkExecutionOrder();
    this.nozzleColor = await this.dbService.getNozzleColorData();
    this.nozzleType = await this.dbService.getNozzleTypeData();
    let finishedWorkExecutions = await this.dbService.getWorkExecutionFinished();
    this.restoreOrderStates();

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

    const storedConfirmedOrders = localStorage.getItem('confirmedWorkOrderIds');
    if (storedConfirmedOrders) {
      this.confirmedWorkOrderIds = JSON.parse(storedConfirmedOrders);
    }
  }

    // Función para verificar si la orden está confirmada
  isOrderConfirmed(order: WorkExecutionOrder): boolean {
    return this.confirmedWorkOrderIds.includes(order.id);
  }


  //Funcion para ordenar por fecha y hora las ordenes de trabajo
  filterByDate() {
    const fechaFiltrada = moment(this.selectedDate).format('YYYY-MM-DD');
    this.ordenesTrabajoPorTipoImplemento = this.workExecutionOrder
    .filter(order => moment(order.date_start).format('YYYY-MM-DD') === fechaFiltrada)
   /*  .filter(order => !this.finishedWorkExecutionIds.includes(order.id)); // Excluye las órdenes finalizadas; */
  }                                                                                                                                                                    
  
  //Funcion para cerrar el modal en caso se elija Cancelar
  cancel() {
    return this.modalCtrl.dismiss(null, 'cancel','ordenes-trabajo');
  }


  //Funcion para obtener la orden que se ha seleccionado
  selectOrder(order: WorkExecutionOrder) {
    this.electronService.log("SELECTED ORDER" , this.selectedWorkOrder);
    this.selectedWorkOrder = order;
    this.configExecution = JSON.parse(this.selectedWorkOrder.configuration);

  }

  //Funcion para onbtener las ordenes que han sido finalizadas
  isOrderFinished(order: WorkExecutionOrder): boolean {
    return this.finishedWorkExecutionIds.includes(order.id);
  }

  //Obtener los tipos de boquillas
  getNozzleType(id: number): NozzleType | undefined {
    return this.nozzleType.find(type => type.id === id);
  }

  //Obtener el color de las boquillas
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

  //Funcion para confirmar la orden seleccionada
  async confirm(){
    //Parsear a Json ña configuracion de la orden
    let configExecution = JSON.parse(this.selectedWorkOrder.configuration);
    //Verificamos que haya una orden seleccionada
    if (this.selectedWorkOrder) {
      this.confirmedWorkOrderIds.push(this.selectedWorkOrder.id);
      // Almacena la lista actualizada en localStorage
      localStorage.setItem('confirmedWorkOrderIds', JSON.stringify(this.confirmedWorkOrderIds));
      //Estructuramos los datos para guardar en la base de datos
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
      this.arduinoService.isRunning = false;
      this.arduinoService.datosCaudal = 0;
      this.arduinoService.dataCurrent = 0;
      this.arduinoService.currentRealVolume = 0;
      this.arduinoService.initialVolume = 0;
      this.arduinoService.deactivateLeftValve();
      this.arduinoService.deactivateRightValve();
      this.arduinoService.previousAccumulatedVolume = 0;
      this.arduinoService.acumuladoTotal = 0;
      this.arduinoService.restaurarConsumoTotal = 0;
      this.arduinoService.restaurarDistancia = 0;
      this.arduinoService.volumenReseteado = 0;

      // Marca la orden seleccionada como 'EJECUTANDO'
      this.selectedWorkOrderId = this.selectedWorkOrder.id;
      
      // Puedes almacenar el estado en localStorage si deseas que persista entre recargas
      localStorage.setItem('selectedWorkOrderId', JSON.stringify(this.selectedWorkOrderId));

      // Por ejemplo, cerrar el modal
      await this.modalCtrl.dismiss(this.selectedWorkOrder, 'confirm', 'ordenes-trabajo');
      //Guardamos la ejecucion de Trabajo
      await this.dbService.saveWorkExecutionData(workExecution);

      //Esto es para dar acceso a las botones
      this.lastWorkExecution = await this.dbService.getLastWorkExecution();
      config.lastWorkExecution = this.lastWorkExecution;

      //Redireccionar al main
      this.router.navigateByUrl('/main');
    }
  }


  restoreOrderStates() {
    const savedOrderId = localStorage.getItem('selectedWorkOrderId');
    this.selectedWorkOrderId = savedOrderId ? JSON.parse(savedOrderId) : null;
  }

  getOrderStatus(order: WorkExecutionOrder): string {
  
    // Si la orden está finalizada, retorna 'FINALIZADO'
  if (this.finishedWorkExecutionIds.includes(order.id)) {
    return 'FINALIZADO';
  }
    // Devuelve el estado visual de la orden
    return this.selectedWorkOrderId === order.id ? 'EJECUTANDO' : 'PENDIENTE';
  }


  //Obtener un valor booleado en caso haya una configuracion valida o no
  get canStart(): boolean{
    if(config.lastWorkExecution){
      return config.lastWorkExecution.configuration != "";
    }
    return false;
  }
}