import React, { useState, useEffect } from 'react';
import PublicNavbar from './PublicNavbar';
import { 
  Globe, 
  ChevronDown, 
  Check, 
  Menu, 
  X, 
  ArrowUp,
  Layers,
  BookOpen,
  CreditCard,
  HelpCircle,
  Mail,
  Phone,
  ArrowRight
} from 'lucide-react';

interface ContactPageProps {
  theme: 'light' | 'dark';
  onNavigate: (path: string) => void;
  onGoogleLogin: () => void;
}

export default function ContactPage({ theme, onNavigate, onGoogleLogin }: ContactPageProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState({ code: 'en', label: 'English', native: 'English' });
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 200) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={`min-h-dvh w-full max-w-full overflow-x-hidden text-sans transition-colors duration-250 ${
      theme === 'dark' ? 'bg-neutral-950 text-neutral-100' : 'bg-slate-50 text-slate-800'
    }`}>
      {/* Decorative ambient top glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl pointer-events-none overflow-hidden" />

      <PublicNavbar theme={theme} onNavigate={onNavigate} activePath="/contact" />

      {/* Main Container */}
      <div className="max-w-[1400px] mx-auto px-2 sm:px-3 lg:px-4 pt-20 pb-4 lg:pt-24 relative">
        

        {/* Contact Content */}
        <div className="py-10 max-w-lg md:max-w-5xl lg:max-w-6xl mx-auto relative z-10 animate-fade-in">
          <div className="text-center space-y-2 mb-8">
            <h1 className="text-3xl sm:text-4.5xl font-black text-slate-805 tracking-tight uppercase">
              Get in Touch
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-405 max-w-xl mx-auto">
              Have questions about integrations, security configurations, or billing plans? Contact our support desk 24/7.
            </p>
          </div>

          <div className={`w-full rounded-3xl border transition-all relative overflow-hidden ${
            theme === 'dark' ? 'bg-neutral-900/90 border-neutral-800 shadow-2xl shadow-sky-500/5' : 'bg-white border-slate-150 shadow-xl'
          }`}>
            <div className="grid grid-cols-1 md:grid-cols-12">
              
              {/* Left Column: Direct Support Channels */}
              <div className="p-5 sm:p-8 md:col-span-5 bg-slate-55/50 dark:bg-neutral-950/20 border-b md:border-b-0 md:border-r border-slate-150 dark:border-neutral-800 flex flex-col justify-between">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-805 mb-2">Direct Channels</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-405">Reach out to us directly via email or phone for urgent issues.</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-550 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-505 uppercase tracking-wider">Email Address</span>
                        <a href="mailto:support@makinvoices.com" className="text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-sky-505 transition-colors">support@makinvoices.com</a>
                      </div>
                    </div>

                    <div className="flex items-center gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-505 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-505 uppercase tracking-wider">Phone Support</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">+1 (800) 555-MAKI</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-505 flex items-center justify-center shrink-0">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Support Hours</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">24/7 Global Response Desk</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-sky-500/5 dark:bg-sky-500/10 border border-sky-505/10 rounded-2xl mt-8">
                  <p className="text-[10px] font-black text-sky-600 dark:text-sky-400 uppercase tracking-widest mb-1">Response Guarantee</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">Our system automatically routes ledger queries. We usually respond to support tickets within 2 hours.</p>
                </div>
              </div>

              {/* Right Column: Contact Message Form */}
              <div className="p-5 sm:p-8 md:col-span-7 flex flex-col justify-center">
                {contactSubmitted ? (
                  <div className="text-center py-8 space-y-3 animate-fade-in">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                      <Check className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-850">Message Sent Successfully!</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">Thank you for reaching out. Our support team will get in touch with you shortly.</p>
                    <button 
                      type="button" 
                      onClick={() => setContactSubmitted(false)}
                      className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all"
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setContactLoading(true);
                      await new Promise(r => setTimeout(r, 1000));
                      setContactLoading(false);
                      setContactSubmitted(true);
                      setContactForm({ name: '', email: '', message: '' });
                    }} 
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-455 mb-1">Your Name *</label>
                      <input 
                        type="text" 
                        required 
                        value={contactForm.name} 
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        placeholder="e.g. John Doe"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-955 text-slate-805 dark:text-white text-xs font-medium focus:ring-1 focus:ring-sky-500 focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-455 mb-1">Email Address *</label>
                      <input 
                        type="email" 
                        required 
                        value={contactForm.email} 
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        placeholder="you@company.com"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-955 text-slate-805 dark:text-white text-xs font-medium focus:ring-1 focus:ring-sky-500 focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-455 mb-1">Message *</label>
                      <textarea 
                        required 
                        rows={4} 
                        value={contactForm.message} 
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        placeholder="Tell us how we can help you..."
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-955 text-slate-805 dark:text-white text-xs font-medium focus:ring-1 focus:ring-sky-500 focus:outline-none transition-all resize-none"
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={contactLoading}
                      className="w-full py-3 bg-sky-600 hover:bg-sky-500 disabled:bg-neutral-800 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-600/15 cursor-pointer"
                    >
                      {contactLoading ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Mail className="w-3.5 h-3.5" />
                          <span>Send Support Message</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* Footer info branding */}
        <footer className="mt-12 text-center text-xs text-slate-400 border-t border-slate-100 dark:border-neutral-800 pt-6">
          <p>© {new Date().getFullYear()} MakInvoices Corp. Local state automatically cached for safety. Encryption standards enabled.</p>
        </footer>

        {/* Scroll To Top Button */}
        {showScrollTop && (
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 p-3.5 bg-sky-600 hover:bg-sky-505 text-white rounded-full shadow-lg transition-all duration-300 z-50 cursor-pointer flex items-center justify-center"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
