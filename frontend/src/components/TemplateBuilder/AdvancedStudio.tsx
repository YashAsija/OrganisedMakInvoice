import React, { useState, useRef, useEffect } from 'react';
import { InvoiceTemplate, BusinessProfile } from '../../types';
import { Layout, Palette, Settings, Type, FileText, CheckCircle, Smartphone, MousePointer2, Menu, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { LivePreview } from './LivePreview';
import { TEMPLATE_PRESETS } from '../../lib/templatePresets';
import { useTemplateHistory } from '../../hooks/useTemplateHistory';
import { Undo2, Redo2 } from 'lucide-react';
import { StepControls } from './StepControls';
import { StepCanvas } from './StepCanvas';

interface TemplateBuilderProps {
  initialTemplate?: InvoiceTemplate | null;
  businessProfile?: BusinessProfile;
  onSave: (template: InvoiceTemplate) => void;
  onCancel: () => void;
}

const defaultTemplate: InvoiceTemplate = {
  id: `tmpl_${Math.random().toString(36).substr(2, 9)}`,
  name: 'New Custom Template',
  description: 'My highly customized invoice template',
  isDefault: false,
  category: 'User',
  layout: {
    type: 'Classic',
    pageSize: 'A4',
    orientation: 'Portrait',
    margins: 'Standard',
    watermark: { enabled: false, text: 'CONFIDENTIAL', opacity: 0.1, position: 'Center', rotation: -45 }
  },
  sections: {
    header: { id: 'header', visible: true, order: 1, gridColumnSpan: 12, customLabels: {}, customStyles: {} },
    companyInfo: { id: 'companyInfo', visible: true, order: 2, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
    invoiceInfo: { id: 'invoiceInfo', visible: true, order: 3, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
    billTo: { id: 'billTo', visible: true, order: 4, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
    shipTo: { id: 'shipTo', visible: false, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
    transport: { id: 'transport', visible: false, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} },
    productTable: { id: 'productTable', visible: true, order: 7, gridColumnSpan: 12, customLabels: {}, customStyles: {} },
    taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
    payment: { id: 'payment', visible: true, order: 9, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
    amountInWords: { id: 'amountInWords', visible: true, order: 10, gridColumnSpan: 12, customLabels: {}, customStyles: {} },
    terms: { id: 'terms', visible: true, order: 11, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
    signature: { id: 'signature', visible: true, order: 12, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
    footer: { id: 'footer', visible: true, order: 13, gridColumnSpan: 12, customLabels: {}, customStyles: {} }
  },
  config: {
    header: { showLogo: true, logoPosition: 'Left', logoWidth: 120, logoHeight: 60, titleAlignment: 'Right', invoiceTitle: 'TAX INVOICE' },
    company: { fields: ['name', 'address', 'gstin', 'email', 'phone', 'pan'] },
    invoiceInfo: { fields: ['invoiceNumber', 'invoiceDate', 'dueDate'], customFields: [], position: 'Right' },
    client: { fields: ['name', 'address', 'gstin'] },
    shipping: { fields: ['name', 'address'], sameAsBilling: true },
    transport: { fields: ['vehicleNo', 'transportName'] },
    table: {
      columns: [
        { id: 'sr', visible: true, label: 'Sr No', type: 'Number', order: 1 },
        { id: 'name', visible: true, label: 'Item Name', type: 'Text', order: 2 },
        { id: 'qty', visible: true, label: 'Qty', type: 'Number', order: 3 },
        { id: 'rate', visible: true, label: 'Rate', type: 'Currency', order: 4 },
        { id: 'amount', visible: true, label: 'Amount', type: 'Formula', formula: 'qty*rate', order: 5 }
      ]
    },
    tax: { showTaxableAmount: true, showCgstSgst: true, showIgst: true, showCess: false, showDiscount: true, showRoundOff: true, showTotal: true, enableHsnSummary: false, enableGstSummary: false, enableTaxBreakdown: true },
    payment: { generateQrCode: true, enableInstructions: true, customNote: 'Please include invoice number in payment.' },
    amountInWords: { format: 'Indian', enabled: true },
    terms: { presetId: 'default', customText: '1. Subject to local jurisdiction.\n2. Goods once sold will not be taken back.', notesText: 'Thank you for your business!' },
    signature: { showSignature: true, showStamp: false, position: 'Right', width: 150, height: 60, signatoryName: 'Authorized Signatory', designation: '' },
    footer: { message: 'Thank you for your business!', thankYouNote: '', supportContact: '', website: '', showPageNumbers: true, showGeneratedBy: true, customText: '', showContact: true, showWebsite: true }
  },
  styleConfig: {
    primaryColor: '#0f172a',
    secondaryColor: '#FCFAF7',
    accentColor: '#10b981',
    fontFamily: 'Inter',
    spacing: 'Normal',
    borderStyle: 'Light',
    roundedCorners: true,
    sectionBackgroundColors: {},
    alternatingRowColors: true,
    tableHeaderBackground: '#0f172a',
    tableHeaderTextColor: '#ffffff'
  }
};

const STEPS = [
  { id: 'start', title: 'Start', icon: Settings },
  { id: 'layout', title: 'Page Structure', icon: Layout },
  { id: 'header', title: 'Header', icon: FileText },
  { id: 'company', title: 'Company Info', icon: Settings },
  { id: 'invoiceInfo', title: 'Invoice Info', icon: Settings },
  { id: 'client', title: 'Bill To', icon: Settings },
  { id: 'shipping', title: 'Ship To', icon: Settings },
  { id: 'transport', title: 'Transport', icon: Settings },
  { id: 'table', title: 'Product Table', icon: Layout },
  { id: 'tax', title: 'Tax Engine', icon: Settings },
  { id: 'payment', title: 'Payment', icon: Settings },
  { id: 'terms', title: 'Terms', icon: FileText },
  { id: 'signature', title: 'Signature', icon: Settings },
  { id: 'footer', title: 'Footer', icon: Layout },
  { id: 'design', title: 'Design System', icon: Palette },
  { id: 'canvas', title: 'Drag & Drop Canvas', icon: MousePointer2 },
];

export default function AdvancedStudio({ initialTemplate, businessProfile, onSave, onCancel }: TemplateBuilderProps) {
  const { template, updateTemplate, undo, redo, canUndo, canRedo } = useTemplateHistory(initialTemplate || defaultTemplate);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [previewScale, setPreviewScale] = useState(0.7);
  const previewContainerRef = useRef<HTMLDivElement>(null);

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
      const isMobile = window.innerWidth < 1024;

      const targetWidth = template.layout.pageSize === 'A4' ? 794 : 816;
      const targetHeight = template.layout.pageSize === 'A4' ? 1123 : 1056;

      const availableWidth = Math.max(1, containerWidth - padding);
      const scaleByWidth = availableWidth / targetWidth;

      if (isMobile) {
        // On mobile stacked layout: fit by width only, panel scrolls vertically
        const newScale = Math.min(0.9, Math.max(0.3, scaleByWidth));
        setPreviewScale(newScale);
      } else {
        const availableHeight = Math.max(1, containerHeight - padding);
        const scaleByHeight = availableHeight / targetHeight;
        const newScale = Math.min(1, Math.min(scaleByWidth, scaleByHeight));
        setPreviewScale(newScale);
      }
    };

    const el = previewContainerRef.current;
    if (!el) return;

    calcScale(el);

    const ro = new ResizeObserver(() => { if (previewContainerRef.current) calcScale(previewContainerRef.current); });
    ro.observe(el);

    const onWinResize = () => { if (previewContainerRef.current) calcScale(previewContainerRef.current); };
    window.addEventListener('resize', onWinResize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onWinResize);
    };
  }, [template.layout.pageSize]);

  const updateConfig = (section: keyof InvoiceTemplate['config'], data: any) => {
    updateTemplate({
      ...template,
      config: { ...template.config, [section]: { ...template.config[section], ...data } }
    });
  };

  const updateStyle = (data: any) => {
    updateTemplate({
      ...template,
      styleConfig: { ...template.styleConfig, ...data }
    });
  };

  const currentStep = STEPS[currentStepIndex];

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100dvh-120px)] lg:h-[calc(100vh-120px)] bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm animate-in fade-in duration-200 w-full relative">
      
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar Navigation */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 shrink-0 bg-white dark:bg-zinc-900 border-r border-[#e2e8f0]/40 dark:border-zinc-800 flex-col h-full overflow-y-auto custom-scrollbar transition-transform duration-300 lg:relative lg:translate-x-0 lg:flex ${isMobileMenuOpen ? 'translate-x-0 flex' : '-translate-x-full flex'}`}>
        
        {/* Sidebar Header */}
        <div className="p-4 border-b border-[#e2e8f0]/30 dark:border-zinc-800 bg-[#FCFAF7] dark:bg-zinc-900 sticky top-0 z-10 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <span className="bg-gradient-to-r from-amber-600 via-[#64748b] to-rose-500 bg-clip-text text-transparent dark:from-amber-400 dark:via-white dark:to-rose-400">Advanced Studio</span>
            </h2>
            <p className="text-[10px] text-[#64748b]/80 dark:text-zinc-500 mt-0.5">Fine Layout Customizer</p>
          </div>
          <div className="flex gap-1.5">
            <button onClick={undo} disabled={!canUndo} className={`p-1.5 rounded-lg border transition-all ${canUndo ? 'border-[#e2e8f0] dark:border-zinc-700 text-[#0f172a] dark:text-zinc-300 hover:bg-[#f8fafc] dark:hover:bg-zinc-800 cursor-pointer' : 'border-zinc-150 dark:border-zinc-850 text-zinc-300 dark:text-zinc-700 cursor-not-allowed'}`} title="Undo">
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={redo} disabled={!canRedo} className={`p-1.5 rounded-lg border transition-all ${canRedo ? 'border-[#e2e8f0] dark:border-zinc-700 text-[#0f172a] dark:text-zinc-300 hover:bg-[#f8fafc] dark:hover:bg-zinc-800 cursor-pointer' : 'border-zinc-150 dark:border-zinc-850 text-zinc-300 dark:text-zinc-700 cursor-not-allowed'}`} title="Redo">
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Steps List */}
        <div className="flex-1 py-3 custom-scrollbar space-y-4">
          {Object.entries({
            'General & Layout': ['start', 'layout'],
            'Data Sections': ['header', 'company', 'invoiceInfo', 'client', 'shipping', 'transport'],
            'Financials': ['table', 'tax', 'payment', 'amountInWords'],
            'Footer': ['terms', 'signature', 'footer'],
            'Advanced Design': ['design', 'canvas']
          }).map(([groupName, stepIds]) => {
            const groupColors: Record<string, string> = {
              'General & Layout': 'text-amber-500 bg-amber-50 dark:bg-amber-950/20 border-r-amber-500',
              'Data Sections': 'text-sky-500 bg-sky-50 dark:bg-sky-950/20 border-r-sky-500',
              'Financials': 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 border-r-emerald-500',
              'Footer': 'text-rose-500 bg-rose-50 dark:bg-rose-950/20 border-r-rose-500',
              'Advanced Design': 'text-violet-500 bg-violet-50 dark:bg-violet-950/20 border-r-violet-500'
            };
            return (
              <div key={groupName}>
                <div className="px-4 py-1 text-[9px] font-black text-[#64748b]/80 dark:text-zinc-500 uppercase tracking-widest">{groupName}</div>
                <div className="mt-1 space-y-0.5">
                  {stepIds.map(id => {
                    const step = STEPS.find(s => s.id === id);
                    if (!step) return null;
                    const idx = STEPS.indexOf(step);
                    const isActive = currentStepIndex === idx;
                    const Icon = step.icon;
                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => { setCurrentStepIndex(idx); setIsMobileMenuOpen(false); }}
                        className={`group w-full text-left px-4 py-1.5 text-[11px] font-bold flex items-center gap-3 transition-all cursor-pointer ${
                          isActive 
                            ? `bg-[#FCFAF7] dark:bg-zinc-950/60 text-[#0f172a] dark:text-white border-r-4 ${groupColors[groupName]?.split(' ').find(c => c.startsWith('border-r-')) || 'border-r-[#64748b]'}` 
                            : 'text-[#64748b] hover:bg-[#FCFAF7]/30 hover:text-[#0f172a] dark:hover:text-zinc-200'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                          isActive 
                            ? `${groupColors[groupName]?.split(' ').filter(c => !c.startsWith('border-r-')).join(' ')} border-transparent shadow-2xs` 
                            : 'bg-white dark:bg-zinc-900 border-[#e2e8f0]/60 dark:border-zinc-800 text-[#64748b]/60 group-hover:bg-[#FCFAF7] dark:group-hover:bg-zinc-800'
                        }`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate">{step.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-[#e2e8f0]/30 dark:border-zinc-800 bg-[#FCFAF7]/50 dark:bg-zinc-950/20 sticky bottom-0 z-10 space-y-2">
          <button 
            onClick={() => onSave(template)} 
            className="w-full py-2 bg-[#0f172a] hover:bg-[#5C5043] text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            <CheckCircle className="w-3.5 h-3.5" /> Save Template
          </button>
          <button 
            onClick={onCancel} 
            className="w-full py-2 bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-700 text-[#0f172a] dark:text-zinc-300 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-[#FCFAF7] transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#FCFAF7]/10 dark:bg-zinc-950/10">
        
        {/* Topbar header */}
        <div className="h-14 border-b border-[#e2e8f0]/40 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md flex items-center justify-between px-4 md:px-6 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 -ml-2 text-[#64748b] hover:bg-[#FCFAF7] rounded-lg cursor-pointer">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-black text-[#0f172a] dark:text-white uppercase tracking-wider text-xs md:text-sm flex items-center gap-2">
              {currentStep.title}
              <span className="hidden sm:inline-block text-[9px] font-black text-[#64748b] bg-[#f8fafc] dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                Step {currentStepIndex + 1} of {STEPS.length}
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <button 
              onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
              disabled={currentStepIndex === 0}
              className={`p-1.5 rounded-lg border flex items-center justify-center transition-colors ${currentStepIndex === 0 ? 'border-zinc-100 dark:border-zinc-850 text-zinc-300 dark:text-zinc-700 cursor-not-allowed' : 'border-[#e2e8f0]/60 dark:border-zinc-700 text-[#64748b] hover:bg-[#FCFAF7] cursor-pointer'}`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setCurrentStepIndex(Math.min(STEPS.length - 1, currentStepIndex + 1))}
              disabled={currentStepIndex === STEPS.length - 1}
              className={`p-1.5 rounded-lg border flex items-center justify-center transition-colors ${currentStepIndex === STEPS.length - 1 ? 'border-zinc-100 dark:border-zinc-850 text-zinc-300 dark:text-zinc-700 cursor-not-allowed' : 'border-[#e2e8f0]/60 dark:border-zinc-700 text-[#64748b] hover:bg-[#FCFAF7] cursor-pointer'}`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Builder Content & Preview Split */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Controls Panel */}
          <div className="w-full md:max-w-sm shrink-0 border-b md:border-b-0 md:border-r border-[#e2e8f0]/40 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 overflow-y-auto p-5 custom-scrollbar h-[45vh] md:h-full">
            {currentStep.id === 'start' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#64748b] mb-1.5 block">Template Name</label>
                  <input type="text" value={template.name} onChange={e => updateTemplate({...template, name: e.target.value})} className="w-full p-2 bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-700 rounded-xl text-xs text-[#0f172a] dark:text-white focus:outline-none focus:border-[#64748b]" />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#64748b] mb-1.5 block">Document Type</label>
                  <div className="relative">
                    <select 
                      value={
                        template.config?.header?.invoiceTitle?.toUpperCase().includes('CREDIT') ? 'Credit Note' :
                        template.config?.header?.invoiceTitle?.toUpperCase().includes('DEBIT') ? 'Debit Note' :
                        template.config?.header?.invoiceTitle?.toUpperCase().includes('QUOTATION') || template.config?.header?.invoiceTitle?.toUpperCase().includes('ESTIMATE') ? 'Quotation / Estimate' :
                        'Invoice'
                      }
                      onChange={e => {
                        const type = e.target.value;
                        let newTitle = template.config?.header?.invoiceTitle || 'TAX INVOICE';
                        if (type === 'Invoice') newTitle = 'TAX INVOICE';
                        if (type === 'Credit Note') newTitle = 'CREDIT NOTE';
                        if (type === 'Debit Note') newTitle = 'DEBIT NOTE';
                        if (type === 'Quotation / Estimate') newTitle = 'QUOTATION / ESTIMATE';
                        
                        updateTemplate({
                          ...template, 
                          config: { 
                            ...template.config, 
                            header: { 
                              ...template.config?.header, 
                              invoiceTitle: newTitle 
                            } 
                          } 
                        });
                      }}
                      className="w-full p-2.5 bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-700 rounded-xl text-xs font-bold text-[#0f172a] dark:text-zinc-200 focus:outline-none focus:border-[#64748b] cursor-pointer"
                    >
                      <option value="Invoice">Invoice</option>
                      <option value="Credit Note">Credit Note</option>
                      <option value="Debit Note">Debit Note</option>
                      <option value="Quotation / Estimate">Quotation / Estimate</option>
                    </select>
                  </div>
                  <p className="text-[10px] text-[#64748b]/80 mt-1">Updates the main header title on generated PDF bills.</p>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#64748b] mb-1.5 block">Description</label>
                  <textarea value={template.description} onChange={e => updateTemplate({...template, description: e.target.value})} className="w-full p-2.5 bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-700 rounded-xl text-xs text-[#0f172a] dark:text-white h-24 focus:outline-none focus:border-[#64748b] resize-none" />
                </div>
              </div>
            )}
            
            {currentStep.id !== 'start' && currentStep.id !== 'canvas' && currentStep.id !== 'preview' && (
              <StepControls 
                 stepId={currentStep.id} 
                 template={template} 
                 updateLayout={(d) => updateTemplate({ ...template, layout: { ...template.layout, ...d } })}
                 updateConfig={updateConfig}
                 updateStyle={updateStyle}
                 updateFullTemplate={updateTemplate}
                 isEditingSystemPreset={initialTemplate != null && initialTemplate.id.startsWith('preset_')}
              />
            )}
            
            {currentStep.id === 'canvas' && (
              <StepCanvas template={template} updateSections={(s) => updateTemplate({ ...template, sections: s })} />
            )}
          </div>

          {/* Right Live Preview Canvas */}
          <div className="flex-1 relative flex flex-col h-full min-h-[70vw] md:min-h-0 overflow-hidden bg-[#FCFAF7]/40 dark:bg-zinc-950/20">
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
                  className="shadow-md bg-white origin-top-left absolute top-0 left-0" 
                  style={{ 
                    width: '794px',
                    minHeight: '1123px',
                    transform: `scale(${previewScale})`,
                    transformOrigin: 'top left',
                    transition: 'transform 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <LivePreview template={template} businessProfile={businessProfile} />
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
      </div>

    </div>
  );
}
