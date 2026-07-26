import React, { useState } from 'react';
import { 
  Check, 
  Sparkles, 
  Crown, 
  Zap, 
  ShieldCheck, 
  ArrowRight, 
  CreditCard,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Coins
} from 'lucide-react';
import { BusinessProfile } from '../types';

interface SubscriptionPageProps {
  theme: 'light' | 'dark';
  profile: BusinessProfile;
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  onUpgrade: (tier: 'free' | 'pro' | 'enterprise') => void;
}

export default function SubscriptionPage({ 
  theme, 
  profile, 
  subscriptionTier, 
  onUpgrade 
}: SubscriptionPageProps) {
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<string | null>(null);

  const handleUpgradeSimulate = (planName: 'pro' | 'enterprise') => {
    setLoadingPlan(planName);
    // Simulate API call / stripe redirection
    setTimeout(() => {
      setLoadingPlan(null);
      onUpgrade(planName);
      setShowSuccessModal(planName);
    }, 1800);
  };

  const activeAccentClass = theme === 'dark' ? 'text-sky-400' : 'text-sky-600';

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-3 md:py-4 space-y-8 animate-in fade-in duration-300">
      
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e1b4b] via-[#0f172a] to-[#020617] p-8 md:p-12 text-white border border-slate-800/80 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-500/15 text-sky-400 rounded-full text-xs font-bold uppercase tracking-wider">
              <Crown className="w-3.5 h-3.5" />
              <span>Subscription Control Center</span>
            </div>
            <h1 className="text-3xl md:text-4.5xl font-black tracking-tight leading-none uppercase">
              Configure Your Billing Scale
            </h1>
            <p className="text-sm text-slate-400 max-w-xl">
              Unlock cloud synchronization, advanced PDF layout templates, unlimited recurring invoices, and dedicated priority support channels.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 shrink-0 md:w-80">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold block">Current Status</span>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xl font-black text-white capitalize">{subscriptionTier} Plan</span>
              {subscriptionTier !== 'free' && (
                <span className="animate-pulse inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {subscriptionTier === 'free' 
                ? 'Usage limited to 5 invoices per month.' 
                : subscriptionTier === 'pro' 
                  ? 'Professional billing activated on your account.'
                  : 'Enterprise capabilities fully unlocked.'}
            </p>
            
            {/* Usage limit meter */}
            <div className="mt-4 pt-3 border-t border-white/10">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Monthly Usage</span>
                <span className="font-bold">{subscriptionTier === 'free' ? '3 / 5 Invoices' : 'Unlimited'}</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${subscriptionTier === 'free' ? 'bg-amber-400 w-[60%]' : 'bg-emerald-400 w-full'}`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Billing Cycle Selector */}
      <div className="text-center space-y-4">
        <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-800 dark:text-white uppercase">
          Choose a Plan Designed for Growth
        </h2>
        
        <div className="flex items-center justify-center gap-3">
          <span className={`text-xs font-bold transition-colors ${!isYearly ? 'text-sky-600 dark:text-sky-400 font-extrabold' : 'text-slate-450 dark:text-zinc-500'}`}>Monthly Billing</span>
          <button
            type="button"
            onClick={() => setIsYearly(!isYearly)}
            className="w-12 h-6.5 rounded-full bg-slate-200 dark:bg-zinc-800 p-1 transition-colors relative focus:outline-none cursor-pointer flex items-center"
          >
            <div className={`w-4.5 h-4.5 rounded-full bg-sky-600 dark:bg-sky-500 shadow-md transition-transform duration-300 transform ${isYearly ? 'translate-x-5.5' : 'translate-x-0'}`} />
          </button>
          <span className={`text-xs font-bold transition-colors flex items-center gap-1.5 ${isYearly ? 'text-sky-600 dark:text-sky-400 font-extrabold' : 'text-slate-450 dark:text-zinc-500'}`}>
            Yearly Billing
            <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-md font-extrabold uppercase tracking-wider">Save 20%</span>
          </span>
        </div>
      </div>

      {/* Plan Grid */}
      <div className="grid md:grid-cols-3 gap-8">
        
        {/* Starter Plan */}
        <div className={`p-6 sm:p-8 rounded-3xl border transition-all duration-300 flex flex-col justify-between hover:scale-102 hover:shadow-xl ${
          theme === 'dark' 
            ? 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700' 
            : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
        } ${subscriptionTier === 'free' ? 'ring-2 ring-sky-500/30' : ''}`}>
          <div>
            <div className="text-slate-400 text-[10px] font-black uppercase tracking-wider mb-1">Starter</div>
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-black text-slate-800 dark:text-white">Freelancer Free</h3>
              {subscriptionTier === 'free' && (
                <span className="text-[9px] px-2 py-0.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-full font-bold">Active Plan</span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Essential billing toolset for independent professionals generating offline local invoices.
            </p>
            
            <div className="flex items-baseline gap-1 my-6">
              <span className="text-4xl font-black text-slate-800 dark:text-white">$0</span>
              <span className="text-xs text-slate-400">/ forever</span>
            </div>

            <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-6 space-y-3.5 mb-8">
              {[
                "Up to 5 Invoices per month",
                "Standard Invoice Layouts",
                "Local Storage browser cache",
                "Offline signature sketchpad",
                "Basic tax/discount configurations",
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-4.5 h-4.5 rounded-full bg-sky-500/10 text-sky-550 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <span className="text-slate-660 dark:text-zinc-300">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={subscriptionTier === 'free'}
            onClick={() => onUpgrade('free')}
            className={`w-full py-3 font-bold text-xs rounded-2xl cursor-pointer transition-all border ${
              subscriptionTier === 'free'
                ? 'bg-slate-100 dark:bg-zinc-800/60 border-transparent text-slate-400 dark:text-zinc-500 cursor-default'
                : 'border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-slate-200'
            }`}
          >
            {subscriptionTier === 'free' ? 'Currently Active' : 'Downgrade to Free'}
          </button>
        </div>

        {/* Pro Plan */}
        <div className={`p-6 sm:p-8 rounded-3xl border transition-all duration-300 flex flex-col justify-between hover:scale-102 hover:shadow-2xl relative ${
          theme === 'dark' 
            ? 'bg-zinc-900/90 border-sky-500/40 hover:border-sky-500/60 shadow-xl shadow-sky-500/5' 
            : 'bg-white border-sky-500/30 hover:border-sky-500/50 shadow-md ring-1 ring-sky-100/30'
        } ${subscriptionTier === 'pro' ? 'ring-2 ring-sky-500/70' : ''}`}>
          <div className="absolute top-0 right-6 transform -translate-y-1/2">
            <span className="text-[9px] px-2.5 py-1 bg-gradient-to-r from-sky-600 to-indigo-650 text-white rounded-full font-black uppercase tracking-wider shadow-md">Most Popular</span>
          </div>

          <div>
            <div className="text-sky-600 dark:text-sky-400 text-[10px] font-black uppercase tracking-wider mb-1">Professional</div>
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-black text-slate-800 dark:text-white">MakInvoices Pro</h3>
              {subscriptionTier === 'pro' && (
                <span className="text-[9px] px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full font-bold">Active Plan</span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Comprehensive solution for expanding businesses, syncing accounts, and managing clients.
            </p>
            
            <div className="flex items-baseline gap-1 my-6">
              <span className="text-4xl font-black text-slate-800 dark:text-white">
                ${isYearly ? "9" : "12"}
              </span>
              <span className="text-xs text-slate-400">/ month</span>
            </div>

            <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-6 space-y-3.5 mb-8">
              {[
                "Unlimited invoices & estimates",
                "Supabase secure Cloud sync",
                "Custom branding logo uploads",
                "All layout designs unlocked",
                "Expense & net margin analytics",
                "Priority 2-hour Global support"
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-4.5 h-4.5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <span className="text-slate-700 dark:text-zinc-200 font-bold">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={subscriptionTier === 'pro' || loadingPlan !== null}
            onClick={() => handleUpgradeSimulate('pro')}
            className={`w-full py-3 font-bold text-xs rounded-2xl cursor-pointer shadow-md transition-all flex items-center justify-center gap-2 ${
              subscriptionTier === 'pro'
                ? 'bg-slate-100 dark:bg-zinc-800/60 border-transparent text-slate-400 dark:text-zinc-500 cursor-default shadow-none'
                : 'bg-gradient-to-r from-sky-600 to-indigo-650 hover:from-sky-500 hover:to-indigo-600 active:scale-98 text-white shadow-sky-500/20'
            }`}
          >
            {loadingPlan === 'pro' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Contacting Stripe...</span>
              </>
            ) : subscriptionTier === 'pro' ? (
              'Currently Active'
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                <span>Upgrade to Pro</span>
              </>
            )}
          </button>
        </div>

        {/* Enterprise Plan */}
        <div className={`p-6 sm:p-8 rounded-3xl border transition-all duration-300 flex flex-col justify-between hover:scale-102 hover:shadow-xl ${
          theme === 'dark' 
            ? 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700' 
            : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
        } ${subscriptionTier === 'enterprise' ? 'ring-2 ring-sky-500/30' : ''}`}>
          <div>
            <div className="text-slate-400 text-[10px] font-black uppercase tracking-wider mb-1">Enterprise</div>
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-black text-slate-800 dark:text-white">Custom Package</h3>
              {subscriptionTier === 'enterprise' && (
                <span className="text-[9px] px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full font-bold">Active Plan</span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Bespoke integrations, multi-user accounts, and dedicated accounting support.
            </p>
            
            <div className="flex items-baseline gap-1 my-6">
              <span className="text-4xl font-black text-slate-800 dark:text-white">Custom</span>
              <span className="text-xs text-slate-400">/ quote</span>
            </div>

            <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-6 space-y-3.5 mb-8">
              {[
                "Multi-user roles & authorization",
                "Custom domain integrations",
                "Automated API billing feeds",
                "SLA uptime guarantees",
                "Dedicated account manager",
                "Custom security PIN/LDAP locks"
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-4.5 h-4.5 rounded-full bg-sky-500/10 text-sky-550 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <span className="text-slate-655 dark:text-zinc-300">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={subscriptionTier === 'enterprise' || loadingPlan !== null}
            onClick={() => handleUpgradeSimulate('enterprise')}
            className={`w-full py-3 font-bold text-xs rounded-2xl cursor-pointer transition-all border flex items-center justify-center gap-2 ${
              subscriptionTier === 'enterprise'
                ? 'bg-slate-100 dark:bg-zinc-800/60 border-transparent text-slate-400 dark:text-zinc-500 cursor-default'
                : 'border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-slate-200'
            }`}
          >
            {loadingPlan === 'enterprise' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Simulating...</span>
              </>
            ) : subscriptionTier === 'enterprise' ? (
              'Currently Active'
            ) : (
              'Upgrade to Enterprise'
            )}
          </button>
        </div>

      </div>

      {/* Trust badging / Security notice */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 p-6 rounded-2xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-200/50 dark:border-zinc-800/60 text-xs text-slate-500 dark:text-slate-405">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4.5 h-4.5 text-emerald-500" />
          <span>256-bit Bank Grade Security Protocols</span>
        </div>
        <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-700" />
        <div className="flex items-center gap-2">
          <Coins className="w-4.5 h-4.5 text-amber-500" />
          <span>Simulated Checkout / Sandboxed Pricing</span>
        </div>
      </div>

      {/* Success Modal Confirmation Overlay */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-slate-200 dark:border-zinc-800 text-center shadow-2xl transform scale-100 animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 rounded-full flex items-center justify-center mx-auto mb-5 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-8 h-8 fill-emerald-600 dark:fill-emerald-400" />
            </div>
            
            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
              Payment Successful!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Congratulations! Your MakInvoices account has been upgraded to the <span className="font-extrabold capitalize text-sky-500">{showSuccessModal} Plan</span>. All features, layouts, and limits are instantly active.
            </p>

            <button
              onClick={() => setShowSuccessModal(null)}
              className="mt-6 w-full py-3 bg-slate-800 hover:bg-slate-700 dark:bg-white dark:text-zinc-900 text-white font-extrabold text-xs rounded-xl cursor-pointer active:scale-98 transition-all"
            >
              Continue to Billing
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
