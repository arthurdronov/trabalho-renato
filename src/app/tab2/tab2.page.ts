import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonIcon,
  IonText, IonNote, IonRefresher, IonRefresherContent
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
    IonText, IonNote, IonRefresher, IonRefresherContent
  ]
})
export class Tab2Page {

  txs: Transaction[] = [];

  constructor(private wallet: WalletService, private router: Router) {
    addIcons({ arrowUpOutline, arrowDownOutline, receiptOutline });
  }

  ionViewWillEnter() {
    this.load();
  }

  load() {
    const user = this.wallet.getCurrentUser();
    if (!user) { this.router.navigate(['/login'], { replaceUrl: true }); return; }
    this.txs = [...(user.txs || [])].reverse();
  }

  refresh(event: any) {
    this.load();
    event.target.complete();
  }

  partnerName(tx: Transaction): string {
    return tx.type === 'out' ? (tx.toName ?? '') : (tx.fromName ?? '');
  }

  fmtBRL(v: number) { return this.wallet.fmtBRL(v); }
  fmtDate(ts: number) { return this.wallet.fmtDate(ts); }

  goDetail(tx: Transaction) {
    // Passa o índice original (txs está invertido) para a aba de detalhe
    const user = this.wallet.getCurrentUser()!;
    const idx = user.txs.findIndex(t => t.hash === tx.hash && t.ts === tx.ts);
    this.router.navigate(['/tabs/tab3'], { queryParams: { idx } });
  }
}
