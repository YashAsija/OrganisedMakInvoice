'use client';

import React, { useState } from 'react';
import { useSubscription } from '../../hooks/useSubscription';
import { Clock, X, ArrowRight } from 'lucide-react';

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
      return 'bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 text-white';
    }
    if (daysRemaining <= 7) {
      return 'bg-gradient-to-r from-amber-600 via-amber-500 to-orange-600 text-white';
    }
    return 'bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 text-white';
  };

  return (
    <div className={`w-full py-3 px-4 sm:px-6 shadow-md transition-all relative ${getBannerStyle()}`}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-full bg-white/20 shrink-0">
            <Clock className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <span className="font-extrabold tracking-wide">You're on a {planName} Free Trial</span>
            <span className="mx-1.5 opacity-75">•</span>
            <span className="font-mono font-bold bg-white/20 px-2 py-0.5 rounded-full text-xs">
              {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
            </span>
            <p className="text-[11px] opacity-90 hidden md:block">
              Upgrade now to keep your features active after trial ends.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onUpgradeClick && (
            <button
              type="button"
              onClick={onUpgradeClick}
              className="px-3.5 py-1.5 bg-white text-slate-900 font-extrabold text-xs rounded-xl shadow-sm hover:bg-slate-100 transition-all flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>Upgrade Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
            title="Dismiss banner for this session"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default TrialBanner;
