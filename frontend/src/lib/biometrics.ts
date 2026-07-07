export interface SecuritySettings {
  isPinLockEnabled: boolean;
  hashedPin: string;
}

const STORAGE_KEY = 'invoice_builder_security';

export function getSecuritySettings(): SecuritySettings {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    return {
      isPinLockEnabled: false,
      hashedPin: '',
    };
  }
  try {
    const parsed = JSON.parse(data);
    return {
      isPinLockEnabled: !!parsed.isPinLockEnabled,
      hashedPin: parsed.hashedPin || '',
    };
  } catch (e) {
    return {
      isPinLockEnabled: false,
      hashedPin: '',
    };
  }
}

export function saveSecuritySettings(settings: SecuritySettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/**
 * Hashing function to hash PIN with SHA-256 for secure comparison
 */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
