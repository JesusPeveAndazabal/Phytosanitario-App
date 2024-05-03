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

  saveVolume() {
    if (this.volume !== undefined && this.volume !== null && !isNaN(this.volume)) {
      console.log(this.volume);
      this.modalController.dismiss(this.volume.toString());
    }
  }

  closeModal() {
    this.modalController.dismiss();
  }
} 

