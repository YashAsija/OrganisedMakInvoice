'use client';

import React from 'react';
import { useSubscription } from '../../hooks/useSubscription';

interface UsageBarProps {
  showUpgradeCta?: boolean;
  onUpgradeClick?: () => void;
}

export function UsageBar({ showUpgradeCta = true, onUpgradeClick }: UsageBarProps) {
  const { 
    usage, 
    subscription,
    getDocumentLimit, 
    getReportLimit,
    isSyncing 
  } = useSubscription();

  const docLimit = getDocumentLimit();
  const repLimit = getReportLimit();
  const docsUsed = usage?.documents_used || 0;
  const repsUsed = usage?.reports_used || 0;
  const docPct = docLimit === Infinity ? 0 : (docsUsed / docLimit) * 100;
  const repPct = repLimit === Infinity ? 0 : (repsUsed / repLimit) * 100;

  const getBarColor = (pct: number) => {
    if (pct >= 90) return 'bg-red-500';
    if (pct >= 70) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const getTextColor = (pct: number) => {
    if (pct >= 90) return 'text-red-600';
    if (pct >= 70) return 'text-amber-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-4 p-4 bg-white dark:bg-[#111a36] rounded-xl border border-slate-200 dark:border-[#223269]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Usage This Period</span>
        {isSyncing && (
          <span className="text-xs text-amber-500 flex items-center gap-1">
            <span className="animate-spin">⟳</span> Syncing...
          </span>
        )}
      </div>

      {/* Documents */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-600 dark:text-slate-400">Documents</span>
          <span className={`font-mono font-bold ${getTextColor(docPct)}`}>
            {docLimit === Infinity 
              ? `${docsUsed} used (Unlimited)` 
              : `${docsUsed} / ${docLimit}`}
          </span>
        </div>
        {docLimit !== Infinity ? (
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${getBarColor(docPct)}`}
              style={{ width: `${Math.min(docPct, 100)}%` }}
            />
          </div>
        ) : (
          <div className="w-full bg-green-100 dark:bg-green-900/30 rounded-full h-2">
            <div className="h-2 rounded-full bg-green-400 w-full" />
          </div>
        )}
        {docPct >= 90 && docLimit !== Infinity && showUpgradeCta && (
          <p className="text-xs text-red-500 mt-1">
            ⚠️ Almost at limit — 
            <button type="button" onClick={onUpgradeClick} className="underline ml-1 font-medium cursor-pointer">Upgrade your plan</button>
          </p>
        )}
      </div>

      {/* Reports */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-600 dark:text-slate-400">Reports</span>
          <span className={`font-mono font-bold ${getTextColor(repPct)}`}>
            {repLimit === Infinity 
              ? `${repsUsed} used (Unlimited)` 
              : `${repsUsed} / ${repLimit}`}
          </span>
        </div>
        {repLimit !== Infinity ? (
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${getBarColor(repPct)}`}
              style={{ width: `${Math.min(repPct, 100)}%` }}
            />
          </div>
        ) : (
          <div className="w-full bg-green-100 dark:bg-green-900/30 rounded-full h-2">
            <div className="h-2 rounded-full bg-green-400 w-full" />
          </div>
        )}
        {repPct >= 90 && repLimit !== Infinity && showUpgradeCta && (
          <p className="text-xs text-red-500 mt-1">
            ⚠️ Almost at limit — 
            <button type="button" onClick={onUpgradeClick} className="underline ml-1 font-medium cursor-pointer">Upgrade your plan</button>
          </p>
        )}
      </div>

      {/* Period info */}
      {usage && (
        <p className="text-xs text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
          Period: {new Date(usage.period_start).toLocaleDateString()} — {' '}
          {new Date(usage.period_end).toLocaleDateString()}
          {isSyncing ? ' · Syncing...' : ' · Live'}
        </p>
      )}
    </div>
  );
}

export default UsageBar;
