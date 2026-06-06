import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonIcon,
  IonText, IonNote, IonRefresher, IonRefresherContent, IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowUpOutline, arrowDownOutline, receiptOutline } from 'ionicons/icons';
import { WalletService, Transaction } from '../services/wallet.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonList, IonItem, IonLabel, IonIcon,
    IonText, IonNote, IonRefresher, IonRefresherContent, IonSpinner
  ]
})
export class Tab2Page {
  txs: Transaction[] = [];
  loading = false;

  constructor(private wallet: WalletService, private router: Router) {
    addIcons({ arrowUpOutline, arrowDownOutline, receiptOutline });
  }

  async ionViewWillEnter() {
    await this.load();
  }

  async load() {
    if (!this.wallet.isLoggedIn()) { this.router.navigate(['/login'], { replaceUrl: true }); return; }
    this.loading = true;
    try {
      this.txs = await this.wallet.fetchTransactions();
    } catch (err: any) {
      console.error(err);
    } finally {
      this.loading = false;
    }
  }

  async refresh(event: any) {
    await this.load();
    event.target.complete();
  }

  partnerName(tx: Transaction): string {
    return tx.type === 'out' ? (tx.toName ?? '') : (tx.fromName ?? '');
  }

  fmtBRL(v: number)  { return this.wallet.fmtBRL(v); }
  fmtDate(ts: number) { return this.wallet.fmtDate(ts); }

  goDetail(tx: Transaction) {
    this.router.navigate(['/tabs/tab3'], { queryParams: { id: tx.id } });
  }
}
