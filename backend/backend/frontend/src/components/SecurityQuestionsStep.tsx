import React, { useState } from 'react';
import { HelpCircle, ChevronDown, CheckCircle2 } from 'lucide-react';

export const SECURITY_QUESTIONS = [
  'What was the name of your first pet?',
  "What is your mother's maiden name?",
  'What city were you born in?',
  'What was the name of your primary school?',
  'What is the name of the street you grew up on?',
  'What was your childhood nickname?',
  "What is your oldest sibling's middle name?",
  'What was the make of your first car?',
];

interface SecurityQuestionsStepProps {
  onSave: (q1: string, a1: string, q2: string, a2: string) => void;
  onBack: () => void;
  isSaving?: boolean;
}

export function SecurityQuestionsStep({ onSave, onBack, isSaving }: SecurityQuestionsStepProps) {
  const [q1, setQ1] = useState('');
  const [a1, setA1] = useState('');
  const [q2, setQ2] = useState('');
  const [a2, setA2] = useState('');
  const [error, setError] = useState('');
  const [open1, setOpen1] = useState(false);
  const [open2, setOpen2] = useState(false);

  const available1 = SECURITY_QUESTIONS.filter(q => q !== q2);
  const available2 = SECURITY_QUESTIONS.filter(q => q !== q1);

  const handleSave = () => {
    if (!q1) { setError('Please select your first security question.'); return; }
    if (!a1.trim()) { setError('Please enter an answer for the first question.'); return; }
    if (!q2) { setError('Please select your second security question.'); return; }
    if (!a2.trim()) { setError('Please enter an answer for the second question.'); return; }
    if (q1 === q2) { setError('Please choose two different security questions.'); return; }
    setError('');
    onSave(q1, a1, q2, a2);
  };

  const selectQ1 = (q: string) => { setQ1(q); setOpen1(false); if (q2 === q) setQ2(''); };
  const selectQ2 = (q: string) => { setQ2(q); setOpen2(false); if (q1 === q) setQ1(''); };

  return (
    <div className="px-6 pt-5 pb-6 flex flex-col gap-4">
      <p className="text-xs text-slate-500 dark:text-zinc-400 text-center leading-relaxed -mt-1">
        These will help you recover your PIN if you forget it. Answers are not case-sensitive.
      </p>

      {/* Question 1 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-500">
          Security Question 1
        </label>

        {/* Dropdown trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setOpen1(v => !v); setOpen2(false); }}
            className="w-full text-left px-3 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-between transition-all"
            style={{
              borderColor: q1 ? '#88765C' : '#e2e8f0',
              background: q1 ? 'rgba(136,118,92,0.06)' : 'transparent',
              color: q1 ? '#88765C' : '#94a3b8',
            }}
          >
            <span className={q1 ? 'text-slate-700 dark:text-zinc-200 font-semibold' : ''}>
              {q1 || 'Choose a question…'}
            </span>
            <ChevronDown size={13} className={`transition-transform ${open1 ? 'rotate-180' : ''}`} />
          </button>
          {open1 && (
            <div className="absolute z-50 top-full mt-1 left-0 right-0 rounded-xl shadow-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 overflow-hidden">
              {available1.map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => selectQ1(q)}
                  className="w-full text-left px-3 py-2.5 text-xs font-medium hover:bg-[#88765C]/10 hover:text-[#88765C] transition-colors text-slate-700 dark:text-zinc-300 border-b border-slate-100 dark:border-zinc-700/50 last:border-0"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Answer 1 */}
        {q1 && (
          <input
            type="text"
            value={a1}
            onChange={e => { setA1(e.target.value); setError(''); }}
            placeholder="Your answer…"
            className="w-full px-3 py-2.5 rounded-xl border text-xs font-medium outline-none transition-all bg-transparent"
            style={{
              borderColor: a1.trim() ? '#88765C' : '#e2e8f0',
              color: 'inherit',
            }}
            onFocus={e => (e.target.style.borderColor = '#88765C')}
            onBlur={e => (e.target.style.borderColor = a1.trim() ? '#88765C' : '#e2e8f0')}
          />
        )}
      </div>

      {/* Question 2 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-500">
          Security Question 2
        </label>

        <div className="relative">
          <button
            type="button"
            onClick={() => { setOpen2(v => !v); setOpen1(false); }}
            className="w-full text-left px-3 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-between transition-all"
            style={{
              borderColor: q2 ? '#88765C' : '#e2e8f0',
              background: q2 ? 'rgba(136,118,92,0.06)' : 'transparent',
              color: q2 ? '#88765C' : '#94a3b8',
            }}
          >
            <span className={q2 ? 'text-slate-700 dark:text-zinc-200 font-semibold' : ''}>
              {q2 || 'Choose a different question…'}
            </span>
            <ChevronDown size={13} className={`transition-transform ${open2 ? 'rotate-180' : ''}`} />
          </button>
          {open2 && (
            <div className="absolute z-50 top-full mt-1 left-0 right-0 rounded-xl shadow-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 overflow-hidden">
              {available2.map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => selectQ2(q)}
                  className="w-full text-left px-3 py-2.5 text-xs font-medium hover:bg-[#88765C]/10 hover:text-[#88765C] transition-colors text-slate-700 dark:text-zinc-300 border-b border-slate-100 dark:border-zinc-700/50 last:border-0"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>

        {q2 && (
          <input
            type="text"
            value={a2}
            onChange={e => { setA2(e.target.value); setError(''); }}
            placeholder="Your answer…"
            className="w-full px-3 py-2.5 rounded-xl border text-xs font-medium outline-none transition-all bg-transparent"
            style={{
              borderColor: a2.trim() ? '#88765C' : '#e2e8f0',
              color: 'inherit',
            }}
            onFocus={e => (e.target.style.borderColor = '#88765C')}
            onBlur={e => (e.target.style.borderColor = a2.trim() ? '#88765C' : '#e2e8f0')}
          />
        )}
      </div>

      {/* Error */}
      <div className={`transition-all ${error ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
        <p className="text-rose-500 text-xs font-semibold text-center">{error || ' '}</p>
      </div>

      {/* Tip */}
      <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-700/20">
        <HelpCircle size={12} className="text-amber-500 mt-0.5 shrink-0" />
        <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed font-medium">
          Answers are case-insensitive. Make sure they're memorable — they cannot be changed without disabling and re-enabling PIN Lock.
        </p>
      </div>

      {/* Buttons */}
      <button
        onClick={handleSave}
        disabled={isSaving || !q1 || !a1.trim() || !q2 || !a2.trim()}
        className="w-full py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-wider text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg, var(--color-sky-600), var(--color-sky-700))' }}
      >
        {isSaving ? (
          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        ) : (
          <CheckCircle2 size={14} />
        )}
        {isSaving ? 'Saving…' : 'Save & Enable PIN Lock'}
      </button>

      <button
        onClick={onBack}
        disabled={isSaving}
        className="w-full py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 transition-all"
      >
        ← Back to PIN Setup
      </button>
    </div>
  );
}
