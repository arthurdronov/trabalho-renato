import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton, IonButtons,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonButton, IonIcon, IonItem, IonLabel, IonInput,
  IonText, IonSpinner, IonProgressBar, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  fingerPrintOutline, checkmarkCircleOutline,
  alertCircleOutline, arrowForwardOutline
} from 'ionicons/icons';
import { WalletService } from '../services/wallet.service';
import { WebauthnService } from '../services/webauthn.service';

@Component({
  selector: 'app-register',
  templateUrl: 'register.page.html',
  styleUrls: ['register.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton, IonButtons,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonButton, IonIcon, IonItem, IonLabel, IonInput,
    IonText, IonSpinner, IonProgressBar
  ]
})
export class RegisterPage {
  name  = '';
  email = '';
  step  = 1;
  loading   = false;
  bioDone   = false;
  biometricAvailable = false;

  constructor(
    private wallet: WalletService,
    private webauthn: WebauthnService,
    private router: Router,
    private toastCtrl: ToastController
  ) {
    addIcons({ fingerPrintOutline, checkmarkCircleOutline, alertCircleOutline, arrowForwardOutline });
  }

  async ionViewWillEnter() {
    this.biometricAvailable = await this.webauthn.isBiometricAvailable();
  }

  advanceStep() {
    const name  = this.name.trim();
    const email = this.email.trim().toLowerCase();
    if (!name || name.length < 2) { this.toast('Informe seu nome completo.', 'warning'); return; }
    if (!email.includes('@'))     { this.toast('Informe um e-mail válido.', 'warning'); return; }
    this.step = 2;
  }

  async registerBiometric() {
    const name  = this.name.trim();
    const email = this.email.trim().toLowerCase();

    this.loading = true;
    try {
      // 1. Pede as opções de registro ao servidor
      const options = await this.wallet.getRegisterChallenge(name, email);

      // 2. Aciona a biometria do dispositivo
      const credential = await this.webauthn.register(options);

      // 3. Envia a resposta ao servidor para criar a conta
      const { token, user } = await this.wallet.verifyRegistration(name, email, credential);

      this.wallet.saveToken(token);
      this.wallet.cacheUser(user);
      this.bioDone = true;
      await this.toast('Conta criada com sucesso!', 'success');
    } catch (err: any) {
      await this.toast(this.webauthn.handleError(err) || err.message, 'danger');
    } finally {
      this.loading = false;
    }
  }

  finish() {
    this.router.navigate(['/tabs/tab1'], { replaceUrl: true });
  }

  private async toast(message: string, color: string) {
    const t = await this.toastCtrl.create({ message, duration: 3500, color, position: 'bottom' });
    await t.present();
  }
}
