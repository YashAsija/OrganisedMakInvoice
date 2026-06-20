import React, { useState, useRef, useEffect } from 'react';
import { InvoiceTemplate } from '../../types';
import { Layout, Palette, Settings, Type, FileText, CheckCircle, Smartphone, MousePointer2 } from 'lucide-react';
import { LivePreview } from './LivePreview';
import { StepControls } from './StepControls';
import { StepCanvas } from './StepCanvas';

// Steps placeholder imports (to be implemented)
// import StepLayout from './Steps/StepLayout';
// import StepHeader from './Steps/StepHeader';
// import StepCompany from './Steps/StepCompany';

interface TemplateBuilderProps {
  initialTemplate?: InvoiceTemplate | null;
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
  { id: 'amountInWords', title: 'Amount in Words', icon: Type },
  { id: 'terms', title: 'Terms', icon: FileText },
  { id: 'signature', title: 'Signature', icon: Settings },
  { id: 'footer', title: 'Footer', icon: Layout },
  { id: 'design', title: 'Design System', icon: Palette },
  { id: 'canvas', title: 'Drag & Drop Canvas', icon: MousePointer2 },
  { id: 'preview', title: 'Live Preview', icon: Smartphone }
];

export default function TemplateBuilder({ initialTemplate, onSave, onCancel }: TemplateBuilderProps) {
  const [template, setTemplate] = useState<InvoiceTemplate>(initialTemplate || defaultTemplate);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [previewScale, setPreviewScale] = useState(0.7);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (previewContainerRef.current) {
        const containerWidth = previewContainerRef.current.clientWidth;
        const padding = 64; // 32px padding on each side
        const availableWidth = containerWidth - padding;
        const targetWidth = template.layout.pageSize === 'A4' ? 794 : 816;
        
        const newScale = Math.min(1, availableWidth / targetWidth);
        setPreviewScale(newScale);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [template.layout.pageSize]);


  const updateConfig = (section: keyof InvoiceTemplate['config'], data: any) => {
    setTemplate(prev => ({
      ...prev,
      config: { ...prev.config, [section]: { ...prev.config[section], ...data } }
    }));
  };

  const updateStyle = (data: any) => {
    setTemplate(prev => ({
      ...prev,
      styleConfig: { ...prev.styleConfig, ...data }
    }));
  };

  const currentStep = STEPS[currentStepIndex];

  return (
    <div className="flex h-[calc(100vh-100px)] bg-slate-50 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-full overflow-y-auto custom-scrollbar">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 sticky top-0 z-10">
          <h2 className="font-bold text-slate-800 text-sm">Template Builder</h2>
          <p className="text-[10px] text-slate-500">20-Step Advanced Editor</p>
        </div>
        <div className="flex-1 py-2">
          {STEPS.map((step, idx) => {
            const isActive = currentStepIndex === idx;
            const Icon = step.icon;
            return (
              <button
                key={step.id}
                onClick={() => setCurrentStepIndex(idx)}
                className={`w-full text-left px-4 py-2 text-xs flex items-center gap-3 transition-colors ${isActive ? 'bg-indigo-50 text-indigo-600 font-bold border-r-2 border-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center ${isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                {idx + 1}. {step.title}
              </button>
            );
          })}
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 sticky bottom-0">
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
        <div className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="font-bold text-slate-800 flex items-center gap-2">
              {currentStep.title}
              <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Step {currentStepIndex + 1} of {STEPS.length}</span>
            </h1>
          </div>
        </div>

        {/* Builder Content & Preview Split */}
        <div className="flex-1 flex overflow-hidden">
          {/* Controls Panel */}
          <div className="flex-1 max-w-sm border-r border-slate-200 bg-white overflow-y-auto p-6 custom-scrollbar">
            {currentStep.id === 'start' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Template Name</label>
                  <input type="text" value={template.name} onChange={e => setTemplate({...template, name: e.target.value})} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Category</label>
                  <select value={template.category} onChange={e => setTemplate({...template, category: e.target.value as any})} className="w-full p-2 border border-slate-200 rounded-lg text-sm">
                    <option value="User">User</option>
                    <option value="GST">GST</option>
                    <option value="Service">Service</option>
                    <option value="Retail">Retail</option>
                    <option value="Default">Default</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Description</label>
                  <textarea value={template.description} onChange={e => setTemplate({...template, description: e.target.value})} className="w-full p-2 border border-slate-200 rounded-lg text-sm h-24" />
                </div>
              </div>
            )}
            
            {/* TODO: Add specific control forms for layout, header, company, etc. */}
            {currentStep.id !== 'start' && currentStep.id !== 'canvas' && currentStep.id !== 'preview' && (
              <StepControls 
                 stepId={currentStep.id} 
                 template={template} 
                 updateLayout={(d) => setTemplate(p => ({ ...p, layout: { ...p.layout, ...d } }))}
                 updateConfig={updateConfig}
                 updateStyle={updateStyle}
              />
            )}
            
            {currentStep.id === 'canvas' && (
              <StepCanvas template={template} updateSections={(s) => setTemplate(p => ({ ...p, sections: s }))} />
            )}
          </div>

                    {/* Live Preview Panel */}
          <div ref={previewContainerRef} className="flex-1 bg-slate-100/50 p-4 md:p-8 overflow-auto flex justify-center items-start custom-scrollbar relative">
             <div 
               className="shadow-xl bg-white origin-top" 
               style={{ 
                 transform: `scale(${previewScale})`, 
                 transformOrigin: 'top center',
                 transition: 'transform 0.2s ease',
                 marginBottom: `${(1 - previewScale) * -1123}px` // Compensate for scaled height so scrollbar is correct
               }}
             >
                <LivePreview template={template} />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
