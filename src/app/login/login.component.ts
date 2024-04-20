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
  loading_message: string = "Sincronizando...";
  formData!: FormGroup;
  personData: Array<Person> = [];
  implementData : Array<Implement> = [];
  workExecution : WorkExecution;
  workExecutionOrder : WorkExecutionOrder[];
  wExecutionOrder : WorkExecutionOrder | undefined = undefined;
  public implemento;
    // currentWorkExecution : WorkExecution | undefined = undefined;
  constructor(private fb:FormBuilder,
    private dbService : DatabaseService,
    private generalService:GeneralService,
    private databaseService:DatabaseService,
    private electronService : ElectronService,
    private router:Router,
    private apiService:GeneralService,
    private toastController: ToastController) {
    this.formData = this.fb.group({
      code: ['',[Validators.required]],
      implement: ['',[Validators.required]],
    });
  }

  async ngOnInit() {
    // console.log("info correcta login.component.ts");
    // this.databaseService.openConnection();
    await this.dbService.openConnection();
    this.personData = await this.dbService.getPersonData();
    this.workExecutionOrder = await this.dbService.getWorkExecutionOrder();
    this.workExecution = await this.dbService.getLastWorkExecution();
    this.implementData = await this.dbService.getImplemenData();
   

    console.log(this.implementData, "data");

  }

  public get supervisors() : Person[] {
    // console.log(this.personData.filter(p => p.type == PersonType.SUPERVISOR), "personData1");
    return this.personData.filter(p => p.type == PersonType.SUPERVISOR)
  }

  async ngAfterViewInit() {
    // await this.loader.present();

    await this.databaseService.openConnection();
  }

  async login(){
    // console.log(this.formData.valid, "login");
    //console.log("Ingreso al login : 1 vez");
    if(this.formData.valid){
      //console.log("Ingreso a la condicion");
      // console.log(this.personData.find(person => (person.code == this.formData.value.code)), "personData2");
      // console.log(firstValueFrom(this.apiService.getPeople(environment.token)), "personData2");
      if(this.personData.find(person => (person.code == this.formData.value.code
        || person.document == this.formData.value.code) && person.type == PersonType.OPERADOR))
      {

       /*  this.wExecutionOrder = await this.databaseService.getWorkImplement(this.formData.value.implement); */
    /*     console.log("Respuesta de getWorkImplement:", this.wExecutionOrder);


        if(this.wExecutionOrder){
          let workOrder = this.wExecutionOrder[0]
          console.log("CONDICION", workOrder);
          try{
              let workExecution: WorkExecution = {
                id :1,
                work_execution_order : workOrder ? workOrder.id : 0,
                implemento : workOrder ? workOrder.implement : 0,
                work :workOrder ? workOrder.work : 0,
                lot : workOrder ? workOrder.lot : 0,
                worker : workOrder ? workOrder.worker : 0,
                supervisor : workOrder ? workOrder.supervisor:0,
                date : workOrder ? moment(workOrder.date_start , 'YYYY-MM-DD H:mm:ss') : moment(),
                configuration : await workOrder.configuration,
                working_time : workOrder ? moment(workOrder.working_time , 'H:mm:ss') : moment('0:00:00', 'H:mm:ss'),
                downtime : workOrder ? moment(workOrder.downtime , 'H:mm:ss') : moment('0:00:00', 'H:mm:ss'),
                hectare : workOrder ? workOrder.hectare : 0,
                product : workOrder ? workOrder.product : 0,
                is_finished : 0,
                id_from_server : 0,
                sended : 0,
                execution_from : 1,
                cultivation : 1,
                farm : 0,
                min_volume : 100,
            }
            console.log("EJECUCION");
            console.log(workExecution);
            await this.databaseService.saveWorkExecutionData(workExecution);
          
          } catch (error){
            console.error("Error al guardar los datos de ejecución de trabajo:", error);
          }
  
        } */
          
        this.implemento = this.formData.value.implement;
        await this.databaseService.saveLogin(this.formData.value.code, this.formData.value.implement);
        this.router.navigateByUrl('/main');
        
      }
      else{
        this.presentToast("middle");
      }
    }
  }

  async syncPrimaryTables() : Promise<boolean>{
    console.log("SINCRONIZANDO DATOS ............................")
    //console.log(await firstValueFrom(this.apiService.getPeople(environment.token)), "config.component.ts");
    try{
      console.log("EMNTRO AL TRY");
      // await this.dbService.openConnection();
      const people = await firstValueFrom(this.apiService.getPeople(environment.token));
      const cultivations = await firstValueFrom(this.apiService.getCultivations());
      const farms = await firstValueFrom(this.apiService.getFarm());
      const lots = await firstValueFrom(this.apiService.getLots());
      const nozzleColors = await firstValueFrom(this.apiService.getNozzleColors());
      const nozzleTypes = await firstValueFrom(this.apiService.getNozzleTypes());
      const nozzles = await firstValueFrom(this.apiService.getNozzles());
      const products = await firstValueFrom(this.apiService.getProducts());
      const works = await firstValueFrom(this.apiService.getWorks());
      const implementss = await firstValueFrom(this.apiService.getImplement());
      const workOrders = await firstValueFrom(this.apiService.getWorkOrder());
      console.log("WORKS LOGI N" , workOrders);
      // const we = await firstValueFrom(this.apiService.getWE());
      


      await this.dbService.openConnection();  // Asegúrate de abrir la conexión antes de guardar

      // await this.dbService.syncPersonData(people);
      for (const person of people) {
        const existingPerson = await this.dbService.getRecordById('person', person.id);
        // console.log(existingPerson, "person");
        if (!existingPerson) {
          await this.dbService.syncPersonData([person]);
        }
      }

      // await this.dbService.syncCultivationData(cultivations);
      for (const cultivation of cultivations) {
        const existingCultivation = await this.dbService.getRecordById('cultivation', cultivation.id);
        if (!existingCultivation) {
          await this.dbService.syncCultivationData([cultivation]);
        }
      }

      // await this.dbService.syncFarmData(farms);
      for (const farm of farms) {
        const existingFarm = await this.dbService.getRecordById('farm', farm.id);
        if (!existingFarm) {
          await this.dbService.syncFarmData([farm]);
        }
      }

      // await this.dbService.syncLotsData(lots);
      for (const lot of lots) {
        const existingLot = await this.dbService.getRecordById('lot', lot.id);
        if (!existingLot) {
          await this.dbService.syncLotsData([lot]);
        }
      }

      // await this.dbService.syncNozzleColorData(nozzleColors);
      for (const nozzleColor of nozzleColors) {
        const existingNozzleColor = await this.dbService.getRecordById('nozzle_color', nozzleColor.id);
        if (!existingNozzleColor) {
          await this.dbService.syncNozzleColorData([nozzleColor]);
        }
      }

      // await this.dbService.syncNozzleTypeData(nozzleTypes);
      for (const nozzleType of nozzleTypes) {
        const existingNozzleType = await this.dbService.getRecordById('nozzle_type', nozzleType.id);
        if (!existingNozzleType) {
          await this.dbService.syncNozzleTypeData([nozzleType]);
        }
      }

      // await this.dbService.syncNozzlesData(nozzles);
      for (const nozzle of nozzles) {
        const existingNozzle = await this.dbService.getRecordById('nozzles', nozzle.id);
        if (!existingNozzle) {
          await this.dbService.syncNozzlesData([nozzle]);
        }
      }

      // await this.dbService.syncProductData(products);
      for (const product of products) {
        const existingProduct = await this.dbService.getRecordById('product', product.id);
        if (!existingProduct) {
          await this.dbService.syncProductData([product]);
        }
      }

      // await this.dbService.syncWorkData(works);
      for (const work of works) {
        const existingWork = await this.dbService.getRecordById('work', work.id);
        if (!existingWork) {
          await this.dbService.syncWorkData([work]);
        }
      }

      for (const implement of implementss) {
        const existingImplement = await this.dbService.getRecordById('implement', implement.id);
        if (!existingImplement) {
          await this.dbService.syncImplement([implement]);
        }
      }
      // await this.dbService.syncWorkData(works);
      for (const workOrder of workOrders) {
        const existingWorkOrder = await this.dbService.getRecordById('work_execution_order', workOrder.id);
        if (!existingWorkOrder) {
            // Convertir el objeto configuration a JSON
            const workOrderWithJSONConfiguration = { ...workOrder, configuration: JSON.stringify(workOrder.configuration) };
            // Convertir el campo atomizer a un array
            const atomizerArray = Array.isArray(workOrder.atomizer) ? workOrder.atomizer : [workOrder.atomizer];
            // Crear el objeto con el campo atomizer convertido a JSON
            const workOrderWithJSONAtomizer = { ...workOrderWithJSONConfiguration, atomizer: JSON.stringify(atomizerArray) };
            console.log("SINCRONIZACION" , await this.dbService.syncWorkOrder([workOrderWithJSONAtomizer]))
            await this.dbService.syncWorkOrder([workOrderWithJSONAtomizer]);
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

  async presentToast(position: 'top' | 'middle' | 'bottom') {
    const toast = await this.toastController.create({
      message: 'No existe operador!',
      duration: 1500,
      position: position,
    });

    await toast.present();
  }

}
