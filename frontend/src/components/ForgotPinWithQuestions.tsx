import React, { useState, useMemo } from 'react';
import { ShieldQuestion, RefreshCw, ChevronLeft } from 'lucide-react';
import { getSecurityQuestions, hashAnswer } from '../lib/biometrics';

interface ForgotPinWithQuestionsProps {
  /** Called when both answers are verified correctly */
  onSuccess: () => void;
  /** Called when user wants to go back to PIN entry */
  onBack: () => void;
  /** Called when user wants to fall back to "Remove PIN" flow */
  onFallback: () => void;
}

export function ForgotPinWithQuestions({ onSuccess, onBack, onFallback }: ForgotPinWithQuestionsProps) {
  const stored = useMemo(() => getSecurityQuestions(), []);
  const [a1, setA1] = useState('');
  const [a2, setA2] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  if (!stored) return null;

  const handleSubmit = async () => {
    const trimA1 = a1.trim();
    const trimA2 = a2.trim();
    if (!trimA1 || !trimA2) {
      setError('Please answer both security questions.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [h1, h2] = await Promise.all([
        hashAnswer(trimA1, stored.a1Salt),
        hashAnswer(trimA2, stored.a2Salt),
      ]);

      if (h1 === stored.a1Hash && h2 === stored.a2Hash) {
        onSuccess();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        if (newAttempts >= 3) {
          setError('Too many incorrect attempts. You can remove the PIN lock below.');
        } else {
          setError(`Incorrect answers. ${3 - newAttempts} attempt${3 - newAttempts !== 1 ? 's' : ''} left.`);
        }
        setA1('');
        setA2('');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 select-none"
      style={{ background: 'linear-gradient(135deg, #0b1329 0%, #111a36 50%, #0b1329 100%)' }}
    >
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl"
            style={{ background: 'rgba(2,132,199,0.2)', border: '1px solid rgba(2,132,199,0.4)' }}
          >
            <ShieldQuestion className="w-8 h-8" style={{ color: '#38bdf8' }} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mb-2">Recover via Questions</h1>
          <p className="text-sm text-white/60 leading-relaxed max-w-xs mx-auto">
            Answer your security questions to verify your identity and set a new PIN.
          </p>
        </div>

        {/* Question 1 */}
        <div className="mb-5">
          <p
            className="text-[11px] font-black uppercase tracking-widest mb-2"
            style={{ color: '#38bdf8' }}
          >
            Question 1
          </p>
          <p className="text-sm text-white/80 font-semibold mb-3 leading-snug">{stored.q1}</p>
          <input
            type="text"
            value={a1}
            onChange={e => { setA1(e.target.value); setError(''); }}
            placeholder="Your answer…"
            disabled={loading}
            className="w-full px-4 py-3 rounded-2xl text-sm font-medium outline-none transition-all disabled:opacity-50"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(56,189,248,0.35)',
              color: 'white',
            }}
            onFocus={e => (e.target.style.borderColor = '#38bdf8')}
            onBlur={e => (e.target.style.borderColor = 'rgba(56,189,248,0.35)')}
          />
        </div>

        {/* Question 2 */}
        <div className="mb-6">
          <p
            className="text-[11px] font-black uppercase tracking-widest mb-2"
            style={{ color: '#38bdf8' }}
          >
            Question 2
          </p>
          <p className="text-sm text-white/80 font-semibold mb-3 leading-snug">{stored.q2}</p>
          <input
            type="text"
            value={a2}
            onChange={e => { setA2(e.target.value); setError(''); }}
            placeholder="Your answer…"
            disabled={loading}
            className="w-full px-4 py-3 rounded-2xl text-sm font-medium outline-none transition-all disabled:opacity-50"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(56,189,248,0.35)',
              color: 'white',
            }}
            onFocus={e => (e.target.style.borderColor = '#38bdf8')}
            onBlur={e => (e.target.style.borderColor = 'rgba(56,189,248,0.35)')}
          />
        </div>

        {/* Error */}
        {error && (
          <div
            className="rounded-xl px-4 py-3 mb-5 text-center"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <p className="text-rose-400 text-xs font-bold">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          {/* Verify button */}
          <button
            onClick={handleSubmit}
            disabled={loading || attempts >= 3}
            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider text-white shadow-lg transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #38bdf8, #0284c7)' }}
          >
            {loading ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Verifying…</>
            ) : 'Verify & Reset PIN'}
          </button>

          {/* Back to PIN entry */}
          <button
            onClick={onBack}
            disabled={loading}
            className="w-full py-3 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-1.5"
            style={{ color: 'rgba(56,189,248,0.6)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#38bdf8')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(56,189,248,0.6)')}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Back to PIN Entry
          </button>

          {/* Fallback: remove PIN entirely */}
          {attempts >= 3 && (
            <button
              onClick={onFallback}
              disabled={loading}
              className="w-full py-3 rounded-2xl font-semibold text-xs text-rose-400/70 hover:text-rose-400 transition-all text-center"
            >
              Remove PIN Lock instead
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
