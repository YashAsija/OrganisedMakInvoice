import React, { useState, useRef, useEffect, useMemo } from 'react';
import { InvoiceTemplate } from '../../types';
import { QuickBuilderState, generateTemplateFromQuickState } from '../../lib/ConfigurationEngine';
import { ArrowLeft, ArrowRight, Save, CheckCircle2, Layout, Type, Settings, Image as ImageIcon, ZoomIn, ZoomOut } from 'lucide-react';
import { LivePreview } from './LivePreview';

interface QuickBuilderProps {
  onSave: (template: InvoiceTemplate) => void;
  onCancel: () => void;
  switchToAdvanced: (template: InvoiceTemplate) => void;
}

const INITIAL_STATE: QuickBuilderState = {
  invoiceType: 'Invoice',
  templateStyle: 'Modern',
  branding: {
    primaryColor: '#4f46e5',
    secondaryColor: '#f8fafc',
    fontFamily: 'Inter',
    showLogo: true,
    titleAlignment: 'Right',
  },
  sections: {
    company: true,
    customer: true,
    gst: true,
    shipTo: false,
    transport: false,
    payment: true,
    qrCode: false,
    signature: true,
    terms: true,
    notes: true,
  },
  tableLayout: 'Standard',
};

const STEPS = [
  { id: 1, title: 'Invoice Type' },
  { id: 2, title: 'Template Style' },
  { id: 3, title: 'Branding' },
  { id: 4, title: 'Sections' },
  { id: 5, title: 'Table Layout' },
  { id: 6, title: 'Preview & Save' }
];

export default function QuickBuilder({ onSave, onCancel, switchToAdvanced }: QuickBuilderProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(0.8);

  
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't pan if clicking on zoom controls
    if ((e.target as HTMLElement).closest('.z-\\[60\\]')) return;
    
    if (!previewContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - previewContainerRef.current.offsetLeft);
    setStartY(e.pageY - previewContainerRef.current.offsetTop);
    setScrollLeft(previewContainerRef.current.scrollLeft);
    setScrollTop(previewContainerRef.current.scrollTop);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !previewContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - previewContainerRef.current.offsetLeft;
    const y = e.pageY - previewContainerRef.current.offsetTop;
    const walkX = (x - startX) * 1.5;
    const walkY = (y - startY) * 1.5;
    previewContainerRef.current.scrollLeft = scrollLeft - walkX;
    previewContainerRef.current.scrollTop = scrollTop - walkY;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const handleResize = () => {
      if (previewContainerRef.current) {
        const containerWidth = previewContainerRef.current.clientWidth;
        const containerHeight = previewContainerRef.current.clientHeight;
        const paddingWidth = 32;
        const paddingHeight = 32;
        const availableWidth = containerWidth - paddingWidth;
        const availableHeight = containerHeight - paddingHeight;
        
        const targetWidth = 794; // A4 default
        const targetHeight = 1123; // A4 default
        
        const scaleWidth = availableWidth / targetWidth;
        const scaleHeight = availableHeight / targetHeight;
        
        const newScale = Math.min(1, Math.min(scaleWidth, scaleHeight));
        setPreviewScale(newScale);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [state, setState] = useState<QuickBuilderState>(INITIAL_STATE);

  const template = useMemo(() => generateTemplateFromQuickState(state), [state]);

  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
  const handlePrev = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100dvh-100px)] lg:h-[calc(100vh-100px)] bg-gradient-to-br from-slate-50 to-indigo-50/30 lg:overflow-hidden rounded-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 backdrop-blur-xl">
      {/* Left Sidebar - Wizard Controls */}
      <div className="w-full lg:w-[450px] shrink-0 bg-white/90 backdrop-blur-md border-b lg:border-b-0 lg:border-r border-slate-200/60 flex flex-col min-h-[50dvh] lg:h-full z-10 shadow-lg">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
           <div>
             <h2 className="font-bold text-slate-800 text-lg">Quick Builder</h2>
             <p className="text-xs text-slate-500">Step {currentStep} of {STEPS.length}: {STEPS[currentStep-1].title}</p>
           </div>
           <button onClick={onCancel} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100/80 h-1.5 rounded-full overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-sky-400 h-1.5 transition-all duration-500 ease-out" style={{ width: `${(currentStep / STEPS.length) * 100}%` }} />
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {currentStep === 1 && (
            <div className="space-y-6 animate-in slide-in-from-left-4 fade-in duration-300">
              <h3 className="text-xl font-bold text-slate-800">What type of document are you creating?</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {['Invoice', 'Estimate', 'Proforma', 'Credit Note'].map(type => (
                  <button
                    key={type}
                    onClick={() => setState({...state, invoiceType: type as any})}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${state.invoiceType === type ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-white shadow-md shadow-indigo-500/10 ring-2 ring-indigo-500/30 transform scale-[1.02]' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm hover:bg-slate-50'}`}
                  >
                    <div className="flex justify-between items-center mb-2">
                       <FileIcon className={`w-6 h-6 ${state.invoiceType === type ? 'text-indigo-600' : 'text-slate-400'}`} />
                       {state.invoiceType === type && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
                    </div>
                    <span className={`font-bold block ${state.invoiceType === type ? 'text-indigo-900' : 'text-slate-700'}`}>{type}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6 animate-in slide-in-from-left-4 fade-in duration-300">
              <h3 className="text-xl font-bold text-slate-800">Choose a Base Style</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {['Modern', 'Corporate', 'Minimal', 'Premium'].map(style => (
                  <button
                    key={style}
                    onClick={() => setState({...state, templateStyle: style as any})}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${state.templateStyle === style ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-white shadow-md shadow-indigo-500/10 ring-2 ring-indigo-500/30 transform scale-[1.02]' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm hover:bg-slate-50'}`}
                  >
                    <Layout className={`w-6 h-6 mb-2 ${state.templateStyle === style ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className={`font-bold block ${state.templateStyle === style ? 'text-indigo-900' : 'text-slate-700'}`}>{style}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6 animate-in slide-in-from-left-4 fade-in duration-300">
              <h3 className="text-xl font-bold text-slate-800">Brand Identity</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-2 block flex items-center gap-2"><ImageIcon className="w-4 h-4"/> Show Logo Space</label>
                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <input type="checkbox" checked={state.branding.showLogo} onChange={e => setState({...state, branding: {...state.branding, showLogo: e.target.checked}})} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" />
                    <span className="text-sm font-medium text-slate-700">Reserve space for company logo</span>
                  </label>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-2 block flex items-center gap-2"><PaletteIcon className="w-4 h-4"/> Primary Color</label>
                  <div className="flex gap-3">
                    <input type="color" value={state.branding.primaryColor} onChange={e => setState({...state, branding: {...state.branding, primaryColor: e.target.value}})} className="w-12 h-12 rounded-xl cursor-pointer border-0 p-0" />
                    <input type="text" value={state.branding.primaryColor} onChange={e => setState({...state, branding: {...state.branding, primaryColor: e.target.value}})} className="flex-1 p-3 border border-slate-200 rounded-xl text-sm font-mono uppercase focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-2 block flex items-center gap-2"><Type className="w-4 h-4"/> Typography</label>
                  <select value={state.branding.fontFamily} onChange={e => setState({...state, branding: {...state.branding, fontFamily: e.target.value}})} className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="Inter">Inter (Clean & Modern)</option>
                    <option value="Roboto">Roboto (Corporate)</option>
                    <option value="Outfit">Outfit (Creative)</option>
                    <option value="Times New Roman">Times New Roman (Traditional)</option>
                  </select>
                </div>
                              <div>
                  <label className="text-xs font-bold text-slate-700 mb-2 block flex items-center gap-2"><Layout className="w-4 h-4"/> Title Alignment</label>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    {['Left', 'Center', 'Right'].map(align => (
                       <button 
                         key={align} 
                         onClick={() => setState({...state, branding: {...state.branding, titleAlignment: align as any}})}
                         className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${state.branding.titleAlignment === align ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                       >
                         {align}
                       </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6 animate-in slide-in-from-left-4 fade-in duration-300">
              <h3 className="text-xl font-bold text-slate-800">Toggle Sections</h3>
              <p className="text-sm text-slate-500 mb-4">Turn on the sections you need. You can always change this later.</p>
              
              <div className="grid grid-cols-1 gap-3 max-h-[380px] overflow-y-auto pr-1">
                {[
                  { key: 'company', label: 'Company' },
                  { key: 'customer', label: 'Customer (Bill To)' },
                  { key: 'shipTo', label: 'Ship To' },
                  { key: 'gst', label: 'Gst' },
                  { key: 'transport', label: 'Transport' },
                  { key: 'payment', label: 'Payment' },
                  { key: 'qrCode', label: 'Qr Code' },
                  { key: 'signature', label: 'Signature' },
                  { key: 'terms', label: 'Terms' },
                  { key: 'notes', label: 'Notes' }
                ].map(({ key, label }) => {
                  const value = state.sections[key as keyof typeof state.sections];
                  return (
                    <label key={key} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                      <span className="text-sm font-medium text-slate-700">{label}</span>
                      <input 
                        type="checkbox" 
                        checked={value} 
                        onChange={e => setState({...state, sections: {...state.sections, [key]: e.target.checked}})} 
                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer" 
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6 animate-in slide-in-from-left-4 fade-in duration-300">
              <h3 className="text-xl font-bold text-slate-800">Table Layout</h3>
              <div className="grid grid-cols-1 gap-4">
                {['Compact', 'Standard', 'Detailed'].map(layout => (
                  <button
                    key={layout}
                    onClick={() => setState({...state, tableLayout: layout as any})}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${state.tableLayout === layout ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-white shadow-md shadow-indigo-500/10 ring-2 ring-indigo-500/30 transform scale-[1.02]' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm hover:bg-slate-50'}`}
                  >
                    <span className={`font-bold block mb-1 ${state.tableLayout === layout ? 'text-indigo-900' : 'text-slate-700'}`}>{layout} View</span>
                    <span className="text-xs text-slate-500">
                      {layout === 'Compact' && 'Minimal columns and padding for simple bills.'}
                      {layout === 'Standard' && 'Balanced layout for most service or product invoices.'}
                      {layout === 'Detailed' && 'Includes HSN/SAC, explicit Tax %, and roomy rows.'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 6 && (
            <div className="space-y-6 animate-in slide-in-from-left-4 fade-in duration-300">
              <div className="text-center py-6">
                 <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                   <CheckCircle2 className="w-8 h-8" />
                 </div>
                 <h3 className="text-2xl font-bold text-slate-800 mb-2">Template is Ready!</h3>
                 <p className="text-sm text-slate-500 mb-6">Your template looks great. You can save it now or switch to the Advanced Studio to tweak the fine details.</p>
                 
                 <div className="space-y-3">
                   <button onClick={() => onSave(template)} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md">
                     <Save className="w-5 h-5" /> Save Template
                   </button>
                   <button onClick={() => switchToAdvanced(template)} className="w-full py-3 bg-white border-2 border-slate-200 hover:border-indigo-300 hover:text-indigo-700 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                     <Settings className="w-5 h-5" /> Switch to Advanced Studio
                   </button>
                 </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 mt-auto">
          <button 
            onClick={handlePrev} 
            disabled={currentStep === 1}
            className={`px-4 py-2 flex items-center gap-2 rounded-lg font-bold text-sm transition-colors ${currentStep === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          
          {currentStep < STEPS.length ? (
            <button 
              onClick={handleNext} 
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 rounded-lg font-bold text-sm transition-all shadow-sm"
            >
              Next Step <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button 
              onClick={() => onSave(template)} 
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 rounded-lg font-bold text-sm transition-all shadow-sm"
            >
              Save <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Right Side - Live Preview */}
      <div className="flex-1 relative flex flex-col h-full overflow-hidden">
        <div ref={previewContainerRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUpOrLeave} onMouseLeave={handleMouseUpOrLeave} style={{ cursor: isDragging ? "grabbing" : "grab" }} className="w-full h-full bg-slate-100/40 p-2 md:p-8 shadow-inner overflow-auto custom-scrollbar relative">
          <div style={{ width: 794 * previewScale, height: 1123 * previewScale, transition: 'all 0.2s ease' }} className="shrink-0 mx-auto relative">
            <div 
              className="shadow-2xl bg-white origin-top-left ring-1 ring-slate-900/5 absolute top-0 left-0" 
              style={{ 
                width: '794px',
                minHeight: '1123px',
                transform: `scale(${previewScale})`, 
                transition: 'transform 0.2s ease',
              }}
            >
              <LivePreview template={template} />
            </div>
          </div>
        </div>
        <div className="absolute bottom-6 right-6 flex items-center bg-white shadow-lg rounded-lg border border-slate-200 overflow-hidden z-[60]">
          <button onClick={() => setPreviewScale(s => Math.max(0.3, s - 0.1))} className="p-2 hover:bg-slate-100 text-slate-600 transition-colors">
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="px-3 py-2 text-xs font-bold text-slate-700 border-x border-slate-200 min-w-[60px] text-center">
            {Math.round(previewScale * 100)}%
          </div>
          <button onClick={() => setPreviewScale(s => Math.min(2, s + 0.1))} className="p-2 hover:bg-slate-100 text-slate-600 transition-colors">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Simple icons for UI
function FileIcon(props: any) {
  return <FileText {...props} />;
}
import { FileText, Palette as PaletteIcon } from 'lucide-react';
