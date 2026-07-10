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
  UserPlus,
  FileText,
  Sparkles
} from 'lucide-react';

interface GuidePageProps {
  theme: 'light' | 'dark';
  onNavigate: (path: string) => void;
  onGoogleLogin: () => void;
}

export default function GuidePage({ theme, onNavigate, onGoogleLogin }: GuidePageProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState({ code: 'en', label: 'English', native: 'English' });
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

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
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none overflow-hidden" />

      <PublicNavbar theme={theme} onNavigate={onNavigate} activePath="/guide" />

      {/* Main Container */}
      <div className="max-w-[1400px] mx-auto px-2 sm:px-3 lg:px-4 pt-20 pb-4 lg:pt-24 relative">
        
        {/* Guide Content */}
        <div className="py-10 max-w-4xl mx-auto space-y-12 animate-fade-in relative z-10">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-650 dark:text-indigo-400 rounded-full text-xs font-bold leading-none uppercase tracking-widest">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Comprehensive User Walkthrough</span>
            </div>
            <h1 className="text-3xl sm:text-4.5xl font-black tracking-tight text-slate-805 leading-none uppercase">
              How to Master MakInvoices
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-405 max-w-2xl mx-auto">
              Follow our lightweight 3-step billing lifecycle to generate tax-compliant invoices, draw signatures, customize designs, and download high-fidelity PDFs.
            </p>
          </div>

          <div className="space-y-12 pt-6">
            
            {/* Step 1 */}
            <div className={`p-6 sm:p-8 rounded-3xl border transition-all flex flex-col md:flex-row gap-6 items-start ${
              theme === 'dark' ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white border-slate-150 shadow-sm'
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-550 flex items-center justify-center shrink-0 shadow-inner">
                <UserPlus className="w-6 h-6" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-0.5 bg-sky-500/15 text-sky-550 dark:text-sky-400 rounded-lg text-[10px] font-black uppercase">Step 01</span>
                  <h3 className="text-lg font-black text-slate-805">Initialize Your Business Profile</h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Start by clicking the sign-up button or initiating a sandbox guest session. Once inside, navigate to your Business Profile modal to record your company name, GSTIN/tax identification numbers, phone, currency preference, and billing address.
                </p>
                <div className="bg-slate-50/50 dark:bg-neutral-950/40 p-3.5 rounded-2xl border border-slate-100 dark:border-neutral-900 text-[11px] text-slate-450 dark:text-slate-400 space-y-1.5">
                  <p className="font-extrabold text-slate-650 dark:text-slate-300">💡 Pro Tips:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Select standard Indian state/UT codes to enable CGST/SGST automatic bifurcation.</li>
                    <li>Toggle currencies such as USD ($), INR (₹), or EUR (€) to instantly format all ledger documents.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className={`p-6 sm:p-8 rounded-3xl border transition-all flex flex-col md:flex-row gap-6 items-start ${
              theme === 'dark' ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white border-slate-150 shadow-sm'
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 shadow-inner">
                <Layers className="w-6 h-6" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-0.5 bg-indigo-500/15 text-indigo-505 dark:text-indigo-405 rounded-lg text-[10px] font-black uppercase">Step 02</span>
                  <h3 className="text-lg font-black text-slate-805">Draft, Sketch & Customize Layouts</h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Hit the "Add New Invoice" button to start designing your document. Select from modern, agency, or minimal layouts, pick professional font pairings, and use the interactive signature sketchpad to sign with your cursor, stylus, or touch screen.
                </p>
                <div className="bg-slate-50/50 dark:bg-neutral-950/40 p-3.5 rounded-2xl border border-slate-100 dark:border-neutral-900 text-[11px] text-slate-450 dark:text-slate-400 space-y-1.5">
                  <p className="font-extrabold text-slate-650 dark:text-slate-300">💡 Pro Tips:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Upload your high-resolution brand logo (JPG/PNG) to insert it directly in the top header.</li>
                    <li>Add preset inventory items to speed up your registry bookkeeping.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className={`p-6 sm:p-8 rounded-3xl border transition-all flex flex-col md:flex-row gap-6 items-start ${
              theme === 'dark' ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white border-slate-150 shadow-sm'
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 shadow-inner">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase">Step 03</span>
                  <h3 className="text-lg font-black text-slate-805">Generate High-Fidelity PDF & Print</h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Export your invoice directly by clicking the print or download icon. MakInvoices uses specialized CSS media stylesheets to remove the dashboard sidebars, customization toggles, and edit fields, generating a perfectly formatted physical document or PDF.
                </p>
                <div className="bg-slate-50/50 dark:bg-neutral-950/40 p-3.5 rounded-2xl border border-slate-100 dark:border-neutral-900 text-[11px] text-slate-450 dark:text-slate-400 space-y-1.5">
                  <p className="font-extrabold text-slate-650 dark:text-slate-300">💡 Pro Tips:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Set margins or select "Save to PDF" in the browser print popup to customize your output formatting.</li>
                    <li>Sync your data to the cloud automatically by signing up to prevent local cache clear loss.</li>
                  </ul>
                </div>
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
            className="fixed bottom-6 right-6 p-3.5 bg-sky-600 hover:bg-sky-500 text-white rounded-full shadow-lg transition-all duration-300 z-50 cursor-pointer flex items-center justify-center"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
