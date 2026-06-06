import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class WebauthnService {

  isSupported(): boolean {
    return !!(window.PublicKeyCredential &&
      navigator.credentials?.create &&
      navigator.credentials?.get);
  }

  async isBiometricAvailable(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch { return false; }
  }

  /**
   * Recebe as opções do servidor e aciona o autenticador do dispositivo.
   * Retorna o objeto credential serializado para enviar ao backend.
   */
  async register(options: any): Promise<any> {
    // Decodifica os campos binários que vêm em base64url do servidor
    options.challenge = this.base64urlToBuffer(options.challenge);
    options.user.id   = this.base64urlToBuffer(options.user.id);
    if (options.excludeCredentials) {
      options.excludeCredentials = options.excludeCredentials.map((c: any) => ({
        ...c, id: this.base64urlToBuffer(c.id)
      }));
    }

    const cred = await navigator.credentials.create({ publicKey: options }) as PublicKeyCredential;
    if (!cred) throw new Error('Falha ao criar credencial biométrica.');

    return this.serializeCredential(cred);
  }

  /**
   * Recebe as opções do servidor e autentica com a biometria salva.
   * Retorna o objeto assertion serializado para enviar ao backend.
   */
  async authenticate(options: any): Promise<any> {
    options.challenge = this.base64urlToBuffer(options.challenge);
    if (options.allowCredentials) {
      options.allowCredentials = options.allowCredentials.map((c: any) => ({
        ...c, id: this.base64urlToBuffer(c.id)
      }));
    }

    const assertion = await navigator.credentials.get({ publicKey: options }) as PublicKeyCredential;
    if (!assertion) throw new Error('Autenticação biométrica falhou.');

    return this.serializeCredential(assertion);
  }

  // ─── Helpers de serialização ──────────────────────────────────────────────

  private serializeCredential(cred: PublicKeyCredential): any {
    const res = cred.response as any;
    const obj: any = {
      id:    cred.id,
      rawId: this.bufferToBase64url(cred.rawId),
      type:  cred.type,
      response: {}
    };

    // Registration response
    if (res.attestationObject) {
      obj.response.attestationObject = this.bufferToBase64url(res.attestationObject);
      obj.response.clientDataJSON     = this.bufferToBase64url(res.clientDataJSON);
    }
    // Authentication response
    if (res.authenticatorData) {
      obj.response.authenticatorData  = this.bufferToBase64url(res.authenticatorData);
      obj.response.clientDataJSON     = this.bufferToBase64url(res.clientDataJSON);
      obj.response.signature          = this.bufferToBase64url(res.signature);
      if (res.userHandle) obj.response.userHandle = this.bufferToBase64url(res.userHandle);
    }

    return obj;
  }

  private base64urlToBuffer(base64url: string): ArrayBuffer {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
    return buffer.buffer;
  }

  private bufferToBase64url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  handleError(error: any): string {
    switch (error?.name) {
      case 'NotAllowedError':  return 'Biometria cancelada ou negada.';
      case 'NotSupportedError': return 'Dispositivo não suporta este tipo de autenticação.';
      case 'SecurityError':    return 'A operação requer HTTPS.';
      case 'InvalidStateError': return 'Biometria já registrada neste dispositivo.';
      default: return error?.message || 'Erro desconhecido na biometria.';
    }
  }
}
