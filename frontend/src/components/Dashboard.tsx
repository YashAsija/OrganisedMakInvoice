import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getFinancialYearShort, getNextInvoiceNumber } from './InvoiceModal';
import { useExpenses } from '../hooks/useExpenses';
import { ExpensesPage } from './ExpensesPage';
import { supabase } from '../lib/supabase';
import { useSubscription } from '../lib/subscriptionContext';

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

  Banknote,

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

  ReceiptText,

  Package,

  Wallet,

  TrendingDown,

  Mail,

  Printer,

  ChevronRight,
  ChevronLeft,

  ChevronDown,

  X,
  RotateCcw,
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
  PlayCircle, 

  Share2, 

  Link as LinkIcon, 

  Unlock, 

  Eye, 

  Building2, 

  HelpCircle, 

  GripVertical, 

  AlertTriangle,

  Settings,

  Building,

  Crown,

  Copy,

  RefreshCw,

  Send

} from 'lucide-react';

import { useConfirm } from './ConfirmContext';

import { Invoice, BusinessProfile, PresetItem, InvoiceStatus, ClientProfile, Expense } from '../types';

import { BUSINESS_TEMPLATES } from '../lib/presets';

import { exportInvoicePDFAsync, exportCollectiveReportPDF } from '../lib/pdfExporter';

import TemplateManager from './TemplateManager';

import { emitNotification } from '../lib/notifications';

import { getTierLimits, getBillingCycleReportCount, incrementBillingCycleReportCount } from '../lib/subscriptionGuard';

import { TEMPLATE_PRESETS, getDefaultTemplatePreset } from '../lib/templatePresets';

import { getDocumentTypeDefaults } from '../lib/docTypeDefaults';

import { LivePreview } from './TemplateBuilder/LivePreview';

import SettingsPage from './SettingsPage';

import SupportPage from './SupportPage';

import SupportChatPage from './SupportChatPage';

import SubscriptionPage from './SubscriptionPage';



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

  /** Number of invoices/clients/expenses with pending cloud sync. Shows a badge when > 0. */
  pendingSyncCount?: number;

  theme: 'light' | 'dark';

  toggleTheme: () => void;

  userEmail: string | null;

  onLogin: () => void;

  onLogout: () => void;

  onOpenProfile: () => void;

  onOpenInvoiceEditor: (invoice: Invoice | null) => void;

  onDeleteInvoice: (id: string) => void;
  onRestoreInvoice?: (id: string) => void;
  onHardDeleteInvoice?: (id: string) => void;
  onBulkHardDeleteInvoices?: (ids: string[]) => void;
  onBulkDeleteInvoices: (ids: string[]) => void;

  onBulkUpdateInvoicesStatus: (ids: string[], status: InvoiceStatus) => void;

  onUpdateInvoice: (invoice: Invoice) => void;

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

  subscriptionTier?: 'free' | 'basic' | 'pro' | 'unlimited' | 'enterprise';
  onCloseInvoiceEditor?: () => void;
}



export default function Dashboard({

  invoices,

  profile,

  presets,

  clients,

  expenses,

  isOnline,

  pendingSyncCount = 0,

  theme,

  toggleTheme,

  userEmail,

  onLogin,

  subscriptionTier = 'free',

  onLogout,

  onOpenProfile,

  onOpenInvoiceEditor,
  onCloseInvoiceEditor,

  onDeleteInvoice,
  onRestoreInvoice,
  onHardDeleteInvoice,
  onBulkHardDeleteInvoices,
  onBulkDeleteInvoices,

  onBulkUpdateInvoicesStatus,

  onUpdateInvoice,

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
  const { expenses: supabaseExpenses, stats: expenseStats } = useExpenses();
  const { refetch: refetchSubscription } = useSubscription();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('upgraded') === '1') {
        refetchSubscription();
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [refetchSubscription]);

  const suffix = userEmail ? `_${encodeURIComponent(userEmail)}` : '';

  // Navigation tabs: 'dashboard' | 'profile' | 'learn' | 'invoices' | 'clients' | 'reports' | 'master_vendor' ...

  const [localActiveTab, setLocalActiveTab] = useState<string>('invoices');

  const activeTab = propActiveTab !== undefined ? propActiveTab : localActiveTab;

  const setActiveTab = onTabChange !== undefined ? onTabChange : setLocalActiveTab;
  const [recentView, setRecentView] = useState<'invoices' | 'expenses'>('invoices');



  const handleUpgrade = async (tier: 'free' | 'basic' | 'pro' | 'unlimited' | 'enterprise') => {
    localStorage.setItem('makbills_subscription_tier', tier);
    localStorage.setItem('makbills_sub_activated_at', new Date().toISOString());
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mak_subscription_change', { detail: tier }));
      window.dispatchEvent(new CustomEvent('mak_navigate_tab', { detail: 'subscription' }));
    }

    // Persist to cloud database so other devices immediately sync this tier change
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from('users').update({
          plan_id: tier,
          subscription_status: 'active',
          current_period_end: expiresAt,
          subscription_expires_at: expiresAt,
        }).eq('uid', user.id);

        if (user.email) {
          await supabase.from('users').update({
            plan_id: tier,
            subscription_status: 'active',
            current_period_end: expiresAt,
            subscription_expires_at: expiresAt,
          }).eq('email', user.email);
        }

        await supabase.from('subscriptions').upsert(
          {
            user_id: user.id,
            user_email: user.email || null,
            gateway: 'razorpay',
            gateway_sub_id: `manual_sub_${user.id}_${Date.now()}`,
            plan_key: tier,
            billing_cycle: 'yearly_onetime',
            status: 'active',
            auto_renew: false,
            subscription_expires_at: expiresAt,
            current_period_end: expiresAt,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'gateway_sub_id' }
        );
      }
    } catch (e) {
      console.warn('[handleUpgrade] Failed to sync tier update to cloud:', e);
    }
  };



  const [draftsSection, setDraftsSection] = useState<string>('all');

  const [draftsOrigin, setDraftsOrigin] = useState<'sales' | 'purchases'>('sales');

  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<'down' | 'up'>('down');
  const [activeSendMenuId, setActiveSendMenuId] = useState<string | null>(null);
  const [sendMenuPosition, setSendMenuPosition] = useState<'down' | 'up'>('down');
  // Interactive App Tutorial State & Data
  const [isTutorialActive, setIsTutorialActive] = useState<boolean>(false);
  const [tutorialStep, setTutorialStep] = useState<number>(0);

  const TUTORIAL_STEPS = [
    {
      step: 1,
      title: 'Financial Billing Dashboard',
      tab: 'dashboard',
      tag: '1. Executive Hub',
      description: 'Real-time financial control panel! Monitor total sales revenue, net profit margin, paid vs pending receivables, purchase expenses, and monthly revenue trends.',
      highlightText: 'Live financial KPI cards, sales vs expense charts & quick-action billing shortcuts.',
      tip: 'Click any metric card to open detailed ledger lists filtered by that status.'
    },
    {
      step: 2,
      title: 'Sales Ledger & Invoices',
      tab: 'invoices',
      tag: '2. Accounts Receivable',
      description: 'Manage Tax Invoices, Proforma Invoices, Credit Notes, and Quotes/Estimates. Includes status filters (Paid, Pending, Overdue), WhatsApp sharing, and 1-click A4 PDF exports.',
      highlightText: 'Sales ledger records, document type tabs & 1-click A4 PDF export buttons.',
      tip: 'Use document type tabs to switch between Invoices, Proformas, Credit Notes & Quotes.'
    },
    {
      step: 3,
      title: 'Purchase Ledger & Vendor Bills',
      tab: 'purchases',
      tag: '3. Accounts Payable',
      description: 'Track incoming vendor bills, purchase orders (PO), and supplier debit notes. Monitor procurement costs, category spending, supplier GSTINs, and Input Tax Credit (ITC).',
      highlightText: 'Vendor expense ledger, category cost breakdown & unpaid supplier trackers.',
      tip: 'Click "+ Record Purchase" to log supplier bills with line items & tax breakdowns.'
    },
    {
      step: 4,
      title: 'Quick Bill & AI Smart Billing Engine',
      tab: 'invoices',
      action: 'open_invoice_modal',
      tag: '4. AI Smart Billing',
      description: 'Describe billing transactions in natural text or voice (e.g. "Bill Acme: 5 Laptops @ $1200, 18% GST"). Gemini AI automatically extracts client info, line items, rates, and CGST/SGST/IGST tax splits directly into your active invoice canvas.',
      highlightText: 'The highlighted "AI Smart Billing" prompt box at the top of the Quick Bill canvas.',
      tip: 'Type or click the microphone icon to dictate complete billing details naturally.'
    },
    {
      step: 5,
      title: 'Invoice Templates & Layout Studio',
      tab: 'invoice_templates',
      tag: '5. Branding & Design',
      description: 'Customize document aesthetics! Choose between Modern Executive, Classic Corporate, Minimalist, Bold Gradient, Dual-Tone, and POS Thermal layouts with brand color palettes & digital signature stamps.',
      highlightText: 'Live A4 preview gallery, accent color selectors & signature stamp controls.',
      tip: 'All layouts comply with standard single-page A4 printing & PDF standards.'
    },
    {
      step: 6,
      title: 'Accounting Reports & Financial Analytics',
      tab: 'reports',
      tag: '6. Analytics & Exports',
      description: 'Audit-ready financial reporting! View sales vs expense trends, GSTR-1 & GSTR-3B tax summaries, client aging reports, and export multi-column ledgers directly to Microsoft Excel or CSV.',
      highlightText: 'GSTR tax breakdown tables & "Export Audit-Ready Ledger to Excel" button.',
      tip: 'Select custom date ranges to prepare monthly or quarterly tax filings.'
    },
    {
      step: 7,
      title: 'MakInvoices AI Assistant (Help & Support)',
      tab: 'support-chat',
      tag: '7. 24/7 AI Support Chatbot',
      description: 'Your 24/7 AI Support assistant! Trained on GST compliance, tax calculations, invoice editing, and PDF printing. Supports English, Hindi, Hinglish, Spanish, French, and German.',
      highlightText: 'The live AI Support Chatbot interface with multi-language selector dropdown.',
      tip: 'Click suggested FAQ chips for instant guidance on any app feature.'
    },
    {
      step: 8,
      title: 'Master Registry & Central Database',
      tab: 'master_vendor',
      tag: '8. Central Database',
      description: 'Central database for Client Profiles, Vendor Records, Products/Services with HSN codes, and Transporter details for instant auto-complete. Supports bulk Excel/CSV import & export.',
      highlightText: 'Master registries for Clients, Vendors, Products & "+ Add Record / Bulk Excel Import".',
      tip: 'Pre-save client GSTINs once to auto-fill billing details everywhere instantly.'
    },
    {
      step: 9,
      title: 'Company Profile & Security PIN Lock',
      tab: 'profile',
      tag: '9. Settings & Security',
      description: 'Configure your company profile, GSTIN, bank settlement accounts (UPI ID / QR Code), digital signature stamp, and enable a 4-digit PIN lock for local database encryption.',
      highlightText: 'Company details, bank payout accounts & 4-Digit Security PIN toggle.',
      tip: 'Enable Security PIN to lock your billing data whenever you leave your desk.'
    }
  ];

  const handleOpenCreateModal = () => {
    if (onOpenInvoiceEditor) {
      onOpenInvoiceEditor(null);
    }
  };

  const handleCloseCreateModal = () => {
    if (onCloseInvoiceEditor) {
      onCloseInvoiceEditor();
    }
  };

  const applyTutorialStepAction = (stepIndex: number) => {
    const target = TUTORIAL_STEPS[stepIndex];
    if (target.action === 'open_invoice_modal') {
      setActiveTab('invoices');
      handleOpenCreateModal();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mak_tutorial_highlight_ai_box', { detail: true }));
      }
    } else {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mak_tutorial_highlight_ai_box', { detail: false }));
      }
      handleCloseCreateModal();
      setActiveTab(target.tab as any);
    }
  };

  const startInteractiveTutorial = (startStep = 0) => {
    setTutorialStep(startStep);
    setIsTutorialActive(true);
    applyTutorialStepAction(startStep);
    emitNotification('App Tutorial Started 🚀', `Step 1 of ${TUTORIAL_STEPS.length}: ${TUTORIAL_STEPS[startStep].title}`, 'info');
  };

  const handleNextTutorialStep = () => {
    if (tutorialStep < TUTORIAL_STEPS.length - 1) {
      const next = tutorialStep + 1;
      setTutorialStep(next);
      applyTutorialStepAction(next);
    } else {
      setIsTutorialActive(false);
      emitNotification('Tutorial Completed! 🎉', 'You have mastered all core features of MakInvoices.', 'success');
    }
  };

  const handlePrevTutorialStep = () => {
    if (tutorialStep > 0) {
      const prev = tutorialStep - 1;
      setTutorialStep(prev);
      applyTutorialStepAction(prev);
    }
  };



  // States for Record Payment Modal
  const [paymentModalInv, setPaymentModalInv] = useState<Invoice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('UPI');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isEditingTotalPaid, setIsEditingTotalPaid] = useState<boolean>(false);
  const [editTotalPaidAmount, setEditTotalPaidAmount] = useState<string>('');
  const [selectedMonthlyPeriod, setSelectedMonthlyPeriod] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });



  // Close actions & send menus when clicking outside

  useEffect(() => {

    const handleOutsideClick = () => {

      setActiveActionMenuId(null);

      setActiveSendMenuId(null);

    };

    window.addEventListener('click', handleOutsideClick);

    return () => window.removeEventListener('click', handleOutsideClick);

  }, []);

  

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
  const [showBinView, setShowBinView] = useState(false);

  const [isDesktopSidebarExpanded, setIsDesktopSidebarExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1280;
    }
    return false;
  });

  // Automatically collapse desktop sidebar on tablets/iPads (< 1280px) for optimal workspace width
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      if (window.innerWidth < 1280) {
        setIsDesktopSidebarExpanded(false);
      }
    };
    // Initial check
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [isSalesLedgerExpanded, setIsSalesLedgerExpanded] = useState(false);
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

      if (lowerTitle.includes('bulk upload complete')) {

        // Bulk upload: infer the correct registry tab from the message body

        const lowerMsg = (message || '').toLowerCase();

        if (lowerMsg.includes('client database')) { actionLabel = 'Go to Client Database'; actionTab = 'master_vendor'; }

        else if (lowerMsg.includes('hsn registry')) { actionLabel = 'Go to HSN Registry'; actionTab = 'master_hsn'; }

        else if (lowerMsg.includes('transport database')) { actionLabel = 'Go to Transport Database'; actionTab = 'master_transport'; }

        else if (lowerMsg.includes('material catalog')) { actionLabel = 'Go to Material Catalog'; actionTab = 'catalog_material'; }

        else if (lowerMsg.includes('product category')) { actionLabel = 'Go to Product Category'; actionTab = 'catalog_category'; }

      } else if (lowerTitle.includes('default template set')) {

        actionLabel = 'Go to Templates';

        actionTab = 'invoice_templates';

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
  const [purchasesChartRange, setPurchasesChartRange] = useState<'7d' | '1m' | '3m' | '6m' | '1y' | 'all'>('6m');
  const [hoveredPurchasesChartIndex, setHoveredPurchasesChartIndex] = useState<number | null>(null);

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

    const cached = localStorage.getItem('makbills_masters_vendors' + suffix);

    if (cached) return JSON.parse(cached);

    if (suffix) return [];

    return [

      { id: 'v_1', name: 'AWS Cloud Hosting', company: 'Amazon Web Services', email: 'billing@aws.com', phone: '1-800-AWS', address: 'Seattle, WA', category: 'SaaS Subscriptions' },

      { id: 'v_2', name: 'WeWork Office Space', company: 'WeWork LLC', email: 'billing@wework.com', phone: '+1-555-WEWORK', address: 'Tech Plaza, SF, CA', category: 'Rent & Overheads' },

      { id: 'v_3', name: 'Google Suite Workspace', company: 'Google Cloud Corp', email: 'gsuite@google.com', phone: '1-800-GOOGLE', address: 'Mountain View, CA', category: 'SaaS Subscriptions' }

    ];

  });



  const [actualVendors, setActualVendors] = useState<MasterVendor[]>(() => {

    const cached = localStorage.getItem('makbills_masters_actual_vendors' + suffix);

    if (cached) return JSON.parse(cached);

    if (suffix) return [];

    return [

      { id: 'av_1', name: 'AWS Cloud Hosting', company: 'Amazon Web Services', email: 'billing@aws.com', phone: '1-800-AWS', address: 'Seattle, WA', category: 'SaaS Subscriptions' },

      { id: 'av_2', name: 'WeWork Office Space', company: 'WeWork LLC', email: 'billing@wework.com', phone: '+1-555-WEWORK', address: 'Tech Plaza, SF, CA', category: 'Rent & Overheads' },

      { id: 'av_3', name: 'Google Suite Workspace', company: 'Google Cloud Corp', email: 'gsuite@google.com', phone: '1-800-GOOGLE', address: 'Mountain View, CA', category: 'SaaS Subscriptions' }

    ];

  });



  const [hsnCodes, setHsnCodes] = useState<MasterHsnCode[]>(() => {

    const cached = localStorage.getItem('makbills_masters_hsn' + suffix);

    if (cached) return JSON.parse(cached);

    if (suffix) return [];

    return [

      { id: 'h_1', code: '998311', description: 'Technical & Software Consulting services (SAC)', gstRate: 18 },

      { id: 'h_2', code: '998313', description: 'Management Advisory & General Corporate Consulting (SAC)', gstRate: 18 },

      { id: 'h_3', code: '997331', description: 'Software SaaS Licensing & Subscriptions (SAC)', gstRate: 18 },

      { id: 'h_4', code: '847130', description: 'Computer Laptops & Hardware Machinery Import', gstRate: 18 }

    ];

  });



  const [glAccounts, setGlAccounts] = useState<MasterGlAccount[]>(() => {

    const cached = localStorage.getItem('makbills_masters_gl' + suffix);

    if (cached) return JSON.parse(cached);

    if (suffix) return [];

    return [

      { id: 'gl_1', code: 'GL-100', name: 'Professional Advisory Revenue', type: 'Revenue' },

      { id: 'gl_2', code: 'GL-200', name: 'AWS Infrastructure overheads', type: 'Expense' },

      { id: 'gl_3', code: 'GL-300', name: 'Office Leases Rent & utilities', type: 'Expense' },

      { id: 'gl_4', code: 'GL-400', name: 'Contractor Sinking charges', type: 'Expense' }

    ];

  });



  const [transports, setTransports] = useState<any[]>(() => {

    const cached = localStorage.getItem('makbills_masters_transports' + suffix);

    if (cached) return JSON.parse(cached);

    if (suffix) return [];

    return [

      { id: 't_1', name: 'Safe Express Logistics', phone: '9888877777', email: 'info@safeexpress.com', address: 'Okhla Phase 1, New Delhi', gstin: '07AAAAS0000A1Z1', pan: 'AAAAS0000A', state: 'Delhi', country: 'India' }

    ];

  });



  // Catalog Master database seed

  const [materials, setMaterials] = useState<MasterMaterial[]>(() => {

    const cached = localStorage.getItem('makbills_masters_materials' + suffix);

    if (cached) return JSON.parse(cached);

    if (suffix) return [];

    return [

      { id: 'm_1', name: 'Premium Software Architecture Review', rate: 120000, hsn: '998311', uom: 'PCS', category: 'Technical Consultancy' },

      { id: 'm_2', name: 'Node.js Enterprise Server Setup', rate: 85000, hsn: '998311', uom: 'PCS', category: 'Engineering Work' },

      { id: 'm_3', name: 'DevOps Pipeline Automations retainer', rate: 45000, hsn: '998311', uom: 'HRS', category: 'Technical Consultancy' }

    ];

  });



  const [categories, setCategories] = useState<MasterCategory[]>(() => {

    const cached = localStorage.getItem('makbills_masters_categories' + suffix);

    if (cached) return JSON.parse(cached);

    if (suffix) return [];

    return [

      { id: 'cat_1', name: 'Technical Consultancy', description: 'Architectural, DevOps, review sessions' },

      { id: 'cat_2', name: 'Engineering Work', description: 'Core product programming and server installations' },

      { id: 'cat_3', name: 'Training Programs', description: 'Corporate developer training upskilling courses' }

    ];

  });



  const [subCategories, setSubCategories] = useState<MasterSubCategory[]>(() => {

    const cached = localStorage.getItem('makbills_masters_subcategories' + suffix);

    if (cached) return JSON.parse(cached);

    if (suffix) return [];

    return [

      { id: 'scat_1', category: 'Technical Consultancy', name: 'Cloud Infrastructure Auditing' },

      { id: 'scat_2', category: 'Technical Consultancy', name: 'Security Review' },

      { id: 'scat_3', category: 'Engineering Work', name: 'React UI Architecture Development' }

    ];

  });



  const [mappings, setMappings] = useState<MasterMapping[]>(() => {

    const cached = localStorage.getItem('makbills_masters_mappings' + suffix);

    if (cached) return JSON.parse(cached);

    if (suffix) return [];

    return [

      { id: 'map_1', item: 'Premium Software Architecture Review', glAccount: 'Professional Advisory Revenue', taxRate: 18 },

      { id: 'map_2', item: 'AWS Cloud Hosting Mapping', glAccount: 'AWS Infrastructure overheads', taxRate: 18 }

    ];

  });



  const [packingUnits, setPackingUnits] = useState<MasterPackingUnit[]>(() => {

    const cached = localStorage.getItem('makbills_masters_packing' + suffix);

    if (cached) return JSON.parse(cached);

    if (suffix) return [];

    return [

      { id: 'p_1', name: 'PCS (Single items pack)' },

      { id: 'p_2', name: 'BOX (Sealed cardboard cartons)' },

      { id: 'p_3', name: 'ENV (Flat protective paper envelopes)' }

    ];

  });



  const [measurementUnits, setMeasurementUnits] = useState<MasterMeasurementUnit[]>(() => {

    const cached = localStorage.getItem('makbills_masters_measurement' + suffix);

    if (cached) return JSON.parse(cached);

    if (suffix) return [];

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

      const cached = localStorage.getItem('makbills_masters_vendors' + suffix);

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

  }, [suffix]);



  // Sync Transport Database with other views

  useEffect(() => {

    const handleSync = () => {

      const cached = localStorage.getItem('makbills_masters_transports' + suffix);

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

  }, [suffix]);



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

      localStorage.setItem('makbills_masters_materials' + suffix, JSON.stringify(updatedMaterials));

    }

  }, [invoices, materials, suffix]);



  // Reusable Master Database handlers

  const handleSaveMasterItem = (item: any) => {

    let list: any[] = [];

    let key = '';

    let setter: any = null;



    const tabLabels: Record<string, string> = {

      master_vendor: 'Client Database',

      master_actual_vendor: 'Vendor Database',

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

        key = 'makbills_masters_vendors' + suffix;

        setter = setVendors;

        break;

      case 'master_actual_vendor':

        list = actualVendors;

        key = 'makbills_masters_actual_vendors' + suffix;

        setter = setActualVendors;

        break;

      case 'master_transport':

        list = transports;

        key = 'makbills_masters_transports' + suffix;

        setter = setTransports;

        break;

      case 'master_hsn':

        list = hsnCodes;

        key = 'makbills_masters_hsn' + suffix;

        setter = setHsnCodes;

        break;

      case 'master_gl':

        list = glAccounts;

        key = 'makbills_masters_gl' + suffix;

        setter = setGlAccounts;

        break;

      case 'catalog_material':

        list = materials;

        key = 'makbills_masters_materials' + suffix;

        setter = setMaterials;

        break;

      case 'catalog_category':

        list = categories;

        key = 'makbills_masters_categories' + suffix;

        setter = setCategories;

        break;

      case 'catalog_sub_category':

        list = subCategories;

        key = 'makbills_masters_subcategories' + suffix;

        setter = setSubCategories;

        break;

      case 'catalog_mapping':

        list = mappings;

        key = 'makbills_masters_mappings' + suffix;

        setter = setMappings;

        break;

      case 'catalog_packing_unit':

        list = packingUnits;

        key = 'makbills_masters_packing' + suffix;

        setter = setPackingUnits;

        break;

      case 'catalog_measurement_unit':

        list = measurementUnits;

        key = 'makbills_masters_measurement' + suffix;

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

      master_actual_vendor: 'Vendor Database',

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

        key = 'makbills_masters_vendors' + suffix;

        setter = setVendors;

        break;

      case 'master_actual_vendor':

        list = actualVendors;

        key = 'makbills_masters_actual_vendors' + suffix;

        setter = setActualVendors;

        break;

      case 'master_transport':

        list = transports;

        key = 'makbills_masters_transports' + suffix;

        setter = setTransports;

        break;

      case 'master_hsn':

        list = hsnCodes;

        key = 'makbills_masters_hsn' + suffix;

        setter = setHsnCodes;

        break;

      case 'master_gl':

        list = glAccounts;

        key = 'makbills_masters_gl' + suffix;

        setter = setGlAccounts;

        break;

      case 'catalog_material':

        list = materials;

        key = 'makbills_masters_materials' + suffix;

        setter = setMaterials;

        break;

      case 'catalog_category':

        list = categories;

        key = 'makbills_masters_categories' + suffix;

        setter = setCategories;

        break;

      case 'catalog_sub_category':

        list = subCategories;

        key = 'makbills_masters_subcategories' + suffix;

        setter = setSubCategories;

        break;

      case 'catalog_mapping':

        list = mappings;

        key = 'makbills_masters_mappings' + suffix;

        setter = setMappings;

        break;

      case 'catalog_packing_unit':

        list = packingUnits;

        key = 'makbills_masters_packing' + suffix;

        setter = setPackingUnits;

        break;

      case 'catalog_measurement_unit':

        list = measurementUnits;

        key = 'makbills_masters_measurement' + suffix;

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

          ? 'bg-[#e0f2fe] text-[#0284c7] dark:bg-[#1b264f] dark:text-[#38bdf8] shadow-[0_2px_12px_rgba(2,132,199,0.1)] border border-[#bae6fd] dark:border-[#223269] font-black relative overflow-hidden'

          : 'text-[#0f172a] hover:text-[#0284c7] dark:text-zinc-300 dark:hover:text-[#38bdf8] hover:bg-[#e0f2fe]/50 dark:hover:bg-[#1b264f]/40 border border-transparent'

      }`;

    };



    const iconWrapper = (isActive: boolean, colorClass: string) => 

      `flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${

        isActive 

          ? `${colorClass} shadow-sm ring-1 ring-[#bae6fd]/50 dark:ring-[#223269]/50` 

          : 'bg-transparent text-[#475569] group-hover:bg-[#e0f2fe]/60 dark:group-hover:bg-[#1b264f]/60 group-hover:text-[#0284c7] dark:group-hover:text-[#38bdf8]'

      }`;



    const smallNavItemClass = (tab: string) => {

      const isActive = activeTab === tab;

      return `w-full px-2 py-1.5 rounded-lg text-left text-[11px] font-bold transition-all duration-300 flex items-center justify-between cursor-pointer group ${

        isActive

          ? 'bg-[#e0f2fe] text-[#0284c7] dark:bg-[#1b264f] dark:text-[#38bdf8] shadow-[0_2px_8px_rgba(2,132,199,0.08)] border border-[#bae6fd] dark:border-[#223269] font-black relative overflow-hidden'

          : 'text-[#0f172a] hover:text-[#0284c7] dark:text-zinc-300 dark:hover:text-[#38bdf8] hover:bg-[#e0f2fe]/40 dark:hover:bg-[#1b264f]/30 border border-transparent'

      }`;

    };



    const smallIconWrapper = (isActive: boolean, colorClass: string) => 

      `flex items-center justify-center w-6 h-6 rounded-md transition-colors ${

        isActive 

          ? `${colorClass} shadow-xs ring-1 ring-[#bae6fd]/50 dark:ring-[#223269]/50` 

          : 'bg-transparent text-[#475569] group-hover:bg-[#e0f2fe]/60 dark:group-hover:bg-[#1b264f]/60 group-hover:text-[#0284c7] dark:group-hover:text-[#38bdf8]'

      }`;

    return (

      <div className="flex flex-col h-full text-sans select-none overflow-hidden">

        

        {/* Scrollable Navigation Items */}

        <div className="flex-1 overflow-y-auto pr-0.5 space-y-3 no-scrollbar pb-3">

          {/* QUICK BILL ACTIONS */}

          <div className="px-1">

            <button

              onClick={() => {

                onOpenInvoiceEditor(null);

                if (isMobileView) setIsMobileDrawerOpen(false);

              }}

              className="group relative w-full flex items-center justify-start gap-3 px-2 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-[14px] font-bold text-[13px] shadow-[0_4px_12px_rgba(2,132,199,0.25)] hover:shadow-[0_6px_16px_rgba(2,132,199,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] transition-all duration-200 border border-[#0369a1]/50"

            >

              <div className="w-8 h-8 rounded-[10px] bg-white/20 flex items-center justify-center shrink-0 group-hover:bg-white/30 group-hover:scale-105 transition-all duration-300 shadow-sm">

                <Zap className="w-4 h-4 fill-white drop-shadow-sm" />

              </div>

              <span className="tracking-wide pr-2 text-center flex-1 -ml-6">Quick Bill</span>

            </button>

          </div>


          {/* SETTINGS MENU */}
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-extrabold tracking-widest block px-2 pb-1" style={{fontFamily: "'IBM Plex Mono', monospace", color: 'var(--nav-eyebrow-color, #0284c7)', opacity: 0.7}}>Financial Hub</span>

            {/* Sales Ledger Accordion Section */}
            <div className="space-y-0.5">
              <button
                onClick={() => {
                  if (activeTab !== 'invoices') {
                    handleTabClick('invoices');
                  }
                  setIsSalesLedgerExpanded(!isSalesLedgerExpanded);
                }}
                className={navItemClass('invoices')}
              >
                <div className="flex items-center gap-2.5">
                  <div className={iconWrapper(activeTab === 'invoices', 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400')}><FileText className="w-3.5 h-3.5" /></div>
                  <span>Sales Ledger</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'invoices' ? 'bg-[#0284c7] text-white dark:bg-[#0284c7]' : 'bg-[#e0f2fe] text-[#0284c7] dark:bg-[#1b264f] dark:text-[#38bdf8] border border-[#bae6fd] dark:border-[#223269]'}`}>
                    {invoices.filter(i => !i.isDeleted && i.status !== 'draft' && ['invoice', 'proforma', 'credit_note', 'estimate', 'quote'].includes(i.invoiceType || 'invoice')).length}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#64748b]/70 transition-transform duration-200 ${isSalesLedgerExpanded ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Accordion Sub-items */}
              {isSalesLedgerExpanded && (
                <div className="pl-6 space-y-0.5 pt-0.5">
                  {[
                    { id: 'invoice', label: 'Tax Invoices', count: documentTypeCounts.invoice, activeBg: 'bg-[#0284c7] dark:bg-[#0284c7] text-white dark:text-white font-extrabold shadow-sm', color: 'hover:text-[#0284c7] dark:hover:text-[#38bdf8]', activeBadge: 'bg-white/20 text-white', badge: 'bg-[#e0f2fe] dark:bg-[#1b264f] text-[#0284c7] dark:text-[#38bdf8]' },
                    { id: 'proforma', label: 'Proforma Invoice', count: documentTypeCounts.proforma, activeBg: 'bg-[#0369a1] dark:bg-[#0369a1] text-white dark:text-white font-extrabold shadow-sm', color: 'hover:text-[#0369a1] dark:hover:text-[#38bdf8]', activeBadge: 'bg-white/20 text-white', badge: 'bg-[#e0f2fe] dark:bg-[#1b264f] text-[#0284c7] dark:text-[#38bdf8]' },
                    { id: 'credit_note', label: 'Credit Note', count: documentTypeCounts.credit_note, activeBg: 'bg-[#0284c7] dark:bg-[#0284c7] text-white dark:text-white font-extrabold shadow-sm', color: 'hover:text-[#0284c7] dark:hover:text-[#38bdf8]', activeBadge: 'bg-white/20 text-white', badge: 'bg-[#e0f2fe] dark:bg-[#1b264f] text-[#0284c7] dark:text-[#38bdf8]' },
                    { id: 'quote', label: 'Quote / Estimate', count: documentTypeCounts.quote, activeBg: 'bg-[#0369a1] dark:bg-[#0369a1] text-white dark:text-white font-extrabold shadow-sm', color: 'hover:text-[#0369a1] dark:hover:text-[#38bdf8]', activeBadge: 'bg-white/20 text-white', badge: 'bg-[#e0f2fe] dark:bg-[#1b264f] text-[#0284c7] dark:text-[#38bdf8]' }
                  ].map(sub => {
                    const isSubActive = activeTab === 'invoices' && ledgerSection === sub.id;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => {
                          handleTabClick('invoices');
                          setLedgerSection(sub.id as any);
                          const pathMap: Record<string, string> = {
                            invoice: '/invoices/tax-invoices',
                            proforma: '/invoices/proforma-invoices',
                            credit_note: '/invoices/credit-notes',
                            quote: '/invoices/quotes-estimates'
                          };
                          if (typeof window !== 'undefined' && pathMap[sub.id]) {
                            window.history.pushState(null, '', pathMap[sub.id]);
                          }
                        }}
                        className={`w-full px-3 py-2 rounded-xl text-left text-[11px] font-bold transition-all duration-200 flex items-center justify-between cursor-pointer ${
                          isSubActive
                            ? sub.activeBg
                            : `text-[#0f172a] dark:text-zinc-300 ${sub.color} hover:bg-[#e0f2fe]/60 dark:hover:bg-[#1b264f]/50`
                        }`}
                      >
                        <span className="truncate">{sub.label}</span>
                        <span className={`text-[8.5px] px-1.5 py-0.2 rounded-full font-black ${isSubActive ? sub.activeBadge : sub.badge}`}>
                          {sub.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Purchases Ledger Accordion Section */}
            <div className="space-y-0.5">
              <button
                onClick={() => {
                  if (activeTab !== 'purchases') {
                    handleTabClick('purchases');
                  }
                  setIsPurchasesLedgerExpanded(!isPurchasesLedgerExpanded);
                }}
                className={navItemClass('purchases')}
              >
                <div className="flex items-center gap-2.5">
                  <div className={iconWrapper(activeTab === 'purchases', 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400')}><Briefcase className="w-3.5 h-3.5" /></div>
                  <span>Purchases Ledger</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'purchases' ? 'bg-[#0284c7] text-white dark:bg-[#0284c7]' : 'bg-[#e0f2fe] text-[#0284c7] dark:bg-[#1b264f] dark:text-[#38bdf8] border border-[#bae6fd] dark:border-[#223269]'}`}>
                    {(documentTypeCounts.purchases || 0) + (documentTypeCounts.purchase_order || 0) + (documentTypeCounts.purchase_debit_note || 0)}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#64748b]/70 transition-transform duration-200 ${isPurchasesLedgerExpanded ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Accordion Sub-items */}
              {isPurchasesLedgerExpanded && (
                <div className="pl-6 space-y-0.5 pt-0.5">
                  {[
                    { id: 'purchases', label: 'Purchases', count: documentTypeCounts.purchases || 0, activeBg: 'bg-[#0284c7] dark:bg-[#0284c7] text-white dark:text-white font-extrabold shadow-sm', color: 'hover:text-[#0284c7] dark:hover:text-[#38bdf8]', activeBadge: 'bg-white/20 text-white', badge: 'bg-[#e0f2fe] dark:bg-[#1b264f] text-[#0284c7] dark:text-[#38bdf8]' },
                    { id: 'purchase_order', label: 'Purchase Order', count: documentTypeCounts.purchase_order || 0, activeBg: 'bg-[#0369a1] dark:bg-[#0369a1] text-white dark:text-white font-extrabold shadow-sm', color: 'hover:text-[#0369a1] dark:hover:text-[#38bdf8]', activeBadge: 'bg-white/20 text-white', badge: 'bg-[#e0f2fe] dark:bg-[#1b264f] text-[#0284c7] dark:text-[#38bdf8]' },
                    { id: 'purchase_debit_note', label: 'Debit Note', count: documentTypeCounts.purchase_debit_note || 0, activeBg: 'bg-[#0284c7] dark:bg-[#0284c7] text-white dark:text-white font-extrabold shadow-sm', color: 'hover:text-[#0284c7] dark:hover:text-[#38bdf8]', activeBadge: 'bg-white/20 text-white', badge: 'bg-[#e0f2fe] dark:bg-[#1b264f] text-[#0284c7] dark:text-[#38bdf8]' }
                  ].map(sub => {
                    const isSubActive = activeTab === 'purchases' && purchaseLedgerSection === sub.id;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => {
                          handleTabClick('purchases');
                          setPurchaseLedgerSection(sub.id as any);
                          const pathMap: Record<string, string> = {
                            purchases: '/purchases/purchases',
                            purchase_order: '/purchases/purchase-order',
                            purchase_debit_note: '/purchases/debit-note'
                          };
                          if (typeof window !== 'undefined' && pathMap[sub.id]) {
                            window.history.pushState(null, '', pathMap[sub.id]);
                          }
                        }}
                        className={`w-full px-3 py-2 rounded-xl text-left text-[11px] font-bold transition-all duration-200 flex items-center justify-between cursor-pointer ${
                          isSubActive
                            ? sub.activeBg
                            : `text-[#0f172a] dark:text-zinc-300 ${sub.color} hover:bg-[#e0f2fe]/60 dark:hover:bg-[#1b264f]/50`
                        }`}
                      >
                        <span className="truncate">{sub.label}</span>
                        <span className={`text-[8.5px] px-1.5 py-0.2 rounded-full font-black ${isSubActive ? sub.activeBadge : sub.badge}`}>
                          {sub.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Expenses Sidebar Nav Item */}
            <button
              onClick={() => {
                handleTabClick('expenses');
                if (typeof window !== 'undefined') {
                  window.history.pushState(null, '', '/expenses');
                }
              }}
              className={navItemClass('expenses')}
            >
              <div className="flex items-center gap-2.5">
                <div className={iconWrapper(activeTab === 'expenses', 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400')}>
                  <ReceiptText className="w-3.5 h-3.5" />
                </div>
                <span>Expenses</span>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'expenses' ? 'bg-[#0284c7] text-white dark:bg-[#0284c7]' : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800'}`}>
                {expenseStats.count}
              </span>
            </button>

            {/* Billing Dashboard */}
            <button onClick={() => handleTabClick('dashboard')} className={navItemClass('dashboard')}>
              <div className="flex items-center gap-2.5">
                <div className={iconWrapper(activeTab === 'dashboard', 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400')}><BarChart3 className="w-3.5 h-3.5" /></div>
                <span>Billing Dashboard</span>
              </div>
            </button>

            {/* Accounting Summary */}
            <button onClick={() => handleTabClick('reports')} className={navItemClass('reports')}>
              <div className="flex items-center gap-2.5">
                <div className={iconWrapper(activeTab === 'reports', 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400')}><TrendingUp className="w-3.5 h-3.5" /></div>
                <span>Accounting Report</span>
              </div>
            </button>

            {/* Billed Clients */}
            <button onClick={() => handleTabClick('clients')} className={navItemClass('clients')}>
              <div className="flex items-center gap-2.5">
                <div className={iconWrapper(activeTab === 'clients', 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400')}><Users2 className="w-3.5 h-3.5" /></div>
                <span>Billed Clients</span>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'clients' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300' : 'bg-[#f8fafc] text-[#64748b] group-hover:bg-white'}`}>
                {billedClientsFiltered.length}
              </span>
            </button>

            {/* Billed Vendors */}
            <button onClick={() => handleTabClick('purchasers')} className={navItemClass('purchasers')}>
              <div className="flex items-center gap-2.5">
                <div className={iconWrapper(activeTab === 'purchasers', 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400')}><Users2 className="w-3.5 h-3.5" /></div>
                <span>Billed Vendors</span>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'purchasers' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-[#f8fafc] text-[#64748b] group-hover:bg-white'}`}>
                {purchasersFiltered.length}
              </span>
            </button>
          </div>



          {/* MAKINVOICES AI (REDIRECTS TO AI CHATBOT WITH PROPER ROUTING) */}
          <div className="my-1.5 px-0.5">
            <button
              onClick={() => {
                handleTabClick('support-chat');
                if (typeof window !== 'undefined') {
                  window.history.pushState(null, '', '/ai-chat');
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all cursor-pointer select-none group ${
                activeTab === 'support-chat' || activeTab === 'makinvoices_ai'
                  ? 'bg-[#0284c7] text-white border-[#0284c7] shadow-md shadow-sky-500/20 font-extrabold'
                  : 'bg-sky-50/70 hover:bg-sky-100/80 dark:bg-[#132554]/50 dark:hover:bg-[#1b3272]/70 text-[#0369a1] dark:text-[#38bdf8] border-[#bae6fd] dark:border-[#223269] shadow-xs'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg transition-transform group-hover:scale-105 ${
                  activeTab === 'support-chat' || activeTab === 'makinvoices_ai'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#0284c7]/15 text-[#0284c7] dark:bg-[#38bdf8]/15 dark:text-[#38bdf8]'
                }`}>
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold tracking-tight">MakInvoices AI</span>
              </div>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider ${
                activeTab === 'support-chat' || activeTab === 'makinvoices_ai'
                  ? 'bg-white text-[#0284c7]'
                  : 'bg-[#0284c7] text-white dark:bg-[#38bdf8] dark:text-[#0b1329]'
              }`}>
                PRO
              </span>
            </button>
          </div>

          {/* TOOLS & CUSTOMIZATION */}

          <div className="space-y-1">

            <span className="text-[9px] uppercase font-extrabold tracking-widest block px-2 pb-1 mt-2" style={{fontFamily: "'IBM Plex Mono', monospace", color: '#0284c7', opacity: 0.7}}>Tools & Design</span>



            <button onClick={() => handleTabClick('invoice_templates')} className={navItemClass('invoice_templates')}>

              <div className="flex items-center gap-2.5">

                <div className={iconWrapper(activeTab === 'invoice_templates', 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400')}><Layout className="w-3.5 h-3.5" /></div>

                <span>Invoice Template</span>

              </div>

            </button>



            <button onClick={() => handleTabClick('learn')} className={navItemClass('learn')}>

              <div className="flex items-center gap-2.5">

                <div className={iconWrapper(activeTab === 'learn', 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400')}><BookOpen className="w-3.5 h-3.5" /></div>

                <span>Learn MakInvoices</span>

              </div>

            </button>

          </div>



          {/* MASTER REGISTRY */}

          <div className="space-y-1">

            <span className="text-[9px] uppercase font-extrabold tracking-widest block px-2 pb-1 mt-2" style={{fontFamily: "'IBM Plex Mono', monospace", color: '#0284c7', opacity: 0.7}}>Master Registry</span>



            <button onClick={() => handleTabClick('master_vendor')} className={navItemClass('master_vendor')}>

              <div className="flex items-center gap-2.5">

                <div className={iconWrapper(activeTab === 'master_vendor', 'bg-[#f8fafc] text-[#64748b] dark:bg-zinc-800 dark:text-zinc-300')}><Users2 className="w-3.5 h-3.5" /></div>

                <span>Client Database</span>

              </div>

            </button>



            <button onClick={() => handleTabClick('master_actual_vendor')} className={navItemClass('master_actual_vendor')}>

              <div className="flex items-center gap-2.5">

                <div className={iconWrapper(activeTab === 'master_actual_vendor', 'bg-[#f8fafc] text-[#64748b] dark:bg-zinc-800 dark:text-zinc-300')}><Users2 className="w-3.5 h-3.5" /></div>

                <span>Vendor Database</span>

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



            <button onClick={() => handleTabClick('catalog_material')} className={navItemClass('catalog_material')}>

              <div className="flex items-center gap-2.5">

                <div className={iconWrapper(activeTab === 'catalog_material', 'bg-[#f8fafc] text-[#64748b] dark:bg-zinc-800 dark:text-zinc-300')}><Wrench className="w-3.5 h-3.5" /></div>

                <span>Material Catalog</span>

              </div>

            </button>

          </div>

        </div>



        {/* Fixed System Settings & Upgrades Section */}

        <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-800 shrink-0 space-y-0.5 bg-white dark:bg-zinc-950">



          <button onClick={() => handleTabClick('settings')} className={smallNavItemClass('settings')}>

            <div className="flex items-center gap-2">

              <div className={smallIconWrapper(activeTab === 'settings', 'bg-slate-50 text-slate-650 dark:bg-zinc-800 dark:text-zinc-300')}><Settings className="w-3 h-3" /></div>

              <span>Settings</span>

            </div>

          </button>



          <button onClick={() => handleTabClick('profile')} className={smallNavItemClass('profile')}>

            <div className="flex items-center gap-2">

              <div className={smallIconWrapper(activeTab === 'profile', 'bg-slate-50 text-slate-650 dark:bg-zinc-800 dark:text-zinc-300')}><Building className="w-3 h-3" /></div>

              <span>Company Info</span>

            </div>

          </button>



          <button onClick={() => handleTabClick('support')} className={smallNavItemClass('support')}>

            <div className="flex items-center gap-2">

              <div className={smallIconWrapper(activeTab === 'support', 'bg-slate-50 text-slate-650 dark:bg-zinc-800 dark:text-zinc-300')}><HelpCircle className="w-3 h-3" /></div>

              <span>Help & Support</span>

            </div>

          </button>



          {/* PREMIUM HIGHLIGHTED UPGRADE BUTTON */}

          <button

            onClick={() => handleTabClick('subscription')}

            className="w-full mt-1.5 px-3 py-2 rounded-lg text-left text-[11px] font-black text-white bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#38bdf8] hover:from-[#0369a1] hover:via-[#1d4ed8] hover:to-[#0284c7] active:scale-98 transition-all duration-300 flex items-center justify-between cursor-pointer group shadow-[0_3px_10px_rgba(2,132,199,0.25)] hover:shadow-[0_5px_15px_rgba(2,132,199,0.35)] border border-[#bae6fd]/30"

          >

            <div className="flex items-center gap-2">

              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-white/20 text-white shadow-sm ring-1 ring-white/10 group-hover:scale-110 transition-transform">

                <Crown className="w-3.5 h-3.5 fill-white" />

              </div>

              <span className="tracking-wide uppercase">Upgrade Plan</span>

            </div>

            <span className="text-[8.5px] px-1.5 py-0.5 bg-white text-[#0284c7] rounded-md uppercase font-black tracking-wider animate-pulse shadow-sm">

              {subscriptionTier === 'free' ? 'PRO' : subscriptionTier === 'basic' ? 'PRO' : subscriptionTier === 'pro' ? 'UNLTD' : 'MAX'}

            </span>

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

      case 'master_actual_vendor':

        title = 'Vendor Database';

        description = 'Pre-saved vendor and supplier profiles, company configurations, and billing credentials';

        const actualVendorSignatures = new Set(actualVendors.map(v => 

          `${v.name?.trim().toLowerCase()}|${(v.email||'').trim().toLowerCase()}|${(v.phone||'').trim()}|${(v.address||'').trim()}`

        ));

        const additionalVendors = purchasersFiltered

          .filter(c => !actualVendorSignatures.has(`${c.name.trim().toLowerCase()}|${(c.email||'').trim().toLowerCase()}|${(c.phone||'').trim()}|${(c.address||'').trim()}`))

          .map(c => ({

            id: c.id,

            name: c.name,

            company: c.companyName,

            email: c.email,

            phone: c.phone,

            address: c.address,

            category: 'Billed Vendor'

          }));

        list = [...actualVendors, ...additionalVendors];

        columns = [

          { header: 'Vendor Name', key: 'name' },

          { header: 'Company Name', key: 'company' },

          { header: 'Email Address', key: 'email' },

          { header: 'Phone Number', key: 'phone' },

          { header: 'Category / Tag', key: 'category' }

        ];

        fields = [

          { label: 'Vendor Name', key: 'name', type: 'text' },

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

        topBar:        'bg-[#0284c7]',

        iconBg:        'bg-[#0284c7]',

        iconBgDark:    'dark:bg-[#0369a1]',

        iconColor:     'text-white',

        iconColorDark: 'dark:text-white',

        badgeBg:       'bg-[#e0f2fe] border-[#bae6fd] dark:bg-[#1b264f] dark:border-[#223269]',

        badgeText:     'text-[#0284c7] dark:text-[#38bdf8]',

        theadBg:       'bg-[#f4f9ff] dark:bg-[#0b1329]',

        theadBgDark:   '',

        avatarBg:      'bg-[#e0f2fe] border-[#bae6fd]',

        avatarBgDark:  'dark:bg-[#1b264f] dark:border-[#223269]',

        avatarIcon:    'text-[#0284c7]',

        avatarIconDark:'dark:text-[#38bdf8]',

      },

      master_actual_vendor: {

        topBar:        'bg-sky-500',

        iconBg:        'bg-sky-600',

        iconBgDark:    'dark:bg-sky-700',

        iconColor:     'text-white',

        iconColorDark: 'dark:text-white',

        badgeBg:       'bg-sky-50 border-sky-200 dark:bg-sky-950/40 dark:border-sky-900/40',

        badgeText:     'text-sky-600 dark:text-sky-400',

        theadBg:       'bg-sky-50/60 dark:bg-sky-950/20',

        theadBgDark:   '',

        avatarBg:      'bg-sky-50 border-sky-200/70',

        avatarBgDark:  'dark:bg-sky-950/30 dark:border-sky-900/40',

        avatarIcon:    'text-[#0284c7]',

        avatarIconDark:'dark:text-sky-400',

      },

      master_transport: {

        topBar:        'bg-indigo-500',

        iconBg:        'bg-indigo-600',

        iconBgDark:    'dark:bg-indigo-700',

        iconColor:     'text-white',

        iconColorDark: 'dark:text-white',

        badgeBg:       'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-900/40',

        badgeText:     'text-indigo-600 dark:text-indigo-400',

        theadBg:       'bg-indigo-50/60 dark:bg-indigo-950/20',

        theadBgDark:   '',

        avatarBg:      'bg-indigo-50 border-indigo-200/70',

        avatarBgDark:  'dark:bg-indigo-950/30 dark:border-indigo-900/40',

        avatarIcon:    'text-indigo-500',

        avatarIconDark:'dark:text-indigo-400',

      },

      master_hsn: {

        topBar:        'bg-[#2563eb]',

        iconBg:        'bg-[#2563eb]',

        iconBgDark:    'dark:bg-[#1d4ed8]',

        iconColor:     'text-white',

        iconColorDark: 'dark:text-white',

        badgeBg:       'bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-900/40',

        badgeText:     'text-[#2563eb] dark:text-blue-400',

        theadBg:       'bg-blue-50/60 dark:bg-blue-950/20',

        theadBgDark:   '',

        avatarBg:      'bg-blue-50 border-blue-200/70',

        avatarBgDark:  'dark:bg-blue-950/30 dark:border-blue-900/40',

        avatarIcon:    'text-[#2563eb]',

        avatarIconDark:'dark:text-blue-400',

      },

      catalog_material: {

        topBar:        'bg-cyan-500',

        iconBg:        'bg-cyan-600',

        iconBgDark:    'dark:bg-cyan-700',

        iconColor:     'text-white',

        iconColorDark: 'dark:text-white',

        badgeBg:       'bg-cyan-50 border-cyan-200 dark:bg-cyan-950/40 dark:border-cyan-900/40',

        badgeText:     'text-cyan-600 dark:text-cyan-400',

        theadBg:       'bg-cyan-50/60 dark:bg-cyan-950/20',

        theadBgDark:   '',

        avatarBg:      'bg-cyan-50 border-cyan-200/70',

        avatarBgDark:  'dark:bg-cyan-950/30 dark:border-cyan-900/40',

        avatarIcon:    'text-cyan-600',

        avatarIconDark:'dark:text-cyan-400',

      },

      catalog_category: {

        topBar:        'bg-violet-500',

        iconBg:        'bg-violet-600',

        iconBgDark:    'dark:bg-violet-700',

        iconColor:     'text-white',

        iconColorDark: 'dark:text-white',

        badgeBg:       'bg-violet-50 border-violet-200 dark:bg-violet-950/40 dark:border-violet-900/40',

        badgeText:     'text-violet-600 dark:text-violet-400',

        theadBg:       'bg-violet-50/60 dark:bg-violet-950/20',

        theadBgDark:   '',

        avatarBg:      'bg-violet-50 border-violet-200/70',

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

      <div className="space-y-5 text-sans animate-in fade-in duration-205 master-registry-container no-privacy-blur" data-privacy-exempt="true">



        {/* â”€â”€ Header Banner â”€â”€ */}

        <div className="bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 8px rgba(2,132,199,0.06)' }}>

          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between p-4 sm:p-5 md:p-6">

            {/* Left: Icon + title + description */}

            <div className="flex items-start gap-4">

              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${accent ? `${accent.iconBg} ${accent.iconBgDark}` : 'bg-[#0f172a]'}`} style={{ boxShadow: accent ? '0 3px 10px rgba(0,0,0,0.18)' : '0 3px 10px rgba(110,96,80,0.32)' }}>

                <Database className={`w-5 h-5 ${accent ? `${accent.iconColor} ${accent.iconColorDark}` : 'text-[#F0E8DC]'}`} />

              </div>

              <div>

                <div className="flex items-center gap-2.5 flex-wrap">

                  <h2 className="text-lg md:text-xl font-black text-[#0f172a] dark:text-white uppercase tracking-tight leading-none" style={{ fontFamily: "'Fraunces', serif" }}>

                    {title}

                  </h2>

                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${accent ? `${accent.badgeBg} ${accent.badgeText}` : 'bg-[#e0f2fe] dark:bg-[#1b264f] text-[#0284c7] dark:text-[#38bdf8] border-[#bae6fd]/70 dark:border-[#223269]'}`}>

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

              {(activeTab === 'master_vendor' || activeTab === 'master_actual_vendor' || activeTab === 'master_transport' || activeTab === 'master_hsn' || activeTab === 'catalog_material' || activeTab === 'catalog_category') && (

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

                      } else if (activeTab === 'master_actual_vendor') {

                        headers = ['Vendor Name', 'Company Name', 'Category / Tag', 'Email Address', 'Phone Number', 'Billing Address'];

                        sampleRow = ['Jane Smith', 'Supplies Inc', 'Regular Supplier', 'jane@supplies.com', '+1 555-0245', '456 Vendor Blvd, Boston'];

                        filename = 'vendor_database_template.csv';

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

                        master_vendor: 'Client Database',

                        master_actual_vendor: 'Vendor Database',

                        master_transport: 'Transport Database',

                        master_hsn: 'HSN Registry',

                        catalog_material: 'Material Catalog',

                        catalog_category: 'Product Category'

                      };

                      emitNotification('Template Downloaded', `${tabLabelDl[activeTab] || 'Registry'} CSV template saved — "${filename}".`, 'success');

                    }}

                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[#f4f9ff] hover:bg-[#e0f2fe] dark:bg-[#1b264f]/40 dark:hover:bg-[#1b264f] text-[#0284c7] dark:text-[#38bdf8] rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer border border-[#bae6fd] dark:border-[#223269] hover:-translate-y-px active:scale-[0.98]"

                  >

                    <Download className="w-3.5 h-3.5" />

                    <span>Download Template</span>

                  </button>



                  {/* Bulk Upload */}

                  <button

                    onClick={() => {

                      if (subscriptionTier === 'free') {
                        emitNotification('Feature Locked 🔒', 'Bulk Database Upload is available on Basic, Professional, and Enterprise plans. Please upgrade your plan to unlock bulk operations.', 'error');
                        if (typeof window !== 'undefined') {
                          window.dispatchEvent(new CustomEvent('mak_navigate_tab', { detail: 'subscription' }));
                        }
                        return;
                      }

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

                                if (activeTab === 'master_actual_vendor') return { id, name: rowData.name || rowData['Vendor Name'] || 'Unnamed Vendor', company: rowData.company || rowData['Company Name'] || '', category: rowData.category || rowData['Category / Tag'] || rowData['Category'] || '', email: rowData.email || rowData['Email Address'] || '', phone: rowData.phone || rowData['Phone Number'] || '', address: rowData.address || rowData['Billing Address'] || '' };

                                if (activeTab === 'master_transport') return { id, name: rowData.name || rowData['Transport Name'] || 'Unnamed Carrier', phone: rowData.phone || rowData['Driver Mobile'] || '', vehicleNo: rowData.vehicleNo || rowData['Vehicle No'] || '', ewayBillNo: rowData.ewayBillNo || rowData['E-Way Bill No'] || '', station: rowData.station || rowData['Station'] || '', grRrNo: rowData.grRrNo || rowData['GR/RR No.'] || '' };

                                if (activeTab === 'master_hsn') return { id, code: rowData.code || rowData['HSN/SAC Code'] || '000000', description: rowData.description || rowData['Description'] || '', gstRate: Number(rowData.gstRate || rowData['Tax Rate (%)'] || 18) };

                                if (activeTab === 'catalog_material') return { id, name: rowData.name || rowData['Item Name'] || 'Unnamed Material', rate: Number(rowData.rate || rowData['Standard Rate / Unit Price'] || 0), hsn: rowData.hsn || rowData['HSN/SAC Code'] || '', uom: rowData.uom || rowData['Unit of Measure (UOM)'] || 'pcs', category: rowData.category || rowData['Category'] || '' };

                                if (activeTab === 'catalog_category') return { id, name: rowData.name || rowData['Category Name'] || 'Unnamed Category', description: rowData.description || rowData['Description'] || '' };

                                return null;

                              }).filter(Boolean);

                              if (finalItems.length === 0) { alert('No valid items found in file.'); return; }

                              let currentList: any[] = [], storageKey = '', setterFn: any = null;

                              if (activeTab === 'master_vendor') { currentList = vendors; storageKey = 'makbills_masters_vendors' + suffix; setterFn = setVendors; }

                              else if (activeTab === 'master_actual_vendor') { currentList = actualVendors; storageKey = 'makbills_masters_actual_vendors' + suffix; setterFn = setActualVendors; }

                              else if (activeTab === 'master_transport') { currentList = transports; storageKey = 'makbills_masters_transports' + suffix; setterFn = setTransports; }

                              else if (activeTab === 'master_hsn') { currentList = hsnCodes; storageKey = 'makbills_masters_hsn' + suffix; setterFn = setHsnCodes; }

                              else if (activeTab === 'catalog_material') { currentList = materials; storageKey = 'makbills_masters_materials' + suffix; setterFn = setMaterials; }

                              else if (activeTab === 'catalog_category') { currentList = categories; storageKey = 'makbills_masters_categories' + suffix; setterFn = setCategories; }

                              if (setterFn) { const updatedList = [...finalItems, ...currentList]; setterFn(updatedList); localStorage.setItem(storageKey, JSON.stringify(updatedList)); const tabLabelUp: Record<string, string> = { master_vendor: 'Client Database', master_actual_vendor: 'Vendor Database', master_transport: 'Transport Database', master_hsn: 'HSN Registry', catalog_material: 'Material Catalog', catalog_category: 'Product Category' }; emitNotification('Bulk Upload Complete', `${finalItems.length} records imported into ${tabLabelUp[activeTab] || 'Registry'} successfully.`, 'info'); }

                            } catch (err: any) { alert('Error parsing file: ' + err.message); }

                          };

                          reader.readAsBinaryString(file);

                        }

                      };

                      input.click();

                    }}

                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[#f4f9ff] hover:bg-[#e0f2fe] dark:bg-[#1b264f]/40 dark:hover:bg-[#1b264f] text-[#0284c7] dark:text-[#38bdf8] rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer border border-[#bae6fd] dark:border-[#223269] hover:-translate-y-px active:scale-[0.98]"

                  >

                    {subscriptionTier === 'free' ? (
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}

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

                className="flex items-center gap-1.5 px-4 py-2 bg-[#0284c7] dark:bg-[#38bdf8] border border-[#0369a1] dark:border-[#0284c7] hover:bg-[#0369a1] dark:hover:bg-[#0284c7] text-white dark:text-[#0b1329] rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer hover:-translate-y-px active:scale-[0.98]"

              >

                <Plus className="w-3.5 h-3.5" />

                <span>Add Registry Record</span>

              </button>

            </div>

          </div>

        </div>



        {/* â”€â”€ Search Bar â”€â”€ */}

        <div className="relative">

          <Search className="w-4 h-4 text-[#64748b]/60 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />

          <input

            type="text"

            placeholder={`Search through ${list.length} ${list.length === 1 ? 'directory' : 'directories'} live...`}

            value={searchTerm}

            onChange={(e) => { setSearchTerm(e.target.value); setClientPage(0); }}

            className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269] rounded-2xl text-sm text-[#0f172a] dark:text-zinc-200 placeholder-[#64748b]/45 focus:outline-none focus:border-[#0284c7] dark:focus:border-[#38bdf8] transition-all"

            style={{ boxShadow: '0 1px 4px rgba(2,132,199,0.06), inset 0 1px 3px rgba(2,132,199,0.04)' }}

          />

        </div>



        {/* â”€â”€ Table Card â”€â”€ */}

        <div className="bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl overflow-hidden shadow-xs">

          {filteredList.length === 0 ? (

            <div className="py-16 text-center">

              <div className="w-12 h-12 rounded-2xl bg-[#e0f2fe] dark:bg-[#1b264f] flex items-center justify-center mx-auto mb-3">

                <Database className="w-5 h-5 text-[#0284c7] dark:text-[#38bdf8] animate-pulse" />

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

                    <tr className={`border-b border-[#bae6fd]/30 dark:border-[#223269]/30 ${accent ? `${accent.theadBg}` : 'bg-[#f4f9ff] dark:bg-[#0b1329]'}`}>

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

                  <tbody className="divide-y divide-[#bae6fd]/20 dark:divide-[#223269]/20">

                    {pagedList.map((item, rowIdx) => (

                      <tr

                        key={item.id}

                        className="group hover:bg-[#e0f2fe]/20 dark:hover:bg-[#1b264f]/20 transition-colors duration-100"

                      >

                        {columns.map((col, idx2) => {

                          const cellVal = item[col.key];

                          const isFirstCol = idx2 === 0;



                          return (

                            <td key={idx2} className="px-4 py-3.5">

                              {isFirstCol ? (

                                <div className="flex items-center gap-3">

                                  {/* Avatar — per-tab accent color */}

                                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${accent ? `${accent.avatarBg} ${accent.avatarBgDark}` : 'bg-[#e0f2fe] border-[#bae6fd] dark:bg-[#1b264f] dark:border-[#223269]'}`}>

                                    {(activeTab === 'master_vendor' || activeTab === 'master_actual_vendor') && <User className={`w-3.5 h-3.5 ${accent ? `${accent.avatarIcon} ${accent.avatarIconDark}` : 'text-[#64748b] dark:text-zinc-400'}`} />}

                                    {activeTab === 'master_transport' && <Truck className={`w-3.5 h-3.5 ${accent ? `${accent.avatarIcon} ${accent.avatarIconDark}` : 'text-[#64748b] dark:text-zinc-400'}`} />}

                                    {activeTab === 'master_hsn' && <FileSpreadsheet className={`w-3.5 h-3.5 ${accent ? `${accent.avatarIcon} ${accent.avatarIconDark}` : 'text-[#64748b] dark:text-zinc-400'}`} />}

                                    {activeTab === 'catalog_material' && <Wrench className={`w-3.5 h-3.5 ${accent ? `${accent.avatarIcon} ${accent.avatarIconDark}` : 'text-[#64748b] dark:text-zinc-400'}`} />}

                                    {activeTab === 'catalog_category' && <Tag className={`w-3.5 h-3.5 ${accent ? `${accent.avatarIcon} ${accent.avatarIconDark}` : 'text-[#64748b] dark:text-zinc-400'}`} />}

                                  </div>

                                  <span className="text-xs font-extrabold uppercase tracking-tight text-[#0f172a] dark:text-white">

                                    {String(cellVal || '')}

                                  </span>

                                </div>

                              ) : col.key === 'rate' ? (

                                <span className="text-xs font-mono font-semibold text-[#0f172a] dark:text-zinc-200">

                                  {currencySymbol}{formatNum(cellVal || 0)}

                                </span>

                              ) : col.key === 'category' ? (

                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${getCategoryBadgeStyle(cellVal)}`}>

                                  {cellVal || 'General'}

                                </span>

                              ) : col.key === 'email' ? (

                                <span className="text-[11px] text-sky-600 dark:text-sky-400 font-medium font-mono lowercase">

                                  {cellVal || '-'}

                                </span>

                              ) : col.key === 'phone' ? (

                                <span className="text-[11px] text-[#64748b]/90 dark:text-zinc-400 font-mono">

                                  {cellVal || '-'}

                                </span>

                              ) : (

                                <span className="text-[11px] text-[#0f172a] dark:text-zinc-300 font-medium">

                                  {String(cellVal || '-')}

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

                              className="p-2 text-[#64748b]/70 hover:text-[#0284c7] dark:text-zinc-500 dark:hover:text-[#38bdf8] hover:bg-[#e0f2fe]/50 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer opacity-100 lg:opacity-0 lg:group-hover:opacity-100"

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

              <div className="md:hidden flex flex-col divide-y divide-[#bae6fd]/20 dark:divide-zinc-800/60">

                {pagedList.map((item, rowIdx) => (

                  <div key={item.id} className="p-4 flex flex-col gap-3">

                    <div className="flex justify-between items-start gap-2">

                      <div className="flex items-start gap-3">

                        {/* Avatar */}

                        <div className={`w-9 h-9 mt-0.5 rounded-lg border flex items-center justify-center shrink-0 ${accent ? `${accent.avatarBg} ${accent.avatarBgDark}` : 'bg-[#e0f2fe] border-[#bae6fd] dark:bg-[#1b264f] dark:border-[#223269]'}`}>

                          {(activeTab === 'master_vendor' || activeTab === 'master_actual_vendor') && <User className={`w-4 h-4 ${accent ? `${accent.avatarIcon} ${accent.avatarIconDark}` : 'text-[#64748b] dark:text-zinc-400'}`} />}

                          {activeTab === 'master_transport' && <Truck className={`w-4 h-4 ${accent ? `${accent.avatarIcon} ${accent.avatarIconDark}` : 'text-[#64748b] dark:text-zinc-400'}`} />}

                          {activeTab === 'master_hsn' && <FileSpreadsheet className={`w-4 h-4 ${accent ? `${accent.avatarIcon} ${accent.avatarIconDark}` : 'text-[#64748b] dark:text-zinc-400'}`} />}

                          {activeTab === 'catalog_material' && <Wrench className={`w-4 h-4 ${accent ? `${accent.avatarIcon} ${accent.avatarIconDark}` : 'text-[#64748b] dark:text-zinc-400'}`} />}

                          {activeTab === 'catalog_category' && <Tag className={`w-4 h-4 ${accent ? `${accent.avatarIcon} ${accent.avatarIconDark}` : 'text-[#64748b] dark:text-zinc-400'}`} />}

                        </div>

                        <div className="flex-1 min-w-0">

                          <span className="text-sm font-black uppercase tracking-tight text-[#0f172a] dark:text-white block truncate">

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

                          className="p-2 text-[#64748b]/70 hover:text-[#0284c7] dark:text-zinc-500 dark:hover:text-[#38bdf8] bg-[#e0f2fe]/40 hover:bg-[#e0f2fe] dark:bg-[#1b264f]/40 dark:hover:bg-[#1b264f] rounded-lg transition-all"

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

                      <div className="grid grid-cols-1 gap-2.5 mt-2 bg-[#f4f9ff] dark:bg-[#0b1329]/60 border border-[#bae6fd]/40 dark:border-[#223269]/40 p-3 rounded-xl">

                        {columns.slice(1).map((col, idx2) => {

                          const cellVal = item[col.key];

                          return (

                            <div key={idx2} className="flex justify-between items-start gap-4">

                              <span className="text-[10px] text-[#64748b]/80 dark:text-zinc-400 font-bold uppercase tracking-wider shrink-0 mt-0.5">{col.header}</span>

                              <span className="text-xs text-[#0f172a] dark:text-zinc-200 font-medium text-right break-words overflow-hidden">

                                {col.key === 'rate' ? (

                                  <span className="font-mono font-bold">

                                    {currencySymbol}{formatNum(cellVal || 0)}

                                  </span>

                                ) : col.key === 'category' ? (

                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${getCategoryBadgeStyle(cellVal)}`}>

                                    {cellVal || 'General'}

                                  </span>

                                ) : col.key === 'email' ? (

                                  <span className="text-sky-600 dark:text-sky-400 font-medium font-mono lowercase break-all">

                                    {cellVal || '-'}

                                  </span>

                                ) : col.key === 'phone' ? (

                                  <span className="text-[#64748b]/90 dark:text-zinc-400 font-mono">

                                    {cellVal || '-'}

                                  </span>

                                ) : (

                                  <span>{String(cellVal || '-')}</span>

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

              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[#bae6fd]/30 dark:border-[#223269]/30 bg-[#f4f9ff] dark:bg-[#0b1329]/40">

                <span className="text-[10px] text-[#64748b]/75 dark:text-zinc-500 font-medium">

                  Showing {Math.min(safePage * CLIENT_PAGE_SIZE + 1, filteredList.length)}-{Math.min((safePage + 1) * CLIENT_PAGE_SIZE, filteredList.length)} of {filteredList.length} {activeTab === 'master_vendor' ? 'client' : activeTab === 'master_actual_vendor' ? 'vendor' : activeTab === 'master_transport' ? 'transport' : 'registry'} records

                </span>

                <div className="flex items-center gap-1">

                  <button

                    onClick={() => setClientPage(p => Math.max(0, p - 1))}

                    disabled={safePage === 0}

                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#bae6fd]/60 dark:border-[#223269]/60 text-[#0284c7] dark:text-[#38bdf8] hover:bg-[#e0f2fe] dark:hover:bg-[#1b264f] disabled:opacity-35 disabled:cursor-not-allowed transition-all cursor-pointer text-xs"

                    aria-label="Previous page"

                  >

                    {'<'}

                  </button>

                  <button

                    onClick={() => setClientPage(p => Math.min(totalPages - 1, p + 1))}

                    disabled={safePage >= totalPages - 1}

                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#bae6fd]/60 dark:border-[#223269]/60 text-[#0284c7] dark:text-[#38bdf8] hover:bg-[#e0f2fe] dark:hover:bg-[#1b264f] disabled:opacity-35 disabled:cursor-not-allowed transition-all cursor-pointer text-xs"

                    aria-label="Next page"

                  >

                    {'>'}

                  </button>

                </div>

              </div>

            </>

          )}

        </div>





        {/* â”€â”€ Master Registry Form Modal â”€â”€ */}

        {isMasterModalOpen && editingMasterItem && (

          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm">

            <div className="w-full max-w-sm bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-3xl flex flex-col max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-150">

              <div className="flex justify-between items-center p-4 sm:p-5 pb-3 border-b border-[#bae6fd]/30 dark:border-[#223269]/30 shrink-0 bg-[#f4f9ff] dark:bg-[#0b1329]/50">

                <h3 className="text-xs font-extrabold text-[#0284c7] dark:text-[#38bdf8] uppercase tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>Record Editor</h3>

                <button

                  onClick={() => { setIsMasterModalOpen(false); setEditingMasterItem(null); }}

                  className="p-1.5 hover:bg-[#e0f2fe] dark:hover:bg-[#1b264f] text-[#64748b] hover:text-[#0284c7] dark:hover:text-[#38bdf8] rounded-full transition-colors cursor-pointer"

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

                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[#64748b] dark:text-zinc-400 mb-1.5">{f.label}</label>

                      {f.type === 'select' ? (

                        <select

                          value={editingMasterItem[f.key] || ''}

                          onChange={(e) => setEditingMasterItem({ ...editingMasterItem, [f.key]: e.target.value })}

                          className="w-full px-3.5 py-2 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-xl text-xs font-medium text-[#0f172a] dark:text-white focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7] dark:focus:border-[#38bdf8] transition-all outline-none"

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

                          className="w-full px-3.5 py-2 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-xl text-xs font-medium text-[#0f172a] dark:text-white focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7] dark:focus:border-[#38bdf8] transition-all outline-none"

                          required

                        />

                      )}

                    </div>

                  ))}

                  <div className="pt-2 flex justify-end gap-2">

                    <button

                      type="button"

                      onClick={() => { setIsMasterModalOpen(false); setEditingMasterItem(null); }}

                      className="px-3 py-1.5 bg-[#f4f9ff] hover:bg-[#e0f2fe] dark:bg-[#1b264f]/40 dark:hover:bg-[#1b264f] text-[#0284c7] dark:text-[#38bdf8] border border-[#bae6fd] dark:border-[#223269] rounded-lg text-[9px] font-bold cursor-pointer transition-colors"

                    >

                      Cancel

                    </button>

                    <button

                      type="submit"

                      className="px-4 py-1.5 bg-[#0284c7] dark:bg-[#38bdf8] hover:bg-[#0369a1] dark:hover:bg-[#0284c7] text-white dark:text-[#0b1329] border border-[#0369a1] dark:border-[#0284c7] rounded-lg text-[9px] font-bold cursor-pointer transition-all shadow-md shadow-[#0284c7]/20"

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

      const paidAmt = inv.status === 'paid' ? (inv.paidAmount ?? inv.grandTotal) : (inv.paidAmount ?? 0);

      if (paidAmt > 0) {

        const dateObj = new Date(inv.date);

        if (!isNaN(dateObj.getTime())) {

          const label = monthsShort[dateObj.getMonth()];

          const match = records.find(r => r.label === label);

          if (match) match.income += paidAmt;

        }

      }

    });



    // Populate expenses

    expenses.forEach(exp => {

      const dateObj = new Date(exp.expense_date || exp.date || '');

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

  const [ledgerSection, setLedgerSection] = useState<'invoice' | 'proforma' | 'credit_note' | 'debit_note' | 'quote'>('invoice');

  const [purchaseLedgerSection, setPurchaseLedgerSection] = useState<'purchases' | 'purchase_order' | 'purchase_debit_note'>('purchases');

  const [sectionSortMap, setSectionSortMap] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {
      invoice: 'issue_date_desc',
      proforma: 'issue_date_desc',
      credit_note: 'issue_date_desc',
      debit_note: 'issue_date_desc',
      quote: 'issue_date_desc',
      purchases: 'issue_date_desc',
      purchase_order: 'issue_date_desc',
      purchase_debit_note: 'issue_date_desc',
    };
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('makbills_section_sort_map');
      if (saved) {
        try {
          return { ...defaults, ...JSON.parse(saved) };
        } catch (e) {}
      }
    }
    return defaults;
  });

  const currentSectionKey = activeTab === 'purchases' ? purchaseLedgerSection : ledgerSection;
  const sortBy = sectionSortMap[currentSectionKey] || 'issue_date_desc';

  const handleSetSortBy = useCallback((newSort: string) => {
    setSectionSortMap(prev => {
      const updated = { ...prev, [currentSectionKey]: newSort };
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('makbills_section_sort_map', JSON.stringify(updated));
      }
      return updated;
    });
  }, [currentSectionKey]);

  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);



  // Automatically flush bulk selection upon any filter/tab/sort alterations

  React.useEffect(() => {

    setSelectedInvoiceIds([]);

  }, [searchTerm, statusFilter, sortBy, activeTab]);



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

  const [selectedCopies, setSelectedCopies] = useState({

    customer: true,

    transport: false,

    supplier: false,

    challan: false,

  });

  const previewRef = useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState(1123);

  useEffect(() => {
    const element = previewRef.current;
    if (!element) return;
    setMeasuredHeight(element.scrollHeight || 1123);

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setMeasuredHeight(entry.target.scrollHeight || 1123);
      }
    });

    resizeObserver.observe(element);
    return () => {
      resizeObserver.disconnect();
    };
  }, [activePreviewInvoice, selectedCopies]);

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



  // Reset selectedCopies to only Original (Customer) copy when opening a document preview
  useEffect(() => {
    if (activePreviewInvoice) {
      setSelectedCopies({ customer: true, transport: false, supplier: false, challan: false });
    }
  }, [activePreviewInvoice?.id]);



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

  const [reportDocTypeFilter, setReportDocTypeFilter] = useState('all');
  const [reportSortBy, setReportSortBy] = useState<'doc_no_asc' | 'doc_no_desc' | 'date_asc' | 'date_desc' | 'amount_asc' | 'amount_desc'>('doc_no_asc');





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

      const path = (window.location.pathname || '').toLowerCase();

      const hash = (window.location.hash || '').toLowerCase().replace('#', '');

      const searchParams = new URLSearchParams(window.location.search);

      const paramType = (searchParams.get('section') || searchParams.get('type') || '').toLowerCase();

      const target = path.includes('/purchases') ? path : (hash || paramType);



      if (target.includes('purchase-order') || target.includes('po')) {

        setPurchaseLedgerSection('purchase_order');

      } else if (target.includes('debit-note') || target.includes('debit')) {

        if (path.includes('/purchases')) {

          setPurchaseLedgerSection('purchase_debit_note');

        } else {

          setLedgerSection('debit_note');

        }

      } else if (target.includes('purchases')) {

        setPurchaseLedgerSection('purchases');

      } else if (target.includes('proforma')) {

        setLedgerSection('proforma');

      } else if (target.includes('credit')) {

        setLedgerSection('credit_note');

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



  const [manualPurchaserIds, setManualPurchaserIds] = useState<string[]>(() => {

    if (typeof window !== 'undefined') {

      const cached = localStorage.getItem('makbills_manual_purchasers');

      return cached ? JSON.parse(cached) : [];

    }

    return [];

  });



  const getInvoiceDocumentType = (inv: Invoice): 'invoice' | 'proforma' | 'credit_note' | 'debit_note' | 'quote' | 'purchases' | 'purchase_order' | 'purchase_debit_note' => {

    const rawType = (inv.invoiceType || '').toLowerCase().trim();

    if (rawType === 'purchases' || rawType === 'purchase_bill' || rawType === 'purchase') return 'purchases';

    if (rawType === 'purchase_order' || rawType === 'po') return 'purchase_order';

    if (rawType === 'purchase_debit_note' || rawType === 'purchase_dn') return 'purchase_debit_note';

    if (rawType === 'proforma' || rawType === 'proforma_invoice') return 'proforma';

    if (rawType === 'credit_note' || rawType === 'credit') return 'credit_note';

    if (rawType === 'debit_note' || rawType === 'debit') return 'debit_note';

    if (rawType === 'estimate' || rawType === 'quote' || rawType === 'quotation') return 'quote';



    const title = (inv.embeddedTemplate?.config?.header?.invoiceTitle || '').toLowerCase();

    if (title.includes('purchase order')) return 'purchase_order';

    if (title.includes('purchase debit')) return 'purchase_debit_note';

    if (title.includes('purchase')) return 'purchases';

    if (title.includes('proforma')) return 'proforma';

    if (title.includes('credit')) return 'credit_note';

    if (title.includes('debit')) return 'debit_note';

    if (title.includes('quote') || title.includes('estimate') || title.includes('quotation')) return 'quote';



    return 'invoice';

  };



  // Set of names/emails associated with purchase documents

  const purchaseInvoices = useMemo(() => {

    return invoices.filter(inv => {

      const docType = getInvoiceDocumentType(inv);

      return ['purchases', 'purchase_order', 'purchase_debit_note'].includes(docType);

    });

  }, [invoices]);



  const purchaserNames = useMemo(() => {

    return new Set(purchaseInvoices.map(i => (i.clientName || '').trim().toLowerCase()));

  }, [purchaseInvoices]);



  const purchaserEmails = useMemo(() => {

    return new Set(purchaseInvoices.map(i => (i.clientEmail || '').trim().toLowerCase()));

  }, [purchaseInvoices]);



  // Set of names/emails associated with sales documents

  const salesInvoices = useMemo(() => {

    return invoices.filter(inv => {

      const docType = getInvoiceDocumentType(inv);

      return !['purchases', 'purchase_order', 'purchase_debit_note'].includes(docType);

    });

  }, [invoices]);



  const salesClientNames = useMemo(() => {

    return new Set(salesInvoices.map(i => (i.clientName || '').trim().toLowerCase()));

  }, [salesInvoices]);



  const salesClientEmails = useMemo(() => {

    return new Set(salesInvoices.map(i => (i.clientEmail || '').trim().toLowerCase()));

  }, [salesInvoices]);



  // Billed Clients Filtered

  const billedClientsFiltered = useMemo(() => {

    return clients.filter(c => {

      const nameLower = (c.name || '').trim().toLowerCase();

      const emailLower = (c.email || '').trim().toLowerCase();

      const isManualPurchaser = manualPurchaserIds.includes(c.id);

      

      if (isManualPurchaser) return false;

      

      const isReferencedInSales = salesClientNames.has(nameLower) || (c.email && salesClientEmails.has(emailLower));

      const isReferencedInPurchases = purchaserNames.has(nameLower) || (c.email && purchaserEmails.has(emailLower));

      

      if (isReferencedInSales) return true;

      if (isReferencedInPurchases) return false;

      return true; // Default

    });

  }, [clients, manualPurchaserIds, salesClientNames, salesClientEmails, purchaserNames, purchaserEmails]);



  // Purchasers Filtered

  const purchasersFiltered = useMemo(() => {

    return clients.filter(c => {

      const nameLower = (c.name || '').trim().toLowerCase();

      const emailLower = (c.email || '').trim().toLowerCase();

      const isManualPurchaser = manualPurchaserIds.includes(c.id);

      

      if (isManualPurchaser) return true;

      

      const isReferencedInPurchases = purchaserNames.has(nameLower) || (c.email && purchaserEmails.has(emailLower));

      return isReferencedInPurchases;

    });

  }, [clients, manualPurchaserIds, purchaserNames, purchaserEmails]);



  const handleDeleteClientWrap = async (clientId: string) => {

    onDeleteClient(clientId);

    const newManualIds = manualPurchaserIds.filter(id => id !== clientId);

    setManualPurchaserIds(newManualIds);

    localStorage.setItem('makbills_manual_purchasers', JSON.stringify(newManualIds));

  };



  const currencySymbol = profile.currencySymbol || getCurrencySymbol(profile.currency);

  const [isPurchasesLedgerExpanded, setIsPurchasesLedgerExpanded] = useState(false);



  useEffect(() => {
    setShowBinView(false);
  }, [activeTab, ledgerSection, purchaseLedgerSection]);



  const documentTypeCounts = useMemo(() => {

    const counts: Record<string, number> = { invoice: 0, proforma: 0, credit_note: 0, debit_note: 0, quote: 0, purchases: 0, purchase_order: 0, purchase_debit_note: 0 };

    // Only count non-draft, non-deleted documents in the ledger tabs
    invoices.filter(inv => !inv.isDeleted && inv.status !== 'draft').forEach(inv => {
      const docType = getInvoiceDocumentType(inv);
      counts[docType] = (counts[docType] || 0) + 1;
    });

    return counts;

  }, [invoices]);



  const sectionInvoices = useMemo(() => {
    let filtered = [];
    if (activeTab === 'purchases') {
      filtered = invoices.filter(inv => inv.status !== 'draft' && getInvoiceDocumentType(inv) === purchaseLedgerSection);
    } else {
      // Exclude drafts from ledger listings — drafts belong exclusively to the Drafts page
      filtered = invoices.filter(inv => inv.status !== 'draft' && getInvoiceDocumentType(inv) === ledgerSection);
    }
    if (showBinView) {
      return filtered.filter(inv => inv.isDeleted);
    }
    return filtered.filter(inv => !inv.isDeleted);
  }, [invoices, ledgerSection, purchaseLedgerSection, activeTab, showBinView]);



  // --- STATS ENGINES ---

  const filteredInvoices = useMemo(() => {

    const list = sectionInvoices.filter(inv => {

      const matchesSearch = !searchTerm ||
                            (inv.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (inv.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            ((inv as any).clientCompanyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            ((inv as any).clientCompany || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter = statusFilter === 'all' || inv.status === statusFilter;

      return matchesSearch && matchesFilter;

    });



    return [...list].sort((a, b) => {

      switch (sortBy) {

        case 'issue_date_asc':

          return new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();

        case 'issue_date_desc':

          return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();

        case 'due_date_asc':

          return new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime();

        case 'due_date_desc':

          return new Date(b.dueDate || 0).getTime() - new Date(a.dueDate || 0).getTime();

        case 'amount_asc':

          return (a.grandTotal || 0) - (b.grandTotal || 0);

        case 'amount_desc':

          return (b.grandTotal || 0) - (a.grandTotal || 0);

        case 'number_asc':

          return (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '', undefined, { numeric: true, sensitivity: 'base' });

        case 'number_desc':

        default:

          return (b.invoiceNumber || '').localeCompare(a.invoiceNumber || '', undefined, { numeric: true, sensitivity: 'base' });

      }

    });

  }, [sectionInvoices, searchTerm, statusFilter, sortBy]);



  const formatNum = useCallback((val: number | string, forceDecimals: boolean = false) => {

    const num = typeof val === 'string' ? parseFloat(val) : val;

    if (isNaN(num)) return '0';

    const isIndia = profile?.country?.toLowerCase() === 'india' || profile?.country?.toLowerCase() === 'in';

    const locale = isIndia ? 'en-IN' : 'en-US';

    return num.toLocaleString(locale, {

      minimumFractionDigits: forceDecimals ? 2 : (num % 1 === 0 ? 0 : 1),

      maximumFractionDigits: 2

    });

  }, [profile?.country]);



  // Non-draft, non-deleted Tax Invoices only for Global Sales Ledger totals & Analytics
  const allLedgerInvoices = useMemo(() => {
    const rawList = invoices.filter(inv => inv.status !== 'draft' && getInvoiceDocumentType(inv) === 'invoice' && !inv.isDeleted);
    const deduplicatedMap = new Map<string, Invoice>();
    rawList.forEach(inv => {
      const docType = (getInvoiceDocumentType(inv) || 'invoice').toLowerCase();
      const invNum = (inv.invoiceNumber || '').trim().toLowerCase();
      const key = invNum ? `${docType}_${invNum}` : inv.id;
      if (!deduplicatedMap.has(key)) {
        deduplicatedMap.set(key, inv);
      } else {
        const existing = deduplicatedMap.get(key)!;
        const existingTime = new Date(existing.updatedAt || existing.createdAt || existing.date || 0).getTime();
        const newTime = new Date(inv.updatedAt || inv.createdAt || inv.date || 0).getTime();
        if (newTime >= existingTime) {
          deduplicatedMap.set(key, inv);
        }
      }
    });
    return Array.from(deduplicatedMap.values());
  }, [invoices]);

  const totalBilled = allLedgerInvoices
    .filter(inv => inv.status !== 'cancelled')
    .reduce((sum, inv) => sum + (inv.status === 'paid' ? (inv.paidAmount ?? inv.grandTotal) : (inv.paidAmount ?? 0)), 0);

  const totalOutstanding = allLedgerInvoices
    .filter(inv => inv.status !== 'cancelled')
    .reduce((sum, inv) => sum + (inv.status === 'paid' ? 0 : Math.max(0, inv.grandTotal - (inv.paidAmount ?? 0))), 0);

  const totalTax = allLedgerInvoices
    .filter(inv => inv.status !== 'cancelled')
    .reduce((sum, inv) => sum + (inv.taxTotal || 0), 0);

  // Purchase Bills Analytics — strictly active purchase bills ('purchases') only
  const allPurchaseBills = useMemo(() => {
    const rawList = invoices.filter(inv =>
      inv.status !== 'draft' &&
      inv.status !== 'cancelled' &&
      !inv.isDeleted &&
      getInvoiceDocumentType(inv) === 'purchases'
    );
    const deduplicatedMap = new Map<string, Invoice>();
    rawList.forEach(inv => {
      const docType = (getInvoiceDocumentType(inv) || 'invoice').toLowerCase();
      const invNum = (inv.invoiceNumber || '').trim().toLowerCase();
      const key = invNum ? `${docType}_${invNum}` : inv.id;
      if (!deduplicatedMap.has(key)) {
        deduplicatedMap.set(key, inv);
      } else {
        const existing = deduplicatedMap.get(key)!;
        const existingTime = new Date(existing.updatedAt || existing.createdAt || existing.date || 0).getTime();
        const newTime = new Date(inv.updatedAt || inv.createdAt || inv.date || 0).getTime();
        if (newTime >= existingTime) {
          deduplicatedMap.set(key, inv);
        }
      }
    });
    return Array.from(deduplicatedMap.values());
  }, [invoices]);

  const totalPurchaseAmount = allPurchaseBills.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  const totalPurchaseGst    = allPurchaseBills.reduce((sum, inv) => sum + (inv.taxTotal || 0), 0);
  // Net Tax Liability = GST Collected on Sales − Input Tax Credit from Purchases (floor at 0)
  const netTaxLiability     = Math.max(0, totalTax - totalPurchaseGst);

  // Total Sales Analytics — sum of all active Tax Invoices grandTotal (irrespective of due or paid)
  const totalSalesAmount = useMemo(() => {
    return allLedgerInvoices
      .filter(inv => inv.status !== 'cancelled')
      .reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  }, [allLedgerInvoices]);

  // Stock Analytics Value = Purchases (Purchase Bills grandTotal) − Sales (Tax Invoices grandTotal)
  const stockAnalyticsValue = totalPurchaseAmount - totalSalesAmount;

  // Dynamic sparkline heights (px, 2–24 range) based on last 5 months of Total Sales
  const totalSalesSparklineHeights = useMemo(() => {
    const now = new Date();
    const months: number[] = [];
    for (let i = 4; i >= 0; i--) {
      const y = new Date(now.getFullYear(), now.getMonth() - i, 1).getFullYear();
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1).getMonth();
      const total = allLedgerInvoices
        .filter(inv => {
          if (inv.status === 'cancelled') return false;
          const d = new Date(inv.date);
          return d.getFullYear() === y && d.getMonth() === m;
        })
        .reduce((s, inv) => s + (inv.grandTotal || 0), 0);
      months.push(total);
    }
    const maxM = Math.max(...months, 1);
    return months.map(v => Math.max(2, Math.round((v / maxM) * 24)));
  }, [allLedgerInvoices]);

  // Dynamic sparkline heights (px, 2–24 range) based on last 5 months of Stock Net Value (|Purchases - Sales|)
  const stockSparklineHeights = useMemo(() => {
    const now = new Date();
    const months: number[] = [];
    for (let i = 4; i >= 0; i--) {
      const y = new Date(now.getFullYear(), now.getMonth() - i, 1).getFullYear();
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1).getMonth();
      const pur = allPurchaseBills
        .filter(inv => { const d = new Date(inv.date); return d.getFullYear() === y && d.getMonth() === m; })
        .reduce((s, inv) => s + (inv.grandTotal || 0), 0);
      const sal = allLedgerInvoices
        .filter(inv => { const d = new Date(inv.date); return d.getFullYear() === y && d.getMonth() === m; })
        .reduce((s, inv) => s + (inv.grandTotal || 0), 0);
      months.push(Math.abs(pur - sal));
    }
    const maxM = Math.max(...months, 1);
    return months.map(v => Math.max(2, Math.round((v / maxM) * 24)));
  }, [allPurchaseBills, allLedgerInvoices]);

  // Dynamic sparkline heights (px, 2–24 range) based on last 5 months of purchase amounts
  const purchaseSparklineHeights = useMemo(() => {
    const now = new Date();
    const months: number[] = [];
    for (let i = 4; i >= 0; i--) {
      const y = new Date(now.getFullYear(), now.getMonth() - i, 1).getFullYear();
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1).getMonth();
      const total = allPurchaseBills
        .filter(inv => { const d = new Date(inv.date); return d.getFullYear() === y && d.getMonth() === m; })
        .reduce((s, inv) => s + (inv.grandTotal || 0), 0);
      months.push(total);
    }
    const maxM = Math.max(...months, 1);
    return months.map(v => Math.max(2, Math.round((v / maxM) * 24)));
  }, [allPurchaseBills]);

  // Dynamic sparkline heights (px, 2–24 range) based on last 5 months of Supabase expenses
  const expenseSparklineHeights = useMemo(() => {
    const now = new Date();
    const months: number[] = [];
    for (let i = 4; i >= 0; i--) {
      const y = new Date(now.getFullYear(), now.getMonth() - i, 1).getFullYear();
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1).getMonth();
      const total = supabaseExpenses
        .filter(exp => {
          const d = new Date(exp.expense_date);
          return d.getFullYear() === y && d.getMonth() === m;
        })
        .reduce((s, exp) => s + (Number(exp.amount) || 0), 0);
      months.push(total);
    }
    const maxM = Math.max(...months, 1);
    return months.map(v => Math.max(2, Math.round((v / maxM) * 24)));
  }, [supabaseExpenses]);

  const totalDraft = invoices
    .filter(inv => inv.status === 'draft' && !inv.isDeleted)
    .reduce((sum, inv) => sum + inv.grandTotal, 0);

  const activeLedgerStats = useMemo(() => {
    const targets = invoices.filter(inv => {
      if (inv.status === 'draft') return false;
      if (showBinView ? !inv.isDeleted : inv.isDeleted) return false;
      const docType = getInvoiceDocumentType(inv);
      if (activeTab === 'purchases') {
        return docType === purchaseLedgerSection;
      } else {
        return docType === ledgerSection;
      }
    });



    const total = targets.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

    const paid = targets.reduce((sum, inv) => sum + (inv.status === 'paid' ? (inv.paidAmount ?? inv.grandTotal) : (inv.paidAmount ?? 0)), 0);

    const pending = targets.reduce((sum, inv) => sum + (inv.status === 'paid' ? 0 : Math.max(0, inv.grandTotal - (inv.paidAmount ?? 0))), 0);



    return { total, paid, pending };

  }, [invoices, activeTab, ledgerSection, purchaseLedgerSection]);



  const handleCreateDocumentForSection = (section: string) => {

    const today = new Date().toISOString().split('T')[0];



    // Use profile-configured prefixes with fallback defaults

    const prefixMap: Record<string, string> = {

      invoice: (profile.invoicePrefix || 'INV').toUpperCase(),

      proforma: (profile.proformaPrefix || 'PI').toUpperCase(),

      credit_note: (profile.creditNotePrefix || 'CN').toUpperCase(),

      debit_note: (profile.debitNotePrefix || 'DN').toUpperCase(),

      quote: (profile.quotePrefix || 'EST').toUpperCase(),

      purchases: 'PUR',

      purchase_order: 'PO',

      purchase_debit_note: 'PDN'

    };



    // Compute the next sequential number for this document type

    const startingMap: Record<string, number> = {

      invoice: parseInt(profile.startingInvoiceNumber || '1', 10),

      proforma: parseInt(profile.startingProformaNumber || '1', 10),

      credit_note: parseInt(profile.startingCreditNoteNumber || '1', 10),

      debit_note: parseInt(profile.startingDebitNoteNumber || '1', 10),

      quote: parseInt(profile.startingQuoteNumber || '1', 10),

      purchases: 1,

      purchase_order: 1,

      purchase_debit_note: 1

    };

    const existingCount = documentTypeCounts[section] || 0;

    const nextNum = (startingMap[section] || 1) + existingCount;

    const paddedNum = String(nextNum).padStart(4, '0');



    const titleMap: Record<string, string> = {

      invoice: 'TAX INVOICE',

      proforma: 'PROFORMA INVOICE',

      credit_note: 'CREDIT NOTE',

      debit_note: 'DEBIT NOTE',

      quote: 'QUOTATION / ESTIMATE',

      purchases: 'PURCHASE BILL',

      purchase_order: 'PURCHASE ORDER',

      purchase_debit_note: 'PURCHASE DEBIT NOTE'

    };

    const typeMap: Record<string, any> = {

      invoice: 'invoice',

      proforma: 'proforma',

      credit_note: 'credit_note',

      debit_note: 'debit_note',

      quote: 'estimate',

      purchases: 'purchases',

      purchase_order: 'purchase_order',

      purchase_debit_note: 'purchase_debit_note'

    };



    const fy = getFinancialYearShort(today);
    const prefix = prefixMap[section] || 'INV';
    const num = `${prefix}-${fy}-${paddedNum}`;



    const defaults = getDocumentTypeDefaults(section, profile);



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

      notes: defaults.notes,

      invoiceTerms: defaults.terms,

      status: 'pending',

      invoiceType: typeMap[section],
      createdAt: today,
      updatedAt: today
    };



    onOpenInvoiceEditor(draftDoc);

  };



  const renderDocTypeBadge = (inv: Invoice) => {

    const docType = getInvoiceDocumentType(inv);

    switch (docType) {

      case 'purchases':

        return <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/50 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Purchase Bill</span>;

      case 'purchase_order':

        return <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/50 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">P.O.</span>;

      case 'purchase_debit_note':

        return <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Debit Note</span>;

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

      case 'approved': return 'bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50';

      case 'partially_paid': return 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-100 dark:border-sky-900/50';

      case 'pending': return 'bg-amber-50 dark:bg-amber-950/45 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50';

      case 'rejected': return 'bg-rose-50 dark:bg-rose-950/45 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50';

      case 'draft': return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700';

      case 'cancelled': return 'bg-rose-50 dark:bg-rose-950/45 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50';

      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700';

    }

  };



  const getStatusText = (status: InvoiceStatus) => {

    switch (status) {

      case 'rejected': return 'Not Approved';

      case 'approved': return 'Approved';

      case 'pending': return 'Pending';

      case 'paid': return 'Paid';

      case 'partially_paid': return 'Partial';

      case 'cancelled': return 'Cancelled';

      case 'draft': return 'Draft';

      default: return status;

    }

  };



    function getSuccessorInvoiceNumber(inv: Invoice, invoicesList: Invoice[]): string {
    const docType = inv.invoiceType || 'invoice';
    const typedInvoices = invoicesList.filter(i => (i.invoiceType || 'invoice') === docType && i.status !== 'draft');
    let baseNum = inv.invoiceNumber;
    
    if (typedInvoices.length > 0) {
      const sorted = [...typedInvoices].sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.date || 0).getTime();
        const timeB = new Date(b.updatedAt || b.date || 0).getTime();
        return timeB - timeA;
      });
      if (sorted[0]?.invoiceNumber) {
        baseNum = sorted[0].invoiceNumber;
      }
    }
    
    if (baseNum.endsWith('-COPY')) {
      baseNum = baseNum.replace(/-COPY$/, '');
    }
    
    let candidate = baseNum;
    while (true) {
      const match = candidate.match(/^(.*?)(\d+)$/);
      if (!match) {
        candidate = `${candidate}-1`;
      } else {
        const prefix = match[1];
        const numStr = match[2];
        const nextNum = parseInt(numStr, 10) + 1;
        const paddedNum = String(nextNum).padStart(numStr.length, '0');
        candidate = `${prefix}${paddedNum}`;
      }
      const isTaken = invoicesList.some(i => i.invoiceNumber === candidate && (i.invoiceType || 'invoice') === docType && i.status !== 'draft');
      if (!isTaken) {
        break;
      }
    }
    return candidate;
  }

  const handleConvertDocument = (inv: Invoice, targetType: string) => {
    setActiveActionMenuId(null);
    if (subscriptionTier === 'free') {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mak_navigate_tab', { detail: 'subscription' }));
      }
      return;
    }
    const defaultPrefixes: Record<string, string> = {
      invoice: 'INV',
      proforma: 'PRO',
      debit_note: 'DN',
      credit_note: 'CN',
      estimate: 'EST',
      quote: 'EST',
      purchases: 'PUR',
      purchase_order: 'PO',
      purchase_debit_note: 'PDN'
    };
    const prefix = defaultPrefixes[targetType] || 'INV';
    const todayStr = new Date().toISOString().split('T')[0];
    const nextNumber = getNextInvoiceNumber(prefix, '1', invoices, targetType, todayStr);

    onOpenInvoiceEditor({
      // Base identifier
      id: '', // Blank ID ensures original source document stays intact
      invoiceType: targetType as any,
      invoiceNumber: nextNumber,
      referenceNumber: inv.invoiceNumber ? `Ref: ${inv.invoiceNumber}` : (inv.referenceNumber || ''),
      date: todayStr,
      dueDate: todayStr,
      status: 'pending',
      parentInvoiceId: inv.id || undefined,

      // Bill To details (copied 100%)
      clientName: inv.clientName || '',
      clientEmail: inv.clientEmail || '',
      clientPhone: inv.clientPhone || '',
      clientAddress: inv.clientAddress || '',
      clientGstin: inv.clientGstin || '',
      clientPan: inv.clientPan || '',
      clientCompanyName: inv.clientCompanyName || inv.clientCompany || '',
      clientCompany: inv.clientCompany || inv.clientCompanyName || '',
      clientState: inv.clientState || '',
      clientCountry: inv.clientCountry || '',

      // Ship To details (copied 100%)
      shippedToName: inv.shippedToName || '',
      shippedToPhone: inv.shippedToPhone || '',
      shippedToEmail: inv.shippedToEmail || '',
      shippedToAddress: inv.shippedToAddress || '',
      shippedToGstin: inv.shippedToGstin || '',
      shippedToPan: inv.shippedToPan || '',
      shippedToCompanyName: inv.shippedToCompanyName || inv.shippedToCompany || '',
      shippedToCompany: inv.shippedToCompany || inv.shippedToCompanyName || '',
      shippedToState: inv.shippedToState || '',
      shippedToCountry: inv.shippedToCountry || '',

      // Product details (copied 100%)
      items: inv.items ? JSON.parse(JSON.stringify(inv.items)) : [],
      subtotal: inv.subtotal || 0,
      discountType: inv.discountType || 'percentage',
      discountValue: inv.discountValue || 0,
      discountTotal: inv.discountTotal || 0,
      taxTotal: inv.taxTotal || 0,
      grandTotal: inv.grandTotal || 0,
      taxMode: inv.taxMode,
      customTaxCols: inv.customTaxCols ? [...inv.customTaxCols] : undefined,
      customTaxName: inv.customTaxName,
      customTaxPercentage: inv.customTaxPercentage,
      customTaxType: inv.customTaxType,
      additionalTaxes: inv.additionalTaxes ? [...inv.additionalTaxes] : undefined,
      freightCharges: inv.freightCharges || 0,
      isFreightAdded: inv.isFreightAdded || false,
      marka: inv.marka || '',

      // Transport details (copied 100%)
      transport: inv.transport || '',
      vehicleNo: inv.vehicleNo || '',
      driverMobile: inv.driverMobile || '',
      station: inv.station || '',
      ewayBillNo: inv.ewayBillNo || '',
      grRrNo: inv.grRrNo || '',
      placeOfSupply: inv.placeOfSupply || '',

      // Explicitly DO NOT copy Notes & Terms
      notes: '',
      invoiceTerms: '',

      // Reset template snapshots to load target document type's clean preset
      selectedCustomTemplateId: undefined,
      embeddedTemplate: undefined,
      selectedTemplateStyle: undefined,
      createdAt: undefined,
      updatedAt: undefined
    } as any);
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



  const handleCopyShareLink = (inv: Invoice) => {

    const previewUrl = `${window.location.origin}/invoice/preview?id=${inv.id}`;

    navigator.clipboard.writeText(previewUrl).then(() => {

      emitNotification('Link Copied', 'Document preview link copied to clipboard.', 'success');

    }).catch(() => {

      const input = document.createElement('input');

      input.value = previewUrl;

      document.body.appendChild(input);

      input.select();

      document.execCommand('copy');

      document.body.removeChild(input);

      emitNotification('Link Copied', 'Document preview link copied to clipboard.', 'success');

    });

  };



  const handleRecordPayment = (inv: Invoice) => {

    setPaymentModalInv(inv);

    const alreadyPaid = inv.paidAmount || 0;

    const remaining = Math.max(0, inv.grandTotal - alreadyPaid);

    setPaymentAmount(remaining > 0 ? remaining.toFixed(2) : '0.00');

    setEditTotalPaidAmount(alreadyPaid.toFixed(2));

    setIsEditingTotalPaid(alreadyPaid > 0 && remaining <= 0);

    setPaymentMethod('UPI');

    setPaymentNote('');

    setPaymentDate(inv.paidDate || new Date().toISOString().split('T')[0]);
  };

  const handleResetInputs = () => {
    setPaymentAmount('0.00');
    setEditTotalPaidAmount('0.00');
    emitNotification('Inputs Cleared', 'Payment input values reset to 0.00.', 'info');
  };

  const handleResetAndSavePayment = () => {
    if (!paymentModalInv) return;
    const updatedInv: Invoice = {
      ...paymentModalInv,
      status: 'pending',
      paidAmount: 0,
      paidDate: undefined,
      updatedAt: new Date().toISOString(),
    };
    onUpdateInvoice(updatedInv);
    emitNotification('Payment Reset', `Payment for ${paymentModalInv.invoiceNumber || 'document'} reset to 0.00 (Pending).`, 'info');
    setPaymentModalInv(null);
  };

  const handleSavePayment = (e: React.FormEvent) => {

    e.preventDefault();

    if (!paymentModalInv) return;



    const total = paymentModalInv.grandTotal;

    const sym = profile.currencySymbol || (profile.currency === 'INR' ? '₹' : (profile.currency === 'USD' ? '$' : (profile.currency || '₹')));



    let newPaidAmount = 0;



    if (isEditingTotalPaid) {

      const editedVal = parseFloat(editTotalPaidAmount);

      if (isNaN(editedVal) || editedVal < 0) {

        emitNotification('Invalid Amount', 'Please enter a valid paid amount.', 'error');

        return;

      }

      if (editedVal > total + 0.001) {

        emitNotification('Invalid Amount', `Cannot set paid amount greater than document total of ${sym}${total.toFixed(2)}.`, 'error');

        return;

      }

      newPaidAmount = editedVal;

    } else {

      const thisPayment = parseFloat(paymentAmount) || 0;

      const alreadyPaid = paymentModalInv.paidAmount || 0;

      const remaining = Math.max(0, total - alreadyPaid);



      if (thisPayment > remaining + 0.001) {

        emitNotification('Invalid Amount', `Cannot record more than the remaining balance of ${sym}${remaining.toFixed(2)}.`, 'error');

        return;

      }

      newPaidAmount = alreadyPaid + thisPayment;

    }



    const isFull = newPaidAmount >= total - 0.001;

    const isPartial = newPaidAmount > 0 && !isFull;

    const newStatus: InvoiceStatus = isFull ? 'paid' : isPartial ? 'partially_paid' : 'pending';



    const updatedInv: Invoice = {

      ...paymentModalInv,

      status: newStatus,

      paidAmount: newPaidAmount,

      paidDate: newPaidAmount > 0 ? (paymentDate || paymentModalInv.paidDate || new Date().toISOString().split('T')[0]) : undefined,

      updatedAt: new Date().toISOString(),

    };



    onUpdateInvoice(updatedInv);



    const statusLabel = isFull ? 'marked as PAID' : isPartial ? 'marked as PARTIALLY PAID' : 'reset to PENDING';

    emitNotification(

      isFull ? 'Payment Updated' : isPartial ? 'Partial Payment Updated' : 'Payment Reset',

      `Total paid amount set to ${sym}${newPaidAmount.toFixed(2)} \u2014 document ${statusLabel}.`,

      isFull ? 'success' : 'info'

    );



    setPaymentModalInv(null);

  };



  const handleThermalPrint = (inv: Invoice) => {

    emitNotification('Preparing Thermal Print', 'Generating receipt layout...', 'info');

    const iframe = document.createElement('iframe');

    iframe.style.position = 'fixed';

    iframe.style.width = '0';

    iframe.style.height = '0';

    iframe.style.border = 'none';

    iframe.style.bottom = '0';

    iframe.style.right = '0';

    iframe.style.visibility = 'hidden';

    document.body.appendChild(iframe);



    const sym = profile.currencySymbol || (profile.currency === 'INR' ? '₹' : (profile.currency === 'USD' ? '$' : (profile.currency || '₹')));



    const itemsHtml = (inv.items || []).map(item => 

      "<tr style=\"border-bottom: 1px dashed #ddd;\">" +

        "<td style=\"padding: 4px 0; font-size: 11px; text-align: left;\">" + item.name + "<br/><small>" + item.quantity + " x " + sym + item.rate.toFixed(2) + "</small></td>" +

        "<td style=\"padding: 4px 0; text-align: right; font-size: 11px; vertical-align: bottom;\">" + sym + (item.quantity * item.rate).toFixed(2) + "</td>" +

      "</tr>"

    ).join('');



    const phoneHtml = profile.phone ? ('<p style="margin: 0; font-size: 10px;">Tel: ' + profile.phone + '</p>') : '';

    const discountHtml = inv.discountTotal > 0 ? ('<div style="display: flex; justify-content: space-between; color: red;"><span>Discount:</span><span>-' + sym + inv.discountTotal.toFixed(2) + '</span></div>') : '';

    const taxHtml = inv.taxTotal > 0 ? ('<div style="display: flex; justify-content: space-between;"><span>Tax Total:</span><span>' + sym + inv.taxTotal.toFixed(2) + '</span></div>') : '';



    const htmlContent = "<html>" +

      "<head>" +

        "<style>" +

          "@page { size: 80mm auto; margin: 4mm; }" +

          "body { font-family: monospace; width: 72mm; margin: 0; padding: 0; color: #000; background: #fff; line-height: 1.3; }" +

          ".text-center { text-align: center; }" +

          ".divider { border-top: 1px dashed #000; margin: 8px 0; }" +

          "table { width: 100%; border-collapse: collapse; }" +

          ".bold { font-weight: bold; }" +

        "</style>" +

      "</head>" +

      "<body>" +

        "<div class=\"text-center\">" +

          "<h3 style=\"margin: 0 0 4px 0; font-size: 16px;\">" + (profile.name || 'MAK INVOICES') + "</h3>" +

          "<p style=\"margin: 0; font-size: 10px;\">" + (profile.address || '') + "</p>" +

          phoneHtml +

        "</div>" +

        "<div class=\"divider\"></div>" +

        "<div style=\"font-size: 10px;\">" +

          "<div><b>Doc:</b> " + (inv.invoiceType?.toUpperCase() || 'INVOICE') + "</div>" +

          "<div><b>Num:</b> " + inv.invoiceNumber + "</div>" +

          "<div><b>Date:</b> " + inv.date + "</div>" +

          "<div><b>Client:</b> " + (inv.clientName || 'Guest') + "</div>" +

        "</div>" +

        "<div class=\"divider\"></div>" +

        "<table>" +

          "<thead>" +

            "<tr style=\"border-bottom: 1px dashed #000;\">" +

              "<th style=\"text-align: left; padding-bottom: 4px; font-size: 11px;\">Item</th>" +

              "<th style=\"text-align: right; padding-bottom: 4px; font-size: 11px;\">Total</th>" +

            "</tr>" +

          "</thead>" +

          "<tbody>" +

            itemsHtml +

          "</tbody>" +

        "</table>" +

        "<div class=\"divider\"></div>" +

        "<div style=\"font-size: 11px;\">" +

          "<div style=\"display: flex; justify-content: space-between;\"><span>Subtotal:</span><span>" + sym + inv.subtotal.toFixed(2) + "</span></div>" +

          discountHtml +

          taxHtml +

          "<div style=\"display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; margin-top: 4px;\"><span>GRAND TOTAL:</span><span>" + sym + inv.grandTotal.toFixed(2) + "</span></div>" +

        "</div>" +

        "<div class=\"divider\"></div>" +

        "<div class=\"text-center\" style=\"font-size: 10px; margin-top: 10px;\">" +

          "Thank you for your business!" +

        "</div>" +

      "</body>" +

      "</html>";



    iframe.contentWindow?.document.open();

    iframe.contentWindow?.document.write(htmlContent);

    iframe.contentWindow?.document.close();



    iframe.onload = () => {

      setTimeout(() => {

        iframe.contentWindow?.focus();

        iframe.contentWindow?.print();

        setTimeout(() => iframe.remove(), 1000);

      }, 500);

    };

  };



  const handleShippingLabelPrint = (inv: Invoice) => {

    emitNotification('Preparing Shipping Label', 'Generating label layout...', 'info');

    const iframe = document.createElement('iframe');

    iframe.style.position = 'fixed';

    iframe.style.width = '0';

    iframe.style.height = '0';

    iframe.style.border = 'none';

    iframe.style.bottom = '0';

    iframe.style.right = '0';

    iframe.style.visibility = 'hidden';

    document.body.appendChild(iframe);



    const senderPhoneHtml = profile.phone ? ('Phone: ' + profile.phone) : '';

    const recipientPhoneHtml = inv.clientPhone ? ('Phone: ' + inv.clientPhone) : '';



    const htmlContent = "<html>" +

      "<head>" +

        "<style>" +

          "@page { size: 100mm 150mm; margin: 5mm; }" +

          "body { font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; width: 90mm; margin: 0; padding: 0; color: #000; background: #fff; line-height: 1.4; }" +

          ".label-box { border: 3px solid #000; padding: 10px; height: 135mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; }" +

          ".header-label { font-size: 14px; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; display: flex; justify-content: space-between; }" +

          ".section { border-bottom: 1px solid #000; padding: 8px 0; }" +

          ".section:last-child { border-bottom: none; }" +

          ".title { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #555; margin-bottom: 2px; }" +

          ".address { font-size: 11px; font-weight: 700; }" +

          ".tracking-num { font-size: 11px; font-weight: bold; text-align: center; letter-spacing: 2px; font-family: monospace; }" +

        "</style>" +

      "</head>" +

      "<body>" +

        "<div class=\"label-box\">" +

          "<div class=\"header-label\">" +

            "<span>Standard Shipping</span>" +

            "<span>Ref: " + inv.invoiceNumber + "</span>" +

          "</div>" +

          

          "<div class=\"section\">" +

            "<div class=\"title\">Sender Details</div>" +

            "<div class=\"address\">" +

              (profile.name || 'MAK INVOICES') + "<br/>" +

              (profile.address || '') + "<br/>" +

              senderPhoneHtml +

            "</div>" +

          "</div>" +



          "<div class=\"section\" style=\"flex: 1; min-height: 40mm;\">" +

            "<div class=\"title\">Deliver To / Recipient</div>" +

            "<div class=\"address\" style=\"font-size: 14px; line-height: 1.5;\">" +

              "<strong>" + (inv.clientName || 'Guest Client') + "</strong><br/>" +

              ((inv as any).shippedToAddress || inv.clientAddress || 'No Address Provided') + "<br/>" +

              recipientPhoneHtml +

            "</div>" +

          "</div>" +



          "<div class=\"section\">" +

            "<div style=\"border: 2px solid #000; padding: 6px; font-size: 18px; font-weight: 900; text-align: center; text-transform: uppercase;\">" +

              "Prepaid" +

            "</div>" +

          "</div>" +



          "<div class=\"section\" style=\"border-bottom: none;\">" +

            "<div class=\"tracking-num\" style=\"font-size: 10px;\">TRACKING #: TRK-" + inv.invoiceNumber + "</div>" +

            "<div style=\"text-align: center; font-size: 10px; margin-top: 5px; color: #777;\">" +

              "Scan QR or Barcode at Delivery Point" +

            "</div>" +

          "</div>" +

        "</div>" +

      "</body>" +

      "</html>";



    iframe.contentWindow?.document.open();

    iframe.contentWindow?.document.write(htmlContent);

    iframe.contentWindow?.document.close();



    iframe.onload = () => {

      setTimeout(() => {

        iframe.contentWindow?.focus();

        iframe.contentWindow?.print();

        setTimeout(() => iframe.remove(), 1000);

      }, 500);

    };

  };



  const triggerWhatsAppShare = (inv: Invoice) => {

    const sym = profile.currency === 'INR' ? '₹' : (profile.currency === 'USD' ? '$' : profile.currency + ' ');

    const previewUrl = `${window.location.origin}/invoice/preview?id=${inv.id}`;

    const message = `Hi ${inv.clientName || 'Client'}, please find your ${inv.invoiceType?.toUpperCase() ?? 'INVOICE'} ${inv.invoiceNumber} from ${profile.name || 'us'} for ${sym}${inv.grandTotal.toFixed(2)} (Due: ${inv.dueDate}). You can view the document preview here:\n${previewUrl}\n\nThank you!`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    window.open(url, '_blank');

  };



  const triggerEmailShare = (inv: Invoice) => {

    const sym = profile.currency === 'INR' ? '₹' : (profile.currency === 'USD' ? '$' : profile.currency + ' ');

    const previewUrl = `${window.location.origin}/invoice/preview?id=${inv.id}`;

    const subject = `${inv.invoiceType?.toUpperCase() ?? 'INVOICE'} ${inv.invoiceNumber} from ${profile.name}`;

    const body = `Hi ${inv.clientName},\n\nPlease find details for your ${inv.invoiceType?.toUpperCase() ?? 'INVOICE'} ${inv.invoiceNumber} for ${sym}${inv.grandTotal.toFixed(2)} at the following link:\n\n${previewUrl}\n\nSummary:\n- Number: ${inv.invoiceNumber}\n- Amount: ${sym}${inv.grandTotal.toFixed(2)}\n- Issue Date: ${inv.date}\n- Due Date: ${inv.dueDate}\n\nThank you for your business.\n\nWarm regards,\n${profile.name}${profile.phone ? '\nTel: ' + profile.phone : ''}${profile.email ? '\nEmail: ' + profile.email : ''}`;

    const mailto = `mailto:${inv.clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.location.href = mailto;

  };



  const handleDirectPrint = async (inv: Invoice) => {

    try {

      emitNotification('Preparing Print', 'Generating high-quality print document...', 'info');

      

      let activeTemplate = TEMPLATE_PRESETS[0];

      const templateId = inv.selectedCustomTemplateId || localStorage.getItem('makbills_global_default_template');

      const savedCustom = localStorage.getItem('makbills_custom_templates');

      if (savedCustom) {

        try {

          const parsed = JSON.parse(savedCustom);

          const match = parsed.find((t: any) => t.id === templateId);

          if (match) activeTemplate = match;

        } catch (e) {}

      } else {

        const systemMatch = TEMPLATE_PRESETS.find(t => t.id === templateId);

        if (systemMatch) activeTemplate = systemMatch;

      }



      const pdfBlob = await exportInvoicePDFAsync(inv, profile, 'blob', activeTemplate);

      if (pdfBlob instanceof Blob) {

        const blobUrl = URL.createObjectURL(pdfBlob);

        const existingFrame = document.getElementById('invoice-print-iframe');

        if (existingFrame) {

          existingFrame.remove();

        }



        const iframe = document.createElement('iframe');

        iframe.id = 'invoice-print-iframe';

        iframe.style.position = 'fixed';

        iframe.style.width = '0';

        iframe.style.height = '0';

        iframe.style.border = 'none';

        iframe.style.bottom = '0';

        iframe.style.right = '0';

        iframe.style.visibility = 'hidden';

        

        iframe.onload = () => {

          try {

            iframe.contentWindow?.focus();

            iframe.contentWindow?.print();

          } catch (e) {

            window.open(blobUrl, '_blank');

          }

        };

        

        iframe.src = blobUrl;

        document.body.appendChild(iframe);

      }

    } catch (err: any) {

      alert('Failed to generate print document: ' + (err.message || err.toString()));

    }

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

    const clientId = editingClient ? editingClient.id : `client_${Math.random().toString(36).substr(2, 9)}`;

    if (activeTab === 'purchasers' && !editingClient) {

      const newManualIds = [...manualPurchaserIds, clientId];

      setManualPurchaserIds(newManualIds);

      localStorage.setItem('makbills_manual_purchasers', JSON.stringify(newManualIds));

    }

    onSaveClient({

      id: clientId,

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

      user_id: 'local',

      expense_date: expenseDate,

      category: expenseCategory === 'Custom' ? (customExpenseCategory.trim() || 'Other') : expenseCategory,

      vendor: 'General Payee',

      amount: amountVal,

      payment_mode: 'Cash',

      status: 'paid',

      userId: 'local',

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

  // Apply date, client, and document type filters

  const reportedInvoices = useMemo(() => {
    const rawList = invoices.filter(inv => {
      if (inv.isDeleted) return false;
      if (inv.status === 'draft') return false;
      if (reportClientFilter !== 'all' && inv.clientName !== reportClientFilter) return false;
      if (reportStartDate && inv.date < reportStartDate) return false;
      if (reportEndDate && inv.date > reportEndDate) return false;
      if (reportDocTypeFilter === 'all') return true;

      const docType = (getInvoiceDocumentType(inv) || 'invoice').toLowerCase();
      const isPurchase = (inv as any).isPurchase || docType.includes('purchase') || docType === 'debit_note';

      if (reportDocTypeFilter === 'all_sales') return !isPurchase;
      if (reportDocTypeFilter === 'all_purchases') return isPurchase;
      if (reportDocTypeFilter === 'tax_invoice') return docType === 'invoice' || docType === 'sales' || docType === 'tax_invoice';
      if (reportDocTypeFilter === 'proforma') return docType === 'proforma' || docType === 'proforma_invoice';
      if (reportDocTypeFilter === 'receipt') return docType === 'receipt';
      if (reportDocTypeFilter === 'quote') return docType === 'quote' || docType === 'estimate';
      if (reportDocTypeFilter === 'credit_note') return docType === 'credit_note';
      if (reportDocTypeFilter === 'purchase_order') return docType === 'purchase_order' || docType === 'po';
      if (reportDocTypeFilter === 'purchase_invoice' || reportDocTypeFilter === 'purchases') return docType === 'purchase_invoice' || docType === 'purchase' || docType === 'purchases';
      if (reportDocTypeFilter === 'debit_note') return docType === 'debit_note';
      return true;
    });

    const deduplicatedMap = new Map<string, Invoice>();
    rawList.forEach(inv => {
      const docType = (getInvoiceDocumentType(inv) || 'invoice').toLowerCase();
      const invNum = (inv.invoiceNumber || '').trim().toLowerCase();
      const key = invNum ? `${docType}_${invNum}` : inv.id;
      if (!deduplicatedMap.has(key)) {
        deduplicatedMap.set(key, inv);
      } else {
        const existing = deduplicatedMap.get(key)!;
        const existingTime = new Date(existing.updatedAt || existing.createdAt || existing.date || 0).getTime();
        const newTime = new Date(inv.updatedAt || inv.createdAt || inv.date || 0).getTime();
        if (newTime >= existingTime) {
          deduplicatedMap.set(key, inv);
        }
      }
    });
    const list = Array.from(deduplicatedMap.values());
    return list.sort((a, b) => {
      switch (reportSortBy) {
        case 'doc_no_asc':
          return (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '', undefined, { numeric: true, sensitivity: 'base' });
        case 'doc_no_desc':
          return (b.invoiceNumber || '').localeCompare(a.invoiceNumber || '', undefined, { numeric: true, sensitivity: 'base' });
        case 'date_asc':
          return new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
        case 'date_desc':
          return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
        case 'amount_asc':
          return (a.grandTotal || 0) - (b.grandTotal || 0);
        case 'amount_desc':
          return (b.grandTotal || 0) - (a.grandTotal || 0);
        default:
          return 0;
      }
    });
  }, [invoices, reportClientFilter, reportStartDate, reportEndDate, reportDocTypeFilter, reportSortBy]);



  const reportedExpenses = expenses.filter(exp => {

    const expD = exp.expense_date || exp.date || '';

    if (reportStartDate && expD < reportStartDate) return false;

    if (reportEndDate && expD > reportEndDate) return false;

    return true;

  });



  const isSalesInvoiceForReport = (inv: Invoice) => {
    if (!inv || inv.status === 'draft' || inv.status === 'cancelled' || (inv.status as string) === 'void' || inv.isDeleted) return false;
    const docType = (getInvoiceDocumentType(inv) || 'invoice').toLowerCase();
    const isPurchase = (inv as any).isPurchase || docType.includes('purchase') || docType === 'debit_note';
    if (isPurchase) return false;
    if (docType === 'proforma' || docType === 'proforma_invoice' || docType === 'quote' || docType === 'estimate') return false;
    return true;
  };

  const reportedIncomePaid = useMemo(() => {
    return reportedInvoices
      .filter(inv => {
        if (reportDocTypeFilter === 'all' || reportDocTypeFilter === 'all_sales' || reportDocTypeFilter === 'tax_invoice') {
          return isSalesInvoiceForReport(inv);
        }
        return inv.status !== 'cancelled' && (inv.status as string) !== 'void';
      })
      .reduce((sum, inv) => sum + (inv.status === 'paid' ? (inv.paidAmount ?? inv.grandTotal) : (inv.paidAmount ?? 0)), 0);
  }, [reportedInvoices, reportDocTypeFilter]);

  const reportedOutstanding = useMemo(() => {
    const targetInvoices = invoices.filter(inv => {
      if (!isSalesInvoiceForReport(inv)) return false;
      if (reportClientFilter !== 'all' && inv.clientName !== reportClientFilter) return false;
      if (reportEndDate && inv.date > reportEndDate) return false;
      return true;
    });

    const deduplicatedMap = new Map<string, Invoice>();
    targetInvoices.forEach(inv => {
      const docType = (getInvoiceDocumentType(inv) || 'invoice').toLowerCase();
      const invNum = (inv.invoiceNumber || '').trim().toLowerCase();
      const key = invNum ? `${docType}_${invNum}` : inv.id;
      if (!deduplicatedMap.has(key)) {
        deduplicatedMap.set(key, inv);
      } else {
        const existing = deduplicatedMap.get(key)!;
        const existingTime = new Date(existing.updatedAt || existing.createdAt || existing.date || 0).getTime();
        const newTime = new Date(inv.updatedAt || inv.createdAt || inv.date || 0).getTime();
        if (newTime >= existingTime) {
          deduplicatedMap.set(key, inv);
        }
      }
    });

    return Array.from(deduplicatedMap.values())
      .reduce((sum, inv) => sum + (inv.status === 'paid' ? 0 : Math.max(0, inv.grandTotal - (inv.paidAmount ?? 0))), 0);
  }, [invoices, reportClientFilter, reportEndDate]);

  const reportedTaxTotal = useMemo(() => {
    return reportedInvoices
      .filter(inv => isSalesInvoiceForReport(inv))
      .reduce((sum, inv) => sum + (inv.taxTotal || 0), 0);
  }, [reportedInvoices]);



  const getNavbarBreadcrumbs = (tab: string) => {

    switch (tab) {

      case 'dashboard':

        return 'Financial Hub / Dashboard';

      case 'invoices': {

        const sectionNames: Record<string, string> = {

          invoice: 'Tax Invoices',

          proforma: 'Proforma Invoices',

          debit_note: 'Debit Notes',

          credit_note: 'Credit Notes',

          quote: 'Quotes & Estimates'

        };

        const currentSecName = sectionNames[ledgerSection] || 'Tax Invoices';

        return `Financial Hub / Sales Ledger / ${currentSecName}`;

      }

      case 'purchases': {

        const purchaseSectionNames: Record<string, string> = {

          purchases: 'Purchases',

          purchase_order: 'Purchase Orders',

          purchase_debit_note: 'Debit Notes'

        };

        const currentSecName = purchaseSectionNames[purchaseLedgerSection] || 'Purchases';

        return `Financial Hub / Purchases Ledger / ${currentSecName}`;

      }

      case 'drafts':

        return draftsOrigin === 'purchases'

          ? 'Financial Hub / Purchases Ledger / Drafts'

          : 'Financial Hub / Sales Ledger / Drafts';

      case 'makinvoices_ai':
        return 'Financial Hub / MakInvoices AI Studio';

      case 'profile':

        return 'Financial Hub / Creator Profile';

      case 'learn':

        return 'Financial Hub / Learn MakInvoices';

      case 'invoice_templates':

        return 'Financial Hub / Invoice Template';

      case 'clients':

        return 'Financial Hub / Client Database';

      case 'purchasers':

        return 'Financial Hub / Billed Vendors Directory';

      case 'reports':

        return 'Financial Hub / Accounting Report';

      case 'master_vendor':

        return 'Master Registry / Client Database';

      case 'master_actual_vendor':

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

      case 'subscription':

        return 'Workspace / Subscription & Billing';

      default:

        return 'Financial Hub / Workspace';

    }

  };



  const totalReportedExpenses = reportedExpenses.reduce((sum, exp) => sum + exp.amount, 0);



  return (

    <div className="h-dvh w-full max-w-full overflow-hidden bg-[#f4f9ff] dark:bg-[#0b1329] text-slate-800 dark:text-slate-100 transition-colors duration-200" style={{fontFamily: "'IBM Plex Sans', sans-serif"}}>

      

      {/* Dynamic Main App Bar Header */}

      <header className="sticky top-0 z-30 w-full bg-[#f4f9ff]/95 dark:bg-[#0b1329]/95 backdrop-blur-sm border-b border-[#bae6fd]/70 dark:border-[#223269] px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-[0_1px_12px_rgba(2,132,199,0.06)] transition-all duration-200">

        {/* Left Side: Logo + Mobile Menu Trigger + Breadcrumb */}

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">

          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            aria-label="Toggle structural sidebar menu drawer"
            className="xl:hidden p-1.5 text-[#0284c7] dark:text-[#38bdf8] hover:text-[#0369a1] dark:hover:text-white transition-colors cursor-pointer rounded-xl hover:bg-[#e0f2fe] dark:hover:bg-[#1b264f] active:scale-95"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.location.href = '/'}>

            <img src="/logo.svg" alt="MakInvoices Logo" className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-sm shrink-0" />

            {/* Mobile Top Bar Title: Company Name (if filled) or App Name */}
            <div className="sm:hidden min-w-0 max-w-[130px] xs:max-w-[180px]">
              {profile.name && profile.name.trim() !== '' ? (
                <span className="text-xs font-bold text-[#0f172a] dark:text-white truncate block leading-tight tracking-wide" style={{fontFamily: "'IBM Plex Mono', monospace"}}>
                  {profile.name.trim()}
                </span>
              ) : (
                <span className="text-sm font-black tracking-tight text-[#0f172a] dark:text-white block leading-none" style={{fontFamily: "'IBM Plex Sans', sans-serif"}}>
                  Mak<span className="text-[#0ea5e9]">Invoices</span>
                </span>
              )}
            </div>

            {/* Desktop App Name */}
            <div className="hidden sm:block">

              <span className="text-xl font-black tracking-tight text-[#0f172a] dark:text-white block leading-none" style={{fontFamily: "'IBM Plex Sans', sans-serif"}}>

                Mak<span className="text-[#0ea5e9]">Invoices</span>

              </span>

            </div>

          </div>

          <div className="w-px h-6 bg-[#bae6fd] dark:bg-[#223269] hidden sm:block"></div>

          <div className="hidden sm:flex items-center gap-3.5">

            <div className="w-[32px] h-[32px] rounded-full bg-[#e0f2fe] dark:bg-[#1b264f] border border-[#bae6fd] dark:border-[#223269] text-[#0284c7] dark:text-[#38bdf8] flex items-center justify-center font-bold text-[13px] shadow-sm">

              {profile.name ? profile.name.charAt(0).toUpperCase() : 'M'}

            </div>

            <div className="flex items-center gap-3">

              <span className="text-[15px] font-bold text-[#0f172a] dark:text-white tracking-wide" style={{fontFamily: "'IBM Plex Mono', monospace"}}>{profile.name || 'MAKINVOICE'}</span>

              <div className="w-1 h-1 rounded-full bg-[#bae6fd] dark:bg-[#223269]"></div>

              <span className="text-[13px] text-[#0284c7] dark:text-[#38bdf8] font-medium tracking-wide" style={{fontFamily: "'IBM Plex Mono', monospace"}}>{getNavbarBreadcrumbs(activeTab)}</span>

            </div>

          </div>

        </div>



        {/* Right Side: Theme Toggle + Notifications + Profile Avatar (Mobile Capsule Pill Layout) */}

        <div className="flex items-center gap-1.5 sm:gap-4 p-1 sm:p-0 bg-white/80 dark:bg-[#111a36]/90 sm:bg-transparent sm:dark:bg-transparent border border-[#bae6fd]/70 dark:border-[#223269] sm:border-0 rounded-full shadow-2xs sm:shadow-none backdrop-blur-md sm:backdrop-blur-none">
          
          {/* Dedicated Dark & Light Mode Toggle Button (Mobile Optimized) */}
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-[#f4f9ff] dark:bg-[#1b264f] hover:bg-[#e0f2fe] dark:hover:bg-[#1b264f]/90 text-[#475569] dark:text-[#38bdf8] hover:text-[#0284c7] transition-all cursor-pointer border border-[#bae6fd]/60 dark:border-[#223269]/70 shadow-2xs active:scale-90 shrink-0"
            aria-label="Toggle dark and light mode"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-amber-400 animate-in spin-in-90 duration-200" />
            ) : (
              <Moon className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-slate-600 hover:text-[#0284c7] animate-in spin-in-90 duration-200" />
            )}
          </button>

          <div className="relative" id="notifications-dropdown-container">

            <button 

              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}

              className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#e0f2fe] dark:hover:bg-[#1b264f] text-[#475569] dark:text-[#94a3b8] hover:text-[#0284c7] dark:hover:text-[#38bdf8] transition-colors cursor-pointer border border-transparent dark:hover:border-[#223269]"

            >

              <Bell className="w-[18px] h-[18px]" />

              {notifications.some(n => !n.read) && (

                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-zinc-950" />

              )}

            </button>

            

            {isNotificationsOpen && (

              <div className="absolute right-[-60px] sm:right-0 mt-3 w-[320px] sm:w-[390px] rounded-2xl bg-white dark:bg-[#111a36] border border-[#bae6fd]/70 dark:border-[#223269] shadow-[0_8px_30px_rgba(2,132,199,0.1)] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">

                <div className="px-4 py-2.5 border-b border-[#bae6fd]/50 dark:border-[#223269] flex items-center justify-between">

                  <span className="font-bold text-[13px] text-[#0f172a] dark:text-white" style={{fontFamily: "'IBM Plex Mono', monospace"}}>Notifications</span>

                  <div className="flex gap-2.5 items-center">

                    <button 

                      onClick={() => setNotifications(prev => prev.map(n => ({...n, read: true})))}

                      className="text-[11px] font-bold text-[#0284c7] hover:text-[#0369a1] dark:text-[#38bdf8] cursor-pointer transition-colors"

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

                <div className="px-3 py-2 border-b border-[#bae6fd]/50 dark:border-[#223269] bg-white dark:bg-[#111a36] flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold select-none scrollbar-none">

                  <button

                    type="button"

                    onClick={() => setNotifCategoryTab('all')}

                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap font-black ${notifCategoryTab === 'all' ? 'bg-[#0284c7] text-white shadow-xs' : 'bg-[#f4f9ff] text-[#0284c7] hover:bg-[#e0f2fe]/60 dark:bg-[#1b264f] dark:text-[#38bdf8] dark:hover:bg-[#1b264f]/80'}`}

                  >

                    <span className={notifCategoryTab === 'all' ? 'text-white font-extrabold' : 'text-[#0284c7] dark:text-[#38bdf8] font-bold'}>

                      All ({notifications.length})

                    </span>

                  </button>

                  <button

                    type="button"

                    onClick={() => setNotifCategoryTab('billing')}

                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap font-black ${notifCategoryTab === 'billing' ? 'bg-[#0284c7] text-white shadow-xs' : 'text-[#0284c7] dark:text-[#38bdf8] hover:bg-[#e0f2fe]/50 dark:hover:bg-[#1b264f]/40'}`}

                  >

                    <span className={notifCategoryTab === 'billing' ? 'text-white font-extrabold' : ''}>

                      Billing ({notifications.filter(n => getNotifCategory(n) === 'billing').length})

                    </span>

                  </button>

                  <button

                    type="button"

                    onClick={() => setNotifCategoryTab('system')}

                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap font-black ${notifCategoryTab === 'system' ? 'bg-[#0284c7] text-white shadow-xs' : 'text-[#0284c7] dark:text-[#38bdf8] hover:bg-[#e0f2fe]/50 dark:hover:bg-[#1b264f]/40'}`}

                  >

                    <span className={notifCategoryTab === 'system' ? 'text-white font-extrabold' : ''}>

                      System ({notifications.filter(n => getNotifCategory(n) === 'system').length})

                    </span>

                  </button>

                  <button

                    type="button"

                    onClick={() => setNotifCategoryTab('alerts')}

                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap font-black ${notifCategoryTab === 'alerts' ? 'bg-[#0284c7] text-white shadow-xs' : 'text-[#0284c7] dark:text-[#38bdf8] hover:bg-[#e0f2fe]/50 dark:hover:bg-[#1b264f]/40'}`}

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

                          <div className="w-12 h-12 bg-[#e0f2fe] dark:bg-[#1b264f]/50 rounded-full flex items-center justify-center mb-3">

                            <Bell className="w-5 h-5 text-[#0284c7] dark:text-[#38bdf8]" />

                          </div>

                          <p className="text-[13px] text-[#0f172a] dark:text-zinc-300 font-medium">You're all caught up!</p>

                          <p className="text-[11px] text-[#64748b] dark:text-zinc-400 mt-1">No notifications in this section.</p>

                        </div>

                      );

                    }



                    return displayed.map(notif => {

                      const cat = getNotifCategory(notif);

                      return (

                        <div 

                          key={notif.id} 

                          className={`px-4 py-3 border-b border-[#bae6fd]/30 dark:border-[#223269]/30 hover:bg-[#f4f9ff] dark:hover:bg-[#1b264f]/50 transition-colors flex gap-3 cursor-pointer border-l-4 ${!notif.read ? 'border-l-[#0284c7] bg-[#f4f9ff]/30 dark:bg-[#1b264f]/20' : 'border-l-transparent bg-transparent'}`}

                          onClick={() => setNotifications(prev => prev.map(n => n.id === notif.id ? {...n, read: true} : n))}

                        >

                          <div className="mt-0.5 shrink-0">

                            {notif.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}

                            {notif.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-500" />}

                            {notif.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-500" />}

                            {notif.type === 'info' && <Info className="w-4 h-4 text-[#0284c7]" />}

                          </div>

                          <div className="flex-1 min-w-0">

                            <div className="flex items-center justify-between gap-2 mb-0.5">

                              <p className={`text-[12.5px] truncate leading-tight ${notif.read ? 'font-semibold text-slate-650 dark:text-zinc-300' : 'font-bold text-[#0f172a] dark:text-white'}`}>

                                {notif.title}

                              </p>

                              {cat === 'billing' && (

                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 shrink-0">

                                  Billing

                                </span>

                              )}

                              {cat === 'system' && (

                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-[#e0f2fe] dark:bg-[#1b264f]/70 text-[#0284c7] dark:text-[#38bdf8] border border-[#bae6fd]/60 dark:border-[#223269]/60 shrink-0">

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

                            <p className="text-[10px] text-[#64748b] dark:text-zinc-400 mt-1 font-medium flex items-center gap-1.5">

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

          

          <div className="w-px h-6 bg-[#bae6fd] dark:bg-[#223269] hidden sm:block"></div>

          {/* Pending-sync indicator — shown when cloud writes are queued */}
          {pendingSyncCount > 0 && (
            <div
              title={`${pendingSyncCount} item${pendingSyncCount > 1 ? 's' : ''} pending cloud sync — will retry automatically`}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-[11px] font-semibold cursor-default select-none"
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              {pendingSyncCount} pending
            </div>
          )}

          <div className="relative" id="profile-dropdown-container">

            <button 

              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}

              className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:bg-[#e0f2fe] dark:hover:bg-[#1b264f] border border-transparent hover:border-[#bae6fd] dark:hover:border-[#223269] transition-all cursor-pointer group"

            >

              <div className="w-[32px] h-[32px] rounded-full bg-[#e0f2fe] dark:bg-[#1b264f] border border-[#bae6fd] dark:border-[#223269] text-[#0284c7] dark:text-[#38bdf8] flex items-center justify-center text-[12px] font-bold shadow-sm">

                {profile.name ? profile.name.slice(0, 2).toUpperCase() : 'MK'}

              </div>

              <ChevronDown className="w-4 h-4 text-[#0284c7]/60 group-hover:text-[#0284c7] dark:text-[#38bdf8]/50 dark:group-hover:text-[#38bdf8] hidden sm:block transition-colors" />

            </button>



            {isProfileDropdownOpen && (

              <div className="absolute right-0 mt-3 w-52 rounded-2xl bg-white dark:bg-[#111a36] border border-[#bae6fd]/70 dark:border-[#223269] shadow-[0_8px_30px_rgba(2,132,199,0.1)] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">

                <button 

                  onClick={() => {

                    setActiveTab('profile');

                    setIsProfileDropdownOpen(false);

                  }}

                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-[#0f172a] dark:text-zinc-200 hover:bg-[#f8fafc]/60 dark:hover:bg-zinc-850 transition-colors flex items-center gap-2.5 cursor-pointer"

                >

                  <User className="w-4 h-4 text-[#64748b]" />

                  <span>Profile</span>

                </button>



                <button 

                  onClick={() => {

                    setActiveTab('settings');

                    setIsProfileDropdownOpen(false);

                  }}

                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-[#0f172a] dark:text-zinc-200 hover:bg-[#f8fafc]/60 dark:hover:bg-zinc-850 transition-colors flex items-center gap-2.5 cursor-pointer"

                >

                  <Layout className="w-4 h-4 text-[#64748b]" />

                  <span>Settings</span>

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



      {/* â”€â”€ TOP-RIGHT DYNAMIC SLIDE-IN TOAST NOTIFICATION CONTAINER â”€â”€ */}

      <div id="top-right-toast-container" className="fixed top-16 sm:top-20 right-3 sm:right-6 z-[99] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-[calc(100vw-24px)] pointer-events-none">

        {activeToasts.map((toast) => (

          <div

            key={toast.id}

            className={`pointer-events-auto relative overflow-hidden p-3.5 sm:p-4 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_16px_50px_rgba(0,0,0,0.65)] border backdrop-blur-xl flex items-start gap-3.5 ${

              exitingToastIds.has(toast.id) ? 'toast-exit' : 'toast-enter'

            } ${

              theme === 'dark'

                ? 'bg-[#111a36]/95 text-white border-[#223269]/80'

                : 'bg-[#f4f9ff]/95 text-[#0f172a] border-[#bae6fd]/80'

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

                <div className="w-8 h-8 rounded-xl bg-[#e0f2fe] dark:bg-[#1b264f]/60 border border-[#bae6fd]/60 dark:border-[#223269]/60 flex items-center justify-center text-[#0284c7] dark:text-[#38bdf8] shadow-xs">

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

                  className="mt-2 text-[10px] font-extrabold uppercase tracking-wider text-[#0284c7] dark:text-[#38bdf8] hover:text-[#0369a1] dark:hover:text-[#bae6fd] flex items-center gap-1 cursor-pointer group"

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
      <main className="w-full max-w-[1600px] mx-auto px-2 sm:px-3 lg:px-4 pt-1.5 md:pt-3 space-y-4 xl:space-y-0 xl:flex xl:gap-6 xl:items-start overflow-hidden">
        
        {/* DESKTOP BRANDING & CONTROL SIDEBAR - Visible on xl screens (1280px+) */}
        <div className="hidden xl:block relative shrink-0">

          <aside className={`flex flex-col bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/70 rounded-[1.75rem] shadow-[0_8px_30px_rgba(2,132,199,0.08)] h-[calc(100dvh-92px)] xl:h-[calc(100vh-110px)] overflow-hidden transition-all duration-300 ${isDesktopSidebarExpanded ? 'w-[280px] p-5' : 'w-[88px] p-4 items-center [&_span]:hidden [&_.min-w-0]:hidden [&_button]:justify-center [&_button>div]:justify-center [&_.pl-2]:hidden [&_h4]:hidden'}`}>

            <div className="w-full h-full">

              {renderNavMenuContent(false)}

            </div>

          </aside>

          

          <button 

            onClick={() => setIsDesktopSidebarExpanded(!isDesktopSidebarExpanded)} 

            className="absolute -right-3 top-6 z-20 w-6 h-6 rounded-full bg-white dark:bg-[#111a36] border border-[#bae6fd] dark:border-[#223269] shadow-sm text-[#0284c7] dark:text-[#38bdf8] hover:text-[#0369a1] dark:hover:text-white flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all"

            title={isDesktopSidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}

          >

            <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-300 ${isDesktopSidebarExpanded ? 'rotate-180' : 'rotate-0'}`} />

          </button>

        </div>



        {/* RIGHT CENTRAL WORKSPACE PANEL */}
        <div className="flex-1 min-w-0 w-full m-0 p-0 h-[calc(100dvh-92px)] xl:h-[calc(100vh-110px)] overflow-y-auto pr-1 pb-16 md:pb-12 pb-safe">







          {/* Connections / sync triggers */}



        {/* ------------------ TAB 0: MAKINVOICES AI STUDIO ------------------ */}
        {activeTab === 'makinvoices_ai' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* AI Studio Header Banner */}
            <div className="relative overflow-hidden bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
              <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10 space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-widest text-sky-100">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" /> AI Intelligence Studio
                </div>
                <h2 className="text-2xl sm:text-3xl font-black font-serif tracking-tight">
                  MakInvoices AI Assistant &amp; Smart Billing
                </h2>
                <p className="text-sky-100 text-sm sm:text-base max-w-2xl leading-relaxed">
                  Describe transactions in plain language to parse line items, rates, customer details, and taxes automatically, or chat 24/7 with your dedicated AI financial assistant.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleOpenCreateModal()}
                    className="inline-flex items-center gap-2 bg-white text-sky-700 font-mono font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-sky-50 transition-all shadow-md cursor-pointer active:scale-95"
                  >
                    <Sparkles className="w-4 h-4 text-sky-500" /> Launch AI Smart Billing Prompt
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('support')}
                    className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white font-mono font-bold text-xs px-5 py-2.5 rounded-xl transition-all border border-white/20 cursor-pointer"
                  >
                    <HelpCircle className="w-4 h-4" /> 24/7 AI Knowledge Base
                  </button>
                </div>
              </div>
            </div>

            {/* Smart Billing Prompt Embedded Box */}
            <div className="bg-white dark:bg-[#111a36] border border-[#bae6fd]/70 dark:border-[#223269] rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500 border border-sky-500/20">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">Gemini Smart Prompt Generator</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Type or speak billing details to auto-populate invoice line items</p>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold px-2.5 py-1 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-full border border-sky-500/20 uppercase tracking-wider">
                  Gemini 2.5 Flash
                </span>
              </div>

              {/* Sample Prompt Chips */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Try Sample Prompts:</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenCreateModal();
                      emitNotification('MakInvoices AI', 'AI Prompt copied! Paste or click Generate in the Invoice Editor.', 'success');
                    }}
                    className="text-xs bg-slate-100 dark:bg-slate-900/60 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl transition-all text-left cursor-pointer"
                  >
                    💡 "Invoice Acme Corp: 5 Laptops @ $1200 each, 2 Monitors @ $300 each, GST 18%"
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenCreateModal();
                      emitNotification('MakInvoices AI', 'AI Prompt copied! Paste or click Generate in the Invoice Editor.', 'success');
                    }}
                    className="text-xs bg-slate-100 dark:bg-slate-900/60 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl transition-all text-left cursor-pointer"
                  >
                    💡 "Quote for Hardware Supplies: 50 Drill Bits @ ₹150 each, 10 Power Tools @ ₹3200 each"
                  </button>
                </div>
              </div>

              {/* AI Features Capabilities Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold">1</div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Natural Language Parsing</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Extracts items, quantities, unit prices, discounts, and customer names from conversational text.</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">2</div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Tax &amp; GST Auto Split</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Calculates CGST/SGST, IGST, or VAT splits automatically based on client location.</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">3</div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Quantity Accumulator</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Adding existing catalog items automatically increments row totals instead of making duplicate lines.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------ TAB 1: INVOICES / PURCHASES ROUTE ------------------ */}

        {(activeTab === 'invoices' || activeTab === 'purchases') && (

          <div className="space-y-6">

            <section className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 font-sans select-none">

              {/* Total Amount Card */}

              <div className="bg-white dark:bg-[#111a36] p-3 sm:p-4 rounded-2xl border-l-4 border-l-blue-500 border border-[#bae6fd]/60 dark:border-[#223269]/60 shadow-xs flex flex-row items-center justify-between hover:shadow-[0_4px_14px_rgba(2,132,199,0.1)] transition-all duration-300">

                <div>

                  <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-wider text-[#0284c7]/70 dark:text-[#38bdf8]/60 block" style={{fontFamily: "'IBM Plex Mono', monospace"}}>Total Amount</span>

                  <span className="text-sm sm:text-base font-black mt-0.5 sm:mt-1 text-blue-600 dark:text-blue-400 block" style={{fontFamily: "'IBM Plex Mono', monospace"}}>

                    {currencySymbol}{formatNum(activeLedgerStats.total, true)}

                  </span>

                </div>

                {/* Micro Sparkline */}

                <div className="flex items-end gap-0.5 h-5 sm:h-6 shrink-0">

                  <span className="w-1 bg-blue-100 dark:bg-[#1b264f] h-2 rounded-t" />

                  <span className="w-1 bg-blue-200 dark:bg-[#1b264f] h-3 rounded-t" />

                  <span className="w-1 bg-blue-300 dark:bg-[#223269] h-4 rounded-t" />

                  <span className="w-1 bg-blue-400 dark:bg-[#223269] h-3 rounded-t" />

                  <span className="w-1 bg-blue-500 h-5 rounded-t" />

                </div>

              </div>



              {/* Paid Amount Card */}

              <div className="bg-white dark:bg-[#111a36] p-3 sm:p-4 rounded-2xl border-l-4 border-l-emerald-400 border border-[#bae6fd]/60 dark:border-[#223269]/60 shadow-xs flex flex-row items-center justify-between hover:shadow-[0_4px_14px_rgba(2,132,199,0.1)] transition-all duration-300">

                <div>

                  <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-wider text-[#0284c7]/70 dark:text-[#38bdf8]/60 block" style={{fontFamily: "'IBM Plex Mono', monospace"}}>Paid</span>

                  <span className="text-sm sm:text-base font-black mt-0.5 sm:mt-1 text-emerald-600 dark:text-emerald-400 block" style={{fontFamily: "'IBM Plex Mono', monospace"}}>

                    {currencySymbol}{formatNum(activeLedgerStats.paid, true)}

                  </span>

                </div>

                {/* Micro Sparkline */}

                <div className="flex items-end gap-0.5 h-5 sm:h-6 shrink-0">

                  <span className="w-1 bg-emerald-100 dark:bg-[#1b264f] h-4 rounded-t" />

                  <span className="w-1 bg-emerald-200 dark:bg-[#1b264f] h-2 rounded-t" />

                  <span className="w-1 bg-emerald-300 dark:bg-[#223269] h-3 rounded-t" />

                  <span className="w-1 bg-emerald-400 dark:bg-[#223269] h-5 rounded-t" />

                  <span className="w-1 bg-emerald-500 h-3 rounded-t" />

                </div>

              </div>



              {/* Pending Amount Card */}

              <div className="bg-white dark:bg-[#111a36] p-3 sm:p-4 rounded-2xl border-l-4 border-l-amber-400 border border-[#bae6fd]/60 dark:border-[#223269]/60 shadow-xs flex flex-row items-center justify-between hover:shadow-[0_4px_14px_rgba(2,132,199,0.1)] transition-all duration-300">

                <div>

                  <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-wider text-[#0284c7]/70 dark:text-[#38bdf8]/60 block" style={{fontFamily: "'IBM Plex Mono', monospace"}}>Pending</span>

                  <span className="text-sm sm:text-base font-black mt-0.5 sm:mt-1 text-amber-600 dark:text-amber-400 block" style={{fontFamily: "'IBM Plex Mono', monospace"}}>

                    {currencySymbol}{formatNum(activeLedgerStats.pending, true)}

                  </span>

                </div>

                {/* Micro Sparkline */}

                <div className="flex items-end gap-0.5 h-5 sm:h-6 shrink-0">

                  <span className="w-1 bg-amber-100 dark:bg-[#1b264f] h-2 rounded-t" />

                  <span className="w-1 bg-amber-200 dark:bg-[#1b264f] h-3 rounded-t" />

                  <span className="w-1 bg-amber-300 dark:bg-[#223269] h-3 rounded-t" />

                  <span className="w-1 bg-amber-450 h-2 rounded-t" />

                  <span className="w-1 bg-amber-500 h-4 rounded-t" />

                </div>

              </div>

            </section>







            {/* Search, Action Header and Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-xs sm:text-sm font-black text-[#0f172a] dark:text-white uppercase tracking-tight flex items-center gap-2 truncate" style={{fontFamily: "'Fraunces', serif"}}>
                  <span className="w-3.5 h-px bg-[#0284c7] dark:bg-[#38bdf8] inline-block shrink-0" />
                  <span className="truncate">
                    {showBinView
                      ? 'Trash Bin / Recycled Documents'
                      : activeTab === 'purchases'
                        ? (purchaseLedgerSection === 'purchase_order' ? 'Purchase Orders Ledger' : purchaseLedgerSection === 'purchase_debit_note' ? 'Purchase Debit Notes' : 'Purchases Ledger')
                        : (ledgerSection === 'proforma' ? 'Proforma Invoices' : ledgerSection === 'credit_note' ? 'Credit Notes' : ledgerSection === 'debit_note' ? 'Debit Notes' : ledgerSection === 'quote' ? 'Quotes & Estimates' : 'Invoices Ledger')}
                  </span>
                </h2>
                <span className="px-1.5 py-0.5 bg-[#e0f2fe] dark:bg-[#1b264f] text-[#0284c7] dark:text-[#38bdf8] border border-[#bae6fd] dark:border-[#223269] rounded text-[9px] font-black shrink-0" style={{fontFamily: "'IBM Plex Mono', monospace"}}>{filteredInvoices.length} Docs</span>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-3 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setDraftsOrigin(activeTab === 'purchases' ? 'purchases' : 'sales');
                    setDraftsSection('all');
                    setActiveTab('drafts');
                  }}
                  className="flex-1 sm:flex-none justify-center px-2.5 sm:px-4 py-2 sm:py-1.5 bg-white dark:bg-[#111a36] border border-[#bae6fd] dark:border-[#223269] hover:bg-[#e0f2fe] dark:hover:bg-[#1b264f] text-[#0284c7] dark:text-[#38bdf8] rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95 whitespace-nowrap"
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span>Drafts</span>
                </button>
                <button
                  onClick={() => setShowBinView(!showBinView)}
                  className={`flex-1 sm:flex-none justify-center px-2.5 sm:px-4 py-2 sm:py-1.5 ${showBinView ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-300 dark:border-red-700/50' : 'bg-white dark:bg-[#111a36] text-[#64748b] dark:text-[#94a3b8] border-[#e2e8f0] dark:border-[#223269] hover:bg-slate-50 dark:hover:bg-[#1b264f]'} border rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95 whitespace-nowrap`}
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{showBinView ? 'Exit Bin' : 'Bin'}</span>
                </button>

                <button
                  onClick={() => handleCreateDocumentForSection(activeTab === 'purchases' ? purchaseLedgerSection : ledgerSection)}
                  className="flex-[1.4] sm:flex-none justify-center px-3 sm:px-4 py-2 sm:py-1.5 bg-[#0284c7] dark:bg-[#38bdf8] border border-[#0369a1] dark:border-[#0284c7] hover:bg-[#0369a1] dark:hover:bg-[#0284c7] text-white dark:text-[#0b1329] rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">
                    {activeTab === 'purchases'
                      ? (purchaseLedgerSection === 'purchase_order' ? 'Create Purchase Order' : purchaseLedgerSection === 'purchase_debit_note' ? 'Create Debit Note' : 'Create Purchase Bill')
                      : (ledgerSection === 'proforma' ? 'Create Proforma' : ledgerSection === 'credit_note' ? 'Create Credit Note' : ledgerSection === 'debit_note' ? 'Create Debit Note' : ledgerSection === 'quote' ? 'Create Quote' : 'Create Invoice')}
                  </span>
                  <span className="sm:hidden">
                    {activeTab === 'purchases'
                      ? (purchaseLedgerSection === 'purchase_order' ? '+ PO' : purchaseLedgerSection === 'purchase_debit_note' ? '+ Debit Note' : '+ Bill')
                      : (ledgerSection === 'proforma' ? '+ Proforma' : ledgerSection === 'credit_note' ? '+ Credit Note' : ledgerSection === 'debit_note' ? '+ Debit Note' : ledgerSection === 'quote' ? '+ Quote' : '+ Invoice')}
                  </span>
                </button>
              </div>
            </div>

            {/* Search Input, status selection, and sort by filters */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3 bg-[#e0f2fe]/30 dark:bg-[#1b264f]/20 p-2.5 sm:p-3 rounded-2xl border border-[#bae6fd]/60 dark:border-[#223269]/60">
              <div className="sm:col-span-6 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748b]/60" />
                <input 
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by client or invoice number..."
                  className="w-full pl-8 pr-3 py-1.5 sm:py-2 bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 focus:border-[#0284c7] dark:border-[#223269] rounded-xl text-xs text-[#0f172a] dark:text-white placeholder-[#0284c7]/30 dark:placeholder-[#38bdf8]/30 focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 sm:col-span-6 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div className="flex relative">
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'all')}
                    className="w-full pl-2.5 sm:pl-3 pr-7 py-1.5 sm:py-2 bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269] rounded-xl text-[11px] sm:text-xs font-bold text-[#0f172a] dark:text-zinc-200 focus:outline-none focus:border-[#0284c7]/60 cursor-pointer transition-colors text-ellipsis overflow-hidden whitespace-nowrap"
                  >

                  <option value="all">All Statuses</option>

                  {ledgerSection === 'credit_note' || (activeTab === 'purchases' && purchaseLedgerSection === 'purchase_debit_note') ? (

                    <>

                      <option value="pending">Pending</option>

                      <option value="approved">Approved</option>

                      <option value="rejected">Not Approved</option>

                    </>

                  ) : (

                    <>

                      <option value="paid">Paid</option>

                      <option value="pending">Pending</option>

                      <option value="cancelled">Cancelled</option>

                    </>

                  )}

                </select>

              </div>

              <div className="flex relative">
                <select 
                  value={sortBy}
                  onChange={(e) => handleSetSortBy(e.target.value)}
                  className="w-full pl-2.5 sm:pl-3 pr-7 py-1.5 sm:py-2 bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269] rounded-xl text-[11px] sm:text-xs font-bold text-[#0f172a] dark:text-zinc-200 focus:outline-none focus:border-[#0284c7]/60 cursor-pointer transition-colors text-ellipsis overflow-hidden whitespace-nowrap"
                >

                  <option value="issue_date_desc">Issue Date (Newest)</option>

                  <option value="issue_date_asc">Issue Date (Oldest)</option>

                  <option value="due_date_desc">Due Date (Newest)</option>

                  <option value="due_date_asc">Due Date (Oldest)</option>

                  <option value="amount_desc">Amount (Highest)</option>

                  <option value="amount_asc">Amount (Lowest)</option>

                  <option value="number_desc">Doc No (Highest)</option>

                  <option value="number_asc">Doc No (Lowest)</option>

                </select>
              </div>
            </div>
          </div>



            {/* Invoices Array List representation */}

            <div className="-mt-3.5 sm:mt-0">

              {/* MOBILE ONLY SMALL SCREENS CARDS VIEW */}

              <div className="space-y-1.5 sm:space-y-3 md:hidden">

                {filteredInvoices.length > 0 && (

                  <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-[#111a36] rounded-xl border border-[#bae6fd]/60 dark:border-[#223269]/60 shadow-2xs">

                    <label className="flex items-center gap-2 cursor-pointer select-none">

                      <input

                        type="checkbox"

                        checked={filteredInvoices.length > 0 && filteredInvoices.every(i => selectedInvoiceIds.includes(i.id))}

                        onChange={handleSelectAllFiltered}

                        className="w-4 h-4 rounded border-[#e2e8f0] text-[#64748b] focus:ring-[#64748b] cursor-pointer"

                      />

                      <span className="text-[11px] font-extrabold text-[#0f172a] dark:text-zinc-200 uppercase tracking-wider">

                        Select All ({filteredInvoices.length})

                      </span>

                    </label>

                    {selectedInvoiceIds.length > 0 && (

                      <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 font-mono">

                        {selectedInvoiceIds.length} Selected

                      </span>

                    )}

                  </div>

                )}



                {filteredInvoices.length === 0 ? (

                  <div className="p-8 sm:p-12 bg-white dark:bg-[#111a36] text-center rounded-2xl border border-[#bae6fd]/55 dark:border-[#223269]/60 flex flex-col items-center gap-2">

                    <FileText className="w-8 h-8 mx-auto mb-2 text-[#0284c7]/30" />

                    <span className="text-[13px] text-[#64748b]/70 dark:text-[#94a3b8]/70" style={{fontFamily: "'IBM Plex Mono', monospace"}}>No invoice records matching criteria.</span>

                  </div>

                ) : (

                  filteredInvoices.map((inv) => (

                    <div

                      key={inv.id}

                      className={`p-3.5 sm:p-4 bg-white dark:bg-[#111a36] border rounded-2xl flex gap-2.5 sm:gap-3 relative shadow-xs hover:shadow-[0_4px_14px_rgba(2,132,199,0.08)] hover:border-[#0284c7]/30 transition-all cursor-pointer group ${selectedInvoiceIds.includes(inv.id) ? 'border-[#0284c7]/40 bg-[#e0f2fe]/20 dark:bg-[#1b264f]/30' : 'border-[#bae6fd]/60 dark:border-[#223269]/60'}`}

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

                                  ðŸ”„ Repeat {inv.recurringSettings.interval}

                                </span>

                              )}

                            </div>

                             <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <h4 className="text-xs font-black text-[#0f172a] dark:text-white uppercase truncate max-w-[150px]">
                                {((inv as any).clientCompanyName || (inv as any).clientCompany) || inv.clientName || 'Draft Profile'}
                              </h4>
                              {((inv as any).clientCompanyName || (inv as any).clientCompany) && inv.clientName && (
                                <span className="text-[8.5px] font-semibold text-[#0284c7]/80 dark:text-[#38bdf8]/70 bg-[#e0f2fe]/60 dark:bg-[#1b264f]/60 px-1.5 py-0.5 rounded truncate max-w-[110px] border border-[#bae6fd]/40 dark:border-[#223269]/40 leading-tight whitespace-nowrap">
                                  {inv.clientName}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-[#64748b]/80 font-semibold font-mono flex-wrap">

                              <span>Dated {inv.date}</span>

                              <span>•</span>

                              <span className="text-rose-500">Due {inv.dueDate}</span>

                            </div>

                          </div>



                          <div className="text-right shrink-0">

                            <span className="text-xs font-black font-mono block text-[#0f172a] dark:text-white">{currencySymbol}{inv.grandTotal.toFixed(2)}</span>

                            <span className={`inline-block px-2 mt-1 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${getStatusColor(inv.status)}`}>

                              {getStatusText(inv.status)}

                            </span>

                          </div>

                        </div>



                        {/* Footer list triggers */}

                        <div className="pt-2 border-t border-[#bae6fd]/30 dark:border-[#223269]/30 flex items-center justify-between gap-2 text-[10px] text-slate-400" onClick={(e) => e.stopPropagation()}>

                          <span className="flex items-center gap-1 text-[8px] font-mono font-bold tracking-tight text-[#64748b]/60 shrink-0">

                            <span className={`w-1.5 h-1.5 rounded-full ${inv.userId === 'local' ? 'bg-amber-400' : 'bg-sky-400'}`} />

                            {inv.userId === 'local' ? 'On-Device' : 'Cloud'}

                          </span>



                          <div className="flex items-center gap-1 shrink-0 relative">

                            {/* Quick View */}

                            <button

                              onClick={(e) => {

                                e.stopPropagation();

                                setActivePreviewInvoice(inv);

                              }}

                              className="w-8 h-8 rounded-full hover:bg-[#f4f9ff]/80 dark:hover:bg-[#1b264f] flex items-center justify-center text-slate-500 dark:text-zinc-400 cursor-pointer transition-all hover:scale-105 active:scale-95 border border-transparent hover:border-[#bae6fd]/40 dark:hover:border-[#223269]/40"

                              title="View Document"

                            >

                              <Eye className="w-4 h-4 text-[#0284c7] dark:text-[#38bdf8]" />

                            </button>



                            {/* Send Button with Dropdown */}

                            <div className="relative">

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveActionMenuId(null);
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const spaceBelow = window.innerHeight - rect.bottom;
                                  setSendMenuPosition(spaceBelow < 220 ? 'up' : 'down');
                                  setActiveSendMenuId(activeSendMenuId === inv.id ? null : inv.id);
                                }}
                                className="w-8 h-8 rounded-full hover:bg-[#f4f9ff]/80 dark:hover:bg-[#1b264f] flex items-center justify-center text-slate-500 dark:text-zinc-400 cursor-pointer transition-all hover:scale-105 active:scale-95 border border-transparent hover:border-[#bae6fd]/40 dark:hover:border-[#223269]/40"
                                title="Send Document"
                              >
                                <Send className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              </button>

                              {activeSendMenuId === inv.id && (
                                <div 
                                  className={`absolute right-0 ${sendMenuPosition === 'up' ? 'bottom-10 slide-in-from-bottom-2' : 'top-10 slide-in-from-top-2'} z-[120] w-48 py-2 bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl shadow-xl animate-in fade-in duration-150 text-left`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={() => {
                                      setActiveSendMenuId(null);
                                      triggerWhatsAppShare(inv);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-705 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"
                                  >
                                    <span className="w-4 h-4 text-emerald-500 font-bold">💬</span>
                                    <span>Send to WhatsApp</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      setActiveSendMenuId(null);
                                      triggerEmailShare(inv);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-705 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"
                                  >
                                    <Mail className="w-3.5 h-3.5 text-sky-500" />
                                    <span>Send via Email</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      setActiveSendMenuId(null);
                                      handleCopyShareLink(inv);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-705 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"
                                  >
                                    <LinkIcon className="w-3.5 h-3.5 text-amber-500" />
                                    <span>Copy Link</span>
                                  </button>
                                </div>
                              )}
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                const spaceBelow = window.innerHeight - rect.bottom;
                                setActionMenuPosition(spaceBelow < 220 ? 'up' : 'down');
                                setActiveActionMenuId(activeActionMenuId === inv.id ? null : inv.id);
                              }}
                              className="w-8 h-8 rounded-full hover:bg-[#f4f9ff]/80 dark:hover:bg-[#1b264f] flex items-center justify-center text-slate-500 dark:text-zinc-400 cursor-pointer transition-all hover:scale-105 active:scale-95 border border-transparent hover:border-[#bae6fd]/40 dark:hover:border-[#223269]/40"
                              title="More Actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeActionMenuId === inv.id && (
                              <div 
                                className={`absolute right-0 ${actionMenuPosition === 'up' ? 'bottom-10 slide-in-from-bottom-2' : 'top-10 slide-in-from-top-2'} z-[120] w-52 py-2 bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl shadow-xl animate-in fade-in duration-150 text-left`}
                                onClick={(e) => e.stopPropagation()}
                              >

                                
        {showBinView ? (
          <>
            <button
              onClick={() => {
                setActiveActionMenuId(null);
                if (onRestoreInvoice) onRestoreInvoice(inv.id);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restore Document</span>
            </button>
            <div className="border-t border-[#bae6fd]/25 dark:border-[#223269]/40 my-1"></div>
            <button
              onClick={() => {
                setActiveActionMenuId(null);
                if (onHardDeleteInvoice) onHardDeleteInvoice(inv.id);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Permanently Delete</span>
            </button>
          </>
        ) : (
          <>
<button

                                  onClick={() => {

                                    setActiveActionMenuId(null);

                                    onOpenInvoiceEditor(inv);

                                  }}

                                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-705 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"

                                >

                                  <PenTool className="w-3.5 h-3.5 text-[#0284c7] dark:text-[#38bdf8]" />

                                  <span>Edit Details</span>

                                </button>



                                <button

                                  onClick={async () => {

                                    setActiveActionMenuId(null);

                                    try {

                                      await exportInvoicePDFAsync(inv, profile, 'save');

                                    } catch (err: any) {

                                      alert('Failed to generate PDF: ' + (err.message || err.toString()));

                                    }

                                  }}

                                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-705 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"

                                >

                                  <FileDown className="w-3.5 h-3.5 text-rose-500" />

                                  <span>Download PDF</span>

                                </button>



                                <button

                                  onClick={() => {

                                    setActiveActionMenuId(null);

                                    if (subscriptionTier === 'free') {
                                      if (typeof window !== 'undefined') {
                                        window.dispatchEvent(new CustomEvent('mak_navigate_tab', { detail: 'subscription' }));
                                      }
                                      return;
                                    }

                                    onOpenInvoiceEditor({

                                      ...inv,

                                      id: '',

                                      invoiceNumber: getSuccessorInvoiceNumber(inv, invoices),

                                      date: new Date().toISOString().split('T')[0]

                                    } as any);

                                  }}

                                  className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-slate-705 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"

                                >

                                  <div className="flex items-center gap-2.5">

                                    <Copy className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />

                                    <span>Duplicate</span>

                                  </div>

                                  {subscriptionTier === 'free' && <Lock className="w-3 h-3 text-amber-500" />}

                                </button>



                                {/* Convert Actions */}

                                <div className="border-t border-[#bae6fd]/25 dark:border-[#223269]/40 my-1"></div>

                                

                                {(() => {

                                  const isPurchaseDoc = ['purchases', 'purchase_order', 'purchase_debit_note'].includes(inv.invoiceType || '');

                                  if (isPurchaseDoc) {

                                    return (

                                      <>

                                        {inv.invoiceType !== 'purchases' && (

                                          <button

                                            onClick={() => handleConvertDocument(inv, 'purchases')}

                                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-705 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"

                                          >

                                            <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />

                                            <span>Convert to Purchase Bill</span>

                                          </button>

                                        )}

                                        {inv.invoiceType !== 'purchase_order' && (

                                          <button

                                            onClick={() => handleConvertDocument(inv, 'purchase_order')}

                                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-705 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"

                                          >

                                            <RefreshCw className="w-3.5 h-3.5 text-sky-600" />

                                            <span>Convert to Purchase Order</span>

                                          </button>

                                        )}

                                        {inv.invoiceType !== 'purchase_debit_note' && (

                                          <button

                                            onClick={() => handleConvertDocument(inv, 'purchase_debit_note')}

                                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-705 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"

                                          >

                                            <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />

                                            <span>Convert to Debit Note</span>

                                          </button>

                                        )}

                                      </>

                                    );

                                  } else {

                                    return (

                                      <>

                                        {inv.invoiceType !== 'invoice' && (

                                          <button

                                            onClick={() => handleConvertDocument(inv, 'invoice')}

                                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-705 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"

                                          >

                                            <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />

                                            <span>Convert to Invoice</span>

                                          </button>

                                        )}

                                        {inv.invoiceType !== 'proforma' && (

                                          <button

                                            onClick={() => handleConvertDocument(inv, 'proforma')}

                                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-705 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"

                                          >

                                            <RefreshCw className="w-3.5 h-3.5 text-sky-600" />

                                            <span>Convert to Proforma</span>

                                          </button>

                                        )}

                                        {inv.invoiceType !== 'quote' && (

                                          <button

                                            onClick={() => handleConvertDocument(inv, 'quote')}

                                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-705 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"

                                          >

                                            <RefreshCw className="w-3.5 h-3.5 text-teal-600" />

                                            <span>Convert to Quote</span>

                                          </button>

                                        )}

                                        {inv.invoiceType !== 'credit_note' && (

                                          <button

                                            onClick={() => handleConvertDocument(inv, 'credit_note')}

                                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-705 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"

                                          >

                                            <RefreshCw className="w-3.5 h-3.5 text-violet-600" />

                                            <span>Convert to Credit Note</span>

                                          </button>

                                        )}

                                        {inv.invoiceType !== 'debit_note' && (

                                          <button

                                            onClick={() => handleConvertDocument(inv, 'debit_note')}

                                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-705 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"

                                          >

                                            <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />

                                            <span>Convert to Debit Note</span>

                                          </button>

                                        )}

                                      </>

                                    );

                                  }

                                })()}



                                <div className="border-t border-[#bae6fd]/25 dark:border-[#223269]/40 my-1"></div>



                                <button

                                  onClick={() => {

                                    setActiveActionMenuId(null);

                                    handleThermalPrint(inv);

                                  }}

                                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-750 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"

                                >

                                  <Printer className="w-3.5 h-3.5 text-violet-500" />

                                  <span>Thermal Print</span>

                                </button>



                                <button

                                  onClick={() => {

                                    setActiveActionMenuId(null);

                                    handleShippingLabelPrint(inv);

                                  }}

                                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-750 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"

                                >

                                  <MapPin className="w-3.5 h-3.5 text-amber-500" />

                                  <span>Shipping Label</span>

                                </button>



                                <>
                                  <button
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      handleRecordPayment(inv);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span>{(inv.paidAmount && inv.paidAmount > 0) || inv.status === 'paid' ? 'Record / Edit Payment' : 'Record Payment'}</span>
                                  </button>
                                  <div className="border-t border-[#bae6fd]/25 dark:border-[#223269]/40 my-1"></div>
                                </>



                                <button

                                  onClick={() => {

                                    setActiveActionMenuId(null);

                                    onDeleteInvoice(inv.id);

                                  }}

                                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"

                                >

                                  <Trash2 className="w-3.5 h-3.5" />

                                  <span>Delete Invoice</span>

                                </button>
          </>
        )}


                              </div>

                            )}

                          </div>

                        </div>

                      </div>

                    </div>

                  ))

                )}

              </div>



              {/* DESKTOP WORKSPACE GRID TABLE VIEW */}

              <div className="hidden md:block bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl shadow-[0_4px_20px_rgba(2,132,199,0.06)]">

                <table className="min-w-full divide-y divide-[#bae6fd]/40 dark:divide-[#223269]/60 text-xs">

                  <thead className="bg-[#f4f9ff] dark:bg-[#0b1329] font-bold text-[#0284c7]/80 dark:text-[#38bdf8]/70 text-[9px] uppercase tracking-wider text-left" style={{fontFamily: "'IBM Plex Mono', monospace"}}>

                    <tr>

                      <th className="px-4 py-3.5 text-center w-10">

                        <input

                          type="checkbox"

                          checked={filteredInvoices.length > 0 && filteredInvoices.every(i => selectedInvoiceIds.includes(i.id))}

                          onChange={(e) => {
                            handleSelectAllFiltered();
                          }}

                          className="w-4 h-4 rounded border-[#e2e8f0] text-[#64748b] focus:ring-[#64748b] cursor-pointer"

                          title={subscriptionTier === 'free' ? "Bulk selection locked on Starter plan (Upgrade to Basic, Pro or Enterprise)" : "Select all invoices"}

                        />

                      </th>

                      <th className="px-4 py-3.5">Invoice / Type</th>

                      <th className="px-4 py-3.5">Company Name</th>

                      <th className="px-4 py-3.5">Billing Terms / Due</th>

                      <th className="px-4 py-3.5 text-right">Sum Valuation</th>

                      <th className="px-4 py-3.5 text-center">Settlement</th>

                      <th className="px-4 py-3.5 text-right">Actions</th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-[#bae6fd]/30 dark:divide-[#223269]/40 bg-white dark:bg-[#111a36]">

                    {filteredInvoices.length === 0 ? (

                      <tr>

                        <td colSpan={7} className="px-4 py-16 text-center">

                          <div className="flex flex-col items-center gap-3">

                            <FileText className="w-10 h-10 text-[#0284c7]/25" />

                            <span className="text-[#64748b]/70 dark:text-[#94a3b8]/70 font-medium" style={{fontFamily: "'IBM Plex Mono', monospace"}}>No invoices matching selected filters.</span>

                          </div>

                        </td>

                      </tr>

                    ) : (

                      filteredInvoices.map((inv) => (

                        <tr 

                          key={inv.id} 

                          className={`hover:bg-[#e0f2fe]/20 dark:hover:bg-[#1b264f]/30 cursor-pointer transition-colors ${selectedInvoiceIds.includes(inv.id) ? 'bg-[#e0f2fe]/40 dark:bg-[#1b264f]/30' : ''}`}

                          onClick={() => setActivePreviewInvoice(inv)}

                        >

                          <td className="px-4 py-3.5 text-center w-10" onClick={(e) => e.stopPropagation()}>

                            <input

                              type="checkbox"

                              checked={selectedInvoiceIds.includes(inv.id)}

                              onChange={(e) => {
                                handleToggleSelectInvoice(inv.id, e as any);
                              }}

                              className="w-4 h-4 rounded border-[#e2e8f0] text-[#64748b] focus:ring-[#64748b] cursor-pointer"

                              title={subscriptionTier === 'free' ? "Bulk selection locked on Starter plan (Upgrade to Basic, Pro or Enterprise)" : "Select document"}

                            />

                          </td>

                          <td className="px-4 py-3.5">

                            <div className="flex items-center gap-1.5">

                              <span className="font-extrabold text-[#0284c7] dark:text-[#38bdf8] tracking-tight" style={{fontFamily: "'IBM Plex Mono', monospace"}}>{inv.invoiceNumber}</span>

                              {renderDocTypeBadge(inv)}

                              {inv.recurringSettings?.isRecurring && (

                                <span className="text-[10px]" title={`Auto Repeat ${inv.recurringSettings.interval}`}>ðŸ”„</span>

                              )}

                            </div>

                          </td>

                          <td className="px-4 py-3.5">

                            <div className="flex items-center gap-1.5 max-w-[200px] flex-wrap">
                              <span className="font-black text-[#0f172a] dark:text-white uppercase truncate max-w-[140px]">
                                {((inv as any).clientCompanyName || (inv as any).clientCompany) || inv.clientName || 'Draft Profile'}
                              </span>
                              {((inv as any).clientCompanyName || (inv as any).clientCompany) && inv.clientName && (
                                <span className="text-[9px] font-semibold text-[#0284c7]/80 dark:text-[#38bdf8]/70 bg-[#e0f2fe]/60 dark:bg-[#1b264f]/60 px-1.5 py-0.5 rounded truncate max-w-[100px] border border-[#bae6fd]/40 dark:border-[#223269]/40 leading-tight whitespace-nowrap">
                                  {inv.clientName}
                                </span>
                              )}
                            </div>

                            {inv.clientEmail && <span className="text-[9.5px] text-[#64748b]/80 block truncate max-w-[200px] font-mono mt-0.5">{inv.clientEmail}</span>}

                          </td>

                          <td className="px-4 py-3.5 text-[10px] text-[#64748b]/80 dark:text-[#94a3b8] dark:text-zinc-400" style={{fontFamily: "'IBM Plex Mono', monospace"}}>

                            <div>Issued: {inv.date}</div>

                            <div className="text-rose-500 font-bold mt-0.5">Due: {inv.dueDate}</div>

                          </td>

                          <td className="px-4 py-3.5 font-black font-mono text-[#0f172a] dark:text-white text-right text-[12px]">

                            {currencySymbol}{inv.grandTotal.toFixed(2)}

                          </td>

                          <td className="px-4 py-3.5 text-center">

                            <span className={`inline-block px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${getStatusColor(inv.status)}`}>

                              {getStatusText(inv.status)}

                            </span>

                          </td>

                          <td className="px-4 py-3.5 text-right relative" onClick={(e) => e.stopPropagation()}>

                            <div className="flex items-center justify-end gap-1">

                              {/* Quick View */}

                              <button

                                onClick={(e) => {

                                  e.stopPropagation();

                                  setActivePreviewInvoice(inv);

                                }}

                                className="w-8 h-8 rounded-full hover:bg-[#f4f9ff]/80 dark:hover:bg-[#1b264f] flex items-center justify-center text-slate-500 dark:text-zinc-400 cursor-pointer transition-all hover:scale-105 active:scale-95 border border-transparent hover:border-[#bae6fd]/40 dark:hover:border-[#223269]/40"

                                title="View Document"

                              >

                                <Eye className="w-4 h-4 text-[#0284c7] dark:text-[#38bdf8]" />

                              </button>



                              {/* Send Button with Dropdown */}

                              <div className="relative">

                                <button

                                  onClick={(e) => {

                                    e.stopPropagation();

                                    setActiveActionMenuId(null);
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const spaceBelow = window.innerHeight - rect.bottom;
                                    setSendMenuPosition(spaceBelow < 220 ? 'up' : 'down');
                                    setActiveSendMenuId(activeSendMenuId === inv.id ? null : inv.id);
                                  }}
                                  className="w-8 h-8 rounded-full hover:bg-[#f4f9ff]/80 dark:hover:bg-[#1b264f] flex items-center justify-center text-slate-500 dark:text-zinc-400 cursor-pointer transition-all hover:scale-105 active:scale-95 border border-transparent hover:border-[#bae6fd]/40 dark:hover:border-[#223269]/40"
                                  title="Send Document"
                                >
                                  <Send className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                </button>

                                {activeSendMenuId === inv.id && (
                                  <div 
                                    className={`absolute right-0 ${sendMenuPosition === 'up' ? 'bottom-10 slide-in-from-bottom-2' : 'top-10 slide-in-from-top-2'} z-[120] w-48 py-2 bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl shadow-xl animate-in fade-in duration-150 text-left`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      onClick={() => {
                                        setActiveSendMenuId(null);
                                        triggerWhatsAppShare(inv);
                                      }}
                                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-705 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"
                                    >
                                      <span className="w-4 h-4 text-emerald-500 font-bold">💬</span>
                                      <span>Send to WhatsApp</span>
                                    </button>

                                    <button
                                      onClick={() => {
                                        setActiveSendMenuId(null);
                                        triggerEmailShare(inv);
                                      }}
                                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-705 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"
                                    >
                                      <Mail className="w-3.5 h-3.5 text-sky-500" />
                                      <span>Send via Email</span>
                                    </button>

                                    <button
                                      onClick={() => {
                                        setActiveSendMenuId(null);
                                        handleCopyShareLink(inv);
                                      }}
                                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-705 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"
                                    >
                                      <LinkIcon className="w-3.5 h-3.5 text-amber-500" />
                                      <span>Copy Link</span>
                                    </button>
                                  </div>
                                )}
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const spaceBelow = window.innerHeight - rect.bottom;
                                  setActionMenuPosition(spaceBelow < 220 ? 'up' : 'down');
                                  setActiveActionMenuId(activeActionMenuId === inv.id ? null : inv.id);
                                }}
                                className="w-8 h-8 rounded-full hover:bg-[#f4f9ff]/80 dark:hover:bg-[#1b264f] flex items-center justify-center text-slate-500 dark:text-zinc-400 cursor-pointer transition-all hover:scale-105 active:scale-95 border border-transparent hover:border-[#bae6fd]/40 dark:hover:border-[#223269]/40"
                                title="More Actions"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {activeActionMenuId === inv.id && (
                                <div 
                                  className={`absolute right-4 ${actionMenuPosition === 'up' ? 'bottom-10 slide-in-from-bottom-2' : 'top-10 slide-in-from-top-2'} z-[120] w-52 py-2 bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl shadow-xl animate-in fade-in duration-150 text-left`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {showBinView ? (
          <>
            <button
              onClick={() => {
                setActiveActionMenuId(null);
                if (onRestoreInvoice) onRestoreInvoice(inv.id);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restore Document</span>
            </button>
            <div className="border-t border-[#bae6fd]/25 dark:border-[#223269]/40 my-1"></div>
            <button
              onClick={() => {
                setActiveActionMenuId(null);
                if (onHardDeleteInvoice) onHardDeleteInvoice(inv.id);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Permanently Delete</span>
            </button>
          </>
        ) : (
          <>
<button

                                    onClick={() => {

                                      setActiveActionMenuId(null);

                                      onOpenInvoiceEditor(inv);

                                    }}

                                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-705 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"

                                  >

                                    <PenTool className="w-3.5 h-3.5 text-[#0284c7] dark:text-[#38bdf8]" />

                                    <span>Edit Details</span>

                                  </button>



                                  <button

                                    onClick={async () => {

                                      setActiveActionMenuId(null);

                                      try {

                                        await exportInvoicePDFAsync(inv, profile, 'save');

                                      } catch (err: any) {

                                        alert('Failed to generate PDF: ' + (err.message || err.toString()));

                                      }

                                    }}

                                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-705 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"

                                  >

                                    <FileDown className="w-3.5 h-3.5 text-rose-500" />

                                    <span>Download PDF</span>

                                  </button>



                                  <button

                                    onClick={() => {

                                      setActiveActionMenuId(null);

                                      if (subscriptionTier === 'free') {
                                        if (typeof window !== 'undefined') {
                                          window.dispatchEvent(new CustomEvent('mak_navigate_tab', { detail: 'subscription' }));
                                        }
                                        return;
                                      }

                                      onOpenInvoiceEditor({

                                        ...inv,

                                        id: '',

                                        invoiceNumber: getSuccessorInvoiceNumber(inv, invoices),

                                        date: new Date().toISOString().split('T')[0]

                                      } as any);

                                    }}

                                    className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-slate-705 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"

                                  >

                                    <div className="flex items-center gap-2.5">

                                      <Copy className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />

                                      <span>Duplicate</span>

                                    </div>

                                    {subscriptionTier === 'free' && <Lock className="w-3 h-3 text-amber-500" />}

                                  </button>



                                  {/* Convert Actions */}

                                  <div className="border-t border-[#bae6fd]/25 dark:border-[#223269]/40 my-1"></div>

                                  

                                  {(() => {

                                    const isPurchaseDoc = ['purchases', 'purchase_order', 'purchase_debit_note'].includes(inv.invoiceType || '');

                                    if (isPurchaseDoc) {

                                      return (

                                        <>

                                          {inv.invoiceType !== 'purchases' && (

                                            <button

                                              onClick={() => handleConvertDocument(inv, 'purchases')}

                                              className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-slate-705 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"

                                            >

                                              <div className="flex items-center gap-2.5">

                                                <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />

                                                <span>Convert to Purchase Bill</span>

                                              </div>

                                              {subscriptionTier === 'free' && <Lock className="w-3 h-3 text-amber-500" />}

                                            </button>

                                          )}

                                          {inv.invoiceType !== 'purchase_order' && (

                                            <button

                                              onClick={() => handleConvertDocument(inv, 'purchase_order')}

                                              className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-slate-705 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"

                                            >

                                              <div className="flex items-center gap-2.5">

                                                <RefreshCw className="w-3.5 h-3.5 text-sky-600" />

                                                <span>Convert to Purchase Order</span>

                                              </div>

                                              {subscriptionTier === 'free' && <Lock className="w-3 h-3 text-amber-500" />}

                                            </button>

                                          )}

                                          {inv.invoiceType !== 'purchase_debit_note' && (

                                            <button

                                              onClick={() => handleConvertDocument(inv, 'purchase_debit_note')}

                                              className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-slate-705 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"

                                            >

                                              <div className="flex items-center gap-2.5">

                                                <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />

                                                <span>Convert to Debit Note</span>

                                              </div>

                                              {subscriptionTier === 'free' && <Lock className="w-3 h-3 text-amber-500" />}

                                            </button>

                                          )}

                                        </>

                                      );

                                    } else {

                                      return (

                                        <>

                                          {inv.invoiceType !== 'invoice' && (

                                            <button

                                              onClick={() => handleConvertDocument(inv, 'invoice')}

                                              className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-slate-705 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"

                                            >

                                              <div className="flex items-center gap-2.5">

                                                <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />

                                                <span>Convert to Invoice</span>

                                              </div>

                                              {subscriptionTier === 'free' && <Lock className="w-3 h-3 text-amber-500" />}

                                            </button>

                                          )}

                                          {inv.invoiceType !== 'proforma' && (

                                            <button

                                              onClick={() => handleConvertDocument(inv, 'proforma')}

                                              className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-slate-705 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"

                                            >

                                              <div className="flex items-center gap-2.5">

                                                <RefreshCw className="w-3.5 h-3.5 text-sky-600" />

                                                <span>Convert to Proforma</span>

                                              </div>

                                              {subscriptionTier === 'free' && <Lock className="w-3 h-3 text-amber-500" />}

                                            </button>

                                          )}

                                          {inv.invoiceType !== 'quote' && (

                                            <button

                                              onClick={() => handleConvertDocument(inv, 'quote')}

                                              className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-slate-705 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"

                                            >

                                              <div className="flex items-center gap-2.5">

                                                <RefreshCw className="w-3.5 h-3.5 text-teal-600" />

                                                <span>Convert to Quote</span>

                                              </div>

                                              {subscriptionTier === 'free' && <Lock className="w-3 h-3 text-amber-500" />}

                                            </button>

                                          )}

                                          {inv.invoiceType !== 'credit_note' && (

                                            <button

                                              onClick={() => handleConvertDocument(inv, 'credit_note')}

                                              className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-slate-705 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"

                                            >

                                              <div className="flex items-center gap-2.5">

                                                <RefreshCw className="w-3.5 h-3.5 text-violet-600" />

                                                <span>Convert to Credit Note</span>

                                              </div>

                                              {subscriptionTier === 'free' && <Lock className="w-3 h-3 text-amber-500" />}

                                            </button>

                                          )}

                                          {inv.invoiceType !== 'debit_note' && (

                                            <button

                                              onClick={() => handleConvertDocument(inv, 'debit_note')}

                                              className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-slate-705 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"

                                            >

                                              <div className="flex items-center gap-2.5">

                                                <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />

                                                <span>Convert to Debit Note</span>

                                              </div>

                                              {subscriptionTier === 'free' && <Lock className="w-3 h-3 text-amber-500" />}

                                            </button>

                                          )}

                                        </>

                                      );

                                    }

                                  })()}



                                  <div className="border-t border-[#bae6fd]/25 dark:border-[#223269]/40 my-1"></div>



                                  <button

                                    onClick={() => {

                                      setActiveActionMenuId(null);

                                      handleThermalPrint(inv);

                                    }}

                                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-750 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"

                                  >

                                    <Printer className="w-3.5 h-3.5 text-violet-500" />

                                    <span>Thermal Print</span>

                                  </button>



                                  <button

                                    onClick={() => {

                                      setActiveActionMenuId(null);

                                      handleShippingLabelPrint(inv);

                                    }}

                                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-750 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"

                                  >

                                    <MapPin className="w-3.5 h-3.5 text-amber-500" />

                                    <span>Shipping Label</span>

                                  </button>



                                <>
                                  <button
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      handleRecordPayment(inv);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-[#f4f9ff]/60 dark:hover:bg-[#1b264f]/45 transition-colors cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span>{(inv.paidAmount && inv.paidAmount > 0) || inv.status === 'paid' ? 'Record / Edit Payment' : 'Record Payment'}</span>
                                  </button>
                                  <div className="border-t border-[#bae6fd]/25 dark:border-[#223269]/40 my-1"></div>
                                </>



                                  <button

                                    onClick={() => {

                                      setActiveActionMenuId(null);

                                      onDeleteInvoice(inv.id);

                                    }}

                                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"

                                  >

                                    <Trash2 className="w-3.5 h-3.5" />

                                    <span>Delete Invoice</span>

                                  </button>
          </>
        )}


                                </div>

                              )}

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

              <div id="floating-bulk-actions" className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] sm:w-[92%] max-w-2xl bg-[#0b1329]/98 backdrop-blur-md border border-[#223269] text-white p-2.5 sm:p-3.5 rounded-2xl shadow-2xl flex flex-row items-center justify-between gap-2 sm:gap-3 animate-in slide-in-from-bottom duration-200">

                <div className="flex items-center gap-1.5 shrink-0">

                  <span className="w-5 h-5 bg-sky-600 rounded-full flex items-center justify-center text-[10px] font-extrabold">{selectedInvoiceIds.length}</span>

                  <span className="text-[10px] sm:text-[11px] font-medium text-slate-200">Selected</span>

                </div>

                

                <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">

                  {!showBinView && (
                    <>
                      <button

                        onClick={() => {
                          if (subscriptionTier === 'free' && selectedInvoiceIds.length > 1) {
                            emitNotification('Starter Plan Limit', 'Bulk document actions are available on Basic, Professional, and Enterprise plans. Upgrade to unlock.', 'warning');
                            if (typeof window !== 'undefined') {
                              window.dispatchEvent(new CustomEvent('mak_navigate_tab', { detail: 'subscription' }));
                            }
                            return;
                          }
                          handleBulkExportPDF();
                        }}

                        className="px-2 py-1 sm:px-2.5 sm:py-1.5 bg-sky-600 hover:bg-sky-500 rounded-xl text-[9px] sm:text-[10px] font-extrabold flex items-center gap-1 cursor-pointer active:scale-95 transition-all"

                        title="Export selected bills sequentially to PDF"

                      >

                        <FileDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />

                        <span>PDFs</span>
                        {subscriptionTier === 'free' && selectedInvoiceIds.length > 1 && <Lock className="w-3 h-3 text-amber-300 ml-0.5" />}

                      </button>

                      

                      <button

                        onClick={() => {
                          if (subscriptionTier === 'free' && selectedInvoiceIds.length > 1) {
                            emitNotification('Starter Plan Limit', 'Bulk document actions are available on Basic, Professional, and Enterprise plans. Upgrade to unlock.', 'warning');
                            if (typeof window !== 'undefined') {
                              window.dispatchEvent(new CustomEvent('mak_navigate_tab', { detail: 'subscription' }));
                            }
                            return;
                          }
                          handleBulkExportExcel();
                        }}

                        className="px-2 py-1 sm:px-2.5 sm:py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-[9px] sm:text-[10px] font-extrabold flex items-center gap-1 cursor-pointer active:scale-95 transition-all"

                        title="Export selected bills ledger details to Excel CSV"

                      >

                        <Database className="w-3 h-3 sm:w-3.5 sm:h-3.5" />

                        <span>Excel</span>
                        {subscriptionTier === 'free' && selectedInvoiceIds.length > 1 && <Lock className="w-3 h-3 text-amber-300 ml-0.5" />}

                      </button>



                      <select

                        onChange={(e) => {

                          if (e.target.value) {
                            if (subscriptionTier === 'free' && selectedInvoiceIds.length > 1) {
                              emitNotification('Starter Plan Limit', 'Bulk document actions are available on Basic, Professional, and Enterprise plans. Upgrade to unlock.', 'warning');
                              if (typeof window !== 'undefined') {
                                window.dispatchEvent(new CustomEvent('mak_navigate_tab', { detail: 'subscription' }));
                              }
                              return;
                            }

                            onBulkUpdateInvoicesStatus(selectedInvoiceIds, e.target.value as any);

                            setSelectedInvoiceIds([]);

                          }

                        }}

                        value=""

                        className="px-1.5 py-1 sm:px-2 sm:py-1.5 bg-neutral-800 text-white rounded-xl text-[9px] sm:text-[10px] font-extrabold focus:outline-none border border-neutral-750 cursor-pointer"

                        title="Change status in bulk"

                      >

                        <option value="" disabled>Status...</option>

                        {ledgerSection === 'credit_note' || (activeTab === 'purchases' && purchaseLedgerSection === 'purchase_debit_note') ? (

                          <>

                            <option value="pending">Set Pending</option>

                            <option value="approved">Set Approved</option>

                            <option value="rejected">Set Not Approved</option>

                          </>

                        ) : (

                          <>

                            <option value="paid">Set Paid</option>

                            <option value="pending">Set Pending</option>

                            <option value="draft">Set Draft</option>

                            <option value="cancelled">Set Cancelled</option>

                          </>

                        )}

                      </select>
                    </>
                  )}



                  <button

                    onClick={() => {
                      if (subscriptionTier === 'free' && selectedInvoiceIds.length > 1) {
                        emitNotification('Starter Plan Limit', 'Bulk document actions are available on Basic, Professional, and Enterprise plans. Upgrade to unlock.', 'warning');
                        if (typeof window !== 'undefined') {
                          window.dispatchEvent(new CustomEvent('mak_navigate_tab', { detail: 'subscription' }));
                        }
                        return;
                      }

                      if (showBinView) {
                        if (onBulkHardDeleteInvoices) {
                          onBulkHardDeleteInvoices(selectedInvoiceIds);
                        } else {
                          selectedInvoiceIds.forEach(id => {
                            if (onHardDeleteInvoice) onHardDeleteInvoice(id);
                          });
                        }
                      } else {
                        onBulkDeleteInvoices(selectedInvoiceIds);
                      }

                      setSelectedInvoiceIds([]);

                    }}

                    className="px-2 py-1 sm:px-2.5 sm:py-1.5 bg-rose-600 hover:bg-rose-500 rounded-xl text-[9px] sm:text-[10px] font-extrabold flex items-center gap-1 cursor-pointer active:scale-95 transition-all"

                    title={showBinView ? "Permanently delete selected documents from cloud" : "Delete all selected documents"}

                  >

                    <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />

                    <span>{showBinView ? "Delete Permanently" : "Delete"}</span>
                    {subscriptionTier === 'free' && selectedInvoiceIds.length > 1 && <Lock className="w-3 h-3 text-amber-300 ml-0.5" />}

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

          const isPurchaseOrigin = draftsOrigin === 'purchases';



          // Filter drafts based on origin

          const allDrafts = invoices.filter(i => {

            if (i.status !== 'draft') return false;

            const docType = getInvoiceDocumentType(i);

            const isPurchaseDoc = ['purchases', 'purchase_order', 'purchase_debit_note'].includes(docType);

            return isPurchaseOrigin ? isPurchaseDoc : !isPurchaseDoc;

          });



          const draftCounts = {

            all: allDrafts.length,

            // Sales

            invoice: allDrafts.filter(i => getInvoiceDocumentType(i) === 'invoice').length,

            proforma: allDrafts.filter(i => getInvoiceDocumentType(i) === 'proforma').length,

            debit_note: allDrafts.filter(i => getInvoiceDocumentType(i) === 'debit_note').length,

            credit_note: allDrafts.filter(i => getInvoiceDocumentType(i) === 'credit_note').length,

            quote: allDrafts.filter(i => getInvoiceDocumentType(i) === 'quote').length,

            // Purchases

            purchases: allDrafts.filter(i => getInvoiceDocumentType(i) === 'purchases').length,

            purchase_order: allDrafts.filter(i => getInvoiceDocumentType(i) === 'purchase_order').length,

            purchase_debit_note: allDrafts.filter(i => getInvoiceDocumentType(i) === 'purchase_debit_note').length

          };



          const filteredDrafts = draftsSection === 'all'

            ? allDrafts

            : allDrafts.filter(i => getInvoiceDocumentType(i) === draftsSection);



          const docTypeBadges: Record<string, { label: string; style: string }> = {

            invoice: { label: 'Tax Invoice', style: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-300/60' },

            proforma: { label: 'Proforma', style: 'bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border-sky-300/60' },

            debit_note: { label: 'Debit Note', style: 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-300/60' },

            credit_note: { label: 'Credit Note', style: 'bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 border-violet-300/60' },

            quote: { label: 'Quote / Est', style: 'bg-teal-100 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border-teal-300/60' },

            purchases: { label: 'Purchase Bill', style: 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-300/60' },

            purchase_order: { label: 'Purchase Order', style: 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-300/60' },

            purchase_debit_note: { label: 'Debit Note', style: 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-300/60' }

          };



          const activeTabsList = isPurchaseOrigin

            ? [

                { id: 'all', label: 'All Drafts', count: draftCounts.all, activeColor: 'bg-blue-600 text-white shadow-sm' },

                { id: 'purchases', label: 'Purchase Bills', count: draftCounts.purchases, activeColor: 'bg-blue-600 text-white shadow-sm' },

                { id: 'purchase_order', label: 'Purchase Orders', count: draftCounts.purchase_order, activeColor: 'bg-amber-600 text-white shadow-sm' },

                { id: 'purchase_debit_note', label: 'Debit Notes', count: draftCounts.purchase_debit_note, activeColor: 'bg-[#4f46e5] text-white shadow-sm' }

              ]

            : [

                { id: 'all', label: 'All Drafts', count: draftCounts.all, activeColor: 'bg-[#0f172a] text-white dark:bg-white dark:text-zinc-900 shadow-sm' },

                { id: 'invoice', label: 'Tax Invoice', count: draftCounts.invoice, activeColor: 'bg-emerald-600 text-white shadow-sm' },

                { id: 'proforma', label: 'Proforma', count: draftCounts.proforma, activeColor: 'bg-sky-600 text-white shadow-sm' },

                { id: 'credit_note', label: 'Credit Note', count: draftCounts.credit_note, activeColor: 'bg-violet-600 text-white shadow-sm' },

                { id: 'quote', label: 'Quotes / Est', count: draftCounts.quote, activeColor: 'bg-teal-600 text-white shadow-sm' }

              ];



          const activeTabsListDesktop = isPurchaseOrigin

            ? [

                { id: 'all', label: 'All Purchase Drafts', count: draftCounts.all, activeColor: 'bg-blue-600 text-white shadow-sm' },

                { id: 'purchases', label: 'Purchase Bills', count: draftCounts.purchases, activeColor: 'bg-blue-600 text-white shadow-sm' },

                { id: 'purchase_order', label: 'Purchase Orders', count: draftCounts.purchase_order, activeColor: 'bg-amber-600 text-white shadow-sm' },

                { id: 'purchase_debit_note', label: 'Debit Notes', count: draftCounts.purchase_debit_note, activeColor: 'bg-[#4f46e5] text-white shadow-sm' }

              ]

            : [

                { id: 'all', label: 'All Drafts', count: draftCounts.all, activeColor: 'bg-[#0f172a] text-white dark:bg-white dark:text-zinc-900 shadow-sm' },

                { id: 'invoice', label: 'Tax Invoices', count: draftCounts.invoice, activeColor: 'bg-emerald-600 text-white shadow-sm' },

                { id: 'proforma', label: 'Proforma', count: draftCounts.proforma, activeColor: 'bg-sky-600 text-white shadow-sm' },

                { id: 'credit_note', label: 'Credit Notes', count: draftCounts.credit_note, activeColor: 'bg-violet-600 text-white shadow-sm' },

                { id: 'quote', label: 'Quotes & Estimates', count: draftCounts.quote, activeColor: 'bg-teal-600 text-white shadow-sm' }

              ];



          return (

            <div className="space-y-6">

              {/* Header */}

              <div className="flex items-center justify-between gap-2 w-full">

                <div className="flex items-center gap-1.5 sm:gap-2 shrink min-w-0">

                  <h2 className="text-[11px] sm:text-xs font-black text-[#0f172a] dark:text-white uppercase tracking-wider truncate">

                    {isPurchaseOrigin ? 'Purchase Drafts' : 'Sales Drafts'}

                  </h2>

                  <span className="px-2 py-0.5 sm:px-2.5 bg-[#e0f2fe] dark:bg-[#1b264f] text-[#0284c7] dark:text-[#38bdf8] border border-[#bae6fd]/40 dark:border-[#223269]/40 rounded-lg text-[9px] sm:text-[9.5px] font-black shrink-0">

                    {filteredDrafts.length} {filteredDrafts.length === 1 ? 'Draft' : 'Drafts'}

                  </span>

                </div>

                <div className="flex items-center gap-2 ml-auto shrink-0">
                  <button
                    onClick={() => setActiveTab(isPurchaseOrigin ? 'purchases' : 'invoices')}
                    className="px-2.5 py-1.5 sm:px-4 sm:py-1.5 bg-white dark:bg-[#111a36] border border-[#bae6fd] dark:border-[#223269]/60 hover:bg-[#f4f9ff]/50 dark:hover:bg-[#1b264f]/40 text-[#0f172a] dark:text-white rounded-xl text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95 whitespace-nowrap shrink-0"
                  >
                    <ArrowLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#0284c7] dark:text-[#38bdf8]" />
                    <span>Back to Ledger</span>
                  </button>
                </div>

              </div>



              {/* Bifurcated Section Tabs Bar — Ultra Clean Responsive Design */}

              <div className="w-full">

                {/* Mobile Grid Layout */}

                <div className="grid grid-cols-3 sm:hidden gap-1.5 p-1.5 bg-[#f4f9ff]/30 dark:bg-[#0b1329]/40 rounded-2xl border border-[#bae6fd]/30 dark:border-[#223269]/55">

                  {activeTabsList.map(tab => {

                    const isActive = draftsSection === tab.id;

                    return (

                      <button

                        key={tab.id}

                        type="button"

                        onClick={() => setDraftsSection(tab.id as any)}

                        className={`flex items-center justify-between px-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all cursor-pointer border ${

                          isActive

                            ? `${tab.activeColor} border-transparent`

                            : 'bg-white dark:bg-[#111a36] border-[#bae6fd]/40 dark:border-[#223269]/40 text-slate-500 dark:text-zinc-400 hover:text-[#0284c7] dark:hover:text-[#38bdf8]'

                        }`}

                      >

                        <span className="truncate pr-1">{tab.label}</span>

                        <span className={`px-1.5 py-0.2 rounded-full text-[8.5px] font-black shrink-0 ${

                          isActive

                            ? 'bg-white/20 text-current'

                            : 'bg-[#e0f2fe]/60 dark:bg-[#1b264f]/60 text-[#0284c7] dark:text-[#38bdf8]'

                        }`}>

                          {tab.count}

                        </span>

                      </button>

                    );

                  })}

                </div>



                {/* Desktop Horizontal Row Layout */}

                <div className="hidden sm:flex items-center gap-1.5 p-1.5 bg-[#f4f9ff]/30 dark:bg-[#0b1329]/40 rounded-2xl border border-[#bae6fd]/30 dark:border-[#223269]/55">

                  {activeTabsListDesktop.map(tab => {

                    const isActive = draftsSection === tab.id;

                    return (

                      <button

                        key={tab.id}

                        type="button"

                        onClick={() => setDraftsSection(tab.id as any)}

                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer border ${

                          isActive

                            ? `${tab.activeColor} border-transparent`

                            : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-[#0284c7] dark:hover:text-[#38bdf8] hover:bg-white/60 dark:hover:bg-[#1b264f]/40'

                        }`}

                      >

                        <span>{tab.label}</span>

                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${

                          isActive

                            ? 'bg-white/20 text-current'

                            : 'bg-[#e0f2fe]/60 dark:bg-[#1b264f]/60 text-[#0284c7] dark:text-[#38bdf8]'

                        }`}>

                          {tab.count}

                        </span>

                      </button>

                    );

                  })}

                </div>

              </div>



              {/* Draft Cards Grid */}

              {filteredDrafts.length === 0 ? (

                <div className="py-16 text-center bg-white dark:bg-[#111a36] rounded-2xl border border-[#bae6fd]/30 dark:border-[#223269]/60">

                  <div className="w-12 h-12 rounded-2xl bg-[#e0f2fe] dark:bg-[#1b264f] text-[#0284c7] dark:text-[#38bdf8] flex items-center justify-center mx-auto mb-3 border border-[#bae6fd]/40 dark:border-[#223269]/40">

                    <FileText className="w-6 h-6" />

                  </div>

                  <p className="text-xs font-bold text-slate-500 dark:text-zinc-400">

                    {draftsSection === 'all'

                      ? 'No pending drafts found.'

                      : `No ${docTypeBadges[draftsSection]?.label || draftsSection} drafts found.`}

                  </p>

                </div>

              ) : (

                <div className="space-y-4">

                  {/* Draft Select-All Toolbar */}

                  <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-[#111a36] rounded-xl border border-[#bae6fd]/40 dark:border-[#223269]/50 text-xs">

                    <label className="flex items-center gap-2 font-extrabold text-[#0f172a] dark:text-white cursor-pointer select-none">

                      <input

                        type="checkbox"

                        checked={filteredDrafts.length > 0 && filteredDrafts.every(inv => selectedInvoiceIds.includes(inv.id))}

                        onChange={(e) => {
                          if (e.target.checked) {

                            const allDraftIds = filteredDrafts.map(d => d.id);

                            setSelectedInvoiceIds(Array.from(new Set([...selectedInvoiceIds, ...allDraftIds])));

                          } else {

                            const draftIdSet = new Set(filteredDrafts.map(d => d.id));

                            setSelectedInvoiceIds(selectedInvoiceIds.filter(id => !draftIdSet.has(id)));

                          }

                        }}

                        className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 dark:border-zinc-700 cursor-pointer"

                      />

                      <span>Select All ({filteredDrafts.length})</span>

                    </label>



                    {selectedInvoiceIds.some(id => filteredDrafts.some(d => d.id === id)) && (

                      <div className="flex items-center gap-2">

                        <span className="text-[11px] font-bold text-[#0284c7] dark:text-[#38bdf8]">

                          {selectedInvoiceIds.filter(id => filteredDrafts.some(d => d.id === id)).length} Selected

                        </span>

                        <button

                          type="button"

                          onClick={() => {

                            const activeDraftIds = selectedInvoiceIds.filter(id => filteredDrafts.some(d => d.id === id));

                            onBulkDeleteInvoices(activeDraftIds);

                            setSelectedInvoiceIds(selectedInvoiceIds.filter(id => !activeDraftIds.includes(id)));

                          }}

                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-extrabold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-xs"

                          title="Delete selected drafts"

                        >

                          <Trash2 className="w-3 h-3" />

                          <span>Delete Selected ({selectedInvoiceIds.filter(id => filteredDrafts.some(d => d.id === id)).length})</span>

                        </button>

                      </div>

                    )}

                  </div>



                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                    {filteredDrafts.map(inv => {

                      const docTypeKey = getInvoiceDocumentType(inv);

                      const badge = docTypeBadges[docTypeKey] || docTypeBadges.invoice;

                      const isSelected = selectedInvoiceIds.includes(inv.id);



                      return (

                        <div 

                          key={inv.id} 

                          className={`p-5 bg-white dark:bg-[#111a36] border rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 group relative flex flex-col justify-between ${

                            isSelected 

                              ? 'border-[#0284c7] dark:border-[#38bdf8] ring-1 ring-[#0284c7]/40 dark:ring-[#38bdf8]/40 bg-[#f0f9ff]/40 dark:bg-[#112347]/40' 

                              : 'border-[#bae6fd]/50 dark:border-[#223269]/60 hover:border-[#bae6fd]/80 dark:hover:border-[#223269]/90'

                          }`}

                        >

                          <div>

                            <div className="flex justify-between items-start mb-3 gap-2">

                              <div className="flex items-start gap-2.5 min-w-0">

                                <input

                                  type="checkbox"

                                  checked={isSelected}

                                  onChange={(e) => {

                                    e.stopPropagation();

                                    if (e.target.checked) {

                                      setSelectedInvoiceIds([...selectedInvoiceIds, inv.id]);

                                    } else {

                                      setSelectedInvoiceIds(selectedInvoiceIds.filter(id => id !== inv.id));

                                    }

                                  }}

                                  className="w-4 h-4 mt-0.5 rounded text-sky-600 focus:ring-sky-500 border-slate-300 dark:border-zinc-700 cursor-pointer shrink-0"

                                />

                                <div className="min-w-0">

                                  <span className="text-[10px] font-black text-[#0284c7] dark:text-[#38bdf8] font-mono tracking-tight block mb-1">{inv.invoiceNumber}</span>

                                  <h4 className="text-sm font-black text-[#0f172a] dark:text-white uppercase truncate">{inv.clientName || 'Draft Profile'}</h4>

                                </div>

                              </div>



                              <div className="flex flex-col items-end gap-1 shrink-0">

                                <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider border ${badge.style}`}>

                                  {badge.label}

                                </span>

                                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-slate-100/80 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">

                                  Draft

                                </span>

                              </div>

                            </div>

                            

                            <div className="flex items-center justify-between mb-4 text-[10px] text-slate-500 dark:text-zinc-400 font-semibold font-mono">

                              <span>Saved on {inv.date}</span>

                              <span className="font-bold text-[#0f172a] dark:text-white">{currencySymbol}{inv.grandTotal ? inv.grandTotal.toFixed(2) : '0.00'}</span>

                            </div>

                          </div>



                          <div className="pt-4 border-t border-[#bae6fd]/30 dark:border-[#223269]/40 flex gap-2">

                            <button 

                              onClick={() => onOpenInvoiceEditor(inv)}

                              className="flex-1 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex justify-center items-center gap-1.5 shadow-sm shadow-sky-500/10 active:scale-[0.98]"

                            >

                              <PenTool className="w-3 h-3" /> Resume Editing

                            </button>



                            <button 

                              onClick={() => onDeleteInvoice(inv.id)}

                              className="w-8 h-8 flex items-center justify-center bg-rose-50/50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-500 hover:text-rose-600 rounded-xl transition-all border border-rose-100/50 dark:border-rose-900/30 cursor-pointer shrink-0 active:scale-95"

                              title="Delete Draft"

                            >

                              <Trash2 className="w-3.5 h-3.5" />

                            </button>

                          </div>

                        </div>

                      );

                    })}

                  </div>

                </div>

              )}

            </div>

          );

        })()}

        {activeTab === 'invoice_templates' && (

          <div className="space-y-4">

            <TemplateManager businessProfile={profile} subscriptionTier={subscriptionTier} />

          </div>

        )}



        {/* ------------------ TAB 2: CLIENTS ROUTE ------------------ */}

        {activeTab === 'clients' && (

          <div className="space-y-5 text-sans">

            

            {/* ─── Page Header ─── */}

            <div className="bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(2,132,199,0.06)' }}>

              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between p-4 sm:p-5 md:p-6">

                {/* Left: Icon + title + description */}

                <div className="flex items-start gap-4">

                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-[#0284c7] dark:bg-[#38bdf8]" style={{ boxShadow: '0 2px 8px rgba(2,132,199,0.3)' }}>

                    <Users2 className="w-5 h-5 text-white dark:text-[#0b1329]" />

                  </div>

                  <div>

                    <div className="flex items-center gap-2.5 flex-wrap">

                      <h2 className="text-lg md:text-xl font-black text-[#0f172a] dark:text-white uppercase tracking-tight leading-none" style={{ fontFamily: "'Fraunces', serif" }}>

                        Billed Clients Ledger Book

                      </h2>

                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border bg-[#e0f2fe] border-[#bae6fd] dark:bg-[#1b264f]/40 dark:border-[#223269]/40 text-[#0284c7] dark:text-[#38bdf8]">

                        {billedClientsFiltered.length} {billedClientsFiltered.length === 1 ? 'Record' : 'Records'}

                      </span>

                    </div>

                    <p className="mt-1.5 text-xs text-[#64748b]/70 dark:text-[#94a3b8]/70 max-w-md leading-relaxed">

                      Manage client profiles for rapid auto-filling during billing creation (Sales Ledger only)

                    </p>

                  </div>

                </div>

              </div>

            </div>



            {/* Clients grid list */}

            {billedClientsFiltered.length === 0 ? (

              <div 

                className="bg-white dark:bg-[#111a36] border border-[#bae6fd]/50 dark:border-[#223269]/50 rounded-2xl p-12 text-center relative overflow-hidden"

                style={{ boxShadow: '0 1px 3px rgba(2,132,199,0.06)' }}

              >

                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#bae6fd]/60 to-transparent" />

                <Notebook className="w-10 h-10 mx-auto mb-3 text-[#0284c7]/40" />

                <h3 className="text-xs font-bold text-[#0f172a] dark:text-zinc-300 uppercase tracking-wider">Your Billed Clients Ledger is Empty</h3>

                <p className="text-[10px] text-[#64748b]/80 dark:text-zinc-400 mt-1 max-w-sm mx-auto">

                  Add profiles to automatically inject contacts, GSTIN numbers, and addresses instantly on invoice templates.

                </p>

                <button

                  onClick={() => handleOpenClientEditor(null)}

                  className="mt-4 px-3.5 py-1.5 border border-[#0284c7] hover:bg-[#0284c7] text-[#0284c7] hover:text-white dark:text-[#38bdf8] dark:border-[#223269] dark:hover:bg-[#0284c7] rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer"

                >

                  Create First Profile

                </button>

              </div>

            ) : (

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {billedClientsFiltered.map(c => (

                  <div

                    key={c.id}

                    className="bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden transition-all duration-300 hover:shadow-md hover:border-blue-500 active:border-blue-600 dark:hover:border-blue-500 dark:active:border-blue-600 hover:-translate-y-1 group flex flex-col justify-between cursor-pointer"

                    style={{ boxShadow: '0 1px 3px rgba(110,96,80,0.06)' }}

                  >

                    {/* card top line decoration */}

                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />



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

                            onClick={() => handleDeleteClientWrap(c.id)}

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

                          <Mail className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />

                          <div className="min-w-0">

                            <span className="text-[8px] font-black uppercase tracking-wider text-[#64748b]/50 block">Email Address</span>

                            <span className="truncate block font-semibold text-[#0f172a] dark:text-zinc-200 mt-0.5">{c.email || 'N/A'}</span>

                          </div>

                        </div>



                        {/* Phone */}

                        <div className="flex items-start gap-2 text-[10px] text-[#64748b]/80 dark:text-zinc-400">

                          <Smartphone className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />

                          <div>

                            <span className="text-[8px] font-black uppercase tracking-wider text-[#64748b]/50 block">Contact Number</span>

                            <span className="block font-semibold text-[#0f172a] dark:text-zinc-200 mt-0.5">{c.phone || 'N/A'}</span>

                          </div>

                        </div>



                        {/* Address */}

                        <div className="flex items-start gap-2 text-[10px] text-[#64748b]/80 dark:text-zinc-400">

                          <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />

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



        {/* ------------------ TAB: PURCHASERS ROUTE ------------------ */}

        {activeTab === 'purchasers' && (

          <div className="space-y-5 text-sans">

            

            {/* ─── Page Header ─── */}

            <div className="bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(2,132,199,0.06)' }}>

              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between p-4 sm:p-5 md:p-6">

                {/* Left: Icon + title + description */}

                <div className="flex items-start gap-4">

                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-[#0284c7] dark:bg-[#38bdf8]" style={{ boxShadow: '0 2px 8px rgba(2,132,199,0.3)' }}>

                    <Users2 className="w-5 h-5 text-white dark:text-[#0b1329]" />

                  </div>

                  <div>

                    <div className="flex items-center gap-2.5 flex-wrap">

                      <h2 className="text-lg md:text-xl font-black text-[#0f172a] dark:text-white uppercase tracking-tight leading-none" style={{ fontFamily: "'Fraunces', serif" }}>

                        Billed Vendors Directory

                      </h2>

                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border bg-[#e0f2fe] border-[#bae6fd] dark:bg-[#1b264f]/40 dark:border-[#223269]/40 text-[#0284c7] dark:text-[#38bdf8]">

                        {purchasersFiltered.length} {purchasersFiltered.length === 1 ? 'Record' : 'Records'}

                      </span>

                    </div>

                    <p className="mt-1.5 text-xs text-[#64748b]/70 dark:text-[#94a3b8]/70 max-w-md leading-relaxed">

                      Manage vendor and supplier profiles captured from your purchases ledger bills, POs, and debit notes

                    </p>

                  </div>

                </div>

              </div>

            </div>



            {/* Billed Vendors grid list */}

            {purchasersFiltered.length === 0 ? (

              <div 

                className="bg-white dark:bg-[#111a36] border border-[#bae6fd]/50 dark:border-[#223269]/50 rounded-2xl p-12 text-center relative overflow-hidden"

                style={{ boxShadow: '0 1px 3px rgba(2,132,199,0.06)' }}

              >

                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#bae6fd]/60 to-transparent" />

                <Notebook className="w-10 h-10 mx-auto mb-3 text-[#0284c7]/40" />

                <h3 className="text-xs font-bold text-[#0f172a] dark:text-zinc-300 uppercase tracking-wider">Your Billed Vendors Directory is Empty</h3>

                <p className="text-[10px] text-[#64748b]/80 dark:text-zinc-400 mt-1 max-w-sm mx-auto">

                  Add profiles manually or create Purchase Bills, POs, and Debit Notes to automatically populate vendors here.

                </p>

                <button

                  onClick={() => handleOpenClientEditor(null)}

                  className="mt-4 px-3.5 py-1.5 border border-[#0284c7] hover:bg-[#0284c7] text-[#0284c7] hover:text-white dark:text-[#38bdf8] dark:border-[#223269] dark:hover:bg-[#0284c7] rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer"

                >

                  Create First Vendor

                </button>

              </div>

            ) : (

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {purchasersFiltered.map(c => (

                  <div

                    key={c.id}

                    className="bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden transition-all duration-300 hover:shadow-md hover:border-blue-500 active:border-blue-600 dark:hover:border-blue-500 dark:active:border-blue-600 hover:-translate-y-1 group flex flex-col justify-between cursor-pointer"

                    style={{ boxShadow: '0 1px 3px rgba(110,96,80,0.06)' }}

                  >

                    {/* card top line decoration */}

                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />



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

                              ðŸ¢ {c.companyName}

                            </span>

                          )}

                        </div>

                        

                        {/* Quick action buttons */}

                        <div className="flex gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">

                          <button

                            onClick={() => handleOpenClientEditor(c)}

                            className="text-[#64748b] hover:text-[#0f172a] dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"

                            title="Edit profile"

                          >

                            <PenTool className="w-3.5 h-3.5" />

                          </button>

                          <button

                            onClick={() => handleDeleteClientWrap(c.id)}

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

                          <Mail className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />

                          <div className="min-w-0">

                            <span className="text-[8px] font-black uppercase tracking-wider text-[#64748b]/50 block">Email Address</span>

                            <span className="truncate block font-semibold text-[#0f172a] dark:text-zinc-200 mt-0.5">{c.email || 'N/A'}</span>

                          </div>

                        </div>



                        {/* Phone */}

                        <div className="flex items-start gap-2 text-[10px] text-[#64748b]/80 dark:text-zinc-400">

                          <Smartphone className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />

                          <div>

                            <span className="text-[8px] font-black uppercase tracking-wider text-[#64748b]/50 block">Contact Number</span>

                            <span className="block font-semibold text-[#0f172a] dark:text-zinc-200 mt-0.5">{c.phone || 'N/A'}</span>

                          </div>

                        </div>



                        {/* Address */}

                        <div className="flex items-start gap-2 text-[10px] text-[#64748b]/80 dark:text-zinc-400">

                          <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />

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



            {/* â”€â”€ Page Header â”€â”€ */}

            <div
              className="relative overflow-hidden bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl shadow-xs"
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#0284c7]/40 dark:via-[#38bdf8]/50 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-br from-[#f4f9ff]/80 via-white/30 to-transparent dark:from-[#1b264f]/50 dark:via-[#111a36]/60 dark:to-transparent pointer-events-none" />
              <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-5 sm:px-6 py-4 sm:py-5">
                <div className="flex items-center gap-4">
                  <div
                    className="w-11 h-11 rounded-xl bg-[#0284c7] dark:bg-[#38bdf8] flex items-center justify-center shrink-0"
                    style={{ boxShadow: '0 2px 8px rgba(2,132,199,0.3), inset 0 1px 0 rgba(255,255,255,0.15)' }}
                  >
                    <FileText className="w-5 h-5 text-white dark:text-[#0b1329]" />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-black text-[#0f172a] dark:text-white tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>Accounting Report</h2>
                    <span className="text-[11px] font-medium text-[#64748b] dark:text-[#94a3b8] mt-0.5 block">Generate customised tax &amp; income expense ledger reports</span>
                  </div>
                </div>
              </div>
            </div>



            {/* â”€â”€ Ledger & Invoice Report (unified card) â”€â”€ */}

            <section

              className="bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl overflow-hidden relative"

              style={{ boxShadow: '0 1px 3px rgba(2,132,199,0.06)' }}

            >

              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#bae6fd]/60 to-transparent" />



              {/* Card header */}

              <div className="flex flex-wrap items-start sm:items-center justify-between gap-3 px-5 sm:px-6 py-3.5 border-b border-[#bae6fd]/30 dark:border-[#223269]/30 bg-[#f4f9ff] dark:bg-[#0b1329]/60">

                <div className="flex items-center gap-2.5">

                  <div className="w-1.5 h-4 rounded-full bg-[#0284c7] dark:bg-[#38bdf8]" />

                  <div>

                    <span className="text-[10px] font-black uppercase tracking-widest text-[#0f172a] dark:text-zinc-300 block">Ledger &amp; Invoice Report</span>

                    <span className="text-[9px] text-[#64748b]/60 dark:text-zinc-500 block mt-0.5">Filter records and download compiled reports or individual invoices</span>

                  </div>

                </div>

                <div

                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#e0f2fe] dark:bg-[#1b264f] border border-[#bae6fd]/60 dark:border-[#223269]/40 shrink-0"

                >

                  <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7] dark:bg-[#38bdf8] animate-pulse" />

                  <span className="text-[10px] font-mono font-bold text-[#0284c7] dark:text-[#38bdf8]">{reportedInvoices.length} matched</span>

                </div>

              </div>



              {/* Single horizontal body card structure */}
              <div className="px-5 sm:px-6 py-5 space-y-4">

                {/* Tier 1: Responsive Grid of 5 Control Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 w-full">

                  {/* Start Date */}
                  <div className="space-y-1.5 min-w-0">
                    <label htmlFor="rep-start" className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-[#64748b]/80 dark:text-zinc-400">
                      <span className="w-1 h-1 rounded-full bg-[#0284c7] dark:bg-[#38bdf8] inline-block" />
                      Start Date
                    </label>
                    <input
                      id="rep-start"
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd]/60 hover:border-[#0284c7] focus:border-[#0284c7] dark:border-[#223269] dark:focus:border-[#38bdf8] rounded-xl text-xs font-medium text-[#0f172a] dark:text-white focus:outline-none transition-all duration-150 shadow-2xs"
                    />
                  </div>

                  {/* End Date */}
                  <div className="space-y-1.5 min-w-0">
                    <label htmlFor="rep-end" className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-[#64748b]/80 dark:text-zinc-400">
                      <span className="w-1 h-1 rounded-full bg-[#0284c7] dark:bg-[#38bdf8] inline-block" />
                      End Date
                    </label>
                    <input
                      id="rep-end"
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd]/60 hover:border-[#0284c7] focus:border-[#0284c7] dark:border-[#223269] dark:focus:border-[#38bdf8] rounded-xl text-xs font-medium text-[#0f172a] dark:text-white focus:outline-none transition-all duration-150 shadow-2xs"
                    />
                  </div>

                  {/* Client Account */}
                  <div className="space-y-1.5 min-w-0">
                    <label htmlFor="rep-client" className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-[#64748b]/80 dark:text-zinc-400">
                      <span className="w-1 h-1 rounded-full bg-[#0284c7] dark:bg-[#38bdf8] inline-block" />
                      Client Account
                    </label>
                    <select
                      id="rep-client"
                      value={reportClientFilter}
                      onChange={(e) => setReportClientFilter(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd]/60 hover:border-[#0284c7] focus:border-[#0284c7] dark:border-[#223269] dark:focus:border-[#38bdf8] rounded-xl text-xs font-semibold text-[#0f172a] dark:text-white focus:outline-none transition-all duration-150 cursor-pointer shadow-2xs"
                    >
                      <option value="all">All Clients</option>
                      {Array.from(new Set(invoices.map(it => it.clientName))).filter(Boolean).map(clName => (
                        <option key={clName} value={clName}>{clName}</option>
                      ))}
                    </select>
                  </div>

                  {/* Document Type */}
                  <div className="space-y-1.5 min-w-0">
                    <label htmlFor="rep-doc-type" className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-[#64748b]/80 dark:text-zinc-400">
                      <span className="w-1 h-1 rounded-full bg-[#0284c7] dark:bg-[#38bdf8] inline-block" />
                      Document Type
                    </label>
                    <select
                      id="rep-doc-type"
                      value={reportDocTypeFilter}
                      onChange={(e) => setReportDocTypeFilter(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd]/60 hover:border-[#0284c7] focus:border-[#0284c7] dark:border-[#223269] dark:focus:border-[#38bdf8] rounded-xl text-xs font-bold text-[#0f172a] dark:text-white focus:outline-none transition-all duration-150 cursor-pointer shadow-2xs"
                    >
                      <option value="all">All Documents (Combined)</option>
                      <option value="all_sales">All Sales Ledger</option>
                      <option value="all_purchases">All Purchase Ledger</option>
                      <optgroup label="Sales Documents">
                        <option value="tax_invoice">Tax Invoice</option>
                        <option value="proforma">Proforma Invoice</option>
                        <option value="receipt">Receipt / Cash Voucher</option>
                        <option value="quote">Quotation / Estimate</option>
                        <option value="credit_note">Credit Note</option>
                      </optgroup>
                      <optgroup label="Purchase Documents">
                        <option value="purchase_order">Purchase Order</option>
                        <option value="purchase_invoice">Purchases</option>
                        <option value="debit_note">Debit Note</option>
                      </optgroup>
                    </select>
                  </div>

                  {/* Sort By */}
                  <div className="space-y-1.5 min-w-0">
                    <label htmlFor="rep-sort-by" className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-[#64748b]/80 dark:text-zinc-400">
                      <span className="w-1 h-1 rounded-full bg-[#0284c7] dark:bg-[#38bdf8] inline-block" />
                      Sort By
                    </label>
                    <select
                      id="rep-sort-by"
                      value={reportSortBy}
                      onChange={(e) => setReportSortBy(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd]/60 hover:border-[#0284c7] focus:border-[#0284c7] dark:border-[#223269] dark:focus:border-[#38bdf8] rounded-xl text-xs font-bold text-[#0f172a] dark:text-white focus:outline-none transition-all duration-150 cursor-pointer shadow-2xs"
                    >
                      <option value="doc_no_asc">Doc No (Increasing)</option>
                      <option value="doc_no_desc">Doc No (Decreasing)</option>
                      <option value="date_asc">Date (Increasing / Oldest First)</option>
                      <option value="date_desc">Date (Decreasing / Newest First)</option>
                      <option value="amount_asc">Amount (Increasing / Low to High)</option>
                      <option value="amount_desc">Amount (Decreasing / High to Low)</option>
                    </select>
                  </div>

                </div>

                {/* Tier 2: Quick Range Chips & Action Buttons */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-3.5 border-t border-[#bae6fd]/40 dark:border-[#223269]/40 w-full">

                  {/* Left: Quick Range Chips */}
                  <div className="space-y-1.5">
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
                            className="px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-150 hover:translate-y-[-1px] active:scale-[0.97] cursor-pointer bg-[#f4f9ff] hover:bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd] dark:bg-[#1b264f]/40 dark:hover:bg-[#1b264f] dark:text-[#38bdf8] dark:border-[#223269]"
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right: Download buttons */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0 self-end md:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        if (reportedInvoices.length === 0) { alert("No billing records match the specified document selection and interval."); return; }

                        // Check Report Downloads Quota for current 1-month activation period
                        const currentCount = getBillingCycleReportCount();
                        const limits = getTierLimits(subscriptionTier);

                        if (currentCount >= limits.reportsPerMonth) {
                          const errorMsg = `Subscription period accounting report limit reached (${limits.reportsPerMonth} report(s)/period on ${subscriptionTier.toUpperCase()} plan). Upgrade your plan to download more reports.`;
                          emitNotification('Quota Exceeded 🔒', errorMsg, 'error');
                          if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('mak_navigate_tab', { detail: 'subscription' }));
                          }
                          return;
                        }

                        // Increment report count within active activation cycle & export
                        incrementBillingCycleReportCount();
                        const rangeLabel = reportStartDate && reportEndDate ? `${reportStartDate} to ${reportEndDate}` : "Cumulative Ledger Period";
                        exportCollectiveReportPDF(reportedInvoices, profile, rangeLabel, reportDocTypeFilter, reportSortBy);
                      }}
                      className="group relative px-4 py-2.5 rounded-xl text-white text-[10.5px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-150 hover:translate-y-[-1px] active:scale-[0.98] cursor-pointer overflow-hidden shadow-sm"
                      style={{ background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)' }}
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
                      className="group relative px-4 py-2.5 rounded-xl text-white text-[10.5px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-150 hover:translate-y-[-1px] active:scale-[0.98] cursor-pointer overflow-hidden shadow-sm"
                      style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)' }}
                    >
                      <span className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-150" />
                      <Download className="w-3.5 h-3.5 shrink-0" />
                      <span>All Individual Invoices</span>
                    </button>
                  </div>

                </div>

              </div>

            </section>



            <div className="mt-8 mb-4 flex flex-wrap items-center justify-between gap-3 px-2">

              <div className="flex items-center gap-2.5">

                <div className="w-1.5 h-4 rounded-full bg-[#0284c7] dark:bg-[#38bdf8]" />

                <div>

                  <span className="text-[11px] font-black uppercase tracking-widest text-[#0f172a] dark:text-zinc-300 block" style={{ fontFamily: "'Fraunces', serif" }}>Income &amp; Expense Analytics</span>

                  <span className="text-[9px] text-[#64748b]/60 dark:text-zinc-500 block mt-0.5">Overview of cash flow, liabilities, and profitability based on current ledger</span>

                </div>

              </div>

            </div>



            {/* Income and Expense Analytics report */}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">

              {/* Gross Profit Card */}

              <div className="bg-white/80 dark:bg-[#111a36]/90 backdrop-blur-md border-l-4 border-l-emerald-500 border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative flex flex-col justify-between min-h-[155px] group">

                <div className="flex justify-between items-start gap-2">

                  <div className="w-8.5 h-8.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center font-black text-sm group-hover:scale-110 transition-transform duration-200 shadow-xs">

                    {currencySymbol}

                  </div>

                  <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">

                    Cleared

                  </span>

                </div>

                <div className="mt-3 min-w-0">

                  <span className="text-[9px] uppercase font-black tracking-wider text-[#64748b]/90 dark:text-[#94a3b8]/90 block truncate">Gross Profit</span>

                  <span className="text-lg sm:text-xl font-black text-[#0f172a] dark:text-white mt-0.5 block font-mono tracking-tight truncate">

                    {currencySymbol}{formatNum(reportedIncomePaid)}

                  </span>

                  <span className="text-[8.5px] text-[#64748b]/70 dark:text-[#94a3b8]/70 mt-0.5 block truncate">Settled Invoices Revenue</span>

                </div>

                {/* Sparkline bars */}

                <div className="flex items-end gap-1 h-5 self-start mt-2">

                  <div className="w-1 bg-emerald-300 dark:bg-emerald-700 rounded-t-sm h-2" />

                  <div className="w-1 bg-emerald-400 dark:bg-emerald-600 rounded-t-sm h-3" />

                  <div className="w-1 bg-emerald-500 dark:bg-emerald-500 rounded-t-sm h-5" />

                  <div className="w-1 bg-emerald-400 dark:bg-emerald-600 rounded-t-sm h-3" />

                  <div className="w-1 bg-emerald-600 dark:bg-emerald-400 rounded-t-sm h-6" />

                </div>

              </div>



              {/* Business Expenses Card */}

              <div className="bg-white/80 dark:bg-[#111a36]/90 backdrop-blur-md border-l-4 border-l-rose-500 border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative flex flex-col justify-between min-h-[155px] group">

                <div className="flex justify-between items-start gap-2">

                  <div className="w-8.5 h-8.5 rounded-xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/80 flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-xs">

                    <MinusCircle className="w-4 h-4" />

                  </div>

                  <span className="text-[9px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">

                    Outflow

                  </span>

                </div>

                <div className="mt-3 min-w-0">

                  <span className="text-[9px] uppercase font-black tracking-wider text-[#64748b]/90 dark:text-[#94a3b8]/90 block truncate">Business Expenses</span>

                  <span className="text-lg sm:text-xl font-black text-[#0f172a] dark:text-white mt-0.5 block font-mono tracking-tight truncate">

                    {currencySymbol}{formatNum(expenseStats.totalExpenses)}

                  </span>

                  <span className="text-[8.5px] text-[#64748b]/70 dark:text-[#94a3b8]/70 mt-0.5 block truncate">Purchases & Direct Overhead</span>

                </div>

                {/* Sparkline bars */}

                <div className="flex items-end gap-1 h-5 self-start mt-2">

                  <div className="w-1 bg-rose-300 dark:bg-rose-700 rounded-t-sm h-4" />

                  <div className="w-1 bg-rose-400 dark:bg-rose-600 rounded-t-sm h-2" />

                  <div className="w-1 bg-rose-500 dark:bg-rose-500 rounded-t-sm h-5" />

                  <div className="w-1 bg-rose-400 dark:bg-rose-600 rounded-t-sm h-3" />

                  <div className="w-1 bg-rose-600 dark:bg-rose-400 rounded-t-sm h-6" />

                </div>

              </div>



              {/* Operating Margin Card */}

              <div className="bg-white/80 dark:bg-[#111a36]/90 backdrop-blur-md border-l-4 border-l-blue-500 border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative flex flex-col justify-between min-h-[155px] group">

                <div className="flex justify-between items-start gap-2">

                  <div className="w-8.5 h-8.5 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/80 flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-xs">

                    <TrendingUp className="w-4 h-4" />

                  </div>

                  <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">

                    Margin

                  </span>

                </div>

                <div className="mt-3 min-w-0">

                  <span className="text-[9px] uppercase font-black tracking-wider text-[#64748b]/90 dark:text-[#94a3b8]/90 block truncate">Net Profit Margin</span>

                  <span className="text-lg sm:text-xl font-black text-[#0f172a] dark:text-white mt-0.5 block font-mono tracking-tight truncate">

                    {totalSalesAmount > 0 ? (((totalBilled - expenseStats.totalExpenses) / totalSalesAmount) * 100).toFixed(1) + '%' : '0%'}

                  </span>

                  <span className="text-[8.5px] text-[#64748b]/70 dark:text-[#94a3b8]/70 mt-0.5 block truncate">(Profit / Total Sales) Ratio</span>

                </div>

                {/* Sparkline bars */}

                <div className="flex items-end gap-1 h-5 self-start mt-2">

                  <div className="w-1 bg-blue-300 dark:bg-blue-700 rounded-t-sm h-3" />

                  <div className="w-1 bg-blue-400 dark:bg-blue-600 rounded-t-sm h-4" />

                  <div className="w-1 bg-blue-500 dark:bg-blue-500 rounded-t-sm h-6" />

                  <div className="w-1 bg-blue-400 dark:bg-blue-600 rounded-t-sm h-5" />

                  <div className="w-1 bg-blue-600 dark:bg-blue-400 rounded-t-sm h-4" />

                </div>

              </div>



              {/* Outstanding Receivables Card */}

              <div className="bg-white/80 dark:bg-[#111a36]/90 backdrop-blur-md border-l-4 border-l-amber-500 border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative flex flex-col justify-between min-h-[155px] group">

                <div className="flex justify-between items-start gap-2">

                  <div className="w-8.5 h-8.5 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-xs">

                    <CheckSquare className="w-4 h-4" />

                  </div>

                  <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">

                    Pending

                  </span>

                </div>

                <div className="mt-3 min-w-0">

                  <span className="text-[9px] uppercase font-black tracking-wider text-[#64748b]/90 dark:text-[#94a3b8]/90 block truncate">Uncollected Revenue</span>

                  <span className="text-lg sm:text-xl font-black text-[#0f172a] dark:text-white mt-0.5 block font-mono tracking-tight truncate">

                    {currencySymbol}{formatNum(reportedOutstanding)}

                  </span>

                  <span className="text-[8.5px] text-[#64748b]/70 dark:text-[#94a3b8]/70 mt-0.5 block truncate">Unpaid Invoices Total</span>

                </div>

                {/* Sparkline bars */}

                <div className="flex items-end gap-1 h-5 self-start mt-2">

                  <div className="w-1 bg-amber-300 dark:bg-amber-700 rounded-t-sm h-5" />

                  <div className="w-1 bg-amber-400 dark:bg-amber-600 rounded-t-sm h-3" />

                  <div className="w-1 bg-amber-500 dark:bg-amber-500 rounded-t-sm h-6" />

                  <div className="w-1 bg-amber-400 dark:bg-amber-600 rounded-t-sm h-2" />

                  <div className="w-1 bg-amber-600 dark:bg-amber-400 rounded-t-sm h-4" />

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

                reportedInvoices.filter(isSalesInvoiceForReport).forEach(inv => {
                  const d = new Date(inv.date);
                  if (isNaN(d.getTime())) return;
                  const lbl = `${d.getDate()}/${d.getMonth() + 1}`;
                  const match = records.find(r => r.label === lbl);
                  if (match) {
                    match.income += inv.status === 'paid' ? (inv.paidAmount ?? inv.grandTotal) : (inv.paidAmount ?? 0);
                    match.tax += (inv.taxTotal || 0);
                  }
                });

                reportedExpenses.forEach(exp => {
                  const d = new Date(exp.expense_date || exp.date || '');
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

                reportedInvoices.filter(isSalesInvoiceForReport).forEach(inv => {
                  const d = new Date(inv.date);
                  if (isNaN(d.getTime())) return;
                  const match = (records as any[]).find(r => d >= r._start && d <= r._end);
                  if (match) {
                    match.income += inv.status === 'paid' ? (inv.paidAmount ?? inv.grandTotal) : (inv.paidAmount ?? 0);
                    match.tax += (inv.taxTotal || 0);
                  }
                });

                reportedExpenses.forEach(exp => {
                  const d = new Date(exp.expense_date || exp.date || '');
                  if (isNaN(d.getTime())) return;
                  const match = (records as any[]).find(r => d >= r._start && d <= r._end);
                  if (match) match.expense += exp.amount;
                });

              } else if (reportsChartRange === 'all') {
                // Yearly buckets
                const salesInvoicesOnly = reportedInvoices.filter(isSalesInvoiceForReport);
                const minYearInv = salesInvoicesOnly.length > 0 ? Math.min(...salesInvoicesOnly.map(i => new Date(i.date).getFullYear())) : now.getFullYear();
                const minYearExp = reportedExpenses.length > 0 ? Math.min(...reportedExpenses.map(e => new Date(e.expense_date || e.date || '').getFullYear())) : now.getFullYear();
                const startYear = Math.min(minYearInv, minYearExp, now.getFullYear());
                const endYear = now.getFullYear();
                
                // Show at least a 3-year spread if there's only 1 year of data so the chart line has points
                const adjustedStart = (endYear - startYear < 2) ? endYear - 2 : startYear;
                
                for (let y = adjustedStart; y <= endYear; y++) {
                  records.push({ label: y.toString(), income: 0, expense: 0, tax: 0, _year: y } as any);
                }
                
                salesInvoicesOnly.forEach(inv => {
                  const d = new Date(inv.date);
                  if (isNaN(d.getTime())) return;
                  const match = (records as any[]).find(r => r._year === d.getFullYear());
                  if (match) {
                    match.income += inv.status === 'paid' ? (inv.paidAmount ?? inv.grandTotal) : (inv.paidAmount ?? 0);
                    match.tax += (inv.taxTotal || 0);
                  }
                });

                reportedExpenses.forEach(exp => {
                  const d = new Date(exp.expense_date || exp.date || '');
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

                reportedInvoices.filter(isSalesInvoiceForReport).forEach(inv => {
                  const d = new Date(inv.date);
                  if (isNaN(d.getTime())) return;
                  const match = (records as any[]).find(r => r._month === d.getMonth() && r._year === d.getFullYear());
                  if (match) {
                    match.income += inv.status === 'paid' ? (inv.paidAmount ?? inv.grandTotal) : (inv.paidAmount ?? 0);
                    match.tax += (inv.taxTotal || 0);
                  }
                });

                reportedExpenses.forEach(exp => {
                  const d = new Date(exp.expense_date || exp.date || '');
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

                    className="bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 relative"

                    style={{ boxShadow: '0 1px 3px rgba(2,132,199,0.06)' }}

                  >

                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#bae6fd]/60 to-transparent" />

                    <span className="text-[9px] font-black uppercase tracking-widest text-[#64748b]/60 dark:text-zinc-500 shrink-0">Trend Period</span>

                    <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none min-w-0">

                      {RANGE_OPTS.map(opt => {

                        const isActive = reportsChartRange === opt.key;

                        return (

                          <button

                            key={opt.key}

                            type="button"

                            onClick={() => setReportsChartRange(opt.key)}

                            className={`px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold transition-all duration-150 cursor-pointer shrink-0 whitespace-nowrap ${

                              isActive

                                ? 'text-white'

                                : 'bg-[#f4f9ff] hover:bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd] dark:bg-[#1b264f]/40 dark:hover:bg-[#1b264f] dark:text-[#38bdf8] dark:border-[#223269] hover:translate-y-[-1px]'

                            }`}

                            style={isActive ? {

                              background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',

                            } : undefined}

                          >

                            {opt.label}

                          </button>

                        );

                      })}

                    </div>

                  </div>



                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* CHART 1: Gross Profit vs Tax Liabilities */}

                    <div className="bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 p-5 rounded-2xl shadow-xs text-sans">

                      <div className="flex flex-wrap justify-between items-start sm:items-center gap-2 mb-4">

                        <div>

                          <h3 className="text-sm font-black text-[#0f172a] dark:text-white uppercase tracking-tight">Gross Profit & Taxes</h3>

                          <span className="text-[10px] text-[#64748b]/80 dark:text-zinc-400 block mt-0.5 font-medium">Comparative analysis of income vs tax liabilities</span>

                        </div>

                        <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-wider text-[#64748b]/80 dark:text-zinc-400">

                          <span className="flex items-center gap-1.5">

                            <span className="w-2.5 h-0.5 bg-[#0284c7] dark:bg-[#38bdf8]" /> PROFIT

                          </span>

                          <span className="flex items-center gap-1.5">

                            <span className="w-2.5 h-0.5 border-t border-dashed border-[#2563eb] dark:border-[#60a5fa]" /> TAX

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

                                <line x1={paddingX} y1={y} x2={chartWidth - paddingX} y2={y} stroke={theme === 'dark' ? '#223269' : '#bae6fd'} strokeWidth="0.5" strokeOpacity="0.4" />

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

                              stroke={theme === 'dark' ? '#38bdf8' : '#0284c7'} 

                              strokeWidth="1" 

                              strokeDasharray="2 2"

                              className="opacity-75"

                            />

                          )}



                          {/* Line paths */}

                          <path d={pathIncome1} fill="none" stroke={theme === 'dark' ? '#38bdf8' : '#0284c7'} strokeWidth="2.5" strokeLinecap="round" />

                          <path d={pathTax1} fill="none" stroke={theme === 'dark' ? '#60a5fa' : '#2563eb'} strokeWidth="1.8" strokeDasharray="3 3" strokeLinecap="round" />



                          {/* Dots */}

                          {pointsIncome1.map((pts, i) => (

                            <circle 

                              key={`gp-dot-${i}`} 

                              cx={pts.x} 

                              cy={pts.y} 

                              r={hoveredReportsChartIndex1 === i ? "4.5" : "3"} 

                              fill={theme === 'dark' ? '#38bdf8' : '#0284c7'} 

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

                              fill={theme === 'dark' ? '#60a5fa' : '#2563eb'} 

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

                                className={`text-[9px] font-mono transition-all ${isHovered ? 'font-black fill-[#0284c7] dark:fill-[#38bdf8]' : 'font-bold fill-[#64748b]/80'}`}

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

                              <g transform={`translate(${tooltipX}, ${tooltipY})`} className="pointer-events-none filter drop-shadow-[0_2px_4px_rgba(2,132,199,0.12)]">

                                <rect width={tooltipWidth} height={tooltipHeight} rx="6" fill="#111a36" stroke={theme === 'dark' ? '#223269' : '#bae6fd'} strokeWidth="0.5" />

                                <text x="8" y="12" fill="#e0f2fe" className="text-[8px] font-black uppercase tracking-wider font-mono">{rec.label}</text>

                                <text x="8" y="24" fill="#10B981" className="text-[8px] font-bold font-mono">Profit: {currencySymbol}{formatNum(rec.income)}</text>

                                <text x="8" y="34" fill="#38BDF8" className="text-[8px] font-bold font-mono">Tax: {currencySymbol}{formatNum(rec.tax)}</text>

                              </g>

                            );

                          })()}

                        </svg>

                      </div>

                    </div>



                    {/* CHART 2: Earnings vs Expenses */}

                    <div className="bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 p-5 rounded-2xl shadow-xs text-sans">

                      <div className="flex flex-wrap justify-between items-start sm:items-center gap-2 mb-4">

                        <div>

                          <h3 className="text-sm font-black text-[#0f172a] dark:text-white uppercase tracking-tight">Earnings & Expenses</h3>

                          <span className="text-[10px] text-[#64748b]/80 dark:text-zinc-400 block mt-0.5 font-medium">Comparative analysis of business revenues vs expenses</span>

                        </div>

                        <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-wider text-[#64748b]/80 dark:text-zinc-400">

                          <span className="flex items-center gap-1.5">

                            <span className="w-2.5 h-0.5 bg-[#0284c7] dark:bg-[#38bdf8]" /> EARNED

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

                                <line x1={paddingX} y1={y} x2={chartWidth - paddingX} y2={y} stroke={theme === 'dark' ? '#223269' : '#bae6fd'} strokeWidth="0.5" strokeOpacity="0.4" />

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

                              stroke={theme === 'dark' ? '#38bdf8' : '#0284c7'} 

                              strokeWidth="1" 

                              strokeDasharray="2 2"

                              className="opacity-75"

                            />

                          )}



                          {/* Line paths */}

                          <path d={pathIncome2} fill="none" stroke={theme === 'dark' ? '#38bdf8' : '#0284c7'} strokeWidth="2.5" strokeLinecap="round" />

                          <path d={pathExpense2} fill="none" stroke="#EF4444" strokeWidth="1.8" strokeDasharray="3 3" strokeLinecap="round" />



                          {/* Dots */}

                          {pointsIncome2.map((pts, i) => (

                            <circle 

                              key={`earn-dot-${i}`} 

                              cx={pts.x} 

                              cy={pts.y} 

                              r={hoveredReportsChartIndex2 === i ? "4.5" : "3"} 

                              fill={theme === 'dark' ? '#38bdf8' : '#0284c7'} 

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

                                className={`text-[9px] font-mono transition-all ${isHovered ? 'font-black fill-[#0284c7] dark:fill-[#38bdf8]' : 'font-bold fill-[#64748b]/80'}`}

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

                              <g transform={`translate(${tooltipX}, ${tooltipY})`} className="pointer-events-none filter drop-shadow-[0_2px_4px_rgba(2,132,199,0.12)]">

                                <rect width={tooltipWidth} height={tooltipHeight} rx="6" fill="#111a36" stroke={theme === 'dark' ? '#223269' : '#bae6fd'} strokeWidth="0.5" />

                                <text x="8" y="12" fill="#e0f2fe" className="text-[8px] font-black uppercase tracking-wider font-mono">{rec.label}</text>

                                <text x="8" y="24" fill="#10B981" className="text-[8px] font-bold font-mono">Earned: {currencySymbol}{formatNum(rec.income)}</text>

                                <text x="8" y="34" fill="#EF4444" className="text-[8px] font-bold font-mono">Spent: {currencySymbol}{formatNum(rec.expense)}</text>

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

                  className="relative overflow-hidden bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl p-5 shadow-xs"

                  style={{ boxShadow: '0 1px 3px rgba(2,132,199,0.06)' }}

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

                        {isProfitable ? '+' : ''}{currencySymbol}{formatNum(netCash)}

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

              {/* Box 1: Recent Tax Invoices */}

              <div className="bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl p-6 shadow-xs">

                <div className="flex justify-between items-center pb-4 border-b border-[#bae6fd]/30 dark:border-zinc-800">

                  <h3 className="text-sm font-black text-[#0f172a] dark:text-white uppercase tracking-tight">Recent Tax Invoices</h3>

                  <span className="text-[10px] font-mono font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-lg border border-indigo-200/50 dark:border-indigo-900/30">

                    {reportedInvoices.length} Invoices

                  </span>

                </div>

                <div className="w-full overflow-x-auto mt-3 text-sans">

                  {reportedInvoices.length === 0 ? (

                    <div className="py-8 text-center">

                      <p className="text-xs text-[#64748b]/80 font-medium">No tax invoices recorded in this filtered period.</p>

                    </div>

                  ) : (

                    <>

                      {/* Desktop Table View */}

                      <table className="hidden sm:table w-full text-left text-xs border-collapse">

                        <thead>

                          <tr className="text-[10px] font-black uppercase text-[#64748b]/60 tracking-wider border-b border-[#bae6fd]/30">

                            <th className="py-2.5 font-black">INV ID</th>

                            <th className="py-2.5 font-black">CLIENT NAME</th>

                            <th className="py-2.5 font-black">DATE</th>

                            <th className="py-2.5 font-black">AMOUNT</th>

                            <th className="py-2.5 font-black">STATUS</th>

                            <th className="py-2.5"></th>

                          </tr>

                        </thead>

                        <tbody>

                          {reportedInvoices.slice(0, 2).map(inv => (

                            <tr key={inv.id} className="border-b border-[#bae6fd]/20 hover:bg-[#e0f2fe]/20 dark:hover:bg-[#1b264f]/20">

                              <td className="py-3 font-extrabold text-[#0f172a] dark:text-white font-mono">{inv.invoiceNumber}</td>

                              <td className="py-3 font-bold text-[#64748b] dark:text-zinc-300 truncate max-w-[140px]">{inv.clientName}</td>

                              <td className="py-3 font-medium text-[#64748b]/80 dark:text-zinc-400 font-sans">{inv.date}</td>
                              <td className="py-3 font-extrabold font-mono text-[#0f172a] dark:text-white">{currencySymbol}{formatNum(inv.grandTotal)}</td>
                              <td className="py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${getStatusColor(inv.status)}`}>
                                  {inv.status}
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

                      {/* Mobile Card List View */}
                      <div className="block sm:hidden space-y-3">
                        {reportedInvoices.slice(0, 2).map(inv => (
                          <div key={inv.id} className="p-3 bg-slate-50 dark:bg-zinc-900/40 rounded-xl border border-[#bae6fd]/20 dark:border-zinc-800 space-y-2 relative">
                            <div className="flex justify-between items-center pr-6">
                              <span className="font-extrabold text-[#0f172a] dark:text-white text-xs font-mono">{inv.invoiceNumber}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${getStatusColor(inv.status)}`}>
                                {inv.status}
                              </span>
                            </div>
                            <div className="font-bold text-[#64748b] dark:text-zinc-300 text-xs pr-6">{inv.clientName}</div>
                            <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-100 dark:border-zinc-800">
                              <span className="font-medium text-[#64748b]/80 dark:text-zinc-400">{inv.date}</span>
                              <span className="font-extrabold font-mono text-[#0f172a] dark:text-white">{currencySymbol}{formatNum(inv.grandTotal)}</span>
                            </div>
                            <div className="absolute right-2 top-2">
                              <button 
                                onClick={() => setActivePreviewInvoice(inv)}
                                className="text-[#64748b] hover:text-[#0f172a] dark:hover:text-white p-1 cursor-pointer"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {reportedInvoices.length > 2 && (
                    <div className="mt-3 pt-3 border-t border-[#bae6fd]/30 dark:border-zinc-800 text-center">
                      <button 
                        onClick={() => setActiveTab('invoices')} 
                        className="text-[9px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:opacity-80 transition-opacity"
                      >
                        View All Tax Invoices &rarr;
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Box 2: Recent Purchase Bills */}
              <div className="bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl p-6 shadow-xs">
                <div className="flex justify-between items-center pb-4 border-b border-[#bae6fd]/30 dark:border-zinc-800">
                  <h3 className="text-sm font-black text-[#0f172a] dark:text-white uppercase tracking-tight">Recent Purchase Bills</h3>
                  <span className="text-[10px] font-mono font-black text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-lg border border-rose-200/50 dark:border-rose-900/30">
                    {purchaseInvoices.length} Bills
                  </span>
                </div>
                <div className="w-full overflow-x-auto mt-3 text-sans">
                  {purchaseInvoices.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-xs text-[#64748b]/80 font-medium">No purchase bills recorded in this system.</p>
                    </div>
                  ) : (
                    <>
                      {/* Desktop Table View */}
                      <table className="hidden sm:table w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="text-[10px] font-black uppercase text-[#64748b]/60 tracking-wider border-b border-[#bae6fd]/30">
                            <th className="py-2.5 font-black">BILL ID</th>
                            <th className="py-2.5 font-black">VENDOR NAME</th>
                            <th className="py-2.5 font-black">DATE</th>
                            <th className="py-2.5 font-black">AMOUNT</th>
                            <th className="py-2.5 font-black">STATUS</th>
                            <th className="py-2.5"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {purchaseInvoices.slice(0, 2).map(pb => (
                            <tr key={pb.id} className="border-b border-[#bae6fd]/20 hover:bg-[#e0f2fe]/20 dark:hover:bg-[#1b264f]/20">
                              <td className="py-3 font-extrabold text-[#0f172a] dark:text-white font-mono">{pb.invoiceNumber}</td>
                              <td className="py-3 font-bold text-[#64748b] dark:text-zinc-300 truncate max-w-[140px]">{pb.clientName}</td>
                              <td className="py-3 font-medium text-[#64748b]/80 dark:text-zinc-400 font-sans">{pb.date}</td>
                              <td className="py-3 font-extrabold font-mono text-rose-500">-{currencySymbol}{formatNum(pb.grandTotal)}</td>
                              <td className="py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${getStatusColor(pb.status)}`}>
                                  {pb.status}
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                <button 
                                  onClick={() => setActivePreviewInvoice(pb)}
                                  className="text-[#64748b] hover:text-[#0f172a] dark:hover:text-white p-1 cursor-pointer"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Mobile Card List View */}
                      <div className="block sm:hidden space-y-3">
                        {purchaseInvoices.slice(0, 2).map(pb => (
                          <div key={pb.id} className="p-3 bg-slate-50 dark:bg-zinc-900/40 rounded-xl border border-[#bae6fd]/20 dark:border-zinc-800 space-y-2 relative">
                            <div className="flex justify-between items-center pr-6">
                              <span className="font-extrabold text-[#0f172a] dark:text-white text-xs font-mono">{pb.invoiceNumber}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${getStatusColor(pb.status)}`}>
                                {pb.status}
                              </span>
                            </div>
                            <div className="font-bold text-[#64748b] dark:text-zinc-300 text-xs pr-6">{pb.clientName}</div>
                            <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-100 dark:border-zinc-800">
                              <span className="font-medium text-[#64748b]/80 dark:text-zinc-400">{pb.date}</span>
                              <span className="font-extrabold font-mono text-rose-500">-{currencySymbol}{formatNum(pb.grandTotal)}</span>
                            </div>
                            <div className="absolute right-2 top-2">
                              <button 
                                onClick={() => setActivePreviewInvoice(pb)}
                                className="text-[#64748b] hover:text-[#0f172a] dark:hover:text-white p-1 cursor-pointer"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {purchaseInvoices.length > 2 && (
                    <div className="mt-3 pt-3 border-t border-[#bae6fd]/30 dark:border-zinc-800 text-center">
                      <button 
                        onClick={() => setActiveTab('invoices')} 
                        className="text-[9px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-600 transition-colors"
                      >
                        View All Purchase Bills &rarr;
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

          const records: { label: string; income: number; receivables: number; expenses: number }[] = [];

          const now = new Date();



          if (dashboardChartRange === '7d') {

            for (let i = 6; i >= 0; i--) {

              const d = new Date(now); d.setDate(now.getDate() - i);

              records.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, income: 0, receivables: 0, expenses: 0 });

            }

            allLedgerInvoices.filter(inv => inv.status !== 'cancelled').forEach(inv => {

              const d = new Date(inv.date); if (isNaN(d.getTime())) return;

              const lbl = `${d.getDate()}/${d.getMonth() + 1}`;

              const match = records.find(r => r.label === lbl);

              if (match) {

                match.income += inv.status === 'paid' ? (inv.paidAmount ?? inv.grandTotal) : (inv.paidAmount ?? 0);

                match.receivables += inv.status === 'paid' ? 0 : Math.max(0, inv.grandTotal - (inv.paidAmount ?? 0));

              }

            });

            supabaseExpenses.forEach(exp => {

              const d = new Date(exp.expense_date); if (isNaN(d.getTime())) return;

              const lbl = `${d.getDate()}/${d.getMonth() + 1}`;

              const match = records.find(r => r.label === lbl);

              if (match) match.expenses += Number(exp.amount) || 0;

            });

          } else if (dashboardChartRange === '1m') {

            for (let i = 3; i >= 0; i--) {

              const wEnd = new Date(now); wEnd.setDate(now.getDate() - i * 7);

              const wStart = new Date(wEnd); wStart.setDate(wEnd.getDate() - 6);

              records.push({ label: `W${4 - i}`, income: 0, receivables: 0, expenses: 0, _start: wStart, _end: wEnd } as any);

            }

            allLedgerInvoices.filter(inv => inv.status !== 'cancelled').forEach(inv => {

              const d = new Date(inv.date); if (isNaN(d.getTime())) return;

              const match = (records as any[]).find(r => d >= r._start && d <= r._end);

              if (match) {

                match.income += inv.status === 'paid' ? (inv.paidAmount ?? inv.grandTotal) : (inv.paidAmount ?? 0);

                match.receivables += inv.status === 'paid' ? 0 : Math.max(0, inv.grandTotal - (inv.paidAmount ?? 0));

              }

            });

            supabaseExpenses.forEach(exp => {

              const d = new Date(exp.expense_date); if (isNaN(d.getTime())) return;

              const match = (records as any[]).find(r => d >= r._start && d <= r._end);

              if (match) match.expenses += Number(exp.amount) || 0;

            });

          } else if (dashboardChartRange === 'all') {

            const minYearInv = allLedgerInvoices.length > 0 ? Math.min(...allLedgerInvoices.map(i => new Date(i.date).getFullYear())) : now.getFullYear();

            const startYear = Math.min(minYearInv, now.getFullYear());

            const endYear = now.getFullYear();

            const adjustedStart = (endYear - startYear < 2) ? endYear - 2 : startYear;

            for (let y = adjustedStart; y <= endYear; y++) {

              records.push({ label: y.toString(), income: 0, receivables: 0, expenses: 0, _year: y } as any);

            }

            allLedgerInvoices.filter(inv => inv.status !== 'cancelled').forEach(inv => {

              const d = new Date(inv.date); if (isNaN(d.getTime())) return;

              const match = (records as any[]).find(r => r._year === d.getFullYear());

              if (match) {

                match.income += inv.status === 'paid' ? (inv.paidAmount ?? inv.grandTotal) : (inv.paidAmount ?? 0);

                match.receivables += inv.status === 'paid' ? 0 : Math.max(0, inv.grandTotal - (inv.paidAmount ?? 0));

              }

            });

            supabaseExpenses.forEach(exp => {

              const d = new Date(exp.expense_date); if (isNaN(d.getTime())) return;

              const match = (records as any[]).find(r => r._year === d.getFullYear());

              if (match) match.expenses += Number(exp.amount) || 0;

            });

          } else {

            const monthCount = dashboardChartRange === '3m' ? 3 : dashboardChartRange === '6m' ? 6 : 12;

            const monthsShort = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

            for (let i = monthCount - 1; i >= 0; i--) {

              const d = new Date(now.getFullYear(), now.getMonth() - i, 1);

              records.push({ label: monthsShort[d.getMonth()], income: 0, receivables: 0, expenses: 0, _month: d.getMonth(), _year: d.getFullYear() } as any);

            }

            allLedgerInvoices.filter(inv => inv.status !== 'cancelled').forEach(inv => {

              const d = new Date(inv.date); if (isNaN(d.getTime())) return;

              const match = (records as any[]).find(r => r._month === d.getMonth() && r._year === d.getFullYear());

              if (match) {

                match.income += inv.status === 'paid' ? (inv.paidAmount ?? inv.grandTotal) : (inv.paidAmount ?? 0);

                match.receivables += inv.status === 'paid' ? 0 : Math.max(0, inv.grandTotal - (inv.paidAmount ?? 0));

              }

            });

            supabaseExpenses.forEach(exp => {

              const d = new Date(exp.expense_date); if (isNaN(d.getTime())) return;

              const match = (records as any[]).find(r => r._month === d.getMonth() && r._year === d.getFullYear());

              if (match) match.expenses += Number(exp.amount) || 0;

            });

          }



          // SVG Line coordinates math

          const maxVal = Math.max(...records.map(d => Math.max(d.income, d.receivables, d.expenses)), 10000);

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



          const pointsExpenses = records.map((r, i) => ({
            x: paddingX + (i / (records.length - 1)) * usableWidth,
            y: chartHeight - paddingY - (r.expenses / maxVal) * usableHeight
          }));

          const pathEarnings = pointsEarnings.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
          const pathReceivables = pointsReceivables.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
          const pathExpenses = pointsExpenses.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

          const initials = profile.name ? profile.name.slice(0, 2).toUpperCase() : 'MK';
          const totalInvoicedDash = totalBilled + totalOutstanding;
          const earningsPct = totalInvoicedDash > 0 ? ((totalBilled / totalInvoicedDash) * 100).toFixed(1) + '%' : '0%';
          const receivablesPct = totalInvoicedDash > 0 ? ((totalOutstanding / totalInvoicedDash) * 100).toFixed(1) + '%' : '0%';
          const purchasesPct = totalInvoicedDash > 0 ? ((totalPurchaseAmount / (totalInvoicedDash + totalPurchaseAmount)) * 100).toFixed(1) + '%' : '0%';
          const stockNetPct = totalPurchaseAmount > 0 ? (((totalPurchaseAmount - totalSalesAmount) / totalPurchaseAmount) * 100).toFixed(1) + '%' : '0%';
          const overheadPct = totalInvoicedDash > 0 ? ((expenseStats.totalExpenses / totalInvoicedDash) * 100).toFixed(1) + '%' : '0%';
          const taxPct = totalInvoicedDash > 0 ? ((netTaxLiability / totalInvoicedDash) * 100).toFixed(1) + '%' : '0%';

          const currentMonthVal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          const currentSelectedMonth = selectedMonthlyPeriod || currentMonthVal;

          const monthOptions: { value: string; label: string }[] = [];
          for (let i = 0; i < 24; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const lbl = d.toLocaleString('default', { month: 'long', year: 'numeric' });
            monthOptions.push({ value: val, label: i === 0 ? `Current Month (${lbl})` : lbl });
          }

          const handlePrevMonth = () => {
            const [yS, mS] = currentSelectedMonth.split('-');
            const d = new Date(parseInt(yS, 10), parseInt(mS, 10) - 2, 1);
            setSelectedMonthlyPeriod(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
          };

          const handleNextMonth = () => {
            const [yS, mS] = currentSelectedMonth.split('-');
            const d = new Date(parseInt(yS, 10), parseInt(mS, 10), 1);
            if (d <= new Date(now.getFullYear(), now.getMonth(), 1)) {
              setSelectedMonthlyPeriod(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
            }
          };

          const [yStr, mStr] = currentSelectedMonth.split('-');
          const mYear = parseInt(yStr, 10);
          const mMonth = parseInt(mStr, 10) - 1;

          const monthSalesInvoices = allLedgerInvoices.filter(inv => {
            const d = new Date(inv.date);
            return !isNaN(d.getTime()) && d.getFullYear() === mYear && d.getMonth() === mMonth;
          });
          const monthlySales = monthSalesInvoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);
          const monthlySalesTax = monthSalesInvoices.reduce((acc, inv) => acc + (inv.taxTotal || 0), 0);

          const monthPurchaseBills = allPurchaseBills.filter(inv => {
            const d = new Date(inv.date);
            return !isNaN(d.getTime()) && d.getFullYear() === mYear && d.getMonth() === mMonth;
          });
          const monthlyPurchases = monthPurchaseBills.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);
          const monthlyPurchaseTax = monthPurchaseBills.reduce((acc, inv) => acc + (inv.taxTotal || 0), 0);

          const monthlyStock = monthlyPurchases - monthlySales;

          const monthExpenses = supabaseExpenses.filter(ex => {
            const d = new Date(ex.expense_date || ex.date || '');
            return !isNaN(d.getTime()) && d.getFullYear() === mYear && d.getMonth() === mMonth;
          });
          const monthlyExpenses = monthExpenses.reduce((acc, ex) => acc + (Number(ex.amount) || 0), 0);

          const monthlyTax = Math.max(0, monthlySalesTax - monthlyPurchaseTax);

          const dateObj = new Date(mYear, mMonth, 1);
          const monthLabel = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });

          const monthlyMetrics = {
            monthlySales,
            monthlyPurchases,
            monthlyStock,
            monthlyExpenses,
            monthlyTax,
            monthLabel,
            salesCount: monthSalesInvoices.length,
            purchasesCount: monthPurchaseBills.length,
            expensesCount: monthExpenses.length
          };

          return (
            <div className="space-y-6 text-sans animate-in fade-in duration-300">

              {/* KPI Cards — Top Row (Lifetime Sales -> Lifetime Purchases -> Lifetime Stock -> Lifetime Expenses) */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                {/* 1. Lifetime Sales */}
                <div className="bg-white dark:bg-[#111a36] border-l-4 border-l-indigo-500 border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl p-3 sm:p-4.5 shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-default group relative flex flex-col justify-between min-h-[140px] sm:min-h-[160px] h-full overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <span className="text-[8px] sm:text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-1.5 sm:px-2 py-0.5 rounded-full font-mono">
                      OVERALL
                    </span>
                  </div>
                  <div className="mt-2 sm:mt-2.5">
                    <span className="text-[8.5px] sm:text-[9px] uppercase font-black tracking-wider text-[#64748b]/90 dark:text-[#94a3b8]/90 block truncate">Lifetime Sales</span>
                    <span className="text-base sm:text-xl font-black text-[#0f172a] dark:text-white mt-0.5 block font-mono tracking-tight truncate">
                      {currencySymbol}{formatNum(totalSalesAmount)}
                    </span>
                    <span className="text-[8px] sm:text-[8.5px] text-[#64748b]/70 dark:text-[#94a3b8]/70 mt-0.5 block truncate">Total Revenue Billed</span>
                  </div>
                  {/* Sparkline bars */}
                  <div className="flex items-end gap-1 h-4 sm:h-5 self-start mt-1.5 sm:mt-2">
                    {totalSalesSparklineHeights.map((h, idx) => (
                      <div
                        key={`tss-${idx}`}
                        className={`w-1 rounded-t-sm ${idx === totalSalesSparklineHeights.length - 1 ? 'bg-indigo-500 dark:bg-indigo-400' : idx % 2 === 0 ? 'bg-indigo-400 dark:bg-indigo-500' : 'bg-indigo-300 dark:bg-indigo-700'}`}
                        style={{ height: `${Math.max(4, h * 0.8)}px` }}
                      />
                    ))}
                  </div>
                </div>

                {/* 2. Lifetime Purchases */}
                <div className="bg-white dark:bg-[#111a36] border-l-4 border-l-rose-500 border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl p-3 sm:p-4.5 shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-default group relative flex flex-col justify-between min-h-[140px] sm:min-h-[160px] h-full overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FEF2F2] text-[#EF4444] border border-[#FEE2E2] flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <MinusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <span className="text-[8px] sm:text-[10px] font-black text-[#EF4444] bg-[#FEF2F2] border border-[#FEE2E2] px-1.5 sm:px-2 py-0.5 rounded-full font-mono">
                      OVERALL
                    </span>
                  </div>
                  <div className="mt-2 sm:mt-2.5">
                    <span className="text-[8.5px] sm:text-[9px] uppercase font-black tracking-wider text-[#64748b]/90 dark:text-[#94a3b8]/90 block truncate">Lifetime Purchases</span>
                    <span className="text-base sm:text-xl font-black text-[#0f172a] dark:text-white mt-0.5 block font-mono tracking-tight truncate">
                      {currencySymbol}{formatNum(totalPurchaseAmount)}
                    </span>
                    <span className="text-[8px] sm:text-[8.5px] text-[#64748b]/70 dark:text-[#94a3b8]/70 mt-0.5 block truncate">Total Purchase Bills</span>
                  </div>
                  {/* Sparkline bars */}
                  <div className="flex items-end gap-1 h-4 sm:h-5 self-start mt-1.5 sm:mt-2">
                    {purchaseSparklineHeights.map((h, idx) => (
                      <div
                        key={`ps-${idx}`}
                        className={`w-1 rounded-t-sm ${idx === purchaseSparklineHeights.length - 1 ? 'bg-rose-500 dark:bg-rose-500' : idx % 2 === 0 ? 'bg-rose-400 dark:bg-rose-600' : 'bg-rose-300 dark:bg-rose-700'}`}
                        style={{ height: `${Math.max(4, h * 0.8)}px` }}
                      />
                    ))}
                  </div>
                </div>

                {/* 3. Lifetime Stock */}
                <div className="bg-white dark:bg-[#111a36] border-l-4 border-l-teal-500 border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl p-3 sm:p-4.5 shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-default group relative flex flex-col justify-between min-h-[140px] sm:min-h-[160px] h-full overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-teal-50 text-teal-600 dark:bg-teal-950/80 dark:text-teal-400 border border-teal-200 dark:border-teal-800/80 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <span className="text-[8px] sm:text-[10px] font-black text-teal-600 bg-teal-50 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800 px-1.5 sm:px-2 py-0.5 rounded-full font-mono">
                      OVERALL
                    </span>
                  </div>
                  <div className="mt-2 sm:mt-2.5">
                    <span className="text-[8.5px] sm:text-[9px] uppercase font-black tracking-wider text-[#64748b]/90 dark:text-[#94a3b8]/90 block truncate">Lifetime Stock</span>
                    <span className="text-base sm:text-xl font-black text-[#0f172a] dark:text-white mt-0.5 block font-mono tracking-tight truncate">
                      {stockAnalyticsValue < 0 ? '-' : ''}{currencySymbol}{formatNum(Math.abs(stockAnalyticsValue))}
                    </span>
                    <span className="text-[8px] sm:text-[8.5px] text-[#64748b]/70 dark:text-[#94a3b8]/70 mt-0.5 block truncate">Net Stock (Purchases − Sales)</span>
                  </div>
                  {/* Sparkline bars */}
                  <div className="flex items-end gap-1 h-4 sm:h-5 self-start mt-1.5 sm:mt-2">
                    {stockSparklineHeights.map((h, idx) => (
                      <div
                        key={`sks-${idx}`}
                        className={`w-1 rounded-t-sm ${idx === stockSparklineHeights.length - 1 ? 'bg-teal-500 dark:bg-teal-400' : idx % 2 === 0 ? 'bg-teal-400 dark:bg-teal-500' : 'bg-teal-300 dark:bg-teal-700'}`}
                        style={{ height: `${Math.max(4, h * 0.8)}px` }}
                      />
                    ))}
                  </div>
                </div>

                {/* 4. Lifetime Expenses */}
                <div className="bg-white dark:bg-[#111a36] border-l-4 border-l-purple-500 border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl p-3 sm:p-4.5 shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-default group relative flex flex-col justify-between min-h-[140px] sm:min-h-[160px] h-full overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-50 text-purple-600 dark:bg-purple-950/80 dark:text-purple-400 border border-purple-200 dark:border-purple-800/80 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <ReceiptText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <span className="text-[8px] sm:text-[10px] font-black text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-1.5 sm:px-2 py-0.5 rounded-full font-mono">
                      OVERALL
                    </span>
                  </div>
                  <div className="mt-2 sm:mt-2.5">
                    <span className="text-[8.5px] sm:text-[9px] uppercase font-black tracking-wider text-[#64748b]/90 dark:text-[#94a3b8]/90 block truncate">Lifetime Expenses</span>
                    <span className="text-base sm:text-xl font-black text-[#0f172a] dark:text-white mt-0.5 block font-mono tracking-tight truncate">
                      {currencySymbol}{formatNum(expenseStats.totalExpenses)}
                    </span>
                    <span className="text-[8px] sm:text-[8.5px] text-[#64748b]/70 dark:text-[#94a3b8]/70 mt-0.5 block truncate">Total Operational Expenses</span>
                  </div>
                  {/* Sparkline bars */}
                  <div className="flex items-end gap-1 h-4 sm:h-5 self-start mt-1.5 sm:mt-2">
                    {expenseSparklineHeights.map((h, idx) => (
                      <div
                        key={`ltes-${idx}`}
                        className={`w-1 rounded-t-sm ${idx === expenseSparklineHeights.length - 1 ? 'bg-purple-500 dark:bg-purple-400' : idx % 2 === 0 ? 'bg-purple-400 dark:bg-purple-500' : 'bg-purple-300 dark:bg-purple-700'}`}
                        style={{ height: `${Math.max(4, h * 0.8)}px` }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Monthly Overview Section — Interactive Monthly Breakdown */}
              <div className="bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl p-4 sm:p-5 shadow-xs transition-all">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 sm:pb-4 border-b border-[#bae6fd]/30 dark:border-[#223269]/30">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-[#0284c7] dark:text-[#38bdf8] border border-[#bae6fd] dark:border-[#223269] flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs sm:text-sm font-black text-[#0f172a] dark:text-white uppercase tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
                          Monthly Performance
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-sky-50 dark:bg-sky-950 text-[#0284c7] dark:text-[#38bdf8] border border-sky-200 dark:border-sky-800 font-mono">
                          {monthlyMetrics.monthLabel}
                        </span>
                      </div>
                      <p className="text-[9px] sm:text-[10px] text-[#64748b]/80 dark:text-zinc-400 mt-0.5">
                        Breakdown of Sales, Purchases, Stock Net, Expenses & Tax for selected month
                      </p>
                    </div>
                  </div>

                  {/* Monthly Navigation & Month Dropdown */}
                  <div className="flex items-center gap-1.5 sm:gap-2 self-end sm:self-auto flex-wrap">
                    <button
                      onClick={handlePrevMonth}
                      className="p-1.5 rounded-lg bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd] dark:border-[#223269] text-[#0f172a] dark:text-zinc-300 hover:border-[#0284c7] dark:hover:border-[#38bdf8] cursor-pointer transition-colors"
                      title="Previous Month"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    <select
                      value={currentSelectedMonth}
                      onChange={(e) => setSelectedMonthlyPeriod(e.target.value)}
                      className="px-2.5 py-1.5 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd] hover:border-[#0284c7] dark:border-[#223269] dark:hover:border-[#38bdf8] rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[#0f172a] dark:text-zinc-300 focus:outline-none cursor-pointer transition-colors"
                    >
                      {monthOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>

                    <button
                      onClick={handleNextMonth}
                      disabled={currentSelectedMonth >= currentMonthVal}
                      className={`p-1.5 rounded-lg bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd] dark:border-[#223269] text-[#0f172a] dark:text-zinc-300 transition-colors ${currentSelectedMonth >= currentMonthVal ? 'opacity-40 cursor-not-allowed' : 'hover:border-[#0284c7] dark:hover:border-[#38bdf8] cursor-pointer'}`}
                      title="Next Month"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {currentSelectedMonth !== currentMonthVal && (
                      <button
                        onClick={() => setSelectedMonthlyPeriod(currentMonthVal)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#0284c7] text-white text-[9px] font-black uppercase tracking-wider hover:bg-[#0369a1] cursor-pointer transition-colors"
                      >
                        This Month
                      </button>
                    )}
                  </div>
                </div>

                {/* 5 Monthly Metric Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5 mt-3 sm:mt-4">
                  {/* 1. Monthly Sales */}
                  <div className="bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd]/50 dark:border-[#223269]/50 rounded-xl p-3 flex flex-col justify-between hover:border-indigo-400/50 transition-all">
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-wider text-[#64748b] dark:text-zinc-400">Monthly Sales</span>
                      <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                    <div className="mt-2">
                      <span className="text-sm sm:text-base font-black text-[#0f172a] dark:text-white font-mono tracking-tight block truncate">
                        {currencySymbol}{formatNum(monthlyMetrics.monthlySales)}
                      </span>
                      <span className="text-[8px] text-[#64748b]/70 dark:text-zinc-400 block mt-0.5">
                        {monthlyMetrics.salesCount} Invoices
                      </span>
                    </div>
                  </div>

                  {/* 2. Monthly Purchases */}
                  <div className="bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd]/50 dark:border-[#223269]/50 rounded-xl p-3 flex flex-col justify-between hover:border-rose-400/50 transition-all">
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-wider text-[#64748b] dark:text-zinc-400">Monthly Purchase</span>
                      <MinusCircle className="w-3.5 h-3.5 text-rose-500" />
                    </div>
                    <div className="mt-2">
                      <span className="text-sm sm:text-base font-black text-[#0f172a] dark:text-white font-mono tracking-tight block truncate">
                        {currencySymbol}{formatNum(monthlyMetrics.monthlyPurchases)}
                      </span>
                      <span className="text-[8px] text-[#64748b]/70 dark:text-zinc-400 block mt-0.5">
                        {monthlyMetrics.purchasesCount} Bills
                      </span>
                    </div>
                  </div>

                  {/* 3. Monthly Stock */}
                  <div className="bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd]/50 dark:border-[#223269]/50 rounded-xl p-3 flex flex-col justify-between hover:border-teal-400/50 transition-all">
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-wider text-[#64748b] dark:text-zinc-400">Monthly Stock</span>
                      <Package className="w-3.5 h-3.5 text-teal-500" />
                    </div>
                    <div className="mt-2">
                      <span className="text-sm sm:text-base font-black text-[#0f172a] dark:text-white font-mono tracking-tight block truncate">
                        {monthlyMetrics.monthlyStock < 0 ? '-' : ''}{currencySymbol}{formatNum(Math.abs(monthlyMetrics.monthlyStock))}
                      </span>
                      <span className="text-[8px] text-[#64748b]/70 dark:text-zinc-400 block mt-0.5">
                        Purchases − Sales
                      </span>
                    </div>
                  </div>

                  {/* 4. Monthly Expenses */}
                  <div className="bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd]/50 dark:border-[#223269]/50 rounded-xl p-3 flex flex-col justify-between hover:border-purple-400/50 transition-all">
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-wider text-[#64748b] dark:text-zinc-400">Monthly Expense</span>
                      <ReceiptText className="w-3.5 h-3.5 text-purple-500" />
                    </div>
                    <div className="mt-2">
                      <span className="text-sm sm:text-base font-black text-[#0f172a] dark:text-white font-mono tracking-tight block truncate">
                        {currencySymbol}{formatNum(monthlyMetrics.monthlyExpenses)}
                      </span>
                      <span className="text-[8px] text-[#64748b]/70 dark:text-zinc-400 block mt-0.5">
                        {monthlyMetrics.expensesCount} Expenses
                      </span>
                    </div>
                  </div>

                  {/* 5. Monthly Tax */}
                  <div className="bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd]/50 dark:border-[#223269]/50 rounded-xl p-3 flex flex-col justify-between hover:border-sky-400/50 transition-all col-span-2 sm:col-span-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-wider text-[#64748b] dark:text-zinc-400">Monthly Tax</span>
                      <Percent className="w-3.5 h-3.5 text-sky-500" />
                    </div>
                    <div className="mt-2">
                      <span className="text-sm sm:text-base font-black text-[#0f172a] dark:text-white font-mono tracking-tight block truncate">
                        {currencySymbol}{formatNum(monthlyMetrics.monthlyTax)}
                      </span>
                      <span className="text-[8px] text-[#64748b]/70 dark:text-zinc-400 block mt-0.5">
                        Net GST (Output − Input)
                      </span>
                    </div>
                  </div>
                </div>
              </div>



              {/* KPI Cards — Next Line (Settled Earnings -> Pending Receivables -> Expenses) */}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">

                {/* 1. Settled Earnings */}

                <div className="bg-white dark:bg-[#111a36] border-l-4 border-l-emerald-500 border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl p-3.5 sm:p-4.5 shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-default group relative flex flex-col justify-between min-h-[140px] sm:min-h-[160px] h-full overflow-hidden">

                  <div className="flex justify-between items-start">

                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#ECFDF5] text-[#10B981] border border-[#A7F3D0] flex items-center justify-center group-hover:scale-110 transition-transform duration-200">

                      <Banknote className="w-3.5 h-3.5 sm:w-4 sm:h-4" />

                    </div>

                    <span className="text-[8px] sm:text-[10px] font-black text-[#10B981] bg-[#ECFDF5] border border-[#A7F3D0] px-1.5 sm:px-2 py-0.5 rounded-full font-mono">

                      {earningsPct}

                    </span>

                  </div>

                  <div className="mt-2 sm:mt-2.5">

                    <span className="text-[8.5px] sm:text-[9px] uppercase font-black tracking-wider text-[#64748b]/90 dark:text-[#94a3b8]/90 block truncate">Settled Earnings</span>

                    <span className="text-base sm:text-xl font-black text-[#0f172a] dark:text-white mt-0.5 block font-mono tracking-tight truncate">

                      {currencySymbol}{formatNum(totalBilled)}

                    </span>

                    <span className="text-[8px] sm:text-[8.5px] text-[#64748b]/70 dark:text-[#94a3b8]/70 mt-0.5 block truncate">Tax Invoices Paid</span>

                  </div>

                  {/* Sparkline bars */}

                  <div className="flex items-end gap-1 h-4 sm:h-5 self-start mt-1.5 sm:mt-2">

                    <div className="w-1 bg-emerald-200 dark:bg-emerald-800 rounded-t-sm h-2" />

                    <div className="w-1 bg-emerald-300 dark:bg-emerald-700 rounded-t-sm h-3" />

                    <div className="w-1 bg-emerald-400 dark:bg-emerald-600 rounded-t-sm h-5" />

                    <div className="w-1 bg-emerald-300 dark:bg-emerald-700 rounded-t-sm h-3" />

                    <div className="w-1 bg-emerald-500 dark:bg-emerald-500 rounded-t-sm h-6" />

                  </div>

                </div>



                {/* 2. Pending Receivables */}

                <div className="bg-white dark:bg-[#111a36] border-l-4 border-l-amber-500 border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl p-3.5 sm:p-4.5 shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-default group relative flex flex-col justify-between min-h-[140px] sm:min-h-[160px] h-full overflow-hidden">

                  <div className="flex justify-between items-start">

                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FFFBEB] text-[#F59E0B] border border-[#FEF3C7] flex items-center justify-center group-hover:scale-110 transition-transform duration-200">

                      <CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />

                    </div>

                    <span className="text-[8px] sm:text-[10px] font-black text-[#F59E0B] bg-[#FFFBEB] border border-[#FEF3C7] px-1.5 sm:px-2 py-0.5 rounded-full font-mono">

                      {receivablesPct}

                    </span>

                  </div>

                  <div className="mt-2 sm:mt-2.5">

                    <span className="text-[8.5px] sm:text-[9px] uppercase font-black tracking-wider text-[#64748b]/90 dark:text-[#94a3b8]/90 block truncate">Pending Receivables</span>

                    <span className="text-base sm:text-xl font-black text-[#0f172a] dark:text-white mt-0.5 block font-mono tracking-tight truncate">

                      {currencySymbol}{formatNum(totalOutstanding)}

                    </span>

                    <span className="text-[8px] sm:text-[8.5px] text-[#64748b]/70 dark:text-[#94a3b8]/70 mt-0.5 block truncate">Unpaid Invoices</span>

                  </div>

                  {/* Sparkline bars */}

                  <div className="flex items-end gap-1 h-4 sm:h-5 self-start mt-1.5 sm:mt-2">

                    <div className="w-1 bg-amber-200 dark:bg-amber-800 rounded-t-sm h-4" />

                    <div className="w-1 bg-amber-300 dark:bg-amber-700 rounded-t-sm h-2" />

                    <div className="w-1 bg-amber-400 dark:bg-amber-600 rounded-t-sm h-5" />

                    <div className="w-1 bg-amber-500 dark:bg-amber-500 rounded-t-sm h-6" />

                    <div className="w-1 bg-amber-300 dark:bg-amber-700 rounded-t-sm h-3" />

                  </div>

                </div>



                {/* 3. Expenses */}

                <div className="bg-white dark:bg-[#111a36] border-l-4 border-l-purple-500 border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl p-3.5 sm:p-4.5 shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-default group relative flex flex-col justify-between min-h-[140px] sm:min-h-[160px] h-full overflow-hidden">

                  <div className="flex justify-between items-start">

                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-50 text-purple-600 dark:bg-purple-950/80 dark:text-purple-400 border border-purple-200 dark:border-purple-800/80 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">

                      <ReceiptText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />

                    </div>

                    <span className="text-[8px] sm:text-[10px] font-black text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-1.5 sm:px-2 py-0.5 rounded-full font-mono">

                      {overheadPct}

                    </span>

                  </div>

                  <div className="mt-2 sm:mt-2.5">

                    <span className="text-[8.5px] sm:text-[9px] uppercase font-black tracking-wider text-[#64748b]/90 dark:text-[#94a3b8]/90 block truncate">Expenses</span>

                    <span className="text-base sm:text-xl font-black text-[#0f172a] dark:text-white mt-0.5 block font-mono tracking-tight truncate">

                      {currencySymbol}{formatNum(expenseStats.totalExpenses)}

                    </span>

                    <span className="text-[8px] sm:text-[8.5px] text-[#64748b]/70 dark:text-[#94a3b8]/70 mt-0.5 block truncate">Direct Operational Overhead</span>

                  </div>

                  {/* Sparkline bars */}

                  <div className="flex items-end gap-1 h-4 sm:h-5 self-start mt-1.5 sm:mt-2">

                    {expenseSparklineHeights.map((h, idx) => (

                      <div

                        key={`es-${idx}`}

                        className={`w-1 rounded-t-sm ${idx === expenseSparklineHeights.length - 1 ? 'bg-purple-500 dark:bg-purple-400' : idx % 2 === 0 ? 'bg-purple-400 dark:bg-purple-500' : 'bg-purple-300 dark:bg-purple-700'}`}

                        style={{ height: `${Math.max(4, h * 0.8)}px` }}

                      />

                    ))}

                  </div>

                </div>

              </div>



              {/* Bento Grid Middle Row: Revenue Intelligence & Purchases Intelligence */}

              <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 sm:gap-6">

                {/* Revenue Intelligence Line Chart */}

                <div className="order-1 lg:order-1 lg:col-span-3 bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col justify-between">

                  <div className="flex justify-between items-start pb-3 sm:pb-4 border-b border-[#bae6fd]/30 dark:border-[#223269]/30 flex-wrap gap-2">

                    <div>

                      <div className="flex items-center gap-2">

                        <h3 className="text-xs sm:text-sm font-black text-[#0f172a] dark:text-white uppercase tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>Revenue Intelligence</h3>

                        <span className="px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-wider bg-[#ECFDF5] text-[#10B981] dark:bg-emerald-950 dark:text-emerald-400 border border-[#A7F3D0] dark:border-emerald-800">Live</span>

                      </div>

                      <p className="text-[9px] sm:text-[10px] text-[#64748b]/80 dark:text-zinc-400 mt-0.5">Real-time earnings, pending receivables, and direct expense tracking</p>

                      <div className="mt-2 w-fit">

                        <select 

                          value={dashboardChartRange} 

                          onChange={(e) => setDashboardChartRange(e.target.value as any)}

                          className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd] hover:border-[#0284c7] dark:border-[#223269] dark:hover:border-[#38bdf8] focus:border-[#0f172a] dark:focus:border-zinc-500 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[#0f172a] dark:text-zinc-300 focus:outline-none cursor-pointer transition-colors duration-150"

                          style={{ boxShadow: 'inset 0 1px 3px rgba(2,132,199,0.08)' }}

                        >

                          <option value="7d">Last 7 Days</option>

                          <option value="1m">Last Month</option>

                          <option value="3m">Last 3 Months</option>

                          <option value="6m">Last 6 Months</option>

                          <option value="1y">Last 1 Year</option>

                          <option value="all">All Time</option>

                        </select>

                      </div>

                    </div>



                    <div className="flex items-center gap-2.5 sm:gap-4 text-[8px] sm:text-[9px] font-black tracking-wider text-[#64748b]/80 dark:text-zinc-400 mt-1 font-mono">

                      <span className="flex items-center gap-1 sm:gap-1.5">

                        <span className="w-2 sm:w-2.5 h-0.5" style={{ backgroundColor: theme === 'dark' ? '#38bdf8' : '#0284c7' }} /> EARN

                      </span>

                      <span className="flex items-center gap-1 sm:gap-1.5">

                        <span className="w-2 sm:w-2.5 h-0.5 border-t border-dashed" style={{ borderColor: theme === 'dark' ? '#60a5fa' : '#2563eb' }} /> DUE

                      </span>

                      <span className="flex items-center gap-1 sm:gap-1.5">

                        <span className="w-2 sm:w-2.5 h-0.5 border-t border-dotted" style={{ borderColor: '#A855F7' }} /> EXP

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

                            <line x1={paddingX} y1={y} x2={chartWidth - paddingX} y2={y} stroke={theme === 'dark' ? '#223269' : '#bae6fd'} strokeWidth="0.5" strokeOpacity="0.4" />

                            <text x={paddingX - 10} y={y + 3} textAnchor="end" className="text-[8px] font-mono fill-[#64748b]/70 dark:fill-zinc-400">

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

                          stroke={theme === 'dark' ? '#60a5fa' : '#2563eb'} 

                          strokeWidth="1" 

                          strokeDasharray="2 2"

                          className="opacity-75"

                        />

                      )}



                      {/* Line paths */}

                      <path d={pathEarnings} fill="none" stroke={theme === 'dark' ? '#38bdf8' : '#0284c7'} strokeWidth="2.5" strokeLinecap="round" />

                      <path d={pathReceivables} fill="none" stroke={theme === 'dark' ? '#60a5fa' : '#2563eb'} strokeWidth="1.8" strokeDasharray="3 3" strokeLinecap="round" />

                      <path d={pathExpenses} fill="none" stroke="#A855F7" strokeWidth="1.8" strokeDasharray="2 2" strokeLinecap="round" />



                      {/* Dot indicators */}

                      {pointsEarnings.map((pts, i) => (

                        <circle 

                          key={`act-dot-${i}`} 

                          cx={pts.x} 

                          cy={pts.y} 

                          r={hoveredDashboardChartIndex === i ? "4.5" : "3"} 

                          fill={theme === 'dark' ? '#38bdf8' : '#0284c7'} 

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

                          fill={theme === 'dark' ? '#60a5fa' : '#2563eb'} 

                          stroke="#fff" 

                          strokeWidth={hoveredDashboardChartIndex === i ? "1.5" : "1"} 

                          className="transition-all"

                        />

                      ))}

                      {pointsExpenses.map((pts, i) => (

                        <circle 

                          key={`exp-dot-${i}`} 

                          cx={pts.x} 

                          cy={pts.y} 

                          r={hoveredDashboardChartIndex === i ? "4.5" : "3"} 

                          fill="#A855F7" 

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

                            className={`text-[9px] font-mono transition-all ${isHovered ? 'font-black fill-[#0284c7] dark:fill-[#38bdf8]' : 'font-bold fill-[#64748b]/80 dark:fill-zinc-400'}`}

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

                        const tooltipHeight = 54;

                        let tooltipX = pt.x - tooltipWidth / 2;

                        if (tooltipX < paddingX) tooltipX = paddingX;

                        if (tooltipX + tooltipWidth > chartWidth - paddingX) tooltipX = chartWidth - paddingX - tooltipWidth;

                        const tooltipY = Math.max(paddingY - 5, pt.y - tooltipHeight - 8);

                        return (

                          <g transform={`translate(${tooltipX}, ${tooltipY})`} className="pointer-events-none filter drop-shadow-[0_2px_4px_rgba(2,132,199,0.12)]">

                            <rect 

                              width={tooltipWidth} 

                              height={tooltipHeight} 

                              rx="6" 

                              fill="rgba(11, 19, 41, 0.95)" 

                              stroke={theme === 'dark' ? '#223269' : '#bae6fd'}

                              strokeWidth="0.5"

                            />

                            <text x="8" y="12" fill="#e2e8f0" className="text-[8px] font-black uppercase tracking-wider font-mono">{rec.label}</text>

                            <text x="8" y="23" fill="#10B981" className="text-[8px] font-bold font-mono">

                              Earn: {currencySymbol}{formatNum(rec.income)}

                            </text>

                            <text x="8" y="33" fill="#F59E0B" className="text-[8px] font-bold font-mono">

                              Due: {currencySymbol}{formatNum(rec.receivables)}

                            </text>

                            <text x="8" y="43" fill="#A855F7" className="text-[8px] font-bold font-mono">

                              Exp: {currencySymbol}{formatNum(rec.expenses)}

                            </text>

                          </g>

                        );

                      })()}

                    </svg>

                  </div>

                </div>

                {/* Purchases Intelligence Line Chart (Mobile: 2nd, Desktop: Row 1 Right 50%) */}

                {(() => {
                  const purRecords: { label: string; amount: number; gst: number }[] = [];
                  const nowP = new Date();

                  if (purchasesChartRange === '7d') {
                    for (let i = 6; i >= 0; i--) {
                      const d = new Date(nowP); d.setDate(nowP.getDate() - i);
                      purRecords.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, amount: 0, gst: 0 });
                    }
                    allPurchaseBills.forEach(inv => {
                      const d = new Date(inv.date); if (isNaN(d.getTime())) return;
                      const lbl = `${d.getDate()}/${d.getMonth() + 1}`;
                      const match = purRecords.find(r => r.label === lbl);
                      if (match) { match.amount += inv.grandTotal || 0; match.gst += inv.taxTotal || 0; }
                    });
                  } else if (purchasesChartRange === '1m') {
                    for (let i = 3; i >= 0; i--) {
                      const wEnd = new Date(nowP); wEnd.setDate(nowP.getDate() - i * 7);
                      const wStart = new Date(wEnd); wStart.setDate(wEnd.getDate() - 6);
                      purRecords.push({ label: `W${4 - i}`, amount: 0, gst: 0, _start: wStart, _end: wEnd } as any);
                    }
                    allPurchaseBills.forEach(inv => {
                      const d = new Date(inv.date); if (isNaN(d.getTime())) return;
                      const match = (purRecords as any[]).find(r => d >= r._start && d <= r._end);
                      if (match) { match.amount += inv.grandTotal || 0; match.gst += inv.taxTotal || 0; }
                    });
                  } else if (purchasesChartRange === 'all') {
                    const minYearPur = allPurchaseBills.length > 0 ? Math.min(...allPurchaseBills.map(i => new Date(i.date).getFullYear())) : nowP.getFullYear();
                    const startYearP = Math.min(minYearPur, nowP.getFullYear());
                    const endYearP   = nowP.getFullYear();
                    const adjStartP  = (endYearP - startYearP < 2) ? endYearP - 2 : startYearP;
                    for (let y = adjStartP; y <= endYearP; y++) {
                      purRecords.push({ label: y.toString(), amount: 0, gst: 0, _year: y } as any);
                    }
                    allPurchaseBills.forEach(inv => {
                      const d = new Date(inv.date); if (isNaN(d.getTime())) return;
                      const match = (purRecords as any[]).find(r => r._year === d.getFullYear());
                      if (match) { match.amount += inv.grandTotal || 0; match.gst += inv.taxTotal || 0; }
                    });
                  } else {
                    const monthCountP  = purchasesChartRange === '3m' ? 3 : purchasesChartRange === '6m' ? 6 : 12;
                    const monthsShortP = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                    for (let i = monthCountP - 1; i >= 0; i--) {
                      const d = new Date(nowP.getFullYear(), nowP.getMonth() - i, 1);
                      purRecords.push({ label: monthsShortP[d.getMonth()], amount: 0, gst: 0, _month: d.getMonth(), _year: d.getFullYear() } as any);
                    }
                    allPurchaseBills.forEach(inv => {
                      const d = new Date(inv.date); if (isNaN(d.getTime())) return;
                      const match = (purRecords as any[]).find(r => r._month === d.getMonth() && r._year === d.getFullYear());
                      if (match) { match.amount += inv.grandTotal || 0; match.gst += inv.taxTotal || 0; }
                    });
                  }

                  const purChartWidth  = 500;
                  const purChartHeight = 160;
                  const purPaddingX    = 40;
                  const purPaddingY    = 20;
                  const purUsableW     = purChartWidth - purPaddingX * 2;
                  const purUsableH     = purChartHeight - purPaddingY * 2;
                  const purMaxVal      = Math.max(...purRecords.map(d => Math.max(d.amount, d.gst)), 10000);

                  const purPtsAmount = purRecords.map((r, i) => ({
                    x: purPaddingX + (i / Math.max(purRecords.length - 1, 1)) * purUsableW,
                    y: purChartHeight - purPaddingY - (r.amount / purMaxVal) * purUsableH
                  }));
                  const purPtsGst = purRecords.map((r, i) => ({
                    x: purPaddingX + (i / Math.max(purRecords.length - 1, 1)) * purUsableW,
                    y: purChartHeight - purPaddingY - (r.gst / purMaxVal) * purUsableH
                  }));
                  const purPathAmount = purPtsAmount.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  const purPathGst    = purPtsGst.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                  return (
                    <div className="order-2 lg:order-2 lg:col-span-3 bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col justify-between">
                      <div className="flex justify-between items-start pb-3 sm:pb-4 border-b border-[#bae6fd]/30 dark:border-[#223269]/30 flex-wrap gap-2">
                        <div>
                          <h3 className="text-xs sm:text-sm font-black text-[#0f172a] dark:text-white uppercase tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>Purchases Intelligence</h3>
                          <span className="text-[9px] sm:text-[10px] text-[#64748b]/80 dark:text-zinc-400 block mt-0.5">Comparative analysis of purchase spend vs GST paid (Input Tax Credit)</span>
                          <div className="mt-2 w-fit">
                            <select
                              value={purchasesChartRange}
                              onChange={(e) => { setPurchasesChartRange(e.target.value as any); setHoveredPurchasesChartIndex(null); }}
                              className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd] hover:border-[#0284c7] dark:border-[#223269] dark:hover:border-[#38bdf8] focus:border-[#0f172a] dark:focus:border-zinc-500 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[#0f172a] dark:text-zinc-300 focus:outline-none cursor-pointer transition-colors duration-150"
                              style={{ boxShadow: 'inset 0 1px 3px rgba(2,132,199,0.08)' }}
                            >
                              <option value="7d">Last 7 Days</option>
                              <option value="1m">Last Month</option>
                              <option value="3m">Last 3 Months</option>
                              <option value="6m">Last 6 Months</option>
                              <option value="1y">Last 1 Year</option>
                              <option value="all">All Time</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 sm:gap-4 text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-[#64748b]/80 dark:text-zinc-400 mt-1 font-mono">
                          <span className="flex items-center gap-1 sm:gap-1.5">
                            <span className="w-2 sm:w-2.5 h-0.5 inline-block" style={{ backgroundColor: '#F43F5E' }} /> SPEND
                          </span>
                          <span className="flex items-center gap-1 sm:gap-1.5">
                            <span className="w-2 sm:w-2.5 h-0.5 inline-block border-t border-dashed" style={{ borderColor: '#F97316' }} /> GST
                          </span>
                        </div>
                      </div>

                      <div className="w-full select-none mt-2">
                        <svg className="w-full" viewBox={`0 0 ${purChartWidth} ${purChartHeight}`} fill="none" preserveAspectRatio="xMidYMid meet">
                          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                            const y = purPaddingY + ratio * purUsableH;
                            const labelValue = Math.round(purMaxVal - (ratio * purMaxVal));
                            return (
                              <g key={`pgrid-${i}`}>
                                <line x1={purPaddingX} y1={y} x2={purChartWidth - purPaddingX} y2={y} stroke={theme === 'dark' ? '#223269' : '#bae6fd'} strokeWidth="0.5" strokeOpacity="0.4" />
                                <text x={purPaddingX - 10} y={y + 3} textAnchor="end" className="text-[8px] font-mono fill-[#64748b]/70 dark:fill-zinc-400">
                                  {labelValue >= 1000 ? `${(labelValue / 1000).toFixed(0)}k` : labelValue}
                                </text>
                              </g>
                            );
                          })}

                          {hoveredPurchasesChartIndex !== null && purPtsAmount[hoveredPurchasesChartIndex] && (
                            <line
                              x1={purPtsAmount[hoveredPurchasesChartIndex].x} y1={purPaddingY}
                              x2={purPtsAmount[hoveredPurchasesChartIndex].x} y2={purChartHeight - purPaddingY}
                              stroke="#F43F5E" strokeWidth="1" strokeDasharray="2 2" className="opacity-75"
                            />
                          )}

                          <path d={purPathAmount} fill="none" stroke="#F43F5E" strokeWidth="2.5" strokeLinecap="round" />
                          <path d={purPathGst}    fill="none" stroke="#F97316" strokeWidth="1.8" strokeDasharray="3 3" strokeLinecap="round" />

                          {purPtsAmount.map((pts, i) => (
                            <circle key={`pur-amt-${i}`} cx={pts.x} cy={pts.y}
                              r={hoveredPurchasesChartIndex === i ? "4.5" : "3"}
                              fill="#F43F5E" stroke="#fff" strokeWidth={hoveredPurchasesChartIndex === i ? "1.5" : "1"} className="transition-all" />
                          ))}
                          {purPtsGst.map((pts, i) => (
                            <circle key={`pur-gst-${i}`} cx={pts.x} cy={pts.y}
                              r={hoveredPurchasesChartIndex === i ? "4.5" : "3"}
                              fill="#F97316" stroke="#fff" strokeWidth={hoveredPurchasesChartIndex === i ? "1.5" : "1"} className="transition-all" />
                          ))}

                          {purRecords.map((r, i) => {
                            const x = purPaddingX + (i / Math.max(purRecords.length - 1, 1)) * purUsableW;
                            const isHov = hoveredPurchasesChartIndex === i;
                            return (
                              <text key={`pur-lbl-${i}`} x={x} y={purChartHeight - 4} textAnchor="middle"
                                className={`text-[9px] font-mono transition-all ${isHov ? 'font-black fill-[#F43F5E]' : 'font-bold fill-[#64748b]/80 dark:fill-zinc-400'}`}>
                                {r.label}
                              </text>
                            );
                          })}

                          {purRecords.map((_, i) => {
                            const colW = purUsableW / Math.max(purRecords.length - 1, 1);
                            const x    = purPaddingX + i * colW - colW / 2;
                            return (
                              <rect key={`pur-zone-${i}`}
                                x={i === 0 ? purPaddingX : x} y={purPaddingY}
                                width={i === 0 || i === purRecords.length - 1 ? colW / 2 : colW}
                                height={purUsableH} fill="transparent" className="cursor-pointer"
                                onMouseEnter={() => setHoveredPurchasesChartIndex(i)}
                                onMouseLeave={() => setHoveredPurchasesChartIndex(null)}
                                onTouchStart={() => setHoveredPurchasesChartIndex(i)}
                                onClick={() => setHoveredPurchasesChartIndex(i)}
                              />
                            );
                          })}

                          {hoveredPurchasesChartIndex !== null && purRecords[hoveredPurchasesChartIndex] && (() => {
                            const rec = purRecords[hoveredPurchasesChartIndex];
                            const pt  = purPtsAmount[hoveredPurchasesChartIndex] || { x: 250, y: 80 };
                            const ttW = 130; const ttH = 52;
                            let ttX   = pt.x - ttW / 2;
                            if (ttX < purPaddingX) ttX = purPaddingX;
                            if (ttX + ttW > purChartWidth - purPaddingX) ttX = purChartWidth - purPaddingX - ttW;
                            const ttY = Math.max(purPaddingY - 5, pt.y - ttH - 8);
                            return (
                              <g transform={`translate(${ttX}, ${ttY})`} className="pointer-events-none filter drop-shadow-[0_2px_4px_rgba(244,63,94,0.12)]">
                                <rect width={ttW} height={ttH} rx="6" fill="rgba(11,19,41,0.95)" stroke="#F43F5E" strokeWidth="0.5" />
                                <text x="8" y="12" fill="#e2e8f0" className="text-[8px] font-black uppercase tracking-wider font-mono">{rec.label}</text>
                                <text x="8" y="26" fill="#F43F5E" className="text-[8px] font-bold font-mono">Spend: {currencySymbol}{formatNum(rec.amount)}</text>
                                <text x="8" y="40" fill="#F97316" className="text-[8px] font-bold font-mono">GST: {currencySymbol}{formatNum(rec.gst)}</text>
                              </g>
                            );
                          })()}
                        </svg>
                      </div>
                    </div>
                  );
                })()}

                {/* Revenue Segments Donut (Mobile: 3rd [after Purchases], Desktop: Row 2 Middle 33.3%) */}

                <div className="order-3 lg:order-4 lg:col-span-2 bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col justify-between">

                  <div>

                    <h3 className="text-xs sm:text-sm font-black text-[#0f172a] dark:text-white uppercase tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>Revenue Segments</h3>

                  </div>



                  {(() => {

                    const segTotal = (totalBilled + totalOutstanding + totalPurchaseAmount + expenseStats.totalExpenses + netTaxLiability) || 1;

                    const c = 440; // circumference

                    const earnDash = (totalBilled / segTotal) * c;

                    const recvDash = (totalOutstanding / segTotal) * c;

                    const stockDash = (totalPurchaseAmount / segTotal) * c;

                    const expDash = (expenseStats.totalExpenses / segTotal) * c;

                    const taxDash = (netTaxLiability / segTotal) * c;

                    const totalBilledCenter = totalBilled + totalOutstanding;



                    return (

                      <>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 py-2">

                          {/* Pie / Donut Chart on Left */}

                          <div className="flex flex-col items-center justify-center relative shrink-0">

                            <svg className="w-32 h-32 sm:w-36 sm:h-36" viewBox="0 0 200 200">

                              {/* Base track */}

                              <circle cx="100" cy="100" r="70" fill="none" stroke={theme === 'dark' ? '#1b264f' : '#e0f2fe'} strokeWidth="18" />

                              

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



                              {/* Stock (Purchases) — rose */}

                              <circle 

                                cx="100" cy="100" r="70" fill="none" stroke="#F43F5E" strokeWidth="18" 

                                strokeDasharray={`${stockDash} ${c}`} strokeDashoffset={`-${earnDash + recvDash}`} 

                                strokeLinecap="round" className="transform -rotate-90 origin-center transition-all duration-500" 

                              />



                              {/* Expenses (Supabase) — purple */}

                              <circle 

                                cx="100" cy="100" r="70" fill="none" stroke="#A855F7" strokeWidth="18" 

                                strokeDasharray={`${expDash} ${c}`} strokeDashoffset={`-${earnDash + recvDash + stockDash}`} 

                                strokeLinecap="round" className="transform -rotate-90 origin-center transition-all duration-500" 

                              />



                              {/* Net Taxes — sky */}

                              <circle 

                                cx="100" cy="100" r="70" fill="none" stroke="#38BDF8" strokeWidth="18" 

                                strokeDasharray={`${taxDash} ${c}`} strokeDashoffset={`-${earnDash + recvDash + stockDash + expDash}`} 

                                strokeLinecap="round" className="transform -rotate-90 origin-center transition-all duration-500" 

                              />



                              {/* Total Billed inside circle */}

                              <text x="100" y="98" textAnchor="middle" className="text-[13px] font-black" fill={theme === 'dark' ? '#f8fafc' : '#0f172a'}>

                                {currencySymbol}{(totalBilledCenter >= 1000 ? (totalBilledCenter / 1000).toFixed(1) + 'k' : (totalBilledCenter === 0 ? '0' : totalBilledCenter))}

                              </text>

                              <text x="100" y="116" textAnchor="middle" className="text-[9px] font-black uppercase tracking-wider" fill={theme === 'dark' ? '#94a3b8' : '#475569'}>

                                BILLED

                              </text>

                            </svg>

                          </div>



                          {/* Legend List on Right */}

                          <div className="flex flex-col gap-1.5 w-full text-[10px] font-bold text-[#64748b]/90 dark:text-zinc-400">

                            <div className="flex items-center justify-between gap-2">

                              <span className="flex items-center gap-1.5 whitespace-nowrap">

                                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" /> Earnings

                              </span>

                              <span className="font-extrabold text-[#0f172a] dark:text-white font-mono">{Math.round((totalBilled / segTotal) * 100)}%</span>

                            </div>

                            <div className="flex items-center justify-between gap-2">

                              <span className="flex items-center gap-1.5 whitespace-nowrap">

                                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" /> Receivables

                              </span>

                              <span className="font-extrabold text-[#0f172a] dark:text-white font-mono">{Math.round((totalOutstanding / segTotal) * 100)}%</span>

                            </div>

                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#bae6fd]/40 dark:border-[#223269]/40">

                              <span className="flex items-center gap-1.5 whitespace-nowrap">

                                <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" /> Purchases

                              </span>

                              <span className="font-extrabold text-[#0f172a] dark:text-white font-mono">{Math.round((totalPurchaseAmount / segTotal) * 100)}%</span>

                            </div>

                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#bae6fd]/40 dark:border-[#223269]/40">

                              <span className="flex items-center gap-1.5 whitespace-nowrap">

                                <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" /> Expenses

                              </span>

                              <span className="font-extrabold text-[#0f172a] dark:text-white font-mono">{Math.round((expenseStats.totalExpenses / segTotal) * 100)}%</span>

                            </div>

                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#bae6fd]/40 dark:border-[#223269]/40">

                              <span className="flex items-center gap-1.5 whitespace-nowrap">

                                <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" /> Net GST

                              </span>

                              <span className="font-extrabold text-[#0f172a] dark:text-white font-mono">{Math.round((netTaxLiability / segTotal) * 100)}%</span>

                            </div>

                          </div>

                        </div>

                      </>

                    );

                  })()}

                </div>

                {/* Recent Billing Table / Recent Expenses (Mobile: 4th, Desktop: Row 2 Left 66.7% / Full span) */}

                <div className="order-4 lg:order-3 lg:col-span-4 bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl p-3 sm:p-4 pb-1 sm:pb-2 shadow-xs flex flex-col justify-start">

                  <div className="flex justify-between items-center pb-1.5 border-b border-[#bae6fd]/30 dark:border-[#223269]/30">

                    <div className="flex items-center gap-2">

                      <button

                        onClick={() => setRecentView('invoices')}

                        className={`text-xs font-black uppercase tracking-tight cursor-pointer transition-colors ${recentView === 'invoices' ? 'text-[#0f172a] dark:text-white border-b-2 border-[#0284c7] pb-0.5' : 'text-[#64748b] hover:text-[#0f172a] dark:hover:text-white'}`}

                        style={{ fontFamily: "'Fraunces', serif" }}

                      >

                        Recent Invoices

                      </button>

                      <span className="text-[#64748b]/40 text-xs">|</span>

                      <button

                        onClick={() => setRecentView('expenses')}

                        className={`text-xs font-black uppercase tracking-tight cursor-pointer transition-colors ${recentView === 'expenses' ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-500 pb-0.5' : 'text-[#64748b] hover:text-[#0f172a] dark:hover:text-white'}`}

                        style={{ fontFamily: "'Fraunces', serif" }}

                      >

                        Recent Expenses ({expenseStats.count})

                      </button>

                    </div>



                    <button 

                      onClick={() => {

                        if (recentView === 'expenses') {

                          setActiveTab('expenses');

                          if (typeof window !== 'undefined') window.history.pushState(null, '', '/expenses');

                        } else {

                          setActiveTab('invoices');

                        }

                      }}

                      className="text-[10px] font-black text-[#0284c7] dark:text-[#38bdf8] hover:opacity-80 uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-opacity"

                    >

                      {recentView === 'expenses' ? 'View All Expenses →' : 'View All Invoices →'}

                    </button>

                  </div>



                  <div className="w-full overflow-x-auto mt-0.5">

                    {recentView === 'invoices' ? (

                      allLedgerInvoices.length === 0 ? (

                        <div className="py-12 text-center">

                          <p className="text-xs text-[#64748b]/80 font-medium">Generate your first invoice to view records here!</p>

                        </div>

                      ) : (

                        <table className="w-full text-left text-xs border-collapse">

                          <thead>

                            <tr className="text-[10px] font-black uppercase text-[#64748b]/60 dark:text-zinc-400 tracking-wider border-b border-[#bae6fd]/30 dark:border-[#223269]/30">

                              <th className="py-1.5 pr-3 font-black whitespace-nowrap">INV ID</th>

                              <th className="py-1.5 px-3 font-black whitespace-nowrap">CLIENT NAME</th>

                              <th className="py-1.5 px-3 font-black whitespace-nowrap">DUE DATE</th>

                              <th className="py-1.5 px-3 font-black whitespace-nowrap">AMOUNT</th>

                              <th className="py-1.5 px-3 font-black whitespace-nowrap">STATUS</th>

                              <th className="py-1.5 pl-2"></th>

                            </tr>

                          </thead>

                          <tbody>

                            {allLedgerInvoices.slice(0, 4).map(inv => (

                              <tr key={inv.id} className="border-b border-[#bae6fd]/20 dark:border-[#223269]/20 hover:bg-[#e0f2fe]/20 dark:hover:bg-[#1b264f]/20 transition-colors">

                                <td className="py-2 pr-3 font-extrabold text-[#0f172a] dark:text-white font-mono whitespace-nowrap">{inv.invoiceNumber}</td>

                                <td className="py-2 px-3 font-bold text-[#64748b] dark:text-zinc-300 truncate max-w-[140px]">{inv.clientName}</td>

                                <td className="py-2 px-3 font-medium text-[#64748b]/80 dark:text-zinc-400 font-sans whitespace-nowrap">{inv.dueDate || inv.date}</td>

                                <td className="py-2 px-3 font-extrabold font-mono text-[#0f172a] dark:text-white whitespace-nowrap">{currencySymbol}{formatNum(inv.grandTotal)}</td>

                                <td className="py-2 px-3 whitespace-nowrap">

                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${getStatusColor(inv.status)}`}>

                                    {inv.status}

                                  </span>

                                </td>

                                <td className="py-2 pl-2 text-right">

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

                      )

                    ) : (

                      supabaseExpenses.length === 0 ? (

                        <div className="py-12 text-center">

                          <p className="text-xs text-[#64748b]/80 font-medium">No business expenses recorded yet.</p>

                        </div>

                      ) : (

                        <table className="w-full text-left text-xs border-collapse">

                          <thead>

                            <tr className="text-[10px] font-black uppercase text-[#64748b]/60 dark:text-zinc-400 tracking-wider border-b border-[#bae6fd]/30 dark:border-[#223269]/30">

                              <th className="py-1.5 pr-3 font-black whitespace-nowrap">DATE</th>

                              <th className="py-1.5 px-3 font-black whitespace-nowrap">CATEGORY</th>

                              <th className="py-1.5 px-3 font-black whitespace-nowrap">VENDOR</th>

                              <th className="py-1.5 px-3 font-black whitespace-nowrap">AMOUNT</th>

                              <th className="py-1.5 px-3 font-black whitespace-nowrap">STATUS</th>

                            </tr>

                          </thead>

                          <tbody>

                            {supabaseExpenses.slice(0, 4).map(exp => (

                              <tr key={exp.id} className="border-b border-[#bae6fd]/20 dark:border-[#223269]/20 hover:bg-[#e0f2fe]/20 dark:hover:bg-[#1b264f]/20 transition-colors">

                                <td className="py-2 pr-3 font-mono text-[11px] text-[#0f172a] dark:text-white font-bold whitespace-nowrap">{exp.expense_date}</td>

                                <td className="py-2 px-3 font-bold text-[#64748b] dark:text-zinc-300 truncate max-w-[110px]">

                                  <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 text-[9.5px] font-bold">

                                    {exp.category}

                                  </span>

                                </td>

                                <td className="py-2 px-3 font-bold text-[#0f172a] dark:text-white truncate max-w-[130px]">{exp.vendor}</td>

                                <td className="py-2 px-3 font-extrabold font-mono text-[#0f172a] dark:text-white whitespace-nowrap">{currencySymbol}{formatNum(exp.amount)}</td>

                                <td className="py-2 px-3 whitespace-nowrap">

                                  {exp.status === 'paid' ? (

                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">

                                      Paid

                                    </span>

                                  ) : (

                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">

                                      Pending

                                    </span>

                                  )}

                                </td>

                              </tr>

                            ))}

                          </tbody>

                        </table>

                      )

                    )}

                  </div>

                </div>

              </div>

            </div>

          );

        })()}



        {/* ------------------ TAB: EXPENSES PAGE ------------------ */}

        {activeTab === 'expenses' && (

          <ExpensesPage currencySymbol={currencySymbol} />

        )}



        {/* ------------------ TAB 5: LEARN DOCUMENTATION & TERMS AND CONDITIONS ------------------ */}

        {activeTab === 'learn' && (

          <div className="space-y-6 animate-in fade-in duration-200 w-full">



            {/* Page Header with Interactive App Tutorial Button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#111a36] border border-[#bae6fd]/80 dark:border-[#223269]/80 p-5 sm:p-6 rounded-2xl shadow-xs relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#38bdf8]" />
              <div>
                <h1 className="text-base sm:text-lg font-black uppercase tracking-tight flex items-center gap-2" style={{ fontFamily: "'Fraunces', serif" }}>
                  <span className="bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#38bdf8] bg-clip-text text-transparent">User Guide &amp; App Tutorial</span>
                  <span className="w-2 h-2 rounded-full bg-[#0284c7] dark:bg-[#38bdf8] shrink-0" />
                </h1>
                <p className="text-xs text-[#64748b]/90 dark:text-zinc-400 mt-1 font-medium">Interactive app tour, structural documentation, billing policies, and feature walkthroughs</p>
              </div>
              <button
                type="button"
                onClick={() => startInteractiveTutorial(0)}
                className="inline-flex items-center gap-2.5 px-5 py-3 bg-[#0284c7] hover:bg-[#0369a1] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-sky-500/20 hover:shadow-lg cursor-pointer active:scale-95 shrink-0"
              >
                <PlayCircle className="w-4 h-4 text-white animate-pulse" />
                <span>Start Interactive Tutorial</span>
              </button>
            </div>





            {/* Asymmetric Bento Grid Section */}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">



              {/* Bento Card 1: Part A (App Walkthrough) — Spans 2 Columns */}

              <div id="learn-section-0" className="lg:col-span-2 bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between">

                <div className="relative">

                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#bae6fd] via-[#0284c7] to-[#2563eb]" />

                  <div className="p-5 border-b border-[#bae6fd]/30 dark:border-[#223269]/30 flex flex-wrap justify-between items-center gap-2 bg-[#f4f9ff]/50 dark:bg-[#0b1329]/40">

                    <div className="flex items-center gap-2.5">

                      <span className="px-2 py-0.5 bg-[#0284c7] text-white text-[8px] font-black uppercase tracking-widest rounded">Part A</span>

                      <h2 className="text-[11px] font-black text-[#0f172a] dark:text-white uppercase tracking-wide" style={{ fontFamily: "'Fraunces', serif" }}>Structural Walkthrough</h2>

                    </div>

                    <span className="text-[9px] text-[#64748b] font-black uppercase tracking-wider">6 Modules</span>

                  </div>

                </div>



                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-1">

                  {[

                    { step: '01', title: 'Set Up Company Profile', desc: 'Go to System Settings → Company Info. Input your business logo, GSTIN, PAN, bank accounts, and signature stamp. This data auto-populates all generated documents.' },

                    { step: '02', title: 'Populate Master Registries', desc: 'Open the Master Registry section. Save recurring records for Client Database, Vendor Database, HSN Registry, Transport Database, Material Catalog, and Product Categories.' },

                    { step: '03', title: 'Design Invoice Templates', desc: 'Go to Tools & Design → Invoice Template. Use Advanced Studio and Quick Builder to toggle layouts (Modern, Classic, Minimal, Bold) and customize color palettes.' },

                    { step: '04', title: 'Manage Financial Ledgers', desc: 'Access Sales Ledger to issue Tax Invoices, Quotes, and Credit Notes. Access Purchases Ledger to record bills and POs. CGST/SGST/IGST tax splits calculate automatically.' },

                    { step: '05', title: 'Review Reports & Exports', desc: 'Review total revenue and expenses in the main Billing Dashboard. Visit Financial Hub → Accounting Report to export ledger databases directly to Excel.' },

                    { step: '06', title: 'Configure Security PIN Lock', desc: 'Go to System Settings → App Preferences. Enable a secure 4-Digit PIN to encrypt your localIndexedDB storage sandbox and sync safely with Supabase.' },

                  ].map((item, idx) => {

                    const stepColors = ['bg-[#0284c7]', 'bg-sky-500', 'bg-blue-500', 'bg-[#2563eb]', 'bg-indigo-500', 'bg-violet-500'];

                    return (

                      <div key={item.step} className="flex gap-3.5 p-4 bg-[#f4f9ff]/30 dark:bg-[#0b1329]/20 border border-[#bae6fd]/30 dark:border-[#223269]/30 rounded-xl hover:border-[#0284c7]/40 hover:bg-[#e0f2fe]/20 transition-all duration-200 group">

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

              <div id="learn-section-4" className="bg-[#f4f9ff]/30 dark:bg-[#111a36]/50 border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl p-5 shadow-xs flex flex-col justify-between relative overflow-hidden">

                <div className="absolute top-0 inset-x-0 h-1 bg-[#0284c7]" />

                

                <div className="space-y-5">

                  <div className="flex items-center justify-between border-b border-[#bae6fd]/30 dark:border-[#223269]/30 pb-3">

                    <span className="text-[10px] font-black text-[#0f172a] dark:text-white uppercase tracking-wider" style={{ fontFamily: "'Fraunces', serif" }}>Quick Utilities</span>

                    <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7] dark:bg-[#38bdf8]" />

                  </div>



                  {[

                    { title: 'Keyboard Controls', tip: 'Use browser Ctrl+P to print and save clean layout copies directly.' },

                    { title: 'Sidebar Toggle', tip: 'Click the collapse button to lock labels and gain workspace size.' },

                    { title: 'Tax Auditing', tip: 'Always cross-verify client GSTIN formats before printing tax summaries.' }

                  ].map((tip, idx) => (

                    <div key={tip.title} className="space-y-1 bg-white dark:bg-[#111a36] p-3 rounded-xl border border-[#bae6fd]/30 dark:border-[#223269]/30 hover:border-[#0284c7]/35 transition-colors">

                      <span className="text-[10.5px] font-black text-[#0f172a] dark:text-zinc-200 uppercase tracking-wide block">{tip.title}</span>

                      <p className="text-[10.5px] text-[#64748b]/85 dark:text-zinc-400 leading-relaxed font-medium">{tip.tip}</p>

                    </div>

                  ))}

                </div>



                <div className="mt-5 pt-3 border-t border-[#bae6fd]/30 dark:border-[#223269]/30 text-[10px] text-[#64748b]/75 font-semibold leading-relaxed">

                  Refer to local jurisdiction rules for official GST formatting regulations.

                </div>

              </div>



              {/* Bento Card 3: Part B (Company Policies) — Spans 3 Columns */}

              <div id="learn-section-2" className="lg:col-span-3 bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl shadow-xs overflow-hidden">

                <div className="relative">

                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#bae6fd] via-[#0284c7] to-[#2563eb]" />

                  <div className="p-5 border-b border-[#bae6fd]/30 dark:border-[#223269]/30 flex flex-wrap justify-between items-center gap-2 bg-[#f4f9ff]/50 dark:bg-[#0b1329]/40">

                    <div className="flex items-center gap-2 flex-wrap">

                      <span className="px-2 py-0.5 bg-[#0284c7] text-white text-[8px] font-black uppercase tracking-widest rounded">Part B</span>

                      <h2 className="text-[11px] font-black text-[#0f172a] dark:text-white uppercase tracking-wide" style={{ fontFamily: "'Fraunces', serif" }}>Corporate Billing Regulations & Terms</h2>

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

                    const borderColors = ['border-[#0284c7]', 'border-sky-500', 'border-blue-500', 'border-[#2563eb]', 'border-indigo-500'];

                    const dotColors = ['bg-[#0284c7]', 'bg-sky-500', 'bg-blue-500', 'bg-[#2563eb]', 'bg-indigo-500'];

                    return (

                      <div key={policy.title} className={`flex gap-3.5 p-4 border-l-2 border-[#bae6fd]/40 dark:border-[#223269]/45 hover:${borderColors[idx]} hover:bg-[#f4f9ff]/45 dark:hover:bg-[#0b1329]/45 rounded-r-xl transition-all group`}>

                        <div className={`flex-shrink-0 w-5.5 h-5.5 rounded-full ${dotColors[idx]} text-white flex items-center justify-center font-black text-[9px] shadow-2xs`}>

                          {idx + 1}

                        </div>

                        <div className="min-w-0">

                          <span className="text-[10.5px] font-black text-[#0f172a] dark:text-zinc-200 uppercase tracking-wide block mb-1">{policy.title}</span>

                          <p className="text-[10.5px] text-[#64748b]/80 dark:text-zinc-400 leading-relaxed font-medium">{policy.body}</p>

                        </div>

                      </div>

                    );

                  })}

                </div>

              </div>



            </div>

            <div className="flex items-start gap-3 px-4 py-3.5 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-xl text-[10.5px] text-[#64748b]/80 dark:text-zinc-400">

              <Info className="w-4 h-4 text-[#0284c7] dark:text-[#38bdf8] flex-shrink-0 mt-0.5 hidden sm:block" />

              <span>
                This documentation applies to MakInvoices v1.2. For technical support, open the{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('support')}
                  className="font-bold text-[#0284c7] hover:text-[#0369a1] dark:text-[#38bdf8] dark:hover:text-sky-300 underline cursor-pointer inline-flex items-center transition-colors focus:outline-none"
                >
                  Help & Support
                </button>{' '}
                page from the profile menu. Policies are subject to periodic updates — last revised July 2025.
              </span>

            </div>



          </div>

        )}



        {/* ------------------ TAB 6: BRAND NEW 'profile' BRAND VIEW ------------------ */}

        {activeTab === 'profile' && (

          <div className="space-y-6 text-sans animate-in fade-in duration-200 w-full">



            {/* Page Header */}

            <div>

              <h1 className="text-base font-black uppercase tracking-tight flex items-center gap-2" style={{ fontFamily: "'Fraunces', serif" }}>

                <span className="bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#38bdf8] bg-clip-text text-transparent">Company Profile</span>

                <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7] dark:bg-[#38bdf8] shrink-0" />

              </h1>

              <p className="text-[10px] text-[#64748b]/80 dark:text-zinc-400 mt-0.5">Brand identity, billing settings, and business credentials</p>

            </div>



            {/* Row 1: 2-Column Bento Grid */}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              

              {/* Left Column: Creator Identity card */}

              <div className="lg:col-span-2 bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 p-6 sm:p-8 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between">

                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#bae6fd] via-[#0284c7] to-[#2563eb]" />

                

                <div>

                  <div className="flex items-center gap-5 mb-6">

                    <div className="w-16 h-16 rounded-2xl bg-[#e0f2fe] dark:bg-[#1b264f] text-[#0284c7] dark:text-[#38bdf8] flex items-center justify-center shadow-sm border border-[#bae6fd]/60 dark:border-[#223269]/60 overflow-hidden flex-shrink-0">

                      {profile.logoUrl ? (

                        <img src={profile.logoUrl} referrerPolicy="no-referrer" alt={profile.name} className="w-full h-full object-cover" />

                      ) : (

                        <User className="w-8 h-8" />

                      )}

                    </div>

                    <div>

                      <h2 className="text-base font-black text-[#0f172a] dark:text-white uppercase tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>{profile.name || 'My Invoice Studio'}</h2>

                      <span className="text-[10px] text-[#0284c7] dark:text-[#38bdf8] font-mono block mt-0.5">{profile.email || 'No email established'}</span>

                    </div>

                  </div>



                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    <div className="bg-[#f4f9ff] dark:bg-[#0b1329]/60 p-4 rounded-xl border border-[#bae6fd]/40 dark:border-[#223269]/40">

                      <span className="text-[9px] uppercase font-extrabold text-[#0284c7] dark:text-[#38bdf8] block">LLC Brand Registry</span>

                      <span className="text-xs font-bold text-[#0f172a] dark:text-zinc-200 mt-1 block truncate">{profile.name || 'Sole Proprietorship'}</span>

                    </div>

                    <div className="bg-[#f4f9ff] dark:bg-[#0b1329]/60 p-4 rounded-xl border border-[#bae6fd]/40 dark:border-[#223269]/40">

                      <span className="text-[9px] uppercase font-extrabold text-[#0284c7] dark:text-[#38bdf8] block">Tax Registry (GSTIN)</span>

                      <span className="text-xs font-bold text-[#0f172a] dark:text-zinc-200 mt-1 block truncate font-mono">{profile.taxId || 'Not Configured'}</span>

                    </div>

                    <div className="bg-[#f4f9ff] dark:bg-[#0b1329]/60 p-4 rounded-xl border border-[#bae6fd]/40 dark:border-[#223269]/40">

                      <span className="text-[9px] uppercase font-extrabold text-[#0284c7] dark:text-[#38bdf8] block">Primary Currency</span>

                      <span className="text-xs font-bold text-[#0f172a] dark:text-zinc-200 mt-1 block">

                        {(() => {

                          const sym = profile.currencySymbol || currencySymbol || '₹';

                          const symToCode: Record<string, string> = {

                            '₹': 'INR', '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY',

                            'C$': 'CAD', 'A$': 'AUD', 'Fr': 'CHF', 'HK$': 'HKD', 'S$': 'SGD',

                            'NZ$': 'NZD', 'â‚©': 'KRW', 'R$': 'BRL', 'â‚½': 'RUB', 'R': 'ZAR',

                            'â‚º': 'TRY', 'kr': 'SEK', 'zÅ‚': 'PLN', 'à¸¿': 'THB', 'Rp': 'IDR',

                            'RM': 'MYR', 'â‚±': 'PHP', 'â‚«': 'VND', 'â‚¦': 'NGN', 'â‚ª': 'ILS',

                            'KÄ': 'CZK', 'Ft': 'HUF', 'â‚´': 'UAH', 'â‚¾': 'GEL', 'â‚¸': 'KZT',

                            'NT$': 'TWD', 'â‚µ': 'GHS', 'KSh': 'KES', 'â‚¼': 'AZN',

                          };

                          const derivedCode = symToCode[sym] || profile.currency || 'INR';

                          return `${derivedCode} (${sym})`;

                        })()}

                      </span>

                    </div>

                    <div className="bg-[#f4f9ff] dark:bg-[#0b1329]/60 p-4 rounded-xl border border-[#bae6fd]/40 dark:border-[#223269]/40">

                      <span className="text-[9px] uppercase font-extrabold text-[#0284c7] dark:text-[#38bdf8] block">Mobile Number</span>

                      <span className="text-xs font-bold text-[#0f172a] dark:text-zinc-200 mt-1 block truncate">{profile.mobile || profile.phone || 'N/A'}</span>

                    </div>

                  </div>

                </div>



                <div className="mt-8 pt-6 border-t border-[#bae6fd]/30 dark:border-[#223269]/30 flex items-center justify-between">

                  <div className="text-left">

                    <span className="text-[10px] uppercase font-extrabold text-[#0284c7] dark:text-[#38bdf8] block">Creator Settings</span>

                    <p className="text-[10px] text-[#0f172a]/80 dark:text-zinc-400 mt-0.5 font-medium leading-normal">Customize your brand names, billing information, signature sketchpad, and bank details.</p>

                  </div>

                  <button

                    onClick={onOpenProfile}

                    className="px-5 py-2.5 bg-[#0284c7] dark:bg-[#38bdf8] hover:bg-[#0369a1] dark:hover:bg-[#0284c7] text-white dark:text-[#0b1329] border border-[#0369a1] dark:border-[#0284c7] text-[10.5px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm hover:shadow-md shadow-[#0284c7]/20 flex-shrink-0"

                  >

                    <PenTool className="w-3.5 h-3.5" />

                    <span>Customize Details</span>

                  </button>

                </div>

              </div>



              {/* Right Column: Security and Session details */}

              <div className="bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 p-6 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between">

                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#0284c7] to-[#2563eb]" />

                

                <div>

                  <h3 className="text-xs font-black text-[#0284c7] dark:text-[#38bdf8] uppercase tracking-widest mb-4" style={{ fontFamily: "'Fraunces', serif" }}>Access Control & PIN</h3>

                  

                  <div className="bg-[#f4f9ff] dark:bg-[#0b1329]/60 p-4 rounded-xl border border-[#bae6fd]/40 dark:border-[#223269]/40 mb-4">

                    <span className="text-[9px] uppercase font-extrabold text-[#0284c7] dark:text-[#38bdf8] block">PIN Passcode Lock</span>

                    <p className="text-[10px] text-[#0f172a]/85 dark:text-zinc-400 mt-1 leading-normal font-medium">Requires a secure 4-digit PIN code on app refresh to prevent unauthorized local database access.</p>

                    

                    <button

                      type="button"

                      onClick={() => onToggleSecurity('pin')}

                      className={`mt-4 w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${

                        isPinLockEnabled 

                          ? 'bg-rose-500 hover:bg-rose-600 text-white' 

                          : 'bg-[#e0f2fe] dark:bg-[#1b264f] hover:bg-[#bae6fd] dark:hover:bg-[#223269] text-[#0284c7] dark:text-[#38bdf8] border border-[#bae6fd] dark:border-[#223269]'

                      }`}

                    >

                      {isPinLockEnabled ? 'Disable PIN Lock' : 'Enable PIN Lock'}

                    </button>

                  </div>



                  <div className="bg-[#f4f9ff] dark:bg-[#0b1329]/60 p-4 rounded-xl border border-[#bae6fd]/40 dark:border-[#223269]/40">

                    <span className="text-[9px] uppercase font-extrabold text-[#0284c7] dark:text-[#38bdf8] block">Database Status</span>

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



                <div className="mt-6 pt-4 border-t border-[#bae6fd]/30 dark:border-[#223269]/30 text-[9.5px] text-[#0284c7]/60 dark:text-[#38bdf8]/40 text-center font-mono">

                  Invoice Studio Pro v1.2.0

                </div>

              </div>

            </div>



            {/* Row 2: Banking, Presets, and Address Details */}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              

              {/* Bank Settlement & Signature Details */}

              <div className="lg:col-span-2 bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 p-6 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between">

                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#bae6fd] via-[#0284c7] to-[#2563eb]" />

                

                <div>

                  <h3 className="text-xs font-black text-[#0284c7] dark:text-[#38bdf8] uppercase tracking-widest mb-4" style={{ fontFamily: "'Fraunces', serif" }}>Bank Settlement & Signature</h3>

                  

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Bank Details */}

                    <div className="space-y-3 bg-[#f4f9ff] dark:bg-[#0b1329]/60 p-4 rounded-xl border border-[#bae6fd]/40 dark:border-[#223269]/40">

                      <span className="text-[9px] uppercase font-extrabold text-[#0284c7] dark:text-[#38bdf8] block">Direct Transfer Account</span>

                      

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

                    <div className="bg-[#f4f9ff] dark:bg-[#0b1329]/60 p-4 rounded-xl border border-[#bae6fd]/40 dark:border-[#223269]/40 flex flex-col justify-between min-h-[140px]">

                      <div>

                        <span className="text-[9px] uppercase font-extrabold text-[#0284c7] dark:text-[#38bdf8] block">Authorized Signature</span>

                        <p className="text-[10px] text-[#0f172a]/80 dark:text-zinc-400 mt-1 leading-normal font-medium">Applied automatically to newly generated billing sheets.</p>

                      </div>

                      

                      <div className="mt-3 flex items-center justify-center bg-white dark:bg-[#111a36] border border-[#bae6fd]/30 dark:border-[#223269]/30 rounded-lg p-2 h-16 relative overflow-hidden">

                        {profile.signature ? (

                          <img src={profile.signature.startsWith('data:') ? profile.signature : `${profile.signature}${profile.signature.includes('?') ? '&' : '?'}t=${Date.now()}`} alt="Signature Preview" className="max-h-full max-w-full object-contain" />

                        ) : (

                          <span className="text-[10px] text-[#0284c7]/40 dark:text-[#38bdf8]/30 uppercase tracking-wider font-bold">No Signature Configured</span>

                        )}

                      </div>

                    </div>

                  </div>

                </div>



                <div className="mt-4 pt-4 border-t border-[#bae6fd]/30 dark:border-[#223269]/30 flex justify-between items-center text-[10px]">

                  <span className="text-[#64748b]/80">Legal Entity Status</span>

                  <span className="font-bold text-[#0284c7] dark:text-[#38bdf8]">{profile.pan ? `PAN: ${profile.pan}` : 'PAN Not Registered'}</span>

                </div>

              </div>



              {/* Physical Location details */}

              <div className="bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 p-6 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between">

                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#2563eb] to-[#38bdf8]" />

                

                <div>

                  <h3 className="text-xs font-black text-[#0284c7] dark:text-[#38bdf8] uppercase tracking-widest mb-4" style={{ fontFamily: "'Fraunces', serif" }}>Location & Presets</h3>

                  

                  <div className="bg-[#f4f9ff] dark:bg-[#0b1329]/60 p-4 rounded-xl border border-[#bae6fd]/40 dark:border-[#223269]/40 mb-4">

                    <span className="text-[9px] uppercase font-extrabold text-[#0284c7] dark:text-[#38bdf8] block">Registered Address</span>

                    <p className="text-xs text-[#0f172a] dark:text-zinc-300 font-medium leading-relaxed mt-2 whitespace-pre-line">

                      {profile.address || 'No registered business address set.'}

                    </p>

                    {profile.state && (

                      <div className="mt-2 pt-2 border-t border-[#bae6fd]/20 dark:border-[#223269]/20 flex justify-between text-[10px]">

                        <span className="text-[#64748b]/80">State / Region</span>

                        <span className="font-bold text-[#0f172a] dark:text-zinc-200">{profile.state} ({profile.stateCode || 'N/A'})</span>

                      </div>

                    )}

                  </div>



                  <div className="bg-[#f4f9ff] dark:bg-[#0b1329]/60 p-4 rounded-xl border border-[#bae6fd]/40 dark:border-[#223269]/40">

                    <span className="text-[9px] uppercase font-extrabold text-[#0284c7] dark:text-[#38bdf8] block">Billing Preferences</span>

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



                <div className="mt-6 pt-4 border-t border-[#bae6fd]/30 dark:border-[#223269]/30 text-[10px] flex justify-between">

                  <span className="text-[#64748b]/80">Website</span>

                  <a href={profile.website ? (profile.website.startsWith('http') ? profile.website : `https://${profile.website}`) : '#'} target="_blank" rel="noreferrer" className="font-bold text-[#0284c7] dark:text-[#38bdf8] hover:underline truncate max-w-[150px]">

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

          <SupportPage onChatClick={() => setActiveTab('support-chat')} onNavigateTab={(tab) => setActiveTab(tab as any)} subscriptionTier={subscriptionTier} />

        )}

        {/* ------------------ TAB: SUPPORT CHAT ------------------ */}

        {activeTab === 'support-chat' && (
          (subscriptionTier === 'free' || subscriptionTier === 'basic') ? (
            (() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('mak_navigate_tab', { detail: 'subscription' }));
              }
              return (
                <div className="p-8 text-center bg-white dark:bg-[#111a36] rounded-2xl border border-amber-200 dark:border-amber-900/50">
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                    MakInvoices AI Live Chat Support is available exclusively on Professional and Enterprise plans. Redirecting to Subscription Page... 🔒
                  </span>
                </div>
              );
            })()
          ) : (
            <SupportChatPage 

              userEmail={userEmail} 

              onBack={() => setActiveTab('support')} 

              onEscalate={(sub, desc) => {

                setActiveTab('support');

              }} 

            />
          )
        )}



        {/* ------------------ TAB: SUBSCRIPTION ------------------ */}

        {activeTab === 'subscription' && (

          <SubscriptionPage

            theme={theme}

            profile={profile}

            invoices={invoices}

            subscriptionTier={subscriptionTier}

            onUpgrade={handleUpgrade}

          />

        )}



        {/* ------------------ TAB 7: DYNAMIC REGISTRIES HANDLER ------------------ */}

        {renderMasterTableSection()}



        </div>

      </main>



      {/* -------------------- OVERLAY MODAL 0: SLIDING DRAWER MENU FOR MOBILE DEVICE & TABLET/IPAD -------------------- */}
      <div className={`fixed inset-0 z-[60] xl:hidden transition-opacity duration-300 ${isMobileDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>

        {/* Backdrop screen */}

        <div 

          onClick={() => setIsMobileDrawerOpen(false)}

          className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"

        />

        {/* Menu Drawer panel */}

        <div className={`absolute top-0 left-0 w-72 max-w-[85vw] bg-white dark:bg-[#111a36] h-full p-5 shadow-2xl flex flex-col z-10 border-r border-[#bae6fd]/50 dark:border-[#223269] overflow-y-auto transform transition-transform duration-300 ease-in-out ${isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>

          <div className="flex justify-between items-center mb-6 pb-4 border-b border-[#bae6fd]/50 dark:border-[#223269]">

            <h3 className="text-xs font-black text-[#0284c7] dark:text-[#38bdf8] uppercase tracking-widest" style={{fontFamily: "'IBM Plex Mono', monospace"}}>Menu</h3>

            <button

              onClick={() => setIsMobileDrawerOpen(false)}

              className="w-10 h-10 rounded-xl hover:bg-[#e0f2fe] dark:hover:bg-[#1b264f] flex items-center justify-center text-[#0284c7] dark:text-[#38bdf8] transition-colors cursor-pointer touch-action-manipulation active:scale-95"

              aria-label="Close menu drawer"

            >

              <X className="w-5 h-5" />

            </button>

          </div>

          {renderNavMenuContent(true)}

        </div>

      </div>



      {/* -------------------- OVERLAY MODAL 1: STUNNING PAPER ENVELOPE LIVE PREVIEW -------------------- */}

      {activePreviewInvoice && (() => {

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

        const previewItems = activePreviewInvoice?.items || [];

        const previewHeight = measuredHeight;



        const invoiceDataWithCopies = {

          ...activePreviewInvoice,

          selectedCopies

        } as Invoice;



        return (

          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-[#0b1329]/80 backdrop-blur-sm overflow-y-auto no-scrollbar">

            <div className="w-full max-w-5xl h-full md:h-[92vh] bg-white dark:bg-[#111a36] rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-[#bae6fd]/30 dark:border-[#223269]/60 animate-in fade-in duration-200 doc-preview-modal invoice-preview-container preview-section no-privacy-blur" data-privacy-exempt="true">

              

              {/* Header toolbar */}

              <div className="p-3 px-4 border-b border-[#bae6fd]/30 dark:border-[#223269]/50 bg-[#f4f9ff] dark:bg-[#0b1329] flex items-center justify-between">

                <div className="flex items-center gap-2">

                  <FileText className="w-5 h-5 text-[#0284c7] dark:text-[#38bdf8] flex-shrink-0" />

                  <div>

                    <h3 className="text-xs font-extrabold text-[#0f172a] dark:text-white uppercase leading-none">Document Preview</h3>

                    <span className="text-[10px] text-slate-405 font-mono block mt-1">Ref ID: {activePreviewInvoice.invoiceNumber}</span>

                  </div>

                </div>

                <button

                  onClick={() => {

                    setActivePreviewInvoice(null);

                    setSelectedCopies({ customer: true, transport: false, supplier: false, challan: false });

                  }}

                  className="w-8 h-8 rounded-full bg-[#e0f2fe] hover:bg-[#bae6fd]/40 dark:bg-[#1b264f] dark:hover:bg-[#1b264f]/80 flex items-center justify-center text-[#0284c7] dark:text-[#38bdf8] transition-all cursor-pointer"

                  aria-label="Close invoice previewer"

                >

                  <X className="w-4 h-4" />

                </button>

              </div>



              {/* Split Content */}

              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

                

                {/* Left pane: Actions & Share */}

                <div className="w-full md:w-[320px] shrink-0 border-b md:border-b-0 md:border-r border-[#bae6fd]/30 dark:border-[#223269]/50 p-4 md:p-6 flex flex-col justify-start overflow-y-auto max-h-[40vh] md:max-h-none space-y-6 order-2 md:order-1 bg-[#f4f9ff]/20 dark:bg-[#0f172a]/20">

                  <div className="space-y-6">

                    {/* Invoice Info Details */}

                    <div className="hidden md:block p-4 rounded-2xl border border-[#bae6fd]/40 dark:border-[#223269]/50 bg-white dark:bg-[#111a36] space-y-3.5 shadow-2xs document-summary-section document-summary no-privacy-blur" data-privacy-exempt="true">

                      <span className="block text-[10px] font-black uppercase tracking-widest text-[#64748b]/80 dark:text-zinc-500">Document Summary</span>

                      <div className="space-y-3.5 text-xs">

                        {/* Metadata breakdown */}

                        <div className="grid grid-cols-2 gap-y-2.5 gap-x-3 text-[11px] pb-3 border-b border-slate-100 dark:border-slate-800/80">

                          <div>

                            <span className="block text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wide">Document #</span>

                            <span className="font-bold font-mono text-slate-700 dark:text-zinc-300">{activePreviewInvoice.invoiceNumber}</span>

                          </div>

                          <div>

                            <span className="block text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wide">Client</span>

                            <span className="font-bold text-slate-700 dark:text-zinc-300 truncate block" title={activePreviewInvoice.clientName}>{activePreviewInvoice.clientName || 'Guest'}</span>

                          </div>

                          <div>

                            <span className="block text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wide">Issue Date</span>

                            <span className="font-semibold text-slate-700 dark:text-zinc-300">{activePreviewInvoice.date}</span>

                          </div>

                          <div>

                            <span className="block text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wide">Due Date</span>

                            <span className="font-semibold text-slate-700 dark:text-zinc-300">{activePreviewInvoice.dueDate}</span>

                          </div>

                        </div>



                        {/* Pricing Details */}

                        <div className="space-y-2">

                          <div className="flex justify-between text-slate-550 dark:text-zinc-400 font-medium">

                            <span>Subtotal</span>

                            <span>

                              {profile.currencySymbol || (profile.currency === 'INR' ? '₹' : (profile.currency === 'USD' ? '$' : (profile.currency || '₹')))}

                              {activePreviewInvoice.subtotal.toFixed(2)}

                            </span>

                          </div>

                          {activePreviewInvoice.discountTotal > 0 && (

                            <div className="flex justify-between text-rose-500 font-medium">

                              <span>Discount</span>

                              <span>

                                -{profile.currencySymbol || (profile.currency === 'INR' ? '₹' : (profile.currency === 'USD' ? '$' : (profile.currency || '₹')))}

                                {activePreviewInvoice.discountTotal.toFixed(2)}

                              </span>

                            </div>

                          )}

                          {activePreviewInvoice.taxTotal > 0 && (

                            <div className="flex justify-between text-slate-550 dark:text-zinc-400 font-medium">

                              <span>Tax Total</span>

                              <span>

                                {profile.currencySymbol || (profile.currency === 'INR' ? '₹' : (profile.currency === 'USD' ? '$' : (profile.currency || '₹')))}

                                {activePreviewInvoice.taxTotal.toFixed(2)}

                              </span>

                            </div>

                          )}

                          <div className="border-t border-[#bae6fd]/50 dark:border-[#223269]/50 pt-2 flex justify-between font-black text-slate-805 text-xs dark:text-white items-center">

                            <span>Grand Total</span>

                            <span className="text-[#0284c7] dark:text-[#38bdf8] font-mono font-black text-sm">

                              {profile.currencySymbol || (profile.currency === 'INR' ? '₹' : (profile.currency === 'USD' ? '$' : (profile.currency || '₹')))}

                              {activePreviewInvoice.grandTotal.toFixed(2)}

                            </span>

                          </div>

                          <div className="flex justify-between text-slate-550 dark:text-zinc-400 font-medium border-t border-[#bae6fd]/20 dark:border-[#223269]/20 pt-2">

                            <span>Status</span>

                            <span className="font-bold capitalize text-sky-600 dark:text-sky-400">{activePreviewInvoice.status}</span>

                          </div>

                        </div>

                      </div>

                    </div>



                    {/* Share / Dispatch Actions */}

                    <div className="space-y-2.5">

                      <span className="block text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Share & Dispatch</span>

                      

                      <button

                        onClick={() => triggerWhatsAppShare(invoiceDataWithCopies)}

                        className="w-full flex items-center justify-center gap-2 p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer shadow-emerald-500/10"

                      >

                        <Smartphone className="w-4 h-4 shrink-0" />

                        <span>WhatsApp Bill</span>

                      </button>



                      <button

                        onClick={() => triggerEmailShare(invoiceDataWithCopies)}

                        className="w-full flex items-center justify-center gap-2 p-3 bg-[#e0f2fe] text-[#0284c7] hover:bg-[#bae6fd]/40 dark:bg-[#1b264f] dark:text-[#38bdf8] rounded-xl text-xs font-bold transition-all active:scale-98 cursor-pointer"

                      >

                        <Mail className="w-4 h-4 shrink-0" />

                        <span>Dispatch Email</span>

                      </button>

                    </div>



                    {/* Local Export */}

                    <div className="space-y-2.5">

                      <span className="block text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Local Export</span>

                      

                      <div className="grid grid-cols-2 gap-2">

                        <button

                          onClick={async () => {

                            await exportInvoicePDFAsync(invoiceDataWithCopies, profile, 'save', resolvedTemplate);

                          }}

                          className="flex items-center justify-center gap-1.5 p-2.5 bg-[#f4f9ff] dark:bg-[#111a36] text-[#0f172a] dark:text-white hover:bg-[#e0f2fe]/40 dark:hover:bg-[#1b264f]/40 rounded-xl text-xs font-bold cursor-pointer transition-all border border-[#bae6fd] dark:border-[#223269]/50"

                        >

                          <FileDown className="w-4 h-4 text-rose-500 shrink-0" />

                          <span>Export PDF</span>

                        </button>



                        <button

                          onClick={() => handleExportMSWord(invoiceDataWithCopies)}

                          className="flex items-center justify-center gap-1.5 p-2.5 bg-[#f4f9ff] dark:bg-[#111a36] text-[#0f172a] dark:text-white hover:bg-[#e0f2fe]/40 dark:hover:bg-[#1b264f]/40 rounded-xl text-xs font-bold cursor-pointer transition-all border border-[#bae6fd] dark:border-[#223269]/50"

                        >

                          <FileDown className="w-4 h-4 text-blue-500 shrink-0" />

                          <span>Word Doc</span>

                        </button>



                        <button

                          onClick={() => handleDirectPrint(invoiceDataWithCopies)}

                          className="col-span-2 flex items-center justify-center gap-1.5 p-2.5 bg-[#f4f9ff] dark:bg-[#111a36] text-[#0f172a] dark:text-white hover:bg-[#e0f2fe]/40 dark:hover:bg-[#1b264f]/40 rounded-xl text-xs font-bold cursor-pointer transition-all border border-[#bae6fd] dark:border-[#223269]/50"

                        >

                          <Printer className="w-4 h-4 text-violet-500 shrink-0" />

                          <span>Print Document</span>

                        </button>

                      </div>

                    </div>

                  </div>

                </div>



                {/* Right pane: Preview and copies selection */}

                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-[#f4f9ff]/30 dark:bg-[#0b1329] flex flex-col items-center justify-start order-1 md:order-2 no-scrollbar">

                  

                  {/* Copy Selector Checkboxes (Strictly on top of document preview only!) */}

                  <div className="w-full max-w-[794px] bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl p-4 flex flex-wrap items-center gap-6 justify-center shadow-xs">

                    {[

                      { key: 'customer' as const, label: 'Customer' },

                      { key: 'transport' as const, label: 'Transport' },

                      { key: 'supplier' as const, label: 'Supplier' },

                      { key: 'challan' as const, label: 'Delivery Challan' },

                    ].map(({ key, label }) => (

                      <label key={key} className="flex items-center gap-2 text-xs font-bold text-slate-705 dark:text-zinc-300 cursor-pointer select-none">

                        <input

                          type="checkbox"

                          checked={selectedCopies[key]}

                          onChange={(e) => {

                            const updated = { ...selectedCopies, [key]: e.target.checked };

                            if (Object.values(updated).some(Boolean)) {

                              setSelectedCopies(updated);

                              // Persist to the invoice so other devices see the selection

                              if (activePreviewInvoice) {

                                const updatedInvoice = {

                                  ...activePreviewInvoice,

                                  embeddedTemplate: {

                                    ...(activePreviewInvoice.embeddedTemplate || resolvedTemplate),

                                    selectedCopies: updated,

                                  },

                                };

                                onUpdateInvoice(updatedInvoice as Invoice);

                              }

                            }

                          }}

                          className="w-4.5 h-4.5 rounded border-[#bae6fd] text-[#0284c7] focus:ring-[#0284c7] cursor-pointer"

                        />

                        <span>{label}</span>

                      </label>

                    ))}

                  </div>



                  <div className="w-full bg-[#f4f9ff]/30 p-2 sm:p-6 rounded-2xl border border-[#bae6fd]/30 dark:border-[#223269]/40 overflow-x-auto flex justify-center no-scrollbar">

                    <div style={{ width: `${794 * previewScale}px`, height: `${previewHeight * previewScale}px` }} className="shrink-0 relative">
                      <div 
                        ref={previewRef}
                        className="origin-top-left absolute top-0 left-0" 
                        style={{ 
                          width: '794px',
                          height: 'auto',
                          transform: `scale(${previewScale})`,
                        }}

                      >

                        <LivePreview 

                          template={resolvedTemplate}

                          invoiceData={invoiceDataWithCopies}

                          businessProfile={profile}

                          currencySymbol={profile.currencySymbol || (profile.currency === 'INR' ? '₹' : (profile.currency === 'USD' ? '$' : (profile.currency || '₹')))}

                          isInteractive={false}

                        />

                      </div>

                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>

        );

      })()}



      {/* -------------------- OVERLAY MODAL: RECORD PAYMENT -------------------- */}

      {paymentModalInv && (() => {

        const sym = profile.currencySymbol || (profile.currency === 'INR' ? '₹' : (profile.currency === 'USD' ? '$' : (profile.currency || '₹')));

        const total = paymentModalInv.grandTotal;

        const alreadyPaid = paymentModalInv.paidAmount || 0;

        const remaining = Math.max(0, total - alreadyPaid);

        const thisAmt = parseFloat(paymentAmount) || 0;

        const projectedPaid = alreadyPaid + thisAmt;

        const isFull = projectedPaid >= total - 0.001 && thisAmt > 0;

        const isPartial = thisAmt > 0 && !isFull;

        const isOverpay = thisAmt > remaining + 0.001;

        const pctTotal = total > 0 ? Math.min(100, (projectedPaid / total) * 100) : 0;

        const pctAlready = total > 0 ? Math.min(100, (alreadyPaid / total) * 100) : 0;

        const balanceDue = Math.max(0, total - projectedPaid);

        const statusLabel = isFull ? 'Paid in Full' : isPartial ? 'Partially Paid' : 'Pending';

        const statusBg = isFull ? 'bg-emerald-500' : isPartial ? 'bg-sky-500' : 'bg-amber-400';

        const METHODS = [

          { id: 'UPI',           label: 'UPI' },

          { id: 'Cash',          label: 'Cash' },

          { id: 'Bank Transfer', label: 'Bank' },

          { id: 'Cheque',        label: 'Cheque' },

          { id: 'Card',          label: 'Card' },

          { id: 'Other',         label: 'Other' },

        ];

        return (

          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">

            <form

              onSubmit={handleSavePayment}

              className="w-full max-w-[440px] bg-white dark:bg-[#111a36] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.22)] border border-slate-200/80 dark:border-[#223269]/60 overflow-hidden animate-in zoom-in-95 duration-200"

              onClick={(e) => e.stopPropagation()}

            >

              {/* Header */}

              <div className="px-6 pt-5 pb-4 flex items-start justify-between border-b border-slate-100 dark:border-[#223269]/40">

                <div>

                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0284c7] dark:text-[#38bdf8] mb-0.5">Record Payment</p>

                  <h3 className="text-[17px] font-black text-[#0f172a] dark:text-white leading-tight">{paymentModalInv.clientName || 'Client'}</h3>

                  <div className="flex items-center gap-3 mt-1 text-[11px] font-mono text-slate-400 dark:text-zinc-500">

                    <span>{paymentModalInv.invoiceNumber}</span>

                    <span>·</span>

                    <span>Invoice Total: <span className="font-bold text-[#0f172a] dark:text-white">{sym}{total.toFixed(2)}</span></span>

                  </div>

                </div>

                <button

                  type="button"

                  onClick={() => setPaymentModalInv(null)}

                  className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1b264f] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition-all cursor-pointer mt-0.5 shrink-0"

                >

                  <X className="w-4 h-4" />

                </button>

              </div>



              {/* Body */}

              <div className="px-6 py-5 space-y-4">



                {/* Already Paid Row — only shown when a partial was done before */}

                {alreadyPaid > 0 && (

                  <div className="flex items-center justify-between bg-slate-50 dark:bg-[#0b1329]/60 border border-slate-200 dark:border-[#223269]/50 rounded-xl px-4 py-2.5">

                    <div>

                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">Already Paid</p>

                      <p className="text-sm font-black text-[#0f172a] dark:text-white mt-0.5">{sym}{alreadyPaid.toFixed(2)}</p>

                    </div>

                    <div className="text-right">

                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">Remaining Balance</p>

                      <p className="text-sm font-black text-amber-500 mt-0.5">{sym}{remaining.toFixed(2)}</p>

                    </div>

                  </div>

                )}



                {/* Amount + Date row */}

                <div className="flex gap-3">

                  <div className="flex-1">

                    <div className="flex items-center justify-between mb-1.5">

                      <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 dark:text-zinc-500">

                        {isEditingTotalPaid ? 'Total Paid Amount' : (alreadyPaid > 0 ? 'Amount to Add' : 'Amount Received')}

                      </label>

                      <button

                        type="button"

                        onClick={handleResetInputs}

                        className="text-[10px] font-bold text-[#0284c7] hover:underline dark:text-[#38bdf8] flex items-center gap-1 cursor-pointer"

                        title="Clear input values to 0.00"

                      >

                        <RotateCcw className="w-2.5 h-2.5" />

                        <span>Reset Input</span>

                      </button>

                    </div>

                    <div className="relative">

                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-[#0284c7] dark:text-[#38bdf8] select-none">{sym}</span>

                      <input

                        type="number"

                        step="0.01"

                        min="0"

                        max={remaining}

                        required

                        value={paymentAmount}

                        onChange={(e) => setPaymentAmount(e.target.value)}

                        className={`w-full pl-8 pr-3 py-2.5 text-sm font-bold text-[#0f172a] dark:text-white bg-slate-50 dark:bg-[#0b1329]/80 border rounded-xl focus:outline-none focus:ring-2 transition-all ${

                          isOverpay

                            ? 'border-rose-400 focus:ring-rose-400/20'

                            : 'border-slate-200 dark:border-[#223269]/60 focus:ring-[#0284c7]/25'

                        }`}

                        placeholder="0.00"

                      />

                    </div>

                    {isOverpay && (

                      <p className="text-[9px] font-bold text-rose-500 mt-1">Max allowed: {sym}{remaining.toFixed(2)}</p>

                    )}

                  </div>

                  <div className="w-[118px]">

                    <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 dark:text-zinc-500 mb-1.5">Date</label>

                    <input

                      type="date"

                      required

                      value={paymentDate}

                      onChange={(e) => setPaymentDate(e.target.value)}

                      className="w-full px-3 py-2.5 text-xs font-bold text-[#0f172a] dark:text-white bg-slate-50 dark:bg-[#0b1329]/80 border border-slate-200 dark:border-[#223269]/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0284c7]/25 transition-all"

                    />

                  </div>

                </div>



                {/* Progress bar — shows cumulative coverage */}

                {total > 0 && (

                  <div>

                    <div className="flex justify-between items-center mb-1.5">

                      <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Payment Coverage</span>

                      <span className="text-[10px] font-black font-mono" style={{color: isFull ? '#10b981' : isPartial ? '#0284c7' : '#94a3b8'}}>{pctTotal.toFixed(0)}%</span>

                    </div>

                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-[#223269]/40 overflow-hidden relative">

                      {/* Already paid segment */}

                      {alreadyPaid > 0 && (

                        <div className="absolute left-0 top-0 h-full bg-sky-300 dark:bg-sky-700/60 rounded-full" style={{width: `${pctAlready}%`}} />

                      )}

                      {/* This payment segment */}

                      <div

                        className={`absolute top-0 h-full rounded-full transition-all duration-300 ${isFull ? 'bg-emerald-500' : isPartial ? 'bg-sky-500' : ''}`}

                        style={{left: `${pctAlready}%`, width: `${Math.max(0, pctTotal - pctAlready)}%`}}

                      />

                    </div>

                    {isPartial && !isOverpay && (

                      <p className="text-[9.5px] font-mono text-slate-400 dark:text-zinc-500 mt-1">

                        Remaining after this payment: <span className="font-bold text-amber-500">{sym}{balanceDue.toFixed(2)}</span>

                      </p>

                    )}

                  </div>

                )}



                {/* Payment Method — clean text tiles, no emojis */}

                <div>

                  <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 dark:text-zinc-500 mb-2">Payment Method</label>

                  <div className="grid grid-cols-3 gap-2">

                    {METHODS.map((m) => (

                      <button

                        key={m.id}

                        type="button"

                        onClick={() => setPaymentMethod(m.id)}

                        className={`py-2 px-3 rounded-xl border text-[11px] font-bold tracking-wide transition-all cursor-pointer text-center ${

                          paymentMethod === m.id

                            ? 'bg-[#0284c7] border-[#0284c7] text-white shadow-sm shadow-sky-500/15'

                            : 'bg-slate-50 dark:bg-[#0b1329]/60 border-slate-200 dark:border-[#223269]/50 text-slate-500 dark:text-zinc-400 hover:border-[#0284c7]/50 hover:text-[#0284c7] dark:hover:text-[#38bdf8] hover:bg-[#f0f9ff] dark:hover:bg-[#0b1329]'

                        }`}

                      >

                        {m.label}

                      </button>

                    ))}

                  </div>

                </div>



                {/* Reference */}

                <div>

                  <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 dark:text-zinc-500 mb-1.5">

                    Reference / Note <span className="normal-case font-normal">(optional)</span>

                  </label>

                  <input

                    type="text"

                    value={paymentNote}

                    onChange={(e) => setPaymentNote(e.target.value)}

                    placeholder="Transaction ID, UTR, cheque number…"

                    className="w-full px-3 py-2.5 text-xs font-medium text-[#0f172a] dark:text-white bg-slate-50 dark:bg-[#0b1329]/80 border border-slate-200 dark:border-[#223269]/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0284c7]/25 transition-all placeholder:text-slate-300 dark:placeholder:text-zinc-600"

                  />

                </div>



                {/* Live outcome strip */}

                <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl border ${

                  isFull

                    ? 'bg-emerald-50 dark:bg-emerald-950/25 border-emerald-200/50 dark:border-emerald-800/30'

                    : isPartial

                    ? 'bg-sky-50 dark:bg-sky-950/25 border-sky-200/50 dark:border-sky-800/30'

                    : 'bg-amber-50 dark:bg-amber-950/25 border-amber-200/50 dark:border-amber-800/30'

                }`}>

                  <span className={`text-[10px] font-bold uppercase tracking-wider ${

                    isFull ? 'text-emerald-600 dark:text-emerald-400' : isPartial ? 'text-sky-600 dark:text-sky-400' : 'text-amber-600 dark:text-amber-400'

                  }`}>Document will be marked as</span>

                  <span className={`px-2.5 py-0.5 ${statusBg} text-white text-[9px] font-black uppercase tracking-widest rounded-full`}>{statusLabel}</span>

                </div>

              </div>



              {/* Footer */}

              <div className="px-6 pb-5 pt-1 flex flex-col sm:flex-row gap-2.5">

                {(alreadyPaid > 0 || paymentModalInv.status === 'paid' || paymentModalInv.status === 'partially_paid') && (

                  <button

                    type="button"

                    onClick={handleResetAndSavePayment}

                    className="py-2.5 px-3 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all cursor-pointer flex items-center justify-center gap-1.5"

                    title="Reset recorded payment to 0.00 (Unpaid / Pending)"

                  >

                    <RotateCcw className="w-3.5 h-3.5" />

                    <span>Reset Payment</span>

                  </button>

                )}

                <button

                  type="button"

                  onClick={() => setPaymentModalInv(null)}

                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-[#223269]/50 text-slate-500 dark:text-zinc-400 text-xs font-bold hover:bg-slate-50 dark:hover:bg-[#1b264f]/40 transition-all cursor-pointer"

                >

                  Cancel

                </button>

                <button

                  type="submit"

                  disabled={isOverpay || (!isEditingTotalPaid && thisAmt <= 0 && alreadyPaid === 0)}

                  className={`flex-1 py-2.5 rounded-xl text-white text-xs font-black transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${

                    isFull

                      ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'

                      : isPartial

                      ? 'bg-sky-500 hover:bg-sky-600 shadow-sky-500/20'

                      : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'

                  }`}

                >

                  <Check className="w-3.5 h-3.5" />

                  {isFull ? 'Confirm Full Payment' : isPartial ? 'Save Partial Payment' : 'Enter Amount'}

                </button>

              </div>

            </form>

          </div>

        );

      })()}





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

        {/* ------------------ INTERACTIVE APP TUTORIAL MODAL OVERLAY ------------------ */}
        {isTutorialActive && (
          <div className="fixed bottom-2 right-2 sm:bottom-4 sm:right-4 z-[9999] w-[calc(100vw-1rem)] sm:w-[380px] max-w-[calc(100vw-1rem)] sm:max-w-[380px] animate-in slide-in-from-bottom-4 fade-in duration-300 pb-[env(safe-area-inset-bottom)] box-border">
            <div
              style={{
                backgroundColor: theme === 'dark' ? '#0b1328' : '#ffffff',
                color: theme === 'dark' ? '#ffffff' : '#0f172a',
                borderColor: theme === 'dark' ? '#38bdf8' : '#0284c7'
              }}
              className="border-2 rounded-xl p-3 sm:p-4 shadow-xl shadow-sky-950/20 relative overflow-hidden ring-1 ring-sky-500/30 max-h-[84vh] sm:max-h-[80vh] overflow-y-auto"
            >
              {/* Top Accent Bar */}
              <div className="absolute top-0 inset-x-0 h-1 bg-[#0284c7]" />

              {/* Step Header */}
              <div className="flex items-center justify-between gap-1.5 mb-2 pt-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-[#0284c7] text-white text-[10px] font-bold uppercase tracking-wider shadow-2xs">
                    Step {tutorialStep + 1}/{TUTORIAL_STEPS.length}
                  </span>
                  <span
                    style={{
                      backgroundColor: theme === 'dark' ? '#0f2444' : '#e0f2fe',
                      color: theme === 'dark' ? '#38bdf8' : '#0284c7',
                      borderColor: theme === 'dark' ? '#0284c7' : '#bae6fd'
                    }}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wide truncate max-w-[170px] sm:max-w-none"
                  >
                    {TUTORIAL_STEPS[tutorialStep].tag}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsTutorialActive(false);
                    handleCloseCreateModal();
                  }}
                  style={{ color: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer active:scale-95 shrink-0"
                  title="Close Tour"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Step Progress Bar */}
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-1 flex-1 mr-2 overflow-x-auto py-0.5 scrollbar-none touch-pan-x">
                  {TUTORIAL_STEPS.map((s, idx) => (
                    <button
                      key={s.step}
                      type="button"
                      onClick={() => {
                        setTutorialStep(idx);
                        applyTutorialStepAction(idx);
                      }}
                      style={{
                        backgroundColor: idx === tutorialStep
                          ? (theme === 'dark' ? '#38bdf8' : '#0284c7')
                          : idx < tutorialStep
                          ? (theme === 'dark' ? '#0284c7' : '#38bdf8')
                          : (theme === 'dark' ? '#334155' : '#e2e8f0')
                      }}
                      className={`h-1 rounded-full transition-all duration-300 cursor-pointer shrink-0 ${
                        idx === tutorialStep ? 'w-4 sm:w-5' : 'w-1 sm:w-1.5'
                      }`}
                      title={`Jump to Step ${idx + 1}: ${s.title}`}
                    />
                  ))}
                </div>
                <span
                  style={{ color: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                  className="text-[10px] font-mono font-bold shrink-0"
                >
                  {Math.round(((tutorialStep + 1) / TUTORIAL_STEPS.length) * 100)}%
                </span>
              </div>

              {/* Step Title & Icon */}
              <div className="flex items-start gap-2.5 mb-2">
                <div className="p-2 rounded-lg bg-[#0284c7]/10 text-[#0284c7] dark:text-[#38bdf8] shrink-0 border border-[#0284c7]/15 mt-0.5">
                  {tutorialStep === 0 && <TrendingUp className="w-4 h-4" />}
                  {tutorialStep === 1 && <FileText className="w-4 h-4" />}
                  {tutorialStep === 2 && <Wallet className="w-4 h-4" />}
                  {tutorialStep === 3 && <Sparkles className="w-4 h-4" />}
                  {tutorialStep === 4 && <Notebook className="w-4 h-4" />}
                  {tutorialStep === 5 && <BarChart3 className="w-4 h-4" />}
                  {tutorialStep === 6 && <MessageSquare className="w-4 h-4" />}
                  {tutorialStep === 7 && <Database className="w-4 h-4" />}
                  {tutorialStep === 8 && <Lock className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    style={{ color: theme === 'dark' ? '#ffffff' : '#0f172a' }}
                    className="text-xs sm:text-sm font-bold leading-tight font-sans tracking-tight"
                  >
                    {TUTORIAL_STEPS[tutorialStep].title}
                  </h3>
                  <p
                    style={{ color: theme === 'dark' ? '#cbd5e1' : '#475569' }}
                    className="text-[11px] sm:text-[11.5px] mt-0.5 leading-relaxed font-normal"
                  >
                    {TUTORIAL_STEPS[tutorialStep].description}
                  </p>
                </div>
              </div>

              {/* Feature Focus Box */}
              <div
                style={{
                  backgroundColor: theme === 'dark' ? '#0f192e' : '#f0f9ff',
                  borderColor: theme === 'dark' ? '#0284c7' : '#bae6fd'
                }}
                className="border p-2.5 rounded-lg my-2 space-y-0.5 shadow-2xs"
              >
                <div className="text-[9.5px] font-mono font-bold text-[#0284c7] dark:text-[#38bdf8] uppercase tracking-wider">
                  Key Focus
                </div>
                <p
                  style={{ color: theme === 'dark' ? '#ffffff' : '#0f172a' }}
                  className="text-[11.5px] sm:text-xs font-semibold leading-snug"
                >
                  {TUTORIAL_STEPS[tutorialStep].highlightText}
                </p>
                <div
                  style={{ color: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                  className="pt-0.5 text-[10.5px] sm:text-[11px] font-normal leading-normal"
                >
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Tip:</span> {TUTORIAL_STEPS[tutorialStep].tip}
                </div>
              </div>

              {/* Navigation Controls */}
              <div
                style={{ borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0' }}
                className="flex items-center justify-between pt-2 border-t mt-1"
              >
                <button
                  type="button"
                  onClick={handlePrevTutorialStep}
                  disabled={tutorialStep === 0}
                  style={{
                    backgroundColor: tutorialStep === 0 ? 'transparent' : (theme === 'dark' ? '#1e293b' : '#f1f5f9'),
                    color: tutorialStep === 0 ? '#64748b' : (theme === 'dark' ? '#ffffff' : '#0f172a'),
                    borderColor: theme === 'dark' ? '#334155' : '#cbd5e1'
                  }}
                  className={`px-2.5 sm:px-3 py-1 rounded-md text-[11px] sm:text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer active:scale-95 border ${
                    tutorialStep === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90'
                  }`}
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleNextTutorialStep}
                    className="px-3 sm:px-3.5 py-1 rounded-md text-[11px] sm:text-xs font-semibold bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-2xs transition-all flex items-center gap-1 cursor-pointer active:scale-95 hover:shadow-xs"
                  >
                    <span>{tutorialStep === TUTORIAL_STEPS.length - 1 ? 'Finish Tour 🎉' : 'Next Feature'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

    </div>
  );
}

