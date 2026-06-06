import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonButton, IonButtons, IonIcon, IonItem, IonLabel, IonInput,
  IonSelect, IonSelectOption, IonSpinner,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { walletOutline, sendOutline, fingerPrintOutline, logOutOutline, copyOutline } from 'ionicons/icons';
import { WalletService, User } from '../services/wallet.service';
import { WebauthnService } from '../services/webauthn.service';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonButton, IonButtons, IonIcon, IonItem, IonLabel, IonInput,
    IonSelect, IonSelectOption, IonSpinner
  ]
})
export class Tab1Page {
  user: User | null = null;
  contacts: User[] = [];
  toEmail  = '';
  amount: number | null = null;
  note     = '';
  sending  = false;
  loadingData = false;

  constructor(
    private wallet: WalletService,
    private webauthn: WebauthnService,
    private router: Router,
    private toastCtrl: ToastController
  ) {
    addIcons({ walletOutline, sendOutline, fingerPrintOutline, logOutOutline, copyOutline });
  }

  async ionViewWillEnter() {
    if (!this.wallet.isLoggedIn()) { this.logout(); return; }
    this.user = this.wallet.getCachedUser();
    await this.loadData();
  }

  async loadData() {
    this.loadingData = true;
    try {
      const [user, contacts] = await Promise.all([
        this.wallet.fetchMe(),
        this.wallet.fetchContacts()
      ]);
      this.user     = user;
      this.contacts = contacts;
    } catch (err: any) {
      await this.toast(err.message, 'danger');
    } finally {
      this.loadingData = false;
    }
  }

  get fmtBalance(): string {
    return this.user ? this.wallet.fmtBRL(this.user.balance) : 'R$ 0,00';
  }

  async send() {
    if (!this.toEmail)                 { await this.toast('Selecione o destinatário.', 'warning'); return; }
    if (!this.amount || this.amount <= 0) { await this.toast('Informe um valor válido.', 'warning'); return; }
    if (!this.user)                    return;
    if (this.amount > this.user.balance) { await this.toast('Saldo insuficiente.', 'danger'); return; }

    this.sending = true;
    try {
      // 1. Autentica com biometria ANTES de enviar
      const options    = await this.wallet.getLoginChallenge(this.user.email);
      const credential = await this.webauthn.authenticate(options);
      const { token }  = await this.wallet.verifyLogin(this.user.email, credential);
      this.wallet.saveToken(token); // renova o token

      // 2. Executa a transferência
      const { transaction: tx, newBalance } = await this.wallet.transfer(
        this.toEmail, this.amount, this.note
      );
      this.user.balance = newBalance;
      this.wallet.cacheUser(this.user);

      this.toEmail = '';
      this.amount  = null;
      this.note    = '';
      await this.toast(
        `✅ ${this.wallet.fmtBRL(tx.amount)} enviado! Hash: ${tx.hash.slice(0, 14)}…`,
        'success'
      );
    } catch (err: any) {
      await this.toast(this.webauthn.handleError(err) || err.message, 'danger');
    } finally {
      this.sending = false;
    }
  }

  copyAddress() {
    if (!this.user) return;
    navigator.clipboard.writeText(this.user.address)
      .then(() => this.toast('Endereço copiado!', 'medium'));
  }

  logout() {
    this.wallet.clearToken();
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  private async toast(message: string, color: string) {
    const t = await this.toastCtrl.create({ message, duration: 3500, color, position: 'bottom' });
    await t.present();
  }
}