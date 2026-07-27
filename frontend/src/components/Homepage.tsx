import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  TrendingUp, 
  FileText, 
  Database, 
  Lock, 
  FileDown, 
  ArrowRight, 
  ArrowUp,
  Check, 
  Laptop, 
  Play, 
  CheckCircle,
  LogIn,
  UserPlus,
  ChevronDown,
  BarChart3,
  HelpCircle,
  BookOpen,
  Layers,
  Settings,
  ShieldCheck,
  Globe,
  Phone,
  Mail,
  KeyRound,
  RefreshCw,
  Menu,
  X,
  DollarSign,
  CreditCard,
  Upload
} from 'lucide-react';

interface HomepageProps {
  theme: 'light' | 'dark';
  onGoogleLogin: () => void;
  onCustomSignup: (name: string, companyName: string, email: string, phone: string, password?: string) => Promise<{ error?: string }>;
  onCustomLogin: (email: string, password?: string, phone?: string) => Promise<{ error?: string }>;
  isOnline: boolean;
  onNavigate: (path: string) => void;
}

const words = ["Agencies.", "Freelancers.", "Startups.", "Consultants.", "Enterprises."];

function AnimatedTextWords() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="relative inline-block w-full h-[1.2em]">
      <AnimatePresence mode="wait">
        {/* Ghost background word (zoomed/faded) */}
        <motion.span
          key={`ghost-${index}`}
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 0.05 }}
          exit={{ y: -15, opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="absolute left-0 top-1 text-4xl sm:text-5.5xl lg:text-6.5xl text-slate-900 dark:text-white font-black select-none pointer-events-none tracking-tight leading-none scale-102"
        >
          {words[index]}
        </motion.span>
        
        {/* Real foreground word */}
        <motion.span
          key={`real-${index}`}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="absolute left-0 top-0 text-slate-800 dark:text-white font-black tracking-tight leading-none"
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export default function Homepage({ 
  theme, 
  onGoogleLogin, 
  onCustomSignup, 
  onCustomLogin,
  isOnline,
  onNavigate
}: HomepageProps) {
  // Tabs for Auth: 'login' or 'signup'
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  // 3 sign-in methods: 'email' | 'phone_otp' | 'google'
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone_otp' | 'google'>('email');
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    password: ''
  });
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  // Accordion faq active tab state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Mobile nav state
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Contact Modal States
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);

  // Inline form errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Pricing toggle state
  const [isYearly, setIsYearly] = useState(false);

  // Interactive showcases states
  const [showLogistics, setShowLogistics] = useState(false);
  const [prefix, setPrefix] = useState('INV');
  const [taxModeSelection, setTaxModeSelection] = useState<'intra' | 'inter'>('intra');
  const [showcaseColor, setShowcaseColor] = useState<'sky' | 'emerald' | 'indigo' | 'rose'>('sky');
  const [showcaseWatermark, setShowcaseWatermark] = useState(false);
  const [points, setPoints] = useState<{x: number, y: number}[]>([]);
  const [isDrawingSig, setIsDrawingSig] = useState(false);
  const [catalogCategory, setCatalogCategory] = useState<'all' | 'raw' | 'service'>('all');
  const [newExpenseAmount, setNewExpenseAmount] = useState('150');
  const [demoExpenses, setDemoExpenses] = useState<{ id: string, name: string, amount: number, date: string }[]>([
    { id: '1', name: 'Cloud Server hosting', amount: 80, date: '2026-07-09' },
    { id: '2', name: 'Chartered accountant audit', amount: 300, date: '2026-07-08' }
  ]);

  // Expanded interactive features states
  const [demoInvoiceItems, setDemoInvoiceItems] = useState<{ id: string, name: string, rate: number, qty: number }[]>([
    { id: '1', name: 'Premium Consultant Hours', rate: 120, qty: 8 },
    { id: '2', name: 'Stock Inventory Materials', rate: 35, qty: 10 }
  ]);
  const [demoTemplateLayout, setDemoTemplateLayout] = useState<'Classic' | 'Modern' | 'Minimal' | 'Retail'>('Classic');
  const [bulkFileUploaded, setBulkFileUploaded] = useState(false);
  const [bulkDataType, setBulkDataType] = useState<'products' | 'clients'>('products');
  const [demoPinCode, setDemoPinCode] = useState('');
  const [isDemoPinEnabled, setIsDemoPinEnabled] = useState(false);
  const [isDemoBioEnabled, setIsDemoBioEnabled] = useState(false);
  const [selectedGlAccount, setSelectedGlAccount] = useState<'4001' | '5002' | '1010'>('4001');
  const [demoUom, setDemoUom] = useState<'bags' | 'kg' | 'meters' | 'pcs'>('pcs');
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  const handleSignatureMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPoints([{ x, y }]);
    setIsDrawingSig(true);
  };

  const handleSignatureMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawingSig) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPoints(prev => [...prev, { x, y }]);
  };

  const handleSignatureMouseUp = () => {
    setIsDrawingSig(false);
  };

  // Scroll to top state
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show when scrolled past the hero section (around 400px)
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Language dropdown states
  const [selectedLanguage, setSelectedLanguage] = useState({ code: 'en', label: 'English', native: 'English' });
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [langNotice, setLangNotice] = useState<string | null>(null);

  const availableLanguages = [
    { code: 'en', label: 'English', native: 'English', isPlaceholder: false },
    { code: 'es', label: 'Spanish', native: 'Español', isPlaceholder: true },
    { code: 'fr', label: 'French', native: 'Français', isPlaceholder: true },
    { code: 'de', label: 'German', native: 'Deutsch', isPlaceholder: true },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी', isPlaceholder: true },
    { code: 'ja', label: 'Japanese', native: '日本語', isPlaceholder: true },
  ];

  const handleSelectLanguage = (lang: typeof availableLanguages[0]) => {
    if (lang.isPlaceholder) {
      setLangNotice(`${lang.native} (${lang.label}) translation is currently a placeholder and will be enabled in our next release!`);
    } else {
      setSelectedLanguage(lang);
    }
    setIsLangDropdownOpen(false);
  };

  // Interactive live demo preview playground state variables
  const [demoAccent, setDemoAccent] = useState<'sky' | 'emerald' | 'indigo' | 'rose'>('sky');
  const [demoStatus, setDemoStatus] = useState<'PAID' | 'PENDING' | 'OVERDUE'>('PAID');
  const [demoLayout, setDemoLayout] = useState<'modern' | 'minimal' | 'agency'>('modern');
  const [selectedPreset, setSelectedPreset] = useState<'freelance' | 'saas' | 'logistics'>('freelance');

  const demoPresets = {
    freelance: {
      client: 'Alex Morgan',
      company: 'INTEZ Dev Group',
      location: 'Delhi, India',
      clientLoc: 'San Francisco, USA',
      invoiceNo: 'INV-2026-0045',
      items: [
        { name: '1x Cloud System Setup', desc: 'Postgres cluster & API backend', price: 800 },
        { name: '2.5h Custom Layout Design', desc: 'Tailwind responsive code structure', price: 305 }
      ],
      status: 'PAID' as const,
      taxMode: 'GST Intra',
      taxRate: 0.18,
      currency: '$'
    },
    saas: {
      client: 'Acme Corp Inc.',
      company: 'SaaSify Platforms',
      location: 'Bangalore, India',
      clientLoc: 'New York, USA',
      invoiceNo: 'INV-2026-8812',
      items: [
        { name: 'Enterprise API License', desc: 'Unlimited endpoints & 99.9% SLA', price: 1200 },
        { name: 'Priority Support Add-on', desc: 'Dedicated Slack channel & 24/7 phone', price: 299 }
      ],
      status: 'PENDING' as const,
      taxMode: 'GST Inter',
      taxRate: 0.18,
      currency: '$'
    },
    logistics: {
      client: 'Global Trade Co.',
      company: 'FastForward Logistics',
      location: 'Mumbai, India',
      clientLoc: 'London, UK',
      invoiceNo: 'INV-2026-4409',
      items: [
        { name: 'Ocean Freight Shipping', desc: '2x Standard 20ft Containers', price: 2400 },
        { name: 'Customs Clearance Fee', desc: 'Import documentation processing', price: 450 }
      ],
      status: 'OVERDUE' as const,
      taxMode: 'Export Zero-Rated',
      taxRate: 0.0,
      currency: '$'
    }
  };

  const handleNavScroll = (sectionId: string, customAuthMode?: 'login' | 'signup') => {
    if (customAuthMode) {
      setAuthMode(customAuthMode);
    }
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  const faqItems = [
    {
      question: "How does MakInvoices handle GST, IGST, and state-specific tax rates?",
      answer: "MakInvoices features a dynamic tax compliance engine. You can select standard State/Union Territory codes (such as Delhi-07, Maharashtra-27) to automatically calculate and bifurcate CGST & SGST for intra-state billing, or apply clean unified IGST rules for inter-state and export client contracts."
    },
    {
      question: "Can I draw custom hand-drawn brand signatures on my invoices?",
      answer: "Yes! MakInvoices integrates a smooth interactive Signature Sketchpad. You can use your mouse, touch screen, or stylus to draw your brand signature directly on the screen. It is instantly saved in your creator profile and embedded elegantly in the footer of every generated document."
    },
    {
      question: "How does the high-fidelity PDF export or print layout remain so clean?",
      answer: "We support specialized, print-optimized stylesheet standards. When you export or print your invoice, all sidebar panels, customization options, and website controls are automatically stripped out. This leaves you with a flawless, perfectly aligned, high-contrast physical paper layout or clean digital PDF."
    },
    {
      question: "Are custom branding elements like logo uploads and layout themes supported?",
      answer: "Absolutely! You can upload custom business logos, define your currency preferences (such as USD, INR, EUR, etc.), select from multiple professional layouts (Modern, Agency, Minimal, Startup), and select premium typography font pairings to match your corporate identity."
    },
    {
      question: "Can I track my business expenses and visual profits in the application?",
      answer: "Yes. In addition to creating compliant invoices and estimates, you have access to a live analytical visual dashboard. Log client-related or personal operating expenses, categorize overhead, and view your net margins in real-time on visual revenue charts."
    },
    {
      question: "Does MakInvoices offer offline support or require an active internet connection?",
      answer: "No, you don't need to be online. MakInvoices is built with an offline-first architecture using client-side caching. You can generate invoices, log client profiles, update your catalog index, and edit tax records completely offline. Your changes are saved securely in your browser and synced to the cloud once you reconnect."
    },
    {
      question: "What are Master Vendors and HSN catalog registers inside the workspace?",
      answer: "These are advanced bookkeeping tools for high-volume billing. The Master Vendor panel logs default suppliers and invoice origins, the HSN registry pre-defines unified commodities classification codes, and the Catalog Material module manages product item lines with predefined unit prices and categories."
    }
  ];

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-200 dark:bg-neutral-800' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score++;
    if (/\d/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    switch (score) {
      case 1:
        return { score, label: 'Weak', color: 'bg-rose-500' };
      case 2:
        return { score, label: 'Fair', color: 'bg-amber-500' };
      case 3:
        return { score, label: 'Good', color: 'bg-sky-500' };
      case 4:
        return { score, label: 'Strong', color: 'bg-emerald-500' };
      default:
        return { score, label: 'Too short', color: 'bg-rose-500' };
    }
  };

  const strength = getPasswordStrength(formData.password);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    if (authMode === 'signup') {
      if (!formData.name.trim()) {
        setFormErrors({ name: 'Please fill out Your Name.' });
        return;
      }
      if (!formData.companyName.trim()) {
        setFormErrors({ companyName: 'Please fill out Your Company Name.' });
        return;
      }
      if (!formData.phone.trim()) {
        setFormErrors({ phone: 'Please fill out your Phone Number.' });
        return;
      }
      if (!formData.email.trim()) {
        setFormErrors({ email: 'Please fill out your Email Address.' });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        setFormErrors({ email: 'Please enter a valid Email Address.' });
        return;
      }
      if (!formData.password.trim()) {
        setFormErrors({ password: 'Please enter a Password.' });
        return;
      }
      if (formData.password.length < 6) {
        setFormErrors({ password: 'Password must be at least 6 characters long.' });
        return;
      }
    } else {
      if (loginMethod === 'email') {
        if (!formData.email.trim()) {
          setFormErrors({ email: 'Please enter your Registered Email Address.' });
          return;
        }
        if (!formData.password.trim()) {
          setFormErrors({ password: 'Please enter your Password.' });
          return;
        }
      }
      if (loginMethod === 'phone_otp') {
        if (!formData.phone.trim()) {
          setFormErrors({ phone: 'Please enter your Phone Number.' });
          return;
        }
        if (otpSent && otpValue.length < 4) {
          setFormErrors({ otp: 'Please enter the OTP sent to your phone.' });
          return;
        }
        // Simulate OTP send
        if (!otpSent) {
          setIsLoading(true);
          setTimeout(() => {
            setIsLoading(false);
            setOtpSent(true);
            setSuccessMsg(`OTP sent to ${formData.phone} — use 1234 for demo.`);
          }, 1000);
          return;
        }
      }
    }

    setIsLoading(true);
    setSuccessMsg('');

    try {
      if (authMode === 'signup') {
        const res = await onCustomSignup(formData.name, formData.companyName, formData.email, formData.phone, formData.password);
        if (res?.error) {
          setFormErrors({ email: res.error });
          setIsLoading(false);
        } else {
          setSuccessMsg('Profile Created Successfully! Syncing workspace...');
          setIsLoading(false);
        }
      } else {
        if (loginMethod === 'email') {
          const res = await onCustomLogin(formData.email, formData.password, '');
          if (res?.error) {
            setFormErrors({ email: res.error });
            setIsLoading(false);
          } else {
            setSuccessMsg('Welcome back! Retrieving workspace state...');
            setIsLoading(false);
          }
        } else if (loginMethod === 'phone_otp') {
          const res = await onCustomLogin('', '', formData.phone);
          if (res?.error) {
            setFormErrors({ phone: res.error });
            setIsLoading(false);
          } else {
            setSuccessMsg('Welcome back! Retrieving workspace state...');
            setIsLoading(false);
          }
        }
      }
    } catch (err: any) {
      setFormErrors({ email: err.message || 'Authentication failed. Please try again.' });
      setIsLoading(false);
    }
  };

  const accentClasses = {
    sky: {
      text: 'text-sky-500 dark:text-sky-400',
      bgText: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-500/10 dark:bg-sky-500/15',
      badge: 'bg-sky-500/15 text-sky-500 dark:text-sky-400',
      border: 'border-sky-500/30 dark:border-sky-500/20',
      ring: 'ring-sky-500/20',
      stroke: '#0ea5e9'
    },
    emerald: {
      text: 'text-emerald-500 dark:text-emerald-400',
      bgText: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      badge: 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400',
      border: 'border-emerald-500/30 dark:border-emerald-500/20',
      ring: 'ring-emerald-500/20',
      stroke: '#10b981'
    },
    indigo: {
      text: 'text-indigo-505 dark:text-indigo-400',
      bgText: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
      badge: 'bg-indigo-500/15 text-indigo-505 dark:text-indigo-405',
      border: 'border-indigo-500/30 dark:border-indigo-500/20',
      ring: 'ring-indigo-500/20',
      stroke: '#6366f1'
    },
    rose: {
      text: 'text-rose-500 dark:text-rose-400',
      bgText: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-500/10 dark:bg-rose-500/15',
      badge: 'bg-rose-500/15 text-rose-505 dark:text-rose-405',
      border: 'border-rose-500/30 dark:border-rose-500/20',
      ring: 'ring-rose-500/20',
      stroke: '#f43f5e'
    }
  };

  return (
    <div className={`min-h-dvh w-full max-w-full overflow-x-hidden text-sans transition-colors duration-250 ${
      theme === 'dark' 
        ? 'bg-neutral-955 text-neutral-100' 
        : 'bg-slate-50 text-slate-800'
    }`}>
      
      {/* Embedded Navigation Bar (Desktop) */}
      <nav className="fixed top-0 left-0 right-0 z-50 hidden sm:flex border-b border-slate-200/40 dark:border-neutral-800/40 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md transition-all duration-300 w-full">
        <div className="max-w-[1550px] mx-auto px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4 w-full">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-2.5 cursor-pointer select-none group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src="/logo.svg" alt="MakInvoices Logo" className="w-10 h-10 object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-300 shrink-0" />
            <div>
              <span className="text-base font-black tracking-tight text-slate-805 block leading-none">
                Mak<span className="text-sky-500">Invoices</span>
              </span>
              <span className="text-[9px] font-bold text-slate-400 dark:text-neutral-500 block tracking-wider uppercase mt-1">Advanced Ledger Hub</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={() => handleNavScroll('features-section')}
              className="text-slate-655 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 font-extrabold text-xs tracking-wide cursor-pointer transition-all px-3.5 py-2 rounded-xl hover:bg-slate-100/60 dark:hover:bg-neutral-900/60 flex items-center gap-1.5 active:scale-95 duration-200"
            >
              <Layers className="w-3.5 h-3.5 opacity-70" />
              Features
            </button>

            <button
              type="button"
              onClick={() => onNavigate('/guide')}
              className="text-slate-655 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 font-extrabold text-xs tracking-wide cursor-pointer transition-all px-3.5 py-2 rounded-xl hover:bg-slate-100/60 dark:hover:bg-neutral-900/60 flex items-center gap-1.5 active:scale-95 duration-200"
            >
              <BookOpen className="w-3.5 h-3.5 opacity-70" />
              Guide
            </button>

            <button
              type="button"
              onClick={() => onNavigate('/pricing')}
              className="text-slate-655 dark:text-slate-305 hover:text-sky-655 dark:hover:text-sky-400 font-extrabold text-xs tracking-wide cursor-pointer transition-all px-3.5 py-2 rounded-xl hover:bg-slate-100/60 dark:hover:bg-neutral-900/60 flex items-center gap-1.5 active:scale-95 duration-200"
            >
              <CreditCard className="w-3.5 h-3.5 opacity-70" />
              Pricing
            </button>

            <button
              type="button"
              onClick={() => handleNavScroll('faq-section')}
              className="text-slate-655 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 font-extrabold text-xs tracking-wide cursor-pointer transition-all px-3.5 py-2 rounded-xl hover:bg-slate-100/60 dark:hover:bg-neutral-900/60 flex items-center gap-1.5 active:scale-95 duration-200"
            >
              <HelpCircle className="w-3.5 h-3.5 opacity-70" />
              FAQ
            </button>

            <button
              type="button"
              onClick={() => onNavigate('/contact')}
              className="text-slate-655 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 font-extrabold text-xs tracking-wide cursor-pointer transition-all px-3.5 py-2 rounded-xl hover:bg-slate-100/60 dark:hover:bg-neutral-900/60 flex items-center gap-1.5 active:scale-95 duration-200"
            >
              <Mail className="w-3.5 h-3.5 opacity-70" />
              Contact
            </button>
          </div>

          {/* Quick Actions & Language dropdown */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-2 text-slate-600 dark:text-slate-350 hover:text-sky-500 dark:hover:text-sky-400 font-extrabold text-xs tracking-wide cursor-pointer transition-all rounded-xl hover:bg-slate-100/50 dark:hover:bg-neutral-900 border border-slate-200/40 dark:border-neutral-800/40"
              >
                <Globe className="w-3.5 h-3.5 text-slate-405" />
                <span>{selectedLanguage.label}</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isLangDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isLangDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsLangDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800/80 p-1.5 shadow-xl shadow-black/10 z-50 animate-fade-in text-left">
                    <p className="text-[9px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase px-2.5 py-1 select-none">Select Language</p>
                    {availableLanguages.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => handleSelectLanguage(lang)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                          selectedLanguage.code === lang.code
                            ? 'bg-sky-500/10 text-sky-500'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-neutral-800/70'
                        }`}
                      >
                        <span className="flex flex-col text-left">
                          <span className="font-extrabold">{lang.native}</span>
                          <span className="text-[9px] text-slate-450 dark:text-slate-500">{lang.label}</span>
                        </span>
                        {selectedLanguage.code === lang.code ? (
                          <Check className="w-3.5 h-3.5 text-sky-500" />
                        ) : lang.isPlaceholder ? (
                          <span className="text-[8px] bg-slate-105 dark:bg-neutral-850 px-1.5 py-0.5 rounded text-slate-450 dark:text-slate-500 font-extrabold uppercase scale-90">Soon</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => window.location.href = '/login'}
              className="px-3.5 py-2 text-slate-700 dark:text-slate-205 hover:text-sky-505 dark:hover:text-sky-400 font-extrabold text-xs transition-all duration-300 rounded-xl hover:bg-slate-100/50 dark:hover:bg-neutral-900 active:scale-95"
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => window.location.href = '/signup'}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-sky-505/15 hover:shadow-sky-500/30 transition-all duration-300 hover:scale-103 cursor-pointer"
            >
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* Embedded Navigation Bar (Mobile) */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex sm:hidden border-b border-slate-200/40 dark:border-neutral-800/40 bg-white/80 dark:bg-neutral-955/80 backdrop-blur-md transition-all duration-300 w-full">
        <div className="max-w-[1550px] mx-auto px-4 py-3.5 flex items-center justify-between w-full">
          {/* Logo Brand */}
          <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src="/logo.svg" alt="MakInvoices Logo" className="w-8 h-8 object-contain drop-shadow-sm shrink-0" />
            <span className="text-sm font-black tracking-tight text-slate-805">
              Mak<span className="text-sky-500">Invoices</span>
            </span>
          </div>

          {/* Hamburger Menu Button */}
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            className="p-2 text-slate-655 dark:text-slate-350 hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer rounded-xl hover:bg-slate-105 dark:hover:bg-neutral-900 border border-slate-200/60 dark:border-neutral-800/60"
          >
            {isMobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          {/* Drawer Menu Panel */}
          <AnimatePresence>
            {isMobileNavOpen && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[60]" 
                  onClick={() => setIsMobileNavOpen(false)} 
                />
                <motion.div 
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                  className="fixed inset-y-0 right-0 z-[70] w-[280px] bg-white dark:bg-[#0a0a0a] shadow-[rgba(0,0,0,0.1)_0px_4px_24px] dark:shadow-[rgba(0,0,0,0.5)_0px_4px_24px] border-l border-slate-200/80 dark:border-white/10 p-6 flex flex-col h-[100dvh]"
                >
                  <div>
                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100 dark:border-white/10">
                      <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Navigation</span>
                      <button type="button" onClick={() => setIsMobileNavOpen(false)} className="p-1.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors cursor-pointer">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={() => { handleNavScroll('features-section'); setIsMobileNavOpen(false); }}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/5 transition-all text-left w-full cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Layers className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                        </div>
                        <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">Features</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { onNavigate('/guide'); setIsMobileNavOpen(false); }}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/5 transition-all text-left w-full cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">Guide</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { onNavigate('/pricing'); setIsMobileNavOpen(false); }}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/5 transition-all text-left w-full cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">Pricing</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { handleNavScroll('faq-section'); setIsMobileNavOpen(false); }}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/5 transition-all text-left w-full cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">FAQ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { onNavigate('/contact'); setIsMobileNavOpen(false); }}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/5 transition-all text-left w-full cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Mail className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        </div>
                        <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">Contact</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 mt-auto pb-4">
                    <button
                      type="button"
                      onClick={() => { window.location.href = '/login'; setIsMobileNavOpen(false); }}
                      className="w-full py-3 text-center text-[13px] font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-white/10 border border-transparent hover:bg-slate-200 dark:hover:bg-white/20 rounded-xl cursor-pointer transition-colors"
                    >
                      Log In
                    </button>
                    <button
                      type="button"
                      onClick={() => { window.location.href = '/signup'; setIsMobileNavOpen(false); }}
                      className="w-full py-3 text-center text-[13px] font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-md cursor-pointer transition-colors"
                    >
                      Sign Up
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Main Container */}
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8 lg:pt-28 relative">
        
        {/* Glow effect behind the hero */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-sky-400/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Hero Grid Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center overflow-hidden">
          
          {/* Left: Headline & Key Details */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 space-y-6 order-1 text-left"
          >

            {/* Modern Developer-style 'Newly launched' Label */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sky-500/20 bg-sky-500/5 text-[10px] font-mono tracking-wide text-sky-600 dark:text-sky-400 select-none backdrop-blur-md animate-fade-in w-fit">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky-500"></span>
              </span>
              <span className="font-extrabold uppercase">Newly Launched</span>
            </div>

            <h1 className="text-4xl sm:text-5.5xl lg:text-6.5xl font-black tracking-tight leading-[1.08] text-slate-805">
              Professional Billing, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 via-sky-600 to-indigo-500">
                Automated for
              </span> <br />
              <div className="relative inline-block w-full mt-1.5 h-[1.25em]">
                <AnimatedTextWords />
              </div>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-350 font-normal leading-relaxed max-w-2xl">
              Ditch the spreadsheets. <strong className="font-extrabold text-slate-800 dark:text-white">MakInvoices</strong> is an AI-powered billing hub built to automate your invoices, track real-time expenses, and customize beautiful templates instantly.
            </p>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6 pt-2 text-sm max-w-2xl">
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 p-2 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-full shrink-0 border border-sky-500/10">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <span className="font-extrabold text-slate-800 dark:text-slate-205 block text-[15px] mb-1">Intelligent Dashboard</span>
                  <span className="text-slate-500 dark:text-slate-400 text-[13px] leading-snug block">Track revenue, manage expenses, and view interactive financial charts in real-time.</span>
                </div>
              </div>
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full shrink-0 border border-indigo-500/10">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <span className="font-extrabold text-slate-800 dark:text-slate-205 block text-[15px] mb-1">AI-Powered Invoicing</span>
                  <span className="text-slate-500 dark:text-slate-400 text-[13px] leading-snug block">Generate professional invoices instantly from natural language descriptions.</span>
                </div>
              </div>
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full shrink-0 border border-emerald-500/10">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <span className="font-extrabold text-slate-800 dark:text-slate-205 block text-[15px] mb-1">Advanced Tax & GST</span>
                  <span className="text-slate-500 dark:text-slate-400 text-[13px] leading-snug block">Automated calculation of CGST, SGST & IGST splits with master HSN registry.</span>
                </div>
              </div>
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full shrink-0 border border-purple-500/10">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <span className="font-extrabold text-slate-800 dark:text-slate-205 block text-[15px] mb-1">Custom Template Studio</span>
                  <span className="text-slate-500 dark:text-slate-400 text-[13px] leading-snug block">Customize layouts, themes, watermarks, and add your hand-drawn signature.</span>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={() => window.location.href = '/signup'}
                className="group px-8 py-4 bg-gradient-to-r from-sky-600 to-indigo-650 hover:from-sky-550 hover:to-indigo-600 active:scale-95 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-sky-600/25 hover:shadow-sky-500/35 transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-3 w-full sm:w-auto justify-center"
              >
                <span>Get Started for Free</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-300 ease-out" />
              </button>
            </div>
          </motion.div>

          {/* Right: Sleek, Professional Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 lg:mt-0 mt-8 relative order-2 flex justify-center w-full"
          >
            {/* Interactive Browser Frame Mockup */}
            <div className="w-full max-w-[620px] bg-white dark:bg-neutral-900 rounded-3xl border border-slate-200/80 dark:border-neutral-800 shadow-2xl overflow-hidden flex flex-col relative z-20 transition-colors duration-300">
              
              {/* macOS Style Title Bar */}
              <div className="flex items-center justify-between px-5 py-3 bg-slate-50 dark:bg-neutral-950 border-b border-slate-250/60 dark:border-neutral-800/80">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/90 shadow-sm" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/90 shadow-sm" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/90 shadow-sm" />
                </div>
                <div className="bg-white dark:bg-neutral-900 px-4 py-1 rounded-lg border border-slate-200/80 dark:border-neutral-800 text-[10px] font-mono text-slate-500 dark:text-neutral-400 select-none shadow-xs">
                  makinvoices.com/playground
                </div>
                <div className="w-14" /> {/* balance */}
              </div>

              {/* Playground Workspace Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 min-h-[480px]">
                
                {/* 1. Control Panel (Left Side - 5 Columns on Desktop, 100% on Mobile) */}
                <div className="md:col-span-5 bg-slate-50/50 dark:bg-neutral-950/20 border-b md:border-b-0 md:border-r border-slate-200/60 dark:border-neutral-800 p-5 flex flex-col gap-4 text-left">
                  
                  {/* Preset Selector */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest block">1. Select Preset</span>
                    <div className="flex flex-col gap-2">
                      {(['freelance', 'saas', 'logistics'] as const).map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setSelectedPreset(preset);
                            // Auto adjust matching properties for fun demo response
                            const p = demoPresets[preset];
                            setDemoStatus(p.status);
                            if (preset === 'saas') {
                              setDemoAccent('indigo');
                              setDemoLayout('modern');
                            } else if (preset === 'logistics') {
                              setDemoAccent('emerald');
                              setDemoLayout('agency');
                            } else {
                              setDemoAccent('sky');
                              setDemoLayout('modern');
                            }
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-between cursor-pointer ${
                            selectedPreset === preset
                              ? 'bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400'
                              : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-neutral-850'
                          }`}
                        >
                          <span className="capitalize">{preset} Invoice</span>
                          <Sparkles className={`w-3.5 h-3.5 ${selectedPreset === preset ? 'text-sky-500' : 'opacity-30'}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Accent Color Picker */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest block">2. Theme Accent</span>
                    <div className="flex items-center gap-2">
                      {(['sky', 'emerald', 'indigo', 'rose'] as const).map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setDemoAccent(color)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                            color === 'sky' ? 'bg-sky-500' :
                            color === 'emerald' ? 'bg-emerald-500' :
                            color === 'indigo' ? 'bg-indigo-500' : 'bg-rose-500'
                          } ${
                            demoAccent === color ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-neutral-200 scale-110' : 'opacity-80 hover:scale-105'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Layout Selector */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest block">3. Template Style</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['modern', 'minimal', 'agency'] as const).map((layout) => (
                        <button
                          key={layout}
                          type="button"
                          onClick={() => setDemoLayout(layout)}
                          className={`px-2 py-1.5 rounded-lg text-[9px] font-extrabold uppercase border transition-all cursor-pointer text-center ${
                            demoLayout === layout
                              ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-neutral-900'
                              : 'bg-white border-slate-200 text-slate-600 dark:bg-neutral-900 dark:border-neutral-800 dark:text-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {layout}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Status Toggle */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest block">4. Status</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['PAID', 'PENDING', 'OVERDUE'] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setDemoStatus(status)}
                          className={`px-1.5 py-1.5 rounded-lg text-[9px] font-extrabold border transition-all cursor-pointer text-center ${
                            demoStatus === status
                              ? status === 'PAID' ? 'bg-emerald-500 border-emerald-500 text-white' :
                                status === 'PENDING' ? 'bg-amber-500 border-amber-500 text-white' :
                                'bg-rose-500 border-rose-500 text-white'
                              : 'bg-white border-slate-200 text-slate-600 dark:bg-neutral-900 dark:border-neutral-800 dark:text-slate-350 hover:bg-slate-50'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                {/* 2. Interactive Invoice Sheet (Right Side - 7 Columns on Desktop, 100% on Mobile) */}
                <div className="md:col-span-7 bg-slate-100/50 dark:bg-neutral-950/40 p-4 sm:p-6 flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-300">
                  
                  {/* Soft background glow based on selected accent */}
                  <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-500 ${
                    demoAccent === 'sky' ? 'bg-sky-500' :
                    demoAccent === 'emerald' ? 'bg-emerald-500' :
                    demoAccent === 'indigo' ? 'bg-indigo-500' : 'bg-rose-500'
                  }`} />

                  {/* Crisp Invoice Sheet Container */}
                  <div className={`w-full bg-white text-slate-800 rounded-2xl shadow-xl p-5 border border-slate-100 transition-all duration-300 relative flex flex-col justify-between aspect-[1/1.25] text-[9px] ${
                    demoLayout === 'minimal' ? 'border-dashed !shadow-none !bg-slate-50/50 font-mono' : ''
                  }`}>

                    {/* Agency custom header */}
                    {demoLayout === 'agency' && (
                      <div className="bg-slate-900 text-white px-3 py-1.5 -mx-5 -mt-5 rounded-t-2xl mb-3.5 flex items-center justify-between">
                        <span className="text-[8px] font-black uppercase tracking-wider text-sky-400">INTEZ Agency</span>
                        <span className="text-[6.5px] text-slate-400 font-mono">B2B CONTRACTOR</span>
                      </div>
                    )}

                    {/* Invoice Meta header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
                      <div>
                        <h4 className="text-[10px] font-black tracking-tight text-slate-900 leading-none">
                          {demoPresets[selectedPreset].company}
                        </h4>
                        <span className="text-[7px] text-slate-400 block mt-0.5">
                          {demoPresets[selectedPreset].location.toUpperCase()} • SELLER
                        </span>
                      </div>
                      <div className="text-right font-sans">
                        <span className={`text-[8.5px] font-black block leading-none transition-colors ${
                          demoAccent === 'sky' ? 'text-sky-600' :
                          demoAccent === 'emerald' ? 'text-emerald-600' :
                          demoAccent === 'indigo' ? 'text-indigo-600' : 'text-rose-600'
                        }`}>TAX INVOICE</span>
                        <span className="text-[7px] font-mono text-slate-455 block mt-0.5">
                          #{demoPresets[selectedPreset].invoiceNo}
                        </span>
                      </div>
                    </div>

                    {/* Parties details */}
                    <div className="grid grid-cols-2 gap-2 mb-2.5 text-[7.5px] leading-relaxed">
                      <div>
                        <span className="font-extrabold text-slate-400 block uppercase tracking-wider text-[6px]">From Vendor</span>
                        <span className="font-bold text-slate-700 block">{demoPresets[selectedPreset].company}</span>
                        <span className="text-slate-500 block">{demoPresets[selectedPreset].location}</span>
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-400 block uppercase tracking-wider text-[6px]">Bill To Client</span>
                        <span className="font-bold text-slate-700 block">{demoPresets[selectedPreset].client}</span>
                        <span className="text-slate-500 block">{demoPresets[selectedPreset].clientLoc}</span>
                      </div>
                    </div>

                    {/* Items table lines */}
                    <div className="space-y-2 border-t border-b border-slate-100 py-2.5 mb-2.5">
                      <div className="flex items-center justify-between text-[6.5px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Description</span>
                        <span className="text-right">Amount</span>
                      </div>
                      
                      {demoPresets[selectedPreset].items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-slate-700">
                          <div>
                            <span className="font-bold block text-left">{item.name}</span>
                            <span className="text-[7px] text-slate-400 block font-normal text-left">{item.desc}</span>
                          </div>
                          <span className="font-bold text-slate-900">
                            {demoPresets[selectedPreset].currency}{item.price.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Stamp and Total */}
                    <div className="flex items-start justify-between relative mt-1">
                      
                      {/* Watermarked Rubber Stamp */}
                      <div className="absolute top-[-8px] left-1 z-30 pointer-events-none select-none">
                        {demoStatus === 'PAID' && (
                          <div className="border-2 border-emerald-500 text-emerald-600 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest leading-none rotate-[-12deg] bg-white/95 shadow-md">
                            PAID ✓
                          </div>
                        )}
                        {demoStatus === 'PENDING' && (
                          <div className="border-2 border-amber-500 text-amber-600 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest leading-none rotate-[-12deg] bg-white/95 shadow-md">
                            PENDING ⏳
                          </div>
                        )}
                        {demoStatus === 'OVERDUE' && (
                          <div className="border-2 border-rose-500 text-rose-600 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest leading-none rotate-[-12deg] bg-white/95 shadow-md">
                            OVERDUE ⚠️
                          </div>
                        )}
                      </div>

                      <div className="w-10" />

                      <div className="space-y-1 text-right w-3/5 ml-auto">
                        <div className="flex justify-between items-center text-[7.5px]">
                          <span className="text-slate-400 font-semibold">Subtotal:</span>
                          <span className="font-bold text-slate-700">
                            {demoPresets[selectedPreset].currency}
                            {demoPresets[selectedPreset].items.reduce((sum, item) => sum + item.price, 0).toFixed(2)}
                          </span>
                        </div>
                        {demoPresets[selectedPreset].taxRate > 0 && (
                          <div className="flex justify-between items-center text-[7.5px]">
                            <span className="text-slate-400 font-semibold">{demoPresets[selectedPreset].taxMode} Split (18%):</span>
                            <span className="font-bold text-slate-700">
                              {demoPresets[selectedPreset].currency}
                              {(demoPresets[selectedPreset].items.reduce((sum, item) => sum + item.price, 0) * demoPresets[selectedPreset].taxRate).toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-[7.5px] border-t pt-1 border-slate-100">
                          <span className="text-slate-900 font-black">Grand Total:</span>
                          <span className="font-black text-[9px] transition-colors duration-300" style={{ color: accentClasses[demoAccent].stroke }}>
                            {demoPresets[selectedPreset].currency}
                            {(
                              demoPresets[selectedPreset].items.reduce((sum, item) => sum + item.price, 0) * 
                              (1 + demoPresets[selectedPreset].taxRate)
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Receiver Signature Block */}
                    <div className="border-t border-slate-100 pt-2.5 mt-2.5 flex items-center justify-between">
                      <div>
                        <span className="text-[6px] uppercase font-bold text-slate-400 tracking-wider block">Authorized Signatory</span>
                        <svg className="w-16 h-5 mt-0.5 transition-colors duration-300" viewBox="0 0 100 30" fill="none" style={{ color: accentClasses[demoAccent].stroke }}>
                          <path d="M10 18 C 18 8, 25 22, 38 12 C 45 4, 52 18, 65 10 C 72 6, 85 18, 92 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className={`px-2 py-1 border rounded text-[6px] font-black uppercase tracking-wider leading-none transition-colors duration-300 ${
                        demoAccent === 'sky' ? 'bg-sky-50 text-sky-600 border-sky-100' :
                        demoAccent === 'emerald' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        demoAccent === 'indigo' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                        'bg-rose-50 text-rose-600 border-rose-100'
                      }`}>
                        SECURE LEDGER
                      </div>
                    </div>

                  </div>

                </div>

              </div>

            </div>

          </motion.div>

        </div>
        <div id="features-section" className="mt-12 space-y-12 max-w-full relative z-10 text-left scroll-mt-24">
          
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4.5xl font-black text-slate-805 uppercase tracking-tight leading-none">
              A Complete Personalised Billing Engine
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-405 max-w-xl mx-auto">
              Explore the real-world operational capabilities of MakInvoices. Interact with the live mockups below to see how our engine automates your ledger.
            </p>
          </div>

          {/* Showcase 1: Bespoke Invoicing & Logistics Hub */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Text Description */}
            <div className="lg:col-span-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-655 dark:text-sky-400 flex items-center justify-center border border-sky-500/10">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-805 uppercase tracking-tight">Billing & Logistics Hub</h3>
              </div>
              <p className="text-sm text-slate-655 dark:text-slate-400 leading-relaxed max-w-xl">
                Generate pro-forma estimates, client quotes, and formal invoices. Track Purchase Orders (PO), reference codes, custom payment terms, and client state registries instantly.
              </p>
              
              <div className="border-l-2 border-sky-500 pl-4 py-1.5 space-y-3.5 text-xs max-w-xl">
                <p className="leading-relaxed text-slate-600 dark:text-slate-350">
                  <strong className="text-slate-800 dark:text-slate-205">E-Way Bills & Logistics Fields:</strong> Capture transporter names, delivery routes, vehicle codes, driver mobile contacts, and GR/RR logs inside a dynamic panel.
                </p>
                <p className="leading-relaxed text-slate-600 dark:text-slate-350">
                  <strong className="text-slate-800 dark:text-slate-205">Shipped-To Coordinates:</strong> Override billing addresses to document separate delivery destinations (Name, Phone, State, and unique GSTIN).
                </p>
              </div>
            </div>

            {/* Interactive Mockup */}
            <div className="lg:col-span-6">
              <div className={`p-6 rounded-3xl border transition-all duration-300 ${
                theme === 'dark' ? 'bg-neutral-900/80 border-neutral-800/80 shadow-2xl shadow-sky-950/10' : 'bg-white border-slate-200/60 shadow-lg hover:shadow-xl'
              }`}>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-3.5 mb-4 text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping" />
                    <span className="text-[10px] font-black uppercase text-slate-450 dark:text-slate-500 tracking-wider">Logistics & PO Control</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-extrabold text-slate-400">Prefix:</span>
                    <input 
                      type="text" 
                      value={prefix} 
                      onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                      className="w-12 px-1.5 py-0.5 rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 text-[10px] font-black text-center text-slate-805 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3.5 text-[10px]">
                    <div className="space-y-1">
                      <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Invoice Number</span>
                      <div className="p-2 rounded-xl bg-slate-50/50 dark:bg-neutral-950/40 border border-slate-100 dark:border-neutral-800/60 font-mono font-bold text-slate-705 dark:text-slate-200">
                        {prefix}-2026-0045
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">PO Reference</span>
                      <div className="p-2 rounded-xl bg-slate-50/50 dark:bg-neutral-950/40 border border-slate-100 dark:border-neutral-800/60 font-mono font-bold text-slate-705 dark:text-slate-200">
                        PO-77890-X
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50/50 dark:bg-neutral-950/40 rounded-2xl border border-slate-100 dark:border-neutral-800/60 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-slate-705 dark:text-slate-200">Enable Logistics E-Way Bill Fields</span>
                      <button 
                        type="button" 
                        onClick={() => setShowLogistics(!showLogistics)}
                        className={`w-8 h-4.5 rounded-full p-0.5 transition-colors relative cursor-pointer flex items-center ${
                          showLogistics ? 'bg-sky-600' : 'bg-slate-200 dark:bg-neutral-800'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full bg-white shadow transition-transform transform ${showLogistics ? 'translate-x-3.5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {showLogistics && (
                      <div className="grid grid-cols-2 gap-3.5 text-[9px] animate-fade-in border-t border-slate-100 dark:border-neutral-800/80 pt-3.5">
                        <div className="space-y-1 bg-slate-150/40 dark:bg-neutral-900/40 p-2 rounded-xl border border-slate-200/30 dark:border-neutral-800/30">
                          <span className="block text-[7px] font-bold text-slate-400 dark:text-slate-500 uppercase">Vehicle Registration</span>
                          <span className="block font-mono font-bold text-slate-705 dark:text-slate-200">DL-1GA-9988</span>
                        </div>
                        <div className="space-y-1 bg-slate-150/40 dark:bg-neutral-900/40 p-2 rounded-xl border border-slate-200/30 dark:border-neutral-800/30">
                          <span className="block text-[7px] font-bold text-slate-400 dark:text-slate-500 uppercase">E-Way Bill ID</span>
                          <span className="block font-mono font-bold text-slate-705 dark:text-slate-200">171299878891</span>
                        </div>
                        <div className="space-y-1 col-span-2 bg-slate-150/40 dark:bg-neutral-900/40 p-2.5 rounded-xl border border-slate-200/30 dark:border-neutral-800/30">
                          <span className="block text-[7px] font-bold text-slate-400 dark:text-slate-500 uppercase">Shipped To Override</span>
                          <span className="block font-bold text-slate-705 dark:text-slate-200">Alex Morgan - GSTIN 07AAAAA0000A1Z5</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
                  {/* Showcase 2: Personalised Template Studio & Vector Signatures */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Interactive Mockup (Order 2 on mobile, 1 on desktop) */}
            <div className="lg:col-span-6 lg:order-1 order-2">
              <div className={`p-6 rounded-3xl border transition-all duration-300 ${
                theme === 'dark' ? 'bg-neutral-900/80 border-neutral-800/80 shadow-2xl shadow-purple-950/10' : 'bg-white border-slate-200/60 shadow-lg hover:shadow-xl'
              }`}>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-3.5 mb-4 text-[10px]">
                  <span className="font-black uppercase text-slate-450 dark:text-slate-500 tracking-wider">Visual Customizer Studio</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-slate-400">Layout:</span>
                    <select
                      value={demoTemplateLayout}
                      onChange={(e) => setDemoTemplateLayout(e.target.value as any)}
                      className="px-2 py-0.5 rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 text-[10px] font-black text-slate-805 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                    >
                      <option value="Classic">Classic GST</option>
                      <option value="Modern">Modern Tech</option>
                      <option value="Minimal">Minimal B2B</option>
                      <option value="Retail">Retail Slip</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Miniature Invoice A4 Canvas Simulation */}
                  <div className={`p-3 rounded-2xl border transition-all relative ${
                    theme === 'dark' ? 'bg-neutral-955/40 border-neutral-800/60' : 'bg-slate-50 border-slate-100'
                  } ${
                    demoTemplateLayout === 'Minimal' ? 'border-t-4 border-t-slate-800 dark:border-t-neutral-200' :
                    demoTemplateLayout === 'Modern' ? 'border-t-4 border-t-purple-600' :
                    demoTemplateLayout === 'Retail' ? 'max-w-[280px] mx-auto border-dashed' :
                    'border-t-4 border-t-sky-600'
                  }`}>
                    <div className="relative z-10 space-y-2 text-[9px]">
                      <div className="flex justify-between border-b pb-1.5">
                        <div>
                          <span className="font-black block text-slate-800 dark:text-white">MI Corp.</span>
                          <span className="text-[7.5px] text-slate-450 block">Delhi Registry (07)</span>
                        </div>
                        <span className="font-mono text-slate-400 font-bold">#INV-0045</span>
                      </div>
                      <div className="space-y-1 py-1">
                        <div className="flex justify-between font-bold text-slate-650">
                          <span>1. Consultation Services</span>
                          <span className="font-mono">$960.00</span>
                        </div>
                      </div>
                      <div className="border-t pt-1.5 flex justify-between items-center text-[10px]">
                        <div className="space-y-0.5">
                          <span className="block text-[6px] font-bold text-slate-400 uppercase">Drawn Sign</span>
                          <div className="w-12 h-5 border border-dashed rounded flex items-center justify-center bg-white dark:bg-neutral-900">
                            {points.length > 0 ? (
                              <svg className="w-full h-full" viewBox="0 0 100 30" fill="none">
                                <path d={`M 10 15 ` + points.slice(1, 10).map(p => `L ${p.x/2} ${p.y/4}`).join(' ')} stroke="#4f46e5" strokeWidth="1.5" />
                              </svg>
                            ) : (
                              <span className="text-[6px] text-slate-400 font-bold">Ink Stamp</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-slate-805 dark:text-white">Total: $1,310.00</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Draw Signature Sketchpad */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Stylus Ink Signature sketchpad</span>
                      <button type="button" onClick={() => setPoints([])} className="text-[8px] font-extrabold text-purple-650 dark:text-purple-400 hover:text-purple-500 hover:underline cursor-pointer">Clear</button>
                    </div>
                    <div className="border border-dashed rounded-xl overflow-hidden bg-slate-50/50 dark:bg-neutral-950/40 hover:border-purple-500/40 transition-colors">
                      <svg 
                        className="w-full h-16 cursor-crosshair"
                        onMouseDown={handleSignatureMouseDown}
                        onMouseMove={handleSignatureMouseMove}
                        onMouseUp={handleSignatureMouseUp}
                        onMouseLeave={handleSignatureMouseUp}
                      >
                        {points.length > 1 && (
                          <path 
                            d={`M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')}
                            fill="none" 
                            stroke="#4f46e5"
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                          />
                        )}
                        {points.length === 0 && (
                          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-[8.5px] font-bold fill-slate-400 dark:fill-slate-500 select-none">
                            Draw signature here to embed in preview
                          </text>
                        )}
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Text Description (Order 1 on mobile, 2 on desktop) */}
            <div className="lg:col-span-6 lg:order-2 order-1 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-650 dark:text-purple-400 flex items-center justify-center border border-purple-500/10">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-805 uppercase tracking-tight">Personalised Template Studio</h3>
              </div>
              <p className="text-sm text-slate-655 dark:text-slate-400 leading-relaxed max-w-xl">
                Design custom invoice layouts that fit your brand guidelines. Control font families, border styles, margin layouts, watermarks, page orientation (portrait/landscape), and PDF page sizing (A4/Letter).
              </p>
              
              <div className="border-l-2 border-purple-500 pl-4 py-1.5 space-y-3.5 text-xs max-w-xl">
                <p className="leading-relaxed text-slate-600 dark:text-slate-350">
                  <strong className="text-slate-800 dark:text-slate-205">Custom Layout Creator:</strong> Design self-styled templates. Configure colors, watermark rotation, opacity, and drag sections to re-order.
                </p>
                <p className="leading-relaxed text-slate-600 dark:text-slate-350">
                  <strong className="text-slate-800 dark:text-slate-205">Stylus Vector Signatures:</strong> Draw signature paths on an active canvas. Captured base64 vectors are printed directly onto client invoices.
                </p>
              </div>
            </div>
          </div>

          {/* Showcase 3: Compliance State Tax splits & Bulk Imports */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Text Description */}
            <div className="lg:col-span-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/10">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-805 uppercase tracking-tight">Compliance & Bulk Import</h3>
              </div>
              <p className="text-sm text-slate-655 dark:text-slate-400 leading-relaxed max-w-xl">
                Eliminate computational errors. Automatically calculate regional splits, register items to General Ledger codes, and import complete catalogs in seconds.
              </p>
              
              <div className="border-l-2 border-indigo-500 pl-4 py-1.5 space-y-3.5 text-xs max-w-xl">
                <p className="leading-relaxed text-slate-600 dark:text-slate-350">
                  <strong className="text-slate-800 dark:text-slate-205">Auto State splits (CGST/SGST/IGST):</strong> Maps business state codes (e.g. Delhi-07) to auto-split taxes for intra-state transactions or apply IGST for inter-state supply.
                </p>
                <p className="leading-relaxed text-slate-600 dark:text-slate-350">
                  <strong className="text-slate-800 dark:text-slate-205">Bulk Spreadsheet Sandboxing:</strong> Drag-and-drop XLS/CSV spreadsheet sheets to populate customer registers and product lists in bulk.
                </p>
              </div>
            </div>

            {/* Interactive Mockup */}
            <div className="lg:col-span-6">
              <div className={`p-6 rounded-3xl border transition-all duration-300 ${
                theme === 'dark' ? 'bg-neutral-900/80 border-neutral-800/80 shadow-2xl shadow-indigo-950/10' : 'bg-white border-slate-200/60 shadow-lg hover:shadow-xl'
              }`}>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-3 mb-4 text-[10px]">
                  <span className="font-black uppercase text-slate-450 dark:text-slate-500 tracking-wider">Spreadsheet Bulk Import Vault</span>
                  <div className="flex gap-1">
                    {(['products', 'clients'] as const).map((type) => (
                      <button 
                        key={type}
                        type="button" 
                        onClick={() => { setBulkDataType(type); setBulkFileUploaded(false); }}
                        className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase transition-all cursor-pointer ${
                          bulkDataType === type 
                            ? 'bg-indigo-600 text-white shadow-sm' 
                            : 'bg-slate-100 dark:bg-neutral-800 text-slate-505 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {type === 'products' ? 'Products' : 'Clients'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Dropzone mockup */}
                  <div 
                    onClick={() => setBulkFileUploaded(true)}
                    className="border-2 border-dashed border-indigo-500/30 rounded-2xl p-6 text-center cursor-pointer hover:bg-indigo-500/5 dark:hover:bg-indigo-505/10 transition-all space-y-2"
                  >
                    <Upload className="w-7 h-7 text-indigo-500 mx-auto animate-bounce" />
                    <div>
                      <span className="block text-[9px] font-black text-slate-700 dark:text-slate-300">
                        {bulkFileUploaded ? 'File Parsed Successfully!' : `Upload Bulk ${bulkDataType === 'products' ? 'Product Catalog' : 'Client Directory'}`}
                      </span>
                      <span className="block text-[8px] text-slate-400 dark:text-slate-500">Supports spreadsheet XLS, XLSX, and CSV documents</span>
                    </div>
                  </div>

                  {bulkFileUploaded && (
                    <div className="p-3.5 bg-indigo-500/5 dark:bg-indigo-505/10 border border-indigo-500/20 rounded-xl space-y-1.5 animate-fade-in text-[9px]">
                      <div className="flex justify-between items-center text-indigo-650 dark:text-indigo-400 font-bold">
                        <span>Status: Validated</span>
                        <span>[24 rows parsed]</span>
                      </div>
                      <div className="space-y-1 font-mono text-[8px] text-slate-500 dark:text-slate-405">
                        <p>1. {bulkDataType === 'products' ? 'Development consulting service - $120.00' : 'Alex Morgan - San Francisco'}</p>
                        <p>2. {bulkDataType === 'products' ? 'Aluminum Casting rods inventory - $45.00' : 'Intez B2B Systems - Delhi'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Showcase 4: General Ledger & Cash Flow Books */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Interactive Mockup (Order 2 on mobile, 1 on desktop) */}
            <div className="lg:col-span-6 lg:order-1 order-2">
              <div className={`p-6 rounded-3xl border transition-all duration-300 ${
                theme === 'dark' ? 'bg-neutral-900/80 border-neutral-800/80 shadow-2xl shadow-amber-950/10' : 'bg-white border-slate-200/60 shadow-lg hover:shadow-xl'
              }`}>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-3.5 mb-4 text-[10px]">
                  <span className="font-black uppercase text-slate-450 dark:text-slate-500 tracking-wider">GL Mapping & Inventory Ledger</span>
                  <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded">BOOKKEEPING LOGS</span>
                </div>

                <div className="space-y-4 text-[10px]">
                  {/* Item catalog selection */}
                  <div className="p-3.5 bg-slate-50/50 dark:bg-neutral-950/40 border border-slate-100 dark:border-neutral-805/30 rounded-2xl space-y-3.5">
                    <div className="flex justify-between items-center text-slate-705 dark:text-slate-350">
                      <span className="font-bold">Catalog Item:</span>
                      <span className="font-mono font-bold">INV-ITEM-0045 (Aluminium Rods)</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase">Unit of Measure (UOM)</span>
                        <select 
                          value={demoUom}
                          onChange={(e) => setDemoUom(e.target.value as any)}
                          className="w-full px-2.5 py-1 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-955 text-slate-805 dark:text-white text-[10px] focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                        >
                          <option value="pcs">Pieces (pcs)</option>
                          <option value="bags">Bags (bags)</option>
                          <option value="kg">Kilograms (kg)</option>
                          <option value="meters">Meters (mtr)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase">General Ledger Code</span>
                        <select 
                          value={selectedGlAccount}
                          onChange={(e) => setSelectedGlAccount(e.target.value as any)}
                          className="w-full px-2.5 py-1 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-955 text-slate-805 dark:text-white text-[10px] focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                        >
                          <option value="4001">4001 - Revenue Account</option>
                          <option value="5002">5002 - Operating Cost</option>
                          <option value="1010">1010 - Cash Equivalents</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Mapping Output Simulation */}
                  <div className="p-3.5 bg-amber-500/5 border border-amber-500/10 rounded-2xl text-[9px] font-mono space-y-1.5">
                    <div className="flex justify-between items-center font-bold text-amber-600 dark:text-amber-400">
                      <span>Ledger State Mapping:</span>
                      <span>ACTIVE</span>
                    </div>
                    <p className="text-slate-550 dark:text-slate-405 leading-relaxed">
                      Item stock unit set to <strong className="text-slate-700 dark:text-slate-200">[{demoUom}]</strong>. All item invoice records will auto-route transactions to <strong className="text-slate-700 dark:text-slate-200">[GL Account #{selectedGlAccount}]</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Text Description (Order 1 on mobile, 2 on desktop) */}
            <div className="lg:col-span-6 lg:order-2 order-1 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-650 dark:text-amber-400 flex items-center justify-center border border-amber-500/10">
                  <Settings className="w-5 h-5" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-805 uppercase tracking-tight">General Ledger Books</h3>
              </div>
              <p className="text-sm text-slate-655 dark:text-slate-400 leading-relaxed max-w-xl">
                Connect your physical operations with formal accounting databases. Map invoice items to specific ledger codes and maintain audit records of operational costs.
              </p>
              
              <div className="border-l-2 border-amber-500 pl-4 py-1.5 space-y-3.5 text-xs max-w-xl">
                <p className="leading-relaxed text-slate-600 dark:text-slate-350">
                  <strong className="text-slate-800 dark:text-slate-205">Flexible Units of Measure (UOM):</strong> Track inventory, services, raw materials, or hardware catalogs using custom units (bags, boxes, kg, meters, pieces, hours).
                </p>
                <p className="leading-relaxed text-slate-605 dark:text-slate-350">
                  <strong className="text-slate-800 dark:text-slate-205">Bookkeeping Registry:</strong> Route business revenue and operational overhead costs automatically to designated accounts for quick ledger balance audits.
                </p>
              </div>
            </div>
          </div>

          {/* Showcase 5: Billing Analytics & Cash Flow Reports */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Text Description */}
            <div className="lg:col-span-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/10">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-805 uppercase tracking-tight">Billing Analytics</h3>
              </div>
              <p className="text-sm text-slate-655 dark:text-slate-400 leading-relaxed max-w-xl">
                Evaluate business health at a glance. Access instant cash flow summaries, profit margin reviews, collection ratios, and outstanding receivables tracking.
              </p>
              
              <div className="border-l-2 border-emerald-500 pl-4 py-1.5 space-y-3.5 text-xs max-w-xl">
                <p className="leading-relaxed text-slate-600 dark:text-slate-350">
                  <strong className="text-slate-800 dark:text-slate-205">Cash Flow Reporting Filters:</strong> Group collections and pending balances dynamically by Month, Quarter, or Year to evaluate growth cycles.
                </p>
                <p className="leading-relaxed text-slate-600 dark:text-slate-350">
                  <strong className="text-slate-800 dark:text-slate-205">Spreadsheet Compilation:</strong> Compile overhead summaries, client registries, and invoicing details to formatted XLSX files for tax reporting.
                </p>
              </div>
            </div>

            {/* Interactive Mockup */}
            <div className="lg:col-span-6">
              <div className={`p-6 rounded-3xl border transition-all duration-300 ${
                theme === 'dark' ? 'bg-neutral-900/80 border-neutral-800/80 shadow-2xl shadow-emerald-950/10' : 'bg-white border-slate-200/60 shadow-lg hover:shadow-xl'
              }`}>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-3.5 mb-4 text-[10px]">
                  <span className="font-black uppercase text-slate-450 dark:text-slate-500 tracking-wider">Reports & Reporting Studio</span>
                  <div className="flex gap-1">
                    {(['month', 'quarter', 'year'] as const).map((period) => (
                      <button 
                        key={period}
                        type="button" 
                        onClick={() => setAnalyticsPeriod(period)}
                        className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase transition-all cursor-pointer ${
                          analyticsPeriod === period 
                            ? 'bg-emerald-600 text-white shadow-sm' 
                            : 'bg-slate-100 dark:bg-neutral-800 text-slate-505 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {period === 'month' ? 'Monthly' : period === 'quarter' ? 'Quarterly' : 'Yearly'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 text-[10px]">
                  {/* Reports Stats Panel */}
                  <div className="grid grid-cols-3 gap-3.5">
                    <div className="p-2.5 rounded-xl bg-slate-50/50 dark:bg-neutral-955/40 border border-slate-100 dark:border-neutral-800/60 text-center">
                      <span className="block text-[7px] font-bold text-slate-400 uppercase">Total Collected</span>
                      <span className="font-mono font-bold text-slate-705 dark:text-slate-200">
                        {analyticsPeriod === 'month' ? '$9,500' : analyticsPeriod === 'quarter' ? '$28,500' : '$114,000'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50/50 dark:bg-neutral-955/40 border border-slate-100 dark:border-neutral-800/60 text-center">
                      <span className="block text-[7px] font-bold text-slate-400 uppercase">Outstanding</span>
                      <span className="font-mono font-bold text-slate-705 dark:text-slate-200">
                        {analyticsPeriod === 'month' ? '$1,310' : analyticsPeriod === 'quarter' ? '$4,120' : '$12,400'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50/50 dark:bg-neutral-955/40 border border-slate-100 dark:border-neutral-800/60 text-center">
                      <span className="block text-[7px] font-bold text-slate-400 uppercase">Net Margin</span>
                      <span className="font-mono font-bold text-emerald-500">
                        {analyticsPeriod === 'month' ? '84%' : analyticsPeriod === 'quarter' ? '81%' : '78%'}
                      </span>
                    </div>
                  </div>

                  {/* Profit Curve Bar Simulation */}
                  <div className="p-3.5 bg-slate-50/50 dark:bg-neutral-950/40 border border-slate-100 dark:border-neutral-805/30 rounded-2xl space-y-2">
                    <span className="block text-[8px] font-bold text-slate-400 uppercase">Growth Revenue Stream</span>
                    <div className="flex items-end gap-2.5 h-12 pt-3">
                      <div className="w-full bg-slate-200 dark:bg-neutral-800 rounded-t h-4 transition-all" />
                      <div className="w-full bg-slate-200 dark:bg-neutral-800 rounded-t h-7 transition-all" />
                      <div className="w-full bg-slate-200 dark:bg-neutral-800 rounded-t h-9 transition-all" />
                      <div className="w-full bg-emerald-500 rounded-t h-12 transition-all animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Accordion-Style Help & FAQ Section */}
        <div id="faq-section" className="mt-14 sm:mt-16 max-w-5xl mx-auto space-y-8 scroll-mt-24 px-4 sm:px-6 mb-14 text-center">
          <div className="space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-808 dark:text-slate-100 uppercase">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Got questions about billing, offline-mode security, or customization? Find quick answers below.
            </p>
          </div>

          <div className="space-y-3.5 text-left">
            {faqItems.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div 
                  key={index} 
                  className={`border border-slate-200/60 dark:border-neutral-800/80 rounded-2xl px-5 mb-3 transition-all duration-300 bg-white/40 dark:bg-neutral-900/30 backdrop-blur-sm ${
                    isOpen 
                      ? 'border-sky-500/40 shadow-md shadow-sky-500/5' 
                      : 'hover:border-slate-300 dark:hover:border-neutral-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full py-4.5 flex items-center justify-between text-left cursor-pointer focus:outline-none select-none group"
                  >
                    <span className={`text-[15px] font-semibold leading-snug transition-colors duration-200 pr-6 ${
                      isOpen 
                        ? theme === 'dark' ? 'text-sky-400' : 'text-sky-600'
                        : theme === 'dark' ? 'text-slate-300 group-hover:text-white' : 'text-slate-800 group-hover:text-sky-605'
                    }`}>
                      {faq.question}
                    </span>
                    <span className={`w-6 h-6 flex items-center justify-center transition-transform duration-300 shrink-0 ${
                      isOpen ? 'rotate-180' : ''
                    }`}>
                      <ChevronDown className={`w-4.5 h-4.5 transition-colors duration-200 ${
                        isOpen 
                          ? theme === 'dark' ? 'text-sky-400' : 'text-sky-600'
                          : theme === 'dark' ? 'text-slate-505 group-hover:text-slate-300' : 'text-slate-400 group-hover:text-sky-605'
                      }`} />
                    </span>
                  </button>

                  <div className={`transition-all duration-300 ease-in-out ${
                    isOpen ? 'max-h-64 opacity-100 pb-5' : 'max-h-0 opacity-0 pointer-events-none'
                  } overflow-hidden`}>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} leading-relaxed pr-8`}>
                      {faq.answer}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info branding */}
        <footer className="mt-14 text-center text-xs text-slate-400 border-t border-slate-200/50 dark:border-neutral-800/60 pt-8 pb-10">
          <p>© {new Date().getFullYear()} MakInvoices Corp. Local state automatically cached for safety. Encryption standards enabled.</p>
        </footer>

        {/* Scroll To Top Button */}
        {showScrollTop && (
          <button
            type="button"
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 p-3.5 bg-sky-600 hover:bg-sky-500 text-white rounded-full shadow-lg shadow-sky-600/25 hover:shadow-sky-500/35 transition-all duration-300 z-50 animate-fade-in cursor-pointer hover:scale-110 active:scale-95 border border-sky-400/20 flex items-center justify-center group"
            aria-label="Scroll to top"
          >
            <ArrowUp className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
          </button>
        )}

      </div>

    </div>
  );
}
