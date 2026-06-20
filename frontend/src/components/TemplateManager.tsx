import React, { useState, useEffect, useRef } from 'react';
import { Plus, LayoutTemplate, FileText, Check, Trash2, Edit2, Copy, Download, Upload, Search, Filter } from 'lucide-react';
import { InvoiceTemplate } from '../types';
import TemplateBuilder from './TemplateBuilder';

export default function TemplateManager() {
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<InvoiceTemplate | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('makinvoice_custom_templates');
    if (saved) {
      try {
        setTemplates(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse templates", e);
      }
    }
  }, []);

  const handleSaveTemplate = (template: InvoiceTemplate) => {
    const exists = templates.some(t => t.id === template.id);
    let updated;
    
    let finalTemplate = { ...template };
    if (finalTemplate.isDefault) {
      updated = templates.map(t => ({ ...t, isDefault: false }));
    } else {
      updated = [...templates];
    }

    if (exists) {
      updated = updated.map(t => t.id === finalTemplate.id ? finalTemplate : t);
    } else {
      updated = [...updated, finalTemplate];
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
      isDefault: false
    };
    const updated = [...templates, dupe];
    setTemplates(updated);
    localStorage.setItem('makinvoice_custom_templates', JSON.stringify(updated));
  };
  
  const handleExport = (template: InvoiceTemplate) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(template));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", template.name.replace(/\s+/g, '_') + "_template.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
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
           const updated = [...templates, json];
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
      <TemplateBuilder 
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
  
  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || t.category === activeCategory;
    return matchesSearch && matchesCategory;
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
        <div className="flex items-center gap-2">
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
      
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
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
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredTemplates.map(template => (
          <div key={template.id} className={`p-5 bg-white dark:bg-slate-900 border ${template.isDefault ? 'border-indigo-500 ring-1 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-800'} rounded-3xl flex flex-col justify-between shadow-sm hover:shadow-md transition-all group relative overflow-hidden`}>
            {template.isDefault && (
               <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                 <div className="absolute top-4 -right-5 bg-indigo-500 text-white text-[9px] font-bold py-0.5 px-6 transform rotate-45 shadow-sm">DEFAULT</div>
               </div>
            )}
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
            
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setEditingTemplate(template);
                    setIsBuilding(true);
                  }}
                  className="flex-1 py-1.5 text-[11px] font-bold bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button 
                  onClick={() => handleDuplicate(template)}
                  className="px-2.5 py-1.5 text-[11px] font-bold bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors flex items-center justify-center"
                  title="Duplicate template"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                 <button 
                  onClick={() => handleExport(template)}
                  className="px-2.5 py-1.5 text-[11px] font-bold bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors flex items-center justify-center"
                  title="Export JSON"
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
                <button 
                  onClick={() => handleDelete(template.id)}
                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600 rounded transition-colors ml-auto"
                  title="Delete template"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
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
