import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonButton, IonButtons, IonIcon, IonItem, IonLabel, IonInput,
  IonSelect, IonSelectOption, IonText, IonSpinner,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  walletOutline, sendOutline, fingerPrintOutline,
  personOutline, logOutOutline, copyOutline
} from 'ionicons/icons';
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
    IonSelect, IonSelectOption, IonText, IonSpinner
  ]
})
export class Tab1Page {

  user: User | null = null;
  contacts: User[] = [];

  // Formulário de transferência
  toEmail = '';
  amount: number | null = null;
  note = '';
  sending = false;

  constructor(
    private wallet: WalletService,
    private webauthn: WebauthnService,
    private router: Router,
    private toastCtrl: ToastController
  ) {
    addIcons({ walletOutline, sendOutline, fingerPrintOutline, personOutline, logOutOutline, copyOutline });
  }

  ionViewWillEnter() {
    this.loadUser();
  }

  loadUser() {
    this.user = this.wallet.getCurrentUser();
    if (!this.user) { this.logout(); return; }

    const session = this.wallet.getSession();
    const all = this.wallet.getUsers();
    this.contacts = Object.values(all).filter(u => u.email !== session?.email);
  }

  get fmtBalance(): string {
    return this.user ? this.wallet.fmtBRL(this.user.balance) : 'R$ 0,00';
  }

  async send() {
    if (!this.toEmail) { await this.toast('Selecione o destinatário.', 'warning'); return; }
    if (!this.amount || this.amount <= 0) { await this.toast('Informe um valor válido.', 'warning'); return; }
    if (!this.user) return;

    if (this.amount > this.user.balance) { await this.toast('Saldo insuficiente.', 'danger'); return; }

    this.sending = true;
    try {
      await this.webauthn.authenticate(this.user.credId);
    } catch (err: any) {
      await this.toast(this.webauthn.handleError(err), 'danger');
      this.sending = false;
      return;
    }

    try {
      const tx = this.wallet.transfer(this.user.email, this.toEmail, this.amount, this.note);
      this.loadUser(); // atualiza saldo
      this.toEmail = '';
      this.amount = null;
      this.note = '';
      await this.toast(
        `✅ Transferência de ${this.wallet.fmtBRL(tx.amount)} realizada! Hash: ${tx.hash.slice(0, 14)}…`,
        'success'
      );
    } catch (err: any) {
      await this.toast(err.message, 'danger');
    } finally {
      this.sending = false;
    }
  }

  copyAddress() {
    if (!this.user) return;
    navigator.clipboard.writeText(this.user.address).then(() =>
      this.toast('Endereço copiado!', 'medium')
    );
  }

  logout() {
    this.wallet.clearSession();
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  private async toast(message: string, color: string) {
    const t = await this.toastCtrl.create({ message, duration: 3500, color, position: 'bottom' });
    await t.present();
  }
}
