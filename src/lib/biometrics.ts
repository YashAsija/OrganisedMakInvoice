export interface SecuritySettings {
  isBiometricsEnabled: boolean;
  isPinLockEnabled: boolean;
  hashedPin: string;
}

const STORAGE_KEY = 'invoice_builder_security';

export function getSecuritySettings(): SecuritySettings {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    return {
      isBiometricsEnabled: false,
      isPinLockEnabled: false,
      hashedPin: '',
    };
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return {
      isBiometricsEnabled: false,
      isPinLockEnabled: false,
      hashedPin: '',
    };
  }
}

export function saveSecuritySettings(settings: SecuritySettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/**
 * Checks if the browser environment supports WebAuthn / TouchID / FaceID credentials
 */
export async function checkBiometricAvailability(): Promise<boolean> {
  if (!window.PublicKeyCredential) {
    return false;
  }
  
  try {
    // Check if platform authenticator matches are present (PIN, FaceID, Fingerprint Reader)
    const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return isAvailable;
  } catch (e) {
    console.warn('WebAuthn availability check failed:', e);
    return false;
  }
}

/**
 * Authenticate with device's native TouchID/Face ID via WebAuthn API
 * If authenticators are not configured, fallback to simulated or PIN passcode
 */
export async function authenticateWithBiometrics(username = 'invoice-user'): Promise<boolean> {
  const hasBiometrics = await checkBiometricAvailability();
  if (!hasBiometrics) {
    // Return false to let the system trigger passcode or simulated biometrics
    return false;
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userID = new Uint8Array(16);
    window.crypto.getRandomValues(userID);

    // Prompt user to verify identity via native device biometrics
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'Mobile Invoice Maker' },
        user: {
          id: userID,
          name: username,
          displayName: username,
        },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }], // ES256
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
        timeout: 60000,
      },
    });

    return !!credential;
  } catch (e) {
    console.error('Biometric authentication registration/challenge failed:', e);
    // User might have cancelled or browser iframe didn't have user gesture/permission
    return false;
  }
}
