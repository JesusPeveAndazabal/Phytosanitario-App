import { environment } from './../../../../environments/environment.prod';

import { Injectable } from '@angular/core';
import { ElectronService } from '../electron/electron.service';
import { Person,Lot, NozzleColor, NozzleType, Nozzles, WorkExecution, WorkExecutionDetail ,Work, Cultivation, Farm, Product, WaterVolumes, WorkExecutionConfiguration } from '../../models/models';
import * as moment from 'moment';
import { SocketEvent,WorkDataChange } from '../../utils/global';
import { LocalConf } from '../../models/local_conf';
import { Login } from '../../models/login';
import { WorkExecutionOrder } from '../../models/workExecutionOrder';
import { Atomizer } from '../../models/Atomizer';
import { Implement } from '../../models/Implements';

@Injectable({
  providedIn: 'root'
})

export class DatabaseService extends ElectronService {
  // isService = false;
  // native = false;
  file : string;
  platform!: string;
  //#region plugin initialization functions

  constructor() {
    super();
    if(this.isElectron){
      this.file = this.path.resolve("bd/", "database.sqlite");
      //this.file = "C:/Users/BETA/Documents/proyectos/ScaleApp/src/assets/database.sqlite"
    }
  }

  /**
   * Return status of the initialization process
   * @returns successful initialization
   */
  // initializePlugin(): Promise<boolean> {

  // }

  /**
   * Returns the SQLite Plugin
   * @returns CapacitorSQLitePlugin
   */
  // getSqlitePlugin(): CapacitorSQLitePlugin {
  //   return this.sqlitePlugin;
  // }

  /**
   * Returns the SQLite connection
   * @returns SQLiteConnection
   */

  //Funcion para abrir la conexion , crear el archivo de la base de datos y  crear las tablas
  public openConnection(){
    let instance = this;

    return new Promise(function (resolve,reject) {
      let exists = instance.fs.existsSync(instance.file);
      if (exists) {
        let db = new instance.sqlite.Database(instance.file);
        return process.nextTick(() => resolve(db));
      } else {
          console.log("Creating DB file...");
          instance.fs.openSync(instance.file, "w");
          let db = new instance.sqlite.Database(instance.file);
          db.run('PRAGMA foreign_keys = ON;');
          //Creacinn del esquema de las tablas
          let sql = "	CREATE TABLE IF NOT EXISTS login( \n"
                + "	operador INTEGER, \n"
                + " implement INTEGER, \n"
                + "	fechahora TEXT, \n"
                + " FOREIGN KEY (operador) REFERENCES person(id) \n"
                + "	); \n"
          
                + " CREATE TABLE IF NOT EXISTS person (\n"
                + "	id integer PRIMARY KEY NOT NULL,\n"
                + "	code TEXT NOT NULL,\n"
                + "	fullname TEXT,\n"
                + "	document TEXT,\n"
                + "	type integer,\n"
                + "	is_deleted integer\n"
                + "	);\n"

                + "	CREATE TABLE IF NOT EXISTS local_conf( \n"
                + "	api_server TEXT, \n"
                + "	vol_alert_on REAL, \n"
                + "	min_wflow REAL, \n"
                + "	max_wflow REAL, \n"
                + "	unit_pressure INTEGER, \n"
                + "	min_pressure REAL, \n"
                + "	max_pressure REAL, \n"
                + "	fecha TEXT \n"
                + " ); \n"

                + "	CREATE INDEX IF NOT EXISTS person_index_code ON person (code);\n"

                + "	CREATE INDEX IF NOT EXISTS person_index_document ON person (document);\n"

                + "	CREATE TABLE IF NOT EXISTS work(\n"
                + "	id INTEGER PRIMARY KEY,\n"
                + "	name TEXT, \n"
                + "	cultivation INTEGER, \n"
                + "	cultivation_name TEXT, \n"
                + "	product INTEGER, \n"
                + "	product_name TEXT, \n"
                + "	risk INTEGER, \n"
                + "	risk_name TEXT, \n"
                + "	pressure_tolerance REAL \n"
                + "	); \n"

                /* TABLA AÑADIDA */
                + "CREATE TABLE IF NOT EXISTS work_execution_order( \n"
                + " id INTEGER PRIMARY KEY, \n"
                + " work INTEGER, \n"
                + " work_name TEXT, \n"
                + " lot INTEGER, \n"
                + " supervisor INTEGER, \n"
                + " date_start TEXT, \n"
                + " date_final TEXT, \n"
                + " type_implement INTEGER, \n"
                + " type_implement_name TEXT , \n"
                + " configuration TEXT, \n"
                + " configuration_consume TEXT, \n"
                + " preconfiguration TEXT, \n"
                + " hectare REAL, \n"
                + " product TEXT, \n"
                + " cultivation INTEGER, \n"
                + " atomizer TEXT \n"
                + "	); \n"

                /* TAVBALA MODIFICICADA */
                + "	CREATE TABLE IF NOT EXISTS work_execution( \n"
                + "	id INTEGER PRIMARY KEY AUTOINCREMENT, \n"
                + " weorder INTEGER, \n"
                + " implement INTEGER, \n"
                + "	work INTEGER, \n"
                + "	lot INTEGER, \n"
                + "	worker INTEGER, \n"
                + "	date TEXT, \n"
                + "	configuration TEXT, \n"
                + "	working_time TEXT, \n"
                + "	downtime TEXT, \n"
                + "	hectare REAL, \n"
                + "	cultivation INTEGER, \n"
                + "	product TEXT, \n"
                + "	supervisor INTEGER, \n"
                + "	is_finished INTEGER, \n"
                + " id_from_server INTEGER, \n"
                + "	sended INTEGER, \n"
                + " execution_from INTEGER \n"
                + "	); \n"

                + " CREATE TABLE IF NOT EXISTS work_execution_details( \n"
                + " id INTEGER PRIMARY KEY AUTOINCREMENT, \n"
                + " id_work_execution INTEGER, \n"
                + " time TEXT, \n"
                + " sended BOOLEAN, \n"
                + " data TEXT, \n"
                + " precision TEXT, \n"
                + " gps TEXT, \n"
                + " has_events BOOLEAN, \n"
                + " events TEXT, \n"
                + " FOREIGN KEY (id_work_execution) REFERENCES work_execution(id) \n"
                + "); \n"

                /* TABLA AÑADIDA */
                + "CREATE TABLE IF NOT EXISTS type_implement( \n"
                + " id INTEGER PRIMARY KEY, \n"
                + " description TEXT, \n"
                + " min_volume INTEGER \n"
                + "); \n"

                /* TABLA AÑADIDA */
                + "CREATE TABLE IF NOT EXISTS implement( \n"
                + " id INTEGER PRIMARY KEY, \n"
                + " name TEXT, \n"
                + " typeImplement INTEGER \n"
                + "); \n"

                + "	CREATE TABLE IF NOT EXISTS water_volumes( \n"
                + "	id INTEGER PRIMARY KEY AUTOINCREMENT, \n"
                + "	work_exec_id INTEGER, \n"
                + "	volume REAL \n"
                + "	); \n"


                /* TABLA AÑADIDA */
                + " CREATE TABLE IF NOT EXISTS recharge_point( \n"
                + " id INTEGER PRIMARY KEY, \n"
                + " name TEXT, \n"
                + " farma INTEGER, \n"
                + " ppm REAL, \n"
                + " ph REAL \n"
                + "	); \n"

                + "	CREATE TABLE IF NOT EXISTS lot( \n"
                + "	id INTEGER PRIMARY KEY, \n"
                + "	name TEXT, \n"
                + "	hectare REAL, \n"
                + "	width REAL, \n"
                + "	volume REAL, \n"
                + "	cultivation INTEGER, \n"
                + "	cultivation_name TEXT, \n"
                + "	owner INTEGER, \n"
                + "	farm INTEGER, \n"
                + "	farm_name TEXT \n"
                + "	); \n"

                /* TABLA MODIFICADA */
                + "	CREATE TABLE IF NOT EXISTS product( \n"
                + "	id INTEGER PRIMARY KEY, \n"
                + "	name TEXT, \n"
                + " manufacturer INTEGER, \n"
                + " formula TEXT, \n"
                + " register TEXT, \n"
                + " risk INTEGER \n"
                + "	); \n"

                + "	CREATE TABLE IF NOT EXISTS nozzle_type ( \n"
                + "	id INTEGER PRIMARY KEY, \n"
                + "	name TEXT \n"
                + "	); \n"

                + "	CREATE TABLE IF NOT EXISTS nozzle_color( \n"
                + "	id INTEGER PRIMARY KEY, \n"
                + "	code TEXT, \n"
                + "	name TEXT \n"
                + "	); \n"

                + "	CREATE TABLE IF NOT EXISTS nozzles( \n"
                + "	id INTEGER PRIMARY KEY, \n"
                + "	type INTEGER, \n"
                + "	color INTEGER, \n"
                + "	pressure REAL, \n"
                + "	pressure_unit INTEGER, \n"
                + "	flow REAL \n"
                + "	); \n"

                + "	CREATE TABLE IF NOT EXISTS cultivation( \n"
                + "	id INTEGER PRIMARY KEY, \n"
                + "	code TEXT, \n"
                + "	name TEXT \n"
                + "	); \n"

                + "	CREATE TABLE IF NOT EXISTS farm( \n"
                + "	id INTEGER PRIMARY KEY, \n"
                + "	name TEXT \n"
                + "	); ";


          db = db.exec(sql);
          db.close();
          process.nextTick(() => resolve(db));
      }
    });
  }


  async closeDB(): Promise<void> {
    let instance = this;
    let db = new instance.sqlite.Database(instance.file);
    if (db) {
      db.close((err) => {
        if (err) {
          console.error('Error al cerrar la base de datos', err.message);
        } else {
          console.log('Base de datos SQLite cerrada');
        }
      });
    }
  }
  /**
   * Open a new database connection.
   * This method must be called inside the ngAfterViewInit method or after the next cycle methods of the component.
   * @param dbName Database name
   * @param encrypted work with encryption
   * @param mode `no-encryption`
   * @param version number of database version
   * @param isDelete delete the previous session's database
   * @param readOnly read only session
   * @returns SQLiteDBConnection instance
   */

  /**
   * Delete the current database
   * @returns void
   */

  /**
   * Close the database connection
   * @param dbName Database name
   * @param readOnly if the database was open as read only
   * @returns
   */

  //Funcion para obtener el nombre de las tablas
  async getTableNames(): Promise<any[]> {
    return new Promise<any[]>((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql = "SELECT * FROM sqlite_master";
      db.get(sql,[ ],(err,rows : any[])=>{
        if(err){
          process.nextTick(() => reject(err));
        }
        process.nextTick(() => resolve(rows));
      });
      db.close();
    });
  }

  /**
   * Get the Person's data from the database
   * @returns Array of Person class
   */
  
  //Obtener los datos de la persona
  async getPersonData(): Promise<Person[]> {
    return new Promise<Person[]>((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql = "SELECT * from person where is_deleted = false";
      db.all(sql,[ ],(err,rows : Person[])=>{
        if(err){
          process.nextTick(() => reject(err));
        }
        process.nextTick(() => resolve(rows));
      });
      db.close();
    });
  }

  /**
   * Save Person data from server to local db for offline case uses
   * @param data Array of Person class
   * @returns void
   */

  //Sincronizar los datos de la persona 
  async syncPersonData(data: Array<Person>): Promise<boolean> {
    return new Promise((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql = "INSERT INTO person (id, code, fullname, document, type, is_deleted) VALUES (?, ?, ?, ?, ?, ?);";

      // Iterar sobre los datos y realizar la inserción por cada uno
      data.forEach((o) => {
        db.run(sql, [o.id, o.code, o.fullname, o.document, o.type, o.is_deleted], (err: Error | null) => {
          if (err && err.message.includes('UNIQUE constraint failed')) {
            console.warn(`Registro duplicado para el id: ${o.id}. Ignorando.`);
          } else if (err) {
            console.error("SQLITE INSERT error", err);
            reject(err);
          }
        });
      });

      // Cerrar la base de datos después de que todas las inserciones se hayan completado
      db.close((err: Error | null) => {
        if (err) {
          console.error("Error al cerrar la base de datos", err);
          reject(err);
        } else {
          //console.log("Base de datos cerrada");
          resolve(true);
        }
      });
    });
  }

  /**
   * Get the Lot's data from the database
   * @returns Array of Person class
   */

  //Obtener los datos de lotes 
  async getLotData(): Promise<Lot[]> {
    return new Promise<Lot[]>((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql = "SELECT * from lot";
      db.all(sql,[ ],(err,rows : Lot[])=>{
        if(err){
          process.nextTick(() => reject(err));
        }
        process.nextTick(() => resolve(rows));
      });
      db.close();
    });
  }

  /**
   * Save Lot data from server to local db for offline case uses
   * @param data Array of Lot class
   * @returns void
   */

  //Sincronizar el dato de los lotes
  async syncLotsData(data: Array<Lot>): Promise<boolean> {
    return new Promise((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql = "INSERT INTO lot (id, name, hectare, width, volume, cultivation, cultivation_name, owner, farm, farm_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);";

      // Iterar sobre los datos y realizar la inserción por cada uno
      data.forEach((o) => {
        db.run(sql, [o.id, o.name, o.hectare, o.width, o.volume, o.cultivation, o.cultivation_name, o.owner, o.farm, o.farm_name], (err: Error | null) => {
          if (err && err.message.includes('UNIQUE constraint failed')) {
            console.warn(`Registro duplicado para el id: ${o.id}. Ignorando.`);
          } else if (err) {
            console.error("SQLITE INSERT error", err);
            reject(err);
          }
        });
      });

      // Cerrar la base de datos después de que todas las inserciones se hayan completado
      db.close((err: Error | null) => {
        if (err) {
          console.error("Error al cerrar la base de datos", err);
          reject(err);
        } else {
          //console.log("Base de datos cerrada");
          resolve(true);
        }
      });
    });
  }

  /**
   * Get the Nozzle's color data from the database
   * @returns Array of NozzleColor class
   */

  //Obtener el color de las boquillas
  async getNozzleColorData(): Promise<NozzleColor[]> {
    return new Promise<NozzleColor[]>((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql = "SELECT * from nozzle_color";
      db.all(sql,[ ],(err,rows : NozzleColor[])=>{
        if(err){
          process.nextTick(() => reject(err));
        }
        process.nextTick(() => resolve(rows));
      });
      db.close();
    });
  }

  /**
   * Save Nozzle's color data from server to local db for offline case uses
   * @param data Array of NozzleColor class
   * @returns void
   */

  //Sincronizar los datos de los colores de boquilla
  async syncNozzleColorData(data: Array<NozzleColor>): Promise<boolean> {
    return new Promise((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql = "INSERT INTO nozzle_color (id, name, code) VALUES (?, ?, ?);";

      // Iterar sobre los datos y realizar la inserción por cada uno
      data.forEach((o) => {
        db.run(sql, [o.id, o.name, o.code], (err: Error | null) => {
          if (err && err.message.includes('UNIQUE constraint failed')) {
            console.warn(`Registro duplicado para el id: ${o.id}. Ignorando.`);
          } else if (err) {
            console.error("SQLITE INSERT error", err);
            reject(err);
          }
        });
      });

      // Cerrar la base de datos después de que todas las inserciones se hayan completado
      db.close((err: Error | null) => {
        if (err) {
          console.error("Error al cerrar la base de datos", err);
          reject(err);
        } else {
          //console.log("Base de datos cerrada");
          resolve(true);
        }
      });
    });
  }

  /**
   * Get the Nozzle's type data from the database
   * @returns Array of NozzleType class
   */

  //Obtener los tipos de boquillas
  async getNozzleTypeData(): Promise<NozzleType[]> {
    return new Promise<NozzleType[]>((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql = "SELECT * from nozzle_type";
      db.all(sql,[ ],(err,rows : NozzleType[])=>{
        if(err){
          process.nextTick(() => reject(err));
        }
        process.nextTick(() => resolve(rows));
      });
      db.close();
    });
  }

  /**
   * Save NozzleType data from server to local db for offline case uses
   * @param data Array of NozzleType class
   * @returns void
   */

  //Sincronizar ñps datps de os tipos de boquillas
  async syncNozzleTypeData(data: Array<NozzleType>): Promise<boolean> {
    return new Promise((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql = "INSERT INTO nozzle_type (id, name) VALUES (?, ?);";

      // Iterar sobre los datos y realizar la inserción por cada uno
      data.forEach((o) => {
        db.run(sql, [o.id, o.name], (err: Error | null) => {
          if (err && err.message.includes('UNIQUE constraint failed')) {
            console.warn(`Registro duplicado para el id: ${o.id}. Ignorando.`);
          } else if (err) {
            console.error("SQLITE INSERT error", err);
            reject(err);
          }
        });
      });

      // Cerrar la base de datos después de que todas las inserciones se hayan completado
      db.close((err: Error | null) => {
        if (err) {
          console.error("Error al cerrar la base de datos", err);
          reject(err);
        } else {
          //console.log("Base de datos cerrada");
          resolve(true);
        }
      });
    });
  }
  

  /**
   * Get the Nozzle's data from the database
   * @returns Array of Nozzle class
   */

  async getNozzlesData(): Promise<Nozzles[]> {
    return new Promise<Nozzles[]>((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql = "SELECT * from nozzles";
      db.all(sql,[ ],(err,rows : Nozzles[])=>{
        if(err){
          process.nextTick(() => reject(err));
        }
        process.nextTick(() => resolve(rows));
      });
      db.close();
    });
  }

  /**
   * Save Nozzle's data from server to local db for offline case uses
   * @param data Array of Nozzle class
   * @returns void
   */

  //Sincronizar los datos de las boquillas
  async syncNozzlesData(data: Array<Nozzles>): Promise<boolean> {
    return new Promise((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql = "INSERT INTO nozzles (id, type, color, pressure, pressure_unit, flow) VALUES (?, ?, ?, ?, ?, ?);";

      // Iterar sobre los datos y realizar la inserción por cada uno
      data.forEach((o) => {
        db.run(sql, [o.id, o.type, o.color, o.pressure, o.pressure_unit, o.flow], (err: Error | null) => {
          if (err && err.message.includes('UNIQUE constraint failed')) {
            console.warn(`Registro duplicado para el id: ${o.id}. Ignorando.`);
          } else if (err) {
            console.error("SQLITE INSERT error", err);
            reject(err);
          }
        });
      });

      // Cerrar la base de datos después de que todas las inserciones se hayan completado
      db.close((err: Error | null) => {
        if (err) {
          console.error("Error al cerrar la base de datos", err);
          reject(err);
        } else {
          //console.log("Base de datos cerrada");
          resolve(true);
        }
      });
    });
  }

  /**
   * Get the WorkExecution's data from the database
   * @returns Array of WorkExecution class
   */

  //Obtener los datos de la ejecucion de trabajo
  async getWorkExecution(): Promise<WorkExecution[]> {
    return new Promise<WorkExecution[]>((resolve, reject) =>{
      let db = new this.sqlite.Database(this.file);
      let sql = "SELECT * from work_execution";
      db.all(sql,[ ],(err,rows : WorkExecution[])=>{
        if(err){
          process.nextTick(() => reject(err));
        }
        process.nextTick(() => resolve(rows));
      });
      db.close();
    });
  }

  //Obtener los trabajos finalizados
  async getWorkExecutionFinished(): Promise<WorkExecution[]> {
    return new Promise<WorkExecution[]>((resolve, reject) =>{
      let db = new this.sqlite.Database(this.file);
      let sql = "SELECT * from work_execution WHERE is_finished = 1";
      db.all(sql,[ ],(err,rows : WorkExecution[])=>{
        if(err){
          process.nextTick(() => reject(err));
        }
        process.nextTick(() => resolve(rows));
      });
      db.close();
    });
  }

  //Obtener la orden de trabajo
  async getWorkExecutionOrder(): Promise<WorkExecutionOrder[]> {
    return new Promise<WorkExecutionOrder[]>((resolve, reject) =>{
      let db = new this.sqlite.Database(this.file);
      let sql = "SELECT * from work_execution_order";
      db.all(sql,[ ],(err,rows : WorkExecutionOrder[])=>{
        if(err){
          process.nextTick(() => reject(err));
        }
        process.nextTick(() => resolve(rows));
      });
      db.close();
    });
  }
  

  /**
   * Get the WorkExecution's data from the database
   * @returns Array of WorkExecution class
   */

  //Obtener la ejecucion de trabajo que se esta ejecutando
  async getLastWorkExecution(): Promise<WorkExecution> {
    return new Promise<WorkExecution>((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql = "SELECT * from work_execution WHERE is_finished = 0 ORDER BY id DESC LIMIT 1";
      db.get(sql,[ ],(err,rows : any)=>{
        if(err){
          process.nextTick(() => reject(err));
        }
        if(rows){
          let row2 : WorkExecution = {
            ...rows,
            working_time : moment(rows.working_time,"HH:mm:ss"),
            downtime : moment(rows.downtime,"HH:mm:ss")
          };
          process.nextTick(() => resolve(row2));
        }else 
          process.nextTick(() => resolve(rows));   
      });
      db.close();
    });
  }

  //Obtener la ordenes de trabajo
  async getLastWorkExecutionOrder(): Promise<WorkExecution> {
    return new Promise<WorkExecution>((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql = "SELECT * from work_execution";
      db.get(sql,[ ],(err,rows : any)=>{  
        if(err){
          process.nextTick(() => reject(err));
        }
        if(rows){
          let row2 : WorkExecution = {
            ...rows,
            working_time : moment(rows.working_time,"HH:mm:ss"),
            downtime : moment(rows.downtime,"HH:mm:ss")
          };
          process.nextTick(() => resolve(row2));
        }else 
          process.nextTick(() => resolve(rows));   
      });
      db.close();
    });
  }

  /**
   * Get the WorkExecution's data from the database
   * @returns Array of WorkExecution class
   */

  //Obtener el valor del volumen Actual
  async getLastWaterVolume(work : number): Promise<WaterVolumes> {
    return new Promise<WaterVolumes>((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql = "SELECT * from water_volumes WHERE work_exec_id = ? ORDER BY id DESC LIMIT 1";
      db.get(sql,[work],(err,rows : WaterVolumes)=>{
        if(err){
          process.nextTick(() => reject(err));
        }
        process.nextTick(() => resolve(rows));
      });
      db.close();
    });
  }

  /**
   * Save WorkExecution's data from server to local db for offline case uses
   * @param data Array of WorkExecution class
   * @returns void
   */
  // async saveWorkExecutionData(o : WorkExecution): Promise<boolean> {
  //   return new Promise((resolve, reject) => {
  //     let db = new this.sqlite.Database(this.file);
  //     let sql = "INSERT INTO work_execution (work,lot,worker,supervisor,date,configuration,working_time,downtime,hectare,cultivation,product,is_finished,sended) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?);";
  //     db = db.run(sql,[o.work,o.lot,o.worker,o.supervisor,o.date.format('YYYY-MM-DD H:mm:ss'),o.configuration,o.working_time.format('H:mm:ss'),o.downtime.format('H:mm:ss'),o.hectare,o.cultivation,o.product,o.is_finished,0],
  //       (err : Error)=>{
  //         if(err){
  //           console.log("SQLITE INSERT error", err);
  //           process.nextTick(() => reject(err));
  //         }
  //         process.nextTick(() => resolve(true));
  //       });
  //       db.close();
  //   });
  // }

  //Guardar la ejecucion de trabajo con todos los parametros que se pide
  async saveWorkExecutionData(o: WorkExecution): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let insertSql =
        "INSERT INTO work_execution (weorder,implement,work,lot,worker,supervisor,date,configuration,working_time,downtime,hectare,cultivation,product,is_finished,id_from_server,sended,execution_from) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);";

      // Ejecutar la inserción en la tabla 'work_execution'
      db.run(
        insertSql,
        [
          o.weorder,
          o.implement,
          o.work,
          o.lot,
          o.worker,
          o.supervisor,
          o.date.format("YYYY-MM-DD H:mm:ss"),
          o.configuration,
          o.working_time.format("H:mm:ss"),
          o.downtime.format("H:mm:ss"),
          o.hectare,
          o.cultivation,
          o.product,
          o.is_finished,
          o.id_from_server,
          0,
          1,
        ],
        (err: Error | null) => {
          if (err) {
            console.error("SQLITE INSERT error", err);
            reject(err);
          } else {
            //console.log("Inserción exitosa");
            resolve(true);
          }

          // Cerrar la base de datos después de la operación
          db.close((closeErr: Error | null) => {
            if (closeErr) {
              console.error("Error al cerrar la base de datos", closeErr);
            }
          });
        }
      );
    });
  }

  //Obtener los datos de las ejecucione que no se han enviado al servidor por el campo 'sended'
  async getNotSendedExecution() : Promise<WorkExecution[]>{
    return new Promise<WorkExecution[]>((resolve,reject)=>{
      let db = new this.sqlite.Database(this.file);

      let sql = `SELECT * FROM work_execution as we WHERE sended = ? 
                or id in (SELECT distinct id_work_execution FROM work_execution_details as wed WHERE wed.sended = 0)`;
      db.all(sql,[0],(err,rows : WorkExecution[])=>{
        if(err){
          process.nextTick(() => reject(err));
        }
        process.nextTick(() => resolve(rows));
      });
      db.close();
    });
  }

  //Actualizar el campo 'sended' para poder identificar los registros que han sido enviados al servidor
  async updateExecutionSended(wExecution : WorkExecution){
    return new Promise<boolean>((resolve,reject)=>{
      let db = new this.sqlite.Database(this.file);
      let sql = "UPDATE work_execution SET sended = ? , id_from_server = ? WHERE id = ?";

      db = db.run(sql,[1,wExecution.id_from_server,wExecution.id],
        (err : Error)=>{
          if(err){
            //console.log("SQLITE UPDATE error", err);
            process.nextTick(() => reject(err));
          }
          process.nextTick(() => resolve(true));
        });
        db.close();
    });
  }

  /**
   * Save WorkExecution's data from server to local db for offline case uses
   * @param data Array of WorkExecution class
   * @returns void
   */
  // async saveWaterVolumes(o : WaterVolumes,work : WorkExecution): Promise<boolean> {
  //   return new Promise<boolean>((resolve, reject) =>{
  //     let db = new this.sqlite.Database(this.file);
  //     let sql = "INSERT INTO water_volumes (work_exec_id,volume) VALUES (?,?);";
  //     db = db.run(sql,[o.work_exec_id,o.volume],
  //       (err : Error)=>{
  //         if(err){
  //           console.log("SQLITE INSERT error", err);
  //           process.nextTick(() => reject(err));
  //         }
  //         process.nextTick(() => resolve(true));
  //       });
  //       db.close();
  //     sql = "UPDATE work_execution SET configuration = ? where id = ?;";
  //     db = db.run(sql,[work.configuration,o.work_exec_id],
  //       (err : Error)=>{
  //         if(err){
  //           console.log("SQLITE INSERT error", err);
  //           process.nextTick(() => reject(err));
  //         }
  //         process.nextTick(() => resolve(true));
  //       });
  //       db.close();
  //   });
  // }

  //Guardar el registro del volumen que se configura por cada tancada
  async saveWaterVolumes(o: WaterVolumes, work: WorkExecution): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let insertSql = "INSERT INTO water_volumes (work_exec_id, volume) VALUES (?, ?);";
      let updateSql = "UPDATE work_execution SET configuration = ? WHERE id = ?;";

      // Ejecutar la inserción en la tabla 'water_volumes'
      db.run(insertSql, [o.work_exec_id, o.volume], (insertErr: Error | null) => {
        if (insertErr) {
          console.error("SQLITE INSERT error", insertErr);
          reject(insertErr);
          return;
        }

        // Ejecutar la actualización en la tabla 'work_execution'
        db.run(updateSql, [work.configuration, o.work_exec_id], (updateErr: Error | null) => {
          if (updateErr) {
            console.error("SQLITE UPDATE error", updateErr);
            reject(updateErr);
          } else {
            //console.log("Inserción y actualización exitosas");
            resolve(true);
          }

          // Cerrar la base de datos después de todas las operaciones
          db.close((closeErr: Error | null) => {
            if (closeErr) {
              console.error("Error al cerrar la base de datos", closeErr);
            }
          });
        });
      });
    });
  }

  /**
   * Save WorkExecution's data from server to local db for offline case uses
   * @param data Array of WorkExecution class
   * @returns void
   */

  //Actualizar los datos de la ejecucion de trabajo
  async updateWorkExecutionData(o: WorkExecution): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql =
        "UPDATE work_execution SET weorder = ? , implement = ? , work = ?, lot = ? , worker = ? , supervisor = ? , configuration = ? , hectare = ? , cultivation = ? , product = ? , id_from_server = ?  WHERE id = ?;";

      // Ejecutar la actualización en la tabla 'work_execution'
      db.run(sql, [o.weorder, o.implement, o.work, o.lot, o.worker, o.supervisor, o.configuration, o.hectare, o.cultivation , o.product , o.id_from_server , o.id ], (err: Error | null) => {
        if (err) {
          console.error("SQLITE UPDATE error", err);
          reject(err);
        } else {
          //console.log("Actualización exitosa");
          resolve(true);
        }

        // Cerrar la base de datos después de la operación
        db.close((closeErr: Error | null) => {
          if (closeErr) {
            console.error("Error al cerrar la base de datos", closeErr);
          }
        });
      });
    });
  }

 /**
   * Save WorkExecution's data from server to local db for offline case uses
   * @param data Array of WorkExecution class
   * @returns void
   */

 //Actualizar el tiempo productivo e improductivo
  async updateTimeExecution(o: WorkExecution): Promise<boolean> {
    try {
      return new Promise<boolean>((resolve, reject) => {
        let db = new this.sqlite.Database(this.file);
        let sql =
          "UPDATE work_execution SET working_time = ? , downtime = ? WHERE id = ?;";
  
        // Ejecutar la actualización en la tabla 'work_execution'
        db.run(sql, [o.working_time.format('H:mm:ss') , o.downtime.format('H:mm:ss') , o.id], (err: Error | null) => {
          if (err) {
            console.error("SQLITE UPDATE error", err);
            reject(err);
          } else {
            // console.log("Actualización exitosa");
            resolve(true);
          }
          // Cerrar la base de datos después de la operación
          db.close((closeErr: Error | null) => {
            if (closeErr) {
              console.error("Error al cerrar la base de datos", closeErr);
            }
          });
        });
      });
    } catch (error) {
      this.error("Error en actualizar tiempos Prod e Improd" , error);
    }
  
  }

 /**
   * Save WorkExecution's data from server to local db for offline case uses
   * @param data Array of WorkExecution class
   * @returns void
   */

  //Acttualizar el campo 'sended' de el detalle de trabajo para identificar si ha sido enviado al servidor
  async updateExecutionSendedDetail(wExecutionDetail : WorkExecutionDetail){
        return new Promise<boolean>((resolve,reject)=>{
          let db = new this.sqlite.Database(this.file);
          let sql = "UPDATE work_execution_details SET sended = ? WHERE id = ?";

          db = db.run(sql,[1,wExecutionDetail.id],
            (err : Error)=>{
              if(err){
                //console.log("SQLITE UPDATE error", err);
                process.nextTick(() => reject(err));
              }
              process.nextTick(() => resolve(true));
            });
            db.close();
        });
  }

  /**
   * Save WorkExecution's data from server to local db for offline case uses
   * @param data Array of WorkExecution class
   * @returns void
   */

  //Obtener los implementos de trabajo
  async getWorkImplement(type_implement : number) : Promise<WorkExecutionOrder>{
    return new Promise<WorkExecutionOrder>((resolve,reject)=>{
      let db = new this.sqlite.Database(this.file);
      let sql = "SELECT * FROM work_execution_order WHERE implement = ?";
      db.all(sql,[type_implement],(err,rows : WorkExecutionOrder)=>{
        if(err){
          process.nextTick(() => reject(err));
        }
        process.nextTick(() => resolve(rows));
      });
      db.close();
    });
  }

  //Obtener los registros de los detalles de trabajo que no han sido enviados
  async getNotSendedExecutionDetail(id_work_execution : number) : Promise<WorkExecutionDetail[]>{
    return new Promise<WorkExecutionDetail[]>((resolve,reject)=>{
      let db = new this.sqlite.Database(this.file);
      let sql = "SELECT * FROM work_execution_details WHERE sended = ? and id_work_execution = ?";
      db.all(sql,[0,id_work_execution],(err,rows : WorkExecutionDetail[])=>{
        if(err){
          process.nextTick(() => reject(err));
        }
        process.nextTick(() => resolve(rows));
      });
      db.close();
    });
  }

  /**
   * Save WorkExecution's data from server to local db for offline case uses
   * @param data Array of WorkExecution class
   * @returns void
   */

  //Actualizar el valor del sended que ya ha sido enviado al servidor
  async confirmWorkExecSavedOnServer(o: WorkExecution): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql = "UPDATE work_execution SET sended = ? WHERE id = ?;";

      // Ejecutar la actualización en la tabla 'work_execution'
      db.run(sql, [o.sended, o.id], (err: Error | null) => {
        if (err) {
          console.error("SQLITE UPDATE error", err);
          reject(err);
        } else {
          //console.log("Actualización exitosa");
          resolve(true);
        }

        // Cerrar la base de datos después de la operación
        db.close((closeErr: Error | null) => {
          if (closeErr) {
            console.error("Error al cerrar la base de datos", closeErr);
          }
        });
      });
    });
  }

  /**
   * Save WorkExecution's data from server to local db for offline case uses
   * @param data Array of WorkExecution class
   * @returns void
   */

  //Cambiar el campo finished para identificar si el registro o la ejecucion de trabajo a sido finalizada
  async finishWorkExecution(o: WorkExecution): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql = "UPDATE work_execution SET is_finished = 1 WHERE id = ?;";

      // Ejecutar la actualización en la tabla 'work_execution'
      db.run(sql, [o.id], (err: Error | null) => {
        if (err) {
          console.error("SQLITE UPDATE error", err);
          reject(err);
        } else {
          //console.log("Actualización exitosa");
          resolve(true);
        }

        // Cerrar la base de datos después de la operación
        db.close((closeErr: Error | null) => {
          if (closeErr) {
            console.error("Error al cerrar la base de datos", closeErr);
          }
        });
      });
    });
  }


  /**
   * Get the Work's data from the database
   * @returns Array of Work class
   */

  //Obtener las labores
  async getWorkData(): Promise<Work[]> {
    return new Promise<Work[]>((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql = "SELECT * from work";
      db.all(sql,[ ],(err,rows : Work[])=>{
        if(err){
          process.nextTick(() => reject(err));
        }
        process.nextTick(() => resolve(rows));
      });
      db.close();
    });
  }

  /**
   * Save Work's data from server to local db for offline case uses
   * @param data Array of Work class
   * @returns void
   */

  //Sincronizar las labores 
  async syncWorkData(data: Array<Work>): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql =
        "INSERT INTO work (id, name, cultivation, cultivation_name, product, product_name, risk, risk_name, pressure_tolerance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);";

      // Iterar sobre los datos y realizar la inserción por cada uno
      data.forEach((o) => {
        db.run(sql, [o.id, o.name, o.cultivation, o.cultivation_name, o.product, o.product_name, o.risk, o.risk_name, o.pressure_tolerance], (err: Error | null) => {
          if (err && err.message.includes('UNIQUE constraint failed')) {
            console.warn(`Registro duplicado para el id: ${o.id}. Ignorando.`);
          } else if (err) {
            console.error("SQLITE INSERT error", err);
            reject(err);
          }
        });
      });

      // Cerrar la base de datos después de que todas las inserciones se hayan completado
      db.close((err: Error | null) => {
        if (err) {
          console.error("Error al cerrar la base de datos", err);
          reject(err);
        } else {
          //console.log("Base de datos cerrada");
          resolve(true);
        }
      });
    });
  }

  /**
   * Get the Cultivation's data from the database
   * @returns Array of Cultivation class
   */

  //Obtener los datos de los cultivos
  async getCultivationData(): Promise<Cultivation[]> {
    return new Promise<Cultivation[]>((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql = "SELECT * from cultivation";
      db.all(sql,[ ],(err,rows : Cultivation[])=>{
        if(err){
          process.nextTick(() => reject(err));
        }
        process.nextTick(() => resolve(rows));
      });
      db.close();
    });
  }

  /**
   * Save Cultivation's data from server to local db for offline case uses
   * @param data Array of Cultivation class
   * @returns void
   */

  //Sincronizar los datos de los cultivos
  async syncCultivationData(data: Array<Cultivation>): Promise<boolean> {
    return new Promise((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql = "INSERT INTO cultivation (id, code, name) VALUES (?, ?, ?);";

      // Iterar sobre los datos y realizar la inserción por cada uno
      data.forEach((o) => {
        db.run(sql, [o.id, o.code, o.name], (err: Error | null) => {
          if (err) {
            console.error("SQLITE INSERT error", err);
            reject(err);
          }
        });
      });

      // Cerrar la base de datos después de que todas las inserciones se hayan completado
      db.close((err: Error | null) => {
        if (err) {
          console.error("Error al cerrar la base de datos", err);
          reject(err);
        } else {
          //console.log("Base de datos cerrada");
          resolve(true);
        }
      });
    });
  }

  /**
   * Get the Farm's data from the database
   * @returns Array of Farm class
   */
  //Obtener los datos de los fundos
  async getFarmData(): Promise<Farm[]> {
    return new Promise<Farm[]>((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql = "SELECT * from farm";
      db.all(sql,[ ],(err,rows : Farm[])=>{
        if(err){
          process.nextTick(() => reject(err));
        }
        process.nextTick(() => resolve(rows));
      });
      db.close();
    });
  }

  /**
   * Save Farm's data from server to local db for offline case uses
   * @param data Array of Farm class
   * @returns void
   */

  //Sincronizar los fundos on el api del Servidor
  async syncFarmData(data: Array<Farm>): Promise<boolean> {
    return new Promise((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql = "INSERT INTO farm (id, name) VALUES (?, ?);";

      // Iterar sobre los datos y realizar la inserción por cada uno
      data.forEach((o) => {
        db.run(sql, [o.id, o.name], (err: Error | null) => {
          if (err) {
            console.error("SQLITE INSERT error", err);
            reject(err);
          }
        });
      });

      // Cerrar la base de datos después de que todas las inserciones se hayan completado
      db.close((err: Error | null) => {
        if (err) {
          console.error("Error al cerrar la base de datos", err);
          reject(err);
        } else {
          //console.log("Base de datos cerrada");
          resolve(true);
        }
      });
    });
  }

  //Sincronizar las ordenes de trabajo
  async syncWorkOrder(data: Array<WorkExecutionOrder>): Promise<boolean> {
    return new Promise((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql = "INSERT INTO work_execution_order (id, work, work_name , lot , supervisor , date_start, date_final, type_implement , type_implement_name , configuration, configuration_consume, preconfiguration, hectare, product , cultivation, atomizer) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);";

      // Iterar sobre los datos y realizar la inserción por cada uno
      data.forEach((o) => {
        db.run(sql, [o.id, o.work , o.work_name, o.lot,o.supervisor,o.date_start,o.date_final,o.type_implement , o.type_implement_name , o.configuration, o.configuration_consume , o.preconfiguration, o.hectare, o.product, o.cultivation,  o.atomizer], (err: Error | null) => {
          if (err && err.message.includes('UNIQUE constraint failed')) {
            console.warn(`Registro duplicado para el id: ${o.id}. Ignorando.`);
          } else if (err) {
            console.error("SQLITE INSERT error", err);
            reject(err);
          }
        });
      });

      // Cerrar la base de datos después de que todas las inserciones se hayan completado
      db.close((err: Error | null) => {
        if (err) {
          console.error("Error al cerrar la base de datos", err);
          reject(err);
        } else {
          //console.log("Base de datos cerrada");
          resolve(true);
        }
      });
    });
  }

  //Sincronizar los atomizadores
  async syncAtomizer(data: Array<Atomizer>): Promise<boolean> {
    return new Promise((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql = "INSERT INTO atomizer (id, name , uuid , machine , active) VALUES (?, ? , ? , ? , ?);";

      // Iterar sobre los datos y realizar la inserción por cada uno
      data.forEach((o) => {
        db.run(sql, [o.id, o.name, o.uuid , o.machine , o.active], (err: Error | null) => {
          if (err) {
            console.error("SQLITE INSERT error", err);
            reject(err);
          }
        });
      });

      // Cerrar la base de datos después de que todas las inserciones se hayan completado
      db.close((err: Error | null) => {
        if (err) {
          console.error("Error al cerrar la base de datos", err);
          reject(err);
        } else {
          //console.log("Base de datos cerrada");
          resolve(true);
        }
      });
    });
  }

  //Sicronizar los datos de los implementos
  async syncImplement(data: Array<Implement>): Promise<boolean> {
    return new Promise((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql = "INSERT INTO implement (id,name,typeImplement) VALUES (?,?,?);";

      // Iterar sobre los datos y realizar la inserción por cada uno
      data.forEach((o) => {
        db.run(sql, [o.id, o.name , o.typeImplement], (err: Error | null) => {
          if (err) {
            console.error("SQLITE INSERT error", err);
            reject(err);
          }
        });
      });

      // Cerrar la base de datos después de que todas las inserciones se hayan completado
      db.close((err: Error | null) => {
        if (err) {
          console.error("Error al cerrar la base de datos", err);
          reject(err);
        } else {
          //console.log("Base de datos cerrada");
          resolve(true);
        }
      });
    });
  }

    /**
   * Get the Person's data from the database
   * @returns Array of Person class
   */

  //Obtener datos del implemento
  async getImplemenData(): Promise<Implement[]> {
    return new Promise<Implement[]>((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql = "SELECT * from implement";
      db.all(sql,[ ],(err,rows : Implement[])=>{
        if(err){
          process.nextTick(() => reject(err));
        }
        process.nextTick(() => resolve(rows));
      });
      db.close();
    });
  }


  /**
   * Get the Farm's data from the database
   * @returns Array of Farm class
   */

  //Obtener los datos de productos
  async getProductData(): Promise<Product[]> {
    return new Promise<Product[]>((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql = "SELECT * from product";
      db.all(sql,[ ],(err,rows : Product[])=>{
        if(err){
          process.nextTick(() => reject(err));
        }
        process.nextTick(() => resolve(rows));
      });
      db.close();
    });
  }

  /**
   * Save Farm's data from server to local db for offline case uses
   * @param data Array of Farm class
   * @returns void
   */

  //Sincronizar los datos de los productos
  async syncProductData(data: Array<Product>): Promise<boolean> {
    return new Promise((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql = "INSERT INTO product (id, name , manufacturer,formula,register,risk) VALUES (?,?,?,?,?,?);";

      // Iterar sobre los datos y realizar la inserción por cada uno
      data.forEach((o) => {
        db.run(sql, [o.id, o.name , o.manufacturer , o.formula , o.register, o.risk], (err: Error | null) => {
          if (err && err.message.includes('UNIQUE constraint failed')) {
            console.warn(`Registro duplicado para el id: ${o.id}. Ignorando.`);
          } else if (err) {
            console.error("SQLITE INSERT error", err);
            reject(err);
          }
        });
      });

      // Cerrar la base de datos después de que todas las inserciones se hayan completado
      db.close((err: Error | null) => {
        if (err) {
          console.error("Error al cerrar la base de datos", err);
          reject(err);
        } else {
          //console.log("Base de datos cerrada");
          resolve(true);
        }
      });
    });
  }

  /**
   * Get the LocalConfig's data from the database
   * @returns Array of WorkExecution class
   */

  //Obtener la configuracion local
  async getLocalConfig(): Promise<LocalConf> {
    return new Promise<LocalConf>((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql = "SELECT * from local_conf ORDER by fecha DESC LIMIT 1;";
      db.get(sql,[],(err,rows : LocalConf)=>{
        if(err){
          process.nextTick(() => reject(err));
        }
        process.nextTick(() => resolve(rows));
      });
      db.close();
    });
  }

  /**
   * Save LocalConfig's data from server to local db for offline case uses
   * @param data LocalConfig instance
   * @returns void
   */

  //Guardar la configuracion local
  async saveLocalConfig(o : LocalConf): Promise<boolean> {
    return new Promise((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql = "INSERT INTO local_conf (api_server,vol_alert_on,min_wflow,max_wflow,unit_pressure,min_pressure,max_pressure, fecha) VALUES (?,?,?,?,?,?,?,?);";
      db = db.run(sql,[o.api_server,o.vol_alert_on,o.min_wflow,o.max_wflow,o.unit_pressure,o.min_pressure,o.max_pressure, moment().format('HH:mm:ss')],
        (err : Error)=>{
          if(err){
            console.log("SQLITE INSERT error", err);
            process.nextTick(() => reject(err));
          }
          process.nextTick(() => resolve(true));
        });
        db.close();
    });
  }

  async getRecordById(table: string, id: number): Promise<any | null> {
    return new Promise((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql = `SELECT * FROM ${table} WHERE id = ?;`;

      db.get(sql, [id], (err: Error | null, row: any) => {
        if (err) {
          console.error("SQLITE SELECT error", err);
          reject(err);
        } else {
          resolve(row);
        }
      });

      db.close();
    });
  }

  //Guardar el registro del Login
  async saveLogin(operador: number, implement: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql = "INSERT INTO login (operador,implement, fechahora) VALUES (?,?,?);";
      db = db.run(sql,[operador,implement, moment().format('HH:mm:ss')],
        (err : Error)=>{
          if(err){
            console.log("SQLITE INSERT error", err);
            process.nextTick(() => reject(err));
          }
          process.nextTick(() => resolve(true));
        });
        db.close();
    });
  }

  //Obtener un registro de un inicio de sesion
  async getLogin(): Promise<Login> {
    return new Promise<Login>((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql = "SELECT * from login  ORDER BY fechahora DESC LIMIT 1 ;";
      db.get(sql,[],(err,rows : Login)=>{
        if(err){
          process.nextTick(() => reject(err));
        }
        process.nextTick(() => resolve(rows));
      });
      db.close();
    });
  }

  //Funcion para obtener el registro de el detalle de ejecuciones de trabajo
  async getLastWorkExecutionDetail(work: number): Promise<WorkExecutionDetail> {
    return new Promise<WorkExecutionDetail>((resolve, reject) => {
        let db = new this.sqlite.Database(this.file);
        let sql = "SELECT * FROM work_execution_details ORDER BY id DESC";
        db.get(sql, [work], (err, rows: any) => {
            if (err) {
                process.nextTick(() => reject(err));
            }
            process.nextTick(() => resolve(rows));
        });
        db.close();
    });
  }

  //Obtener el detalle de trabajo 
  async getLastWorkExecutionDetail2():Promise<WorkExecutionDetail> {
    return new Promise<WorkExecutionDetail>((resolve, reject) => {
        let db = new this.sqlite.Database(this.file);
        let sql = "SELECT * FROM work_execution_details ORDER BY id DESC ";
        db.get(sql, [], (err, rows: any) => {
            if (err) {
                process.nextTick(() => reject(err));
            }
            process.nextTick(() => resolve(rows));
        });
        db.close();
    });
  }

  //Funcion para obtener el registro de el detalle de ejecuciones de trabajo
  // Función para obtener el registro del detalle de ejecuciones de trabajo
  // Función para obtener el último registro del detalle de ejecuciones de trabajo
  async getLastWorkExecutionCurrent(work: number): Promise<WorkExecutionDetail> {
    return new Promise<WorkExecutionDetail>((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql = `
        SELECT * FROM work_execution_details 
        WHERE id_work_execution = ? 
          AND CAST(JSON_EXTRACT(data, '$."19"') AS DECIMAL) > 0
        ORDER BY id DESC 
        LIMIT 1;
      `;

      db.get(sql, [work], (err, row: any) => {
        if (err) {
          process.nextTick(() => reject(err));
        } else {
          process.nextTick(() => resolve(row));
        }
      });

      db.close();
    });
  }

  //Metodo por revisar si esta en uso
  async getWorkExecutionDetailReal(work : number): Promise<WorkExecutionDetail[]> {
    return new Promise<WorkExecutionDetail[]>((resolve, reject) =>{
      let db = new this.sqlite.Database(this.file);
      let sql = "SELECT * from work_execution_details WHERE id_work_execution = ?";
      db.all(sql,[work],(err,rows : WorkExecutionDetail[])=>{
        if(err){
          process.nextTick(() => reject(err));
        }
        process.nextTick(() => resolve(rows));
      });
      db.close();
    });
  }

  //Guardar el detalle de trabajo 
  async saveWorkExecutionDataDetail(o: WorkExecutionDetail): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      try {
        let db = new this.sqlite.Database(this.file);
        let insertSql =
          "INSERT INTO work_execution_details (id_work_execution , time , sended, data , precision , gps , has_events , events) VALUES (?,?,?,?,?,?,?,?);";
  
        // Ejecutar la inserción en la tabla 'work_execution'
        db.run(
          insertSql,
          [
            o.id_work_execution,
            o.time.format("YYYY-MM-DD H:mm:ss"),
            0,
            o.data,
            o.precision,
            o.gps,
            o.has_events,
            o.events,
          ],
          (err: Error | null) => {
            if (err) {
              this.error("ERROR DE BASE DE DATOS", err);
              console.error("SQLITE INSERT error", err);
              reject(err);
            } else {
              // Inserción exitosa
              resolve(true);
            }
  
            // Cerrar la base de datos después de la operación
            db.close((closeErr: Error | null) => {
              if (closeErr) {
                console.error("Error al cerrar la base de datos", closeErr);
              }
            });
          }
        );
      } catch (error) {
        this.error("ERROR DE BASE DE DATOS", error);
        console.error("Error general en saveWorkExecutionDataDetail:", error);
        reject(error);
      }
    });
  }
  
  //Actualizar el detalle de trabajo
  async updateWorkExecutionDataDetail(o: WorkExecutionDetail): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      let db = new this.sqlite.Database(this.file);
      let sql =
        "UPDATE work_execution_details SET sended = ? WHERE id = ?;";

      // Ejecutar la actualización en la tabla 'work_execution'
      db.run(sql, [o.sended , o.id], (err: Error | null) => {
        if (err) {
          console.error("SQLITE UPDATE error", err);
          reject(err);
        } else {
          //console.log("Actualización exitosa");
          resolve(true);
        }

        // Cerrar la base de datos después de la operación
        db.close((closeErr: Error | null) => {
          if (closeErr) {
            console.error("Error al cerrar la base de datos", closeErr);
          }
        });
      });
    });
  }

}
