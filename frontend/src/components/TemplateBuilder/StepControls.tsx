import React from 'react';
import { InvoiceTemplate } from '../../types';
import { TEMPLATE_PRESETS, ensureAllColumns } from '../../lib/templatePresets';

interface StepControlsProps {
  stepId: string;
  template: InvoiceTemplate;
  updateLayout: (data: any) => void;
  updateConfig: (section: keyof InvoiceTemplate['config'], data: any) => void;
  updateStyle: (data: any) => void;
  updateFullTemplate?: (template: InvoiceTemplate) => void;
  isEditingSystemPreset?: boolean;
}

export const StepControls: React.FC<StepControlsProps> = ({ stepId, template, updateLayout, updateConfig, updateStyle, updateFullTemplate, isEditingSystemPreset }) => {
  const { layout, config, styleConfig } = template;

  if (stepId === 'layout') {
    return (
      <div className="space-y-4">
        {!isEditingSystemPreset && (
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1 block">Category Theme Preset</label>
            <select value={template.category} onChange={e => {
               const newCat = e.target.value as any;
               if (!updateFullTemplate) return;
               const newTemplate = {...template, category: newCat};
               const preset = TEMPLATE_PRESETS.find(p => p.category === newCat);
               if (preset) {
                   newTemplate.sections = JSON.parse(JSON.stringify(preset.sections));
                   newTemplate.config = JSON.parse(JSON.stringify(preset.config));
                   newTemplate.styleConfig = JSON.parse(JSON.stringify(preset.styleConfig));
                   newTemplate.layout = JSON.parse(JSON.stringify(preset.layout));
               }
               updateFullTemplate(newTemplate);
            }} className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-indigo-50 border-indigo-100 text-indigo-900 focus:ring-indigo-500">
              <option value="User">User Custom</option>
              <option value="GST">GST Standard</option>
              <option value="Service">Service</option>
              <option value="Retail">Retail</option>
              <option value="Default">Default Standard</option>
            </select>
            <p className="text-[10px] text-slate-500 mt-1">Warning: Changing category will reset all fields and sections to match the preset theme.</p>
          </div>
        )}
        {!isEditingSystemPreset && (
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1 block">Layout Type</label>
            <select value={layout.type} onChange={e => {
               const newType = e.target.value as any;
               if (!updateFullTemplate) {
                   updateLayout({ type: newType });
                   return;
               }
               const newTemplate = JSON.parse(JSON.stringify(template));
               newTemplate.layout.type = newType;
               
               // Reset all layout-driven attributes to a clean baseline
               newTemplate.styleConfig.spacing = 'Standard';
               newTemplate.styleConfig.borderStyle = 'Light';
               newTemplate.styleConfig.roundedCorners = true;
               newTemplate.styleConfig.fontFamily = 'Inter';
               newTemplate.styleConfig.tableHeaderBackground = newTemplate.styleConfig.primaryColor || '#4f46e5';
               newTemplate.styleConfig.tableHeaderTextColor = '#ffffff';
               newTemplate.styleConfig.sectionBackgroundColors = {};

               // Apply unique attributes per layout type
               if (newType === 'Corporate') {
                  newTemplate.styleConfig.borderStyle = 'Heavy';
                  newTemplate.styleConfig.roundedCorners = false;
                  newTemplate.styleConfig.fontFamily = 'Roboto';
                  newTemplate.styleConfig.tableHeaderBackground = '#1e3a8a';
               } else if (newType === 'Minimal') {
                  newTemplate.styleConfig.borderStyle = 'None';
                  newTemplate.styleConfig.tableHeaderBackground = '#f8fafc';
                  newTemplate.styleConfig.tableHeaderTextColor = '#0f172a';
               } else if (newType === 'Modern') {
                  newTemplate.styleConfig.fontFamily = 'Outfit';
                  newTemplate.styleConfig.sectionBackgroundColors = { header: newTemplate.styleConfig.primaryColor || '#4f46e5' };
               } else if (newType === 'Retail') {
                  newTemplate.styleConfig.spacing = 'Compact';
                  newTemplate.styleConfig.borderStyle = 'None';
                  newTemplate.styleConfig.roundedCorners = false;
               } else if (newType === 'Fully Custom') {
                  // Allow user to define everything manually without enforcing preset constraints
               }
               
               updateFullTemplate(newTemplate);
            }} className="w-full p-2 border border-slate-200 rounded-lg text-sm">
              {['Classic', 'Modern', 'Minimal', 'Corporate', 'GST Standard', 'Retail', 'Modal Classic', 'Fully Custom'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}
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
          <select value={config.header.logoPosition} onChange={e => {
            const newPos = e.target.value as 'Left'|'Center'|'Right';
            let titleAlign = config.header.titleAlignment;
            if (newPos === 'Left') titleAlign = 'Right';
            if (newPos === 'Right') titleAlign = 'Left';
            updateConfig('header', { logoPosition: newPos, titleAlignment: titleAlign });
          }} className="w-full p-2 border border-slate-200 rounded-lg text-sm">
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
    const companyFieldOptions = [
      { id: 'name',    label: 'NAME' },
      { id: 'owner',   label: 'OWNER / CONTACT PERSON' },
      { id: 'email',   label: 'EMAIL' },
      { id: 'phone',   label: 'PHONE' },
      { id: 'address', label: 'ADDRESS' },
      { id: 'state',   label: 'STATE' },
      { id: 'country', label: 'COUNTRY' },
      { id: 'gstin',   label: 'GSTIN' },
      { id: 'pan',     label: 'PAN' },
      { id: 'website', label: 'WEBSITE' },
    ];
    return (
      <div className="space-y-4">
        <p className="text-xs text-slate-500 mb-2">Select the fields to display from your Company Settings.</p>
        {companyFieldOptions.map(({ id, label }) => (
           <label key={id} className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-1">
              <input type="checkbox" checked={config.company.fields.includes(id)} onChange={e => {
                 const newFields = e.target.checked ? [...config.company.fields, id] : config.company.fields.filter(f => f !== id);
                 updateConfig('company', { fields: newFields });
              }} />
              Show {label}
           </label>
        ))}
      </div>
    );
  }

  if (stepId === 'invoiceInfo') {
    const invoiceInfoFieldOptions = [
      { id: 'invoiceNumber',   label: 'Invoice No.' },
      { id: 'invoiceDate',     label: 'Dated' },
      { id: 'dueDate',         label: 'Due Date' },
      { id: 'placeOfSupply',   label: 'Place of Supply' },
      { id: 'grRrNo',          label: 'GR/RR No.' },
      { id: 'referenceNumber', label: 'Ref. No.' },
      { id: 'poNumber',        label: 'PO Number' },
      { id: 'deliveryNote',    label: 'Delivery Note' },
    ];
    return (
      <div className="space-y-4">
        <p className="text-xs text-slate-500 mb-2">Select invoice meta fields to display.</p>
        {invoiceInfoFieldOptions.map(({ id, label }) => (
           <label key={id} className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-1">
              <input type="checkbox" checked={config.invoiceInfo.fields.includes(id)} onChange={e => {
                 const newFields = e.target.checked ? [...config.invoiceInfo.fields, id] : config.invoiceInfo.fields.filter(f => f !== id);
                 updateConfig('invoiceInfo', { fields: newFields });
              }} />
              Show {label}
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
        <p className="text-xs text-slate-500 mb-2">Select fields to display for Ship To section.</p>
        {['name', 'address', 'gstin', 'pan', 'phone', 'email'].map(field => (
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
           {ensureAllColumns(config.table.columns).map(col => (
             <div key={col.id} className="flex items-center gap-2 bg-white p-2 rounded border border-slate-100">
               <input 
                 type="checkbox" 
                 checked={['name', 'qty', 'rate', 'amount'].includes(col.id) ? true : col.visible} 
                 disabled={['name', 'qty', 'rate', 'amount'].includes(col.id)}
                 onChange={e => {
                   if (['name', 'qty', 'rate', 'amount'].includes(col.id)) return;
                   const allCols = ensureAllColumns(config.table.columns);
                   const newCols = allCols.map(c => c.id === col.id ? { ...c, visible: e.target.checked } : c);
                   updateConfig('table', { columns: newCols });
                 }} 
               />
               <input type="text" value={col.label} onChange={e => {
                 const allCols = ensureAllColumns(config.table.columns);
                 const newCols = allCols.map(c => c.id === col.id ? { ...c, label: e.target.value } : c);
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

  if (stepId === 'transport') {
    const transportFieldOptions = [
      { id: 'vehicleNo',    label: 'Vehicle No' },
      { id: 'driverMobile', label: 'Driver Mobile' },
      { id: 'ewayBillNo',   label: 'E-Way Bill No' },
      { id: 'transport',    label: 'Transport Name' },
      { id: 'station',      label: 'Station' },
      { id: 'grRrNo',       label: 'GR/RR No.' },
    ];
    return (
      <div className="space-y-4">
        <p className="text-xs text-slate-500 mb-2">Select fields to display for Transport section.</p>
        {transportFieldOptions.map(({ id, label }) => (
           <label key={id} className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-1">
              <input type="checkbox" checked={config.transport.fields.includes(id)} onChange={e => {
                 const newFields = e.target.checked ? [...config.transport.fields, id] : config.transport.fields.filter(f => f !== id);
                 updateConfig('transport', { fields: newFields });
              }} />
              Show {label}
           </label>
        ))}
      </div>
    );
  }

  if (stepId === 'amountInWords') {
    return (
      <div className="space-y-4">
        <div>
           <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-1">
              <input type="checkbox" checked={config.amountInWords.enabled} onChange={e => updateConfig('amountInWords', { enabled: e.target.checked })} />
              Enable Amount in Words
           </label>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700 mb-1 block">Format</label>
          <select value={config.amountInWords.format} onChange={e => updateConfig('amountInWords', { format: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg text-sm">
            {['Indian', 'International'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
    );
  }

  if (stepId === 'terms') {
    return (
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-700 mb-1 block">Terms & Conditions</label>
          <textarea value={config.terms.customText} onChange={e => updateConfig('terms', { customText: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg text-sm h-32" />
        </div>
      </div>
    );
  }

  if (stepId === 'signature') {
    return (
      <div className="space-y-4">
        <div>
           <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-1">
              <input type="checkbox" checked={config.signature.showSignature} onChange={e => updateConfig('signature', { showSignature: e.target.checked })} />
              Show Signature Block
           </label>
        </div>
        <div>
           <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-1">
              <input type="checkbox" checked={config.signature.showStamp} onChange={e => updateConfig('signature', { showStamp: e.target.checked })} />
              Show Stamp Area
           </label>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700 mb-1 block">Signatory Name</label>
          <input type="text" value={config.signature.signatoryName} onChange={e => updateConfig('signature', { signatoryName: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700 mb-1 block">Designation</label>
          <input type="text" value={config.signature.designation} onChange={e => updateConfig('signature', { designation: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
        </div>
      </div>
    );
  }

  if (stepId === 'footer') {
    return (
      <div className="space-y-4">
        <div>
           <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-1">
              <input type="checkbox" checked={config.footer.showPageNumbers} onChange={e => updateConfig('footer', { showPageNumbers: e.target.checked })} />
              Show Page Numbers
           </label>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700 mb-1 block">Footer Message</label>
          <input type="text" value={config.footer.message} onChange={e => updateConfig('footer', { message: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-700">Contact / Website</label>
            <button 
              type="button"
              onClick={() => updateConfig('footer', { supportContact: '', website: '' })} 
              className="text-[10px] text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded transition-colors"
            >
              Remove
            </button>
          </div>
          <input type="text" value={config.footer.supportContact} onChange={e => updateConfig('footer', { supportContact: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg text-sm" placeholder="contact@example.com / www.example.com" />
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
