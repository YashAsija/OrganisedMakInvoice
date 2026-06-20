import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
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
  RefreshCw
} from 'lucide-react';

interface HomepageProps {
  theme: 'light' | 'dark';
  onGoogleLogin: () => void;
  onCustomSignup: (name: string, companyName: string, email: string, phone: string) => void;
  onCustomLogin: (email: string, phone?: string) => void;
  isOnline: boolean;
}

export default function Homepage({ 
  theme, 
  onGoogleLogin, 
  onCustomSignup, 
  onCustomLogin,
  isOnline 
}: HomepageProps) {
  // Tabs for Auth: 'login' or 'signup'
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
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
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 60);
  };

  const faqItems = [
    {
      question: "How does MakInvoice handle GST, IGST, and state-specific tax rates?",
      answer: "MakInvoice features a dynamic tax compliance engine. You can select standard State/Union Territory codes (such as Delhi-07, Maharashtra-27) to automatically calculate and bifurcate CGST & SGST for intra-state billing, or apply clean unified IGST rules for inter-state and export client contracts."
    },
    {
      question: "Can I draw custom hand-drawn brand signatures on my invoices?",
      answer: "Yes! MakInvoice integrates a smooth interactive Signature Sketchpad. You can use your mouse, touch screen, or stylus to draw your brand signature directly on the screen. It is instantly saved in your creator profile and embedded elegantly in the footer of every generated document."
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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'signup') {
      if (!formData.name.trim()) {
        alert('Please fill out Your Name.');
        return;
      }
      if (!formData.companyName.trim()) {
        alert('Please fill out Your Company Name.');
        return;
      }
      if (!formData.phone.trim()) {
        alert('Please fill out your Phone Number.');
        return;
      }
      if (!formData.email.trim()) {
        alert('Please fill out your Email Address.');
        return;
      }
    } else {
      if (loginMethod === 'email' && !formData.email.trim()) {
        alert('Please enter your Registered Email Address.');
        return;
      }
      if (loginMethod === 'phone_otp') {
        if (!formData.phone.trim()) {
          alert('Please enter your Phone Number.');
          return;
        }
        if (otpSent && otpValue.length < 4) {
          alert('Please enter the OTP sent to your phone.');
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

    // Simulate standard fast secure database sign in / sign up
    setTimeout(() => {
      setIsLoading(false);
      setSuccessMsg(authMode === 'signup' ? 'Profile Created Successfully! Syncing workspace...' : 'Welcome back! Retrieving workspace state...');
      
      // Delay transition to make it feel extremely stable and satisfying
      setTimeout(() => {
        if (authMode === 'signup') {
          onCustomSignup(formData.name, formData.companyName, formData.email, formData.phone);
        } else {
          if (loginMethod === 'email') {
            onCustomLogin(formData.email, '');
          } else if (loginMethod === 'phone_otp') {
            onCustomLogin('', formData.phone);
          }
        }
      }, 1000);
    }, 1200);
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
        ? 'bg-neutral-950 text-neutral-100' 
        : 'bg-slate-50 text-slate-800'
    }`}>
      
      {/* Decorative ambient top glow - clipped to prevent overflow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none overflow-hidden" style={{maxWidth:'100vw'}} />
      <div className="absolute top-10 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none overflow-hidden" />

      {/* Main Container */}
      <div className="max-w-[1400px] mx-auto px-2 sm:px-2 lg:px-0 py-8 md:pb-16 lg:pt-6 relative">
        
        {/* Desktop Navigation Area */}
        <nav className="hidden sm:flex items-center justify-between gap-4 mb-12 border-b pb-5 border-slate-200/50 dark:border-neutral-800 bg-transparent relative z-20">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-sky-500/20 animate-pulse">
              MI
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-805">
                Mak<span className="text-sky-500">Invoice</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400 block -mt-1 tracking-wider uppercase">Advanced Ledger Hub</span>
            </div>
          </div>

          {/* Navigation Links (Features, FAQ, How to use) */}
          <div className="flex items-center gap-1 sm:gap-3">
            <button
              type="button"
              onClick={() => handleNavScroll('features-section')}
              className="text-slate-600 dark:text-slate-300 hover:text-sky-500 dark:hover:text-sky-400 font-extrabold text-xs tracking-wide cursor-pointer transition-all px-2.5 sm:px-3.5 py-2 rounded-xl hover:bg-slate-100/60 dark:hover:bg-neutral-900"
            >
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                Features
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleNavScroll('faq-section')}
              className="text-slate-600 dark:text-slate-300 hover:text-sky-500 dark:hover:text-sky-400 font-extrabold text-xs tracking-wide cursor-pointer transition-all px-2.5 sm:px-3.5 py-2 rounded-xl hover:bg-slate-100/60 dark:hover:bg-neutral-900"
            >
              <span className="flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" />
                FAQ
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleNavScroll('how-to-use-section')}
              className="text-slate-600 dark:text-slate-300 hover:text-sky-500 dark:hover:text-sky-400 font-extrabold text-xs tracking-wide cursor-pointer transition-all px-2.5 sm:px-3.5 py-2 rounded-xl hover:bg-slate-100/60 dark:hover:bg-neutral-900"
            >
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                How to Use
              </span>
            </button>
          </div>

          {/* Authentication Quick Action buttons (Sign In / Get Started) */}
          <div className="flex items-center gap-2.5">
            {/* Language Dropdown Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-2 text-slate-600 dark:text-slate-350 hover:text-sky-500 dark:hover:text-sky-400 font-extrabold text-xs tracking-wide cursor-pointer transition-all rounded-xl hover:bg-slate-100/60 dark:hover:bg-neutral-900 border border-slate-200/40 dark:border-neutral-800/60"
              >
                <Globe className="w-3.5 h-3.5 text-slate-400" />
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
              onClick={() => handleNavScroll('auth-section', 'login')}
              className="px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:text-sky-500 dark:hover:text-sky-400 font-extrabold text-xs tracking-normal cursor-pointer transition-all rounded-xl hover:bg-slate-100/70 dark:hover:bg-neutral-900"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleNavScroll('auth-section', 'signup')}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-extrabold text-xs tracking-normal rounded-xl shadow-lg shadow-sky-500/10 cursor-pointer transition-all"
            >
              Get Started
            </button>
            <span className="text-xs text-slate-400 font-bold hidden xl:flex items-center gap-1 border-l pl-3 border-slate-200 dark:border-neutral-800">
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`} />
              {isOnline ? 'Cloud active' : 'Offline'}
            </span>
          </div>

        </nav>

        {/* Mobile Navigation Area */}
        <nav className="flex sm:hidden flex-col gap-3.5 mb-12 border-b pb-5 border-slate-200/50 dark:border-neutral-800 bg-transparent relative z-20">
          
          {/* Mobile Top Row: Logo & Authentication Buttons */}
          <div className="flex items-center justify-between w-full">
            
            {/* Logo Brand */}
            <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-black text-base shadow-md shadow-sky-500/20 animate-pulse">
                MI
              </div>
              <div className="text-left">
                <span className="text-sm font-black tracking-tight text-slate-805 block">
                  Mak<span className="text-sky-500">Invoice</span>
                </span>
                <span className="text-[8px] font-bold text-slate-400 block -mt-1 tracking-wider uppercase">Ledger Hub</span>
              </div>
            </div>

            {/* Authentication Buttons */}
            <div className="flex items-center gap-1.5">
              {/* Mobile Language Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                  className="flex items-center justify-center p-2 text-slate-600 dark:text-slate-350 hover:text-sky-500 dark:hover:text-sky-400 cursor-pointer transition-all rounded-lg hover:bg-slate-100/60 dark:hover:bg-neutral-900 border border-slate-200/40 dark:border-neutral-800/60"
                  aria-label="Change Language"
                >
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[10px] uppercase font-black ml-1 font-mono text-slate-500 dark:text-slate-400">{selectedLanguage.code}</span>
                </button>

                {isLangDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsLangDropdownOpen(false)} />
                    <div className="absolute right-0 mt-2 w-44 rounded-xl bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800/80 p-1 shadow-lg z-50 animate-fade-in text-left">
                      <p className="text-[8px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase px-2 py-0.5 select-none">Select Language</p>
                      {availableLanguages.map((lang) => (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => handleSelectLanguage(lang)}
                          className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                            selectedLanguage.code === lang.code
                              ? 'bg-sky-500/10 text-sky-500'
                              : 'text-slate-600 dark:text-slate-250 hover:bg-slate-50 dark:hover:bg-neutral-800'
                          }`}
                        >
                          <span className="flex flex-col text-left">
                            <span className="font-extrabold">{lang.native}</span>
                            <span className="text-[8px] text-slate-400">{lang.label}</span>
                          </span>
                          {selectedLanguage.code === lang.code ? (
                            <Check className="w-3 h-3 text-sky-500" />
                          ) : lang.isPlaceholder ? (
                            <span className="text-[7px] bg-slate-100 dark:bg-neutral-850 px-1 py-0.5 rounded text-slate-400 dark:text-slate-500 font-extrabold uppercase scale-90">Soon</span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleNavScroll('auth-section', 'login')}
                className="px-2.5 py-1.5 text-slate-700 dark:text-slate-200 hover:text-sky-500 dark:hover:text-sky-400 font-extrabold text-xs tracking-normal cursor-pointer transition-all rounded-lg hover:bg-slate-100/70 dark:hover:bg-neutral-900"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => handleNavScroll('auth-section', 'signup')}
                className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-extrabold text-xs tracking-normal rounded-lg shadow-md shadow-sky-500/10 cursor-pointer transition-all"
              >
                Get Started
              </button>
            </div>

          </div>

          {/* Mobile Bottom Row: Centered links underneath */}
          <div className="flex items-center justify-center gap-1 w-full border-t border-slate-100/50 dark:border-neutral-900/40 pt-2.5">
            <button
              type="button"
              onClick={() => handleNavScroll('features-section')}
              className="text-slate-600 dark:text-slate-350 hover:text-sky-500 dark:hover:text-sky-400 font-extrabold text-[11px] tracking-wide cursor-pointer transition-all px-2.5 py-1.5 rounded-lg hover:bg-slate-100/60 dark:hover:bg-neutral-900"
            >
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3" />
                Features
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleNavScroll('faq-section')}
              className="text-slate-600 dark:text-slate-355 hover:text-sky-500 dark:hover:text-sky-400 font-extrabold text-[11px] tracking-wide cursor-pointer transition-all px-2.5 py-1.5 rounded-lg hover:bg-slate-100/60 dark:hover:bg-neutral-900"
            >
              <span className="flex items-center gap-1">
                <HelpCircle className="w-3 h-3" />
                FAQ
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleNavScroll('how-to-use-section')}
              className="text-slate-600 dark:text-slate-355 hover:text-sky-500 dark:hover:text-sky-400 font-extrabold text-[11px] tracking-wide cursor-pointer transition-all px-2.5 py-1.5 rounded-lg hover:bg-slate-100/60 dark:hover:bg-neutral-900"
            >
              <span className="flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                How to Use
              </span>
            </button>
          </div>

        </nav>

        {/* Hero Grid Section */}
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-16 items-center overflow-hidden">
          
          {/* Left: Headline & Key Details */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-500/10 dark:bg-sky-505/15 text-sky-600 dark:text-sky-400 rounded-full text-xs font-bold leading-none animate-fade-in">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Beautiful invoices created in seconds</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-slate-805">
              The Intelligent <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 via-sky-600 to-indigo-500">
                Billing & Estimate
              </span> <br />
              Platform.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-350 font-normal leading-relaxed max-w-2xl">
              Focus on doing what you love while MakInvoice automates your billing lifecycle.
              Generate high-performance estimates, automate repeating client invoice cycles, 
              drawn signatures, visual financial analytics, and download professional PDFs instantly.
            </p>

            {/* Feature Cards Grid (Compact & Informative) */}
            <div id="features-section" className="grid sm:grid-cols-2 gap-4 pt-6">
              <div className={`group p-4 rounded-2xl border transition-all duration-300 flex flex-col hover:-translate-y-1 hover:shadow-xl hover:shadow-sky-500/5 ${
                theme === 'dark' 
                  ? 'bg-neutral-900/60 border-neutral-800 hover:border-sky-500/30' 
                  : 'bg-white border-slate-100 hover:border-sky-500/20'
              }`}>
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-sky-500/15 transition-all duration-300">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-805 mb-1 group-hover:text-sky-505 transition-colors">Tailored Invoice Designer</h3>
                <p className="text-xs text-slate-500 dark:text-slate-405 leading-relaxed">
                  Select premium layout presets, customized typography styling, high-contrast borders, upload custom corporate logo graphics, and paint stunning brand styles.
                </p>
              </div>

              <div className={`group p-4 rounded-2xl border transition-all duration-300 flex flex-col hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/5 ${
                theme === 'dark' 
                  ? 'bg-neutral-900/60 border-neutral-800 hover:border-indigo-500/30' 
                  : 'bg-white border-slate-100 hover:border-indigo-500/20'
              }`}>
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-indigo-500/15 transition-all duration-300">
                  <Database className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-805 mb-1 group-hover:text-indigo-500 transition-colors">Compliance Tax Engine</h3>
                <p className="text-xs text-slate-500 dark:text-slate-405 leading-relaxed">
                  Support state GST codes map to automate splits. Calculate intra-state CGST & SGST or foreign/national IGST with direct discount caps.
                </p>
              </div>

              <div className={`group p-4 rounded-2xl border transition-all duration-300 flex flex-col hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/5 ${
                theme === 'dark' 
                  ? 'bg-neutral-900/60 border-neutral-800 hover:border-emerald-500/30' 
                  : 'bg-white border-slate-100 hover:border-emerald-500/20'
              }`}>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-emerald-500/15 transition-all duration-300">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-805 mb-1 group-hover:text-emerald-505 transition-colors">Interactive Revenue Sparklines</h3>
                <p className="text-xs text-slate-500 dark:text-slate-405 leading-relaxed">
                  Monitor outstanding invoices, total collections, log custom operating business expenses, and review margins inside real-time interactive analytical widgets.
                </p>
              </div>

              <div className={`group p-4 rounded-2xl border transition-all duration-300 flex flex-col hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/5 ${
                theme === 'dark' 
                  ? 'bg-neutral-900/60 border-neutral-800 hover:border-purple-500/30' 
                  : 'bg-white border-slate-100 hover:border-purple-500/20'
              }`}>
                <div className="w-8 h-8 rounded-xl bg-purple-505/10 text-purple-500 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-purple-500/15 transition-all duration-300">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-805 mb-1 group-hover:text-purple-505 transition-colors">Interactive Signature Sketching</h3>
                <p className="text-xs text-slate-500 dark:text-slate-405 leading-relaxed">
                  Draw high-resolution digital ink vector pen signatures in your client workspace or corporate profile to seal invoice PDF documents reliably.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Right: Premium Live-Rendered Mockup representing Sample Dashboard and Sample Invoice */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 flex flex-col items-center justify-start lg:mt-0 mt-8 relative"
          >
            {/* Live Interactive Control Panel */}
            <div className="w-full max-w-[390px] xl:max-w-[430px] mb-4 bg-white/75 dark:bg-neutral-900/80 backdrop-blur-md rounded-2xl p-3 border border-slate-200/60 dark:border-neutral-800/85 shadow-md relative z-30 transition-all text-xs">
              <div className="flex flex-col gap-2">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-1.5 mb-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-450 dark:text-neutral-500 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-sky-500 animate-pulse" />
                    Interactive Live Preview
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-sky-500/10 dark:bg-sky-505/15 text-sky-500 rounded-md font-mono font-bold animate-pulse">Try clicking options!</span>
                </div>

                <div className="grid grid-cols-3 gap-3.5 text-[10px]">
                  {/* Select Theme Accent */}
                  <div className="space-y-1">
                    <span className="block text-[8px] font-bold uppercase text-slate-400 dark:text-slate-500">Color Palette</span>
                    <div className="flex items-center gap-2 pt-0.5">
                      <button 
                        type="button"
                        onClick={() => setDemoAccent('sky')} 
                        className={`w-4 h-4 rounded-full bg-sky-500 border transition-all cursor-pointer ${demoAccent === 'sky' ? 'ring-2 ring-sky-400 scale-110 border-white' : 'border-transparent opacity-85 hover:opacity-100'}`}
                        title="Sky Blue"
                      />
                      <button 
                        type="button"
                        onClick={() => setDemoAccent('emerald')} 
                        className={`w-4 h-4 rounded-full bg-emerald-500 border transition-all cursor-pointer ${demoAccent === 'emerald' ? 'ring-2 ring-emerald-400 scale-110 border-white' : 'border-transparent opacity-85 hover:opacity-100'}`}
                        title="Emerald Green"
                      />
                      <button 
                        type="button"
                        onClick={() => setDemoAccent('indigo')} 
                        className={`w-4 h-4 rounded-full bg-indigo-500 border transition-all cursor-pointer ${demoAccent === 'indigo' ? 'ring-2 ring-indigo-400 scale-110 border-white' : 'border-transparent opacity-85 hover:opacity-100'}`}
                        title="Indigo Creative"
                      />
                      <button 
                        type="button"
                        onClick={() => setDemoAccent('rose')} 
                        className={`w-4 h-4 rounded-full bg-rose-500 border transition-all cursor-pointer ${demoAccent === 'rose' ? 'ring-2 ring-rose-300 scale-110 border-white' : 'border-transparent opacity-85 hover:opacity-100'}`}
                        title="Rose Premium"
                      />
                    </div>
                  </div>

                  {/* Select Layout Presets */}
                  <div className="space-y-1">
                    <span className="block text-[8px] font-bold uppercase text-slate-400 dark:text-slate-500">Invoice Layout</span>
                    <div className="flex gap-1 pt-0.5">
                      {(['modern', 'minimal', 'agency'] as const).map((l) => (
                        <button 
                          key={l}
                          type="button"
                          onClick={() => setDemoLayout(l)} 
                          className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase transition-all cursor-pointer ${
                            demoLayout === l 
                              ? 'bg-sky-600 text-white shadow-sm' 
                              : 'bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-slate-450 hover:bg-slate-200'
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Select Status */}
                  <div className="space-y-1">
                    <span className="block text-[8px] font-bold uppercase text-slate-400 dark:text-slate-505">Invoice Status</span>
                    <div className="flex gap-1 pt-0.5">
                      {(['PAID', 'PENDING', 'OVERDUE'] as const).map((s) => (
                        <button 
                          key={s}
                          type="button"
                          onClick={() => setDemoStatus(s)} 
                          className={`px-1 py-0.5 rounded text-[8px] font-extrabold uppercase transition-all cursor-pointer ${
                            demoStatus === s 
                              ? s === 'PAID' 
                                ? 'bg-emerald-500 text-white' 
                                : s === 'PENDING'
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-rose-500 text-white'
                              : 'bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-slate-450 hover:bg-slate-200'
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
            <div className="w-full max-w-full sm:max-w-[420px] h-[400px] sm:h-[480px] lg:h-[500px] relative overflow-hidden">
              
              {/* Background glowing visual accents */}
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-3xl pointer-events-none transition-colors duration-500 ${
                demoAccent === 'sky' ? 'bg-sky-505/10 dark:bg-sky-500/15' :
                demoAccent === 'emerald' ? 'bg-emerald-500/10 dark:bg-emerald-500/15' :
                demoAccent === 'indigo' ? 'bg-indigo-500/10 dark:bg-indigo-500/15' :
                'bg-rose-500/10 dark:bg-rose-500/15'
              }`} />
              
              {/* DASHBOARD PREVIEW PANEL (Base Underlay window) */}
              <div className="absolute left-0 sm:left-2 top-0 sm:top-2 w-[85%] max-w-[390px] rounded-3xl bg-[#090d16] border border-slate-800 shadow-2xl shadow-slate-950/40 overflow-hidden transform -rotate-3 hover:-rotate-1 transition-all duration-550 text-slate-100 p-4 z-10">
                
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
              <div className={`absolute right-0 sm:right-2 bottom-0 sm:bottom-2 w-[76%] sm:w-[72%] max-w-[270px] bg-white text-slate-800 rounded-2xl shadow-2xl shadow-slate-950/40 border p-3.5 transform rotate-3 hover:rotate-1 transition-all duration-550 z-20 flex flex-col font-sans border-slate-150 ${
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

          </motion.div>

        </div>

        {/* 1. How to Use Section */}
        <div id="how-to-use-section" className="mt-28 sm:mt-36 max-w-6xl mx-auto space-y-12 animate-fade-in relative z-10">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold leading-none uppercase tracking-widest">
              <BookOpen className="w-3.5 h-3.5 animate-bounce" />
              <span>Simple Workflow Walkthrough</span>
            </div>
            <h2 className="text-2xl sm:text-3.5xl font-black tracking-tight text-slate-805 leading-none">
              How to Use MakInvoice
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-405 max-w-xl mx-auto">
              Follow our lightweight 3-step dynamic billing lifecycle to build, customize, and secure your financial billing ledger.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            
            {/* Visual connector lines on desktop sizes */}
            <div className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-[2px] bg-slate-200/50 dark:bg-neutral-800 -translate-y-1/2 -z-10" />

            {/* Step 1 */}
            <div className={`p-6 sm:p-8 rounded-2xl border transition-all text-center relative ${
              theme === 'dark' 
                ? 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700' 
                : 'bg-white border-slate-100 hover:border-slate-250 shadow-sm'
            }`}>
              <div className="absolute top-[-16px] left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md border-4 border-slate-50 dark:border-neutral-950">
                1
              </div>
              
              <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto mb-4 mt-2 shadow-inner">
                <UserPlus className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-black text-slate-805 mb-2 block tracking-tight uppercase">Set up profile</h4>
              <p className="text-xs text-slate-500 dark:text-slate-405 leading-normal">
                Initialize a sandbox guest token or log in securely to define your default tax categories, state GST numbers, currencies, and bank details.
              </p>
            </div>

            {/* Step 2 */}
            <div className={`p-6 sm:p-8 rounded-2xl border transition-all text-center relative ${
              theme === 'dark' 
                ? 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700' 
                : 'bg-white border-slate-100 hover:border-slate-250 shadow-sm'
            }`}>
              <div className="absolute top-[-16px] left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md border-4 border-slate-50 dark:border-neutral-950">
                2
              </div>
              
              <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto mb-4 mt-2 shadow-inner">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-black text-slate-805 mb-2 block tracking-tight uppercase">Craft dynamically</h4>
              <p className="text-xs text-slate-500 dark:text-slate-405 leading-normal">
                Assemble items, adjust intra-state/inter-state IGST tax levels, set discount caps, write custom terms and conditions, and sign with our on-screen sketchpad.
              </p>
            </div>

            {/* Step 3 */}
            <div className={`p-6 sm:p-8 rounded-2xl border transition-all text-center relative ${
              theme === 'dark' 
                ? 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700' 
                : 'bg-white border-slate-100 hover:border-slate-250 shadow-sm'
            }`}>
              <div className="absolute top-[-16px] left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md border-4 border-slate-50 dark:border-neutral-950">
                3
              </div>
              
              <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto mb-4 mt-2 shadow-inner">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-black text-slate-805 mb-2 block tracking-tight uppercase">Print & export</h4>
              <p className="text-xs text-slate-500 dark:text-slate-405 leading-normal">
                Instantly trigger our browser native print configuration which uses precision media stylesheets to generate high-fidelity physical papers or PDF copies.
              </p>
            </div>

          </div>
        </div>

        {/* 2. Interactive Secure Portal Activation Section */}
        <div id="auth-section" className="mt-28 sm:mt-36 max-w-lg mx-auto relative z-10 animate-fade-in scroll-mt-24">
          
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-805 tracking-tight uppercase">
              Secure Ledger Access Panel
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-405">
              Launch live synchronization or generate local offline sandbox credentials instantly.
            </p>
          </div>

          <div className={`w-full p-5 sm:p-8 rounded-3xl border transition-all relative ${
            theme === 'dark' 
              ? 'bg-neutral-900/90 border-neutral-800 shadow-2xl shadow-sky-500/5' 
              : 'bg-white border-slate-150 shadow-xl'
          }`}>
            
            {/* Form Tab headers: Create Account / Sign In */}
            <div className="flex border-b border-slate-100 dark:border-neutral-800 pb-3 mb-6">
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setOtpSent(false); setSuccessMsg(''); }}
                className={`flex-1 pb-2.5 text-center text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  authMode === 'signup'
                    ? 'border-sky-500 text-sky-500'
                    : 'border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-250'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setOtpSent(false); setSuccessMsg(''); }}
                className={`flex-1 pb-2.5 text-center text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  authMode === 'login'
                    ? 'border-sky-500 text-sky-500'
                    : 'border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-250'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </div>
              </button>
            </div>

            {/* 3-Method Sign-In Selector (shown for both signup & login) */}
            <div className="mb-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
                Choose sign-in method
              </p>
              <div className="grid grid-cols-3 gap-2">
                {/* Method 1: Email */}
                <button
                  type="button"
                  onClick={() => { setLoginMethod('email'); setOtpSent(false); setSuccessMsg(''); }}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border-2 transition-all cursor-pointer ${
                    loginMethod === 'email'
                      ? 'border-sky-500 bg-sky-500/8 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400'
                      : 'border-slate-200 dark:border-neutral-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-900'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    loginMethod === 'email' ? 'bg-sky-500/15' : 'bg-slate-100 dark:bg-neutral-800'
                  }`}>
                    <Mail className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold leading-tight text-center">Email</span>
                </button>

                {/* Method 2: Phone OTP */}
                <button
                  type="button"
                  onClick={() => { setLoginMethod('phone_otp'); setOtpSent(false); setSuccessMsg(''); }}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border-2 transition-all cursor-pointer ${
                    loginMethod === 'phone_otp'
                      ? 'border-emerald-500 bg-emerald-500/8 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border-slate-200 dark:border-neutral-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-900'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    loginMethod === 'phone_otp' ? 'bg-emerald-500/15' : 'bg-slate-100 dark:bg-neutral-800'
                  }`}>
                    <Phone className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold leading-tight text-center">Phone OTP</span>
                </button>

                {/* Method 3: Google */}
                <button
                  type="button"
                  onClick={() => { setLoginMethod('google'); setOtpSent(false); setSuccessMsg(''); }}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border-2 transition-all cursor-pointer ${
                    loginMethod === 'google'
                      ? 'border-rose-400 bg-rose-500/8 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      : 'border-slate-200 dark:border-neutral-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-900'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    loginMethod === 'google' ? 'bg-rose-500/10' : 'bg-slate-100 dark:bg-neutral-800'
                  }`}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.09H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.91l2.85-2.22c-.1-.29-.19-.61-.25-.94z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.09l3.66 2.84c.87-2.6 3.3-4.55 6.16-4.55z" fill="#EA4335" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold leading-tight text-center">Google</span>
                </button>
              </div>
            </div>

            {/* Title & Description */}
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-805">
                {authMode === 'signup' ? 'Get started for free' : 'Welcome back to MakInvoice'}
              </h2>
              <p className="text-xs text-slate-450 dark:text-slate-400 mt-1">
                {loginMethod === 'google'
                  ? 'Authenticate securely with your Google account in one tap.'
                  : loginMethod === 'phone_otp'
                  ? 'Enter your phone number and we\'ll send a one-time passcode.'
                  : authMode === 'signup'
                  ? 'Fill out the form below to initialize your smart invoice dashboard.'
                  : 'Sign in to sync your custom documents and access cloud features.'}
              </p>
            </div>

            {/* Status Message */}
            {successMsg && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-505 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* GOOGLE METHOD - Direct button */}
            {loginMethod === 'google' && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={onGoogleLogin}
                  className="w-full py-3 px-4 rounded-xl border-2 border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-850 text-slate-700 dark:text-neutral-200 text-sm font-bold transition-all flex items-center justify-center gap-3 bg-transparent cursor-pointer hover:border-rose-300 dark:hover:border-rose-500/30"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.09H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.91l2.85-2.22c-.1-.29-.19-.61-.25-.94z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.09l3.66 2.84c.87-2.6 3.3-4.55 6.16-4.55z" fill="#EA4335" />
                  </svg>
                  <span>Continue with Google</span>
                </button>
                <p className="text-center text-[10px] text-slate-400 dark:text-slate-500">
                  Your Google account will be used to sync invoices securely to the cloud.
                </p>
              </div>
            )}

            {/* EMAIL METHOD */}
            {loginMethod === 'email' && (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                {authMode === 'signup' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-400 mb-1">Your Name *</label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g. John Doe"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 text-slate-805 dark:text-white text-xs font-medium focus:ring-1 focus:ring-sky-500 focus:outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-400 mb-1">Company Name *</label>
                        <input
                          type="text"
                          required
                          value={formData.companyName}
                          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                          placeholder="e.g. Acme Tech Solutions"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 text-slate-805 dark:text-white text-xs font-medium focus:ring-1 focus:ring-sky-500 focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-400 mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 text-slate-805 dark:text-white text-xs font-medium focus:ring-1 focus:ring-sky-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-400 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="sales@yourcompany.com"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 text-slate-805 dark:text-white text-xs font-medium focus:ring-1 focus:ring-sky-500 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-400 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 text-slate-805 dark:text-white text-xs font-medium focus:ring-1 focus:ring-sky-500 focus:outline-none transition-all"
                  />
                  {formData.password && (
                    <div className="mt-2 space-y-1.5 animate-fade-in">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Password Strength:</span>
                        <span className={`font-black uppercase tracking-wider ${
                          strength.score <= 1 ? 'text-rose-500' :
                          strength.score === 2 ? 'text-amber-500' :
                          strength.score === 3 ? 'text-sky-500' : 'text-emerald-500'
                        }`}>{strength.label}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 h-1">
                        <div className={`rounded-full h-full transition-all duration-300 ${strength.score >= 1 ? strength.color : 'bg-slate-200 dark:bg-neutral-800'}`} />
                        <div className={`rounded-full h-full transition-all duration-300 ${strength.score >= 2 ? strength.color : 'bg-slate-200 dark:bg-neutral-800'}`} />
                        <div className={`rounded-full h-full transition-all duration-300 ${strength.score >= 3 ? strength.color : 'bg-slate-200 dark:bg-neutral-800'}`} />
                        <div className={`rounded-full h-full transition-all duration-300 ${strength.score >= 4 ? strength.color : 'bg-slate-200 dark:bg-neutral-800'}`} />
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 disabled:bg-neutral-800 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-600/15 cursor-pointer mt-2"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Mail className="w-3.5 h-3.5" />
                      <span>{authMode === 'signup' ? 'Create Account with Email' : 'Sign In with Email'}</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* PHONE OTP METHOD */}
            {loginMethod === 'phone_otp' && (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                {authMode === 'signup' && !otpSent && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-400 mb-1">Your Name *</label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g. John Doe"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 text-slate-805 dark:text-white text-xs font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-400 mb-1">Company Name *</label>
                        <input
                          type="text"
                          required
                          value={formData.companyName}
                          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                          placeholder="e.g. Acme Tech Solutions"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 text-slate-805 dark:text-white text-xs font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-400 mb-1">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={otpSent}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 text-slate-805 dark:text-white text-xs font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all disabled:opacity-60"
                    />
                    {otpSent && (
                      <button
                        type="button"
                        onClick={() => { setOtpSent(false); setOtpValue(''); setSuccessMsg(''); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-sky-500 font-bold flex items-center gap-1 hover:text-sky-400 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Change
                      </button>
                    )}
                  </div>
                </div>

                {otpSent && (
                  <div className="animate-fade-in">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-400 mb-1">
                      Enter OTP *
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otpValue}
                        onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                        placeholder="• • • • • •"
                        className="flex-1 px-4 py-3 rounded-xl border-2 border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-slate-805 dark:text-white text-base font-mono font-black tracking-[0.4em] focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all text-center placeholder:tracking-[0.2em] placeholder:text-slate-300"
                        autoFocus
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 flex items-center gap-1">
                      <KeyRound className="w-3 h-3" />
                      <span>OTP sent via SMS. For demo, use <span className="font-black text-emerald-500">1234</span></span>
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/15 cursor-pointer mt-2"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Phone className="w-3.5 h-3.5" />
                      <span>{otpSent ? 'Verify OTP & Sign In' : (authMode === 'signup' ? 'Send OTP to Sign Up' : 'Send OTP to Sign In')}</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Guest sandbox shortcut */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-neutral-800 text-center">
              <button
                type="button"
                onClick={() => onCustomSignup('Guest User', 'Acme Design Studio', 'guest@makinvoice.local', '+1 (555) 019-2834')}
                className="text-slate-400 hover:text-sky-500 text-xs font-extrabold hover:underline transition-all cursor-pointer"
              >
                Try instantly as Guest (Local Offline Mode)
              </button>
            </div>

          </div>
        </div>

        {/* Premium Accordion-Style Help & FAQ Section */}
        <div id="faq-section" className="mt-24 sm:mt-32 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300 scroll-mt-24">
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-805 uppercase tracking-wide">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-405 max-w-lg mx-auto">
              Got questions about billing, offline-mode security, or customization? Find quick answers below.
            </p>
          </div>

          <div className="space-y-4">
            {faqItems.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div 
                  key={index} 
                  className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                    isOpen 
                      ? theme === 'dark' 
                        ? 'bg-neutral-900/90 border-sky-500/50 shadow-md shadow-sky-500/5' 
                        : 'bg-white border-sky-500/40 shadow-sm ring-1 ring-sky-100/30'
                      : theme === 'dark'
                        ? 'bg-neutral-900/40 border-neutral-800/80 hover:border-neutral-750'
                        : 'bg-white border-slate-150 hover:border-slate-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left cursor-pointer focus:outline-none select-none transition-colors"
                  >
                    <span className="text-xs sm:text-sm font-bold text-slate-805 pr-4 leading-snug">
                      {faq.question}
                    </span>
                    <span className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all bg-slate-100/30 dark:bg-neutral-850 shrink-0 ${
                      isOpen ? 'rotate-180 text-sky-500' : 'text-slate-400 dark:text-slate-500'
                    }`}>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </span>
                  </button>

                  <div className={`transition-all duration-300 ease-in-out ${
                    isOpen ? 'max-h-52 opacity-100 border-t border-slate-100 dark:border-neutral-800' : 'max-h-0 opacity-0 pointer-events-none'
                  } overflow-hidden`}>
                    <p className="px-5 py-3.5 text-[10.5px] sm:text-xs text-slate-500 dark:text-slate-405 leading-relaxed bg-slate-50/20 dark:bg-neutral-950/20">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info branding */}
        <footer className="mt-20 text-center text-xs text-slate-400 border-t border-slate-100 dark:border-neutral-800 pt-6">
          <p>© {new Date().getFullYear()} MakInvoice Corp. Local state automatically cached for safety. Encryption standards enabled.</p>
        </footer>

        {/* Floating multilingual info badge */}
        {langNotice && (
          <div className={`fixed ${showScrollTop ? 'bottom-22' : 'bottom-6'} right-6 max-w-sm bg-slate-900/95 dark:bg-black/90 text-white p-3.5 rounded-2xl shadow-xl border border-slate-750 dark:border-neutral-800 z-55 animate-fade-in flex items-start gap-2.5 text-left transition-all duration-300`}>
            <div className="p-1 rounded-xl bg-sky-500/20 text-sky-400">
              <Globe className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-black text-white">Multilingual Blueprint</h4>
              <p className="text-[10px] text-slate-350 font-medium leading-relaxed mt-0.5">{langNotice}</p>
            </div>
          </div>
        )}

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
