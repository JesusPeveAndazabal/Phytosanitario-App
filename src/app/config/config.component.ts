import { Cultivation } from './../core/models/cultivation';
import { Component, OnInit,ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { DatabaseService, GeneralService } from '../core/services/index';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { UnitPressure } from '../core/utils/global';
// import { webSocket,WebSocketSubject } from 'rxjs/webSocket';
// import { style } from '@angular/animations';
import { SettingsComponent } from '../main/settings/settings.component';

@Component({
  selector: 'app-config',
  templateUrl: './config.component.html',
  styleUrls: ['./config.component.scss'],
})
export class ConfigComponent implements OnInit {
  loading_message: string = "Sincronizando...";
  formData!: FormGroup;
  // testSocket : WebSocketSubject<any> | undefined;
  pressure_items : Array<any> = [];

  showLoader: boolean = false; // Variable para controlar la visibilidad del loader

  constructor(
    private location: Location,
    private fb:FormBuilder,
    private dbService : DatabaseService,
    private apiService : GeneralService,
    private router : Router,
    public alerta : SettingsComponent
    ) {


    this.formData = this.fb.group({
      // ws_server: ['',[Validators.required,Validators.pattern('(?:(?:(?:ht|f)tp)s?://)|(ws?s)?[\\w_-]+(?:\\.[\\w_-]+)+([\\w.,@?^=%&:/~+#-]*[\\w@?^=%&/~+#-])?')]],
      api_server: 'https://ps-test.fitosatbeta.com',
      vol_alert_on: '70',
    });
   }

  async ngOnInit() {
    this.pressure_items = UnitPressure;
    await this.dbService.openConnection();

    let config = await this.dbService.getLocalConfig();

    // await this.dbService.closeConnection(environment.dbName, false);
    //console.log(config);
    if (config){
      this.formData.setValue({
        api_server : config.api_server,
        vol_alert_on : config.vol_alert_on,
      });
    }

    this.save();

  }

  async save(){
    //console.log("el botón 'Validar y Guardar' fue presionado",this.formData, "config.component.ts 1");
    // alert("info correcta");
    if(this.formData.valid){
      this.showLoader = true; //Mostrar el loader
      //console.log("condicion1");
      environment.apiURL = this.formData.value.api_server;
      environment.minVolume = this.formData.value.vol_alert_on;

      // VALIDACION DE API
      let validAPI = await this.syncPrimaryTables();
      //console.log("ValidaApi" , validAPI);
      //console.log(validAPI, "validacion de api");

      this.loading_message = "Guardando parámetros...";

      await this.dbService.openConnection();

      await this.dbService.saveLocalConfig(this.formData.value);

      // const info = await this.dbService.getLastWorkExecution();
      // console.log(info, "lastWorkExecution");

      //console.log("back...",this.location.getState(), "config.component.ts 3");
      if((this.location.getState() as any)?.update){
        this.location.back();
      // }else if(info === undefined){
      //     console.log("llega a esta validacion");
      //     this.router.navigate(['/login']);
      // }
      }else{
        this.router.navigate(['/login']);
      }

      this.showLoader = false; // Ocultar el loader después de completar la acción
    }
  }


  /**
   * This function gets data from the main server and store to local database.
   * The data will be used to settings the work executions.
   */
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
      const workOrders = await firstValueFrom(this.apiService.getWorkOrder());
      const implementss = await firstValueFrom(this.apiService.getImplement());
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

}

