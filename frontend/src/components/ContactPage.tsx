import React, { useState } from 'react';
import { Mail, Phone, Globe, Check, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ContactPageProps {
  theme: 'light' | 'dark';
  onNavigate: (path: string) => void;
  onGoogleLogin: () => void;
}

export default function ContactPage({ theme, onNavigate, onGoogleLogin }: ContactPageProps) {
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);

  // Determine dynamic variables based on theme
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
    .navlinks button:hover, .navlinks button.active { color: var(--stamp-red); }
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

    /* ---------- MAIN CONTACT SECTION ---------- */
    .contact-hero { padding: 80px 0; position: relative; }
    .contact-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 56px; align-items: start; }
    @media (max-width: 900px) { .contact-grid { grid-template-columns: 1fr; gap: 40px; } }

    .eyebrow {
      font-family: 'IBM Plex Mono', monospace; font-size: 0.78rem; letter-spacing: 0.14em; text-transform: uppercase;
      color: var(--stamp-red); display: flex; align-items: center; gap: 10px; margin-bottom: 22px; font-weight: bold;
    }
    .eyebrow::before { content: ""; width: 22px; height: 1px; background: var(--stamp-red); }

    h1.contact-h1 {
      font-family: 'Fraunces', serif; font-weight: 500; font-size: clamp(2.2rem, 4vw, 3.4rem);
      line-height: 1.1; margin: 0 0 18px; letter-spacing: -0.02em; color: var(--text-dark-bg);
    }
    .contact-sub { font-size: 1.05rem; color: var(--text-dark-bg-dim); max-width: 500px; margin: 0 0 34px; line-height: 1.6; }

    /* Left Info Cards */
    .info-list { display: flex; flex-direction: column; gap: 24px; }
    .info-item { display: flex; gap: 18px; align-items: flex-start; }
    .info-icon {
      width: 44px; height: 44px; border-radius: 12px;
      background: var(--ink-panel-2); border: 1px solid var(--paper-line);
      display: flex; align-items: center; justify-content: center;
      color: var(--stamp-red); flex-shrink: 0;
    }
    .info-title { font-family: 'IBM Plex Mono', monospace; font-size: 0.72rem; font-weight: 700; color: var(--text-dark-bg); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .info-val { font-size: 0.92rem; color: var(--text-dark-bg-dim); line-height: 1.5; font-weight: bold; }
    .info-val a { color: var(--stamp-red); text-decoration: none; transition: opacity 0.2s; }
    .info-val a:hover { opacity: 0.8; }

    /* Form Card */
    .contact-card {
      background: var(--ink-panel); border: 1px solid var(--paper-line);
      border-radius: 16px; padding: 32px;
      box-shadow: ${theme === 'dark' ? '0 15px 45px rgba(0,0,0,0.5)' : '0 15px 45px rgba(2,132,199,0.04)'};
    }
    @media (max-width: 480px) { .contact-card { padding: 20px; } }

    .form-group { margin-bottom: 20px; }
    .form-label {
      display: block; font-family: 'IBM Plex Mono', monospace; font-size: 0.68rem;
      font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
      color: var(--text-dark-bg-dim); margin-bottom: 8px;
    }
    .form-input {
      width: 100%; padding: 12px 16px; border-radius: 10px;
      border: 1.5px solid var(--paper-line); background: var(--paper-dim);
      color: var(--text-dark-bg); font-family: 'IBM Plex Sans', sans-serif;
      font-size: 0.88rem; outline: none; transition: border 0.2s, box-shadow 0.2s;
    }
    .form-input:focus {
      border-color: var(--stamp-red);
      box-shadow: 0 0 0 3px ${theme === 'dark' ? 'rgba(56,189,248,0.15)' : 'rgba(2,132,199,0.12)'};
    }
    .form-textarea { resize: none; min-height: 120px; }

    .btn-submit {
      width: 100%; padding: 14px; background: var(--stamp-red);
      border: 1px solid var(--stamp-red-dark); color: #ffffff;
      border-radius: 10px; font-family: 'IBM Plex Mono', monospace;
      font-size: 0.88rem; font-weight: 700; letter-spacing: 0.04em;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      gap: 10px; transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(2,132,199,0.15);
    }
    .btn-submit:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(2,132,199,0.3); background: var(--stamp-red-dark); }
    .btn-submit:disabled { background: var(--text-dark-bg-dim); border-color: var(--text-dark-bg-dim); cursor: not-allowed; transform: none; box-shadow: none; }

    /* Success Block */
    .success-block { text-align: center; padding: 40px 0; }
    .success-icon {
      width: 52px; height: 52px; border-radius: 50%;
      background: rgba(22,163,74,0.1); color: #16a34a;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 18px; font-size: 1.5rem;
    }
    .success-title { font-family: 'Fraunces', serif; font-size: 1.4rem; font-weight: bold; margin-bottom: 10px; color: var(--text-dark-bg); }
    .success-desc { font-size: 0.92rem; color: var(--text-dark-bg-dim); margin-bottom: 24px; line-height: 1.5; }
    
    .btn-reset {
      font-family: 'IBM Plex Mono', monospace; font-size: 0.8rem; background: transparent;
      color: var(--stamp-red); border: 1.5px solid var(--stamp-red);
      padding: 10px 20px; border-radius: 8px; cursor: pointer; transition: all 0.2s; font-weight: bold;
    }
    .btn-reset:hover { background: var(--stamp-red); color: #ffffff; }

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

      {/* Embedded topnav matching the homepage exactly */}
      <nav className="topnav">
        <div className="topnav-inner">
          {/* Brand Logo Container */}
          <div className="logo-container group" onClick={() => onNavigate('/')}>
            <img src="/logo.svg" alt="MakInvoices Logo" className="w-10 h-10 object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-300 shrink-0" />
            <div>
              <span className="text-base font-black tracking-tight text-slate-805 dark:text-white block leading-none">
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
            <button type="button" className="active" onClick={() => onNavigate('/contact')}>Contact</button>
          </div>
          <div className="nav-actions">
            <button type="button" className="nav-login" onClick={() => onNavigate('/login')}>Log in</button>
            <button type="button" className="nav-cta" onClick={() => onNavigate('/signup')}>Start Free →</button>
          </div>
        </div>
      </nav>

      {/* ---------- HERO & CONTENT ---------- */}
      <section className="contact-hero">
        <div className="wrap contact-grid">
          <div>
            <div className="eyebrow">Contact Us</div>
            <h1 className="contact-h1">Let's talk about your billing system.</h1>
            <p className="contact-sub">Have questions about integrations, security configurations, custom layouts, or business plans? Reach our support team anytime.</p>
            
            <div className="info-list">
              <div className="info-item">
                <div className="info-icon">
                  <Mail style={{ width: 18, height: 18 }} />
                </div>
                <div>
                  <div className="info-title">Email Address</div>
                  <div className="info-val"><a href="mailto:support@makinvoices.com">support@makinvoices.com</a></div>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon">
                  <Phone style={{ width: 18, height: 18 }} />
                </div>
                <div>
                  <div className="info-title">Phone Support</div>
                  <div className="info-val">+1 (800) 555-MAKI</div>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon">
                  <Globe style={{ width: 18, height: 18 }} />
                </div>
                <div>
                  <div className="info-title">Support Hours</div>
                  <div className="info-val">24/7 Global Response Desk</div>
                </div>
              </div>
            </div>
          </div>

          <div className="contact-card">
            {contactSubmitted ? (
              <div className="success-block">
                <div className="success-icon">
                  <Check style={{ width: 24, height: 24 }} />
                </div>
                <h3 className="success-title">Message Sent!</h3>
                <p className="success-desc">Thank you for reaching out. A ticket has been created and our support team will respond to your registered email shortly.</p>
                <button type="button" onClick={() => setContactSubmitted(false)} className="btn-reset">Send Another Message</button>
              </div>
            ) : (
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  setContactLoading(true);
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const token = session?.access_token;
                    const res = await fetch('/api/tickets', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                      },
                      body: JSON.stringify({
                        name: contactForm.name || 'Visitor',
                        email: contactForm.email || 'visitor@example.com',
                        category: 'other',
                        priority: 'medium',
                        subject: `Contact Form Inquiry from ${contactForm.name}`,
                        message: `From: ${contactForm.name} <${contactForm.email}>\n\n${contactForm.message}`,
                      }),
                    });
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({}));
                      throw new Error(err?.detail || 'Failed to send message');
                    }
                    setContactSubmitted(true);
                    setContactForm({ name: '', email: '', message: '' });
                  } catch (err) {
                    console.error('Contact form submission failed', err);
                    alert('Failed to send your message. Please try again.');
                  } finally {
                    setContactLoading(false);
                  }
                }}
              >
                <div className="form-group">
                  <label className="form-label">Your Name</label>
                  <input 
                    type="text" 
                    required 
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    placeholder="e.g. John Doe" 
                    className="form-input" 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input 
                    type="email" 
                    required 
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    placeholder="you@company.com" 
                    className="form-input" 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Your Message</label>
                  <textarea 
                    required 
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    placeholder="Describe how we can help your business..." 
                    className="form-input form-textarea"
                    rows={4}
                  />
                </div>

                <button type="submit" disabled={contactLoading} className="btn-submit">
                  {contactLoading ? (
                    <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                  ) : (
                    <>
                      <span>Send Support Request</span>
                      <ArrowRight style={{ width: 14, height: 14 }} />
                    </>
                  )}
                </button>
              </form>
            )}
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
