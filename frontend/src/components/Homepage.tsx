import React, { useState } from 'react';

interface HomepageProps {
  theme: 'light' | 'dark';
  onGoogleLogin: () => void;
  onCustomSignup: (name: string, companyName: string, email: string, phone: string, password?: string) => Promise<{ error?: string }>;
  onCustomLogin: (email: string, password?: string, phone?: string) => Promise<{ error?: string }>;
  isOnline: boolean;
  onNavigate: (path: string) => void;
}

export default function Homepage({ 
  theme, 
  onGoogleLogin, 
  onCustomSignup, 
  onCustomLogin,
  isOnline,
  onNavigate
}: HomepageProps) {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [activeOverviewMode, setActiveOverviewMode] = useState<'simple' | 'advanced'>('simple');

  const handleNavScroll = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Determine dynamic variables based on light/dark mode
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

  return (
    <div className="min-h-dvh w-full max-w-full overflow-x-hidden transition-colors duration-250 select-none text-left" style={{ background: 'var(--ink-deep)', color: 'var(--text-dark-bg)', fontFamily: 'var(--font-body)' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        ${variables}

        .wrap { max-width: 1180px; margin: 0 auto; padding: 0 24px; }
        @media (max-width: 720px) { .wrap { padding: 0 14px; } }

        /* ---------- NAV ---------- */
        nav.topnav {
          position: fixed; top: 0; left: 0; right: 0; width: 100%; z-index: 1000;
          background: ${theme === 'dark' ? 'rgba(11,19,41,0.88)' : 'rgba(244,249,255,0.88)'};
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--paper-line);
          box-shadow: ${theme === 'dark' ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(2,132,199,0.06)'};
          transition: background 0.25s ease, box-shadow 0.25s ease;
        }
        .topnav-inner { display: flex; align-items: center; justify-content: space-between; padding: 14px 32px; max-width: 1180px; margin: 0 auto; }
        .logo-container { display: flex; align-items: center; gap: 10px; cursor: pointer; }
        .navlinks { display: flex; gap: 34px; font-size: 0.92rem; color: var(--text-dark-bg-dim); }
        .navlinks button { background: none; border: none; font-size: inherit; color: inherit; cursor: pointer; transition: color .2s; font-weight: bold; }
        .navlinks button:hover { color: var(--stamp-red); }
        .nav-actions { display: flex; align-items: center; gap: 10px; }
        .nav-login {
          font-family: 'IBM Plex Mono', monospace; font-size: 0.82rem; background: transparent; color: var(--stamp-red);
          padding: 8px 16px; border-radius: 8px; letter-spacing: 0.02em;
          border: 1.5px solid var(--stamp-red); cursor: pointer; font-weight: bold; transition: all 0.2s;
        }
        .nav-login:hover { background: var(--stamp-red); color: #ffffff; transform: translateY(-1px); }
        .nav-cta {
          font-family: 'IBM Plex Mono', monospace; font-size: 0.82rem; background: var(--stamp-red); color: #ffffff;
          padding: 9px 18px; border-radius: 8px; text-decoration: none; letter-spacing: 0.02em;
          border: 1px solid var(--stamp-red-dark); cursor: pointer; font-weight: bold; transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(2,132,199,0.15); white-space: nowrap;
        }
        .nav-cta:hover { background: var(--stamp-red-dark); transform: translateY(-1px); }
        @media (max-width: 820px) { .navlinks { display: none; } }
        @media (max-width: 640px) { .topnav-inner { padding: 12px 16px; } }
        @media (max-width: 480px) { .topnav-inner { padding: 10px 12px; } .nav-login { padding: 6px 12px; font-size: 0.76rem; } .nav-cta { padding: 7px 14px; font-size: 0.76rem; } }

        /* ---------- HERO ---------- */
        .hero { padding: 140px 0 70px; position: relative; overflow: hidden; }
        .hero-grid { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 40px; align-items: center; }
        @media (max-width: 960px) { .hero-grid { grid-template-columns: 1fr; gap: 32px; } }

        .eyebrow {
          font-family: 'IBM Plex Mono', monospace; font-size: 0.78rem; letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--stamp-red); display: flex; align-items: center; gap: 10px; margin-bottom: 22px; font-weight: bold;
        }
        .eyebrow::before { content: ""; width: 22px; height: 1px; background: var(--stamp-red); }

        h1.hero-h1 {
          font-family: 'Fraunces', serif; font-weight: 500; font-size: clamp(2.1rem, 4.4vw, 3.8rem);
          line-height: 1.08; margin: 0 0 24px; letter-spacing: -0.02em;
        }
        h1.hero-h1 em { font-style: italic; color: var(--stamp-red); font-weight: 400; }

        .hero-sub { font-size: 1.1rem; color: var(--text-dark-bg-dim); max-width: 520px; margin: 0 0 32px; line-height: 1.6; }

        .cta-row { display: flex; gap: 14px; flex-wrap: wrap; align-items: center; margin-bottom: 22px; }
        .btn-primary {
          background: var(--stamp-red); color: #ffffff; border: 1px solid var(--stamp-red-dark);
          font-family: 'IBM Plex Mono', monospace; font-size: 0.9rem; padding: 13px 26px; border-radius: 8px;
          text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 10px; transition: all 0.2s;
          box-shadow: 0 4px 14px rgba(2,132,199,0.2); cursor: pointer; font-weight: bold;
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(2,132,199,0.35); }
        .btn-secondary {
          color: var(--text-dark-bg); font-family: 'IBM Plex Mono', monospace; font-size: 0.9rem; text-decoration: none;
          padding: 13px 4px; border-bottom: 2px solid var(--stamp-red); display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;
          font-weight: bold; transition: opacity 0.2s;
        }
        .btn-secondary:hover { opacity: 0.8; }
        .micro-trust { font-family: 'IBM Plex Mono', monospace; font-size: 0.76rem; color: var(--text-dark-bg-dim); letter-spacing: 0.02em; }

        /* ---- signature element: fanned invoice-layer deck ---- */
        .deck-wrapper { width: 100%; max-width: 100%; overflow: hidden; padding: 10px 0; }
        .deck { position: relative; height: 420px; display: flex; align-items: center; justify-content: center; }
        .doc {
          position: absolute; width: 265px; height: 350px; background: var(--paper); border-radius: var(--radius-doc);
          box-shadow: ${theme === 'dark' ? '0 25px 50px rgba(0,0,0,0.6)' : '0 25px 50px rgba(2,132,199,0.06)'}; padding: 24px; font-family: 'IBM Plex Mono', monospace; color: var(--text-on-paper);
          transition: transform .35s ease, box-shadow .35s ease; cursor: pointer; border: 1px solid var(--paper-line);
        }
        .doc .tag {
          position: absolute; top: -13px; left: 20px; background: var(--ink-panel-2); color: var(--stamp-red);
          font-size: 0.68rem; padding: 4px 10px; border-radius: 4px 4px 0 0; letter-spacing: 0.06em; text-transform: uppercase;
          border: 1px solid var(--paper-line); border-bottom: none; font-weight: bold;
        }
        .doc.d1 { transform: rotate(-9deg) translate(-92px, 6px); z-index: 1; }
        .doc.d2 { transform: rotate(-3deg) translate(-30px, -6px); z-index: 2; }
        .doc.d3 { transform: rotate(3deg) translate(30px, -2px); z-index: 3; }
        .doc.d4 { transform: rotate(9deg) translate(92px, 10px); z-index: 4; }
        .deck:hover .doc { filter: brightness(0.97); }
        .doc:hover { filter: brightness(1) !important; box-shadow: 0 30px 65px rgba(2,132,199,0.18); z-index: 9 !important; }
        .doc.d1:hover { transform: rotate(-9deg) translate(-100px, -6px) scale(1.05); }
        .doc.d2:hover { transform: rotate(-3deg) translate(-36px, -18px) scale(1.05); }
        .doc.d3:hover { transform: rotate(3deg) translate(36px, -14px) scale(1.05); }
        .doc.d4:hover { transform: rotate(9deg) translate(100px, -2px) scale(1.05); }

        .doc .brandline { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
        .doc .brandbox { width: 22px; height: 22px; background: var(--stamp-red); border-radius: 6px; }
        .doc .brandtext { font-size: 0.66rem; color: var(--text-on-paper-dim); }
        .doc .rule { border-top: 1px dashed var(--paper-line); margin: 10px 0; }
        .doc .row { display: flex; justify-content: space-between; font-size: 0.66rem; margin-bottom: 9px; color: var(--text-on-paper-dim); }
        .doc .row span:last-child { color: var(--text-on-paper); }
        .doc .stamp {
          margin-top: 18px; display: inline-block; border: 2px solid var(--stamp-red); color: var(--stamp-red);
          padding: 4px 12px; font-size: 0.7rem; transform: rotate(-6deg); border-radius: 6px; letter-spacing: 0.05em; font-weight: bold;
        }
        .doc .sig { margin-top: 20px; font-family: 'Fraunces', serif; font-style: italic; font-size: 1.1rem; color: var(--text-on-paper-dim); border-top: 1px solid var(--paper-line); padding-top: 10px; }

        /* ---------- TRUST STRIP ---------- */
        .trust-strip {
          background: var(--ink-panel); color: var(--text-dark-bg); padding: 22px 0; border-top: 1px solid var(--paper-line); border-bottom: 1px solid var(--paper-line);
        }
        .trust-inner { display: flex; flex-wrap: wrap; gap: 10px 24px; justify-content: center; align-items: center; font-family: 'IBM Plex Mono', monospace; font-size: 0.8rem; color: var(--text-dark-bg-dim); text-align: center; }
        .trust-inner b { color: var(--text-dark-bg); font-weight: 600; }
        .trust-inner .sep { color: var(--paper-line); }

        /* ---------- SECTION SHELL ---------- */
        section.block { padding: 90px 0; }
        .block.on-paper { background: var(--ink-panel); color: var(--text-dark-bg); border-top: 1px solid var(--paper-line); border-bottom: 1px solid var(--paper-line); }
        .block-head { max-width: 640px; margin: 0 0 48px; }
        .block-head .eyebrow { color: var(--stamp-red); }
        .on-paper .eyebrow { color: var(--stamp-red); }
        .on-paper .eyebrow::before { background: var(--stamp-red); }
        h2.block-h2 { font-family: 'Fraunces', serif; font-weight: bold; font-size: clamp(1.75rem, 3vw, 2.5rem); margin: 0 0 16px; letter-spacing: -0.01em; color: var(--text-dark-bg); }
        .block-sub { color: var(--text-dark-bg-dim); font-size: 1rem; max-width: 560px; line-height: 1.6; }
        .on-paper .block-sub { color: var(--text-dark-bg-dim); }

        /* ---------- OVERVIEW ---------- */
        .overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 50px; align-items: center; }
        @media (max-width: 900px) { .overview-grid { grid-template-columns: 1fr; gap: 36px; } }
        .overview-grid p { color: var(--text-dark-bg-dim); font-size: 1rem; margin: 0 0 18px; line-height: 1.6; }
        .overview-grid strong { color: var(--text-dark-bg); }

        .mode-card { background: var(--ink-panel); border: 1px solid var(--paper-line); border-radius: 16px; padding: 10px; box-shadow: 0 15px 40px rgba(2,132,199,0.04); }
        .mode-toggle { display: flex; background: var(--ink-deep); border-radius: 10px; padding: 5px; margin-bottom: 0; }
        .mode-toggle .opt { flex: 1; text-align: center; font-family: 'IBM Plex Mono', monospace; font-size: 0.8rem; padding: 11px; border-radius: 8px; color: var(--text-dark-bg-dim); cursor: pointer; background: none; border: none; transition: all 0.2s; }
        .mode-toggle .opt.active { background: var(--stamp-red); color: #ffffff; font-weight: 600; box-shadow: 0 4px 10px rgba(2,132,199,0.15); }
        .mode-body { padding: 20px 16px 24px; }
        .mode-body .line { display: flex; justify-content: space-between; gap: 10px; font-family: 'IBM Plex Mono', monospace; font-size: 0.76rem; color: var(--text-dark-bg-dim); padding: 9px 0; border-bottom: 1px solid var(--paper-line); }
        .mode-body .line span:last-child { color: var(--text-dark-bg); text-align: right; }
        .mode-body .line.extra { color: var(--stamp-red); }
        .mode-body .line.extra span:last-child { color: var(--stamp-red); }

        /* ---------- FEATURES (folder tabs) ---------- */
        .feat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px 24px; }
        @media (max-width: 900px) { .feat-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .feat-grid { grid-template-columns: 1fr; } }
        .feat-card { position: relative; background: var(--ink-panel); border: 1px solid var(--paper-line); border-radius: 0 16px 16px 16px; padding: 26px 22px 22px; margin-top: 14px; box-shadow: 0 6px 24px rgba(2,132,199,0.02); transition: transform 0.2s; }
        .feat-card:hover { transform: translateY(-2px); }
        .feat-card .tab {
          position: absolute; top: -14px; left: 0; background: var(--ink-panel-2); color: var(--stamp-red);
          font-family: 'IBM Plex Mono', monospace; font-size: 0.66rem; padding: 5px 14px; border-radius: 8px 8px 0 0; letter-spacing: 0.04em; font-weight: bold; border-top: 1px solid var(--paper-line); border-left: 1px solid var(--paper-line); border-right: 1px solid var(--paper-line);
        }
        .feat-card h3 { font-family: 'Fraunces', serif; font-size: 1.15rem; font-weight: bold; margin: 6px 0 10px; color: var(--text-dark-bg); }
        .feat-card p { font-size: 0.88rem; color: var(--text-dark-bg-dim); margin: 0; line-height: 1.55; }

        /* ---------- COMPARISON ---------- */
        .comp-table { width: 100%; min-width: 600px; border-collapse: collapse; font-size: 0.88rem; margin-top: 8px; color: var(--text-dark-bg); }
        .comp-table th, .comp-table td { padding: 14px 16px; border-bottom: 1px solid var(--paper-line); text-align: left; }
        .comp-table th { font-family: 'IBM Plex Mono', monospace; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-dark-bg-dim); font-weight: 600; }
        .comp-table th:first-child, .comp-table td:first-child { width: 28%; }
        .comp-table td.brand { font-weight: bold; color: var(--stamp-red-dark); font-family: 'IBM Plex Mono', monospace; font-size: 0.82rem; }
        .comp-table .yes { color: #16a34a; font-weight: 600; }
        .comp-table .no { color: #dc2626; }
        .comp-table .mid { color: var(--text-dark-bg-dim); }
        .comp-table-wrap { overflow-x: auto; max-width: 100%; -webkit-overflow-scrolling: touch; border-radius: 12px; }
        .comp-note { margin-top: 22px; font-size: 0.9rem; color: var(--text-dark-bg-dim); border-left: 2px solid var(--stamp-red); padding-left: 14px; }

        /* ---------- FAQ ---------- */
        .faq-item { border-bottom: 1px solid var(--paper-line); padding: 20px 0; }
        .faq-q { display: flex; justify-content: space-between; align-items: center; cursor: pointer; font-family: 'IBM Plex Sans', sans-serif; font-size: 1rem; font-weight: 500; gap: 16px; }
        .faq-q .mark { font-family: 'IBM Plex Mono', monospace; color: var(--stamp-red); font-size: 1.1rem; flex-shrink: 0; transition: transform .25s; }
        .faq-item.open .mark { transform: rotate(45deg); }
        .faq-a { max-height: 0; overflow: hidden; transition: max-height .3s ease; }
        .faq-item.open .faq-a { max-height: 200px; }
        .faq-a p { color: var(--text-dark-bg-dim); font-size: 0.92rem; margin: 12px 0 0; max-width: 680px; line-height: 1.6; }

        /* ---------- CLOSING ---------- */
        .closing { background: var(--ink-panel); text-align: center; padding: 90px 0; border-top: 1px solid var(--paper-line); }
        .closing h2 { font-family: 'Fraunces', serif; font-size: clamp(1.8rem, 3.4vw, 2.8rem); font-weight: bold; margin: 0 0 16px; color: var(--text-dark-bg); }
        .closing p { color: var(--text-dark-bg-dim); margin: 0 0 30px; font-size: 1.02rem; }
        .stamp-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 10px; background: transparent; border: 2px solid var(--stamp-red);
          color: var(--stamp-red); font-family: 'IBM Plex Mono', monospace; font-size: 0.95rem; padding: 14px 28px; border-radius: 8px;
          transform: rotate(-2deg); text-decoration: none; transition: transform .2s, background .2s, color .2s; cursor: pointer; font-weight: bold;
        }
        .stamp-btn:hover { transform: rotate(0deg); background: var(--stamp-red); color: #ffffff; }

        /* ---------- FINTECH GEO TRUST CARDS ---------- */
        .trust-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 18px; margin-top: 36px; }
        .trust-card { background: var(--ink-panel); border: 1px solid var(--paper-line); border-radius: 12px; padding: 18px; text-align: left; }
        .trust-card h4 { font-family: 'IBM Plex Mono', monospace; font-size: 0.82rem; font-weight: bold; color: var(--stamp-red); margin: 0 0 8px 0; text-transform: uppercase; }
        .trust-card p { font-size: 0.8rem; color: var(--text-dark-bg-dim); margin: 0; line-height: 1.5; }

        /* ---------- FOOTER ---------- */
        .site-footer { background: var(--ink-panel); border-top: 1px solid var(--paper-line); padding: 56px 0 0; font-family: 'IBM Plex Sans', sans-serif; }
        .footer-grid {
          display: grid;
          grid-template-columns: 1.6fr 1fr 1fr 1fr;
          gap: 36px;
          padding-bottom: 40px;
        }
        @media (max-width: 900px) { .footer-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 520px) { .footer-grid { grid-template-columns: 1fr; gap: 28px; } }

        .footer-brand { display: flex; flex-direction: column; gap: 12px; }
        .footer-logo-row { display: flex; align-items: center; gap: 10px; cursor: pointer; width: fit-content; }
        .footer-logo-row:hover .footer-brand-text { opacity: 0.8; }
        .footer-logo-row img { width: 34px; height: 34px; object-fit: contain; }
        .footer-brand-text { display: flex; flex-direction: column; }
        .footer-brand-name { font-size: 0.95rem; font-weight: 800; letter-spacing: -0.01em; color: var(--text-dark-bg); line-height: 1; }
        .footer-brand-name span { color: #0ea5e9; }
        .footer-brand-sub { font-size: 0.62rem; font-weight: 700; color: var(--text-dark-bg-dim); letter-spacing: 0.1em; text-transform: uppercase; margin-top: 3px; }
        .footer-tagline { font-size: 0.82rem; color: var(--text-dark-bg-dim); line-height: 1.6; max-width: 260px; }
        .footer-tagline a, .footer-tagline span.hl { color: var(--stamp-red); text-decoration: none; font-weight: 500; }

        .footer-col h5 {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-dark-bg);
          margin: 0 0 16px;
        }
        .footer-col ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
        .footer-col ul li button, .footer-col ul li a {
          background: none;
          border: none;
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 0.86rem;
          color: var(--text-dark-bg-dim);
          cursor: pointer;
          padding: 0;
          text-align: left;
          text-decoration: none;
          transition: color 0.18s, transform 0.18s;
          display: inline-block;
        }
        .footer-col ul li button:hover, .footer-col ul li a:hover {
          color: var(--stamp-red);
          transform: translateX(3px);
        }

        .footer-bottom {
          border-top: 1px solid var(--paper-line);
          padding: 18px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
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
          padding: 4px 10px;
          border-radius: 20px;
          border: 1px solid var(--paper-line);
          color: var(--text-dark-bg-dim);
          background: var(--ink-panel-2);
          cursor: default;
          transition: background 0.2s, color 0.2s;
          white-space: nowrap;
        }
        .footer-badge:hover { background: var(--stamp-red); color: #fff; border-color: var(--stamp-red); }

        /* ---------- MOBILE RESPONSIVENESS OVERRIDES ---------- */
        @media (max-width: 600px) {
          section.block { padding: 50px 0; }
          .hero { padding: 90px 0 35px; }
          h1.hero-h1 { font-size: 1.85rem; margin: 0 0 14px; line-height: 1.15; }
          .hero-sub { font-size: 0.92rem; margin: 0 0 20px; line-height: 1.5; }
          .cta-row { gap: 10px; flex-direction: column; align-items: stretch; }
          .btn-primary, .btn-secondary { justify-content: center; width: 100%; text-align: center; }
          .btn-secondary { padding: 11px 0; border-bottom: 2px solid var(--stamp-red); }
          .deck { height: 250px; margin-top: 20px; }
          .doc { width: 145px; height: 200px; padding: 10px; }
          .doc .tag { font-size: 0.48rem; padding: 2px 5px; top: -9px; left: 8px; }
          .doc.d1 { transform: rotate(-9deg) translate(-45px, 4px); }
          .doc.d2 { transform: rotate(-3deg) translate(-12px, -4px); }
          .doc.d3 { transform: rotate(3deg) translate(12px, -2px); }
          .doc.d4 { transform: rotate(9deg) translate(45px, 6px); }
          .doc.d1:hover { transform: rotate(-9deg) translate(-50px, -2px) scale(1.02); }
          .doc.d2:hover { transform: rotate(-3deg) translate(-16px, -6px) scale(1.02); }
          .doc.d3:hover { transform: rotate(3deg) translate(16px, -4px) scale(1.02); }
          .doc.d4:hover { transform: rotate(9deg) translate(50px, -2px) scale(1.02); }
          .doc .brandline { margin-bottom: 6px; gap: 4px; }
          .doc .brandbox { width: 10px; height: 10px; border-radius: 2px; }
          .doc .brandtext { font-size: 0.42rem; line-height: 1.2; }
          .doc .row { font-size: 0.42rem; margin-bottom: 4px; }
          .doc .stamp { margin-top: 6px; padding: 2px 5px; font-size: 0.45rem; border-radius: 4px; }
          .doc .sig { margin-top: 6px; font-size: 0.65rem; padding-top: 4px; }
          
          .trust-strip { padding: 14px 0; }
          .trust-inner { gap: 6px 12px; font-size: 0.72rem; }
          
          .overview-grid { gap: 24px; }
          .block-head { margin-bottom: 28px; }
          .comp-table th, .comp-table td { padding: 10px 8px; font-size: 0.75rem; }
          .comp-note { font-size: 0.82rem; margin-top: 16px; }
          
          .site-footer { padding-top: 36px; }
          .footer-grid { gap: 20px; padding-bottom: 28px; }
          .footer-bottom { padding: 14px 0; flex-direction: column; text-align: center; gap: 10px; }
        }
      ` }} />

      <nav className="topnav">
        <div className="topnav-inner">
          {/* Brand Logo Container */}
          <div className="logo-container group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src="/logo.svg" alt="MakInvoices Logo" className="w-10 h-10 object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-300 shrink-0" />
            <div>
              <span className="text-base font-black tracking-tight text-slate-805 dark:text-white block leading-none">
                Mak<span style={{ color: '#0ea5e9' }}>Invoices</span>
              </span>
              <span className="text-[9px] font-bold text-slate-400 dark:text-neutral-500 block tracking-wider uppercase mt-1">Advanced Ledger Hub</span>
            </div>
          </div>
          <div className="navlinks">
            <button type="button" onClick={() => handleNavScroll('overview')}>Overview</button>
            <button type="button" onClick={() => onNavigate('/about')}>About Us</button>
            <button type="button" onClick={() => handleNavScroll('features')}>Features</button>
            <button type="button" onClick={() => onNavigate('/pricing')}>Pricing</button>
            <button type="button" onClick={() => handleNavScroll('compare')}>Compare</button>
            <button type="button" onClick={() => handleNavScroll('faq')}>FAQ</button>
            <button type="button" onClick={() => onNavigate('/contact')}>Contact</button>
          </div>
          <div className="nav-actions">
            <button type="button" className="nav-login" onClick={() => onNavigate('/login')}>Log in</button>
            <button type="button" className="nav-cta" onClick={() => onNavigate('/signup')}>Start Free →</button>
          </div>
        </div>
      </nav>

      <header className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="eyebrow">AI-Powered Billing</div>
            <h1 className="hero-h1">Billing software that <em>thinks</em> with you — not just for you.</h1>
            <p className="hero-sub">Build fully editable, interactive invoices layer by layer. Let AI draft the line items. Manage invoices, quotations, purchase orders, debit notes and credit notes — from one dashboard.</p>
            <div className="cta-row">
              <button type="button" className="btn-primary" onClick={() => onNavigate('/signup')}>Create Your First Invoice Free →</button>
              <button type="button" className="btn-secondary" onClick={() => handleNavScroll('features')}>▸ Watch how it works</button>
            </div>
            <div className="micro-trust">No credit card required · Tax-ready · Mobile, tablet & desktop</div>
          </div>

          <div className="deck" aria-label="Interactive invoice layers demo">
            <div className="doc d1">
              <div className="tag">Layer: Header</div>
              <div className="brandline"><div className="brandbox"></div><div className="brandtext">YOUR LOGO<br/>Business Name</div></div>
              <div className="rule"></div>
              <div className="row"><span>Invoice No.</span><span>INV-0148</span></div>
              <div className="row"><span>Date</span><span>27 Jul 2026</span></div>
            </div>
            <div className="doc d2">
              <div className="tag">Layer: Items</div>
              <div className="row"><span>Design Services</span><span>$180.00</span></div>
              <div className="row"><span>Consulting (4h)</span><span>$60.00</span></div>
              <div className="row"><span>Hosting — Annual</span><span>$32.00</span></div>
              <div className="rule"></div>
              <div className="row"><span>Subtotal</span><span>$272.00</span></div>
            </div>
            <div className="doc d3">
              <div className="tag">Layer: Tax</div>
              <div className="row"><span>Tax Rate A</span><span>$16.32</span></div>
              <div className="row"><span>Tax Rate B</span><span>$16.32</span></div>
              <div className="rule"></div>
              <div className="row"><span>Total Due</span><span>$304.64</span></div>
              <div className="stamp">TAX READY</div>
            </div>
            <div className="doc d4">
              <div className="tag">Layer: Signature</div>
              <div className="row"><span>Payment Terms</span><span>Net 15</span></div>
              <div className="row"><span>Status</span><span>Sent</span></div>
              <div className="sig">Signed, A. Rao</div>
            </div>
          </div>
        </div>
      </header>

      <div className="trust-strip">
        <div className="wrap trust-inner">
          <span><b>10,000+</b> invoices generated</span><span className="sep">·</span>
          <span><b>4.8/5</b> average rating</span><span className="sep">·</span>
          <span>Trusted across <b>15+ countries</b></span><span className="sep">·</span>
          <span>Bank-grade <b>encryption</b></span>
        </div>
      </div>

      <section className="block" id="overview">
        <div className="wrap overview-grid">
          <div>
            <div className="eyebrow">What is MakInvoices</div>
            <h2 className="block-h2">One platform. Every billing document your business will ever need.</h2>
            <p>MakInvoices is an AI-assisted billing platform for freelancers, retailers, service providers, and growing businesses who want professional invoicing without the learning curve of legacy accounting software.</p>
            <p>Every invoice is built on <strong>editable, interactive layers</strong> — client profiles, product line items, tax splits, and signatures — each one independently editable with a live preview as you go.</p>
            <p>Use our smart <strong>Invoice Editor</strong> to draft items instantly via natural language prompting, and customize layout styling details (including toggling simple/advanced fields, borders, logo files, and custom hand-drawn signatures) directly in our <strong>Invoice Template Builder</strong>.</p>
          </div>
          <div className="mode-card">
            <div className="mode-toggle">
              <button
                type="button"
                className={`opt ${activeOverviewMode === 'simple' ? 'active' : ''}`}
                onClick={() => setActiveOverviewMode('simple')}
              >
                Invoice Editor
              </button>
              <button
                type="button"
                className={`opt ${activeOverviewMode === 'advanced' ? 'active' : ''}`}
                onClick={() => setActiveOverviewMode('advanced')}
              >
                Template Builder
              </button>
            </div>
            <div className="mode-body font-mono text-xs">
              {activeOverviewMode === 'simple' ? (
                <>
                  <div className="line"><span>Gemini Prompting</span><span>Natural language parser active</span></div>
                  <div className="line"><span>Quantity Auto-sum</span><span>Merges duplicate row quantities</span></div>
                  <div className="line"><span>Interactive Layers</span><span>Live client, item, and tax inputs</span></div>
                  <div className="line"><span>Multi-ledger Logging</span><span>Automated sales & purchase logs</span></div>
                  <div className="line"><span>Tax Auto-splits</span><span>Calculates multi-rate tax breakdowns</span></div>
                  <div className="line"><span>Localized Numbering</span><span>Auto-formats to your country's standard</span></div>
                </>
              ) : (
                <>
                  <div className="line"><span>Mode Selector</span><span>Toggle Simple vs Advanced templates</span></div>
                  <div className="line"><span>Branding Style</span><span>Upload logo files & default terms</span></div>
                  <div className="line"><span>Print Layout Options</span><span>Toggle background colors & set A4 margins</span></div>
                  <div className="line"><span>Vector Signature</span><span>Draw custom signatures on screen</span></div>
                  <div className="line"><span>Color Themes</span><span>Custom border colors & accent designs</span></div>
                  <div className="line"><span>Localized Settings</span><span>Set country profile format defaults</span></div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="block on-paper" id="features">
        <div className="wrap">
          <div className="block-head">
            <div className="eyebrow">Features</div>
            <h2 className="block-h2">Everything you need to bill smarter, not harder.</h2>
            <p className="block-sub">Nine tools, one dashboard — built so beginners and accountants both feel at home.</p>
          </div>
          <div className="feat-grid">
            <div className="feat-card"><div className="tab font-mono">AI</div><h3>Gemini Smart Billing</h3><p>Describe transactions naturally. Gemini drafts line items, rates, and updates total fields in your active invoice instantly.</p></div>
            <div className="feat-card"><div className="tab font-mono">AI</div><h3>MakInvoices Live AI Chat</h3><p>AI Support trained on vector embeddings. Get instant guidance on A4 printing layout fixes, smart billing configurations, and exports.</p></div>
            <div className="feat-card"><div className="tab font-mono">Inventory</div><h3>Smart Quantity Sync</h3><p>Adding existing items via the smart billing prompt automatically increments and accumulates quantities rather than creating repeated rows.</p></div>
            <div className="feat-card"><div className="tab font-mono">Ledger</div><h3>Sales &amp; Purchase Ledgers</h3><p>Track both sales and purchases from the sidebar menu, complete with multi-column sorting and flexible filter options.</p></div>
            <div className="feat-card"><div className="tab font-mono">Safety</div><h3>Persistent Client Profiles</h3><p>Changing a customer name automatically resets linked fields (Tax ID, Phone, Email, Region) so you never send an invoice with mismatched records.</p></div>
            <div className="feat-card"><div className="tab font-mono">Design</div><h3>Bespoke Custom Templates</h3><p>Add logo files, custom border themes, signature drawings, and control printing options like background colors for official document formats.</p></div>
            <div className="feat-card"><div className="tab font-mono">Tax</div><h3>Multi-Rate Tax Splits</h3><p>Automatically calculates split tax rates (e.g. dual-rate or tiered VAT/GST structures) and maps product tax codes to your regional tax registry.</p></div>
            <div className="feat-card"><div className="tab font-mono">Formatting</div><h3>Region-Aware Number Formatting</h3><p>Automatically formats all revenue and ledger figures to match your country's local number standard.</p></div>
            <div className="feat-card"><div className="tab font-mono">Auth</div><h3>Enterprise Auth Shield</h3><p>Full encryption of all ledger transactions and profiles using secure credential management and hardened backend authentication logic.</p></div>
          </div>
        </div>
      </section>

      <section className="block" id="compare" style={{ paddingTop: '100px' }}>
        <div className="wrap">
          <div className="block-head">
            <div className="eyebrow">Comparison</div>
            <h2 className="block-h2">How MakInvoices compares to traditional billing options.</h2>
            <p className="block-sub">Why businesses worldwide are moving off rigid, old-school invoicing tools.</p>
          </div>
          <div className="comp-table-wrap">
            <table className="comp-table font-mono">
              <thead>
                <tr><th>Capability</th><th className="brand">MakInvoices</th><th>Traditional ERP</th><th>Basic Invoice Apps</th><th>Spreadsheets</th></tr>
              </thead>
              <tbody>
                <tr><td>Gemini Smart Billing Prompting</td><td className="yes">Yes (Built-in)</td><td className="no">No</td><td className="no">No</td><td className="no">No</td></tr>
                <tr><td>Smart Quantity Auto-Sum Sync</td><td className="yes">Yes</td><td className="mid">Manual setting</td><td className="no">No</td><td className="no">No</td></tr>
                <tr><td>Flexible Simple/Advanced Templates</td><td className="yes">Yes (Toggleable)</td><td className="mid">Rigid styles</td><td className="mid">Fixed templates</td><td className="yes">Yes</td></tr>
                <tr><td>Multi-Rate Tax Auto-Splits</td><td className="yes">Yes (Automatic)</td><td className="yes">Yes</td><td className="mid">Manual entry</td><td className="no">No</td></tr>
                <tr><td>Region-Aware Number Formatting</td><td className="yes">Yes (Auto-Sync)</td><td className="mid">Config required</td><td className="no">No</td><td className="mid">Manual format</td></tr>
                <tr><td>On-Screen Vector Signature Canvas</td><td className="yes">Yes (Canvas Draw)</td><td className="no">No</td><td className="mid">Image upload only</td><td className="no">No</td></tr>
                <tr><td>RAG-Trained Support Assistant</td><td className="yes">Yes (Instant)</td><td className="no">No</td><td className="no">No</td><td className="no">No</td></tr>
              </tbody>
            </table>
          </div>
          <p className="comp-note">Fully compliant tax ledger architecture coupled with consumer-grade design simplicity.</p>
        </div>
      </section>

      {/* ═══════════════ TRUST SECTION ═══════════════ */}
      <section className="block on-paper" id="trust" style={{ paddingTop: '100px' }}>
        <div className="wrap">
          <div className="block-head">
            <div className="eyebrow">Trust &amp; Security</div>
            <h2 className="block-h2">Built for compliance. Designed for global teams.</h2>
            <p className="block-sub">Bank-grade protection and regional compliance standards — wherever your business operates.</p>
          </div>
          
          <div className="trust-grid">
            <div className="trust-card">
              <h4>Multi-Region Tax Compliance</h4>
              <p>Generates tax documents structured to match regional billing standards — whether you operate under VAT, GST, HST, or other local tax frameworks.</p>
            </div>
            <div className="trust-card">
              <h4>Data Privacy Standards</h4>
              <p>Strict data isolation and ledger protection rules aligned to widely adopted data privacy frameworks, keeping business records secure and auditable.</p>
            </div>
            <div className="trust-card">
              <h4>256-Bit SSL Shield</h4>
              <p>All transactional data between your business profile and the active ledger is fully protected with bank-grade end-to-end transport encryption.</p>
            </div>
            <div className="trust-card">
              <h4>Low Latency Global Nodes</h4>
              <p>Application instances route through regional cloud infrastructure for real-time ledger fetches and fast report generation regardless of your location.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="block" id="faq">
        <div className="wrap" style={{ maxWidth: '820px' }}>
          <div className="block-head">
            <div className="eyebrow">FAQ</div>
            <h2 className="block-h2">Frequently asked questions.</h2>
          </div>
          <div id="faqlist">
            {[
              {
                q: 'What is MakInvoices?',
                a: 'An AI-powered billing platform for creating editable, interactive invoices along with quotations, purchase orders, debit notes and credit notes — all from one dashboard.'
              },
              {
                q: 'Is it suitable for freelancers and small businesses?',
                a: 'Yes — the Template Builder\'s Simple layout is designed for generating a professional invoice in under a minute, no accounting background needed.'
              },
              {
                q: 'Does it support multiple tax types and regions?',
                a: 'Yes — MakInvoices supports configurable multi-rate tax splits (VAT, GST, HST, and more), with region-aware number formatting and tax registry mapping.'
              },
              {
                q: 'Can I customize my invoice design?',
                a: 'Every layer — logo, items, tax, signature — is independently editable, so you can rearrange and rebrand without design skills.'
              },
              {
                q: 'What documents can I create besides invoices?',
                a: 'Quotations, purchase orders, delivery challans, debit notes and credit notes — all linked to your invoice records.'
              }
            ].map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className={`faq-item ${isOpen ? 'open' : ''}`}>
                  <div className="faq-q" onClick={() => setOpenFaqIndex(isOpen ? null : idx)}>
                    <span>{item.q}</span>
                    <span className="mark">＋</span>
                  </div>
                  <div className="faq-a" style={{ maxHeight: isOpen ? '200px' : '0' }}>
                    <p>{item.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="closing">
        <div className="wrap">
          <h2>Stop wrestling with invoices.</h2>
          <p>Join businesses that switched to billing software that adapts to how they actually work.</p>
          <button type="button" className="stamp-btn" onClick={() => onNavigate('/signup')}>Create Your First Invoice Free →</button>
        </div>
      </section>

      <footer className="site-footer">
        <div className="wrap">
          <div className="footer-grid">

            {/* ── Brand Column ── */}
            <div className="footer-brand">
              <div
                className="footer-logo-row"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && window.scrollTo({ top: 0, behavior: 'smooth' })}
                aria-label="Scroll to top"
              >
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
                <li><button type="button" onClick={() => handleNavScroll('features')}>Features</button></li>
                <li><button type="button" onClick={() => onNavigate('/pricing')}>Pricing</button></li>
                <li><button type="button" onClick={() => handleNavScroll('overview')}>Integrations</button></li>
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
                <li><button type="button" onClick={() => onNavigate('/about')}>About Us</button></li>
                <li><button type="button" onClick={() => onNavigate('/contact')}>Contact</button></li>
                <li><button type="button" onClick={() => onNavigate('/login')}>Log In</button></li>
                <li><button type="button" onClick={() => onNavigate('/signup')}>Get Started</button></li>
              </ul>
            </div>

          </div>{/* /footer-grid */}

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

        </div>{/* /wrap */}
      </footer>

    </div>
  );
}
