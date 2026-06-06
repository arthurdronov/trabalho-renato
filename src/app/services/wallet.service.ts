import { Injectable } from '@angular/core';

export interface User {
  id: number;
  name: string;
  email: string;
  address: string;
  balance: number;
}

export interface Transaction {
  id: number;
  type: 'out' | 'in';
  hash: string;
  amount: number;
  note: string;
  block: number;
  gasUsed: string;
  confirmations: number;
  ts: number;
  toName?: string;
  toEmail?: string;
  toAddress?: string;
  fromName?: string;
  fromEmail?: string;
  fromAddress?: string;
}

const API = '/api';

@Injectable({ providedIn: 'root' })
export class WalletService {

  private readonly TOKEN_KEY   = 'cw_token';
  private readonly USER_KEY    = 'cw_user';

  // ─── HTTP helpers ─────────────────────────────────────────────────────────

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  saveToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  clearToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getCachedUser(): User | null {
    try {
      return JSON.parse(localStorage.getItem(this.USER_KEY) || 'null');
    } catch { return null; }
  }

  cacheUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  private headers(auth = false): HeadersInit {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth) {
      const token = this.getToken();
      if (token) h['Authorization'] = `Bearer ${token}`;
    }
    return h;
  }

  private async request<T>(method: string, path: string, body?: any, auth = false): Promise<T> {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: this.headers(auth),
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
    return data as T;
  }

  // ─── Auth endpoints ───────────────────────────────────────────────────────

  async getRegisterChallenge(name: string, email: string) {
    return this.request<any>('POST', '/auth/register/challenge', { name, email });
  }

  async verifyRegistration(name: string, email: string, credential: any) {
    return this.request<{ token: string; user: User }>(
      'POST', '/auth/register/verify', { name, email, credential }
    );
  }

  async getLoginChallenge(email: string) {
    return this.request<any>('POST', '/auth/login/challenge', { email });
  }

  async verifyLogin(email: string, credential: any) {
    return this.request<{ token: string; user: User }>(
      'POST', '/auth/login/verify', { email, credential }
    );
  }

  // ─── Wallet endpoints ─────────────────────────────────────────────────────

  async fetchMe(): Promise<User> {
    const user = await this.request<User>('GET', '/wallet/me', undefined, true);
    this.cacheUser(user);
    return user;
  }

  async fetchContacts(): Promise<User[]> {
    return this.request<User[]>('GET', '/wallet/contacts', undefined, true);
  }

  async transfer(toEmail: string, amount: number, note: string) {
    return this.request<{ transaction: Transaction; newBalance: number }>(
      'POST', '/wallet/transfer', { toEmail, amount, note }, true
    );
  }

  async fetchTransactions(): Promise<Transaction[]> {
    return this.request<Transaction[]>('GET', '/wallet/transactions', undefined, true);
  }

  async fetchTransaction(id: number): Promise<Transaction> {
    return this.request<Transaction>('GET', `/wallet/transaction/${id}`, undefined, true);
  }

  // ─── Formatação ───────────────────────────────────────────────────────────

  fmtBRL(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  fmtDate(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleDateString('pt-BR') + ' ' +
      d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
}
