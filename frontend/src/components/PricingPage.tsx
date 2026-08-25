"use client";
import React, { useState, useEffect } from 'react';
import { initializePaddle, Paddle } from '@paddle/paddle-js';
import { supabase } from '../lib/supabase';
import { detectRegion, Region } from '../lib/detectRegion';
import { openRazorpayCheckout } from '../lib/razorpay';
import { openPaddleCheckout } from '../lib/paddle';

// Throw error early if environment variables are not set
const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
const environment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT;

if (typeof window !== 'undefined') {
  if (!clientToken) {
    console.warn("WARNING: NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is not defined in environment variables. Billing will be disabled.");
  }
  if (!environment) {
    console.warn("WARNING: NEXT_PUBLIC_PADDLE_ENVIRONMENT is not defined in environment variables. Billing will be disabled.");
  }
}

// Razorpay Plan IDs mapping (IN)
const RAZORPAY_PLANS: Record<string, { month: string; year: string }> = {
  Basic:        { month: 'plan_TTYzsswVwujxKt', year: 'plan_TTYufWiv5d4Wgr' },
  Professional: { month: 'plan_TTVnnkJbV6uJzV', year: 'plan_TTZ0rGDnrTGzzY' },
  Enterprise:   { month: 'plan_TTVo4PRW1GLArc', year: 'plan_TTZ1RFdtad3jTU' },
};

const RAZORPAY_ONETIME_AMOUNTS: Record<string, number> = {
  Basic:        199000,
  Professional: 299000,
  Enterprise:   599000,
};

const PADDLE_ONETIME_PRICE_IDS: Record<string, string> = {
  Basic:        'pri_01m0spr05d2b6hp8ydn7a1xw9q',
  Professional: 'pri_01m0sprheegr518xmewcgzzsag',
  Enterprise:   'pri_01m0sprwjefcfy06c1m9gkvx2d',
};

export interface Tier {
  name: 'Starter' | 'Basic' | 'Professional' | 'Enterprise';
  description: string;
  features: string[];
  fallbackPrice: { month: string; year: string };
  priceId: { month: string; year: string };
}

interface PricingPageProps {
  theme: 'light' | 'dark';
  onNavigate?: (path: string) => void;
  onGoogleLogin?: () => void;
  country?: string;
}

const TIERS: Tier[] = [
  {
    name: 'Starter',
    description: 'Get started at zero cost. Essential billing and ledger tools.',
    fallbackPrice: { month: '₹0', year: '₹0' },
    features: [
      'Sales & Purchase Ledger Full Access',
      'WhatsApp & Email Sharing, PDF Export, Payment Recording',
      'Interactive Editable Document Builder & Billing Dashboard',
      'Expenses Tracker',
      '1 Accounting Report / month',
      '10 Documents / month total quota',
      'Client, Vendor, HSN, Transport & Catalog Databases',
      'System Preset Templates & Auto UPI QR Code',
      'Dark and Light Theme Mode Toggle',
    ],
    priceId: {
      month: 'pri_starter_m',
      year: 'pri_starter_y',
    },
  },
  {
    name: 'Basic',
    description: 'Perfect for freelancers & growing businesses scaling billing operations.',
    fallbackPrice: { month: '₹199', year: '₹1,990' },
    features: [
      '60 Documents / month total quota',
      '5 Accounting Reports / month',
      'Bulk Database Management for All Registries',
      'Create Own Custom Simple & Advanced Templates',
      'Bulk Ledger Actions for Payments, Deletion & CSV Exports',
      'Personalised Company Logo & Signature',
      'Personalised Watermark & Watermark Removal',
      'Duplicate Document & Convert Document Types',
      'Full Sales & Purchase Ledger Capabilities',
      'Interactive Document Builder & Expenses Tracker',
      'Auto UPI Payment QR & Dark/Light Mode',
    ],
    priceId: {
      month: 'pri_01m0se11wgk2dkv2cpw0jqqm60',
      year: 'pri_01m0sm1fx442c92zf4fv6fpxdf',
    },
  },
  {
    name: 'Professional',
    description: 'Advanced automation, AI smart billing, and higher monthly limits.',
    fallbackPrice: { month: '₹299', year: '₹2,990' },
    features: [
      '140 Documents / month total quota',
      '15 Accounting Reports / month',
      'AI Smart Billing Feature with Gemini Parsing',
      '24*7 Dedicated MakInvoices AI Assistant Support',
      'Automated Recurring Invoice Scheduler',
      'Bulk Database Management & Bulk Ledger Actions',
      'Create Own Custom Simple & Advanced Templates',
      'Personalised Logo, Signature & Watermark Removal',
      'Duplicate Existing Documents & Document Converter',
      'Full Sales & Purchase Ledger Capabilities',
      'Interactive Document Builder & Expenses Tracker',
    ],
    priceId: {
      month: 'pri_01m0secg547pq6vzf9deyw7cpq',
      year: 'pri_01m0sm25kycrwxwb8tz4xad7zd',
    },
  },
  {
    name: 'Enterprise',
    description: 'Unlimited scale and dedicated support for high-volume operations.',
    fallbackPrice: { month: '₹599', year: '₹5,990' },
    features: [
      'Unlimited Monthly Documents Quota',
      'Unlimited Accounting Reports / month',
      'Priority 24/7 VIP Support & Service Level Agreement',
      'Dedicated Account Manager & Custom Onboarding',
      'AI Smart Billing & 24/7 MakInvoices AI Assistant Support',
      'Automated Recurring Invoice Scheduler',
      'Bulk Database Management & Bulk Ledger Actions',
      'Create Own Custom Simple & Advanced Templates',
      'Personalised Logo, Signature & Watermark',
      'Duplicate Existing Documents & Document Converter',
      'Full Sales & Purchase Ledger Capabilities',
    ],
    priceId: {
      month: 'pri_01m0sefvjdvda8fa0kgw7j4h7f',
      year: 'pri_01m0sm2zqrnvp5jzzg136c41q4',
    },
  },
];

const FAQS = [
  {
    q: 'Can I upgrade or downgrade at any time?',
    a: 'Absolutely. You can switch plans at any time. Upgrades are prorated; downgrades take effect at the end of your billing cycle.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept credit cards, debit cards, PayPal, and Apple Pay through our secure integration with Paddle.',
  },
  {
    q: 'Does the annual plan auto-renew?',
    a: 'Yes — annual plans auto-renew at the end of the year. You can cancel anytime from your subscription settings before the renewal date.',
  },
  {
    q: 'Is my data encrypted and secure?',
    a: 'All data is protected with AES-256 encryption in transit and at rest. We are GDPR and India DPDP Act compliant.',
  },
];

export default function PricingPage({ theme, onNavigate, country }: PricingPageProps) {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [yearlySubMode, setYearlySubMode] = useState<Record<string, 'yearly_recurring' | 'yearly_onetime'>>({
    Basic: 'yearly_recurring',
    Professional: 'yearly_recurring',
    Enterprise: 'yearly_recurring',
  });
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [paddle, setPaddle] = useState<Paddle | undefined>(undefined);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [region, setRegion] = useState<Region | null>(null);
  const [isDetectingRegion, setIsDetectingRegion] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({});

  const toggleExpandPlan = (name: string) => {
    setExpandedPlans((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleNavigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.href = path;
    }
  };

  // Get user details
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserEmail(session.user.email);
        setUserId(session.user.id);
      }
    });
  }, []);

  // Detect Region (IN vs INTL) on mount
  useEffect(() => {
    let mounted = true;
    setIsDetectingRegion(true);

    import('../lib/detectRegion').then(({ getUserRegion }) => {
      getUserRegion()
        .then((detRegion) => {
          if (mounted) {
            setRegion(detRegion);
            setIsDetectingRegion(false);
          }
        })
        .catch(() => {
          if (mounted) {
            setRegion('INTL');
            setIsDetectingRegion(false);
          }
        });
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Initialize Paddle JS if International
  useEffect(() => {
    if (region === 'IN') return;

    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || 'live_0b8c91040964a20151647bd285b';
    const env = (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT as 'sandbox' | 'production') || 'production';

    initializePaddle({
      environment: env,
      token: token,
    }).then((instance) => {
      if (instance) {
        setPaddle(instance);
      }
    });
  }, [region]);

  // Fetch localized Paddle prices for INTL
  useEffect(() => {
    if (region === 'IN' || !paddle) {
      setLoadingPrices(false);
      return;
    }

    setLoadingPrices(true);
    const items = TIERS.flatMap((t) => [
      { priceId: t.priceId.month, quantity: 1 },
      { priceId: t.priceId.year, quantity: 1 },
    ]).filter((item) => Boolean(item.priceId && item.priceId.startsWith('pri_') && item.priceId.length > 15));

    if (items.length === 0) {
      setLoadingPrices(false);
      return;
    }

    paddle
      .PricePreview({
        items,
        address: country ? { countryCode: country } : undefined,
      })
      .then((preview) => {
        const priceMap: Record<string, string> = {};
        if (preview?.data?.details?.lineItems) {
          preview.data.details.lineItems.forEach((item: any) => {
            if (item?.price?.id && item?.formattedTotals?.total) {
              priceMap[item.price.id] = item.formattedTotals.total;
            }
          });
        }
        setPrices(priceMap);
        setLoadingPrices(false);
      })
      .catch(() => {
        setLoadingPrices(false);
      });
  }, [paddle, country, region]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSubscribe = async (tier: Tier) => {
    if (tier.name === 'Starter') {
      handleNavigate('/signup');
      return;
    }

    if (!userEmail || !userId) {
      // Save intent so subscription page can resume after login
      try {
        const selectedMode = billing === 'annual'
          ? (yearlySubMode[tier.name] || 'yearly_recurring')
          : 'monthly';
        localStorage.setItem('mak_selected_plan_intent', JSON.stringify({
          tier: tier.name.toLowerCase(),
          billing,
          mode: selectedMode,
        }));
      } catch {}
      handleNavigate('/login');
      return;
    }

    const selectedMode: 'monthly' | 'yearly_recurring' | 'yearly_onetime' =
      billing === 'annual'
        ? (yearlySubMode[tier.name] || 'yearly_recurring')
        : 'monthly';

    setProcessingPlan(tier.name);

    try {
      if (region === 'IN') {
        // ── RAZORPAY ──────────────────────────────────────────
        if (selectedMode === 'yearly_onetime') {
          // One-time yearly: use Orders API
          const res = await fetch('/api/payments/razorpay/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: RAZORPAY_ONETIME_AMOUNTS[tier.name],
              plan: tier.name.toLowerCase(),
              mode: selectedMode,
              userId,
            }),
          });
          const { order_id } = await res.json();

          openRazorpayCheckout({
            orderId: order_id,
            amount: RAZORPAY_ONETIME_AMOUNTS[tier.name],
            email: userEmail,
            plan: tier.name,
            mode: selectedMode,
            onSuccess: () => handleNavigate('/dashboard?upgraded=1'),
            onError: () => setProcessingPlan(null),
          });

        } else {
          // Monthly or yearly recurring: use Subscriptions API
          const planId = billing === 'annual'
            ? RAZORPAY_PLANS[tier.name].year
            : RAZORPAY_PLANS[tier.name].month;

          const res = await fetch('/api/payments/razorpay/create-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planId, plan: tier.name.toLowerCase(), mode: selectedMode, userId }),
          });
          const { subscription_id } = await res.json();

          openRazorpayCheckout({
            subscriptionId: subscription_id,
            email: userEmail,
            plan: tier.name,
            mode: selectedMode,
            onSuccess: () => handleNavigate('/dashboard?upgraded=1'),
            onError: () => setProcessingPlan(null),
          });
        }

      } else {
        // ── PADDLE ────────────────────────────────────────────
        if (!paddle) {
          console.error('Paddle not initialized');
          setProcessingPlan(null);
          return;
        }

        const priceId = selectedMode === 'yearly_onetime'
          ? PADDLE_ONETIME_PRICE_IDS[tier.name]
          : billing === 'annual'
            ? tier.priceId.year
            : tier.priceId.month;

        paddle.Checkout.open({
          items: [{ priceId, quantity: 1 }],
          customer: { email: userEmail },
          customData: { userId, plan: tier.name.toLowerCase(), mode: selectedMode },
          settings: {
            successUrl: `${window.location.origin}/dashboard?upgraded=1`,
          },
        });

        setProcessingPlan(null);
      }

    } catch (err) {
      console.error('Checkout error:', err);
      setProcessingPlan(null);
    }
  };

  const isDark = theme === 'dark';

  const css = `
    .pr-wrap { max-width: 1180px; margin: 0 auto; padding: 0 32px; }
    @media (max-width: 720px) { .pr-wrap { padding: 0 20px; } }
    nav.pr-nav {
      position: sticky; top: 0; z-index: 50;
      background: ${isDark ? 'rgba(11,19,41,0.92)' : 'rgba(244,249,255,0.92)'};
      backdrop-filter: blur(8px);
      border-bottom: 1px solid ${isDark ? '#223269' : '#bae6fd'};
    }
    .pr-nav-inner { display: flex; align-items: center; justify-content: space-between; padding: 14px 32px; max-width: 1180px; margin: 0 auto; }
    .pr-logo { display: flex; align-items: center; gap: 10px; cursor: pointer; }
    .pr-logo img { width: 40px; height: 40px; object-fit: contain; }
    .pr-navlinks { display: flex; gap: 28px; font-size: 0.92rem; color: ${isDark ? '#94a3b8' : '#475569'}; }
    .pr-navlinks button { background: none; border: none; font-size: inherit; color: inherit; cursor: pointer; font-weight: bold; transition: color .2s; padding: 0; font-family: 'IBM Plex Sans', sans-serif; }
    .pr-navlinks button:hover, .pr-navlinks button.active { color: ${isDark ? '#38bdf8' : '#0284c7'}; }
    .pr-nav-actions { display: flex; align-items: center; gap: 10px; }
    .pr-login {
      font-family: 'IBM Plex Mono', monospace; font-size: 0.82rem; background: transparent;
      color: ${isDark ? '#38bdf8' : '#0284c7'};
      padding: 9px 18px; border-radius: 8px;
      border: 1.5px solid ${isDark ? '#38bdf8' : '#0284c7'};
      cursor: pointer; font-weight: bold; transition: all 0.2s;
    }
    .pr-login:hover { background: ${isDark ? '#38bdf8' : '#0284c7'}; color: #fff; transform: translateY(-1px); }
    .pr-cta {
      font-family: 'IBM Plex Mono', monospace; font-size: 0.82rem;
      background: ${isDark ? '#38bdf8' : '#0284c7'}; color: #fff;
      padding: 10px 20px; border-radius: 8px;
      border: 1px solid ${isDark ? '#0284c7' : '#0369a1'};
      cursor: pointer; font-weight: bold; transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(2,132,199,0.15);
    }
    .pr-cta:hover { background: ${isDark ? '#0284c7' : '#0369a1'}; transform: translateY(-1px); }
    @media (max-width: 820px) { .pr-navlinks { display: none; } }
    @media (max-width: 480px) { .pr-login { display: none; } }

    .pr-hero { padding: 80px 0 56px; text-align: center; }
    .pr-eyebrow {
      font-family: 'IBM Plex Mono', monospace; font-size: 0.78rem; letter-spacing: 0.14em;
      text-transform: uppercase; color: ${isDark ? '#38bdf8' : '#0284c7'};
      display: inline-flex; align-items: center; gap: 10px; margin-bottom: 20px; font-weight: bold;
    }
    .pr-eyebrow::before, .pr-eyebrow::after { content: ""; width: 22px; height: 1px; background: ${isDark ? '#38bdf8' : '#0284c7'}; }
    .pr-h1 {
      font-family: 'Fraunces', serif; font-weight: 500; font-size: clamp(2.2rem, 4vw, 3.4rem);
      line-height: 1.08; margin: 0 0 18px; letter-spacing: -0.02em; color: ${isDark ? '#f8fafc' : '#0f172a'};
    }
    .pr-h1 em { font-style: italic; color: ${isDark ? '#38bdf8' : '#0284c7'}; font-weight: 400; }
    .pr-hero-sub { font-size: 1.05rem; color: ${isDark ? '#94a3b8' : '#475569'}; max-width: 520px; margin: 0 auto 40px; line-height: 1.6; font-family: 'IBM Plex Sans', sans-serif; }

    .pr-toggle-wrap { display: flex; align-items: center; justify-content: center; gap: 14px; margin-bottom: 56px; }
    .pr-toggle {
      display: flex; background: ${isDark ? '#111a36' : '#fff'};
      border: 1px solid ${isDark ? '#223269' : '#bae6fd'}; border-radius: 10px; padding: 4px; gap: 2px;
    }
    .pr-toggle button {
      font-family: 'IBM Plex Mono', monospace; font-size: 0.78rem; padding: 8px 22px; border-radius: 7px;
      border: none; background: transparent; color: ${isDark ? '#94a3b8' : '#475569'};
      cursor: pointer; font-weight: 600; transition: all 0.2s; white-space: nowrap;
    }
    .pr-toggle button.active { background: ${isDark ? '#38bdf8' : '#0284c7'}; color: #fff; box-shadow: 0 3px 8px rgba(2,132,199,0.18); }
    .pr-save-badge {
      font-family: 'IBM Plex Mono', monospace; font-size: 0.66rem; font-weight: 700; padding: 4px 10px;
      border-radius: 20px; background: #16a34a; color: #fff; letter-spacing: 0.04em;
      animation: pr-pop .25s ease;
    }
    @keyframes pr-pop { from { transform: scale(0.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }

    .pr-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; align-items: stretch; max-width: 1180px; margin: 0 auto; }
    @media (max-width: 1024px) { .pr-grid { grid-template-columns: repeat(2, 1fr); gap: 18px; } }
    @media (max-width: 560px) { .pr-grid { grid-template-columns: 1fr; } }

    .pr-card {
      position: relative;
      background: ${isDark ? '#111a36' : '#fff'};
      border: 1px solid ${isDark ? '#223269' : '#bae6fd'};
      border-radius: 20px; padding: 36px 28px 28px; display: flex; flex-direction: column;
      transition: transform 0.22s, box-shadow 0.22s;
    }
    .pr-card:hover { transform: translateY(-5px); box-shadow: 0 24px 52px rgba(2,132,199,0.11); }
    .pr-card.featured {
      border-color: ${isDark ? '#38bdf8' : '#0284c7'};
      background: ${isDark ? '#0f1f3d' : '#f0f8ff'};
      box-shadow: 0 8px 34px rgba(2,132,199,0.15);
    }
    .pr-card.featured:hover { box-shadow: 0 28px 60px rgba(2,132,199,0.24); }
    .pr-popular {
      position: absolute; top: -14px; left: 50%; transform: translateX(-50%);
      background: ${isDark ? '#38bdf8' : '#0284c7'}; color: ${isDark ? '#0b1329' : '#fff'};
      font-family: 'IBM Plex Mono', monospace; font-size: 0.64rem; font-weight: 700;
      letter-spacing: 0.1em; text-transform: uppercase; padding: 4px 18px; border-radius: 20px;
      white-space: nowrap; box-shadow: 0 4px 14px rgba(2,132,199,0.3);
    }
    .pr-tier {
      font-family: 'IBM Plex Mono', monospace; font-size: 0.7rem; font-weight: 700;
      letter-spacing: 0.14em; text-transform: uppercase;
      color: ${isDark ? '#38bdf8' : '#0284c7'}; margin-bottom: 10px;
    }
    .pr-plan-name {
      font-family: 'Fraunces', serif; font-size: 1.4rem; font-weight: 600;
      color: ${isDark ? '#f8fafc' : '#0f172a'}; margin: 0 0 8px; letter-spacing: -0.01em;
    }
    .pr-tagline { font-size: 0.83rem; color: ${isDark ? '#94a3b8' : '#475569'}; margin-bottom: 22px; line-height: 1.55; font-family: 'IBM Plex Sans', sans-serif; }
    .pr-amount { display: flex; align-items: flex-end; gap: 3px; margin-bottom: 6px; }
    .pr-val {
      font-family: 'Fraunces', serif; font-size: 2.8rem; font-weight: 700;
      color: ${isDark ? '#f8fafc' : '#0f172a'}; line-height: 1; transition: all 0.25s ease;
    }
    .pr-per { font-family: 'IBM Plex Mono', monospace; font-size: 0.76rem; color: ${isDark ? '#94a3b8' : '#475569'}; margin-bottom: 8px; }
    .pr-note { font-family: 'IBM Plex Mono', monospace; font-size: 0.72rem; color: ${isDark ? '#94a3b8' : '#475569'}; margin-bottom: 22px; min-height: 1.2em; }
    .pr-divider { border: none; border-top: 1px solid ${isDark ? '#223269' : '#bae6fd'}; margin: 0 0 20px; }
    .pr-features { list-style: none; padding: 0; margin: 0 0 28px; display: flex; flex-direction: column; gap: 11px; flex: 1; }
    .pr-features li { font-size: 0.85rem; color: ${isDark ? '#94a3b8' : '#475569'}; display: flex; align-items: flex-start; gap: 9px; font-family: 'IBM Plex Sans', sans-serif; }
    .pr-check { color: #16a34a; font-weight: 700; font-family: 'IBM Plex Mono', monospace; flex-shrink: 0; font-size: 0.9rem; line-height: 1.5; }
    .pr-dash { color: ${isDark ? '#94a3b8' : '#475569'}; opacity: 0.4; font-family: 'IBM Plex Mono', monospace; flex-shrink: 0; line-height: 1.5; }
    .pr-feat-dim { opacity: 0.4; }
    .pr-btn {
      font-family: 'IBM Plex Mono', monospace; font-size: 0.84rem; font-weight: 700; padding: 13px 20px;
      border-radius: 9px; cursor: pointer; transition: all 0.2s; text-align: center;
      width: 100%; letter-spacing: 0.02em; display: block;
    }
    .pr-btn.ghost {
      background: transparent;
      border: 1.5px solid ${isDark ? '#38bdf8' : '#0284c7'};
      color: ${isDark ? '#38bdf8' : '#0284c7'};
    }
    .pr-btn.ghost:hover { background: ${isDark ? '#38bdf8' : '#0284c7'}; color: ${isDark ? '#0b1329' : '#fff'}; transform: translateY(-1px); }
    .pr-btn.solid {
      background: ${isDark ? '#38bdf8' : '#0284c7'}; color: ${isDark ? '#0b1329' : '#fff'};
      border: 1px solid ${isDark ? '#0284c7' : '#0369a1'};
      box-shadow: 0 4px 14px rgba(2,132,199,0.22);
    }
    .pr-btn.solid:hover { background: ${isDark ? '#0284c7' : '#0369a1'}; transform: translateY(-1px); }

    .pr-trust {
      margin-top: 52px; padding: 28px 0;
      border-top: 1px solid ${isDark ? '#223269' : '#bae6fd'};
      border-bottom: 1px solid ${isDark ? '#223269' : '#bae6fd'};
      background: ${isDark ? '#111a36' : '#fff'};
    }
    .pr-trust-inner { display: flex; flex-wrap: wrap; gap: 10px 28px; justify-content: center; align-items: center; font-family: 'IBM Plex Mono', monospace; font-size: 0.78rem; color: ${isDark ? '#94a3b8' : '#475569'}; }
    .pr-trust-inner b { color: ${isDark ? '#f8fafc' : '#0f172a'}; }
    .pr-trust-sep { color: ${isDark ? '#223269' : '#bae6fd'}; }

    .pr-faq { padding: 80px 0; }
    .pr-faq-head { text-align: center; margin-bottom: 48px; }
    .pr-faq-h2 { font-family: 'Fraunces', serif; font-size: clamp(1.8rem, 3vw, 2.4rem); font-weight: bold; margin: 0 0 12px; color: ${isDark ? '#f8fafc' : '#0f172a'}; letter-spacing: -0.01em; }
    .pr-faq-sub { color: ${isDark ? '#94a3b8' : '#475569'}; font-size: 1rem; font-family: 'IBM Plex Sans', sans-serif; }
    .pr-faq-list { max-width: 760px; margin: 0 auto; }
    .pr-faq-item { border-bottom: 1px solid ${isDark ? '#223269' : '#bae6fd'}; }
    .pr-faq-q {
      display: flex; justify-content: space-between; align-items: center; cursor: pointer;
      font-size: 1rem; font-weight: 500; padding: 22px 0; gap: 20px;
      color: ${isDark ? '#f8fafc' : '#0f172a'}; font-family: 'IBM Plex Sans', sans-serif;
    }
    .pr-faq-mark { font-family: 'IBM Plex Mono', monospace; color: ${isDark ? '#38bdf8' : '#0284c7'}; font-size: 1.1rem; flex-shrink: 0; transition: transform .25s; }
    .pr-faq-item.open .pr-faq-mark { transform: rotate(45deg); }
    .pr-faq-a { max-height: 0; overflow: hidden; transition: max-height .32s ease; }
    .pr-faq-item.open .pr-faq-a { max-height: 180px; }
    .pr-faq-a p { color: ${isDark ? '#94a3b8' : '#475569'}; font-size: 0.93rem; margin: 0 0 20px; max-width: 680px; line-height: 1.65; font-family: 'IBM Plex Sans', sans-serif; }

    .pr-footer { background: ${isDark ? '#111a36' : '#fff'}; border-top: 1px solid ${isDark ? '#223269' : '#bae6fd'}; padding: 64px 0 0; }
    .pr-footer-grid { display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr; gap: 40px; padding-bottom: 48px; }
    @media (max-width: 900px) { .pr-footer-grid { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 520px) { .pr-footer-grid { grid-template-columns: 1fr; } }
    .pr-footer-brand { display: flex; flex-direction: column; gap: 14px; }
    .pr-footer-logo { display: flex; align-items: center; gap: 10px; cursor: pointer; width: fit-content; }
    .pr-footer-logo img { width: 36px; height: 36px; object-fit: contain; }
    .pr-footer-brand-name { font-size: 0.95rem; font-weight: 800; letter-spacing: -0.01em; color: ${isDark ? '#f8fafc' : '#0f172a'}; line-height: 1; }
    .pr-footer-brand-name span { color: #0ea5e9; }
    .pr-footer-brand-sub { font-size: 0.62rem; font-weight: 700; color: ${isDark ? '#94a3b8' : '#475569'}; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 3px; }
    .pr-footer-tagline { font-size: 0.83rem; color: ${isDark ? '#94a3b8' : '#475569'}; line-height: 1.65; max-width: 240px; font-family: 'IBM Plex Sans', sans-serif; }
    .pr-footer-tagline .hl { color: ${isDark ? '#38bdf8' : '#0284c7'}; font-weight: 500; }
    .pr-footer-col h5 { font-family: 'IBM Plex Mono', monospace; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: ${isDark ? '#f8fafc' : '#0f172a'}; margin: 0 0 18px; }
    .pr-footer-col ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
    .pr-footer-col ul li button { background: none; border: none; font-family: 'IBM Plex Sans', sans-serif; font-size: 0.88rem; color: ${isDark ? '#94a3b8' : '#475569'}; cursor: pointer; padding: 0; text-align: left; transition: color 0.18s, transform 0.18s; display: inline-block; }
    .pr-footer-col ul li button:hover { color: ${isDark ? '#38bdf8' : '#0284c7'}; transform: translateX(3px); }
    .pr-footer-bottom { border-top: 1px solid ${isDark ? '#223269' : '#bae6fd'}; padding: 20px 0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; }
    .pr-footer-copy { font-family: 'IBM Plex Mono', monospace; font-size: 0.72rem; color: ${isDark ? '#94a3b8' : '#475569'}; }
    .pr-footer-badges { display: flex; gap: 8px; flex-wrap: wrap; }
    .pr-footer-badge { font-family: 'IBM Plex Mono', monospace; font-size: 0.68rem; font-weight: 600; letter-spacing: 0.05em; padding: 5px 12px; border-radius: 20px; border: 1px solid ${isDark ? '#223269' : '#bae6fd'}; color: ${isDark ? '#94a3b8' : '#475569'}; background: ${isDark ? '#1b264f' : '#e0f2fe'}; cursor: default; transition: background 0.2s, color 0.2s; white-space: nowrap; }
    .pr-footer-badge:hover { background: ${isDark ? '#38bdf8' : '#0284c7'}; color: ${isDark ? '#0b1329' : '#fff'}; border-color: ${isDark ? '#38bdf8' : '#0284c7'}; }
    .pr-scroll-top { position: fixed; bottom: 28px; right: 28px; z-index: 50; background: ${isDark ? '#38bdf8' : '#0284c7'}; color: ${isDark ? '#0b1329' : '#fff'}; border: none; border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 6px 20px rgba(2,132,199,0.25); transition: all 0.2s; font-size: 1.1rem; }
    .pr-scroll-top:hover { transform: translateY(-2px); }

    /* Skeleton Loading CSS */
    .skeleton-price {
      display: inline-block;
      width: 120px;
      height: 48px;
      background: ${isDark ? 'linear-gradient(90deg, #1b264f 25%, #223269 50%, #1b264f 75%)' : 'linear-gradient(90deg, #e0f2fe 25%, #bae6fd 50%, #e0f2fe 75%)'};
      background-size: 200% 100%;
      animation: loading-shimmer 1.5s infinite;
      border-radius: 8px;
    }
    @keyframes loading-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `;

  return (
    <div style={{ background: isDark ? '#0b1329' : '#f4f9ff', color: isDark ? '#f8fafc' : '#0f172a', minHeight: '100dvh', width: '100%', maxWidth: '100%', overflowX: 'hidden', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* NAV */}
      <nav className="pr-nav">
        <div className="pr-nav-inner">
          <div className="pr-logo" onClick={() => handleNavigate('/')} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') handleNavigate('/'); }} aria-label="Go to homepage">
            <img src="/logo.svg" alt="MakInvoices Logo" />
            <div>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, letterSpacing: '-0.01em', color: isDark ? '#f8fafc' : '#0f172a', display: 'block', lineHeight: 1 }}>
                Mak<span style={{ color: '#0ea5e9' }}>Invoices</span>
              </span>
              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', display: 'block', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 3 }}>Advanced Ledger Hub</span>
            </div>
          </div>
          <div className="pr-navlinks">
            <button type="button" onClick={() => handleNavigate('/#overview')}>Overview</button>
            <button type="button" onClick={() => handleNavigate('/#features')}>Features</button>
            <button type="button" className="active">Pricing</button>
            <button type="button" onClick={() => handleNavigate('/#compare')}>Compare</button>
            <button type="button" onClick={() => handleNavigate('/#faq')}>FAQ</button>
            <button type="button" onClick={() => handleNavigate('/contact')}>Contact</button>
          </div>
          <div className="pr-nav-actions">
            <button type="button" className="pr-login" onClick={() => handleNavigate('/login')}>Log in</button>
            <button type="button" className="pr-cta" onClick={() => handleNavigate('/signup')}>Start Free →</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pr-hero">
        <div className="pr-wrap">
          <div className="pr-eyebrow">Simple, Transparent Pricing</div>
          <h1 className="pr-h1">Plans for every <em>billing scale</em>.</h1>
          <p className="pr-hero-sub">Include a 7-day free trial on all plans. Start free — upgrade only when you need more power.</p>

          <div className="pr-toggle-wrap">
            <div className="pr-toggle">
              <button type="button" className={billing === 'monthly' ? 'active' : ''} onClick={() => setBilling('monthly')}>Monthly</button>
              <button type="button" className={billing === 'annual' ? 'active' : ''} onClick={() => setBilling('annual')}>Annual</button>
            </div>
            {billing === 'annual' && <span className="pr-save-badge">Save with Annual</span>}
          </div>

          <div className="pr-grid">
            {TIERS.map((plan) => {
              const currentPriceId = billing === 'annual' ? plan.priceId.year : plan.priceId.month;
              const formattedPrice = prices[currentPriceId];
              const popular = plan.name === 'Professional';
              const displayedFeatures = plan.features.slice(0, 5);
              
              return (
                <div key={plan.name} className={`pr-card${popular ? ' featured' : ''}`}>
                  {popular && <span className="pr-popular">Most Popular</span>}
                  <div className="pr-tier">{plan.name}</div>
                  <div className="pr-plan-name">{plan.name}</div>
                  <p className="pr-tagline">{plan.description}</p>
                  <div className="pr-amount">
                    {loadingPrices ? (
                      <span className="skeleton-price" />
                    ) : (
                      <span className="pr-val">{formattedPrice || plan.fallbackPrice[billing === 'annual' ? 'year' : 'month']}</span>
                    )}
                    <span className="pr-per">{billing === 'annual' ? '/yr' : '/mo'}</span>
                  </div>
                  <p className="pr-note">Includes 7-day free trial</p>

                  {billing === 'annual' && plan.name !== 'Starter' && (
                    <div style={{ marginTop: '12px', marginBottom: '8px', padding: '6px', borderRadius: '12px', background: isDark ? '#0b1329' : '#f0f9ff', border: `1px solid ${isDark ? '#223269' : '#bae6fd'}` }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => setYearlySubMode((prev) => ({ ...prev, [plan.name]: 'yearly_recurring' }))}
                          style={{
                            flex: 1,
                            padding: '6px 4px',
                            fontSize: '9px',
                            fontWeight: 800,
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: (yearlySubMode[plan.name] || 'yearly_recurring') === 'yearly_recurring' ? (isDark ? '#0284c7' : '#0284c7') : 'transparent',
                            color: (yearlySubMode[plan.name] || 'yearly_recurring') === 'yearly_recurring' ? '#ffffff' : (isDark ? '#94a3b8' : '#475569'),
                          }}
                        >
                          🔄 Auto-pay yearly
                        </button>
                        <button
                          type="button"
                          onClick={() => setYearlySubMode((prev) => ({ ...prev, [plan.name]: 'yearly_onetime' }))}
                          style={{
                            flex: 1,
                            padding: '6px 4px',
                            fontSize: '9px',
                            fontWeight: 800,
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: yearlySubMode[plan.name] === 'yearly_onetime' ? (isDark ? '#0284c7' : '#0284c7') : 'transparent',
                            color: yearlySubMode[plan.name] === 'yearly_onetime' ? '#ffffff' : (isDark ? '#94a3b8' : '#475569'),
                          }}
                        >
                          💳 Pay once
                        </button>
                      </div>
                      {yearlySubMode[plan.name] === 'yearly_onetime' && (
                        <p style={{ fontSize: '8.5px', marginTop: '5px', marginBottom: '0', color: isDark ? '#38bdf8' : '#0284c7', fontWeight: 700, textAlign: 'center' }}>
                          No auto-renewal. Access valid for 1 year.
                        </p>
                      )}
                    </div>
                  )}

                  <hr className="pr-divider" />
                  <ul className="pr-features">
                    {displayedFeatures.map((f, i) => (
                      <li key={i}>
                        <span className="pr-check">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {isDetectingRegion ? (
                    <div className="skeleton-price" style={{ width: '100%', height: '44px', borderRadius: '12px', marginTop: '16px' }} />
                  ) : (
                    <button
                      type="button"
                      disabled={processingPlan === plan.name}
                      className={`pr-btn ${popular ? 'solid' : 'ghost'}`}
                      onClick={() => handleSubscribe(plan)}
                    >
                      {processingPlan === plan.name ? 'Processing...' : `Subscribe to ${plan.name}`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Full Comparison Table */}
          <div style={{ marginTop: '80px', textAlign: 'left' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div className="pr-eyebrow">Detailed Matrix</div>
              <h2 className="pr-[#0f172a] dark:text-[#f8fafc]" style={{ fontFamily: "'Fraunces', serif", fontSize: '2rem', fontWeight: 700, margin: '0 0 10px' }}>
                Full Subscription Comparison
              </h2>
              <p style={{ color: isDark ? '#94a3b8' : '#475569', fontSize: '0.95rem' }}>
                Every single feature, limit, database tool, and template capability compared side-by-side.
              </p>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: '16px', border: `1px solid ${isDark ? '#223269' : '#bae6fd'}`, background: isDark ? '#111a36' : '#fff' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: isDark ? '#0b1329' : '#f4f9ff', borderBottom: `1px solid ${isDark ? '#223269' : '#bae6fd'}` }}>
                    <th style={{ padding: '16px', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', width: '35%' }}>Feature / Quota</th>
                    <th style={{ padding: '16px', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'center' }}>Starter</th>
                    <th style={{ padding: '16px', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'center' }}>Basic</th>
                    <th style={{ padding: '16px', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'center', color: isDark ? '#38bdf8' : '#0284c7' }}>Professional</th>
                    <th style={{ padding: '16px', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'center' }}>Enterprise</th>
                  </tr>
                </thead>
                <tbody style={{ color: isDark ? '#cbd5e1' : '#334155' }}>
                  {/* Quotas & Limits */}
                  <tr style={{ background: isDark ? '#162244' : '#f8fafc' }}>
                    <td colSpan={5} style={{ padding: '10px 16px', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', color: isDark ? '#38bdf8' : '#0284c7' }}>Monthly Quotas &amp; Limits</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${isDark ? '#1b264f' : '#f1f5f9'}` }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>Documents / Month (Sales &amp; Purchase Total)</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700 }}>10 Docs</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700 }}>60 Docs</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: isDark ? '#38bdf8' : '#0284c7' }}>140 Docs</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>Unlimited</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${isDark ? '#1b264f' : '#f1f5f9'}` }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>Accounting Reports / Month</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700 }}>1 Report</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700 }}>5 Reports</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: isDark ? '#38bdf8' : '#0284c7' }}>15 Reports</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>Unlimited</td>
                  </tr>

                  {/* Core Ledger Access & Actions */}
                  <tr style={{ background: isDark ? '#162244' : '#f8fafc' }}>
                    <td colSpan={5} style={{ padding: '10px 16px', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', color: isDark ? '#38bdf8' : '#0284c7' }}>Ledger Access &amp; Document Controls</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${isDark ? '#1b264f' : '#f1f5f9'}` }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>Sales Ledger (Invoices, Quotations, Proforma, Credit Notes)</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${isDark ? '#1b264f' : '#f1f5f9'}` }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>Purchase Ledger (Purchases, POs, Purchase Debit Notes)</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${isDark ? '#1b264f' : '#f1f5f9'}` }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>Share Documents via WhatsApp &amp; Email</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${isDark ? '#1b264f' : '#f1f5f9'}` }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>Edit, Record Payments, Download PDF &amp; Delete Documents</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                  </tr>

                  {/* Document Builder & Expense Management */}
                  <tr style={{ background: isDark ? '#162244' : '#f8fafc' }}>
                    <td colSpan={5} style={{ padding: '10px 16px', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', color: isDark ? '#38bdf8' : '#0284c7' }}>Document Builder &amp; Expenses</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${isDark ? '#1b264f' : '#f1f5f9'}` }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>Interactive Editable Document Builder</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${isDark ? '#1b264f' : '#f1f5f9'}` }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>Expense Tracking &amp; Category Log</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${isDark ? '#1b264f' : '#f1f5f9'}` }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>Interactive Billing &amp; Financial Dashboard</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${isDark ? '#1b264f' : '#f1f5f9'}` }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>System Presets for Invoice Templates</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${isDark ? '#1b264f' : '#f1f5f9'}` }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>Auto-Generated Payment QR from UPI ID</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${isDark ? '#1b264f' : '#f1f5f9'}` }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>Dark / Light Theme Toggle Mode</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                  </tr>

                  {/* Master Databases & Bulk Operations */}
                  <tr style={{ background: isDark ? '#162244' : '#f8fafc' }}>
                    <td colSpan={5} style={{ padding: '10px 16px', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', color: isDark ? '#38bdf8' : '#0284c7' }}>Databases &amp; Bulk Operations</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${isDark ? '#1b264f' : '#f1f5f9'}` }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>Database Entry (Client, Vendor, HSN, Transport, Product Category, Catalog)</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700 }}>Single Entry</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>Bulk + Single</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>Bulk + Single</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>Bulk + Single</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${isDark ? '#1b264f' : '#f1f5f9'}` }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>Bulk Ledger Actions (Bulk Record Payments, Delete Bulk Docs, Export CSV)</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#ef4444', fontWeight: 800 }}>✕</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${isDark ? '#1b264f' : '#f1f5f9'}` }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>Duplicate Existing Document Without Remaking</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#ef4444', fontWeight: 800 }}>✕</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${isDark ? '#1b264f' : '#f1f5f9'}` }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>Convert Document Type (e.g. Quotation to Tax Invoice)</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#ef4444', fontWeight: 800 }}>✕</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                  </tr>

                  {/* Template Customization & Branding */}
                  <tr style={{ background: isDark ? '#162244' : '#f8fafc' }}>
                    <td colSpan={5} style={{ padding: '10px 16px', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', color: isDark ? '#38bdf8' : '#0284c7' }}>Template Customization &amp; Branding</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${isDark ? '#1b264f' : '#f1f5f9'}` }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>Create Own Templates using Simple &amp; Advanced Builders</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#ef4444', fontWeight: 800 }}>✕</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${isDark ? '#1b264f' : '#f1f5f9'}` }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>Personalised Logo &amp; Personalised Digital Signature</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#ef4444', fontWeight: 800 }}>✕</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${isDark ? '#1b264f' : '#f1f5f9'}` }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>Remove MakInvoices Watermark &amp; Add Personalised Watermark</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#ef4444', fontWeight: 800 }}>✕</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                  </tr>

                  {/* AI Features & Automation */}
                  <tr style={{ background: isDark ? '#162244' : '#f8fafc' }}>
                    <td colSpan={5} style={{ padding: '10px 16px', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', color: isDark ? '#38bdf8' : '#0284c7' }}>AI Features &amp; Automation</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${isDark ? '#1b264f' : '#f1f5f9'}` }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>AI Smart Billing Feature (Gemini Document Parsing)</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#ef4444', fontWeight: 800 }}>✕</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#ef4444', fontWeight: 800 }}>✕</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${isDark ? '#1b264f' : '#f1f5f9'}` }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>MakInvoices AI Assistant 24*7 Support</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#ef4444', fontWeight: 800 }}>✕</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#ef4444', fontWeight: 800 }}>✕</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${isDark ? '#1b264f' : '#f1f5f9'}` }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>Recurring Invoice Scheduler Automation</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#ef4444', fontWeight: 800 }}>✕</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#ef4444', fontWeight: 800 }}>✕</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>✓</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>Support Channels &amp; Priority SLA</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 500 }}>Email / FAQ / Ticket</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 500 }}>Standard Support</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 500, color: isDark ? '#38bdf8' : '#0284c7' }}>24*7 AI + Priority</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>VIP Priority + SLA</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <div className="pr-trust">
        <div className="pr-wrap">
          <div className="pr-trust-inner">
            <span><b>AES-256</b> encryption</span>
            <span className="pr-trust-sep">·</span>
            <span><b>GDPR</b> &amp; <b>DPDP</b> compliant</span>
            <span className="pr-trust-sep">·</span>
            <span>Cancel <b>anytime</b></span>
            <span className="pr-trust-sep">·</span>
            <span>No <b>hidden fees</b></span>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <section className="pr-faq">
        <div className="pr-wrap">
          <div className="pr-faq-head">
            <div className="pr-eyebrow">FAQ</div>
            <h2 className="pr-faq-h2">Frequently asked questions.</h2>
            <p className="pr-faq-sub">Everything you need to know before you commit.</p>
          </div>
          <div className="pr-faq-list">
            {FAQS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className={`pr-faq-item${isOpen ? ' open' : ''}`}>
                  <div className="pr-faq-q" onClick={() => setOpenFaq(isOpen ? null : idx)}>
                    <span>{item.q}</span>
                    <span className="pr-faq-mark">＋</span>
                  </div>
                  <div className="pr-faq-a" style={{ maxHeight: isOpen ? '180px' : '0' }}>
                    <p>{item.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="pr-footer">
        <div className="pr-wrap">
          <div className="pr-footer-grid">
            <div className="pr-footer-brand">
              <div className="pr-footer-logo" onClick={() => handleNavigate('/')} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') handleNavigate('/'); }}>
                <img src="/logo.svg" alt="MakInvoices Logo" />
                <div>
                  <div className="pr-footer-brand-name">Mak<span>Invoices</span></div>
                  <div className="pr-footer-brand-sub">Advanced Ledger Hub</div>
                </div>
              </div>
              <p className="pr-footer-tagline">Invoicing and billing ledger for freelancers, retailers, <span className="hl">and finance teams</span>. Audit-ready by design.</p>
            </div>
            <div className="pr-footer-col">
              <h5>Product</h5>
              <ul>
                <li><button type="button" onClick={() => handleNavigate('/#features')}>Features</button></li>
                <li><button type="button" onClick={() => handleNavigate('/pricing')}>Pricing</button></li>
                <li><button type="button" onClick={() => handleNavigate('/#overview')}>Integrations</button></li>
              </ul>
            </div>
            <div className="pr-footer-col">
              <h5>Trust</h5>
              <ul>
                <li><button type="button" onClick={() => handleNavigate('/security')}>Security</button></li>
                <li><button type="button" onClick={() => handleNavigate('/terms')}>Terms of Service</button></li>
                <li><button type="button" onClick={() => handleNavigate('/privacy')}>Privacy Policy</button></li>
              </ul>
            </div>
            <div className="pr-footer-col">
              <h5>Company</h5>
              <ul>
                <li><button type="button" onClick={() => handleNavigate('/contact')}>Contact</button></li>
                <li><button type="button" onClick={() => handleNavigate('/login')}>Log In</button></li>
                <li><button type="button" onClick={() => handleNavigate('/signup')}>Get Started</button></li>
              </ul>
            </div>
          </div>
          <div className="pr-footer-bottom">
            <span className="pr-footer-copy">© {new Date().getFullYear()} MakInvoices. All rights reserved.</span>
            <div className="pr-footer-badges">
              <span className="pr-footer-badge" title="AES-256 encrypted">AES 256 encrypted</span>
              <span className="pr-footer-badge" title="GDPR &amp; DPDP compliant">GDPR &amp; DPDP compliant</span>
            </div>
          </div>
        </div>
      </footer>

      {showScrollTop && (
        <button type="button" className="pr-scroll-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Scroll to top">↑</button>
      )}
    </div>
  );
}