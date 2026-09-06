import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, LayoutTemplate, FileText, Check, Trash2, Edit2, Copy, Download, Upload, Search, Filter, ChevronDown, Lock } from 'lucide-react';
import { InvoiceTemplate, BusinessProfile } from '../types';
import { LivePreview } from './TemplateBuilder/LivePreview';
import { exportInvoicePDFAsync } from '../lib/pdfExporter';
import { useConfirm } from './ConfirmContext';

import TemplateCreationHub from './TemplateBuilder/TemplateCreationHub';
import { TEMPLATE_PRESETS } from '../lib/templatePresets';
import { emitNotification } from '../lib/notifications';
import { supabase } from '../lib/supabase';

function TemplatePreview({ template, businessProfile }: { template: InvoiceTemplate; businessProfile?: BusinessProfile }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;
    const updateScale = () => {
      if (containerRef.current) {
        const width = containerRef.current.getBoundingClientRect().width;
        setScale(width / 794);
      }
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full aspect-[794/1123] overflow-hidden relative bg-white">
      <div 
        className="w-[794px] h-[1123px] origin-top-left absolute top-0 left-0" 
        style={{ transform: `scale(${scale})`, width: '794px', height: '1123px' }}
      >
        <LivePreview template={template} businessProfile={businessProfile} forceFullHeight={true} />
      </div>
    </div>
  );
}

export default function TemplateManager({ businessProfile, subscriptionTier = 'free' }: { businessProfile?: BusinessProfile; subscriptionTier?: 'free' | 'basic' | 'pro' | 'unlimited' | 'enterprise' }) {
  const { confirm } = useConfirm();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
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

  const persistTemplates = async (updated: InvoiceTemplate[]) => {
    setTemplates(updated);
    localStorage.setItem('makbills_custom_templates', JSON.stringify(updated));
    window.dispatchEvent(new Event('custom_templates_local_update'));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.storage
          .from('CompanyLogo')
          .upload(`${user.id}/custom_templates.json`, JSON.stringify(updated), {
            cacheControl: '0',
            upsert: true,
            contentType: 'application/json'
          });
      }
    } catch (e) {
      console.warn('Failed to sync templates to cloud storage', e);
    }
  };

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
    
    persistTemplates(updated);
    setIsBuilding(false);
    setEditingTemplate(null);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Template',
      message: 'Are you sure you want to permanently delete this custom template?',
      confirmText: 'Delete'
    });
    
    if (confirmed) {
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
          persistTemplates(markedUpdated);
        } else {
          persistTemplates(updated);
        }
        setGlobalDefaultId(newDefaultId);
        localStorage.setItem('makbills_global_default_template', newDefaultId);
      } else {
        persistTemplates(updated);
      }
    }
  };

  // Determine document type key for a template (invoice, proforma, debit_note, credit_note, estimate)
  const getTemplateDocTypeKey = (t: InvoiceTemplate): string => {
    const title = (t.config?.header?.invoiceTitle || '').toLowerCase();
    const name = (t.name || '').toLowerCase();
    const id = (t.id || '').toLowerCase();
    const desc = (t.description || '').toLowerCase();

    if (title.includes('purchase order') || name.includes('purchase order') || id.includes('po') || desc.includes('purchase order')) return 'purchase_order';
    if (title.includes('purchase') || name.includes('purchase') || id.includes('purchase') || desc.includes('purchase')) return 'purchases';
    if (title.includes('proforma') || name.includes('proforma') || id.includes('proforma') || desc.includes('proforma')) return 'proforma';
    if (title.includes('debit') || name.includes('debit') || id.includes('debit') || desc.includes('debit')) return 'debit_note';
    if (title.includes('credit') || name.includes('credit') || id.includes('credit') || desc.includes('credit')) return 'credit_note';
    if (title.includes('quote') || title.includes('estimate') || title.includes('quotation') || name.includes('quote') || name.includes('estimate') || name.includes('quotation') || id.includes('quote') || id.includes('estimate')) return 'estimate';
    return 'invoice';
  };

  const getTemplateDocTypeLabel = (docKey: string): string => {
    const labels: Record<string, string> = {
      invoice: 'Tax Invoice',
      proforma: 'Proforma Invoice',
      debit_note: 'Debit Note',
      credit_note: 'Credit Note',
      estimate: 'Quote / Estimate',
      purchases: 'Purchase Bill',
      purchase_order: 'Purchase Order'
    };
    return labels[docKey] || 'Tax Invoice';
  };

  const isDocTypeDefault = (t: InvoiceTemplate): boolean => {
    const docKey = getTemplateDocTypeKey(t);
    const docDefaultId = localStorage.getItem(`makbills_default_template_${docKey}`);

    if (docDefaultId) {
      return t.id === docDefaultId;
    }

    // Built-in default preset mapping if no user override
    const builtInDefaults: Record<string, string> = {
      invoice: 'preset_modal_classic',
      proforma: 'preset_makinvoices_proforma',
      debit_note: 'preset_mak_debit_note',
      credit_note: 'preset_makinvoices_credit_note',
      estimate: 'preset_makinvoices_quotation',
      purchases: 'preset_mak_purchases',
      purchase_order: 'preset_mak_po'
    };

    if (builtInDefaults[docKey] === t.id) {
      return true;
    }

    return t.id === globalDefaultId;
  };

  const handleSetDefault = (template: InvoiceTemplate) => {
    const docKey = getTemplateDocTypeKey(template);
    const docTypeDefaultStorageKey = `makbills_default_template_${docKey}`;

    localStorage.setItem(docTypeDefaultStorageKey, template.id);
    if (docKey === 'invoice') {
      setGlobalDefaultId(template.id);
      localStorage.setItem('makbills_global_default_template', template.id);
    }

    const updated = templates.map(t => ({
      ...t,
      isDefault: t.id === template.id
    }));
    persistTemplates(updated);
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
    persistTemplates(updated);
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
      <div className="w-full h-full flex flex-col flex-1 min-h-0">
        <TemplateCreationHub 
          initialTemplate={editingTemplate} 
          businessProfile={businessProfile}
          onSave={handleSaveTemplate}
          onCancel={() => {
            setIsBuilding(false);
            setEditingTemplate(null);
          }}
        />
      </div>
    );
  }

  const categories = ['All', 'Invoice', 'Proforma Invoice', 'Debit Note', 'Credit Note', 'Quote', 'Purchase Order', 'Purchases'];

  const matchesDocumentCategory = (t: InvoiceTemplate, category: string) => {
    if (category === 'All') return true;

    const title = (t.config?.header?.invoiceTitle || '').toLowerCase();
    const name = (t.name || '').toLowerCase();
    const id = (t.id || '').toLowerCase();
    const desc = (t.description || '').toLowerCase();

    const isPO = title.includes('purchase order') || name.includes('purchase order') || id.includes('po') || desc.includes('purchase order');
    const isPurchases = !isPO && (title.includes('purchase') || name.includes('purchase') || id.includes('purchase') || desc.includes('purchase'));
    const isProforma = title.includes('proforma') || name.includes('proforma') || id.includes('proforma') || desc.includes('proforma');
    const isDebit = title.includes('debit') || name.includes('debit') || id.includes('debit') || desc.includes('debit');
    const isCredit = title.includes('credit') || name.includes('credit') || id.includes('credit') || desc.includes('credit');
    const isQuote = title.includes('quote') || title.includes('estimate') || title.includes('quotation') || name.includes('quote') || name.includes('estimate') || name.includes('quotation') || id.includes('quote') || id.includes('quotation') || id.includes('estimate');

    if (category === 'Purchase Order') return isPO;
    if (category === 'Purchases') return isPurchases;
    if (category === 'Proforma Invoice') return isProforma;
    if (category === 'Debit Note') return isDebit;
    if (category === 'Credit Note') return isCredit;
    if (category === 'Quote') return isQuote;
    if (category === 'Invoice') {
      return !isPO && !isPurchases && !isProforma && !isDebit && !isCredit && !isQuote;
    }

    return t.category === category;
  };

  const rawTemplates = activeLibraryTab === 'my_templates' ? templates : TEMPLATE_PRESETS;
  const sourceTemplates = rawTemplates.map(t => ({
    ...t,
    isDefault: isDocTypeDefault(t)
  }));
  
  const filteredTemplates = sourceTemplates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (t.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = matchesDocumentCategory(t, activeCategory);
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
    <div className="space-y-6 animate-in fade-in duration-200 w-full invoice-template-builder no-privacy-blur" data-privacy-exempt="true">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-black uppercase tracking-tight flex items-center gap-2" style={{ fontFamily: "'Fraunces', serif" }}>
            <span className="bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#38bdf8] bg-clip-text text-transparent">Invoice Template Builder</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7] dark:bg-[#38bdf8] shrink-0" />
          </h1>
          <p className="text-[10px] text-[#64748b]/80 dark:text-zinc-400 mt-0.5">
            Design custom invoice layouts and manage your template library
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => {
              if (subscriptionTier === 'free') {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('mak_navigate_tab', { detail: 'subscription' }));
                }
                return;
              }
              setEditingTemplate(null);
              setIsBuilding(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0284c7] dark:bg-[#38bdf8] border border-[#0369a1] dark:border-[#0284c7] hover:bg-[#0369a1] dark:hover:bg-[#0284c7] text-white dark:text-[#0b1329] rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm shadow-[#0284c7]/20 hover:-translate-y-px active:scale-[0.98]"
          >
            {subscriptionTier === 'free' ? <Lock className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {subscriptionTier === 'free' ? 'Unlock Custom Templates 🔒' : 'New Template'}
          </button>
        </div>
      </div>

      {/* ── Library Tabs ── */}
      <div className="bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl shadow-xs overflow-hidden">
        {/* Accent bar */}
        <div className="h-1 bg-gradient-to-r from-[#bae6fd] via-[#0284c7] to-[#2563eb]" />

        <div className="flex overflow-x-auto no-scrollbar w-full border-b border-[#bae6fd]/30 dark:border-[#223269]/30 px-2 bg-[#f4f9ff] dark:bg-[#0b1329]/40">
          {[
            { key: 'my_templates', label: 'My Templates', count: templates.length },
            { key: 'system', label: 'System Presets', count: TEMPLATE_PRESETS.length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveLibraryTab(tab.key as any)}
              className={`flex items-center gap-2 px-5 py-3.5 text-[11px] font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeLibraryTab === tab.key
                  ? 'border-[#0284c7] text-[#0284c7] dark:border-[#38bdf8] dark:text-[#38bdf8]'
                  : 'border-transparent text-[#64748b]/70 dark:text-zinc-500 hover:text-[#0284c7] dark:hover:text-[#38bdf8]'
              }`}
            >
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                activeLibraryTab === tab.key
                  ? 'bg-[#e0f2fe] dark:bg-[#1b264f] text-[#0284c7] dark:text-[#38bdf8]'
                  : 'bg-[#f4f9ff] dark:bg-[#0b1329] text-[#64748b] dark:text-zinc-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Search + Filter bar ── */}
        <div className="flex flex-col gap-3 p-4 bg-[#f4f9ff]/50 dark:bg-[#0b1329]/40">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative w-full sm:max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]/60" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 focus:border-[#0284c7] dark:border-[#223269]/60 dark:focus:border-[#38bdf8] rounded-xl text-[11px] text-[#0f172a] dark:text-white placeholder-[#64748b]/40 focus:outline-none transition-colors"
              />
            </div>

            <div className="w-full overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-2 min-w-max sm:min-w-0 sm:flex-wrap">
                <Filter className="w-3.5 h-3.5 text-[#64748b]/60 flex-shrink-0" />
                {(() => {
                  const catStyles: Record<string, { active: string; inactive: string }> = {
                    All:                { active: 'bg-[#0284c7] dark:bg-[#38bdf8] text-white dark:text-[#0b1329] border-[#0284c7] dark:border-[#38bdf8]', inactive: 'bg-white dark:bg-[#111a36] border-[#bae6fd]/60 dark:border-[#223269]/60 text-[#64748b] dark:text-zinc-400 hover:border-[#0284c7]/50' },
                    'Invoice':          { active: 'bg-emerald-600 text-white border-emerald-600', inactive: 'bg-white dark:bg-[#111a36] border-[#bae6fd]/60 dark:border-[#223269]/60 text-[#64748b] dark:text-zinc-400 hover:border-emerald-400/50 hover:text-emerald-600' },
                    'Proforma Invoice': { active: 'bg-sky-600 text-white border-sky-600', inactive: 'bg-white dark:bg-[#111a36] border-[#bae6fd]/60 dark:border-[#223269]/60 text-[#64748b] dark:text-zinc-400 hover:border-sky-400/50 hover:text-sky-600' },
                    'Debit Note':       { active: 'bg-indigo-600 text-white border-indigo-600', inactive: 'bg-white dark:bg-[#111a36] border-[#bae6fd]/60 dark:border-[#223269]/60 text-[#64748b] dark:text-zinc-400 hover:border-indigo-400/50 hover:text-indigo-600' },
                    'Credit Note':      { active: 'bg-violet-600 text-white border-violet-600', inactive: 'bg-white dark:bg-[#111a36] border-[#bae6fd]/60 dark:border-[#223269]/60 text-[#64748b] dark:text-zinc-400 hover:border-violet-400/50 hover:text-violet-600' },
                    'Quote':            { active: 'bg-teal-600 text-white border-teal-600', inactive: 'bg-white dark:bg-[#111a36] border-[#bae6fd]/60 dark:border-[#223269]/60 text-[#64748b] dark:text-zinc-400 hover:border-teal-400/50 hover:text-teal-600' },
                  };
                  return categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border whitespace-nowrap shrink-0 ${
                        activeCategory === cat
                          ? (catStyles[cat]?.active ?? 'bg-[#0284c7] text-white border-[#0284c7]')
                          : (catStyles[cat]?.inactive ?? 'bg-white dark:bg-[#111a36] border-[#bae6fd]/60 dark:border-[#223269]/60 text-[#64748b] dark:text-zinc-400')
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
                  className="appearance-none w-full sm:w-auto pl-3 pr-7 py-1.5 bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-xl text-[11px] font-bold text-[#0f172a] dark:text-zinc-200 focus:outline-none focus:border-[#0284c7] dark:focus:border-[#38bdf8] cursor-pointer transition-colors"
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
              <div className="w-12 h-12 rounded-2xl bg-[#e0f2fe] dark:bg-[#1b264f] text-[#0284c7] dark:text-[#38bdf8] flex items-center justify-center mx-auto mb-3 border border-[#bae6fd]/50 dark:border-[#223269]/50">
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
              {sortedTemplates.map((template, tIdx) => (
                <div
                  key={`template-${template.id || tIdx}-${tIdx}`}
                  onClick={() => setSelectedTemplateForModal(template)}
                  className={`flex flex-col bg-white dark:bg-[#111a36] border rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all group relative cursor-pointer ${
                    template.isDefault
                      ? 'border-emerald-500 dark:border-emerald-600 ring-2 ring-emerald-500/20'
                      : 'border-[#bae6fd]/60 dark:border-[#223269]/60 hover:border-[#0284c7] dark:hover:border-[#38bdf8]'
                  }`}
                >
                  {template.isDefault && (() => {
                    const docKey = getTemplateDocTypeKey(template);
                    const docLabel = getTemplateDocTypeLabel(docKey);
                    return (
                      <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none">
                        <span className="px-2.5 py-1 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider rounded-lg shadow-md flex items-center gap-1 border border-emerald-400/30">
                          <Check className="w-3 h-3" /> DEFAULT ({docLabel})
                        </span>
                      </div>
                    );
                  })()}

                  <div className="w-full aspect-[794/1123] bg-[#f4f9ff] dark:bg-[#0b1329] relative overflow-hidden pointer-events-none">
                    <TemplatePreview template={template} businessProfile={businessProfile} />
                    
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4">
                      <span className="text-white/90 text-[10px] uppercase tracking-wider bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm font-bold flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5" /> View Details
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-white dark:bg-[#111a36] border-t border-[#bae6fd]/60 dark:border-[#223269]/60 text-center flex flex-col items-center justify-center gap-1">
                     <h3 className="text-[11px] font-black text-[#0f172a] dark:text-white truncate w-full" title={template.name}>
                       {template.name}
                     </h3>
                     <span className="px-2 py-0.5 bg-[#f4f9ff] dark:bg-[#0b1329] text-[#0284c7] dark:text-[#38bdf8] rounded text-[8.5px] font-extrabold uppercase tracking-wider border border-[#bae6fd]/40 dark:border-[#223269]/40">
                       {getTemplateDocTypeLabel(getTemplateDocTypeKey(template))}
                     </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {selectedTemplateForModal && isMounted && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-100"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedTemplateForModal(null);
          }}
        >
          <div className="relative w-full max-w-5xl bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl shadow-2xl flex flex-col-reverse lg:flex-row overflow-hidden my-auto max-h-none lg:max-h-[90vh]">
            
            <div className="w-full lg:w-[60%] bg-[#f4f9ff] dark:bg-[#0b1329] border-t lg:border-t-0 lg:border-r border-[#bae6fd]/60 dark:border-[#223269]/60 p-4 sm:p-8 flex items-center justify-center lg:min-h-[60vh]">
              <div className="w-full max-w-[450px] aspect-[794/1123] shadow-lg rounded overflow-hidden relative bg-white">
                <TemplatePreview template={selectedTemplateForModal} businessProfile={businessProfile} />
              </div>
            </div>

            <div className="w-full lg:w-[40%] flex flex-col p-5 sm:p-8 bg-white dark:bg-[#111a36] overflow-y-auto">
              
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#0f172a] dark:text-white mb-3" style={{ fontFamily: "'Fraunces', serif" }}>
                    {selectedTemplateForModal.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {selectedTemplateForModal.isDefault && (
                      <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-emerald-200 dark:border-emerald-800/50">
                        <Check className="w-3 h-3" /> Active Default
                      </span>
                    )}
                    <span className="px-2 py-1 bg-[#f4f9ff] dark:bg-[#0b1329] text-[#0284c7] dark:text-[#38bdf8] rounded text-[10px] font-black uppercase tracking-wider border border-[#bae6fd]/40 dark:border-[#223269]/40">
                      {selectedTemplateForModal.category}
                    </span>
                    <span className="px-2 py-1 bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 rounded text-[10px] font-black uppercase tracking-wider border border-sky-200/60 dark:border-sky-800/40">
                      {selectedTemplateForModal.layout.type} layout
                    </span>
                  </div>
                </div>
                
                <button 
                  onClick={() => setSelectedTemplateForModal(null)}
                  className="p-2 -mr-2 -mt-2 text-[#64748b] hover:text-[#0284c7] dark:hover:text-[#38bdf8] bg-[#f4f9ff] hover:bg-[#e0f2fe] dark:bg-[#1b264f]/40 dark:hover:bg-[#1b264f] rounded-full transition-colors cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>

              <div className="mb-6">
                <h4 className="text-[10px] font-black text-[#64748b] dark:text-zinc-500 uppercase tracking-widest mb-2">Description</h4>
                <p className="text-sm text-[#475569] dark:text-zinc-400 leading-relaxed">
                  {selectedTemplateForModal.description || 'No description provided for this template.'}
                </p>
              </div>

              <div className="hidden lg:block mb-8 flex-1">
                <h4 className="text-[10px] font-black text-[#64748b] dark:text-zinc-500 uppercase tracking-widest mb-3">Template Specifications</h4>
                <div className="bg-[#f4f9ff] dark:bg-[#0b1329]/50 rounded-xl p-4 border border-[#bae6fd]/40 dark:border-[#223269]/40">
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

              <div className="flex flex-col gap-3 mt-auto">
                <button
                  onClick={() => {
                    if (subscriptionTier === 'free') {
                      emitNotification('Feature Locked 🔒', 'Template customization & builder options are available on Basic, Professional, and Enterprise plans. On Starter plan, use "Set Default" to select any preset template.', 'error');
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('mak_navigate_tab', { detail: 'subscription' }));
                      }
                      return;
                    }
                    setEditingTemplate(selectedTemplateForModal);
                    setIsBuilding(true);
                    setSelectedTemplateForModal(null);
                  }}
                  className="w-full py-3 bg-[#0284c7] dark:bg-[#38bdf8] border border-[#0369a1] dark:border-[#0284c7] hover:bg-[#0369a1] dark:hover:bg-[#0284c7] text-white dark:text-[#0b1329] rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#0284c7]/20 hover:-translate-y-px active:scale-[0.98]"
                >
                  {subscriptionTier === 'free' ? (
                    <Lock className="w-4 h-4 text-amber-300" />
                  ) : (
                    <Edit2 className="w-4 h-4" />
                  )}
                  {activeLibraryTab === 'system' ? 'Use This Preset' : 'Edit Template'}
                </button>
                
                <div className="grid grid-cols-2 gap-3">
                  {!selectedTemplateForModal.isDefault && (
                    <button
                      onClick={() => {
                        const docKey = getTemplateDocTypeKey(selectedTemplateForModal);
                        const docLabel = getTemplateDocTypeLabel(docKey);
                        handleSetDefault(selectedTemplateForModal);
                        emitNotification('Default Template Set', `'${selectedTemplateForModal.name}' is now default for ${docLabel}.`, 'success');
                        setSelectedTemplateForModal(null);
                      }}
                      className="py-2.5 bg-[#f4f9ff] hover:bg-[#e0f2fe] text-[#0284c7] dark:text-[#38bdf8] dark:bg-[#1b264f]/40 dark:hover:bg-[#1b264f] border border-[#bae6fd] dark:border-[#223269] rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:-translate-y-px active:scale-[0.98]"
                    >
                      <Check className="w-3.5 h-3.5" /> Set Default
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      handleDuplicate(selectedTemplateForModal);
                      setSelectedTemplateForModal(null);
                    }}
                    className={`py-2.5 bg-[#f4f9ff] hover:bg-[#e0f2fe] text-[#0284c7] dark:text-[#38bdf8] dark:bg-[#1b264f]/40 dark:hover:bg-[#1b264f] border border-[#bae6fd] dark:border-[#223269] rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:-translate-y-px active:scale-[0.98] ${selectedTemplateForModal.isDefault ? 'col-span-2' : ''}`}
                  >
                    <Copy className="w-3.5 h-3.5" /> Duplicate
                  </button>
                  
                  <button
                    onClick={() => handleExportPDF(selectedTemplateForModal)}
                    className="py-2.5 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:-translate-y-px active:scale-[0.98]"
                  >
                    <Download className="w-3.5 h-3.5" /> PDF
                  </button>
                  
                  {activeLibraryTab !== 'system' && (
                    <button
                      onClick={() => {
                        handleDelete(selectedTemplateForModal.id);
                        setSelectedTemplateForModal(null);
                      }}
                      className="py-2.5 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:-translate-y-px active:scale-[0.98]"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  )}
                </div>
              </div>
              
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
