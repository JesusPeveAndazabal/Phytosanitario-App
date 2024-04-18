export interface WorkExecutionOrder{
    id : number;
    work : number;
    work_name : string;
    lot : number;
    worker : number;
    supervisor :number;
    date_start: moment.Moment;
    date_final: moment.Moment;
    implement: number;
    implement_name : string;
    configuration : string;
    configuration_consume : string;
    preconfiguration: string;
    working_time : moment.Moment;
    downtime : moment.Moment;
    hectare : number;
    product : number;
    atomizer : string;
}