import React, { useState } from 'react';
import { Layers, BookOpen, CreditCard, HelpCircle, Mail, Menu, X, Globe, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PublicNavbarProps {
  theme: 'light' | 'dark';
  onNavigate: (path: string) => void;
  activePath: string;
}

export default function PublicNavbar({ theme, onNavigate, activePath }: PublicNavbarProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  
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
      setLangNotice(lang.native + " (" + lang.label + ") translation is currently a placeholder and will be enabled in our next release!");
      setTimeout(() => setLangNotice(null), 3000);
    } else {
      setSelectedLanguage(lang);
    }
    setIsLangDropdownOpen(false);
  };

  const navItems = [
    { name: 'Features', icon: Layers, path: '/#features-section' },
    { name: 'Guide', icon: BookOpen, path: '/guide' },
    { name: 'Pricing', icon: CreditCard, path: '/pricing' },
    { name: 'FAQ', icon: HelpCircle, path: '/#faq-section' },
    { name: 'Contact', icon: Mail, path: '/contact' },
  ];

  return (
    <>
      {langNotice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-full shadow-2xl animate-in fade-in slide-in-from-top-4">
          {langNotice}
        </div>
      )}
      {/* Embedded Navigation Bar (Desktop) */}
      <nav className="fixed top-0 left-0 right-0 z-50 hidden sm:flex border-b border-slate-200/40 dark:border-neutral-800/35 bg-white/70 dark:bg-neutral-955/75 backdrop-blur-md transition-all duration-300 w-full">
        <div className="max-w-[1550px] mx-auto px-2 sm:px-4 lg:px-6 py-4 flex items-center justify-between gap-4 w-full">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => onNavigate('/')}>
            <img src="/logo.svg" alt="MakInvoices Logo" className="w-10 h-10 object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-300 shrink-0" />
            <div>
              <span className="text-base font-black tracking-tight text-slate-805 dark:text-white block leading-none">
                Mak<span className="text-sky-500">Invoices</span>
              </span>
              <span className="text-[9px] font-bold text-slate-400 dark:text-neutral-500 block tracking-wider uppercase mt-1">Advanced Ledger Hub</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-1 sm:gap-2">
            {navItems.map((item) => {
              const isActive = activePath === item.path || (item.path.startsWith('/#') && activePath === item.path);
              const activeClass = "text-sky-600 dark:text-sky-400 font-black text-xs tracking-wide bg-sky-500/10";
              const inactiveClass = "text-slate-600 dark:text-slate-300 hover:text-sky-500 dark:hover:text-sky-400 font-extrabold text-xs tracking-wide hover:bg-slate-100/50 dark:hover:bg-neutral-900";
              
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => onNavigate(item.path)}
                  className={"flex items-center gap-1.5 px-3 py-2 rounded-xl cursor-pointer transition-all " + (isActive ? activeClass : inactiveClass)}
                >
                  <item.icon className={"w-3.5 h-3.5 " + (isActive ? 'text-sky-500' : 'text-slate-400')} />
                  {item.name}
                </button>
              );
            })}
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
                <ChevronDown className={"w-3 h-3 transition-transform duration-200 " + (isLangDropdownOpen ? 'rotate-180' : '')} />
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
                        className={"w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer " + (selectedLanguage.code === lang.code ? 'bg-sky-500/10 text-sky-500' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-neutral-800/70')}
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
              className="px-3.5 py-2 text-slate-700 dark:text-slate-205 hover:text-sky-505 dark:hover:text-sky-400 font-extrabold text-xs transition-all duration-300 rounded-xl hover:bg-slate-100/50 dark:hover:bg-neutral-900"
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => window.location.href = '/signup'}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all"
            >
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* Embedded Navigation Bar (Mobile) */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex sm:hidden border-b border-slate-200/40 dark:border-neutral-800/35 bg-white/75 dark:bg-neutral-950/85 backdrop-blur-md transition-all duration-300 w-full">
        <div className="max-w-[1550px] mx-auto px-4 py-3 flex items-center justify-between w-full">
          {/* Logo Brand */}
          <div className="flex items-center gap-1.5 cursor-pointer select-none" onClick={() => onNavigate('/')}>
            <img src="/logo.svg" alt="MakInvoices Logo" className="w-8 h-8 object-contain drop-shadow-sm shrink-0" />
            <span className="text-sm font-black tracking-tight text-slate-805 dark:text-white">
              Mak<span className="text-sky-500">Invoices</span>
            </span>
          </div>

          {/* Hamburger Menu Button */}
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            className="p-2 text-slate-600 dark:text-slate-350 hover:text-sky-505 dark:hover:text-sky-400 cursor-pointer rounded-xl hover:bg-slate-100/50 dark:hover:bg-neutral-900 border border-slate-250/20 dark:border-neutral-800/60"
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
                      {navItems.map((item) => {
                        const isActive = activePath === item.path || (item.path.startsWith('/#') && activePath === item.path);
                        const isFeatures = item.name === 'Features';
                        const isGuide = item.name === 'Guide';
                        const isPricing = item.name === 'Pricing';
                        const isFAQ = item.name === 'FAQ';
                        const isContact = item.name === 'Contact';
                        
                        let bgClass = "bg-sky-100 dark:bg-sky-500/20";
                        let textClass = "text-sky-600 dark:text-sky-400";
                        
                        if (isGuide) { bgClass = "bg-indigo-100 dark:bg-indigo-500/20"; textClass = "text-indigo-600 dark:text-indigo-400"; }
                        if (isPricing) { bgClass = "bg-emerald-100 dark:bg-emerald-500/20"; textClass = "text-emerald-600 dark:text-emerald-400"; }
                        if (isFAQ) { bgClass = "bg-amber-100 dark:bg-amber-500/20"; textClass = "text-amber-600 dark:text-amber-400"; }
                        if (isContact) { bgClass = "bg-rose-100 dark:bg-rose-500/20"; textClass = "text-rose-600 dark:text-rose-400"; }

                        return (
                          <button
                            key={item.name}
                            type="button"
                            onClick={() => { onNavigate(item.path); setIsMobileNavOpen(false); }}
                            className={`flex items-center gap-3 p-3.5 rounded-xl transition-all text-left w-full cursor-pointer group ${isActive ? 'bg-slate-100 dark:bg-white/10 border-slate-300 dark:border-white/20 shadow-sm' : 'bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border-slate-200/60 dark:border-white/5'} border`}
                          >
                            <div className={`w-8 h-8 rounded-lg ${bgClass} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                              <item.icon className={`w-4 h-4 ${textClass}`} />
                            </div>
                            <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{item.name}</span>
                          </button>
                        );
                      })}
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
    </>
  );
}
