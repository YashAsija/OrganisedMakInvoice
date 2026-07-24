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
  generateSalt,
  getSecurityQuestions,
} from '../lib/biometrics';
import { supabase } from '../lib/supabase';
import { ForgotPinWithQuestions } from './ForgotPinWithQuestions';

interface BiometricVerificationProps {
  onSuccess: () => void;
}

const BACKEND_URL =
  (import.meta as unknown as { env: Record<string, string> }).env?.VITE_BACKEND_URL ||
  (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_BACKEND_URL : '') ||
  '';

type Screen = 'unlock' | 'forgot' | 'forgotSent' | 'securityQuestions' | 'resetPin';

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

  // ── Reset-PIN flow state ────────────────────────────────────────────────
  const [resetStep, setResetStep] = useState<'enter' | 'confirm'>('enter');
  const [resetNewPin, setResetNewPin] = useState('');
  const [resetConfirmPin, setResetConfirmPin] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

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

  // Keyboard support — unlock screen
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (screen === 'unlock') {
        if (e.key >= '0' && e.key <= '9') handlePinInput(e.key);
        else if (e.key === 'Backspace') handleBackspace();
      } else if (screen === 'resetPin') {
        if (e.key >= '0' && e.key <= '9') handleResetPinInput(e.key);
        else if (e.key === 'Backspace') handleResetBackspace();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [pin, lockoutSeconds, screen, resetStep, resetNewPin, resetConfirmPin]);

  // ── Server-side PIN verify ───────────────────────────────────────────────
  const verifyWithServer = async (
    enteredPin: string,
    userId: string
  ): Promise<true | false | null> => {
    try {
      const { data: row, error: fetchErr } = await supabase
        .from('user_pin_security')
        .select('salt, hashed_pin, is_pin_enabled')
        .eq('user_id', userId)
        .single();

      if (fetchErr) {
        console.error('PIN fetch error:', fetchErr);
        return null;
      }
      if (!row || !row.is_pin_enabled) {
        console.warn('No pin row or pin disabled for user:', userId);
        return null;
      }

      const hashedInput = await hashPinPBKDF2(enteredPin, row.salt);
      return hashedInput === row.hashed_pin;
    } catch (err) {
      console.error('verifyWithServer threw:', err);
      return null;
    }
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

      if (session?.user?.id) {
        const serverResult = await verifyWithServer(newPin, session.user.id);

        if (serverResult === true) {
          verified = true;
        } else if (serverResult === false) {
          verified = false;
        } else {
          verified = false;
          setError('Network error: Cannot verify PIN offline');
        }
      } else {
        verified = false;
        setError('Cannot verify PIN without an active session');
      }
    } catch {
      verified = false;
      setError('An error occurred during verification');
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

  // ── Forgot PIN (remove-entirely) flow ────────────────────────────────────
  const handleForgotPin = async () => {
    setForgotLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (BACKEND_URL && session?.access_token) {
        await fetch(`${BACKEND_URL}/api/auth/pin/clear`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        // Broadcast removal to other active tabs
        supabase.channel(`security_updates:${session.user.id}`).send({
          type: 'broadcast',
          event: 'security_changed',
          payload: { isPinLockEnabled: false }
        }).catch(() => {});
      }
      // Disable PIN locally
      const current = getSecuritySettings();
      saveSecuritySettings({ ...current, isPinLockEnabled: false });
      clearAttempts();
      setScreen('forgotSent');
    } catch {
      setScreen('forgotSent');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleBypassAndEnter = () => {
    clearAttempts();
    onSuccess();
  };

  // ── Reset-PIN flow handlers ───────────────────────────────────────────────
  const activeResetPin = resetStep === 'enter' ? resetNewPin : resetConfirmPin;
  const setActiveResetPin = resetStep === 'enter' ? setResetNewPin : setResetConfirmPin;

  const handleResetPinInput = async (num: string) => {
    if (activeResetPin.length >= 4) return;
    const val = activeResetPin + num;
    setActiveResetPin(val);
    setResetError('');

    if (val.length === 4) {
      if (resetStep === 'enter') {
        setTimeout(() => setResetStep('confirm'), 300);
      } else {
        if (val !== resetNewPin) {
          setTimeout(() => {
            setResetError('PINs do not match. Please try again.');
            setResetNewPin('');
            setResetConfirmPin('');
            setResetStep('enter');
          }, 300);
        } else {
          await doResetPin(resetNewPin);
        }
      }
    }
  };

  const handleResetBackspace = () => {
    setActiveResetPin(prev => prev.slice(0, -1));
    setResetError('');
  };

  const doResetPin = async (rawPin: string) => {
    setResetLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const salt = await generateSalt();
        const hashed = await hashPinPBKDF2(rawPin, salt);
        await supabase.from('user_pin_security').upsert({
          user_id: session.user.id,
          hashed_pin: hashed,
          salt,
          is_pin_enabled: true,
          updated_at: new Date().toISOString(),
        });
      }
      const current = getSecuritySettings();
      saveSecuritySettings({ ...current, isPinLockEnabled: true });
      clearAttempts();
      onSuccess();
    } catch {
      setResetError('Failed to save new PIN. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const isLocked = lockoutSeconds > 0;

  const dialPad = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'del'],
  ];

  // ── FORGOT PIN SENT SCREEN ───────────────────────────────────────────────
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

  // ── FORGOT PIN SCREEN (remove entirely) ───────────────────────────────────
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

  // ── SECURITY QUESTIONS RECOVERY SCREEN ───────────────────────────────────
  if (screen === 'securityQuestions') {
    return (
      <ForgotPinWithQuestions
        onSuccess={() => {
          // Answers verified — proceed to reset PIN
          setResetStep('enter');
          setResetNewPin('');
          setResetConfirmPin('');
          setResetError('');
          setScreen('resetPin');
        }}
        onBack={() => setScreen('unlock')}
        onFallback={() => setScreen('forgot')}
      />
    );
  }

  // ── RESET PIN SCREEN ──────────────────────────────────────────────────────
  if (screen === 'resetPin') {
    const activePin = resetStep === 'enter' ? resetNewPin : resetConfirmPin;

    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-between select-none"
        style={{ background: 'linear-gradient(135deg, #1a1410 0%, #0f0c08 50%, #1a1410 100%)' }}
      >
        {/* Top Badge */}
        <div className="mt-10 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest"
          style={{ background: 'rgba(136,118,92,0.15)', border: '1px solid rgba(136,118,92,0.3)', color: '#c4a97e' }}>
          <ShieldCheck className="w-3.5 h-3.5" />
          MakInvoices — Set New PIN
        </div>

        {/* Center Content */}
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm px-6">
          <div className="relative mb-6">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(136,118,92,0.25) 0%, rgba(107,90,68,0.25) 100%)',
                border: '1px solid rgba(136,118,92,0.4)',
                color: '#c4a97e',
              }}
            >
              <Lock className="w-9 h-9" />
            </div>
          </div>

          <h1 className="text-2xl font-black text-white tracking-tight mb-2">
            {resetStep === 'enter' ? 'Set New PIN' : 'Confirm New PIN'}
          </h1>
          <p className="text-sm text-white/60 text-center leading-relaxed max-w-xs mb-6">
            {resetStep === 'enter'
              ? 'Enter a new 4-digit PIN for your workspace.'
              : 'Re-enter your new PIN to confirm.'}
          </p>

          {/* Step indicator */}
          <div className="flex gap-2 mb-6">
            <div className={`h-1 w-10 rounded-full transition-all ${resetStep === 'enter' ? 'bg-[#88765C]' : 'bg-[#88765C]/30'}`} />
            <div className={`h-1 w-10 rounded-full transition-all ${resetStep === 'confirm' ? 'bg-[#88765C]' : 'bg-[#88765C]/30'}`} />
          </div>

          {/* PIN Dots */}
          <div className="flex gap-5 my-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full transition-all duration-150"
                style={{
                  backgroundColor: i < activePin.length ? '#88765C' : 'transparent',
                  border: `2px solid ${i < activePin.length ? '#88765C' : 'rgba(255,255,255,0.2)'}`,
                  transform: i < activePin.length ? 'scale(1.2)' : 'scale(1)',
                  boxShadow: i < activePin.length ? '0 0 10px rgba(136,118,92,0.5)' : 'none',
                }}
              />
            ))}
          </div>

          {/* Error */}
          <div className="h-6 flex items-center justify-center mt-2">
            {resetError && (
              <p className="text-xs font-bold text-rose-400 text-center">{resetError}</p>
            )}
          </div>
        </div>

        {/* Dialpad */}
        <div className={`w-full max-w-sm px-6 mb-6 transition-opacity duration-300 ${resetLoading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
          <div className="grid grid-rows-4 gap-3">
            {dialPad.map((row, ri) => (
              <div key={ri} className="grid grid-cols-3 gap-3">
                {row.map((key, ki) => {
                  if (key === '') return <div key={ki} />;
                  if (key === 'del') {
                    return (
                      <button
                        key={ki}
                        onClick={handleResetBackspace}
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
                      onClick={() => handleResetPinInput(key)}
                      className="h-14 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-95"
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

          {/* Cancel */}
          <button
            onClick={() => setScreen('securityQuestions')}
            className="w-full mt-5 py-3 text-xs font-bold uppercase tracking-wider transition-all text-center"
            style={{ color: 'rgba(196,169,126,0.6)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#c4a97e')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(196,169,126,0.6)')}
          >
            ← Back
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

  // ── MAIN UNLOCK SCREEN ────────────────────────────────────────────────────
  const hasSecurityQuestions = !!getSecurityQuestions();

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

        {/* Forgot PIN — routes to security questions if available, else remove-flow */}
        <button
          onClick={() => setScreen(hasSecurityQuestions ? 'securityQuestions' : 'forgot')}
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
