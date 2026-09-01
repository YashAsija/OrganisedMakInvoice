'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from './supabase';
import { hasActiveSubscription, PlanKey, PLAN_LIMITS } from './planLimits';

export interface Subscription {
  id: string;
  user_id: string;
  gateway: 'razorpay' | 'paddle';
  gateway_sub_id: string;
  plan_key: PlanKey;
  billing_cycle: 'monthly' | 'yearly_recurring' | 'yearly_onetime';
  status: 'active' | 'cancelled' | 'expired' | 'trialing';
  auto_renew: boolean;
  current_period_end: string | null;
  subscription_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UsageRecord {
  documents_used: number;
  reports_used: number;
  period_start: string;
  period_end: string;
}

interface SubscriptionContextValue {
  subscription: Subscription | null;
  usage: UsageRecord | null;
  isLoading: boolean;
  isActive: boolean;
  planKey: PlanKey;
  planLimits: typeof PLAN_LIMITS[PlanKey];
  refetch: () => Promise<void>;
  lastSyncedAt: Date | null;
  isSyncing: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  const fetchSubscriptionData = useCallback(async (uid: string) => {
    setIsSyncing(true);
    try {
      // Fetch active or trialing subscription
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', uid)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let activeSub = subData ?? null;

      // Fallback: If subscriptions table row is missing, check users table for subscription status
      if (!activeSub) {
        const { data: userData } = await supabase
          .from('users')
          .select('subscription_status, plan_id, current_period_end')
          .eq('id', uid)
          .maybeSingle();

        if (userData && (userData.subscription_status === 'active' || userData.subscription_status === 'trialing' || userData.plan_id)) {
          const rawPlan = (userData.plan_id || 'free').toLowerCase();
          const pType = rawPlan.includes('pro') ? 'professional' : rawPlan.includes('unlimited') || rawPlan.includes('enterprise') ? 'enterprise' : rawPlan.includes('basic') ? 'basic' : 'free';
          const pName = pType === 'professional' ? 'Professional' : pType === 'enterprise' ? 'Enterprise' : pType === 'basic' ? 'Basic' : 'Free';
          const statusVal = userData.subscription_status || 'active';
          const expDate = userData.current_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

          const fallbackSub = {
            id: `usr_${uid}`,
            user_id: uid,
            plan_name: pName,
            plan_type: pType,
            status: statusVal,
            expires_at: expDate,
            renews_at: expDate,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          activeSub = fallbackSub as any;

          // Self-heal: insert missing subscription row matching confirmed schema
          try {
            await supabase.from('subscriptions').upsert(
              {
                user_id: uid,
                plan_name: pName,
                plan_type: pType,
                status: statusVal,
                expires_at: expDate,
                renews_at: expDate,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' }
            );
          } catch (e) {
            console.error('[SubscriptionContext Self-Heal Error]', e);
          }
        }
      }

      setSubscription(activeSub);

      // Fetch current period usage (active monthly window)
      const nowIso = new Date().toISOString();

      const { data: usageData } = await supabase
        .from('subscription_usage')
        .select('*')
        .eq('user_id', uid)
        .lte('period_start', nowIso)
        .gte('period_end', nowIso)
        .order('period_start', { ascending: false })
        .limit(1)
        .maybeSingle();

      setUsage(usageData ?? null);
      setLastSyncedAt(new Date());
    } catch (err) {
      console.warn('[SubscriptionProvider] Error fetching data:', err);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, []);

  // Setup Supabase Realtime subscription listener
  const setupRealtimeSync = useCallback((uid: string) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`sub_sync_${uid}_${Date.now()}`) // unique name prevents stale channel reuse
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'subscriptions',
        filter: `user_id=eq.${uid}`,
      }, (payload) => {
        console.log('[Realtime] Subscription update received:', payload.eventType);
        fetchSubscriptionData(uid);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'subscription_usage',
        filter: `user_id=eq.${uid}`,
      }, (payload) => {
        console.log('[Realtime] Usage update received:', payload.eventType);
        fetchSubscriptionData(uid);
      })
      .subscribe((status, err) => {
        console.log('[Realtime] Channel status:', status, err || '');
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // Auto-reconnect after 3 seconds
          console.warn('[Realtime] Channel error — reconnecting in 3s');
          setTimeout(() => setupRealtimeSync(uid), 3000);
        }
      });

    channelRef.current = channel;
  }, [fetchSubscriptionData]);

  // Init on auth change
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        fetchSubscriptionData(session.user.id);
        setupRealtimeSync(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('[Auth] Token refreshed — re-syncing Realtime channel');
        setupRealtimeSync(session.user.id);
      }
      if (event === 'SIGNED_IN' && session?.user) {
        setUserId(session.user.id);
        fetchSubscriptionData(session.user.id);
        setupRealtimeSync(session.user.id);
      }
      if (event === 'SIGNED_OUT') {
        setSubscription(null);
        setUsage(null);
        setUserId(null);
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      }
    });

    return () => {
      authListener.unsubscribe();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchSubscriptionData, setupRealtimeSync]);

  const rawKey = (subscription?.plan_key as string)?.toLowerCase() || 'starter';
  const planKey: PlanKey = (rawKey.includes('pro') ? 'professional' : rawKey.includes('basic') ? 'basic' : rawKey.includes('ent') ? 'enterprise' : 'starter') as PlanKey;
  const isActive = subscription ? hasActiveSubscription(subscription) : false;

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      usage,
      isLoading,
      isActive,
      planKey,
      planLimits: PLAN_LIMITS[planKey] || PLAN_LIMITS.starter,
      refetch: () => userId ? fetchSubscriptionData(userId) : Promise.resolve(),
      lastSyncedAt,
      isSyncing,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used inside SubscriptionProvider');
  return ctx;
}
