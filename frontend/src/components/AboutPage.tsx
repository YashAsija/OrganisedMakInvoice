import React, { useState } from 'react';
import { Target, Shield, Zap, Globe, Award, CheckCircle2, ArrowRight, Sparkles, Cpu, Store, Heart, Lightbulb, Lock, FileSpreadsheet, Database, Code, RefreshCw, UserCheck, Layers, ChevronRight, Quote, BookOpen, Clock, Building2, Smartphone, BarChart3 } from 'lucide-react';

interface AboutPageProps {
  theme: 'light' | 'dark';
  onNavigate: (path: string) => void;
  onGoogleLogin: () => void;
}

export default function AboutPage({ theme, onNavigate, onGoogleLogin }: AboutPageProps) {
  const [activeStoryChapter, setActiveStoryChapter] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'mission' | 'values' | 'architecture' | 'evolution'>('mission');

  const handleNavScroll = (id: string) => {
    onNavigate('/');
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 150);
  };

  // Determine dynamic CSS variables based on theme
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

    /* ---------- HERO ---------- */
    .about-hero { padding: 140px 0 50px; text-align: center; position: relative; }
    .eyebrow {
      font-family: 'IBM Plex Mono', monospace; font-size: 0.78rem; letter-spacing: 0.14em; text-transform: uppercase;
      color: var(--stamp-red); display: inline-flex; align-items: center; gap: 10px; margin-bottom: 20px; font-weight: bold;
    }
    .eyebrow::before, .eyebrow::after { content: ""; width: 20px; height: 1px; background: var(--stamp-red); }
    
    h1.about-h1 {
      font-family: 'Fraunces', serif; font-weight: 600; font-size: clamp(2.4rem, 4vw, 3.6rem);
      line-height: 1.12; margin: 0 auto 20px; letter-spacing: -0.02em; max-width: 940px;
    }
    h1.about-h1 em { font-style: italic; color: var(--stamp-red); font-weight: 400; }
    .about-sub { font-size: 1.15rem; color: var(--text-dark-bg-dim); max-width: 780px; margin: 0 auto 36px; line-height: 1.65; }

    /* ---------- STORY CONTAINER & ACTS ---------- */
    .story-master-container {
      background: var(--ink-panel); border: 1px solid var(--paper-line); border-radius: 24px;
      padding: 56px; box-shadow: 0 15px 45px rgba(2,132,199,0.04); margin-bottom: 60px;
    }
    @media (max-width: 768px) { .story-master-container { padding: 28px; } }

    .story-act {
      border-bottom: 1px solid var(--paper-line); padding-bottom: 48px; margin-bottom: 48px;
    }
    .story-act:last-child { border-bottom: none; padding-bottom: 0; margin-bottom: 0; }

    .act-header { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
    .act-num {
      font-family: 'IBM Plex Mono', monospace; font-size: 0.75rem; font-weight: 700;
      color: var(--stamp-red); background: var(--ink-panel-2); padding: 6px 14px; border-radius: 20px;
      border: 1px solid var(--paper-line); text-transform: uppercase; letter-spacing: 0.05em; shrink: 0;
    }
    .act-title { font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: bold; color: var(--text-dark-bg); margin: 0; }

    .act-prose { font-size: 1.02rem; color: var(--text-dark-bg-dim); line-height: 1.8; }
    .act-prose p { margin-bottom: 20px; }
    .act-prose strong { color: var(--text-dark-bg); font-weight: 700; }

    .quote-callout {
      background: var(--ink-deep); border-left: 4px solid var(--stamp-red); border-radius: 0 16px 16px 0;
      padding: 24px 28px; margin: 28px 0; font-family: 'Fraunces', serif; font-style: italic; font-size: 1.15rem;
      color: var(--text-dark-bg); line-height: 1.6; border-top: 1px solid var(--paper-line); border-right: 1px solid var(--paper-line); border-bottom: 1px solid var(--paper-line);
    }

    .feature-evolution-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 32px; }
    @media (max-width: 900px) { .feature-evolution-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 600px) { .feature-evolution-grid { grid-template-columns: 1fr; } }
    
    .evo-card {
      background: var(--ink-deep); border: 1px solid var(--paper-line); border-radius: 16px; padding: 24px; transition: transform 0.2s;
    }
    .evo-card:hover { transform: translateY(-3px); }
    .evo-card-icon {
      width: 40px; height: 40px; background: var(--ink-panel-2); color: var(--stamp-red);
      border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 14px;
      border: 1px solid var(--paper-line);
    }
    .evo-card h4 { font-family: 'Fraunces', serif; font-size: 1.1rem; font-weight: bold; margin: 0 0 8px; color: var(--text-dark-bg); }
    .evo-card p { font-size: 0.88rem; color: var(--text-dark-bg-dim); margin: 0; line-height: 1.55; }

    /* ---------- TAB PILLS ---------- */
    .tab-pills { display: flex; justify-content: center; gap: 10px; margin-bottom: 34px; flex-wrap: wrap; }
    .tab-pill {
      font-family: 'IBM Plex Mono', monospace; font-size: 0.85rem; padding: 12px 24px; border-radius: 30px;
      background: var(--ink-panel); color: var(--text-dark-bg-dim); border: 1px solid var(--paper-line);
      cursor: pointer; transition: all 0.25s; font-weight: 600; display: inline-flex; align-items: center; gap: 8px;
    }
    .tab-pill:hover { color: var(--stamp-red); border-color: var(--stamp-red); transform: translateY(-1px); }
    .tab-pill.active {
      background: var(--stamp-red); color: #ffffff; border-color: var(--stamp-red-dark);
      box-shadow: 0 6px 18px rgba(2,132,199,0.25);
    }

    /* ---------- CONTENT CARDS ---------- */
    .content-box {
      background: var(--ink-panel); border: 1px solid var(--paper-line); border-radius: 20px;
      padding: 40px; box-shadow: 0 12px 40px rgba(2,132,199,0.04); margin-bottom: 60px;
    }
    @media (max-width: 600px) { .content-box { padding: 24px; } }

    .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
    @media (max-width: 768px) { .grid-2 { grid-template-columns: 1fr; } }

    .pillar-card {
      background: var(--ink-deep); border: 1px solid var(--paper-line); border-radius: 14px;
      padding: 24px; transition: transform 0.2s;
    }
    .pillar-card:hover { transform: translateY(-3px); }
    .pillar-icon {
      width: 42px; height: 42px; background: var(--ink-panel-2); color: var(--stamp-red);
      border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px;
      border: 1px solid var(--paper-line);
    }
    .pillar-card h3 { font-family: 'Fraunces', serif; font-size: 1.15rem; font-weight: bold; margin: 0 0 8px; color: var(--text-dark-bg); }
    .pillar-card p { font-size: 0.9rem; color: var(--text-dark-bg-dim); margin: 0; line-height: 1.55; }

    /* ---------- STATS STRIP ---------- */
    .stats-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 70px; }
    @media (max-width: 768px) { .stats-strip { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 480px) { .stats-strip { grid-template-columns: 1fr; } }
    .stat-card {
      background: var(--ink-panel); border: 1px solid var(--paper-line); border-radius: 14px;
      padding: 28px 20px; text-align: center; box-shadow: 0 6px 20px rgba(2,132,199,0.02);
    }
    .stat-num { font-family: 'Fraunces', serif; font-size: 2.2rem; font-weight: bold; color: var(--stamp-red); margin-bottom: 4px; }
    .stat-label { font-family: 'IBM Plex Mono', monospace; font-size: 0.76rem; color: var(--text-dark-bg-dim); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }

    /* ---------- FOOTER ---------- */
    .site-footer { background: var(--ink-panel); border-top: 1px solid var(--paper-line); padding: 64px 0 0; font-family: 'IBM Plex Sans', sans-serif; }
    .footer-grid { display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr; gap: 40px; padding-bottom: 48px; }
    @media (max-width: 900px) { .footer-grid { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 520px) { .footer-grid { grid-template-columns: 1fr; } }
    .footer-brand-name { font-size: 0.95rem; font-weight: 800; letter-spacing: -0.01em; color: var(--text-dark-bg); }
    .footer-brand-name span { color: #0ea5e9; }
    .footer-col h5 { font-family: 'IBM Plex Mono', monospace; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-dark-bg); margin: 0 0 18px; }
    .footer-col ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
    .footer-col ul li button { background: none; border: none; font-size: 0.88rem; color: var(--text-dark-bg-dim); cursor: pointer; text-align: left; transition: color 0.18s; }
    .footer-col ul li button:hover { color: var(--stamp-red); }
    .footer-bottom { border-top: 1px solid var(--paper-line); padding: 20px 0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; }
    .footer-copy { font-family: 'IBM Plex Mono', monospace; font-size: 0.72rem; color: var(--text-dark-bg-dim); }
  `;

  return (
    <div className="min-h-dvh w-full max-w-full overflow-x-hidden transition-colors duration-250 select-none text-left" style={{ background: 'var(--ink-deep)', color: 'var(--text-dark-bg)', fontFamily: 'var(--font-body)' }}>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* Top Navbar */}
      <nav className="topnav">
        <div className="topnav-inner">
          <div className="logo-container group" onClick={() => onNavigate('/')}>
            <img src="/logo.svg" alt="MakInvoices Logo" className="w-10 h-10 object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-300 shrink-0" />
            <div>
              <span className="text-base font-black tracking-tight text-slate-800 dark:text-white block leading-none">
                Mak<span style={{ color: '#0ea5e9' }}>Invoices</span>
              </span>
              <span className="text-[9px] font-bold text-slate-400 dark:text-neutral-500 block tracking-wider uppercase mt-1">Advanced Ledger Hub</span>
            </div>
          </div>
          <div className="navlinks">
            <button type="button" onClick={() => handleNavScroll('overview')}>Overview</button>
            <button type="button" className="active" onClick={() => onNavigate('/about')}>About Us</button>
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

      {/* Hero Header */}
      <header className="about-hero wrap">
        <div className="eyebrow">The Complete Founder's Journey</div>
        <h1 className="about-h1">
          From a father's paper bill book to an <em>AI-powered billing revolution</em>.
        </h1>
        <p className="about-sub">
          The full, unabridged story of how a B.Tech student built a simple invoicing tool for his dad's traditional hardware shop, and ended up solving billing accessibility for unorganized businesses everywhere.
        </p>
      </header>

      <main className="wrap">
        {/* ════════════ UNABRIDGED FOUNDER STORY MASTER CONTAINER ════════════ */}
        <section className="story-master-container">
          
          {/* ACT I */}
          <div className="story-act">
            <div className="act-header">
              <span className="act-num">Act I</span>
              <h2 className="act-title">The Hardware Shop &amp; The Paper Bill Book</h2>
            </div>
            <div className="act-prose">
              <p>
                My father has owned and operated a traditional <strong>hardware store in India</strong> for decades. For as long as I can remember, every single sale, quotation, and receipt in his shop was generated by hand using physical paper bill books with carbon sheets underneath.
              </p>
              <p>
                One afternoon, a salesperson visited my father's store pitching a mobile billing application. The agent demonstrated how moving to smartphone invoicing could make his business look far more organized and professional. My dad was genuinely excited about shifting off paper bill books — until the agent explained that using the app required a mandatory, recurring monthly subscription plan.
              </p>
            </div>
          </div>

          {/* ACT II */}
          <div className="story-act">
            <div className="act-header">
              <span className="act-num">Act II</span>
              <h2 className="act-title">The B.Tech Student's Resolution</h2>
            </div>
            <div className="act-prose">
              <p>
                That evening, my father came home and shared the story of the salesperson's visit. He talked about how much cleaner digital invoices looked compared to his handwritten bill books, but he felt reluctant to pay a monthly fee to an external company just to generate basic bills for his shop.
              </p>
              <div className="quote-callout">
                "I was a B.Tech engineering student. Hearing my dad talk about the salesperson's pitch sparked something in me. I thought: Why should my dad pay a monthly subscription to someone else for something I can build for him? I decided right then to build a full-fledged, custom invoicing app for my dad so he could use it completely free forever."
              </div>
            </div>
          </div>

          {/* ACT III */}
          <div className="story-act">
            <div className="act-header">
              <span className="act-num">Act III</span>
              <h2 className="act-title">The 2-3 Day Coding Sprint &amp; The Usability Epiphany</h2>
            </div>
            <div className="act-prose">
              <p>
                I dove into coding immediately. Working non-stop for <strong>2 to 3 days</strong>, I built a complete, working invoicing application. I was thrilled to present it to my father.
              </p>
              <p>
                However, when I handed him the phone and watched him try to create his first digital invoice, I had a sudden epiphany. My father had <strong>zero prior experience operating digital accounting software</strong>. Complex form inputs, multi-tiered drop-downs, and abstract settings panels were unnatural and frustrating for him.
              </p>
              <p>
                He was used to looking at a physical bill sheet and writing directly onto it. Standard software forced him to fill out forms blind and guess how the printed receipt would look.
              </p>
            </div>
          </div>

          {/* ACT IV */}
          <div className="story-act">
            <div className="act-header">
              <span className="act-num">Act IV</span>
              <h2 className="act-title">Inventing the Interactive Print Canvas</h2>
            </div>
            <div className="act-prose">
              <p>
                That realization transformed my entire product strategy. I realized that if an invoicing app is going to work for someone like my dad, it cannot look like a spreadsheet or a complex database form.
              </p>
              <p>
                I designed a new paradigm: the <strong>Interactive Printable Document Canvas</strong>. Instead of filling out form fields, my father could view the exact visual invoice on screen and click directly on any element — tapping the client details box, product rows, tax breakdown, or signature area — to edit it visually in real time. What he saw on the screen was 100% identical to what came out of the printer.
              </p>
              <p>
                Watching my father comfortably generate clean, professional invoices for his hardware customers without asking for help proved that this design approach was special.
              </p>
            </div>
          </div>

          {/* ACT V */}
          <div className="story-act">
            <div className="act-header">
              <span className="act-num">Act V</span>
              <h2 className="act-title">Solving India's Unorganized Market Problem</h2>
            </div>
            <div className="act-prose">
              <p>
                Seeing how dedicated I was to perfecting this tool, I realized that my father wasn't alone. Millions of small shopkeepers, sellers, and business owners in <strong>India's unorganized market</strong> face the exact same barrier: existing software is either too complex, non-customizable, or hard to operate for someone without accounting background.
              </p>
              <p>
                I made the decision to take MakInvoices professional and build an all-in-one platform tailored for everyone out there:
              </p>

              {/* Feature Origin Breakdown Grid */}
              <div className="feature-evolution-grid">
                <div className="evo-card">
                  <div className="evo-card-icon"><Layers className="w-5 h-5" /></div>
                  <h4>Custom Invoice Template Builder</h4>
                  <p>Allows any business to build custom invoice templates matching their unique company branding and layout preferences.</p>
                </div>
                <div className="evo-card">
                  <div className="evo-card-icon"><FileSpreadsheet className="w-5 h-5" /></div>
                  <h4>Sales &amp; Purchase Ledgers</h4>
                  <p>Tracks income and purchase records automatically without requiring formal bookkeeping expertise.</p>
                </div>
                <div className="evo-card">
                  <div className="evo-card-icon"><Database className="w-5 h-5" /></div>
                  <h4>Customer Database &amp; Profile Auto-Sync</h4>
                  <p>Saves client records in a secure database so repeat invoices auto-fill customer GSTINs, phone numbers, and addresses instantly.</p>
                </div>
                <div className="evo-card">
                  <div className="evo-card-icon"><BarChart3 className="w-5 h-5" /></div>
                  <h4>Integrated Expense Tracker</h4>
                  <p>Monitors daily business spending directly alongside sales to maintain clear financial health tracking.</p>
                </div>
                <div className="evo-card">
                  <div className="evo-card-icon"><Lock className="w-5 h-5" /></div>
                  <h4>Security PIN &amp; Shield</h4>
                  <p>Protects sensitive shop financial records from unauthorized access using client-side PBKDF2 encryption.</p>
                </div>
                <div className="evo-card">
                  <div className="evo-card-icon"><Sparkles className="w-5 h-5" /></div>
                  <h4>AI Smart Billing Engine</h4>
                  <p>Leverages Advanced AI to let users draft complete multi-item invoices simply by describing transactions in plain text.</p>
                </div>
              </div>
            </div>
          </div>

          {/* ACT VI */}
          <div className="story-act">
            <div className="act-header">
              <span className="act-num">Act VI</span>
              <h2 className="act-title">From Dad's Shop to Global Enterprise &amp; Daily Continuous Innovation</h2>
            </div>
            <div className="act-prose">
              <p>
                What began as a 3-day personal project to help my father transition away from paper bill books has evolved into an enterprise platform serving everyone — from local unorganized sellers and retailers to large agencies and international businesses across 15+ countries.
              </p>
              <p>
                Yet, our core promise remains unchanged: <strong>billing should be effortless for everyone out there</strong>. Every single day, we ship new software updates, performance optimizations, and security enhancements to ensure MakInvoices remains the simplest, fastest, and most accessible billing platform on the market.
              </p>
            </div>
          </div>

        </section>

        {/* Tab Pills Selector */}
        <div className="tab-pills">
          <button
            type="button"
            className={`tab-pill ${activeTab === 'mission' ? 'active' : ''}`}
            onClick={() => setActiveTab('mission')}
          >
            <Target className="w-4 h-4" /> Our Mission
          </button>
          <button
            type="button"
            className={`tab-pill ${activeTab === 'values' ? 'active' : ''}`}
            onClick={() => setActiveTab('values')}
          >
            <Sparkles className="w-4 h-4" /> Core Pillars
          </button>
          <button
            type="button"
            className={`tab-pill ${activeTab === 'architecture' ? 'active' : ''}`}
            onClick={() => setActiveTab('architecture')}
          >
            <Cpu className="w-4 h-4" /> AI Engine
          </button>
          <button
            type="button"
            className={`tab-pill ${activeTab === 'evolution' ? 'active' : ''}`}
            onClick={() => setActiveTab('evolution')}
          >
            <Award className="w-4 h-4" /> Evolution
          </button>
        </div>

        {/* Dynamic Tab Content Box */}
        <div className="content-box">
          {activeTab === 'mission' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-500 border border-sky-500/20">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-white">
                    Democratizing Billing for Every Business Owner
                  </h2>
                  <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mt-0.5">Accessibility &amp; Empowerment</p>
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
                Our mission is to ensure that no business owner — regardless of technical background — is left behind in the digital economy. We replace complex accounting jargon with intuitive, visual interfaces that make creating professional invoices as easy as typing a text message.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" /> Zero Learning Curve
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" /> 100% Tax Compliant (GST/VAT)
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" /> Reusable Customer Database
                </div>
              </div>
            </div>
          )}

          {activeTab === 'values' && (
            <div className="grid-2">
              <div className="pillar-card">
                <div className="pillar-icon"><Heart className="w-5 h-5" /></div>
                <h3>Empathy &amp; Accessibility</h3>
                <p>Designed specifically so anyone — regardless of digital literacy — can generate professional, error-free documents in seconds.</p>
              </div>
              <div className="pillar-card">
                <div className="pillar-icon"><Zap className="w-5 h-5" /></div>
                <h3>AI-First Speed</h3>
                <p>Contextual AI extracts line items, rates, and tax breakdown directly from natural language prompts.</p>
              </div>
              <div className="pillar-card">
                <div className="pillar-icon"><Lock className="w-5 h-5" /></div>
                <h3>Bank-Grade Trust</h3>
                <p>Client-side PBKDF2 encryption, PIN locks, and multi-tenant database isolation protect your confidential financial ledger.</p>
              </div>
              <div className="pillar-card">
                <div className="pillar-icon"><Database className="w-5 h-5" /></div>
                <h3>Customer Data Reuse</h3>
                <p>Saved customer profiles, GSTINs, and product categories automatically populate on future invoices to save effort.</p>
              </div>
            </div>
          )}

          {activeTab === 'architecture' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-500 border border-sky-500/20">
                  <Cpu className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-white">
                    Engineered with Next.js 16, Supabase &amp; Advanced AI
                  </h2>
                  <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mt-0.5">High Performance Tech Stack</p>
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
                MakInvoices couples high-speed Next.js 16 Turbopack rendering with Supabase PostgreSQL Row Level Security (RLS) and natural language processing.
              </p>
              <div className="bg-slate-100 dark:bg-slate-900/60 p-4 rounded-xl font-mono text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="text-sky-500 font-bold">// Core Tech Highlights</div>
                <div>• Interactive Canvas &amp; High-DPI Multi-Page Budget Splitter</div>
                <div>• Auto-Localization Engine for Indian GST (CGST/SGST/IGST) &amp; Global VAT</div>
                <div>• Dual Domestic (Razorpay INR) &amp; Global (Paddle USD/EUR) Payment Gateways</div>
                <div>• Persistent Expense Tracking &amp; Multi-Ledger Accounting Sync</div>
              </div>
            </div>
          )}

          {activeTab === 'evolution' && (
            <div className="space-y-6">
              <div className="border-l-2 border-sky-500 pl-4 space-y-6">
                <div>
                  <span className="font-mono text-xs font-bold text-sky-500 bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/20">Phase 1</span>
                  <h3 className="font-serif text-lg font-bold text-slate-900 dark:text-white mt-2">The 3-Day Prototype for Dad</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Built the initial basic invoicing tool to replace paper bill books for my father's hardware store.</p>
                </div>
                <div>
                  <span className="font-mono text-xs font-bold text-sky-500 bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/20">Phase 2</span>
                  <h3 className="font-serif text-lg font-bold text-slate-900 dark:text-white mt-2">Interactive Canvas &amp; Custom Templates</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Invented what-you-see-is-what-you-print interactive bill editing and bespoke branding template builders.</p>
                </div>
                <div>
                  <span className="font-mono text-xs font-bold text-sky-500 bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/20">Phase 3</span>
                  <h3 className="font-serif text-lg font-bold text-slate-900 dark:text-white mt-2">Ledgers, Customer Sync &amp; AI Integration</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Expanded into full sales/purchase ledgers, customer profiles database, PIN security, and AI smart billing.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Key Impact Stats */}
        <div className="stats-strip">
          <div className="stat-card">
            <div className="stat-num">50,000+</div>
            <div className="stat-label">Invoices Drafted</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">15+</div>
            <div className="stat-label">Countries Supported</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">99.9%</div>
            <div className="stat-label">Tax Split Accuracy</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">&lt; 2s</div>
            <div className="stat-label">AI Parse Speed</div>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="mb-20 text-center bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-2xl p-10 shadow-xl">
          <h2 className="font-serif text-3xl font-bold mb-3">Ready to experience friction-free billing?</h2>
          <p className="text-sky-100 max-w-xl mx-auto mb-6 text-sm">Join thousands of freelancers, agencies, and sellers who rely on MakInvoices every day.</p>
          <button
            type="button"
            onClick={() => onNavigate('/signup')}
            className="inline-flex items-center gap-2 bg-white text-sky-600 font-mono font-bold text-sm px-6 py-3 rounded-xl hover:bg-sky-50 transition-colors shadow-md"
          >
            Create Your First Invoice Free <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="site-footer">
        <div className="wrap">
          <div className="footer-grid">
            {/* Brand Column */}
            <div>
              <div className="flex items-center gap-2 mb-3 cursor-pointer group" onClick={() => onNavigate('/')}>
                <img src="/logo.svg" alt="MakInvoices Logo" className="w-9 h-9 object-contain drop-shadow-md group-hover:scale-105 transition-transform" />
                <div>
                  <span className="text-base font-black tracking-tight block leading-none" style={{ color: theme === 'dark' ? '#f8fafc' : '#0f172a' }}>
                    Mak<span style={{ color: '#0ea5e9' }}>Invoices</span>
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 dark:text-neutral-500 block tracking-wider uppercase mt-1">Advanced Ledger Hub</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
                Invoicing and billing ledger for freelancers, retailers, <span className="text-sky-500 font-medium">and finance teams</span>. Audit-ready by design.
              </p>
            </div>

            {/* Product Column */}
            <div className="footer-col">
              <h5>PRODUCT</h5>
              <ul>
                <li><button type="button" onClick={() => handleNavScroll('features')}>Features</button></li>
                <li><button type="button" onClick={() => onNavigate('/pricing')}>Pricing</button></li>
                <li><button type="button" onClick={() => handleNavScroll('overview')}>Integrations</button></li>
              </ul>
            </div>

            {/* Trust Column */}
            <div className="footer-col">
              <h5>TRUST</h5>
              <ul>
                <li><button type="button" onClick={() => onNavigate('/security')}>Security</button></li>
                <li><button type="button" onClick={() => onNavigate('/terms')}>Terms of Service</button></li>
                <li><button type="button" onClick={() => onNavigate('/privacy')}>Privacy Policy</button></li>
              </ul>
            </div>

            {/* Company Column */}
            <div className="footer-col">
              <h5>COMPANY</h5>
              <ul>
                <li><button type="button" onClick={() => onNavigate('/about')}>About Us</button></li>
                <li><button type="button" onClick={() => onNavigate('/contact')}>Contact</button></li>
                <li><button type="button" onClick={() => onNavigate('/login')}>Log In</button></li>
                <li><button type="button" onClick={() => onNavigate('/signup')}>Get Started</button></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="footer-bottom">
            <span className="footer-copy">
              © {new Date().getFullYear()} MakInvoices. All rights reserved.
            </span>
            <div className="footer-badges">
              <span className="footer-badge" title="All data encrypted with AES-256">AES 256 encrypted</span>
              <span className="footer-badge" title="Compliant with GDPR &amp; India's DPDP Act">GDPR &amp; DPDP compliant</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
