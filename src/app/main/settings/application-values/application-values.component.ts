import { DatabaseService } from './../../../core/services/database/database.service';
import { environment } from './../../../../environments/environment';
import { Component, Injectable, OnInit } from '@angular/core';
import { ItemReorderEventDetail, ModalController } from '@ionic/angular';
import { NozzlesConfiguration, WorkExecutionConfiguration,NozzleColor, NozzleType, Nozzles, WorkExecution } from './../../../core/models/models';
import { AlertController } from '@ionic/angular';
import { UnitPressure, UnitPressureEnum,config,convertPressureUnit , calcular_caudal_objetivo} from './../../../core/utils/global';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import * as moment from 'moment';
import { KeyboardComponent } from '../../../custom-components/keyboard/keyboard.component';



import Swal from 'sweetalert2';
import { ArduinoService } from '../../../core/services/arduino/arduino.service';
//import { SettingsComponent } from '../settings.component';
// import { DialogService } from 'primeng/dynamicdialog';


@Component({
  selector: 'app-application-values',
  templateUrl: './application-values.component.html',
  styleUrls: ['./application-values.component.scss'],
})
export class ApplicationValuesComponent  implements OnInit {
  visible: boolean = true;
  nozzleColors : NozzleColor[] = [];
  nozzleTypes : NozzleType[] = [];
  nozzles : Nozzles[] = [];
  weConfiguration : WorkExecutionConfiguration | undefined;
  nozzleConfig : NozzlesConfiguration[] = [];

  selectedColor: number = 0; // Asigna un valor por defecto si es necesario
  color: any = 0; // Asigna un valor por defecto
  quantity : number = 0;
  type : any = 0;
  total : number = 0;
  totalLabel : string ="0 L/min";
  formData!: FormGroup;
  isSubmitted : boolean = false;
  presionConvertida : any = 0;
  // item: { type: any };


  ConsumoTotalBlue = 0;
  ConsumoTotalBlack = 0;
  ConsumoTotalOrange = 0;
  ConsumoTotalRed = 0;
  ConsumoTotalGreen = 0;

  minPressure = 1;
  maxPressure = 20;
  velocidadReal;

  caudalObjetivo = 0;
  myValue: string = '';

  saveNozzles = 0;
  pressures_items = [{label: "Pressure", value: 0}];
  keyboard: any;

  showKeyboard: boolean = false;
  velocidadDeseada : any;


  private pressure_values : any[] = [];
  info: number = 0;
  
  currentWorkExecution : WorkExecution | undefined = undefined;
  private invalid_rows = 0;

  constructor(private modalCtrl: ModalController, private dbService : DatabaseService,
    private arduinoService:ArduinoService , private alertController : AlertController,private fb:FormBuilder) {
      this.formData = this.fb.group({
        volume: [0,[Validators.required,]],
        speed: ['',[Validators.required,Validators.min(0.01)]],
        consume: ['',[Validators.required,Validators.min(0.01)]],
        pressure: ['',[Validators.required,Validators.min(0.01)]],
        unit: ['',[Validators.required]],
        width: ['',[Validators.required,Validators.min(0.01)]],
      });
    }

  async ngOnInit() {
    await this.dbService.openConnection();
    this.nozzleColors = await this.dbService.getNozzleColorData();
    this.nozzleTypes = await this.dbService.getNozzleTypeData();
    this.nozzles = await this.dbService.getNozzlesData();
    this.updateSummary(null);

    console.log("NOZZLES" , this.nozzles);



/*     //Esto sirve para buscar en la tabla añadida
    this.pressure_values = this.nozzles.map(p => { return  {pressure : p.pressure, pressure_unit : p.pressure_unit }})
      .filter((obj, index, self) =>
        index === self.findIndex((o) => (
          o.pressure === obj.pressure && o.pressure_unit === obj.pressure_unit
        ))
    ); */

    
    //console.log(this.pressure_values, "filtro de nozzles");

    this.currentWorkExecution = await this.dbService.getLastWorkExecution();

    //condicion para validar que el primer formulario este lleno
    if(this.currentWorkExecution){
      if(this.currentWorkExecution.configuration != ""){
        this.weConfiguration = await JSON.parse(this.currentWorkExecution.configuration);
        this.nozzleConfig = this.weConfiguration!.nozzles;
        this.formData.setValue({
          volume : this.weConfiguration?.volume,
          consume : this.weConfiguration?.consume,
          speed : this.weConfiguration?.speed,
          pressure : this.weConfiguration?.pressure,
          unit: this.weConfiguration?.unit,
          width : this.weConfiguration?.width,
        });

        //console.log("formData" , this.formData.value.consumo);
        //this.changeUnit({value: this.weConfiguration?.unit});
        setTimeout(() => this.updateSummary(null),200);
      }
    }
  }


/*   async openModal(){
    const modal = await this.modalCtrl.create({
      component: KeyboardComponent,
      cssClass : 'keyboard-modal'
    });
    modal.onDidDismiss().then((data) => {
      // Procesar datos del modal si es necesario
    });

    // Obtener la altura del teclado si es necesario
    const keyboardHeight = 300; // Aquí deberías obtener la altura real del teclado

    // Establecer la altura del modal
    modal.style.height = keyboardHeight + 'px';

    return await modal.present();
  } */

  set items(items: NozzlesConfiguration[]){
    this.nozzleConfig = items;
    //setTimeout(() => this.updateSummary(null),200);
  }

  get unitsPressure(){
    setTimeout(() => this.updateSummary(null),200);
    return UnitPressure;
  }
  // unitsPressure : any = UnitPressure;
    
  cancel() {
    return this.modalCtrl.dismiss(null, 'cancel','application-values-modal');
  }

  handleError(controlName : string,errorType : string) : boolean{
    if(this.formData.controls[controlName].errors)
    {
      return this.formData.controls[controlName].errors![errorType];
    }

    return false;
  }

  async confirm() {
    this.isSubmitted = true;
    if(this.formData.valid){

      if(this.nozzleConfig.length == 0){

        return false;
      }
      else if(this.invalid_rows > 0)
      {

        return false;
      }

      //this.arduinoService.regulatePressureWithBars()
      this.nozzleConfig = this.nozzleConfig.map(p => {return { type : p.type, number : p.number, color : parseInt(p.color.toString()) }});
      this.weConfiguration = {
        nozzles : this.nozzleConfig,
        water_flow : this.total,
        speed : this.weConfiguration? this.velocidadReal : 0,
        humidity : this.weConfiguration? this.weConfiguration.humidity : 0,
        temperature : this.weConfiguration? this.weConfiguration.temperature : 0,
        wind_kmh : this.weConfiguration? this.weConfiguration.wind_kmh : 0,
        ...this.formData.value
      }

      //console.log("Deberria regular" ,this.weConfiguration?.pressure);
      //*************Esto es para mandar el comando de regulacion desde el confirmar del boton y apagar las valvulas
      this.arduinoService.regulatePressureWithBars(this.weConfiguration?.pressure);
      this.arduinoService.deactivateLeftValve();
      this.arduinoService.deactivateRightValve();
     

      let wExecution : WorkExecution ={
        id: this.currentWorkExecution ? this.currentWorkExecution.id : 0,
        weorder : this.currentWorkExecution ? this.currentWorkExecution.weorder : 0,
        implement : this.currentWorkExecution ? this.currentWorkExecution.implement : 0,
        work : this.currentWorkExecution ? this.currentWorkExecution.work : 0,
        lot: this.currentWorkExecution ? this.currentWorkExecution.lot : 0,
        worker: this.currentWorkExecution ? this.currentWorkExecution.worker : (await this.dbService.getLogin()).operador,
        supervisor: this.currentWorkExecution ? this.currentWorkExecution.supervisor : 0,
        date: this.currentWorkExecution ? moment(this.currentWorkExecution.date, 'YYYY-MM-DD H:mm:ss') : moment(),
        configuration: JSON.stringify(this.weConfiguration),
        working_time: this.currentWorkExecution ? moment(this.currentWorkExecution.working_time, 'H:mm:ss') : moment('0:00:00', 'H:mm:ss'),
        downtime: this.currentWorkExecution ? moment(this.currentWorkExecution.downtime, 'H:mm:ss') : moment('0:00:00', 'H:mm:ss'),
        hectare: this.currentWorkExecution ? this.currentWorkExecution.hectare : 0,
        product: this.currentWorkExecution ? this.currentWorkExecution.product : '',
        is_finished: 0,
        id_from_server: this.currentWorkExecution ? this.currentWorkExecution.id_from_server : 0,
        sended: this.currentWorkExecution ? this.currentWorkExecution.sended : 0,
        execution_from: this.currentWorkExecution ? this.currentWorkExecution.execution_from : 1,
        cultivation: this.currentWorkExecution ? this.currentWorkExecution.cultivation : 0,
        farm: this.currentWorkExecution ? this.currentWorkExecution.farm : 0,
        min_volume: 0,
      };

      if(!this.currentWorkExecution){
        await this.dbService.saveWorkExecutionData(wExecution)
        .then(async ()=>{
          config.lastWorkExecution = wExecution;
          return this.modalCtrl.dismiss(null, 'confirm','application-values-modal');

        })
        .catch((error)=>{
          console.log(error);
          return false;
        });

      }
      else{
        await this.dbService.updateWorkExecutionData(wExecution)
        .then(async()=>{
          config.lastWorkExecution = wExecution;
          //this.arduinoService.regulatePressureWithBars(this.settingsComponent.info);
          return this.modalCtrl.dismiss(null, 'confirm','application-values-modal');

        })
        .catch((error)=>{
          console.log(error);
          return false;
        });
      }
    }
    return false;
  }

  calculoVelocidad(){
    let tiempoRecorrido;
    let largo;
    this.updateSummary(null);

    tiempoRecorrido = ((this.formData.value.consume / this.total)/60).toFixed(3);
    largo = ((10000 / this.formData.value.width) / 1000).toFixed(3);

    if(this.formData.value.consume == "" || this.formData.value.width == ""){
      this.velocidadReal = 0;
    }else{
      this.velocidadReal = parseFloat((largo / tiempoRecorrido).toFixed(2));
    }
  }

  // Función para mostrar u ocultar el teclado
/*   toggleKeyboard(show: boolean) {
    this.showKeyboard = show;
  }
 */
  getColorCode(id: number): string {
    this.color = this.nozzleColors.find(c => c.id === id);
    return this.color ? this.color.code : 'transparent'; // Devuelve el código del color si se encuentra, de lo contrario, devuelve 'transparent'
  }

  getColorName(colorId: number): string {
    const color = this.nozzleColors.find(c => c.id === colorId);
    return color ? color.name : '';
  }

  handleReorder() {
    //Reorder and changing number of nozzles to new order
    this.nozzleConfig.forEach((item,index) => { item.number = index +1; });
  }

 /*  addNozzles() {
    if (!this.quantity || !this.type || !this.selectedColor) {
      return;
    }
  
    for (let i = 0; i < this.quantity; i++) {
      this.nozzleConfig.push({
        number: this.nozzleConfig.length + 1,
        type: this.type,
        color: this.selectedColor
      });
    }
    console.log("NOZZLECONFIG" , this.nozzleConfig)
  } */

  addNozzles(){
    if(!this.quantity)
      return;
    for(let i = 0; i < this.quantity; i++)
      this.nozzleConfig = [...this.nozzleConfig,{number : (this.nozzleConfig.length+1) , type : parseInt(this.type) , color : this.selectedColor}];
      
      //let unidadPresion = this.unitsPressure;

      //this.calculoConsumo();
      this.updateCaudalObjetivoTotal();
      this.calculoVelocidad();
      setTimeout(() => this.updateSummary(null),200);
  }



calculoConsumo(presion: number, colorSeleccionado: number, typeNozzle: number, quantity: number) {
  this.updateSummary(null);
  console.log("Se entro a esta funcion");
  let previousItem: Nozzles | null = null;
  let currentItem: Nozzles | null = null;
  let nextItem: Nozzles | null = null;
  let nextNextItem: Nozzles | null = null;
  let nextNextItem3: Nozzles | null = null;
  let nextNextItem4: Nozzles | null = null;

  const unitNozzle = this.formData.value.unit;
  //console.log("COLOR SELECCIONADO", colorSeleccionado);
  //console.log("TYPE NOZZLE", typeNozzle);
 //console.log("UNIDAD SELECCIONADO", unitNozzle);
  let encontrado = false; // Bandera para verificar si se ha encontrado un resultado

  this.nozzles.forEach((item: Nozzles, index: number, array: Nozzles[]) => {
      if (colorSeleccionado == item.color && !encontrado && typeNozzle == item.type) {
          currentItem = item;
          //console.log("previousItem", currentItem, "nextItem", nextItem, "nextNextItem", nextNextItem, "nextNextItem3", nextNextItem3, "nextNextItem4", nextNextItem4);
          if (previousItem && nextItem && nextNextItem && nextNextItem3 && nextNextItem4) {
              let presionConvertida: number;
              if (typeNozzle == 1) {
                  presionConvertida = convertPressureUnit(presion, UnitPressureEnum.BAR, UnitPressureEnum.PSI);
                  //console.log("PresionConvertida", presionConvertida);
              } else {
                  presionConvertida = convertPressureUnit(presion, UnitPressureEnum.BAR, UnitPressureEnum.BAR);
                  //console.log("PresionConvertida", presionConvertida);
              }

              if (index > 0 && index < array.length - 3) {
                  let caudalTemporal = 0; // Variable temporal para almacenar el caudal objetivo calculado
                  if (presionConvertida >= previousItem.pressure && presionConvertida <= nextItem.pressure) {
                      caudalTemporal = calcular_caudal_objetivo(previousItem.flow, presionConvertida, previousItem.pressure, nextItem.pressure, nextItem.flow);
                      //console.log("CAUDAL 1 ", caudalTemporal);
                      encontrado = true;

                  } else if (presionConvertida > nextItem.pressure && presionConvertida <= nextNextItem.pressure) {
                      caudalTemporal = calcular_caudal_objetivo(nextItem.flow, presionConvertida, nextItem.pressure, nextNextItem.pressure, nextNextItem.flow);
                      //console.log("CAUDAL 2 ", caudalTemporal);
                      encontrado = true;

                  } else if (presionConvertida > nextNextItem.pressure && presionConvertida <= nextNextItem3.pressure) {
                      caudalTemporal = calcular_caudal_objetivo(nextNextItem.flow, presionConvertida, nextNextItem.pressure, nextNextItem3.pressure, nextNextItem3.flow);
                      //console.log("CAUDAL 3 ", caudalTemporal);
                      encontrado = true;

                  } else if (presionConvertida > nextNextItem3.pressure && presionConvertida <= nextNextItem4.pressure) {
                      caudalTemporal = calcular_caudal_objetivo(nextNextItem3.flow, presionConvertida, nextNextItem3.pressure, nextNextItem4.pressure, nextNextItem4.flow);
                      //console.log("CAUDAL 4 ", caudalTemporal);
                      encontrado = true;
                  }

                  // Acumular el caudal objetivo temporal al total
                  this.caudalObjetivo += caudalTemporal * quantity;
                  //console.log("CAUDAL SUMADO", this.caudalObjetivo);
              }
          }
          previousItem = currentItem;
          nextItem = array[index + 1];
          nextNextItem = array[index + 2];
          nextNextItem3 = array[index + 3];
          nextNextItem4 = array[index + 4];
      }
  });
}


  recalcularCaudalObjetivo() {
    this.caudalObjetivo = 0;  // Reiniciar caudalObjetivo a 0 al inicio de la función
    const presion = this.formData.value.pressure;
    const boquillasAgrupadas: { [key: string]: { color: number; type: number; quantity: number } } = {};

    // Agrupar boquillas por color y tipo, y calcular la cantidad
    this.weConfiguration.nozzles.forEach(nozzle => {
        const key = `${nozzle.color}-${nozzle.type}`;
        if (!boquillasAgrupadas[key]) {
            boquillasAgrupadas[key] = {
                color: nozzle.color,
                type: nozzle.type,
                quantity: 0
            };
        }
        boquillasAgrupadas[key].quantity++;
    });

    // Recalcular el caudal objetivo para cada grupo
    for (const key in boquillasAgrupadas) {
        if (boquillasAgrupadas.hasOwnProperty(key)) {
            const grupo = boquillasAgrupadas[key];
            const colorSeleccionado = grupo.color;
            const typeNozzle = grupo.type;
            const quantity = grupo.quantity;
            this.calculoConsumo(presion, colorSeleccionado, typeNozzle, quantity);
        }
    }
    this.calculoVelocidad();
}





  /**
   * This function is responsible for removing a specific nozzle from the nozzle configuration.
   * It prompts the user with an alert message asking them to confirm if they want to delete the nozzle with the given number.
   * If the user confirms, the nozzle is removed from the configuration and the handleReorder() and updateSummary() functions are called to update the UI.
   * If the user cancels, nothing happens.
   * @param nozzleNumber
   */
  removeNozzle(nozzleNumber : number){
    this.alertController.create({
      header: '¡Atención!',
      subHeader: 'Borrar boquilla',
      message: `¿Está seguro que desea borrar la boquilla N° ${nozzleNumber}?`,
      buttons: [
        {
          text: 'Si',
          handler: () => {
            // Eliminar la boquilla del arreglo de configuración de boquillas
            this.nozzleConfig = this.nozzleConfig.filter(p => p.number != nozzleNumber);
            // Reordenar las boquillas
            this.handleReorder();
            // Actualizar el caudal objetivo total restando el caudal de la boquilla eliminada
            this.addNozzles();
            //Actualizar la suma
          }
        },
        {
          text: 'No',
          handler: () => {
            console.log('Let me think');
          }
        },
      ]
    }).then((res) => {
      res.present();
    });
  }

  isNullOrNaN(value: number | undefined, nonNullValue: number, item: number): number {
    if (isNaN(value!)) {
      this.invalid_rows++;
      const rowElement = document.getElementById(`row_${item}`);
      if (rowElement) {
        rowElement.setAttribute("style", "--background: #ff000057;");
      }
    } else {
      const rowElement = document.getElementById(`row_${item}`);
      if (rowElement) {
        rowElement.setAttribute("style", "--background: transparent;");
      }
    }

    return !isNaN(value!) ? value! : nonNullValue;
  }

    updateCaudalObjetivoTotal() {
    // Sumar todos los caudales objetivos de las boquillas
    this.total =  this.caudalObjetivo;

    console.log("CAUDAL OBJETIVO" , this.caudalObjetivo);

    this.total = this.caudalObjetivo;
    console.log("total" , this.total);

    // Actualizar el total en la interfaz de usuario
    this.updateSummary(null);
  }

  /**
   * The below code is a function that updates the total flow rate of all nozzles based on their configuration and current flow rate.
   * It does this by first mapping the nozzle configuration to their respective flow rates using the find method to match nozzle color and type.
   * Any nozzle with a null or NaN value is replaced with 0. The mapped values are then summed up using the reduce method and displayed as a string with the label "L/min".
   * @param _event
   */
  updateSummary(_event : any){
    this.invalid_rows = 0;
    if(this.nozzleConfig.length > 0) {
        if(this.caudalObjetivo > 0){
            this.total = parseFloat(this.caudalObjetivo.toFixed(2));
        } else {
            if (this.weConfiguration && this.weConfiguration.water_flow !== undefined) {
                this.total = this.weConfiguration.water_flow;
            } else {
                this.total = 0; // Otra acción apropiada si weConfiguration o water_flow no están definidos
            }
        }
    } else {
        this.total = 0;
    }
    this.totalLabel = `${this.total.toFixed(2)} L/min`;
  }





  /* changeUnit($event : any){
    // console.log("cambio de item");
    this.pressures_items = [];
    this.pressure_values.forEach((item : any) =>{
      let original = UnitPressure.find(p => p.value == item.pressure_unit);
      let convert_unit = UnitPressure.find(p => p.value == $event.value);
      let converted = parseFloat(convertPressureUnit(item.pressure,item.pressure_unit,$event.value).toFixed(2));
      this.pressures_items.push({label: `${converted} ${convert_unit!.name} (${item.pressure} ${original!.name})`,value : item.pressure})
      console.log("original" , original);
      console.log("original" , convert_unit);
      console.log("original" , converted);
    });
  } */
}