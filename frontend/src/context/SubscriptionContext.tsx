'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { emitNotification } from '../lib/notifications';

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
    report_limit: 1,
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
  free:         { documents: 10,       reports: 1   },
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
  user_email?: string | null;
  user_phone?: string | null;
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
  trackDocumentUsage: () => Promise<boolean>;
  trackReportUsage: () => Promise<boolean>;
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

  // FIX 4: fetchCurrentUsage — use UPSERT/single row logic with diagnostic logging
  const fetchCurrentUsage = useCallback(async (uid: string): Promise<SubscriptionUsage | null> => {
    try {
      const now = new Date().toISOString();

      console.log('[Usage Debug] All usage rows for user:', uid);
      const { data: allRows } = await supabase
        .from('subscription_usage')
        .select('*')
        .eq('user_id', uid)
        .order('period_start', { ascending: false });
      console.log('[Usage Debug] All rows:', JSON.stringify(allRows, null, 2));

      // Get the single most recent active row
      const { data, error } = await supabase
        .from('subscription_usage')
        .select('*')
        .eq('user_id', uid)
        .gte('period_end', now)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[fetchCurrentUsage] Error:', error);
        return null;
      }

      console.log('[Usage Debug] Selected row:', JSON.stringify(data, null, 2));

      if (data) {
        console.log('[fetchCurrentUsage] Found row:', data.id, 
          'docs:', data.documents_used, 'reports:', data.reports_used);
        return data as SubscriptionUsage;
      }

      // No active row — create exactly one
      console.log('[fetchCurrentUsage] No active row, creating new period');
      const periodStart = new Date();
      const periodEnd = new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);

      const { data: newRow, error: insertErr } = await supabase
        .from('subscription_usage')
        .insert({
          user_id: uid,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          documents_used: 0,
          reports_used: 0,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertErr) {
        console.error('[fetchCurrentUsage] Insert error:', insertErr);
        // If duplicate key error, fetch what's there
        if (insertErr.code === '23505') {
          const { data: existing } = await supabase
            .from('subscription_usage')
            .select('*')
            .eq('user_id', uid)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          return existing as SubscriptionUsage;
        }
        return null;
      }

      return newRow as SubscriptionUsage;
    } catch (err) {
      console.error('[fetchCurrentUsage] Exception:', err);
      return null;
    }
  }, []);

  // FIX 6: refreshSubscription must always re-fetch usage
  const refreshSubscription = useCallback(async () => {
    if (!userId) return;
    try {
      const { data: sub, error: subErr } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!subErr && sub) setSubscription(sub as Subscription);

      const usageData = await fetchCurrentUsage(userId);
      if (usageData) {
        console.log('[refreshSubscription] Usage refreshed:', {
          documents: usageData.documents_used,
          reports: usageData.reports_used,
        });
        setUsage(usageData);
      }
    } catch (err) {
      console.error('[refreshSubscription] Error:', err);
    }
  }, [userId, fetchCurrentUsage]);

  const fetchSubscriptionData = useCallback(async (uid: string) => {
    try {
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle();

      let activeSub = subData as Subscription | null;

      if (!activeSub) {
        const { data: { user } } = await supabase.auth.getUser();
        const defaultSubPayload = {
          user_id: uid,
          user_email: user?.email || null,
          user_phone: user?.phone || null,
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

      const activeUsage = await fetchCurrentUsage(uid);
      setUsage(activeUsage);
    } catch (err) {
      console.error('[SubscriptionContext] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchCurrentUsage]);

  // Trial expiry check
  const checkAndExpireTrials = useCallback(async () => {
    if (!subscription || subscription.status !== 'trialing') return;
    const now = new Date();
    if (!subscription.expires_at || now <= new Date(subscription.expires_at)) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('subscriptions').upsert({
        user_id: user.id,
        plan_name: 'Free',
        plan_type: 'free',
        status: 'expired',
        expires_at: subscription.expires_at,
        updated_at: now.toISOString(),
        trial_used_plans: subscription.trial_used_plans,
      }, { onConflict: 'user_id' });

      await refreshSubscription();
    } catch (e) {
      console.error('[Trial Expiry Error]', e);
    }
  }, [subscription, refreshSubscription]);

  // FIX 5: Realtime listener for subscription_usage with distinct UPDATE and INSERT event listeners
  useEffect(() => {
    if (!userId) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;
    let retryCount = 0;
    const MAX_RETRIES = 5;

    const setupChannel = () => {
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }

      const channelName = `sub-${userId}-${Date.now()}`;
      console.log('[Realtime] Setting up channel:', channelName);

      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'subscriptions',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            console.log('[Realtime] Subscription change received:', payload);
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              setSubscription(payload.new as Subscription);
            }
            if (payload.eventType === 'DELETE') {
              refreshSubscription();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'subscription_usage',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const newUsage = payload.new as SubscriptionUsage;
            console.log('[Realtime] Usage sync received:', {
              id: newUsage.id,
              documents_used: newUsage.documents_used,
              reports_used: newUsage.reports_used,
            });
            if (!usage || newUsage.id === usage.id || newUsage.user_id === userId) {
              setUsage(newUsage);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'subscription_usage',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            console.log('[Realtime] Usage INSERT received:', payload.new);
            if (payload.new && (payload.new as any).user_id === userId) {
              setUsage(payload.new as SubscriptionUsage);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'subscription_usage',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            fetchCurrentUsage(userId).then(u => { if (u) setUsage(u); });
          }
        )
        .subscribe((status, err) => {
          console.log('[Realtime] Status:', status, 'Error:', err);

          if (status === 'SUBSCRIBED') {
            setIsSyncing(false);
            retryCount = 0;
            console.log('[Realtime] ✅ Connected successfully');
          }

          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setIsSyncing(true);
            console.warn('[Realtime] ⚠️ Connection issue:', status);
            if (retryCount < MAX_RETRIES) {
              retryCount++;
              const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
              console.log(`[Realtime] Retrying in ${delay}ms (attempt ${retryCount})`);
              retryTimeout = setTimeout(setupChannel, delay);
            }
          }

          if (status === 'CLOSED') {
            setIsSyncing(true);
            console.warn('[Realtime] Channel closed');
          }
        });
    };

    setIsSyncing(true);
    setupChannel();

    const handleFocus = async () => {
      console.log('[Sync] Window focused — refreshing subscription');
      await refreshSubscription();
      checkAndExpireTrials();
    };

    const handleOnline = () => {
      console.log('[Sync] Network restored — reconnecting realtime');
      setupChannel();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Sync] Tab became visible — force refreshing usage');
        refreshSubscription();
      }
    };

    const pollInterval = setInterval(() => {
      fetchCurrentUsage(userId).then(u => { if (u) setUsage(u); });
    }, 10000); // 10 seconds for usage sync

    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      console.log('[Realtime] Cleaning up channel');
      if (channel) supabase.removeChannel(channel);
      if (retryTimeout) clearTimeout(retryTimeout);
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId, refreshSubscription, checkAndExpireTrials, fetchCurrentUsage]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        fetchSubscriptionData(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        setUserId(session.user.id);
        fetchSubscriptionData(session.user.id);
      }
      if (event === 'SIGNED_OUT') {
        setSubscription(null);
        setUsage(null);
        setUserId(null);
        setIsLoading(false);
      }
    });

    return () => {
      authListener.unsubscribe();
    };
  }, [fetchSubscriptionData]);

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
          user_email: user.email || null,
          user_phone: user.phone || null,
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
        user_email: user.email || null,
        user_phone: user.phone || null,
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

  // FIX 2: trackDocumentUsage — write to Supabase, never local state
  const trackDocumentUsage = useCallback(async (): Promise<boolean> => {
    if (!userId) {
      console.error('[trackDocumentUsage] No userId');
      return false;
    }

    // Always fetch fresh usage row first — never trust local state for limits
    const freshUsage = await fetchCurrentUsage(userId);
    if (!freshUsage) {
      console.error('[trackDocumentUsage] No usage row found');
      return false;
    }

    const planType = (subscription?.plan_type || 'free') as keyof typeof PLAN_LIMITS;
    const limit = PLAN_LIMITS[planType].documents;

    console.log('[trackDocumentUsage] Current:', freshUsage.documents_used, '/ Limit:', limit);

    if (freshUsage.documents_used >= limit) {
      emitNotification('Document Limit Reached', `You have used ${freshUsage.documents_used}/${limit} documents. Upgrade to create more.`, 'error');
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('subscription_usage')
        .update({
          documents_used: freshUsage.documents_used + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', freshUsage.id)
        .select()
        .single();

      if (error) {
        console.error('[trackDocumentUsage] Supabase error:', error);
        throw error;
      }

      console.log('[trackDocumentUsage] Updated to:', data.documents_used);
      setUsage(data as SubscriptionUsage);
      return true;
    } catch (err: any) {
      console.error('[trackDocumentUsage] Failed:', err);
      emitNotification('Usage Error', 'Failed to track usage', 'error');
      return false;
    }
  }, [userId, subscription, fetchCurrentUsage]);

  // FIX 3: trackReportUsage — exact same pattern
  const trackReportUsage = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    const freshUsage = await fetchCurrentUsage(userId);
    if (!freshUsage) return false;

    const planType = (subscription?.plan_type || 'free') as keyof typeof PLAN_LIMITS;
    const limit = PLAN_LIMITS[planType].reports;

    if (freshUsage.reports_used >= limit) {
      emitNotification('Report Limit Reached', `You have used ${freshUsage.reports_used}/${limit} reports. Upgrade to generate more.`, 'error');
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('subscription_usage')
        .update({
          reports_used: freshUsage.reports_used + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', freshUsage.id)
        .select()
        .single();

      if (error) throw error;

      setUsage(data as SubscriptionUsage);
      return true;
    } catch (err: any) {
      console.error('[trackReportUsage] Failed:', err);
      emitNotification('Usage Error', 'Failed to track usage', 'error');
      return false;
    }
  }, [userId, subscription, fetchCurrentUsage]);

  const currentPlanType = (subscription?.plan_type || 'free') as keyof typeof PLAN_LIMITS;
  
  const getDocumentLimit = useCallback(() => {
    return PLAN_LIMITS[currentPlanType]?.documents ?? 10;
  }, [currentPlanType]);

  const getReportLimit = useCallback(() => {
    return PLAN_LIMITS[currentPlanType]?.reports ?? 1;
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
