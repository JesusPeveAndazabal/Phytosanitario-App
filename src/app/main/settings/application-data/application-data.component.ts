// import { DatabaseService } from 'src/app/core/services/services';
import { SelectFilterItem } from './../../../custom-components/types';
import { DatabaseService } from './../../../core/services/database/database.service';
// import { environment } from './../../../../environments/environment';
import { Component, OnInit,AfterViewInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonSelect, ModalController } from '@ionic/angular';
import { Cultivation, Farm, Lot, Product, Work,WorkExecution } from './../../../core/models/models';
import * as moment from 'moment';
import { config } from '../../../core/utils/global';

@Component({
  selector: 'app-application-data',
  templateUrl: './application-data.component.html',
  styleUrls: ['./application-data.component.scss'],
})
export class ApplicationDataComponent  implements OnInit {
  @ViewChild("select_farm") sFarm! : IonSelect;
  @ViewChild("select_cultivation") sCultivation! : IonSelect;
  @ViewChild("select_product") sProduct! : IonSelect;
  @ViewChild("select_work") sWork! : IonSelect;

  farms : Array<Farm> = [];
  lots : Array<Lot> = [];
  fLots : Array<Lot> = []; //filtered lots by selected farm
  cultivations : Array<Cultivation> = [];
  products : Array<Product> = [];
  works : Array<Work> = [];

  isSubmitted : boolean = false;
  formData!: FormGroup;
  currentWorkExecution : WorkExecution | undefined = undefined;

  constructor(private modalCtrl: ModalController,
    private dbService : DatabaseService,private fb:FormBuilder) {
      this.formData = this.fb.group({
        farm: ['',[Validators.required]],
        lot: ['',[Validators.required]],
        cultivation: ['',[Validators.required]],
        product: [[]], // Inicializar product como un array vacío
        hectare: ['',[Validators.required,Validators.min(0.0001)]],
        work: ['',[Validators.required]],
      });      
    }

    async ngOnInit() {

      //Abrir la conexion a la base de datos
      await this.dbService.openConnection();
  
      //Consultas a la base de datos 
      this.farms = await this.dbService.getFarmData();
      this.lots = await this.dbService.getLotData();
      this.cultivations = await this.dbService.getCultivationData();
      this.products = await this.dbService.getProductData();
      this.works = await this.dbService.getWorkData();
      this.currentWorkExecution = await this.dbService.getLastWorkExecution();


      if (this.currentWorkExecution) {
          this.fLots = this.lots.filter(p => p.farm === this.lots.find(l => l.id === this.currentWorkExecution?.lot)?.farm!);
  
          // No es necesario convertir product a JSON, ya que es un array
          const productArray = JSON.parse(this.currentWorkExecution.product);
  
          /**
           * Arbitrary fixing selected text for select components
           * This is a bug of Ionic Framework
           */
          setTimeout(() => {
              this.formData.setValue({
                  farm: this.lots.find(l => l.id === this.currentWorkExecution?.lot)?.farm,
                  lot: this.currentWorkExecution!.lot,
                  cultivation: this.currentWorkExecution!.cultivation,
                  product: productArray, // Asignar directamente el array product
                  hectare: this.currentWorkExecution!.hectare,
                  work: this.currentWorkExecution!.work
              });
  
              this.sFarm.selectedText = this.farms.find(f => f.id === this.formData.value.farm)?.name;
              this.sCultivation.selectedText = this.cultivations.find(c => c.id === this.formData.value.cultivation)?.name;
              this.sProduct.selectedText = this.products.find(p => p.id === this.formData.value.product)?.name;
              this.sWork.selectedText = this.works.find(w => w.id === this.formData.value.work)?.name;
          }, 50);
      }
  }

  //Funcion para mostrar los fundos en un select
  farmSelected($event : any){
    //.log($event);
    this.fLots = this.lots.filter(p => p.farm === parseInt($event.detail.value));
    this.formData.controls['lot'].setValue(undefined);
  }


  get lotOptions(): SelectFilterItem[]{
    return this.fLots.map(i => { return { value : i.id,text: i.name}});
  }

  //Funcion para cerrar el modal en caso la opcion sea 'cancelar'
  cancel() {
    return this.modalCtrl.dismiss(null, 'cancel','application-data-modal');
  }

  //Metodo para confirmar y cerrar el modal
  async confirm() {

    this.isSubmitted = true;

    //Condicion para verificar que el formulario es valido
    if(this.formData.valid){
      //Estructura para guardar a la base de datos 
      let wExecution : WorkExecution ={
        id : this.currentWorkExecution ? this.currentWorkExecution.id : 0,
        configuration : this.currentWorkExecution ? this.currentWorkExecution.configuration : '',
        date : moment(),
        downtime : moment('0:00:00', 'H:mm:ss'),
        is_finished : 0,
        working_time : moment('0:00:00', 'H:mm:ss'),
        worker : (await this.dbService.getLogin()).operador,
        /* supervisor : (await this.dbService.getLogin()).supervisor, */
        ...this.formData.value
      };

      wExecution.farm = parseInt(`${wExecution.farm}`);

      //Si la variable currentWorkExecution esta en false , guardamos el registro en la base de datos
      if(!this.currentWorkExecution){
        await this.dbService.saveWorkExecutionData(wExecution)
        .then(async()=>{
          config.lastWorkExecution = wExecution;
          return this.modalCtrl.dismiss(null, 'confirm','application-data-modal');

        })
        .catch((error)=>{
          console.log(error);
          return false;
        });

      }
      else{
        //Caso contrario acutalizamos el registro de la ejecucion de trabajo
        await this.dbService.updateWorkExecutionData(wExecution)
        .then(()=>{
          config.lastWorkExecution = wExecution;
          return this.modalCtrl.dismiss(null, 'confirm','application-data-modal');

        })
        .catch((error)=>{
          console.log(error);
          return false;
        });
      }
    }

    return new Promise<boolean>(() => false);
  }
}
