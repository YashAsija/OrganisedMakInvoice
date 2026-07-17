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
  
  useEffect(() => {
    const handleCloudUpdate = () => {
      const saved = localStorage.getItem('makbills_custom_templates');
      if (saved) {
        try {
          setTemplates(JSON.parse(saved));
        } catch (e) {}
      }
    };
    window.addEventListener('custom_templates_updated_from_cloud', handleCloudUpdate);
    return () => window.removeEventListener('custom_templates_updated_from_cloud', handleCloudUpdate);
  }, []);
  
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
  
  const [isBuilding, setIsBuilding] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname.startsWith('/invoice-templates/');
    }
    return false;
  });
  const [editingTemplate, setEditingTemplate] = useState<InvoiceTemplate | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!isBuilding) {
        if (window.location.pathname.startsWith('/invoice-templates/')) {
          window.history.pushState(null, '', '/invoice-templates');
        }
      }
    }
  }, [isBuilding]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handlePop = () => {
        const path = window.location.pathname;
        if (path === '/invoice-templates') {
          setIsBuilding(false);
          setEditingTemplate(null);
        } else if (path.startsWith('/invoice-templates/')) {
          setIsBuilding(true);
        }
      };
      window.addEventListener('popstate', handlePop);
      return () => window.removeEventListener('popstate', handlePop);
    }
  }, []);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [activeLibraryTab, setActiveLibraryTab] = useState<'my_templates' | 'system'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('makbills_custom_templates');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.length > 0) return 'my_templates';
        } catch (e) {}
      }
      return 'system';
    }
    return 'my_templates';
  });
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'detailed' | 'less_detailed'>('latest');
  const [selectedTemplateForModal, setSelectedTemplateForModal] = useState<InvoiceTemplate | null>(null);
  
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
        window.dispatchEvent(new Event('custom_templates_local_update'));
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
    window.dispatchEvent(new Event('custom_templates_local_update'));
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
          window.dispatchEvent(new Event('custom_templates_local_update'));
        } else {
          setTemplates(updated);
          localStorage.setItem('makbills_custom_templates', JSON.stringify(updated));
          window.dispatchEvent(new Event('custom_templates_local_update'));
        }
        setGlobalDefaultId(newDefaultId);
        localStorage.setItem('makbills_global_default_template', newDefaultId);
      } else {
        setTemplates(updated);
        localStorage.setItem('makbills_custom_templates', JSON.stringify(updated));
        window.dispatchEvent(new Event('custom_templates_local_update'));
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
    window.dispatchEvent(new Event('custom_templates_local_update'));
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
    window.dispatchEvent(new Event('custom_templates_local_update'));
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

        <div className="flex overflow-x-auto no-scrollbar w-full border-b border-[#e2e8f0]/45 dark:border-zinc-800 px-2 bg-[#FCFAF7]/30 dark:bg-zinc-950/10">
          {[
            { key: 'my_templates', label: 'My Templates', count: templates.length, activeColor: 'border-amber-500 text-[#0f172a]', countBg: 'bg-amber-100 text-amber-800' },
            { key: 'system', label: 'System Presets', count: TEMPLATE_PRESETS.length, activeColor: 'border-sky-500 text-[#0f172a]', countBg: 'bg-sky-100 text-sky-800' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveLibraryTab(tab.key as any)}
              className={`flex items-center gap-2 px-5 py-3.5 text-[11px] font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
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
        <div className="flex flex-col gap-3 p-4 bg-[#FCFAF7]/60 dark:bg-zinc-950/30">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative w-full sm:max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]/60" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 focus:border-[#64748b] dark:border-zinc-700 rounded-xl text-[11px] text-[#0f172a] dark:text-white placeholder-[#64748b]/40 focus:outline-none transition-colors"
              />
            </div>

          <div className="w-full overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 min-w-max sm:min-w-0 sm:flex-wrap">
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
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border whitespace-nowrap shrink-0 ${
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
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-[#64748b]/60 dark:text-zinc-500 uppercase tracking-wider whitespace-nowrap">Sort by</span>
            <div className="relative flex-1 sm:flex-none">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="appearance-none w-full sm:w-auto pl-3 pr-7 py-1.5 bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-700 rounded-xl text-[11px] font-bold text-[#0f172a] dark:text-zinc-200 focus:outline-none focus:border-[#64748b]/60 cursor-pointer transition-colors"
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
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedTemplates.map(template => (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplateForModal(template)}
                  className={`flex flex-col bg-white dark:bg-zinc-950 border rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all group relative cursor-pointer ${
                    template.isDefault
                      ? 'border-emerald-500 dark:border-emerald-600 ring-2 ring-emerald-500/20'
                      : 'border-[#e2e8f0]/60 dark:border-zinc-800 hover:border-violet-300 dark:hover:border-violet-700'
                  }`}
                >
                  {/* Default badge */}
                  {template.isDefault && (
                    <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden z-20 pointer-events-none">
                      <div className="absolute top-4 -right-5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[8px] font-black py-0.5 px-6 transform rotate-45 shadow-xs tracking-widest uppercase">
                        DEFAULT
                      </div>
                    </div>
                  )}

                  {/* Full Thumbnail preview */}
                  <div className="w-full aspect-[794/1123] bg-[#FCFAF7] dark:bg-zinc-900 relative overflow-hidden pointer-events-none">
                    <svg viewBox="0 0 794 1123" className="w-full h-full origin-top" preserveAspectRatio="xMidYMid meet">
                      <foreignObject width="794" height="1123">
                        <div className="w-[794px] h-[1123px] bg-white flex flex-col">
                          <LivePreview template={template} businessProfile={businessProfile} />
                        </div>
                      </foreignObject>
                    </svg>
                    
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4">
                      <span className="text-white/90 text-[10px] uppercase tracking-wider bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm font-bold flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5" /> View Details
                      </span>
                    </div>
                  </div>
                  
                  {/* Name banner below preview always visible */}
                  <div className="p-3 bg-white dark:bg-zinc-950 border-t border-[#e2e8f0]/60 dark:border-zinc-800 text-center flex items-center justify-center gap-2">
                     <h3 className="text-[11px] font-black text-black truncate" title={template.name}>
                       {template.name}
                     </h3>
                     {activeLibraryTab === 'system' && (
                       <span className="px-1.5 py-0.5 bg-[#f8fafc] dark:bg-zinc-800 text-[#64748b] dark:text-zinc-400 rounded text-[9px] font-black uppercase tracking-wider shrink-0">
                         Preset
                       </span>
                     )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Template Details Modal */}
      {selectedTemplateForModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedTemplateForModal(null);
          }}
        >
          <div className="relative w-full max-w-5xl bg-[#f8fafc] dark:bg-zinc-950 rounded-2xl shadow-2xl flex flex-col-reverse lg:flex-row overflow-hidden my-auto max-h-none lg:max-h-[90vh]">
            
            {/* Left side: Large SVG Preview */}
            <div className="w-full lg:w-[60%] bg-[#FCFAF7] dark:bg-zinc-900 border-t lg:border-t-0 lg:border-r border-[#e2e8f0]/60 dark:border-zinc-800 p-4 sm:p-8 flex items-center justify-center lg:min-h-[60vh]">
              <div className="w-full max-w-[450px] aspect-[794/1123] shadow-lg rounded overflow-hidden relative bg-white">
                <svg viewBox="0 0 794 1123" className="w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid meet">
                  <foreignObject width="794" height="1123">
                    <div className="w-[794px] h-[1123px] flex flex-col bg-white">
                      <LivePreview template={selectedTemplateForModal} businessProfile={businessProfile} />
                    </div>
                  </foreignObject>
                </svg>
              </div>
            </div>

            {/* Right side: Details & Actions */}
            <div className="w-full lg:w-[40%] flex flex-col p-5 sm:p-8 bg-white dark:bg-zinc-950 overflow-y-auto">
              
              {/* Header / Badges */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-black mb-3" style={{ color: 'black' }}>
                    {selectedTemplateForModal.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {selectedTemplateForModal.isDefault && (
                      <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-emerald-200 dark:border-emerald-800/50">
                        <Check className="w-3 h-3" /> Active Default
                      </span>
                    )}
                    <span className="px-2 py-1 bg-[#f1f5f9] dark:bg-zinc-900 text-[#64748b] dark:text-zinc-400 rounded text-[10px] font-black uppercase tracking-wider border border-[#e2e8f0] dark:border-zinc-800">
                      {selectedTemplateForModal.category}
                    </span>
                    <span className="px-2 py-1 bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 rounded text-[10px] font-black uppercase tracking-wider border border-sky-200/60 dark:border-sky-800/40">
                      {selectedTemplateForModal.layout.type} layout
                    </span>
                  </div>
                </div>
                
                <button 
                  onClick={() => setSelectedTemplateForModal(null)}
                  className="p-2 -mr-2 -mt-2 text-[#64748b] hover:text-[#0f172a] dark:hover:text-white bg-[#f8fafc] hover:bg-[#e2e8f0] dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h4 className="text-[10px] font-black text-[#64748b] dark:text-zinc-500 uppercase tracking-widest mb-2">Description</h4>
                <p className="text-sm text-[#475569] dark:text-zinc-400 leading-relaxed">
                  {selectedTemplateForModal.description || 'No description provided for this template.'}
                </p>
              </div>

              {/* Desktop Only Template Specs */}
              <div className="hidden lg:block mb-8 flex-1">
                <h4 className="text-[10px] font-black text-[#64748b] dark:text-zinc-500 uppercase tracking-widest mb-3">Template Specifications</h4>
                <div className="bg-[#f8fafc] dark:bg-zinc-900/50 rounded-xl p-4 border border-[#e2e8f0] dark:border-zinc-800/50">
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                    <div>
                      <span className="block text-[10px] font-bold text-[#94a3b8] dark:text-zinc-500 uppercase tracking-wider mb-1">Theme Color</span>
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/10" style={{ backgroundColor: selectedTemplateForModal.styleConfig.primaryColor }} />
                        <span className="text-[#475569] dark:text-zinc-300 capitalize font-medium text-xs">{selectedTemplateForModal.styleConfig.primaryColor}</span>
                      </div>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-[#94a3b8] dark:text-zinc-500 uppercase tracking-wider mb-1">Typography</span>
                      <span className="text-[#475569] dark:text-zinc-300 capitalize font-medium text-xs">{selectedTemplateForModal.styleConfig.fontFamily}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-[#94a3b8] dark:text-zinc-500 uppercase tracking-wider mb-1">Page Size</span>
                      <span className="text-[#475569] dark:text-zinc-300 font-medium text-xs">{selectedTemplateForModal.layout.pageSize} ({selectedTemplateForModal.layout.orientation})</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-[#94a3b8] dark:text-zinc-500 uppercase tracking-wider mb-1">Margins</span>
                      <span className="text-[#475569] dark:text-zinc-300 font-medium text-xs">{selectedTemplateForModal.layout.margins}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 mt-auto">
                <button
                  onClick={() => {
                    setEditingTemplate(selectedTemplateForModal);
                    setIsBuilding(true);
                    setSelectedTemplateForModal(null);
                  }}
                  className="w-full py-3 bg-[#1e293b] hover:bg-[#0f172a] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-slate-900/20"
                >
                  <Edit2 className="w-4 h-4" />
                  {activeLibraryTab === 'system' ? 'Use This Preset' : 'Edit Template'}
                </button>
                
                <div className="grid grid-cols-2 gap-3">
                  {!selectedTemplateForModal.isDefault && (
                    <button
                      onClick={() => {
                        handleSetDefault(selectedTemplateForModal.id);
                        setSelectedTemplateForModal(null);
                      }}
                      className="py-2.5 bg-white dark:bg-zinc-900 hover:bg-[#f8fafc] dark:hover:bg-zinc-800 text-[#0f172a] dark:text-white border border-[#e2e8f0] dark:border-zinc-700 rounded-xl text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> Set Default
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      handleDuplicate(selectedTemplateForModal);
                      setSelectedTemplateForModal(null);
                    }}
                    className={`py-2.5 bg-white dark:bg-zinc-900 hover:bg-[#f8fafc] dark:hover:bg-zinc-800 text-[#0f172a] dark:text-white border border-[#e2e8f0] dark:border-zinc-700 rounded-xl text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${selectedTemplateForModal.isDefault ? 'col-span-2' : ''}`}
                  >
                    <Copy className="w-3.5 h-3.5" /> Duplicate
                  </button>
                  
                  <button
                    onClick={() => handleExportPDF(selectedTemplateForModal)}
                    className="py-2.5 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> PDF
                  </button>
                  
                  {activeLibraryTab !== 'system' && (
                    <button
                      onClick={() => {
                        handleDelete(selectedTemplateForModal.id);
                        setSelectedTemplateForModal(null);
                      }}
                      className="py-2.5 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40 rounded-xl text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  )}
                </div>
              </div>
              
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
