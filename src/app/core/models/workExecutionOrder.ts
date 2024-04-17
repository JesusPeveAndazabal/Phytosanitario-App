export interface WorkExecutionOrder{
    id : number;
    work : number;
    lot : number;
    worker : number;
    supervisor :number;
    date_start: moment.Moment;
    date_final: moment.Moment;
    type_implement: number;
    configuration : string;
    preconfiguration: string;
    working_time : moment.Moment;
    downtime : moment.Moment;
    hectare : number;
    product : number;
    atomizer : number;
}