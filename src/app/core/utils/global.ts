export const config = {
  maxVolume: 0,
  gps : new Array<any>(),
  lastWorkExecution : null
}

export enum PersonType{
    OPERADOR = 1,
    SUPERVISOR = 2
}

export enum Mode{
    ONLY_READ = 1,
    ONLY_WRITE = 2,
    READ_WRITE = 3,
}

export enum Sensor{
    SPEED = 1,
    WATER_FLOW = 2, //Valor del caudal
    PRESSURE = 3,
    GPS = 4,
    VOLUME = 5, //resta del anterior con el siguiente
    PPM = 6,
    PH = 7,
    TEMPERATURE = 8,
    HUMIDITY = 9,
    VOLUME_CONTAINER = 10,
    DISTANCE_NEXT_SECTION = 11, //Calcula la distancia por tramo - calculo por velocidad
    ACCUMULATED_VOLUME = 12, //Valor del sensor acumulado
    ACCUMULATED_HECTARE= 13, //Acumulado de la distancia - calculo por velocidad
  

    TOTAL_DISTANCE = 14, //Total por tramo : formula
    ACCUMULATED_DISTANCE = 15, //Acumulado distancia : formula

    /* VERIFICAR ESTADO DEL ARDUINO */
    STATUS_PRESSURE = 16, //ESTADO DEL ARDUINO DE PRESION
    STATUS_WATTERFLOW = 17, //ESTADO DEL ARDUINO DEL CAUDAL
    STATUS_GPS = 18, //ESTADO DEL ARDUINO DEL GPS
    CURRENT_TANK = 19, //CANTIDAD DEL TANQUE ACTUAL


    VALVE_LEFT = 20, // IZQUIERDA
    VALVE_RIGHT = 21, // DERECHA
    PRESSURE_REGULATOR = 22, // REGULADOR DE PRESION
    ACCUMULATED_CONSUMO = 23,
    ACCUMULATED_RESTAURAR = 24,
    VOLUMEN_RECUPERADO = 25,
    ADD_BATCH = 26
}

export enum SocketEvent{
    NEW_VALUES = 1,
    DEVICE_STATUS_CHANGES = 2,
    COMMANDS = 3,
    WORK_DATA_CHANGES = 4,
    WORK_STATUS_CHANGES = 5,
    VALVE_CHANGES = 6,
    GET_CURRENT_STATUS = 7,
    GET_TOKEN = 8,
    CONFIG_CHANGES = 9,
    GPS_DATA = 10,
    REGULATING_PRESSURE = 11
}

export enum WorkDataChange{
    INSERT = 1,
    UPDATE = 2
}

export enum WorkStatusChange{
    START = 1,
    STOP = 2,
    FINISH = 3
}

export enum UnitPressureEnum{
    BAR = 1,
    PASCAL = 2,
    ATMOSFERA = 3,
    PSI = 4,
    MMHG = 5
}

export const UnitPressure = [
    { value : 1 , name: "BAR",factor : 0},
    { value : 2 , name: "PA",factor : 0},
    { value : 3 , name: "ATM",factor : 0},
    { value : 4 , name: "PSI",factor : 0},
    { value : 5 , name: "MMHG",factor : 0}
]

export const convertPressureUnit = (value : number,original_unit : UnitPressureEnum ,to_unit: UnitPressureEnum):number =>{
    switch (original_unit) {
      case UnitPressureEnum.BAR:
        switch (to_unit) {
          case UnitPressureEnum.BAR:
            return value;
          case UnitPressureEnum.PASCAL:
            return value * 100000;
          case UnitPressureEnum.ATMOSFERA:
            return value * 0.986923;
          case UnitPressureEnum.PSI:
            return value * 14.5038;
          case UnitPressureEnum.MMHG:
            return value * 750.062;
        }
        break;
      case UnitPressureEnum.PASCAL:
        switch (to_unit) {
          case UnitPressureEnum.BAR:
            return value / 100000;
          case UnitPressureEnum.PASCAL:
            return value;
          case UnitPressureEnum.ATMOSFERA:
            return value / 101325;
          case UnitPressureEnum.PSI:
            return value / 6895;
          case UnitPressureEnum.MMHG:
            return value / 133;
        }
        break;
      case UnitPressureEnum.ATMOSFERA:
        switch (to_unit) {
          case UnitPressureEnum.BAR:
            return value / 0.986923;
          case UnitPressureEnum.PASCAL:
            return value * 101325;
          case UnitPressureEnum.ATMOSFERA:
            return value;
          case UnitPressureEnum.PSI:
            return value * 14.6959;
          case UnitPressureEnum.MMHG:
            return value * 760;
        }
        break;
      case UnitPressureEnum.PSI:
        switch (to_unit) {
          case UnitPressureEnum.BAR:
            return value / 14.5038;
          case UnitPressureEnum.PASCAL:
            return value * 6895;
          case UnitPressureEnum.ATMOSFERA:
            return value / 14.6959;
          case UnitPressureEnum.PSI:
            return value;
          case UnitPressureEnum.MMHG:
            return value * 51.715;
        }
        break;
      case UnitPressureEnum.MMHG:
        switch (to_unit) {
          case UnitPressureEnum.BAR:
            return value / 750.062;
          case UnitPressureEnum.PASCAL:
            return value * 133.322;
          case UnitPressureEnum.ATMOSFERA:
            return value / 760;
          case UnitPressureEnum.PSI:
            return value / 51.715;
          case UnitPressureEnum.MMHG:
            return value;
        }
        break;
    }
}

export const calcular_caudal_objetivo = (caudal_inicial: number, presion_objetiva: number, presion_inicial: number, presion_final: number, caudal_final: number): number => {
  const caudal_objetivo = caudal_inicial + ((presion_objetiva - presion_inicial) / (presion_final - presion_inicial)) * (caudal_final - caudal_inicial);
  return caudal_objetivo;
}


