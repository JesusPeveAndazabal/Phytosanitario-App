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
  workExecution : WorkExecution;
  implementData : Array<Implement> = [];
  workExecutionOrder : WorkExecutionOrder[];
  wExecutionOrder : WorkExecutionOrder | undefined = undefined;
  selectedWorkOrder: WorkExecutionOrder | null = null;
  lastWorkExecution: WorkExecution | null = null;
  ordenesTrabajoPorTipoImplemento: WorkExecutionOrder[] = [];
  login : Login;

  constructor(private modalCtrl:ModalController , private dbService : DatabaseService){}

  async ngOnInit(){
    this.login = await this.dbService.getLogin();
    this.implementData = await this.dbService.getImplemenData();
    this.workExecutionOrder = await this.dbService.getWorkExecutionOrder();
    console.log("LOGIN" , this.login);
    console.log("IMPLEMENT" , this.implementData);
    console.log("WORKORDER" , this.workExecutionOrder);

    // Identificar el tipo de implemento del usuario que ha iniciado sesión
    const tipoImplementoLogin = this.implementData.find(implemento => implemento.id === this.login.implement)?.typeImplement;

    console.log("TIPO DE IMPLEMENTO" , tipoImplementoLogin);

    // Filtrar las órdenes de trabajo según el tipo de implemento del usuario
    this.ordenesTrabajoPorTipoImplemento = this.workExecutionOrder.filter(order => order.type_implement === tipoImplementoLogin);

    console.log("ORDENES DE TRABAJO POR TIPO DE IMPLEMENTO", this.ordenesTrabajoPorTipoImplemento);

  }
  cancel() {
    return this.modalCtrl.dismiss(null, 'cancel','ordenes-trabajo');
  }

  selectOrder(order: WorkExecutionOrder) {
    this.selectedWorkOrder = order;
  }

  async confirm(){
    if (this.selectedWorkOrder) {
      // Aquí puedes realizar la acción que desees con la orden seleccionada
      console.log("Orden seleccionada:", this.selectedWorkOrder);
      let workExecution: WorkExecution = {
        id :1,
        work_execution_order : this.selectedWorkOrder ? this.selectedWorkOrder.id : 0,
        implement : this.selectedWorkOrder ? this.login?.implement : 0, //Aca tengo que pasar el implemento del login
        work :this.selectedWorkOrder ? this.login?.operador : 0, //Esto deberia pasarse del login tampbien /Operador
        lot : this.selectedWorkOrder ? this.selectedWorkOrder.lot : 0,
        worker : this.selectedWorkOrder ? this.selectedWorkOrder.worker : 0,
        supervisor : this.selectedWorkOrder ? this.selectedWorkOrder.supervisor:0,
        date : this.selectedWorkOrder ? moment(this.selectedWorkOrder.date_start , 'YYYY-MM-DD H:mm:ss') : moment(),
        configuration : await this.selectedWorkOrder.configuration,
        working_time : this.selectedWorkOrder ? moment(this.selectedWorkOrder.working_time , 'H:mm:ss') : moment('0:00:00', 'H:mm:ss'),
        downtime : this.selectedWorkOrder ? moment(this.selectedWorkOrder.downtime , 'H:mm:ss') : moment('0:00:00', 'H:mm:ss'),
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
