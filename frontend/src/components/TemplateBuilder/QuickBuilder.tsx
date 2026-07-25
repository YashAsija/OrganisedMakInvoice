import React, { useState, useRef, useEffect, useMemo } from 'react';
import { InvoiceTemplate } from '../../types';
import { QuickBuilderState, generateTemplateFromQuickState } from '../../lib/ConfigurationEngine';
import { ArrowLeft, ArrowRight, Save, CheckCircle2, Layout, Type, Settings, Image as ImageIcon, ZoomIn, ZoomOut } from 'lucide-react';
import { LivePreview } from './LivePreview';
import { emitNotification } from '../../lib/notifications';

interface QuickBuilderProps {
  onSave: (template: InvoiceTemplate) => void;
  onCancel: () => void;
  switchToAdvanced: (template: InvoiceTemplate) => void;
}

const INITIAL_STATE: QuickBuilderState = {
  invoiceType: 'Invoice',
  templateStyle: 'Modern',
  branding: {
    primaryColor: '#0f172a',
    secondaryColor: '#FCFAF7',
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
    const calcScale = (el: HTMLDivElement) => {
      const containerWidth = el.clientWidth;
      const containerHeight = el.clientHeight;
      const padding = 32;
      const isMobile = window.innerWidth < 1024; // below `lg` breakpoint = stacked layout

      const availableWidth = Math.max(1, containerWidth - padding);
      const scaleByWidth = availableWidth / 794;

      if (isMobile) {
        // On mobile the panel height is unbounded (scrolls) — only fit by width
        const newScale = Math.min(0.9, Math.max(0.3, scaleByWidth));
        setPreviewScale(newScale);
      } else {
        const availableHeight = Math.max(1, containerHeight - padding);
        const scaleByHeight = availableHeight / 1123;
        const newScale = Math.min(1, Math.min(scaleByWidth, scaleByHeight));
        setPreviewScale(newScale);
      }
    };

    const el = previewContainerRef.current;
    if (!el) return;

    // Fire immediately
    calcScale(el);

    // Watch container size changes (layout reflows, panel expanding on mobile, etc.)
    const ro = new ResizeObserver(() => { if (previewContainerRef.current) calcScale(previewContainerRef.current); });
    ro.observe(el);

    // Also handle orientation changes
    window.addEventListener('resize', () => { if (previewContainerRef.current) calcScale(previewContainerRef.current); });

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', () => { if (previewContainerRef.current) calcScale(previewContainerRef.current); });
    };
  }, []);

  const [state, setState] = useState<QuickBuilderState>(INITIAL_STATE);

  const template = useMemo(() => generateTemplateFromQuickState(state), [state]);

  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
  const handlePrev = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100dvh-120px)] lg:h-[calc(100vh-120px)] bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm animate-in fade-in duration-200 w-full">
      
      {/* Left Sidebar - Wizard Controls */}
      <div className="w-full lg:w-[420px] shrink-0 bg-white dark:bg-zinc-900 border-b lg:border-b-0 lg:border-r border-[#e2e8f0]/40 dark:border-zinc-800 flex flex-col min-h-[45dvh] sm:min-h-[50dvh] lg:h-full z-10">
        
        {/* Header bar */}
        <div className="p-4 sm:p-6 border-b border-[#e2e8f0]/30 dark:border-zinc-800 flex items-center justify-between bg-[#FCFAF7]/60 dark:bg-zinc-950/20">
           <div>
             <h2 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
               <span className="bg-gradient-to-r from-amber-600 via-[#64748b] to-rose-500 bg-clip-text text-transparent dark:from-amber-400 dark:via-white dark:to-rose-400">Quick Builder Wizard</span>
               <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
             </h2>
             <p className="text-[10px] text-[#64748b]/80 dark:text-zinc-400 mt-0.5">
               Step <span className="text-[#0f172a] dark:text-white font-extrabold">{currentStep}</span> of {STEPS.length}: <span className="text-amber-600 dark:text-amber-400 font-extrabold">{STEPS[currentStep-1].title}</span>
             </p>
           </div>
           <button 
             onClick={onCancel} 
             className="text-[10px] font-black text-[#64748b] hover:text-[#0f172a] dark:text-zinc-500 dark:hover:text-zinc-300 uppercase tracking-widest cursor-pointer"
           >
             Cancel
           </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#e2e8f0]/30 dark:bg-zinc-800 h-1 relative overflow-hidden">
          {(() => {
            const stepGradients = [
              'from-emerald-400 to-emerald-500',
              'from-sky-400 to-sky-500',
              'from-amber-400 to-amber-500',
              'from-violet-400 to-violet-500',
              'from-rose-400 to-rose-500',
              'from-teal-400 to-teal-500'
            ];
            return (
              <div 
                className={`bg-gradient-to-r ${stepGradients[currentStep - 1] || 'from-[#64748b] to-[#0f172a]'} h-1 transition-all duration-500 ease-out`} 
                style={{ width: `${(currentStep / STEPS.length) * 100}%` }} 
              />
            );
          })()}
        </div>

        {/* Form elements container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-xs font-black text-[#0f172a] dark:text-white uppercase tracking-wide">Document Purpose</h3>
              <div className="grid grid-cols-2 gap-3">
                {['Invoice', 'Estimate', 'Proforma', 'Credit Note', 'Purchases', 'Purchase Order', 'Purchase Debit Note'].map((type, idx) => {
                  const active = state.invoiceType === type;
                  const borderColors = ['border-emerald-400', 'border-sky-400', 'border-amber-400', 'border-violet-400', 'border-rose-400', 'border-blue-400', 'border-indigo-400'];
                  const textColors = ['text-emerald-500', 'text-sky-500', 'text-amber-500', 'text-violet-500', 'text-rose-500', 'text-blue-500', 'text-indigo-500'];
                  return (
                    <button
                      key={type}
                      onClick={() => setState({...state, invoiceType: type as any})}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        active 
                          ? `border-[#64748b] bg-[#FCFAF7] dark:bg-zinc-950 shadow-xs ring-1 ring-[#64748b]/20` 
                          : 'border-[#e2e8f0]/60 dark:border-zinc-800 hover:border-[#64748b]/40 hover:bg-[#FCFAF7]/20'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-3">
                         <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${active ? 'bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 shadow-2xs' : 'text-[#64748b]'}`}>
                           <FileIcon className={`w-4 h-4 ${active ? textColors[idx] : 'text-[#64748b]/60'}`} />
                         </div>
                         {active && <CheckCircle2 className={`w-4 h-4 ${textColors[idx]}`} />}
                      </div>
                      <span className={`text-xs font-black uppercase tracking-wider block ${active ? 'text-[#0f172a] dark:text-zinc-100' : 'text-[#64748b]'}`}>{type}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-xs font-black text-[#0f172a] dark:text-white uppercase tracking-wide">Base Template Style</h3>
              <div className="grid grid-cols-2 gap-3">
                {['Modern', 'Corporate', 'Minimal', 'Premium'].map((style, idx) => {
                  const active = state.templateStyle === style;
                  const textColors = ['text-emerald-500', 'text-sky-500', 'text-amber-500', 'text-violet-500'];
                  return (
                    <button
                      key={style}
                      onClick={() => setState({...state, templateStyle: style as any})}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        active 
                          ? `border-[#64748b] bg-[#FCFAF7] dark:bg-zinc-950 shadow-xs ring-1 ring-[#64748b]/20` 
                          : 'border-[#e2e8f0]/60 dark:border-zinc-800 hover:border-[#64748b]/40 hover:bg-[#FCFAF7]/20'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${active ? 'bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 shadow-2xs' : 'text-[#64748b]'}`}>
                          <Layout className={`w-4 h-4 ${active ? textColors[idx] : 'text-[#64748b]/60'}`} />
                        </div>
                        {active && <CheckCircle2 className={`w-4 h-4 ${textColors[idx]}`} />}
                      </div>
                      <span className={`text-xs font-black uppercase tracking-wider block ${active ? 'text-[#0f172a] dark:text-zinc-100' : 'text-[#64748b]'}`}>{style}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-xs font-black text-[#0f172a] dark:text-white uppercase tracking-wide">Brand Customization</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#64748b] mb-2 block flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5"/> Show Logo</label>
                  <label className="flex items-center gap-3 p-3 bg-[#FCFAF7]/50 dark:bg-zinc-950 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-xl cursor-pointer hover:bg-[#FCFAF7] transition-all">
                    <input type="checkbox" checked={state.branding.showLogo} onChange={e => setState({...state, branding: {...state.branding, showLogo: e.target.checked}})} className="w-4 h-4 rounded border-[#e2e8f0] text-[#64748b] focus:ring-[#64748b] cursor-pointer" />
                    <span className="text-xs font-bold text-[#0f172a] dark:text-zinc-300">Reserve space for corporate logo</span>
                  </label>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#64748b] mb-2 block flex items-center gap-1.5"><PaletteIcon className="w-3.5 h-3.5"/> Theme Accent Color</label>
                  <div className="flex gap-2">
                    <input type="color" value={state.branding.primaryColor} onChange={e => setState({...state, branding: {...state.branding, primaryColor: e.target.value}})} className="w-10 h-10 rounded-xl cursor-pointer border border-[#e2e8f0]/60 p-0" />
                    <input type="text" value={state.branding.primaryColor} onChange={e => setState({...state, branding: {...state.branding, primaryColor: e.target.value}})} className="flex-1 p-2 bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-xl text-[11px] font-mono uppercase focus:outline-none focus:border-[#64748b] dark:text-white" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#64748b] mb-2 block flex items-center gap-1.5"><Type className="w-3.5 h-3.5"/> Primary Typography</label>
                  <select value={state.branding.fontFamily} onChange={e => setState({...state, branding: {...state.branding, fontFamily: e.target.value}})} className="w-full p-2.5 bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-xl text-xs font-bold text-[#0f172a] dark:text-zinc-200 focus:outline-none focus:border-[#64748b] cursor-pointer">
                    <option value="Inter">Inter (Modern & Clean)</option>
                    <option value="Roboto">Roboto (Technical)</option>
                    <option value="Outfit">Outfit (Geometric & Bold)</option>
                    <option value="Times New Roman">Times New Roman (Elegant Serif)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#64748b] mb-2 block flex items-center gap-1.5"><Layout className="w-3.5 h-3.5"/> Invoice Title Position</label>
                  <div className="flex bg-[#f8fafc] dark:bg-zinc-950 p-1 rounded-xl">
                    {['Left', 'Center', 'Right'].map(align => (
                       <button 
                         key={align} 
                         type="button"
                         onClick={() => setState({...state, branding: {...state.branding, titleAlignment: align as any}})}
                         className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${state.branding.titleAlignment === align ? 'bg-white dark:bg-zinc-900 shadow-xs text-[#0f172a] dark:text-white' : 'text-[#64748b]/80 hover:text-[#0f172a]'}`}
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
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col">
                <h3 className="text-xs font-black text-[#0f172a] dark:text-white uppercase tracking-wide">Selectable Sections</h3>
                <span className="text-[10px] text-[#64748b]/80 dark:text-zinc-500 mt-0.5">Toggle structural content containers depending on usecase</span>
              </div>
              
              <div className="grid grid-cols-1 gap-2 max-h-[260px] sm:max-h-[300px] overflow-y-auto pr-1">
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
                    <label key={key} className="flex items-center justify-between p-3 bg-[#FCFAF7]/50 dark:bg-zinc-950 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-xl cursor-pointer hover:bg-[#FCFAF7] transition-colors">
                      <span className="text-[11px] font-bold text-[#0f172a] dark:text-zinc-300">{label}</span>
                      <input 
                        type="checkbox" 
                        checked={value} 
                        onChange={e => setState({...state, sections: {...state.sections, [key]: e.target.checked}})} 
                        className="w-4 h-4 rounded border-[#e2e8f0] text-[#64748b] focus:ring-[#64748b] cursor-pointer" 
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-xs font-black text-[#0f172a] dark:text-white uppercase tracking-wide">Itemized Grid Layout</h3>
              <div className="grid grid-cols-1 gap-3">
                {['Compact', 'Standard', 'Detailed'].map(layout => {
                  const active = state.tableLayout === layout;
                  return (
                    <button
                      key={layout}
                      onClick={() => setState({...state, tableLayout: layout as any})}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        active 
                          ? 'border-[#64748b] bg-[#FCFAF7] dark:bg-zinc-950 shadow-xs ring-1 ring-[#64748b]/20' 
                          : 'border-[#e2e8f0]/60 dark:border-zinc-800 hover:border-[#64748b]/40 hover:bg-[#FCFAF7]/20'
                      }`}
                    >
                      <span className={`text-xs font-black uppercase tracking-wider block mb-1.5 ${active ? 'text-[#0f172a] dark:text-white' : 'text-[#64748b]'}`}>{layout} View</span>
                      <span className="text-[10px] text-[#64748b]/80 dark:text-zinc-500 leading-relaxed block">
                        {layout === 'Compact' && 'Fewer column spacers and minimized item padding.'}
                        {layout === 'Standard' && 'Balanced dimensions tailored for regular services or products.'}
                        {layout === 'Detailed' && 'Exposes GST rates, itemized supply tags, and generous line spacing.'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {currentStep === 6 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="text-center py-4">
                 <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 rounded-full border border-emerald-200/50 dark:border-emerald-900/30 flex items-center justify-center mx-auto mb-4 shadow-sm">
                   <CheckCircle2 className="w-6 h-6" />
                 </div>
                 <h3 className="text-sm font-black text-[#0f172a] dark:text-white uppercase tracking-wider mb-2">Setup is Ready!</h3>
                 <p className="text-[11px] text-[#64748b]/80 dark:text-zinc-400 mb-6 max-w-xs mx-auto leading-relaxed">Your builder configuration has generated successfully. Save this template now or continue tweaking details in Advanced Studio.</p>
                 
                 <div className="space-y-2">
                   <button 
                     onClick={() => onSave(template)} 
                     className="w-full py-2.5 bg-[#0f172a] hover:bg-[#5C5043] text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                   >
                     <Save className="w-4 h-4" /> Save Template
                   </button>
                   <button 
                     onClick={() => switchToAdvanced(template)} 
                     className="w-full py-2.5 bg-sky-50 dark:bg-sky-950/20 hover:bg-sky-100 dark:hover:bg-sky-900/30 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/40 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                   >
                     <Settings className="w-4 h-4" /> Go Advanced Studio
                   </button>
                 </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t border-[#e2e8f0]/30 dark:border-zinc-800 flex items-center justify-between bg-[#FCFAF7]/60 dark:bg-zinc-950/20 mt-auto">
          <button 
            onClick={handlePrev} 
            disabled={currentStep === 1}
            className={`px-3 py-2 flex items-center gap-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer ${currentStep === 1 ? 'text-zinc-300 dark:text-zinc-700 cursor-not-allowed' : 'text-[#64748b] hover:bg-[#f8fafc] dark:hover:bg-zinc-800'}`}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          
          {currentStep < STEPS.length ? (
            <button 
              onClick={handleNext} 
              className="px-4 py-2 bg-[#0f172a] hover:bg-[#5C5043] text-white flex items-center gap-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-sm"
            >
              Next <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button 
              onClick={() => {
                emitNotification('Quick Builder Generated', `Generated ${state.invoiceType} template successfully.`, 'success');
                onSave(template);
              }} 
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-sm"
            >
              Finish <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Right Side - Live Preview */}
      <div className="flex-1 relative flex flex-col h-full min-h-[60vw] sm:min-h-0 overflow-hidden bg-[#FCFAF7]/40 dark:bg-zinc-950/20">
        <div 
          ref={previewContainerRef} 
          onMouseDown={handleMouseDown} 
          onMouseMove={handleMouseMove} 
          onMouseUp={handleMouseUpOrLeave} 
          onMouseLeave={handleMouseUpOrLeave} 
          style={{ cursor: isDragging ? "grabbing" : "grab" }} 
          className="w-full h-full p-2 md:p-6 overflow-auto custom-scrollbar relative flex items-center justify-center"
        >
          <div style={{ width: 794 * previewScale, height: 1123 * previewScale, transition: 'all 0.2s ease' }} className="shrink-0 mx-auto relative">
            <div 
              className="shadow-md bg-white origin-top-left ring-1 ring-slate-900/5 absolute top-0 left-0" 
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

        {/* Zoom Controls */}
        <div className="absolute bottom-4 right-4 flex items-center bg-white dark:bg-zinc-900 shadow-md rounded-xl border border-[#e2e8f0]/60 dark:border-zinc-800 overflow-hidden z-[60]">
          <button onClick={() => setPreviewScale(s => Math.max(0.3, s - 0.1))} className="p-2 hover:bg-[#FCFAF7] dark:hover:bg-zinc-800 text-[#64748b] transition-colors cursor-pointer">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <div className="px-3 py-1.5 text-[10px] font-black text-[#0f172a] dark:text-zinc-300 border-x border-[#e2e8f0]/40 dark:border-zinc-800 min-w-[50px] text-center font-mono">
            {Math.round(previewScale * 100)}%
          </div>
          <button onClick={() => setPreviewScale(s => Math.min(2, s + 0.1))} className="p-2 hover:bg-[#FCFAF7] dark:hover:bg-zinc-800 text-[#64748b] transition-colors cursor-pointer">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    </div>
  );
}

function FileIcon(props: any) {
  return <FileText {...props} />;
}
import { FileText, Palette as PaletteIcon } from 'lucide-react';
