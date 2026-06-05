import { Component, OnInit } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonText,
  IonItem,
  IonLabel,
  IonBadge,
  ToastController
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { WebauthnService } from '../services/webauthn.service';
import { addIcons } from 'ionicons';
import {
  fingerPrintOutline,
  lockClosedOutline,
  lockOpenOutline,
  walletOutline,
  alertCircleOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonText,
    IonItem,
    IonLabel,
    IonBadge
  ],
})
export class Tab1Page implements OnInit {
  isRegistered = false;
  isUnlocked = false;
  biometricAvailable = false;
  transactionHash = '0x71C9521369134125812351235123512351235123';

  constructor(
    private webauthnService: WebauthnService,
    private toastController: ToastController
  ) {
    addIcons({ fingerPrintOutline, lockClosedOutline, lockOpenOutline, walletOutline, alertCircleOutline });
  }

  async ngOnInit() {
    this.checkRegistrationStatus();
    this.biometricAvailable = await this.webauthnService.isBiometricAvailable();
  }

  checkRegistrationStatus() {
    this.isRegistered = this.webauthnService.isRegistered();
  }

  async registerDevice() {
    try {
      const success = await this.webauthnService.register('Usuario Demo');
      if (success) {
        this.isRegistered = true;
        this.presentToast('Biometria cadastrada com sucesso!', 'success');
      }
    } catch (error: any) {
      this.presentToast(error.message || String(error), 'danger');
    }
  }

  async authenticate() {
    try {
      const success = await this.webauthnService.authenticate();
      if (success) {
        this.isUnlocked = true;
        this.presentToast('Identidade confirmada!', 'success');
      }
    } catch (error: any) {
      this.presentToast(error.message || String(error), 'danger');
    }
  }

  reset() {
    this.webauthnService.clearRegistration();
    this.isRegistered = false;
    this.isUnlocked = false;
    this.presentToast('Registro removido.', 'medium');
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3500,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}