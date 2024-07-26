import { GeneralService } from './../core/services/general/general.service';
import { DatabaseService } from './../core/services/database/database.service';
import { PersonType } from './../core/utils/global';
import { Person } from './../core/models/person';
// import { Location } from '@angular/common';
import { Component, OnInit, ViewEncapsulation, ViewChild, AfterViewInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
// import { IonLoading } from '@ionic/angular';
// import { environment } from '../../environments/environment';
// import { LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { MessageService } from 'primeng/api';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { ElectronService } from '../core/services';
import { WorkExecution } from '../core/models/work-execution';
import { Implement } from '../core/models/Implements';
import { WorkExecutionOrder } from '../core/models/workExecutionOrder';
import { ArduinoService } from '../core/services/arduino/arduino.service'; 
import * as moment from 'moment';
// import { WorkExecutionConfiguration } from '../core/models/we-configuration';
// import { WorkExecution } from '../core/models/work-execution';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  encapsulation : ViewEncapsulation.None,
  providers: [MessageService]
})
export class LoginComponent implements OnInit {
  // @ViewChild('loader') loader!: IonLoading;
  loading_message:string;
  showLoader: boolean = false; // Variable para controlar la visibilidad del loader
  formData!: FormGroup;
  personData: Array<Person> = [];
  implementData : Array<Implement> = [];
  workExecution : WorkExecution;
  workExecutionOrder : WorkExecutionOrder[];
  wExecutionOrder : WorkExecutionOrder | undefined = undefined;
  implementOrder : Array<WorkExecutionOrder> = [];
  filterImplemento : Array<Implement> = [];
  public implemento;


    
  constructor(private fb:FormBuilder,
    private dbService : DatabaseService,
    private generalService:GeneralService,
    private databaseService:DatabaseService,
    private electronService : ElectronService,
    private arduinoService : ArduinoService,
    private router:Router,
    private apiService:GeneralService,
    private toastController: ToastController) {
    this.formData = this.fb.group({
      code: ['',[Validators.required]],
      implement: ['',[Validators.required]],
    });
  }

  async ngOnInit() {
    await this.dbService.openConnection(); //Abrir la conexion a la base de datos
    this.personData = await this.dbService.getPersonData(); //Otener los datos de las personas
    this.workExecutionOrder = await this.dbService.getWorkExecutionOrder(); //Obtener las ordenes de trabajo
    this.workExecution = await this.dbService.getLastWorkExecution(); //Obtener las Ordenes de trabajo
    this.implementData = await this.dbService.getImplemenData(); //Obtener los implementos
    this.implementOrder = await this.dbService.getWorkExecutionOrder();
   
    // Obtén el conjunto de todos los type_implement en implementOrder
    const typeImplements = new Set(this.implementOrder.map(order => order.type_implement));

    // Filtra implementData para incluir solo implementos con type_implement presentes en typeImplements
    this.filterImplemento = this.implementData.filter(implement => typeImplements.has(implement.typeImplement));
  }

  //Metodo para obtener el supervisor por la persona
  public get supervisors() : Person[] {
    // console.log(this.personData.filter(p => p.type == PersonType.SUPERVISOR), "personData1");
    return this.personData.filter(p => p.type == PersonType.SUPERVISOR)
  }

  //Metodo para abrir la base de datos
  async ngAfterViewInit() {
    await this.databaseService.openConnection();
  }

  //Metodo asincrona para realizar la funcion de sincronizar y guardar el registro de inicio de sesion
  async login(){

    //Validamos si el formulario es correcto
    if(this.formData.valid){
      //Apagar las valvulass
      this.arduinoService.deactivateLeftValve();
      this.arduinoService.deactivateRightValve();
      //Regular la presion a 0
      this.arduinoService.regulatePressureWithBars(0);
      //Sincronizar las tablas para poder obtener los datos del servidor y guardarlos en la base de datos
      this.syncPrimaryTables();

      //Codicion para buscar a las personas por codigo y tipo de persona
      if(this.personData.find(person => (person.code == this.formData.value.code
        || person.document == this.formData.value.code) && person.type == PersonType.OPERADOR))
      {
        //Guardar el valor del implemento
        this.implemento = this.formData.value.implement;

        //Guardar el base de datps el registro de inicio de sesion
        await this.databaseService.saveLogin(this.formData.value.code, this.formData.value.implement);
        
        //Redireecion al main si se ha guardado
        this.router.navigateByUrl('/main');
        
      }
      else{
        this.presentToast("middle");
      }
    }
  }

  //Metodo para sincronizar las tablas que se consumen desde el Api
  async syncPrimaryTables() : Promise<boolean>{
    
    try{

      //Funciones para sincronizar las tablas de la base de datos 
      const people = await firstValueFrom(this.apiService.getPeople(environment.token));
      const cultivations = await firstValueFrom(this.apiService.getCultivations());
      const farms = await firstValueFrom(this.apiService.getFarm());
      const lots = await firstValueFrom(this.apiService.getLots());
      const nozzleColors = await firstValueFrom(this.apiService.getNozzleColors());
      const nozzleTypes = await firstValueFrom(this.apiService.getNozzleTypes());
      const nozzles = await firstValueFrom(this.apiService.getNozzles());
      const products = await firstValueFrom(this.apiService.getProducts());
      const works = await firstValueFrom(this.apiService.getWorks());
      const workOrders = await firstValueFrom(this.apiService.getWorkOrder());
      const implementss = await firstValueFrom(this.apiService.getImplement());
    
      await this.dbService.openConnection();  // Asegúrate de abrir la conexión antes de guardar

      //Recorrer las personas por persona buscando por Id
      for (const person of people) {
        const existingPerson = await this.dbService.getRecordById('person', person.id);
        if (!existingPerson) {
          await this.dbService.syncPersonData([person]);
        }
      }

      //Recorrer los cultivos buscando por Id
      for (const cultivation of cultivations) {
        const existingCultivation = await this.dbService.getRecordById('cultivation', cultivation.id);
        if (!existingCultivation) {
          await this.dbService.syncCultivationData([cultivation]);
        }
      }

      //Recorrer los fundos buscando por Id
      for (const farm of farms) {
        const existingFarm = await this.dbService.getRecordById('farm', farm.id);
        if (!existingFarm) {
          await this.dbService.syncFarmData([farm]);
        }
      }

      //Recorrer los lotes buscando por Id
      for (const lot of lots) {
        const existingLot = await this.dbService.getRecordById('lot', lot.id);
        if (!existingLot) {
          await this.dbService.syncLotsData([lot]);
        }
      }

      //Recorrer los colores de boquilla buscando por Id
      for (const nozzleColor of nozzleColors) {
        const existingNozzleColor = await this.dbService.getRecordById('nozzle_color', nozzleColor.id);
        if (!existingNozzleColor) {
          await this.dbService.syncNozzleColorData([nozzleColor]);
        }
      }

      //Recorrer los tipos de boquilla buscando por Id
      for (const nozzleType of nozzleTypes) {
        const existingNozzleType = await this.dbService.getRecordById('nozzle_type', nozzleType.id);
        if (!existingNozzleType) {
          await this.dbService.syncNozzleTypeData([nozzleType]);
        }
      }

      //Recorrer las boquillas buscando por Id
      for (const nozzle of nozzles) {
        const existingNozzle = await this.dbService.getRecordById('nozzles', nozzle.id);
        if (!existingNozzle) {
          await this.dbService.syncNozzlesData([nozzle]);
        }
      }

      //Recorrer los productos buscando por Id
      for (const product of products) {
        const existingProduct = await this.dbService.getRecordById('product', product.id);
        if (!existingProduct) {
          await this.dbService.syncProductData([product]);
        }
      }

      //Recorrer las labores buscando por Id
      for (const work of works) {
        const existingWork = await this.dbService.getRecordById('work', work.id);
        if (!existingWork) {
          await this.dbService.syncWorkData([work]);
        }
      }

      //Recorrer las ordenes de Trabjo buscando por Id
      for (const workOrder of workOrders) {
        const existingWorkOrder = await this.dbService.getRecordById('work_execution_order', workOrder.id);
        if (!existingWorkOrder) {
            // Convertir el objeto configuration a JSON
            const workOrderWithJSONConfiguration = { ...workOrder, configuration: JSON.stringify(workOrder.configuration) };
            // Convertir el campo atomizer a un array
            const atomizerArray = Array.isArray(workOrder.atomizer) ? workOrder.atomizer : [workOrder.atomizer];
            // Convertir el campo product a un array si no está vacío
            const productArray = workOrder.product.length > 0 ? workOrder.product : [];
            // Crear el objeto con el campo atomizer y product convertidos a JSON
            const workOrderWithJSONAtomizerAndProduct = { ...workOrderWithJSONConfiguration, atomizer: JSON.stringify(atomizerArray), product: JSON.stringify(productArray) };
            await this.dbService.syncWorkOrder([workOrderWithJSONAtomizerAndProduct]);
        }
      }

      //Recorrer los implementos buscando por Id
      for (const implement of implementss) {
        const existingImplement = await this.dbService.getRecordById('implement', implement.id);
        if (!existingImplement) {
          await this.dbService.syncImplement([implement]);
        }
      }

      return true;
    }catch(err : any){
      console.error("Error during synchronization:", err);
      return false;
    }
    finally{
      //console.log("aquí debería cerrarse la base de datos");
      // await this.dbService.closeDB();
    }
  }

  //Funcion para el toast
  async presentToast(position: 'top' | 'middle' | 'bottom') {
    const toast = await this.toastController.create({
      message: 'No existe operador!',
      duration: 1500,
      position: position,
    });

    await toast.present();
  }

}
