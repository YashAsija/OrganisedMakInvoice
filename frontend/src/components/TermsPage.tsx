import React from 'react';
import { FileText, Key, Scale, ShieldAlert, CreditCard, ShieldCheck, Cpu, CloudLightning, HelpCircle, HardDriveDownload, AlertTriangle, Edit3, Database, FileSpreadsheet } from 'lucide-react';

interface TermsPageProps {
  theme: 'light' | 'dark';
  onNavigate: (path: string) => void;
  onGoogleLogin: () => void;
}

export default function TermsPage({ theme, onNavigate, onGoogleLogin }: TermsPageProps) {

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

    /* ---------- TERMS HEADER ---------- */
    .terms-hero { padding: 90px 0 60px; text-align: center; }
    .eyebrow {
      font-family: 'IBM Plex Mono', monospace; font-size: 0.78rem; letter-spacing: 0.14em; text-transform: uppercase;
      color: var(--stamp-red); display: inline-flex; align-items: center; gap: 10px; margin-bottom: 22px; font-weight: bold;
    }
    .eyebrow::before, .eyebrow::after { content: ""; width: 22px; height: 1px; background: var(--stamp-red); }
    
    h1.terms-h1 {
      font-family: 'Fraunces', serif; font-weight: 500; font-size: clamp(2.4rem, 5vw, 3.8rem);
      line-height: 1.1; margin: 0 auto 20px; letter-spacing: -0.02em; color: var(--text-dark-bg); max-width: 800px;
    }
    .terms-sub { font-size: 1.1rem; color: var(--text-dark-bg-dim); max-width: 620px; margin: 0 auto; line-height: 1.6; }

    /* ---------- TERMS SECTIONS ---------- */
    .terms-sections { display: flex; flex-direction: column; gap: 40px; margin-top: 48px; }
    
    .terms-card {
      background: var(--ink-panel); border: 1px solid var(--paper-line);
      border-radius: 16px; padding: 40px;
      box-shadow: ${theme === 'dark' ? '0 10px 30px rgba(0,0,0,0.3)' : '0 10px 30px rgba(2,132,199,0.02)'};
    }
    @media (max-width: 480px) { .terms-card { padding: 24px; } }

    .terms-card-head { display: flex; gap: 18px; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--paper-line); padding-bottom: 18px; }
    .terms-icon-wrap {
      width: 44px; height: 44px; border-radius: 12px;
      background: var(--ink-panel-2); border: 1px solid var(--paper-line);
      display: flex; align-items: center; justify-content: center;
      color: var(--stamp-red); flex-shrink: 0;
    }
    .terms-card-head h2 { font-family: 'Fraunces', serif; font-size: 1.5rem; margin: 0; color: var(--text-dark-bg); font-weight: 600; }
    
    .terms-card-body h3 { font-family: 'IBM Plex Sans', sans-serif; font-size: 1.05rem; margin: 24px 0 10px; color: var(--text-dark-bg); font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; }
    .terms-card-body h3:first-child { margin-top: 0; }
    .terms-card-body p { font-size: 0.94rem; color: var(--text-dark-bg-dim); line-height: 1.65; margin: 0 0 16px; }
    .terms-card-body ul { list-style-type: square; padding-left: 20px; color: var(--text-dark-bg-dim); font-size: 0.92rem; line-height: 1.65; margin-bottom: 16px; }
    .terms-card-body li { margin-bottom: 8px; }

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
      <section className="terms-hero">
        <div className="wrap">
          <div className="eyebrow">Service Policies &amp; SLA</div>
          <h1 className="terms-h1">Terms of Service</h1>
          <p className="terms-sub">Detailed legal terms, usage agreements, service levels, liability exclusions, API regulations, compliance, and user responsibilities governing your MakInvoices ledger account.</p>
        </div>
      </section>

      {/* ---------- CONTENT SECTIONS (SEQUENTIAL ORDER) ---------- */}
      <section style={{ paddingBottom: '80px' }}>
        <div className="wrap terms-sections">
          
          {/* SECTION 1 */}
          <div className="terms-card">
            <div className="terms-card-head">
              <div className="terms-icon-wrap"><Key style={{ width: 20, height: 20 }} /></div>
              <h2>1. Account Management, Security Protocols &amp; Access Controls</h2>
            </div>
            <div className="terms-card-body">
              <h3>1.1 Registration Integrity</h3>
              <p>To use the MakInvoices service, you must complete the registration form with accurate, current, and verifiable business credentials. You represent that the business company name, tax registries (GSTIN/VAT/PAN), and contact information provided are legitimate.</p>
              
              <h3>1.2 Session Protection &amp; PIN Security</h3>
              <p>We implement offline-sync protection locks. You are solely responsible for setting, remembering, and securing your custom PIN. Your PIN is salted and hashed locally on-device; if you configure biometric credentials, authentication handles access locally. You acknowledge that if you lose your authentication credentials or security PIN while operating in an offline state, local ledger records cannot be decrypted or recovered by our support staff.</p>

              <h3>1.3 Authorized Use</h3>
              <p>You agree not to bypass, hack, disable, or interfere with any security features of the application, including multi-tenant data isolation tables. Accounts may not be shared outside of your designated team license allocations.</p>
            </div>
          </div>

          {/* SECTION 2 */}
          <div className="terms-card">
            <div className="terms-card-head">
              <div className="terms-icon-wrap"><CreditCard style={{ width: 20, height: 20 }} /></div>
              <h2>2. Billing, Subscription Tiers, Automatic Renewal &amp; Refund SLA</h2>
            </div>
            <div className="terms-card-body">
              <h3>2.1 Subscription Renewal Schedules</h3>
              <p>Subscriptions are billed on a recurring monthly or annual basis. Billed sums are charged automatically at the start of each billing period using your registered payment gateway card. Subscription fees are non-refundable except under specific criteria listed below.</p>
              
              <h3>2.2 Cancellation Policy</h3>
              <p>You may cancel your subscription at any time from your settings panel. Upon cancellation, your service level will continue until the end of your current paid billing cycle, after which your account will automatically downgrade to the Free Tier.</p>

              <h3>2.3 Refund Inquiries</h3>
              <p>Refunds are only issued under the following conditions:</p>
              <ul>
                <li>Double billing errors caused by payment gateway timeouts or processing disruptions.</li>
                <li>Support tickets submitted within 14 calendar days of an accidental auto-renewal charge, provided no invoices have been generated or cloud sync tasks have run during that new cycle.</li>
              </ul>
              <p>Approved refunds are processed back to the original payment source within 5 to 10 business days.</p>
            </div>
          </div>

          {/* SECTION 3 */}
          <div className="terms-card">
            <div className="terms-card-head">
              <div className="terms-icon-wrap"><ShieldCheck style={{ width: 20, height: 20 }} /></div>
              <h2>3. Data Ownership, Multi-Tenant Isolation &amp; Sync Licenses</h2>
            </div>
            <div className="terms-card-body">
              <h3>3.1 Client &amp; Ledger Data Ownership</h3>
              <p>You retain 100% legal ownership, intellectual rights, and proprietary authority over your client records, material catalogs, preset tax lists, and invoice transaction rows. We claim zero proprietary rights over your inputs.</p>
              
              <h3>3.2 Secure Hosting &amp; Synchronization License</h3>
              <p>To enable real-time dashboard updates, currency updates, PDF exports, and multi-device synchronizations, you grant MakInvoices a secure, isolated license to transmit, store, and backup your billing data. This license is restricted strictly to providing database storage and processing features.</p>

              <h3>3.3 Export and Portability Rights</h3>
              <p>You can export your database records (invoices, ledgers, and profile configurations) in PDF, CSV, or raw JSON formats at any time. If you decide to terminate your account, you have a 30-day window to export your data before it is permanently purged from our active databases.</p>
            </div>
          </div>

          {/* SECTION 4 */}
          <div className="terms-card">
            <div className="terms-card-head">
              <div className="terms-icon-wrap"><Scale style={{ width: 20, height: 20 }} /></div>
              <h2>4. Acceptable Conduct, Audit Shield Exclusions &amp; Jurisdictional Law</h2>
            </div>
            <div className="terms-card-body">
              <h3>4.1 Prohibited Invoicing Actions</h3>
              <p>You agree not to draft, print, email, or execute invoices that violate tax regulations, promote money laundering, contain fraudulent business profiles, or support illegal trade. We reserve the right to suspend accounts engaged in suspicious ledger configurations.</p>
              
              <h3>4.2 Audit Shield &amp; Tax Calculation Exclusions</h3>
              <p>While MakInvoices provides smart templates, automatic tax split calculations, and region-aware number formatting, the final verification of tax rates, place of supply, and compliant formatting remains your responsibility. You agree that MakInvoices is not liable for auditing penalties, incorrect tax filings, or financial liabilities resulting from template outputs.</p>

              <h3>4.3 Uptime SLA &amp; Service Availability</h3>
              <p>We target a 99.9% uptime SLA for cloud ledger synchronizations. Scheduled maintenance windows are announced at least 24 hours in advance. Under no circumstances will MakInvoices be liable for indirect losses, ledger downtime, or lost revenue.</p>

              <h3>4.4 Jurisdictional Law &amp; Arbitration</h3>
              <p>These terms of service are governed by and construed in accordance with local corporate jurisdiction laws. Any disputes, claims, or arbitrations relating to the billing system or service availability must be resolved in local tribunals.</p>
            </div>
          </div>

          {/* SECTION 5 */}
          <div className="terms-card">
            <div className="terms-card-head">
              <div className="terms-icon-wrap"><Cpu style={{ width: 20, height: 20 }} /></div>
              <h2>5. API Usage, Rate Limits &amp; Developer Integration</h2>
            </div>
            <div className="terms-card-body">
              <h3>5.1 API Access License</h3>
              <p>MakInvoices grants API access subject to active plan levels. Rate limits protect ledger infrastructure: free accounts are limited to 30 requests per minute; business/enterprise tiers are capped at 500 requests per minute. Custom endpoints may be governed by specific service addendums.</p>
              
              <h3>5.2 Abuse and Reverse Engineering</h3>
              <p>You agree not to implement scripts to scrape data from the dashboard interfaces, reverse engineer the vector PDF rendering canvas engines, or saturate the smart AI billing routers. Exceeding rate limits systematically will result in immediate IP blocks and token revocation.</p>

              <h3>5.3 Webhook Deliverability</h3>
              <p>We target 99% webhook transmission reliability. You are responsible for maintaining a secure and responsive webhook target endpoint. Webhooks returning continuous 5xx errors will automatically disable after 5 consecutive failures.</p>
            </div>
          </div>

          {/* SECTION 6 */}
          <div className="terms-card">
            <div className="terms-card-head">
              <div className="terms-icon-wrap"><CloudLightning style={{ width: 20, height: 20 }} /></div>
              <h2>6. Intellectual Property, Force Majeure &amp; Legal Notices</h2>
            </div>
            <div className="terms-card-body">
              <h3>6.1 Proprietary Materials</h3>
              <p>All source code, layout systems, document designs, typography pairings, vector logos, graphic icons, and template schemes are the exclusive property of MakInvoices. You are granted a limited license to render and export documents for standard transaction transactions only.</p>
              
              <h3>6.2 Force Majeure Disruptions</h3>
              <p>MakInvoices is not responsible for ledger synchronization delays, email transfer failures, or service disruptions caused by situations beyond our control. This includes cloud database region outages, global transit fiber severances, cyber-terror warfare, local infrastructure strikes, or sudden regulatory modifications.</p>

              <h3>6.3 Updates &amp; Amendments</h3>
              <p>We review and update these terms regularly to align with database upgrades and global tax changes. Changes are notified via dashboard banners or emails sent to your registered address. Continuing to access the ledger after updates constitute consent to modified terms.</p>
            </div>
          </div>

          {/* SECTION 7 */}
          <div className="terms-card">
            <div className="terms-card-head">
              <div className="terms-icon-wrap"><ShieldCheck style={{ width: 20, height: 20 }} /></div>
              <h2>7. Data Protection, GDPR / DPDP Compliance &amp; Sub-Processors</h2>
            </div>
            <div className="terms-card-body">
              <h3>7.1 Data Protection Principles</h3>
              <p>We process all personal and business metadata in accordance with standard international regulations, specifically the General Data Protection Regulation (GDPR) and India's Digital Personal Data Protection (DPDP) Act. We enforce strict data minimisation and purpose limitation protocols.</p>
              
              <h3>7.2 Sub-Processors</h3>
              <p>You acknowledge and agree that we utilize secure infrastructure sub-processors (including database storage hosts, authentication gateways, email deliverability servers, and payment gateways) to provide the system. A current list of sub-processors is available upon legal request. All sub-processors are bound by secure data processing agreements (DPAs).</p>

              <h3>7.3 Right to Erasure (Right to Be Forgotten)</h3>
              <p>You can request the permanent deletion of your account and related transactional history at any time. Deletion requests are processed within 30 days, resulting in the cryptographic shredding of backups and active files associated with your user ID.</p>
            </div>
          </div>

          {/* SECTION 8 */}
          <div className="terms-card">
            <div className="terms-card-head">
              <div className="terms-icon-wrap"><HardDriveDownload style={{ width: 20, height: 20 }} /></div>
              <h2>8. Inactivity, Suspension &amp; Permanent Account Termination</h2>
            </div>
            <div className="terms-card-body">
              <h3>8.1 Free Account Inactivity</h3>
              <p>To preserve database resources on our multi-region nodes, free-tier accounts that do not log in or register billing transactions for 180 consecutive days will be flagged as inactive. We will send three email notifications prior to any suspension action.</p>
              
              <h3>8.2 Data Retrieval Grace Period</h3>
              <p>Following suspension due to inactivity, we maintain your invoice records for a 30-day grace period, during which you can reactivate your account or download your database logs. After this grace period expires, inactive database schemas are permanently and irreversibly purged from our servers.</p>

              <h3>8.3 Breach Termination</h3>
              <p>If you violate any provisions regarding reverse engineering, automated API abuse, or draft fraudulent invoices, we reserve the right to suspend or terminate your account immediately without prior warning, grace periods, or refund liabilities.</p>
            </div>
          </div>

          {/* SECTION 9 */}
          <div className="terms-card">
            <div className="terms-card-head">
              <div className="terms-icon-wrap"><AlertTriangle style={{ width: 20, height: 20 }} /></div>
              <h2>9. Indemnification, Class-Action Waiver &amp; Liability Caps</h2>
            </div>
            <div className="terms-card-body">
              <h3>9.1 Indemnification</h3>
              <p>You agree to indemnify, defend, and hold harmless MakInvoices, its parent company, officers, and developers from any claims, audits, legal demands, or tax penalties resulting from your use of incorrect invoice templates, manual ledger mismatches, or fraudulent transactional activities.</p>
              
              <h3>9.2 Class-Action Waiver</h3>
              <p>You agree that any dispute resolutions, hearings, or legal arbitrations must be conducted solely on an individual basis. You waive the right to participate in class actions, representative suits, or consolidated multi-claimant hearings against MakInvoices.</p>

              <h3>9.3 Direct Liability Cap</h3>
              <p>Under no legal theory shall MakInvoices' cumulative direct liability for system interruptions, network errors, data losses, or breach claims exceed the total subscription fees paid by you to MakInvoices in the six (6) months preceding the dispute.</p>
            </div>
          </div>

          {/* SECTION 10 */}
          <div className="terms-card">
            <div className="terms-card-head">
              <div className="terms-icon-wrap"><Edit3 style={{ width: 20, height: 20 }} /></div>
              <h2>10. AI Smart Billing Assistant &amp; Signature Canvas Exclusions</h2>
            </div>
            <div className="terms-card-body">
              <h3>10.1 Gemini Generative Assistant Limitations</h3>
              <p>MakInvoices embeds large language models (specifically Gemini AI) to assist you with quick-billing prompts, line-item extraction, quantity accumulation, and ledger sorting. You acknowledge that AI outputs can occasionally present incorrect, incomplete, or mismatched invoice configurations. You are solely responsible for reviewing all draft records before saving or dispatching invoices.</p>
              
              <h3>10.2 Signature Canvas Authority</h3>
              <p>The vector signature canvas translates touch/mouse coordinates into vector paths stored within the invoice object. By applying a signature via this canvas, you represent and warrant that the signing individual possesses full authorization to sign documents on behalf of your entity. Signatures captured via our vector canvas are designated as valid electronic signatures under international digital transaction laws (including the US ESIGN Act and India's Information Technology Act).</p>
            </div>
          </div>

          {/* SECTION 11 */}
          <div className="terms-card">
            <div className="terms-card-head">
              <div className="terms-icon-wrap"><Database style={{ width: 20, height: 20 }} /></div>
              <h2>11. Offline State Sync &amp; Browser Cache Storage</h2>
            </div>
            <div className="terms-card-body">
              <h3>11.1 Local Cache Sync</h3>
              <p>To enable offline usage, draft invoice inputs, preset modifications, and client lists are stored in browser localStorage or IndexedDB cache. These entries will sync to the cloud database once internet connectivity is established.</p>
              
              <h3>11.2 Data Loss Exclusion</h3>
              <p>You acknowledge that clearing browser history, formatting cookies, using private/incognito modes, or resetting application caches before a successful cloud sync can result in the permanent loss of local offline data. MakInvoices is not responsible for data loss due to local cache deletions.</p>
            </div>
          </div>

          {/* SECTION 12 */}
          <div className="terms-card">
            <div className="terms-card-head">
              <div className="terms-icon-wrap"><FileSpreadsheet style={{ width: 20, height: 20 }} /></div>
              <h2>12. Tax Invoicing Formats, HSN/SAC Codes &amp; Local Declarations</h2>
            </div>
            <div className="terms-card-body">
              <h3>12.1 HSN/SAC and Itemized Classification</h3>
              <p>The platform provides catalog features allowing users to input HSN/SAC codes, split CGST/SGST/IGST tax rates, and record custom tax registries. MakInvoices serves strictly as an engine for calculations and does not represent official tax filing registry declarations.</p>
              
              <h3>12.2 Transport &amp; Place of Supply Data fields</h3>
              <p>Fields including place of supply, transporter vehicle numbers, GR/RR numbers, E-way bill records, and driver details are captured to format output vector PDFs. Accuracy of these inputs is the user's responsibility under local tax audit rules.</p>
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
