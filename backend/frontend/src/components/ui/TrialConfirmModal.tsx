'use client';

import React, { useState } from 'react';
import { X, Sparkles, Check, AlertCircle } from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';

interface TrialConfirmModalProps {
  planType: 'basic' | 'professional';
  isOpen: boolean;
  onClose: () => void;
  onConfirmSuccess: () => void;
}

export function TrialConfirmModal({ planType, isOpen, onClose, onConfirmSuccess }: TrialConfirmModalProps) {
  const { startTrial } = useSubscription();
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const planName = planType === 'professional' ? 'Professional' : 'Basic';
  const priceText = planType === 'professional' ? '₹299/mo' : '₹199/mo';

  const features = planType === 'professional'
    ? [
        '500 Documents & 100 Reports / Month',
        'AI Smart Billing & Natural Text Prompts',
        'Sales Ledger & Purchase Ledger Sync',
        'Watermark Removal & High-DPI PDF Export',
      ]
    : [
        '100 Documents & 20 Reports / Month',
        'Custom Invoice Templates & Branding',
        'Sales Ledger & Purchase Ledger Access',
        'Watermark Removal',
      ];

  const handleStart = async () => {
    if (!acknowledged || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await startTrial(planType);
      onConfirmSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to start free trial. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111a36] border border-slate-200 dark:border-[#223269] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Start Your Free 30-Day Trial</h3>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              {planName} Plan • 1 Month Free
            </span>
          </div>
        </div>

        <div className="space-y-2 bg-slate-50 dark:bg-[#1b264f]/40 p-4 rounded-2xl border border-slate-200 dark:border-[#223269]/60">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Features Included in Trial:
          </div>
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{f}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Your trial starts today and ends in <strong>30 days</strong>. No credit card required. No charges during trial. After 30 days, your account moves to the Free plan unless you upgrade (then {priceText}).
        </p>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
          />
          <span className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-tight">
            I understand this trial can only be used once per plan and requires no payment.
          </span>
        </label>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!acknowledged || isSubmitting}
            onClick={handleStart}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-extrabold text-white shadow-lg transition-all flex items-center justify-center gap-1.5 ${
              !acknowledged || isSubmitting
                ? 'bg-emerald-800/50 cursor-not-allowed opacity-50'
                : 'bg-emerald-600 hover:bg-emerald-500 cursor-pointer shadow-emerald-600/20 active:scale-98'
            }`}
          >
            <Sparkles className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
            <span>{isSubmitting ? 'Starting...' : 'Start Trial — Free 30 Days'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default TrialConfirmModal;
