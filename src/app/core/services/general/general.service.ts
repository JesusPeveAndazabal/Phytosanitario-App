import { Cultivation, Farm, Lot, NozzleColor, NozzleType, Nozzles, Person, Product, Weather, Work} from './../../models/models';
import { environment } from './../../../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Configuration } from '../../utils/configuration';
// import {  } from 'src/app/core/models/models';

import { WorkExecutionOrder } from '../../models/workExecutionOrder';
import { Atomizer } from '../../models/Atomizer';
import { Implement } from '../../models/Implements';

@Injectable({
  providedIn: 'root'
})

export class GeneralService {

  constructor(private http: HttpClient) {
  }

  //Metodo para consumir del Api a las personas.
  public getPeople(token : string): Observable<Array<Person>> {
    return this.http.get<Array<Person>>(`${Configuration.urlRest}/api/person-app/`);
  }

  //Metodo para consumir del api los cultivos
  public getCultivations(): Observable<Array<Cultivation>> {
    return this.http.get<Array<Cultivation>>(`${Configuration.urlRest}/api/cultivation-app/`);
  }

  //Metodo para consumir del api los fundos
  public getFarm(): Observable<Array<Farm>> {
    return this.http.get<Array<Farm>>(`${Configuration.urlRest}/api/farm-app/`);
  }

  //Metodo para consumir del api los Lotes
  public getLots(): Observable<Array<Lot>> {
    return this.http.get<Array<Lot>>(`${Configuration.urlRest}/api/lot-app/`);
  }

  //Metodo para consumir del Api los colores de Boquillas
  public getNozzleColors(): Observable<Array<NozzleColor>> {
    return this.http.get<Array<NozzleColor>>(`${Configuration.urlRest}/api/nozzle-color-app/`);
  }

  //Metodo para consumir del API los tipos de boquillas
  public getNozzleTypes(): Observable<Array<NozzleType>> {
    return this.http.get<Array<NozzleType>>(`${Configuration.urlRest}/api/nozzle-type-app/`);
  }

  //Metodo para consumir y obtener las boquillas
  public getNozzles(): Observable<Array<Nozzles>> {
    return this.http.get<Array<Nozzles>>(`${Configuration.urlRest}/api/nozzles-app/`);
  }

  //Metodo para consumir del api los pruductos
  public getProducts(): Observable<Array<Product>> {
    return this.http.get<Array<Product>>(`${Configuration.urlRest}/api/product-app/`);
  }
  
  //Metodo para consumir del api los trabajos
  public getWorks(): Observable<Array<Work>> {
    return this.http.get<Array<Work>>(`${Configuration.urlRest}/api/work-app/`);
  }

  //Metodo para obtener las ordenes de trabajo
  public getWorkOrder(): Observable<Array<WorkExecutionOrder>> {
    return this.http.get<Array<WorkExecutionOrder>>(`${Configuration.urlRest}/api/work-execution-order-app/`);
  }

  //Metodo para obtener los implemen tos
  public getImplement(): Observable<Array<Implement>> {
    return this.http.get<Array<Implement>>(`${Configuration.urlRest}/api/implement-app`);
  }

  /**
   * Obtiene los datos climatológicos de un lugar específico
   * @param location lugar referencial para el resultado del clima
   * @returns Weather object
   */
  public getCurrentWeather(location :string) : Observable<Weather>{
    return this.http.get<Weather>(`https://api.weatherapi.com/v1/current.json?q=${location}&lang=es&key=${environment.weatherAPIKey}`);
  }

}
