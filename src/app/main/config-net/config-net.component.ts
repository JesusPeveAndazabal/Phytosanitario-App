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
    try {
      const result = await this.conectarConRed(this.selectedNetwork.ssid, this.password);
      console.log("RED SELECCIONADA", this.selectedNetwork.ssid);
      if (result.success) {
        this.connectedNetwork = this.selectedNetwork;  // Guardar la red conectada
        this.resetPassword();
        this.mostrarAlerta('Conexión exitosa', `Conectado a la red ${this.selectedNetwork.ssid}`);
      } else {
        this.mostrarAlerta('Error de conexión', 'No se pudo conectar a la red.');
      }
    } catch (error) {
      this.mostrarAlerta('Error', 'Ocurrió un error al intentar conectar a la red.');
    }
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
