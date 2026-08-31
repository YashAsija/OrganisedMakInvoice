'use client';

import React, { useState } from 'react';
import { useSubscription } from '../../hooks/useSubscription';
import { Sparkles, Check, X, ShieldCheck } from 'lucide-react';

interface WelcomeTrialModalProps {
  onClose: () => void;
  onUpgrade?: (plan: 'basic' | 'pro') => void;
}

export function WelcomeTrialModal({ onClose, onUpgrade }: WelcomeTrialModalProps) {
  const { startTrial } = useSubscription();
  const [loadingPlan, setLoadingPlan] = useState<'basic' | 'professional' | null>(null);

  const handleClaimTrial = async (planType: 'basic' | 'professional') => {
    if (loadingPlan) return;
    setLoadingPlan(planType);
    try {
      await startTrial(planType);
      const mappedTier = planType === 'professional' ? 'pro' : 'basic';
      if (onUpgrade) onUpgrade(mappedTier);
      onClose();
    } catch (err: any) {
      console.error('[WelcomeTrialModal] Activation Error:', err);
      alert('Failed to start free trial: ' + (err?.message || 'Please try again.'));
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0b1329] border border-sky-100 dark:border-sky-900/50 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Top Gradient Banner */}
        <div className="h-2 bg-gradient-to-r from-blue-500 via-sky-500 to-purple-600" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="text-center max-w-md mx-auto mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-black uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Special Welcome Offer
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Welcome to MakInvoices! 🎉
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">
              Get started with a <span className="font-extrabold text-emerald-600 dark:text-emerald-400">1-Month Free Trial</span> on Basic or Professional. No credit card required!
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid sm:grid-cols-2 gap-5">
            {/* Basic Trial Card */}
            <div className="relative p-5 rounded-2xl border border-sky-200 dark:border-sky-800/60 bg-sky-50/40 dark:bg-sky-950/20 flex flex-col justify-between hover:border-sky-400 transition-all">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 mb-1">
                  Basic Plan
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-xl font-black text-slate-900 dark:text-white">FREE</span>
                  <span className="text-xs text-slate-400 line-through">₹199/mo</span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    30 Days Free
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4 font-medium">
                  Ideal for freelancers & scaling document limits.
                </p>

                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> 60 Documents / Month
                  </li>
                  <li className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> 5 Accounting Reports
                  </li>
                  <li className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Custom Layout Templates
                  </li>
                  <li className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Bulk Database Import/Export
                  </li>
                </ul>
              </div>

              <button
                type="button"
                disabled={loadingPlan !== null}
                onClick={() => handleClaimTrial('basic')}
                className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-98 text-white font-black text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loadingPlan === 'basic' ? (
                  <Sparkles className="w-4 h-4 animate-spin" />
                ) : (
                  <>Start Basic Trial →</>
                )}
              </button>
            </div>

            {/* Professional Trial Card */}
            <div className="relative p-5 rounded-2xl border-2 border-purple-500/80 bg-purple-50/40 dark:bg-purple-950/20 flex flex-col justify-between hover:border-purple-500 transition-all shadow-lg shadow-purple-500/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full shadow-sm">
                Most Popular
              </div>

              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 mb-1 mt-1">
                  Professional Plan
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-xl font-black text-slate-900 dark:text-white">FREE</span>
                  <span className="text-xs text-slate-400 line-through">₹299/mo</span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    30 Days Free
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4 font-medium">
                  AI Smart Billing & Automated Recurring Invoices.
                </p>

                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                    <Check className="w-3.5 h-3.5 text-purple-500 shrink-0" /> 140 Documents / Month
                  </li>
                  <li className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                    <Check className="w-3.5 h-3.5 text-purple-500 shrink-0" /> 15 Accounting Reports
                  </li>
                  <li className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                    <Check className="w-3.5 h-3.5 text-purple-500 shrink-0" /> AI Document Parsing
                  </li>
                  <li className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                    <Check className="w-3.5 h-3.5 text-purple-500 shrink-0" /> 24*7 AI Chat Assistant
                  </li>
                </ul>
              </div>

              <button
                type="button"
                disabled={loadingPlan !== null}
                onClick={() => handleClaimTrial('professional')}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-98 text-white font-black text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loadingPlan === 'professional' ? (
                  <Sparkles className="w-4 h-4 animate-spin" />
                ) : (
                  <>Start Pro Trial →</>
                )}
              </button>
            </div>
          </div>

          {/* Footer Dismiss Link */}
          <div className="mt-6 text-center space-y-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold transition-colors cursor-pointer"
            >
              No thanks, continue with Starter Free plan
            </button>
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-mono">
              <ShieldCheck className="w-3 h-3 text-emerald-500" /> Each trial can be claimed once per account
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WelcomeTrialModal;
