import React, { useState, useEffect, useRef } from 'react';
import { Plus, LayoutTemplate, FileText, Check, Trash2, Edit2, Copy, Download, Upload, Search, Filter, ChevronDown } from 'lucide-react';
import { InvoiceTemplate, BusinessProfile } from '../types';
import { LivePreview } from './TemplateBuilder/LivePreview';
import { exportInvoicePDFAsync } from '../lib/pdfExporter';

import TemplateCreationHub from './TemplateBuilder/TemplateCreationHub';
import { TEMPLATE_PRESETS } from '../lib/templatePresets';

export default function TemplateManager({ businessProfile }: { businessProfile?: BusinessProfile }) {
  const [templates, setTemplates] = useState<InvoiceTemplate[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('makbills_custom_templates');
      if (saved) {
        try {
          let parsed = JSON.parse(saved) as InvoiceTemplate[];
          let changed = false;
          parsed = parsed.map(t => {
            let newName = t.name.replace(/MakBills/g, 'MakInvoices');
            // Clean up any corrupted names like "MakInvoicessss" and prevent future duplication
            newName = newName.replace(/MakInvoices*/g, 'MakInvoices');
            if (newName !== t.name) {
              changed = true;
              return { ...t, name: newName };
            }
            return t;
          });
          if (changed) {
            localStorage.setItem('makbills_custom_templates', JSON.stringify(parsed));
          }
          return parsed;
        } catch (e) {
          console.error("Failed to parse templates", e);
        }
      }
    }
    return [];
  });
  
  const [globalDefaultId, setGlobalDefaultId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const savedGlobalDefault = localStorage.getItem('makbills_global_default_template');
      if (savedGlobalDefault) return savedGlobalDefault;
      
      const saved = localStorage.getItem('makbills_custom_templates');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const customDefault = parsed.find((t: InvoiceTemplate) => t.isDefault);
          if (customDefault) return customDefault.id;
        } catch (e) {}
      }
    }
    return 'preset_modal_classic';
  });
  
  const [isBuilding, setIsBuilding] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<InvoiceTemplate | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [activeLibraryTab, setActiveLibraryTab] = useState<'my_templates' | 'system'>('my_templates');
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'detailed' | 'less_detailed'>('latest');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const allTemplates = [...templates, ...TEMPLATE_PRESETS];
    if (!allTemplates.some(t => t.id === globalDefaultId)) {
      let newDefaultId = 'preset_modal_classic';
      if (templates.length > 0) {
        newDefaultId = templates[templates.length - 1].id;
        
        const updated = templates.map(t => ({
          ...t,
          isDefault: t.id === newDefaultId
        }));
        setTemplates(updated);
        localStorage.setItem('makbills_custom_templates', JSON.stringify(updated));
      }
      setGlobalDefaultId(newDefaultId);
      localStorage.setItem('makbills_global_default_template', newDefaultId);
    }
  }, [templates, globalDefaultId]);

  const handleSaveTemplate = (template: InvoiceTemplate) => {
    const exists = templates.some(t => t.id === template.id);
    let updated = templates;
    
    const finalTemplate = { ...template, updatedAt: Date.now() };
    if (finalTemplate.isDefault) {
      setGlobalDefaultId(finalTemplate.id);
      localStorage.setItem('makbills_global_default_template', finalTemplate.id);
      updated = templates.map(t => ({ ...t, isDefault: false }));
    }

    if (exists) {
      updated = [finalTemplate, ...updated.filter(t => t.id !== finalTemplate.id)];
    } else {
      updated = [finalTemplate, ...updated];
    }
    
    setTemplates(updated);
    localStorage.setItem('makbills_custom_templates', JSON.stringify(updated));
    setIsBuilding(false);
    setEditingTemplate(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this custom template?')) {
      const updated = templates.filter(t => t.id !== id);
      
      if (id === globalDefaultId) {
        let newDefaultId = 'preset_modal_classic';
        if (updated.length > 0) {
          const newDefault = updated[updated.length - 1];
          newDefaultId = newDefault.id;
          const markedUpdated = updated.map(t => ({
            ...t,
            isDefault: t.id === newDefaultId
          }));
          setTemplates(markedUpdated);
          localStorage.setItem('makbills_custom_templates', JSON.stringify(markedUpdated));
        } else {
          setTemplates(updated);
          localStorage.setItem('makbills_custom_templates', JSON.stringify(updated));
        }
        setGlobalDefaultId(newDefaultId);
        localStorage.setItem('makbills_global_default_template', newDefaultId);
      } else {
        setTemplates(updated);
        localStorage.setItem('makbills_custom_templates', JSON.stringify(updated));
      }
    }
  };

  const handleSetDefault = (id: string) => {
    setGlobalDefaultId(id);
    localStorage.setItem('makbills_global_default_template', id);

    const updated = templates.map(t => ({
      ...t,
      isDefault: t.id === id
    }));
    setTemplates(updated);
    localStorage.setItem('makbills_custom_templates', JSON.stringify(updated));
  };
  
  const handleDuplicate = (template: InvoiceTemplate) => {
    const dupe = {
      ...template,
      id: `tmpl_${Math.random().toString(36).substr(2, 9)}`,
      name: `${template.name} (Copy)`,
      isDefault: false,
      updatedAt: Date.now()
    };
    const updated = [dupe, ...templates];
    setTemplates(updated);
    localStorage.setItem('makbills_custom_templates', JSON.stringify(updated));
  };
  
  const handleExportPDF = async (template: InvoiceTemplate) => {
    const mockProfile = {
      name: 'Shiv Hardware',
      address: '123 Business Block, Main Street, New Delhi, India',
      gstin: '07AAAAA1111A1Z1',
      phone: '+91 9899728185',
      email: 'contact@shivhardware.com',
      website: 'www.shivhardware.com',
      currency: 'INR'
    };

    const mockInvoice = {
      id: 'mock_inv',
      invoiceNumber: 'INV-2023-001',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split('T')[0],
      clientName: 'Sameer Enterprises',
      clientAddress: 'Plot No. 45, Phase 3, Okhla Industrial Area, New Delhi',
      clientCountry: 'India',
      clientState: 'N/A',
      clientPhone: '+91 9999988888',
      clientEmail: 'sameer@enterprises.com',
      items: [
        { id: 'item-1', description: 'Premium Steel Screws', hsn: '7318', quantity: 150, rate: 2.50, taxPercentage: 18, amount: 375.00 },
        { id: 'item-2', description: 'Heavy Duty Wall Anchors', hsn: '3926', quantity: 200, rate: 1.20, taxPercentage: 18, amount: 240.00 }
      ],
      subTotal: 615.00,
      taxAmount: 110.70,
      grandTotal: 725.70,
      taxRate: 18,
      poNumber: 'PO-99238',
      vehicleNo: 'MH 12 AB 1234',
      station: 'Mumbai HQ',
      driverMobileNo: '+91 9876543210',
      transportName: 'Fast Logistics',
      eWayBillNo: '123456789012'
    };

    try {
      await exportInvoicePDFAsync(mockInvoice as any, mockProfile as any, 'save', template);
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF');
    }
  };
  
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.id && json.layout) {
           json.id = `tmpl_${Math.random().toString(36).substr(2, 9)}`;
           json.isDefault = false;
           json.name = `${json.name} (Imported)`;
           json.updatedAt = Date.now();
           const updated = [json, ...templates];
           setTemplates(updated);
           localStorage.setItem('makbills_custom_templates', JSON.stringify(updated));
        } else {
          alert('Invalid template format');
        }
      } catch (err) {
        alert('Error parsing JSON');
      }
    };
    reader.readAsText(file);
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  if (isBuilding) {
    return (
      <TemplateCreationHub 
        initialTemplate={editingTemplate} 
        businessProfile={businessProfile}
        onSave={handleSaveTemplate}
        onCancel={() => {
          setIsBuilding(false);
          setEditingTemplate(null);
        }}
      />
    );
  }

  const categories = ['All', 'Default', 'GST', 'Service', 'Retail', 'User'];
  
  const rawTemplates = activeLibraryTab === 'my_templates' ? templates : TEMPLATE_PRESETS;
  const sourceTemplates = rawTemplates.map(t => ({
    ...t,
    isDefault: t.id === globalDefaultId
  }));
  
  const filteredTemplates = sourceTemplates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || t.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const getVisibleSectionsCount = (t: InvoiceTemplate) => Object.values(t.sections).filter(s => s.visible).length;

  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    const timeA = (a as any).updatedAt || (sourceTemplates.indexOf(a) + 1);
    const timeB = (b as any).updatedAt || (sourceTemplates.indexOf(b) + 1);

    if (sortBy === 'oldest') return timeA - timeB;
    if (sortBy === 'latest') return timeB - timeA;
    if (sortBy === 'detailed') return getVisibleSectionsCount(b) - getVisibleSectionsCount(a);
    if (sortBy === 'less_detailed') return getVisibleSectionsCount(a) - getVisibleSectionsCount(b);
    return 0;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200 w-full">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
            <span className="bg-gradient-to-r from-amber-600 via-[#64748b] to-rose-500 bg-clip-text text-transparent dark:from-amber-400 dark:via-white dark:to-rose-400">Invoice Template Builder</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          </h1>
          <p className="text-[10px] text-[#64748b]/80 dark:text-zinc-400 mt-0.5">
            Design custom invoice layouts and manage your template library
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => {
              setEditingTemplate(null);
              setIsBuilding(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#0f172a] to-[#64748b] hover:from-[#5C5043] hover:to-[#0f172a] text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm shadow-[#64748b]/20"
          >
            <Plus className="w-3.5 h-3.5" />
            New Template
          </button>
        </div>
      </div>

      {/* ── Library Tabs ── */}
      <div className="bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Accent bar */}
        <div className="h-1 bg-gradient-to-r from-[#e2e8f0] via-[#C6A87D] to-[#64748b]" />

        <div className="flex border-b border-[#e2e8f0]/45 dark:border-zinc-800 px-2 bg-[#FCFAF7]/30 dark:bg-zinc-950/10">
          {[
            { key: 'my_templates', label: 'My Templates', count: templates.length, activeColor: 'border-amber-500 text-[#0f172a]', countBg: 'bg-amber-100 text-amber-800' },
            { key: 'system', label: 'System Presets', count: TEMPLATE_PRESETS.length, activeColor: 'border-sky-500 text-[#0f172a]', countBg: 'bg-sky-100 text-sky-800' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveLibraryTab(tab.key as any)}
              className={`flex items-center gap-2 px-5 py-3.5 text-[11px] font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                activeLibraryTab === tab.key
                  ? `${tab.activeColor} dark:text-white`
                  : 'border-transparent text-[#64748b]/70 dark:text-zinc-500 hover:text-[#0f172a] dark:hover:text-zinc-300'
              }`}
            >
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                activeLibraryTab === tab.key
                  ? tab.countBg
                  : 'bg-[#e2e8f0]/60 dark:bg-zinc-800 text-[#64748b] dark:text-zinc-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Search + Filter bar ── */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-4 bg-[#FCFAF7]/60 dark:bg-zinc-950/30">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]/60" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 focus:border-[#64748b] dark:border-zinc-700 rounded-xl text-[11px] text-[#0f172a] dark:text-white placeholder-[#64748b]/40 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-[#64748b]/60 flex-shrink-0" />
            {(() => {
              const catStyles: Record<string, { active: string; inactive: string }> = {
                All:     { active: 'bg-[#0f172a] text-white border-[#0f172a]', inactive: 'bg-white dark:bg-zinc-900 border-[#e2e8f0]/60 dark:border-zinc-700 text-[#64748b] dark:text-zinc-400 hover:border-[#64748b]/50' },
                Default: { active: 'bg-amber-500 text-white border-amber-500', inactive: 'bg-white dark:bg-zinc-900 border-[#e2e8f0]/60 dark:border-zinc-700 text-[#64748b] dark:text-zinc-400 hover:border-amber-400/50 hover:text-amber-600' },
                GST:     { active: 'bg-emerald-600 text-white border-emerald-600', inactive: 'bg-white dark:bg-zinc-900 border-[#e2e8f0]/60 dark:border-zinc-700 text-[#64748b] dark:text-zinc-400 hover:border-emerald-400/50 hover:text-emerald-600' },
                Service: { active: 'bg-sky-600 text-white border-sky-600', inactive: 'bg-white dark:bg-zinc-900 border-[#e2e8f0]/60 dark:border-zinc-700 text-[#64748b] dark:text-zinc-400 hover:border-sky-400/50 hover:text-sky-600' },
                Retail:  { active: 'bg-violet-600 text-white border-violet-600', inactive: 'bg-white dark:bg-zinc-900 border-[#e2e8f0]/60 dark:border-zinc-700 text-[#64748b] dark:text-zinc-400 hover:border-violet-400/50 hover:text-violet-600' },
                User:    { active: 'bg-rose-500 text-white border-rose-500', inactive: 'bg-white dark:bg-zinc-900 border-[#e2e8f0]/60 dark:border-zinc-700 text-[#64748b] dark:text-zinc-400 hover:border-rose-400/50 hover:text-rose-500' },
              };
              return categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                    activeCategory === cat
                      ? (catStyles[cat]?.active ?? 'bg-[#0f172a] text-white border-[#0f172a]')
                      : (catStyles[cat]?.inactive ?? 'bg-white dark:bg-zinc-900 border-[#e2e8f0]/60 text-[#64748b]')
                  }`}
                >
                  {cat}
                </button>
              ));
            })()}
          </div>

          <div className="flex items-center gap-2 sm:ml-auto">
            <span className="text-[10px] font-black text-[#64748b]/60 dark:text-zinc-500 uppercase tracking-wider whitespace-nowrap">Sort by</span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="appearance-none pl-3 pr-7 py-1.5 bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-700 rounded-xl text-[11px] font-bold text-[#0f172a] dark:text-zinc-200 focus:outline-none focus:border-[#64748b]/60 cursor-pointer transition-colors"
              >
                <option value="latest">Latest</option>
                <option value="oldest">Oldest</option>
                <option value="detailed">Most Detailed</option>
                <option value="less_detailed">Less Detailed</option>
              </select>
              <ChevronDown className="w-3 h-3 text-[#64748b] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* ── Template Grid ── */}
        <div className="p-4">
          {sortedTemplates.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-zinc-800 text-amber-500 flex items-center justify-center mx-auto mb-3 border border-amber-200/50 dark:border-zinc-700">
                <LayoutTemplate className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-[#64748b]/70 dark:text-zinc-500">
                {activeLibraryTab === 'my_templates'
                  ? 'No custom templates yet. Create your first one.'
                  : 'No presets match your filters.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedTemplates.map(template => (
                <div
                  key={template.id}
                  className={`flex flex-col bg-white dark:bg-zinc-950 border rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all group relative ${
                    template.isDefault
                      ? 'border-emerald-500 dark:border-emerald-600 ring-2 ring-emerald-500/20'
                      : 'border-[#e2e8f0]/60 dark:border-zinc-800 hover:border-[#64748b]/35'
                  }`}
                >
                  {/* Default badge */}
                  {template.isDefault && (
                    <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden z-10 pointer-events-none">
                      <div className="absolute top-4 -right-5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[8px] font-black py-0.5 px-6 transform rotate-45 shadow-xs tracking-widest uppercase">
                        DEFAULT
                      </div>
                    </div>
                  )}

                  {/* Thumbnail preview */}
                  <div className="w-full h-44 sm:h-52 bg-[#FCFAF7] dark:bg-zinc-900 relative overflow-hidden border-b border-[#e2e8f0]/40 dark:border-zinc-800 pointer-events-none">
                    <svg viewBox="0 0 794 1123" className="w-full h-auto origin-top" preserveAspectRatio="xMidYMin slice">
                      <foreignObject width="794" height="1123">
                        <div className="w-[794px] h-[1123px] bg-white">
                          <LivePreview template={template} businessProfile={businessProfile} />
                        </div>
                      </foreignObject>
                    </svg>
                  </div>

                  {/* Card body */}
                  <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-xs font-black text-[#0f172a] dark:text-white truncate" title={template.name}>
                          {template.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="px-1.5 py-0.5 bg-[#f8fafc] dark:bg-zinc-800 text-[#64748b] dark:text-zinc-400 rounded text-[9px] font-black uppercase tracking-wider">
                          {template.category}
                        </span>
                        <span className="px-1.5 py-0.5 bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/40 rounded text-[9px] font-black uppercase tracking-wider">
                          {template.layout.type}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-[#64748b]/75 dark:text-zinc-500 line-clamp-2 leading-relaxed min-h-[30px]">
                        {template.description || 'No description provided.'}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingTemplate(template);
                            setIsBuilding(true);
                          }}
                          className="flex-1 py-1.5 bg-violet-50 dark:bg-violet-950/20 hover:bg-violet-100 dark:hover:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/40 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          {activeLibraryTab === 'system' ? 'Use Preset' : 'Edit'}
                        </button>
                        <button
                          onClick={() => handleDuplicate(template)}
                          title="Duplicate template"
                          className="px-2 py-1.5 bg-sky-50 dark:bg-sky-950/20 hover:bg-sky-100 dark:hover:bg-sky-900/30 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/40 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleExportPDF(template)}
                          title="Download sample PDF"
                          className="px-2 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 pt-1.5 border-t border-[#e2e8f0]/40 dark:border-zinc-800">
                        {!template.isDefault ? (
                          <button
                            onClick={() => handleSetDefault(template.id)}
                            className="flex-1 py-1 text-[10px] font-black uppercase tracking-wider text-[#64748b] hover:text-[#0f172a] dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-[#f8fafc] dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                          >
                            Set as Default
                          </button>
                        ) : (
                          <span className="flex-1 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                            <Check className="w-3 h-3" /> Active Default
                          </span>
                        )}
                        {activeLibraryTab !== 'system' && (
                          <button
                            onClick={() => handleDelete(template.id)}
                            title="Delete template"
                            className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-[#64748b]/50 hover:text-rose-500 rounded-lg transition-colors cursor-pointer ml-auto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
