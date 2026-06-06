import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton, IonButtons,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonButton, IonIcon, IonItem, IonLabel, IonText, IonSpinner,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  lockClosedOutline, lockOpenOutline, fingerPrintOutline,
  shieldCheckmarkOutline, copyOutline, receiptOutline
} from 'ionicons/icons';
import { WalletService, Transaction } from '../services/wallet.service';
import { WebauthnService } from '../services/webauthn.service';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton, IonButtons,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonButton, IonIcon, IonItem, IonLabel, IonText, IonSpinner
  ]
})
export class Tab3Page {
  tx: Transaction | null = null;
  hashRevealed = false;
  loading      = false;
  loadingTx    = false;

  constructor(
    private wallet: WalletService,
    private webauthn: WebauthnService,
    private route: ActivatedRoute,
    private router: Router,
    private toastCtrl: ToastController
  ) {
    addIcons({ lockClosedOutline, lockOpenOutline, fingerPrintOutline, shieldCheckmarkOutline, copyOutline, receiptOutline });
  }

  async ionViewWillEnter() {
    this.hashRevealed = false;
    this.tx = null;

    const id = Number(this.route.snapshot.queryParamMap.get('id') ?? 0);
    if (!id) { this.router.navigate(['/tabs/tab2'], { replaceUrl: true }); return; }

    this.loadingTx = true;
    try {
      this.tx = await this.wallet.fetchTransaction(id);
    } catch (err: any) {
      await this.toast(err.message, 'danger');
      this.router.navigate(['/tabs/tab2'], { replaceUrl: true });
    } finally {
      this.loadingTx = false;
    }
  }

  get isOut(): boolean  { return this.tx?.type === 'out'; }
  get partnerName(): string  { return this.tx ? (this.isOut ? this.tx.toName! : this.tx.fromName!) : ''; }
  get partnerAddress(): string { return this.tx ? (this.isOut ? this.tx.toAddress! : this.tx.fromAddress!) : ''; }
  fmtBRL(v: number)    { return this.wallet.fmtBRL(v); }
  fmtDate(ts: number)  { return this.wallet.fmtDate(ts); }

  async revealHash() {
    const user = this.wallet.getCachedUser();
    if (!user) return;

    this.loading = true;
    try {
      // Requer autenticação biométrica para revelar o hash
      const options    = await this.wallet.getLoginChallenge(user.email);
      const credential = await this.webauthn.authenticate(options);
      await this.wallet.verifyLogin(user.email, credential);

      this.hashRevealed = true;
      await this.toast('Hash revelado com sucesso!', 'success');
    } catch (err: any) {
      await this.toast(this.webauthn.handleError(err) || err.message, 'danger');
    } finally {
      this.loading = false;
    }
  }

  copyHash() {
    if (!this.tx) return;
    navigator.clipboard.writeText(this.tx.hash)
      .then(() => this.toast('Hash copiado!', 'medium'));
  }

  private async toast(message: string, color: string) {
    const t = await this.toastCtrl.create({ message, duration: 3000, color, position: 'bottom' });
    await t.present();
  }
}
