'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { emitNotification } from '../lib/notifications';
import { validateSubscriptionPayload, getExpiryDisplay, ExpiryDisplayInfo } from '../lib/subscriptionUtils';

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
  upgradeSubscription: (planType: string, billingMode: 'monthly' | 'yearly', transactionId: string) => Promise<Subscription>;
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
  getExpiryDisplayInfo: () => ExpiryDisplayInfo;
  getExpiryLabel: (sub: Subscription) => string;
}

export const getExpiryLabel = (sub: Subscription | null): string => {
  return getExpiryDisplay(sub).value;
};

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<SubscriptionUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const isUpgradingRef = useRef(false);

  const isUpgradeLocked = (uid: string | null): boolean => {
    if (!uid) return false;
    const lockKey = `upgrade_lock_${uid}`;
    const lockTime = typeof window !== 'undefined' ? localStorage.getItem(lockKey) : null;
    if (lockTime && Date.now() - parseInt(lockTime) < 10000) {
      console.warn('[LOCK] Upgrade lock active for user:', uid);
      return true;
    }
    return false;
  };

  const refreshSubscription = useCallback(async () => {
    if (!userId) return;
    if (isUpgradingRef.current || isUpgradeLocked(userId)) {
      console.log('[Refresh] Blocked — upgrade in progress / lock active');
      return;
    }
    try {
      const [subResult, usageResult] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('subscription_usage')
          .select('*')
          .eq('user_id', userId)
          .gte('period_end', new Date().toISOString())
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (subResult.data) {
        const validatedSub = validateSubscriptionPayload({ ...subResult.data });
        console.log('[Refresh] Subscription:', validatedSub.plan_name, validatedSub.expires_at);
        setSubscription(validatedSub as Subscription);
      }

      if (usageResult.data) {
        console.log('[Refresh] Usage:', usageResult.data.documents_used, usageResult.data.reports_used);
        setUsage({ ...usageResult.data } as SubscriptionUsage);
      }
    } catch (err) {
      console.error('[refreshSubscription] Error:', err);
    }
  }, [userId]);

  useEffect(() => {
    const initializeSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        setUserId(user.id);

        if (isUpgradingRef.current || isUpgradeLocked(user.id)) {
          console.log('[Init] Blocked — upgrade in progress / lock active');
          setIsLoading(false);
          return;
        }

        setIsLoading(true);

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (sub) {
          const validatedSub = validateSubscriptionPayload({ ...sub });
          console.log('[Init] Fresh subscription from DB:', validatedSub.plan_name, validatedSub.expires_at);
          setSubscription(validatedSub as Subscription);
        } else {
          // GUARD against overwriting paid plan
          if (isUpgradeLocked(user.id)) {
            console.warn('[Init] Blocked Free plan creation — upgrade lock active for user:', user.id);
          } else {
            const { data: currentSub } = await supabase
              .from('subscriptions')
              .select('plan_type, status')
              .eq('user_id', user.id)
              .maybeSingle();

            if (currentSub && ['basic', 'professional', 'enterprise'].includes(currentSub.plan_type) && currentSub.status === 'active') {
              console.warn('[Init] Blocked Free plan overwrite — user has active paid plan:', currentSub.plan_type);
            } else {
              console.log('[Init] No subscription found — creating Free starter');
              const freePayload = validateSubscriptionPayload({
                user_id: user.id,
                plan_name: 'Free',
                plan_type: 'free',
                status: 'active',
                expires_at: null,
                renews_at: null,
                updated_at: new Date().toISOString(),
              });

              const { data: createdSub } = await supabase
                .from('subscriptions')
                .upsert(freePayload, { onConflict: 'user_id' })
                .select()
                .single();

              if (createdSub) setSubscription(validateSubscriptionPayload(createdSub) as Subscription);
            }
          }
        }

        const now = new Date().toISOString();
        const { data: usageData } = await supabase
          .from('subscription_usage')
          .select('*')
          .eq('user_id', user.id)
          .gte('period_end', now)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (usageData) {
          console.log('[Init] Fresh usage:', usageData.documents_used, usageData.reports_used);
          setUsage({ ...usageData } as SubscriptionUsage);
        } else {
          const periodStart = new Date();
          const periodEnd = new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);
          const { data: newUsage } = await supabase
            .from('subscription_usage')
            .insert({
              user_id: user.id,
              period_start: periodStart.toISOString(),
              period_end: periodEnd.toISOString(),
              documents_used: 0,
              reports_used: 0,
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();
          if (newUsage) setUsage({ ...newUsage } as SubscriptionUsage);
        }
      } catch (err) {
        console.error('[Init] Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSubscription();
  }, []);

  const checkAndExpireTrials = useCallback(async () => {
    if (!subscription) return;
    
    if (subscription.status === 'active' && subscription.plan_type !== 'free') {
      console.log('[ExpireCheck] Active paid plan — skipping expiry check:', subscription.plan_type);
      return;
    }
    
    if (subscription.status !== 'trialing') {
      console.log('[ExpireCheck] Not trialing — skipping:', subscription.status);
      return;
    }
    
    const now = new Date();
    if (!subscription.expires_at || now <= new Date(subscription.expires_at)) {
      console.log('[ExpireCheck] Trial still active — skipping expiry');
      return;
    }

    console.log('[ExpireCheck] Trial expired — downgrading to free');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (isUpgradeLocked(user.id)) {
        console.warn('[ExpireCheck] Skipping trial expiry downgrade — upgrade lock active for user:', user.id);
        return;
      }

      const expiredPayload = validateSubscriptionPayload({
        user_id: user.id,
        plan_name: 'Free',
        plan_type: 'free',
        status: 'expired',
        expires_at: null,
        renews_at: null,
        updated_at: now.toISOString(),
        trial_used_plans: subscription.trial_used_plans,
      });

      await supabase.from('subscriptions').upsert(expiredPayload, { onConflict: 'user_id' });
      await refreshSubscription();
    } catch (e) {
      console.error('[Trial Expiry Error]', e);
    }
  }, [subscription, refreshSubscription]);

  useEffect(() => {
    if (!userId) return;

    console.log('[Realtime] Setting up channel for userId:', userId);

    const channel = supabase
      .channel(`makinvoices-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (isUpgradingRef.current || isUpgradeLocked(userId)) {
            console.log('[Realtime] Subscription UPDATE received but blocked by upgrade lock');
            return;
          }
          const validated = validateSubscriptionPayload({ ...payload.new });
          console.log('[Realtime] Subscription UPDATE received:', {
            plan: validated.plan_name,
            expires: validated.expires_at,
            status: validated.status,
          });
          setSubscription(validated as Subscription);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (isUpgradingRef.current || isUpgradeLocked(userId)) {
            console.log('[Realtime] Subscription INSERT received but blocked by upgrade lock');
            return;
          }
          const validated = validateSubscriptionPayload({ ...payload.new });
          console.log('[Realtime] Subscription INSERT received:', validated);
          setSubscription(validated as Subscription);
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
          console.log('[Realtime] Usage UPDATE received:', {
            documents: (payload.new as any).documents_used,
            reports: (payload.new as any).reports_used,
          });
          setUsage({ ...payload.new } as SubscriptionUsage);
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
          setUsage({ ...payload.new } as SubscriptionUsage);
        }
      )
      .subscribe((status, err) => {
        console.log('[Realtime] Status:', status, err || '');
        setIsSyncing(status !== 'SUBSCRIBED');

        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] ✅ Listening for changes on userId:', userId);
          refreshSubscription();
        }
      });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Sync] Tab visible — refreshing');
        refreshSubscription();
      }
    };

    const handleFocus = () => {
      console.log('[Sync] Window focused — refreshing');
      refreshSubscription();
    };

    const handleOnline = () => {
      console.log('[Sync] Back online — refreshing');
      refreshSubscription();
    };

    const poll = setInterval(refreshSubscription, 15000);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      console.log('[Realtime] Removing channel for userId:', userId);
      supabase.removeChannel(channel);
      clearInterval(poll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [userId, refreshSubscription]);

  useEffect(() => {
    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        console.log('[Auth] Auth state event:', event, 'userId:', session.user.id);
        setUserId(session.user.id);

        if (isUpgradeLocked(session.user.id)) {
          console.warn('[Auth] Skipping Free plan check — upgrade lock active for user:', session.user.id);
          refreshSubscription();
          return;
        }

        const { data: currentSub } = await supabase
          .from('subscriptions')
          .select('plan_type, status, plan_name')
          .eq('user_id', session.user.id)
          .maybeSingle();

        console.log('[Auth] Current DB subscription:', currentSub?.plan_name, currentSub?.status);

        if (!currentSub) {
          console.log('[Auth] New user — creating Free starter subscription');
          const freePayload = validateSubscriptionPayload({
            user_id: session.user.id,
            plan_name: 'Free',
            plan_type: 'free',
            status: 'active',
            expires_at: null,
            renews_at: null,
            updated_at: new Date().toISOString(),
          });
          await supabase.from('subscriptions').upsert(freePayload, { onConflict: 'user_id' });
        }
        refreshSubscription();
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
  }, [refreshSubscription]);

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

    isUpgradingRef.current = true;
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const lockKey = `upgrade_lock_${user.id}`;
      localStorage.setItem(lockKey, Date.now().toString());

      const planNames = { basic: 'Basic', professional: 'Professional' };
      const now = new Date();
      const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const currentTrialUsed = subscription?.trial_used_plans || [];
      const updatedTrialUsed = Array.from(new Set([...currentTrialUsed, planType]));

      const trialPayload = validateSubscriptionPayload({
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
      });

      const { error } = await supabase
        .from('subscriptions')
        .upsert(trialPayload, { onConflict: 'user_id' });

      if (error) throw error;

      const { data: verifiedSub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      await supabase.from('subscription_usage').insert({
        user_id: user.id,
        period_start: now.toISOString(),
        period_end: trialEnd.toISOString(),
        documents_used: 0,
        reports_used: 0,
      });

      if (verifiedSub) setSubscription(validateSubscriptionPayload(verifiedSub) as Subscription);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        isUpgradingRef.current = false;
        if (userId) localStorage.removeItem(`upgrade_lock_${userId}`);
        console.log('[Trial] Lock released — normal sync resumed');
      }, 10000);
    }
  }, [subscription, canStartTrial, userId]);

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

  // FIX: upgradeSubscription with distributed localStorage lock + double verification loop
  const upgradeSubscription = useCallback(async (
    planType: string,
    billingMode: 'monthly' | 'yearly',
    transactionId: string
  ): Promise<Subscription> => {
    isUpgradingRef.current = true;
    setIsLoading(true);

    const planNames: Record<string, string> = {
      basic: 'Basic',
      professional: 'Professional',
      enterprise: 'Enterprise',
    };
    const prices: Record<string, { monthly: number; yearly: number }> = {
      basic: { monthly: 199, yearly: 1990 },
      professional: { monthly: 299, yearly: 2990 },
      enterprise: { monthly: 599, yearly: 5990 },
    };

    let userObjId = '';

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      userObjId = user.id;

      const lockKey = `upgrade_lock_${user.id}`;
      localStorage.setItem(lockKey, Date.now().toString());

      const mappedPlanType = (planType.toLowerCase().includes('pro') ? 'professional' : planType.toLowerCase().includes('basic') ? 'basic' : planType.toLowerCase().includes('ent') ? 'enterprise' : 'free') as 'free' | 'basic' | 'professional' | 'enterprise';
      const planName = planNames[mappedPlanType] || 'Free';

      const days = billingMode === 'monthly' ? 30 : 365;
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

      const upgradePayload = validateSubscriptionPayload({
        user_id: user.id,
        user_email: user.email || null,
        user_phone: user.phone || null,
        plan_name: planName,
        plan_type: mappedPlanType,
        status: 'active',
        expires_at: mappedPlanType === 'free' ? null : expiresAt,
        renews_at: mappedPlanType === 'free' ? null : expiresAt,
        authorized_token_node: transactionId || `manual_${mappedPlanType}_${Date.now()}`,
        updated_at: new Date().toISOString(),
      });

      console.log('[Upgrade] Writing to DB:', upgradePayload);

      const { error: upsertError } = await supabase
        .from('subscriptions')
        .upsert(upgradePayload, { onConflict: 'user_id' });

      if (upsertError) {
        console.error('[Upgrade] Upsert failed:', upsertError);
        throw upsertError;
      }

      // Wait 500ms then verify DB write
      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: verified, error: verifyError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      console.log('[Upgrade] DB verification result:', verified?.plan_name, verified?.plan_type);

      if (verifyError || !verified || verified.plan_type !== mappedPlanType) {
        console.error('[Upgrade] DB was overwritten or unverified! Re-writing paid plan...');
        await supabase
          .from('subscriptions')
          .upsert({
            ...upgradePayload,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        const { data: verified2 } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (!verified2 || verified2.plan_type !== mappedPlanType) {
          throw new Error(
            `Upgrade failed: DB shows ${verified2?.plan_type} instead of ${mappedPlanType}. ` +
            `Another process is overwriting the subscription.`
          );
        }
      }

      const finalSub = verified || upgradePayload;
      console.log('[Upgrade] ✅ Verified in DB:', finalSub.plan_name);

      setSubscription({ ...finalSub } as Subscription);

      const now = new Date();
      await supabase.from('subscription_usage').insert({
        user_id: user.id,
        period_start: now.toISOString(),
        period_end: mappedPlanType === 'free' ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() : expiresAt,
        documents_used: 0,
        reports_used: 0,
      });

      emitNotification(
        `✅ Upgraded to ${planName}!`,
        `Active on all your devices. ₹${prices[mappedPlanType]?.[billingMode] || 0}/${billingMode === 'monthly' ? 'mo' : 'yr'}`,
        'success'
      );

      return finalSub as Subscription;
    } catch (err: any) {
      console.error('[Upgrade] Failed:', err);
      emitNotification('Upgrade Failed', err.message || 'Payment upgrade failed', 'error');
      throw err;
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        isUpgradingRef.current = false;
        if (userObjId) localStorage.removeItem(`upgrade_lock_${userObjId}`);
        console.log('[Upgrade] Lock released — normal sync resumed');
      }, 10000);
    }
  }, []);

  const trackDocumentUsage = useCallback(async (): Promise<boolean> => {
    if (!userId) {
      console.error('[trackDocumentUsage] No userId');
      return false;
    }

    const { data: freshUsage } = await supabase
      .from('subscription_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('period_end', new Date().toISOString())
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!freshUsage) {
      console.error('[trackDocumentUsage] No usage row found');
      return false;
    }

    const planType = (subscription?.plan_type || 'free') as keyof typeof PLAN_LIMITS;
    const limit = PLAN_LIMITS[planType].documents;

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

      if (error) throw error;

      setUsage({ ...data } as SubscriptionUsage);
      return true;
    } catch (err: any) {
      console.error('[trackDocumentUsage] Failed:', err);
      emitNotification('Usage Error', 'Failed to track usage', 'error');
      return false;
    }
  }, [userId, subscription]);

  const trackReportUsage = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    const { data: freshUsage } = await supabase
      .from('subscription_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('period_end', new Date().toISOString())
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

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

      setUsage({ ...data } as SubscriptionUsage);
      return true;
    } catch (err: any) {
      console.error('[trackReportUsage] Failed:', err);
      emitNotification('Usage Error', 'Failed to track usage', 'error');
      return false;
    }
  }, [userId, subscription]);

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
      getExpiryDisplayInfo: () => getExpiryDisplay(subscription),
      getExpiryLabel: (sub: Subscription) => getExpiryDisplay(sub).value,
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
