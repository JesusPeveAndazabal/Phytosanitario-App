// valve.state.ts
import { State, Action, StateContext, Selector } from '@ngxs/store';
import { WorkExecutionDetail } from '../../models/work-execution';
import { Sensor } from '../../utils/global';
import * as moment from 'moment';
import { ElectronService } from '../electron/electron.service';
import { getDistance} from 'geolib';
import { DatabaseService } from '../database/database.service';


//COMPONENTE
/* DISPARA */
//ACCION
/* MODIFICA O MUTA EL ESTADO */
//ESTADO
/* NOTIFICA AL COMPONENTE */


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

export class AcumularDistancia {
    static readonly type = '[Sensor] acumularDistancia';
    constructor(public value : {}) {}
}

export class restaurarDistancia {
    static readonly type = '[Sensor] restaurarDistancia';
    constructor(public value: {}) {}
}

export class volumenRecuperado {
    static readonly type = '[Sensor] volumenRecuperado';
    constructor (public value: {}) {}
}

export class ResetVolumenAcumulado {
    static readonly type = '[Sensor] ResetVolumenAcumulado';
}

export interface    SensorStateModel {
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
        20 : boolean, // valvula izquierda
        21 : boolean, // valvula derecga
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
        20 : false,
        21 : false,
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
        console.log("VOLUMEN NGXS" , sensorState.data[`${Sensor.VOLUME}`]);
        return sensorState.data[`${Sensor.VOLUME}`] ;
    }

    //Selector para el volumen Total
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
    static leftValve (sensorState : SensorStateModel):boolean{
        return sensorState.data[`${Sensor.VALVE_LEFT}`];
    }

    //Selecctor Valvula Derecha
    @Selector()
    static rigthValve (sensorState : SensorStateModel):boolean{
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

    //Selector para el total de distancia por tramo
    @Selector()
    static acumuladHectarea (sensorState : SensorStateModel) : number{
        return sensorState.data[`${Sensor.ACCUMULATED_HECTARE}`];
    }

    //Selector para recuperar la distancia guardada si se reiniciara el procesador 
    @Selector()
    static distanciaRecuperada (sensorState : SensorStateModel) : number{
        return sensorState.data[`${Sensor.ACCUMULATED_DISTANCE}`];
    }

    //Selector para saber la cantidad del agua que queda en el tanque
    @Selector()
    static currentTank (sensorState : SensorStateModel) : number{
        return sensorState.data[`${Sensor.CURRENT_TANK}`];
    }

    //Selelector para recuperar el volumen total acuumulado si se reiniia el procesador
    @Selector()
    static restaurarVolumen (sensorState : SensorStateModel) : number{
        return sensorState.data[`${Sensor.ACCUMULATED_RESTAURAR}`];
    }

    //Selector para recuperar el volumen si se reiniciara el procesador
    @Selector()
    static volumenRecuperado (sensorState : SensorStateModel) : number{
        return sensorState.data[`${Sensor.VOLUMEN_RECUPERADO}`];
    }

    //Selector para saber cuanto se consumio por tancada
    @Selector()
    static volumenTanque (sensorState : SensorStateModel) : number{
        return sensorState.data[`${Sensor.ACCUMULATED_VOLUME}`];
    }

    //Selector donde se estructurar la base de datos
    @Selector([SensorState])
    static evaluarDispositivos(sensorState : SensorStateModel)
    {
        //Retornar Valor de WorkExecutionDetail
        let realNow = moment();
        let volumen = sensorState.data[`${Sensor.VOLUME}`] + sensorState.data[`${Sensor.ACCUMULATED_RESTAURAR}`];

        //Variable para el consumo por tanque + el recuperado si se reinicia el aplucativo
        let volumeTanque =  sensorState.data[`${Sensor.VOLUMEN_RECUPERADO}`] + sensorState.data[`${Sensor.VOLUME}`];

        sensorState.data[`${Sensor.ACCUMULATED_VOLUME}`] = volumeTanque;
          
        //Aqui se suma la distancia recuperada en caso se reiniciara el procesador
       /*  sensorState.data[`${Sensor.ACCUMULATED_HECTARE}`] = sensorState.data[`${Sensor.ACCUMULATED_HECTARE}`] + sensorState.data[`${Sensor.ACCUMULATED_DISTANCE}`]  */

        //Hallar el volumen total - Para mejorar esta logica
        if(volumen <= 1){
            sensorState.lastVolumen = sensorState.volumenAcumulado;
        }else if (volumen > 1){
            sensorState.volumenAcumulado = volumen + sensorState.lastVolumen;
        }
        
        //Solo guardar el volumen total acumulado si es mayor a 0
        if(sensorState.volumenAcumulado > 0){
            sensorState.data[`${Sensor.ACCUMULATED_CONSUMO}`] = parseFloat(sensorState.volumenAcumulado.toFixed(2)); 
        }
                 
        //Para hallar lo que queda en el tanque 
        let tanqueActual = sensorState.initialVolume - sensorState.data[`${Sensor.VOLUME}`];
        sensorState.data[`${Sensor.CURRENT_TANK}`] = parseFloat(tanqueActual.toFixed(2));

        //Condicion para estrcturar la base de datos
        if(sensorState.waterFlow) {
           
           //Creacion de la estructura de Work Execution Detail para ser guardada
           let workDetail : WorkExecutionDetail = {
               id_work_execution : 2,
               data : JSON.stringify(sensorState.data),
               time : realNow,
               sended : false,
               precision : '', //Se enevia en vacio pero si lo implementaran la logica esta en el archivo arduino.Service.ts
               gps :  JSON.stringify(sensorState.data[`${Sensor.GPS}`]),
               has_events : false,
               events : 'NO HAY  EVENTOS',
               id : 0,
           };

           //Resetear los valores booleanos de las variables a False
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
           return workDetail; //Retornar la instancia de WorkExecutionDetail
       }

        return null; //Wn todo caso retornar null
    }

        //Action para cambiar el estado de la variable de caudal y obtener sus valores
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

        //Accion para actualizar el estado de la variable de volumen y obtener sus valores
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

        //Accion para obtener el valor del acumulador de Volumen
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

        @Action(ResetVolumenAcumulado)
        resetVolumenAcumulado(ctx: StateContext<SensorStateModel>) {
            ctx.patchState({
                volumenAcumulado : 0
            });
        }

        //Accion para el obtener el valor acumulado
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

        //Accion para recuperar el volumen recuperado
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
        
        //Accion para obtener el valor de distancia si en caso se reiniciara el procesador 
        @Action(restaurarDistancia)
        restaurarDistancia(ctx: StateContext<SensorStateModel>, action: restaurarDistancia) {
          const state = ctx.getState();
          ctx.patchState({
            data: {
              ...state.data,
              [Sensor.ACCUMULATED_HECTARE]: action.value[Sensor.ACCUMULATED_HECTARE]
            }
          });
        }

        //Accion para obtener la distancia productiva
        @Action(AcumularDistancia)
        acumularDistancia(ctx:StateContext<SensorStateModel>, action: AcumularDistancia){
            const state = ctx.getState();
            ctx.patchState({
                data: {
                    ...state.data,
                    [Sensor.ACCUMULATED_HECTARE] : action.value[Sensor.ACCUMULATED_HECTARE]
                }
            });
        }

        //Accion que cambia ek estado de el sensor de presion y obtiene el valor del sensor
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

        //Accion para cambiar el estado de la valvula derecha y obtener el valor del sensor
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

        //Accion para cambiar el estado de la valvula izquierda y obtener el valor del sensor
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

        //Accion para cambiar el estado del el gps y obtener los valores den sensor
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

        //Accion para cambiar el estado y obtener el valor de la velocidad
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

        //Accion para actualizar el valor de el valor del tanque actual , y cambiar el estado del volumen Inicial
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

        //Accion no en uso 
        @Action(SetResetApp)
        setResetApp(ctx: StateContext<SensorStateModel>, action: SetResetApp) {
            ctx.patchState({
                resetApp: action.value
            });
        }

}