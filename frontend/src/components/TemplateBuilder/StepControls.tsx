import React from 'react';
import { InvoiceTemplate } from '../../types';

interface StepControlsProps {
  stepId: string;
  template: InvoiceTemplate;
  updateLayout: (data: any) => void;
  updateConfig: (section: keyof InvoiceTemplate['config'], data: any) => void;
  updateStyle: (data: any) => void;
}

export const StepControls: React.FC<StepControlsProps> = ({ stepId, template, updateLayout, updateConfig, updateStyle }) => {
  const { layout, config, styleConfig } = template;

  if (stepId === 'layout') {
    return (
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-700 mb-1 block">Layout Type</label>
          <select value={layout.type} onChange={e => updateLayout({ type: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg text-sm">
            {['Classic', 'Modern', 'Minimal', 'Corporate', 'GST Standard', 'Retail', 'Fully Custom'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700 mb-1 block">Page Size</label>
          <select value={layout.pageSize} onChange={e => updateLayout({ pageSize: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg text-sm">
            <option value="A4">A4</option>
            <option value="Letter">Letter</option>
          </select>
        </div>
        <div>
           <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-1">
              <input type="checkbox" checked={layout.watermark.enabled} onChange={e => updateLayout({ watermark: { ...layout.watermark, enabled: e.target.checked } })} />
              Enable Watermark
           </label>
           {layout.watermark.enabled && (
              <div className="pl-6 mt-2 space-y-2">
                 <input type="text" value={layout.watermark.text} onChange={e => updateLayout({ watermark: { ...layout.watermark, text: e.target.value } })} className="w-full p-2 border border-slate-200 rounded-lg text-sm" placeholder="Watermark Text" />
                 <input type="number" min="0" max="1" step="0.1" value={layout.watermark.opacity} onChange={e => updateLayout({ watermark: { ...layout.watermark, opacity: parseFloat(e.target.value) } })} className="w-full p-2 border border-slate-200 rounded-lg text-sm" placeholder="Opacity (0.1 to 1)" />
              </div>
           )}
        </div>
      </div>
    );
  }

  if (stepId === 'header') {
    return (
      <div className="space-y-4">
        <div>
           <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-1">
              <input type="checkbox" checked={config.header.showLogo} onChange={e => updateConfig('header', { showLogo: e.target.checked })} />
              Show Logo
           </label>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700 mb-1 block">Logo Position</label>
          <select value={config.header.logoPosition} onChange={e => updateConfig('header', { logoPosition: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg text-sm">
            {['Left', 'Center', 'Right'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700 mb-1 block">Logo Width (px)</label>
          <input type="number" value={config.header.logoWidth} onChange={e => updateConfig('header', { logoWidth: parseInt(e.target.value) || 120 })} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700 mb-1 block">Invoice Title</label>
          <input type="text" value={config.header.invoiceTitle} onChange={e => updateConfig('header', { invoiceTitle: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700 mb-1 block">Title Alignment</label>
          <select value={config.header.titleAlignment} onChange={e => updateConfig('header', { titleAlignment: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg text-sm">
            {['Left', 'Center', 'Right'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
    );
  }

  if (stepId === 'company') {
    return (
      <div className="space-y-4">
        <p className="text-xs text-slate-500 mb-2">Select the fields to display from your Company Settings.</p>
        {['name', 'address', 'gstin', 'pan', 'phone', 'email', 'website'].map(field => (
           <label key={field} className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-1">
              <input type="checkbox" checked={config.company.fields.includes(field)} onChange={e => {
                 const newFields = e.target.checked ? [...config.company.fields, field] : config.company.fields.filter(f => f !== field);
                 updateConfig('company', { fields: newFields });
              }} />
              Show {field.toUpperCase()}
           </label>
        ))}
      </div>
    );
  }

  if (stepId === 'invoiceInfo') {
    return (
      <div className="space-y-4">
        <p className="text-xs text-slate-500 mb-2">Select invoice meta fields to display.</p>
        {['invoiceNumber', 'invoiceDate', 'dueDate', 'poNumber', 'deliveryNote'].map(field => (
           <label key={field} className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-1">
              <input type="checkbox" checked={config.invoiceInfo.fields.includes(field)} onChange={e => {
                 const newFields = e.target.checked ? [...config.invoiceInfo.fields, field] : config.invoiceInfo.fields.filter(f => f !== field);
                 updateConfig('invoiceInfo', { fields: newFields });
              }} />
              Show {field}
           </label>
        ))}
        <div>
          <label className="text-xs font-bold text-slate-700 mb-1 block">Block Alignment</label>
          <select value={config.invoiceInfo.position} onChange={e => updateConfig('invoiceInfo', { position: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg text-sm">
            {['Left', 'Center', 'Right'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
    );
  }

  if (stepId === 'client') {
    return (
      <div className="space-y-4">
        <p className="text-xs text-slate-500 mb-2">Select fields to display for Bill To section.</p>
        {['name', 'address', 'gstin', 'pan', 'phone', 'email'].map(field => (
           <label key={field} className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-1">
              <input type="checkbox" checked={config.client.fields.includes(field)} onChange={e => {
                 const newFields = e.target.checked ? [...config.client.fields, field] : config.client.fields.filter(f => f !== field);
                 updateConfig('client', { fields: newFields });
              }} />
              Show {field.toUpperCase()}
           </label>
        ))}
      </div>
    );
  }

  if (stepId === 'shipping') {
    return (
      <div className="space-y-4">
         <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-4">
            <input type="checkbox" checked={config.shipping.sameAsBilling} onChange={e => updateConfig('shipping', { sameAsBilling: e.target.checked })} />
            Same as Billing (Collapse section if true)
         </label>
        {!config.shipping.sameAsBilling && ['name', 'address', 'gstin', 'phone'].map(field => (
           <label key={field} className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-1">
              <input type="checkbox" checked={config.shipping.fields.includes(field)} onChange={e => {
                 const newFields = e.target.checked ? [...config.shipping.fields, field] : config.shipping.fields.filter(f => f !== field);
                 updateConfig('shipping', { fields: newFields });
              }} />
              Show {field.toUpperCase()}
           </label>
        ))}
      </div>
    );
  }

  if (stepId === 'table') {
    return (
      <div className="space-y-4">
        <p className="text-xs text-slate-500 mb-2">Manage columns for your product table.</p>
        <div className="space-y-2 border border-slate-200 rounded-lg p-2 bg-slate-50">
           {config.table.columns.sort((a,b) => a.order - b.order).map(col => (
             <div key={col.id} className="flex items-center gap-2 bg-white p-2 rounded border border-slate-100">
               <input type="checkbox" checked={col.visible} onChange={e => {
                 const newCols = config.table.columns.map(c => c.id === col.id ? { ...c, visible: e.target.checked } : c);
                 updateConfig('table', { columns: newCols });
               }} />
               <input type="text" value={col.label} onChange={e => {
                 const newCols = config.table.columns.map(c => c.id === col.id ? { ...c, label: e.target.value } : c);
                 updateConfig('table', { columns: newCols });
               }} className="flex-1 text-xs p-1 border border-slate-200 rounded" />
               <span className="text-[10px] text-slate-400 bg-slate-100 px-1 rounded">{col.type}</span>
             </div>
           ))}
        </div>
      </div>
    );
  }

  if (stepId === 'tax') {
    return (
      <div className="space-y-4">
        <p className="text-xs text-slate-500 mb-2">Configure tax breakdown and GST summary.</p>
        {[
          { id: 'showTaxableAmount', label: 'Show Taxable Amount' },
          { id: 'showCgstSgst', label: 'Show CGST & SGST (If Local)' },
          { id: 'showIgst', label: 'Show IGST (If Interstate)' },
          { id: 'showTotal', label: 'Show Grand Total' },
          { id: 'enableTaxBreakdown', label: 'Enable Breakdown Block' }
        ].map(opt => (
           <label key={opt.id} className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-1">
              <input type="checkbox" checked={(config.tax as any)[opt.id]} onChange={e => {
                 updateConfig('tax', { [opt.id]: e.target.checked });
              }} />
              {opt.label}
           </label>
        ))}
      </div>
    );
  }

  if (stepId === 'payment') {
    return (
      <div className="space-y-4">
        <div>
           <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-1">
              <input type="checkbox" checked={config.payment.generateQrCode} onChange={e => updateConfig('payment', { generateQrCode: e.target.checked })} />
              Generate QR Code for UPI automatically
           </label>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700 mb-1 block">Custom Payment Note</label>
          <textarea value={config.payment.customNote} onChange={e => updateConfig('payment', { customNote: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg text-sm h-20" />
        </div>
      </div>
    );
  }
  
  if (stepId === 'design') {
    return (
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-700 mb-1 block">Primary Color</label>
          <div className="flex gap-2">
            <input type="color" value={styleConfig.primaryColor} onChange={e => updateStyle({ primaryColor: e.target.value })} className="w-10 h-10 p-1 border border-slate-200 rounded" />
            <input type="text" value={styleConfig.primaryColor} onChange={e => updateStyle({ primaryColor: e.target.value })} className="flex-1 p-2 border border-slate-200 rounded-lg text-sm font-mono" />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700 mb-1 block">Table Header Background</label>
          <div className="flex gap-2">
            <input type="color" value={styleConfig.tableHeaderBackground} onChange={e => updateStyle({ tableHeaderBackground: e.target.value })} className="w-10 h-10 p-1 border border-slate-200 rounded" />
            <input type="text" value={styleConfig.tableHeaderBackground} onChange={e => updateStyle({ tableHeaderBackground: e.target.value })} className="flex-1 p-2 border border-slate-200 rounded-lg text-sm font-mono" />
          </div>
        </div>
        <div>
           <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-1">
              <input type="checkbox" checked={styleConfig.roundedCorners} onChange={e => updateStyle({ roundedCorners: e.target.checked })} />
              Use Rounded Corners
           </label>
        </div>
        <div>
           <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-1">
              <input type="checkbox" checked={styleConfig.alternatingRowColors} onChange={e => updateStyle({ alternatingRowColors: e.target.checked })} />
              Alternating Table Row Colors
           </label>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-12 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
      Config controls for {stepId} are handled contextually.
    </div>
  );
};
