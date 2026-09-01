'use client';

import React from 'react';
import { useSubscription } from '../../hooks/useSubscription';
import { AlertCircle, ArrowRight } from 'lucide-react';

interface TrialExpiredBannerProps {
  onUpgradeClick?: () => void;
}

export function TrialExpiredBanner({ onUpgradeClick }: TrialExpiredBannerProps) {
  const { subscription } = useSubscription();

  if (subscription?.status !== 'expired') return null;

  const planName = subscription.plan_name || 'Trial';

  return (
    <div className="w-full shrink-0 py-3 px-4 sm:px-6 bg-gradient-to-r from-rose-600 to-red-700 text-white shadow-lg border-b border-rose-800 relative z-50">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-full bg-white/20 shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold tracking-wide">Your {planName} Trial Has Ended</span>
            <p className="text-[11px] opacity-90">
              You are now on the Free plan. Upgrade to restore your unlimited features.
            </p>
          </div>
        </div>

        {onUpgradeClick && (
          <button
            type="button"
            onClick={onUpgradeClick}
            className="px-4 py-1.5 bg-white text-rose-700 font-black text-xs rounded-xl shadow-md hover:bg-rose-50 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>Upgrade Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export default TrialExpiredBanner;
