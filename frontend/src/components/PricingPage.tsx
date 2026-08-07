import React, { useState, useEffect } from 'react';

interface PricingPageProps {
  theme: 'light' | 'dark';
  onNavigate: (path: string) => void;
  onGoogleLogin: () => void;
}

const PLANS = [
  {
    tier: 'Free',
    name: 'Starter',
    tagline: 'Get started at zero cost. No credit card required.',
    monthly: '₹0',
    annual: '₹0',
    annualNote: 'Free forever. No commitment needed.',
    monthlyNote: 'Free forever. No credit card needed.',
    cta: 'Get Started Free',
    ctaVariant: 'ghost' as const,
    popular: false,
    features: [
      { text: 'Up to 10 invoices / month', included: true },
      { text: '1 business profile', included: true },
      { text: 'Invoice & Quotation', included: true },
      { text: 'Simple invoice template', included: true },
      { text: 'PDF export', included: true },
      { text: 'AI Smart Billing (Gemini)', included: false },
      { text: 'Advanced templates', included: false },
      { text: 'Priority support', included: false },
    ],
  },
  {
    tier: 'Basic',
    name: 'Basic',
    tagline: 'Perfect for freelancers scaling their invoicing.',
    monthly: '₹200',
    annual: '₹160',
    annualNote: 'Billed ₹1,920/year — save ₹480.',
    monthlyNote: 'Billed monthly. Cancel anytime.',
    cta: 'Start Basic',
    ctaVariant: 'ghost' as const,
    popular: false,
    features: [
      { text: 'Up to 50 invoices / month', included: true },
      { text: '2 business profiles', included: true },
      { text: 'Invoice, Quotation & Purchase Order', included: true },
      { text: 'Simple + Advanced templates', included: true },
      { text: 'PDF export', included: true },
      { text: 'Sales & Purchase ledger', included: true },
      { text: 'AI Smart Billing (Gemini)', included: false },
      { text: 'Priority support', included: false },
    ],
  },
  {
    tier: 'Pro',
    name: 'Professional',
    tagline: 'For growing businesses that bill at volume.',
    monthly: '₹350',
    annual: '₹280',
    annualNote: 'Billed ₹3,360/year — save ₹840.',
    monthlyNote: 'Billed monthly. Cancel anytime.',
    cta: 'Start Pro →',
    ctaVariant: 'solid' as const,
    popular: true,
    features: [
      { text: 'Up to 100 invoices / month', included: true },
      { text: '3 business profiles', included: true },
      { text: 'All document types incl. Debit & Credit Notes', included: true },
      { text: 'All templates + custom logo & signature', included: true },
      { text: 'AI Smart Billing (Gemini)', included: true },
      { text: 'Multi-rate tax splits', included: true },
      { text: 'Region-aware number formatting', included: true },
      { text: 'Priority support', included: false },
    ],
  },
  {
    tier: 'Unlimited',
    name: 'Unlimited',
    tagline: 'No caps, no limits. Built for high-volume operations.',
    monthly: '₹600',
    annual: '₹480',
    annualNote: 'Billed ₹5,760/year — save ₹1,440.',
    monthlyNote: 'Billed monthly. Cancel anytime.',
    cta: 'Go Unlimited',
    ctaVariant: 'ghost' as const,
    popular: false,
    features: [
      { text: 'Unlimited invoices', included: true },
      { text: 'Unlimited business profiles', included: true },
      { text: 'All document types incl. Debit & Credit Notes', included: true },
      { text: 'All templates + custom logo & signature', included: true },
      { text: 'AI Smart Billing (Gemini)', included: true },
      { text: 'RAG-trained AI chat support', included: true },
      { text: 'Recurring invoice scheduler', included: true },
      { text: 'Priority support with SLA', included: true },
    ],
  },
];


const FAQS = [
  {
    q: 'Is the Free plan really free forever?',
    a: 'Yes — no credit card, no trial expiry. The Free plan stays free with a 10 invoice/month limit and 1 business profile.',
  },
  {
    q: 'Can I upgrade or downgrade at any time?',
    a: 'Absolutely. You can switch plans at any time. Upgrades are prorated; downgrades take effect at the end of your billing cycle.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit/debit cards, UPI, and net banking for Indian customers. International cards are accepted for global users.',
  },
  {
    q: 'Does the annual plan auto-renew?',
    a: 'Yes — annual plans auto-renew at the end of the year. You can cancel anytime from your account settings before the renewal date.',
  },
  {
    q: 'Is my data encrypted and secure?',
    a: 'All data is protected with AES-256 encryption in transit and at rest. We are GDPR and India DPDP Act compliant.',
  },
];

export default function PricingPage({ theme, onNavigate }: PricingPageProps) {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

    .pr-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; align-items: stretch; }
    @media (max-width: 1100px) { .pr-grid { grid-template-columns: 1fr 1fr; gap: 18px; } }
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
      font-family: 'Fraunces', serif; font-size: 3rem; font-weight: 700;
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
  `;

  return (
    <div style={{ background: isDark ? '#0b1329' : '#f4f9ff', color: isDark ? '#f8fafc' : '#0f172a', minHeight: '100dvh', width: '100%', maxWidth: '100%', overflowX: 'hidden', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* NAV */}
      <nav className="pr-nav">
        <div className="pr-nav-inner">
          <div className="pr-logo" onClick={() => onNavigate('/')} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') onNavigate('/'); }} aria-label="Go to homepage">
            <img src="/logo.svg" alt="MakInvoices Logo" />
            <div>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, letterSpacing: '-0.01em', color: isDark ? '#f8fafc' : '#0f172a', display: 'block', lineHeight: 1 }}>
                Mak<span style={{ color: '#0ea5e9' }}>Invoices</span>
              </span>
              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', display: 'block', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 3 }}>Advanced Ledger Hub</span>
            </div>
          </div>
          <div className="pr-navlinks">
            <button type="button" onClick={() => onNavigate('/#overview')}>Overview</button>
            <button type="button" onClick={() => onNavigate('/#features')}>Features</button>
            <button type="button" className="active">Pricing</button>
            <button type="button" onClick={() => onNavigate('/#compare')}>Compare</button>
            <button type="button" onClick={() => onNavigate('/#faq')}>FAQ</button>
            <button type="button" onClick={() => onNavigate('/contact')}>Contact</button>
          </div>
          <div className="pr-nav-actions">
            <button type="button" className="pr-login" onClick={() => onNavigate('/login')}>Log in</button>
            <button type="button" className="pr-cta" onClick={() => onNavigate('/signup')}>Start Free →</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pr-hero">
        <div className="pr-wrap">
          <div className="pr-eyebrow">Simple, Transparent Pricing</div>
          <h1 className="pr-h1">Plans for every <em>billing scale</em>.</h1>
          <p className="pr-hero-sub">Start free — upgrade only when you need more power. No hidden fees, no lock-in.</p>

          <div className="pr-toggle-wrap">
            <div className="pr-toggle">
              <button type="button" className={billing === 'monthly' ? 'active' : ''} onClick={() => setBilling('monthly')}>Monthly</button>
              <button type="button" className={billing === 'annual' ? 'active' : ''} onClick={() => setBilling('annual')}>Annual</button>
            </div>
            {billing === 'annual' && <span className="pr-save-badge">Save 20%</span>}
          </div>

          <div className="pr-grid">
            {PLANS.map((plan) => (
              <div key={plan.tier} className={`pr-card${plan.popular ? ' featured' : ''}`}>
                {plan.popular && <span className="pr-popular">Most Popular</span>}
                <div className="pr-tier">{plan.tier}</div>
                <div className="pr-plan-name">{plan.name}</div>
                <p className="pr-tagline">{plan.tagline}</p>
                <div className="pr-amount">
                  <span className="pr-val">{billing === 'annual' ? plan.annual : plan.monthly}</span>
                  <span className="pr-per">/mo</span>
                </div>
                <p className="pr-note">{billing === 'annual' ? plan.annualNote : plan.monthlyNote}</p>
                <hr className="pr-divider" />
                <ul className="pr-features">
                  {plan.features.map((f, i) => (
                    <li key={i} className={f.included ? '' : 'pr-feat-dim'}>
                      {f.included ? <span className="pr-check">✓</span> : <span className="pr-dash">–</span>}
                      {f.text}
                    </li>
                  ))}
                </ul>
                <button type="button" className={`pr-btn ${plan.ctaVariant}`} onClick={() => onNavigate('/signup')}>
                  {plan.cta}
                </button>
              </div>
            ))}
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
              <div className="pr-footer-logo" onClick={() => onNavigate('/')} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') onNavigate('/'); }}>
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
                <li><button type="button" onClick={() => onNavigate('/#features')}>Features</button></li>
                <li><button type="button" onClick={() => onNavigate('/pricing')}>Pricing</button></li>
                <li><button type="button" onClick={() => onNavigate('/#overview')}>Integrations</button></li>
              </ul>
            </div>
            <div className="pr-footer-col">
              <h5>Trust</h5>
              <ul>
                <li><button type="button" onClick={() => onNavigate('/security')}>Security</button></li>
                <li><button type="button" onClick={() => onNavigate('/terms')}>Terms of Service</button></li>
                <li><button type="button" onClick={() => onNavigate('/privacy')}>Privacy Policy</button></li>
              </ul>
            </div>
            <div className="pr-footer-col">
              <h5>Company</h5>
              <ul>
                <li><button type="button" onClick={() => onNavigate('/contact')}>Contact</button></li>
                <li><button type="button" onClick={() => onNavigate('/login')}>Log In</button></li>
                <li><button type="button" onClick={() => onNavigate('/signup')}>Get Started</button></li>
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