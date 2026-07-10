import React, { useState, useEffect } from 'react';
import { 
  Check, 
  ArrowUp,
  DollarSign
} from 'lucide-react';
import PublicNavbar from './PublicNavbar';

interface PricingPageProps {
  theme: 'light' | 'dark';
  onNavigate: (path: string) => void;
  onGoogleLogin: () => void;
}

export default function PricingPage({ theme, onNavigate, onGoogleLogin }: PricingPageProps) {
  const [isYearly, setIsYearly] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 200) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={`min-h-dvh w-full max-w-full overflow-x-hidden text-sans transition-colors duration-250 ${
      theme === 'dark' ? 'bg-neutral-950 text-neutral-100' : 'bg-slate-50 text-slate-800'
    }`}>
      {/* Decorative ambient top glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none overflow-hidden" />
      
      <PublicNavbar theme={theme} onNavigate={onNavigate} activePath="/pricing" />

      {/* Main Container */}
      <div className="max-w-[1400px] mx-auto px-2 sm:px-3 lg:px-4 pt-20 pb-4 lg:pt-24 relative">
        
        {/* Pricing Content */}
        <div className="py-10 max-w-6xl mx-auto space-y-12 animate-fade-in relative z-10">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold leading-none uppercase tracking-widest">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Simple, Transparent Pricing Plan</span>
            </div>
            <h1 className="text-3xl sm:text-4.5xl font-black tracking-tight text-slate-805 leading-none uppercase">
              Bespoke Plans for Every Billing Scale
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-405 max-w-xl mx-auto">
              Start with our lifetime free tier, or unlock full automation, multi-currency ledger caches, and Supabase cloud synchronization.
            </p>

            <div className="flex items-center justify-center gap-3 pt-4">
              <span className={`text-xs font-bold transition-colors ${!isYearly ? 'text-sky-650 dark:text-sky-400 font-black' : 'text-slate-400 dark:text-neutral-500'}`}>Monthly Billing</span>
              <button
                type="button"
                onClick={() => setIsYearly(!isYearly)}
                className="w-12 h-6.5 rounded-full bg-slate-200 dark:bg-neutral-850 p-1 transition-colors relative focus:outline-none cursor-pointer flex items-center"
              >
                <div className={`w-4.5 h-4.5 rounded-full bg-sky-650 dark:bg-sky-500 shadow-md transition-transform duration-300 transform ${isYearly ? 'translate-x-5.5' : 'translate-x-0'}`} />
              </button>
              <span className={`text-xs font-bold transition-colors flex items-center gap-1.5 ${isYearly ? 'text-sky-650 dark:text-sky-400 font-black' : 'text-slate-400 dark:text-neutral-500'}`}>
                Yearly Billing
                <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md font-extrabold uppercase scale-90 tracking-wider">Save 20%</span>
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Starter Plan */}
            <div className={`p-6 sm:p-8 rounded-3xl border transition-all duration-300 flex flex-col justify-between hover:scale-102 hover:shadow-2xl ${
              theme === 'dark' ? 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-705' : 'bg-white border-slate-150 hover:border-slate-250 shadow-sm'
            }`}>
              <div>
                <div className="text-slate-450 dark:text-slate-505 text-[10px] font-black uppercase tracking-wider mb-1">Starter</div>
                <h3 className="text-xl font-black text-slate-805 mb-2">Freelancer Free</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mb-6">Essential toolset for independent professionals generating offline invoices.</p>
                
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-black text-slate-805">$0</span>
                  <span className="text-xs text-slate-400">/ forever</span>
                </div>

                <div className="border-t border-slate-100 dark:border-neutral-800/80 pt-6 space-y-3.5 mb-8">
                  {[
                    "Up to 5 Invoices per month",
                    "Standard Invoice Layouts",
                    "Local Storage browser cache",
                    "Offline signature sketchpad",
                    "Basic tax/discount rates",
                  ].map((feat, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="w-4.5 h-4.5 rounded-full bg-sky-500/10 text-sky-550 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                      <span className="text-slate-650 dark:text-slate-350">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => window.location.href = '/signup'}
                className="w-full py-3 border border-slate-255 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-900 active:scale-98 font-bold text-xs rounded-2xl cursor-pointer transition-all text-slate-700 dark:text-slate-300 hover:border-sky-500/30"
              >
                Start Free Trial
              </button>
            </div>

            {/* Pro Plan */}
            <div className={`p-6 sm:p-8 rounded-3xl border transition-all duration-300 flex flex-col justify-between hover:scale-102 hover:shadow-2xl relative ${
              theme === 'dark' 
                ? 'bg-neutral-900/90 border-sky-500/40 hover:border-sky-500/60 shadow-xl shadow-sky-500/5' 
                : 'bg-white border-sky-500/30 hover:border-sky-500/50 shadow-md ring-1 ring-sky-100/30'
            }`}>
              <div className="absolute top-0 right-6 transform -translate-y-1/2">
                <span className="text-[9px] px-2.5 py-1 bg-gradient-to-r from-sky-600 to-indigo-650 text-white rounded-full font-black uppercase tracking-wider shadow-md">Most Popular</span>
              </div>

              <div>
                <div className="text-sky-600 dark:text-sky-400 text-[10px] font-black uppercase tracking-wider mb-1">Professional</div>
                <h3 className="text-xl font-black text-slate-805 mb-2">MakInvoices Pro</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mb-6">Comprehensive solution for expanding businesses syncing and managing clients.</p>
                
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-black text-slate-805">
                    ${isYearly ? "9" : "12"}
                  </span>
                  <span className="text-xs text-slate-400">/ month</span>
                </div>

                <div className="border-t border-slate-100 dark:border-neutral-800/80 pt-6 space-y-3.5 mb-8">
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
                      <span className="text-slate-650 dark:text-slate-350 font-bold">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => window.location.href = '/signup'}
                className="w-full py-3 bg-gradient-to-r from-sky-600 to-indigo-650 hover:from-sky-500 hover:to-indigo-600 active:scale-98 text-white font-bold text-xs rounded-2xl cursor-pointer shadow-md shadow-sky-500/20 transition-all"
              >
                Upgrade to Pro
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className={`p-6 sm:p-8 rounded-3xl border transition-all duration-300 flex flex-col justify-between hover:scale-102 hover:shadow-2xl ${
              theme === 'dark' ? 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-705' : 'bg-white border-slate-150 hover:border-slate-250 shadow-sm'
            }`}>
              <div>
                <div className="text-slate-455 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider mb-1">Enterprise</div>
                <h3 className="text-xl font-black text-slate-805 mb-2">Custom Package</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-405 leading-normal mb-6">Bespoke integrations, multi-user accounts, and dedicated accounting support.</p>
                
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-black text-slate-805">Custom</span>
                  <span className="text-xs text-slate-400">/ quote</span>
                </div>

                <div className="border-t border-slate-100 dark:border-neutral-800/80 pt-6 space-y-3.5 mb-8">
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
                      <span className="text-slate-650 dark:text-slate-350">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('/contact')}
                className="w-full py-3 border border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-900 active:scale-98 font-bold text-xs rounded-2xl cursor-pointer transition-all text-slate-700 dark:text-slate-300 hover:border-sky-500/30"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>

        {/* Footer info branding */}
        <footer className="mt-12 text-center text-xs text-slate-400 border-t border-slate-100 dark:border-neutral-800 pt-6">
          <p>© {new Date().getFullYear()} MakInvoices Corp. Local state automatically cached for safety. Encryption standards enabled.</p>
        </footer>

        {/* Scroll To Top Button */}
        {showScrollTop && (
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 p-3.5 bg-sky-600 hover:bg-sky-500 text-white rounded-full shadow-lg transition-all duration-300 z-50 cursor-pointer flex items-center justify-center"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
