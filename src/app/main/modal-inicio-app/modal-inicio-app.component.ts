import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-modal-inicio-app',
  templateUrl: './modal-inicio-app.component.html',
  styleUrls: ['./modal-inicio-app.component.scss']
})
export class ModalInicioAppComponent implements OnInit {
  volume: number;

  constructor(private modalController: ModalController) { }

  ngOnInit() { }

  //Esto es para guardar el volumen
  saveVolume() {
    if (this.volume !== undefined && this.volume !== null && !isNaN(this.volume)) {
      console.log(this.volume);
      this.modalController.dismiss(this.volume.toString());
    }
  }

  //Cerrar el modal 
  closeModal() {
    this.modalController.dismiss();
  }
} 

