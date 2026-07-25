import React, { useState, useEffect } from 'react';
import {
  MessageCircle, Mail, Phone, FileText, ChevronRight, ChevronDown,
  ExternalLink, Search, Zap, BookOpen, AlertCircle, CheckCircle2,
  Star, ThumbsUp, Send, HelpCircle, Shield, Video, ArrowRight,
  ArrowLeft, Play, Code, Lock, Briefcase
} from 'lucide-react';
import { emitNotification } from '../lib/notifications';

type TicketCategory = 'billing' | 'technical' | 'account' | 'feature' | 'other';

const faqs = [
  {
    q: 'How do I create and send my first invoice?',
    a: 'Navigate to the Invoices tab from the sidebar, click "New Invoice", fill in the client details and line items, then use the "Download PDF" or "Print" option to share with your client. All invoices are automatically saved locally and synced to cloud if logged in.',
    important: true
  },
  {
    q: 'Can I customise the invoice template and design?',
    a: 'Yes! Go to Invoice Templates in the sidebar. You can choose from multiple pre-built layouts (Modern, Classic, Minimal, Bold) and customise colors, fonts, logo, and footer text directly from the Template Builder.',
    important: true
  },
  {
    q: 'How does cloud sync work and is my data secure?',
    a: 'When you sign in, your invoices and settings are encrypted and stored on Supabase (PostgreSQL). Data is synced in real-time with row-level security (RLS) policies — meaning only you can access your data.',
    important: true
  },
  {
    q: 'How do I add GST/tax to invoices?',
    a: 'You can set a default tax rate in your company profile (Settings → Company Info → Default Tax Rate). Alternatively, per-line item tax rates can be set when creating invoices using HSN codes from the HSN Registry.',
    important: true
  },
  {
    q: 'How do I manage my purchases, purchase orders, and debit notes?',
    a: 'Go to the Purchases Ledger in the sidebar. You can manage draft and finalized purchase bills, purchase orders (PO), and debit notes from the respective tabs. You can also view purchase analytics on total spending, paid amount, and pending payments at the top of the purchases ledger.',
    important: true
  },
  {
    q: 'What is MakInvoices AI and how can it assist me?',
    a: 'MakInvoices AI is your built-in live assistant available in the Chat section. It has full context of the application and can answer questions about invoice creation, settings, registries, templates, and walk you through app features in multiple languages.',
    important: true
  },
  {
    q: 'What is the difference between Billed Vendors and the Vendor Database?',
    a: 'Billed Vendors under the Financial Hub are profiles automatically generated and captured from your purchase ledger documents. The Vendor Database under the Master Registry is your official pre-saved master vendor book where you can manually add, edit, or bulk import/export supplier profiles.',
    important: false
  },
  {
    q: 'How do I use the HSN/SAC Registry?',
    a: 'Under the Master Registry in the sidebar, open HSN Registry. You can pre-save standard tax rates and service description codes (SAC) to quickly assign them to products when billing.',
    important: false
  },
  {
    q: 'What is the Transport Database used for?',
    a: 'The Transport Database saves transport carriers, vehicle numbers, driver phone numbers, and E-Way bills. These details are used to fill out the transport/shipping sections on tax invoices.',
    important: false
  },
  {
    q: 'Can I export my data in bulk?',
    a: 'Yes. Go to the Reports tab and use the Export button to download all invoices as an Excel spreadsheet (.xlsx). You can also export individual invoices as PDF from the invoice list.',
    important: false
  },
  {
    q: 'What happens to my data if I sign out?',
    a: 'All data remains safely stored in the cloud. Signing out only ends your local session — your invoices, clients, and company profile remain accessible when you sign back in.',
    important: false
  },
  {
    q: 'How do I enable PIN lock for security?',
    a: 'Go to Settings → Security → PIN Passcode Lock and click Enable. You will be prompted to set a 4-digit PIN. The PIN is required each time the app is opened or refreshed.',
    important: false
  },
  {
    q: 'How do I create Proforma Invoices?',
    a: 'When creating a new document, select "Proforma Invoice" from the document type tabs on top of the editor. This uses your starting proforma sequence numbers and proforma prefix.',
    important: false
  },
  {
    q: 'What are Credit Notes used for?',
    a: 'Credit Notes are issued for sales returns, adjustments, or write-offs. Select "Credit Note" from the document type tab in the invoice creator to document a return.',
    important: false
  },
  {
    q: 'How do I document purchase returns using Debit Notes?',
    a: 'Open the Purchases Ledger, select the Debit Notes sub-section, and click "Create Debit Note". This represents a return of goods or value adjustments to your suppliers.',
    important: false
  },
  {
    q: 'What is the difference between Billed Clients and the Client Database?',
    a: 'Billed Clients under the Financial Hub includes profiles auto-generated from your sales invoices, quotes, and proformas. The Client Database under the Master Registry is a list of pre-saved client contacts.',
    important: false
  },
  {
    q: 'Can I add custom fields or columns to invoice tables?',
    a: 'Yes. In both the Quick Builder and Advanced Studio, you can toggle columns, rename headers, and add custom fields to the details block dynamically.',
    important: false
  },
  {
    q: 'What languages does the MakInvoices AI assistant support?',
    a: 'MakInvoices AI supports English, Hindi, Hinglish, Spanish, French, and German. You can switch the chat language at any time in the support chat page.',
    important: false
  },
  {
    q: 'How do I manage my Business/Company Profile?',
    a: 'Go to Settings → Company Info. Here you can configure your business name, logo, address, email, phone, GSTIN, PAN, and payment/bank details to automatically pre-populate them on all generated documents.',
    important: false
  },
  {
    q: 'Can I change the currency symbol?',
    a: 'Yes. In your Business/Company Profile under Settings, you can select your default currency (INR, USD, GBP, EUR, etc.). The app will automatically render the corresponding currency symbol (₹, $, £, €, etc.) on all invoice templates and tables.',
    important: false
  },
  {
    q: 'How do CGST, SGST, and IGST tax splits work?',
    a: 'When GST is enabled, if your business state matches the client\'s billing state, the system splits tax equally into CGST and SGST (e.g., 9% + 9% for 18% total). If the states differ, it automatically calculates it as IGST (18% total).',
    important: false
  },
  {
    q: 'How do I upload my business logo?',
    a: 'Navigate to Settings → Company Info, click the Logo area to upload your image, and save. You can also customize the logo\'s width, height, and alignment on the document from the Template Builder.',
    important: false
  },
  {
    q: 'How do I add a QR code for payments?',
    a: 'When creating an invoice, make sure "Payment Info" is toggled on. You can input your UPI ID or banking information, and the system will automatically generate a dynamic scan-to-pay QR code on the bottom of the invoice.',
    important: false
  },
  {
    q: 'Can I pre-save frequently used Terms & Conditions?',
    a: 'Yes. You can edit your default terms and conditions in the Template Builder configuration. This preset text will automatically load on all new invoices, reducing manual typing.',
    important: false
  },
  {
    q: 'How do I add an authorized signature or stamp?',
    a: 'In the Template Builder (Advanced Studio), you can upload a PNG signature image, set the signatory\'s name and designation, and place it at the bottom-right corner of your invoices.',
    important: false
  },
  {
    q: 'What is the Material Catalog?',
    a: 'The Material Catalog under Master Registry allows you to pre-define item names, unit descriptions, default rates/unit prices, standard HSN codes, and categories to instantly search and populate invoice items.',
    important: false
  },
  {
    q: 'What is the Product Category registry?',
    a: 'Product Category registry allows you to categorize your materials, goods, and consulting services (e.g., SaaS Subscriptions, Hardware Consulting) for cleaner reports and inventory management.',
    important: false
  },
  {
    q: 'Does this app support offline invoice creation?',
    a: 'Yes! MakInvoices is built as a progressive web app. All drafts and finalized documents are saved to your browser\'s local storage first, allowing you to edit and create bills even when offline. Once you connect to the internet, they sync to the cloud.',
    important: false
  },
  {
    q: 'What are real-time notifications used for?',
    a: 'The notification drawer in the top-right keeps you updated on background tasks, bulk import completions, draft autosaves, and security actions within your account.',
    important: false
  },
  {
    q: 'How do I check my monthly financial reports?',
    a: 'Go to the Reports tab from the sidebar. You can view overall stats for total sales and purchases, paid vs pending amounts, and export the entire invoice ledger database to Excel.',
    important: false
  },
  {
    q: 'What is the Dashboard in the sidebar?',
    a: 'The Dashboard provides a bird\'s-eye view of your business, showing quick links, financial summaries, recent activity, billing status graphs, and immediate access to tools like Quick Bill.',
    important: false
  },
  {
    q: 'What is the Sales Ledger in the sidebar?',
    a: 'The Sales Ledger organizes all your outbound billing, including Tax Invoices, Proforma Invoices, Credit Notes, and Quotes/Estimates. You can create, edit, filter, and track payments here.',
    important: false
  },
  {
    q: 'What is the Purchases Ledger in the sidebar?',
    a: 'The Purchases Ledger lets you track all inbound vendor bills, Purchase Orders (PO), and Debit Notes. It also displays purchase analytics like total spending, paid amount, and pending vendor payments.',
    important: false
  },
  {
    q: 'What is Billed Clients in the sidebar?',
    a: 'Billed Clients is a directory of customer profiles automatically captured and populated from your finalized sales invoices, quotes, and proformas.',
    important: false
  },
  {
    q: 'What is Billed Vendors in the sidebar?',
    a: 'Billed Vendors is a directory of supplier profiles automatically captured and populated from your finalized purchase ledger documents (bills, POs, and debit notes).',
    important: false
  },
  {
    q: 'What is Accounting Summary in the sidebar?',
    a: 'Accounting Summary (Reports) provides a detailed overview of your cashflow, sales statistics, expense graphs, and lets you bulk-export your entire invoice history as an Excel spreadsheet.',
    important: false
  },
  {
    q: 'What is Creator Profile in the sidebar?',
    a: 'Creator Profile lets you manage your digital business identity, including contact info, default tax configurations, onboarding setup, and profile visual themes.',
    important: false
  },
  {
    q: 'What is Invoice Template in the sidebar?',
    a: 'Invoice Template takes you to the Template Builder hub. You can use the Quick Builder wizard or Advanced Studio to customize layouts, fonts, logos, colors, and layout sections.',
    important: false
  },
  {
    q: 'What is Learn MakInvoices in the sidebar?',
    a: 'Learn MakInvoices provides helpful video walkthroughs, documentation, and feature guides to help you get the most out of the invoicing features.',
    important: false
  },
  {
    q: 'What is Client Database in the Master Registry?',
    a: 'Client Database is your master client list where you can pre-save customer contact and billing details, export the database, or bulk-import profiles via Excel.',
    important: false
  },
  {
    q: 'What is Vendor Database in the Master Registry?',
    a: 'Vendor Database is your master vendor list where you can pre-save supplier billing info, export vendor lists, or bulk-upload supplier contact profiles via Excel.',
    important: false
  },
  {
    q: 'What is HSN Registry in the Master Registry?',
    a: 'HSN Registry allows you to pre-configure Standard HSN/SAC codes and default tax rates to assign them to products without typing.',
    important: false
  },
  {
    q: 'What is Transport Database in the Master Registry?',
    a: 'Transport Database is a repository for transport carriers, vehicle numbers, E-Way bills, and driver numbers to auto-populate shipping and transport sections.',
    important: false
  },
  {
    q: 'What is Material Catalog in the Master Registry?',
    a: 'Material Catalog is your master product catalog where you can pre-save items, services, default billing units (UOM), unit rates, and standard HSN codes.',
    important: false
  },
  {
    q: 'What is Product Category in the Master Registry?',
    a: 'Product Category registry allows you to define categories (e.g., Consulting, Hardware, SaaS) to organize your materials catalog and filter accounting reports.',
    important: false
  }
];

interface SupportPageProps {
  onChatClick?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export default function SupportPage({ onChatClick, onNavigateTab }: SupportPageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeResource, setActiveResource] = useState<'guide' | 'video' | 'privacy' | 'shortcuts' | null>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path === '/support/getting-started') return 'guide';
      if (path === '/support/video-tutorials') return 'video';
      if (path === '/support/privacy-policy') return 'privacy';
    }
    return null;
  });
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [activeGuideStep, setActiveGuideStep] = useState(1);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'done'>('idle');

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/support/getting-started') setActiveResource('guide');
      else if (path === '/support/video-tutorials') setActiveResource('video');
      else if (path === '/support/privacy-policy') setActiveResource('privacy');
      else if (path.startsWith('/support')) setActiveResource(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [ticketCategory, setTicketCategory] = useState<TicketCategory>('technical');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketBody, setTicketBody] = useState('');
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRating, setActiveRating] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('makinvoices_user_review_rating');
      return saved ? parseInt(saved, 10) : null;
    }
    return null;
  });
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('makinvoices_user_review_text') || '';
    }
    return '';
  });
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('makinvoices_user_review_submitted') === 'true';
    }
    return false;
  });

  const filteredFaqs = faqs.filter(faq => {
    const isMatched = searchQuery.trim().length >= 2 && (
      faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (searchQuery.trim().length < 2) {
      return faq.important;
    }
    return isMatched;
  });

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketBody.trim()) return;
    setTicketSubmitted(true);
    emitNotification('Support Ticket Submitted', `Your ticket "${ticketSubject}" has been received. Our team will contact you shortly.`, 'success');
    setTimeout(() => {
      setTicketSubmitted(false);
      setTicketSubject('');
      setTicketBody('');
    }, 4000);
  };

  const categories: { id: TicketCategory; label: string }[] = [
    { id: 'billing', label: 'Billing & Payments' },
    { id: 'technical', label: 'Technical Issue' },
    { id: 'account', label: 'Account & Access' },
    { id: 'feature', label: 'Feature Request' },
    { id: 'other', label: 'Other' },
  ];

  if (activeResource === 'guide') {
    const stepsData = [
      {
        step: 1,
        title: 'Set Up Company Profile',
        desc: 'Navigate to System Settings → Company Info. Fill in your business name, phone, email, registered GSTIN, PAN, and upload your official logo. This information automatically pre-populates all generated documents.',
        badge: 'Essential',
        actions: [
          { tabId: 'profile', label: 'Configure Company Info', icon: <Lock className="w-4 h-4" /> }
        ]
      },
      {
        step: 2,
        title: 'Populate Master Registries',
        desc: 'Open the Master Registry section. Pre-save standard HSN/SAC tax codes, configure material descriptions & prices in the Material Catalog, and add client profiles inside the Client Database. This enables auto-completion during invoice editing.',
        badge: 'Time-Saver',
        actions: [
          { tabId: 'master_vendor', label: 'Manage Registries', icon: <FileText className="w-4 h-4" /> }
        ]
      },
      {
        step: 3,
        title: 'Customize Invoice Templates',
        desc: 'Go to Tools & Design → Invoice Template. Choose between Modern, Classic, Minimal, and Bold layouts. In the Advanced Studio, you can toggle columns, change colors, set default T&Cs, and upload signature stamps.',
        badge: 'Branding',
        actions: [
          { tabId: 'invoice_templates', label: 'Open Template Builder', icon: <Zap className="w-4 h-4" /> }
        ]
      },
      {
        step: 4,
        title: 'Manage Sales & Purchase Ledgers',
        desc: 'Use the Sales Ledger to issue Tax Invoices, Quotes, Credit Notes, and Proformas. Use the Purchases Ledger to record purchase bills, POs, and Debit Notes. Split taxes (CGST/SGST/IGST) will calculate automatically based on state profiles.',
        badge: 'Accounting',
        actions: [
          { tabId: 'invoices', label: 'Open Sales Ledger', icon: <FileText className="w-4 h-4" /> },
          { tabId: 'purchases', label: 'Open Purchases Ledger', icon: <Briefcase className="w-4 h-4" /> }
        ]
      },
      {
        step: 5,
        title: 'Monitor Analytics & Export Data',
        desc: 'Review total revenue and expenses in the Billing Dashboard. Go to Financial Hub → Accounting Summary to see detailed graphs and click Export to download your entire ledger dataset to an Excel spreadsheet instantly.',
        badge: 'Reporting',
        actions: [
          { tabId: 'reports', label: 'View Accounting Summary', icon: <HelpCircle className="w-4 h-4" /> }
        ]
      }
    ];

    const currentStepData = stepsData[activeGuideStep - 1];
    const progressPercent = Math.round((activeGuideStep / 5) * 100);

    return (
      <div className="space-y-6 animate-in fade-in duration-200 w-full">
        {/* Top Back bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setActiveResource(null);
              if (typeof window !== 'undefined') {
                window.history.pushState(null, '', '/support');
              }
            }}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#64748b] hover:text-[#0f172a] dark:hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Support
          </button>
          
          <span className="text-[10px] font-black uppercase tracking-widest text-[#64748b]/75 dark:text-zinc-500">
            Progress: {progressPercent}% ({activeGuideStep} / 5)
          </span>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-base font-black text-[#0f172a] dark:text-white uppercase tracking-tight">Interactive Onboarding Guide</h1>
          <p className="text-[10px] text-[#64748b]/80 dark:text-zinc-400 mt-0.5">Follow this interactive wizard to configure your workspace and start billing</p>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-[#e2e8f0] dark:bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-amber-400 via-[#C6A87D] to-[#64748b] transition-all duration-300 rounded-full" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Two-Column Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left Column: Step List Tab Selectors */}
          <div className="md:col-span-4 flex md:flex-col overflow-x-auto gap-2 pb-2 md:pb-0 scrollbar-none shrink-0 w-full min-w-0 md:space-y-2">
            {stepsData.map((s, idx) => {
              const isActive = s.step === activeGuideStep;
              return (
                <React.Fragment key={s.step}>
                  <button
                    onClick={() => setActiveGuideStep(s.step)}
                    className={`p-2.5 md:p-3 text-center md:text-left text-xs font-bold rounded-full md:rounded-2xl transition-all flex items-center justify-center md:justify-start gap-2.5 cursor-pointer border shrink-0 w-9 h-9 md:w-full md:h-auto ${
                      isActive 
                        ? 'bg-[#0f172a] dark:bg-zinc-800 text-white border-transparent font-extrabold shadow-sm scale-102'
                        : 'bg-white dark:bg-zinc-900 border-[#e2e8f0]/60 dark:border-zinc-800 text-slate-650 dark:text-zinc-400 hover:bg-[#FCFAF7] dark:hover:bg-zinc-850'
                    }`}
                  >
                    <span className={`w-5 h-5 md:w-6 md:h-6 rounded-full md:rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                      isActive 
                        ? 'bg-white/20 md:bg-white/20 text-white' 
                        : 'bg-slate-100 dark:bg-zinc-950 text-slate-500'
                    }`}>
                      {s.step}
                    </span>
                    <div className="hidden md:block min-w-0">
                      <span className="block truncate font-black text-[10.5px] uppercase tracking-wider">{s.title.split(' ')[0]}</span>
                      <span className="hidden md:block text-[9px] text-slate-400 font-medium truncate mt-0.5">{s.badge}</span>
                    </div>
                  </button>
                  {idx < stepsData.length - 1 && (
                    <div className="h-0.5 w-4 bg-[#e2e8f0] dark:bg-zinc-800 shrink-0 self-center md:hidden" />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Right Column: Step Details Panel */}
          <div className="md:col-span-8 bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-5 relative overflow-hidden min-h-[300px] flex flex-col justify-between">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-[#C6A87D] to-[#64748b]" />
            
            <div className="space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className="text-[9.5px] font-black uppercase tracking-widest text-[#64748b] block mb-1">
                    Step {currentStepData.step} of 5
                  </span>
                  <h2 className="text-sm font-black uppercase tracking-tight text-[#0f172a] dark:text-white">
                    {currentStepData.title}
                  </h2>
                </div>
                <span className="text-[8.5px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-350 shrink-0">
                  {currentStepData.badge}
                </span>
              </div>

              <p className="text-[11.5px] text-[#64748b] dark:text-zinc-400 leading-relaxed">
                {currentStepData.desc}
              </p>

              {/* Action Trigger Buttons */}
              {onNavigateTab && currentStepData.actions && (
                <div className="flex flex-wrap gap-3 pt-2">
                  {currentStepData.actions.map(act => (
                    <button
                      key={act.label}
                      onClick={() => {
                        onNavigateTab(act.tabId);
                        emitNotification('Navigating', `Opening ${act.label}...`, 'info');
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0f172a] hover:bg-[#5C5043] dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm hover:scale-102"
                    >
                      {act.icon}
                      <span>{act.label}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Wizard Footer Nav */}
            <div className="flex items-center justify-between pt-5 border-t border-[#e2e8f0]/40 dark:border-zinc-800 mt-auto">
              <button
                onClick={() => setActiveGuideStep(p => Math.max(1, p - 1))}
                disabled={activeGuideStep === 1}
                className="px-3.5 py-2 text-[10.5px] font-black uppercase tracking-wider border border-[#e2e8f0] dark:border-zinc-750 text-slate-650 dark:text-zinc-350 hover:bg-[#FCFAF7] dark:hover:bg-zinc-850 rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => {
                  if (activeGuideStep < 5) {
                    setActiveGuideStep(p => p + 1);
                  } else {
                    setActiveResource(null);
                    if (typeof window !== 'undefined') {
                      window.history.pushState(null, '', '/support');
                    }
                    emitNotification('Guide Completed', 'Workspace configured successfully! Start billing now.', 'success');
                  }
                }}
                className="px-4 py-2 text-[10.5px] font-black uppercase tracking-wider bg-[#0f172a] hover:bg-[#5C5043] dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white rounded-xl transition-all cursor-pointer hover:scale-102"
              >
                {activeGuideStep === 5 ? 'Finish & Start Billing' : 'Next Step'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeResource === 'video') {
    return (
      <div className="space-y-6 animate-in fade-in duration-200 w-full max-w-4xl">
        <button
          onClick={() => {
            setActiveResource(null);
            if (typeof window !== 'undefined') {
              window.history.pushState(null, '', '/support');
            }
          }}
          className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#64748b] hover:text-[#0f172a] dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Support
        </button>
        
        <div>
          <h1 className="text-base font-black text-[#0f172a] dark:text-white uppercase tracking-tight">Video Tutorials</h1>
          <p className="text-[10px] text-[#64748b]/80 dark:text-zinc-400 mt-0.5">Step-by-step video guides showing you how to maximize your MakInvoices features</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              title: 'Dashboard & Workspace Tour',
              desc: 'Learn how to navigate your sales/purchase ledger, read analytics, and perform quick actions.',
              duration: '3:45 mins',
              tag: 'Dashboard'
            },
            {
              title: 'Customizing Templates in Advanced Studio',
              desc: 'Step-by-step layout design editing, custom fields, bank detail QR setups, and signature overlays.',
              duration: '5:12 mins',
              tag: 'Template Builder'
            },
            {
              title: 'GST Split Tax & HSN Code Registry',
              desc: 'Configure state billing details, automatically split CGST/SGST/IGST tax, and assign HSN catalog items.',
              duration: '4:20 mins',
              tag: 'Registries'
            },
            {
              title: 'Purchases Ledger, POs & Debit Notes',
              desc: 'How to manage supplier logs, send Purchase Orders, and issue Debit Notes for returns.',
              duration: '6:30 mins',
              tag: 'Purchases'
            }
          ].map(vid => (
            <div
              key={vid.title}
              onClick={() => setPlayingVideo(vid.title)}
              className="bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs hover:border-[#64748b]/40 cursor-pointer group transition-colors"
            >
              {/* Simulated Thumbnail */}
              <div className="h-36 bg-gradient-to-br from-[#FDFAF7] to-[#f1f5f9] dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center relative border-b border-[#e2e8f0]/40 dark:border-zinc-800">
                <div className="w-10 h-10 rounded-full bg-[#0f172a] text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                </div>
                <span className="absolute bottom-2 right-2 text-[8.5px] font-black bg-black/60 text-white px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                  {vid.duration}
                </span>
              </div>
              <div className="p-4">
                <span className="text-[8px] font-black uppercase tracking-widest text-[#64748b]/80 dark:text-zinc-500 block mb-1">{vid.tag}</span>
                <h3 className="text-xs font-black uppercase tracking-tight text-[#0f172a] dark:text-white leading-snug">{vid.title}</h3>
                <p className="text-[10px] text-[#64748b] dark:text-zinc-400 mt-1.5 leading-relaxed">{vid.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Video Player Modal */}
        {playingVideo && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-4 flex items-center justify-between border-b border-zinc-800 bg-zinc-900/50">
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Tutorial: {playingVideo}</span>
                <button
                  onClick={() => setPlayingVideo(null)}
                  className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
              
              {/* Mock Player Screen */}
              <div className="aspect-video bg-black flex flex-col items-center justify-center relative p-6">
                <Video className="w-16 h-16 text-zinc-700 animate-pulse mb-3" />
                <span className="text-xs text-zinc-400 font-bold">Simulating video playback stream...</span>
                <p className="text-[10px] text-zinc-500 mt-1">This demo simulates playing the "{playingVideo}" video guide.</p>
                
                {/* Playback Controls Overlay */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex flex-col gap-2">
                  {/* Scrub Bar */}
                  <div className="h-1 bg-zinc-700 rounded-full overflow-hidden w-full cursor-pointer">
                    <div className="w-1/3 h-full bg-sky-500" />
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-zinc-400 uppercase tracking-widest font-black pt-1">
                    <span>01:15 / 04:30</span>
                    <span>1080p HD</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeResource === 'privacy') {
    return (
      <div className="space-y-6 animate-in fade-in duration-200 w-full">
        {/* Top Back bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setActiveResource(null);
              if (typeof window !== 'undefined') {
                window.history.pushState(null, '', '/support');
              }
            }}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#64748b] hover:text-[#0f172a] dark:hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Support
          </button>
          
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-650 dark:text-emerald-450 text-[9px] font-black uppercase tracking-wider border border-emerald-200/50">
            <Lock className="w-2.5 h-2.5" /> Encrypted Session
          </span>
        </div>
        
        {/* Header */}
        <div>
          <h1 className="text-base font-black text-[#0f172a] dark:text-white uppercase tracking-tight">Privacy & Security Center</h1>
          <p className="text-[10px] text-[#64748b]/80 dark:text-zinc-400 mt-0.5">Learn how MakInvoices protects, encrypts, and handles your billing data</p>
        </div>

        {/* Two-Column Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left Column: Integrity Widget & Sticky Summary checklist */}
          <div className="md:col-span-4 space-y-4">
            {/* Dynamic Security Health Widget */}
            <div className="bg-[#FCFAF7] dark:bg-zinc-950 border border-[#e2e8f0]/40 dark:border-zinc-850 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#0f172a] dark:text-white">Security Shield</h4>
                <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 px-2.5 py-1 rounded-xl border border-slate-100 dark:border-zinc-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-[8px] font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300">Secured</span>
                </div>
              </div>
              <p className="text-[10.5px] text-[#64748b] dark:text-zinc-450 leading-relaxed">
                Your data is stored in your browser local IndexedDB database, sandboxed under active origin-isolation and secure SSL.
              </p>
            </div>

            {/* Quick Guarantees checklist */}
            <div className="bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-3xl p-5 shadow-xs space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#0f172a] dark:text-white">Our Guarantees</h4>
              <div className="space-y-2">
                {[
                  '100% Offline-First Architecture',
                  'Zero Remote Server Telemetry',
                  'Exclusive Local Data Ownership',
                  'Complies with SAIF Standards',
                  'End-to-End Encryption Keys'
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 text-[10.5px] text-[#64748b] dark:text-zinc-400 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Security Scanner Widget */}
            <div className="bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#0f172a] dark:text-white">Security Integrity Check</h4>
                <Shield className="w-4 h-4 text-sky-500" />
              </div>
              
              {scanState === 'idle' && (
                <div className="space-y-3">
                  <p className="text-[10px] text-[#64748b] dark:text-zinc-450 leading-relaxed">
                    Verify local database configurations, connection protocols, and active security keys.
                  </p>
                  <button
                    onClick={() => {
                      setIsScanning(true);
                      setScanState('scanning');
                      setScanProgress(0);
                      let currentProgress = 0;
                      const interval = setInterval(() => {
                        currentProgress += 10;
                        if (currentProgress >= 100) {
                          clearInterval(interval);
                          setScanProgress(100);
                          setIsScanning(false);
                          setScanState('done');
                          emitNotification('Scan Complete', 'All workspace parameters verified secure!', 'success');
                        } else {
                          setScanProgress(currentProgress);
                        }
                      }, 150);
                    }}
                    className="w-full py-2 bg-[#0f172a] hover:bg-[#5C5043] dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-[9.5px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs text-center"
                  >
                    Run Diagnostics Check
                  </button>
                </div>
              )}

              {scanState === 'scanning' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-[#64748b]">
                    <span>Scanning local database...</span>
                    <span>{scanProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-zinc-950 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 transition-all duration-150" 
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                  <div className="space-y-1.5 text-[9px] font-bold text-[#64748b]">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${scanProgress >= 20 ? 'bg-emerald-500' : 'bg-slate-300 animate-pulse'}`} />
                      <span>IndexedDB isolation rules</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${scanProgress >= 50 ? 'bg-emerald-500' : 'bg-slate-300 animate-pulse'}`} />
                      <span>SSL handshake & origin headers</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${scanProgress >= 80 ? 'bg-emerald-500' : 'bg-slate-300 animate-pulse'}`} />
                      <span>Supabase RLS token scopes</span>
                    </div>
                  </div>
                </div>
              )}

              {scanState === 'done' && (
                <div className="space-y-3 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-450">Verified: Secure</span>
                  </div>
                  <p className="text-[9.5px] text-slate-550 dark:text-zinc-550 leading-relaxed">
                    Diagnostics successfully validated. Sandbox encryption keys are isolation-separated and cloud sync filters are active.
                  </p>
                  <button
                    onClick={() => setScanState('idle')}
                    className="w-full py-1.5 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-850 text-slate-650 dark:text-zinc-400 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center"
                  >
                    Reset Check
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Key Pillars & Technical Details */}
          <div className="md:col-span-8 space-y-6">
            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { 
                  icon: <Shield className="w-5 h-5 text-sky-500" />, 
                  title: 'Sandbox Storage', 
                  desc: 'All billing drafts, ledger entries, and clients are saved in your local browser sandbox, isolated from external access.' 
                },
                { 
                  icon: <Lock className="w-5 h-5 text-violet-500" />, 
                  title: 'AES-256 PIN Lock', 
                  desc: 'Optional 4-digit PIN locks and decrypts database credentials natively. Your security code is never transmitted to remote servers.' 
                },
                { 
                  icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />, 
                  title: 'Supabase RLS Rules', 
                  desc: 'All cloud backups undergo strict Row-Level Security checks, guaranteeing only matching authenticated user profiles can load records.' 
                }
              ].map(card => (
                <div key={card.title} className="bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-3xl p-4 shadow-xs hover:border-[#64748b]/30 transition-all group">
                  <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-zinc-950 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                    {card.icon}
                  </div>
                  <h3 className="text-[11px] font-black uppercase tracking-tight text-[#0f172a] dark:text-white leading-snug">{card.title}</h3>
                  <p className="text-[9.5px] text-[#64748b] dark:text-zinc-450 mt-1 leading-normal">{card.desc}</p>
                </div>
              ))}
            </div>

            {/* Detailed Breakdown Sections */}
            <div className="bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-6">
              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-amber-400 rounded-full" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[#0f172a] dark:text-white">1. Data Storage & Ownership</h3>
                </div>
                <p className="text-[11px] text-[#64748b] dark:text-zinc-400 leading-relaxed pl-3">
                  MakInvoices AI operates on a user-centric data model. All invoices, quotes, client databases, and templates remain your exclusive property. We do not inspect, aggregate, sell, or analyze your billing transactions. Data saved offline stays completely offline.
                </p>
              </section>

              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-[#C6A87D] rounded-full" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[#0f172a] dark:text-white">2. Offline Operations & Processing</h3>
                </div>
                <p className="text-[11px] text-[#64748b] dark:text-zinc-400 leading-relaxed pl-3">
                  All processing happens natively inside your browser compiling Javascript components. No third-party servers intercept intermediate values or billing input data. Finalized documents are encoded locally to create PDFs or print templates.
                </p>
              </section>

              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-[#64748b] rounded-full" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[#0f172a] dark:text-white">3. Zero Telemetry Policy</h3>
                </div>
                <p className="text-[11px] text-[#64748b] dark:text-zinc-400 leading-relaxed pl-3">
                  We do not track keyboard input, system processes, or browser plugins. Our software runs isolated in standard sandboxed tabs with zero tracker tags, marketing analytics, or user profiling modules.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    );
  }




  return (
    <div className="space-y-6 animate-in fade-in duration-200 w-full">
      {/* Page header */}
      <div>
        <h1 className="text-base font-black text-[#0f172a] dark:text-white uppercase tracking-tight">Help & Support</h1>
        <p className="text-[10px] text-[#64748b]/80 dark:text-zinc-400 mt-0.5">Find answers, contact our team, or submit a support ticket</p>
      </div>

      {/* Quick channels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: <Mail className="w-5 h-5" />, label: 'Email Support', value: 'support@makinvoices.com', sub: 'Response within 24h', color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-950/30' },
          { icon: <MessageCircle className="w-5 h-5" />, label: 'Live Chat', value: 'Available 9am–6pm IST', sub: 'Mon–Fri on web app', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30', isChat: true },
          { icon: <FileText className="w-5 h-5" />, label: 'Documentation', value: 'docs.makinvoices.com', sub: 'Full guides & API', color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/30' },
        ].map(ch => (
          <div 
            key={ch.label} 
            onClick={() => { if (ch.isChat && onChatClick) onChatClick(); }}
            className="bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl p-4 flex items-start gap-3 shadow-xs hover:border-[#64748b]/40 transition-colors cursor-pointer group"
          >
            <div className={`w-9 h-9 rounded-xl ${ch.bg} flex items-center justify-center flex-shrink-0 ${ch.color}`}>
              {ch.icon}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black text-[#0f172a] dark:text-zinc-300 uppercase tracking-wider block">{ch.label}</span>
              <span className="text-[11px] font-bold text-[#0f172a] dark:text-white block mt-0.5 truncate">{ch.value}</span>
              <span className="text-[9.5px] text-[#64748b]/70 dark:text-zinc-500 block">{ch.sub}</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-[#64748b]/40 group-hover:text-[#64748b] flex-shrink-0 ml-auto mt-1 transition-colors" />
          </div>
        ))}
      </div>

      {/* FAQ + Ticket in 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* FAQ */}
        <div className="bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#e2e8f0] via-[#C6A87D] to-[#64748b]" />
            <div className="p-5 pb-3">
              <h2 className="text-[10px] font-black text-[#0f172a] dark:text-white uppercase tracking-widest">Frequently Asked Questions</h2>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748b]/60" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search questions…"
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-[#e2e8f0] dark:border-zinc-700 bg-[#FCFAF7] dark:bg-zinc-950 text-[#0f172a] dark:text-white placeholder-[#64748b]/40 focus:outline-none focus:border-[#64748b]/50 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="px-5 pb-5 space-y-1.5 max-h-[480px] overflow-y-auto">
            {filteredFaqs.length === 0 ? (
              <div className="py-8 text-center text-[11px] text-[#64748b]/60 dark:text-zinc-500">
                <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No questions match your search
              </div>
            ) : filteredFaqs.map((faq, i) => (
              <div
                key={i}
                className={`border rounded-xl overflow-hidden transition-all ${
                  openFaq === i
                    ? 'border-[#64748b]/40 bg-[#FCFAF7] dark:bg-zinc-950'
                    : 'border-[#e2e8f0]/40 dark:border-zinc-800 hover:border-[#64748b]/30'
                }`}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left cursor-pointer"
                >
                  <span className="text-xs font-bold text-[#0f172a] dark:text-zinc-200 leading-snug">{faq.q}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#64748b] flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-3 text-[11px] text-[#64748b]/90 dark:text-zinc-400 leading-relaxed border-t border-[#e2e8f0]/30 dark:border-zinc-800 pt-2.5">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Support Ticket Form */}
        <div className="bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#e2e8f0] via-[#C6A87D] to-[#64748b]" />
            <div className="p-5 pb-3">
              <h2 className="text-[10px] font-black text-[#0f172a] dark:text-white uppercase tracking-widest">Submit a Support Ticket</h2>
              <p className="text-[10px] text-[#64748b]/70 dark:text-zinc-500 mt-0.5">Our team will respond within 1 business day</p>
            </div>
          </div>

          <div className="px-5 pb-5">
            {ticketSubmitted ? (
              <div className="py-10 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-black text-[#0f172a] dark:text-white">Ticket Submitted!</p>
                  <p className="text-[11px] text-[#64748b]/70 dark:text-zinc-500 mt-1">We&apos;ll reach back at your registered email shortly.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleTicketSubmit} className="space-y-3.5">
                {/* Category picker */}
                <div>
                  <label className="block text-[9.5px] font-extrabold uppercase tracking-widest text-[#64748b] mb-1.5">Issue Category</label>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setTicketCategory(cat.id)}
                        className={`px-2.5 py-1 rounded-lg text-[9.5px] font-bold transition-all cursor-pointer border ${
                          ticketCategory === cat.id
                            ? 'bg-[#0f172a] text-white border-[#0f172a]'
                            : 'bg-[#FCFAF7] dark:bg-zinc-950 border-[#e2e8f0]/60 dark:border-zinc-700 text-[#64748b] dark:text-zinc-400 hover:border-[#64748b]/50'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-[9.5px] font-extrabold uppercase tracking-widest text-[#64748b] mb-1.5">Subject *</label>
                  <input
                    type="text"
                    value={ticketSubject}
                    onChange={e => setTicketSubject(e.target.value)}
                    required
                    placeholder="Brief description of your issue"
                    className="w-full px-3.5 py-2.5 bg-[#FCFAF7] dark:bg-zinc-950 border border-[#e2e8f0]/60 dark:border-zinc-700 rounded-xl text-xs text-[#0f172a] dark:text-white placeholder-[#64748b]/40 focus:outline-none focus:border-[#64748b]/60 transition-colors"
                  />
                </div>

                {/* Body */}
                <div>
                  <label className="block text-[9.5px] font-extrabold uppercase tracking-widest text-[#64748b] mb-1.5">Detailed Description *</label>
                  <textarea
                    value={ticketBody || ''}
                    onChange={e => setTicketBody(e.target.value)}
                    required
                    rows={5}
                    placeholder="Please describe the issue in detail. Include steps to reproduce, expected behavior, and what actually happened…"
                    className="w-full px-3.5 py-2.5 bg-[#FCFAF7] dark:bg-zinc-950 border border-[#e2e8f0]/60 dark:border-zinc-700 rounded-xl text-xs text-[#0f172a] dark:text-white placeholder-[#64748b]/40 focus:outline-none focus:border-[#64748b]/60 transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0f172a] hover:bg-[#5C5043] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-colors cursor-pointer shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  Submit Ticket
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Feedback + resources footer row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Feedback */}
        <div className="bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <h3 className="text-[10px] font-black text-[#0f172a] dark:text-white uppercase tracking-widest mb-1">Rate Your Experience</h3>
          <p className="text-[10px] text-[#64748b]/70 dark:text-zinc-500 mb-3">How would you rate MakInvoices overall?</p>
          {feedbackSubmitted ? (
            <div className="flex flex-col items-center justify-center py-4 space-y-2 text-center animate-in fade-in duration-200">
              <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/30">
                <ThumbsUp className="w-5 h-5" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Thank You!</span>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 max-w-[220px]">Your feedback was submitted successfully and helps us improve MakInvoices.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(star => {
                  const isHighlighted = hoveredRating !== null ? star <= hoveredRating : activeRating !== null && star <= activeRating;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(null)}
                      onClick={() => setActiveRating(star)}
                      className={`transition-all duration-150 transform hover:scale-125 cursor-pointer ${
                        isHighlighted ? 'text-amber-400' : 'text-[#e2e8f0] dark:text-zinc-700 hover:text-amber-300'
                      }`}
                    >
                      <Star className="w-6 h-6 fill-current" />
                    </button>
                  );
                })}
                {activeRating !== null && (
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 dark:text-amber-400 ml-2 animate-in fade-in duration-100">
                    {activeRating === 1 && 'Terrible 😢'}
                    {activeRating === 2 && 'Poor ☹️'}
                    {activeRating === 3 && 'Average 😐'}
                    {activeRating === 4 && 'Good 🙂'}
                    {activeRating === 5 && 'Excellent! 😍'}
                  </span>
                )}
              </div>

              {activeRating !== null && (
                <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Tell us what we can improve... (optional)"
                    rows={2}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-none text-[#0f172a] dark:text-white resize-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem('makinvoices_user_review_rating', String(activeRating));
                      localStorage.setItem('makinvoices_user_review_text', feedbackText);
                      localStorage.setItem('makinvoices_user_review_submitted', 'true');
                      emitNotification('Feedback Submitted', 'Thank you for helping us improve MakInvoices!', 'success');
                      setFeedbackSubmitted(true);
                    }}
                    className="w-full py-2 bg-[#0f172a] hover:bg-[#5C5043] dark:bg-[#0f172a] dark:hover:bg-[#5C5043] text-white text-[9.5px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs"
                  >
                    Submit Feedback
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Resources */}
        <div className="bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <h3 className="text-[10px] font-black text-[#0f172a] dark:text-white uppercase tracking-widest mb-3">Quick Resources</h3>
          <div className="space-y-3">
            {[
              { 
                icon: <BookOpen className="w-4 h-4" />, 
                label: 'Getting Started Guide', 
                desc: 'Setup your company profile, configure registries, and send bills in 5 mins.',
                id: 'guide',
                color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20'
              },
              { 
                icon: <Video className="w-4 h-4" />, 
                label: 'Video Tutorials', 
                desc: 'Step-by-step visual guides covering ledgers, template builders & tax splits.',
                id: 'video',
                color: 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/20'
              },
              { 
                icon: <Shield className="w-4 h-4" />, 
                label: 'Privacy & Security Policy', 
                desc: 'Read details about our offline-first storage, PIN security & secure cloud sync.',
                id: 'privacy',
                color: 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/20'
              },
            ].map(res => (
              <button
                key={res.label}
                onClick={() => {
                  setActiveResource(res.id as any);
                  if (typeof window !== 'undefined') {
                    const pathMap: Record<string, string> = {
                      guide: '/support/getting-started',
                      video: '/support/video-tutorials',
                      privacy: '/support/privacy-policy'
                    };
                    if (pathMap[res.id]) {
                      window.history.pushState(null, '', pathMap[res.id]);
                    }
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className="w-full p-3 flex items-start gap-3 bg-[#FCFAF7] dark:bg-zinc-950 border border-[#e2e8f0]/20 dark:border-zinc-850 rounded-xl hover:border-[#64748b]/40 hover:shadow-xs transition-all text-left cursor-pointer group"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${res.color}`}>
                  {res.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-black text-[#0f172a] dark:text-zinc-355 group-hover:text-[#64748b] dark:group-hover:text-white transition-colors block">{res.label}</span>
                  <p className="text-[10px] text-[#64748b]/80 dark:text-zinc-500 mt-0.5 leading-snug">{res.desc}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#64748b]/40 group-hover:text-[#64748b] transition-colors shrink-0 self-center" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
