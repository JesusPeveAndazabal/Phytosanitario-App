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
import { Router } from '@angular/router';
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
    private arduinoService:ArduinoService , private alertController : AlertController,private fb:FormBuilder ,private router : Router) {
      //Atributos del formulario
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

    //Abrimos la conexion a la base de datos
    await this.dbService.openConnection();
    
    //Consultas a la base de datos
    this.nozzleColors = await this.dbService.getNozzleColorData();
    this.nozzleTypes = await this.dbService.getNozzleTypeData();
    this.nozzles = await this.dbService.getNozzlesData();
    this.updateSummary(null);
    this.currentWorkExecution = await this.dbService.getLastWorkExecution();

    //condicion para validar que el primer formulario este completado
    if(this.currentWorkExecution){
      if(this.currentWorkExecution.configuration != ""){

        //Parseamos a Json la configuracion de la ejecucion de trabajo
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

  set items(items: NozzlesConfiguration[]){
    this.nozzleConfig = items;
  }

  //Obtener la unidad de Presion
  get unitsPressure(){
    setTimeout(() => this.updateSummary(null),200);
    return UnitPressure;
  }
  // unitsPressure : any = UnitPressure;
    
  //FUncion para cerrar el modal si en caso se presione Cancelar
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

  //Metodo para la logica al presionar Confirmar al modal 
  async confirm() {
    this.isSubmitted = true;

    //Verificamos que el fomulario sea valido
    if(this.formData.valid){

      //Condicionamos en casono haya ningun registro de boquillas
      if(this.nozzleConfig.length == 0){

        //Returnamos false en caso sea asi
        return false;
      }
      //Verificamos si hay filas invalidas
      else if(this.invalid_rows > 0)
      {
        //Retornamos false en caoo sea asi 
        return false;
      }

      //Obtenemos la configuracion de las boquiilas
      this.nozzleConfig = this.nozzleConfig.map(p => {return { type : p.type, number : p.number, color : parseInt(p.color.toString()) }});
      //Guardamos los valores dentro de la configuracion
      this.weConfiguration = {
        nozzles : this.nozzleConfig,
        water_flow : this.total,
        speed : this.weConfiguration? this.velocidadReal : 0,
        humidity : this.weConfiguration? this.weConfiguration.humidity : 0,
        temperature : this.weConfiguration? this.weConfiguration.temperature : 0,
        wind_kmh : this.weConfiguration? this.weConfiguration.wind_kmh : 0,
        ...this.formData.value
      }

      //*************Esto es para mandar el comando de regulacion desde el confirmar del boton y apagar las valvulas
      this.arduinoService.regulatePressureWithBars(this.weConfiguration?.pressure);

      /* Descomentar en caso se requiera cerrar las 2 electrovalvulas */
      //this.arduinoService.deactivateLeftValve();
      //this.arduinoService.deactivateRightValve();
     

      //Creamos la estructura para guardar en la base de datos
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

      //Guardamos en la base de datos de acuerdo que se cumpla la condicion adecuada
      if(!this.currentWorkExecution){
        await this.dbService.saveWorkExecutionData(wExecution)
        .then(async ()=>{
          config.lastWorkExecution = wExecution;
          //Regresar al main
          this.router.navigateByUrl('/main');
          return this.modalCtrl.dismiss(null, 'confirm','application-values-modal');
          

        })
        .catch((error)=>{
          console.log(error);
          return false;
        });

      }
      //En caso contrario actualizamos el registro
      else{
        await this.dbService.updateWorkExecutionData(wExecution)
        .then(async()=>{
          config.lastWorkExecution = wExecution;
          //Regresar al main  
          this.router.navigateByUrl('/main');
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

  //Funcion para hallar la velocidad
  calculoVelocidad(){

    let tiempoRecorrido; //Variable para almacenar el tiempo recorrido
    let largo; //Variable para hallar el largo del camino
    this.updateSummary(null);

    //Contiene la division de el consumo entre el total de la suma de las boquillas
    tiempoRecorrido = ((this.formData.value.consume / this.total)/60).toFixed(3);
    //Contiene la diviision de el ancho entre 10000 y lo dividimos entre 1000
    largo = ((10000 / this.formData.value.width) / 1000).toFixed(3);

    //Verificamos que el consumo y el ancho no esten vacios
    if(this.formData.value.consume == "" || this.formData.value.width == ""){
      //Si esta vacio la veloidad estaria en 0
      this.velocidadReal = 0;
    }else{
      //En caso contrario se divide el largo entre el tiempo recorrido
      this.velocidadReal = parseFloat((largo / tiempoRecorrido).toFixed(2));
    }
  }

  //Obtener los colores por el codigo
  getColorCode(id: number): string {
    this.color = this.nozzleColors.find(c => c.id === id);
    return this.color ? this.color.code : 'transparent'; // Devuelve el código del color si se encuentra, de lo contrario, devuelve 'transparent'
  }

  //Obtener el nombre y color de las boquillas
  getColorName(colorId: number): string {
    const color = this.nozzleColors.find(c => c.id === colorId);
    return color ? color.name : '';
  }

  handleReorder() {
    //Reorder and changing number of nozzles to new order
    this.nozzleConfig.forEach((item,index) => { item.number = index +1; });
  }

  //Funcion para manejar que se generen las boquillas de acuerdo a la cantidad y tipo que se ingrese
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

  //Fucion para calcular el consumo de acuerdo a la presion y los rangos que se maneje
  calculoConsumo(presion: number, colorSeleccionado: number, typeNozzle: number, quantity: number) {
    this.updateSummary(null);

    //Creacion de variables
    let previousItem: Nozzles | null = null;
    let currentItem: Nozzles | null = null;
    let nextItem: Nozzles | null = null;
    let nextNextItem: Nozzles | null = null;
    let nextNextItem3: Nozzles | null = null;
    let nextNextItem4: Nozzles | null = null;

    const unitNozzle = this.formData.value.unit;
    let encontrado = false; // Bandera para verificar si se ha encontrado un resultado

    //Recorremos las boquillas que se han cargado por la Orden de Trabajo elegida
    this.nozzles.forEach((item: Nozzles, index: number, array: Nozzles[]) => {
        if (colorSeleccionado == item.color && !encontrado && typeNozzle == item.type) {
            currentItem = item;
            if (previousItem && nextItem && nextNextItem && nextNextItem3 && nextNextItem4) {
                let presionConvertida: number;
                if (typeNozzle == 1) {
                    presionConvertida = convertPressureUnit(presion, UnitPressureEnum.BAR, UnitPressureEnum.PSI);
                } else {
                    presionConvertida = convertPressureUnit(presion, UnitPressureEnum.BAR, UnitPressureEnum.BAR);
                }
                
                //Condicion para obtener los valores de los rangos para realizar el calculo del caudal total
                if (index > 0 && index < array.length - 3) {
                    let caudalTemporal = 0; // Variable temporal para almacenar el caudal objetivo calculado
                    if (presionConvertida >= previousItem.pressure && presionConvertida <= nextItem.pressure) {
                        caudalTemporal = calcular_caudal_objetivo(previousItem.flow, presionConvertida, previousItem.pressure, nextItem.pressure, nextItem.flow);
                        encontrado = true;

                    } else if (presionConvertida > nextItem.pressure && presionConvertida <= nextNextItem.pressure) {
                        caudalTemporal = calcular_caudal_objetivo(nextItem.flow, presionConvertida, nextItem.pressure, nextNextItem.pressure, nextNextItem.flow);
                        encontrado = true;

                    } else if (presionConvertida > nextNextItem.pressure && presionConvertida <= nextNextItem3.pressure) {
                        caudalTemporal = calcular_caudal_objetivo(nextNextItem.flow, presionConvertida, nextNextItem.pressure, nextNextItem3.pressure, nextNextItem3.flow);
                        encontrado = true;

                    } else if (presionConvertida > nextNextItem3.pressure && presionConvertida <= nextNextItem4.pressure) {
                        caudalTemporal = calcular_caudal_objetivo(nextNextItem3.flow, presionConvertida, nextNextItem3.pressure, nextNextItem4.pressure, nextNextItem4.flow);
                        encontrado = true;
                    }

                    // Acumular el caudal objetivo temporal al total
                    this.caudalObjetivo += caudalTemporal * quantity;
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

  //Funcion para recalcular el caudal objetivo
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
    //Llamamos a la funcion de calculoVelocidad para actualizar el valor en caso haya algun cambio
    this.calculoVelocidad();
  }

  /**
   * This function is responsible for removing a specific nozzle from the nozzle configuration.
   * It prompts the user with an alert message asking them to confirm if they want to delete the nozzle with the given number.
   * If the user confirms, the nozzle is removed from the configuration and the handleReorder() and updateSummary() functions are called to update the UI.
   * If the user cancels, nothing happens.
   * @param nozzleNumber
   */

  //Funcion para remover las boquillas seleccionadas
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

  //Metodo para identificar las boquillas no ingresadas correctamente
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

  //Actualizar el total del caudal objetivo
  updateCaudalObjetivoTotal() {
    
    // Sumar todos los caudales objetivos de las boquillas
    this.total =  this.caudalObjetivo;

    //console.log("CAUDAL OBJETIVO" , this.caudalObjetivo);

    this.total = this.caudalObjetivo;
    //console.log("total" , this.total);

    // Actualizar el total en la interfaz de usuario
    this.updateSummary(null);
  }

  /**
   * The below code is a function that updates the total flow rate of all nozzles based on their configuration and current flow rate.
   * It does this by first mapping the nozzle configuration to their respective flow rates using the find method to match nozzle color and type.
   * Any nozzle with a null or NaN value is replaced with 0. The mapped values are then summed up using the reduce method and displayed as a string with the label "L/min".
   * @param _event
   */

  //Actualizar suma
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

}