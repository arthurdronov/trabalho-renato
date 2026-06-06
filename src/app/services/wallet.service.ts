import { Injectable } from '@angular/core';

export interface User {
  name: string;
  email: string;
  credId: string;
  address: string;
  balance: number;
  txs: Transaction[];
}

export interface Transaction {
  type: 'out' | 'in';
  toEmail?: string;
  toName?: string;
  toAddress?: string;
  fromEmail?: string;
  fromName?: string;
  fromAddress?: string;
  amount: number;
  note: string;
  hash: string;
  ts: number;
  block: number;
  gasUsed: string;
  confirmations: number;
}

@Injectable({ providedIn: 'root' })
export class WalletService {

  private readonly USERS_KEY = 'cw_users';
  private readonly SESSION_KEY = 'cw_session';

  // ─── Usuários ────────────────────────────────────────────────────────────────

  getUsers(): Record<string, User> {
    try { return JSON.parse(localStorage.getItem(this.USERS_KEY) || '{}'); }
    catch { return {}; }
  }

  saveUsers(users: Record<string, User>): void {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  }

  getUser(email: string): User | null {
    return this.getUsers()[email] ?? null;
  }

  /** Cria novo usuário com saldo inicial de R$ 5.000 */
  createUser(name: string, email: string, credId: string): User {
    const users = this.getUsers();
    const user: User = {
      name, email, credId,
      address: this.genAddress(),
      balance: 5000,
      txs: []
    };
    // cria um contato demo na primeira conta para facilitar testes
    if (Object.keys(users).length === 0) {
      users['demo@chainwallet.io'] = {
        name: 'Demo Friend', email: 'demo@chainwallet.io',
        credId: '', address: this.genAddress(), balance: 2000, txs: []
      };
    }
    users[email] = user;
    this.saveUsers(users);
    return user;
  }

  updateCredId(email: string, credId: string): void {
    const users = this.getUsers();
    if (users[email]) { users[email].credId = credId; this.saveUsers(users); }
  }

  /** Executa transferência entre dois usuários, persiste e retorna a tx */
  transfer(fromEmail: string, toEmail: string, amount: number, note: string): Transaction {
    const users = this.getUsers();
    const from = users[fromEmail];
    const to = users[toEmail];

    if (!from || !to) throw new Error('Usuário não encontrado.');
    if (amount <= 0) throw new Error('Valor inválido.');
    if (amount > from.balance) throw new Error('Saldo insuficiente.');

    const hash = this.genHash();
    const ts = Date.now();
    const block = Math.floor(Math.random() * 900000) + 100000;
    const gasUsed = (Math.random() * 0.002 + 0.0001).toFixed(6);

    const txOut: Transaction = {
      type: 'out', toEmail, toName: to.name, toAddress: to.address,
      fromAddress: from.address, amount, note, hash, ts, block, gasUsed, confirmations: 12
    };
    const txIn: Transaction = {
      type: 'in', fromEmail, fromName: from.name, fromAddress: from.address,
      toAddress: to.address, amount, note, hash, ts, block, gasUsed, confirmations: 12
    };

    from.balance -= amount;
    to.balance += amount;
    from.txs.push(txOut);
    to.txs.push(txIn);
    this.saveUsers(users);

    return txOut;
  }

  // ─── Sessão ───────────────────────────────────────────────────────────────────

  getSession(): { email: string } | null {
    try { return JSON.parse(localStorage.getItem(this.SESSION_KEY) || 'null'); }
    catch { return null; }
  }

  saveSession(email: string): void {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify({ email }));
  }

  clearSession(): void {
    localStorage.removeItem(this.SESSION_KEY);
  }

  getCurrentUser(): User | null {
    const session = this.getSession();
    return session ? this.getUser(session.email) : null;
  }

  // ─── Utilidades ───────────────────────────────────────────────────────────────

  genAddress(): string {
    const h = '0123456789abcdef';
    return '0x' + Array.from({ length: 40 }, () => h[Math.floor(Math.random() * 16)]).join('');
  }

  genHash(): string {
    const h = '0123456789abcdef';
    return '0x' + Array.from({ length: 64 }, () => h[Math.floor(Math.random() * 16)]).join('');
  }

  fmtBRL(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  fmtDate(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleDateString('pt-BR') + ' ' +
      d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  initials(name: string): string {
    const p = name.trim().split(' ');
    return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase();
  }
}
