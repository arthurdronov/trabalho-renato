import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WebauthnService {

  private readonly STORAGE_KEY = 'webauthn_credential_id';

  constructor() { }

  /**
   * Verifica se o navegador suporta WebAuthn
   */
  isWebAuthnSupported(): boolean {
    return !!(window.PublicKeyCredential && navigator.credentials && navigator.credentials.create);
  }

  /**
   * Verifica se o dispositivo possui um autenticador biométrico de plataforma disponível
   * (Face ID, Touch ID, impressão digital, câmera facial, Windows Hello biométrico).
   * Retorna false se o dispositivo só tiver PIN/senha como verificador.
   */
  async isBiometricAvailable(): Promise<boolean> {
    if (!this.isWebAuthnSupported()) return false;
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Registra uma nova credencial biométrica no dispositivo.
   * O SO escolherá o método disponível: Face ID, impressão digital ou câmera facial.
   * No PC com Windows Hello, usará biometria se configurada (câmera/impressão digital).
   */
  async register(username: string): Promise<boolean> {
    if (!this.isWebAuthnSupported()) {
      throw new Error('WebAuthn não é suportado neste navegador/dispositivo.');
    }

    const biometricAvailable = await this.isBiometricAvailable();
    if (!biometricAvailable) {
      throw new Error(
        'Este dispositivo não possui autenticador biométrico disponível. ' +
        'Configure Face ID, impressão digital ou câmera facial nas configurações do sistema.'
      );
    }

    // Challenge deve vir do backend em produção — aqui é simulado
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge: challenge.buffer,
      rp: {
        name: 'Ionic Biometric Demo',
        id: window.location.hostname,
      },
      user: {
        id: crypto.getRandomValues(new Uint8Array(16)).buffer,
        name: username,
        displayName: username,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256 (Android, iOS)
        { alg: -257, type: 'public-key' },  // RS256 (Windows Hello)
      ],
      authenticatorSelection: {
        // 'platform' = usa o autenticador embutido no dispositivo (Face ID, fingerprint, câmera)
        // Exclui chaves de segurança físicas (USB, NFC)
        authenticatorAttachment: 'platform',
        // 'required' obriga que a credencial fique salva no autenticador
        // Isso impede que o SO use PIN como fallback em muitos casos
        residentKey: 'required',
        requireResidentKey: true,
        // 'required' faz o SO usar verificação biométrica de verdade,
        // sem aceitar apenas PIN/senha como substituto
        userVerification: 'required',
      },
      timeout: 60000,
      attestation: 'none'
    };

    try {
      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      }) as PublicKeyCredential;

      if (credential) {
        // Salva o ID da credencial usando Array.from para evitar stack overflow
        // com rawId de tamanho grande
        const rawIdArray = Array.from(new Uint8Array(credential.rawId));
        const b64 = btoa(String.fromCharCode(...rawIdArray));
        localStorage.setItem(this.STORAGE_KEY, b64);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Erro no registro WebAuthn:', error);
      throw new Error(this.handleError(error));
    }
  }

  /**
   * Autentica o usuário usando a biometria previamente registrada.
   * O SO apresentará Face ID, impressão digital ou câmera conforme disponível.
   */
  async authenticate(): Promise<boolean> {
    const credentialIdB64 = localStorage.getItem(this.STORAGE_KEY);

    if (!credentialIdB64) {
      throw new Error('Nenhuma biometria cadastrada neste dispositivo. Registre primeiro.');
    }

    if (!this.isWebAuthnSupported()) {
      throw new Error('WebAuthn não é suportado neste navegador/dispositivo.');
    }

    const credentialId = this.bufferDecode(atob(credentialIdB64));

    // Challenge deve vir do backend em produção — aqui é simulado
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge: challenge.buffer,
      allowCredentials: [{
        id: credentialId,
        type: 'public-key',
        // 'internal' instrui o browser a usar apenas o autenticador embutido
        // (biometria do dispositivo), não chaves externas
        transports: ['internal'],
      }],
      // 'required' faz o SO exibir o prompt biométrico real
      userVerification: 'required',
      timeout: 60000,
    };

    try {
      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      }) as PublicKeyCredential;

      return !!assertion;
    } catch (error: any) {
      console.error('Erro na autenticação WebAuthn:', error);
      throw new Error(this.handleError(error));
    }
  }

  /**
   * Verifica se o dispositivo já possui uma credencial registrada
   */
  isRegistered(): boolean {
    return !!localStorage.getItem(this.STORAGE_KEY);
  }

  /**
   * Limpa os dados de registro (Reset)
   */
  clearRegistration(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // --- Auxiliares ---

  private bufferDecode(value: string): ArrayBuffer {
    return Uint8Array.from(value, c => c.charCodeAt(0)).buffer;
  }

  private handleError(error: any): string {
    switch (error.name) {
      case 'NotAllowedError':
        return 'Biometria cancelada ou negada. Tente novamente.';
      case 'NotSupportedError':
        return 'Este dispositivo não suporta o tipo de autenticação solicitada.';
      case 'SecurityError':
        return 'A operação requer conexão segura (HTTPS).';
      case 'InvalidStateError':
        return 'Esta biometria já está registrada neste dispositivo.';
      case 'ConstraintError':
        return 'O dispositivo não satisfaz os requisitos de segurança exigidos (biometria não configurada).';
      default:
        return error.message || 'Ocorreu um erro desconhecido na biometria.';
    }
  }
}