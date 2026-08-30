'use client';

import React from 'react';
import { useSubscription } from '../../hooks/useSubscription';

interface UsageBarProps {
  onUpgradeClick?: () => void;
}

export function UsageBar({ onUpgradeClick }: UsageBarProps) {
  const { usage, getDocumentLimit, getReportLimit } = useSubscription();

  const docLimit = getDocumentLimit();
  const repLimit = getReportLimit();
  const docsUsed = usage?.documents_used ?? 0;
  const repsUsed = usage?.reports_used ?? 0;

  const docPercentage = docLimit === Infinity ? 0 : Math.min(100, (docsUsed / docLimit) * 100);
  const repPercentage = repLimit === Infinity ? 0 : Math.min(100, (repsUsed / repLimit) * 100);

  const getBarColor = (pct: number) => {
    if (pct > 90) return 'bg-rose-500';
    if (pct > 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="w-full space-y-4 p-4 bg-slate-50 dark:bg-[#111a36]/60 rounded-2xl border border-slate-200 dark:border-[#223269]/60">
      {/* Documents Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs font-semibold">
          <span className="text-slate-600 dark:text-slate-300">Documents Usage</span>
          <span className="font-mono text-slate-800 dark:text-slate-100">
            {docLimit === Infinity ? `${docsUsed} / Unlimited` : `${docsUsed} of ${docLimit} documents used`}
          </span>
        </div>
        {docLimit !== Infinity && (
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${getBarColor(docPercentage)}`}
              style={{ width: `${docPercentage}%` }}
            />
          </div>
        )}
      </div>

      {/* Reports Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs font-semibold">
          <span className="text-slate-600 dark:text-slate-300">Reports Usage</span>
          <span className="font-mono text-slate-800 dark:text-slate-100">
            {repLimit === Infinity ? `${repsUsed} / Unlimited` : `${repsUsed} of ${repLimit} reports used`}
          </span>
        </div>
        {repLimit !== Infinity && (
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${getBarColor(repPercentage)}`}
              style={{ width: `${repPercentage}%` }}
            />
          </div>
        )}
      </div>

      {/* Upgrade CTA if limits near max */}
      {(docPercentage > 90 || repPercentage > 90) && onUpgradeClick && (
        <div className="pt-2 flex justify-between items-center border-t border-slate-200 dark:border-slate-800">
          <span className="text-xs font-medium text-rose-600 dark:text-rose-400">Limit almost reached!</span>
          <button
            type="button"
            onClick={onUpgradeClick}
            className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg transition-all"
          >
            Upgrade Plan
          </button>
        </div>
      )}
    </div>
  );
}

export default UsageBar;
