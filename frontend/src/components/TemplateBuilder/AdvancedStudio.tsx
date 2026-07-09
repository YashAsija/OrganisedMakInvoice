import React, { useState, useRef, useEffect } from 'react';
import { InvoiceTemplate, BusinessProfile } from '../../types';
import { Layout, Palette, Settings, Type, FileText, CheckCircle, Smartphone, MousePointer2, Menu, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { LivePreview } from './LivePreview';
import { TEMPLATE_PRESETS } from '../../lib/templatePresets';
import { useTemplateHistory } from '../../hooks/useTemplateHistory';
import { Undo2, Redo2 } from 'lucide-react';
import { StepControls } from './StepControls';
import { StepCanvas } from './StepCanvas';

// Steps placeholder imports (to be implemented)
// import StepLayout from './Steps/StepLayout';
// import StepHeader from './Steps/StepHeader';
// import StepCompany from './Steps/StepCompany';

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
    company: { fields: ['name', 'address', 'gstin', 'email', 'phone'] },
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
    terms: { presetId: 'default', customText: '1. Subject to local jurisdiction.\n2. Goods once sold will not be taken back.' },
    signature: { showSignature: true, showStamp: false, position: 'Right', width: 150, height: 60, signatoryName: 'Authorized Signatory', designation: '' },
    footer: { message: 'Thank you for your business!', thankYouNote: '', supportContact: '', website: '', showPageNumbers: true, showGeneratedBy: true, customText: '' }
  },
  styleConfig: {
    primaryColor: '#4f46e5',
    secondaryColor: '#f1f5f9',
    accentColor: '#10b981',
    fontFamily: 'Inter',
    spacing: 'Normal',
    borderStyle: 'Light',
    roundedCorners: true,
    sectionBackgroundColors: {},
    alternatingRowColors: true,
    tableHeaderBackground: '#4f46e5',
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
  const [previewScale, setPreviewScale] = useState(0.7);const previewContainerRef = useRef<HTMLDivElement>(null);

  
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
        const paddingWidth = 32; // 16px on each side
        const paddingHeight = 32; // 16px top and bottom
        const availableWidth = containerWidth - paddingWidth;
        const availableHeight = containerHeight - paddingHeight;
        
        const targetWidth = template.layout.pageSize === 'A4' ? 794 : 816;
        const targetHeight = template.layout.pageSize === 'A4' ? 1123 : 1056;
        
        const scaleWidth = availableWidth / targetWidth;
        const scaleHeight = availableHeight / targetHeight;
        
        const newScale = Math.min(1, Math.min(scaleWidth, scaleHeight));
        setPreviewScale(newScale);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
    <div className="flex flex-col lg:flex-row h-[calc(100vh-100px)] bg-gradient-to-br from-slate-50 to-slate-100/80 overflow-hidden rounded-2xl border border-white/50 shadow-2xl shadow-slate-200/50 backdrop-blur-xl ring-1 ring-slate-900/5">
            {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar Navigation */}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 shrink-0 bg-white/80 backdrop-blur-md border-r border-slate-200/60 flex-col h-full overflow-y-auto custom-scrollbar transition-transform duration-300 lg:relative lg:translate-x-0 lg:flex ${isMobileMenuOpen ? 'translate-x-0 flex' : '-translate-x-full flex'}`}>
        <div className="p-4 border-b border-slate-100 bg-white/95 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-800 text-sm">Advanced Studio</h2>
            <p className="text-[10px] text-slate-500">Full Control Editor</p>
          </div>
          <div className="flex gap-1">
            <button onClick={undo} disabled={!canUndo} className={`p-1.5 rounded-lg ${canUndo ? 'text-slate-700 hover:bg-slate-200 cursor-pointer' : 'text-slate-300 cursor-not-allowed'}`} title="Undo">
              <Undo2 className="w-4 h-4" />
            </button>
            <button onClick={redo} disabled={!canRedo} className={`p-1.5 rounded-lg ${canRedo ? 'text-slate-700 hover:bg-slate-200 cursor-pointer' : 'text-slate-300 cursor-not-allowed'}`} title="Redo">
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 py-2 custom-scrollbar">
          {Object.entries({
            'General & Layout': ['start', 'layout'],
            'Data Sections': ['header', 'company', 'invoiceInfo', 'client', 'shipping', 'transport'],
            'Financials': ['table', 'tax', 'payment', 'amountInWords'],
            'Footer': ['terms', 'signature', 'footer'],
            'Advanced Design': ['design', 'canvas']
          }).map(([groupName, stepIds]) => (
            <div key={groupName} className="mb-4">
              <div className="px-4 py-1 text-[10px] font-bold text-indigo-400/80 uppercase tracking-widest">{groupName}</div>
              {stepIds.map(id => {
                const step = STEPS.find(s => s.id === id);
                if (!step) return null;
                const idx = STEPS.indexOf(step);
                const isActive = currentStepIndex === idx;
                const Icon = step.icon;
                return (
                  <button
                    key={step.id}
                    onClick={() => { setCurrentStepIndex(idx); setIsMobileMenuOpen(false); }}
                    className={`group w-full text-left px-4 py-2 text-xs flex items-center gap-3 transition-colors ${isActive ? 'bg-gradient-to-r from-sky-50 to-transparent text-sky-700 font-bold border-r-4 border-sky-600 shadow-[inset_2px_0_10px_rgba(14,165,233,0.05)]' : 'text-slate-600 hover:bg-slate-100 hover:text-indigo-700'}`}
                  >
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center ${isActive ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    {step.title}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 bg-white/95 backdrop-blur-sm sticky bottom-0 z-10">
          <button onClick={() => onSave(template)} className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors mb-2">
            Save Template
          </button>
          <button onClick={onCancel} className="w-full py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors">
            Cancel
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Topbar */}
        <div className="h-14 border-b border-slate-200/60 bg-white/60 backdrop-blur-md flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-slate-800 flex items-center gap-2 text-sm md:text-base">
              {currentStep.title}
              <span className="hidden sm:inline-block text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Step {currentStepIndex + 1} of {STEPS.length}</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 lg:hidden">
            <button 
              onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
              disabled={currentStepIndex === 0}
              className={`p-1.5 rounded-lg border flex items-center justify-center transition-colors ${currentStepIndex === 0 ? 'border-slate-100 text-slate-300 cursor-not-allowed' : 'border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setCurrentStepIndex(Math.min(STEPS.length - 1, currentStepIndex + 1))}
              disabled={currentStepIndex === STEPS.length - 1}
              className={`p-1.5 rounded-lg border flex items-center justify-center transition-colors ${currentStepIndex === STEPS.length - 1 ? 'border-slate-100 text-slate-300 cursor-not-allowed' : 'border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Builder Content & Preview Split */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Controls Panel */}
          <div className="w-full md:max-w-sm shrink-0 border-b md:border-b-0 md:border-r border-slate-200 bg-white/90 backdrop-blur-sm overflow-y-auto p-6 custom-scrollbar h-[40vh] md:h-full">
            {currentStep.id === 'start' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Template Name</label>
                  <input type="text" value={template.name} onChange={e => updateTemplate({...template, name: e.target.value})} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Document Type</label>
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
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-indigo-500"
                  >
                    <option value="Invoice">Invoice</option>
                    <option value="Credit Note">Credit Note</option>
                    <option value="Debit Note">Debit Note</option>
                    <option value="Quotation / Estimate">Quotation / Estimate</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">Changes the main title shown on the document.</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Description</label>
                  <textarea value={template.description} onChange={e => updateTemplate({...template, description: e.target.value})} className="w-full p-2 border border-slate-200 rounded-lg text-sm h-24" />
                </div>
              </div>
            )}
            
            {/* TODO: Add specific control forms for layout, header, company, etc. */}
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

          <div className="flex-1 relative flex flex-col h-full overflow-hidden">
            <div ref={previewContainerRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUpOrLeave} onMouseLeave={handleMouseUpOrLeave} style={{ cursor: isDragging ? "grabbing" : "grab" }} className="w-full h-full bg-slate-100/30 p-2 md:p-8 inset-[box-shadow] overflow-auto custom-scrollbar relative">
              <div style={{ width: 794 * previewScale, height: 1123 * previewScale, transition: 'all 0.2s ease' }} className="shrink-0 mx-auto relative">
                <div 
                  className="shadow-xl bg-white origin-top-left absolute top-0 left-0" 
                  style={{ 
                    width: '794px',
                    minHeight: '1123px',
                    transform: `scale(${previewScale})`, 
                    transition: 'transform 0.2s ease',
                  }}
                >
                  <LivePreview template={template} businessProfile={businessProfile} />
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
      </div>
    </div>
  );
}
