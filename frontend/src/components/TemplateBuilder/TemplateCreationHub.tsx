import React, { useState } from 'react';
import { InvoiceTemplate, BusinessProfile } from '../../types';
import { Layout, Zap, Settings, ArrowLeft } from 'lucide-react';
import AdvancedStudio from './AdvancedStudio';
import QuickBuilder from './QuickBuilder';

interface TemplateCreationHubProps {
  initialTemplate?: InvoiceTemplate | null;
  businessProfile?: BusinessProfile;
  onSave: (template: InvoiceTemplate) => void;
  onCancel: () => void;
}

export default function TemplateCreationHub({ initialTemplate, businessProfile, onSave, onCancel }: TemplateCreationHubProps) {
  const [mode, setMode] = useState<'selection' | 'quick' | 'advanced'>(initialTemplate ? 'advanced' : 'selection');

  if (mode === 'advanced') {
    return <AdvancedStudio initialTemplate={initialTemplate} businessProfile={businessProfile} onSave={onSave} onCancel={onCancel} />;
  }

  if (mode === 'quick') {
    return <QuickBuilder 
      onSave={onSave} 
      onCancel={onCancel} 
      switchToAdvanced={(temp) => {
        setMode('advanced');
      }} 
    />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] h-auto max-w-4xl mx-auto py-8 px-6 animate-in fade-in duration-200">
      
      {/* Back button */}
      <div className="w-full flex items-center mb-10">
        <button 
          onClick={onCancel} 
          className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[#64748b] hover:text-[#0f172a] dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#64748b]" />
          <span>Back to Library</span>
        </button>
      </div>

      {/* Header Info */}
      <div className="text-center mb-12">
        <h1 className="text-2xl font-black uppercase tracking-tight flex items-center justify-center gap-2 mb-3">
          <span className="bg-gradient-to-r from-amber-600 via-[#64748b] to-rose-500 bg-clip-text text-transparent dark:from-amber-400 dark:via-white dark:to-rose-400">Choose Builder Mode</span>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
        </h1>
        <p className="text-[11.5px] text-[#64748b]/80 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
          Create standard invoices using our step-by-step Quick Setup wizard or style every detail inside the Advanced Studio.
        </p>
      </div>

      {/* Selection Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        
        {/* Quick Builder */}
        <div 
          onClick={() => setMode('quick')}
          className="group relative bg-[#FCFAF7]/20 dark:bg-zinc-900 border-2 border-amber-200/50 hover:border-amber-400 dark:border-zinc-800 dark:hover:border-amber-900/60 rounded-3xl p-8 hover:shadow-lg transition-all cursor-pointer overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-rose-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-105" />
          
          <div>
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-2xl flex items-center justify-center mb-6 border border-amber-200/50 dark:border-amber-900/30 shadow-xs">
              <Zap className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-sm font-black text-[#0f172a] dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>Quick Guided Builder</span>
              <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 rounded text-[9px] font-black uppercase tracking-wider">Fast</span>
            </h3>
            <p className="text-[#64748b]/80 dark:text-zinc-400 text-[11px] leading-relaxed mb-6">
              Perfect for most invoicing needs. Follow a guided 7-step wizard to setup structural layouts, GST defaults, and custom fields in under 2 minutes.
            </p>
          </div>

          <div className="flex items-center text-amber-600 dark:text-amber-400 font-black text-[10px] uppercase tracking-wider group-hover:translate-x-1 transition-transform">
            Start Wizard &rarr;
          </div>
        </div>

        {/* Advanced Studio */}
        <div 
          onClick={() => setMode('advanced')}
          className="group relative bg-[#FCFAF7]/20 dark:bg-zinc-900 border-2 border-sky-200/50 hover:border-sky-400 dark:border-zinc-800 dark:hover:border-sky-900/60 rounded-3xl p-8 hover:shadow-lg transition-all cursor-pointer overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sky-500/10 to-indigo-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-105" />
          
          <div>
            <div className="w-12 h-12 bg-sky-50 dark:bg-sky-950/20 text-sky-500 rounded-2xl flex items-center justify-center mb-6 border border-sky-200/50 dark:border-sky-900/30 shadow-xs">
              <Settings className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-black text-[#0f172a] dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>Advanced Studio Editor</span>
              <span className="px-1.5 py-0.5 bg-sky-100 dark:bg-sky-950/30 text-sky-850 dark:text-sky-400 rounded text-[9px] font-black uppercase tracking-wider">Pro</span>
            </h3>
            <p className="text-[#64748b]/80 dark:text-zinc-400 text-[11px] leading-relaxed mb-6">
              For complete layout and style customizer controls. Tweak section visibility, borders, sizing, font hierarchies, and drag-and-drop structural elements.
            </p>
          </div>

          <div className="flex items-center text-sky-600 dark:text-sky-400 font-black text-[10px] uppercase tracking-wider group-hover:translate-x-1 transition-transform">
            Open Advanced Editor &rarr;
          </div>
        </div>

      </div>
    </div>
  );
}
