import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Download,
  Search, 
  Sparkles, 
  FileText, 
  User, 
  Database, 
  AlertCircle, 
  Wifi, 
  WifiOff, 
  Sun, 
  Moon, 
  Trash2, 
  PenTool, 
  Lock, 
  Briefcase, 
  TrendingUp, 
  Clock, 
  FileDown, 
  CheckCircle2,
  LogIn,
  LogOut,
  Sparkle,
  Notebook,
  BarChart3,
  Calendar,
  DollarSign,
  ArrowRight,
  TrendingDown,
  Mail,
  Printer,
  ChevronRight,
  X,
  Printer as PrintIcon,
  Smartphone,
  Check,
  Menu
} from 'lucide-react';
import { Invoice, BusinessProfile, PresetItem, InvoiceStatus, ClientProfile, Expense } from '../types';
import { BUSINESS_TEMPLATES } from '../lib/presets';
import { exportInvoicePDF, exportCollectiveReportPDF } from '../lib/pdfExporter';

interface DashboardProps {
  invoices: Invoice[];
  profile: BusinessProfile;
  presets: PresetItem[];
  clients: ClientProfile[];
  expenses: Expense[];
  isOnline: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  userEmail: string | null;
  onLogin: () => void;
  onLogout: () => void;
  onOpenProfile: () => void;
  onOpenInvoiceEditor: (invoice: Invoice | null) => void;
  onDeleteInvoice: (id: string) => void;
  onBulkDeleteInvoices: (ids: string[]) => void;
  onBulkUpdateInvoicesStatus: (ids: string[], status: InvoiceStatus) => void;
  onLoadPresetTemplate: (templateId: string) => void;
  isPinLockEnabled: boolean;
  isBiometricsEnabled: boolean;
  onToggleSecurity: (type: 'pin' | 'bio') => void;
  onSyncLocalInvoices: () => void;
  onSaveClient: (client: ClientProfile) => void;
  onDeleteClient: (id: string) => void;
  onSaveExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
}

export default function Dashboard({
  invoices,
  profile,
  presets,
  clients,
  expenses,
  isOnline,
  theme,
  toggleTheme,
  userEmail,
  onLogin,
  onLogout,
  onOpenProfile,
  onOpenInvoiceEditor,
  onDeleteInvoice,
  onBulkDeleteInvoices,
  onBulkUpdateInvoicesStatus,
  onLoadPresetTemplate,
  isPinLockEnabled,
  isBiometricsEnabled,
  onToggleSecurity,
  onSyncLocalInvoices,
  onSaveClient,
  onDeleteClient,
  onSaveExpense,
  onDeleteExpense
}: DashboardProps) {
  // Navigation tabs: 'dashboard' | 'profile' | 'learn' | 'invoices' | 'clients' | 'reports' | 'master_vendor' ...
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  // Custom scroll recovery behavior to guarantee the dashboard opens from the top instead of stays scrolled to the bottom on sign-in
  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isMasterExpanded, setIsMasterExpanded] = useState(true);
  const [isCatalogExpanded, setIsCatalogExpanded] = useState(true);

  // Reusable Master & Catalog form builders state
  const [editingMasterItem, setEditingMasterItem] = useState<any | null>(null);
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);

  // Master databases seed
  const [vendors, setVendors] = useState<any[]>(() => {
    const cached = localStorage.getItem('makinvoice_masters_vendors');
    if (cached) return JSON.parse(cached);
    return [
      { id: 'v_1', name: 'AWS Cloud Hosting', company: 'Amazon Web Services', email: 'billing@aws.com', phone: '1-800-AWS', address: 'Seattle, WA', category: 'SaaS Subscriptions' },
      { id: 'v_2', name: 'WeWork Office Space', company: 'WeWork LLC', email: 'billing@wework.com', phone: '+1-555-WEWORK', address: 'Tech Plaza, SF, CA', category: 'Rent & Overheads' },
      { id: 'v_3', name: 'Google Suite Workspace', company: 'Google Cloud Corp', email: 'gsuite@google.com', phone: '1-800-GOOGLE', address: 'Mountain View, CA', category: 'SaaS Subscriptions' }
    ];
  });

  const [hsnCodes, setHsnCodes] = useState<any[]>(() => {
    const cached = localStorage.getItem('makinvoice_masters_hsn');
    if (cached) return JSON.parse(cached);
    return [
      { id: 'h_1', code: '998311', description: 'Technical & Software Consulting services (SAC)', gstRate: 18 },
      { id: 'h_2', code: '998313', description: 'Management Advisory & General Corporate Consulting (SAC)', gstRate: 18 },
      { id: 'h_3', code: '997331', description: 'Software SaaS Licensing & Subscriptions (SAC)', gstRate: 18 },
      { id: 'h_4', code: '847130', description: 'Computer Laptops & Hardware Machinery Import', gstRate: 18 }
    ];
  });

  const [glAccounts, setGlAccounts] = useState<any[]>(() => {
    const cached = localStorage.getItem('makinvoice_masters_gl');
    if (cached) return JSON.parse(cached);
    return [
      { id: 'gl_1', code: 'GL-100', name: 'Professional Advisory Revenue', type: 'Revenue' },
      { id: 'gl_2', code: 'GL-200', name: 'AWS Infrastructure overheads', type: 'Expense' },
      { id: 'gl_3', code: 'GL-300', name: 'Office Leases Rent & utilities', type: 'Expense' },
      { id: 'gl_4', code: 'GL-400', name: 'Contractor Sinking charges', type: 'Expense' }
    ];
  });

  // Catalog Master database seed
  const [materials, setMaterials] = useState<any[]>(() => {
    const cached = localStorage.getItem('makinvoice_masters_materials');
    if (cached) return JSON.parse(cached);
    return [
      { id: 'm_1', name: 'Premium Software Architecture Review', rate: 120000, hsn: '998311', uom: 'PCS', category: 'Technical Consultancy' },
      { id: 'm_2', name: 'Node.js Enterprise Server Setup', rate: 85000, hsn: '998311', uom: 'PCS', category: 'Engineering Work' },
      { id: 'm_3', name: 'DevOps Pipeline Automations retainer', rate: 45000, hsn: '998311', uom: 'HRS', category: 'Technical Consultancy' }
    ];
  });

  const [categories, setCategories] = useState<any[]>(() => {
    const cached = localStorage.getItem('makinvoice_masters_categories');
    if (cached) return JSON.parse(cached);
    return [
      { id: 'cat_1', name: 'Technical Consultancy', description: 'Architectural, DevOps, review sessions' },
      { id: 'cat_2', name: 'Engineering Work', description: 'Core product programming and server installations' },
      { id: 'cat_3', name: 'Training Programs', description: 'Corporate developer training upskilling courses' }
    ];
  });

  const [subCategories, setSubCategories] = useState<any[]>(() => {
    const cached = localStorage.getItem('makinvoice_masters_subcategories');
    if (cached) return JSON.parse(cached);
    return [
      { id: 'scat_1', category: 'Technical Consultancy', name: 'Cloud Infrastructure Auditing' },
      { id: 'scat_2', category: 'Technical Consultancy', name: 'Security Review' },
      { id: 'scat_3', category: 'Engineering Work', name: 'React UI Architecture Development' }
    ];
  });

  const [mappings, setMappings] = useState<any[]>(() => {
    const cached = localStorage.getItem('makinvoice_masters_mappings');
    if (cached) return JSON.parse(cached);
    return [
      { id: 'map_1', item: 'Premium Software Architecture Review', glAccount: 'Professional Advisory Revenue', taxRate: 18 },
      { id: 'map_2', item: 'AWS Cloud Hosting Mapping', glAccount: 'AWS Infrastructure overheads', taxRate: 18 }
    ];
  });

  const [packingUnits, setPackingUnits] = useState<any[]>(() => {
    const cached = localStorage.getItem('makinvoice_masters_packing');
    if (cached) return JSON.parse(cached);
    return [
      { id: 'p_1', name: 'PCS (Single items pack)' },
      { id: 'p_2', name: 'BOX (Sealed cardboard cartons)' },
      { id: 'p_3', name: 'ENV (Flat protective paper envelopes)' }
    ];
  });

  const [measurementUnits, setMeasurementUnits] = useState<any[]>(() => {
    const cached = localStorage.getItem('makinvoice_masters_measurement');
    if (cached) return JSON.parse(cached);
    return [
      { id: 'mu_1', code: 'PCS', name: 'Pieces' },
      { id: 'mu_2', code: 'HRS', name: 'Hours billed' },
      { id: 'mu_3', code: 'DAY', name: 'Days duration' },
      { id: 'mu_4', code: 'MTR', name: 'Meters linear' },
      { id: 'mu_5', code: 'KGS', name: 'Kilograms weight' }
    ];
  });
  // --- Auto-sync items from invoices into material catalog ---
  useEffect(() => {
    if (!invoices || invoices.length === 0) return;
    
    let changed = false;
    let updatedMaterials = [...materials];

    invoices.forEach(inv => {
      if (!inv.items) return;
      inv.items.forEach(item => {
        if (item.name && item.name.trim() !== '') {
          const nameLower = item.name.trim().toLowerCase();
          const exists = updatedMaterials.some(m => m.name && m.name.toLowerCase() === nameLower);
          
          if (!exists) {
            changed = true;
            updatedMaterials.push({
              id: `mat_${Math.random().toString(36).substr(2, 9)}`,
              name: item.name.trim(),
              rate: item.rate || 0,
              hsn: item.hsnCode || item.sacCode || '',
              uom: item.quantityType || 'unit',
              category: 'Auto-Added from Invoice'
            });
          }
        }
      });
    });

    if (changed) {
      setMaterials(updatedMaterials);
      localStorage.setItem('makinvoice_masters_materials', JSON.stringify(updatedMaterials));
    }
  }, [invoices, materials]);

  // Reusable Master Database handlers
  const handleSaveMasterItem = (item: any) => {
    let list: any[] = [];
    let key = '';
    let setter: any = null;

    switch (activeTab) {
      case 'master_vendor':
        list = vendors;
        key = 'makinvoice_masters_vendors';
        setter = setVendors;
        break;
      case 'master_hsn':
        list = hsnCodes;
        key = 'makinvoice_masters_hsn';
        setter = setHsnCodes;
        break;
      case 'master_gl':
        list = glAccounts;
        key = 'makinvoice_masters_gl';
        setter = setGlAccounts;
        break;
      case 'catalog_material':
        list = materials;
        key = 'makinvoice_masters_materials';
        setter = setMaterials;
        break;
      case 'catalog_category':
        list = categories;
        key = 'makinvoice_masters_categories';
        setter = setCategories;
        break;
      case 'catalog_sub_category':
        list = subCategories;
        key = 'makinvoice_masters_subcategories';
        setter = setSubCategories;
        break;
      case 'catalog_mapping':
        list = mappings;
        key = 'makinvoice_masters_mappings';
        setter = setMappings;
        break;
      case 'catalog_packing_unit':
        list = packingUnits;
        key = 'makinvoice_masters_packing';
        setter = setPackingUnits;
        break;
      case 'catalog_measurement_unit':
        list = measurementUnits;
        key = 'makinvoice_masters_measurement';
        setter = setMeasurementUnits;
        break;
    }

    if (!setter) return;

    const exists = list.some(i => i.id === item.id);
    const updated = exists ? list.map(i => i.id === item.id ? item : i) : [item, ...list];
    
    setter(updated);
    localStorage.setItem(key, JSON.stringify(updated));
    setIsMasterModalOpen(false);
    setEditingMasterItem(null);
  };

  const handleDeleteMasterItem = (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this record?');
    if (!confirmed) return;

    let list: any[] = [];
    let key = '';
    let setter: any = null;

    switch (activeTab) {
      case 'master_vendor':
        list = vendors;
        key = 'makinvoice_masters_vendors';
        setter = setVendors;
        break;
      case 'master_hsn':
        list = hsnCodes;
        key = 'makinvoice_masters_hsn';
        setter = setHsnCodes;
        break;
      case 'master_gl':
        list = glAccounts;
        key = 'makinvoice_masters_gl';
        setter = setGlAccounts;
        break;
      case 'catalog_material':
        list = materials;
        key = 'makinvoice_masters_materials';
        setter = setMaterials;
        break;
      case 'catalog_category':
        list = categories;
        key = 'makinvoice_masters_categories';
        setter = setCategories;
        break;
      case 'catalog_sub_category':
        list = subCategories;
        key = 'makinvoice_masters_subcategories';
        setter = setSubCategories;
        break;
      case 'catalog_mapping':
        list = mappings;
        key = 'makinvoice_masters_mappings';
        setter = setMappings;
        break;
      case 'catalog_packing_unit':
        list = packingUnits;
        key = 'makinvoice_masters_packing';
        setter = setPackingUnits;
        break;
      case 'catalog_measurement_unit':
        list = measurementUnits;
        key = 'makinvoice_masters_measurement';
        setter = setMeasurementUnits;
        break;
    }

    if (!setter) return;

    const updated = list.filter(i => i.id !== id);
    setter(updated);
    localStorage.setItem(key, JSON.stringify(updated));
  };

  const renderNavMenuContent = (isMobileView: boolean = false) => {
    const handleTabClick = (tab: string) => {
      setActiveTab(tab);
      if (isMobileView) {
        setIsMobileDrawerOpen(false);
      }
    };

    return (
      <div className="flex flex-col h-full space-y-5 text-sans select-none">
        
        {/* User Card info */}
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm shadow-indigo-500/20">
            {profile.name ? profile.name.charAt(0).toUpperCase() : 'C'}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase leading-tight truncate">{profile.name || 'Crix'}</h4>
            <span className="text-[10px] text-slate-400 font-mono tracking-wide mt-0.5 block truncate">{profile.mobile || profile.phone || '9899728185'}</span>
          </div>
        </div>

        {/* Core items group */}
        <div className="space-y-1">
          <span className="text-[9px] uppercase font-extrabold tracking-widest text-slate-400 block pb-1">Primary Menu</span>
          
          <button
            onClick={() => handleTabClick('dashboard')}
            className={`w-full px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold transition-all flex items-center gap-2.5 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-950/10 font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Billing Dashboard</span>
          </button>

          {/* My Profile Link moved to the top bar as requested */}

          <button
            onClick={() => handleTabClick('learn')}
            className={`w-full px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold transition-all flex items-center gap-2.5 cursor-pointer ${
              activeTab === 'learn'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-950/10 font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            <span>Learn MakInvoice</span>
          </button>

          <button
            onClick={() => {
              onOpenInvoiceEditor(null);
              if (isMobileView) setIsMobileDrawerOpen(false);
            }}
            className="w-full px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all flex items-center gap-2.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-500" />
            <span>Add New Invoice</span>
          </button>

          <button
            onClick={() => handleTabClick('invoices')}
            className={`w-full px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
              activeTab === 'invoices'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-950/10 font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4" />
              <span>Invoices Ledger</span>
            </div>
            <span className={`text-[9.5px] px-1.5 py-0.5 rounded-full font-medium ${activeTab === 'invoices' ? 'bg-sky-705 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
              {invoices.length}
            </span>
          </button>

          <button
            onClick={() => handleTabClick('clients')}
            className={`w-full px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
              activeTab === 'clients'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-950/10 font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Notebook className="w-4 h-4" />
              <span>Clients Database</span>
            </div>
            <span className={`text-[9.5px] px-1.5 py-0.5 rounded-full font-medium ${activeTab === 'clients' ? 'bg-sky-705 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
              {clients.length}
            </span>
          </button>

          <button
            onClick={() => handleTabClick('reports')}
            className={`w-full px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-950/10 font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <BarChart3 className="w-4 h-4" />
              <span>Accounting Summary</span>
            </div>
          </button>
        </div>

        {/* Master collapse selection */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setIsMasterExpanded(!isMasterExpanded)}
            className="w-full flex items-center justify-between text-[10px] uppercase font-extrabold tracking-widest text-slate-400 py-1 cursor-pointer hover:text-slate-600 dark:hover:text-white"
          >
            <span>Master Registry</span>
            <span className="text-slate-400">{isMasterExpanded ? '▲' : '▼'}</span>
          </button>

          {isMasterExpanded && (
            <div className="pl-2 space-y-0.5 border-l border-slate-100 dark:border-slate-800 ml-1.5 my-1">
              <button
                onClick={() => handleTabClick('master_vendor')}
                className={`w-full px-3 py-1.5 rounded-lg text-left text-[11px] font-semibold transition-all block cursor-pointer ${
                  activeTab === 'master_vendor' ? 'bg-sky-600/10 text-sky-600 dark:text-sky-450 font-extrabold font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                🏢 Vendor Master
              </button>
              <button
                onClick={() => handleTabClick('master_hsn')}
                className={`w-full px-3 py-1.5 rounded-lg text-left text-[11px] font-semibold transition-all block cursor-pointer ${
                  activeTab === 'master_hsn' ? 'bg-sky-600/10 text-sky-600 dark:text-sky-450 font-extrabold font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                🔢 HSN Registry
              </button>
              <button
                onClick={() => handleTabClick('master_gl')}
                className={`w-full px-3 py-1.5 rounded-lg text-left text-[11px] font-semibold transition-all block cursor-pointer ${
                  activeTab === 'master_gl' ? 'bg-sky-600/10 text-sky-600 dark:text-sky-450 font-extrabold font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                📒 General Ledger
              </button>
            </div>
          )}
        </div>

        {/* Catalog collapse selection */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setIsCatalogExpanded(!isCatalogExpanded)}
            className="w-full flex items-center justify-between text-[10px] uppercase font-extrabold tracking-widest text-slate-400 py-1 cursor-pointer hover:text-slate-600 dark:hover:text-white"
          >
            <span>Catalog Master</span>
            <span className="text-slate-400">{isCatalogExpanded ? '▲' : '▼'}</span>
          </button>

          {isCatalogExpanded && (
            <div className="pl-2 space-y-0.5 border-l border-slate-100 dark:border-slate-800 ml-1.5 my-1">
              <button
                onClick={() => handleTabClick('catalog_material')}
                className={`w-full px-3 py-1.5 rounded-lg text-left text-[11px] font-semibold transition-all block cursor-pointer ${
                  activeTab === 'catalog_material' ? 'bg-sky-600/10 text-sky-600 dark:text-sky-450 font-extrabold font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                🛠️ Material Catalog
              </button>
              <button
                onClick={() => handleTabClick('catalog_category')}
                className={`w-full px-3 py-1.5 rounded-lg text-left text-[11px] font-semibold transition-all block cursor-pointer ${
                  activeTab === 'catalog_category' ? 'bg-sky-600/10 text-sky-600 dark:text-sky-450 font-extrabold font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                🏷️ Product Category
              </button>
              <button
                onClick={() => handleTabClick('catalog_sub_category')}
                className={`w-full px-3 py-1.5 rounded-lg text-left text-[11px] font-semibold transition-all block cursor-pointer ${
                  activeTab === 'catalog_sub_category' ? 'bg-sky-600/10 text-sky-600 dark:text-sky-450 font-extrabold font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                📑 Sub-Category
              </button>
              <button
                onClick={() => handleTabClick('catalog_mapping')}
                className={`w-full px-3 py-1.5 rounded-lg text-left text-[11px] font-semibold transition-all block cursor-pointer ${
                  activeTab === 'catalog_mapping' ? 'bg-sky-600/10 text-sky-600 dark:text-sky-450 font-extrabold font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                📊 Class Mapping
              </button>
              <button
                onClick={() => handleTabClick('catalog_packing_unit')}
                className={`w-full px-3 py-1.5 rounded-lg text-left text-[11px] font-semibold transition-all block cursor-pointer ${
                  activeTab === 'catalog_packing_unit' ? 'bg-sky-600/10 text-sky-600 dark:text-sky-450 font-extrabold font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                📦 Packing Unit
              </button>
              <button
                onClick={() => handleTabClick('catalog_measurement_unit')}
                className={`w-full px-3 py-1.5 rounded-lg text-left text-[11px] font-semibold transition-all block cursor-pointer ${
                  activeTab === 'catalog_measurement_unit' ? 'bg-sky-600/10 text-sky-600 dark:text-sky-450 font-extrabold font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                📐 Measurement Unit
              </button>
            </div>
          )}
        </div>

        {/* Bottom sign out */}
        <div className="pt-4 pb-6 border-t border-slate-100 dark:border-slate-800 mt-auto">
          {userEmail ? (
            <button
              onClick={() => {
                onLogout();
                if (isMobileView) setIsMobileDrawerOpen(false);
              }}
              className="w-full px-3 py-2 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-955 text-rose-600 dark:text-rose-450 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-transparent dark:border-rose-900/30 font-bold"
            >
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </button>
          ) : (
            <button
              onClick={() => {
                onLogin();
                if (isMobileView) setIsMobileDrawerOpen(false);
              }}
              className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm font-bold"
            >
              <LogIn className="w-4 h-4" />
              <span>Log In</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderMasterTableSection = () => {
    let title = '';
    let description = '';
    let list: any[] = [];
    let columns: { header: string; key: string }[] = [];
    let fields: { label: string; key: string; type: string; options?: string[] }[] = [];

    switch (activeTab) {
      case 'master_vendor':
        title = 'Vendor Master Directory';
        description = 'Authorized supplier entities, software licensing portals, and utilities';
        list = vendors;
        columns = [
          { header: 'Supplier Name', key: 'name' },
          { header: 'Affiliation Company', key: 'company' },
          { header: 'Tax Category', key: 'category' },
          { header: 'Email Coordinates', key: 'email' }
        ];
        fields = [
          { label: 'Supplier Name', key: 'name', type: 'text' },
          { label: 'Company / Organization', key: 'company', type: 'text' },
          { label: 'Category', key: 'category', type: 'text' },
          { label: 'Email', key: 'email', type: 'email' },
          { label: 'Telephone Number', key: 'phone', type: 'text' },
          { label: 'Corporate Address', key: 'address', type: 'text' }
        ];
        break;
      case 'master_hsn':
        title = 'HSN Code & GST SAC Registry';
        description = 'Official Service Accounting Codes (SAC) paired with standard taxation coefficients';
        list = hsnCodes;
        columns = [
          { header: 'HSN/SAC Code', key: 'code' },
          { header: 'Description / Activity', key: 'description' },
          { header: 'GST Multiplier Percentage', key: 'gstRate' }
        ];
        fields = [
          { label: 'HSN/SAC Code', key: 'code', type: 'text' },
          { label: 'HSN Code Description', key: 'description', type: 'text' },
          { label: 'GST Percentage Rate', key: 'gstRate', type: 'number' }
        ];
        break;
      case 'master_gl':
        title = 'General Ledger Chart accounts';
        description = 'Central financial accounts linked to double-entry ledger bookkeeping schemas';
        list = glAccounts;
        columns = [
          { header: 'GL Account Index', key: 'code' },
          { header: 'Ledger Name', key: 'name' },
          { header: 'Account Category Type', key: 'type' }
        ];
        fields = [
          { label: 'GL Account Identifier Code', key: 'code', type: 'text' },
          { label: 'Ledger Name', key: 'name', type: 'text' },
          { label: 'Account Category Type', key: 'type', type: 'select', options: ['Revenue', 'Expense', 'Asset', 'Liability'] }
        ];
        break;
      case 'catalog_material':
        title = 'Itemized Catalog Material Database';
        description = 'Pre-configured product configurations, consultancy deliverables, and custom rates';
        list = materials;
        columns = [
          { header: 'Material / Product Name', key: 'name' },
          { header: 'Consultancy rate', key: 'rate' },
          { header: 'Measurement standard', key: 'uom' },
          { header: 'Associated SAC', key: 'hsn' }
        ];
        fields = [
          { label: 'Material Name', key: 'name', type: 'text' },
          { label: 'Standard Rate per Unit', key: 'rate', type: 'number' },
          { label: 'HSN/SAC Reference', key: 'hsn', type: 'text' },
          { label: 'Measurement standard (UOM)', key: 'uom', type: 'text' },
          { label: 'Custom Category', key: 'category', type: 'text' }
        ];
        break;
      case 'catalog_category':
        title = 'Inventory & Service Categories';
        description = 'Macro directories for sorting catalog materials and advisory items';
        list = categories;
        columns = [
          { header: 'Category Name', key: 'name' },
          { header: 'Scope / Definition', key: 'description' }
        ];
        fields = [
          { label: 'Category Name', key: 'name', type: 'text' },
          { label: 'Scope Description', key: 'description', type: 'text' }
        ];
        break;
      case 'catalog_sub_category':
        title = 'Sub-Category Directories';
        description = 'Sub-level sorting codes mapped to global product classifications';
        list = subCategories;
        columns = [
          { header: 'Main Category Link', key: 'category' },
          { header: 'Sub-Category Name', key: 'name' }
        ];
        fields = [
          { label: 'Parent Category Name', key: 'category', type: 'text' },
          { label: 'Sub-Category Code Name', key: 'name', type: 'text' }
        ];
        break;
      case 'catalog_mapping':
        title = 'GL Ledger Mapping Schemas';
        description = 'Custom assignments binding catalog items to exact general ledger lines';
        list = mappings;
        columns = [
          { header: 'Target Item Deliverable', key: 'item' },
          { header: 'GL Account Destination', key: 'glAccount' },
          { header: 'Tax Scheme rate (%)', key: 'taxRate' }
        ];
        fields = [
          { label: 'Target Item / Deliverable Name', key: 'item', type: 'text' },
          { label: 'Destination GL Account Code', key: 'glAccount', type: 'text' },
          { label: 'Default Tax Rate (%)', key: 'taxRate', type: 'number' }
        ];
        break;
      case 'catalog_packing_unit':
        title = 'Product Packing Specifications';
        description = 'Packaging sizes, carton dimensions, and protective cases catalogs';
        list = packingUnits;
        columns = [
          { header: 'Packing Name Identifier', key: 'name' }
        ];
        fields = [
          { label: 'Packing Name Code', key: 'name', type: 'text' }
        ];
        break;
      case 'catalog_measurement_unit':
        title = 'Measurement standard system (UOM)';
        description = 'Advisory units of measure matching official international billing specifications';
        list = measurementUnits;
        columns = [
          { header: 'UOM standard Code', key: 'code' },
          { header: 'Descriptive Name', key: 'name' }
        ];
        fields = [
          { label: 'UOM System Code', key: 'code', type: 'text' },
          { label: 'Descriptive Standard Name', key: 'name', type: 'text' }
        ];
        break;
      default:
        return null;
    }

    const filteredList = list.filter(item => {
      const searchStr = searchTerm.toLowerCase();
      return Object.values(item).some(val => String(val).toLowerCase().includes(searchStr));
    });

    return (
      <div className="space-y-4 text-sans animate-in fade-in duration-205">
        
        {/* Header toolbar banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-4 rounded-3xl shadow-xs">
          <div>
            <h2 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-1.5">
              <span>🗄️ {title}</span>
            </h2>
            <span className="text-[10px] text-slate-400 block mt-0.5">{description}</span>
          </div>
          
          <button
            onClick={() => {
              setEditingMasterItem({ id: 'm_item_' + Date.now() });
              setIsMasterModalOpen(true);
            }}
            className="px-3.5 py-1.5 self-start sm:self-center bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-[10px] font-extrabold tracking-wide flex items-center gap-1 cursor-pointer shadow-md shadow-sky-950/10 animate-bounce"
            style={{ animationDuration: '3s' }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Registry Record</span>
          </button>
        </div>

        {/* Live Filter bar */}
        <div className="relative">
          <input
            type="text"
            placeholder={`Search through ${list.length} directories live...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3.5 py-2 pl-9 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl text-[11px] text-slate-700 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500/25 transition-all shadow-2xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        {/* Dynamic Table Card display */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/65 rounded-3xl overflow-hidden shadow-xs">
          {filteredList.length === 0 ? (
            <div className="p-12 text-center">
              <Database className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-pulse" />
              <p className="text-xs font-medium text-slate-400">No synchronized registry records matching search query</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/45 border-b border-slate-100 dark:border-slate-800">
                    {columns.map((col, idx) => (
                      <th key={idx} className="p-3 text-[9px] uppercase font-extrabold tracking-wider text-slate-400">{col.header}</th>
                    ))}
                    <th className="p-3 text-[9px] uppercase font-extrabold tracking-wider text-slate-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {filteredList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors">
                      {columns.map((col, idx2) => (
                        <td key={idx2} className="p-3 text-[11px] font-medium text-slate-700 dark:text-slate-200">
                          {col.key === 'rate' ? `${currencySymbol}${parseFloat(item[col.key] || 0).toLocaleString()}` : String(item[col.key] || '')}
                        </td>
                      ))}
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingMasterItem(item);
                              setIsMasterModalOpen(true);
                            }}
                            className="p-1.5 hover:bg-sky-50 dark:hover:bg-sky-955/35 text-sky-600 dark:text-sky-400 rounded-lg transition-colors cursor-pointer"
                            aria-label="Edit record"
                          >
                            <PenTool className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMasterItem(item.id)}
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-955/35 text-rose-500 rounded-lg transition-colors cursor-pointer"
                            aria-label="Delete record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Master Registry Form overlay Dialog Modal */}
        {isMasterModalOpen && editingMasterItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/45 backdrop-blur-3xs">
            <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-tight">Record Editor</h3>
                <button
                  onClick={() => {
                    setIsMasterModalOpen(false);
                    setEditingMasterItem(null);
                  }}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveMasterItem(editingMasterItem);
                }}
                className="space-y-3 text-left"
              >
                {fields.map((f, idx3) => (
                  <div key={idx3}>
                    <label className="block text-[8px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">{f.label}</label>
                    {f.type === 'select' ? (
                      <select
                        value={editingMasterItem[f.key] || ''}
                        onChange={(e) => setEditingMasterItem({ ...editingMasterItem, [f.key]: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl text-[10px] font-medium text-slate-800 dark:text-white focus:outline-none"
                        required
                      >
                        <option value="">Select type</option>
                        {f.options?.map((opt, idxOpt) => (
                          <option key={idxOpt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={f.type}
                        value={editingMasterItem[f.key] || ''}
                        onChange={(e) => setEditingMasterItem({ ...editingMasterItem, [f.key]: f.type === 'number' ? parseFloat(e.target.value) : e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl text-[10px] font-medium text-slate-800 dark:text-white focus:outline-none"
                        required
                      />
                    )}
                  </div>
                ))}

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMasterModalOpen(false);
                      setEditingMasterItem(null);
                    }}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-500 rounded-lg text-[9px] font-bold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[9px] font-bold cursor-pointer transition-all shadow-md shadow-sky-950/10"
                  >
                    Commit Record
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTrendChartSection = () => {
    const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const records: { label: string; income: number; expense: number }[] = [];
    const now = new Date();
    
    // Last 6 months chronological
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      records.push({
        label: `${monthsShort[d.getMonth()]}`,
        income: 0,
        expense: 0
      });
    }

    // Populate invoices
    invoices.forEach(inv => {
      if (inv.status === 'paid') {
        const dateObj = new Date(inv.date);
        if (!isNaN(dateObj.getTime())) {
          const label = monthsShort[dateObj.getMonth()];
          const match = records.find(r => r.label === label);
          if (match) match.income += inv.grandTotal;
        }
      }
    });

    // Populate expenses
    expenses.forEach(exp => {
      const dateObj = new Date(exp.date);
      if (!isNaN(dateObj.getTime())) {
        const label = monthsShort[dateObj.getMonth()];
        const match = records.find(r => r.label === label);
        if (match) match.expense += exp.amount;
      }
    });

    // Chart Math coordinates
    const maxVal = Math.max(...records.map(d => Math.max(d.income, d.expense)), 100);
    const chartHeight = 130;
    const chartWidth = 500;
    const paddingX = 42;
    const paddingY = 20;
    const usableHeight = chartHeight - paddingY * 2;
    const usableWidth = chartWidth - paddingX * 2;

    const pointsIncome = records.map((d, index) => {
      const x = paddingX + (index / (records.length - 1)) * usableWidth;
      const y = chartHeight - paddingY - (d.income / maxVal) * usableHeight;
      return { x, y };
    });

    const pointsExpense = records.map((d, index) => {
      const x = paddingX + (index / (records.length - 1)) * usableWidth;
      const y = chartHeight - paddingY - (d.expense / maxVal) * usableHeight;
      return { x, y };
    });

    const pathIncomeString = pointsIncome.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaIncomeString = pointsIncome.length > 0 
      ? `${pathIncomeString} L ${pointsIncome[pointsIncome.length - 1].x} ${chartHeight - paddingY} L ${pointsIncome[0].x} ${chartHeight - paddingY} Z`
      : '';

    const pathExpenseString = pointsExpense.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaExpenseString = pointsExpense.length > 0 
      ? `${pathExpenseString} L ${pointsExpense[pointsExpense.length - 1].x} ${chartHeight - paddingY} L ${pointsExpense[0].x} ${chartHeight - paddingY} Z`
      : '';

    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4 rounded-2.5xl shadow-sm text-sans">
        <div className="flex justify-between items-center mb-3">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Monthly Billings trend</span>
            <span className="text-[9px] text-slate-400 block mt-0.5">Income vs expense overview over past months</span>
          </div>
          <div className="flex items-center gap-3 text-[9px] font-medium">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Settled Cash</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Expenses</span>
          </div>
        </div>

        {/* Pure SVG line mapping */}
        <div className="w-full h-36">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible animate-pulse-subtle">
            <defs>
              <linearGradient id="incAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="expAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid guidelines line helper */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const y = paddingY + ratio * usableHeight;
              const labelValue = Math.round(maxVal * (1 - ratio));
              return (
                <g key={idx} className="opacity-40">
                  <line x1={paddingX} y1={y} x2={chartWidth - paddingX} y2={y} stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" className="text-slate-100 dark:text-slate-800" />
                  <text x={paddingX - 8} y={y + 3} textAnchor="end" className="text-[8px] font-mono fill-slate-400 font-extrabold">{currencySymbol}{labelValue}</text>
                </g>
              );
            })}

            {/* Area drawings */}
            {areaIncomeString && <path d={areaIncomeString} fill="url(#incAreaGrad)" />}
            {areaExpenseString && <path d={areaExpenseString} fill="url(#expAreaGrad)" />}

            {/* Line paths */}
            {pathIncomeString && <path d={pathIncomeString} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />}
            {pathExpenseString && <path d={pathExpenseString} fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />}

            {/* Dot indicators and coordinates values */}
            {pointsIncome.map((pts, i) => (
              <g key={`inc-grp-${i}`}>
                <circle cx={pts.x} cy={pts.y} r="3" fill="#10b981" stroke="#fff" strokeWidth="1" />
              </g>
            ))}
            {pointsExpense.map((pts, i) => (
              <g key={`exp-grp-${i}`}>
                <circle cx={pts.x} cy={pts.y} r="3" fill="#f43f5e" stroke="#fff" strokeWidth="1" />
              </g>
            ))}

            {/* Bottom months labels */}
            {records.map((r, i) => {
              const x = paddingX + (i / (records.length - 1)) * usableWidth;
              return (
                <text key={`lbl-${i}`} x={x} y={chartHeight - 4} textAnchor="middle" className="text-[9px] font-extrabold fill-slate-400 font-mono">{r.label}</text>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);

  // Automatically flush bulk selection upon any filter/tab alterations
  React.useEffect(() => {
    setSelectedInvoiceIds([]);
  }, [searchTerm, statusFilter, activeTab]);

  const handleToggleSelectInvoice = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering detail preview popup overlay
    if (selectedInvoiceIds.includes(id)) {
      setSelectedInvoiceIds(prev => prev.filter(item => item !== id));
    } else {
      setSelectedInvoiceIds(prev => [...prev, id]);
    }
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredInvoices.map(inv => inv.id);
    const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedInvoiceIds.includes(id));
    if (isAllSelected) {
      setSelectedInvoiceIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedInvoiceIds(prev => {
        const combined = Array.from(new Set([...prev, ...allFilteredIds]));
        return combined;
      });
    }
  };

  const handleBulkExportExcel = () => {
    const selected = invoices.filter(inv => selectedInvoiceIds.includes(inv.id));
    if (selected.length === 0) return;

    // Build the official CSV string matching user details
    const headers = ['Invoice Number', 'Document Type', 'Recipient Client', 'Billing Email', 'Issue Date', 'Due Date', 'Sum Total Billed', 'Settlement Status'];
    const rmbComma = (val: string) => (val || '').replace(/"/g, '""');

    const rows = selected.map(inv => [
      `"${rmbComma(inv.invoiceNumber)}"`,
      `"${rmbComma(inv.invoiceType || 'invoice')}"`,
      `"${rmbComma(inv.clientName)}"`,
      `"${rmbComma(inv.clientEmail || '')}"`,
      `"${rmbComma(inv.date)}"`,
      `"${rmbComma(inv.dueDate)}"`,
      inv.grandTotal.toFixed(2),
      `"${rmbComma(inv.status)}"`
    ]);

    // Format with UTF-8 BOM to keep accurate symbols representation
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.style.display = 'none';
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Invoices_Bulk_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkExportPDF = () => {
    const selected = invoices.filter(inv => selectedInvoiceIds.includes(inv.id));
    if (selected.length === 0) return;
    
    // Sequentially download each document safely
    selected.forEach((inv, index) => {
      setTimeout(() => {
        exportInvoicePDF(inv, profile);
      }, index * 250); // slight stagger prevents navigation block warnings
    });
  };

  const handleExportAllCSV = () => {
    if (invoices.length === 0) {
      alert("No invoice records to export.");
      return;
    }

    // Build structured CSV header matching advanced fields
    const headers = [
      'Invoice Number', 
      'Document Type', 
      'Recipient Client', 
      'Billing Email', 
      'Client Phone',
      'Client Address',
      'Issue Date', 
      'Due Date', 
      'Subtotal', 
      'Tax Amount', 
      'Discount Amount',
      'Sum Total Billed', 
      'Settlement Status',
      'Reference Number',
      'PO Number',
      'Is Recurring',
      'Notes'
    ];
    const rmbComma = (val: string) => {
      if (!val) return '';
      return ('' + val).replace(/"/g, '""');
    };

    const rows = invoices.map(inv => [
      `"${rmbComma(inv.invoiceNumber)}"`,
      `"${rmbComma(inv.invoiceType || 'invoice')}"`,
      `"${rmbComma(inv.clientName)}"`,
      `"${rmbComma(inv.clientEmail || '')}"`,
      `"${rmbComma(inv.clientPhone || '')}"`,
      `"${rmbComma(inv.clientAddress || '')}"`,
      `"${rmbComma(inv.date)}"`,
      `"${rmbComma(inv.dueDate)}"`,
      inv.subtotal.toFixed(2),
      (inv.taxTotal || 0).toFixed(2),
      (inv.discountTotal || 0).toFixed(2),
      inv.grandTotal.toFixed(2),
      `"${rmbComma(inv.status)}"`,
      `"${rmbComma(inv.referenceNumber || '')}"`,
      `"${rmbComma(inv.poNumber || '')}"`,
      inv.recurringSettings?.isRecurring ? 'YES' : 'NO',
      `"${rmbComma(inv.notes || '')}"`
    ]);

    // Format with UTF-8 BOM to keep accurate symbols representation
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.style.display = 'none';
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `MakInvoice_Ledger_Spreadsheet_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Dialog overlay for live preview
  const [activePreviewInvoice, setActivePreviewInvoice] = useState<Invoice | null>(null);

  // Client Editor states
  const [isClientEditorOpen, setIsClientEditorOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientProfile | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');

  // Expense Logger states
  const [isExpenseLoggerOpen, setIsExpenseLoggerOpen] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState('Rent & Overheads');
  const [customExpenseCategory, setCustomExpenseCategory] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseDesc, setExpenseDesc] = useState('');

  // Report filter states
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportClientFilter, setReportClientFilter] = useState('all');

  const currencySymbol = getCurrencySymbol(profile.currency);

  // --- STATS ENGINES ---
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const totalBilled = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.grandTotal, 0);

  const totalOutstanding = invoices
    .filter(inv => inv.status === 'pending')
    .reduce((sum, inv) => sum + inv.grandTotal, 0);

  const totalDraft = invoices
    .filter(inv => inv.status === 'draft')
    .reduce((sum, inv) => sum + inv.grandTotal, 0);

  // --- RENDERING HELPERS ---
  const getStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case 'paid': return 'bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50';
      case 'pending': return 'bg-amber-50 dark:bg-amber-950/45 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50';
      case 'draft': return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700';
      case 'cancelled': return 'bg-rose-50 dark:bg-rose-950/45 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50';
    }
  };

  function getCurrencySymbol(code: string): string {
    switch (code) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'JPY': return '¥';
      case 'INR': return '₹';
      case 'AUD': return 'A$';
      case 'CAD': return 'C$';
      default: return '₹'; // Default INR
    }
  }

  // Resolve tax mode for preview (mirrors PDF exporter logic)
  function resolveTaxMode(inv: Invoice): 'cgst_sgst' | 'igst' | 'generic' {
    if (inv.taxMode === 'custom') {
      if (inv.customTaxType === 'local')      return 'cgst_sgst';
      if (inv.customTaxType === 'interstate') return 'igst';
      return 'generic';
    }
    const biz = (inv.companyState || '').trim().toLowerCase();
    const cli = (inv.clientState  || '').trim().toLowerCase();
    if (biz && cli) return biz === cli ? 'cgst_sgst' : 'igst';
    return 'generic';
  }

  // --- EXPORTS COMPILER ENGINES ---
  const handleExportMSWord = (inv: Invoice) => {
    const statusUpper = (inv.status || 'PENDING').toUpperCase();
    let statusBg = '#dcfce7'; // light green
    let statusTextColor = '#15803d'; // dark green
    if (statusUpper === 'PENDING') {
      statusBg = '#fef3c7'; // light amber
      statusTextColor = '#b45309'; // dark amber
    } else if (statusUpper === 'OVERDUE' || statusUpper === 'UNPAID') {
      statusBg = '#fee2e2'; // light red
      statusTextColor = '#b91c1c'; // dark red
    }

    const docHTML = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><title>Invoice ${inv.invoiceNumber}</title>
      <style>
        body { font-family: "Segoe UI", Arial, sans-serif; margin: 40px; color: #0f172a; line-height: 1.5; font-size: 13px; }
        .header-table { width: 100%; border: none; margin-bottom: 30px; }
        .biz-title { font-size: 26px; color: #0284c7; font-weight: bold; margin-bottom: 2px; }
        .doc-title { font-size: 28px; text-align: right; color: #334155; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
        .status-badge { display: inline-block; padding: 4px 10px; background-color: ${statusBg}; color: ${statusTextColor}; font-size: 11px; font-weight: bold; border-radius: 4px; text-transform: uppercase; text-align: center; }
        .details-table { width: 100%; margin-top: 20px; border: none; }
        .details-card { background-color: #f8fafc; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; width: 48%; vertical-align: top; }
        .items-table { width: 100%; margin-top: 35px; border-collapse: collapse; }
        .items-table th { background-color: #0f172a; color: #ffffff; padding: 12px; border: 1px solid #1e293b; text-align: left; font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px; }
        .items-table td { border-bottom: 1px solid #e2e8f0; padding: 12px; font-size: 12px; color: #334155; }
        .items-table tr.stripe { background-color: #f8fafc; }
        .totals-table { width: 100%; margin-top: 30px; border: none; }
        .totals-cell { text-align: right; font-size: 13px; color: #475569; padding: 4px; }
        .grand-total-text { font-size: 18px; color: #0284c7; font-weight: bold; }
        .footer-note { margin-top: 50px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-style: italic; color: #64748b; font-size: 11px; }
        .meta-label { font-weight: bold; color: #475569; }
        .meta-val { color: #0f172a; }
      </style>
      </head>
      <body>
      
      <!-- Top Branding Strip -->
      <table class="header-table" cellpadding="0" cellspacing="0">
        <tr>
          <td style="border: none; padding: 0;">
            <div class="biz-title">${profile.name}</div>
            <div style="color: #64748b; font-size: 12px;">${profile.address || ''}</div>
            ${profile.phone ? `<div style="color: #64748b; font-size: 12px;">Phone: ${profile.phone}</div>` : ''}
            ${profile.taxId ? `<div style="color: #64748b; font-size: 12px;">Tax ID/VAT: ${profile.taxId}</div>` : ''}
          </td>
          <td style="border: none; padding: 0; text-align: right; vertical-align: top;">
            <div class="doc-title">${(inv.invoiceType || 'invoice').toUpperCase()}</div>
            <div style="margin-top: 6px; margin-bottom: 10px;">
              <span class="status-badge">${statusUpper}</span>
            </div>
            <div style="font-size: 12px; color: #475569;">
              <span class="meta-label">No:</span> <span class="meta-val">${inv.invoiceNumber}</span><br/>
              <span class="meta-label">Issued:</span> <span class="meta-val">${inv.date}</span><br/>
              <span class="meta-label">Due Date:</span> <span class="meta-val">${inv.dueDate || 'Upon Receipt'}</span>
              ${inv.referenceNumber ? `<br/><span class="meta-label">Ref No:</span> <span class="meta-val">${inv.referenceNumber}</span>` : ''}
              ${inv.poNumber ? `<br/><span class="meta-label">P.O. No:</span> <span class="meta-val">${inv.poNumber}</span>` : ''}
            </div>
          </td>
        </tr>
      </table>

      <!-- Client and Payee details side by side -->
      <table class="details-table" cellpadding="0" cellspacing="0">
        <tr>
          <td class="details-card">
            <div style="font-size: 11px; font-weight: bold; color: #0284c7; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">Billed From</div>
            <div style="font-size: 14px; font-weight: bold; color: #0f172a; margin-bottom: 4px;">${profile.name}</div>
            <div style="color: #475569; font-size: 12px; line-height: 1.4;">
              ${profile.address || 'Local Sandbox Office'}<br/>
              ${profile.email ? `Email: ${profile.email}<br/>` : ''}
              ${profile.phone ? `Phone: ${profile.phone}` : ''}
            </div>
          </td>
          <td style="width: 4%; border: none;"></td>
          <td class="details-card">
            <div style="font-size: 11px; font-weight: bold; color: #0284c7; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">Billed To Client</div>
            <div style="font-size: 14px; font-weight: bold; color: #0f172a; margin-bottom: 4px;">${inv.clientName || 'Valued Client'}</div>
            <div style="color: #475569; font-size: 12px; line-height: 1.4;">
              ${inv.clientAddress || 'No Address Provided'}<br/>
              ${inv.clientEmail ? `Email: ${inv.clientEmail}<br/>` : ''}
              ${inv.clientPhone ? `Phone: ${inv.clientPhone}` : ''}
            </div>
          </td>
        </tr>
      </table>

      <!-- Itemization Table -->
      <table class="items-table" cellpadding="0" cellspacing="0">
        <thead>
          <tr>
            <th style="width: 45%;">Line Product or Service</th>
            <th style="width: 15%; text-align: right;">Unit Rate</th>
            <th style="width: 10%; text-align: right;">Qty</th>
            <th style="width: 10%; text-align: right;">Tax</th>
            <th style="width: 20%; text-align: right;">Grand Sum</th>
          </tr>
        </thead>
        <tbody>
          ${inv.items.map((it, idx) => `
            <tr class="${idx % 2 === 1 ? 'stripe' : ''}">
              <td style="padding: 12px; vertical-align: top;">
                <div style="font-weight: bold; color: #0f172a; font-size: 12px;">${it.name}</div>
                ${it.description ? `<div style="color: #64748b; font-size: 11px; margin-top: 3px;">${it.description}</div>` : ''}
              </td>
              <td style="text-align: right; vertical-align: top; padding: 12px;">${currencySymbol}${it.rate.toFixed(2)}</td>
              <td style="text-align: right; vertical-align: top; padding: 12px;">${it.quantity}</td>
              <td style="text-align: right; vertical-align: top; padding: 12px;">${it.taxPercentage}%</td>
              <td style="text-align: right; vertical-align: top; padding: 12px; font-weight: bold; color: #0f172a;">${currencySymbol}${(it.rate * it.quantity).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Grand Totals container -->
      <table class="totals-table" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width: 50%; border: none; vertical-align: top; font-size: 11px; color: #64748b;">
            ${inv.notes ? `<div style="font-weight: bold; color: #334155; margin-bottom: 5px;">Client Notes:</div><div>${inv.notes}</div>` : ''}
          </td>
          <td style="width: 50%; border: none; vertical-align: top;">
            <table style="width: 100%; border: none;" cellpadding="0" cellspacing="0">
              <tr>
                <td class="totals-cell" style="border: none;">Subtotal pre-tax:</td>
                <td class="totals-cell" style="font-weight: bold; width: 120px; border: none;">${currencySymbol}${inv.subtotal.toFixed(2)}</td>
              </tr>
              ${inv.discountType !== 'none' ? `
              <tr>
                <td class="totals-cell" style="border: none;">Deducted Discount:</td>
                <td class="totals-cell" style="color: #b91c1c; font-weight: bold; border: none;">-${currencySymbol}${inv.discountTotal.toFixed(2)}</td>
              </tr>
              ` : ''}
              <tr>
                <td class="totals-cell" style="border: none;">Total Government Tax:</td>
                <td class="totals-cell" style="font-weight: bold; border: none;">${currencySymbol}${inv.taxTotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td class="totals-cell" style="border: none; padding-top: 8px;"><span class="grand-total-text">Final Total Due:</span></td>
                <td class="totals-cell" style="padding-top: 8px; border: none;"><span class="grand-total-text">${currencySymbol}${inv.grandTotal.toFixed(2)}</span></td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Footer / Guidelines -->
      <div class="footer-note">
        <strong>Terms & Conditions Guidance:</strong> ${inv.invoiceTerms || 'Billing services subject to prompt bank transfer. Settle within designated period. Thank you for choosing Acme Services!'}<br/>
        <span style="font-size: 9px; display: block; margin-top: 8px; color: #94a3b8;">This is a premium-formatted Microsoft Word billing document generated from MakInvoice.</span>
      </div>

      </body></html>
    `;
    const blob = new Blob(['\ufeff' + docHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_${inv.invoiceNumber}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const triggerWhatsAppShare = (inv: Invoice) => {
    // Export PDF then open WhatsApp with a download note
    exportInvoicePDF(inv, profile);
    setTimeout(() => {
      const sym = profile.currency === 'INR' ? '₹' : (profile.currency === 'USD' ? '$' : profile.currency + ' ');
      const message = `Hi ${inv.clientName || 'Client'}, please find your Invoice ${inv.invoiceNumber} from ${profile.name || 'us'} for ${sym}${inv.grandTotal.toFixed(2)} (Due: ${inv.dueDate}). The PDF has been downloaded to your device. Thank you!`;
      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    }, 600);
  };

  const triggerEmailShare = (inv: Invoice) => {
    // Export PDF then open email client
    exportInvoicePDF(inv, profile);
    setTimeout(() => {
      const sym = profile.currency === 'INR' ? '₹' : (profile.currency === 'USD' ? '$' : profile.currency + ' ');
      const subject = `Invoice ${inv.invoiceNumber} from ${profile.name}`;
      const body = `Hi ${inv.clientName},\n\nPlease find attached Invoice ${inv.invoiceNumber} for ${sym}${inv.grandTotal.toFixed(2)}.\n\nInvoice Summary:\n- Invoice No: ${inv.invoiceNumber}\n- Amount Due: ${sym}${inv.grandTotal.toFixed(2)}\n- Issue Date: ${inv.date}\n- Due Date: ${inv.dueDate}\n\nThe PDF invoice has been downloaded. Please attach it to your reply or payment confirmation.\n\nThank you for your business.\n\nWarm regards,\n${profile.name}${profile.phone ? '\nTel: ' + profile.phone : ''}${profile.email ? '\nEmail: ' + profile.email : ''}`;
      const mailto = `mailto:${inv.clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailto;
    }, 600);
  };

  // --- CLIENT OPERATIONS ---
  const handleOpenClientEditor = (cl: ClientProfile | null) => {
    if (cl) {
      setEditingClient(cl);
      setClientName(cl.name);
      setClientCompany(cl.companyName || '');
      setClientEmail(cl.email || '');
      setClientPhone(cl.phone || '');
      setClientAddress(cl.address || '');
    } else {
      setEditingClient(null);
      setClientName('');
      setClientCompany('');
      setClientEmail('');
      setClientPhone('');
      setClientAddress('');
    }
    setIsClientEditorOpen(true);
  };

  const handleSaveClientForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      alert('Client name is required.');
      return;
    }
    onSaveClient({
      id: editingClient ? editingClient.id : `client_${Math.random().toString(36).substr(2, 9)}`,
      userId: editingClient ? editingClient.userId : 'local',
      name: clientName.trim(),
      companyName: clientCompany.trim(),
      email: clientEmail.trim(),
      phone: clientPhone.trim(),
      address: clientAddress.trim(),
      createdAt: editingClient ? editingClient.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    setIsClientEditorOpen(false);
  };

  // --- EXPENSE OPERATIONS ---
  const handleSaveExpenseForm = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(expenseAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      alert('Valid business expense amount is required.');
      return;
    }
    onSaveExpense({
      id: `exp_${Math.random().toString(36).substr(2, 9)}`,
      userId: 'local',
      category: expenseCategory === 'Custom' ? (customExpenseCategory.trim() || 'Other') : expenseCategory,
      amount: amountVal,
      date: expenseDate,
      description: expenseDesc.trim(),
      createdAt: new Date().toISOString()
    });
    setExpenseAmount('');
    setExpenseDesc('');
    setCustomExpenseCategory('');
    setIsExpenseLoggerOpen(false);
  };

  // --- REPORTS COMPILED CALCULATIONS ---
  // Apply date and client filters
  const reportedInvoices = invoices.filter(inv => {
    // Client filter
    if (reportClientFilter !== 'all' && inv.clientName !== reportClientFilter) return false;
    // Date range filter
    if (reportStartDate && inv.date < reportStartDate) return false;
    if (reportEndDate && inv.date > reportEndDate) return false;
    return true;
  });

  const reportedExpenses = expenses.filter(exp => {
    if (reportStartDate && exp.date < reportStartDate) return false;
    if (reportEndDate && exp.date > reportEndDate) return false;
    return true;
  });

  const reportedIncomePaid = reportedInvoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.grandTotal, 0);

  const reportedOutstanding = reportedInvoices
    .filter(inv => inv.status === 'pending')
    .reduce((sum, inv) => sum + inv.grandTotal, 0);

  const totalReportedExpenses = reportedExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="h-dvh w-full max-w-full overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200 text-sans">
      
      {/* Dynamic Main App Bar Header */}
      <header className="sticky top-0 z-20 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-150 dark:border-slate-800/80 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            aria-label="Toggle structural sidebar menu drawer"
            className="md:hidden p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-xl transition-all cursor-pointer border border-slate-100 dark:border-slate-800"
          >
            <Menu className="w-4 h-4" />
          </button>

          <button 
            onClick={onOpenProfile}
            aria-label="Open Business Settings profile configuration"
            className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 hover:ring-2 hover:ring-sky-500/10 flex items-center justify-center transition-all cursor-pointer relative overflow-hidden"
          >
            {profile.logoUrl ? (
              <img src={profile.logoUrl} referrerPolicy="no-referrer" alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-4.5 h-4.5 flex-shrink-0" />
            )}
          </button>
          
          <div>
            <h1 className="text-xs font-extrabold text-slate-805 dark:text-white leading-tight max-w-[130px] sm:max-w-[180px] truncate">{profile.name || 'My Invoice Studio'}</h1>
            <span className="text-[9px] text-slate-400 font-medium tracking-wide flex items-center gap-1 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
              {isOnline ? 'Cloud Active' : 'On-Device Cache'}
            </span>
          </div>
        </div>

        {/* Configurations Panel items */}
        <div className="flex items-center gap-3">
          {/* Circular My Profile User Icon inside Top Bar */}
          <button 
            onClick={() => setActiveTab('profile')}
            title="Switch destination to Business & Creator Profile settings"
            aria-label="Open business customization settings profile dashboard"
            className={`w-9.5 h-8.5 rounded-full flex items-center justify-center transition-all cursor-pointer overflow-hidden border ${
              activeTab === 'profile' 
                ? 'ring-2 ring-sky-500 border-sky-500 shadow-sm' 
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-900 shadow-3xs'
            }`}
          >
            {profile.logoUrl ? (
              <img src={profile.logoUrl} referrerPolicy="no-referrer" alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 font-mono">
                {profile.name ? profile.name.slice(0, 2).toUpperCase() : 'IN'}
              </span>
            )}
          </button>

          <button 
            onClick={toggleTheme}
            aria-label="Toggle App brightness color modes"
            className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-xl transition-colors cursor-pointer border border-slate-200/85 dark:border-slate-800 shadow-3xs"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Dynamic Main Responsive Workspace - Grid layout turns dual-column on desktop */}
      <main className="w-full max-w-[1600px] mx-auto px-2 sm:px-3 lg:px-4 pt-4 md:pt-6 space-y-4 md:space-y-0 md:flex md:gap-6 lg:gap-8 md:items-start overflow-hidden">
        
        {/* DESKTOP BRANDING & CONTROL SIDEBAR - Visible only on md screens and larger */}
        <aside className="hidden md:flex shrink-0 flex-col bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 p-5 rounded-3xl shadow-xs h-[calc(100vh-110px)] overflow-y-auto w-[280px]">
          {renderNavMenuContent(false)}
        </aside>

        {/* RIGHT CENTRAL WORKSPACE PANEL */}
        <div className="flex-1 min-w-0 w-full m-0 p-0 h-[calc(100vh-110px)] overflow-y-auto pr-1">

          {/* Connection Offline notifications banner */}
          {!isOnline && (
            <div className="p-3 mb-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-600 dark:text-amber-400 flex items-start gap-2.5 text-xs">
              <WifiOff className="w-4.5 h-4.5 text-amber-500 flex-shrink-0 mt-0.5 font-medium" />
              <div>
                <span className="font-bold block">You're Offline (Safe Sandbox Active)</span>
                You can still create, edit, print, and check your accounts! All operations will update caches instantly and sync to device cloud once network triggers back.
              </div>
            </div>
          )}

          {/* Connections / sync triggers */}

        {/* ------------------ TAB 1: INVOICES ROUTE ------------------ */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            {/* Quick Metrics summary overview */}
            <section className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-2.5xl border border-slate-100 dark:border-slate-850 shadow-sm">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-medium block">Paid Funds</span>
                <span className="text-xs font-extrabold font-mono mt-1 text-emerald-500 block">{currencySymbol}{totalBilled.toLocaleString()}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-2.5xl border border-slate-100 dark:border-slate-850 shadow-sm">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-medium block">Accounts Due</span>
                <span className="text-xs font-extrabold font-mono mt-1 text-amber-500 block">{currencySymbol}{totalOutstanding.toLocaleString()}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-2.5xl border border-slate-100 dark:border-slate-850 shadow-sm">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-medium block">Draft Bills</span>
                <span className="text-xs font-extrabold font-mono mt-1 text-slate-500 block">{currencySymbol}{totalDraft.toLocaleString()}</span>
              </div>
            </section>

            {/* Onboarding catalog presets removed to respect user request and prevent clutter */}

            {/* Search, Action Header and Filters */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-slate-800 dark:text-slate-100">My Invoice Books</h2>
              <button
                onClick={() => onOpenInvoiceEditor(null)}
                className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-md shadow-sky-900/15"
              >
                <Plus className="w-4 h-4" />
                <span>New Bill</span>
              </button>
            </div>

            {/* Search Input and status selection filters */}
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-8 relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input 
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ID, client search..."
                  className="w-full pl-8 pr-2 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 dark:text-white text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                />
              </div>
              <div className="col-span-4 justify-end flex">
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'all')}
                  className="w-full px-2 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 text-xs text-slate-600 dark:text-slate-350 focus:outline-none"
                >
                  <option value="all">All States</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="draft">Draft</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Invoices Array List representation */}
            <div>
              {/* MOBILE ONLY SMALL SCREENS CARDS VIEW */}
              <div className="space-y-2 md:hidden">
                {filteredInvoices.length === 0 ? (
                  <div className="p-8 bg-white dark:bg-slate-900 text-center rounded-2.5xl text-slate-400 border border-slate-100 dark:border-slate-850">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No invoice books matching filters.
                  </div>
                ) : (
                  filteredInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className={`p-3 bg-white dark:bg-slate-900 border ${selectedInvoiceIds.includes(inv.id) ? 'border-sky-500 bg-sky-50/10' : 'border-slate-100 dark:border-slate-850/80'} rounded-2.5xl flex gap-3 relative shadow-xs hover:border-sky-500 transition-all cursor-pointer group`}
                      onClick={() => setActivePreviewInvoice(inv)}
                    >
                      <div className="flex items-center justify-center pl-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedInvoiceIds.includes(inv.id)}
                          onChange={(e) => handleToggleSelectInvoice(inv.id, e as any)}
                          className="rounded text-sky-600 focus:ring-sky-500 cursor-pointer w-4 h-4 accent-sky-600"
                        />
                      </div>
                      <div className="flex-1 flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-extrabold text-sky-600 font-mono">{inv.invoiceNumber}</span>
                            {(inv.invoiceType || 'invoice') === 'estimate' ? (
                              <span className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase">
                                Estimate
                              </span>
                            ) : (
                              <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase">
                                Invoice
                              </span>
                            )}
                            {inv.recurringSettings?.isRecurring && (
                              <span className="bg-sky-100 dark:bg-sky-955 text-sky-650 dark:text-sky-305 text-[8px] font-medium px-1 py-0.5 rounded-md flex items-center gap-0.5">
                                🔄 Repeat {inv.recurringSettings.interval}
                              </span>
                            )}
                            {inv.parentInvoiceId && (
                              <span className="bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 text-[8px] font-medium px-1 py-0.5 rounded-md">
                                Spawned child
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-white mt-1 uppercase line-clamp-1">{inv.clientName || 'Draft Profile'}</h4>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-slate-400 font-medium">
                            <span>Dated {inv.date}</span>
                            <span>•</span>
                            <span className="text-rose-500">Due {inv.dueDate}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-extrabold font-mono block text-slate-805">{currencySymbol}{inv.grandTotal.toFixed(2)}</span>
                          <span className={`inline-block px-2 mt-1 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider ${getStatusColor(inv.status)}`}>
                            {inv.status}
                          </span>
                        </div>
                      </div>

                      {/* Footer list triggers */}
                      <div className="pt-2 border-t border-slate-50 dark:border-slate-800/40 flex items-center justify-between text-[10px] text-slate-400" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          {/* Sync Icon */}
                          <span className="flex items-center gap-1 text-[8px] font-mono tracking-tight text-slate-400">
                            <span className={`w-1 h-1 rounded-full ${inv.userId === 'local' ? 'bg-amber-400' : 'bg-sky-400'}`} />
                            {inv.userId === 'local' ? 'On-Device Only' : 'Cloud Backed'}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => exportInvoicePDF(inv, profile)}
                            className="px-2 py-0.5 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 hover:bg-sky-100 rounded-md text-[9px] font-medium flex items-center gap-0.5 cursor-pointer"
                          >
                            <FileDown className="w-3 h-3" />
                            PDF
                          </button>
                          <button
                            onClick={() => handleExportMSWord(inv)}
                            className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-md text-[9px] font-medium flex items-center gap-0.5 cursor-pointer"
                          >
                            Word
                          </button>
                          <button
                            onClick={() => onOpenInvoiceEditor(inv)}
                            className="text-slate-400 hover:text-sky-500 p-0.5 rounded cursor-pointer"
                          >
                            <PenTool className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteInvoice(inv.id)}
                            className="text-slate-400 hover:text-rose-500 p-0.5 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    </div>
                  ))
                )}
              </div>

              {/* DESKTOP WORKSPACE GRID TABLE VIEW */}
              <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2.5xl overflow-hidden shadow-xs">
                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 font-medium text-slate-400 text-[10px] uppercase tracking-wider text-left">
                    <tr>
                      <th className="px-4 py-3.5 text-center w-10">
                        <input
                          type="checkbox"
                          checked={filteredInvoices.length > 0 && filteredInvoices.every(i => selectedInvoiceIds.includes(i.id))}
                          onChange={handleSelectAllFiltered}
                          className="rounded text-sky-600 focus:ring-sky-500 cursor-pointer w-4 h-4 accent-sky-600"
                          title="Select / Deselect all matching invoices"
                        />
                      </th>
                      <th className="px-4 py-3.5">Invoice / Type</th>
                      <th className="px-4 py-3.5">Recipient Client Name</th>
                      <th className="px-4 py-3.5">Billing Terms / Due</th>
                      <th className="px-4 py-3.5 text-right">Sum Valuation</th>
                      <th className="px-4 py-3.5 text-center">Settlement</th>
                      <th className="px-4 py-3.5 text-right">Instant Dispatch Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-slate-400 font-medium">
                          <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                          No invoices registered on this filtered track list.
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((inv) => (
                        <tr 
                          key={inv.id} 
                          className={`hover:bg-slate-50/50 dark:hover:bg-slate-850/20 cursor-pointer transition-colors ${selectedInvoiceIds.includes(inv.id) ? 'bg-sky-100/30 dark:bg-sky-955/25' : ''}`}
                          onClick={() => setActivePreviewInvoice(inv)}
                        >
                          <td className="px-4 py-3.5 text-center w-10" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedInvoiceIds.includes(inv.id)}
                              onChange={(e) => handleToggleSelectInvoice(inv.id, e as any)}
                              className="rounded text-sky-600 focus:ring-sky-500 cursor-pointer w-4 h-4 accent-sky-600"
                            />
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold font-mono text-sky-600">{inv.invoiceNumber}</span>
                              {(inv.invoiceType || 'invoice') === 'estimate' ? (
                                <span className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase">Est</span>
                              ) : (
                                <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase">Inv</span>
                              )}
                              {inv.recurringSettings?.isRecurring && (
                                <span className="text-[10px]" title={`Auto Repeat continuous ${inv.recurringSettings.interval}`}>🔄</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-800 dark:text-white uppercase truncate max-w-[150px]">{inv.clientName || 'Draft Profile'}</div>
                            {inv.clientEmail && <span className="text-[10px] text-slate-400 block truncate max-w-[155px] font-mono mt-0.5">{inv.clientEmail}</span>}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-[10px] text-slate-550 dark:text-slate-400">
                            <div>Release: {inv.date}</div>
                            <div className="text-rose-500 font-bold mt-0.5">Settle: {inv.dueDate}</div>
                          </td>
                          <td className="px-4 py-3.5 font-bold font-mono text-slate-805 text-right">
                            {currencySymbol}{inv.grandTotal.toFixed(2)}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider ${getStatusColor(inv.status)}`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => exportInvoicePDF(inv, profile)}
                                className="px-2 py-1 bg-sky-50 dark:bg-sky-955 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900 rounded-md text-[9px] font-medium flex items-center gap-0.5 cursor-pointer border border-transparent"
                                title="Download Premium PDF Bill"
                              >
                                <FileDown className="w-3 h-3" />
                                <span>PDF</span>
                              </button>
                              <button
                                onClick={() => handleExportMSWord(inv)}
                                className="px-2 py-1 bg-blue-50 dark:bg-blue-955 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-sky-900 rounded-md text-[9px] font-medium flex items-center gap-0.5 cursor-pointer"
                                title="Download Editable Document File"
                              >
                                <FileDown className="w-3 h-3" />
                                <span>Word</span>
                              </button>
                              <button
                                onClick={() => onOpenInvoiceEditor(inv)}
                                className="text-slate-400 hover:text-sky-500 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Edit invoice details"
                              >
                                <PenTool className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteInvoice(inv.id)}
                                className="text-slate-400 hover:text-rose-500 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Delete invoice"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Floating Bulk Actions Bar Overlay */}
            {selectedInvoiceIds.length > 0 && (
              <div id="floating-bulk-actions" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-2xl bg-neutral-950 border border-neutral-800 text-white p-3 md:p-3.5 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-bottom duration-200">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-sky-600 rounded-full flex items-center justify-center text-[10px] font-extrabold">{selectedInvoiceIds.length}</span>
                  <span className="text-[11px] font-medium text-slate-200">selected bills</span>
                </div>
                
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={handleBulkExportPDF}
                    className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 rounded-xl text-[10px] font-extrabold flex items-center gap-1 cursor-pointer"
                    title="Export selected bills sequentially to PDF"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>PDFs</span>
                  </button>
                  
                  <button
                    onClick={handleBulkExportExcel}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-[10px] font-extrabold flex items-center gap-1 cursor-pointer"
                    title="Export selected bills ledger details to Excel CSV"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>Excel CSV</span>
                  </button>

                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        onBulkUpdateInvoicesStatus(selectedInvoiceIds, e.target.value as any);
                        setSelectedInvoiceIds([]);
                      }
                    }}
                    value=""
                    className="px-2 py-1.5 bg-neutral-800 text-white rounded-xl text-[10px] font-extrabold focus:outline-none border border-neutral-750 cursor-pointer"
                    title="Change status in bulk"
                  >
                    <option value="" disabled>Set Status...</option>
                    <option value="paid">Set Paid</option>
                    <option value="pending">Set Pending</option>
                    <option value="draft">Set Draft</option>
                    <option value="cancelled">Set Cancelled</option>
                  </select>

                  <button
                    onClick={() => {
                      onBulkDeleteInvoices(selectedInvoiceIds);
                      setSelectedInvoiceIds([]);
                    }}
                    className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 rounded-xl text-[10px] font-extrabold flex items-center gap-1 cursor-pointer"
                    title="Delete all selected bills"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>

                  <button
                    onClick={() => setSelectedInvoiceIds([])}
                    className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                    title="Deselect all selected items"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------ TAB 2: CLIENTS ROUTE ------------------ */}
        {activeTab === 'clients' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-3xl shadow-sm">
              <div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Clients Ledger Book</h2>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide">Add clients for rapid billing auto-fill list populate</span>
              </div>
              <button
                onClick={() => handleOpenClientEditor(null)}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-md"
              >
                <Plus className="w-4.5 h-4.5" />
                <span>Add Client</span>
              </button>
            </div>

            {/* Clients profiles scroll log */}
            <div className="space-y-2.5">
              {clients.length === 0 ? (
                <div className="p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2.5xl text-center text-slate-400 text-xs">
                  <Notebook className="w-8 h-8 mx-auto mb-2 text-slate-350" />
                  Your clients ledger is currently empty. Add profiles to automatically inject contacts on invoice selection.
                </div>
              ) : (
                clients.map(c => (
                  <div
                    key={c.id}
                    className="p-3.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2.5xl space-y-2 shadow-xs group"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-medium text-slate-800 dark:text-white uppercase">{c.name}</h4>
                        {c.companyName && (
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-550 dark:text-slate-400 font-medium px-1.5 py-0.5 rounded-md mt-0.5 inline-block">
                            🏢 {c.companyName}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenClientEditor(c)}
                          className="text-slate-400 hover:text-sky-500 p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <PenTool className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteClient(c.id)}
                          className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50 dark:border-slate-800/40 text-[9px] font-medium text-slate-500 dark:text-slate-400">
                      <div>
                        <span className="text-slate-400 block font-normal">Contact Email</span>
                        <span className="truncate block mt-0.5 text-slate-700 dark:text-slate-200">{c.email || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-normal">Contact Number</span>
                        <span className="block mt-0.5 text-slate-700 dark:text-slate-200">{c.phone || 'N/A'}</span>
                      </div>
                      <div className="col-span-2 mt-1">
                        <span className="text-slate-400 block font-normal">Address</span>
                        <span className="block mt-0.5 text-slate-705 dark:text-slate-300 font-medium truncate">{c.address || 'No billing address registered'}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ------------------ TAB 3: REPORTS & TAX ROUTE ------------------ */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            
            {/* Action buttons list */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-3xl shadow-sm">
              <div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Accounting Summary</h2>
                <span className="text-[10px] text-slate-400 block mt-0.5">Generate customized tax & income expense ledger reports</span>
              </div>
              <button
                onClick={() => setIsExpenseLoggerOpen(true)}
                className="px-3  py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-md shadow-rose-950/10"
              >
                <Plus className="w-4 h-4" />
                <span>Log Expense</span>
              </button>
            </div>

            {/* Configurable Filters Form panel */}
            <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-3.5 rounded-2.5xl shadow-sm space-y-3">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">Report Filters</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="rep-start" className="block text-[8px] font-extrabold uppercase text-slate-400 mb-1">Start Date</label>
                  <input
                    id="rep-start"
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] text-slate-700 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="rep-end" className="block text-[8px] font-extrabold uppercase text-slate-400 mb-1">End Date</label>
                  <input
                    id="rep-end"
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] text-slate-700 dark:text-white focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label htmlFor="rep-client" className="block text-[8px] font-extrabold uppercase text-slate-400 mb-1">Filter by Client Account</label>
                  <select
                    id="rep-client"
                    value={reportClientFilter}
                    onChange={(e) => setReportClientFilter(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg text-[10px] font-medium text-slate-700 dark:text-white focus:outline-none"
                  >
                    <option value="all">-- All Clients combined --</option>
                    {Array.from(new Set(invoices.map(it => it.clientName))).filter(Boolean).map(clName => (
                      <option key={clName} value={clName}>{clName}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Unified Collective Invoice & Accounting Downloader Card */}
            <section className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/85 p-4 rounded-3xl space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-405 block font-sans">Collective Invoice Downloader</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">Quickly select date-intervals to download compiled reports or a directory of matching invoices</span>
                </div>
                <span className="text-[9px] bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded-lg border border-sky-100 dark:border-sky-900/60 font-mono font-medium">
                  {reportedInvoices.length} Matching Records
                </span>
              </div>

              {/* Intervals Quick buttons */}
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const end = new Date().toISOString().split('T')[0];
                    const d = new Date();
                    d.setDate(d.getDate() - 7);
                    const start = d.toISOString().split('T')[0];
                    setReportStartDate(start);
                    setReportEndDate(end);
                  }}
                  className="px-2 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-205 dark:border-slate-800 rounded-xl text-[9px] font-bold text-slate-650 dark:text-slate-350 cursor-pointer transition-all"
                >
                  📆 Last 1 Week
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const end = new Date().toISOString().split('T')[0];
                    const d = new Date();
                    d.setDate(d.getDate() - 30);
                    const start = d.toISOString().split('T')[0];
                    setReportStartDate(start);
                    setReportEndDate(end);
                  }}
                  className="px-2 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-205 dark:border-slate-800 rounded-xl text-[9px] font-bold text-slate-655 dark:text-slate-350 cursor-pointer transition-all"
                >
                  📅 Last 1 Month
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const end = new Date().toISOString().split('T')[0];
                    const d = new Date();
                    d.setDate(d.getDate() - 365);
                    const start = d.toISOString().split('T')[0];
                    setReportStartDate(start);
                    setReportEndDate(end);
                  }}
                  className="px-2 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-205 dark:border-slate-800 rounded-xl text-[9px] font-bold text-slate-655 dark:text-slate-350 cursor-pointer transition-all"
                >
                  👑 Last 1 Year
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReportStartDate('');
                    setReportEndDate('');
                  }}
                  className="px-2 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-205 dark:border-slate-800 rounded-xl text-[9px] font-bold text-slate-655 dark:text-slate-350 cursor-pointer transition-all"
                >
                  🔄 Reset To All
                </button>
              </div>

              {/* Action Downloads triggers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (reportedInvoices.length === 0) {
                      alert("No client billing records match the specified interval.");
                      return;
                    }
                    const rangeLabel = reportStartDate && reportEndDate 
                      ? `${reportStartDate} to ${reportEndDate}` 
                      : "Cumulative Ledger Period";
                    exportCollectiveReportPDF(reportedInvoices, profile, rangeLabel);
                  }}
                  className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl text-[9.5px] font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Download Ledger Statement PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (reportedInvoices.length === 0) {
                      alert("No client billing records match the specified interval.");
                      return;
                    }
                    reportedInvoices.forEach((inv, index) => {
                      setTimeout(() => {
                        exportInvoicePDF(inv, profile);
                      }, index * 350); // slight delay avoids browser block errors
                    });
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[9.5px] font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download All Individual PDFs</span>
                </button>
              </div>
            </section>

            {/* Income and Expense Analytics report */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-emerald-500/5 dark:bg-emerald-950/15 p-3 rounded-2.5xl border border-emerald-100/40 dark:border-emerald-900/40">
                <span className="text-[9px] uppercase font-extrabold text-slate-400 block tracking-wider">Gross Profit (Received)</span>
                <span className="text-md font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">{currencySymbol}{reportedIncomePaid.toLocaleString()}</span>
                <span className="text-[9px] text-slate-400 font-medium block mt-0.5">From cleared paid checks</span>
              </div>
              
              <div className="bg-rose-500/5 dark:bg-rose-950/15 p-3 rounded-2.5xl border border-rose-100/40 dark:border-rose-900/40">
                <span className="text-[9px] uppercase font-extrabold text-slate-400 block tracking-wider">Business Expenses</span>
                <span className="text-md font-extrabold font-mono text-rose-600 dark:text-rose-400 mt-1 block">{currencySymbol}{totalReportedExpenses.toLocaleString()}</span>
                <span className="text-[9px] text-slate-400 font-medium block mt-0.5">Direct cost overheads</span>
              </div>

              <div className="col-span-2 bg-sky-500/5 dark:bg-sky-950/15 p-3 rounded-2.5xl border border-sky-100/40 dark:border-sky-900/40 flex justify-between items-center">
                <div>
                  <span className="text-[9px] uppercase font-extrabold text-slate-400 block tracking-wider">Pending Receivables (Unpaid)</span>
                  <span className="text-md font-extrabold font-mono text-amber-600 dark:text-amber-400 mt-1 block">{currencySymbol}{reportedOutstanding.toLocaleString()}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] bg-amber-100 dark:bg-amber-950 text-amber-705 dark:text-amber-400 px-2 py-0.5 rounded-lg font-medium">Unsettled Receivables</span>
                </div>
              </div>
            </div>

            {/* Dynamic Interactive SVG Monthly Trend Graph */}
            {(() => {
              const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
              const records: { label: string; income: number; expense: number }[] = [];
              const now = new Date();
              
              // Last 6 months chronological
              for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                records.push({
                  label: `${monthsShort[d.getMonth()]}`,
                  income: 0,
                  expense: 0
                });
              }

              // Populate invoices
              reportedInvoices.forEach(inv => {
                if (inv.status === 'paid') {
                  const dateObj = new Date(inv.date);
                  if (!isNaN(dateObj.getTime())) {
                    const label = monthsShort[dateObj.getMonth()];
                    const match = records.find(r => r.label === label);
                    if (match) match.income += inv.grandTotal;
                  }
                }
              });

              // Populate expenses
              reportedExpenses.forEach(exp => {
                const dateObj = new Date(exp.date);
                if (!isNaN(dateObj.getTime())) {
                  const label = monthsShort[dateObj.getMonth()];
                  const match = records.find(r => r.label === label);
                  if (match) match.expense += exp.amount;
                }
              });

              // Chart Math coordinates
              const maxVal = Math.max(...records.map(d => Math.max(d.income, d.expense)), 100);
              const chartHeight = 130;
              const chartWidth = 500;
              const paddingX = 42;
              const paddingY = 20;
              const usableHeight = chartHeight - paddingY * 2;
              const usableWidth = chartWidth - paddingX * 2;

              const pointsIncome = records.map((d, index) => {
                const x = paddingX + (index / (records.length - 1)) * usableWidth;
                const y = chartHeight - paddingY - (d.income / maxVal) * usableHeight;
                return { x, y };
              });

              const pointsExpense = records.map((d, index) => {
                const x = paddingX + (index / (records.length - 1)) * usableWidth;
                const y = chartHeight - paddingY - (d.expense / maxVal) * usableHeight;
                return { x, y };
              });

              const pathIncomeString = pointsIncome.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
              const areaIncomeString = pointsIncome.length > 0 
                ? `${pathIncomeString} L ${pointsIncome[pointsIncome.length - 1].x} ${chartHeight - paddingY} L ${pointsIncome[0].x} ${chartHeight - paddingY} Z`
                : '';

              const pathExpenseString = pointsExpense.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
              const areaExpenseString = pointsExpense.length > 0 
                ? `${pathExpenseString} L ${pointsExpense[pointsExpense.length - 1].x} ${chartHeight - paddingY} L ${pointsExpense[0].x} ${chartHeight - paddingY} Z`
                : '';

              return (
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4 rounded-2.5xl shadow-sm text-sans">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Monthly Billings trend</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">Income vs expense overview over past months</span>
                    </div>
                    <div className="flex items-center gap-3 text-[9px] font-medium">
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Settled Cash</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-505 bg-rose-500" /> Expenses</span>
                    </div>
                  </div>

                  {/* Pure SVG line mapping */}
                  <div className="w-full h-36">
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id="incAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.12" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="expAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.12" />
                          <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Grid guidelines line helper */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                        const y = paddingY + ratio * usableHeight;
                        const labelValue = Math.round(maxVal * (1 - ratio));
                        return (
                          <g key={idx} className="opacity-40">
                            <line x1={paddingX} y1={y} x2={chartWidth - paddingX} y2={y} stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" className="text-slate-100 dark:text-slate-800" />
                            <text x={paddingX - 8} y={y + 3} textAnchor="end" className="text-[8px] font-mono fill-slate-400 font-extrabold">{currencySymbol}{labelValue}</text>
                          </g>
                        );
                      })}

                      {/* Area drawings */}
                      {areaIncomeString && <path d={areaIncomeString} fill="url(#incAreaGrad)" />}
                      {areaExpenseString && <path d={areaExpenseString} fill="url(#expAreaGrad)" />}

                      {/* Line paths */}
                      {pathIncomeString && <path d={pathIncomeString} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />}
                      {pathExpenseString && <path d={pathExpenseString} fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />}

                      {/* Dot indicators and coordinates values */}
                      {pointsIncome.map((pts, i) => (
                        <g key={`inc-grp-${i}`}>
                          <circle cx={pts.x} cy={pts.y} r="3" fill="#10b981" stroke="#fff" strokeWidth="1" />
                        </g>
                      ))}
                      {pointsExpense.map((pts, i) => (
                        <g key={`exp-grp-${i}`}>
                          <circle cx={pts.x} cy={pts.y} r="3" fill="#f43f5e" stroke="#fff" strokeWidth="1" />
                        </g>
                      ))}

                      {/* Bottom months labels */}
                      {records.map((r, i) => {
                        const x = paddingX + (i / (records.length - 1)) * usableWidth;
                        return (
                          <text key={`lbl-${i}`} x={x} y={chartHeight - 4} textAnchor="middle" className="text-[9px] font-extrabold fill-slate-400 font-mono">{r.label}</text>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              );
            })()}

            {/* Net Income statement tracker bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4 rounded-2.5xl shadow-sm text-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block">Combined Net Cash Flow Statement</span>
              
              {/* Calculate Net cash */}
              {(() => {
                const netCash = reportedIncomePaid - totalReportedExpenses;
                const isProfitable = netCash >= 0;
                return (
                  <div className="mt-2 space-y-1">
                    <span className={`text-xl font-extrabold font-mono tracking-tight block ${isProfitable ? 'text-sky-600 dark:text-sky-400' : 'text-rose-500'}`}>
                      {isProfitable ? '+' : ''}{currencySymbol}{netCash.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {isProfitable ? '🍾 Operating at a net business profit' : '⚠️ Overheads exceed paid cash receipts'}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* List of outstanding invoices with due dates */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-medium tracking-wider text-slate-400 block">Receivables Aging & Pending Bills ({reportedInvoices.filter(i=>i.status==='pending').length})</span>
              {reportedInvoices.filter(i => i.status === 'pending').length === 0 ? (
                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl text-center text-[10px] text-slate-400 font-medium">
                  No outstanding receivables in this filtered bracket.
                </div>
              ) : (
                reportedInvoices.filter(i => i.status === 'pending').map(inv => (
                  <div
                    key={inv.id}
                    className="p-3 bg-amber-500/5 dark:bg-amber-950/10 border border-amber-500/10 dark:border-amber-900/30 rounded-2.5xl flex justify-between items-center"
                  >
                    <div>
                      <span className="text-[10px] font-extrabold text-amber-600 block">{inv.invoiceNumber}</span>
                      <span className="text-xs font-medium block text-slate-705 dark:text-slate-150 truncate uppercase max-w-[200px]">{inv.clientName}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold font-mono block text-slate-805">{currencySymbol}{inv.grandTotal.toFixed(2)}</span>
                      <span className="text-[9px] text-rose-500 font-bold block uppercase tracking-wide">Due by: {inv.dueDate}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Business Expenses Ledger logged */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-medium tracking-wider text-slate-400 block">Logged Expenditure Ledgers ({reportedExpenses.length})</span>
              {reportedExpenses.length === 0 ? (
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2.5xl text-center text-xs text-slate-400">
                  No registered business expenses in this bracket. Use 'Log Expense' above to enter tax write-offs.
                </div>
              ) : (
                reportedExpenses.map(exp => (
                  <div
                    key={exp.id}
                    className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2.5xl flex justify-between items-center group shadow-xs"
                  >
                    <div className="max-w-[250px]">
                      <span className="text-[9px] uppercase font-extrabold text-rose-500 font-mono tracking-tight block">{exp.category}</span>
                      <span className="text-xs font-medium text-slate-805 dark:text-slate-200 block truncate">{exp.description || 'General category expenditure'}</span>
                      <span className="text-[9px] text-slate-400 block font-mono">Charged {exp.date}</span>
                    </div>
                    
                    <div className="text-right flex items-center gap-3">
                      <span className="text-xs font-extrabold font-mono text-slate-805">-{currencySymbol}{exp.amount.toFixed(2)}</span>
                      <button
                        onClick={() => onDeleteExpense(exp.id)}
                        className="text-slate-350 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                        aria-label="Delete this expense record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ------------------ TAB 4: BRAND NEW 'dashboard' BENTO HOME PREMIER VIEW ------------------ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 text-sans animate-in fade-in duration-200">
            
            {/* Page Header heading block */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
                  <Sparkles className="w-5 h-5 text-white animate-pulse" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                    Welcome to {profile.name || 'MakInvoice Workspace'}
                  </h2>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 font-medium">Real-time financials, pre-coded GST collections, and catalog registries.</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenInvoiceEditor(null)}
                  className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-white rounded-xl text-[10px] font-extrabold tracking-wide flex items-center gap-1.5 cursor-pointer shadow-lg shadow-sky-500/30 hover:shadow-sky-500/40 hover:-translate-y-0.5 transition-all duration-300"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Quick Bill</span>
                </button>
              </div>
            </div>

            {/* Quick stats grid */}
            <section className="grid grid-cols-3 gap-2.5">
              <div className="group bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center gap-3 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-medium flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 block truncate">Cleared</span>
                  <span className="text-[13px] font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block truncate">{currencySymbol}{totalBilled.toLocaleString()}</span>
                </div>
              </div>

              <div className="group bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center gap-3 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-medium flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <Clock className="w-5 h-5 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 block truncate">Receivables</span>
                  <span className="text-[13px] font-extrabold font-mono text-amber-600 dark:text-amber-400 mt-0.5 block truncate">{currencySymbol}{totalOutstanding.toLocaleString()}</span>
                </div>
              </div>

              <div className="group bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center gap-3 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 via-rose-500/5 to-rose-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-medium flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 block truncate">Expenses</span>
                  <span className="text-[13px] font-extrabold font-mono text-rose-600 dark:text-rose-400 mt-0.5 block truncate">{currencySymbol}{totalReportedExpenses.toLocaleString()}</span>
                </div>
              </div>
            </section>

            {/* Recent Billing table first */}
            <div className="space-y-3">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Recent billing records ({invoices.slice(0,3).length})</span>
              {invoices.length === 0 ? (
                <div className="p-8 bg-white dark:bg-slate-900 border border-slate-150 rounded-3xl text-center">
                  <p className="text-[11px] font-medium text-slate-400">Generate your first invoice to view details here!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {invoices.slice(0, 3).map(inv => (
                    <div 
                      key={inv.id}
                      onClick={() => setActivePreviewInvoice(inv)}
                      className="group relative p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between"
                    >
                      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-sky-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-extrabold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 px-2 py-0.5 rounded-lg">{inv.invoiceNumber}</span>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider ${getStatusColor(inv.status)}`}>
                            {inv.status}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-slate-800 dark:text-white mt-2 block truncate">{inv.clientName}</span>
                        <span className="text-[9px] text-slate-400 font-medium mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Released {inv.date}
                        </span>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-end">
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Total</span>
                        <span className="text-sm font-extrabold font-mono text-slate-800 dark:text-slate-100">{currencySymbol}{inv.grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Layout grid structure with financial curve graph and guidelines below recent billing */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.72fr_1.28fr] gap-6">
              {/* Left Column: Line Graph */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Financial Performance Curve</h3>
                {renderTrendChartSection()}
              </div>

              {/* Right Column: Mini registry shortcuts */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Billing Guidelines & How to Use</h3>
                
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-5 rounded-3xl space-y-5 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="group p-3 rounded-2xl hover:bg-sky-50 dark:hover:bg-sky-500/5 transition-colors duration-300 cursor-default">
                    <span className="text-[10px] uppercase font-extrabold text-sky-600 dark:text-sky-400 tracking-wider block mb-2 flex items-center gap-1.5"><span className="p-1 bg-sky-100 dark:bg-sky-500/20 rounded-lg">📖</span> Quick User Guide</span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium space-y-1">
                      <span className="block">• Check your GSTIN details in <strong>Profile Settings</strong></span>
                      <span className="block">• Add your customer directory in the <strong>Clients Ledger</strong></span>
                      <span className="block">• Hit <strong>New Bill</strong> to draft a new itemized professional invoice</span>
                      <span className="block">• Click the download or print icons to save official compliance PDFs</span>
                    </p>
                  </div>

                  <div className="group p-3 rounded-2xl hover:bg-amber-50 dark:hover:bg-amber-500/5 transition-colors duration-300 cursor-default">
                    <span className="text-[10px] uppercase font-extrabold text-amber-600 dark:text-amber-400 tracking-wider block mb-2 flex items-center gap-1.5"><span className="p-1 bg-amber-100 dark:bg-amber-500/20 rounded-lg">⚖️</span> Company Billing Policy</span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium space-y-1">
                      <span className="block">• Standard Net-15/Net-30 payment intervals applied</span>
                      <span className="block">• Overdue bills incur late fee penalties per Indian MSME rules</span>
                      <span className="block">• Split CGST/SGST on Intrastate; unified IGST on Interstate</span>
                    </p>
                  </div>

                  <button 
                    onClick={() => setActiveTab('learn')}
                    className="group w-full py-2.5 bg-gradient-to-r from-slate-100 to-slate-50 hover:from-sky-500 hover:to-indigo-500 dark:from-slate-800 dark:to-slate-850 dark:hover:from-sky-500 dark:hover:to-indigo-500 text-slate-700 hover:text-white dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-transparent rounded-2xl text-[11px] font-extrabold uppercase tracking-wide cursor-pointer transition-all duration-300 flex items-center justify-center gap-2 shadow-sm hover:shadow-lg"
                  >
                    View Detailed Manual 
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ------------------ TAB 5: LEARN DOCUMENTATION & TERMS AND CONDITIONS ------------------ */}
        {activeTab === 'learn' && (
          <div className="space-y-6 text-sans animate-in fade-in duration-200">
            {/* Main Header Guide card */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Sparkles className="w-5 h-5 text-white animate-pulse" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                    How to use our App & Company Billing Policies
                  </h2>
                </div>
              </div>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Welcome to the official IndoTech portal documentation! Here you will find step-by-step app user guidelines, business terms, and invoicing best practices.
              </p>
            </div>

            {/* How to Use Our App */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-5">
              <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="px-2 py-1 bg-gradient-to-r from-sky-500 to-indigo-500 text-white rounded-lg text-[10px] font-extrabold font-mono shadow-sm">STEP-BY-STEP</span>
                <span>Part A: How to Use Our Billing App</span>
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                <div className="group p-4 bg-slate-50 dark:bg-slate-950/50 hover:bg-sky-50 dark:hover:bg-sky-500/10 border border-slate-100 dark:border-slate-800 rounded-2.5xl space-y-1.5 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                  <strong className="text-slate-800 dark:text-slate-100 block text-xs flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-900 text-sky-600 flex justify-center items-center font-medium">1</span> Establish Profile</strong>
                  <p className="font-medium mt-2">Click your round profile icon on the top right bar, head to profile dashboard, and register your complete organization details.</p>
                </div>
                <div className="group p-4 bg-slate-50 dark:bg-slate-950/50 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 border border-slate-100 dark:border-slate-800 rounded-2.5xl space-y-1.5 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                  <strong className="text-slate-800 dark:text-slate-100 block text-xs flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 flex justify-center items-center font-medium">2</span> Client Ledger</strong>
                  <p className="font-medium mt-2">Save corporate clients inside the Clients Ledger to avoid typing contact details repeatedly and set their local addresses.</p>
                </div>
                <div className="group p-4 bg-slate-50 dark:bg-slate-950/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border border-slate-100 dark:border-slate-800 rounded-2.5xl space-y-1.5 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                  <strong className="text-slate-800 dark:text-slate-100 block text-xs flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 flex justify-center items-center font-medium">3</span> Draft Invoices</strong>
                  <p className="font-medium mt-2">Select <strong>New Bill</strong> on the dashboard, add line items with rates, quantities, descriptions, and discount percentages.</p>
                </div>
                <div className="group p-4 bg-slate-50 dark:bg-slate-950/50 hover:bg-amber-50 dark:hover:bg-amber-500/10 border border-slate-100 dark:border-slate-800 rounded-2.5xl space-y-1.5 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                  <strong className="text-slate-800 dark:text-slate-100 block text-xs flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-600 flex justify-center items-center font-medium">4</span> Official Documents</strong>
                  <p className="font-medium mt-2">Hit the download icon to save a clean PDF invoice, or use the Accounting Summary for collective reports.</p>
                </div>
              </div>
            </div>

            {/* Terms and conditions card */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-5">
              <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="px-2 py-1 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-lg text-[10px] font-extrabold font-mono shadow-sm">T&C</span>
                <span>Part B: Company Terms & Conditions for Invoicing</span>
              </h3>

              <div className="space-y-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-405">
                <div className="group p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl border-l-2 border-slate-200 dark:border-slate-700 hover:border-amber-400 transition-colors duration-300">
                  <strong className="text-slate-800 dark:text-slate-100 uppercase tracking-wider text-[10px] block mb-1">1. Payment Intervals & Net Terms</strong>
                  <p className="font-medium">Unless explicitly formulated differently in custom contract items, all standard invoices are published under <strong>Net-15 payment terms</strong>. Beneficiaries must complete payments via our electronic banking or QR asset channels within fifteen days of bill publication.</p>
                </div>
                <div className="group p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl border-l-2 border-slate-200 dark:border-slate-700 hover:border-rose-400 transition-colors duration-300">
                  <strong className="text-slate-800 dark:text-slate-100 uppercase tracking-wider text-[10px] block mb-1">2. Late Fees & Interest Penalties</strong>
                  <p className="font-medium">To discourage deliberate delayed cash resolutions, invoices unpaid past Net-15 days are susceptible to late fee interest. Interest is computed according to company and regional guidelines.</p>
                </div>
                <div className="group p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl border-l-2 border-slate-200 dark:border-slate-700 hover:border-sky-400 transition-colors duration-300">
                  <strong className="text-slate-800 dark:text-slate-100 uppercase tracking-wider text-[10px] block mb-1">3. Tax Compliance & Place of Supply</strong>
                  <p className="font-medium">Invoices are generated strictly according to compliance guidelines. Taxes are applied and split based on local vs interstate client relationships.</p>
                </div>
                <div className="group p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl border-l-2 border-slate-200 dark:border-slate-700 hover:border-emerald-400 transition-colors duration-300">
                  <strong className="text-slate-800 dark:text-slate-100 uppercase tracking-wider text-[10px] block mb-1">4. Audit Reconciliations & Revisions</strong>
                  <p className="font-medium">Invoices must be thoroughly checked by the recipient within seven business days from receiving. Any dispute claims or modifications shall be governed by standard trade rules.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------ TAB 6: BRAND NEW 'profile' BRAND VIEW ------------------ */}
        {activeTab === 'profile' && (
          <div className="space-y-6 text-sans animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 p-6 rounded-3xl shadow-xs text-center relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500" />
              
              <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-sky-950/45 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto mb-3 shadow-md mt-2">
                {profile.logoUrl ? (
                  <img src={profile.logoUrl} referrerPolicy="no-referrer" alt={profile.name} className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <User className="w-8 h-8" />
                )}
              </div>

              <h2 className="text-base font-extrabold text-slate-805 uppercase tracking-tight">{profile.name || 'My Invoice Studio'}</h2>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{profile.email || 'No email established'}</p>

              <div className="mt-6 grid grid-cols-2 gap-3 text-left">
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-850">
                  <span className="text-[8px] uppercase font-extrabold text-slate-400 block">LLC Brand Registry</span>
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-205 mt-1 block truncate">{profile.name || 'Sole Proprietorship'}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-850">
                  <span className="text-[8px] uppercase font-extrabold text-slate-400 block">Tax Registry (GSTIN)</span>
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-205 mt-1 block truncate font-mono">{profile.taxId || 'Not Configured'}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-850">
                  <span className="text-[8px] uppercase font-extrabold text-slate-400 block">Primary currency</span>
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-205 mt-1 block">{profile.currency || 'INR'} ({currencySymbol})</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-850">
                  <span className="text-[8px] uppercase font-extrabold text-slate-400 block">Mobile Number</span>
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-205 mt-1 block truncate">{profile.mobile || profile.phone || 'N/A'}</span>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-50 dark:border-slate-850 mt-6">
                <button
                  onClick={onOpenProfile}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-[10.5px] font-bold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <PenTool className="w-3.5 h-3.5 text-slate-450" />
                  <span>Customize Brand Details</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------ TAB 7: DYNAMIC REGISTRIES HANDLER ------------------ */}
        {renderMasterTableSection()}

        </div>
      </main>

      {/* -------------------- OVERLAY MODAL 0: SLIDING DRAWER MENU FOR MOBILE DEVICE -------------------- */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop screen */}
          <div 
            onClick={() => setIsMobileDrawerOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-3xs transition-opacity duration-300"
          />
          {/* Menu Drawer panel */}
          <div className="relative w-64 max-w-[80vw] bg-white dark:bg-slate-900 h-full p-4 shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-250 border-r border-slate-100 dark:border-slate-850 overflow-y-auto">
            <div className="flex justify-between items-center mb-5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Workspace Menu</h3>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-colors cursor-pointer"
                aria-label="Close menu drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {renderNavMenuContent(true)}
          </div>
        </div>
      )}

      {/* -------------------- OVERLAY MODAL 1: STUNNING PAPER ENVELOPE LIVE PREVIEW -------------------- */}
      {activePreviewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/65 backdrop-blur-sm overflow-y-auto no-scrollbar">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[94vh] max-h-[94vh] border border-slate-200 dark:border-slate-800 animate-in fade-in duration-200">
            
            {/* Header toolbar */}
            <div className="p-3 px-4 border-b border-slate-100 dark:border-slate-850/80 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-600 flex-shrink-0" />
                <div>
                  <h3 className="text-xs font-extrabold text-slate-805 uppercase leading-none">Live Paper Bill Preview</h3>
                  <span className="text-[10px] text-slate-400 font-mono block mt-1">Ref ID: {activePreviewInvoice.invoiceNumber}</span>
                </div>
              </div>
              <button
                onClick={() => setActivePreviewInvoice(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 flex items-center justify-center text-slate-500 dark:text-slate-300 transition-all cursor-pointer"
                aria-label="Close invoice previewer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Live Preview content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-100/50 dark:bg-slate-950/80 no-scrollbar">
              {(() => {
                const pdfDataUri = exportInvoicePDF(activePreviewInvoice, profile, 'datauri') as string;
                const cleanPdfUri = pdfDataUri + '#toolbar=0&navpanes=0&scrollbar=0&view=FitH';

                return (
                  <iframe 
                    src={cleanPdfUri}
                    scrolling="no"
                    className="w-full h-auto aspect-[210/297] rounded-xl border border-slate-200 shadow-sm bg-white overflow-hidden"
                    title="Invoice PDF Preview"
                  />
                );
              })()}

                            {/* Action Toolbar buttons */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-md">
                <span className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider text-center">Share & Instant Dispatch Tools</span>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      exportInvoicePDF(activePreviewInvoice, profile);
                    }}
                    className="flex items-center justify-center gap-1.5 p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium cursor-pointer transition-all shadow-sm active:scale-95"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>Download PDF</span>
                  </button>

                  <button
                    onClick={() => handleExportMSWord(activePreviewInvoice)}
                    className="flex items-center justify-center gap-1.5 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-medium cursor-pointer transition-all shadow-sm active:scale-95"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>Download Word</span>
                  </button>

                  <button
                    onClick={() => triggerWhatsAppShare(activePreviewInvoice)}
                    className="flex items-center justify-center gap-1.5 p-2 bg-emerald-100 text-emerald-800 hover:bg-emerald-250 dark:bg-emerald-950 dark:text-emerald-305 rounded-xl text-xs font-medium cursor-pointer transition-all"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>WhatsApp bill</span>
                  </button>

                  <button
                    onClick={() => triggerEmailShare(activePreviewInvoice)}
                    className="flex items-center justify-center gap-1.5 p-2 bg-teal-100 text-teal-850 hover:bg-teal-200 dark:bg-teal-950 dark:text-teal-300 rounded-xl text-xs font-medium cursor-pointer transition-all"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Dispatch Email</span>
                  </button>

                  <button
                    onClick={() => {
                      exportInvoicePDF(activePreviewInvoice, profile);
                    }}
                    className="col-span-2 flex items-center justify-center gap-1.5 p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-805 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-102 rounded-xl text-xs font-medium cursor-pointer transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print / Save PDF</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* -------------------- OVERLAY MODAL 2: ADD / EDIT CLIENT INTERFACES -------------------- */}
      {isClientEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/65 backdrop-blur-sm overflow-y-auto">
          <form 
            onSubmit={handleSaveClientForm}
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-80 border-slate-200 p-4 space-y-4 text-sans animate-in fade-in duration-200"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                {editingClient ? 'Edit Client Profile' : 'Register New Client'}
              </h3>
              <button
                type="button"
                onClick={() => setIsClientEditorOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="cl_fname" className="block text-[10px] font-medium text-slate-400 uppercase">Client Full Name *</label>
                <input
                  id="cl_fname"
                  required
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-2.5 py-1.5 mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 dark:text-white rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="cl_comp" className="block text-[10px] font-medium text-slate-400 uppercase">Company Name</label>
                <input
                  id="cl_comp"
                  type="text"
                  value={clientCompany}
                  onChange={(e) => setClientCompany(e.target.value)}
                  placeholder="e.g. Marvelous Widgets Ltd"
                  className="w-full px-2.5 py-1.5 mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 dark:text-white rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="cl_em" className="block text-[10px] font-medium text-slate-400 uppercase">Client Email Address</label>
                <input
                  id="cl_em"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="e.g. billing@widgets.com"
                  className="w-full px-2.5 py-1.5 mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 dark:text-white rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="cl_ph" className="block text-[10px] font-medium text-slate-400 uppercase">Client Phone number</label>
                <input
                  id="cl_ph"
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="e.g. +1 (555) 019-2834"
                  className="w-full px-2.5 py-1.5 mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 dark:text-white rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="cl_ad" className="block text-[10px] font-medium text-slate-400 uppercase">Billing Address</label>
                <textarea
                  id="cl_ad"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="e.g. Building 10, Redwood Ave, CA"
                  rows={2}
                  className="w-full px-2.5 py-1.5 mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 dark:text-white rounded-lg focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsClientEditorOpen(false)}
                className="px-3.5 py-1.5 text-xs text-slate-500 font-medium cursor-pointer hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4.5 py-1.5 bg-sky-600 text-white font-bold text-xs rounded-xl shadow cursor-pointer active:scale-95"
              >
                Save Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* -------------------- OVERLAY MODAL 3: LOG EXPENSES REGISTER -------------------- */}
      {isExpenseLoggerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/65 backdrop-blur-sm overflow-y-auto">
          <form 
            onSubmit={handleSaveExpenseForm}
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 p-4 space-y-4 text-sans animate-in fade-in duration-200"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-805">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-805">
                Log Business Expense
              </h3>
              <button
                type="button"
                onClick={() => setIsExpenseLoggerOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="exp_cat" className="block text-[10px] font-medium text-slate-400 uppercase">Expense Category</label>
                <select
                  id="exp_cat"
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 dark:text-white rounded-lg focus:outline-none"
                >
                  <option value="Rent & Overheads">Rent & Overheads</option>
                  <option value="Product Inventory">Product Inventory</option>
                  <option value="SaaS & Tooling Subscriptions">SaaS & Tooling Subscriptions</option>
                  <option value="Contractors & Suppliers cost">Contractors & Suppliers cost</option>
                  <option value="Advertisements & Marketing">Advertisements & Marketing</option>
                  <option value="Travel & Relocation expense">Travel & Relocation expense</option>
                  <option value="Other Corporate Sundry Expenses">Other Corporate Sundry Expenses</option>
                  <option value="Custom">Custom (Type below)</option>
                </select>
                {expenseCategory === 'Custom' && (
                  <input
                    type="text"
                    placeholder="Enter custom category..."
                    value={customExpenseCategory}
                    onChange={(e) => setCustomExpenseCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 mt-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 dark:text-white rounded-lg focus:outline-none focus:border-sky-500"
                    required
                  />
                )}
              </div>

              <div>
                <label htmlFor="exp_amt" className="block text-[10px] font-medium text-slate-400 uppercase">Overhead Cost Amount ({currencySymbol}) *</label>
                <input
                  id="exp_amt"
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-2.5 py-1.5 mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 dark:text-white rounded-lg font-mono focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="exp_dt" className="block text-[10px] font-medium text-slate-400 uppercase">Expenditure Date *</label>
                <input
                  id="exp_dt"
                  required
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 dark:text-white rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="exp_desc" className="block text-[10px] font-medium text-slate-400 uppercase">Expenditure Description</label>
                <textarea
                  id="exp_desc"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  placeholder="e.g. AWS Multi-Region Node Cloud charges"
                  rows={2}
                  className="w-full px-2.5 py-1.5 mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 dark:text-white rounded-lg focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-805 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsExpenseLoggerOpen(false)}
                className="px-3.5 py-1.5 text-xs text-slate-550 font-medium cursor-pointer hover:bg-slate-5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-1.5 bg-rose-600 text-white font-bold text-xs rounded-xl shadow cursor-pointer active:scale-95"
              >
                Log Expense
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
