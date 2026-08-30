'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export const PLANS = {
  free: {
    plan_type: 'free' as const,
    plan_name: 'Free',
    display_name: 'Starter',
    price_monthly: 0,
    price_yearly: 0,
    label: 'FREE / TRIAL',
    description: 'Get started at zero cost. Essential billing and ledger tools.',
    billing_note: 'Free forever. No credit card needed.',
    document_limit: 10,
    report_limit: 2,
  },
  basic: {
    plan_type: 'basic' as const,
    plan_name: 'Basic',
    display_name: 'Basic',
    price_monthly: 199,
    price_yearly: 1990,
    label: 'BASIC',
    description: 'Perfect for freelancers & businesses scaling document management.',
    billing_note: 'Billed monthly. Cancel anytime.',
    document_limit: 100,
    report_limit: 20,
  },
  professional: {
    plan_type: 'professional' as const,
    plan_name: 'Professional',
    display_name: 'Professional',
    price_monthly: 299,
    price_yearly: 2990,
    label: 'PROFESSIONAL',
    badge: 'MOST POPULAR',
    description: 'For growing businesses requiring AI billing & recurring automation.',
    billing_note: 'Billed monthly. Cancel anytime.',
    document_limit: 500,
    report_limit: 100,
  },
  enterprise: {
    plan_type: 'enterprise' as const,
    plan_name: 'Enterprise',
    display_name: 'Enterprise',
    price_monthly: 599,
    price_yearly: 5990,
    label: 'ENTERPRISE',
    description: 'Unlimited scale and dedicated support for high-volume operations.',
    billing_note: 'Billed monthly. Cancel anytime.',
    document_limit: Infinity,
    report_limit: Infinity,
  },
};

export const PLAN_LIMITS = {
  free:         { documents: 10,       reports: 2   },
  basic:        { documents: 100,      reports: 20  },
  professional: { documents: 500,      reports: 100 },
  enterprise:   { documents: Infinity, reports: Infinity },
};

export interface Subscription {
  id: string;
  user_id: string;
  plan_name: string;
  plan_type: 'free' | 'basic' | 'professional' | 'enterprise';
  status: 'active' | 'trialing' | 'inactive' | 'cancelled' | 'expired';
  expires_at: string | null;
  renews_at: string | null;
  authorized_token_node: string | null;
  trial_used_plans?: string[];
  trial_started_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionUsage {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  documents_used: number;
  reports_used: number;
  updated_at: string;
}

export interface SubscriptionContextType {
  subscription: Subscription | null;
  usage: SubscriptionUsage | null;
  isLoading: boolean;
  isSyncing: boolean;
  isRealtimeSyncing: boolean;
  isActive: boolean;
  planKey: 'free' | 'basic' | 'professional' | 'enterprise';
  upgradeSubscription: (planType: string, billingMode: 'monthly' | 'yearly', transactionId: string) => Promise<void>;
  refreshSubscription: () => Promise<void>;
  refetch: () => Promise<void>;
  trackDocumentUsage: () => Promise<void>;
  trackReportUsage: () => Promise<void>;
  getDocumentLimit: () => number;
  getReportLimit: () => number;
  canCreateDocument: () => boolean;
  canCreateReport: () => boolean;
  startTrial: (planType: 'basic' | 'professional') => Promise<void>;
  canStartTrial: (planType: 'basic' | 'professional') => boolean;
  isOnTrial: () => boolean;
  getTrialDaysRemaining: () => number;
  checkAndExpireTrials: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<SubscriptionUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  // Sync / fetch subscription & usage for given user ID
  const fetchSubscriptionData = useCallback(async (uid: string) => {
    try {
      // 1. Fetch Subscription
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle();

      let activeSub = subData as Subscription | null;

      if (!activeSub) {
        const defaultSubPayload = {
          user_id: uid,
          plan_name: 'Free',
          plan_type: 'free' as const,
          status: 'active' as const,
          expires_at: null,
          renews_at: null,
          trial_used_plans: [],
          updated_at: new Date().toISOString(),
        };

        const { data: createdSub } = await supabase
          .from('subscriptions')
          .upsert(defaultSubPayload, { onConflict: 'user_id' })
          .select()
          .single();

        activeSub = (createdSub as Subscription) || (defaultSubPayload as any);
      }

      setSubscription(activeSub);

      // 2. Fetch or initialize active usage row for current period
      const now = new Date();
      const pStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const pEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

      const { data: usageData } = await supabase
        .from('subscription_usage')
        .select('*')
        .eq('user_id', uid)
        .gte('period_start', pStart)
        .order('period_start', { ascending: false })
        .limit(1)
        .maybeSingle();

      let activeUsage = usageData as SubscriptionUsage | null;

      if (!activeUsage) {
        const { data: createdUsage } = await supabase
          .from('subscription_usage')
          .upsert({
            user_id: uid,
            period_start: pStart,
            period_end: pEnd,
            documents_used: 0,
            reports_used: 0,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,period_start' })
          .select()
          .maybeSingle();

        activeUsage = createdUsage as SubscriptionUsage | null;
      }

      setUsage(activeUsage);
    } catch (err) {
      console.error('[SubscriptionContext] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Trial expiry check
  const checkAndExpireTrials = useCallback(async () => {
    if (!subscription) return;
    if (subscription.status !== 'trialing') return;
    
    const now = new Date();
    const expiresAt = subscription.expires_at ? new Date(subscription.expires_at) : null;
    
    if (expiresAt && now > expiresAt) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: updated } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: user.id,
            plan_name: 'Free',
            plan_type: 'free',
            status: 'expired',
            expires_at: expiresAt.toISOString(),
            updated_at: now.toISOString(),
          }, { onConflict: 'user_id' })
          .select()
          .single();

        if (updated) setSubscription(updated as Subscription);
      } catch (e) {
        console.error('[Trial Expiry Error]', e);
      }
    }
  }, [subscription]);

  // Realtime multi-device synchronization
  const setupRealtimeSync = useCallback((uid: string) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setIsSyncing(true);

    const channel = supabase
      .channel(`sub-sync-${uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${uid}` },
        (payload: any) => {
          if (payload.new) {
            setSubscription(payload.new as Subscription);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscription_usage', filter: `user_id=eq.${uid}` },
        (payload: any) => {
          if (payload.new) {
            setUsage(payload.new as SubscriptionUsage);
          }
        }
      )
      .subscribe((status) => {
        setIsSyncing(status !== 'SUBSCRIBED');
      });

    channelRef.current = channel;
  }, []);

  // Trial Helper Functions
  const canStartTrial = useCallback((planType: 'basic' | 'professional'): boolean => {
    if (!subscription) return true;
    if (['basic', 'professional', 'enterprise'].includes(subscription.plan_type) && subscription.status === 'active') return false;
    if (subscription.trial_used_plans?.includes(planType)) return false;
    if (subscription.status === 'trialing') return false;
    return true;
  }, [subscription]);

  const startTrial = useCallback(async (planType: 'basic' | 'professional') => {
    if (!canStartTrial(planType)) {
      throw new Error(subscription?.trial_used_plans?.includes(planType) ? `Trial already used for ${planType}` : 'Ineligible for trial');
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const planNames = { basic: 'Basic', professional: 'Professional' };
      const now = new Date();
      const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const currentTrialUsed = subscription?.trial_used_plans || [];
      const updatedTrialUsed = Array.from(new Set([...currentTrialUsed, planType]));

      const { data: updatedSub, error } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          plan_name: planNames[planType],
          plan_type: planType,
          status: 'trialing',
          expires_at: trialEnd.toISOString(),
          renews_at: trialEnd.toISOString(),
          trial_started_at: now.toISOString(),
          trial_used_plans: updatedTrialUsed,
          authorized_token_node: `trial_${planType}_${user.id}`,
          updated_at: now.toISOString(),
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('subscription_usage').insert({
        user_id: user.id,
        period_start: now.toISOString(),
        period_end: trialEnd.toISOString(),
        documents_used: 0,
        reports_used: 0,
      });

      if (updatedSub) setSubscription(updatedSub as Subscription);
    } finally {
      setIsLoading(false);
    }
  }, [subscription, canStartTrial]);

  const isOnTrial = useCallback((): boolean => {
    return subscription?.status === 'trialing';
  }, [subscription]);

  const getTrialDaysRemaining = useCallback((): number => {
    if (subscription?.status !== 'trialing' || !subscription.expires_at) return 0;
    const now = new Date();
    const expiry = new Date(subscription.expires_at);
    const diffMs = expiry.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }, [subscription]);

  // Upgrade handler
  const upgradeSubscription = useCallback(async (
    planType: string,
    billingMode: 'monthly' | 'yearly',
    transactionId: string
  ) => {
    const planNames: Record<string, string> = {
      basic: 'Basic',
      professional: 'Professional',
      enterprise: 'Enterprise',
    };

    const days = billingMode === 'monthly' ? 30 : 365;
    const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Authentication required to upgrade');

    const mappedPlanType = (planType.toLowerCase().includes('pro') ? 'professional' : planType.toLowerCase().includes('basic') ? 'basic' : planType.toLowerCase().includes('ent') ? 'enterprise' : 'free') as 'free' | 'basic' | 'professional' | 'enterprise';
    const planName = planNames[mappedPlanType] || 'Free';

    const { data: updatedSub, error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        plan_name: planName,
        plan_type: mappedPlanType,
        status: 'active',
        expires_at: expiresAt,
        renews_at: expiresAt,
        authorized_token_node: transactionId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;

    const now = new Date();
    await supabase.from('subscription_usage').insert({
      user_id: user.id,
      period_start: now.toISOString(),
      period_end: expiresAt,
      documents_used: 0,
      reports_used: 0,
    });

    if (updatedSub) setSubscription(updatedSub as Subscription);
  }, []);

  // Usage tracking methods
  const trackDocumentUsage = useCallback(async () => {
    if (!userId) return;
    const now = new Date();
    const pStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const pEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

    const curCount = usage?.documents_used ?? 0;
    const updatedCount = curCount + 1;

    const { data } = await supabase
      .from('subscription_usage')
      .upsert({
        user_id: userId,
        period_start: pStart,
        period_end: pEnd,
        documents_used: updatedCount,
        reports_used: usage?.reports_used ?? 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,period_start' })
      .select()
      .maybeSingle();

    if (data) setUsage(data as SubscriptionUsage);
  }, [userId, usage]);

  const trackReportUsage = useCallback(async () => {
    if (!userId) return;
    const now = new Date();
    const pStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const pEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

    const curCount = usage?.reports_used ?? 0;
    const updatedCount = curCount + 1;

    const { data } = await supabase
      .from('subscription_usage')
      .upsert({
        user_id: userId,
        period_start: pStart,
        period_end: pEnd,
        documents_used: usage?.documents_used ?? 0,
        reports_used: updatedCount,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,period_start' })
      .select()
      .maybeSingle();

    if (data) setUsage(data as SubscriptionUsage);
  }, [userId, usage]);

  const currentPlanType = (subscription?.plan_type || 'free') as keyof typeof PLAN_LIMITS;
  
  const getDocumentLimit = useCallback(() => {
    return PLAN_LIMITS[currentPlanType]?.documents ?? 10;
  }, [currentPlanType]);

  const getReportLimit = useCallback(() => {
    return PLAN_LIMITS[currentPlanType]?.reports ?? 2;
  }, [currentPlanType]);

  const canCreateDocument = useCallback(() => {
    const limit = getDocumentLimit();
    if (limit === Infinity) return true;
    return (usage?.documents_used ?? 0) < limit;
  }, [getDocumentLimit, usage]);

  const canCreateReport = useCallback(() => {
    const limit = getReportLimit();
    if (limit === Infinity) return true;
    return (usage?.reports_used ?? 0) < limit;
  }, [getReportLimit, usage]);

  const refreshSubscription = useCallback(async () => {
    if (userId) await fetchSubscriptionData(userId);
  }, [userId, fetchSubscriptionData]);

  // Auth Initialization & Window Focus Listeners
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
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        setUserId(session.user.id);
        fetchSubscriptionData(session.user.id);
        setupRealtimeSync(session.user.id);
      }
      if (event === 'SIGNED_OUT') {
        setSubscription(null);
        setUsage(null);
        setUserId(null);
        setIsLoading(false);
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      }
    });

    const handleFocus = () => {
      checkAndExpireTrials();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      authListener.unsubscribe();
      window.removeEventListener('focus', handleFocus);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchSubscriptionData, setupRealtimeSync, checkAndExpireTrials]);

  const rawKey = (subscription?.plan_type || subscription?.plan_name || 'free').toLowerCase();
  const planKey = (rawKey.includes('pro') ? 'professional' : rawKey.includes('basic') ? 'basic' : rawKey.includes('ent') ? 'enterprise' : 'free') as 'free' | 'basic' | 'professional' | 'enterprise';
  const isActive = subscription ? (subscription.status === 'active' || subscription.status === 'trialing') : false;

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      usage,
      isLoading,
      isSyncing,
      isRealtimeSyncing: isSyncing,
      isActive,
      planKey,
      upgradeSubscription,
      refreshSubscription,
      refetch: refreshSubscription,
      trackDocumentUsage,
      trackReportUsage,
      getDocumentLimit,
      getReportLimit,
      canCreateDocument,
      canCreateReport,
      startTrial,
      canStartTrial,
      isOnTrial,
      getTrialDaysRemaining,
      checkAndExpireTrials,
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
