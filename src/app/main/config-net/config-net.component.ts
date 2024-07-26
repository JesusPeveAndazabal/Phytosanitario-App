import { Component } from '@angular/core';
import { ipcRenderer } from 'electron';


/* Componente para conectarse a una red wifi seleccionada */
/* Descomentar la libreria en /app/main.ts y todo lo referido a esta libreria*/

@Component({
  selector: 'app-config-net',
  templateUrl: './config-net.component.html',
  styleUrls: ['./config-net.component.scss']
})
export class ConfigNetComponent {

  availableNetworks: any[] = [];
  selectedNetwork: any = {};
  password: string = '';


  scanearRedesWifi() {
    ipcRenderer.invoke('scan-wifi')
      .then((networks: any[]) => {
        this.availableNetworks = networks;
      })
      .catch((error: any) => {
        console.error('Error al escanear redes WiFi:', error);
      });
  }

  conectarRedWifi() {
    if (!this.selectedNetwork || !this.selectedNetwork.ssid || !this.password) {
      console.error('Debe seleccionar una red WiFi y proporcionar una contraseï¿½a.');
      return;
    }

    ipcRenderer.invoke('connect-wifi', { ssid: this.selectedNetwork.ssid, password: this.password })
      .then((response: any) => {
        if (response.success) {
          //console.log(`Conectado exitosamente a la red WiFi ${this.selectedNetwork.ssid}`);
          // Aquï¿½ puedes implementar lï¿½gica adicional despuï¿½s de la conexiï¿½n exitosa
        } else {
          console.error(`Error al conectar a la red WiFi ${this.selectedNetwork.ssid}:`, response.error);
        }
      })
      .catch((error: any) => {
        console.error(`Error al conectar a la red WiFi ${this.selectedNetwork.ssid}:`, error);
      });
  }

}
