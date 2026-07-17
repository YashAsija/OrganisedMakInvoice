export interface SecuritySettings {
  isPinLockEnabled: boolean;
  hashedPin: string;
  /**
   * Hex-encoded 16-byte random salt used for PBKDF2 hashing.
   * Present  → PBKDF2 path (new users / after PIN change)
   * Absent   → legacy SHA-256 path (existing users, migrated on next PIN change)
   */
  salt?: string;
}

export interface AttemptState {
  count: number;
  lockedUntil: number | null; // Unix timestamp in ms; null = not locked
}

const STORAGE_KEY = 'invoice_builder_security';
const ATTEMPT_KEY = 'invoice_builder_pin_attempts';

export const MAX_PIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 60_000; // 60 seconds

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------
export function getSecuritySettings(): SecuritySettings {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return { isPinLockEnabled: false, hashedPin: '' };
  try {
    const parsed = JSON.parse(data);
    return {
      isPinLockEnabled: !!parsed.isPinLockEnabled,
      hashedPin: parsed.hashedPin || '',
      salt: parsed.salt || undefined,
    };
  } catch {
    return { isPinLockEnabled: false, hashedPin: '' };
  }
}

export function saveSecuritySettings(settings: SecuritySettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

// ---------------------------------------------------------------------------
// PBKDF2 hashing (preferred — new users and after PIN change)
// Uses Web Crypto API (no npm dependency).
// 100,000 iterations of PBKDF2-SHA256 with a random 16-byte salt.
// ---------------------------------------------------------------------------
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_HASH = 'SHA-256';
const PBKDF2_KEY_LENGTH = 256; // bits

// Generates a random salt, returned as a hex string (fixed, storable format)
export async function generateSalt(): Promise<string> {
  const saltBytes = window.crypto.getRandomValues(new Uint8Array(16));
  return Array.from(saltBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Pure deterministic hash: same pin + same salt = same output, always
export async function hashPinPBKDF2(pin: string, saltHex: string): Promise<string> {
  const encoder = new TextEncoder();
  const saltBytes = new Uint8Array(
    saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
  );

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    keyMaterial,
    PBKDF2_KEY_LENGTH
  );

  const hashArray = Array.from(new Uint8Array(derivedBits));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// Legacy SHA-256 hashing (kept for backward compat — existing users)
// Used when SecuritySettings.salt is absent.
// Migration: next time user changes their PIN, PBKDF2 replaces this.
// ---------------------------------------------------------------------------
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ---------------------------------------------------------------------------
// Client-side brute-force tracking
// Stored in a separate localStorage key so it can't be cleared alongside
// the security settings without also resetting the attempt counter.
// ---------------------------------------------------------------------------
export function getAttemptState(): AttemptState {
  const raw = localStorage.getItem(ATTEMPT_KEY);
  if (!raw) return { count: 0, lockedUntil: null };
  try {
    return JSON.parse(raw) as AttemptState;
  } catch {
    return { count: 0, lockedUntil: null };
  }
}

export function recordFailedAttempt(): AttemptState {
  const state = getAttemptState();
  const newCount = state.count + 1;
  const lockedUntil =
    newCount >= MAX_PIN_ATTEMPTS ? Date.now() + LOCKOUT_DURATION_MS : null;
  const newState: AttemptState = { count: newCount, lockedUntil };
  localStorage.setItem(ATTEMPT_KEY, JSON.stringify(newState));
  return newState;
}

export function clearAttempts(): void {
  localStorage.removeItem(ATTEMPT_KEY);
}
