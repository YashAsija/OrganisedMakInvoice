import React from 'react';
import { Shield, Lock, FileCheck, EyeOff, Server, HardDrive, RefreshCw } from 'lucide-react';

interface SecurityPageProps {
  theme: 'light' | 'dark';
  onNavigate: (path: string) => void;
  onGoogleLogin: () => void;
}

export default function SecurityPage({ theme, onNavigate, onGoogleLogin }: SecurityPageProps) {

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

    /* ---------- SECURITY HEADER ---------- */
    .sec-hero { padding: 90px 0 60px; text-align: center; }
    .eyebrow {
      font-family: 'IBM Plex Mono', monospace; font-size: 0.78rem; letter-spacing: 0.14em; text-transform: uppercase;
      color: var(--stamp-red); display: inline-flex; align-items: center; gap: 10px; margin-bottom: 22px; font-weight: bold;
    }
    .eyebrow::before, .eyebrow::after { content: ""; width: 22px; height: 1px; background: var(--stamp-red); }
    
    h1.sec-h1 {
      font-family: 'Fraunces', serif; font-weight: 500; font-size: clamp(2.4rem, 5vw, 3.8rem);
      line-height: 1.1; margin: 0 auto 20px; letter-spacing: -0.02em; color: var(--text-dark-bg); max-width: 800px;
    }
    .sec-sub { font-size: 1.1rem; color: var(--text-dark-bg-dim); max-width: 620px; margin: 0 auto; line-height: 1.6; }

    /* ---------- SECURITY BARS GRID ---------- */
    .sec-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 48px; }
    @media (max-width: 820px) { .sec-grid { grid-template-columns: 1fr; } }
    
    .sec-card {
      background: var(--ink-panel); border: 1px solid var(--paper-line);
      border-radius: 16px; padding: 36px;
      box-shadow: ${theme === 'dark' ? '0 10px 30px rgba(0,0,0,0.3)' : '0 10px 30px rgba(2,132,199,0.02)'};
      display: flex; gap: 24px; align-items: flex-start;
    }
    @media (max-width: 480px) { .sec-card { padding: 24px; gap: 16px; } }

    .sec-icon-wrap {
      width: 52px; height: 52px; border-radius: 14px;
      background: var(--ink-panel-2); border: 1px solid var(--paper-line);
      display: flex; align-items: center; justify-content: center;
      color: var(--stamp-red); flex-shrink: 0;
    }
    .sec-card-body h3 { font-family: 'Fraunces', serif; font-size: 1.35rem; margin: 0 0 12px; color: var(--text-dark-bg); font-weight: 600; }
    .sec-card-body p { font-size: 0.92rem; color: var(--text-dark-bg-dim); line-height: 1.6; margin: 0; }

    /* ---------- REGULATORY & STANDARDS ---------- */
    .compliance-sec { padding: 80px 0; border-top: 1px solid var(--paper-line); margin-top: 60px; }
    .compliance-box {
      background: var(--ink-panel-2); border: 1.5px dashed var(--paper-line);
      border-radius: 16px; padding: 40px; text-align: center;
    }
    .comp-title { font-family: 'Fraunces', serif; font-size: 1.6rem; color: var(--text-dark-bg); margin-bottom: 12px; font-weight: 600; }
    .comp-desc { font-size: 0.96rem; color: var(--text-dark-bg-dim); max-width: 700px; margin: 0 auto 30px; line-height: 1.65; }
    .comp-badges { display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; }
    .comp-badge {
      font-family: 'IBM Plex Mono', monospace; font-size: 0.78rem; font-weight: bold;
      padding: 8px 20px; border-radius: 20px; background: var(--ink-panel);
      border: 1px solid var(--paper-line); color: var(--stamp-red);
    }

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
      <section className="sec-hero">
        <div className="wrap">
          <div className="eyebrow">Hardened Ledger Protection</div>
          <h1 className="sec-h1">Bank-grade isolation. Enterprise security.</h1>
          <p className="sec-sub">How we protect your invoicing records, financial transaction metadata, client rosters, and tax structures.</p>
        </div>
      </section>

      {/* ---------- DETAILED CARDS ---------- */}
      <section style={{ paddingBottom: '60px' }}>
        <div className="wrap sec-grid">
          
          <div className="sec-card">
            <div className="sec-icon-wrap">
              <Lock style={{ width: 22, height: 22 }} />
            </div>
            <div className="sec-card-body">
              <h3>AES-256 Ledger Encryption</h3>
              <p>All invoicing transactions, client sheets, and ledger balances are fully encrypted at rest using AES-256 cryptographic standards. Data in transit is protected with TLS 1.3/SSL wrappers.</p>
            </div>
          </div>

          <div className="sec-card">
            <div className="sec-icon-wrap">
              <Shield style={{ width: 22, height: 22 }} />
            </div>
            <div className="sec-card-body">
              <h3>Secure PIN Lock System</h3>
              <p>Protect your application session with custom PIN gates and cryptographic salt derivations. Enables offline synchronization security, keeping local offline database records locked until unlocked by you.</p>
            </div>
          </div>

          <div className="sec-card">
            <div className="sec-icon-wrap">
              <EyeOff style={{ width: 22, height: 22 }} />
            </div>
            <div className="sec-card-body">
              <h3>Absolute Data Privacy</h3>
              <p>We maintain strict multi-tenant isolation rules. Your client lists, company tax profiles, settings, and invoice tallies are private and visible only to authorized users on your team.</p>
            </div>
          </div>

          <div className="sec-card">
            <div className="sec-icon-wrap">
              <Server style={{ width: 22, height: 22 }} />
            </div>
            <div className="sec-card-body">
              <h3>Hardened Cloud Nodes</h3>
              <p>Ledger databases route through multi-region secure virtual nodes. Firewalls block automated injection vectors, DDoS attacks, and unauthorized session hijacking attempts.</p>
            </div>
          </div>

          <div className="sec-card">
            <div className="sec-icon-wrap">
              <FileCheck style={{ width: 22, height: 22 }} />
            </div>
            <div className="sec-card-body">
              <h3>Cryptographic Audit Logs</h3>
              <p>Every ledger modification, tax rate update, preset item change, and client profile edit is timestamped and cryptographically signed to maintain a clean, tamper-evident audit history.</p>
            </div>
          </div>

          <div className="sec-card">
            <div className="sec-icon-wrap">
              <RefreshCw style={{ width: 22, height: 22 }} />
            </div>
            <div className="sec-card-body">
              <h3>Continuous Backups</h3>
              <p>Ledger changes are synced and backed up instantly to secure cloud backups. If connection cuts off, local synchronization automatically queues items to write once connection is re-established.</p>
            </div>
          </div>

        </div>
      </section>

      {/* ---------- REGULATORY & STANDARDS ---------- */}
      <section className="compliance-sec">
        <div className="wrap">
          <div className="compliance-box">
            <div className="comp-title">Compliance Frameworks</div>
            <p className="comp-desc">Our billing architecture structures and exports invoicing schemas that comply with standard international tax laws, regional reporting frameworks, and data governance practices.</p>
            <div className="comp-badges">
              <span className="comp-badge">GDPR Compliant</span>
              <span className="comp-badge">DPDP Compliant (India)</span>
              <span className="comp-badge">AES-256 Storage</span>
              <span className="comp-badge">TLS 1.3 Transit</span>
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
