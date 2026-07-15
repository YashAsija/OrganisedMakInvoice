import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Plus, 
  Download,
  Upload,
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
  Menu,
  Layout,
  BookOpen,
  Bell,
  CheckSquare,
  MinusCircle,
  Users2,
  Truck,
  Tag,
  Zap,
  Wrench,
  MoreVertical,
  Info,
  FileSpreadsheet
} from 'lucide-react';
import { Invoice, BusinessProfile, PresetItem, InvoiceStatus, ClientProfile, Expense } from '../types';
import { BUSINESS_TEMPLATES } from '../lib/presets';
import { exportInvoicePDFAsync, exportCollectiveReportPDF } from '../lib/pdfExporter';
import TemplateManager from './TemplateManager';
import { TEMPLATE_PRESETS } from '../lib/templatePresets';
import { LivePreview } from './TemplateBuilder/LivePreview';

export interface MasterVendor { id: string; name?: string; company?: string; email?: string; phone?: string; address?: string; category?: string; [key: string]: any; }
export interface MasterHsnCode { id: string; code?: string; description?: string; gstRate?: number; [key: string]: any; }
export interface MasterGlAccount { id: string; code?: string; name?: string; type?: string; [key: string]: any; }
export interface MasterMaterial { id: string; name?: string; rate?: number; hsn?: string; uom?: string; category?: string; [key: string]: any; }
export interface MasterCategory { id: string; name?: string; description?: string; [key: string]: any; }
export interface MasterSubCategory { id: string; category?: string; name?: string; [key: string]: any; }
export interface MasterMapping { id: string; item?: string; glAccount?: string; taxRate?: number; [key: string]: any; }
export interface MasterPackingUnit { id: string; name?: string; [key: string]: any; }
export interface MasterMeasurementUnit { id: string; name?: string; [key: string]: any; }
export type MasterItemType = MasterVendor | MasterHsnCode | MasterGlAccount | MasterMaterial | MasterCategory | MasterSubCategory | MasterMapping | MasterPackingUnit | MasterMeasurementUnit;


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
  onToggleSecurity: (type: 'pin' | 'bio') => void;
  onSyncLocalInvoices: () => void;
  onSaveClient: (client: ClientProfile) => void;
  onDeleteClient: (id: string) => void;
  onSaveExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
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
  onToggleSecurity,
  onSyncLocalInvoices,
  onSaveClient,
  onDeleteClient,
  onSaveExpense,
  onDeleteExpense,
  activeTab: propActiveTab,
  onTabChange
}: DashboardProps) {
  // Navigation tabs: 'dashboard' | 'profile' | 'learn' | 'invoices' | 'clients' | 'reports' | 'master_vendor' ...
  const [localActiveTab, setLocalActiveTab] = useState<string>('dashboard');
  const activeTab = propActiveTab !== undefined ? propActiveTab : localActiveTab;
  const setActiveTab = onTabChange !== undefined ? onTabChange : setLocalActiveTab;
  
  // Custom scroll recovery behavior to guarantee the dashboard opens from the top instead of stays scrolled to the bottom on sign-in
  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isDesktopSidebarExpanded, setIsDesktopSidebarExpanded] = useState(true);
  const [isMasterExpanded, setIsMasterExpanded] = useState(true);
  const [isCatalogExpanded, setIsCatalogExpanded] = useState(true);

  // Reusable Master & Catalog form builders state
  const [editingMasterItem, setEditingMasterItem] = useState<MasterItemType | null>(null);
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);

  // Master databases seed
  const [vendors, setVendors] = useState<MasterVendor[]>(() => {
    const cached = localStorage.getItem('makbills_masters_vendors');
    if (cached) return JSON.parse(cached);
    return [
      { id: 'v_1', name: 'AWS Cloud Hosting', company: 'Amazon Web Services', email: 'billing@aws.com', phone: '1-800-AWS', address: 'Seattle, WA', category: 'SaaS Subscriptions' },
      { id: 'v_2', name: 'WeWork Office Space', company: 'WeWork LLC', email: 'billing@wework.com', phone: '+1-555-WEWORK', address: 'Tech Plaza, SF, CA', category: 'Rent & Overheads' },
      { id: 'v_3', name: 'Google Suite Workspace', company: 'Google Cloud Corp', email: 'gsuite@google.com', phone: '1-800-GOOGLE', address: 'Mountain View, CA', category: 'SaaS Subscriptions' }
    ];
  });

  const [hsnCodes, setHsnCodes] = useState<MasterHsnCode[]>(() => {
    const cached = localStorage.getItem('makbills_masters_hsn');
    if (cached) return JSON.parse(cached);
    return [
      { id: 'h_1', code: '998311', description: 'Technical & Software Consulting services (SAC)', gstRate: 18 },
      { id: 'h_2', code: '998313', description: 'Management Advisory & General Corporate Consulting (SAC)', gstRate: 18 },
      { id: 'h_3', code: '997331', description: 'Software SaaS Licensing & Subscriptions (SAC)', gstRate: 18 },
      { id: 'h_4', code: '847130', description: 'Computer Laptops & Hardware Machinery Import', gstRate: 18 }
    ];
  });

  const [glAccounts, setGlAccounts] = useState<MasterGlAccount[]>(() => {
    const cached = localStorage.getItem('makbills_masters_gl');
    if (cached) return JSON.parse(cached);
    return [
      { id: 'gl_1', code: 'GL-100', name: 'Professional Advisory Revenue', type: 'Revenue' },
      { id: 'gl_2', code: 'GL-200', name: 'AWS Infrastructure overheads', type: 'Expense' },
      { id: 'gl_3', code: 'GL-300', name: 'Office Leases Rent & utilities', type: 'Expense' },
      { id: 'gl_4', code: 'GL-400', name: 'Contractor Sinking charges', type: 'Expense' }
    ];
  });

  const [transports, setTransports] = useState<any[]>(() => {
    const cached = localStorage.getItem('makbills_masters_transports');
    if (cached) return JSON.parse(cached);
    return [
      { id: 't_1', name: 'Safe Express Logistics', phone: '9888877777', email: 'info@safeexpress.com', address: 'Okhla Phase 1, New Delhi', gstin: '07AAAAS0000A1Z1', pan: 'AAAAS0000A', state: 'Delhi', country: 'India' }
    ];
  });

  // Catalog Master database seed
  const [materials, setMaterials] = useState<MasterMaterial[]>(() => {
    const cached = localStorage.getItem('makbills_masters_materials');
    if (cached) return JSON.parse(cached);
    return [
      { id: 'm_1', name: 'Premium Software Architecture Review', rate: 120000, hsn: '998311', uom: 'PCS', category: 'Technical Consultancy' },
      { id: 'm_2', name: 'Node.js Enterprise Server Setup', rate: 85000, hsn: '998311', uom: 'PCS', category: 'Engineering Work' },
      { id: 'm_3', name: 'DevOps Pipeline Automations retainer', rate: 45000, hsn: '998311', uom: 'HRS', category: 'Technical Consultancy' }
    ];
  });

  const [categories, setCategories] = useState<MasterCategory[]>(() => {
    const cached = localStorage.getItem('makbills_masters_categories');
    if (cached) return JSON.parse(cached);
    return [
      { id: 'cat_1', name: 'Technical Consultancy', description: 'Architectural, DevOps, review sessions' },
      { id: 'cat_2', name: 'Engineering Work', description: 'Core product programming and server installations' },
      { id: 'cat_3', name: 'Training Programs', description: 'Corporate developer training upskilling courses' }
    ];
  });

  const [subCategories, setSubCategories] = useState<MasterSubCategory[]>(() => {
    const cached = localStorage.getItem('makbills_masters_subcategories');
    if (cached) return JSON.parse(cached);
    return [
      { id: 'scat_1', category: 'Technical Consultancy', name: 'Cloud Infrastructure Auditing' },
      { id: 'scat_2', category: 'Technical Consultancy', name: 'Security Review' },
      { id: 'scat_3', category: 'Engineering Work', name: 'React UI Architecture Development' }
    ];
  });

  const [mappings, setMappings] = useState<MasterMapping[]>(() => {
    const cached = localStorage.getItem('makbills_masters_mappings');
    if (cached) return JSON.parse(cached);
    return [
      { id: 'map_1', item: 'Premium Software Architecture Review', glAccount: 'Professional Advisory Revenue', taxRate: 18 },
      { id: 'map_2', item: 'AWS Cloud Hosting Mapping', glAccount: 'AWS Infrastructure overheads', taxRate: 18 }
    ];
  });

  const [packingUnits, setPackingUnits] = useState<MasterPackingUnit[]>(() => {
    const cached = localStorage.getItem('makbills_masters_packing');
    if (cached) return JSON.parse(cached);
    return [
      { id: 'p_1', name: 'PCS (Single items pack)' },
      { id: 'p_2', name: 'BOX (Sealed cardboard cartons)' },
      { id: 'p_3', name: 'ENV (Flat protective paper envelopes)' }
    ];
  });

  const [measurementUnits, setMeasurementUnits] = useState<MasterMeasurementUnit[]>(() => {
    const cached = localStorage.getItem('makbills_masters_measurement');
    if (cached) return JSON.parse(cached);
    return [
      { id: 'mu_1', code: 'PCS', name: 'Pieces' },
      { id: 'mu_2', code: 'HRS', name: 'Hours billed' },
      { id: 'mu_3', code: 'DAY', name: 'Days duration' },
      { id: 'mu_4', code: 'MTR', name: 'Meters linear' },
      { id: 'mu_5', code: 'KGS', name: 'Kilograms weight' }
    ];
  });

  // Sync Master Registry Client Database (vendors) with other views
  useEffect(() => {
    const handleSync = () => {
      const cached = localStorage.getItem('makbills_masters_vendors');
      if (cached) {
        try {
          setVendors(JSON.parse(cached));
        } catch (e) {}
      }
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('makbills_sync_vendors', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('makbills_sync_vendors', handleSync);
    };
  }, []);

  // Sync Transport Database with other views
  useEffect(() => {
    const handleSync = () => {
      const cached = localStorage.getItem('makbills_masters_transports');
      if (cached) {
        try {
          setTransports(JSON.parse(cached));
        } catch (e) {}
      }
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('makbills_sync_transports', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('makbills_sync_transports', handleSync);
    };
  }, []);

  // --- Auto-sync items from invoices into material catalog ---
  useEffect(() => {
    if (!invoices || invoices.length === 0) return;
    
    let changed = false;
    const updatedMaterials = [...materials];

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
      localStorage.setItem('makbills_masters_materials', JSON.stringify(updatedMaterials));
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
        key = 'makbills_masters_vendors';
        setter = setVendors;
        break;
      case 'master_transport':
        list = transports;
        key = 'makbills_masters_transports';
        setter = setTransports;
        break;
      case 'master_hsn':
        list = hsnCodes;
        key = 'makbills_masters_hsn';
        setter = setHsnCodes;
        break;
      case 'master_gl':
        list = glAccounts;
        key = 'makbills_masters_gl';
        setter = setGlAccounts;
        break;
      case 'catalog_material':
        list = materials;
        key = 'makbills_masters_materials';
        setter = setMaterials;
        break;
      case 'catalog_category':
        list = categories;
        key = 'makbills_masters_categories';
        setter = setCategories;
        break;
      case 'catalog_sub_category':
        list = subCategories;
        key = 'makbills_masters_subcategories';
        setter = setSubCategories;
        break;
      case 'catalog_mapping':
        list = mappings;
        key = 'makbills_masters_mappings';
        setter = setMappings;
        break;
      case 'catalog_packing_unit':
        list = packingUnits;
        key = 'makbills_masters_packing';
        setter = setPackingUnits;
        break;
      case 'catalog_measurement_unit':
        list = measurementUnits;
        key = 'makbills_masters_measurement';
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
        key = 'makbills_masters_vendors';
        setter = setVendors;
        break;
      case 'master_transport':
        list = transports;
        key = 'makbills_masters_transports';
        setter = setTransports;
        break;
      case 'master_hsn':
        list = hsnCodes;
        key = 'makbills_masters_hsn';
        setter = setHsnCodes;
        break;
      case 'master_gl':
        list = glAccounts;
        key = 'makbills_masters_gl';
        setter = setGlAccounts;
        break;
      case 'catalog_material':
        list = materials;
        key = 'makbills_masters_materials';
        setter = setMaterials;
        break;
      case 'catalog_category':
        list = categories;
        key = 'makbills_masters_categories';
        setter = setCategories;
        break;
      case 'catalog_sub_category':
        list = subCategories;
        key = 'makbills_masters_subcategories';
        setter = setSubCategories;
        break;
      case 'catalog_mapping':
        list = mappings;
        key = 'makbills_masters_mappings';
        setter = setMappings;
        break;
      case 'catalog_packing_unit':
        list = packingUnits;
        key = 'makbills_masters_packing';
        setter = setPackingUnits;
        break;
      case 'catalog_measurement_unit':
        list = measurementUnits;
        key = 'makbills_masters_measurement';
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

    const navItemClass = (tab: string) => {
      const isActive = activeTab === tab;
      return `w-full px-3.5 py-2.5 rounded-xl text-left text-xs font-bold transition-all duration-300 flex items-center justify-between cursor-pointer ${
        isActive
          ? 'bg-[#EADFCF] text-[#5C5043] dark:bg-zinc-800 dark:text-white border-r-[3px] border-[#88765C] font-black'
          : 'text-[#88765C]/90 hover:text-[#5C5043] dark:text-zinc-400 hover:bg-[#F4EBE1]/60 dark:hover:bg-zinc-800/40'
      }`;
    };

    return (
      <div className="flex flex-col h-full space-y-6 text-sans select-none">
        
        {/* User Card info */}
        <div className="flex items-center gap-3 pb-4 border-b border-[#EBDCC8]/65 dark:border-zinc-800">
          <div className="w-10 h-10 rounded-xl bg-[#5C5043] text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm">
            {profile.name ? profile.name.charAt(0).toUpperCase() : 'M'}
          </div>
          <div className="min-w-0">
            <h4 className="text-[11px] font-black text-[#5C5043] dark:text-white uppercase leading-tight truncate">{profile.name || 'MAKINVOICE'}</h4>
            <span className="text-[9.5px] text-[#88765C]/85 dark:text-zinc-400 font-mono tracking-wide mt-0.5 block truncate">{profile.mobile || profile.phone || '9899728185'}</span>
          </div>
        </div>

        {/* SETTINGS MENU */}
        <div className="space-y-1">
          <span className="text-[9px] uppercase font-extrabold tracking-widest text-[#88765C]/60 dark:text-zinc-500 block px-2 pb-1">Settings Menu</span>
          
          <button
            onClick={() => handleTabClick('dashboard')}
            className={navItemClass('dashboard')}
          >
            <div className="flex items-center gap-2.5">
              <BarChart3 className="w-4 h-4" />
              <span>Billing Dashboard</span>
            </div>
          </button>

          <button
            onClick={() => handleTabClick('learn')}
            className={navItemClass('learn')}
          >
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-4 h-4" />
              <span>Learn MakInvoices</span>
            </div>
          </button>

          <button
            onClick={() => handleTabClick('invoice_templates')}
            className={navItemClass('invoice_templates')}
          >
            <div className="flex items-center gap-2.5">
              <Layout className="w-4 h-4" />
              <span>Invoice Template</span>
            </div>
          </button>

          <button
            onClick={() => handleTabClick('invoices')}
            className={navItemClass('invoices')}
          >
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4" />
              <span>Invoices Ledger</span>
            </div>
            <span className={`text-[9.5px] px-1.5 py-0.5 rounded-full font-medium ${activeTab === 'invoices' ? 'bg-[#88765C] text-white' : 'bg-[#F4EBE1] text-[#88765C]'}`}>
              {invoices.length}
            </span>
          </button>

          <button
            onClick={() => handleTabClick('reports')}
            className={navItemClass('reports')}
          >
            <div className="flex items-center gap-2.5">
              <TrendingUp className="w-4 h-4" />
              <span>Accounting Summary</span>
            </div>
          </button>
        </div>

        {/* MASTER REGISTRY */}
        <div className="space-y-1">
          <span className="text-[9px] uppercase font-extrabold tracking-widest text-[#88765C]/60 dark:text-zinc-500 block px-2 pb-1">Master Registry</span>

          <button
            onClick={() => handleTabClick('master_vendor')}
            className={navItemClass('master_vendor')}
          >
            <div className="flex items-center gap-2.5">
              <Users2 className="w-4 h-4" />
              <span>Client Database</span>
            </div>
          </button>

          <button
            onClick={() => handleTabClick('master_hsn')}
            className={navItemClass('master_hsn')}
          >
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-4 h-4" />
              <span>HSN Registry</span>
            </div>
          </button>

          <button
            onClick={() => handleTabClick('master_transport')}
            className={navItemClass('master_transport')}
          >
            <div className="flex items-center gap-2.5">
              <Truck className="w-4 h-4" />
              <span>Transport Database</span>
            </div>
          </button>

          <button
            onClick={() => handleTabClick('catalog_category')}
            className={navItemClass('catalog_category')}
          >
            <div className="flex items-center gap-2.5">
              <Tag className="w-4 h-4" />
              <span>Product Category</span>
            </div>
          </button>
        </div>

        {/* BOTTOM QUICK BILL & MATERIAL CATALOG */}
        <div className="pt-4 border-t border-[#EBDCC8]/65 dark:border-zinc-800 mt-auto space-y-2">
          <button
            onClick={() => {
              onOpenInvoiceEditor(null);
              if (isMobileView) setIsMobileDrawerOpen(false);
            }}
            className="w-full py-2.5 bg-[#88765C] hover:bg-[#5C5043] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:shadow-md transition-all duration-300"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>Quick Bill</span>
          </button>

          <button
            onClick={() => handleTabClick('catalog_material')}
            className={navItemClass('catalog_material')}
          >
            <div className="flex items-center gap-2.5">
              <Wrench className="w-4 h-4" />
              <span>Material Catalog</span>
            </div>
          </button>

          {userEmail ? (
            <button
              onClick={() => {
                onLogout();
                if (isMobileView) setIsMobileDrawerOpen(false);
              }}
              className="w-full px-3 py-2 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-955 text-rose-600 dark:text-rose-450 text-[10px] font-extrabold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-transparent dark:border-rose-900/30"
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
              className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-extrabold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
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
        title = 'Client Database';
        description = 'Pre-saved client profiles, company settings, and billing contact information';
        list = vendors;
        columns = [
          { header: 'Client Name', key: 'name' },
          { header: 'Company Name', key: 'company' },
          { header: 'Email Address', key: 'email' },
          { header: 'Phone Number', key: 'phone' }
        ];
        fields = [
          { label: 'Client Name', key: 'name', type: 'text' },
          { label: 'Company / Organization', key: 'company', type: 'text' },
          { label: 'Category / Tag', key: 'category', type: 'text' },
          { label: 'Email Address', key: 'email', type: 'email' },
          { label: 'Phone Number', key: 'phone', type: 'text' },
          { label: 'Billing Address', key: 'address', type: 'text' }
        ];
        break;
      case 'master_transport':
        title = 'Transport Database';
        description = 'Registry of transport companies, shipping client profiles, and cargo carriers';
        list = transports;
        columns = [
          { header: 'Carrier Name', key: 'name' },
          { header: 'GSTIN / UIN', key: 'gstin' },
          { header: 'Phone Number', key: 'phone' },
          { header: 'State', key: 'state' },
          { header: 'Address', key: 'address' }
        ];
        fields = [
          { label: 'Carrier / Shipper Name', key: 'name', type: 'text' },
          { label: 'GSTIN / UIN', key: 'gstin', type: 'text' },
          { label: 'PAN', key: 'pan', type: 'text' },
          { label: 'Contact Phone', key: 'phone', type: 'text' },
          { label: 'Contact Email', key: 'email', type: 'email' },
          { label: 'State', key: 'state', type: 'text' },
          { label: 'Country', key: 'country', type: 'text' },
          { label: 'Address Details', key: 'address', type: 'text' }
        ];
        break;
      case 'master_hsn':
        title = 'HSN / SAC Tax Registry';
        description = 'Standard tax rates, HSN/SAC codes, and custom tax classifications';
        list = hsnCodes;
        columns = [
          { header: 'HSN/SAC Code', key: 'code' },
          { header: 'Description', key: 'description' },
          { header: 'Tax Rate (%)', key: 'gstRate' }
        ];
        fields = [
          { label: 'HSN/SAC Code', key: 'code', type: 'text' },
          { label: 'Description', key: 'description', type: 'text' },
          { label: 'Tax Rate (%)', key: 'gstRate', type: 'number' }
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
        title = 'Material & Product Catalog';
        description = 'Manage pre-saved products, materials, services, and standard rates';
        list = materials;
        columns = [
          { header: 'Item Name', key: 'name' },
          { header: 'Standard Rate', key: 'rate' },
          { header: 'Unit (UOM)', key: 'uom' },
          { header: 'HSN/SAC Code', key: 'hsn' }
        ];
        fields = [
          { label: 'Item Name', key: 'name', type: 'text' },
          { label: 'Standard Rate / Unit Price', key: 'rate', type: 'number' },
          { label: 'HSN/SAC Code', key: 'hsn', type: 'text' },
          { label: 'Unit of Measure (UOM)', key: 'uom', type: 'text' },
          { label: 'Category', key: 'category', type: 'text' }
        ];
        break;
      case 'catalog_category':
        title = 'Product Categories';
        description = 'Manage categories to organize materials, products, and services';
        list = categories;
        columns = [
          { header: 'Category Name', key: 'name' },
          { header: 'Description', key: 'description' }
        ];
        fields = [
          { label: 'Category Name', key: 'name', type: 'text' },
          { label: 'Description', key: 'description', type: 'text' }
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
          
          <div className="flex gap-2 self-start sm:self-center">
            <button
              onClick={() => {
                setEditingMasterItem({ id: 'm_item_' + Date.now() });
                setIsMasterModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-[10px] font-extrabold tracking-wide flex items-center gap-1 cursor-pointer shadow-md shadow-sky-950/10"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Registry Record</span>
            </button>
            {(activeTab === 'master_vendor' || activeTab === 'master_transport' || activeTab === 'master_hsn' || activeTab === 'catalog_material' || activeTab === 'catalog_category') && (
              <>
                <button
                  onClick={() => {
                    let headers: string[] = [];
                    let filename = '';
                    let sampleRow: string[] = [];
                    
                    if (activeTab === 'master_vendor') {
                      headers = ['Client Name', 'Company Name', 'Category / Tag', 'Email Address', 'Phone Number', 'Billing Address'];
                      sampleRow = ['John Doe', 'Acme Corp', 'VIP Client', 'john@acme.com', '+1 555-0199', '123 Business Rd, New York'];
                      filename = 'client_database_template.csv';
                    } else if (activeTab === 'master_transport') {
                      headers = ['Carrier Name', 'GSTIN / UIN', 'PAN', 'Phone Number', 'Email Address', 'State', 'Country', 'Address Details'];
                      sampleRow = ['Safe Express Logistics', '07AAAAS0000A1Z1', 'AAAAS0000A', '+91 9888877777', 'info@safeexpress.com', 'Delhi', 'India', 'Okhla Phase 1, New Delhi'];
                      filename = 'transport_database_template.csv';
                    } else if (activeTab === 'master_hsn') {
                      headers = ['HSN/SAC Code', 'Description', 'Tax Rate (%)'];
                      sampleRow = ['998311', 'Management Consulting Services', '18'];
                      filename = 'hsn_registry_template.csv';
                    } else if (activeTab === 'catalog_material') {
                      headers = ['Item Name', 'Standard Rate / Unit Price', 'HSN/SAC Code', 'Unit of Measure (UOM)', 'Category'];
                      sampleRow = ['Premium Advisory Service', '150', '998311', 'hour', 'Consulting'];
                      filename = 'material_catalog_template.csv';
                    } else if (activeTab === 'catalog_category') {
                      headers = ['Category Name', 'Description'];
                      sampleRow = ['Consulting', 'Advisory and business optimization services'];
                      filename = 'product_category_template.csv';
                    }

                    const csvContent = [
                      headers.join(','),
                      sampleRow.map(v => `"${v.replace(/"/g, '""')}"`).join(',')
                    ].join('\n');

                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    link.setAttribute('download', filename);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-705 dark:text-slate-300 rounded-xl text-[10px] font-extrabold tracking-wide flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Template</span>
                </button>
                <button
                  onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel';
                  input.onchange = (e: any) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        try {
                          const data = evt.target?.result;
                          const workbook = XLSX.read(data, { type: 'binary' });
                          const firstSheetName = workbook.SheetNames[0];
                          const worksheet = workbook.Sheets[firstSheetName];
                          const parsedData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                          
                          if (parsedData.length === 0) {
                            alert('No valid items found in file.');
                            return;
                          }

                          // First row contains the headers
                          const headers = parsedData[0].map((h: any) => String(h || '').trim().replace(/^"|"$/g, ''));
                          const rows = parsedData.slice(1);

                          const finalItems = rows.filter(r => r && r.length > 0).map((row, index) => {
                            const rowData: any = {};
                            headers.forEach((header: string, headerIdx: number) => {
                              if (header) {
                                rowData[header] = row[headerIdx] !== undefined ? row[headerIdx] : '';
                              }
                            });

                            const id = `bulk_${activeTab}_${Date.now()}_${index}`;
                            if (activeTab === 'master_vendor') {
                              return {
                                id,
                                name: rowData.name || rowData['Client Name'] || rowData['name'] || 'Unnamed Client',
                                company: rowData.company || rowData['Company Name'] || rowData['company'] || '',
                                category: rowData.category || rowData['Category / Tag'] || rowData['Category'] || rowData['category'] || '',
                                email: rowData.email || rowData['Email Address'] || rowData['email'] || '',
                                phone: rowData.phone || rowData['Phone Number'] || rowData['phone'] || '',
                                address: rowData.address || rowData['Billing Address'] || rowData['address'] || ''
                              };
                            } else if (activeTab === 'master_transport') {
                              return {
                                id,
                                name: rowData.name || rowData['Carrier Name'] || rowData['name'] || 'Unnamed Carrier',
                                gstin: rowData.gstin || rowData['GSTIN / UIN'] || rowData['gstin'] || '',
                                pan: rowData.pan || rowData['PAN'] || rowData['pan'] || '',
                                phone: rowData.phone || rowData['Phone Number'] || rowData['phone'] || '',
                                email: rowData.email || rowData['Email Address'] || rowData['email'] || '',
                                state: rowData.state || rowData['State'] || rowData['state'] || '',
                                country: rowData.country || rowData['Country'] || rowData['country'] || '',
                                address: rowData.address || rowData['Address Details'] || rowData['address'] || ''
                              };
                            } else if (activeTab === 'master_hsn') {
                              return {
                                id,
                                code: rowData.code || rowData['HSN/SAC Code'] || rowData['code'] || '000000',
                                description: rowData.description || rowData['Description'] || rowData['description'] || '',
                                gstRate: Number(rowData.gstRate || rowData['Tax Rate (%)'] || rowData['GST Rate'] || rowData['gstRate'] || 18)
                              };
                            } else if (activeTab === 'catalog_material') {
                              return {
                                id,
                                name: rowData.name || rowData['Item Name'] || rowData['Material Name'] || rowData['name'] || 'Unnamed Material',
                                rate: Number(rowData.rate || rowData['Standard Rate / Unit Price'] || rowData['Standard Rate'] || rowData['rate'] || 0),
                                hsn: rowData.hsn || rowData['HSN/SAC Code'] || rowData['HSN/SAC Reference'] || rowData['hsn'] || '',
                                uom: rowData.uom || rowData['Unit of Measure (UOM)'] || rowData['UOM'] || rowData['uom'] || 'pcs',
                                category: rowData.category || rowData['Category'] || rowData['category'] || ''
                              };
                            } else if (activeTab === 'catalog_category') {
                              return {
                                id,
                                name: rowData.name || rowData['Category Name'] || rowData['name'] || 'Unnamed Category',
                                description: rowData.description || rowData['Description'] || rowData['Scope Description'] || rowData['description'] || ''
                              };
                            }
                            return null;
                          }).filter(Boolean);

                          if (finalItems.length === 0) {
                            alert('No valid items found in file.');
                            return;
                          }

                          let currentList: any[] = [];
                          let storageKey = '';
                          let setterFn: any = null;

                          if (activeTab === 'master_vendor') {
                            currentList = vendors;
                            storageKey = 'makbills_masters_vendors';
                            setterFn = setVendors;
                          } else if (activeTab === 'master_transport') {
                            currentList = transports;
                            storageKey = 'makbills_masters_transports';
                            setterFn = setTransports;
                          } else if (activeTab === 'master_hsn') {
                            currentList = hsnCodes;
                            storageKey = 'makbills_masters_hsn';
                            setterFn = setHsnCodes;
                          } else if (activeTab === 'catalog_material') {
                            currentList = materials;
                            storageKey = 'makbills_masters_materials';
                            setterFn = setMaterials;
                          } else if (activeTab === 'catalog_category') {
                            currentList = categories;
                            storageKey = 'makbills_masters_categories';
                            setterFn = setCategories;
                          }

                          if (setterFn) {
                            const updatedList = [...finalItems, ...currentList];
                            setterFn(updatedList);
                            localStorage.setItem(storageKey, JSON.stringify(updatedList));
                            alert(`Successfully uploaded ${finalItems.length} items!`);
                          }
                        } catch (err: any) {
                          alert('Error parsing file: ' + err.message);
                        }
                      };
                      reader.readAsBinaryString(file);
                    }
                  };
                  input.click();
                }}
                className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-[10px] font-extrabold tracking-wide flex items-center gap-1 cursor-pointer shadow-md"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Bulk Upload</span>
              </button>
            </>
          )}
          </div>
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
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">{f.label}</label>
                    {f.type === 'select' ? (
                      <select
                        value={editingMasterItem[f.key] || ''}
                        onChange={(e) => setEditingMasterItem({ ...editingMasterItem, [f.key]: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-none touch-action-manipulation"
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
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-none touch-action-manipulation"
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

  const handleBulkExportPDF = async () => {
    const selected = invoices.filter(inv => selectedInvoiceIds.includes(inv.id));
    if (selected.length === 0) return;
    
    // Sequentially download each document safely
    for (let i = 0; i < selected.length; i++) {
        await exportInvoicePDFAsync(selected[i], profile);
        await new Promise(r => setTimeout(r, 250));
    }
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
    link.setAttribute("download", `MakInvoices_Ledger_Spreadsheet_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Dialog overlay for live preview
  const [activePreviewInvoice, setActivePreviewInvoice] = useState<Invoice | null>(null);
  const [previewDataUri, setPreviewDataUri] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const [isClientEditorOpen, setIsClientEditorOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientProfile | null>(null);

  useEffect(() => {
    if (activePreviewInvoice) {
      setIsPreviewLoading(true);
      exportInvoicePDFAsync(activePreviewInvoice, profile, 'datauri')
        .then(uri => setPreviewDataUri(uri as string))
        .catch(err => { console.error('Preview error:', err); setPreviewDataUri(null); })
        .finally(() => setIsPreviewLoading(false));
    } else {
      setPreviewDataUri(null);
    }
  }, [activePreviewInvoice, profile]);
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

  const currencySymbol = profile.currencySymbol || getCurrencySymbol(profile.currency);

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
        <span style="font-size: 9px; display: block; margin-top: 8px; color: #94a3b8;">This is a premium-formatted Microsoft Word billing document generated from MakInvoices.</span>
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

  const triggerWhatsAppShare = async (inv: Invoice) => {
    // Export PDF then open WhatsApp with a download note
    await exportInvoicePDFAsync(inv, profile);
    setTimeout(() => {
      const sym = profile.currency === 'INR' ? '₹' : (profile.currency === 'USD' ? '$' : profile.currency + ' ');
      const message = `Hi ${inv.clientName || 'Client'}, please find your Invoice ${inv.invoiceNumber} from ${profile.name || 'us'} for ${sym}${inv.grandTotal.toFixed(2)} (Due: ${inv.dueDate}). The PDF has been downloaded to your device. Thank you!`;
      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    }, 600);
  };

  const triggerEmailShare = async (inv: Invoice) => {
    // Export PDF then open email client
    await exportInvoicePDFAsync(inv, profile);
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
    <div className="h-dvh w-full max-w-full overflow-hidden bg-[#FCFAF7] dark:bg-zinc-950 text-slate-800 dark:text-slate-100 transition-colors duration-200 text-sans">
      
      {/* Dynamic Main App Bar Header */}
      <header className={`sticky top-0 z-20 w-full bg-white/95 dark:bg-slate-905/95 backdrop-blur-md border-b border-slate-150 dark:border-slate-800/80 px-4 py-3 flex items-center justify-between shadow-xs ${activeTab === 'dashboard' ? 'md:hidden' : ''}`}>
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
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Cloud Active
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
        <div className="hidden md:block relative shrink-0">
          <aside className={`flex flex-col bg-[#FCFAF7] dark:bg-zinc-900 border border-[#EBDCC8] dark:border-zinc-800 rounded-3xl shadow-xs h-[calc(100vh-110px)] overflow-y-auto overflow-x-hidden transition-all duration-300 ${isDesktopSidebarExpanded ? 'w-[280px] p-5' : 'w-[88px] p-4 items-center [&_span]:hidden [&_.min-w-0]:hidden [&_button]:justify-center [&_button>div]:justify-center [&_.pl-2]:hidden [&_h4]:hidden'}`}>
            <div className="w-full h-full">
              {renderNavMenuContent(false)}
            </div>
          </aside>
          
          <button 
            onClick={() => setIsDesktopSidebarExpanded(!isDesktopSidebarExpanded)} 
            className="absolute -right-3 top-6 z-20 w-6 h-6 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-slate-400 dark:text-slate-350 hover:text-sky-500 flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all"
            title={isDesktopSidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-300 ${isDesktopSidebarExpanded ? 'rotate-180' : 'rotate-0'}`} />
          </button>
        </div>

        {/* RIGHT CENTRAL WORKSPACE PANEL */}
        <div className="flex-1 min-w-0 w-full m-0 p-0 h-[calc(100vh-110px)] overflow-y-auto pr-1">



          {/* Connections / sync triggers */}

        {/* ------------------ TAB 1: INVOICES ROUTE ------------------ */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            {/* Quick Metrics summary overview */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
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
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ID, client search..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-sm"
                />
              </div>
              <div className="sm:col-span-4 flex">
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
                            onClick={async () => {
                              try {
                                await exportInvoicePDFAsync(inv, profile, 'save');
                              } catch (err: any) {
                                alert('Failed to generate PDF: ' + (err.message || err.toString()));
                              }
                            }}
                            className="px-2 py-0.5 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 hover:bg-sky-100 rounded-md text-[9px] font-medium flex items-center gap-0.5 cursor-pointer"
                          >
                            <FileDown className="w-3 h-3" />
                            PDF
                          </button>
                          <button
                            onClick={() => handleExportMSWord(inv)}
                            className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:blue-400 hover:bg-blue-100 rounded-md text-[9px] font-medium flex items-center gap-0.5 cursor-pointer"
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
              <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2.5xl overflow-x-auto shadow-xs">
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
                                onClick={async () => {
                                  try {
                                    await exportInvoicePDFAsync(inv, profile, 'save');
                                  } catch (err: any) {
                                    alert('Failed to generate PDF: ' + (err.message || err.toString()));
                                  }
                                }}
                                className="px-2 py-1 bg-sky-50 dark:bg-sky-955 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900 rounded-md text-[9px] font-medium flex items-center gap-0.5 cursor-pointer border border-transparent"
                                title="Download Premium PDF Bill"
                              >
                                <FileDown className="w-3 h-3" />
                                <span>PDF</span>
                              </button>
                              <button
                                onClick={() => handleExportMSWord(inv)}
                                className="px-2 py-1 bg-blue-50 dark:bg-blue-955 text-blue-600 dark:blue-400 hover:bg-blue-100 dark:hover:bg-sky-900 rounded-md text-[9px] font-medium flex items-center gap-0.5 cursor-pointer"
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

        {/* ------------------ TAB: INVOICE TEMPLATES ROUTE ------------------ */}
        {activeTab === 'invoice_templates' && (
          <div className="space-y-4">
            <TemplateManager businessProfile={profile} />
          </div>
        )}

        {/* ------------------ TAB 2: CLIENTS ROUTE ------------------ */}
        {activeTab === 'clients' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-3xl shadow-sm">
              <div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Billed Clients Ledger Book</h2>
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
                  Your Billed Clients Ledger is currently empty. Add profiles to automatically inject contacts on invoice selection.
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
                      setTimeout(async () => {
                        await exportInvoicePDFAsync(inv, profile);
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
                  No registered business expenses in this bracket. Use &apos;Log Expense&apos; above to enter tax write-offs.
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
        {activeTab === 'dashboard' && (() => {
          // Calculate KPI sparkline and chart details
          const monthsShort = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN"];
          const records: { label: string; income: number; projected: number }[] = [];
          const now = new Date();
          
          for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            records.push({
              label: `${monthsShort[d.getMonth() % 12]}`,
              income: 0,
              projected: 0
            });
          }

          invoices.forEach(inv => {
            if (inv.status === 'paid') {
              const dateObj = new Date(inv.date);
              if (!isNaN(dateObj.getTime())) {
                const label = monthsShort[dateObj.getMonth() % 12];
                const match = records.find(r => r.label === label);
                if (match) match.income += inv.grandTotal;
              }
            }
          });

          records.forEach((r, idx) => {
            r.projected = r.income > 0 ? r.income * 0.85 + 25000 : 80000 + idx * 45000;
          });

          // SVG Line coordinates math
          const maxVal = Math.max(...records.map(d => Math.max(d.income, d.projected)), 100000);
          const chartWidth = 500;
          const chartHeight = 160;
          const paddingX = 40;
          const paddingY = 20;
          const usableWidth = chartWidth - paddingX * 2;
          const usableHeight = chartHeight - paddingY * 2;

          const pointsActual = records.map((r, i) => ({
            x: paddingX + (i / (records.length - 1)) * usableWidth,
            y: chartHeight - paddingY - (r.income / maxVal) * usableHeight
          }));

          const pointsProjected = records.map((r, i) => ({
            x: paddingX + (i / (records.length - 1)) * usableWidth,
            y: chartHeight - paddingY - (r.projected / maxVal) * usableHeight
          }));

          const pathActual = pointsActual.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
          const pathProjected = pointsProjected.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

          const initials = profile.name ? profile.name.slice(0, 2).toUpperCase() : 'MK';

          return (
            <div className="space-y-6 text-sans animate-in fade-in duration-300">
              {/* Main Topbar Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EBDCC8]/60 dark:border-zinc-800">
                <div>
                  <span className="text-[10px] font-bold text-[#88765C]/80 uppercase tracking-widest">Financial Hub / Dashboard</span>
                </div>
                <div className="flex items-center gap-4 self-end sm:self-auto">
                  <div className="relative w-full max-w-[280px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#88765C]/70" />
                    <input 
                      type="text" 
                      placeholder="Search insights..." 
                      className="w-full pl-9 pr-4 py-2 text-xs rounded-full border border-[#EBDCC8] dark:border-zinc-800 bg-[#FCFAF7]/80 dark:bg-zinc-950 focus:outline-hidden text-[#5C5043] dark:text-white placeholder-[#88765C]/50"
                    />
                  </div>
                  <button className="p-2 bg-white dark:bg-zinc-900 border border-[#EBDCC8] dark:border-zinc-800 text-[#88765C] hover:text-[#5C5043] rounded-full transition-colors relative cursor-pointer">
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500" />
                  </button>
                  <button 
                    onClick={() => setActiveTab('profile')}
                    className="w-9 h-9 rounded-full bg-[#5C5043] text-white flex items-center justify-center text-xs font-black tracking-wider shadow-sm cursor-pointer"
                  >
                    {initials}
                  </button>
                </div>
              </div>

              {/* KPI Cards Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Settled Earnings */}
                <div className="bg-white dark:bg-zinc-900 border border-[#EBDCC8]/60 dark:border-zinc-800 rounded-2xl p-5 shadow-xs relative flex flex-col justify-between h-[155px]">
                  <div className="flex justify-between items-start">
                    <div className="w-8.5 h-8.5 rounded-full bg-[#ECFDF5] text-[#10B981] border border-[#A7F3D0] flex items-center justify-center font-black text-sm">
                      ₹
                    </div>
                    <span className="text-[10px] font-black text-[#10B981] bg-[#ECFDF5] border border-[#A7F3D0] px-2 py-0.5 rounded-full">
                      +12.5%
                    </span>
                  </div>
                  <div className="mt-3">
                    <span className="text-[9px] uppercase font-black tracking-wider text-[#88765C]/80 block">Settled Earnings</span>
                    <span className="text-xl font-black text-[#5C5043] dark:text-white mt-1 block">
                      {currencySymbol}{totalBilled.toLocaleString()}
                    </span>
                  </div>
                  {/* Sparkline bars */}
                  <div className="flex items-end gap-1 h-6 self-start mt-2">
                    <div className="w-1 bg-[#10B981]/30 rounded-t-sm h-2" />
                    <div className="w-1 bg-[#10B981]/50 rounded-t-sm h-3" />
                    <div className="w-1 bg-[#10B981]/70 rounded-t-sm h-5" />
                    <div className="w-1 bg-[#10B981]/40 rounded-t-sm h-3" />
                    <div className="w-1 bg-[#10B981] rounded-t-sm h-6" />
                  </div>
                </div>

                {/* Pending Receivables */}
                <div className="bg-white dark:bg-zinc-900 border border-[#EBDCC8]/60 dark:border-zinc-800 rounded-2xl p-5 shadow-xs relative flex flex-col justify-between h-[155px]">
                  <div className="flex justify-between items-start">
                    <div className="w-8.5 h-8.5 rounded-full bg-[#FFFBEB] text-[#F59E0B] border border-[#FEF3C7] flex items-center justify-center">
                      <CheckSquare className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black text-[#F59E0B] bg-[#FFFBEB] border border-[#FEF3C7] px-2 py-0.5 rounded-full">
                      +4.2%
                    </span>
                  </div>
                  <div className="mt-3">
                    <span className="text-[9px] uppercase font-black tracking-wider text-[#88765C]/80 block">Pending Receivables</span>
                    <span className="text-xl font-black text-[#5C5043] dark:text-white mt-1 block">
                      {currencySymbol}{totalOutstanding.toLocaleString()}
                    </span>
                  </div>
                  {/* Sparkline bars */}
                  <div className="flex items-end gap-1 h-6 self-start mt-2">
                    <div className="w-1 bg-[#F59E0B]/30 rounded-t-sm h-4" />
                    <div className="w-1 bg-[#F59E0B]/50 rounded-t-sm h-2" />
                    <div className="w-1 bg-[#F59E0B]/70 rounded-t-sm h-5" />
                    <div className="w-1 bg-[#F59E0B] rounded-t-sm h-6" />
                    <div className="w-1 bg-[#F59E0B]/40 rounded-t-sm h-3" />
                  </div>
                </div>

                {/* Operating Expenses */}
                <div className="bg-white dark:bg-zinc-900 border border-[#EBDCC8]/60 dark:border-zinc-800 rounded-2xl p-5 shadow-xs relative flex flex-col justify-between h-[155px]">
                  <div className="flex justify-between items-start">
                    <div className="w-8.5 h-8.5 rounded-full bg-[#FEF2F2] text-[#EF4444] border border-[#FEE2E2] flex items-center justify-center">
                      <MinusCircle className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black text-[#EF4444] bg-[#FEF2F2] border border-[#FEE2E2] px-2 py-0.5 rounded-full">
                      -2.8%
                    </span>
                  </div>
                  <div className="mt-3">
                    <span className="text-[9px] uppercase font-black tracking-wider text-[#88765C]/80 block">Operating Expenses</span>
                    <span className="text-xl font-black text-[#5C5043] dark:text-white mt-1 block">
                      {currencySymbol}{totalReportedExpenses.toLocaleString()}
                    </span>
                  </div>
                  {/* Sparkline bars */}
                  <div className="flex items-end gap-1 h-6 self-start mt-2">
                    <div className="w-1 bg-[#EF4444] rounded-t-sm h-6" />
                    <div className="w-1 bg-[#EF4444]/50 rounded-t-sm h-3" />
                    <div className="w-1 bg-[#EF4444]/70 rounded-t-sm h-5" />
                    <div className="w-1 bg-[#EF4444]/30 rounded-t-sm h-2" />
                    <div className="w-1 bg-[#EF4444]/80 rounded-t-sm h-4" />
                  </div>
                </div>
              </div>

              {/* Chart & Donut Middle Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.72fr_1.28fr] gap-6">
                {/* Revenue Intelligence Line Chart */}
                <div className="bg-white dark:bg-zinc-900 border border-[#EBDCC8]/60 dark:border-zinc-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                  <div className="flex justify-between items-start pb-4">
                    <div>
                      <h3 className="text-sm font-black text-[#5C5043] dark:text-white uppercase tracking-tight">Revenue Intelligence</h3>
                      <span className="text-[10px] text-[#88765C]/80 dark:text-zinc-400 block mt-0.5">Comparative analysis of cash flow vs projections</span>
                    </div>
                    <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-wider text-[#88765C]/80 dark:text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-0.5 bg-[#5C5043]" /> ACTUAL
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-0.5 border-t border-dashed border-[#C6A87D]" /> PROJECTED
                      </span>
                    </div>
                  </div>

                  <div className="w-full overflow-x-auto select-none mt-2">
                    <svg className="w-full min-w-[420px]" viewBox={`0 0 ${chartWidth} ${chartHeight}`} fill="none">
                      {/* Grid Lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                        const y = paddingY + ratio * usableHeight;
                        const labelValue = Math.round(maxVal - (ratio * maxVal));
                        return (
                          <g key={`grid-${i}`}>
                            <line x1={paddingX} y1={y} x2={chartWidth - paddingX} y2={y} stroke="#EBDCC8" strokeWidth="0.5" strokeOpacity="0.4" />
                            <text x={paddingX - 10} y={y + 3} textAnchor="end" className="text-[8px] font-mono fill-[#88765C]/70">
                              {labelValue >= 1000 ? `${(labelValue / 1000).toFixed(0)}k` : labelValue}
                            </text>
                          </g>
                        );
                      })}

                      {/* Line paths */}
                      <path d={pathActual} fill="none" stroke="#5C5043" strokeWidth="2" strokeLinecap="round" />
                      <path d={pathProjected} fill="none" stroke="#C6A87D" strokeWidth="1.8" strokeDasharray="3 3" strokeLinecap="round" />

                      {/* Dot indicators */}
                      {pointsActual.map((pts, i) => (
                        <circle key={`act-dot-${i}`} cx={pts.x} cy={pts.y} r="3" fill="#5C5043" stroke="#fff" strokeWidth="1" />
                      ))}

                      {/* Bottom months labels */}
                      {records.map((r, i) => {
                        const x = paddingX + (i / (records.length - 1)) * usableWidth;
                        return (
                          <text key={`lbl-chart-${i}`} x={x} y={chartHeight - 4} textAnchor="middle" className="text-[9px] font-black fill-[#88765C]/80 font-mono">{r.label}</text>
                        );
                      })}
                    </svg>
                  </div>
                </div>

                {/* Donut Chart: Revenue Segments */}
                <div className="bg-white dark:bg-zinc-900 border border-[#EBDCC8]/60 dark:border-zinc-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-black text-[#5C5043] dark:text-white uppercase tracking-tight">Revenue Segments</h3>
                  </div>

                  <div className="flex flex-col items-center justify-center py-4 relative">
                    <svg className="w-36 h-36" viewBox="0 0 200 200">
                      {/* Grey Base background track */}
                      <circle cx="100" cy="100" r="70" fill="none" stroke="#F1EDE6" strokeWidth="18" />
                      
                      {/* Corporate Sales (68%) */}
                      <circle 
                        cx="100" 
                        cy="100" 
                        r="70" 
                        fill="none" 
                        stroke="#5c5043" 
                        strokeWidth="18" 
                        strokeDasharray="299 440" 
                        strokeDashoffset="0" 
                        strokeLinecap="round" 
                        className="transform -rotate-90 origin-center" 
                      />
                      
                      {/* Direct Retail (12%) */}
                      <circle 
                        cx="100" 
                        cy="100" 
                        r="70" 
                        fill="none" 
                        stroke="#c6a87d" 
                        strokeWidth="18" 
                        strokeDasharray="53 440" 
                        strokeDashoffset="-299" 
                        strokeLinecap="round" 
                        className="transform -rotate-90 origin-center" 
                      />

                      {/* Consultancy (20%) */}
                      <circle 
                        cx="100" 
                        cy="100" 
                        r="70" 
                        fill="none" 
                        stroke="#d1c7bd" 
                        strokeWidth="18" 
                        strokeDasharray="88 440" 
                        strokeDashoffset="-352" 
                        strokeLinecap="round" 
                        className="transform -rotate-90 origin-center" 
                      />

                      {/* Total inside circle */}
                      <text x="100" y="98" textAnchor="middle" className="text-xl font-black fill-[#5C5043] dark:fill-white">
                        ₹ {(((totalBilled + totalOutstanding) || 640000) / 100000).toFixed(1)}L
                      </text>
                      <text x="100" y="116" textAnchor="middle" className="text-[9px] font-black uppercase tracking-wider fill-[#88765C]/80">
                        TOTAL
                      </text>
                    </svg>
                  </div>

                  {/* Legend list */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-[#88765C]/90 dark:text-zinc-400 mt-2 px-2">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#5c5043]" /> Corporate Sales
                      </span>
                      <span className="font-extrabold text-[#5C5043] dark:text-white">68%</span>
                    </div>
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#c6a87d]" /> Direct Retail
                      </span>
                      <span className="font-extrabold text-[#5C5043] dark:text-white">12%</span>
                    </div>
                    <div className="flex items-center justify-between gap-1.5 col-span-2 border-t border-[#EBDCC8]/40 pt-1.5">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#d1c7bd]" /> Consultancy
                      </span>
                      <span className="font-extrabold text-[#5C5043] dark:text-white">20%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Records Table & Compliance Protocol Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.72fr_1.28fr] gap-6">
                {/* Recent Billing Table */}
                <div className="bg-white dark:bg-zinc-900 border border-[#EBDCC8]/60 dark:border-zinc-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                  <div className="flex justify-between items-center pb-4 border-b border-[#EBDCC8]/45 dark:border-zinc-800">
                    <h3 className="text-sm font-black text-[#5C5043] dark:text-white uppercase tracking-tight">Recent Billing Records</h3>
                    <button 
                      onClick={() => setActiveTab('invoices')}
                      className="text-[10px] font-black text-[#88765C] hover:text-[#5C5043] uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                    >
                      View All Records →
                    </button>
                  </div>

                  <div className="w-full overflow-x-auto mt-3">
                    {invoices.length === 0 ? (
                      <div className="py-12 text-center">
                        <p className="text-xs text-[#88765C]/80 font-medium">Generate your first invoice to view records here!</p>
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="text-[10px] font-black uppercase text-[#88765C]/60 tracking-wider border-b border-[#EBDCC8]/30">
                            <th className="py-2.5 font-black">INV ID</th>
                            <th className="py-2.5 font-black">CLIENT NAME</th>
                            <th className="py-2.5 font-black">DUE DATE</th>
                            <th className="py-2.5 font-black">AMOUNT</th>
                            <th className="py-2.5 font-black">STATUS</th>
                            <th className="py-2.5"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoices.slice(0, 3).map(inv => (
                            <tr key={inv.id} className="border-b border-[#EBDCC8]/20 hover:bg-[#FAF8F5]/50 dark:hover:bg-zinc-850/40">
                              <td className="py-3 font-extrabold text-[#5C5043] dark:text-white">{inv.invoiceNumber}</td>
                              <td className="py-3 font-bold text-[#88765C] dark:text-zinc-300 truncate max-w-[120px]">{inv.clientName}</td>
                              <td className="py-3 font-medium text-[#88765C]/80 dark:text-zinc-400 font-sans">{inv.dueDate || inv.date}</td>
                              <td className="py-3 font-extrabold font-mono text-[#5C5043] dark:text-white">{currencySymbol}{inv.grandTotal.toLocaleString()}</td>
                              <td className="py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${getStatusColor(inv.status)}`}>
                                  {inv.status}
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                <button 
                                  onClick={() => setActivePreviewInvoice(inv)}
                                  className="text-[#88765C] hover:text-[#5C5043] p-1 cursor-pointer"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Dark Card: Billing Protocol */}
                <div className="bg-[#23201D] text-[#FAF8F5] rounded-2xl p-6 shadow-md flex flex-col justify-between h-full min-h-[250px]">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#EADFCF]">
                      <Info className="w-4.5 h-4.5 text-[#C6A87D]" />
                      <span>Billing Protocol</span>
                    </div>
                    
                    <div className="space-y-3 pt-2">
                      <div className="flex items-start gap-2.5 text-xs">
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="font-semibold text-[#EADFCF]/90">Ensure GSTR-1 compliance before EOM.</span>
                      </div>
                      <div className="flex items-start gap-2.5 text-xs">
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="font-semibold text-[#EADFCF]/90">Validate HSN codes for industrial goods.</span>
                      </div>
                      <div className="flex items-start gap-2.5 text-xs">
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="font-semibold text-[#EADFCF]/90">Maintain Net-30 payment intervals.</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <button 
                      onClick={() => setActiveTab('learn')}
                      className="w-full py-2.5 bg-[#2E2A27] border border-[#524A44] hover:bg-[#3E3834] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer"
                    >
                      View Compliance Docs
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

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

              {/* Security Controls */}
              <div className="mt-6 border-t border-slate-50 dark:border-slate-850 pt-6 text-left">
                <h3 className="text-xs font-black text-slate-805 uppercase tracking-widest mb-3">Security Locks & Access Control</h3>
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-extrabold text-slate-500 block">PIN Passcode Lock</span>
                    <span className="text-[11px] text-slate-405 mt-0.5 block">Requires a secure 4-digit PIN code on app refresh</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleSecurity('pin')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isPinLockEnabled 
                        ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm' 
                        : 'bg-slate-205 dark:bg-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {isPinLockEnabled ? 'Disable PIN' : 'Enable PIN'}
                  </button>
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
      <div className={`fixed inset-0 z-[60] md:hidden transition-opacity duration-300 ${isMobileDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {/* Backdrop screen */}
        <div 
          onClick={() => setIsMobileDrawerOpen(false)}
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        />
        {/* Menu Drawer panel */}
        <div className={`absolute top-0 left-0 w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full p-5 shadow-2xl flex flex-col z-10 border-r border-slate-100 dark:border-slate-850 overflow-y-auto transform transition-transform duration-300 ease-in-out ${isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 dark:border-slate-800/60">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">Menu</h3>
            <button
              onClick={() => setIsMobileDrawerOpen(false)}
              className="w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 transition-colors cursor-pointer touch-action-manipulation active:scale-95"
              aria-label="Close menu drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {renderNavMenuContent(true)}
        </div>
      </div>

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
                const resolvedTemplate = (() => {
                  const templateId = activePreviewInvoice.selectedCustomTemplateId || localStorage.getItem('makbills_global_default_template');
                  const savedCustom = localStorage.getItem('makbills_custom_templates');
                  if (savedCustom) {
                    try {
                      const parsed = JSON.parse(savedCustom);
                      const match = parsed.find((t: any) => t.id === templateId);
                      if (match) return match;
                    } catch (e) {}
                  }
                  const systemMatch = TEMPLATE_PRESETS.find(t => t.id === templateId);
                  if (systemMatch) return systemMatch;
                  return TEMPLATE_PRESETS[0];
                })();

                const previewScale = 0.78;
                return (
                  <div className="w-full bg-slate-100/50 p-2 sm:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-x-auto flex justify-center no-scrollbar">
                    <div style={{ width: `${794 * previewScale}px`, height: `${1123 * previewScale}px` }} className="shrink-0 relative">
                      <div 
                        className="shadow-xl bg-white origin-top-left absolute top-0 left-0" 
                        style={{ 
                          width: '794px',
                          minHeight: '1123px',
                          transform: `scale(${previewScale})`,
                        }}
                      >
                        <LivePreview 
                          template={resolvedTemplate}
                          invoiceData={activePreviewInvoice}
                          businessProfile={profile}
                          currencySymbol={profile.currencySymbol || (profile.currency === 'INR' ? '₹' : (profile.currency === 'USD' ? '$' : (profile.currency || '₹')))}
                          isInteractive={false}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

                            {/* Action Toolbar buttons */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-md">
                <span className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider text-center">Share & Instant Dispatch Tools</span>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={async () => {
                      await exportInvoicePDFAsync(activePreviewInvoice, profile);
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
                    onClick={async () => {
                      await exportInvoicePDFAsync(activePreviewInvoice, profile);
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
                <label htmlFor="cl_fname" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Client Full Name *</label>
                <input
                  id="cl_fname"
                  required
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-none touch-action-manipulation"
                />
              </div>

              <div>
                <label htmlFor="cl_comp" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Company Name</label>
                <input
                  id="cl_comp"
                  type="text"
                  value={clientCompany}
                  onChange={(e) => setClientCompany(e.target.value)}
                  placeholder="e.g. Marvelous Widgets Ltd"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-none touch-action-manipulation"
                />
              </div>

              <div>
                <label htmlFor="cl_em" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Client Email Address</label>
                <input
                  id="cl_em"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="e.g. billing@widgets.com"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-none touch-action-manipulation"
                />
              </div>

              <div>
                <label htmlFor="cl_ph" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Client Phone number</label>
                <input
                  id="cl_ph"
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="e.g. +1 (555) 019-2834"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-none touch-action-manipulation"
                />
              </div>

              <div>
                <label htmlFor="cl_ad" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Billing Address</label>
                <textarea
                  id="cl_ad"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="e.g. Building 10, Redwood Ave, CA"
                  rows={2}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-none resize-none touch-action-manipulation"
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
                <label htmlFor="exp_cat" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Expense Category</label>
                <select
                  id="exp_cat"
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-none touch-action-manipulation"
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
                    className="w-full px-3.5 py-2 mt-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-none touch-action-manipulation"
                    required
                  />
                )}
              </div>

              <div>
                <label htmlFor="exp_amt" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Overhead Cost Amount ({currencySymbol}) *</label>
                <input
                  id="exp_amt"
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-none font-mono touch-action-manipulation"
                />
              </div>

              <div>
                <label htmlFor="exp_dt" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Expenditure Date *</label>
                <input
                  id="exp_dt"
                  required
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-none touch-action-manipulation"
                />
              </div>

              <div>
                <label htmlFor="exp_desc" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Expenditure Description</label>
                <textarea
                  id="exp_desc"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  placeholder="e.g. AWS Multi-Region Node Cloud charges"
                  rows={2}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-none resize-none touch-action-manipulation"
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
