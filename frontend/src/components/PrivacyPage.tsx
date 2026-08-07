import React from 'react';
import { Shield, Eye, Lock, FileSpreadsheet, RefreshCw, AlertCircle, Share2, Trash2 } from 'lucide-react';

interface PrivacyPageProps {
  theme: 'light' | 'dark';
  onNavigate: (path: string) => void;
  onGoogleLogin: () => void;
}

export default function PrivacyPage({ theme, onNavigate, onGoogleLogin }: PrivacyPageProps) {

  // Dynamic color variables based on the theme
  const variables = theme === 'dark' ? `
    :root {
      --ink-deep: #0b1329;
      --ink-panel: #111a36;
      --ink-panel-2: #1b264f;
      --paper: #111a36;
      --paper-dim: #0b1329;
      --paper-line: #223269;
      --stamp-red: #38bdf8;
      --stamp-red-dark: #0284c7;
      --ledger-gold: #60a5fa;
      --text-dark-bg: #f8fafc;
      --text-dark-bg-dim: #94a3b8;
      --text-on-paper: #f8fafc;
      --text-on-paper-dim: #94a3b8;
      --radius-doc: 8px;
      --font-display: 'Fraunces', serif;
      --font-body: 'IBM Plex Sans', sans-serif;
      --font-mono: 'IBM Plex Mono', monospace;
    }
  ` : `
    :root {
      --ink-deep: #f4f9ff;
      --ink-panel: #ffffff;
      --ink-panel-2: #e0f2fe;
      --paper: #ffffff;
      --paper-dim: #f8fafc;
      --paper-line: #bae6fd;
      --stamp-red: #0284c7;
      --stamp-red-dark: #0369a1;
      --ledger-gold: #2563eb;
      --text-dark-bg: #0f172a;
      --text-dark-bg-dim: #475569;
      --text-on-paper: #0f172a;
      --text-on-paper-dim: #475569;
      --radius-doc: 8px;
      --font-display: 'Fraunces', serif;
      --font-body: 'IBM Plex Sans', sans-serif;
      --font-mono: 'IBM Plex Mono', monospace;
    }
  `;

  const css = `
    ${variables}

    .wrap { max-width: 1180px; margin: 0 auto; padding: 0 24px; }
    @media (max-width: 720px) { .wrap { padding: 0 14px; } }

    /* ---------- NAV (Homepage Style Header) ---------- */
    nav.topnav {
      position: sticky; top: 0; z-index: 50; background: ${theme === 'dark' ? 'rgba(11,19,41,0.9)' : 'rgba(244,249,255,0.9)'}; backdrop-filter: blur(8px);
      border-bottom: 1px solid var(--paper-line);
    }
    .topnav-inner { display: flex; align-items: center; justify-content: space-between; padding: 14px 32px; max-width: 1180px; margin: 0 auto; }
    .logo-container { display: flex; align-items: center; gap: 10px; cursor: pointer; }
    .navlinks { display: flex; gap: 34px; font-size: 0.92rem; color: var(--text-dark-bg-dim); }
    .navlinks button { background: none; border: none; font-size: inherit; color: inherit; cursor: pointer; transition: color .2s; font-weight: bold; font-family: 'IBM Plex Sans', sans-serif; }
    .navlinks button:hover { color: var(--stamp-red); }
    .nav-actions { display: flex; align-items: center; gap: 10px; }
    .nav-login {
      font-family: 'IBM Plex Mono', monospace; font-size: 0.82rem; background: transparent; color: var(--stamp-red);
      padding: 9px 18px; border-radius: 8px; letter-spacing: 0.02em;
      border: 1.5px solid var(--stamp-red); cursor: pointer; font-weight: bold; transition: all 0.2s;
    }
    .nav-login:hover { background: var(--stamp-red); color: #ffffff; transform: translateY(-1px); }
    .nav-cta {
      font-family: 'IBM Plex Mono', monospace; font-size: 0.82rem; background: var(--stamp-red); color: #ffffff;
      padding: 10px 20px; border-radius: 8px; text-decoration: none; letter-spacing: 0.02em;
      border: 1px solid var(--stamp-red-dark); cursor: pointer; font-weight: bold; transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(2,132,199,0.15);
    }
    .nav-cta:hover { background: var(--stamp-red-dark); transform: translateY(-1px); }
    @media (max-width: 820px) { .navlinks { display: none; } }
    @media (max-width: 480px) { .nav-login { display: none; } }

    /* ---------- PRIVACY HEADER ---------- */
    .priv-hero { padding: 90px 0 60px; text-align: center; }
    .eyebrow {
      font-family: 'IBM Plex Mono', monospace; font-size: 0.78rem; letter-spacing: 0.14em; text-transform: uppercase;
      color: var(--stamp-red); display: inline-flex; align-items: center; gap: 10px; margin-bottom: 22px; font-weight: bold;
    }
    .eyebrow::before, .eyebrow::after { content: ""; width: 22px; height: 1px; background: var(--stamp-red); }
    
    h1.priv-h1 {
      font-family: 'Fraunces', serif; font-weight: 500; font-size: clamp(2.4rem, 5vw, 3.8rem);
      line-height: 1.1; margin: 0 auto 20px; letter-spacing: -0.02em; color: var(--text-dark-bg); max-width: 800px;
    }
    .priv-sub { font-size: 1.1rem; color: var(--text-dark-bg-dim); max-width: 620px; margin: 0 auto; line-height: 1.6; }

    /* ---------- PRIVACY SECTIONS ---------- */
    .priv-sections { display: flex; flex-direction: column; gap: 40px; margin-top: 48px; }
    
    .priv-card {
      background: var(--ink-panel); border: 1px solid var(--paper-line);
      border-radius: 16px; padding: 40px;
      box-shadow: ${theme === 'dark' ? '0 10px 30px rgba(0,0,0,0.3)' : '0 10px 30px rgba(2,132,199,0.02)'};
    }
    @media (max-width: 480px) { .priv-card { padding: 24px; } }

    .priv-card-head { display: flex; gap: 18px; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--paper-line); padding-bottom: 18px; }
    .priv-icon-wrap {
      width: 44px; height: 44px; border-radius: 12px;
      background: var(--ink-panel-2); border: 1px solid var(--paper-line);
      display: flex; align-items: center; justify-content: center;
      color: var(--stamp-red); flex-shrink: 0;
    }
    .priv-card-head h2 { font-family: 'Fraunces', serif; font-size: 1.5rem; margin: 0; color: var(--text-dark-bg); font-weight: 600; }
    
    .priv-card-body h3 { font-family: 'IBM Plex Sans', sans-serif; font-size: 1.05rem; margin: 24px 0 10px; color: var(--text-dark-bg); font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; }
    .priv-card-body h3:first-child { margin-top: 0; }
    .priv-card-body p { font-size: 0.94rem; color: var(--text-dark-bg-dim); line-height: 1.65; margin: 0 0 16px; }
    .priv-card-body ul { list-style-type: square; padding-left: 20px; color: var(--text-dark-bg-dim); font-size: 0.92rem; line-height: 1.65; margin-bottom: 16px; }
    .priv-card-body li { margin-bottom: 8px; }

    /* ---------- FOOTER ---------- */
    .site-footer { background: var(--ink-panel); border-top: 1px solid var(--paper-line); padding: 64px 0 0; font-family: 'IBM Plex Sans', sans-serif; }
    .footer-grid {
      display: grid;
      grid-template-columns: 1.6fr 1fr 1fr 1fr;
      gap: 40px;
      padding-bottom: 48px;
    }
    @media (max-width: 900px) { .footer-grid { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 520px) { .footer-grid { grid-template-columns: 1fr; } }

    .footer-brand { display: flex; flex-direction: column; gap: 14px; }
    .footer-logo-row { display: flex; align-items: center; gap: 10px; cursor: pointer; width: fit-content; }
    .footer-logo-row:hover .footer-brand-text { opacity: 0.8; }
    .footer-logo-row img { width: 36px; height: 36px; object-fit: contain; }
    .footer-brand-text { display: flex; flex-direction: column; }
    .footer-brand-name { font-size: 0.95rem; font-weight: 800; letter-spacing: -0.01em; color: var(--text-dark-bg); line-height: 1; }
    .footer-brand-name span { color: #0ea5e9; }
    .footer-brand-sub { font-size: 0.62rem; font-weight: 700; color: var(--text-dark-bg-dim); letter-spacing: 0.1em; text-transform: uppercase; margin-top: 3px; }
    .footer-tagline { font-size: 0.83rem; color: var(--text-dark-bg-dim); line-height: 1.65; max-width: 240px; }
    .footer-tagline a, .footer-tagline span.hl { color: var(--stamp-red); text-decoration: none; font-weight: 500; }

    .footer-col h5 {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--text-dark-bg);
      margin: 0 0 18px;
    }
    .footer-col ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
    .footer-col ul li button {
      background: none;
      border: none;
      font-family: 'IBM Plex Sans', sans-serif;
      font-size: 0.88rem;
      color: var(--text-dark-bg-dim);
      cursor: pointer;
      padding: 0;
      text-align: left;
      text-decoration: none;
      transition: color 0.18s, transform 0.18s;
      display: inline-block;
    }
    .footer-col ul li button:hover {
      color: var(--stamp-red);
      transform: translateX(3px);
    }

    .footer-bottom {
      border-top: 1px solid var(--paper-line);
      padding: 20px 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 14px;
    }
    .footer-copy {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 0.72rem;
      color: var(--text-dark-bg-dim);
    }
    .footer-badges { display: flex; gap: 8px; flex-wrap: wrap; }
    .footer-badge {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 0.68rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      padding: 5px 12px;
      border-radius: 20px;
      border: 1px solid var(--paper-line);
      color: var(--text-dark-bg-dim);
      background: var(--ink-panel-2);
      cursor: default;
      transition: background 0.2s, color 0.2s;
      white-space: nowrap;
    }
    .footer-badge:hover { background: var(--stamp-red); color: #fff; border-color: var(--stamp-red); }
  `;

  return (
    <div className="min-h-dvh w-full max-w-full overflow-x-hidden transition-colors duration-250 select-none text-left" style={{ background: 'var(--ink-deep)', color: 'var(--text-dark-bg)', fontFamily: 'var(--font-body)' }}>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* Embedded Topnav Navigation Header */}
      <nav className="topnav">
        <div className="topnav-inner">
          {/* Logo container */}
          <div className="logo-container group" onClick={() => onNavigate('/')}>
            <img src="/logo.svg" alt="MakInvoices Logo" className="w-10 h-10 object-contain drop-shadow-md shrink-0" />
            <div>
              <span className="text-base font-black tracking-tight text-slate-805 block leading-none" style={{ color: theme === 'dark' ? '#fff' : '#0f172a' }}>
                Mak<span style={{ color: '#0ea5e9' }}>Invoices</span>
              </span>
              <span className="text-[9px] font-bold text-slate-400 dark:text-neutral-500 block tracking-wider uppercase mt-1">Advanced Ledger Hub</span>
            </div>
          </div>
          <div className="navlinks">
            <button type="button" onClick={() => onNavigate('/#overview')}>Overview</button>
            <button type="button" onClick={() => onNavigate('/#features-section')}>Features</button>
            <button type="button" onClick={() => onNavigate('/pricing')}>Pricing</button>
            <button type="button" onClick={() => onNavigate('/#compare')}>Compare</button>
            <button type="button" onClick={() => onNavigate('/#faq-section')}>FAQ</button>
            <button type="button" onClick={() => onNavigate('/contact')}>Contact</button>
          </div>
          <div className="nav-actions">
            <button type="button" className="nav-login" onClick={() => onNavigate('/login')}>Log in</button>
            <button type="button" className="nav-cta" onClick={() => onNavigate('/signup')}>Start Free →</button>
          </div>
        </div>
      </nav>

      {/* ---------- HERO ---------- */}
      <section className="priv-hero">
        <div className="wrap">
          <div className="eyebrow">Privacy &amp; Data Safeguards</div>
          <h1 className="priv-h1">Privacy Policy</h1>
          <p className="priv-sub">Learn how we collect, store, isolate, process, and encrypt your business profiles, ledger records, and customer directories.</p>
        </div>
      </section>

      {/* ---------- CONTENT SECTIONS ---------- */}
      <section style={{ paddingBottom: '80px' }}>
        <div className="wrap priv-sections">
          
          <div className="priv-card">
            <div className="priv-card-head">
              <div className="priv-icon-wrap"><Eye style={{ width: 20, height: 20 }} /></div>
              <h2>1. Information We Collect</h2>
            </div>
            <div className="priv-card-body">
              <h3>1.1 User and Business Profiles</h3>
              <p>When creating a MakInvoices account, we collect registration details including your name, email address, password hash, telephone contact, state/region, and company registration values. This info is required to format compliant document structures.</p>
              
              <h3>1.2 Transaction Ledger Inputs</h3>
              <p>We process data you upload, draft, or sync onto the system, including client profiles (tax identifiers, address details), item registers (HSN codes, pricing, stock levels), and billing logs. All items are housed securely in isolated databases with strict access checks.</p>

              <h3>1.3 Technical Logs &amp; Cookies</h3>
              <p>We collect device telemetry, IP addresses, session duration logs, browser attributes, and security credentials (e.g. salted PIN flags). We utilize browser localStorage and IndexedDB configurations to preserve active sessions and enable offline synchronization features.</p>
            </div>
          </div>

          <div className="priv-card">
            <div className="priv-card-head">
              <div className="priv-icon-wrap"><Lock style={{ width: 20, height: 20 }} /></div>
              <h2>2. How We Use and Safeguard Your Data</h2>
            </div>
            <div className="priv-card-body">
              <h3>2.1 Purpose of Data Processing</h3>
              <p>We process your inputs strictly to operate, maintain, and audit your dashboard services, run automatic tax splits, format vector PDFs, manage billing cycles, and provide RAG customer support chats.</p>
              
              <h3>2.2 AES-256 Ledger Security</h3>
              <p>All database records are protected with bank-grade AES-256 encryption at rest. In-transit streams are wrapped in TLS 1.3 encryption. Biometric verification credentials and salted security PINs are processed locally and are never stored in raw text on our cloud servers.</p>

              <h3>2.3 Strict Multi-Tenant Isolation</h3>
              <p>Database layers enforce strict row-level security (RLS) policies. No user or third party can read, alter, or fetch transaction lists belonging to another account.</p>
            </div>
          </div>

          <div className="priv-card">
            <div className="priv-card-head">
              <div className="priv-icon-wrap"><Share2 style={{ width: 20, height: 20 }} /></div>
              <h2>3. Data Sharing &amp; Sub-Processors</h2>
            </div>
            <div className="priv-card-body">
              <h3>3.1 Third-Party Sub-Processors</h3>
              <p>We do not rent, trade, sell, or distribute your customer directories or ledger transactions to data brokers or advertising networks. We share details solely with secure, DPA-bound sub-processors, including:</p>
              <ul>
                <li>Cloud database and storage providers (to host ledger schemas).</li>
                <li>Email transit servers (to dispatch invoice receipts).</li>
                <li>Payment gateways (Stripe/Razorpay to process plan renewals).</li>
              </ul>
              
              <h3>3.2 Legal Disclosures</h3>
              <p>We may disclose user metadata only if required under subpoena, judicial court orders, or regional tax compliance audits under applicable regulatory laws.</p>
            </div>
          </div>

          <div className="priv-card">
            <div className="priv-card-head">
              <div className="priv-icon-wrap"><Trash2 style={{ width: 20, height: 20 }} /></div>
              <h2>4. Your Regulatory Rights (GDPR &amp; DPDP)</h2>
            </div>
            <div className="priv-card-body">
              <p>Under international privacy regulations (GDPR, CCPA, and India's Digital Personal Data Protection Act), users are granted key data rights:</p>
              <ul>
                <li><strong>Right to Access:</strong> Export full ledger transaction rows in CSV, PDF, or JSON formats at any time.</li>
                <li><strong>Right to Rectification:</strong> Edit customer directories, HSN codes, and business profiles directly from the settings tabs.</li>
                <li><strong>Right to Deletion (Forgotten):</strong> Request account termination. Deletion requests permanently shred backup registers and credentials within 30 days.</li>
                <li><strong>Right to Data Portability:</strong> Fetch full backup files of catalog items and vendor tables.</li>
              </ul>
            </div>
          </div>

          <div className="priv-card">
            <div className="priv-card-head">
              <div className="priv-icon-wrap"><RefreshCw style={{ width: 20, height: 20 }} /></div>
              <h2>5. Policy Updates and Contact</h2>
            </div>
            <div className="priv-card-body">
              <p>We update our privacy standards as we scale our infrastructure. Substantial changes are highlighted via system banner logs or email notices. For legal queries or DPO assistance, reach us at <a href="mailto:privacy@makinvoices.com" style={{ color: 'var(--stamp-red)', textDecoration: 'none' }}>privacy@makinvoices.com</a>.</p>
            </div>
          </div>

        </div>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="site-footer">
        <div className="wrap">
          <div className="footer-grid">
            
            {/* ── Brand Column ── */}
            <div className="footer-brand">
              <div className="footer-logo-row" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <img src="/logo.svg" alt="MakInvoices Logo" />
                <div className="footer-brand-text">
                  <span className="footer-brand-name">Mak<span>Invoices</span></span>
                  <span className="footer-brand-sub">Advanced Ledger Hub</span>
                </div>
              </div>
              <p className="footer-tagline">
                Invoicing and billing ledger for freelancers, retailers, <span className="hl">and finance teams</span>. Audit-ready by design.
              </p>
            </div>

            {/* ── Product Column ── */}
            <div className="footer-col">
              <h5>Product</h5>
              <ul>
                <li><button type="button" onClick={() => onNavigate('/#features-section')}>Features</button></li>
                <li><button type="button" onClick={() => onNavigate('/pricing')}>Pricing</button></li>
                <li><button type="button" onClick={() => onNavigate('/#features-section')}>Integrations</button></li>
              </ul>
            </div>

            {/* ── Trust Column ── */}
            <div className="footer-col">
              <h5>Trust</h5>
              <ul>
                <li><button type="button" onClick={() => onNavigate('/security')}>Security</button></li>
                <li><button type="button" onClick={() => onNavigate('/terms')}>Terms of Service</button></li>
                <li><button type="button" onClick={() => onNavigate('/privacy')}>Privacy Policy</button></li>
              </ul>
            </div>

            {/* ── Company Column ── */}
            <div className="footer-col">
              <h5>Company</h5>
              <ul>
                <li><button type="button" onClick={() => onNavigate('/contact')}>Contact</button></li>
                <li><button type="button" onClick={() => onNavigate('/login')}>Log In</button></li>
                <li><button type="button" onClick={() => onNavigate('/signup')}>Get Started</button></li>
              </ul>
            </div>

          </div>

          {/* ── Bottom Bar ── */}
          <div className="footer-bottom">
            <span className="footer-copy">
              © {new Date().getFullYear()} MakInvoices. All rights reserved.
            </span>
            <div className="footer-badges">
              <span className="footer-badge" title="All data encrypted with AES-256">AES 256 encrypted</span>
              <span className="footer-badge" title="Compliant with GDPR & India's DPDP Act">GDPR &amp; DPDP compliant</span>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
}
