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
  personOutline, fingerPrintOutline, checkmarkCircleOutline,
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

  // Passo 1
  name = '';
  email = '';

  // Estado
  step = 1;           // 1 = dados, 2 = biometria
  loading = false;
  bioDone = false;
  biometricAvailable = false;

  constructor(
    private wallet: WalletService,
    private webauthn: WebauthnService,
    private router: Router,
    private toastCtrl: ToastController
  ) {
    addIcons({ personOutline, fingerPrintOutline, checkmarkCircleOutline, alertCircleOutline, arrowForwardOutline });
  }

  async ionViewWillEnter() {
    this.biometricAvailable = await this.webauthn.isBiometricAvailable();
  }

  // ─── Passo 1 → 2 ─────────────────────────────────────────────────────────────

  advanceStep() {
    const name = this.name.trim();
    const email = this.email.trim().toLowerCase();
    if (!name || name.length < 2) { this.toast('Informe seu nome completo.', 'warning'); return; }
    if (!email || !email.includes('@')) { this.toast('Informe um e-mail válido.', 'warning'); return; }

    const existing = this.wallet.getUser(email);
    if (existing) { this.toast('Este e-mail já está cadastrado. Faça login.', 'danger'); return; }

    this.step = 2;
  }

  // ─── Passo 2: registro biométrico ────────────────────────────────────────────

  async registerBiometric() {
    this.loading = true;
    try {
      const credId = await this.webauthn.register(this.name.trim(), this.email.trim().toLowerCase());
      // Cria o usuário com o credId retornado pelo WebAuthn
      this.wallet.createUser(this.name.trim(), this.email.trim().toLowerCase(), credId);
      this.bioDone = true;
      await this.toast('Biometria registrada com sucesso!', 'success');
    } catch (err: any) {
      await this.toast(this.webauthn.handleError(err), 'danger');
    } finally {
      this.loading = false;
    }
  }

  // ─── Finalizar ────────────────────────────────────────────────────────────────

  finish() {
    const email = this.email.trim().toLowerCase();
    this.wallet.saveSession(email);
    this.router.navigate(['/tabs/tab1'], { replaceUrl: true });
  }

  private async toast(message: string, color: string) {
    const t = await this.toastCtrl.create({ message, duration: 3500, color, position: 'bottom' });
    await t.present();
  }
}
