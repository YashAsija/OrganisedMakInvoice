'use client';

import { useSubscription } from '../lib/subscriptionContext';
import { PLAN_LIMITS, getUsagePercent } from '../lib/planLimits';
import { useEffect, useRef, useState } from 'react';

export function SubscriptionStatus() {
  const { subscription, usage, isLoading, isActive, planKey, planLimits, lastSyncedAt, isSyncing } = useSubscription();
  const [showSyncToast, setShowSyncToast] = useState(false);
  const isFirstLoad = useRef(true);
  const prevSubId = useRef<string | null>(null);

  // Show sync toast on cross-device updates (not first load)
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      prevSubId.current = subscription?.id ?? null;
      return;
    }
    if (subscription?.id !== prevSubId.current) {
      prevSubId.current = subscription?.id ?? null;
      setShowSyncToast(true);
      setTimeout(() => setShowSyncToast(false), 3500);
    }
  }, [subscription]);

  if (isLoading) return <SubscriptionSkeleton />;

  const docsLimit = planLimits.documentsPerMonth;
  const reportsLimit = planLimits.reportsPerMonth;
  const docsUsed = usage?.documents_used ?? 0;
  const reportsUsed = usage?.reports_used ?? 0;
  const docsPercent = getUsagePercent(docsUsed, docsLimit);
  const reportsPercent = getUsagePercent(reportsUsed, reportsLimit);

  const expiryDate = subscription?.billing_cycle === 'yearly_onetime'
    ? subscription?.subscription_expires_at
    : subscription?.current_period_end;

  const formatDate = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const barColor = (pct: number) =>
    pct > 85 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#16a34a';

  return (
    <>
      {/* Sync toast */}
      {showSyncToast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: '#16a34a', color: '#fff', padding: '10px 18px',
          borderRadius: 10, fontSize: '0.82rem', fontWeight: 700,
          fontFamily: 'IBM Plex Mono, monospace',
          boxShadow: '0 8px 24px rgba(22,163,74,0.3)',
          animation: 'slideIn 0.3s ease',
        }}>
          ✓ Subscription synced across devices
        </div>
      )}

      <div style={{
        background: 'var(--card-bg, #fff)',
        border: '1px solid var(--border, #bae6fd)',
        borderRadius: 16, padding: '24px',
        display: 'flex', flexDirection: 'column', gap: 20,
        width: '100%', boxSizing: 'border-box',
      }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Plan badge */}
            <span style={{
              background: PLAN_LIMITS[planKey]?.color || '#0284c7',
              color: '#fff', borderRadius: 20,
              padding: '4px 14px', fontSize: '0.75rem',
              fontWeight: 800, fontFamily: 'IBM Plex Mono, monospace',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              {PLAN_LIMITS[planKey]?.label || 'Starter'}
            </span>
            {/* Billing cycle chip */}
            {subscription && (
              <span style={{
                border: '1px solid var(--border, #bae6fd)',
                borderRadius: 20, padding: '3px 10px',
                fontSize: '0.7rem', fontWeight: 600,
                fontFamily: 'IBM Plex Mono, monospace',
                color: 'var(--muted, #475569)',
              }}>
                {subscription.billing_cycle === 'monthly' ? 'Monthly'
                  : subscription.billing_cycle === 'yearly_recurring' ? 'Annual (Auto-renew)'
                  : 'Annual (One-time)'}
              </span>
            )}
            {/* Gateway badge */}
            {subscription && (
              <span style={{
                border: '1px solid var(--border, #bae6fd)',
                borderRadius: 20, padding: '3px 10px',
                fontSize: '0.7rem', fontWeight: 600,
                fontFamily: 'IBM Plex Mono, monospace',
                color: subscription.gateway === 'razorpay' ? '#0284c7' : '#7c3aed',
              }}>
                via {subscription.gateway === 'razorpay' ? 'Razorpay' : 'Paddle'}
              </span>
            )}
          </div>

          {/* Status + Live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isActive && (
              <span style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#dcfce7', color: '#16a34a',
                borderRadius: 20, padding: '4px 12px',
                fontSize: '0.72rem', fontWeight: 800,
                fontFamily: 'IBM Plex Mono, monospace',
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: '#16a34a',
                  animation: 'pulse 2s infinite',
                  display: 'inline-block',
                }} />
                Subscribed
              </span>
            )}
            {/* Live sync dot */}
            <span style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: '0.68rem', fontFamily: 'IBM Plex Mono, monospace',
              color: isSyncing ? '#f59e0b' : '#16a34a',
            }}>
              {isSyncing
                ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>↻</span> Syncing</>
                : <><span style={{ color: '#16a34a' }}>●</span> Live</>
              }
            </span>
          </div>
        </div>

        {/* Renewal / expiry info */}
        {subscription && (
          <div style={{
            background: 'var(--subtle-bg, #f0f9ff)',
            border: '1px solid var(--border, #bae6fd)',
            borderRadius: 10, padding: '12px 16px',
            fontSize: '0.82rem', fontFamily: 'IBM Plex Mono, monospace',
            color: 'var(--muted, #475569)',
          }}>
            {subscription.status === 'cancelled'
              ? `Cancelled — access until ${formatDate(expiryDate)}`
              : subscription.auto_renew
              ? `Renews on ${formatDate(expiryDate)}`
              : `Expires on ${formatDate(expiryDate)} · No auto-renewal`}
          </div>
        )}

        {/* Usage bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <UsageBar
            label="Documents"
            used={docsUsed}
            limit={docsLimit}
            percent={docsPercent}
            color={barColor(docsPercent)}
          />
          <UsageBar
            label="Reports"
            used={reportsUsed}
            limit={reportsLimit}
            percent={reportsPercent}
            color={barColor(reportsPercent)}
          />
        </div>

        {/* Last synced */}
        {lastSyncedAt && (
          <div style={{
            fontSize: '0.65rem', fontFamily: 'IBM Plex Mono, monospace',
            color: 'var(--muted, #94a3b8)', textAlign: 'right',
          }}>
            Last synced {lastSyncedAt.toLocaleTimeString()}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateX(60px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </>
  );
}

function UsageBar({ label, used, limit, percent, color }: {
  label: string; used: number; limit: number | 'unlimited'; percent: number; color: string;
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.78rem', fontFamily: 'IBM Plex Mono, monospace' }}>
        <span style={{ fontWeight: 700 }}>{label}</span>
        {limit === 'unlimited'
          ? <span style={{ background: '#dcfce7', color: '#16a34a', borderRadius: 20, padding: '2px 10px', fontSize: '0.65rem', fontWeight: 800 }}>Unlimited</span>
          : <span style={{ color: 'var(--muted, #475569)' }}>{used} / {limit}</span>
        }
      </div>
      {limit !== 'unlimited' && (
        <div style={{ height: 8, background: 'var(--border, #e0f2fe)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${percent}%`,
            background: color, borderRadius: 99,
            transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
          }} />
        </div>
      )}
    </div>
  );
}

function SubscriptionSkeleton() {
  return (
    <div style={{ borderRadius: 16, border: '1px solid var(--border, #bae6fd)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[160, 80, '100%', '100%'].map((w, i) => (
        <div key={i} style={{
          height: i < 2 ? 28 : 12, width: w, borderRadius: 8,
          background: 'linear-gradient(90deg, #e0f2fe 25%, #bae6fd 50%, #e0f2fe 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
        }} />
      ))}
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}
