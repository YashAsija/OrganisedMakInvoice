import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, AlertTriangle, Delete, RefreshCw, Mail } from 'lucide-react';
import {
  getSecuritySettings,
  saveSecuritySettings,
  getAttemptState,
  recordFailedAttempt,
  clearAttempts,
  MAX_PIN_ATTEMPTS,
  hashPin,
  hashPinPBKDF2,
} from '../lib/biometrics';
import { supabase } from '../lib/supabase';

interface BiometricVerificationProps {
  onSuccess: () => void;
}

const BACKEND_URL =
  (import.meta as unknown as { env: Record<string, string> }).env?.VITE_BACKEND_URL ||
  (typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_BACKEND_URL : '') ||
  '';

type Screen = 'unlock' | 'forgot' | 'forgotSent';

export default function BiometricVerification({ onSuccess }: BiometricVerificationProps) {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [settings] = useState(() => getSecuritySettings());
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);
  const [attemptCount, setAttemptCount] = useState<number>(0);
  const [screen, setScreen] = useState<Screen>('unlock');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [shakeError, setShakeError] = useState(false);

  useEffect(() => {
    const state = getAttemptState();
    setAttemptCount(state.count);
    if (state.lockedUntil && state.lockedUntil > Date.now()) {
      setLockoutSeconds(Math.ceil((state.lockedUntil - Date.now()) / 1000));
    }
    // Pre-fill email if we can find it
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) setForgotEmail(session.user.email);
    });
  }, []);

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

  // Keyboard support
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (screen !== 'unlock') return;
      if (e.key >= '0' && e.key <= '9') handlePinInput(e.key);
      else if (e.key === 'Backspace') handleBackspace();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [pin, lockoutSeconds, screen]);

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
      if (res.status === 404) return null;
      return false;
    } catch {
      return null;
    }
  };

  const verifyLocally = async (enteredPin: string): Promise<boolean> => {
    const s = getSecuritySettings();
    if (!s.isPinLockEnabled || !s.hashedPin) return false;
    let currentHash = '';
    if (s.salt) {
      currentHash = await hashPinPBKDF2(enteredPin, s.salt);
    } else {
      currentHash = await hashPin(enteredPin);
    }
    return currentHash === s.hashedPin;
  };

  const triggerShake = () => {
    setShakeError(true);
    setTimeout(() => setShakeError(false), 500);
  };

  const handlePinInput = async (num: string) => {
    if (lockoutSeconds > 0) return;
    setError('');
    if (pin.length >= 4) return;
    const newPin = pin + num;
    setPin(newPin);
    if (newPin.length < 4) return;

    let verified = false;
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.access_token && session?.user?.id) {
        const serverResult = await verifyWithServer(newPin, session.access_token, session.user.id);

        if (serverResult === true) {
          // Server confirmed correct PIN
          verified = true;
        } else if (serverResult === false) {
          // Server confirmed wrong PIN
          verified = false;
        } else {
          // serverResult === null → server unreachable / no hash on server yet → fall back to local
          verified = await verifyLocally(newPin);
        }
      } else {
        // No supabase session (offline / local-only mode) → fall back to local hash
        verified = await verifyLocally(newPin);
      }
    } catch {
      // Any unexpected error → try local as last resort
      verified = await verifyLocally(newPin);
    }

    if (verified) {
      clearAttempts();
      setAttemptCount(0);
      onSuccess();
      return;
    }

    const newState = recordFailedAttempt();
    setAttemptCount(newState.count);
    triggerShake();

    if (newState.lockedUntil) {
      const secs = Math.ceil((newState.lockedUntil - new Date().getTime()) / 1000);
      setLockoutSeconds(secs);
      setError(`Too many attempts. Locked for ${secs}s.`);
    } else {
      const remaining = MAX_PIN_ATTEMPTS - newState.count;
      setError(`Incorrect PIN. ${remaining} attempt${remaining !== 1 ? 's' : ''} left.`);
    }
    setTimeout(() => setPin(''), 500);
  };

  const handleBackspace = () => {
    if (lockoutSeconds > 0) return;
    setPin(prev => prev.slice(0, -1));
  };

  const handleForgotPin = async () => {
    setForgotLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (BACKEND_URL && session?.access_token) {
        await fetch(`${BACKEND_URL}/api/auth/pin/clear`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
      }
      // Disable PIN locally
      const current = getSecuritySettings();
      saveSecuritySettings({ ...current, isPinLockEnabled: false, hashedPin: '' });
      clearAttempts();
      setScreen('forgotSent');
    } catch {
      setScreen('forgotSent');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleBypassAndEnter = () => {
    // After PIN is cleared, allow entry
    clearAttempts();
    onSuccess();
  };

  const isLocked = lockoutSeconds > 0;

  const dialPad = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'del'],
  ];

  // ─── FORGOT PIN SENT SCREEN ───────────────────────────────────────────────
  if (screen === 'forgotSent') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 select-none"
        style={{ background: 'linear-gradient(135deg, #1a1410 0%, #0f0c08 50%, #1a1410 100%)' }}>
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #88765C, #6b5a44)' }}>
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mb-3">PIN Removed</h1>
          <p className="text-sm text-white/60 leading-relaxed mb-8 max-w-xs mx-auto">
            Your screen PIN lock has been disabled. You can now access your workspace and set a new PIN from Settings if needed.
          </p>
          <button
            onClick={handleBypassAndEnter}
            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider text-white shadow-lg transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #88765C, #6b5a44)' }}
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ─── FORGOT PIN SCREEN ────────────────────────────────────────────────────
  if (screen === 'forgot') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 select-none"
        style={{ background: 'linear-gradient(135deg, #1a1410 0%, #0f0c08 50%, #1a1410 100%)' }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl"
              style={{ background: 'rgba(136,118,92,0.2)', border: '1px solid rgba(136,118,92,0.4)' }}>
              <Mail className="w-8 h-8" style={{ color: '#88765C' }} />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight mb-2">Forgot PIN?</h1>
            <p className="text-sm text-white/60 leading-relaxed max-w-xs mx-auto">
              This will remove your current PIN lock. You can set a new PIN from Profile Settings after logging in.
            </p>
          </div>

          {forgotEmail && (
            <div className="rounded-2xl p-4 mb-6 text-center" style={{ background: 'rgba(136,118,92,0.1)', border: '1px solid rgba(136,118,92,0.3)' }}>
              <p className="text-xs text-white/50 mb-1">Logged in as</p>
              <p className="text-sm font-bold" style={{ color: '#c4a97e' }}>{forgotEmail}</p>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleForgotPin}
              disabled={forgotLoading}
              className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider text-white shadow-lg transition-all active:scale-95 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #88765C, #6b5a44)' }}
            >
              {forgotLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Removing PIN...
                </span>
              ) : 'Remove PIN & Continue'}
            </button>
            <button
              onClick={() => setScreen('unlock')}
              className="w-full py-3 rounded-2xl font-semibold text-sm text-white/50 hover:text-white/80 transition-all"
            >
              ← Back to PIN Entry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── MAIN UNLOCK SCREEN ───────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-between select-none"
      style={{ background: 'linear-gradient(135deg, #1a1410 0%, #0f0c08 50%, #1a1410 100%)' }}
    >
      {/* Top Badge */}
      <div className="mt-10 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest"
        style={{ background: 'rgba(136,118,92,0.15)', border: '1px solid rgba(136,118,92,0.3)', color: '#c4a97e' }}>
        <ShieldCheck className="w-3.5 h-3.5" />
        MakInvoices — Screen Lock
      </div>

      {/* Center Content */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm px-6">

        {/* Lock Icon */}
        <div className="relative mb-6">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 ${
            isLocked
              ? 'bg-rose-900/40 border border-rose-700/50 text-rose-400'
              : ''
          }`}
            style={!isLocked ? {
              background: 'linear-gradient(135deg, rgba(136,118,92,0.25) 0%, rgba(107,90,68,0.25) 100%)',
              border: '1px solid rgba(136,118,92,0.4)',
              color: '#c4a97e'
            } : {}}>
            {isLocked ? <AlertTriangle className="w-9 h-9" /> : <Lock className="w-9 h-9" />}
          </div>
        </div>

        <h1 className="text-2xl font-black text-white tracking-tight mb-2">
          {isLocked ? 'Account Locked' : 'Welcome Back'}
        </h1>
        <p className="text-sm text-white/60 text-center leading-relaxed max-w-xs mb-6">
          {isLocked
            ? `Too many incorrect attempts. Try again in ${lockoutSeconds}s.`
            : 'Enter your 4-digit PIN to unlock your workspace.'}
        </p>

        {/* Countdown */}
        {isLocked && (
          <div className="text-6xl font-black font-mono tabular-nums text-rose-400 mb-6">
            {lockoutSeconds}s
          </div>
        )}

        {/* PIN Dots */}
        {!isLocked && (
          <div className={`flex gap-5 my-4 transition-all ${shakeError ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}>
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full transition-all duration-150"
                style={{
                  backgroundColor: i < pin.length ? '#88765C' : 'transparent',
                  border: `2px solid ${i < pin.length ? '#88765C' : 'rgba(255,255,255,0.2)'}`,
                  transform: i < pin.length ? 'scale(1.2)' : 'scale(1)',
                  boxShadow: i < pin.length ? '0 0 10px rgba(136,118,92,0.5)' : 'none',
                }}
              />
            ))}
          </div>
        )}

        {/* Error message */}
        <div className="h-6 flex items-center justify-center mb-2">
          {error && (
            <p className="text-xs font-bold text-rose-400 text-center animate-pulse">{error}</p>
          )}
          {!error && attemptCount > 0 && !isLocked && (
            <p className="text-xs font-semibold text-amber-400/80">
              {MAX_PIN_ATTEMPTS - attemptCount} attempt{MAX_PIN_ATTEMPTS - attemptCount !== 1 ? 's' : ''} remaining
            </p>
          )}
        </div>
      </div>

      {/* Dial Pad */}
      <div className={`w-full max-w-sm px-6 mb-6 transition-opacity duration-300 ${isLocked ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
        <div className="grid grid-rows-4 gap-3">
          {dialPad.map((row, ri) => (
            <div key={ri} className="grid grid-cols-3 gap-3">
              {row.map((key, ki) => {
                if (key === '') return <div key={ki} />;
                if (key === 'del') {
                  return (
                    <button
                      key={ki}
                      onClick={handleBackspace}
                      className="h-14 rounded-2xl flex items-center justify-center font-bold transition-all active:scale-95"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.5)',
                      }}
                    >
                      <Delete size={18} />
                    </button>
                  );
                }
                return (
                  <button
                    key={ki}
                    onClick={() => handlePinInput(key)}
                    disabled={isLocked}
                    className="h-14 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-95 group"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(136,118,92,0.25)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                    onMouseDown={e => (e.currentTarget.style.background = 'rgba(136,118,92,0.4)')}
                    onMouseUp={e => (e.currentTarget.style.background = 'rgba(136,118,92,0.25)')}
                  >
                    <span className="text-xl font-bold text-white leading-tight">{key}</span>
                    <span className="text-[8px] font-semibold uppercase tracking-widest text-white/30 leading-tight">
                      {key === '2' ? 'ABC' : key === '3' ? 'DEF' : key === '4' ? 'GHI'
                        : key === '5' ? 'JKL' : key === '6' ? 'MNO' : key === '7' ? 'PQRS'
                        : key === '8' ? 'TUV' : key === '9' ? 'WXYZ' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Forgot PIN */}
        <button
          onClick={() => setScreen('forgot')}
          className="w-full mt-5 py-3 text-xs font-bold uppercase tracking-wider transition-all text-center"
          style={{ color: 'rgba(196,169,126,0.6)' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#c4a97e')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(196,169,126,0.6)')}
        >
          Forgot PIN?
        </button>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-6px); }
          80%       { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
