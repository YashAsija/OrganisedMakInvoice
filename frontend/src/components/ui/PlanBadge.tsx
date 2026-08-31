'use client';

import React from 'react';
import { useSubscription } from '../../hooks/useSubscription';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';

export function PlanBadge() {
  const { subscription, planKey, isOnTrial, getTrialDaysRemaining, isLoading } = useSubscription();

  console.log('[PlanBadge] Rendering with plan:', subscription?.plan_type, '| isLoading:', isLoading);

  if (isLoading || !subscription) {
    return (
      <div className="inline-flex items-center">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200/50 dark:bg-slate-800/50 animate-pulse w-20 h-5" />
      </div>
    );
  }

  if (subscription?.status === 'expired') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-extrabold uppercase tracking-wider">
        <AlertTriangle className="w-3 h-3 text-rose-500" />
        <span>Trial Ended</span>
      </div>
    );
  }

  if (isOnTrial()) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold tracking-wider">
        <Clock className="w-3 h-3 text-amber-500" />
        <span>Trial: {daysRemaining}d left</span>
      </div>
    );
  }

  const getBadgeStyle = () => {
    switch (planKey) {
      case 'basic':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'professional':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'enterprise':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'free':
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    }
  };

  const getLabel = () => {
    switch (planKey) {
      case 'basic': return 'Basic ₹199/mo';
      case 'professional': return 'Professional ₹299/mo';
      case 'enterprise': return 'Enterprise ₹599/mo';
      case 'free': default: return 'Starter ₹0';
    }
  };

  return (
    <div className="inline-flex items-center">
      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider border transition-all flex items-center gap-1 ${getBadgeStyle()}`}>
        {planKey !== 'free' && <CheckCircle className="w-3 h-3" />}
        {getLabel()}
      </span>
    </div>
  );
}

export default PlanBadge;
