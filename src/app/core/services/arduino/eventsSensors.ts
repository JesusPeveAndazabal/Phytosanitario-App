// valve.state.ts
import { State, Action, StateContext, Selector } from '@ngxs/store';
import { WorkExecutionDetail } from '../../models/work-execution';
import { Sensor } from '../../utils/global';


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
        20 : number,
        21 : number
    },
    waterFlow : boolean;
    volumen : boolean;
    pressure : boolean;
    leftValve : Boolean;
    rightValve : boolean;
    gps : boolean;
    speed : boolean;
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
        20 : 0,
        21 : 0
    },
    waterFlow : false,
    volumen : false,
    pressure : false,
    leftValve : false,
    rightValve : false,
    gps : false,
    speed : false
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
    static volumen (sensorState : SensorStateModel){
        return sensorState.volumen;
    }

    //Selector Gps
    @Selector()
    static pressure (sensorState : SensorStateModel){
        return sensorState.pressure;
    }

    @Selector()
    static leftValve (sensorState : SensorStateModel){
        return sensorState.leftValve;
    }

    @Selector()
    static rigthValve (sensorState : SensorStateModel){
        return sensorState.rightValve;
    }
    
    @Selector()
    static gps (sensorState : SensorStateModel){
        return sensorState.gps;
    }

    @Selector()
    static speed (sensorState : SensorStateModel){
        return sensorState.speed;
    }

    
    @Selector([SensorState])
    static evaluarDispositivos(sensorState : SensorStateModel){
        //POR VERIFICAR EVALUACION O CONDICIONES 
        if(sensorState.waterFlow && sensorState.pressure && sensorState.gps){

            //Retornar Valor de WorkExecutionDetail
            let workDetail : WorkExecutionDetail = {id : 2};
            workDetail.data = JSON.stringify(sensorState.data);
            //Evaluas los eventos
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