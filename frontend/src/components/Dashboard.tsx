import React, { useState, useEffect, useMemo } from 'react';
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
  ArrowLeft,
  MessageSquare,
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
  ChevronDown,
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
  FileSpreadsheet,
  Percent,
  MapPin,
  Edit2, 
  ExternalLink, 
  Share2, 
  Link as LinkIcon, 
  Unlock, 
  Eye, 
  Building2, 
  HelpCircle, 
  GripVertical, 
  AlertTriangle 
} from 'lucide-react';
import { useConfirm } from './ConfirmContext';
import { Invoice, BusinessProfile, PresetItem, InvoiceStatus, ClientProfile, Expense } from '../types';
import { BUSINESS_TEMPLATES } from '../lib/presets';
import { exportInvoicePDFAsync, exportCollectiveReportPDF } from '../lib/pdfExporter';
import TemplateManager from './TemplateManager';
import { emitNotification } from '../lib/notifications';
import { TEMPLATE_PRESETS, getDefaultTemplatePreset } from '../lib/templatePresets';
import { LivePreview } from './TemplateBuilder/LivePreview';
import SettingsPage from './SettingsPage';
import SupportPage from './SupportPage';
import SupportChatPage from './SupportChatPage';

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
  const { confirm } = useConfirm();
  // Navigation tabs: 'dashboard' | 'profile' | 'learn' | 'invoices' | 'clients' | 'reports' | 'master_vendor' ...
  const [localActiveTab, setLocalActiveTab] = useState<string>('dashboard');
  const activeTab = propActiveTab !== undefined ? propActiveTab : localActiveTab;
  const setActiveTab = onTabChange !== undefined ? onTabChange : setLocalActiveTab;
  const [draftsSection, setDraftsSection] = useState<'all' | 'invoice' | 'proforma' | 'debit_note' | 'credit_note' | 'quote'>('all');
  
  // Custom scroll recovery behavior to guarantee the dashboard opens from the top instead of stays scrolled to the bottom on sign-in
  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);
  const [dashPreviewScale, setDashPreviewScale] = useState(0.78);
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        const fitScale = Math.max(0.35, Math.min(0.78, (window.innerWidth - 32) / 794));
        setDashPreviewScale(fitScale);
      } else {
        setDashPreviewScale(0.78);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isDesktopSidebarExpanded, setIsDesktopSidebarExpanded] = useState(true);
  const [isMasterExpanded, setIsMasterExpanded] = useState(true);
  const [isCatalogExpanded, setIsCatalogExpanded] = useState(true);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  
  // App Notifications Global State
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifCategoryTab, setNotifCategoryTab] = useState<'all' | 'billing' | 'system' | 'alerts'>('all');

  const getNotifCategory = (notif: any): 'billing' | 'system' | 'alerts' => {
    const t = (notif.title || '').toLowerCase();
    // Alerts first — type always wins over content keywords
    if (
      notif.type === 'error' || notif.type === 'warning' ||
      t.includes('error') || t.includes('failed') || t.includes('validation') ||
      t.includes('alert') || t.includes('invalid')
    ) {
      return 'alerts';
    }
    const m = (notif.message || '').toLowerCase();
    if (
      t.includes('bill') || m.includes('bill') ||
      t.includes('invoice') || m.includes('invoice') ||
      t.includes('draft') || m.includes('draft') ||
      t.includes('pdf') || m.includes('pdf') ||
      t.includes('payment') || m.includes('payment') ||
      t.includes('proforma') || m.includes('proforma') ||
      t.includes('credit note') || m.includes('credit note') ||
      t.includes('debit note') || m.includes('debit note') ||
      t.includes('quote') || m.includes('quote') ||
      t.includes('word document') || m.includes('word document') ||
      t.includes('bulk pdfs') || m.includes('bulk pdfs') ||
      t.includes('excel csv') || m.includes('excel csv')
    ) {
      return 'billing';
    }
    return 'system';
  };

  const [notifications, setNotifications] = useState<any[]>(() => {
    const cached = localStorage.getItem('makbills_notifications');
    if (cached) {
      try { return JSON.parse(cached); } catch(e) {}
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('makbills_notifications', JSON.stringify(notifications));
  }, [notifications]);

  interface ActiveToast {
    id: string;
    title: string;
    message: string;
    type: 'success' | 'info' | 'warning' | 'error';
    actionLabel?: string;
    actionTab?: string;
    timestamp: string;
  }

  const [activeToasts, setActiveToasts] = useState<ActiveToast[]>([]);
  const [exitingToastIds, setExitingToastIds] = useState<Set<string>>(new Set());

  // Smoothly animate-out a toast, then remove it from DOM after animation ends
  const dismissToast = (id: string) => {
    setExitingToastIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      setActiveToasts(prev => prev.filter(t => t.id !== id));
      setExitingToastIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }, 400); // matches toastSlideOut duration (0.38s + tiny buffer)
  };

  useEffect(() => {
    const handleNotification = (e: any) => {
      const { title, message, type } = e.detail;
      const notifId = Date.now().toString() + Math.random().toString().slice(2, 6);
      const newNotif = {
        id: notifId,
        title,
        message,
        type: type || 'info',
        timestamp: new Date().toISOString(),
        read: false
      };
      setNotifications(prev => [newNotif, ...prev]);

      let actionLabel: string | undefined = undefined;
      let actionTab: string | undefined = undefined;

      const lowerTitle = (title || '').toLowerCase();

      // Only add navigation for notifications that lead to a genuinely useful page
      if (
        lowerTitle.includes('invoice created') || lowerTitle.includes('invoice updated') ||
        lowerTitle.includes('proforma') || lowerTitle.includes('credit note') ||
        lowerTitle.includes('debit note') || lowerTitle.includes('quote created') ||
        lowerTitle.includes('quote updated') || lowerTitle.includes('pdf downloaded') ||
        lowerTitle.includes('ledger pdf') || lowerTitle.includes('excel csv') ||
        lowerTitle.includes('bulk pdfs') || lowerTitle.includes('word document') ||
        lowerTitle.includes('draft saved')
      ) {
        // Invoice Ledger — all document/export actions
        actionLabel = 'View Ledger';
        actionTab = 'invoices';
      } else if (lowerTitle.includes('default template set')) {
        // Template manager — only when a default template is set (navigates to a different page)
        actionLabel = 'View Templates';
        actionTab = 'invoice_templates';
      } else if (lowerTitle.includes('profile') || lowerTitle.includes('preference') || lowerTitle.includes('setting') || lowerTitle.includes('pin') || lowerTitle.includes('subscription')) {
        // Settings page
        actionLabel = 'View Settings';
        actionTab = 'settings';
      } else if (lowerTitle.includes('bulk upload complete')) {
        // Bulk upload: infer the correct registry tab from the message body
        const lowerMsg = (message || '').toLowerCase();
        if (lowerMsg.includes('client database')) { actionLabel = 'Client Database'; actionTab = 'master_vendor'; }
        else if (lowerMsg.includes('hsn registry')) { actionLabel = 'HSN Registry'; actionTab = 'master_hsn'; }
        else if (lowerMsg.includes('transport database')) { actionLabel = 'Transport Database'; actionTab = 'master_transport'; }
        else if (lowerMsg.includes('material catalog')) { actionLabel = 'Material Catalog'; actionTab = 'catalog_material'; }
        else if (lowerMsg.includes('product category')) { actionLabel = 'Product Category'; actionTab = 'catalog_category'; }
        // If context unclear, no navigation
      }
      // No navigation for: Template Downloaded (CSV file), individual registry CRUD (already on page),
      // Validation Errors, Draft Restored, GL Accounts, Download Failed

      const toastItem: ActiveToast = {
        id: notifId,
        title,
        message,
        type: type || 'info',
        actionLabel,
        actionTab,
        timestamp: new Date().toISOString()
      };

      setActiveToasts(prev => [toastItem, ...prev].slice(0, 3));

      // Auto-dismiss: trigger exit animation at 5.6s, remove DOM at 6s
      setTimeout(() => {
        setExitingToastIds(prev => new Set(prev).add(notifId));
      }, 5600);
      setTimeout(() => {
        setActiveToasts(prev => prev.filter(t => t.id !== notifId));
        setExitingToastIds(prev => { const s = new Set(prev); s.delete(notifId); return s; });
      }, 6050);
    };
    window.addEventListener('mak_notification', handleNotification);
    return () => window.removeEventListener('mak_notification', handleNotification);
  }, []);

  const [hoveredDashboardChartIndex, setHoveredDashboardChartIndex] = useState<number | null>(null);
  const [hoveredReportsChartIndex1, setHoveredReportsChartIndex1] = useState<number | null>(null);
  const [hoveredReportsChartIndex2, setHoveredReportsChartIndex2] = useState<number | null>(null);
  const [dashboardChartRange, setDashboardChartRange] = useState<'7d' | '1m' | '3m' | '6m' | '1y' | 'all'>('6m');
  const [reportsChartRange, setReportsChartRange] = useState<'7d' | '1m' | '3m' | '6m' | '1y' | 'all'>('6m');
  const [showAllExpenses, setShowAllExpenses] = useState(false);
  
  useEffect(() => {
    if (!isProfileDropdownOpen && !isNotificationsOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isProfileDropdownOpen && !target.closest('#profile-dropdown-container') && !target.closest('#profile-dropdown-container-other')) {
        setIsProfileDropdownOpen(false);
      }
      if (isNotificationsOpen && !target.closest('#notifications-dropdown-container')) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isProfileDropdownOpen, isNotificationsOpen]);

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

    const tabLabels: Record<string, string> = {
      master_vendor: 'Client Database',
      master_transport: 'Transport Database',
      master_hsn: 'HSN Registry',
      master_gl: 'GL Accounts',
      catalog_material: 'Material Catalog',
      catalog_category: 'Product Category',
      catalog_sub_category: 'Sub-Category',
      catalog_mapping: 'GL Mapping',
      catalog_packing_unit: 'Packing Units',
      catalog_measurement_unit: 'UOM Registry',
    };

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

    // Emit notification
    const label = tabLabels[activeTab] || 'Registry';
    const itemName = item.name || item.code || item.vehicleNo || 'Record';
    emitNotification(
      exists ? `${label} Updated` : `${label} Record Added`,
      exists
        ? `"${itemName}" has been updated in the ${label}.`
        : `"${itemName}" has been added to the ${label}.`,
      exists ? 'success' : 'info'
    );
  };

  const handleDeleteMasterItem = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Record',
      message: 'Are you sure you want to permanently delete this record? This action cannot be undone.',
      confirmText: 'Delete'
    });
    if (!confirmed) return;

    let list: any[] = [];
    let key = '';
    let setter: any = null;

    const tabLabels: Record<string, string> = {
      master_vendor: 'Client Database',
      master_transport: 'Transport Database',
      master_hsn: 'HSN Registry',
      master_gl: 'GL Accounts',
      catalog_material: 'Material Catalog',
      catalog_category: 'Product Category',
      catalog_sub_category: 'Sub-Category',
      catalog_mapping: 'GL Mapping',
      catalog_packing_unit: 'Packing Units',
      catalog_measurement_unit: 'UOM Registry',
    };

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

    const deletedItem = list.find(i => i.id === id);
    const updated = list.filter(i => i.id !== id);
    setter(updated);
    localStorage.setItem(key, JSON.stringify(updated));

    // Emit notification for deletion
    const label = tabLabels[activeTab] || 'Registry';
    const itemName = deletedItem?.name || deletedItem?.code || deletedItem?.vehicleNo || 'Record';
    emitNotification(
      `${label} Record Removed`,
      `"${itemName}" has been permanently deleted from the ${label}.`,
      'warning'
    );
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
      return `w-full px-3 py-2 rounded-xl text-left text-xs font-bold transition-all duration-300 flex items-center justify-between cursor-pointer group ${
        isActive
          ? 'bg-white text-[#4A3C2F] dark:bg-zinc-900/90 dark:text-white shadow-[0_2px_12px_rgba(136,118,92,0.06)] border border-[#e2e8f0]/60 dark:border-zinc-800/80 font-black relative overflow-hidden'
          : 'text-[#0f172a] hover:text-[#4A3C2F] dark:text-zinc-300 hover:bg-white/50 dark:hover:bg-zinc-800/40 border border-transparent'
      }`;
    };

    const iconWrapper = (isActive: boolean, colorClass: string) => 
      `flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${
        isActive 
          ? `${colorClass} shadow-sm ring-1 ring-black/5 dark:ring-white/5` 
          : 'bg-transparent text-[#0f172a] group-hover:bg-white/80 dark:group-hover:bg-zinc-800 group-hover:text-[#4A3C2F]'
      }`;

    return (
      <div className="flex flex-col h-full space-y-3 text-sans select-none">
        
        {/* QUICK BILL ACTIONS */}
        <div className="px-1">
          <button
            onClick={() => {
              onOpenInvoiceEditor(null);
              if (isMobileView) setIsMobileDrawerOpen(false);
            }}
            className="group relative w-full flex items-center justify-start gap-3 px-2 py-2 bg-[#059669] hover:bg-[#047857] text-white rounded-[14px] font-bold text-[13px] shadow-[0_4px_12px_rgba(5,150,105,0.25)] hover:shadow-[0_6px_16px_rgba(5,150,105,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] transition-all duration-200 border border-[#047857]/50"
          >
            <div className="w-8 h-8 rounded-[10px] bg-white/20 flex items-center justify-center shrink-0 group-hover:bg-white/30 group-hover:scale-105 transition-all duration-300 shadow-sm">
              <Zap className="w-4 h-4 fill-white drop-shadow-sm" />
            </div>
            <span className="tracking-wide pr-2 text-center flex-1 -ml-6">Quick Bill</span>
          </button>
        </div>

        {/* SETTINGS MENU */}
        <div className="space-y-1">
          <span className="text-[9px] uppercase font-extrabold tracking-widest text-[#64748b]/50 dark:text-zinc-500 block px-2 pb-1">Settings Menu</span>
          
          <button onClick={() => handleTabClick('dashboard')} className={navItemClass('dashboard')}>
            <div className="flex items-center gap-2.5">
              <div className={iconWrapper(activeTab === 'dashboard', 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400')}><BarChart3 className="w-3.5 h-3.5" /></div>
              <span>Billing Dashboard</span>
            </div>
          </button>

          <button onClick={() => handleTabClick('learn')} className={navItemClass('learn')}>
            <div className="flex items-center gap-2.5">
              <div className={iconWrapper(activeTab === 'learn', 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400')}><BookOpen className="w-3.5 h-3.5" /></div>
              <span>Learn MakInvoices</span>
            </div>
          </button>

          <button onClick={() => handleTabClick('invoice_templates')} className={navItemClass('invoice_templates')}>
            <div className="flex items-center gap-2.5">
              <div className={iconWrapper(activeTab === 'invoice_templates', 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400')}><Layout className="w-3.5 h-3.5" /></div>
              <span>Invoice Template</span>
            </div>
          </button>

          <button onClick={() => handleTabClick('invoices')} className={navItemClass('invoices')}>
            <div className="flex items-center gap-2.5">
              <div className={iconWrapper(activeTab === 'invoices', 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400')}><FileText className="w-3.5 h-3.5" /></div>
              <span>Invoices Ledger</span>
            </div>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'invoices' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300' : 'bg-[#f8fafc] text-[#64748b] group-hover:bg-white'}`}>
              {invoices.length}
            </span>
          </button>



          <button onClick={() => handleTabClick('clients')} className={navItemClass('clients')}>
            <div className="flex items-center gap-2.5">
              <div className={iconWrapper(activeTab === 'clients', 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400')}><Users2 className="w-3.5 h-3.5" /></div>
              <span>Billed Clients</span>
            </div>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'clients' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300' : 'bg-[#f8fafc] text-[#64748b] group-hover:bg-white'}`}>
              {clients.length}
            </span>
          </button>

          <button onClick={() => handleTabClick('reports')} className={navItemClass('reports')}>
            <div className="flex items-center gap-2.5">
              <div className={iconWrapper(activeTab === 'reports', 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400')}><TrendingUp className="w-3.5 h-3.5" /></div>
              <span>Accounting Summary</span>
            </div>
          </button>
        </div>

        {/* MASTER REGISTRY */}
        <div className="space-y-1">
          <span className="text-[9px] uppercase font-extrabold tracking-widest text-[#64748b]/50 dark:text-zinc-500 block px-2 pb-1 mt-2">Master Registry</span>

          <button onClick={() => handleTabClick('master_vendor')} className={navItemClass('master_vendor')}>
            <div className="flex items-center gap-2.5">
              <div className={iconWrapper(activeTab === 'master_vendor', 'bg-[#f8fafc] text-[#64748b] dark:bg-zinc-800 dark:text-zinc-300')}><Users2 className="w-3.5 h-3.5" /></div>
              <span>Client Database</span>
            </div>
          </button>

          <button onClick={() => handleTabClick('master_hsn')} className={navItemClass('master_hsn')}>
            <div className="flex items-center gap-2.5">
              <div className={iconWrapper(activeTab === 'master_hsn', 'bg-[#f8fafc] text-[#64748b] dark:bg-zinc-800 dark:text-zinc-300')}><FileSpreadsheet className="w-3.5 h-3.5" /></div>
              <span>HSN Registry</span>
            </div>
          </button>

          <button onClick={() => handleTabClick('master_transport')} className={navItemClass('master_transport')}>
            <div className="flex items-center gap-2.5">
              <div className={iconWrapper(activeTab === 'master_transport', 'bg-[#f8fafc] text-[#64748b] dark:bg-zinc-800 dark:text-zinc-300')}><Truck className="w-3.5 h-3.5" /></div>
              <span>Transport Database</span>
            </div>
          </button>

          <button onClick={() => handleTabClick('catalog_category')} className={navItemClass('catalog_category')}>
            <div className="flex items-center gap-2.5">
              <div className={iconWrapper(activeTab === 'catalog_category', 'bg-[#f8fafc] text-[#64748b] dark:bg-zinc-800 dark:text-zinc-300')}><Tag className="w-3.5 h-3.5" /></div>
              <span>Product Category</span>
            </div>
          </button>

          <button onClick={() => handleTabClick('catalog_material')} className={`${navItemClass('catalog_material')} mb-3 sm:mb-4`}>
            <div className="flex items-center gap-2.5">
              <div className={iconWrapper(activeTab === 'catalog_material', 'bg-[#f8fafc] text-[#64748b] dark:bg-zinc-800 dark:text-zinc-300')}><Wrench className="w-3.5 h-3.5" /></div>
              <span>Material Catalog</span>
            </div>
          </button>
        </div>
      </div>
    );
  };

  const getCategoryBadgeStyle = (category?: string) => {
    if (!category) return 'bg-[#FAF8F5] dark:bg-zinc-950 text-[#64748b] border border-[#e2e8f0]/30 dark:border-zinc-800';
    const val = category.toLowerCase().trim();
    if (val.includes('vip') || val.includes('premium')) {
      return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30';
    }
    if (val.includes('regular') || val.includes('standard') || val.includes('active')) {
      return 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200/50 dark:border-sky-900/30';
    }
    if (val.includes('distributor') || val.includes('partner') || val.includes('wholesale')) {
      return 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/30';
    }
    if (val.includes('retail') || val.includes('new') || val.includes('prospect')) {
      return 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30';
    }
    return 'bg-[#FCFAF7] dark:bg-zinc-950 text-[#64748b] border border-[#e2e8f0]/60 dark:border-zinc-800';
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
        const vendorSignatures = new Set(vendors.map(v => 
          `${v.name?.trim().toLowerCase()}|${(v.email||'').trim().toLowerCase()}|${(v.phone||'').trim()}|${(v.address||'').trim()}`
        ));
        const additionalClients = clients
          .filter(c => !vendorSignatures.has(`${c.name.trim().toLowerCase()}|${(c.email||'').trim().toLowerCase()}|${(c.phone||'').trim()}|${(c.address||'').trim()}`))
          .map(c => ({
            id: c.id,
            name: c.name,
            company: c.companyName,
            email: c.email,
            phone: c.phone,
            address: c.address,
            category: 'Billed Client'
          }));
        list = [...vendors, ...additionalClients];
        columns = [
          { header: 'Client Name', key: 'name' },
          { header: 'Company Name', key: 'company' },
          { header: 'Email Address', key: 'email' },
          { header: 'Phone Number', key: 'phone' },
          { header: 'Category / Tag', key: 'category' }
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
        description = 'Registry of transport companies and logistics details captured from invoices';
        list = transports;
        columns = [
          { header: 'Vehicle No', key: 'vehicleNo' },
          { header: 'Driver Mobile', key: 'phone' },
          { header: 'E-Way Bill No', key: 'ewayBillNo' },
          { header: 'Transport Name', key: 'name' },
          { header: 'Station', key: 'station' },
          { header: 'GR/RR No.', key: 'grRrNo' }
        ];
        fields = [
          { label: 'Vehicle No', key: 'vehicleNo', type: 'text' },
          { label: 'Driver Mobile', key: 'phone', type: 'text' },
          { label: 'E-Way Bill No', key: 'ewayBillNo', type: 'text' },
          { label: 'Transport Name', key: 'name', type: 'text' },
          { label: 'Station', key: 'station', type: 'text' },
          { label: 'GR/RR No.', key: 'grRrNo', type: 'text' }
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

    // Per-tab accent palette — subtle, professional, not gimmicky
    const tabAccent: Record<string, {
      topBar: string;
      iconBg: string;
      iconBgDark: string;
      iconColor: string;
      iconColorDark: string;
      badgeBg: string;
      badgeText: string;
      theadBg: string;
      theadBgDark: string;
      avatarBg: string;
      avatarBgDark: string;
      avatarIcon: string;
      avatarIconDark: string;
    }> = {
      master_vendor: {
        topBar:        'bg-indigo-500',
        iconBg:        'bg-indigo-600',
        iconBgDark:    'dark:bg-indigo-700',
        iconColor:     'text-indigo-50',
        iconColorDark: 'dark:text-indigo-100',
        badgeBg:       'bg-indigo-50 border-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900/40',
        badgeText:     'text-indigo-600 dark:text-indigo-400',
        theadBg:       'bg-indigo-50/40 dark:bg-indigo-950/20',
        theadBgDark:   '',
        avatarBg:      'bg-indigo-50 border-indigo-100/70',
        avatarBgDark:  'dark:bg-indigo-950/30 dark:border-indigo-900/40',
        avatarIcon:    'text-indigo-500',
        avatarIconDark:'dark:text-indigo-400',
      },
      master_transport: {
        topBar:        'bg-teal-500',
        iconBg:        'bg-teal-600',
        iconBgDark:    'dark:bg-teal-700',
        iconColor:     'text-teal-50',
        iconColorDark: 'dark:text-teal-100',
        badgeBg:       'bg-teal-50 border-teal-100 dark:bg-teal-950/40 dark:border-teal-900/40',
        badgeText:     'text-teal-600 dark:text-teal-400',
        theadBg:       'bg-teal-50/40 dark:bg-teal-950/20',
        theadBgDark:   '',
        avatarBg:      'bg-teal-50 border-teal-100/70',
        avatarBgDark:  'dark:bg-teal-950/30 dark:border-teal-900/40',
        avatarIcon:    'text-teal-500',
        avatarIconDark:'dark:text-teal-400',
      },
      master_hsn: {
        topBar:        'bg-amber-400',
        iconBg:        'bg-amber-500',
        iconBgDark:    'dark:bg-amber-600',
        iconColor:     'text-amber-50',
        iconColorDark: 'dark:text-amber-100',
        badgeBg:       'bg-amber-50 border-amber-100 dark:bg-amber-950/40 dark:border-amber-900/40',
        badgeText:     'text-amber-600 dark:text-amber-400',
        theadBg:       'bg-amber-50/40 dark:bg-amber-950/20',
        theadBgDark:   '',
        avatarBg:      'bg-amber-50 border-amber-100/70',
        avatarBgDark:  'dark:bg-amber-950/30 dark:border-amber-900/40',
        avatarIcon:    'text-amber-500',
        avatarIconDark:'dark:text-amber-400',
      },
      catalog_material: {
        topBar:        'bg-rose-400',
        iconBg:        'bg-rose-500',
        iconBgDark:    'dark:bg-rose-600',
        iconColor:     'text-rose-50',
        iconColorDark: 'dark:text-rose-100',
        badgeBg:       'bg-rose-50 border-rose-100 dark:bg-rose-950/40 dark:border-rose-900/40',
        badgeText:     'text-rose-600 dark:text-rose-400',
        theadBg:       'bg-rose-50/40 dark:bg-rose-950/20',
        theadBgDark:   '',
        avatarBg:      'bg-rose-50 border-rose-100/70',
        avatarBgDark:  'dark:bg-rose-950/30 dark:border-rose-900/40',
        avatarIcon:    'text-rose-500',
        avatarIconDark:'dark:text-rose-400',
      },
      catalog_category: {
        topBar:        'bg-violet-400',
        iconBg:        'bg-violet-500',
        iconBgDark:    'dark:bg-violet-700',
        iconColor:     'text-violet-50',
        iconColorDark: 'dark:text-violet-100',
        badgeBg:       'bg-violet-50 border-violet-100 dark:bg-violet-950/40 dark:border-violet-900/40',
        badgeText:     'text-violet-600 dark:text-violet-400',
        theadBg:       'bg-violet-50/40 dark:bg-violet-950/20',
        theadBgDark:   '',
        avatarBg:      'bg-violet-50 border-violet-100/70',
        avatarBgDark:  'dark:bg-violet-950/30 dark:border-violet-900/40',
        avatarIcon:    'text-violet-500',
        avatarIconDark:'dark:text-violet-400',
      },
    };
    const accent = tabAccent[activeTab] || null;

    const filteredList = list.filter(item => {
      const searchStr = searchTerm.toLowerCase();
      return Object.values(item).some(val => String(val).toLowerCase().includes(searchStr));
    });

    const CLIENT_PAGE_SIZE = 8;
    const totalPages = Math.max(1, Math.ceil(filteredList.length / CLIENT_PAGE_SIZE));
    const safePage = Math.min(clientPage, totalPages - 1);
    const pagedList = filteredList.slice(safePage * CLIENT_PAGE_SIZE, (safePage + 1) * CLIENT_PAGE_SIZE);

    return (
      <div className="space-y-5 text-sans animate-in fade-in duration-205">

        {/* ── Header Banner ── */}
        <div className="bg-white dark:bg-zinc-900 border border-[#e2e8f0]/80 dark:border-zinc-800 rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 6px rgba(110,96,80,0.07)' }}>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between p-4 sm:p-5 md:p-6">
            {/* Left: Icon + title + description */}
            <div className="flex items-start gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${accent ? `${accent.iconBg} ${accent.iconBgDark}` : 'bg-[#0f172a]'}`} style={{ boxShadow: accent ? '0 3px 10px rgba(0,0,0,0.18)' : '0 3px 10px rgba(110,96,80,0.32)' }}>
                <Database className={`w-5 h-5 ${accent ? `${accent.iconColor} ${accent.iconColorDark}` : 'text-[#F0E8DC]'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg md:text-xl font-black text-[#3D2C1E] dark:text-white uppercase tracking-tight leading-none">
                    {title}
                  </h2>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${accent ? `${accent.badgeBg} ${accent.badgeText}` : 'bg-[#F0E8DC] dark:bg-zinc-800 text-[#64748b] dark:text-zinc-400 border-[#e2e8f0]/70 dark:border-zinc-700'}`}>
                    {list.length} {list.length === 1 ? 'Record' : 'Records'}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-[#64748b]/75 dark:text-zinc-500 max-w-md leading-relaxed">
                  {description}
                </p>
              </div>
            </div>

            {/* Right: Action buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {(activeTab === 'master_vendor' || activeTab === 'master_transport' || activeTab === 'master_hsn' || activeTab === 'catalog_material' || activeTab === 'catalog_category') && (
                <>
                  {/* Download Template */}
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
                      const csvContent = [headers.join(','), sampleRow.map(v => `"${v.replace(/"/g, '""')}"`).join(',')].join('\n');
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement('a');
                      const url = URL.createObjectURL(blob);
                      link.setAttribute('href', url);
                      link.setAttribute('download', filename);
                      link.style.visibility = 'hidden';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      // Notify download
                      const tabLabelDl: Record<string, string> = {
                        master_vendor: 'Client Database', master_transport: 'Transport Database',
                        master_hsn: 'HSN Registry', catalog_material: 'Material Catalog', catalog_category: 'Product Category'
                      };
                      emitNotification('Template Downloaded', `${tabLabelDl[activeTab] || 'Registry'} CSV template saved — "${filename}".`, 'success');
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[#F0E8DC] hover:bg-[#E8DDD0] dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[#0f172a] dark:text-zinc-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer border border-[#e2e8f0]/70 dark:border-zinc-700 hover:-translate-y-px active:scale-[0.98]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Template</span>
                  </button>

                  {/* Bulk Upload */}
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
                              if (parsedData.length === 0) { alert('No valid items found in file.'); return; }
                              const headers = parsedData[0].map((h: any) => String(h || '').trim().replace(/^"|"$/g, ''));
                              const rows = parsedData.slice(1);
                              const finalItems = rows.filter(r => r && r.length > 0).map((row, index) => {
                                const rowData: any = {};
                                headers.forEach((header: string, headerIdx: number) => { if (header) rowData[header] = row[headerIdx] !== undefined ? row[headerIdx] : ''; });
                                const id = `bulk_${activeTab}_${Date.now()}_${index}`;
                                if (activeTab === 'master_vendor') return { id, name: rowData.name || rowData['Client Name'] || 'Unnamed Client', company: rowData.company || rowData['Company Name'] || '', category: rowData.category || rowData['Category / Tag'] || rowData['Category'] || '', email: rowData.email || rowData['Email Address'] || '', phone: rowData.phone || rowData['Phone Number'] || '', address: rowData.address || rowData['Billing Address'] || '' };
                                if (activeTab === 'master_transport') return { id, name: rowData.name || rowData['Transport Name'] || 'Unnamed Carrier', phone: rowData.phone || rowData['Driver Mobile'] || '', vehicleNo: rowData.vehicleNo || rowData['Vehicle No'] || '', ewayBillNo: rowData.ewayBillNo || rowData['E-Way Bill No'] || '', station: rowData.station || rowData['Station'] || '', grRrNo: rowData.grRrNo || rowData['GR/RR No.'] || '' };
                                if (activeTab === 'master_hsn') return { id, code: rowData.code || rowData['HSN/SAC Code'] || '000000', description: rowData.description || rowData['Description'] || '', gstRate: Number(rowData.gstRate || rowData['Tax Rate (%)'] || 18) };
                                if (activeTab === 'catalog_material') return { id, name: rowData.name || rowData['Item Name'] || 'Unnamed Material', rate: Number(rowData.rate || rowData['Standard Rate / Unit Price'] || 0), hsn: rowData.hsn || rowData['HSN/SAC Code'] || '', uom: rowData.uom || rowData['Unit of Measure (UOM)'] || 'pcs', category: rowData.category || rowData['Category'] || '' };
                                if (activeTab === 'catalog_category') return { id, name: rowData.name || rowData['Category Name'] || 'Unnamed Category', description: rowData.description || rowData['Description'] || '' };
                                return null;
                              }).filter(Boolean);
                              if (finalItems.length === 0) { alert('No valid items found in file.'); return; }
                              let currentList: any[] = [], storageKey = '', setterFn: any = null;
                              if (activeTab === 'master_vendor') { currentList = vendors; storageKey = 'makbills_masters_vendors'; setterFn = setVendors; }
                              else if (activeTab === 'master_transport') { currentList = transports; storageKey = 'makbills_masters_transports'; setterFn = setTransports; }
                              else if (activeTab === 'master_hsn') { currentList = hsnCodes; storageKey = 'makbills_masters_hsn'; setterFn = setHsnCodes; }
                              else if (activeTab === 'catalog_material') { currentList = materials; storageKey = 'makbills_masters_materials'; setterFn = setMaterials; }
                              else if (activeTab === 'catalog_category') { currentList = categories; storageKey = 'makbills_masters_categories'; setterFn = setCategories; }
                              if (setterFn) { const updatedList = [...finalItems, ...currentList]; setterFn(updatedList); localStorage.setItem(storageKey, JSON.stringify(updatedList)); const tabLabelUp: Record<string, string> = { master_vendor: 'Client Database', master_transport: 'Transport Database', master_hsn: 'HSN Registry', catalog_material: 'Material Catalog', catalog_category: 'Product Category' }; emitNotification('Bulk Upload Complete', `${finalItems.length} records imported into ${tabLabelUp[activeTab] || 'Registry'} successfully.`, 'info'); }
                            } catch (err: any) { alert('Error parsing file: ' + err.message); }
                          };
                          reader.readAsBinaryString(file);
                        }
                      };
                      input.click();
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[#F0E8DC] hover:bg-[#E8DDD0] dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[#0f172a] dark:text-zinc-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer border border-[#e2e8f0]/70 dark:border-zinc-700 hover:-translate-y-px active:scale-[0.98]"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Bulk Upload</span>
                  </button>
                </>
              )}

              {/* Add Registry Record — always visible */}
              <button
                onClick={() => {
                  setEditingMasterItem({ id: 'm_item_' + Date.now() });
                  setIsMasterModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#3D2C1E] hover:bg-[#5C5043] dark:bg-[#0f172a] dark:hover:bg-[#5C5043] text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer hover:-translate-y-px active:scale-[0.98]"
                style={{ boxShadow: '0 3px 10px rgba(61,44,30,0.30)' }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Registry Record</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Search Bar ── */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#64748b]/60 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={`Search through ${list.length} ${list.length === 1 ? 'directory' : 'directories'} live...`}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setClientPage(0); }}
            className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-zinc-900 border border-[#e2e8f0]/90 dark:border-zinc-800 rounded-2xl text-sm text-[#0f172a] dark:text-zinc-200 placeholder-[#64748b]/45 focus:outline-none focus:border-[#64748b] dark:focus:border-zinc-600 transition-all"
            style={{ boxShadow: '0 1px 4px rgba(110,96,80,0.06), inset 0 1px 3px rgba(110,96,80,0.04)' }}
          />
        </div>

        {/* ── Table Card ── */}
        <div className="bg-white dark:bg-zinc-900 border border-[#e2e8f0]/80 dark:border-zinc-800 rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 6px rgba(110,96,80,0.07)' }}>
          {filteredList.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#F0E8DC] dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3">
                <Database className="w-5 h-5 text-[#C6A87D] animate-pulse" />
              </div>
              <p className="text-xs font-semibold text-[#64748b]/85 dark:text-zinc-500">No synchronized registry records matching search query</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  {/* Table Head */}
                  <thead>
                    <tr className={`border-b border-[#e2e8f0]/70 dark:border-zinc-800 ${accent ? `${accent.theadBg}` : 'bg-[#FDFAF7] dark:bg-zinc-950/60'}`}>
                      {columns.map((col, idx) => (
                        <th key={idx} className="px-4 py-3 text-[9.5px] font-black uppercase tracking-widest text-[#64748b]/75 dark:text-zinc-500 whitespace-nowrap">
                          {col.header}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-[9.5px] font-black uppercase tracking-widest text-[#64748b]/75 dark:text-zinc-500 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody className="divide-y divide-[#e2e8f0]/50 dark:divide-zinc-800/60">
                    {pagedList.map((item, rowIdx) => (
                      <tr
                        key={item.id}
                        className="group hover:bg-[#FDFAF5]/80 dark:hover:bg-zinc-800/40 transition-colors duration-100"
                      >
                        {columns.map((col, idx2) => {
                          const cellVal = item[col.key];
                          const isFirstCol = idx2 === 0;

                          return (
                            <td key={idx2} className="px-4 py-3.5">
                              {isFirstCol ? (
                                <div className="flex items-center gap-3">
                                  {/* Avatar — per-tab accent color */}
                                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${accent ? `${accent.avatarBg} ${accent.avatarBgDark}` : 'bg-[#F0E8DC] border-[#e2e8f0]/60 dark:bg-zinc-800 dark:border-zinc-700'}`}>
                                    {activeTab === 'master_vendor' && <User className={`w-3.5 h-3.5 ${accent ? `${accent.avatarIcon} ${accent.avatarIconDark}` : 'text-[#64748b] dark:text-zinc-400'}`} />}
                                    {activeTab === 'master_transport' && <Truck className={`w-3.5 h-3.5 ${accent ? `${accent.avatarIcon} ${accent.avatarIconDark}` : 'text-[#64748b] dark:text-zinc-400'}`} />}
                                    {activeTab === 'master_hsn' && <FileSpreadsheet className={`w-3.5 h-3.5 ${accent ? `${accent.avatarIcon} ${accent.avatarIconDark}` : 'text-[#64748b] dark:text-zinc-400'}`} />}
                                    {activeTab === 'catalog_material' && <Wrench className={`w-3.5 h-3.5 ${accent ? `${accent.avatarIcon} ${accent.avatarIconDark}` : 'text-[#64748b] dark:text-zinc-400'}`} />}
                                    {activeTab === 'catalog_category' && <Tag className={`w-3.5 h-3.5 ${accent ? `${accent.avatarIcon} ${accent.avatarIconDark}` : 'text-[#64748b] dark:text-zinc-400'}`} />}
                                  </div>
                                  <span className="text-xs font-extrabold uppercase tracking-tight text-[#3D2C1E] dark:text-white">
                                    {String(cellVal || '')}
                                  </span>
                                </div>
                              ) : col.key === 'rate' ? (
                                <span className="text-xs font-mono font-semibold text-[#0f172a] dark:text-zinc-200">
                                  {currencySymbol}{parseFloat(cellVal || 0).toLocaleString()}
                                </span>
                              ) : col.key === 'category' ? (
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${getCategoryBadgeStyle(cellVal)}`}>
                                  {cellVal || 'General'}
                                </span>
                              ) : col.key === 'email' ? (
                                <span className="text-[11px] text-sky-600 dark:text-sky-400 font-medium font-mono lowercase">
                                  {cellVal || '—'}
                                </span>
                              ) : col.key === 'phone' ? (
                                <span className="text-[11px] text-[#64748b]/90 dark:text-zinc-400 font-mono">
                                  {cellVal || '—'}
                                </span>
                              ) : (
                                <span className="text-[11px] text-[#0f172a] dark:text-zinc-300 font-medium">
                                  {String(cellVal || '—')}
                                </span>
                              )}
                            </td>
                          );
                        })}

                        {/* Actions */}
                        <td className="px-4 py-3.5">
                          <div className="flex justify-end items-center gap-0.5">
                            <button
                              onClick={() => { setEditingMasterItem(item); setIsMasterModalOpen(true); }}
                              className="p-2 text-[#64748b]/70 hover:text-[#0f172a] dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-[#F0E8DC] dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                              aria-label="Edit record"
                            >
                              <PenTool className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMasterItem(item.id)}
                              className="p-2 text-rose-400/70 hover:text-rose-500 dark:text-rose-500/60 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all cursor-pointer opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
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

              {/* Mobile Card View */}
              <div className="md:hidden flex flex-col divide-y divide-[#e2e8f0]/50 dark:divide-zinc-800/60">
                {pagedList.map((item, rowIdx) => (
                  <div key={item.id} className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className={`w-9 h-9 mt-0.5 rounded-lg border flex items-center justify-center shrink-0 ${accent ? `${accent.avatarBg} ${accent.avatarBgDark}` : 'bg-[#F0E8DC] border-[#e2e8f0]/60 dark:bg-zinc-800 dark:border-zinc-700'}`}>
                          {activeTab === 'master_vendor' && <User className={`w-4 h-4 ${accent ? `${accent.avatarIcon} ${accent.avatarIconDark}` : 'text-[#64748b] dark:text-zinc-400'}`} />}
                          {activeTab === 'master_transport' && <Truck className={`w-4 h-4 ${accent ? `${accent.avatarIcon} ${accent.avatarIconDark}` : 'text-[#64748b] dark:text-zinc-400'}`} />}
                          {activeTab === 'master_hsn' && <FileSpreadsheet className={`w-4 h-4 ${accent ? `${accent.avatarIcon} ${accent.avatarIconDark}` : 'text-[#64748b] dark:text-zinc-400'}`} />}
                          {activeTab === 'catalog_material' && <Wrench className={`w-4 h-4 ${accent ? `${accent.avatarIcon} ${accent.avatarIconDark}` : 'text-[#64748b] dark:text-zinc-400'}`} />}
                          {activeTab === 'catalog_category' && <Tag className={`w-4 h-4 ${accent ? `${accent.avatarIcon} ${accent.avatarIconDark}` : 'text-[#64748b] dark:text-zinc-400'}`} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-black uppercase tracking-tight text-[#3D2C1E] dark:text-white block truncate">
                            {String(item[columns[0].key] || '')}
                          </span>
                          <span className="text-[10px] text-[#64748b]/70 font-bold uppercase tracking-wider block mt-0.5">
                            {columns[0].header}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => { setEditingMasterItem(item); setIsMasterModalOpen(true); }}
                          className="p-2 text-[#64748b]/70 hover:text-[#0f172a] dark:text-zinc-500 dark:hover:text-zinc-200 bg-[#F0E8DC]/50 hover:bg-[#F0E8DC] dark:bg-zinc-800/50 dark:hover:bg-zinc-800 rounded-lg transition-all"
                        >
                          <PenTool className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMasterItem(item.id)}
                          className="p-2 text-rose-400/70 hover:text-rose-500 bg-rose-50/50 hover:bg-rose-50 dark:bg-rose-950/20 dark:hover:bg-rose-950/30 rounded-lg transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Remaining Columns */}
                    {columns.length > 1 && (
                      <div className="grid grid-cols-1 gap-2.5 mt-2 bg-[#FCFAF7] dark:bg-zinc-950/40 border border-[#e2e8f0]/40 dark:border-zinc-800 p-3 rounded-xl">
                        {columns.slice(1).map((col, idx2) => {
                          const cellVal = item[col.key];
                          return (
                            <div key={idx2} className="flex justify-between items-start gap-4">
                              <span className="text-[10px] text-[#64748b]/80 dark:text-zinc-400 font-bold uppercase tracking-wider shrink-0 mt-0.5">{col.header}</span>
                              <span className="text-xs text-[#0f172a] dark:text-zinc-200 font-medium text-right break-words overflow-hidden">
                                {col.key === 'rate' ? (
                                  <span className="font-mono font-bold">
                                    {currencySymbol}{parseFloat(cellVal || 0).toLocaleString()}
                                  </span>
                                ) : col.key === 'category' ? (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${getCategoryBadgeStyle(cellVal)}`}>
                                    {cellVal || 'General'}
                                  </span>
                                ) : col.key === 'email' ? (
                                  <span className="text-sky-600 dark:text-sky-400 font-medium font-mono lowercase break-all">
                                    {cellVal || '—'}
                                  </span>
                                ) : col.key === 'phone' ? (
                                  <span className="text-[#64748b]/90 dark:text-zinc-400 font-mono">
                                    {cellVal || '—'}
                                  </span>
                                ) : (
                                  <span>{String(cellVal || '—')}</span>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[#e2e8f0]/40 dark:border-zinc-800 bg-[#FDFAF7]/60 dark:bg-zinc-950/30">
                <span className="text-[10px] text-[#64748b]/75 dark:text-zinc-500 font-medium">
                  Showing {Math.min(safePage * CLIENT_PAGE_SIZE + 1, filteredList.length)}–{Math.min((safePage + 1) * CLIENT_PAGE_SIZE, filteredList.length)} of {filteredList.length} {activeTab === 'master_vendor' ? 'client' : activeTab === 'master_transport' ? 'transport' : 'registry'} records
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setClientPage(p => Math.max(0, p - 1))}
                    disabled={safePage === 0}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#e2e8f0]/60 dark:border-zinc-700 text-[#64748b] dark:text-zinc-400 hover:bg-[#F0E8DC] dark:hover:bg-zinc-800 disabled:opacity-35 disabled:cursor-not-allowed transition-all cursor-pointer text-xs"
                    aria-label="Previous page"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => setClientPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={safePage >= totalPages - 1}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#e2e8f0]/60 dark:border-zinc-700 text-[#64748b] dark:text-zinc-400 hover:bg-[#F0E8DC] dark:hover:bg-zinc-800 disabled:opacity-35 disabled:cursor-not-allowed transition-all cursor-pointer text-xs"
                    aria-label="Next page"
                  >
                    ›
                  </button>
                </div>
              </div>
            </>
          )}
        </div>


        {/* ── Master Registry Form Modal ── */}
        {isMasterModalOpen && editingMasterItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/45 backdrop-blur-3xs">
            <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl flex flex-col max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex justify-between items-center p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <h3 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-tight">Record Editor</h3>
                <button
                  onClick={() => { setIsMasterModalOpen(false); setEditingMasterItem(null); }}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-4 sm:p-5 overflow-y-auto">
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSaveMasterItem(editingMasterItem); }}
                  className="space-y-3 text-left"
                >
                  {fields.map((f, idx3) => (
                    <div key={idx3}>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">{f.label}</label>
                      {f.type === 'select' ? (
                        <select
                          value={editingMasterItem[f.key] || ''}
                          onChange={(e) => setEditingMasterItem({ ...editingMasterItem, [f.key]: e.target.value })}
                          className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-none"
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
                          className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-none"
                          required
                        />
                      )}
                    </div>
                  ))}
                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setIsMasterModalOpen(false); setEditingMasterItem(null); }}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-500 rounded-lg text-[9px] font-bold cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-[#0f172a] hover:bg-[#5C5043] text-white rounded-lg text-[9px] font-bold cursor-pointer transition-all shadow-md shadow-[#0f172a]/20"
                    >
                      Commit Record
                    </button>
                  </div>
                </form>
              </div>
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
    const allFilteredIds: string[] = filteredInvoices.map((inv: any) => inv.id);
    const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id: string) => selectedInvoiceIds.includes(id));
    if (isAllSelected) {
      setSelectedInvoiceIds((prev: string[]) => prev.filter((id: string) => !allFilteredIds.includes(id)));
    } else {
      setSelectedInvoiceIds((prev: string[]) => {
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
    emitNotification('Excel CSV Exported', `Selected ${selected.length} bills exported to CSV spreadsheet.`, 'success');
  };

  const handleBulkExportPDF = async () => {
    const selected = invoices.filter(inv => selectedInvoiceIds.includes(inv.id));
    if (selected.length === 0) return;
    
    // Sequentially download each document safely
    for (let i = 0; i < selected.length; i++) {
        await exportInvoicePDFAsync(selected[i], profile);
        await new Promise(r => setTimeout(r, 250));
    }
    emitNotification('Bulk PDFs Exported', `Selected ${selected.length} bills exported to PDF.`, 'success');
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activePreviewInvoice, setActivePreviewInvoice] = useState<Invoice | null>(null);
  const [templateUpdateTick, setTemplateUpdateTick] = useState(0);

  useEffect(() => {
    const handleTemplateUpdate = () => {
      setTemplateUpdateTick(prev => prev + 1);
    };
    window.addEventListener('custom_templates_local_update', handleTemplateUpdate);
    window.addEventListener('custom_templates_updated_from_cloud', handleTemplateUpdate);
    const storageHandler = (e: StorageEvent) => {
      if (e.key === 'makbills_custom_templates' || e.key === 'makbills_global_default_template') {
        handleTemplateUpdate();
      }
    };
    window.addEventListener('storage', storageHandler);
    return () => {
      window.removeEventListener('custom_templates_local_update', handleTemplateUpdate);
      window.removeEventListener('custom_templates_updated_from_cloud', handleTemplateUpdate);
      window.removeEventListener('storage', storageHandler);
    };
  }, []);
  const [previewDataUri, setPreviewDataUri] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const [isClientEditorOpen, setIsClientEditorOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientProfile | null>(null);
  const [clientPage, setClientPage] = useState(0);

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
  const [ledgerSection, setLedgerSection] = useState<'invoice' | 'proforma' | 'credit_note' | 'debit_note' | 'quote'>('invoice');

  const handleSwitchLedgerSection = (section: 'invoice' | 'proforma' | 'credit_note' | 'debit_note' | 'quote') => {
    setLedgerSection(section);
    setStatusFilter('all');
    if (typeof window !== 'undefined') {
      const hashSlug = section === 'invoice' ? 'invoices' : section === 'proforma' ? 'proforma' : section === 'credit_note' ? 'credit-notes' : section === 'debit_note' ? 'debit-notes' : 'quotes';
      window.history.replaceState(null, '', `#${hashSlug}`);
    }
  };

  useEffect(() => {
    const syncRouteFromLocation = () => {
      if (typeof window === 'undefined') return;
      const hash = (window.location.hash || '').toLowerCase().replace('#', '');
      const searchParams = new URLSearchParams(window.location.search);
      const paramType = (searchParams.get('section') || searchParams.get('type') || '').toLowerCase();
      const target = hash || paramType;

      if (target.includes('proforma')) {
        setLedgerSection('proforma');
      } else if (target.includes('credit')) {
        setLedgerSection('credit_note');
      } else if (target.includes('debit')) {
        setLedgerSection('debit_note');
      } else if (target.includes('quote') || target.includes('estimate')) {
        setLedgerSection('quote');
      } else if (target.includes('invoice')) {
        setLedgerSection('invoice');
      }
    };

    syncRouteFromLocation();
    window.addEventListener('hashchange', syncRouteFromLocation);
    window.addEventListener('popstate', syncRouteFromLocation);
    return () => {
      window.removeEventListener('hashchange', syncRouteFromLocation);
      window.removeEventListener('popstate', syncRouteFromLocation);
    };
  }, []);

  const currencySymbol = profile.currencySymbol || getCurrencySymbol(profile.currency);

  const getInvoiceDocumentType = (inv: Invoice): 'invoice' | 'proforma' | 'credit_note' | 'debit_note' | 'quote' => {
    const rawType = (inv.invoiceType || '').toLowerCase().trim();
    if (rawType === 'proforma' || rawType === 'proforma_invoice') return 'proforma';
    if (rawType === 'credit_note' || rawType === 'credit') return 'credit_note';
    if (rawType === 'debit_note' || rawType === 'debit') return 'debit_note';
    if (rawType === 'estimate' || rawType === 'quote' || rawType === 'quotation') return 'quote';

    const title = (inv.embeddedTemplate?.config?.header?.invoiceTitle || '').toLowerCase();
    if (title.includes('proforma')) return 'proforma';
    if (title.includes('credit')) return 'credit_note';
    if (title.includes('debit')) return 'debit_note';
    if (title.includes('quote') || title.includes('estimate') || title.includes('quotation')) return 'quote';

    return 'invoice';
  };

  const documentTypeCounts = useMemo(() => {
    const counts = { invoice: 0, proforma: 0, credit_note: 0, debit_note: 0, quote: 0 };
    // Only count non-draft documents in the ledger tabs
    invoices.filter(inv => inv.status !== 'draft').forEach(inv => {
      const docType = getInvoiceDocumentType(inv);
      counts[docType] = (counts[docType] || 0) + 1;
    });
    return counts;
  }, [invoices]);

  const sectionInvoices = useMemo(() => {
    // Exclude drafts from ledger listings — drafts belong exclusively to the Drafts page
    return invoices.filter(inv => inv.status !== 'draft' && getInvoiceDocumentType(inv) === ledgerSection);
  }, [invoices, ledgerSection]);

  // --- STATS ENGINES ---
  const filteredInvoices = sectionInvoices.filter(inv => {
    const matchesSearch = (inv.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (inv.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const totalBilled = sectionInvoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.grandTotal, 0);

  const totalOutstanding = sectionInvoices
    .filter(inv => inv.status === 'pending')
    .reduce((sum, inv) => sum + inv.grandTotal, 0);

  const totalTax = sectionInvoices
    .reduce((sum, inv) => sum + (inv.taxTotal || 0), 0);

  const totalDraft = sectionInvoices
    .filter(inv => inv.status === 'draft')
    .reduce((sum, inv) => sum + inv.grandTotal, 0);

  const handleCreateDocumentForSection = (section: 'invoice' | 'proforma' | 'credit_note' | 'debit_note' | 'quote') => {
    if (section === 'invoice') {
      onOpenInvoiceEditor(null);
      return;
    }
    const today = new Date().toISOString().split('T')[0];

    // Use profile-configured prefixes with fallback defaults
    const prefixMap: Record<string, string> = {
      proforma: (profile.proformaPrefix || 'PRO').toUpperCase(),
      credit_note: (profile.creditNotePrefix || 'CN').toUpperCase(),
      debit_note: (profile.debitNotePrefix || 'DN').toUpperCase(),
      quote: (profile.quotePrefix || 'EST').toUpperCase(),
    };

    // Compute the next sequential number for this document type
    const startingMap: Record<string, number> = {
      proforma: parseInt(profile.startingProformaNumber || '1', 10),
      credit_note: parseInt(profile.startingCreditNoteNumber || '1', 10),
      debit_note: parseInt(profile.startingDebitNoteNumber || '1', 10),
      quote: parseInt(profile.startingQuoteNumber || '1', 10),
    };
    const existingCount = documentTypeCounts[section] || 0;
    const nextNum = (startingMap[section] || 1) + existingCount;
    const paddedNum = String(nextNum).padStart(4, '0');

    const titleMap: Record<string, string> = { proforma: 'PROFORMA INVOICE', credit_note: 'CREDIT NOTE', debit_note: 'DEBIT NOTE', quote: 'QUOTATION / ESTIMATE' };
    const typeMap: Record<string, any> = { proforma: 'proforma', credit_note: 'credit_note', debit_note: 'debit_note', quote: 'estimate' };

    const prefix = prefixMap[section] || 'INV';
    const num = `${prefix}-${paddedNum}`;

    const draftDoc: Invoice = {
      id: `inv_${Date.now()}`,
      userId: 'local',
      invoiceNumber: num,
      date: today,
      dueDate: today,
      clientName: '',
      clientEmail: '',
      clientAddress: '',
      clientPhone: '',
      clientGstin: '',
      clientState: '',
      companyState: profile.state || '',
      items: [
        { id: '1', name: 'Sample Item / Service', quantity: 1, rate: 100, taxPercentage: 18 }
      ],
      subtotal: 100,
      discountType: 'none',
      discountValue: 0,
      discountTotal: 0,
      taxTotal: 18,
      grandTotal: 118,
      notes: 'Thank you for your business!',
      status: 'pending',
      invoiceType: typeMap[section],
      createdAt: today,
      updatedAt: today,
      embeddedTemplate: {
        ...getDefaultTemplatePreset(),
        config: {
          ...getDefaultTemplatePreset().config,
          header: {
            ...getDefaultTemplatePreset().config.header,
            invoiceTitle: titleMap[section]
          }
        }
      }
    };

    onOpenInvoiceEditor(draftDoc);
  };

  const renderDocTypeBadge = (inv: Invoice) => {
    const docType = getInvoiceDocumentType(inv);
    switch (docType) {
      case 'proforma':
        return <span className="bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200/50 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Proforma</span>;
      case 'credit_note':
        return <span className="bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-200/50 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Credit Note</span>;
      case 'debit_note':
        return <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Debit Note</span>;
      case 'quote':
        return <span className="bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border border-teal-200/50 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Quote / Est</span>;
      default:
        return <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Inv</span>;
    }
  };

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
    emitNotification('Word Document Downloaded', `Document #${inv.invoiceNumber} exported as MS Word doc.`, 'success');
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

  const reportedTaxTotal = reportedInvoices
    .reduce((sum, inv) => sum + (inv.taxTotal || 0), 0);

  const getNavbarBreadcrumbs = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return 'Financial Hub / Dashboard';
      case 'invoices':
        return 'Financial Hub / Invoices Ledger';
      case 'drafts':
        return 'Financial Hub / Drafts';
      case 'profile':
        return 'Financial Hub / Creator Profile';
      case 'learn':
        return 'Financial Hub / Learn MakInvoices';
      case 'invoice_templates':
        return 'Financial Hub / Invoice Template';
      case 'clients':
        return 'Financial Hub / Client Database';
      case 'reports':
        return 'Financial Hub / Accounting Summary';
      case 'master_vendor':
        return 'Master Registry / Vendor Database';
      case 'master_transport':
        return 'Master Registry / Transport Database';
      case 'master_hsn':
        return 'Master Registry / HSN Registry';
      case 'catalog_material':
        return 'Master Registry / Material Catalog';
      case 'catalog_category':
        return 'Master Registry / Product Category';
      case 'settings':
        return 'Workspace / App Settings';
      case 'support':
        return 'Workspace / Help & Support';
      default:
        return 'Financial Hub / Workspace';
    }
  };

  const totalReportedExpenses = reportedExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="h-dvh w-full max-w-full overflow-hidden bg-[#FCFAF7] dark:bg-zinc-950 text-slate-800 dark:text-slate-100 transition-colors duration-200 text-sans">
      
      {/* Dynamic Main App Bar Header */}
      <header className="sticky top-0 z-30 w-full bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs transition-all duration-200">
        {/* Left Side: Logo + Mobile Menu Trigger + Breadcrumb */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.location.href = '/'}>
            <img src="/logo.svg" alt="MakInvoices Logo" className="w-10 h-10 object-contain drop-shadow-sm shrink-0" />
            <div className="hidden lg:block">
              <span className="text-xl font-black tracking-tight text-slate-800 dark:text-white block leading-none">
                Mak<span className="text-sky-400">Invoices</span>
              </span>
            </div>
          </div>
          <div className="w-px h-6 bg-slate-200 dark:bg-zinc-800 hidden sm:block"></div>
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            aria-label="Toggle structural sidebar menu drawer"
            className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 dark:text-white/70 dark:hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden sm:flex items-center gap-3.5">
            <div className="w-[32px] h-[32px] rounded-full bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-[13px] shadow-sm">
              {profile.name ? profile.name.charAt(0).toUpperCase() : 'M'}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[16px] font-bold text-slate-800 dark:text-white tracking-wide">{profile.name || 'MAKINVOICE'}</span>
              <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-zinc-700"></div>
              <span className="text-[14px] text-slate-500 dark:text-zinc-400 font-medium tracking-wide">{getNavbarBreadcrumbs(activeTab)}</span>
            </div>
          </div>
        </div>

        {/* Center: Mobile Company Name */}
        <div className="flex sm:hidden items-center justify-center absolute left-1/2 -translate-x-1/2 pointer-events-none">
           <span className="font-bold text-slate-800 dark:text-white tracking-wide text-[16px]">{profile.name || 'MAKINVOICE'}</span>
        </div>

        {/* Right Side: Notifications + Profile Avatar */}
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="relative" id="notifications-dropdown-container">
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 hover:text-slate-800 dark:text-white/70 dark:hover:text-white transition-colors cursor-pointer border border-transparent dark:hover:border-white/10"
            >
              <Bell className="w-[18px] h-[18px]" />
              {notifications.some(n => !n.read) && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-zinc-950" />
              )}
            </button>
            
            {isNotificationsOpen && (
              <div className="absolute right-[-60px] sm:right-0 mt-3 w-[320px] sm:w-[390px] rounded-2xl bg-white dark:bg-zinc-900 border border-[#e2e8f0]/80 dark:border-zinc-800 shadow-[0_8px_30px_rgba(136,118,92,0.12)] py-2 z-50 text-sans animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                  <span className="font-bold text-[13px] text-slate-800 dark:text-white">Notifications</span>
                  <div className="flex gap-2.5 items-center">
                    <button 
                      onClick={() => setNotifications(prev => prev.map(n => ({...n, read: true})))}
                      className="text-[11px] font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 cursor-pointer transition-colors"
                    >
                      Mark all read
                    </button>
                    <div className="w-[1px] h-3 bg-slate-200 dark:bg-zinc-700"></div>
                    <button 
                      onClick={() => setNotifications([])}
                      className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 cursor-pointer transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Bifurcated Section Category Tabs */}
                <div className="px-3 py-2 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/60 flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold select-none scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setNotifCategoryTab('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap font-black ${notifCategoryTab === 'all'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'}`}
                  >
                    <span className={notifCategoryTab === 'all' ? 'text-white font-extrabold' : 'text-slate-700 dark:text-zinc-300 font-bold'}>
                      All ({notifications.length})
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotifCategoryTab('billing')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap font-black ${notifCategoryTab === 'billing'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'}`}
                  >
                    <span className={notifCategoryTab === 'billing' ? 'text-white font-extrabold' : ''}>
                      Billing ({notifications.filter(n => getNotifCategory(n) === 'billing').length})
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotifCategoryTab('system')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap font-black ${notifCategoryTab === 'system'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'}`}
                  >
                    <span className={notifCategoryTab === 'system' ? 'text-white font-extrabold' : ''}>
                      System ({notifications.filter(n => getNotifCategory(n) === 'system').length})
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotifCategoryTab('alerts')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap font-black ${notifCategoryTab === 'alerts'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'}`}
                  >
                    <span className={notifCategoryTab === 'alerts' ? 'text-white font-extrabold' : ''}>
                      Alerts ({notifications.filter(n => getNotifCategory(n) === 'alerts').length})
                    </span>
                  </button>
                </div>
                
                <div className="max-h-[360px] overflow-y-auto">
                  {(() => {
                    const displayed = notifCategoryTab === 'all'
                      ? notifications
                      : notifications.filter(n => getNotifCategory(n) === notifCategoryTab);

                    if (displayed.length === 0) {
                      return (
                        <div className="px-4 py-10 text-center flex flex-col items-center justify-center">
                          <div className="w-12 h-12 bg-slate-50 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mb-3">
                            <Bell className="w-5 h-5 text-slate-300 dark:text-zinc-600" />
                          </div>
                          <p className="text-[13px] text-slate-500 dark:text-zinc-400 font-medium">You're all caught up!</p>
                          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">No notifications in this section.</p>
                        </div>
                      );
                    }

                    return displayed.map(notif => {
                      const cat = getNotifCategory(notif);
                      return (
                        <div 
                          key={notif.id} 
                          className={`px-4 py-3 border-b border-slate-50 dark:border-zinc-800/30 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors flex gap-3 cursor-pointer ${!notif.read ? 'bg-sky-50/40 dark:bg-sky-900/10' : ''}`}
                          onClick={() => setNotifications(prev => prev.map(n => n.id === notif.id ? {...n, read: true} : n))}
                        >
                          <div className="mt-0.5 shrink-0">
                            {notif.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                            {notif.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-500" />}
                            {notif.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-500" />}
                            {notif.type === 'info' && <Info className="w-4 h-4 text-sky-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <p className={`text-[12.5px] truncate leading-tight ${notif.read ? 'font-semibold text-slate-600 dark:text-zinc-300' : 'font-bold text-slate-800 dark:text-white'}`}>
                                {notif.title}
                              </p>
                              {cat === 'billing' && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 shrink-0">
                                  Billing
                                </span>
                              )}
                              {cat === 'system' && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60 shrink-0">
                                  System
                                </span>
                              )}
                              {cat === 'alerts' && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60 shrink-0">
                                  Alert
                                </span>
                              )}
                            </div>
                            <p className="text-[11.5px] text-slate-500 dark:text-zinc-400 line-clamp-2 leading-snug">
                              {notif.message}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 font-medium flex items-center gap-1.5">
                              {new Date(notif.timestamp).toLocaleString(undefined, {
                                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                              })}
                            </p>
                          </div>
                          {!notif.read && (
                            <div className="w-2 h-2 rounded-full bg-sky-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(14,165,233,0.5)]" />
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>
          
          <div className="w-px h-6 bg-slate-200 dark:bg-zinc-800 hidden sm:block"></div>

          <div className="relative" id="profile-dropdown-container">
            <button 
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 border border-transparent transition-all cursor-pointer group"
            >
              <div className="w-[32px] h-[32px] rounded-full bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[12px] font-bold shadow-sm">
                {profile.name ? profile.name.slice(0, 2).toUpperCase() : 'MK'}
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:text-white/50 dark:group-hover:text-white/90 hidden sm:block transition-colors" />
            </button>

            {isProfileDropdownOpen && (
              <div className="absolute right-0 mt-3 w-52 rounded-2xl bg-white dark:bg-zinc-900 border border-[#e2e8f0]/80 dark:border-zinc-800 shadow-[0_8px_30px_rgba(136,118,92,0.12)] py-2 z-50 text-sans animate-in fade-in slide-in-from-top-2 duration-200">
                <button 
                  onClick={() => {
                    setActiveTab('profile');
                    setIsProfileDropdownOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-[#0f172a] dark:text-zinc-200 hover:bg-[#f8fafc]/60 dark:hover:bg-zinc-850 transition-colors flex items-center gap-2.5 cursor-pointer"
                >
                  <User className="w-4 h-4 text-[#64748b]" />
                  <span>Profile Settings</span>
                </button>

                <button 
                  onClick={() => {
                    setActiveTab('settings');
                    setIsProfileDropdownOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-[#0f172a] dark:text-zinc-200 hover:bg-[#f8fafc]/60 dark:hover:bg-zinc-850 transition-colors flex items-center gap-2.5 cursor-pointer"
                >
                  <Layout className="w-4 h-4 text-[#64748b]" />
                  <span>Preferences</span>
                </button>

                <button 
                  onClick={() => {
                    setActiveTab('support');
                    setIsProfileDropdownOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-[#0f172a] dark:text-zinc-200 hover:bg-[#f8fafc]/60 dark:hover:bg-zinc-850 transition-colors flex items-center gap-2.5 cursor-pointer"
                >
                  <Info className="w-4 h-4 text-[#64748b]" />
                  <span>Help & Support</span>
                </button>

                <div className="my-1.5 border-t border-[#e2e8f0]/50 dark:border-zinc-800/80" />

                <button 
                  onClick={() => {
                    onLogout();
                    setIsProfileDropdownOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-rose-600 dark:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center gap-2.5 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── TOP-RIGHT DYNAMIC SLIDE-IN TOAST NOTIFICATION CONTAINER ── */}
      <div id="top-right-toast-container" className="fixed top-16 sm:top-20 right-3 sm:right-6 z-[99] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-[calc(100vw-24px)] pointer-events-none">
        {activeToasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto relative overflow-hidden p-3.5 sm:p-4 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_16px_50px_rgba(0,0,0,0.65)] border backdrop-blur-xl flex items-start gap-3.5 ${
              exitingToastIds.has(toast.id) ? 'toast-exit' : 'toast-enter'
            } ${
              theme === 'dark'
                ? 'bg-zinc-900/95 text-white border-zinc-800/90'
                : 'bg-white/95 text-[#0f172a] border-[#e2e8f0]/90'
            }`}
          >
            {/* Type Indicator Icon */}
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && (
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
              {toast.type === 'info' && (
                <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200/60 dark:border-sky-800/60 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}
              {toast.type === 'warning' && (
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xs">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              )}
              {toast.type === 'error' && (
                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-800/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-xs">
                  <AlertCircle className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Notification Text Details */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#0f172a] dark:text-white truncate">
                  {toast.title}
                </h4>
                <span className="text-[9px] font-bold font-mono text-[#64748b]/70 dark:text-zinc-400 shrink-0">Just now</span>
              </div>
              <p className="text-[11px] font-medium text-[#475569] dark:text-zinc-300 leading-snug mt-1 break-words">
                {toast.message}
              </p>

              {/* Action Button Navigation */}
              {toast.actionLabel && (
                <button
                  onClick={() => {
                    if (toast.actionTab) setActiveTab(toast.actionTab);
                    dismissToast(toast.id);
                  }}
                  className="mt-2 text-[10px] font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-1 cursor-pointer group"
                >
                  <span>{toast.actionLabel}</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Progress Bar Timer */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-100 dark:bg-zinc-800/60 overflow-hidden">
              <div
                className={`h-full toast-progress-bar ${
                  toast.type === 'success'
                    ? 'bg-emerald-500'
                    : toast.type === 'warning'
                    ? 'bg-amber-500'
                    : toast.type === 'error'
                    ? 'bg-rose-500'
                    : 'bg-sky-500'
                }`}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Dynamic Main Responsive Workspace - Grid layout turns dual-column on desktop */}
      <main className="w-full max-w-[1600px] mx-auto px-2 sm:px-3 lg:px-4 pt-4 md:pt-6 space-y-4 md:space-y-0 md:flex md:gap-6 lg:gap-8 md:items-start overflow-hidden">
        
        {/* DESKTOP BRANDING & CONTROL SIDEBAR - Visible only on md screens and larger */}
        <div className="hidden md:block relative shrink-0">
          <aside className={`flex flex-col bg-white dark:bg-zinc-950 border border-[#e2e8f0]/80 dark:border-zinc-800/80 rounded-[1.75rem] shadow-[0_8px_30px_rgba(136,118,92,0.08)] h-[calc(100vh-110px)] overflow-y-auto overflow-x-hidden transition-all duration-300 ${isDesktopSidebarExpanded ? 'w-[280px] p-5' : 'w-[88px] p-4 items-center [&_span]:hidden [&_.min-w-0]:hidden [&_button]:justify-center [&_button>div]:justify-center [&_.pl-2]:hidden [&_h4]:hidden'}`}>
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
          <div className="space-y-6">
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
              <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-2xl border-l-4 border-l-emerald-400 border border-[#e2e8f0]/60 dark:border-zinc-800 shadow-xs flex flex-row items-center justify-between">
                <div>
                  <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-wider text-[#64748b]/80 block">Settled Funds</span>
                  <span className="text-sm sm:text-base font-black font-mono mt-0.5 sm:mt-1 text-emerald-600 dark:text-emerald-400 block">{currencySymbol}{totalBilled.toLocaleString()}</span>
                </div>
                {/* Micro Sparkline */}
                <div className="flex items-end gap-0.5 h-5 sm:h-6 shrink-0">
                  <span className="w-1 bg-emerald-100 dark:bg-zinc-800 h-2 rounded-t" />
                  <span className="w-1 bg-emerald-200 dark:bg-zinc-800 h-3 rounded-t" />
                  <span className="w-1 bg-emerald-300 dark:bg-zinc-700 h-4 rounded-t" />
                  <span className="w-1 bg-emerald-400 dark:bg-zinc-650 h-3 rounded-t" />
                  <span className="w-1 bg-emerald-500 h-5 rounded-t" />
                </div>
              </div>
              <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-2xl border-l-4 border-l-amber-400 border border-[#e2e8f0]/60 dark:border-zinc-800 shadow-xs flex flex-row items-center justify-between">
                <div>
                  <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-wider text-[#64748b]/80 block">Pending Due</span>
                  <span className="text-sm sm:text-base font-black font-mono mt-0.5 sm:mt-1 text-amber-600 dark:text-amber-400 block">{currencySymbol}{totalOutstanding.toLocaleString()}</span>
                </div>
                {/* Micro Sparkline */}
                <div className="flex items-end gap-0.5 h-5 sm:h-6 shrink-0">
                  <span className="w-1 bg-amber-100 dark:bg-zinc-800 h-4 rounded-t" />
                  <span className="w-1 bg-amber-200 dark:bg-zinc-800 h-2 rounded-t" />
                  <span className="w-1 bg-amber-300 dark:bg-zinc-700 h-3 rounded-t" />
                  <span className="w-1 bg-amber-400 dark:bg-zinc-650 h-5 rounded-t" />
                  <span className="w-1 bg-amber-500 h-3 rounded-t" />
                </div>
              </div>
              <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-2xl border-l-4 border-l-zinc-400 border border-[#e2e8f0]/60 dark:border-zinc-800 shadow-xs flex flex-row items-center justify-between">
                <div>
                  <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-wider text-[#64748b]/80 block">Draft Bills</span>
                  <span className="text-sm sm:text-base font-black font-mono mt-0.5 sm:mt-1 text-[#0f172a] dark:text-zinc-300 block">{currencySymbol}{totalDraft.toLocaleString()}</span>
                </div>
                {/* Micro Sparkline */}
                <div className="flex items-end gap-0.5 h-5 sm:h-6 shrink-0">
                  <span className="w-1 bg-zinc-100 dark:bg-zinc-800 h-2 rounded-t" />
                  <span className="w-1 bg-zinc-200 dark:bg-zinc-800 h-3 rounded-t" />
                  <span className="w-1 bg-zinc-300 dark:bg-zinc-700 h-3 rounded-t" />
                  <span className="w-1 bg-zinc-450 h-2 rounded-t" />
                  <span className="w-1 bg-zinc-500 h-4 rounded-t" />
                </div>
              </div>
            </section>

            {/* Document Type Ledger Tabs Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1 sm:mx-0 sm:px-0 border-b border-[#e2e8f0]/60 dark:border-zinc-800">
              {[
                { id: 'invoice',     label: 'Tax Invoices',       count: documentTypeCounts.invoice,     activeColor: 'border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20', countBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' },
                { id: 'proforma',    label: 'Proforma Invoices', count: documentTypeCounts.proforma,    activeColor: 'border-sky-500 text-sky-700 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/20',             countBg: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300' },
                { id: 'credit_note', label: 'Credit Notes',      count: documentTypeCounts.credit_note, activeColor: 'border-violet-500 text-violet-700 dark:text-violet-400 bg-violet-50/50 dark:bg-violet-950/20', countBg: 'bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-300' },
                { id: 'debit_note',  label: 'Debit Notes',       count: documentTypeCounts.debit_note,  activeColor: 'border-indigo-500 text-indigo-700 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20', countBg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300' },
                { id: 'quote',       label: 'Quotes & Estimates',count: documentTypeCounts.quote,       activeColor: 'border-teal-500 text-teal-700 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20',       countBg: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleSwitchLedgerSection(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer border shrink-0 ${
                    ledgerSection === tab.id
                      ? `${tab.activeColor} border-current shadow-xs`
                      : 'border-transparent text-[#64748b]/80 dark:text-zinc-400 hover:text-[#0f172a] dark:hover:text-zinc-200 hover:bg-[#f8fafc] dark:hover:bg-zinc-800/50'
                  }`}
                >
                  {tab.label}
                  <span className={`px-1.5 py-0.5 sm:px-2 rounded-full text-[8.5px] sm:text-[9px] font-black ${
                    ledgerSection === tab.id
                      ? tab.countBg
                      : 'bg-[#e2e8f0]/60 dark:bg-zinc-800 text-[#64748b] dark:text-zinc-400'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search, Action Header and Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-black text-[#0f172a] dark:text-white uppercase tracking-wider">
                  {ledgerSection === 'proforma' ? 'Proforma Invoices Ledger' : ledgerSection === 'credit_note' ? 'Credit Notes Ledger' : ledgerSection === 'debit_note' ? 'Debit Notes Ledger' : ledgerSection === 'quote' ? 'Quotes & Estimates Ledger' : 'Invoices Ledger'}
                </h2>
                <span className="px-1.5 py-0.5 bg-[#f8fafc] dark:bg-zinc-800 text-[#64748b] dark:text-zinc-400 rounded text-[9px] font-black">{filteredInvoices.length} Documents</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setActiveTab('drafts')}
                  className="flex-1 sm:flex-none justify-center px-3.5 sm:px-4 py-2 sm:py-1.5 bg-white dark:bg-zinc-900 border border-[#e2e8f0] dark:border-zinc-700 hover:bg-[#f8fafc] dark:hover:bg-zinc-800 text-[#0f172a] dark:text-zinc-200 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95 whitespace-nowrap"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Drafts</span>
                </button>
                <button
                  onClick={() => handleCreateDocumentForSection(ledgerSection)}
                  className="flex-1 sm:flex-none justify-center px-3.5 sm:px-4 py-2 sm:py-1.5 bg-gradient-to-r from-[#0f172a] to-[#64748b] hover:from-[#5C5043] hover:to-[#0f172a] text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm shadow-[#64748b]/20 transition-all active:scale-95 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{ledgerSection === 'proforma' ? 'Create Proforma' : ledgerSection === 'credit_note' ? 'Create Credit Note' : ledgerSection === 'debit_note' ? 'Create Debit Note' : ledgerSection === 'quote' ? 'Create Quote' : 'Create Invoice'}</span>
                </button>
              </div>
            </div>

            {/* Search Input and status selection filters */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3 bg-[#FCFAF7]/60 dark:bg-zinc-950/30 p-2.5 sm:p-3 rounded-2xl border border-[#e2e8f0]/40 dark:border-zinc-800">
              <div className="sm:col-span-8 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748b]/60" />
                <input 
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by client or invoice number..."
                  className="w-full pl-8 pr-3 py-1.5 sm:py-2 bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 focus:border-[#64748b] dark:border-zinc-700 rounded-xl text-xs text-[#0f172a] dark:text-white placeholder-[#64748b]/45 focus:outline-none transition-colors"
                />
              </div>
              <div className="sm:col-span-4 flex relative">
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'all')}
                  className="w-full pl-3 pr-7 py-1.5 sm:py-2 bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-700 rounded-xl text-xs font-bold text-[#0f172a] dark:text-zinc-200 focus:outline-none focus:border-[#64748b]/60 cursor-pointer transition-colors"
                >
                  <option value="all">All Statuses</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Invoices Array List representation */}
            <div>
              {/* MOBILE ONLY SMALL SCREENS CARDS VIEW */}
              <div className="space-y-3 md:hidden">
                {filteredInvoices.length === 0 ? (
                  <div className="p-8 sm:p-12 bg-white dark:bg-zinc-900 text-center rounded-2xl text-[#64748b]/60 border border-[#e2e8f0]/60 dark:border-zinc-800">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-[#64748b]/40" />
                    No invoice records matching criteria.
                  </div>
                ) : (
                  filteredInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className={`p-3.5 sm:p-4 bg-white dark:bg-zinc-900 border rounded-2xl flex gap-2.5 sm:gap-3 relative shadow-xs hover:border-[#64748b]/40 transition-all cursor-pointer group ${selectedInvoiceIds.includes(inv.id) ? 'border-amber-400 bg-amber-50/5 dark:bg-amber-950/5' : 'border-[#e2e8f0]/60 dark:border-zinc-800'}`}
                      onClick={() => setActivePreviewInvoice(inv)}
                    >
                      <div className="flex items-center justify-center pl-0.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedInvoiceIds.includes(inv.id)}
                          onChange={(e) => handleToggleSelectInvoice(inv.id, e as any)}
                          className="w-4 h-4 rounded border-[#e2e8f0] text-[#64748b] focus:ring-[#64748b] cursor-pointer"
                        />
                      </div>
                      <div className="flex-1 flex flex-col gap-2">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-black text-sky-600 font-mono tracking-tight">{inv.invoiceNumber}</span>
                              {renderDocTypeBadge(inv)}
                              {inv.recurringSettings?.isRecurring && (
                                <span className="bg-sky-50 dark:bg-sky-950/30 text-sky-600 border border-sky-200/40 text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  🔄 Repeat {inv.recurringSettings.interval}
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs font-black text-[#0f172a] dark:text-white mt-1 uppercase truncate">{inv.clientName || 'Draft Profile'}</h4>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-[#64748b]/80 font-semibold font-mono flex-wrap">
                              <span>Dated {inv.date}</span>
                              <span>•</span>
                              <span className="text-rose-500">Due {inv.dueDate}</span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-black font-mono block text-[#0f172a] dark:text-white">{currencySymbol}{inv.grandTotal.toFixed(2)}</span>
                            <span className={`inline-block px-2 mt-1 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${getStatusColor(inv.status)}`}>
                              {inv.status}
                            </span>
                          </div>
                        </div>

                        {/* Footer list triggers */}
                        <div className="pt-2 border-t border-[#e2e8f0]/30 dark:border-zinc-800 flex items-center justify-between gap-2 text-[10px] text-slate-400" onClick={(e) => e.stopPropagation()}>
                          <span className="flex items-center gap-1 text-[8px] font-mono font-bold tracking-tight text-[#64748b]/60 shrink-0">
                            <span className={`w-1.5 h-1.5 rounded-full ${inv.userId === 'local' ? 'bg-amber-400' : 'bg-sky-400'}`} />
                            {inv.userId === 'local' ? 'On-Device' : 'Cloud'}
                          </span>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={async () => {
                                try {
                                  await exportInvoicePDFAsync(inv, profile, 'save');
                                } catch (err: any) {
                                  alert('Failed to generate PDF: ' + (err.message || err.toString()));
                                }
                              }}
                              className="px-2 py-1 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400 rounded-md text-[9px] font-bold flex items-center gap-0.5 border border-sky-200/50 cursor-pointer active:scale-95"
                            >
                              <FileDown className="w-3 h-3" /> PDF
                            </button>
                            <button
                              onClick={() => handleExportMSWord(inv)}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 text-blue-650 dark:text-blue-400 rounded-md text-[9px] font-bold flex items-center gap-0.5 border border-blue-200/50 cursor-pointer active:scale-95"
                            >
                              Word
                            </button>
                            <button
                              onClick={() => onOpenInvoiceEditor(inv)}
                              className="text-[#64748b] hover:text-[#0f172a] p-1.5 rounded hover:bg-[#FCFAF7] dark:hover:bg-zinc-800 transition-colors cursor-pointer active:scale-95"
                            >
                              <PenTool className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteInvoice(inv.id)}
                              className="text-[#64748b]/60 hover:text-rose-500 p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer active:scale-95"
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
              <div className="hidden md:block bg-white dark:bg-zinc-950 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
                <table className="min-w-full divide-y divide-[#e2e8f0]/40 dark:divide-zinc-800 text-xs">
                  <thead className="bg-[#FCFAF7]/70 dark:bg-zinc-900 font-bold text-[#64748b]/80 dark:text-zinc-400 text-[9px] uppercase tracking-wider text-left">
                    <tr>
                      <th className="px-4 py-3.5 text-center w-10">
                        <input
                          type="checkbox"
                          checked={filteredInvoices.length > 0 && filteredInvoices.every(i => selectedInvoiceIds.includes(i.id))}
                          onChange={handleSelectAllFiltered}
                          className="w-4 h-4 rounded border-[#e2e8f0] text-[#64748b] focus:ring-[#64748b] cursor-pointer"
                          title="Select all invoices"
                        />
                      </th>
                      <th className="px-4 py-3.5">Invoice / Type</th>
                      <th className="px-4 py-3.5">Recipient Client Name</th>
                      <th className="px-4 py-3.5">Billing Terms / Due</th>
                      <th className="px-4 py-3.5 text-right">Sum Valuation</th>
                      <th className="px-4 py-3.5 text-center">Settlement</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e8f0]/30 dark:divide-zinc-800/80 bg-white dark:bg-zinc-950">
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-16 text-center text-[#64748b]/60 font-medium">
                          <FileText className="w-8 h-8 mx-auto mb-2 text-[#64748b]/40" />
                          No invoices matching selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((inv) => (
                        <tr 
                          key={inv.id} 
                          className={`hover:bg-[#FCFAF7]/20 dark:hover:bg-zinc-900/40 cursor-pointer transition-colors ${selectedInvoiceIds.includes(inv.id) ? 'bg-[#FCFAF7]/50 dark:bg-zinc-900/30' : ''}`}
                          onClick={() => setActivePreviewInvoice(inv)}
                        >
                          <td className="px-4 py-3.5 text-center w-10" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedInvoiceIds.includes(inv.id)}
                              onChange={(e) => handleToggleSelectInvoice(inv.id, e as any)}
                              className="w-4 h-4 rounded border-[#e2e8f0] text-[#64748b] focus:ring-[#64748b] cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold font-mono text-sky-600 tracking-tight">{inv.invoiceNumber}</span>
                              {renderDocTypeBadge(inv)}
                              {inv.recurringSettings?.isRecurring && (
                                <span className="text-[10px]" title={`Auto Repeat ${inv.recurringSettings.interval}`}>🔄</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-black text-[#0f172a] dark:text-white uppercase truncate max-w-[150px]">{inv.clientName || 'Draft Profile'}</div>
                            {inv.clientEmail && <span className="text-[9.5px] text-[#64748b]/80 block truncate max-w-[155px] font-mono mt-0.5">{inv.clientEmail}</span>}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-[10px] text-[#64748b]/80 dark:text-zinc-400">
                            <div>Issued: {inv.date}</div>
                            <div className="text-rose-500 font-bold mt-0.5">Due: {inv.dueDate}</div>
                          </td>
                          <td className="px-4 py-3.5 font-black font-mono text-[#0f172a] dark:text-white text-right text-[12px]">
                            {currencySymbol}{inv.grandTotal.toFixed(2)}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${getStatusColor(inv.status)}`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={async () => {
                                  try {
                                    await exportInvoicePDFAsync(inv, profile, 'save');
                                  } catch (err: any) {
                                    alert('Failed to generate PDF: ' + (err.message || err.toString()));
                                  }
                                }}
                                className="px-2 py-1 bg-sky-50 hover:bg-sky-100 dark:bg-sky-955 text-sky-600 dark:text-sky-400 rounded-md text-[9px] font-bold flex items-center gap-0.5 border border-sky-200/50 cursor-pointer"
                                title="Download PDF"
                              >
                                <FileDown className="w-3 h-3" />
                                <span>PDF</span>
                              </button>
                              <button
                                onClick={() => handleExportMSWord(inv)}
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-955 text-blue-650 dark:text-blue-400 rounded-md text-[9px] font-bold flex items-center gap-0.5 border border-blue-200/50 cursor-pointer"
                                title="Download Word file"
                              >
                                <FileDown className="w-3 h-3" />
                                <span>Word</span>
                              </button>
                              <button
                                onClick={() => onOpenInvoiceEditor(inv)}
                                className="text-[#64748b] hover:text-[#0f172a] p-1.5 rounded-lg hover:bg-[#FCFAF7] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                title="Edit Details"
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
              <div id="floating-bulk-actions" className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] sm:w-[92%] max-w-2xl bg-neutral-950/95 backdrop-blur-md border border-neutral-800 text-white p-2.5 sm:p-3.5 rounded-2xl shadow-2xl flex flex-row items-center justify-between gap-2 sm:gap-3 animate-in slide-in-from-bottom duration-200">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-5 h-5 bg-sky-600 rounded-full flex items-center justify-center text-[10px] font-extrabold">{selectedInvoiceIds.length}</span>
                  <span className="text-[10px] sm:text-[11px] font-medium text-slate-200">Selected</span>
                </div>
                
                <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
                  <button
                    onClick={handleBulkExportPDF}
                    className="px-2 py-1 sm:px-2.5 sm:py-1.5 bg-sky-600 hover:bg-sky-500 rounded-xl text-[9px] sm:text-[10px] font-extrabold flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                    title="Export selected bills sequentially to PDF"
                  >
                    <FileDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span>PDFs</span>
                  </button>
                  
                  <button
                    onClick={handleBulkExportExcel}
                    className="px-2 py-1 sm:px-2.5 sm:py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-[9px] sm:text-[10px] font-extrabold flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                    title="Export selected bills ledger details to Excel CSV"
                  >
                    <Database className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span>Excel</span>
                  </button>

                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        onBulkUpdateInvoicesStatus(selectedInvoiceIds, e.target.value as any);
                        setSelectedInvoiceIds([]);
                      }
                    }}
                    value=""
                    className="px-1.5 py-1 sm:px-2 sm:py-1.5 bg-neutral-800 text-white rounded-xl text-[9px] sm:text-[10px] font-extrabold focus:outline-none border border-neutral-750 cursor-pointer"
                    title="Change status in bulk"
                  >
                    <option value="" disabled>Status...</option>
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
                    className="px-2 py-1 sm:px-2.5 sm:py-1.5 bg-rose-600 hover:bg-rose-500 rounded-xl text-[9px] sm:text-[10px] font-extrabold flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                    title="Delete all selected bills"
                  >
                    <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span>Delete</span>
                  </button>

                  <button
                    onClick={() => setSelectedInvoiceIds([])}
                    className="p-1 sm:p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                    title="Deselect all selected items"
                  >
                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------ TAB: DRAFTS ROUTE ------------------ */}
        {activeTab === 'drafts' && (() => {
          const allDrafts = invoices.filter(i => i.status === 'draft');

          const getDraftDocType = (inv: Invoice) => {
            const t = inv.invoiceType || 'invoice';
            if (t === 'estimate') return 'quote';
            return t;
          };

          const draftCounts = {
            all: allDrafts.length,
            invoice: allDrafts.filter(i => getDraftDocType(i) === 'invoice').length,
            proforma: allDrafts.filter(i => getDraftDocType(i) === 'proforma').length,
            debit_note: allDrafts.filter(i => getDraftDocType(i) === 'debit_note').length,
            credit_note: allDrafts.filter(i => getDraftDocType(i) === 'credit_note').length,
            quote: allDrafts.filter(i => getDraftDocType(i) === 'quote').length
          };

          const filteredDrafts = draftsSection === 'all'
            ? allDrafts
            : allDrafts.filter(i => getDraftDocType(i) === draftsSection);

          const docTypeBadges: Record<string, { label: string; style: string }> = {
            invoice: { label: 'Tax Invoice', style: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-300/60' },
            proforma: { label: 'Proforma', style: 'bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border-sky-300/60' },
            debit_note: { label: 'Debit Note', style: 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-300/60' },
            credit_note: { label: 'Credit Note', style: 'bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 border-violet-300/60' },
            quote: { label: 'Quote / Est', style: 'bg-teal-100 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border-teal-300/60' }
          };

          return (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-black text-[#0f172a] dark:text-white uppercase tracking-wider">Unsaved & Saved Drafts</h2>
                  <span className="px-2 py-0.5 bg-[#f8fafc] dark:bg-zinc-800 text-[#64748b] dark:text-zinc-400 rounded text-[9.5px] font-black">
                    {filteredDrafts.length} {filteredDrafts.length === 1 ? 'Draft' : 'Drafts'}
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('invoices')}
                  className="px-4 py-1.5 bg-white dark:bg-zinc-900 border border-[#e2e8f0] dark:border-zinc-700 hover:bg-[#f8fafc] dark:hover:bg-zinc-800 text-[#0f172a] dark:text-zinc-200 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95 whitespace-nowrap"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Ledger</span>
                </button>
              </div>

              {/* Bifurcated Section Filter: Dropdown on Mobile (< sm), Pill Bar on Desktop (>= sm) */}
              {/* Mobile Select Dropdown (< sm) */}
              <div className="sm:hidden relative">
                <select
                  value={draftsSection}
                  onChange={(e) => setDraftsSection(e.target.value as any)}
                  className="w-full appearance-none pl-3.5 pr-8 py-2 rounded-xl border border-sky-300 dark:border-sky-800/80 bg-sky-50 dark:bg-sky-950/70 text-sky-800 dark:text-sky-200 font-black text-xs focus:ring-2 focus:ring-sky-500/50 focus:outline-none cursor-pointer shadow-xs transition-all tracking-tight"
                >
                  <option value="all">All Drafts ({draftCounts.all})</option>
                  <option value="invoice">Tax Invoices ({draftCounts.invoice})</option>
                  <option value="proforma">Proforma ({draftCounts.proforma})</option>
                  <option value="debit_note">Debit Notes ({draftCounts.debit_note})</option>
                  <option value="credit_note">Credit Notes ({draftCounts.credit_note})</option>
                  <option value="quote">Quotes & Est ({draftCounts.quote})</option>
                </select>
                <ChevronDown className="w-4 h-4 text-sky-700 dark:text-sky-300 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={2.5} />
              </div>

              {/* Desktop Pill Tabs (>= sm) */}
              <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1 sm:mx-0 sm:px-0 border-b border-[#e2e8f0]/60 dark:border-zinc-800">
                {[
                  { id: 'all', label: 'All Drafts', count: draftCounts.all, activeColor: 'border-slate-800 text-slate-900 dark:text-white bg-slate-100 dark:bg-zinc-800', countBg: 'bg-slate-200 text-slate-800 dark:bg-zinc-700 dark:text-zinc-200' },
                  { id: 'invoice', label: 'Tax Invoices', count: draftCounts.invoice, activeColor: 'border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20', countBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' },
                  { id: 'proforma', label: 'Proforma', count: draftCounts.proforma, activeColor: 'border-sky-500 text-sky-700 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/20', countBg: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300' },
                  { id: 'debit_note', label: 'Debit Notes', count: draftCounts.debit_note, activeColor: 'border-indigo-500 text-indigo-700 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20', countBg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300' },
                  { id: 'credit_note', label: 'Credit Notes', count: draftCounts.credit_note, activeColor: 'border-violet-500 text-violet-700 dark:text-violet-400 bg-violet-50/50 dark:bg-violet-950/20', countBg: 'bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-300' },
                  { id: 'quote', label: 'Quotes & Est', count: draftCounts.quote, activeColor: 'border-teal-500 text-teal-700 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20', countBg: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDraftsSection(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer border shrink-0 ${
                      draftsSection === tab.id
                        ? `${tab.activeColor} border-current shadow-xs`
                        : 'border-transparent text-[#64748b]/80 dark:text-zinc-400 hover:text-[#0f172a] dark:hover:text-zinc-200 hover:bg-[#f8fafc] dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    {tab.label}
                    <span className={`px-1.5 py-0.5 sm:px-2 rounded-full text-[8.5px] sm:text-[9px] font-black ${
                      draftsSection === tab.id
                        ? tab.countBg
                        : 'bg-[#e2e8f0]/60 dark:bg-zinc-800 text-[#64748b] dark:text-zinc-400'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Draft Cards Grid */}
              {filteredDrafts.length === 0 ? (
                <div className="py-16 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-[#e2e8f0]/60 dark:border-zinc-800">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-zinc-800 text-amber-500 flex items-center justify-center mx-auto mb-3 border border-amber-200/50 dark:border-zinc-700">
                    <FileText className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-[#64748b]/80 dark:text-zinc-400">
                    {draftsSection === 'all'
                      ? 'No pending drafts found.'
                      : `No ${docTypeBadges[draftsSection]?.label || draftsSection} drafts found.`}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDrafts.map(inv => {
                    const docTypeKey = getDraftDocType(inv);
                    const badge = docTypeBadges[docTypeKey] || docTypeBadges.invoice;
                    return (
                      <div key={inv.id} className="p-5 bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl shadow-sm hover:shadow-md transition-all group relative flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-3 gap-2">
                            <div>
                              <span className="text-[10px] font-black text-sky-600 font-mono tracking-tight block mb-1">{inv.invoiceNumber}</span>
                              <h4 className="text-sm font-black text-[#0f172a] dark:text-white uppercase truncate">{inv.clientName || 'Draft Profile'}</h4>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider border ${badge.style}`}>
                                {badge.label}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
                                Draft
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between mb-4 text-[10px] text-[#64748b]/80 font-semibold font-mono">
                            <span>Saved on {inv.date}</span>
                            <span className="font-bold text-[#0f172a] dark:text-white">{currencySymbol}{inv.grandTotal ? inv.grandTotal.toFixed(2) : '0.00'}</span>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-[#e2e8f0]/40 dark:border-zinc-800/50 flex gap-2">
                          <button 
                            onClick={() => onOpenInvoiceEditor(inv)}
                            className="flex-1 py-2 bg-[#0f172a] dark:bg-zinc-800 hover:bg-[#1e293b] dark:hover:bg-zinc-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer flex justify-center items-center gap-1.5 shadow-xs"
                          >
                            <PenTool className="w-3 h-3" /> Resume Editing
                          </button>
                          <button 
                            onClick={() => onDeleteInvoice(inv.id)}
                            className="w-8 h-8 flex items-center justify-center bg-rose-50 dark:bg-rose-950/30 text-rose-500 hover:bg-rose-100 hover:text-rose-600 rounded-xl transition-colors cursor-pointer shrink-0"
                            title="Delete Draft"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
        {activeTab === 'invoice_templates' && (
          <div className="space-y-4">
            <TemplateManager businessProfile={profile} />
          </div>
        )}

        {/* ------------------ TAB 2: CLIENTS ROUTE ------------------ */}
        {activeTab === 'clients' && (
          <div className="space-y-5 text-sans">
            
            {/* ── Page Header ── */}
            <div className="bg-white dark:bg-zinc-900 border border-[#e2e8f0]/80 dark:border-zinc-800 rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 6px rgba(110,96,80,0.07)' }}>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between p-4 sm:p-5 md:p-6">
                {/* Left: Icon + title + description */}
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-rose-500 dark:bg-rose-600" style={{ boxShadow: '0 3px 10px rgba(0,0,0,0.18)' }}>
                    <Users2 className="w-5 h-5 text-rose-50 dark:text-rose-100" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-lg md:text-xl font-black text-[#3D2C1E] dark:text-white uppercase tracking-tight leading-none">
                        Billed Clients Ledger Book
                      </h2>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border bg-rose-50 border-rose-100 dark:bg-rose-950/40 dark:border-rose-900/40 text-rose-600 dark:text-rose-400">
                        {clients.length} {clients.length === 1 ? 'Record' : 'Records'}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-[#64748b]/75 dark:text-zinc-500 max-w-md leading-relaxed">
                      Manage client profiles for rapid auto-filling during billing creation
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Clients grid list */}
            {clients.length === 0 ? (
              <div 
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-[#e2e8f0]/50 dark:border-zinc-800/80 p-12 text-center relative overflow-hidden"
                style={{ boxShadow: '0 1px 3px rgba(110,96,80,0.06)' }}
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#e2e8f0]/50 to-transparent" />
                <Notebook className="w-10 h-10 mx-auto mb-3 text-[#C6A87D]/70" />
                <h3 className="text-xs font-bold text-[#0f172a] dark:text-zinc-300 uppercase tracking-wider">Your Billed Clients Ledger is Empty</h3>
                <p className="text-[10px] text-[#64748b]/80 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                  Add profiles to automatically inject contacts, GSTIN numbers, and addresses instantly on invoice templates.
                </p>
                <button
                  onClick={() => handleOpenClientEditor(null)}
                  className="mt-4 px-3.5 py-1.5 border border-[#0f172a] hover:bg-[#0f172a] text-[#0f172a] hover:text-white dark:text-zinc-300 dark:border-zinc-700 dark:hover:bg-zinc-800 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer"
                >
                  Create First Profile
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clients.map(c => (
                  <div
                    key={c.id}
                    className="bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden transition-all duration-300 hover:shadow-md hover:border-rose-500 active:border-rose-600 dark:hover:border-rose-500 dark:active:border-rose-600 hover:-translate-y-1 group flex flex-col justify-between cursor-pointer"
                    style={{ boxShadow: '0 1px 3px rgba(110,96,80,0.06)' }}
                  >
                    {/* card top line decoration */}
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div>
                      {/* Name & Company header */}
                      <div className="flex justify-between items-start gap-3">
                        <div className="space-y-1 flex-1 min-w-0">
                          <h4 className="text-xs font-black text-[#0f172a] dark:text-white uppercase tracking-tight truncate">{c.name}</h4>
                          {c.companyName && (
                            <span 
                              className="text-[9px] bg-[#FCFAF7] dark:bg-zinc-950 text-[#64748b] dark:text-zinc-300 border border-[#e2e8f0]/50 dark:border-zinc-800 font-extrabold px-2 py-0.5 rounded-md inline-block uppercase tracking-wider"
                              style={{ boxShadow: '0 1px 2px rgba(110,96,80,0.04)' }}
                            >
                              🏢 {c.companyName}
                            </span>
                          )}
                        </div>
                        
                        {/* Quick action buttons */}
                        <div className="flex gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenClientEditor(c)}
                            className="text-[#64748b] hover:text-[#0f172a] dark:hover:text-white p-1.5 rounded-lg hover:bg-[#F9F5F0] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Edit profile"
                          >
                            <PenTool className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteClient(c.id)}
                            className="text-zinc-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                            title="Delete profile"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Info lines */}
                      <div className="mt-4 space-y-3.5 pt-3.5 border-t border-[#e2e8f0]/35 dark:border-zinc-800/60">
                        {/* Email */}
                        <div className="flex items-start gap-2 text-[10px] text-[#64748b]/80 dark:text-zinc-400">
                          <Mail className="w-3.5 h-3.5 text-[#C6A87D] shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="text-[8px] font-black uppercase tracking-wider text-[#64748b]/50 block">Email Address</span>
                            <span className="truncate block font-semibold text-[#0f172a] dark:text-zinc-200 mt-0.5">{c.email || 'N/A'}</span>
                          </div>
                        </div>

                        {/* Phone */}
                        <div className="flex items-start gap-2 text-[10px] text-[#64748b]/80 dark:text-zinc-400">
                          <Smartphone className="w-3.5 h-3.5 text-[#C6A87D] shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[8px] font-black uppercase tracking-wider text-[#64748b]/50 block">Contact Number</span>
                            <span className="block font-semibold text-[#0f172a] dark:text-zinc-200 mt-0.5">{c.phone || 'N/A'}</span>
                          </div>
                        </div>

                        {/* Address */}
                        <div className="flex items-start gap-2 text-[10px] text-[#64748b]/80 dark:text-zinc-400">
                          <MapPin className="w-3.5 h-3.5 text-[#C6A87D] shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="text-[8px] font-black uppercase tracking-wider text-[#64748b]/50 block">Billing Address</span>
                            <span className="block font-semibold text-[#0f172a] dark:text-zinc-200 mt-0.5 line-clamp-2 leading-relaxed">{c.address || 'No billing address registered'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ------------------ TAB 3: REPORTS & TAX ROUTE ------------------ */}
        {activeTab === 'reports' && (
          <div className="space-y-5">

            {/* ── Page Header ── */}
            <div
              className="relative overflow-hidden bg-white dark:bg-zinc-900 rounded-2xl"
              style={{ boxShadow: '0 1px 3px rgba(110,96,80,0.10), 0 4px 16px rgba(110,96,80,0.08), inset 0 1px 0 rgba(255,255,255,0.9)' }}
            >
              {/* top-edge highlight gives the 'raised panel' feel */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#e2e8f0] to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-br from-[#F9F5F0]/80 via-white/30 to-transparent dark:from-zinc-800/20 pointer-events-none" />
              <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-5 sm:px-6 py-4 sm:py-5">
                <div className="flex items-center gap-4">
                  <div
                    className="w-11 h-11 rounded-xl bg-[#0f172a] flex items-center justify-center shrink-0"
                    style={{ boxShadow: '0 2px 8px rgba(110,96,80,0.35), inset 0 1px 0 rgba(255,255,255,0.15)' }}
                  >
                    <FileText className="w-5 h-5 text-[#e2e8f0]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-[#0f172a] dark:text-white tracking-tight">Accounting Summary</h2>
                    <span className="text-[11px] text-[#64748b]/70 dark:text-zinc-400 mt-0.5 block">Generate customised tax &amp; income expense ledger reports</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsExpenseLoggerOpen(true)}
                  className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-[#0f172a] hover:bg-[#5C5043] hover:translate-y-[-1px] active:translate-y-0 active:scale-[0.98] text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer"
                  style={{ boxShadow: '0 2px 6px rgba(110,96,80,0.30), 0 1px 2px rgba(110,96,80,0.20)' }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log Expense</span>
                </button>
              </div>
            </div>

            {/* ── Ledger & Invoice Report (unified card) ── */}
            <section
              className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden relative"
              style={{ boxShadow: '0 1px 3px rgba(110,96,80,0.09), 0 4px 14px rgba(110,96,80,0.07), inset 0 1px 0 rgba(255,255,255,0.85)' }}
            >
              {/* top highlight */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#e2e8f0]/80 to-transparent" />

              {/* Card header */}
              <div className="flex flex-wrap items-start sm:items-center justify-between gap-3 px-5 sm:px-6 py-3.5 border-b border-[#e2e8f0]/40 dark:border-zinc-800" style={{ background: 'linear-gradient(to right, #FDFAF7, #FAF7F4)' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-4 rounded-full" style={{ background: 'linear-gradient(to bottom, #D4B896, #C6A87D)' }} />
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#0f172a] dark:text-zinc-300 block">Ledger &amp; Invoice Report</span>
                    <span className="text-[9px] text-[#64748b]/60 dark:text-zinc-500 block mt-0.5">Filter records and download compiled reports or individual invoices</span>
                  </div>
                </div>
                <div
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/40 shrink-0"
                  style={{ boxShadow: 'inset 0 1px 2px rgba(2,132,199,0.06)' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                  <span className="text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400">{reportedInvoices.length} matched</span>
                </div>
              </div>

              {/* Single horizontal body row */}
              <div className="px-6 py-5 flex flex-wrap lg:flex-nowrap items-end gap-4">

                {/* Start Date */}
                <div className="space-y-1.5 flex-1 min-w-[140px]">
                  <label htmlFor="rep-start" className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-[#64748b]/80">
                    <span className="w-1 h-1 rounded-full bg-[#C6A87D] inline-block" />
                    Start Date
                  </label>
                  <input
                    id="rep-start"
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FCFAF7] dark:bg-zinc-950 border border-[#e2e8f0] hover:border-[#C6A87D] focus:border-[#0f172a] dark:border-zinc-700 dark:focus:border-zinc-500 rounded-xl text-xs text-[#0f172a] dark:text-white focus:outline-none transition-colors duration-150"
                    style={{ boxShadow: 'inset 0 1px 3px rgba(110,96,80,0.08)' }}
                  />
                </div>

                {/* End Date */}
                <div className="space-y-1.5 flex-1 min-w-[140px]">
                  <label htmlFor="rep-end" className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-[#64748b]/80">
                    <span className="w-1 h-1 rounded-full bg-[#C6A87D] inline-block" />
                    End Date
                  </label>
                  <input
                    id="rep-end"
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FCFAF7] dark:bg-zinc-950 border border-[#e2e8f0] hover:border-[#C6A87D] focus:border-[#0f172a] dark:border-zinc-700 dark:focus:border-zinc-500 rounded-xl text-xs text-[#0f172a] dark:text-white focus:outline-none transition-colors duration-150"
                    style={{ boxShadow: 'inset 0 1px 3px rgba(110,96,80,0.08)' }}
                  />
                </div>

                {/* Client Account */}
                <div className="space-y-1.5 flex-1 min-w-[160px]">
                  <label htmlFor="rep-client" className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-[#64748b]/80">
                    <span className="w-1 h-1 rounded-full bg-[#C6A87D] inline-block" />
                    Client Account
                  </label>
                  <select
                    id="rep-client"
                    value={reportClientFilter}
                    onChange={(e) => setReportClientFilter(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FCFAF7] dark:bg-zinc-950 border border-[#e2e8f0] hover:border-[#C6A87D] focus:border-[#0f172a] dark:border-zinc-700 dark:focus:border-zinc-500 rounded-xl text-xs font-semibold text-[#0f172a] dark:text-white focus:outline-none transition-colors duration-150 cursor-pointer"
                    style={{ boxShadow: 'inset 0 1px 3px rgba(110,96,80,0.08)' }}
                  >
                    <option value="all">All Clients</option>
                    {Array.from(new Set(invoices.map(it => it.clientName))).filter(Boolean).map(clName => (
                      <option key={clName} value={clName}>{clName}</option>
                    ))}
                  </select>
                </div>

                {/* Vertical divider */}
                <div className="hidden lg:block w-px self-stretch bg-gradient-to-b from-transparent via-[#e2e8f0]/60 to-transparent mx-1" />

                {/* Quick chips */}
                <div className="space-y-1.5 shrink-0">
                  <p className="text-[9px] font-black uppercase tracking-wider text-[#64748b]/60 dark:text-zinc-500">Quick Range</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: '7 Days', days: 7 },
                      { label: '1 Month', days: 30 },
                      { label: '1 Year', days: 365 },
                      { label: 'All Time', days: 0 },
                    ].map(opt => {
                      const isReset = opt.days === 0;
                      return (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => {
                            if (isReset) {
                              setReportStartDate('');
                              setReportEndDate('');
                            } else {
                              const end = new Date().toISOString().split('T')[0];
                              const d = new Date();
                              d.setDate(d.getDate() - opt.days);
                              setReportStartDate(d.toISOString().split('T')[0]);
                              setReportEndDate(end);
                            }
                          }}
                          className="px-3 py-2 rounded-xl text-[11px] font-bold transition-all duration-150 hover:translate-y-[-1px] active:scale-[0.97] cursor-pointer bg-[#FCFAF7] hover:bg-[#f8fafc] text-[#0f172a] dark:bg-zinc-950 dark:hover:bg-zinc-800 dark:text-zinc-300"
                          style={{ boxShadow: '0 1px 3px rgba(110,96,80,0.12), inset 0 1px 0 rgba(255,255,255,0.8)' }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Vertical divider */}
                <div className="hidden lg:block w-px self-stretch bg-gradient-to-b from-transparent via-[#e2e8f0]/60 to-transparent mx-1" />

                {/* Download buttons */}
                <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (reportedInvoices.length === 0) { alert("No client billing records match the specified interval."); return; }
                      const rangeLabel = reportStartDate && reportEndDate ? `${reportStartDate} to ${reportEndDate}` : "Cumulative Ledger Period";
                      exportCollectiveReportPDF(reportedInvoices, profile, rangeLabel);
                    }}
                    className="group relative px-4 py-2.5 rounded-xl text-white text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-150 hover:translate-y-[-1px] active:scale-[0.98] cursor-pointer overflow-hidden whitespace-nowrap"
                    style={{ background: 'linear-gradient(135deg, #0f172a 0%, #7A6B5A 100%)', boxShadow: '0 2px 8px rgba(110,96,80,0.28), inset 0 1px 0 rgba(255,255,255,0.10)' }}
                  >
                    <span className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-150" />
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span>Ledger PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (reportedInvoices.length === 0) { alert("No client billing records match the specified interval."); return; }
                      reportedInvoices.forEach((inv, index) => {
                        setTimeout(async () => { await exportInvoicePDFAsync(inv, profile); }, index * 350);
                      });
                    }}
                    className="group relative px-4 py-2.5 rounded-xl text-white text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-150 hover:translate-y-[-1px] active:scale-[0.98] cursor-pointer overflow-hidden whitespace-nowrap"
                    style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)', boxShadow: '0 2px 8px rgba(5,150,105,0.26), inset 0 1px 0 rgba(255,255,255,0.12)' }}
                  >
                    <span className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-150" />
                    <Download className="w-3.5 h-3.5 shrink-0" />
                    <span>All Individual Invoices</span>
                  </button>
                </div>

              </div>
            </section>

            <div className="mt-8 mb-4 flex flex-wrap items-center justify-between gap-3 px-2">
              <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-4 rounded-full" style={{ background: 'linear-gradient(to bottom, #D4B896, #C6A87D)' }} />
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#0f172a] dark:text-zinc-300 block">Income &amp; Expense Analytics</span>
                  <span className="text-[9px] text-[#64748b]/60 dark:text-zinc-500 block mt-0.5">Overview of cash flow, liabilities, and profitability based on current ledger</span>
                </div>
              </div>
            </div>

            {/* Income and Expense Analytics report */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
              {/* Gross Profit Card */}
              <div className="bg-white dark:bg-zinc-900 border-l-4 border-l-emerald-400 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl p-3.5 sm:p-5 shadow-xs relative flex flex-col justify-between h-[145px] sm:h-[155px]">
                <div className="flex flex-wrap sm:flex-nowrap justify-between items-start gap-2">
                  <div className="w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-full bg-[#ECFDF5] text-[#10B981] border border-[#A7F3D0] flex items-center justify-center font-black text-xs sm:text-sm">
                    ₹
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-black text-[#10B981] bg-[#ECFDF5] border border-[#A7F3D0] px-1.5 sm:px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Cleared
                  </span>
                </div>
                <div className="mt-2 min-w-0">
                  <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-wider text-[#64748b]/80 block truncate">Gross Profit</span>
                  <span className="text-sm sm:text-xl font-black text-[#0f172a] dark:text-white mt-0.5 block font-mono truncate">
                    {currencySymbol}{reportedIncomePaid.toLocaleString()}
                  </span>
                </div>
                {/* Sparkline bars */}
                <div className="flex items-end gap-1 h-6 self-start mt-2">
                  <div className="w-1 bg-emerald-200 rounded-t-sm h-2" />
                  <div className="w-1 bg-emerald-300 rounded-t-sm h-3" />
                  <div className="w-1 bg-emerald-400 rounded-t-sm h-5" />
                  <div className="w-1 bg-emerald-300 rounded-t-sm h-3" />
                  <div className="w-1 bg-emerald-500 rounded-t-sm h-6" />
                </div>
              </div>

              {/* Business Expenses Card */}
              <div className="bg-white dark:bg-zinc-900 border-l-4 border-l-rose-400 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl p-3.5 sm:p-5 shadow-xs relative flex flex-col justify-between h-[145px] sm:h-[155px]">
                <div className="flex flex-wrap sm:flex-nowrap justify-between items-start gap-2">
                  <div className="w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-full bg-[#FEF2F2] text-[#EF4444] border border-[#FEE2E2] flex items-center justify-center">
                    <MinusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-black text-[#EF4444] bg-[#FEF2F2] border border-[#FEE2E2] px-1.5 sm:px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Expenses
                  </span>
                </div>
                <div className="mt-2 min-w-0">
                  <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-wider text-[#64748b]/80 block truncate">Business Expenses</span>
                  <span className="text-sm sm:text-xl font-black text-[#0f172a] dark:text-white mt-0.5 block font-mono truncate">
                    {currencySymbol}{totalReportedExpenses.toLocaleString()}
                  </span>
                </div>
                {/* Sparkline bars */}
                <div className="flex items-end gap-1 h-6 self-start mt-2">
                  <div className="w-1 bg-rose-200 rounded-t-sm h-3" />
                  <div className="w-1 bg-rose-300 rounded-t-sm h-4" />
                  <div className="w-1 bg-rose-450 h-2" />
                  <div className="w-1 bg-rose-400 rounded-t-sm h-5" />
                  <div className="w-1 bg-rose-500 rounded-t-sm h-6" />
                </div>
              </div>

              {/* Pending Receivables Card */}
              <div className="bg-white dark:bg-zinc-900 border-l-4 border-l-amber-400 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl p-3.5 sm:p-5 shadow-xs relative flex flex-col justify-between h-[145px] sm:h-[155px]">
                <div className="flex flex-wrap sm:flex-nowrap justify-between items-start gap-2">
                  <div className="w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-full bg-[#FFFBEB] text-[#F59E0B] border border-[#FEF3C7] flex items-center justify-center">
                    <CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-black text-[#F59E0B] bg-[#FFFBEB] border border-[#FEF3C7] px-1.5 sm:px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Unpaid
                  </span>
                </div>
                <div className="mt-2 min-w-0">
                  <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-wider text-[#64748b]/80 block truncate">Pending Receivables</span>
                  <span className="text-sm sm:text-xl font-black text-[#0f172a] dark:text-white mt-0.5 block font-mono truncate">
                    {currencySymbol}{reportedOutstanding.toLocaleString()}
                  </span>
                </div>
                {/* Sparkline bars */}
                <div className="flex items-end gap-1 h-6 self-start mt-2">
                  <div className="w-1 bg-amber-200 rounded-t-sm h-4" />
                  <div className="w-1 bg-amber-300 rounded-t-sm h-2" />
                  <div className="w-1 bg-amber-400 rounded-t-sm h-5" />
                  <div className="w-1 bg-amber-500 rounded-t-sm h-6" />
                  <div className="w-1 bg-amber-300 rounded-t-sm h-3" />
                </div>
              </div>

              {/* Tax Calculations Card */}
              <div className="bg-white dark:bg-zinc-900 border-l-4 border-l-sky-400 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl p-3.5 sm:p-5 shadow-xs relative flex flex-col justify-between h-[145px] sm:h-[155px]">
                <div className="flex flex-wrap sm:flex-nowrap justify-between items-start gap-2">
                  <div className="w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-full bg-[#F0F9FF] text-[#0284C7] border border-[#BAE6FD] flex items-center justify-center">
                    <Percent className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-black text-[#0284C7] bg-[#F0F9FF] border border-[#BAE6FD] px-1.5 sm:px-2 py-0.5 rounded-full uppercase tracking-wider">
                    TAX/GST
                  </span>
                </div>
                <div className="mt-2 min-w-0">
                  <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-wider text-[#64748b]/80 block truncate">Tax Liabilities</span>
                  <span className="text-sm sm:text-xl font-black text-[#0f172a] dark:text-white mt-0.5 block font-mono truncate">
                    {currencySymbol}{reportedTaxTotal.toLocaleString()}
                  </span>
                </div>
                {/* Sparkline bars */}
                <div className="flex items-end gap-1 h-6 self-start mt-2">
                  <div className="w-1 bg-sky-200 rounded-t-sm h-3" />
                  <div className="w-1 bg-sky-300 rounded-t-sm h-5" />
                  <div className="w-1 bg-sky-400 rounded-t-sm h-2" />
                  <div className="w-1 bg-sky-500 rounded-t-sm h-6" />
                  <div className="w-1 bg-sky-300 rounded-t-sm h-4" />
                </div>
              </div>
            </div>

            {/* Dynamic Interactive SVG Monthly Trend Graphs */}
            {(() => {
              type RangeKey = '7d' | '1m' | '3m' | '6m' | '1y' | 'all';
              const RANGE_OPTS: { key: RangeKey; label: string }[] = [
                { key: '7d',  label: '7 Days' },
                { key: '1m',  label: 'Monthly' },
                { key: '3m',  label: 'Quarterly' },
                { key: '6m',  label: 'Half Year' },
                { key: '1y',  label: 'Yearly' },
                { key: 'all', label: 'All Years' },
              ];

              const now = new Date();
              const records: { label: string; income: number; expense: number; tax: number }[] = [];

              if (reportsChartRange === '7d') {
                // Daily buckets for last 7 days
                for (let i = 6; i >= 0; i--) {
                  const d = new Date(now);
                  d.setDate(now.getDate() - i);
                  records.push({
                    label: `${d.getDate()}/${d.getMonth() + 1}`,
                    income: 0, expense: 0, tax: 0
                  });
                }
                reportedInvoices.forEach(inv => {
                  const d = new Date(inv.date);
                  if (isNaN(d.getTime())) return;
                  const lbl = `${d.getDate()}/${d.getMonth() + 1}`;
                  const match = records.find(r => r.label === lbl);
                  if (match) {
                    if (inv.status === 'paid') match.income += inv.grandTotal;
                    match.tax += (inv.taxTotal || 0);
                  }
                });
                reportedExpenses.forEach(exp => {
                  const d = new Date(exp.date);
                  if (isNaN(d.getTime())) return;
                  const lbl = `${d.getDate()}/${d.getMonth() + 1}`;
                  const match = records.find(r => r.label === lbl);
                  if (match) match.expense += exp.amount;
                });

              } else if (reportsChartRange === '1m') {
                // Weekly buckets for last 4 weeks
                for (let i = 3; i >= 0; i--) {
                  const wEnd = new Date(now);
                  wEnd.setDate(now.getDate() - i * 7);
                  const wStart = new Date(wEnd);
                  wStart.setDate(wEnd.getDate() - 6);
                  records.push({ label: `W${4 - i}`, income: 0, expense: 0, tax: 0, _start: wStart, _end: wEnd } as any);
                }
                reportedInvoices.forEach(inv => {
                  const d = new Date(inv.date);
                  if (isNaN(d.getTime())) return;
                  const match = (records as any[]).find(r => d >= r._start && d <= r._end);
                  if (match) {
                    if (inv.status === 'paid') match.income += inv.grandTotal;
                    match.tax += (inv.taxTotal || 0);
                  }
                });
                reportedExpenses.forEach(exp => {
                  const d = new Date(exp.date);
                  if (isNaN(d.getTime())) return;
                  const match = (records as any[]).find(r => d >= r._start && d <= r._end);
                  if (match) match.expense += exp.amount;
                });

              } else if (reportsChartRange === 'all') {
                // Yearly buckets
                const minYearInv = reportedInvoices.length > 0 ? Math.min(...reportedInvoices.map(i => new Date(i.date).getFullYear())) : now.getFullYear();
                const minYearExp = reportedExpenses.length > 0 ? Math.min(...reportedExpenses.map(e => new Date(e.date).getFullYear())) : now.getFullYear();
                const startYear = Math.min(minYearInv, minYearExp, now.getFullYear());
                const endYear = now.getFullYear();
                
                // Show at least a 3-year spread if there's only 1 year of data so the chart line has points
                const adjustedStart = (endYear - startYear < 2) ? endYear - 2 : startYear;
                
                for (let y = adjustedStart; y <= endYear; y++) {
                  records.push({ label: y.toString(), income: 0, expense: 0, tax: 0, _year: y } as any);
                }
                
                reportedInvoices.forEach(inv => {
                  const d = new Date(inv.date);
                  if (isNaN(d.getTime())) return;
                  const match = (records as any[]).find(r => r._year === d.getFullYear());
                  if (match) {
                    if (inv.status === 'paid') match.income += inv.grandTotal;
                    match.tax += (inv.taxTotal || 0);
                  }
                });
                reportedExpenses.forEach(exp => {
                  const d = new Date(exp.date);
                  if (isNaN(d.getTime())) return;
                  const match = (records as any[]).find(r => r._year === d.getFullYear());
                  if (match) match.expense += exp.amount;
                });

              } else {
                // Monthly buckets
                const monthCount = reportsChartRange === '3m' ? 3 : reportsChartRange === '6m' ? 6 : 12;
                const monthsShort = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                for (let i = monthCount - 1; i >= 0; i--) {
                  const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                  records.push({ label: monthsShort[d.getMonth()], income: 0, expense: 0, tax: 0, _month: d.getMonth(), _year: d.getFullYear() } as any);
                }
                reportedInvoices.forEach(inv => {
                  const d = new Date(inv.date);
                  if (isNaN(d.getTime())) return;
                  const match = (records as any[]).find(r => r._month === d.getMonth() && r._year === d.getFullYear());
                  if (match) {
                    if (inv.status === 'paid') match.income += inv.grandTotal;
                    match.tax += (inv.taxTotal || 0);
                  }
                });
                reportedExpenses.forEach(exp => {
                  const d = new Date(exp.date);
                  if (isNaN(d.getTime())) return;
                  const match = (records as any[]).find(r => r._month === d.getMonth() && r._year === d.getFullYear());
                  if (match) match.expense += exp.amount;
                });
              }

              const chartHeight = 130;
              const chartWidth = 500;
              const paddingX = 42;
              const paddingY = 20;
              const usableHeight = chartHeight - paddingY * 2;
              const usableWidth = chartWidth - paddingX * 2;

              // Grid math for Chart 1: Gross Profit & Tax Liabilities
              const maxVal1 = Math.max(...records.map(d => Math.max(d.income, d.tax)), 100);
              const pointsIncome1 = records.map((d, index) => ({
                x: paddingX + (index / (records.length - 1)) * usableWidth,
                y: chartHeight - paddingY - (d.income / maxVal1) * usableHeight
              }));
              const pointsTax1 = records.map((d, index) => ({
                x: paddingX + (index / (records.length - 1)) * usableWidth,
                y: chartHeight - paddingY - (d.tax / maxVal1) * usableHeight
              }));
              const pathIncome1 = pointsIncome1.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
              const pathTax1 = pointsTax1.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

              // Grid math for Chart 2: Earnings & Expenses
              const maxVal2 = Math.max(...records.map(d => Math.max(d.income, d.expense)), 100);
              const pointsIncome2 = records.map((d, index) => ({
                x: paddingX + (index / (records.length - 1)) * usableWidth,
                y: chartHeight - paddingY - (d.income / maxVal2) * usableHeight
              }));
              const pointsExpense2 = records.map((d, index) => ({
                x: paddingX + (index / (records.length - 1)) * usableWidth,
                y: chartHeight - paddingY - (d.expense / maxVal2) * usableHeight
              }));
              const pathIncome2 = pointsIncome2.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
              const pathExpense2 = pointsExpense2.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

              return (
                <div className="space-y-4">

                  {/* Shared range filter pills */}
                  <div
                    className="bg-white dark:bg-zinc-900 rounded-2xl px-5 py-4 flex items-center gap-3 flex-wrap"
                    style={{ boxShadow: '0 1px 3px rgba(110,96,80,0.09), 0 4px 14px rgba(110,96,80,0.07), inset 0 1px 0 rgba(255,255,255,0.85)' }}
                  >
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#e2e8f0]/80 to-transparent" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#64748b]/60 dark:text-zinc-500 shrink-0">Trend Period</span>
                    <div className="flex flex-wrap gap-2">
                      {RANGE_OPTS.map(opt => {
                        const isActive = reportsChartRange === opt.key;
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => setReportsChartRange(opt.key)}
                            className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all duration-150 cursor-pointer ${
                              isActive
                                ? 'text-white'
                                : 'bg-[#FCFAF7] hover:bg-[#f8fafc] text-[#0f172a] dark:bg-zinc-950 dark:hover:bg-zinc-800 dark:text-zinc-300 hover:translate-y-[-1px]'
                            }`}
                            style={isActive ? {
                              background: 'linear-gradient(135deg, #0f172a 0%, #64748b 100%)',
                              boxShadow: '0 2px 6px rgba(110,96,80,0.30), inset 0 1px 0 rgba(255,255,255,0.12)'
                            } : {
                              boxShadow: '0 1px 3px rgba(110,96,80,0.12), inset 0 1px 0 rgba(255,255,255,0.8)'
                            }}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* CHART 1: Gross Profit vs Tax Liabilities */}
                  <div className="bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 p-5 rounded-2xl shadow-xs text-sans">
                    <div className="flex flex-wrap justify-between items-start sm:items-center gap-2 mb-4">
                      <div>
                        <h3 className="text-sm font-black text-[#0f172a] dark:text-white uppercase tracking-tight">Gross Profit & Taxes</h3>
                        <span className="text-[10px] text-[#64748b]/80 dark:text-zinc-400 block mt-0.5 font-medium">Comparative analysis of income vs tax liabilities</span>
                      </div>
                      <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-wider text-[#64748b]/80 dark:text-zinc-400">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-0.5 bg-[#0f172a]" /> PROFIT
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-0.5 border-t border-dashed border-[#0284C7]" /> TAX
                        </span>
                      </div>
                    </div>

                    <div className="w-full overflow-x-auto select-none mt-2">
                      <svg className="w-full min-w-[400px]" viewBox={`0 0 ${chartWidth} ${chartHeight}`} fill="none">
                        {/* Grid Lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                          const y = paddingY + ratio * usableHeight;
                          const labelValue = Math.round(maxVal1 - (ratio * maxVal1));
                          return (
                            <g key={`grid-c1-${idx}`}>
                              <line x1={paddingX} y1={y} x2={chartWidth - paddingX} y2={y} stroke="#e2e8f0" strokeWidth="0.5" strokeOpacity="0.4" />
                              <text x={paddingX - 10} y={y + 3} textAnchor="end" className="text-[8px] font-mono fill-[#64748b]/70">
                                {labelValue >= 1000 ? `${(labelValue / 1000).toFixed(0)}k` : labelValue}
                              </text>
                            </g>
                          );
                        })}

                        {/* Vertical guide line */}
                        {hoveredReportsChartIndex1 !== null && pointsIncome1[hoveredReportsChartIndex1] && (
                          <line 
                            x1={pointsIncome1[hoveredReportsChartIndex1].x} 
                            y1={paddingY} 
                            x2={pointsIncome1[hoveredReportsChartIndex1].x} 
                            y2={chartHeight - paddingY} 
                            stroke="#C6A87D" 
                            strokeWidth="1" 
                            strokeDasharray="2 2"
                            className="opacity-75"
                          />
                        )}

                        {/* Line paths */}
                        <path d={pathIncome1} fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                        <path d={pathTax1} fill="none" stroke="#0284C7" strokeWidth="1.8" strokeDasharray="3 3" strokeLinecap="round" />

                        {/* Dots */}
                        {pointsIncome1.map((pts, i) => (
                          <circle 
                            key={`gp-dot-${i}`} 
                            cx={pts.x} 
                            cy={pts.y} 
                            r={hoveredReportsChartIndex1 === i ? "4.5" : "3"} 
                            fill="#0f172a" 
                            stroke="#fff" 
                            strokeWidth={hoveredReportsChartIndex1 === i ? "1.5" : "1"} 
                          />
                        ))}
                        {pointsTax1.map((pts, i) => (
                          <circle 
                            key={`tx-dot-${i}`} 
                            cx={pts.x} 
                            cy={pts.y} 
                            r={hoveredReportsChartIndex1 === i ? "4.5" : "3"} 
                            fill="#0284C7" 
                            stroke="#fff" 
                            strokeWidth={hoveredReportsChartIndex1 === i ? "1.5" : "1"} 
                          />
                        ))}

                        {/* Labels */}
                        {records.map((r, i) => {
                          const x = paddingX + (i / (records.length - 1)) * usableWidth;
                          const isHovered = hoveredReportsChartIndex1 === i;
                          return (
                            <text 
                              key={`lbl-c1-${i}`} 
                              x={x} 
                              y={chartHeight - 4} 
                              textAnchor="middle" 
                              className={`text-[9px] font-mono transition-all ${isHovered ? 'font-black fill-[#0f172a]' : 'font-bold fill-[#64748b]/80'}`}
                            >
                              {r.label}
                            </text>
                          );
                        })}

                        {/* Hover Zones */}
                        {records.map((_, i) => {
                          const colWidth = usableWidth / (records.length - 1);
                          const x = paddingX + i * colWidth - colWidth / 2;
                          return (
                            <rect
                              key={`hz-c1-${i}`}
                              x={i === 0 ? paddingX : x}
                              y={paddingY}
                              width={i === 0 || i === records.length - 1 ? colWidth / 2 : colWidth}
                              height={usableHeight}
                              fill="transparent"
                              className="cursor-pointer"
                              onMouseEnter={() => setHoveredReportsChartIndex1(i)}
                              onMouseLeave={() => setHoveredReportsChartIndex1(null)}
                              onTouchStart={() => setHoveredReportsChartIndex1(i)}
                              onClick={() => setHoveredReportsChartIndex1(i)}
                            />
                          );
                        })}

                        {/* Tooltip */}
                        {hoveredReportsChartIndex1 !== null && records[hoveredReportsChartIndex1] && (() => {
                          const rec = records[hoveredReportsChartIndex1];
                          const pt = pointsIncome1[hoveredReportsChartIndex1] || { x: 250, y: 80 };
                          const tooltipWidth = 115;
                          const tooltipHeight = 44;
                          let tooltipX = pt.x - tooltipWidth / 2;
                          if (tooltipX < paddingX) tooltipX = paddingX;
                          if (tooltipX + tooltipWidth > chartWidth - paddingX) tooltipX = chartWidth - paddingX - tooltipWidth;
                          const tooltipY = Math.max(paddingY - 5, pt.y - tooltipHeight - 8);

                          return (
                            <g transform={`translate(${tooltipX}, ${tooltipY})`} className="pointer-events-none filter drop-shadow-[0_2px_4px_rgba(110,96,80,0.12)]">
                              <rect width={tooltipWidth} height={tooltipHeight} rx="6" fill="rgba(35, 32, 29, 0.95)" stroke="#e2e8f0" strokeWidth="0.5" />
                              <text x="8" y="12" fill="#e2e8f0" className="text-[8px] font-black uppercase tracking-wider font-mono">{rec.label}</text>
                              <text x="8" y="24" fill="#10B981" className="text-[8px] font-bold font-mono">Profit: {currencySymbol}{rec.income.toLocaleString()}</text>
                              <text x="8" y="34" fill="#38BDF8" className="text-[8px] font-bold font-mono">Tax: {currencySymbol}{rec.tax.toLocaleString()}</text>
                            </g>
                          );
                        })()}
                      </svg>
                    </div>
                  </div>

                  {/* CHART 2: Earnings vs Expenses */}
                  <div className="bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 p-5 rounded-2xl shadow-xs text-sans">
                    <div className="flex flex-wrap justify-between items-start sm:items-center gap-2 mb-4">
                      <div>
                        <h3 className="text-sm font-black text-[#0f172a] dark:text-white uppercase tracking-tight">Earnings & Expenses</h3>
                        <span className="text-[10px] text-[#64748b]/80 dark:text-zinc-400 block mt-0.5 font-medium">Comparative analysis of business revenues vs expenses</span>
                      </div>
                      <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-wider text-[#64748b]/80 dark:text-zinc-400">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-0.5 bg-[#0f172a]" /> EARNED
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-0.5 border-t border-dashed border-[#EF4444]" /> SPENT
                        </span>
                      </div>
                    </div>

                    <div className="w-full overflow-x-auto select-none mt-2">
                      <svg className="w-full min-w-[400px]" viewBox={`0 0 ${chartWidth} ${chartHeight}`} fill="none">
                        {/* Grid Lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                          const y = paddingY + ratio * usableHeight;
                          const labelValue = Math.round(maxVal2 - (ratio * maxVal2));
                          return (
                            <g key={`grid-c2-${idx}`}>
                              <line x1={paddingX} y1={y} x2={chartWidth - paddingX} y2={y} stroke="#e2e8f0" strokeWidth="0.5" strokeOpacity="0.4" />
                              <text x={paddingX - 10} y={y + 3} textAnchor="end" className="text-[8px] font-mono fill-[#64748b]/70">
                                {labelValue >= 1000 ? `${(labelValue / 1000).toFixed(0)}k` : labelValue}
                              </text>
                            </g>
                          );
                        })}

                        {/* Vertical guide line */}
                        {hoveredReportsChartIndex2 !== null && pointsIncome2[hoveredReportsChartIndex2] && (
                          <line 
                            x1={pointsIncome2[hoveredReportsChartIndex2].x} 
                            y1={paddingY} 
                            x2={pointsIncome2[hoveredReportsChartIndex2].x} 
                            y2={chartHeight - paddingY} 
                            stroke="#C6A87D" 
                            strokeWidth="1" 
                            strokeDasharray="2 2"
                            className="opacity-75"
                          />
                        )}

                        {/* Line paths */}
                        <path d={pathIncome2} fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                        <path d={pathExpense2} fill="none" stroke="#EF4444" strokeWidth="1.8" strokeDasharray="3 3" strokeLinecap="round" />

                        {/* Dots */}
                        {pointsIncome2.map((pts, i) => (
                          <circle 
                            key={`earn-dot-${i}`} 
                            cx={pts.x} 
                            cy={pts.y} 
                            r={hoveredReportsChartIndex2 === i ? "4.5" : "3"} 
                            fill="#0f172a" 
                            stroke="#fff" 
                            strokeWidth={hoveredReportsChartIndex2 === i ? "1.5" : "1"} 
                          />
                        ))}
                        {pointsExpense2.map((pts, i) => (
                          <circle 
                            key={`exp-dot-c2-${i}`} 
                            cx={pts.x} 
                            cy={pts.y} 
                            r={hoveredReportsChartIndex2 === i ? "4.5" : "3"} 
                            fill="#EF4444" 
                            stroke="#fff" 
                            strokeWidth={hoveredReportsChartIndex2 === i ? "1.5" : "1"} 
                          />
                        ))}

                        {/* Labels */}
                        {records.map((r, i) => {
                          const x = paddingX + (i / (records.length - 1)) * usableWidth;
                          const isHovered = hoveredReportsChartIndex2 === i;
                          return (
                            <text 
                              key={`lbl-c2-${i}`} 
                              x={x} 
                              y={chartHeight - 4} 
                              textAnchor="middle" 
                              className={`text-[9px] font-mono transition-all ${isHovered ? 'font-black fill-[#0f172a]' : 'font-bold fill-[#64748b]/80'}`}
                            >
                              {r.label}
                            </text>
                          );
                        })}

                        {/* Hover Zones */}
                        {records.map((_, i) => {
                          const colWidth = usableWidth / (records.length - 1);
                          const x = paddingX + i * colWidth - colWidth / 2;
                          return (
                            <rect
                              key={`hz-c2-${i}`}
                              x={i === 0 ? paddingX : x}
                              y={paddingY}
                              width={i === 0 || i === records.length - 1 ? colWidth / 2 : colWidth}
                              height={usableHeight}
                              fill="transparent"
                              className="cursor-pointer"
                              onMouseEnter={() => setHoveredReportsChartIndex2(i)}
                              onMouseLeave={() => setHoveredReportsChartIndex2(null)}
                              onTouchStart={() => setHoveredReportsChartIndex2(i)}
                              onClick={() => setHoveredReportsChartIndex2(i)}
                            />
                          );
                        })}

                        {/* Tooltip */}
                        {hoveredReportsChartIndex2 !== null && records[hoveredReportsChartIndex2] && (() => {
                          const rec = records[hoveredReportsChartIndex2];
                          const pt = pointsIncome2[hoveredReportsChartIndex2] || { x: 250, y: 80 };
                          const tooltipWidth = 115;
                          const tooltipHeight = 44;
                          let tooltipX = pt.x - tooltipWidth / 2;
                          if (tooltipX < paddingX) tooltipX = paddingX;
                          if (tooltipX + tooltipWidth > chartWidth - paddingX) tooltipX = chartWidth - paddingX - tooltipWidth;
                          const tooltipY = Math.max(paddingY - 5, pt.y - tooltipHeight - 8);

                          return (
                            <g transform={`translate(${tooltipX}, ${tooltipY})`} className="pointer-events-none filter drop-shadow-[0_2px_4px_rgba(110,96,80,0.12)]">
                              <rect width={tooltipWidth} height={tooltipHeight} rx="6" fill="rgba(35, 32, 29, 0.95)" stroke="#e2e8f0" strokeWidth="0.5" />
                              <text x="8" y="12" fill="#e2e8f0" className="text-[8px] font-black uppercase tracking-wider font-mono">{rec.label}</text>
                              <text x="8" y="24" fill="#10B981" className="text-[8px] font-bold font-mono">Earned: {currencySymbol}{rec.income.toLocaleString()}</text>
                              <text x="8" y="34" fill="#EF4444" className="text-[8px] font-bold font-mono">Spent: {currencySymbol}{rec.expense.toLocaleString()}</text>
                            </g>
                          );
                        })()}
                      </svg>
                    </div>
                  </div>
                </div>
                </div>
              );
            })()}

            {/* Net Income statement tracker bar */}
            {(() => {
              const netCash = reportedIncomePaid - totalReportedExpenses;
              const isProfitable = netCash >= 0;
              return (
                <div 
                  className="relative overflow-hidden bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl p-5 shadow-xs"
                  style={{ boxShadow: '0 1px 3px rgba(110,96,80,0.06)' }}
                >
                  {/* Color top border decoration */}
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${isProfitable ? 'from-emerald-400 via-teal-500 to-emerald-400' : 'from-rose-400 via-pink-500 to-rose-400'}`} />
                  
                  {/* Subtle background glow */}
                  <div className={`absolute inset-0 opacity-[0.03] dark:opacity-[0.06] bg-gradient-to-br pointer-events-none ${isProfitable ? 'from-emerald-500 to-teal-500' : 'from-rose-500 to-pink-500'}`} />

                  <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4 text-sans select-none">
                    <div className="flex items-center gap-3.5 text-center sm:text-left">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${isProfitable ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                        {isProfitable ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                      </div>
                      <div>
                        <span className="text-[9px] text-[#64748b]/80 dark:text-zinc-400 uppercase tracking-widest font-black block">Combined Net Cash Flow Statement</span>
                        <span className="text-[11px] font-black text-[#0f172a] dark:text-zinc-300 mt-0.5 block">
                          {isProfitable ? 'Operating at a net business profit' : 'Overheads exceed paid cash receipts'}
                        </span>
                      </div>
                    </div>

                    <div className="text-center sm:text-right shrink-0">
                      <span className={`text-2xl font-black font-mono tracking-tight block ${isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                        {isProfitable ? '+' : ''}{currencySymbol}{netCash.toLocaleString()}
                      </span>
                      <span className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md mt-1 inline-block ${isProfitable ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-500'}`}>
                        {isProfitable ? 'Healthy Status' : 'Attention Required'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
            {/* Side-by-side Tables Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* List of outstanding invoices with due dates */}
              <div className="bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
                <div className="flex justify-between items-center pb-4 border-b border-[#e2e8f0]/45 dark:border-zinc-800">
                  <h3 className="text-sm font-black text-[#0f172a] dark:text-white uppercase tracking-tight">Receivables Aging & Pending Bills</h3>
                  <span className="text-[10px] font-mono font-black text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-lg border border-rose-200/50 dark:border-rose-900/30">
                    {reportedInvoices.filter(i => i.status === 'pending').length} Pending
                  </span>
                </div>
                <div className="w-full overflow-x-auto mt-3 text-sans">
                  {reportedInvoices.filter(i => i.status === 'pending').length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-xs text-[#64748b]/80 font-medium">No outstanding receivables in this filtered bracket.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="text-[10px] font-black uppercase text-[#64748b]/60 tracking-wider border-b border-[#e2e8f0]/30">
                          <th className="py-2.5 font-black">INV ID</th>
                          <th className="py-2.5 font-black">CLIENT NAME</th>
                          <th className="py-2.5 font-black">DUE DATE</th>
                          <th className="py-2.5 font-black">AMOUNT</th>
                          <th className="py-2.5 font-black">STATUS</th>
                          <th className="py-2.5"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportedInvoices.filter(i => i.status === 'pending').slice(0, 3).map(inv => (
                          <tr key={inv.id} className="border-b border-[#e2e8f0]/20 hover:bg-[#FAF8F5]/50 dark:hover:bg-zinc-850/40">
                            <td className="py-3 font-extrabold text-[#0f172a] dark:text-white">{inv.invoiceNumber}</td>
                            <td className="py-3 font-bold text-[#64748b] dark:text-zinc-300 truncate max-w-[150px]">{inv.clientName}</td>
                            <td className="py-3 font-medium text-rose-500 font-sans">Due: {inv.dueDate || inv.date}</td>
                            <td className="py-3 font-extrabold font-mono text-[#0f172a] dark:text-white">{currencySymbol}{inv.grandTotal.toLocaleString()}</td>
                            <td className="py-3">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-900/30 text-amber-600 dark:text-amber-400">
                                PENDING
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <button 
                                onClick={() => setActivePreviewInvoice(inv)}
                                className="text-[#64748b] hover:text-[#0f172a] dark:hover:text-white p-1 cursor-pointer"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {reportedInvoices.filter(i => i.status === 'pending').length > 3 && (
                    <div className="mt-3 pt-3 border-t border-[#e2e8f0]/30 dark:border-zinc-800 text-center">
                      <button 
                        onClick={() => setActiveTab('invoices')} 
                        className="text-[9px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-600 transition-colors"
                      >
                        See More Pending Bills &rarr;
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Business Expenses Ledger logged */}
              <div className="bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
                <div className="flex justify-between items-center pb-4 border-b border-[#e2e8f0]/45 dark:border-zinc-800">
                  <h3 className="text-sm font-black text-[#0f172a] dark:text-white uppercase tracking-tight">Logged Expenditure Ledgers</h3>
                  <span className="text-[10px] font-mono font-black text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-lg border border-rose-200/50 dark:border-rose-900/30">
                    {reportedExpenses.length} Expenses
                  </span>
                </div>
                <div className="w-full overflow-x-auto mt-3 text-sans">
                  {reportedExpenses.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-xs text-[#64748b]/80 font-medium">No registered business expenses in this bracket. Use &apos;Log Expense&apos; above to enter write-offs.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="text-[10px] font-black uppercase text-[#64748b]/60 tracking-wider border-b border-[#e2e8f0]/30">
                          <th className="py-2.5 font-black">CATEGORY</th>
                          <th className="py-2.5 font-black">DESCRIPTION</th>
                          <th className="py-2.5 font-black">CHARGED DATE</th>
                          <th className="py-2.5 font-black">AMOUNT</th>
                          <th className="py-2.5"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(showAllExpenses ? reportedExpenses : reportedExpenses.slice(0, 3)).map(exp => (
                          <tr key={exp.id} className="border-b border-[#e2e8f0]/20 hover:bg-[#FAF8F5]/50 dark:hover:bg-zinc-850/40 group">
                            <td className="py-3 font-extrabold text-[#0f172a] dark:text-white uppercase tracking-tight font-mono text-[10px]">{exp.category}</td>
                            <td className="py-3 font-bold text-[#64748b] dark:text-zinc-300 truncate max-w-[200px]">{exp.description || 'General category expenditure'}</td>
                            <td className="py-3 font-medium text-[#64748b]/80 dark:text-zinc-400 font-sans">{exp.date}</td>
                            <td className="py-3 font-extrabold font-mono text-rose-500">-{currencySymbol}{exp.amount.toLocaleString()}</td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => onDeleteExpense(exp.id)}
                                className="text-[#64748b]/60 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                aria-label="Delete expense"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {!showAllExpenses && reportedExpenses.length > 3 && (
                    <div className="mt-3 pt-3 border-t border-[#e2e8f0]/30 dark:border-zinc-800 text-center">
                      <button 
                        onClick={() => setShowAllExpenses(true)} 
                        className="text-[9px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-600 transition-colors"
                      >
                        See More Expenditures &rarr;
                      </button>
                    </div>
                  )}
                  {showAllExpenses && reportedExpenses.length > 3 && (
                    <div className="mt-3 pt-3 border-t border-[#e2e8f0]/30 dark:border-zinc-800 text-center">
                      <button 
                        onClick={() => setShowAllExpenses(false)} 
                        className="text-[9px] font-black uppercase tracking-wider text-[#64748b] hover:text-[#0f172a] transition-colors"
                      >
                        Collapse &uarr;
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------ TAB 4: BRAND NEW 'dashboard' BENTO HOME PREMIER VIEW ------------------ */}
        {activeTab === 'dashboard' && (() => {
          const records: { label: string; income: number; receivables: number }[] = [];
          const now = new Date();

          if (dashboardChartRange === '7d') {
            for (let i = 6; i >= 0; i--) {
              const d = new Date(now); d.setDate(now.getDate() - i);
              records.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, income: 0, receivables: 0 });
            }
            invoices.forEach(inv => {
              const d = new Date(inv.date); if (isNaN(d.getTime())) return;
              const lbl = `${d.getDate()}/${d.getMonth() + 1}`;
              const match = records.find(r => r.label === lbl);
              if (match) {
                if (inv.status === 'paid') match.income += inv.grandTotal;
                else if (inv.status === 'pending') match.receivables += inv.grandTotal;
              }
            });
          } else if (dashboardChartRange === '1m') {
            for (let i = 3; i >= 0; i--) {
              const wEnd = new Date(now); wEnd.setDate(now.getDate() - i * 7);
              const wStart = new Date(wEnd); wStart.setDate(wEnd.getDate() - 6);
              records.push({ label: `W${4 - i}`, income: 0, receivables: 0, _start: wStart, _end: wEnd } as any);
            }
            invoices.forEach(inv => {
              const d = new Date(inv.date); if (isNaN(d.getTime())) return;
              const match = (records as any[]).find(r => d >= r._start && d <= r._end);
              if (match) {
                if (inv.status === 'paid') match.income += inv.grandTotal;
                else if (inv.status === 'pending') match.receivables += inv.grandTotal;
              }
            });
          } else if (dashboardChartRange === 'all') {
            const minYearInv = invoices.length > 0 ? Math.min(...invoices.map(i => new Date(i.date).getFullYear())) : now.getFullYear();
            const startYear = Math.min(minYearInv, now.getFullYear());
            const endYear = now.getFullYear();
            const adjustedStart = (endYear - startYear < 2) ? endYear - 2 : startYear;
            for (let y = adjustedStart; y <= endYear; y++) {
              records.push({ label: y.toString(), income: 0, receivables: 0, _year: y } as any);
            }
            invoices.forEach(inv => {
              const d = new Date(inv.date); if (isNaN(d.getTime())) return;
              const match = (records as any[]).find(r => r._year === d.getFullYear());
              if (match) {
                if (inv.status === 'paid') match.income += inv.grandTotal;
                else if (inv.status === 'pending') match.receivables += inv.grandTotal;
              }
            });
          } else {
            const monthCount = dashboardChartRange === '3m' ? 3 : dashboardChartRange === '6m' ? 6 : 12;
            const monthsShort = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
            for (let i = monthCount - 1; i >= 0; i--) {
              const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
              records.push({ label: monthsShort[d.getMonth()], income: 0, receivables: 0, _month: d.getMonth(), _year: d.getFullYear() } as any);
            }
            invoices.forEach(inv => {
              const d = new Date(inv.date); if (isNaN(d.getTime())) return;
              const match = (records as any[]).find(r => r._month === d.getMonth() && r._year === d.getFullYear());
              if (match) {
                if (inv.status === 'paid') match.income += inv.grandTotal;
                else if (inv.status === 'pending') match.receivables += inv.grandTotal;
              }
            });
          }

          // SVG Line coordinates math
          const maxVal = Math.max(...records.map(d => Math.max(d.income, d.receivables)), 10000);
          const chartWidth = 500;
          const chartHeight = 160;
          const paddingX = 40;
          const paddingY = 20;
          const usableWidth = chartWidth - paddingX * 2;
          const usableHeight = chartHeight - paddingY * 2;

          const pointsEarnings = records.map((r, i) => ({
            x: paddingX + (i / (records.length - 1)) * usableWidth,
            y: chartHeight - paddingY - (r.income / maxVal) * usableHeight
          }));

          const pointsReceivables = records.map((r, i) => ({
            x: paddingX + (i / (records.length - 1)) * usableWidth,
            y: chartHeight - paddingY - (r.receivables / maxVal) * usableHeight
          }));

          const pathEarnings = pointsEarnings.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
          const pathReceivables = pointsReceivables.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

          const initials = profile.name ? profile.name.slice(0, 2).toUpperCase() : 'MK';

          const totalInvoicedDash = totalBilled + totalOutstanding;
          const earningsPct = totalInvoicedDash > 0 ? ((totalBilled / totalInvoicedDash) * 100).toFixed(1) + '%' : '0%';
          const receivablesPct = totalInvoicedDash > 0 ? ((totalOutstanding / totalInvoicedDash) * 100).toFixed(1) + '%' : '0%';
          const expensesPct = totalInvoicedDash > 0 ? ((totalReportedExpenses / totalInvoicedDash) * 100).toFixed(1) + '%' : '0%';
          const taxPct = totalInvoicedDash > 0 ? ((totalTax / totalInvoicedDash) * 100).toFixed(1) + '%' : '0%';

          return (
            <div className="space-y-6 text-sans animate-in fade-in duration-300">

              {/* KPI Cards Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                {/* Settled Earnings */}
                <div className="bg-white dark:bg-zinc-900 border-l-4 border-l-emerald-400 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl p-5 shadow-xs relative flex flex-col justify-between h-[155px]">
                  <div className="flex justify-between items-start">
                    <div className="w-8.5 h-8.5 rounded-full bg-[#ECFDF5] text-[#10B981] border border-[#A7F3D0] flex items-center justify-center font-black text-sm">
                      ₹
                    </div>
                    <span className="text-[10px] font-black text-[#10B981] bg-[#ECFDF5] border border-[#A7F3D0] px-2 py-0.5 rounded-full">
                      {earningsPct}
                    </span>
                  </div>
                  <div className="mt-3">
                    <span className="text-[9px] uppercase font-black tracking-wider text-[#64748b]/80 block">Settled Earnings</span>
                    <span className="text-xl font-black text-[#0f172a] dark:text-white mt-1 block font-mono">
                      {currencySymbol}{totalBilled.toLocaleString()}
                    </span>
                  </div>
                  {/* Sparkline bars */}
                  <div className="flex items-end gap-1 h-6 self-start mt-2">
                    <div className="w-1 bg-emerald-200 rounded-t-sm h-2" />
                    <div className="w-1 bg-emerald-300 rounded-t-sm h-3" />
                    <div className="w-1 bg-emerald-400 rounded-t-sm h-5" />
                    <div className="w-1 bg-emerald-300 rounded-t-sm h-3" />
                    <div className="w-1 bg-emerald-500 rounded-t-sm h-6" />
                  </div>
                </div>

                {/* Pending Receivables */}
                <div className="bg-white dark:bg-zinc-900 border-l-4 border-l-amber-400 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl p-5 shadow-xs relative flex flex-col justify-between h-[155px]">
                  <div className="flex justify-between items-start">
                    <div className="w-8.5 h-8.5 rounded-full bg-[#FFFBEB] text-[#F59E0B] border border-[#FEF3C7] flex items-center justify-center">
                      <CheckSquare className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black text-[#F59E0B] bg-[#FFFBEB] border border-[#FEF3C7] px-2 py-0.5 rounded-full">
                      {receivablesPct}
                    </span>
                  </div>
                  <div className="mt-3">
                    <span className="text-[9px] uppercase font-black tracking-wider text-[#64748b]/80 block">Pending Receivables</span>
                    <span className="text-xl font-black text-[#0f172a] dark:text-white mt-1 block font-mono">
                      {currencySymbol}{totalOutstanding.toLocaleString()}
                    </span>
                  </div>
                  {/* Sparkline bars */}
                  <div className="flex items-end gap-1 h-6 self-start mt-2">
                    <div className="w-1 bg-amber-200 rounded-t-sm h-4" />
                    <div className="w-1 bg-amber-300 rounded-t-sm h-2" />
                    <div className="w-1 bg-amber-400 rounded-t-sm h-5" />
                    <div className="w-1 bg-amber-500 rounded-t-sm h-6" />
                    <div className="w-1 bg-amber-300 rounded-t-sm h-3" />
                  </div>
                </div>

                {/* Operating Expenses */}
                <div className="bg-white dark:bg-zinc-900 border-l-4 border-l-rose-400 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl p-5 shadow-xs relative flex flex-col justify-between h-[155px]">
                  <div className="flex justify-between items-start">
                    <div className="w-8.5 h-8.5 rounded-full bg-[#FEF2F2] text-[#EF4444] border border-[#FEE2E2] flex items-center justify-center">
                      <MinusCircle className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black text-[#EF4444] bg-[#FEF2F2] border border-[#FEE2E2] px-2 py-0.5 rounded-full">
                      {expensesPct}
                    </span>
                  </div>
                  <div className="mt-3">
                    <span className="text-[9px] uppercase font-black tracking-wider text-[#64748b]/80 block">Operating Expenses</span>
                    <span className="text-xl font-black text-[#0f172a] dark:text-white mt-1 block font-mono">
                      {currencySymbol}{totalReportedExpenses.toLocaleString()}
                    </span>
                  </div>
                  {/* Sparkline bars */}
                  <div className="flex items-end gap-1 h-6 self-start mt-2">
                    <div className="w-1 bg-rose-500 rounded-t-sm h-6" />
                    <div className="w-1 bg-rose-300 rounded-t-sm h-3" />
                    <div className="w-1 bg-rose-400 rounded-t-sm h-5" />
                    <div className="w-1 bg-rose-200 rounded-t-sm h-2" />
                    <div className="w-1 bg-rose-400 rounded-t-sm h-4" />
                  </div>
                </div>

                {/* Tax Liabilities */}
                <div className="bg-white dark:bg-zinc-900 border-l-4 border-l-sky-400 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl p-5 shadow-xs relative flex flex-col justify-between h-[155px]">
                  <div className="flex justify-between items-start">
                    <div className="w-8.5 h-8.5 rounded-full bg-[#F0F9FF] text-[#0284C7] border border-[#BAE6FD] flex items-center justify-center">
                      <Percent className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black text-[#0284C7] bg-[#F0F9FF] border border-[#BAE6FD] px-2 py-0.5 rounded-full">
                      {taxPct}
                    </span>
                  </div>
                  <div className="mt-3">
                    <span className="text-[9px] uppercase font-black tracking-wider text-[#64748b]/80 block">Tax Liabilities</span>
                    <span className="text-xl font-black text-[#0f172a] dark:text-white mt-1 block font-mono">
                      {currencySymbol}{totalTax.toLocaleString()}
                    </span>
                  </div>
                  {/* Sparkline bars */}
                  <div className="flex items-end gap-1 h-6 self-start mt-2">
                    <div className="w-1 bg-sky-200 rounded-t-sm h-3" />
                    <div className="w-1 bg-sky-300 rounded-t-sm h-5" />
                    <div className="w-1 bg-sky-400 rounded-t-sm h-2" />
                    <div className="w-1 bg-sky-500 rounded-t-sm h-6" />
                    <div className="w-1 bg-sky-300 rounded-t-sm h-4" />
                  </div>
                </div>
              </div>

              {/* Chart & Donut Middle Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.72fr_1.28fr] gap-6">
                {/* Revenue Intelligence Line Chart */}
                <div className="bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                  <div className="flex justify-between items-start pb-4 border-b border-[#e2e8f0]/30 dark:border-zinc-800 flex-wrap gap-2">
                    <div>
                      <h3 className="text-sm font-black text-[#0f172a] dark:text-white uppercase tracking-tight">Revenue Intelligence</h3>
                      <span className="text-[10px] text-[#64748b]/80 dark:text-zinc-400 block mt-0.5">Comparative analysis of earnings vs unpaid receivables</span>
                      {/* Interval dropdown selector */}
                      <div className="mt-2 w-fit">
                        <select
                          value={dashboardChartRange}
                          onChange={(e) => {
                            setDashboardChartRange(e.target.value as any);
                            setHoveredDashboardChartIndex(null);
                          }}
                          className="px-3.5 py-1.5 bg-[#FCFAF7] dark:bg-zinc-950 border border-[#e2e8f0] hover:border-[#C6A87D] focus:border-[#0f172a] dark:border-zinc-700 dark:focus:border-zinc-500 rounded-lg text-[10px] font-black uppercase tracking-wider text-[#0f172a] dark:text-zinc-300 focus:outline-none cursor-pointer transition-colors duration-150"
                          style={{ boxShadow: 'inset 0 1px 3px rgba(110,96,80,0.08)' }}
                        >
                          <option value="7d">7 Days</option>
                          <option value="1m">Monthly</option>
                          <option value="3m">Quarterly</option>
                          <option value="6m">Half Year</option>
                          <option value="1y">Yearly</option>
                          <option value="all">All Years</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-wider text-[#64748b]/80 dark:text-zinc-400 mt-1">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-0.5 bg-[#0f172a]" /> EARNINGS
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-0.5 border-t border-dashed border-[#C6A87D]" /> RECEIVABLES
                      </span>
                    </div>
                  </div>

                  <div className="w-full select-none mt-2">
                    <svg className="w-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`} fill="none" preserveAspectRatio="xMidYMid meet">
                      {/* Grid Lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                        const y = paddingY + ratio * usableHeight;
                        const labelValue = Math.round(maxVal - (ratio * maxVal));
                        return (
                          <g key={`grid-${i}`}>
                            <line x1={paddingX} y1={y} x2={chartWidth - paddingX} y2={y} stroke="#e2e8f0" strokeWidth="0.5" strokeOpacity="0.4" />
                            <text x={paddingX - 10} y={y + 3} textAnchor="end" className="text-[8px] font-mono fill-[#64748b]/70">
                              {labelValue >= 1000 ? `${(labelValue / 1000).toFixed(0)}k` : labelValue}
                            </text>
                          </g>
                        );
                      })}

                      {/* Vertical guidance line on hover */}
                      {hoveredDashboardChartIndex !== null && pointsEarnings[hoveredDashboardChartIndex] && (
                        <line 
                          x1={pointsEarnings[hoveredDashboardChartIndex].x} 
                          y1={paddingY} 
                          x2={pointsEarnings[hoveredDashboardChartIndex].x} 
                          y2={chartHeight - paddingY} 
                          stroke="#C6A87D" 
                          strokeWidth="1" 
                          strokeDasharray="2 2"
                          className="opacity-75"
                        />
                      )}

                      {/* Line paths */}
                      <path d={pathEarnings} fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                      <path d={pathReceivables} fill="none" stroke="#C6A87D" strokeWidth="1.8" strokeDasharray="3 3" strokeLinecap="round" />

                      {/* Dot indicators */}
                      {pointsEarnings.map((pts, i) => (
                        <circle 
                          key={`act-dot-${i}`} 
                          cx={pts.x} 
                          cy={pts.y} 
                          r={hoveredDashboardChartIndex === i ? "4.5" : "3"} 
                          fill="#0f172a" 
                          stroke="#fff" 
                          strokeWidth={hoveredDashboardChartIndex === i ? "1.5" : "1"} 
                          className="transition-all"
                        />
                      ))}
                      {pointsReceivables.map((pts, i) => (
                        <circle 
                          key={`proj-dot-${i}`} 
                          cx={pts.x} 
                          cy={pts.y} 
                          r={hoveredDashboardChartIndex === i ? "4.5" : "3"} 
                          fill="#C6A87D" 
                          stroke="#fff" 
                          strokeWidth={hoveredDashboardChartIndex === i ? "1.5" : "1"} 
                          className="transition-all"
                        />
                      ))}

                      {/* Bottom months labels */}
                      {records.map((r, i) => {
                        const x = paddingX + (i / (records.length - 1)) * usableWidth;
                        const isHovered = hoveredDashboardChartIndex === i;
                        return (
                          <text 
                            key={`lbl-chart-${i}`} 
                            x={x} 
                            y={chartHeight - 4} 
                            textAnchor="middle" 
                            className={`text-[9px] font-mono transition-all ${isHovered ? 'font-black fill-[#0f172a]' : 'font-bold fill-[#64748b]/80'}`}
                          >
                            {r.label}
                          </text>
                        );
                      })}

                      {/* Interactive Transparent Hover zones */}
                      {records.map((_, i) => {
                        const colWidth = usableWidth / (records.length - 1);
                        const x = paddingX + i * colWidth - colWidth / 2;
                        return (
                          <rect
                            key={`hover-zone-${i}`}
                            x={i === 0 ? paddingX : x}
                            y={paddingY}
                            width={i === 0 || i === records.length - 1 ? colWidth / 2 : colWidth}
                            height={usableHeight}
                            fill="transparent"
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredDashboardChartIndex(i)}
                            onMouseLeave={() => setHoveredDashboardChartIndex(null)}
                            onTouchStart={() => setHoveredDashboardChartIndex(i)}
                            onClick={() => setHoveredDashboardChartIndex(i)}
                          />
                        );
                      })}

                      {/* Tooltip render overlay */}
                      {hoveredDashboardChartIndex !== null && records[hoveredDashboardChartIndex] && (() => {
                        const rec = records[hoveredDashboardChartIndex];
                        const pt = pointsEarnings[hoveredDashboardChartIndex] || { x: 250, y: 80 };
                        const tooltipWidth = 115;
                        const tooltipHeight = 44;
                        let tooltipX = pt.x - tooltipWidth / 2;
                        if (tooltipX < paddingX) tooltipX = paddingX;
                        if (tooltipX + tooltipWidth > chartWidth - paddingX) tooltipX = chartWidth - paddingX - tooltipWidth;
                        const tooltipY = Math.max(paddingY - 5, pt.y - tooltipHeight - 8);

                        return (
                          <g transform={`translate(${tooltipX}, ${tooltipY})`} className="pointer-events-none filter drop-shadow-[0_2px_4px_rgba(110,96,80,0.12)]">
                            <rect 
                              width={tooltipWidth} 
                              height={tooltipHeight} 
                              rx="6" 
                              fill="rgba(35, 32, 29, 0.95)" 
                              stroke="#e2e8f0"
                              strokeWidth="0.5"
                            />
                            <text x="8" y="12" fill="#e2e8f0" className="text-[8px] font-black uppercase tracking-wider font-mono">{rec.label}</text>
                            <text x="8" y="24" fill="#10B981" className="text-[8px] font-bold font-mono">
                              Earn: {currencySymbol}{rec.income.toLocaleString()}
                            </text>
                            <text x="8" y="34" fill="#F59E0B" className="text-[8px] font-bold font-mono">
                              Due: {currencySymbol}{rec.receivables.toLocaleString()}
                            </text>
                          </g>
                        );
                      })()}
                    </svg>
                  </div>
                </div>

                {/* Donut Chart: Revenue Segments */}
                <div className="bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-black text-[#0f172a] dark:text-white uppercase tracking-tight">Revenue Segments</h3>
                  </div>

                  {(() => {
                    const totalExpensesVal = expenses.reduce((sum, exp) => sum + exp.amount, 0);
                    const segTotal = totalBilled + totalOutstanding + totalExpensesVal + totalTax || 1;
                    const c = 440; // circumference
                    const earnDash = (totalBilled / segTotal) * c;
                    const recvDash = (totalOutstanding / segTotal) * c;
                    const expDash = (totalExpensesVal / segTotal) * c;
                    const taxDash = (totalTax / segTotal) * c;

                    return (
                      <>
                        <div className="flex flex-col items-center justify-center py-4 relative">
                          <svg className="w-36 h-36" viewBox="0 0 200 200">
                            {/* Base track */}
                            <circle cx="100" cy="100" r="70" fill="none" stroke="#F1EDE6" strokeWidth="18" />
                            
                            {/* Earnings — emerald */}
                            <circle 
                              cx="100" cy="100" r="70" fill="none" stroke="#10B981" strokeWidth="18" 
                              strokeDasharray={`${earnDash} ${c}`} strokeDashoffset="0" 
                              strokeLinecap="round" className="transform -rotate-90 origin-center transition-all duration-500" 
                            />
                            
                            {/* Receivables — amber */}
                            <circle 
                              cx="100" cy="100" r="70" fill="none" stroke="#F59E0B" strokeWidth="18" 
                              strokeDasharray={`${recvDash} ${c}`} strokeDashoffset={`-${earnDash}`} 
                              strokeLinecap="round" className="transform -rotate-90 origin-center transition-all duration-500" 
                            />

                            {/* Expenses — rose */}
                            <circle 
                              cx="100" cy="100" r="70" fill="none" stroke="#F43F5E" strokeWidth="18" 
                              strokeDasharray={`${expDash} ${c}`} strokeDashoffset={`-${earnDash + recvDash}`} 
                              strokeLinecap="round" className="transform -rotate-90 origin-center transition-all duration-500" 
                            />

                            {/* Taxes — sky */}
                            <circle 
                              cx="100" cy="100" r="70" fill="none" stroke="#38BDF8" strokeWidth="18" 
                              strokeDasharray={`${taxDash} ${c}`} strokeDashoffset={`-${earnDash + recvDash + expDash}`} 
                              strokeLinecap="round" className="transform -rotate-90 origin-center transition-all duration-500" 
                            />

                            {/* Total inside circle */}
                            <text x="100" y="98" textAnchor="middle" className="text-[13px] font-black fill-[#0f172a] dark:fill-white">
                              {currencySymbol}{(segTotal >= 1000 ? (segTotal / 1000).toFixed(1) + 'k' : (segTotal === 1 ? '0' : segTotal))}
                            </text>
                            <text x="100" y="116" textAnchor="middle" className="text-[9px] font-black uppercase tracking-wider fill-[#64748b]/80">
                              TOTAL
                            </text>
                          </svg>
                        </div>

                        {/* Legend list */}
                        <div className="grid grid-cols-2 gap-x-2 gap-y-3 text-[10px] font-bold text-[#64748b]/90 dark:text-zinc-400 mt-2 px-2">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="flex items-center gap-1.5 whitespace-nowrap">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" /> Earnings
                            </span>
                            <span className="font-extrabold text-[#0f172a] dark:text-white">{Math.round((totalBilled / segTotal) * 100)}%</span>
                          </div>
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="flex items-center gap-1.5 whitespace-nowrap">
                              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" /> Receivables
                            </span>
                            <span className="font-extrabold text-[#0f172a] dark:text-white">{Math.round((totalOutstanding / segTotal) * 100)}%</span>
                          </div>
                          <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-[#e2e8f0]/40 dark:border-zinc-800">
                            <span className="flex items-center gap-1.5 whitespace-nowrap">
                              <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" /> Expenses
                            </span>
                            <span className="font-extrabold text-[#0f172a] dark:text-white">{Math.round((totalExpensesVal / segTotal) * 100)}%</span>
                          </div>
                          <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-[#e2e8f0]/40 dark:border-zinc-800">
                            <span className="flex items-center gap-1.5 whitespace-nowrap">
                              <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" /> Taxes
                            </span>
                            <span className="font-extrabold text-[#0f172a] dark:text-white">{Math.round((totalTax / segTotal) * 100)}%</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Bottom Records Table & Compliance Protocol Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.72fr_1.28fr] gap-6">
                {/* Recent Billing Table */}
                <div className="bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                  <div className="flex justify-between items-center pb-4 border-b border-[#e2e8f0]/45 dark:border-zinc-800">
                    <h3 className="text-sm font-black text-[#0f172a] dark:text-white uppercase tracking-tight">Recent Billing Records</h3>
                    <button 
                      onClick={() => setActiveTab('invoices')}
                      className="text-[10px] font-black text-[#64748b] hover:text-[#0f172a] uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                    >
                      View All Records →
                    </button>
                  </div>

                  <div className="w-full overflow-x-auto mt-3">
                    {invoices.length === 0 ? (
                      <div className="py-12 text-center">
                        <p className="text-xs text-[#64748b]/80 font-medium">Generate your first invoice to view records here!</p>
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="text-[10px] font-black uppercase text-[#64748b]/60 tracking-wider border-b border-[#e2e8f0]/30">
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
                            <tr key={inv.id} className="border-b border-[#e2e8f0]/20 hover:bg-[#FAF8F5]/50 dark:hover:bg-zinc-850/40">
                              <td className="py-3 font-extrabold text-[#0f172a] dark:text-white">{inv.invoiceNumber}</td>
                              <td className="py-3 font-bold text-[#64748b] dark:text-zinc-300 truncate max-w-[120px]">{inv.clientName}</td>
                              <td className="py-3 font-medium text-[#64748b]/80 dark:text-zinc-400 font-sans">{inv.dueDate || inv.date}</td>
                              <td className="py-3 font-extrabold font-mono text-[#0f172a] dark:text-white">{currencySymbol}{inv.grandTotal.toLocaleString()}</td>
                              <td className="py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${getStatusColor(inv.status)}`}>
                                  {inv.status}
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                <button 
                                  onClick={() => setActivePreviewInvoice(inv)}
                                  className="text-[#64748b] hover:text-[#0f172a] p-1 cursor-pointer"
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
          <div className="space-y-6 animate-in fade-in duration-200 w-full">

            {/* Page Header */}
            <div>
              <h1 className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                <span className="bg-gradient-to-r from-[#0f172a] to-[#64748b] bg-clip-text text-transparent dark:from-white dark:to-[#e2e8f0]">User Guide</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              </h1>
              <p className="text-[10px] text-[#64748b]/80 dark:text-zinc-400 mt-0.5">App usage documentation, billing policies, and company invoicing standards</p>
            </div>

            {/* Quick nav pills */}
            <div className="w-full overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-2 bg-[#FCFAF7]/50 dark:bg-zinc-950/20 p-2 rounded-2xl border border-[#e2e8f0]/30 dark:border-zinc-800 min-w-max sm:min-w-0 sm:flex-wrap">
                <span className="text-[9px] font-black text-[#64748b]/60 dark:text-zinc-500 uppercase tracking-widest pl-2 shrink-0">Jump to:</span>
                {['Getting Started', 'App Walkthrough', 'Billing Policies', 'Tax & Compliance', 'Tips & Shortcuts'].map((label, i) => (
                  <a
                    key={label}
                    href={`#learn-section-${i}`}
                    className="px-3 py-1 bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-lg text-[10px] font-bold text-[#64748b] dark:text-zinc-400 hover:border-[#64748b]/50 hover:text-[#0f172a] dark:hover:text-white transition-all cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>

            {/* Asymmetric Bento Grid Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Bento Card 1: Part A (App Walkthrough) — Spans 2 Columns */}
              <div id="learn-section-0" className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between">
                <div className="relative">
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 via-sky-400 to-amber-500" />
                  <div className="p-5 border-b border-[#e2e8f0]/30 dark:border-zinc-800 flex flex-wrap justify-between items-center gap-2 bg-[#FCFAF7]/20">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest rounded">Part A</span>
                      <h2 className="text-[11px] font-black text-[#0f172a] dark:text-white uppercase tracking-wide">Structural Walkthrough</h2>
                    </div>
                    <span className="text-[9px] text-[#64748b] font-black uppercase tracking-wider">6 Modules</span>
                  </div>
                </div>

                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-1">
                  {[
                    { step: '01', title: 'Set Up Your Profile', desc: 'Click your avatar in the top-right corner, open Profile, and enter company name, GSTIN, logo, and bank accounts. This info prints directly on PDF invoices.' },
                    { step: '02', title: 'Build Client Ledger', desc: 'Go to Clients from the sidebar. Save repeating corporate accounts with billing addresses to enable rapid dropdown injection when generating new bills.' },
                    { step: '03', title: 'Create an Invoice', desc: 'Click "New Invoice" on the dashboard. Choose a registered client, add HSN/SAC codes, quantities, and rates. The calculations update instantly.' },
                    { step: '04', title: 'Export & Deliver', desc: 'Download clean PDF bills using the download button, print directly, or export collective XLSX summaries from the Reports ledger tab.' },
                    { step: '05', title: 'Track Payment Status', desc: 'Mark bills as Paid, Unpaid, or Overdue. Your dashboard intelligence metrics will update automatically based on active statuses.' },
                    { step: '06', title: 'Sync Across Devices', desc: 'Authenticate your account to activate instant Supabase cloud synchronization. Retrieve your clients and templates from any modern browser.' },
                  ].map((item, idx) => {
                    const stepColors = ['bg-emerald-500', 'bg-sky-500', 'bg-amber-500', 'bg-violet-500', 'bg-rose-500', 'bg-teal-500'];
                    return (
                      <div key={item.step} className="flex gap-3.5 p-4 bg-[#FCFAF7]/40 dark:bg-zinc-950/40 border border-[#e2e8f0]/30 dark:border-zinc-800 rounded-xl hover:border-[#64748b]/30 hover:bg-[#FCFAF7]/80 transition-all duration-200 group">
                        <div className={`flex-shrink-0 w-7 h-7 rounded-lg ${stepColors[idx]} text-white flex items-center justify-center font-black text-[10px] shadow-2xs`}>
                          {item.step}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[11px] font-black text-[#0f172a] dark:text-zinc-100 block mb-1">{item.title}</span>
                          <p className="text-[10.5px] text-[#64748b]/80 dark:text-zinc-500 leading-relaxed font-medium">{item.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bento Card 2: Quick Tips & Protocol Checklist — Spans 1 Column */}
              <div id="learn-section-4" className="bg-[#FCFAF7] dark:bg-zinc-900/50 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-[#64748b]" />
                
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-[#e2e8f0]/40 dark:border-zinc-800 pb-3">
                    <span className="text-[10px] font-black text-[#0f172a] dark:text-white uppercase tracking-wider">Quick Utilities</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  </div>

                  {[
                    { title: 'Keyboard Controls', tip: 'Use browser Ctrl+P to print and save clean layout copies directly.' },
                    { title: 'Sidebar Toggle', tip: 'Click the collapse button to lock labels and gain workspace size.' },
                    { title: 'Tax Auditing', tip: 'Always cross-verify client GSTIN formats before printing tax summaries.' }
                  ].map((tip, idx) => (
                    <div key={tip.title} className="space-y-1 bg-white dark:bg-zinc-950 p-3 rounded-xl border border-[#e2e8f0]/30 dark:border-zinc-800 hover:border-[#64748b]/35 transition-colors">
                      <span className="text-[10.5px] font-black text-[#0f172a] dark:text-zinc-200 uppercase tracking-wide block">{tip.title}</span>
                      <p className="text-[10.5px] text-[#64748b]/85 dark:text-zinc-550 leading-relaxed font-medium">{tip.tip}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 pt-3 border-t border-[#e2e8f0]/40 dark:border-zinc-800 text-[10px] text-[#64748b]/75 font-semibold leading-relaxed">
                  Refer to local jurisdiction rules for official GST formatting regulations.
                </div>
              </div>

              {/* Bento Card 3: Part B (Company Policies) — Spans 3 Columns */}
              <div id="learn-section-2" className="lg:col-span-3 bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
                <div className="relative">
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-400 via-rose-400 to-[#64748b]" />
                  <div className="p-5 border-b border-[#e2e8f0]/30 dark:border-zinc-800 flex flex-wrap justify-between items-center gap-2 bg-[#FCFAF7]/20">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 bg-[#64748b] text-white text-[8px] font-black uppercase tracking-widest rounded">Part B</span>
                      <h2 className="text-[11px] font-black text-[#0f172a] dark:text-white uppercase tracking-wide">Corporate Billing Regulations & Terms</h2>
                    </div>
                    <span className="text-[9px] text-[#64748b] font-black uppercase tracking-wider">5 Standards</span>
                  </div>
                </div>

                <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { title: 'Payment Terms — Net-15', body: 'All published invoices operate under Net-15 intervals. Completed transactions must be processed via our approved corporate banking or dynamic QR codes within 15 calendar days from billing date.' },
                    { title: 'Late Payment Penalties', body: 'Overdue invoices past the Net-15 window are subject to calculated interest fees governed by standard company guidelines. Notifications will be dispatched prior to calculation.' },
                    { title: 'Tax & GST Compliance', body: 'Taxes are processed based on regional boundaries. Same-state operations apply CGST + SGST; interstate supplies apply IGST. Place of Supply is determined from active registry.' },
                    { title: 'Disputes & Revisions', body: 'Discrepancy claims must be submitted to accounting within 7 business days from receipt. Past this window, invoice figures are considered finalized and accepted.' },
                    { title: 'Confidentiality of Financials', body: 'Billing metrics, client registry ledgers, and company tax data are protected by database row-level security policies and are never shared with external agencies.' }
                  ].map((policy, idx) => {
                    const borderColors = ['border-emerald-400', 'border-rose-400', 'border-sky-400', 'border-amber-400', 'border-violet-400'];
                    const dotColors = ['bg-emerald-400', 'bg-rose-400', 'bg-sky-400', 'bg-amber-400', 'bg-violet-400'];
                    return (
                      <div key={policy.title} className={`flex gap-3.5 p-4 border-l-2 border-[#e2e8f0] dark:border-zinc-700 hover:${borderColors[idx]} hover:bg-[#FCFAF7]/40 dark:hover:bg-zinc-950/40 rounded-r-xl transition-all group`}>
                        <div className={`flex-shrink-0 w-5.5 h-5.5 rounded-full ${dotColors[idx]} text-white flex items-center justify-center font-black text-[9px] shadow-2xs`}>
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10.5px] font-black text-[#0f172a] dark:text-zinc-200 uppercase tracking-wide block mb-1">{policy.title}</span>
                          <p className="text-[10.5px] text-[#64748b]/80 dark:text-zinc-550 leading-relaxed font-medium">{policy.body}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
            <div className="flex items-start gap-3 px-4 py-3.5 bg-[#FCFAF7] dark:bg-zinc-950 border border-[#e2e8f0]/40 dark:border-zinc-800 rounded-xl text-[10.5px] text-[#64748b]/80 dark:text-zinc-500">
              <Info className="w-4 h-4 text-[#64748b] flex-shrink-0 mt-0.5 hidden sm:block" />
              <span>This documentation applies to MakInvoices v1.2. For technical support, open the <strong className="text-[#0f172a] dark:text-zinc-300">Help & Support</strong> page from the profile menu. Policies are subject to periodic updates — last revised July 2025.</span>
            </div>

          </div>
        )}

        {/* ------------------ TAB 6: BRAND NEW 'profile' BRAND VIEW ------------------ */}
        {activeTab === 'profile' && (
          <div className="space-y-6 text-sans animate-in fade-in duration-200 w-full">
            {/* 2-Column Bento Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Creator Identity card */}
              <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 p-6 sm:p-8 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#e2e8f0] via-[#C6A87D] to-[#64748b]" />
                
                <div>
                  <div className="flex items-center gap-5 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-[#f8fafc] dark:bg-zinc-800 text-[#64748b] dark:text-[#EADFCF] flex items-center justify-center shadow-sm border border-[#e2e8f0]/80 dark:border-zinc-700 overflow-hidden flex-shrink-0">
                      {profile.logoUrl ? (
                        <img src={profile.logoUrl} referrerPolicy="no-referrer" alt={profile.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-8 h-8" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-base font-black text-[#0f172a] dark:text-white uppercase tracking-tight">{profile.name || 'My Invoice Studio'}</h2>
                      <span className="text-[10px] text-[#64748b] font-mono block mt-0.5">{profile.email || 'No email established'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-[#FCFAF7] dark:bg-zinc-950 p-4 rounded-xl border border-[#e2e8f0]/40 dark:border-zinc-800/80">
                      <span className="text-[9px] uppercase font-extrabold text-[#64748b]/75 dark:text-zinc-500 block">LLC Brand Registry</span>
                      <span className="text-xs font-bold text-[#0f172a] dark:text-zinc-200 mt-1 block truncate">{profile.name || 'Sole Proprietorship'}</span>
                    </div>
                    <div className="bg-[#FCFAF7] dark:bg-zinc-950 p-4 rounded-xl border border-[#e2e8f0]/40 dark:border-zinc-800/80">
                      <span className="text-[9px] uppercase font-extrabold text-[#64748b]/75 dark:text-zinc-500 block">Tax Registry (GSTIN)</span>
                      <span className="text-xs font-bold text-[#0f172a] dark:text-zinc-200 mt-1 block truncate font-mono">{profile.taxId || 'Not Configured'}</span>
                    </div>
                    <div className="bg-[#FCFAF7] dark:bg-zinc-950 p-4 rounded-xl border border-[#e2e8f0]/40 dark:border-zinc-800/80">
                      <span className="text-[9px] uppercase font-extrabold text-[#64748b]/75 dark:text-zinc-500 block">Primary currency</span>
                      <span className="text-xs font-bold text-[#0f172a] dark:text-zinc-200 mt-1 block">{profile.currency || 'INR'} ({currencySymbol})</span>
                    </div>
                    <div className="bg-[#FCFAF7] dark:bg-zinc-950 p-4 rounded-xl border border-[#e2e8f0]/40 dark:border-zinc-800/80">
                      <span className="text-[9px] uppercase font-extrabold text-[#64748b]/75 dark:text-zinc-500 block">Mobile Number</span>
                      <span className="text-xs font-bold text-[#0f172a] dark:text-zinc-200 mt-1 block truncate">{profile.mobile || profile.phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-[#e2e8f0]/30 dark:border-zinc-800 flex items-center justify-between">
                  <div className="text-left">
                    <span className="text-[10px] uppercase font-extrabold text-[#64748b]/75 dark:text-zinc-500 block">Creator Settings</span>
                    <p className="text-[10px] text-[#0f172a]/80 dark:text-zinc-400 mt-0.5 font-medium leading-normal">Customize your brand names, billing information, signature sketchpad, and bank details.</p>
                  </div>
                  <button
                    onClick={onOpenProfile}
                    className="px-5 py-2.5 bg-[#88765C] hover:bg-[#5C5043] text-[#FCFAF7] text-[10.5px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs hover:shadow-sm flex-shrink-0"
                  >
                    <PenTool className="w-3.5 h-3.5 text-white/80" />
                    <span>Customize Details</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Security and Session details */}
              <div className="bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 p-6 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#C6A87D] to-[#64748b]" />
                
                <div>
                  <h3 className="text-xs font-black text-[#0f172a] dark:text-white uppercase tracking-widest mb-4">Access Control & PIN</h3>
                  
                  <div className="bg-[#FCFAF7] dark:bg-zinc-950 p-4 rounded-xl border border-[#e2e8f0]/40 dark:border-zinc-800/80 mb-4">
                    <span className="text-[9px] uppercase font-extrabold text-[#64748b] block">PIN Passcode Lock</span>
                    <p className="text-[10px] text-[#0f172a]/85 dark:text-zinc-400 mt-1 leading-normal font-medium">Requires a secure 4-digit PIN code on app refresh to prevent unauthorized local database access.</p>
                    
                    <button
                      type="button"
                      onClick={() => onToggleSecurity('pin')}
                      className={`mt-4 w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-3xs ${
                        isPinLockEnabled 
                          ? 'bg-rose-500 hover:bg-rose-600 text-white' 
                          : 'bg-[#EADFCF] hover:bg-[#e2e8f0] text-[#0f172a]'
                      }`}
                    >
                      {isPinLockEnabled ? 'Disable PIN Lock' : 'Enable PIN Lock'}
                    </button>
                  </div>

                  <div className="bg-[#FCFAF7] dark:bg-zinc-950 p-4 rounded-xl border border-[#e2e8f0]/40 dark:border-zinc-800/80">
                    <span className="text-[9px] uppercase font-extrabold text-[#64748b] block">Database Status</span>
                    <div className="mt-2 space-y-1.5">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-[#0f172a] dark:text-zinc-400 font-medium">Local Ledger</span>
                        <span className="font-mono font-bold text-emerald-500">Active</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-[#0f172a] dark:text-zinc-400 font-medium">Cloud Synchronizer</span>
                        <span className="font-mono font-bold text-emerald-500">Synced</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#e2e8f0]/30 dark:border-zinc-800 text-[9.5px] text-[#64748b]/80 dark:text-zinc-450 text-center font-mono">
                  Invoice Studio Pro v1.2.0
                </div>
              </div>
            </div>

            {/* Row 2: Banking, Presets, and Address Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Bank Settlement & Signature Details */}
              <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 p-6 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-[#C6A87D]" />
                
                <div>
                  <h3 className="text-xs font-black text-[#0f172a] dark:text-white uppercase tracking-widest mb-4">Bank Settlement & Signature</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Bank Details */}
                    <div className="space-y-3 bg-[#FCFAF7] dark:bg-zinc-950 p-4 rounded-xl border border-[#e2e8f0]/40 dark:border-zinc-800/80">
                      <span className="text-[9px] uppercase font-extrabold text-[#64748b] block">Direct Transfer Account</span>
                      
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-[#64748b]/80">Bank</span>
                          <span className="font-bold text-[#0f172a] dark:text-zinc-200">{profile.bankName || 'Not Set'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64748b]/80">Account No.</span>
                          <span className="font-mono font-bold text-[#0f172a] dark:text-zinc-200">{profile.accountNumber || 'Not Set'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64748b]/80">IFSC Code</span>
                          <span className="font-mono font-bold text-[#0f172a] dark:text-zinc-200">{profile.ifsc || 'Not Set'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64748b]/80">UPI Address</span>
                          <span className="font-mono font-bold text-[#0f172a] dark:text-zinc-200">{profile.upiId || 'Not Set'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Signature Preview */}
                    <div className="bg-[#FCFAF7] dark:bg-zinc-950 p-4 rounded-xl border border-[#e2e8f0]/40 dark:border-zinc-800/80 flex flex-col justify-between min-h-[140px]">
                      <div>
                        <span className="text-[9px] uppercase font-extrabold text-[#64748b] block">Authorized Signature</span>
                        <p className="text-[10px] text-[#0f172a]/80 dark:text-zinc-400 mt-1 leading-normal font-medium">Applied automatically to newly generated billing sheets.</p>
                      </div>
                      
                      <div className="mt-3 flex items-center justify-center bg-white dark:bg-zinc-900 border border-[#e2e8f0]/30 dark:border-zinc-800 rounded-lg p-2 h-16 relative overflow-hidden">
                        {profile.signature ? (
                          <img src={profile.signature} alt="Signature Preview" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <span className="text-[10px] text-[#64748b]/50 uppercase tracking-wider font-bold">No Signature Configured</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[#e2e8f0]/30 dark:border-zinc-800 flex justify-between items-center text-[10px]">
                  <span className="text-[#64748b]/80">Legal Entity Status</span>
                  <span className="font-bold text-[#0f172a] dark:text-zinc-200">{profile.pan ? `PAN: ${profile.pan}` : 'PAN Not Registered'}</span>
                </div>
              </div>

              {/* Physical Location details */}
              <div className="bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 p-6 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-[#64748b]" />
                
                <div>
                  <h3 className="text-xs font-black text-[#0f172a] dark:text-white uppercase tracking-widest mb-4">Location & Presets</h3>
                  
                  <div className="bg-[#FCFAF7] dark:bg-zinc-950 p-4 rounded-xl border border-[#e2e8f0]/40 dark:border-zinc-800/80 mb-4">
                    <span className="text-[9px] uppercase font-extrabold text-[#64748b] block">Registered Address</span>
                    <p className="text-xs text-[#0f172a] dark:text-zinc-300 font-medium leading-relaxed mt-2 whitespace-pre-line">
                      {profile.address || 'No registered business address set.'}
                    </p>
                    {profile.state && (
                      <div className="mt-2 pt-2 border-t border-[#e2e8f0]/20 dark:border-zinc-800 flex justify-between text-[10px]">
                        <span className="text-[#64748b]/80">State / Region</span>
                        <span className="font-bold text-[#0f172a] dark:text-zinc-200">{profile.state} ({profile.stateCode || 'N/A'})</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-[#FCFAF7] dark:bg-zinc-950 p-4 rounded-xl border border-[#e2e8f0]/40 dark:border-zinc-800/80">
                    <span className="text-[9px] uppercase font-extrabold text-[#64748b] block">Billing Preferences</span>
                    <div className="mt-2 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#64748b]/80">Invoice Prefix</span>
                        <span className="font-mono font-bold text-[#0f172a] dark:text-zinc-200">{profile.invoicePrefix || 'Not Set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748b]/80">Starting Number</span>
                        <span className="font-mono font-bold text-[#0f172a] dark:text-zinc-200">{profile.startingInvoiceNumber || '0001'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#e2e8f0]/30 dark:border-zinc-800 text-[10px] flex justify-between">
                  <span className="text-[#64748b]/80">Website</span>
                  <a href={profile.website ? (profile.website.startsWith('http') ? profile.website : `https://${profile.website}`) : '#'} target="_blank" rel="noreferrer" className="font-bold text-[#64748b] hover:underline truncate max-w-[150px]">
                    {profile.website || 'Not Configured'}
                  </a>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ------------------ TAB: SETTINGS ------------------ */}
        {activeTab === 'settings' && (
          <SettingsPage
            theme={theme}
            toggleTheme={toggleTheme}
            profile={profile}
            isPinLockEnabled={isPinLockEnabled}
            onToggleSecurity={onToggleSecurity}
            onLogout={onLogout}
          />
        )}

        {/* ------------------ TAB: SUPPORT ------------------ */}
        {activeTab === 'support' && (
          <SupportPage onChatClick={() => setActiveTab('support-chat')} />
        )}

        {/* ------------------ TAB: SUPPORT CHAT ------------------ */}
        {activeTab === 'support-chat' && (
          <SupportChatPage 
            userEmail={userEmail} 
            onBack={() => setActiveTab('support')} 
            onEscalate={(sub, desc) => {
              setActiveTab('support');
              // Optionally trigger some toast or prefill support page logic
            }} 
          />
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
                  const _tick = templateUpdateTick; // Force re-render on tick
                  if (activePreviewInvoice.embeddedTemplate) {
                    return activePreviewInvoice.embeddedTemplate;
                  }
                  
                  // For very old invoices that didn't have selectedCustomTemplateId, map their selectedTemplateStyle
                  if (!activePreviewInvoice.selectedCustomTemplateId && activePreviewInvoice.selectedTemplateStyle) {
                    const style = activePreviewInvoice.selectedTemplateStyle.toLowerCase();
                    if (style === 'minimal') return TEMPLATE_PRESETS.find(t => t.id === 'preset_barebones') || TEMPLATE_PRESETS[0];
                    if (style === 'modern') return TEMPLATE_PRESETS.find(t => t.id === 'preset_medical') || TEMPLATE_PRESETS[0];
                    if (style === 'professional') return TEMPLATE_PRESETS.find(t => t.id === 'preset_corporate') || TEMPLATE_PRESETS[0];
                    if (style === 'startup' || style === 'agency') return TEMPLATE_PRESETS.find(t => t.id === 'preset_user') || TEMPLATE_PRESETS[0];
                    if (style === 'enterprise') return TEMPLATE_PRESETS.find(t => t.id === 'preset_gst') || TEMPLATE_PRESETS[0];
                  }

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

                const previewScale = dashPreviewScale;
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
                  value={clientAddress || ''}
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
                  value={expenseDesc || ''}
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
