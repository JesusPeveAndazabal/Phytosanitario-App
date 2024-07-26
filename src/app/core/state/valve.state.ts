// valve.state.ts
import { State, Action, StateContext, Selector } from '@ngxs/store';

// Acciones para el control de estado de las valvulas

export class ActivateLeftValve {
  static readonly type = '[Valve] Activate Left';
}

export class DeactivateLeftValve {
  static readonly type = '[Valve] Deactivate Left';
}

export class ActivateRightValve {
  static readonly type = '[Valve] Activate Right';
}

export class DeactivateRightValve {
  static readonly type = '[Valve] Deactivate Right';
}

export class ActivateBothValves {
    static readonly type = '[Valve] Activate Both';
  }
  
  export class DeactivateBothValves {
    static readonly type = '[Valve] Deactivate Both';
  }

//Interfaz para las valvulas
export interface ValveStateModel {
  leftValveActive: boolean;
  rightValveActive: boolean;
}

//Modelo por default para las valvulas
@State<ValveStateModel>({
  name: 'valves',
  defaults: {
    leftValveActive: false,
    rightValveActive: false
  }
})

//Clase con selectores
export class ValveState {
  // Selectores

  //Selector para la valvula Izquierda
  @Selector()
  static leftValveActive(state: ValveStateModel) {
    return state.leftValveActive;
  }

  //Selector para la valvula Derecha
  @Selector()
  static rightValveActive(state: ValveStateModel) {
    return state.rightValveActive;
  }

  //Selector para las 2 valvulas
  @Selector()
  static bothValvesActive(state: ValveStateModel): boolean {
    return state.leftValveActive && state.rightValveActive;
  }

  //Manejadores de acciones

    //Accion para cambiar el estado a 'true' de la valulva Izquierda
    @Action(ActivateLeftValve)
    activateLeftValve(ctx: StateContext<ValveStateModel>) {
        ctx.patchState({ leftValveActive: true });
    }

    //Accion para cambiar el estado a 'false' de la valulva Izquierda
    @Action(DeactivateLeftValve)
    deactivateLeftValve(ctx: StateContext<ValveStateModel>) {
        ctx.patchState({ leftValveActive: false });
    }

    //Accion para cambiar el estado a 'true' de la valvula derecha
    @Action(ActivateRightValve)
    activateRightValve(ctx: StateContext<ValveStateModel>) {
        ctx.patchState({ rightValveActive: true });
    }

    //Accion para cambiar el estado a 'false' de la valvula derecha
    @Action(DeactivateRightValve)
    deactivateRightValve(ctx: StateContext<ValveStateModel>) {
        ctx.patchState({ rightValveActive: false });
    }

    //Accion para cambiar el estado de las 2 valvulas a 'true'
    @Action(ActivateBothValves)
    activateBothValves(ctx: StateContext<ValveStateModel>) {
    ctx.patchState({ leftValveActive: true, rightValveActive: true });
    }

    //Accion para cambiar el estado de las 2 valvulas a 'false'
    @Action(DeactivateBothValves)
    deactivateBothValves(ctx: StateContext<ValveStateModel>) {
    ctx.patchState({ leftValveActive: false, rightValveActive: false });
    }
}
