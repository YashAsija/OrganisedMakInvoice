import React, { useState, useEffect } from 'react';
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
  const [mode, setMode] = useState<'selection' | 'quick' | 'advanced'>(() => {
    if (initialTemplate) return 'advanced';
    if (typeof window !== 'undefined') {
      if (window.location.pathname === '/invoice-templates/quick-builder') {
        return 'quick';
      }
      if (window.location.pathname === '/invoice-templates/advanced-builder') {
        return 'advanced';
      }
    }
    return 'selection';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let expectedPath = '/invoice-templates';
      if (mode === 'quick') {
        expectedPath = '/invoice-templates/quick-builder';
      } else if (mode === 'advanced') {
        expectedPath = '/invoice-templates/advanced-builder';
      }
      if (window.location.pathname !== expectedPath) {
        window.history.pushState(null, '', expectedPath);
      }
    }
  }, [mode]);

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
    <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-120px)] h-auto max-w-4xl mx-auto py-6 sm:py-8 px-4 sm:px-6 animate-in fade-in duration-200">
      
      {/* Back button */}
      <div className="w-full flex items-center mb-6 sm:mb-10">
        <button 
          onClick={onCancel} 
          className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[#64748b] hover:text-[#0284c7] dark:text-zinc-400 dark:hover:text-[#38bdf8] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#64748b]" />
          <span>Back to Library</span>
        </button>
      </div>

      {/* Header Info */}
      <div className="text-center mb-8 sm:mb-12">
        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight flex items-center justify-center gap-2 mb-2 sm:mb-3" style={{ fontFamily: "'Fraunces', serif" }}>
          <span className="bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#38bdf8] bg-clip-text text-transparent">Choose Builder Mode</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7] dark:bg-[#38bdf8] shrink-0" />
        </h1>
        <p className="text-[11px] sm:text-[11.5px] text-[#64748b]/80 dark:text-zinc-400 max-w-md mx-auto leading-relaxed px-2">
          Create standard invoices using our step-by-step Quick Setup wizard or style every detail inside the Advanced Studio.
        </p>
      </div>

      {/* Selection Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full">
        
        {/* Quick Builder */}
        <div 
          onClick={() => setMode('quick')}
          className="group relative bg-white dark:bg-[#111a36] border-2 border-[#bae6fd]/60 hover:border-[#0284c7] dark:border-[#223269]/60 dark:hover:border-[#38bdf8] rounded-3xl p-5 sm:p-8 hover:shadow-[0_8px_30px_rgba(2,132,199,0.08)] transition-all cursor-pointer overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#0284c7]/10 to-[#38bdf8]/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-105" />
          
          <div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#f4f9ff] dark:bg-[#1b264f] text-[#0284c7] dark:text-[#38bdf8] rounded-2xl flex items-center justify-center mb-4 sm:mb-6 border border-[#bae6fd]/60 dark:border-[#223269]/40 shadow-xs">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
            </div>
            <h3 className="text-sm font-black text-[#0f172a] dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5 flex-wrap" style={{ fontFamily: "'Fraunces', serif" }}>
              <span>Quick Guided Builder</span>
              <span className="px-1.5 py-0.5 bg-[#e0f2fe] dark:bg-[#1b264f] text-[#0284c7] dark:text-[#38bdf8] rounded text-[9px] font-black uppercase tracking-wider">Fast</span>
            </h3>
            <p className="text-[#64748b]/80 dark:text-zinc-400 text-[11px] leading-relaxed mb-4 sm:mb-6">
              Perfect for most invoicing needs. Follow a guided 7-step wizard to setup structural layouts, GST defaults, and custom fields in under 2 minutes.
            </p>
          </div>

          <div className="flex items-center text-[#0284c7] dark:text-[#38bdf8] font-black text-[10px] uppercase tracking-wider group-hover:translate-x-1 transition-transform">
            Start Wizard &rarr;
          </div>
        </div>

        {/* Advanced Studio */}
        <div 
          onClick={() => setMode('advanced')}
          className="group relative bg-white dark:bg-[#111a36] border-2 border-[#bae6fd]/60 hover:border-[#0284c7] dark:border-[#223269]/60 dark:hover:border-[#38bdf8] rounded-3xl p-5 sm:p-8 hover:shadow-[0_8px_30px_rgba(2,132,199,0.08)] transition-all cursor-pointer overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#0284c7]/10 to-[#38bdf8]/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-105" />
          
          <div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#f4f9ff] dark:bg-[#1b264f] text-[#0284c7] dark:text-[#38bdf8] rounded-2xl flex items-center justify-center mb-4 sm:mb-6 border border-[#bae6fd]/60 dark:border-[#223269]/40 shadow-xs">
              <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-sm font-black text-[#0f172a] dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5 flex-wrap" style={{ fontFamily: "'Fraunces', serif" }}>
              <span>Advanced Studio Editor</span>
              <span className="px-1.5 py-0.5 bg-[#e0f2fe] dark:bg-[#1b264f] text-[#0284c7] dark:text-[#38bdf8] rounded text-[9px] font-black uppercase tracking-wider">Pro</span>
            </h3>
            <p className="text-[#64748b]/80 dark:text-zinc-400 text-[11px] leading-relaxed mb-4 sm:mb-6">
              For complete layout and style customizer controls. Tweak section visibility, borders, sizing, font hierarchies, and drag-and-drop structural elements.
            </p>
          </div>

          <div className="flex items-center text-[#0284c7] dark:text-[#38bdf8] font-black text-[10px] uppercase tracking-wider group-hover:translate-x-1 transition-transform">
            Open Advanced Editor &rarr;
          </div>
        </div>

      </div>
    </div>
  );
}
