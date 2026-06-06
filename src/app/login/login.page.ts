import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonButton, IonIcon, IonItem, IonLabel, IonInput,
  IonText, IonSpinner, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { fingerPrintOutline, personAddOutline, alertCircleOutline } from 'ionicons/icons';
import { WalletService } from '../services/wallet.service';
import { WebauthnService } from '../services/webauthn.service';

@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonButton, IonIcon, IonItem, IonLabel, IonInput,
    IonText, IonSpinner
  ]
})
export class LoginPage {
  email = '';
  loading = false;
  biometricAvailable = false;

  constructor(
    private wallet: WalletService,
    private webauthn: WebauthnService,
    private router: Router,
    private toastCtrl: ToastController
  ) {
    addIcons({ fingerPrintOutline, personAddOutline, alertCircleOutline });
  }

  async ionViewWillEnter() {
    if (this.wallet.isLoggedIn()) {
      this.router.navigate(['/tabs/tab1'], { replaceUrl: true });
      return;
    }
    this.biometricAvailable = await this.webauthn.isBiometricAvailable();
  }

  async login() {
    const email = this.email.trim().toLowerCase();
    if (!email) { await this.toast('Informe seu e-mail.', 'warning'); return; }

    this.loading = true;
    try {
      // 1. Pede o challenge ao servidor
      const options = await this.wallet.getLoginChallenge(email);

      // 2. Aciona a biometria do dispositivo
      const credential = await this.webauthn.authenticate(options);

      // 3. Envia a resposta ao servidor para verificar
      const { token, user } = await this.wallet.verifyLogin(email, credential);

      this.wallet.saveToken(token);
      this.wallet.cacheUser(user);
      this.router.navigate(['/tabs/tab1'], { replaceUrl: true });
    } catch (err: any) {
      await this.toast(this.webauthn.handleError(err) || err.message, 'danger');
    } finally {
      this.loading = false;
    }
  }

  goRegister() {
    this.router.navigate(['/register']);
  }

  private async toast(message: string, color: string) {
    const t = await this.toastCtrl.create({ message, duration: 3500, color, position: 'bottom' });
    await t.present();
  }
}
