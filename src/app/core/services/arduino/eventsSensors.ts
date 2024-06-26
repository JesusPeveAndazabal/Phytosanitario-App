// valve.state.ts
import { State, Action, StateContext, Selector } from '@ngxs/store';
import { WorkExecutionDetail } from '../../models/work-execution';
import { Sensor } from '../../utils/global';
import * as moment from 'moment';
import { ElectronService } from '../electron/electron.service';
import { getDistance} from 'geolib';



export class WaterFlow {
    static readonly type = '[Sensor] waterFlow';
    constructor(public value : {}) {}
}

export class Volumen {
    static readonly type = '[Sensor] volumen';
    constructor(public value : {}) {}
}

export class Pressure {
    static readonly type = '[Sensor] pressure';
    constructor(public value : {}) {}
}

export class LeftValve {
    static readonly type = '[Sensor] leftValve';
    constructor(public value : {}) {}
}

export class RightValve {
    static readonly type = '[Sensor] rightValve';
    constructor(public value : {}) {}
}

export class Gps {
    static readonly type = '[Sensor] gps';
    constructor(public value : {}) {}
}

export class Speed {
    static readonly type = '[Sensor] speed';
    constructor(public value : {}) {}
}


export interface SensorStateModel {
    data : {
        1 : number,
        2 : number,
        3 : number,
        4 : number,
        5 : number,
        13 : number,
        20 : number,
        21 : number,
        23 : number
    },
    waterFlow : boolean;
    volumen : boolean;
    pressure : boolean;
    leftValve : Boolean;
    rightValve : boolean;
    gps : boolean;
    speed : boolean;
    lastProcessedSecond: string; // Nuevo campo para el último segundo procesado
    volumenAcumulado: number; // Volumen acumulado
    lastVolumen: number | null; // Último volumen conocido
    accumulated_distance : number
}

@State<SensorStateModel>({
  name : 'sensor',
  defaults : {
    data : {
        1 : 0,
        2 : 0,
        3 : 0,
        4 : 0,
        5 : 0,
        13: 0,
        20 : 0,
        21 : 0,
        23 : 0
    },
    waterFlow : false,
    volumen : false,
    pressure : false,
    leftValve : false,
    rightValve : false,
    gps : false,
    speed : false,
    lastProcessedSecond: '', // Inicializar con una cadena vacía
    volumenAcumulado: 0, // Inicializar volumen acumulado
    lastVolumen: null, // Inicializar último volumen conocido como null
    accumulated_distance :0
  }
})

export class SensorState {

    accumulated_distance = 0;

    /* EVALUAR POR CADA SENSOR */
    //Selector Caudal 
    @Selector()
    static waterFlow (sensorState : SensorStateModel) : number
    {
        return sensorState.data[`${Sensor.WATER_FLOW}`];
    }

    //Selector Presion
    @Selector()
    static volumen (sensorState : SensorStateModel) : number
    {   
        return sensorState.data[`${Sensor.VOLUME}`];
    }

    @Selector()
    static acumuladoVolumen (sensorState : SensorStateModel):number
    {
        return sensorState.data[`${Sensor.ACCUMULATED_CONSUMO}`]
    }

    //Selector Pressure
    @Selector()
    static pressure (sensorState : SensorStateModel):number{
        return sensorState.data[`${Sensor.PRESSURE}`];
    }

    //Selector Valvula Izquierda
    @Selector()
    static leftValve (sensorState : SensorStateModel):number{
        return sensorState.data[`${Sensor.VALVE_LEFT}`];
    }

    //Selecctor Valvula Derecha
    @Selector()
    static rigthValve (sensorState : SensorStateModel):number{
        return sensorState.data[`${Sensor.VALVE_RIGHT}`];
    }
    
    //Selector Gps
    @Selector()
    static gps (sensorState : SensorStateModel):number{
        return sensorState.data[`${Sensor.GPS}`];
    }

    //Selector Velocidad
    @Selector()
    static speed (sensorState : SensorStateModel) : number{
        return sensorState.data[`${Sensor.SPEED}`];
    }

    @Selector()
    static acumuladHectarea (sensorState : SensorStateModel) : number{
        return sensorState.data[`${Sensor.ACCUMULATED_HECTARE}`];
    }

    
    @Selector([SensorState])
    static evaluarDispositivos(sensorState : SensorStateModel){

        //Retornar Valor de WorkExecutionDetail
        let realNow = moment();
        let currentSecond = realNow.format('seconds');
        let coordenadaInicial : number;
        let coordenadaFinal : number;
        let banderaDistancia : boolean = true;
        let volumen = sensorState.data[`${Sensor.VOLUME}`];
        sensorState.data[`${Sensor.ACCUMULATED_HECTARE}`] = sensorState.accumulated_distance;

        //PARA HALLAR LA DISTANCIA

        if(sensorState.data[`${Sensor.WATER_FLOW}`] > 0 && sensorState.data[`${Sensor.SPEED}`] > 0 && sensorState.data[`${Sensor.SPEED}`] > 1.5){
            // Registra las coordenadas GPS actuales
            coordenadaInicial = sensorState.data[`${Sensor.GPS}`];
            banderaDistancia = false;
        }else if(sensorState.data[`${Sensor.WATER_FLOW}`] > 0 && sensorState.data[`${Sensor.PRESSURE}`] <= 1.5 && !banderaDistancia && sensorState.data[`${Sensor.SPEED}`] > 0){

            // Registra las coordenadas finales 
            coordenadaFinal = sensorState.data[`${Sensor.GPS}`];

            const distanciaRecorridaMetros = getDistance(
              { latitude : coordenadaInicial[0] , longitude : coordenadaInicial[1]},
              { latitude : coordenadaFinal[0] , longitude : coordenadaFinal[1]},0.01
            );

            //Se acumulara la distancia en caso hay recorrido productivo
            sensorState.accumulated_distance += distanciaRecorridaMetros;
            sensorState.data[`${Sensor.ACCUMULATED_HECTARE}`] = sensorState.accumulated_distance;
            banderaDistancia = true;
        }
        
        sensorState.data[`${Sensor.ACCUMULATED_HECTARE}`] = sensorState.accumulated_distance;

        //HALLAR EL VOLUMEN TOTAL
        if(volumen <= 1){
            sensorState.lastVolumen = sensorState.volumenAcumulado;
        }else{
            sensorState.volumenAcumulado = volumen + sensorState.lastVolumen;
        }

        //SOLO ACUMULAR LOS VALORES MAYORES A 0 
        if(sensorState.volumenAcumulado > 0){
            sensorState.data[`${Sensor.ACCUMULATED_CONSUMO}`] = parseFloat(sensorState.volumenAcumulado.toFixed(2)); 
        }
        
        //POR VERIFICAR EVALUACION O CONDICIONES 
        if(sensorState.waterFlow && sensorState.gps){
             // Actualizar el último segundo procesado
            //sensorState.lastProcessedSecond = currentSecond;
            let workDetail : WorkExecutionDetail = {
                id_work_execution : 2,
                data : JSON.stringify(sensorState.data),
                time : realNow,
                sended : false,
                precision : '',
                gps :  JSON.stringify(sensorState.data[4]),
                has_events : false,
                events : 'NO HAY EVENTOS',
                id : 0,
            };

            //Evaluas los eventos
            sensorState.waterFlow = false;
            sensorState.volumen = false;
            sensorState.pressure = false;
            sensorState.leftValve = false;
            sensorState.rightValve = false;
            sensorState.gps = false;
            sensorState.speed = false;
            return workDetail;
        }

        return null;
    }


        @Action(WaterFlow)
        waterflow(ctx: StateContext<SensorStateModel>, action: WaterFlow){
            let actualState = ctx.getState();
            ctx.patchState({
                ...actualState,
                waterFlow: true,    
                data: {
                    ...actualState.data,
                    ...action.value
                }
            });
        }

        @Action(Volumen)
        volumen(ctx: StateContext<SensorStateModel> , action: Volumen){
            let actualState = ctx.getState();
            ctx.patchState({
                ...actualState,
                volumen: true,
                data: {
                    ...actualState.data,
                    ...action.value
                }
            });
        }

        @Action(Pressure)
        pressure(ctx: StateContext<SensorStateModel> , action: Pressure){
            ctx.patchState({
                ...ctx.getState(),
                pressure: true,
                data: {
                    ...ctx.getState().data,
                    ...action.value
                }
            });
        }

        @Action(RightValve)
        rigthvalve(ctx: StateContext<SensorStateModel> , action: RightValve){
            ctx.patchState({
                ...ctx.getState(),
                rightValve: true,
                data: {
                    ...ctx.getState().data,
                    ...action.value
                }
            });
        }

        @Action(LeftValve)
        leftvalve(ctx: StateContext<SensorStateModel> , action: LeftValve){
            ctx.patchState({
                ...ctx.getState(),
                leftValve: true,
                data: {
                    ...ctx.getState().data,
                    ...action.value
                }
            });
        }

        @Action(Gps)
        gps(ctx: StateContext<SensorStateModel> , action: Gps){
            ctx.patchState({
                ...ctx.getState(),
                gps: true,
                data: {
                    ...ctx.getState().data,
                    ...action.value
                }
            });
        }

        @Action(Speed)
        speed(ctx: StateContext<SensorStateModel> , action: Speed){
            ctx.patchState({
                ...ctx.getState(),
                speed: true,
                data: {
                    ...ctx.getState().data,
                    ...action.value
                }
            });
        }
}