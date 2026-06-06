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
import {
  fingerPrintOutline, logInOutline, personAddOutline,
  alertCircleOutline, lockClosedOutline
} from 'ionicons/icons';
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
    addIcons({ fingerPrintOutline, logInOutline, personAddOutline, alertCircleOutline, lockClosedOutline });
  }

  async ionViewWillEnter() {
    // Se já há sessão válida vai direto para home
    if (this.wallet.getSession()) {
      this.router.navigate(['/tabs/tab1'], { replaceUrl: true });
      return;
    }
    this.biometricAvailable = await this.webauthn.isBiometricAvailable();
  }

  async login() {
    const email = this.email.trim().toLowerCase();
    if (!email) { await this.toast('Informe seu e-mail.', 'warning'); return; }

    const user = this.wallet.getUser(email);
    if (!user) { await this.toast('Conta não encontrada. Crie uma conta primeiro.', 'danger'); return; }
    if (!user.credId) { await this.toast('Nenhuma biometria cadastrada para esta conta.', 'danger'); return; }

    this.loading = true;
    try {
      await this.webauthn.authenticate(user.credId);
      this.wallet.saveSession(email);
      this.router.navigate(['/tabs/tab1'], { replaceUrl: true });
    } catch (err: any) {
      await this.toast(this.webauthn.handleError(err), 'danger');
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
