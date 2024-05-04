export interface WorkExecutionOrder{
    id : number;
    work : number;
    work_name : string;
    lot : number;
    supervisor :number;
    date_start: moment.Moment;
    date_final: moment.Moment;
    type_implement : number;
    type_implement_name : number;
    configuration : string;
    configuration_consume : string;
    preconfiguration: string;
    hectare : number;
    product : string;
    cultivation : number;
    atomizer : string;
}