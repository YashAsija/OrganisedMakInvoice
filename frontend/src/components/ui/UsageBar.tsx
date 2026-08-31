'use client';

import React from 'react';
import { useSubscription } from '../../hooks/useSubscription';

interface UsageBarProps {
  showUpgradeCta?: boolean;
  onUpgradeClick?: () => void;
}

export function UsageBar({ showUpgradeCta = true, onUpgradeClick }: UsageBarProps) {
  const { usage, subscription, isSyncing, getDocumentLimit, getReportLimit } = useSubscription();

  const PLAN_LIMITS = {
    free:         { documents: 10,       reports: 1   },
    basic:        { documents: 60,       reports: 5   },
    professional: { documents: 140,      reports: 15  },
    enterprise:   { documents: Infinity, reports: Infinity },
  };

  const planType = (subscription?.plan_type || 'free') as keyof typeof PLAN_LIMITS;
  const docLimit = PLAN_LIMITS[planType]?.documents ?? getDocumentLimit();
  const repLimit = PLAN_LIMITS[planType]?.reports ?? getReportLimit();
  const docsUsed = usage?.documents_used ?? 0;
  const repsUsed = usage?.reports_used ?? 0;
  const docPct = docLimit === Infinity ? 0 : Math.min((docsUsed / docLimit) * 100, 100);
  const repPct = repLimit === Infinity ? 0 : Math.min((repsUsed / repLimit) * 100, 100);

  const barColor = (pct: number) =>
    pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-blue-500';

  return (
    <div className="space-y-3">
      {/* Sync status indicator */}
      <div className="flex items-center gap-2 text-xs">
        <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-green-400'}`} />
        <span className="text-slate-500">{isSyncing ? 'Syncing...' : 'Live'}</span>
      </div>

      {/* Documents */}
      <div>
        <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 uppercase tracking-wide">
          <span>Documents Usage</span>
          <span>{docLimit === Infinity ? `${docsUsed} / ∞` : `${docsUsed} / ${docLimit}`}</span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-1.5 rounded-full transition-all duration-700 ease-out ${barColor(docPct)}`}
            style={{ width: `${docPct}%` }}
          />
        </div>
        {docPct >= 90 && docLimit !== Infinity && showUpgradeCta && (
          <p className="text-xs text-red-500 mt-1">
            ⚠️ Almost at limit — {' '}
            <button type="button" onClick={onUpgradeClick} className="underline font-medium cursor-pointer">Upgrade your plan</button>
          </p>
        )}
      </div>

      {/* Reports */}
      <div>
        <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 uppercase tracking-wide">
          <span>Reports Usage</span>
          <span>{repLimit === Infinity ? `${repsUsed} / ∞` : `${repsUsed} / ${repLimit}`}</span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-1.5 rounded-full transition-all duration-700 ease-out ${barColor(repPct)}`}
            style={{ width: `${repPct}%` }}
          />
        </div>
        {repPct >= 90 && repLimit !== Infinity && showUpgradeCta && (
          <p className="text-xs text-red-500 mt-1">
            ⚠️ Almost at limit — {' '}
            <button type="button" onClick={onUpgradeClick} className="underline font-medium cursor-pointer">Upgrade your plan</button>
          </p>
        )}
      </div>

      {/* Period info */}
      {usage && (
        <p className="text-xs text-slate-400">
          Period ends: {new Date(usage.period_end).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
          })}
        </p>
      )}
    </div>
  );
}

export default UsageBar;
