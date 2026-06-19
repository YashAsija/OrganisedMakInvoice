const fs = require('fs');

let content = fs.readFileSync('src/components/BusinessProfileModal.tsx', 'utf8');

// 1. Add ArrowLeft import
content = content.replace(
  /import \{ X, Check, Trash2, Upload, CreditCard, ShieldCheck, Sparkles, Building2, Landmark, Sliders, Award, FileSpreadsheet, KeyRound \} from 'lucide-react';/,
  "import { X, Check, Trash2, Upload, CreditCard, ShieldCheck, Sparkles, Building2, Landmark, Sliders, Award, FileSpreadsheet, KeyRound, ArrowLeft } from 'lucide-react';"
);

// 2. Add Back button to header
const headerTarget = `        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600/50 text-white flex items-center justify-center shadow-md">`;

const headerReplacement = `        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            {activeTab !== 'company' && (
              <button 
                type="button"
                onClick={() => {
                  if (activeTab === 'subscription') setActiveTab('billing');
                  else if (activeTab === 'billing') setActiveTab('banking');
                  else if (activeTab === 'banking') setActiveTab('company');
                }}
                className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-700 hover:text-slate-805 dark:hover:text-white transition-all cursor-pointer hover:bg-slate-100"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600/50 text-white flex items-center justify-center shadow-md">`;

content = content.replace(headerTarget, headerReplacement);

// 3. Remove bottom text back buttons
const oldBackBtns = `              </button>
            )}
            
            {activeTab === 'banking' && (
              <button
                type="button"
                onClick={() => setActiveTab('company')}
                className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-805 dark:hover:text-white transition-all cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 mr-auto"
              >
                Back
              </button>
            )}
            
            {activeTab === 'billing' && (
              <button
                type="button"
                onClick={() => setActiveTab('banking')}
                className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-805 dark:hover:text-white transition-all cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 mr-auto"
              >
                Back
              </button>
            )}
            
            {activeTab === 'subscription' && (
              <button
                type="button"
                onClick={() => setActiveTab('billing')}
                className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-805 dark:hover:text-white transition-all cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 mr-auto"
              >
                Back
              </button>
            )}
            
            {isOnboarding && activeTab === 'company' && (`

const newBtnsReplacement = `              </button>
            )}
            
            {isOnboarding && activeTab === 'company' && (`

content = content.replace(oldBackBtns, newBtnsReplacement);

fs.writeFileSync('src/components/BusinessProfileModal.tsx', content);
console.log('Update successful');
