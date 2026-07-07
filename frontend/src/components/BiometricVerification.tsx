import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, ShieldCheck } from 'lucide-react';
import { getSecuritySettings, hashPin } from '../lib/biometrics';

interface BiometricVerificationProps {
  onSuccess: () => void;
}

export default function BiometricVerification({ onSuccess }: BiometricVerificationProps) {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [settings] = useState(() => getSecuritySettings());

  const handlePinInput = async (num: string) => {
    setError('');
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      
      // Auto-validate when 4 digits are reached
      if (newPin.length === 4) {
        if (!settings.hashedPin) {
          // If PIN is enabled but no PIN is saved (edge case), bypass
          onSuccess();
        } else {
          const hashedInput = await hashPin(newPin);
          if (hashedInput === settings.hashedPin) {
            onSuccess();
          } else {
            setError('Incorrect PIN. Please try again.');
            // Reset pin with slight delay
            setTimeout(() => setPin(''), 500);
          }
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-slate-950 p-6 text-white text-sans select-none">
      {/* Top Badge */}
      <div className="mt-8 text-center text-xs text-slate-400 flex items-center gap-1.5 font-mono">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        SECURE WORKSPACE LOCK ACTIVATED
      </div>

      {/* Main Core View */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm">
        <div className="flex flex-col items-center">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-sky-400 shadow-xl">
              <Lock className="w-8 h-8" />
            </div>
          </div>

          <h1 className="text-xl font-bold tracking-tight uppercase tracking-wider">Unlock Workspace</h1>
          <p className="text-xs text-slate-400 text-center mt-2 leading-relaxed">
            Enter your 4-digit security PIN to access your invoices and financial records.
          </p>

          {/* Pin indicator dots */}
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

          {/* Error prompt */}
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-rose-400 font-mono font-bold"
            >
              {error}
            </motion.p>
          )}
        </div>
      </div>

      {/* Numerical PIN Pad */}
      <div className="w-full max-w-sm flex flex-col items-center gap-2 mb-8">
        <div className="grid grid-cols-3 gap-3 w-full self-center">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              onClick={() => handlePinInput(num)}
              className="h-14 bg-slate-900/60 rounded-xl border border-slate-800/50 hover:bg-slate-850 active:bg-slate-800 active:scale-95 text-lg font-medium flex items-center justify-center cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-700 transition-all font-mono"
            >
              {num}
            </button>
          ))}
          {/* Empty Space for Grid alignment */}
          <div className="h-14" />
          <button
            key="0"
            onClick={() => handlePinInput('0')}
            className="h-14 bg-slate-900/60 rounded-xl border border-slate-800/50 hover:bg-slate-850 active:bg-slate-800 text-lg font-medium flex items-center justify-center cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-700 transition-all font-mono"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
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
