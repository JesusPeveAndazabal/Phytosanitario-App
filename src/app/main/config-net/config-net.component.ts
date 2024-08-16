import { Component } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { ipcRenderer } from 'electron';

@Component({
  selector: 'app-config-net',
  templateUrl: './config-net.component.html',
  styleUrls: ['./config-net.component.scss']
})
export class ConfigNetComponent {
  availableNetworks: any[] = [];
  selectedNetwork: any = {};
  connectedNetwork: any = {};  // Red conectada
  password: string = '';
  showPassword = false;

  constructor(private modalCtrl: ModalController, private alertController: AlertController) {}

  scanearRedesWifi() {
    console.log("ESCANEANDO REDES ....");
    ipcRenderer.invoke('scan-wifi')
      .then((networks: any[]) => {
        this.availableNetworks = networks;
        console.log(networks);
        console.log(this.availableNetworks);
      })
      .catch((error: any) => {
        console.error('Error al escanear redes WiFi:', error);
      });
  }

  selectNetwork(network) {
    this.selectedNetwork = network;
    this.password = '';  // Limpiar la contraseña cuando se selecciona una red
  }

  async conectarRedWifi() {

    if (!this.selectedNetwork || !this.selectedNetwork.ssid || !this.password) {
      console.error('Debe seleccionar una red WiFi y proporcionar una contraseña.');
      return;
    }

    ipcRenderer.invoke('connect-wifi', { ssid: this.selectedNetwork.ssid, password: this.password })
      .then((response: any) => {
        if (response.success) {
          this.connectedNetwork = this.selectedNetwork;  // Guardar la red conectada
          this.resetPassword();
          console.log(`Conectado exitosamente a la red WiFi ${this.selectedNetwork.ssid}`);
        } else {
          console.error(`Error al conectar a la red WiFi ${this.selectedNetwork.ssid}:`, response.error);
        }
      })
      .catch((error: any) => {
        console.error(`Error al conectar a la red WiFi ${this.selectedNetwork.ssid}:`, error);
      });
    
  }
  
 
  conectarConRed(ssid: string, password: string): Promise<{ success: boolean }> {
    // Lógica para conectar con la red WiFi
    return Promise.resolve({ success: true }); // Simulación de resultado exitoso
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async mostrarAlerta(titulo: string, mensaje: string) {
    const alert = await this.alertController.create({
      header: titulo,
      message: mensaje,
      buttons: ['OK']
    });

    await alert.present();
  }

  resetPassword() {
    this.password = '';  // Limpiar la contraseña
    this.showPassword = false;
  }

  closeModal() {
    this.modalCtrl.dismiss();
  }
}
