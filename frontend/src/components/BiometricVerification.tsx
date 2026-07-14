import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Lock, ShieldCheck, AlertTriangle } from 'lucide-react';
import {
  getSecuritySettings,
  hashPin,
  hashPinPBKDF2,
  getAttemptState,
  recordFailedAttempt,
  clearAttempts,
  MAX_PIN_ATTEMPTS,
} from '../lib/biometrics';
import { supabase } from '../lib/supabase';

interface BiometricVerificationProps {
  onSuccess: () => void;
}

// Reads the backend URL from env. Falls back to empty → local-only mode.
const BACKEND_URL =
  (import.meta as unknown as { env: Record<string, string> }).env?.VITE_BACKEND_URL ||
  (typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_BACKEND_URL : '') ||
  '';

export default function BiometricVerification({ onSuccess }: BiometricVerificationProps) {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [settings] = useState(() => getSecuritySettings());
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);
  const [attemptCount, setAttemptCount] = useState<number>(0);

  // Restore lockout and attempt count from localStorage on mount
  useEffect(() => {
    const state = getAttemptState();
    setAttemptCount(state.count);
    if (state.lockedUntil && state.lockedUntil > Date.now()) {
      setLockoutSeconds(Math.ceil((state.lockedUntil - Date.now()) / 1000));
    }
  }, []);

  // Countdown tick while locked out
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const id = setInterval(() => {
      setLockoutSeconds(s => {
        if (s <= 1) {
          clearAttempts();
          setAttemptCount(0);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [lockoutSeconds]);

  // ---------------------------------------------------------------------------
  // Server-side verification (online path)
  // Returns: true = correct, false = wrong PIN, null = server unavailable (fall back to local)
  // ---------------------------------------------------------------------------
  const verifyWithServer = async (
    enteredPin: string,
    token: string,
    userId: string
  ): Promise<true | false | null> => {
    if (!BACKEND_URL) return null;
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/pin/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pin: enteredPin, user_id: userId }),
        signal: AbortSignal.timeout(5000),
      });

      if (res.status === 200) return true;

      if (res.status === 429) {
        const body = await res.json().catch(() => ({}));
        setError(body.detail || 'Too many attempts. Try again later.');
        setLockoutSeconds(60);
        return false;
      }

      if (res.status === 404) {
        // No server-side hash yet (legacy user who set PIN before this update) → fall back to local
        return null;
      }

      // 401 wrong PIN
      return false;
    } catch {
      // Timeout or network error → fall back to local
      return null;
    }
  };



  // ---------------------------------------------------------------------------
  // PIN entry handler
  // ---------------------------------------------------------------------------
  const handlePinInput = async (num: string) => {
    if (lockoutSeconds > 0) return;
    setError('');

    if (pin.length >= 4) return;
    const newPin = pin + num;
    setPin(newPin);

    if (newPin.length < 4) return;

    // 4 digits entered — verify
    let verified = false;

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.access_token && session?.user?.id) {
        const serverResult = await verifyWithServer(
          newPin,
          session.access_token,
          session.user.id
        );
        if (serverResult === null) {
          setError('Server unreachable. Online connection required to verify PIN.');
          verified = false;
        } else {
          verified = serverResult;
        }
      } else {
        setError('Authentication session missing. Verification failed.');
        verified = false;
      }
    } catch {
      setError('Connection error. Server verification failed.');
      verified = false;
    }

    if (verified) {
      clearAttempts();
      setAttemptCount(0);
      onSuccess();
      return;
    }

    // Wrong PIN — update attempt tracker
    const newState = recordFailedAttempt();
    setAttemptCount(newState.count);

    if (newState.lockedUntil) {
      const secs = Math.ceil((newState.lockedUntil - Date.now()) / 1000);
      setLockoutSeconds(secs);
      setError(`Too many attempts. Locked for ${secs}s.`);
    } else {
      const remaining = MAX_PIN_ATTEMPTS - newState.count;
      setError(
        `Incorrect PIN. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
      );
    }
    setTimeout(() => setPin(''), 500);
  };

  const handleBackspace = () => {
    if (lockoutSeconds > 0) return;
    setPin(prev => prev.slice(0, -1));
  };

  const isLocked = lockoutSeconds > 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-slate-950 p-6 text-white text-sans select-none">

      {/* Top Badge */}
      <div className="mt-8 text-center text-xs text-slate-400 flex items-center gap-1.5 font-mono">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        SCREEN LOCK
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm">
        <div className="flex flex-col items-center">

          {/* Icon — switches to warning triangle when locked out */}
          <div className="relative mb-6">
            <div className={`w-20 h-20 rounded-full border flex items-center justify-center shadow-xl transition-colors duration-300 ${
              isLocked
                ? 'bg-rose-950 border-rose-800 text-rose-400'
                : 'bg-slate-900 border-slate-800 text-sky-400'
            }`}>
              {isLocked ? <AlertTriangle className="w-8 h-8" /> : <Lock className="w-8 h-8" />}
            </div>
          </div>

          <h1 className="text-xl font-bold tracking-tight uppercase tracking-wider">
            {isLocked ? 'Account Locked' : 'Unlock Workspace'}
          </h1>

          <p className="text-xs text-slate-400 text-center mt-2 leading-relaxed max-w-xs">
            {isLocked
              ? `Too many incorrect attempts. Try again in ${lockoutSeconds}s.`
              : 'Enter your PIN to unlock. This is a screen lock — your data is protected by your account credentials.'}
          </p>

          {/* 60-second countdown */}
          {isLocked && (
            <div className="mt-8 text-5xl font-mono font-bold text-rose-400 tabular-nums">
              {lockoutSeconds}s
            </div>
          )}

          {/* PIN dots + feedback */}
          {!isLocked && (
            <>
              <div className="flex gap-4 my-8 h-4 items-center">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                      i < pin.length
                        ? 'bg-sky-400 scale-110 shadow-lg shadow-sky-500/40'
                        : 'border border-slate-700 bg-slate-900'
                    }`}
                  />
                ))}
              </div>

              {/* Attempt counter (shown after first failure) */}
              {attemptCount > 0 && !error && (
                <p className="text-xs text-amber-400 font-mono mb-2">
                  {MAX_PIN_ATTEMPTS - attemptCount} attempt{MAX_PIN_ATTEMPTS - attemptCount !== 1 ? 's' : ''} remaining before lockout
                </p>
              )}

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-rose-400 font-mono font-bold text-center"
                >
                  {error}
                </motion.p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Numerical PIN Pad */}
      <div className={`w-full max-w-sm flex flex-col items-center gap-2 mb-8 transition-opacity duration-300 ${isLocked ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
        <div className="grid grid-cols-3 gap-3 w-full">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              onClick={() => handlePinInput(num)}
              disabled={isLocked}
              className="h-14 bg-slate-900/60 rounded-xl border border-slate-800/50 hover:bg-slate-800 active:bg-slate-800 active:scale-95 text-lg font-medium flex items-center justify-center cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-700 transition-all font-mono"
            >
              {num}
            </button>
          ))}
          <div className="h-14" />
          <button
            onClick={() => handlePinInput('0')}
            disabled={isLocked}
            className="h-14 bg-slate-900/60 rounded-xl border border-slate-800/50 hover:bg-slate-800 active:bg-slate-800 text-lg font-medium flex items-center justify-center cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-700 transition-all font-mono"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            disabled={isLocked}
            aria-label="Delete last digit"
            className="h-14 rounded-xl active:scale-95 text-xs font-semibold text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-all uppercase tracking-wider"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
