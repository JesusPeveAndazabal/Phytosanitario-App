import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { WorkExecution } from '../../../core/models/work-execution';
import { WorkExecutionOrder } from '../../../core/models/workExecutionOrder';
import { DatabaseService } from '../../../core/services';
import { Implement } from '../../../core/models/Implements';
import * as moment from 'moment';
import { Login } from '../../../core/models/login';
import { config } from '../../../core/utils/global';

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
  ejecucionesTrabajo : WorkExecution | null = null;
  ordenesTrabajoPorTipoImplemento: WorkExecutionOrder[] = [];
  login : Login;

  constructor(private modalCtrl:ModalController , private dbService : DatabaseService){}

  async ngOnInit(){
    this.login = await this.dbService.getLogin();
    this.implementData = await this.dbService.getImplemenData();
    this.workExecutionOrder = await this.dbService.getWorkExecutionOrder();
    //Obtiene las ejecuciones de trabajo 
    this.ejecucionesTrabajo = await this.dbService.getLastWorkExecutionOrder();
    console.log("EJECUCIONES DE TRABAJO", this.ejecucionesTrabajo);

    // Identificar el tipo de implemento del usuario que ha iniciado sesión
    const tipoImplementoLogin = this.implementData.find(implemento => implemento.id === this.login.implement)?.typeImplement;

    // Filtrar las órdenes de trabajo según el tipo de implemento del usuario
    this.ordenesTrabajoPorTipoImplemento = this.workExecutionOrder.filter(order => order.type_implement === tipoImplementoLogin);
    
    //Ordena por fecha 
    this.ordenesTrabajoPorTipoImplemento.sort((a, b) => {
      return moment(a.date_start).valueOf() - moment(b.date_start).valueOf();
    });

    // Filtrar las órdenes de trabajo que ya se han ejecutado
    if (this.ejecucionesTrabajo) {
      const idEjecutada = this.ejecucionesTrabajo.weorder;
      console.log("IDE EJECUTADA" , idEjecutada);
      this.ordenesTrabajoPorTipoImplemento = this.ordenesTrabajoPorTipoImplemento.filter(order => order.id !== idEjecutada);
      console.log("ORDENES FILTRADAS POR EJECUCION", this.ordenesTrabajoPorTipoImplemento);
    }

  }
  cancel() {
    return this.modalCtrl.dismiss(null, 'cancel','ordenes-trabajo');
  }

  selectOrder(order: WorkExecutionOrder) {
    console.log('Seleccionando orden:', order); // Verificar si se selecciona correctamente
    this.selectedWorkOrder = order;
    console.log('Orden seleccionada Funcion:', this.selectedWorkOrder); // Verificar si la orden seleccionada se establece correctamente
  }

  /* Funcion para formatear la fecha y la hora de la interfaza */
  formatDate(date: string | moment.Moment): string {
    // Verificar si la entrada es una cadena o un objeto Moment
    if (typeof date === 'string') {
      // Si es una cadena, convertirla a un objeto Moment
      date = moment(date);
    }
  
    // Formatear la fecha y hora
    const formattedDate = date.format('YYYY-MM-DD HH:mm:ss');
  
    // Devolver la fecha formateada
    return formattedDate;
  }

  async confirm(){
    if (this.selectedWorkOrder) {
      // Aquí puedes realizar la acción que desees con la orden seleccionada
      console.log("Orden seleccionada antes de guardar:", this.selectedWorkOrder);
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
        product : this.selectedWorkOrder ? this.selectedWorkOrder.product : 0,
        is_finished : 0,
        id_from_server : 0,
        sended : 0,
        execution_from : 1,
        cultivation : 1,
        farm : 0,
        min_volume : 100,
      }
      //Guardamos la ejecucion de Trabajo
      console.log("GUARDADO DE EJECUCION" , workExecution);
      await this.dbService.saveWorkExecutionData(workExecution);
      this.lastWorkExecution = await this.dbService.getLastWorkExecution();
      config.lastWorkExecution = this.lastWorkExecution;
      // Por ejemplo, cerrar el modal
      await this.modalCtrl.dismiss(this.selectedWorkOrder, 'confirm', 'ordenes-trabajo');
    }
  }

  get canStart(): boolean{
    if(config.lastWorkExecution){
      return config.lastWorkExecution.configuration != "";
    }
    return false;
  }
}
