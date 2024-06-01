// valve.state.ts
import { State, Action, StateContext, Selector } from '@ngxs/store';

// Acciones
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

export interface ValveStateModel {
  leftValveActive: boolean;
  rightValveActive: boolean;
}

@State<ValveStateModel>({
  name: 'valves',
  defaults: {
    leftValveActive: false,
    rightValveActive: false
  }
})

export class ValveState {
  // Selectores
  @Selector()
  static leftValveActive(state: ValveStateModel) {
    return state.leftValveActive;
  }

  @Selector()
  static rightValveActive(state: ValveStateModel) {
    return state.rightValveActive;
  }

  @Selector()
  static bothValvesActive(state: ValveStateModel): boolean {
    return state.leftValveActive && state.rightValveActive;
  }

  // Manejadores de acciones
    @Action(ActivateLeftValve)
    activateLeftValve(ctx: StateContext<ValveStateModel>) {
        ctx.patchState({ leftValveActive: true });
    }

    @Action(DeactivateLeftValve)
    deactivateLeftValve(ctx: StateContext<ValveStateModel>) {
        ctx.patchState({ leftValveActive: false });
    }

    @Action(ActivateRightValve)
    activateRightValve(ctx: StateContext<ValveStateModel>) {
        ctx.patchState({ rightValveActive: true });
    }

    @Action(DeactivateRightValve)
    deactivateRightValve(ctx: StateContext<ValveStateModel>) {
        ctx.patchState({ rightValveActive: false });
    }

  // Dentro de la clase ValveState
    @Action(ActivateBothValves)
    activateBothValves(ctx: StateContext<ValveStateModel>) {
    ctx.patchState({ leftValveActive: true, rightValveActive: true });
    }

    @Action(DeactivateBothValves)
    deactivateBothValves(ctx: StateContext<ValveStateModel>) {
    ctx.patchState({ leftValveActive: false, rightValveActive: false });
    }
}
