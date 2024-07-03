// valve.state.ts
import { State, Action, StateContext, Selector } from '@ngxs/store';
import { WorkExecutionDetail } from '../../models/work-execution';
import { Sensor } from '../../utils/global';
import * as moment from 'moment';
import { ElectronService } from '../electron/electron.service';
import { getDistance} from 'geolib';
import { DatabaseService } from '../database/database.service';



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

export class UpdateCurrentTank {
    static readonly type = '[Sensor] UpdateCurrentTank';
    constructor(public value: number, public initial: boolean = false) {}
}

export class AcumuladoVolumen {
    static readonly type = '[Sensor] acumuladoVolumen';
    constructor(public value: {}) {}
}

export class AcumuladoRestaurar {
    static readonly type = '[Sensor] acumuladoRestaurar';
    constructor(public value: {}) {}
}

export class SetResetApp {
    static readonly type = '[Sensor] SetResetApp';
    constructor(public value: boolean) {}
}

export class restaurarDistancia {
    static readonly type = '[Sensor] restaurarDistancia';
    constructor(public value: {}) {}
}

export class volumenRecuperado {
    static readonly type = '[Sensor] volumenRecuperado';
    constructor (public value: {}) {}
}


export interface SensorStateModel {
    data : {
        1 : number,
        2 : number,
        3 : number,
        4 : number,
        5 : number,
        12 : number, //este sera el consumo por tanque
        13 : number, //distancia por linea / GETDISTANCE
        15 : number, // Distancia recuperada
        19 : number, // Cantidad del tanque - resta
        20 : number, // valvula izquierda
        21 : number, // valvula derecga
        23 : number, // consumo total acumulado
        24 : number, // resturacion del consumo acumulado
        25 : number, // volumen recuperado para el consumo por tanque
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
    accumulated_distance : number,
    initialVolume : number,
    volumenRecuperado : number,
    currentTankRecuperado : number | null,
    volumenTotalRecuperado : number | null,
    resetApp : boolean,
    banderaDistancia : boolean,
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
        12 : 0,
        13: 0,
        15 : 0,
        19 : 0,
        20 : 0,
        21 : 0,
        23 : 0,
        24 : 0,
        25: 0
    },
    waterFlow : false,
    volumen : false,
    pressure : false,
    leftValve : false,
    rightValve : false,
    gps : false,
    speed : false,
    lastProcessedSecond: '', 
    volumenAcumulado: 0,
    lastVolumen: 0, 
    accumulated_distance :0,
    initialVolume : 0,
    volumenRecuperado : 0,
    currentTankRecuperado : null,
    volumenTotalRecuperado : null,
    resetApp : false,
    banderaDistancia : true
  }
})

export class SensorState {

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
        return sensorState.data[`${Sensor.VOLUME}`] ;
    }

    @Selector()
    static acumuladoVolumen (sensorState : SensorStateModel):number
    {          
        return sensorState.data[`${Sensor.ACCUMULATED_CONSUMO}`];
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

    @Selector()
    static distanciaRecuperada (sensorState : SensorStateModel) : number{
        return sensorState.data[`${Sensor.ACCUMULATED_DISTANCE}`];
    }

    @Selector()
    static currentTank (sensorState : SensorStateModel) : number{
        return sensorState.data[`${Sensor.CURRENT_TANK}`];
    }

    @Selector()
    static restaurarVolumen (sensorState : SensorStateModel) : number{
        return sensorState.data[`${Sensor.ACCUMULATED_RESTAURAR}`];
    }

    @Selector()
    static volumenRecuperado (sensorState : SensorStateModel) : number{
        return sensorState.data[`${Sensor.VOLUMEN_RECUPERADO}`];
    }

    @Selector()
    static volumenTanque (sensorState : SensorStateModel) : number{
        return sensorState.data[`${Sensor.ACCUMULATED_VOLUME}`];
    }

    
    @Selector([SensorState])
    static evaluarDispositivos(sensorState : SensorStateModel){

        //Retornar Valor de WorkExecutionDetail
        let realNow = moment();
        let currentSecond = realNow.format('seconds');
        let coordenadaInicial : number;
        let coordenadaFinal : number;
        let volumen = sensorState.data[`${Sensor.VOLUME}`] + sensorState.data[`${Sensor.ACCUMULATED_RESTAURAR}`];

        //Variable para el consumo por tanque + el recuperado si se reinicia el aplucativo
        let volumeTanque =  sensorState.data[`${Sensor.VOLUMEN_RECUPERADO}`] + sensorState.data[`${Sensor.VOLUME}`];

        sensorState.data[`${Sensor.ACCUMULATED_VOLUME}`] = volumeTanque;
            
        //PARA HALLAR LA DISTANCIA
        if(sensorState.data[`${Sensor.WATER_FLOW}`] > 0 && sensorState.banderaDistancia &&  sensorState.data[`${Sensor.SPEED}`] > 0 && sensorState.data[`${Sensor.PRESSURE}`] > 1.5){
            // Registra las coordenadas GPS actuales
            coordenadaInicial = sensorState.data[`${Sensor.GPS}`];
            sensorState.banderaDistancia = false;
        }else if(sensorState.data[`${Sensor.WATER_FLOW}`] > 0 && !sensorState.banderaDistancia && sensorState.data[`${Sensor.PRESSURE}`] <= 1.5 && sensorState.data[`${Sensor.SPEED}`] > 0){

            // Registra las coordenadas finales 
            coordenadaFinal = sensorState.data[`${Sensor.GPS}`];

            const distanciaRecorridaMetros = getDistance(
              { latitude : coordenadaInicial[0] , longitude : coordenadaInicial[1]},
              { latitude : coordenadaFinal[0] , longitude : coordenadaFinal[1]},0.01
            );

            //Se acumulara la distancia en caso hay recorrido productivo
            sensorState.data[`${Sensor.ACCUMULATED_HECTARE}`] += parseFloat(distanciaRecorridaMetros.toFixed(2));
            sensorState.banderaDistancia = true;
        }
        
        sensorState.data[`${Sensor.ACCUMULATED_HECTARE}`] = sensorState.data[`${Sensor.ACCUMULATED_HECTARE}`] + sensorState.data[`${Sensor.ACCUMULATED_DISTANCE}`] 

        //HALLAR EL VOLUMEN TOTAL
        if(volumen <= 1){
            sensorState.lastVolumen = sensorState.volumenAcumulado;
        }else if (volumen > 1){
            sensorState.volumenAcumulado = volumen + sensorState.lastVolumen;
        }
    
        //SOLO ACUMULAR LOS VALORES MAYORES A 0  
        if(sensorState.volumenAcumulado > 0){
            sensorState.data[`${Sensor.ACCUMULATED_CONSUMO}`] = parseFloat(sensorState.volumenAcumulado.toFixed(2)); 
        }
        
        let tanqueActual = sensorState.initialVolume - sensorState.data[`${Sensor.VOLUME}`];
        sensorState.data[`${Sensor.CURRENT_TANK}`] = parseFloat(tanqueActual.toFixed(2));

        //POR VERIFICAR EVALUACION O CONDICIONES - IDENTIFICAR LOS 3 SENSORES PARA QUE SE PUEDA GUARDAR EN LA BD
        if(sensorState.waterFlow && sensorState.lastProcessedSecond !== currentSecond){
             // Actualizar el último segundo procesado
            sensorState.lastProcessedSecond = currentSecond;
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
            sensorState.data[`${Sensor.ACCUMULATED_RESTAURAR}`] = 0;
            sensorState.data[`${Sensor.ACCUMULATED_DISTANCE}`] = 0;
            //sensorState.data[`${Sensor.VOLUMEN_RECUPERADO}`] = 0;
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

        @Action(AcumuladoVolumen)
        volumenAcumulado(ctx: StateContext<SensorStateModel>, action: AcumuladoVolumen) {
          const state = ctx.getState();
          ctx.patchState({
            data: {
              ...state.data,
              [Sensor.ACCUMULATED_CONSUMO]: action.value[Sensor.ACCUMULATED_CONSUMO]
            }
          });
        }

        @Action(AcumuladoRestaurar)
        restaurarVolumen(ctx: StateContext<SensorStateModel>, action: AcumuladoRestaurar) {
          const state = ctx.getState();
          ctx.patchState({
            data: {
              ...state.data,
              [Sensor.ACCUMULATED_RESTAURAR]: action.value[Sensor.ACCUMULATED_RESTAURAR]
            }
          });
        }

        @Action(volumenRecuperado)
        volumenRecuperado(ctx: StateContext<SensorStateModel>, action: volumenRecuperado){
            const state = ctx.getState();
            ctx.patchState({
                data : {
                    ...state.data,
                    [Sensor.VOLUMEN_RECUPERADO] : action.value[Sensor.VOLUMEN_RECUPERADO]
                }
            });
        }

        @Action(restaurarDistancia)
        restaurarDistancia(ctx: StateContext<SensorStateModel>, action: restaurarDistancia) {
          const state = ctx.getState();
          ctx.patchState({
            data: {
              ...state.data,
              [Sensor.ACCUMULATED_DISTANCE]: action.value[Sensor.ACCUMULATED_DISTANCE]
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

        @Action(UpdateCurrentTank)
        updateCurrentTank(ctx: StateContext<SensorStateModel>, action: UpdateCurrentTank) {
            const state = ctx.getState();
            const updatedData = {
                ...state.data,
                [Sensor.CURRENT_TANK]: action.value
            };

            if (action.initial) {
                ctx.patchState({
                    data: updatedData,
                    initialVolume: action.value
                });
            } else {
                ctx.patchState({
                    data: updatedData
                });
            }
        }

        @Action(SetResetApp)
        setResetApp(ctx: StateContext<SensorStateModel>, action: SetResetApp) {
            ctx.patchState({
                resetApp: action.value
            });
        }

}