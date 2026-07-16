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

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-slate-805">
              The Intelligent <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 via-sky-600 to-indigo-500">
                Billing & Estimate
              </span> <br />
              Platform.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-350 font-normal leading-relaxed max-w-2xl">
              Focus on doing what you love while MakInvoices automates your billing lifecycle.
              Generate high-performance estimates, automate repeating client invoice cycles, 
              drawn signatures, visual financial analytics, and download professional PDFs instantly.
            </p>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 text-sm max-w-2xl">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-405 rounded-xl shrink-0 border border-emerald-500/10">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-extrabold text-slate-800 dark:text-slate-205 block">Offline-First Safety</span>
                  <span className="text-slate-500 dark:text-slate-400 text-xs leading-normal">Work seamlessly without internet; your data is encrypted & cached locally.</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-405 rounded-xl shrink-0 border border-indigo-500/10">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-extrabold text-slate-800 dark:text-slate-205 block">AI Smart Billing</span>
                  <span className="text-slate-500 dark:text-slate-400 text-xs leading-normal">Describe your bill in simple English and let our AI compile the invoice.</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 bg-sky-500/10 text-sky-650 dark:text-sky-405 rounded-xl shrink-0 border border-sky-500/10">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-extrabold text-slate-800 dark:text-slate-205 block">GST Compliance Split</span>
                  <span className="text-slate-500 dark:text-slate-400 text-xs leading-normal">Auto-calculates CGST, SGST, & IGST splits based on client registry states.</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 bg-purple-500/10 text-purple-650 dark:text-purple-405 rounded-xl shrink-0 border border-purple-500/10">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-extrabold text-slate-800 dark:text-slate-205 block">Bespoke Design Studio</span>
                  <span className="text-slate-500 dark:text-slate-400 text-xs leading-normal">Custom branding themes, margins, watermarks, and drawn stylus signatures.</span>
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

          {/* Right: Premium Live-Rendered Mockup representing Sample Dashboard and Sample Invoice */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 flex flex-col items-center justify-start lg:mt-0 mt-8 relative order-2"
          >
            {/* Live Interactive Control Panel */}
            <div className="w-full max-w-[500px] mb-5 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-200/50 dark:border-neutral-800/80 shadow-lg relative z-30 transition-all text-xs">
              <div className="flex flex-col gap-3">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-neutral-500 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-sky-500 animate-pulse" />
                    Interactive Live Preview
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-sky-500/10 dark:bg-sky-505/15 text-sky-500 rounded-md font-mono font-bold animate-pulse">Try clicking options!</span>
                </div>

                <div className="grid grid-cols-3 gap-4 text-[10px]">
                  {/* Select Theme Accent */}
                  <div className="space-y-1.5">
                    <span className="block text-[8px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Color Palette</span>
                    <div className="flex items-center gap-2 pt-0.5">
                      <button 
                        type="button"
                        onClick={() => setDemoAccent('sky')} 
                        className={`w-5 h-5 rounded-full bg-sky-500 border-2 transition-all cursor-pointer ${demoAccent === 'sky' ? 'ring-2 ring-sky-500/50 scale-110 border-white dark:border-neutral-900' : 'border-transparent opacity-85 hover:opacity-100'}`}
                        title="Sky Blue"
                      />
                      <button 
                        type="button"
                        onClick={() => setDemoAccent('emerald')} 
                        className={`w-5 h-5 rounded-full bg-emerald-500 border-2 transition-all cursor-pointer ${demoAccent === 'emerald' ? 'ring-2 ring-emerald-500/50 scale-110 border-white dark:border-neutral-900' : 'border-transparent opacity-85 hover:opacity-100'}`}
                        title="Emerald Green"
                      />
                      <button 
                        type="button"
                        onClick={() => setDemoAccent('indigo')} 
                        className={`w-5 h-5 rounded-full bg-indigo-500 border-2 transition-all cursor-pointer ${demoAccent === 'indigo' ? 'ring-2 ring-indigo-500/50 scale-110 border-white dark:border-neutral-900' : 'border-transparent opacity-85 hover:opacity-100'}`}
                        title="Indigo Creative"
                      />
                      <button 
                        type="button"
                        onClick={() => setDemoAccent('rose')} 
                        className={`w-5 h-5 rounded-full bg-rose-500 border-2 transition-all cursor-pointer ${demoAccent === 'rose' ? 'ring-2 ring-rose-500/50 scale-110 border-white dark:border-neutral-900' : 'border-transparent opacity-85 hover:opacity-100'}`}
                        title="Rose Premium"
                      />
                    </div>
                  </div>

                  {/* Select Layout Presets */}
                  <div className="space-y-1.5">
                    <span className="block text-[8px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Invoice Layout</span>
                    <div className="flex gap-1 pt-0.5">
                      {(['modern', 'minimal', 'agency'] as const).map((l) => (
                        <button 
                          key={l}
                          type="button"
                          onClick={() => setDemoLayout(l)} 
                          className={`px-2 py-1 rounded-lg text-[8px] font-extrabold uppercase transition-all cursor-pointer ${
                            demoLayout === l 
                              ? 'bg-sky-600 text-white shadow-sm' 
                              : 'bg-slate-100 dark:bg-neutral-800 text-slate-505 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-neutral-750'
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Select Status */}
                  <div className="space-y-1.5">
                    <span className="block text-[8px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Invoice Status</span>
                    <div className="flex gap-1 pt-0.5">
                      {(['PAID', 'PENDING', 'OVERDUE'] as const).map((s) => (
                        <button 
                          key={s}
                          type="button"
                          onClick={() => setDemoStatus(s)} 
                          className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase transition-all cursor-pointer ${
                            demoStatus === s 
                              ? s === 'PAID' 
                                ? 'bg-emerald-500 text-white shadow-sm' 
                                : s === 'PENDING'
                                  ? 'bg-amber-500 text-white shadow-sm'
                                  : 'bg-rose-505 text-white shadow-sm'
                              : 'bg-slate-100 dark:bg-neutral-800 text-slate-505 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-neutral-750'
                          }`}
                        >
                          {s === 'PENDING' ? 'Pend' : s === 'OVERDUE' ? 'Ovr' : 'Paid'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mockup Canvas Screen */}
            <div className="w-full max-w-full sm:max-w-[580px] overflow-x-auto no-scrollbar pb-6 -mx-2 px-2 sm:mx-0 sm:px-0">
              <div className="w-full h-[400px] sm:h-[520px] lg:h-[550px] relative overflow-hidden rounded-3xl">
              
              {/* Background glowing visual accents */}
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-3xl pointer-events-none transition-colors duration-500 ${
                demoAccent === 'sky' ? 'bg-sky-505/10 dark:bg-sky-500/15' :
                demoAccent === 'emerald' ? 'bg-emerald-500/10 dark:bg-emerald-500/15' :
                demoAccent === 'indigo' ? 'bg-indigo-500/10 dark:bg-indigo-500/15' :
                'bg-rose-500/10 dark:bg-rose-500/15'
              }`} />
              
              {/* DASHBOARD PREVIEW PANEL (Base Underlay window) */}
              <div className="absolute left-0 sm:left-2 top-0 sm:top-2 w-[85%] max-w-[440px] rounded-3xl bg-[#090d16] border border-slate-800 shadow-2xl shadow-slate-950/40 overflow-hidden transform -rotate-3 hover:-rotate-1 transition-all duration-550 text-slate-100 p-4 z-10">
                
                {/* Window controls bar */}
                <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-slate-850">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-[9px] text-slate-400 font-mono ml-2">sales_tracker.sh</span>
                  </div>
                  <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${accentClasses[demoAccent].badge}`}>
                    Sample Dashboard
                  </span>
                </div>

                {/* Dynamic stats preview cards */}
                <div className="grid grid-cols-2 gap-2.5 mb-3.5">
                  <div className="p-2.5 bg-[#050910] border border-slate-850 rounded-xl">
                    <span className="text-[8px] text-slate-400 uppercase font-black tracking-wider block">Total Sales</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-xs font-black text-white">$18,420.00</span>
                      <span className="text-[8px] text-emerald-400 font-extrabold">+14%</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-[#050910] border border-slate-850 rounded-xl">
                    <span className="text-[8px] text-slate-400 uppercase font-black tracking-wider block">Remaining Debt</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-xs font-black text-amber-400">$3,550.00</span>
                    </div>
                  </div>
                </div>

                {/* SVG Sparkline Graph Simulation */}
                <div className="p-2 bg-[#050910]/40 border border-slate-850/80 rounded-xl mb-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Weekly Revenue Stream</span>
                    <span className={`text-[8px] font-mono animate-pulse ${accentClasses[demoAccent].text}`}>Running Live</span>
                  </div>
                  
                  {/* SVG Graph path with dynamic pointer */}
                  <svg className="w-full h-12 overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
                    {/* Grid background rails */}
                    <line x1="0" y1="10" x2="100" y2="10" stroke="#101827" strokeWidth="0.5" strokeDasharray="1" />
                    <line x1="0" y1="20" x2="100" y2="20" stroke="#101827" strokeWidth="0.5" strokeDasharray="1" />
                    
                    {/* Underlay glow path */}
                    <path d="M 0 30 L 0 25 L 20 18 L 40 24 L 60 11 L 80 15 L 100 2 L 100 30 Z" fill={`url(#dash-${demoAccent}-glow)`} opacity="0.25" />
                    
                    {/* Stroke path */}
                    <path d="M 0 25 L 20 18 L 40 24 L 60 11 L 80 15 L 100 2" fill="none" stroke={accentClasses[demoAccent].stroke} strokeWidth="1.8" strokeLinecap="round" />
                    
                    {/* Pulsing indicator */}
                    <circle cx="100" cy="2" r="1.8" fill={accentClasses[demoAccent].stroke} className="animate-ping" style={{ transformOrigin: '100px 2px' }} />
                    <circle cx="100" cy="2" r="1.5" fill={accentClasses[demoAccent].stroke} />

                    <defs>
                      <linearGradient id={`dash-${demoAccent}-glow`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={accentClasses[demoAccent].stroke} />
                        <stop offset="100%" stopColor={accentClasses[demoAccent].stroke} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                {/* Recent Ledger Invoices List */}
                <div className="space-y-1.5">
                  <span className="text-[8px] text-slate-400 uppercase font-bold tracking-wider">Active Invoices</span>
                  
                  <div className="p-2 bg-[#050910] rounded-xl flex items-center justify-between border border-slate-900/60">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[9px] font-bold text-white">#INV-0044</span>
                      <span className="text-[8px] text-slate-450">Alex Morgan</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-black text-slate-100">$1,105.00</span>
                      <span className="text-[7px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-md font-black uppercase">PAID</span>
                    </div>
                  </div>

                  <div className="p-2 bg-[#050910] rounded-xl flex items-center justify-between border border-slate-900/60 transition-all">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        demoStatus === 'PAID' ? 'bg-emerald-500' :
                        demoStatus === 'PENDING' ? 'bg-amber-400 animate-pulse' : 'bg-rose-500'
                      }`} />
                      <span className="text-[9px] font-bold text-white">#INV-0045</span>
                      <span className="text-[8px] text-slate-455">Corporate Labs</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-black text-slate-100">$4,200.00</span>
                      <span className={`text-[7px] border px-1.5 py-0.5 rounded-md font-black uppercase transition-all ${
                        demoStatus === 'PAID' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        demoStatus === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>{demoStatus}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* HIGH-FIDELITY INVOICE PAPER (Overlapping, angled, beautifully structured) */}
              <div className={`absolute right-0 sm:right-2 bottom-0 sm:bottom-2 w-[76%] sm:w-[72%] max-w-[320px] bg-white text-slate-800 rounded-2xl shadow-2xl shadow-slate-950/40 border p-3.5 transform rotate-3 hover:rotate-1 transition-all duration-550 z-20 flex flex-col font-sans border-slate-150 ${
                demoLayout === 'minimal' ? 'border-dashed !shadow-none !bg-slate-50/95 font-mono' : ''
              }`}>
                
                {/* Agency Layout Custom Top Banner Block */}
                {demoLayout === 'agency' && (
                  <div className="bg-slate-900 text-white px-2.5 py-1.5 -mx-3.5 -mt-3.5 rounded-t-2xl mb-2 flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
                    <span className="text-[8.5px] font-extrabold uppercase tracking-widest text-[#0ea5e9]">INTEZ AGENCY</span>
                    <span className="text-[6.5px] text-slate-400 font-mono">B2B CONTRACTOR</span>
                  </div>
                )}

                {/* Invoice Logo & Meta area */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                  <div>
                    <h4 className="text-[10px] font-black tracking-tight text-slate-900 leading-none">INTEZ Systems</h4>
                    <span className="text-[7.5px] text-slate-400 block mt-0.5 font-mono">DELHI (07) • SELLER</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-[9px] font-black block leading-none transition-colors ${
                      demoAccent === 'sky' ? 'text-sky-600' :
                      demoAccent === 'emerald' ? 'text-emerald-600' :
                      demoAccent === 'indigo' ? 'text-indigo-600' : 'text-rose-600'
                    }`}>SAMPLE INVOICE</span>
                    <span className="text-[7px] font-mono text-slate-400 block mt-0.5">#INV-0045</span>
                  </div>
                </div>

                {/* Party details */}
                <div className="grid grid-cols-2 gap-2 mb-2 text-[7.5px] leading-relaxed">
                  <div>
                    <span className="font-extrabold text-slate-400 block uppercase tracking-wider text-[6.5px]">Owner</span>
                    <span className="font-bold text-slate-705 block">INTEZ Dev Group</span>
                    <span className="text-slate-500 block">Delhi, India</span>
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-400 block uppercase tracking-wider text-[6.5px]">Client</span>
                    <span className="font-bold text-slate-705 block">Alex Morgan</span>
                    <span className="text-slate-500 block">San Francisco, USA</span>
                  </div>
                </div>

                {/* Itemized Line Table */}
                <div className="space-y-1 border-t border-b border-slate-100 py-2.5 mb-2.5">
                  <div className="flex items-center justify-between text-[6.5px] font-black text-slate-400 uppercase tracking-wider">
                    <span>ITEMIZED DESCRIPTION</span>
                    <span>TOTAL PRICE</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-[7.5px] text-slate-700">
                    <div>
                      <span className="font-bold block">1x Cloud System Setup</span>
                      <span className="text-[6.5px] text-slate-450 block font-normal">Postgres cluster & API backend</span>
                    </div>
                    <span className="font-bold text-slate-900">$800.00</span>
                  </div>

                  <div className="flex items-center justify-between text-[7.5px] text-slate-700">
                    <div>
                      <span className="font-bold block">2.5h Custom Layout Support</span>
                      <span className="text-[6.5px] text-slate-450 block font-normal">Tailwind responsive styling</span>
                    </div>
                    <span className="font-bold text-slate-900">$305.00</span>
                  </div>
                </div>

                {/* Total Summary and Rubber Stamp */}
                <div className="flex items-start justify-between relative mt-0.5">
                  {/* Visual Watermarked Dynamic Stamp */}
                  <div className="absolute top-[-8px] left-1 z-30 pointer-events-none select-none">
                    {demoStatus === 'PAID' && (
                      <div className="border-2 border-emerald-500 text-emerald-600 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest leading-none rotate-[-15deg] bg-white/95 shadow-md flex items-center gap-1 animate-in zoom-in-75 duration-300">
                        <span>PAID ✓</span>
                      </div>
                    )}
                    {demoStatus === 'PENDING' && (
                      <div className="border-2 border-amber-500 text-amber-600 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest leading-none rotate-[-15deg] bg-white/95 shadow-md flex items-center gap-1 animate-in zoom-in-75 duration-300">
                        <span>PENDING ⏳</span>
                      </div>
                    )}
                    {demoStatus === 'OVERDUE' && (
                      <div className="border-2 border-rose-500 text-rose-600 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest leading-none rotate-[-15deg] bg-white/95 shadow-md flex items-center gap-1 animate-in zoom-in-75 duration-300">
                        <span>OVERDUE ⚠️</span>
                      </div>
                    )}
                  </div>

                  <div className="w-[12px]" /> {/* spacing */}

                  <div className="space-y-0.5 text-right w-1/2">
                    <div className="flex justify-between items-center text-[7px]">
                      <span className="text-slate-400 font-semibold">Subtotal:</span>
                      <span className="font-bold text-slate-700">$1,105.00</span>
                    </div>
                    <div className="flex justify-between items-center text-[7px] border-t pt-1 border-slate-100">
                      <span className="text-slate-900 font-black">Grand Total:</span>
                      <span className={`font-black text-[8px] transition-colors duration-300 ${
                        demoAccent === 'sky' ? 'text-sky-600' :
                        demoAccent === 'emerald' ? 'text-emerald-200' :
                        demoAccent === 'indigo' ? 'text-indigo-650' : 'text-rose-655'
                      }`} style={{ color: accentClasses[demoAccent].stroke }}>$1,105.00</span>
                    </div>
                  </div>
                </div>

                {/* Ink Client Pen Signature Block */}
                <div className="border-t border-slate-100 pt-1.5 mt-2 flex items-center justify-between">
                  <div>
                    <span className="text-[6px] uppercase font-bold text-slate-450 tracking-wider block">Receiver Signature</span>
                    <svg className="w-14 h-5 mt-0.5 transition-all" viewBox="0 0 100 30" fill="none" style={{ color: accentClasses[demoAccent].stroke }}>
                      <path d="M10 18 C 18 8, 25 22, 38 12 C 45 4, 52 18, 65 10 C 72 6, 85 18, 92 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className={`p-0.5 px-1.5 border rounded text-[6px] font-black uppercase tracking-wider leading-none transition-all ${
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
