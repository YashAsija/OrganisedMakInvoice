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
      // Fetch active subscription
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', uid)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setSubscription(subData ?? null);

      // Fetch current period usage
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data: usageData } = await supabase
        .from('subscription_usage')
        .select('*')
        .eq('user_id', uid)
        .gte('period_start', periodStart)
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
    // Clean up any existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`subscription_sync_${uid}`)
      // Listen for subscription changes
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'subscriptions',
        filter: `user_id=eq.${uid}`,
      }, (payload) => {
        console.log('[Realtime] Subscription changed:', payload.eventType);
        fetchSubscriptionData(uid);
      })
      // Listen for usage changes
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'subscription_usage',
        filter: `user_id=eq.${uid}`,
      }, (payload) => {
        console.log('[Realtime] Usage changed:', payload.eventType);
        fetchSubscriptionData(uid);
      })
      .subscribe((status) => {
        console.log('[Realtime] Channel status:', status);
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
      if (event === 'SIGNED_IN' && session?.user) {
        setUserId(session.user.id);
        fetchSubscriptionData(session.user.id);
        setupRealtimeSync(session.user.id);
      }
      if (event === 'SIGNED_OUT') {
        setSubscription(null);
        setUsage(null);
        setUserId(null);
        if (channelRef.current) supabase.removeChannel(channelRef.current);
      }
    });

    return () => {
      authListener.unsubscribe();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
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
