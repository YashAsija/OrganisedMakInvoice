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

      // Server GET API fallback if client query returned null or was blocked by RLS
      if (!activeSub) {
        const activeEmail = typeof window !== 'undefined' ? localStorage.getItem('makbills_active_email') : null;
        try {
          const params = new URLSearchParams();
          if (uid) params.set('userId', uid);
          if (activeEmail) params.set('userEmail', activeEmail);
          const apiRes = await fetch(`/api/payments/save-subscription?${params.toString()}`);
          if (apiRes.ok) {
            const json = await apiRes.json();
            if (json.subscription) activeSub = json.subscription;
          }
        } catch (apiErr) {
          console.warn('[SubscriptionContext] Server API fallback note:', apiErr);
        }
      }

      // Local storage fallback for active trial
      if (!activeSub && typeof window !== 'undefined') {
        const localRaw = localStorage.getItem(`makbills_sub_${uid}`);
        if (localRaw) {
          try {
            const parsed = JSON.parse(localRaw);
            if (parsed && parsed.status === 'trialing' && parsed.expires_at && new Date(parsed.expires_at) > new Date()) {
              activeSub = parsed;
            }
          } catch (e) {}
        }
      }

      setSubscription(activeSub);

      if (activeSub) {
        const rKey = ((activeSub as any).plan_type || (activeSub as any).plan_name || (activeSub as any).plan_key || '').toLowerCase();
        const resolvedTier = rKey.includes('pro') ? 'pro' : rKey.includes('basic') ? 'basic' : rKey.includes('ent') ? 'unlimited' : 'free';
        if (typeof window !== 'undefined') {
          const currentCached = localStorage.getItem('makbills_subscription_tier');
          if (currentCached !== resolvedTier) {
            localStorage.setItem('makbills_subscription_tier', resolvedTier);
            localStorage.setItem('makbills_last_active_paid_tier', resolvedTier);
            window.dispatchEvent(new CustomEvent('mak_subscription_change', { detail: resolvedTier }));
          }
        }
      }

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

  const activeUidRef = useRef<string | null>(null);

  // Setup Supabase Realtime subscription listener cleanly with unique channel name
  const setupRealtimeSync = useCallback((uid: string) => {
    if (!uid) return;

    if (channelRef.current) {
      const oldChannel = channelRef.current;
      channelRef.current = null;
      activeUidRef.current = null;
      try {
        supabase.removeChannel(oldChannel);
      } catch (e) {}
    }

    activeUidRef.current = uid;

    // Unique channel topic name prevents Supabase JS SDK from reusing subscribing channel instance
    const channelTopic = `sub_sync_${uid}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const channel = supabase
      .channel(channelTopic)
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
      });

    channel.subscribe((status, err) => {
      console.log('[Realtime] Channel status:', status, err || '');
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        if (channelRef.current === channel) {
          channelRef.current = null;
          activeUidRef.current = null;
        }
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
        console.log('[Auth] Token refreshed');
        if (session.user.id !== activeUidRef.current) {
          setupRealtimeSync(session.user.id);
        }
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
        activeUidRef.current = null;
        if (channelRef.current) {
          const oldChannel = channelRef.current;
          channelRef.current = null;
          try {
            supabase.removeChannel(oldChannel);
          } catch (e) {}
        }
      }
    });

    return () => {
      authListener.unsubscribe();
      activeUidRef.current = null;
      if (channelRef.current) {
        const oldChannel = channelRef.current;
        channelRef.current = null;
        try {
          supabase.removeChannel(oldChannel);
        } catch (e) {}
      }
    };
  }, [fetchSubscriptionData, setupRealtimeSync]);

  const rawKey = ((subscription as any)?.plan_type || (subscription as any)?.plan_name || (subscription as any)?.plan_key || 'starter').toString().toLowerCase();
  const planKey: PlanKey = (rawKey.includes('pro') ? 'professional' : rawKey.includes('basic') ? 'basic' : rawKey.includes('ent') ? 'enterprise' : 'starter') as PlanKey;
  const isActive = subscription ? (subscription.status === 'active' || subscription.status === 'trialing' || hasActiveSubscription(subscription)) : false;

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
