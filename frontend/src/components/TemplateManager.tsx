import React, { useState, useEffect, useRef } from 'react';
import { Plus, LayoutTemplate, FileText, Check, Trash2, Edit2, Copy, Download, Upload, Search, Filter } from 'lucide-react';
import { InvoiceTemplate } from '../types';
import { LivePreview } from './TemplateBuilder/LivePreview';
import { exportInvoicePDFAsync } from '../lib/pdfExporter';

import TemplateCreationHub from './TemplateBuilder/TemplateCreationHub';
import { TEMPLATE_PRESETS } from '../lib/templatePresets';

export default function TemplateManager() {
  const [templates, setTemplates] = useState<InvoiceTemplate[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('makinvoice_custom_templates');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse templates", e);
        }
      }
    }
    return [];
  });
  
  const [globalDefaultId, setGlobalDefaultId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const savedGlobalDefault = localStorage.getItem('makinvoice_global_default_template');
      if (savedGlobalDefault) return savedGlobalDefault;
      
      const saved = localStorage.getItem('makinvoice_custom_templates');
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
    // Only needed if you want to sync state changes back or listen to events
  }, []);

  const handleSaveTemplate = (template: InvoiceTemplate) => {
    const exists = templates.some(t => t.id === template.id);
    let updated = templates;
    
    const finalTemplate = { ...template, updatedAt: Date.now() };
    if (finalTemplate.isDefault) {
      setGlobalDefaultId(finalTemplate.id);
      localStorage.setItem('makinvoice_global_default_template', finalTemplate.id);
      updated = templates.map(t => ({ ...t, isDefault: false }));
    }

    if (exists) {
      updated = [finalTemplate, ...updated.filter(t => t.id !== finalTemplate.id)];
    } else {
      updated = [finalTemplate, ...updated];
    }
    
    setTemplates(updated);
    localStorage.setItem('makinvoice_custom_templates', JSON.stringify(updated));
    setIsBuilding(false);
    setEditingTemplate(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this custom template?')) {
      const updated = templates.filter(t => t.id !== id);
      setTemplates(updated);
      localStorage.setItem('makinvoice_custom_templates', JSON.stringify(updated));
    }
  };

  const handleSetDefault = (id: string) => {
    setGlobalDefaultId(id);
    localStorage.setItem('makinvoice_global_default_template', id);

    const updated = templates.map(t => ({
      ...t,
      isDefault: t.id === id
    }));
    setTemplates(updated);
    localStorage.setItem('makinvoice_custom_templates', JSON.stringify(updated));
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
    localStorage.setItem('makinvoice_custom_templates', JSON.stringify(updated));
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
           localStorage.setItem('makinvoice_custom_templates', JSON.stringify(updated));
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

    if (sortBy === 'oldest') {
      return timeA - timeB;
    }
    if (sortBy === 'latest') {
      return timeB - timeA;
    }
    if (sortBy === 'detailed') {
      return getVisibleSectionsCount(b) - getVisibleSectionsCount(a);
    }
    if (sortBy === 'less_detailed') {
      return getVisibleSectionsCount(a) - getVisibleSectionsCount(b);
    }
    return 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <LayoutTemplate className="w-6 h-6 text-indigo-500" />
            Invoice Template Builder
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Create completely custom invoice layouts with our step-by-step visual builder.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap pb-1 sm:pb-0">
          <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          <button
            onClick={handleImportClick}
            className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={() => {
              setEditingTemplate(null);
              setIsBuilding(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-900/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create New Template
          </button>
        </div>
      </div>
      
            {/* Library Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6">
        <button
          onClick={() => setActiveLibraryTab('my_templates')}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors ${activeLibraryTab === 'my_templates' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          My Templates
        </button>
        <button
          onClick={() => setActiveLibraryTab('system')}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors ${activeLibraryTab === 'system' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          System Templates (Presets)
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search templates..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="w-4 h-4 text-slate-400 mr-1" />
            {categories.map(cat => (
               <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${activeCategory === cat ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
               >
                  {cat}
               </button>
            ))}
          </div>
          <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-4 h-6">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500">Sort:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white cursor-pointer transition-all"
            >
              <option value="latest">Latest</option>
              <option value="oldest">Oldest</option>
              <option value="detailed">Detailed</option>
              <option value="less_detailed">Less Detailed</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sortedTemplates.map(template => (
          <div key={template.id} className={`flex flex-col bg-white dark:bg-slate-900 border ${template.isDefault ? 'border-indigo-500 ring-1 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-800'} rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all group relative`}>
            {template.isDefault && (
               <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden z-10">
                 <div className="absolute top-4 -right-5 bg-indigo-500 text-white text-[9px] font-bold py-0.5 px-6 transform rotate-45 shadow-sm">DEFAULT</div>
               </div>
            )}
            
            {/* Thumbnail Preview Area */}
            <div className="w-full h-48 sm:h-60 bg-white dark:bg-slate-900 relative overflow-hidden border-b border-slate-100 dark:border-slate-800/80 pointer-events-none">
              <svg viewBox="0 0 794 1123" className="w-full h-auto origin-top" preserveAspectRatio="xMidYMin slice">
                <foreignObject width="794" height="1123">
                  <div className="w-[794px] h-[1123px] bg-white">
                    <LivePreview template={template} />
                  </div>
                </foreignObject>
              </svg>
            </div>

            <div className="p-5 flex flex-col flex-1 justify-between">
              <div>
                <div className="flex items-start justify-between mb-1 pr-6">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white line-clamp-1" title={template.name}>{template.name}</h3>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mb-2">
                  {template.category} • {template.layout.type}
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 mb-4 min-h-[32px]">
                  {template.description || "No description provided."}
                </p>
              </div>
              
              <div className="flex flex-col gap-2 mt-auto">
              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap pb-1 sm:pb-0">
                <button 
                  onClick={() => {
                    setEditingTemplate(template);
                    setIsBuilding(true);
                  }}
                  className="flex-1 py-1.5 text-[11px] font-bold bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" /> {activeLibraryTab === 'system' ? 'Use Preset' : 'Edit'}
                </button>
                <button 
                  onClick={() => handleDuplicate(template)}
                  className="px-2.5 py-1.5 text-[11px] font-bold bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors flex items-center justify-center"
                  title="Duplicate template"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                 <button 
                   onClick={() => handleExportPDF(template)}
                   className="px-2.5 py-1.5 text-[11px] font-bold bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors flex items-center justify-center"
                   title="Download PDF"
                 >
                   <Download className="w-3.5 h-3.5" />
                 </button>
              </div>
              <div className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                {!template.isDefault && (
                  <button 
                    onClick={() => handleSetDefault(template.id)}
                    className="flex-1 py-1.5 text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
                  >
                    Set Default
                  </button>
                )}
                {activeLibraryTab !== 'system' && (
                  <button 
                    onClick={() => handleDelete(template.id)}
                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600 rounded transition-colors ml-auto"
                    title="Delete template"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            </div>
          </div>
        ))}
        {filteredTemplates.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            No templates found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
}
