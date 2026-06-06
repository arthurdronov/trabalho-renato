import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class WebauthnService {

  isWebAuthnSupported(): boolean {
    return !!(window.PublicKeyCredential &&
      navigator.credentials &&
      navigator.credentials.create);
  }

  async isBiometricAvailable(): Promise<boolean> {
    if (!this.isWebAuthnSupported()) return false;
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch { return false; }
  }

  /**
   * Registra uma nova credencial biométrica para o usuário.
   * Retorna o credentialId em base64 para ser salvo no perfil.
   */
  async register(username: string, email: string): Promise<string> {
    if (!this.isWebAuthnSupported())
      throw new Error('WebAuthn não é suportado neste navegador/dispositivo.');

    if (!(await this.isBiometricAvailable()))
      throw new Error(
        'Nenhum autenticador biométrico disponível. ' +
        'Configure Face ID, impressão digital ou câmera facial nas configurações do sistema.'
      );

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: challenge.buffer,
        rp: { name: 'ChainWallet', id: window.location.hostname },
        user: { id: userId.buffer, name: email, displayName: username },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },    // ES256 (Android, iOS)
          { alg: -257, type: 'public-key' },   // RS256 (Windows Hello)
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'required',
          requireResidentKey: true,
          userVerification: 'required',
        },
        timeout: 60000,
        attestation: 'none',
      }
    }) as PublicKeyCredential;

    if (!credential) throw new Error('Falha ao criar credencial biométrica.');

    const rawIdArray = Array.from(new Uint8Array(credential.rawId));
    return btoa(String.fromCharCode(...rawIdArray));
  }

  /**
   * Autentica o usuário com a credencial previamente registrada.
   * Requer o credentialId em base64 salvo no perfil.
   */
  async authenticate(credIdB64: string): Promise<boolean> {
    if (!this.isWebAuthnSupported())
      throw new Error('WebAuthn não é suportado neste navegador/dispositivo.');

    const credentialId = Uint8Array.from(atob(credIdB64), c => c.charCodeAt(0)).buffer;
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: challenge.buffer,
        allowCredentials: [{
          id: credentialId,
          type: 'public-key',
          transports: ['internal'],
        }],
        userVerification: 'required',
        timeout: 60000,
      }
    }) as PublicKeyCredential;

    return !!assertion;
  }

  handleError(error: any): string {
    switch (error?.name) {
      case 'NotAllowedError':
        return 'Biometria cancelada ou negada. Tente novamente.';
      case 'NotSupportedError':
        return 'Dispositivo não suporta o tipo de autenticação solicitado.';
      case 'SecurityError':
        return 'A operação requer conexão segura (HTTPS).';
      case 'InvalidStateError':
        return 'Esta biometria já está registrada neste dispositivo.';
      case 'ConstraintError':
        return 'O dispositivo não satisfaz os requisitos de segurança (biometria não configurada).';
      default:
        return error?.message || 'Erro desconhecido na biometria.';
    }
  }
}
