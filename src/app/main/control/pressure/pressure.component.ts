import { VolumeComponent } from './../volume/volume.component';
import { ArduinoService } from './../../../core/services/arduino/arduino.service';
import { WorkExecution } from './../../../core/models/work-execution';
import { Component, Input, OnInit,OnChanges, SimpleChanges,AfterViewInit } from '@angular/core';
import { WorkExecutionConfiguration } from './../../../core/models/we-configuration';
// import { WorkExecution } from 'src/app/core/models/work-execution';
import { UnitPressure, convertPressureUnit,UnitPressureEnum } from './../../../core/utils/global';
import { DatabaseService } from '../../../core/services';
import { ControlComponent } from '../control.component';
import { Observable } from 'rxjs';
import { Store } from '@ngxs/store';
import { SensorState } from '../../../core/services/arduino/eventsSensors';



@Component({
  selector: 'app-pressure',
  templateUrl: './pressure.component.html',
  styleUrls: ['./pressure.component.scss'],
})
export class PressureComponent  implements OnChanges,AfterViewInit {
  @Input("wExecution") wExecution! : WorkExecution;
  // @Input() wExecution: any;
  @Input("real_pressure") real_pressure : number = 0;

  teoric_pressure: any = { value : 0.00, unit: "bar"};
  efficiency_pressure: any = { value : 0.00, unit: "%"};
  pressure: any = { value : 0, unit: "bar"};

  pressure$: Observable<number>; //Variable para poder mostrar el valor de la presion del sensor

  private wConfig : WorkExecutionConfiguration | undefined;

  constructor(private volume:VolumeComponent, public  arduinoService: ArduinoService, private dbService:DatabaseService , private store : Store) { }

  ngOnInit(){
    
    //Guardar en la variable el valor del sensor 
    this.pressure$ = this.store.select(SensorState.pressure);

  }
    

  ngAfterViewInit() {
    if(this.wExecution){
      //Parsear la ejecucion de trabajo para la configuracion
      this.wConfig = JSON.parse(this.wExecution.configuration);

      //Obtener la presion teorica
      this.teoric_pressure = {
        value : convertPressureUnit(this.wConfig!.pressure,UnitPressureEnum.BAR,this.wConfig!.unit),
        unit : UnitPressure.find(p => p.value == this.wConfig!.unit)?.name
      };
      this.teoric_pressure.value = parseFloat(parseFloat(this.teoric_pressure.value).toFixed(1));
      this.pressure.unit = UnitPressure.find(p => p.value == this.wConfig!.unit)?.name;
    }
  }

  reset(){
    this.arduinoService.regulatePressureWithBars(0);
  }

  calcularAnchoPresion(presion: number): number {
    // Aquí debes implementar la lógica para calcular el ancho del medidor de presión
    // Por ejemplo, podrías escalar la presión dentro de un rango específico y convertirla a porcentaje
    // Esta es solo una implementación de ejemplo, debes adaptarla según tus necesidades
    const anchoMaximo = 100; // Ancho máximo del medidor
    const presionMaxima = 1000; // Supongamos que la presión máxima es 1000 Pa
    return (presion / presionMaxima) * anchoMaximo; // Convertimos la presión a porcentaje del ancho máximo
  }

  ngOnChanges(changes: SimpleChanges) {
    if(this.wExecution && changes['wExecution']){
      this.wConfig = JSON.parse(this.wExecution.configuration);
      this.teoric_pressure = {
        value : convertPressureUnit(this.wConfig!.pressure,UnitPressureEnum.BAR,this.wConfig!.unit),
        unit : UnitPressure.find(p => p.value == this.wConfig!.unit)?.name
      };

      this.teoric_pressure.value = parseFloat(parseFloat(this.teoric_pressure.value).toFixed(1));
      this.pressure.unit = UnitPressure.find(p => p.value == this.wConfig!.unit)?.name;
    }
    else if(changes['real_pressure']){
      if(this.wConfig){
        let newValue = convertPressureUnit(changes['real_pressure'].currentValue,UnitPressureEnum.BAR,this.wConfig!.unit);
        this.pressure.value = parseFloat(newValue.toFixed(2));


        let relativeError : number = Math.abs((this.teoric_pressure.value - this.pressure.value) / this.teoric_pressure.value * 100);

        this.efficiency_pressure.value = (100- relativeError).toFixed(2);
      }
    }
  }
}
