import React, { useState, useEffect, useRef } from 'react';
import { X, Lock, ShieldCheck, ShieldOff, Delete } from 'lucide-react';
import type { SecurityQuestionsPayload } from '../lib/biometrics';
import { SecurityQuestionsStep } from './SecurityQuestionsStep';

/** Payload passed to onConfirm when mode === 'enable'.
 *  _rawA1 / _rawA2 carry the plain-text answers so App.tsx can hash them. */
export type PinSetupSecQPayload = SecurityQuestionsPayload & {
  _rawA1: string;
  _rawA2: string;
};

interface PinSetupModalProps {
  isOpen: boolean;
  mode: 'enable' | 'disable';
  /** For enable: called with pin + security questions after both steps succeed.
   *  For disable: called with the entered pin (secQ is undefined). */
  onConfirm: (pin: string, secQ?: PinSetupSecQPayload) => void;
  onCancel: () => void;
  isLoading?: boolean;
  errorMessage?: string;
}

const PIN_LENGTH = 4;

export function PinSetupModal({
  isOpen,
  mode,
  onConfirm,
  onCancel,
  isLoading = false,
  errorMessage,
}: PinSetupModalProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm' | 'security_questions'>('enter');
  const [localError, setLocalError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setConfirmPin('');
      setStep('enter');
      setLocalError('');
    }
  }, [isOpen]);

  // Keyboard support — only active for pin entry steps
  useEffect(() => {
    if (!isOpen || step === 'security_questions') return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleDigit(e.key);
      else if (e.key === 'Backspace') handleDelete();
      else if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, pin, confirmPin, step]);

  const activePin = step === 'enter' ? pin : confirmPin;
  const setActivePin = step === 'enter' ? setPin : setConfirmPin;

  const handleDigit = (digit: string) => {
    if (step === 'security_questions') return;
    if (activePin.length >= PIN_LENGTH) return;
    const newPin = activePin + digit;
    setActivePin(newPin);
    setLocalError('');

    if (newPin.length === PIN_LENGTH) {
      if (mode === 'enable') {
        if (step === 'enter') {
          setTimeout(() => setStep('confirm'), 300);
        } else {
          // Confirm step — validate match
          if (newPin !== pin) {
            setTimeout(() => {
              setLocalError('PINs do not match. Please try again.');
              setConfirmPin('');
              setPin('');
              setStep('enter');
            }, 300);
          } else {
            // ✅ PINs match → move to security questions step
            setTimeout(() => setStep('security_questions'), 300);
          }
        }
      } else {
        // Disable mode — just confirm current PIN
        setTimeout(() => onConfirm(newPin), 300);
      }
    }
  };

  const handleDelete = () => {
    if (step === 'security_questions') return;
    setLocalError('');
    setActivePin(prev => prev.slice(0, -1));
  };

  const handleSecurityQuestionsSave = (q1: string, a1: string, q2: string, a2: string) => {
    const payload: PinSetupSecQPayload = {
      q1, a1Hash: '', a1Salt: '',
      q2, a2Hash: '', a2Salt: '',
      _rawA1: a1, _rawA2: a2,
    };
    onConfirm(pin, payload);
  };

  const handleSecurityQuestionsBack = () => {
    setPin('');
    setConfirmPin('');
    setStep('enter');
  };

  const displayError = errorMessage || localError;

  const dialPad = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'del'],
  ];

  if (!isOpen) return null;

  const isPinStep = step !== 'security_questions';
  const totalSteps = mode === 'enable' ? 3 : 1;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-sm mx-4 bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden"
        style={{ animation: 'pinModalIn 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        {/* Header */}
        <div className="relative px-6 pt-8 pb-5 text-center" style={{ background: 'linear-gradient(135deg, var(--color-sky-600) 0%, var(--color-sky-700) 100%)' }}>
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-all"
          >
            <X size={14} />
          </button>
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
            {mode === 'enable' ? (
              <ShieldCheck size={28} className="text-white" />
            ) : (
              <ShieldOff size={28} className="text-white" />
            )}
          </div>
          <h2 className="text-white font-black text-lg tracking-tight">
            {mode === 'enable'
              ? step === 'enter' ? 'Set PIN Lock'
              : step === 'confirm' ? 'Confirm PIN'
              : 'Security Questions'
              : 'Disable PIN Lock'}
          </h2>
          <p className="text-white/75 text-xs mt-1 font-medium">
            {mode === 'enable'
              ? step === 'enter'
                ? 'Enter a 4-digit PIN to secure your app'
              : step === 'confirm'
                ? 'Re-enter your PIN to confirm'
              : 'Set up two recovery questions'
              : 'Enter your current PIN to disable it'}
          </p>
        </div>

        {/* PIN Dots & Keypad — only for pin entry steps */}
        {isPinStep && (
          <>
            <div className="px-8 pt-7 pb-2">
              <div className="flex justify-center gap-4 mb-2">
                {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 rounded-full transition-all duration-200"
                    style={{
                      backgroundColor: i < activePin.length
                        ? '#88765C'
                        : 'transparent',
                      border: `2px solid ${i < activePin.length ? '#88765C' : '#d1d5db'}`,
                      transform: i < activePin.length ? 'scale(1.15)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>

              {/* Error message */}
              <div className={`text-center transition-all duration-200 ${displayError ? 'opacity-100 h-6' : 'opacity-0 h-6'}`}>
                <p className="text-rose-500 text-xs font-semibold">{displayError || ' '}</p>
              </div>

              {/* Step indicator for enable mode */}
              {mode === 'enable' && (
                <div className="flex justify-center gap-2 mt-1 mb-1">
                  <div className={`h-1 w-8 rounded-full transition-all ${step === 'enter' ? 'bg-sky-600' : 'bg-sky-600/30'}`} />
                  <div className={`h-1 w-8 rounded-full transition-all ${step === 'confirm' ? 'bg-sky-600' : 'bg-sky-600/30'}`} />
                  {totalSteps === 3 && (
                    <div className={`h-1 w-8 rounded-full transition-all bg-sky-600/30`} />
                  )}
                </div>
              )}
            </div>

            {/* Dial Pad */}
            <div className="px-8 pb-8 pt-3">
              <div className="grid grid-rows-4 gap-3">
                {dialPad.map((row, ri) => (
                  <div key={ri} className="grid grid-cols-3 gap-3">
                    {row.map((key, ki) => {
                      if (key === '') return <div key={ki} />;
                      if (key === 'del') {
                        return (
                          <button
                            key={ki}
                            onClick={handleDelete}
                            disabled={isLoading}
                            className="flex items-center justify-center h-14 rounded-2xl bg-slate-100 dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-500 text-slate-500 dark:text-zinc-400 transition-all active:scale-95 font-bold"
                          >
                            <Delete size={18} />
                          </button>
                        );
                      }
                      return (
                        <button
                          key={ki}
                          onClick={() => handleDigit(key)}
                          disabled={isLoading}
                          className="group flex flex-col items-center justify-center h-14 rounded-2xl bg-slate-50 dark:bg-zinc-800 hover:bg-sky-600 hover:text-white dark:hover:bg-sky-600 text-slate-800 dark:text-zinc-200 transition-all duration-150 active:scale-95 shadow-sm border border-slate-100 dark:border-zinc-700/50"
                        >
                          <span className="text-xl font-bold leading-tight">{key}</span>
                          <span className="text-[8px] font-semibold uppercase tracking-widest opacity-40 group-hover:opacity-70 leading-tight">
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

              {/* Cancel button */}
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="w-full mt-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {/* Security Questions Step */}
        {step === 'security_questions' && (
          <SecurityQuestionsStep
            onSave={handleSecurityQuestionsSave}
            onBack={handleSecurityQuestionsBack}
            isSaving={isLoading}
          />
        )}

        {/* Step indicator for security_questions step */}
        {step === 'security_questions' && mode === 'enable' && (
          <div className="absolute top-[calc(8rem+1px)] left-1/2 -translate-x-1/2 flex gap-2 pointer-events-none">
            <div className="h-1 w-8 rounded-full bg-sky-600/30" />
            <div className="h-1 w-8 rounded-full bg-sky-600/30" />
            <div className="h-1 w-8 rounded-full bg-sky-600" />
          </div>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/70 dark:bg-zinc-900/70 flex items-center justify-center rounded-3xl">
            <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin" style={{ borderWidth: '3px' }} />
          </div>
        )}
      </div>

      <style>{`
        @keyframes pinModalIn {
          from { opacity: 0; transform: scale(0.85) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
