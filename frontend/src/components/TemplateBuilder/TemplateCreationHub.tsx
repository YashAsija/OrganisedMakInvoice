import React, { useState } from 'react';
import { InvoiceTemplate } from '../../types';
import { Layout, Zap, Settings, ArrowLeft } from 'lucide-react';
import AdvancedStudio from './AdvancedStudio';
import QuickBuilder from './QuickBuilder';

interface TemplateCreationHubProps {
  initialTemplate?: InvoiceTemplate | null;
  onSave: (template: InvoiceTemplate) => void;
  onCancel: () => void;
}

export default function TemplateCreationHub({ initialTemplate, onSave, onCancel }: TemplateCreationHubProps) {
  const [mode, setMode] = useState<'selection' | 'quick' | 'advanced'>(initialTemplate ? 'advanced' : 'selection');

  if (mode === 'advanced') {
    return <AdvancedStudio initialTemplate={initialTemplate} onSave={onSave} onCancel={onCancel} />;
  }

  if (mode === 'quick') {
    return <QuickBuilder 
      onSave={onSave} 
      onCancel={onCancel} 
      switchToAdvanced={(temp) => {
        // We'll implement switching logic here later by passing down a ref or lifting state.
        setMode('advanced');
      }} 
    />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] h-auto max-w-4xl mx-auto py-12 px-6">
      <div className="w-full flex items-center mb-12">
        <button onClick={onCancel} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Library</span>
        </button>
      </div>

      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">How would you like to build your template?</h1>
        <p className="text-slate-500 max-w-lg mx-auto">Choose between a guided quick setup for standard needs, or use the advanced studio for pixel-perfect customization.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {/* Quick Builder Option */}
        <div 
          onClick={() => setMode('quick')}
          className="group relative bg-white border border-slate-200 rounded-3xl p-8 hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all cursor-pointer overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
          <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
            <Zap className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Quick Template Builder</h3>
          <p className="text-slate-500 text-sm mb-6 line-clamp-3">
            Perfect for most businesses. Follow a guided 7-step wizard to create a professional invoice template in under 2 minutes. No design skills needed.
          </p>
          <div className="flex items-center text-indigo-600 font-semibold text-sm group-hover:translate-x-1 transition-transform">
            Start Quick Builder &rarr;
          </div>
        </div>

        {/* Advanced Studio Option */}
        <div 
          onClick={() => setMode('advanced')}
          className="group relative bg-white border border-slate-200 rounded-3xl p-8 hover:border-sky-500 hover:shadow-2xl hover:shadow-sky-500/10 transition-all cursor-pointer overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sky-500/10 to-cyan-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
          <div className="w-14 h-14 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center mb-6">
            <Settings className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Advanced Template Studio</h3>
          <p className="text-slate-500 text-sm mb-6 line-clamp-3">
            For power users and designers. Get full control over layout grids, conditional visibility, typography, and drag-and-drop canvas editing.
          </p>
          <div className="flex items-center text-sky-600 font-semibold text-sm group-hover:translate-x-1 transition-transform">
            Open Advanced Studio &rarr;
          </div>
        </div>
      </div>
    </div>
  );
}
