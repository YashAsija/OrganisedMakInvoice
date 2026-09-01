'use client';

import React, { useState } from 'react';
import { useSubscription } from '../../hooks/useSubscription';
import { Clock, X, ArrowRight, Sparkles } from 'lucide-react';

interface TrialBannerProps {
  onUpgradeClick?: () => void;
}

export function TrialBanner({ onUpgradeClick }: TrialBannerProps) {
  const { subscription, isOnTrial, getTrialDaysRemaining } = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  if (!isOnTrial() || dismissed || !subscription) return null;

  const daysRemaining = getTrialDaysRemaining();
  const planName = subscription.plan_name || 'Trial';

  const getBannerStyle = () => {
    if (daysRemaining <= 1) {
      return 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white shadow-md border-b border-rose-800';
    }
    if (daysRemaining <= 7) {
      return 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white shadow-md border-b border-amber-800';
    }
    return 'bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] text-white shadow-md border-b border-[#0369a1]';
  };

  return (
    <div className={`w-full shrink-0 py-2.5 px-3 sm:px-6 transition-all relative z-20 ${getBannerStyle()}`}>
      <div className="max-w-[1600px] mx-auto flex flex-row items-center justify-between gap-2.5 text-xs sm:text-sm">
        
        {/* Left Side: Icon & Status Text */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="p-1 rounded-lg bg-white/20 text-white shrink-0 flex items-center justify-center">
            <Clock className="w-3.5 h-3.5 text-white" />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
            <span className="font-extrabold text-xs sm:text-sm tracking-wide text-white whitespace-nowrap">
              {planName} Free Trial
            </span>
            
            <span className="inline-flex items-center font-mono font-bold bg-white/20 text-white border border-white/30 px-2.5 py-0.5 rounded-full text-[10.5px] sm:text-xs shrink-0">
              {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
            </span>

            <span className="text-[11px] text-white/90 hidden lg:inline font-medium border-l border-white/30 pl-2.5">
              Upgrade anytime to keep your features active after trial ends.
            </span>
          </div>
        </div>

        {/* Right Side: Action Button & Dismiss */}
        <div className="flex items-center gap-2 shrink-0">
          {onUpgradeClick && (
            <button
              type="button"
              onClick={onUpgradeClick}
              className="px-3.5 sm:px-4 py-1.5 bg-white hover:bg-slate-50 text-[#0284c7] hover:text-[#0369a1] font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 border border-white/60 shrink-0"
            >
              <span className="font-black">Upgrade Now</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}

export default TrialBanner;
