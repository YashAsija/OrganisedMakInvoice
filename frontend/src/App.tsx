import React, { useState, useEffect, useRef } from 'react';
import { PinSetupModal } from './components/PinSetupModal';
import type { User } from '@supabase/supabase-js';
import { supabase, handleSupabaseError, OperationType, isSupabaseConfigured } from './lib/supabase';
import { Invoice, BusinessProfile, PresetItem, InvoiceStatus, ClientProfile, Expense, InvoiceTemplate } from './types';
import { getSampleInvoice, BUSINESS_TEMPLATES } from './lib/presets';
import { getSecuritySettings, saveSecuritySettings, SecuritySettings, hashPin, hashPinPBKDF2, generateSalt, hashAnswer, saveSecurityQuestions, clearSecurityQuestions } from './lib/biometrics';
import type { PinSetupSecQPayload } from './components/PinSetupModal';
import { getDeviceId } from './lib/sessionManager';
import { emitNotification } from './lib/notifications';
import { MakLoader } from './components/MakLoader';

import { getLocalizationConfig } from './lib/localizationEngine';
import { getTierLimits, getCurrentBillingCycleWindow } from './lib/subscriptionGuard';
import { SubscriptionProvider } from './lib/subscriptionContext';
import {
  pushMasterRegistriesToCloud,
  getLocalMasterRegistry,
  markRegistryKeyDeleted,
  unmarkRegistryKeyDeleted,
  isPartyMatch,
  mergePartyRecords,
  deduplicatePartyList
} from './lib/masterRegistrySync';
import { upsertMasterRegistry, buildClientDetails, isSalesDocument, isPurchaseDocument } from './lib/documentUtils';

const ALLOWED_SUPABASE_COLUMNS = [
  'id', 'userId', 'invoiceType', 'invoiceNumber', 'referenceNumber', 'poNumber', 'date', 
  'dueDate', 'clientName', 'clientEmail', 'clientPhone', 'clientAddress', 'clientCompany', 'clientCompanyName',
  'clientGstin', 'clientPan', 'clientState', 'clientCountry', 'clientGST', 'notes', 
  'invoiceTerms', 'terms', 'subtotal', 'discountType', 'discountValue', 'discountTotal', 
  'taxTotal', 'taxAmount', 'grandTotal', 'totalAmount', 'discount', 'currency', 'status', 
  'items', 'paidDate', 'recurringSettings', 'parentInvoiceId', 'selectedTemplateStyle',
  'selectedCustomTemplateId', 'qrCodeTriggerUrl', 'companyState', 'companyCountry',
  'customTaxCols', 'taxMode', 'customTaxName', 'customTaxPercentage', 'customTaxType',
  'additionalTaxes', 'placeOfSupply', 'grRrNo', 'transport', 'vehicleNo', 'driverMobile',
  'station', 'ewayBillNo', 'marka', 'shippedToName', 'shippedToCompanyName', 'shippedToPhone', 'shippedToEmail', 
  'shippedToPan', 'shippedToState', 'shippedToCountry', 'shippedToGstin', 
  'shippedToAddress', 'embeddedTemplate', 'isDeleted', 'deletedAt', 'deliveryNote',
  'invoiceDate', 'isBin', 'freightCharges', 'packagingCharges', 'otherCharges', 
  'roundOff', 'bankDetails', 'signature', 'companyName', 'companyAddress', 'companyPhone',
  'companyEmail', 'companyGstin', 'companyPan', 'companyLogo', 'updatedAt'
];


// Global error and rejection handlers to suppress development error overlays for network blocks (adblockers/extensions)
if (typeof window !== 'undefined') {
  // Suppress Next.js Console TypeError overlay by routing network-related console.errors to console.warn
  const originalConsoleError = console.error;
  console.error = function (...args) {
    const errorString = args.map(arg => (arg instanceof Error ? arg.message : String(arg))).join(' ');
    if (
      errorString.includes('Failed to fetch') ||
      errorString.includes('TypeError') ||
      errorString.includes('SUPABASE') ||
      errorString.includes('Supabase') ||
      errorString.includes('same key') ||
      errorString.includes('Encountered two children with the same key')
    ) {
      console.warn('[Suppressed Next.js Overlay] Suppressed console.error:', ...args);
      return;
    }
    originalConsoleError.apply(console, args);
  };

  window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason?.message || '';
    if (msg.includes('Failed to fetch') || event.reason?.name === 'TypeError') {
      event.preventDefault();
      console.warn('Suppressed fetch rejection:', event.reason);
    }
  });
  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (msg.includes('Failed to fetch') || msg.includes('TypeError')) {
      event.preventDefault();
      console.warn('Suppressed fetch error:', event.message);
    }
  });
}

// Sub-components
import { Suspense, lazy } from 'react';
import dynamic from 'next/dynamic';
import { useConfirm } from './components/ConfirmContext';
import Homepage from './components/Homepage';
import AuthScreen from './components/AuthScreen';

// Code-split heavy workspace components so Homepage loads in milliseconds
const Dashboard = dynamic(() => import('./components/Dashboard'), {
  loading: () => <MakLoader variant="full-screen" label="Loading Dashboard..." />,
  ssr: false,
});
const BusinessProfileModal = dynamic(() => import('./components/BusinessProfileModal'), { ssr: false });
const InvoiceModal = dynamic(() => import('./components/InvoiceModal'), { ssr: false });
const BiometricVerification = dynamic(() => import('./components/BiometricVerification'), { ssr: false });

// Dynamic code-splitting for secondary public pages
const PricingPage = dynamic(() => import('./components/PricingPage'), { ssr: false });
const GuidePage = dynamic(() => import('./components/GuidePage'), { ssr: false });
const ContactPage = dynamic(() => import('./components/ContactPage'), { ssr: false });
const SecurityPage = dynamic(() => import('./components/SecurityPage'), { ssr: false });
const TermsPage = dynamic(() => import('./components/TermsPage'), { ssr: false });
const PrivacyPage = dynamic(() => import('./components/PrivacyPage'), { ssr: false });
const AboutPage = dynamic(() => import('./components/AboutPage'), { ssr: false });
// Path to Sidebar Tab Mapping Definitions
const tabToPath: Record<string, string> = {
  dashboard: '/dashboard',
  learn: '/learn',
  invoice_templates: '/invoice-templates',
  invoices: '/invoices',
  'invoices/invoice': '/invoices/tax-invoices',
  'invoices/proforma': '/invoices/proforma-invoices',
  'invoices/credit_note': '/invoices/credit-notes',
  'invoices/quote': '/invoices/quotes-estimates',
  purchases: '/purchases',
  'purchases/purchases': '/purchases/purchases',
  'purchases/purchase_order': '/purchases/purchase-order',
  'purchases/purchase_debit_note': '/purchases/debit-note',
  drafts: '/drafts',
  clients: '/clients',
  reports: '/reports',
  profile: '/profile',
  master_vendor: '/master-vendor',
  master_hsn: '/master-hsn',
  master_transport: '/master-transport',
  catalog_material: '/catalog-material',
  catalog_category: '/catalog-category',
  settings: '/settings',
  support: '/support',
  'support-chat': '/support-chat',
  subscription: '/subscription',
  expenses: '/expenses',
  payments: '/payments',
};

const pathToTab: Record<string, string> = Object.entries(tabToPath).reduce(
  (acc, [tab, path]) => ({ ...acc, [path]: tab }),
  {} as Record<string, string>
);

export default function App() {
  const { confirm } = useConfirm();

  const showToast = (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mak_notification', {
        detail: { title, message, type }
      }));
    }
  };

  const resolveSessionUid = async (): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id || user?.id;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uid && uuidRegex.test(uid)) {
        return uid;
      }
    } catch (e) {
      console.warn('[resolveSessionUid] Error retrieving session:', e);
    }
    return null;
  };

  // Theme & Network states
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const cached = localStorage.getItem('invoice_maker_theme');
    if (cached === 'light' || cached === 'dark') return cached;
    return 'light'; // default light theme for professional premium readability
  });

  // Security Lock state
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(() => getSecuritySettings());
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => !getSecuritySettings().isPinLockEnabled);

  useEffect(() => {
    const checkPinStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setIsUnlocked(true);
        return;
      }

      const { data, error } = await supabase
        .from('user_pin_security')
        .select('is_pin_enabled')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error || !data) {
        // fallback to local cache if server unreachable/no row
        setIsUnlocked(!getSecuritySettings().isPinLockEnabled);
        return;
      }

      const localSettings = getSecuritySettings();
      if (localSettings.isPinLockEnabled !== data.is_pin_enabled) {
        const updatedSettings = { ...localSettings, isPinLockEnabled: data.is_pin_enabled };
        setSecuritySettings(updatedSettings);
        localStorage.setItem('invoice_maker_security', JSON.stringify(updatedSettings));
      }

      setIsUnlocked(!data.is_pin_enabled);
    };
    checkPinStatus();
  }, []);

  // User details
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const hasCachedEmail = !!localStorage.getItem('makbills_custom_email');
      const hasSbToken = Object.keys(localStorage).some(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      const hasUrlParams = window.location.search.includes('code=') ||
                           window.location.hash.includes('access_token=') ||
                           window.location.hash.includes('type=recovery');
      // If user is guest and not resolving an auth redirect, don't block the UI
      return hasCachedEmail || hasSbToken || hasUrlParams;
    }
    return false;
  });
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    return localStorage.getItem('makbills_custom_email') || null;
  });
  const [isPasswordResetMode, setIsPasswordResetMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.location.hash.includes('type=recovery') ||
             window.location.search.includes('type=recovery') ||
             window.location.pathname.includes('reset-password');
    }
    return false;
  });
  const [urlAuthError, setUrlAuthError] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search;
      const hash = window.location.hash;
      if (search.includes('error=') || hash.includes('error=') || search.includes('error_code=') || hash.includes('error_code=')) {
        try {
          const searchParams = new URLSearchParams(search);
          const hashParams = new URLSearchParams(hash.replace(/^#/, '?'));
          const desc = searchParams.get('error_description') || hashParams.get('error_description');
          const code = searchParams.get('error_code') || hashParams.get('error_code');
          if (code === 'otp_expired' || (desc && desc.toLowerCase().includes('expired'))) {
            return 'This verification or reset link has expired or has already been used. Please log in or request a new link.';
          }
          return desc ? decodeURIComponent(desc.replace(/\+/g, ' ')) : 'Authentication link is invalid or has expired.';
        } catch (e) {}
      }
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path === '/dashboard' || path === '/') {
        return 'dashboard';
      }
      if (path.startsWith('/invoice-templates')) {
        return 'invoice_templates';
      }
      if (path.startsWith('/purchases')) {
        return 'purchases';
      }
      if (path.startsWith('/payments')) {
        return 'payments';
      }
      if (path.startsWith('/expenses')) {
        return 'expenses';
      }
      if (path.startsWith('/invoices')) {
        return 'invoices';
      }
      return pathToTab[path] || 'invoices';
    }
    return 'invoices';
  });

  const [publicPath, setPublicPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      return ['/pricing', '/guide', '/contact', '/security', '/terms', '/privacy', '/features', '/faq', '/login', '/signup'].includes(path) ? path : '/';
    }
    return '/';
  });

  const suffix = userEmail ? `_${encodeURIComponent(userEmail)}` : '';

  const markInvoicePendingSync = (id: string) => {
    setInvoices(prev => {
      const updated = prev.map(inv => inv.id === id ? { ...inv, _pendingSync: true } : inv);
      localStorage.setItem(`invoice_maker_invoices${suffix}`, JSON.stringify(updated));
      localStorage.setItem('invoice_maker_invoices', JSON.stringify(updated));
      return updated;
    });
  };

  const markClientPendingSync = (id: string) => {
    setClients(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, _pendingSync: true } : c);
      localStorage.setItem(`invoice_maker_clients${suffix}`, JSON.stringify(updated));
      return updated;
    });
  };

  const markExpensePendingSync = (id: string) => {
    setExpenses(prev => {
      const updated = prev.map(e => e.id === id ? { ...e, _pendingSync: true } : e);
      localStorage.setItem(`invoice_maker_expenses${suffix}`, JSON.stringify(updated));
      return updated;
    });
  };

  const markInvoicePendingDelete = (id: string) => {
    try {
      const raw = localStorage.getItem(`invoice_maker_invoices${suffix}`) || '[]';
      const parsed: Invoice[] = JSON.parse(raw);
      const updated = parsed.map(inv => inv.id === id ? { ...inv, _pendingDelete: true } : inv);
      localStorage.setItem(`invoice_maker_invoices${suffix}`, JSON.stringify(updated));
      localStorage.setItem('invoice_maker_invoices', JSON.stringify(updated));
    } catch (e) {}
  };

  const markClientPendingDelete = (id: string) => {
    try {
      const raw = localStorage.getItem(`invoice_maker_clients${suffix}`) || '[]';
      const parsed: ClientProfile[] = JSON.parse(raw);
      const updated = parsed.map(c => c.id === id ? { ...c, _pendingDelete: true } : c);
      localStorage.setItem(`invoice_maker_clients${suffix}`, JSON.stringify(updated));
    } catch (e) {}
  };

  const markExpensePendingDelete = (id: string) => {
    try {
      const raw = localStorage.getItem(`invoice_maker_expenses${suffix}`) || '[]';
      const parsed: Expense[] = JSON.parse(raw);
      const updated = parsed.map(ex => ex.id === id ? { ...ex, _pendingDelete: true } : ex);
      localStorage.setItem(`invoice_maker_expenses${suffix}`, JSON.stringify(updated));
    } catch (e) {}
  };

  const sanitizeClientForSync = (client: ClientProfile, authUid: string): any => {
    const copy = { ...client, userId: authUid };
    delete (copy as any)._pendingSync;
    delete (copy as any)._pendingDelete;
    return copy;
  };

  const sanitizeExpenseForSync = (expense: Expense, authUid: string): any => {
    const copy = { ...expense, userId: authUid };
    delete (copy as any)._pendingSync;
    delete (copy as any)._pendingDelete;
    return copy;
  };

  const isSyncingRef = useRef(false);
  const triggerBackgroundSync = async () => {
    if (isSyncingRef.current) return;
    const activeUid = await resolveSessionUid();
    if (!activeUid) return;

    isSyncingRef.current = true;
    let syncCount = 0;

    try {
      // 1. Sync Invoices
      const rawInvoices = localStorage.getItem(`invoice_maker_invoices${suffix}`) || '[]';
      const parsedInvoices: Invoice[] = JSON.parse(rawInvoices);
      let updatedInvoicesList = [...parsedInvoices];
      let invoicesChanged = false;

      for (const inv of parsedInvoices) {
        if (inv._pendingDelete) {
          const { error } = await supabase.from('invoices').delete().eq('id', inv.id).eq('userId', activeUid);
          if (!error) {
            updatedInvoicesList = updatedInvoicesList.filter(i => i.id !== inv.id);
            invoicesChanged = true;
            syncCount++;
          } else {
            console.warn('[BgSync] Hard-delete failed:', inv.id, error.code, error.message);
          }
        } else if (inv._pendingSync) {
          if (inv.isDeleted) {
            // Soft-delete retry: use targeted .update() to avoid NOT NULL upsert failure
            const { error } = await supabase.from('invoices')
              .update({ isDeleted: true, deletedAt: inv.deletedAt || new Date().toISOString() })
              .eq('id', inv.id)
              .eq('userId', activeUid);
            if (!error) {
              updatedInvoicesList = updatedInvoicesList.map(i => i.id === inv.id ? { ...i, _pendingSync: undefined } : i);
              invoicesChanged = true;
              syncCount++;
            } else {
              console.warn('[BgSync] Soft-delete retry failed:', inv.id, error.code, error.message);
            }
          } else {
            // Normal save retry: full upsert with all fields
            const dataToSync = sanitizeInvoiceForSync(inv, activeUid);
            const { error } = await supabase.from('invoices').upsert(dataToSync);
            if (!error) {
              updatedInvoicesList = updatedInvoicesList.map(i => i.id === inv.id ? { ...i, _pendingSync: undefined } : i);
              invoicesChanged = true;
              syncCount++;
            } else {
              console.warn('[BgSync] Save retry failed:', inv.id, error.code, error.message);
            }
          }
        }
      }

      if (invoicesChanged) {
        setInvoices(updatedInvoicesList.filter(inv => !inv._pendingDelete));
        localStorage.setItem(`invoice_maker_invoices${suffix}`, JSON.stringify(updatedInvoicesList));
        localStorage.setItem('invoice_maker_invoices', JSON.stringify(updatedInvoicesList));
      }

      // 2. Sync Clients
      const rawClients = localStorage.getItem(`invoice_maker_clients${suffix}`) || '[]';
      const parsedClients: ClientProfile[] = JSON.parse(rawClients);
      let updatedClientsList = [...parsedClients];
      let clientsChanged = false;

      for (const c of parsedClients) {
        if (c._pendingDelete) {
          const { error } = await supabase.from('clients').delete().eq('id', c.id).eq('userId', activeUid);
          if (!error) {
            updatedClientsList = updatedClientsList.filter(item => item.id !== c.id);
            clientsChanged = true;
            syncCount++;
          }
        } else if (c._pendingSync) {
          const clientWithUser = sanitizeClientForSync(c, activeUid);
          const { error } = await supabase.from('clients').upsert(clientWithUser);
          if (!error) {
            updatedClientsList = updatedClientsList.map(item => item.id === c.id ? { ...item, _pendingSync: undefined } : item);
            clientsChanged = true;
            syncCount++;
          }
        }
      }

      if (clientsChanged) {
        setClients(updatedClientsList.filter(c => !c._pendingDelete));
        localStorage.setItem(`invoice_maker_clients${suffix}`, JSON.stringify(updatedClientsList));
      }

      // 3. Sync Expenses
      const rawExpenses = localStorage.getItem(`invoice_maker_expenses${suffix}`) || '[]';
      const parsedExpenses: Expense[] = JSON.parse(rawExpenses);
      let updatedExpensesList = [...parsedExpenses];
      let expensesChanged = false;

      for (const ex of parsedExpenses) {
        if (ex._pendingDelete) {
          const { error } = await supabase.from('expenses').delete().eq('id', ex.id).eq('userId', activeUid);
          if (!error) {
            updatedExpensesList = updatedExpensesList.filter(item => item.id !== ex.id);
            expensesChanged = true;
            syncCount++;
          }
        } else if (ex._pendingSync) {
          const expenseWithUser = sanitizeExpenseForSync(ex, activeUid);
          const { error } = await supabase.from('expenses').upsert(expenseWithUser);
          if (!error) {
            updatedExpensesList = updatedExpensesList.map(item => item.id === ex.id ? { ...item, _pendingSync: undefined } : item);
            expensesChanged = true;
            syncCount++;
          }
        }
      }

      if (expensesChanged) {
        setExpenses(updatedExpensesList.filter(ex => !ex._pendingDelete));
        localStorage.setItem(`invoice_maker_expenses${suffix}`, JSON.stringify(updatedExpensesList));
      }

      if (syncCount > 0) {
        showToast('Sync Successful', `Successfully synced ${syncCount} pending update(s) to the cloud!`, 'success');
      }
    } catch (e) {
      console.warn('[triggerBackgroundSync] Sync failed:', e);
    } finally {
      isSyncingRef.current = false;
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', triggerBackgroundSync);
      return () => window.removeEventListener('online', triggerBackgroundSync);
    }
  }, [suffix]);

  useEffect(() => {
    if (userEmail) {
      triggerBackgroundSync();
    }
  }, [userEmail, user]);

  // Main Business state - initialized synchronously from local storage cache for instant 0ms mount
  const [profile, setProfile] = useState<BusinessProfile>(() => {
    if (typeof window !== "undefined") {
      const activeEmail = localStorage.getItem('makbills_custom_email');
      const sfx = activeEmail ? `_${encodeURIComponent(activeEmail)}` : '';
      const localProfile = localStorage.getItem(`invoice_maker_biz_profile${sfx}`);
      if (localProfile) {
        try {
          return JSON.parse(localProfile);
        } catch (e) {}
      }
    }
    return {
      uid: '',
      name: '',
      email: '',
      phone: '',
      address: '',
      taxId: '',
      currency: 'INR',
      defaultTaxRate: 18,
      updatedAt: new Date().toISOString()
    };
  });

  const [subscriptionTier, setSubscriptionTier] = useState<'free' | 'basic' | 'pro' | 'unlimited' | 'enterprise' | null>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem('makbills_subscription_tier') as any) || 'free';
    }
    return null;
  });

  useEffect(() => {
    const handleSubChange = (e: any) => {
      const newTier = e.detail || localStorage.getItem('makbills_subscription_tier') || 'free';
      setSubscriptionTier(prev => (prev === newTier ? prev : (newTier as any)));
    };
    window.addEventListener('mak_subscription_change', handleSubChange);
    window.addEventListener('storage', handleSubChange);
    return () => {
      window.removeEventListener('mak_subscription_change', handleSubChange);
      window.removeEventListener('storage', handleSubChange);
    };
  }, []);

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    if (typeof window !== "undefined") {
      const activeEmail = localStorage.getItem('makbills_custom_email');
      const sfx = activeEmail ? `_${encodeURIComponent(activeEmail)}` : '';
      const localRaw = localStorage.getItem(`invoice_maker_invoices${sfx}`);
      if (localRaw) {
        try {
          const list = JSON.parse(localRaw);
          if (Array.isArray(list)) return list.filter((inv: any) => !inv._pendingDelete);
        } catch (e) {}
      }
    }
    return [];
  });
  const isCloudLoadedRef = useRef<boolean>(false);
  const [presets, setPresets] = useState<PresetItem[]>(() => {
    if (typeof window !== "undefined") {
      const activeEmail = localStorage.getItem('makbills_custom_email');
      const sfx = activeEmail ? `_${encodeURIComponent(activeEmail)}` : '';
      const localPresets = localStorage.getItem(`invoice_maker_presets${sfx}`);
      if (localPresets) {
        try {
          return JSON.parse(localPresets);
        } catch (e) {}
      }
    }
    return [];
  });
  const [clients, setClients] = useState<ClientProfile[]>(() => {
    if (typeof window !== "undefined") {
      const activeEmail = localStorage.getItem('makbills_custom_email');
      const sfx = activeEmail ? `_${encodeURIComponent(activeEmail)}` : '';
      const localClients = localStorage.getItem(`invoice_maker_clients${sfx}`);
      if (localClients) {
        try {
          const parsed = JSON.parse(localClients);
          if (Array.isArray(parsed)) return parsed.filter((c: any) => !c._pendingDelete);
        } catch (e) {}
      }
    }
    return [];
  });
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    if (typeof window !== "undefined") {
      const activeEmail = localStorage.getItem('makbills_custom_email');
      const sfx = activeEmail ? `_${encodeURIComponent(activeEmail)}` : '';
      const localExpenses = localStorage.getItem(`invoice_maker_expenses${sfx}`);
      if (localExpenses) {
        try {
          const parsed = JSON.parse(localExpenses);
          if (Array.isArray(parsed)) return parsed.filter((ex: any) => !ex._pendingDelete);
        } catch (e) {}
      }
    }
    return [];
  });
  const [customTemplates, setCustomTemplates] = useState<InvoiceTemplate[]>(() => {
    if (typeof window !== "undefined") {
      const localTemplates = localStorage.getItem('makbills_custom_templates');
      if (localTemplates) {
        try {
          return JSON.parse(localTemplates);
        } catch (e) {}
      }
    }
    return [];
  });

  // Periodic background sync every 90s when there are pending items
  // (placed after state declarations so invoices/clients/expenses are in scope)
  useEffect(() => {
    const interval = setInterval(() => {
      const hasPending = invoices.some(i => i._pendingSync || i._pendingDelete)
        || clients.some(c => c._pendingSync || c._pendingDelete)
        || expenses.some(e => e._pendingSync || e._pendingDelete);
      if (hasPending && userEmail) {
        triggerBackgroundSync();
      }
    }, 90_000);
    return () => clearInterval(interval);
  }, [invoices, clients, expenses, userEmail]);

  // Modals active states
  const [isProfileOpen, setIsProfileOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname === '/company-settings';
    }
    return false;
  });
  const [isInvoiceEditorOpen, setIsInvoiceEditorOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname === '/quick-bill';
    }
    return false;
  });
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isOnboarding, setIsOnboarding] = useState(false);

  // --- INITIALIZE THEME AND CONNECTIVITY LISTENERS ---
  useEffect(() => {
    // Apply theme
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('invoice_maker_theme', theme);
  }, [theme]);

  // --- SYNC BROWSER URL PATH WITH DASHBOARD STATE ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (isAuthLoading) return;
      
      const path = window.location.pathname;
      if (userEmail) {
        let expectedPath = tabToPath[activeTab] || '/dashboard';
        if (isInvoiceEditorOpen) {
          expectedPath = '/quick-bill';
        } else if (isProfileOpen) {
          expectedPath = '/company-settings';
        } else if (activeTab === 'dashboard') {
          if (path === '/dashboard' || path === '/') {
            expectedPath = path;
          }
        } else if (activeTab === 'invoices') {
          if (path.startsWith('/invoices')) {
            expectedPath = path;
          }
        } else if (activeTab === 'purchases') {
          if (path.startsWith('/purchases')) {
            expectedPath = path;
          }
        } else if (activeTab === 'invoice_templates') {
          if (path.startsWith('/invoice-templates')) {
            expectedPath = path;
          }
        }
        if (path !== expectedPath) {
          window.history.replaceState(null, '', expectedPath);
        }
      } else {
        const expectedPath = publicPath;
        const currentPath = window.location.pathname;
        const currentSearch = window.location.search;
        const currentHash = window.location.hash;
        // Don't overwrite if query params like ?token= or ?code= or ?verified= are present
        if (currentPath !== expectedPath && !currentSearch.includes('token=') && !currentSearch.includes('code=')) {
          window.history.replaceState(null, '', expectedPath);
        }
      }
    }
  }, [userEmail, activeTab, publicPath, isInvoiceEditorOpen, isProfileOpen, isAuthLoading]);

  // --- HANDLE BROWSER BACK/FORWARD BUTTONS (POPSTATE) ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handlePopState = () => {
        const path = window.location.pathname;
        if (userEmail) {
          if (path === '/quick-bill') {
            setIsInvoiceEditorOpen(true);
            setEditingInvoice(null);
            setIsProfileOpen(false);
          } else if (path === '/company-settings') {
            setIsProfileOpen(true);
            setIsInvoiceEditorOpen(false);
          } else {
            setIsInvoiceEditorOpen(false);
            setIsProfileOpen(false);
            
            let matchedTab = pathToTab[path];
            if (path.startsWith('/invoice-templates')) {
              matchedTab = 'invoice_templates';
            } else if (path.startsWith('/purchases')) {
              matchedTab = 'purchases';
            }
            
            if (matchedTab) {
              setActiveTab(matchedTab);
            } else if (path === '/' || path === '/dashboard') {
              setActiveTab('dashboard');
            }
          }
        } else {
          setPublicPath(['/pricing', '/guide', '/contact', '/security', '/terms', '/privacy', '/features', '/faq', '/login', '/signup'].includes(path) ? path : '/');
        }
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [userEmail]);

  // Global listener for tab navigation (e.g. from Upgrade to Unlock buttons inside modals)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleNavigateTab = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (detail) {
          setIsInvoiceEditorOpen(false);
          setIsProfileOpen(false);
          setActiveTab(detail);
        }
      };
      window.addEventListener('mak_navigate_tab', handleNavigateTab);
      return () => window.removeEventListener('mak_navigate_tab', handleNavigateTab);
    }
  }, []);


  useEffect(() => {
    return () => {    };
  }, []);

  // --- PIN SETUP MODAL STATE ---
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<'enable' | 'disable'>('enable');
  const [pinModalLoading, setPinModalLoading] = useState(false);
  const [pinModalError, setPinModalError] = useState('');

  // --- INITIALIZE SECURITY SETTINGS OR RE-SYNC ON EDIT ---
  const handleToggleSecurity = async (type: 'pin' | 'bio') => {
    if (type !== 'pin') return;
    const current = getSecuritySettings();
    const enable = !current.isPinLockEnabled;

    if (enable && !navigator.onLine) {
      setPinModalError('You must be online to set or enable a PIN lock.');
    }

    setPinModalMode(enable ? 'enable' : 'disable');
    setPinModalError('');
    setPinModalOpen(true);
  };

  const handlePinConfirm = async (
    rawPin: string,
    secQRaw?: PinSetupSecQPayload
  ) => {
    const current = getSecuritySettings();
    const enable = !current.isPinLockEnabled;
    setPinModalLoading(true);
    setPinModalError('');
    let pinVal = '';
    let salt: string | undefined;
    if (enable) {
      if (!navigator.onLine) {
        setPinModalLoading(false);
        setPinModalError('You must be online to set or enable a PIN lock.');
        return;
      }
      // Use PBKDF2 with random salt (new users and PIN changes)
      salt = await generateSalt();
      pinVal = await hashPinPBKDF2(rawPin, salt);

      // Sync to backend when online + logged in
      if (user) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) {
            const { error } = await supabase
              .from('user_pin_security')
              .upsert({
                user_id: session.user.id,
                hashed_pin: pinVal,
                salt: salt,
                is_pin_enabled: true,
                updated_at: new Date().toISOString()
              });
            if (error) {
              throw error;
            }
          }
        } catch (err) {
          console.warn('[PIN] Could not sync PIN to server, proceeding locally anyway.', err);
        }
      }

      // Hash and persist security questions if provided
      if (secQRaw?.q1 && secQRaw?._rawA1 && secQRaw?.q2 && secQRaw?._rawA2) {
        try {
          const a1Salt = await generateSalt();
          const a2Salt = await generateSalt();
          const a1Hash = await hashAnswer(secQRaw._rawA1, a1Salt);
          const a2Hash = await hashAnswer(secQRaw._rawA2, a2Salt);
          saveSecurityQuestions({
            q1: secQRaw.q1,
            a1Hash,
            a1Salt,
            q2: secQRaw.q2,
            a2Hash,
            a2Salt,
          });
        } catch (err) {
          console.warn('[PIN] Could not save security questions.', err);
        }
      }

      setPinModalLoading(false);
      setPinModalOpen(false);
    } else {
      // Disabling PIN — disable server side too
      if (user) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) {
            const { error } = await supabase
              .from('user_pin_security')
              .update({ is_pin_enabled: false })
              .eq('user_id', session.user.id);
            if (error) throw error;
          }
        } catch {
          console.warn('[PIN] Could not clear PIN on server.');
        }
      }
      // Also clear security questions from local storage
      clearSecurityQuestions();
    }

    const updated: SecuritySettings = {
      ...current,
      isPinLockEnabled: enable,
    };

    setSecuritySettings(updated);
    saveSecuritySettings(updated);

    if (user) {
      supabase.channel(`security_updates:${user.id}`).send({
        type: 'broadcast',
        event: 'security_changed',
        payload: { isPinLockEnabled: enable }
      }).catch(() => {});
    }

    setPinModalLoading(false);
    setPinModalOpen(false);
  };


  // --- LOCAL CACHING LOAD MECHANISM (OFFLINE CAPABILITIES) ---
  const loadLocalData = (emailParam?: string | null, force: boolean = false) => {
    if (!force && isCloudLoadedRef.current) {
      console.log('[loadLocalData] Skipping offline sync because cloud data is already loaded and active.');
      return;
    }
    const activeEmail = emailParam !== undefined ? emailParam : userEmail;
    const suffix = activeEmail ? `_${encodeURIComponent(activeEmail)}` : '';

    // Profile
    const localProfile = localStorage.getItem(`invoice_maker_biz_profile${suffix}`);
    if (localProfile) {
      try {
        setProfile(JSON.parse(localProfile));
      } catch (e) {
        console.warn('Failed to parse local profile, using auto-localized default', e);
        const locConfig = getLocalizationConfig();
        setProfile({
          uid: user?.id || '',
          name: '',
          email: activeEmail || '',
          phone: '',
          address: '',
          taxId: '',
          currency: locConfig.currency,
          defaultTaxRate: locConfig.defaultTaxRate,
          updatedAt: new Date().toISOString()
        });
      }
    } else {
      const locConfig = getLocalizationConfig();
      setProfile({
        uid: user?.id || '',
        name: '',
        email: activeEmail || '',
        phone: '',
        address: '',
        taxId: '',
        currency: locConfig.currency,
        defaultTaxRate: locConfig.defaultTaxRate,
        updatedAt: new Date().toISOString()
      });
    }

    // Invoices list: strictly scoped to current user account
    const localRawInvoices = localStorage.getItem(`invoice_maker_invoices${suffix}`);
    if (localRawInvoices) {
      try {
        const list: Invoice[] = JSON.parse(localRawInvoices);
        if (Array.isArray(list)) {
          const visibleInvoicesList = list.filter((inv: any) => !inv._pendingDelete);
          setInvoices(visibleInvoicesList);
        } else {
          setInvoices([]);
        }
      } catch (e) {
        setInvoices([]);
      }
    } else {
      setInvoices([]);
    }

    // Presets catalog: strictly scoped to current user account
    const localPresets = localStorage.getItem(`invoice_maker_presets${suffix}`);
    if (localPresets) {
      try {
        setPresets(JSON.parse(localPresets));
      } catch (e) {
        console.warn('Failed to parse local presets');
        setPresets([]);
      }
    } else {
      setPresets([]);
    }

    // Clients list
    const localClients = localStorage.getItem(`invoice_maker_clients${suffix}`);
    if (localClients) {
      try {
        const parsedClients = JSON.parse(localClients);
        const visibleClients = parsedClients.filter((c: any) => !c._pendingDelete);
        setClients(visibleClients);
      } catch (e) {
        console.warn('Failed to parse local clients', e);
      }
    } else {
      setClients([]);
    }

    // Expenses list
    const localExpenses = localStorage.getItem(`invoice_maker_expenses${suffix}`);
    if (localExpenses) {
      try {
        const parsedExpenses = JSON.parse(localExpenses);
        const visibleExpenses = parsedExpenses.filter((ex: any) => !ex._pendingDelete);
        setExpenses(visibleExpenses);
      } catch (e) {
        console.warn('Failed to parse local expenses', e);
      }
    } else {
      setExpenses([]);
    }

    // Custom Templates
    const localTemplates = localStorage.getItem('makbills_custom_templates');
    if (localTemplates) {
      try {
        setCustomTemplates(JSON.parse(localTemplates));
      } catch (e) {
        console.warn('Failed to parse local templates', e);
      }
    } else {
      setCustomTemplates([]);
    }
  };

  // --- CONNECT SUPABASE LISTENERS OR DEGRADE GRACEFULLY (CLOUD SYNCING) ---
  useEffect(() => {
    // Always register the auth listener regardless of PIN lock so that login/logout
    // properly sets userEmail and navigates away from the homepage.
    // Data sync is separately gated by isUnlocked (see the effect below).

    let activeChannels: any[] = [];

    const cleanupActiveListeners = async () => {
      for (const item of activeChannels) {
        try {
          if (item && typeof item.unsubscribe === 'function') {
            await item.unsubscribe();
          } else if (item) {
            await supabase.removeChannel(item);
          }
        } catch (e) {
          console.warn('Error cleaning up active listener:', String(e));
        }
      }
      activeChannels = [];
    };

    const syncUserData = async (currentUser: any, event: string) => {
      try {
        await cleanupActiveListeners();

        if (currentUser) {
          const activeEmail = currentUser.email ?? currentUser.phone ?? null;
          const lastUser = typeof window !== 'undefined' ? localStorage.getItem('makbills_last_user') : null;
          
          if (activeEmail && lastUser && activeEmail !== lastUser) {
            const locConfig = getLocalizationConfig();
            setProfile({
              uid: '',
              name: '',
              displayName: '',
              ownerName: '',
              email: activeEmail || '',
              phone: '',
              mobile: '',
              address: '',
              taxId: '',
              pan: '',
              currency: locConfig.currency || 'INR',
              defaultTaxRate: locConfig.defaultTaxRate || 18,
              bankName: '',
              accountNumber: '',
              ifsc: '',
              upiId: '',
              logoUrl: '',
              signature: '',
              updatedAt: new Date().toISOString()
            });
            setInvoices([]);
            setClients([]);
            setExpenses([]);
            setPresets([]);
            setCustomTemplates([]);
            if (typeof window !== 'undefined') {
              localStorage.removeItem('makbills_custom_email');
              localStorage.removeItem('makbills_custom_brand');
              localStorage.removeItem('makbills_custom_phone');
              localStorage.removeItem('makbills_custom_owner');
              localStorage.removeItem('invoice_maker_biz_profile');
              localStorage.removeItem('invoice_maker_invoices');
              localStorage.removeItem('invoice_maker_clients');
              localStorage.removeItem('invoice_maker_expenses');
              localStorage.removeItem('invoice_maker_presets');
              localStorage.removeItem('makbills_custom_templates');
              localStorage.removeItem('makbills_masters_vendors');
              localStorage.removeItem('makbills_masters_actual_vendors');
              localStorage.removeItem('makbills_masters_transports');
              localStorage.removeItem('makbills_masters_hsn');
              localStorage.removeItem('makbills_masters_materials');
              localStorage.removeItem('makbills_masters_categories');
              localStorage.removeItem('makbills_masters_subcategories');
              localStorage.removeItem('makbills_masters_gl');
              localStorage.removeItem('makbills_masters_mappings');
            }
          }
          if (activeEmail && typeof window !== 'undefined') {
            localStorage.setItem('makbills_last_user', activeEmail);
            localStorage.setItem('makbills_custom_email', activeEmail);
          }

          setUser(currentUser);
          setUserEmail(activeEmail);
          const suffix = activeEmail ? `_${encodeURIComponent(activeEmail)}` : '';
          const uid = currentUser.id;

          // Reset cloud flag and load user data immediately so Sales Ledger & all records appear in 0ms without page refresh!
          isCloudLoadedRef.current = false;
          loadLocalData(activeEmail, true);

          // 1. Fetch Cloud Profile (users table) + company_settings for full details
          try {
            const { data: cloudProf } = await supabase
              .from('users')
              .select('*')
              .eq('uid', uid)
              .single();

            const { data: companySettings } = await supabase
              .from('company_settings')
              .select('*')
              .eq('user_id', uid)
              .single();

            const deriveCurrencyCode = (sym: string | null | undefined, fallback: string): string => {
              if (!sym) return fallback;
              const symToCode: Record<string, string> = {
                '₹': 'INR', '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY',
                'C$': 'CAD', 'A$': 'AUD', 'Fr': 'CHF', 'HK$': 'HKD', 'S$': 'SGD',
                'NZ$': 'NZD', '₩': 'KRW', 'R$': 'BRL', '₽': 'RUB', 'R': 'ZAR',
                '₺': 'TRY', 'kr': 'SEK', 'zł': 'PLN', '฿': 'THB', 'Rp': 'IDR',
                'RM': 'MYR', '₱': 'PHP', '₫': 'VND', '₦': 'NGN', '₪': 'ILS',
                'Kč': 'CZK', 'Ft': 'HUF', '₴': 'UAH', '₾': 'GEL', '₸': 'KZT',
                'NT$': 'TWD', '₵': 'GHS', 'KSh': 'KES', '₼': 'AZN',
                '﷼': 'SAR', 'د.إ': 'AED', '₮': 'MNT',
              };
              return symToCode[sym] || fallback;
            };

            if (cloudProf) {
              let extraConfig: any = {};
              if (companySettings && companySettings.custom_templates) {
                try {
                  extraConfig = typeof companySettings.custom_templates === 'string'
                    ? JSON.parse(companySettings.custom_templates)
                    : companySettings.custom_templates;
                } catch (e) {}
              }

              const mergedProf: BusinessProfile = companySettings ? {
                ...(cloudProf as BusinessProfile),
                name: companySettings.business_name || cloudProf.name || '',
                displayName: companySettings.owner_name || cloudProf.displayName || '',
                ownerName: companySettings.owner_name || cloudProf.ownerName || '',
                email: companySettings.email || cloudProf.email || '',
                phone: companySettings.mobile || cloudProf.phone || '',
                mobile: companySettings.mobile || '',
                address: companySettings.address || cloudProf.address || '',
                taxId: companySettings.gstin || cloudProf.taxId || '',
                pan: companySettings.pan || cloudProf.pan || '',
                logoUrl: companySettings.logo_url || cloudProf.logoUrl || '',
                signature: companySettings.signature_url ? `${companySettings.signature_url.split('?')[0]}?t=${Date.now()}` : (cloudProf.signature || ''),
                signatureSize: extraConfig.signatureSize || cloudProf.signatureSize || 150,
                signatureText: extraConfig.signatureText || extraConfig.signature_text || '',
                signatureFont: extraConfig.signatureFont || extraConfig.signature_font || 'Caveat',
                signatureMode: companySettings.signature_type || extraConfig.signatureMode || cloudProf.signatureMode || 'draw',
                country: companySettings.country || cloudProf.country || '',
                state: companySettings.state || cloudProf.state || '',
                stateCode: companySettings.state_code || cloudProf.stateCode || '',
                currency: companySettings.currency || deriveCurrencyCode(companySettings.currency_symbol, cloudProf.currency || 'INR'),
                currencySymbol: companySettings.currency_symbol || cloudProf.currencySymbol || '',
                taxMode: companySettings.tax_mode || cloudProf.taxMode || 'dynamic',
                customTaxName: companySettings.custom_tax_name || cloudProf.customTaxName || 'Tax',
                customTaxPercentage: companySettings.custom_tax_percentage !== undefined ? companySettings.custom_tax_percentage : cloudProf.customTaxPercentage,
                defaultTaxRate: companySettings.default_tax_rate !== undefined ? companySettings.default_tax_rate : (cloudProf.defaultTaxRate || 18),
                bankName: companySettings.bank_name || cloudProf.bankName || '',
                accountNumber: companySettings.account_number || cloudProf.accountNumber || '',
                ifsc: companySettings.ifsc || cloudProf.ifsc || '',
                upiId: companySettings.upi_id || cloudProf.upiId || '',
                qrPreference: companySettings.qr_preference || extraConfig.qrPreference || cloudProf.qrPreference || 'upi',
                documentSeparator: companySettings.document_separator || extraConfig.documentSeparator || cloudProf.documentSeparator || '-',
                invoicePrefix: companySettings.invoice_prefix || cloudProf.invoicePrefix || 'INV',
                startingInvoiceNumber: companySettings.starting_invoice_number || cloudProf.startingInvoiceNumber || '1',
                proformaPrefix: companySettings.proforma_prefix || cloudProf.proformaPrefix || 'PI',
                startingProformaNumber: companySettings.starting_proforma_number || cloudProf.startingProformaNumber || '1',
                debitNotePrefix: companySettings.debit_note_prefix || cloudProf.debitNotePrefix || 'DN',
                startingDebitNoteNumber: companySettings.starting_debit_note_number || cloudProf.startingDebitNoteNumber || '1',
                creditNotePrefix: companySettings.credit_note_prefix || cloudProf.creditNotePrefix || 'CN',
                startingCreditNoteNumber: companySettings.starting_credit_note_number || cloudProf.startingCreditNoteNumber || '1',
                quotePrefix: companySettings.quote_prefix || cloudProf.quotePrefix || 'EST',
                startingQuoteNumber: companySettings.starting_quote_number || cloudProf.startingQuoteNumber || '1',
                purchaseOrderPrefix: companySettings.purchase_order_prefix || cloudProf.purchaseOrderPrefix || 'PO',
                startingPurchaseOrderNumber: companySettings.starting_purchase_order_number || cloudProf.startingPurchaseOrderNumber || '1',
                purchasesPrefix: companySettings.purchases_prefix || cloudProf.purchasesPrefix || 'PUR',
                startingPurchasesNumber: companySettings.starting_purchases_number || cloudProf.startingPurchasesNumber || '1',
                defaultNotes: companySettings.default_notes || cloudProf.defaultNotes || '',
                defaultTerms: companySettings.default_terms || cloudProf.defaultTerms || '',
              } : (cloudProf as BusinessProfile);

              if (cloudProf.pin_hash) {
                const currentSec = getSecuritySettings();
                if (!currentSec.isPinLockEnabled) {
                  const newSec = { ...currentSec, isPinLockEnabled: true };
                  saveSecuritySettings(newSec);
                  setSecuritySettings(newSec);
                  setIsUnlocked(false);
                }
              }

              setProfile(mergedProf);
              localStorage.setItem(`invoice_maker_biz_profile${suffix}`, JSON.stringify(mergedProf));
            } else {
              const initProf: BusinessProfile = {
                uid,
                name: companySettings?.business_name || '',
                displayName: companySettings?.owner_name || currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '',
                ownerName: companySettings?.owner_name || currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '',
                email: companySettings?.email || currentUser.email || activeEmail || '',
                phone: companySettings?.mobile || '',
                mobile: companySettings?.mobile || '',
                address: companySettings?.address || '',
                taxId: companySettings?.gstin || '',
                pan: companySettings?.pan || '',
                country: companySettings?.country || 'India',
                state: companySettings?.state || '',
                stateCode: companySettings?.state_code || '',
                currency: companySettings?.currency || deriveCurrencyCode(companySettings?.currency_symbol, 'INR'),
                currencySymbol: companySettings?.currency_symbol || '₹',
                taxMode: companySettings?.tax_mode || 'dynamic',
                customTaxName: companySettings?.custom_tax_name || 'Tax',
                customTaxPercentage: companySettings?.custom_tax_percentage !== undefined ? companySettings.custom_tax_percentage : 18,
                defaultTaxRate: companySettings?.default_tax_rate !== undefined ? companySettings.default_tax_rate : 18,
                logoUrl: companySettings?.logo_url || '',
                signature: companySettings?.signature_url || '',
                bankName: companySettings?.bank_name || '',
                accountNumber: companySettings?.account_number || '',
                ifsc: companySettings?.ifsc || '',
                upiId: companySettings?.upi_id || '',
                qrPreference: companySettings?.qr_preference || 'upi',
                documentSeparator: companySettings?.document_separator || '-',
                updatedAt: new Date().toISOString()
              };
              await supabase.from('users').upsert(initProf);
              setProfile(initProf);
              localStorage.setItem(`invoice_maker_biz_profile${suffix}`, JSON.stringify(initProf));
            }

            if (!companySettings || !companySettings.business_name || !companySettings.owner_name) {
              setIsOnboarding(true);
              setIsProfileOpen(true);
            }
          } catch (err) {
            console.warn('Error fetching/setting cloud profile:', String(err));
          }

          // 1b. Fetch Cloud Subscription (Single Source of Truth across devices)
          const syncCloudSubscriptionTier = async () => {
            try {
              const currentUid = uid || (typeof window !== 'undefined' ? localStorage.getItem('makbills_active_uid') : null);
              const currentEmail = activeEmail || (typeof window !== 'undefined' ? localStorage.getItem('makbills_active_email') : null);

              const cachedTier = (localStorage.getItem('makbills_subscription_tier') || localStorage.getItem('makbills_last_active_paid_tier') || 'free') as 'free' | 'basic' | 'pro' | 'unlimited' | 'enterprise';
              const expiresIso = localStorage.getItem('makbills_sub_expires_iso');
              const isCachedNotExpired = !expiresIso || new Date(expiresIso) > new Date();

              let fetchedTier: 'free' | 'basic' | 'pro' | 'unlimited' | 'enterprise' = (isCachedNotExpired && cachedTier !== 'free') ? cachedTier : 'free';
              
              let subData = null;
              if (currentUid || currentEmail) {
                let query = supabase.from('subscriptions').select('*');
                if (currentUid && currentEmail) {
                  query = query.or(`user_id.eq.${currentUid},user_email.eq.${currentEmail}`);
                } else if (currentUid) {
                  query = query.eq('user_id', currentUid);
                } else {
                  query = query.eq('user_email', currentEmail);
                }
                const { data: fetchedSubs } = await query.order('updated_at', { ascending: false }).limit(1);
                if (fetchedSubs && fetchedSubs.length > 0) {
                  subData = fetchedSubs;
                }

                // If client query was blocked by RLS or returned null, use server API fallback
                if (!subData) {
                  try {
                    const params = new URLSearchParams();
                    if (currentUid) params.set('userId', currentUid);
                    if (currentEmail) params.set('userEmail', currentEmail);
                    const apiRes = await fetch(`/api/payments/save-subscription?${params.toString()}`);
                    if (apiRes.ok) {
                      const json = await apiRes.json();
                      if (json.subscription) {
                        subData = [json.subscription];
                      }
                    }
                  } catch (apiErr) {
                    console.warn('[SyncCloudTier] Server API fallback note:', apiErr);
                  }
                }
              }

              if (subData && subData.length > 0) {
                const sub = subData[0];
                const now = new Date();
                const expDate = sub.expires_at || sub.renews_at;
                const isNotExpired = !expDate || new Date(expDate) > now;
                const isActiveStatus = !sub.status || sub.status === 'active' || sub.status === 'trialing';

                if (isNotExpired && isActiveStatus && (sub.plan_type || sub.plan_name)) {
                  const rawKey = (sub.plan_type || sub.plan_name).toLowerCase();
                  if (rawKey.includes('enterprise') || rawKey.includes('unlimited')) fetchedTier = 'unlimited';
                  else if (rawKey.includes('professional') || rawKey.includes('pro')) fetchedTier = 'pro';
                  else if (rawKey.includes('basic')) fetchedTier = 'basic';
                  else fetchedTier = 'free';

                  if (expDate) {
                    localStorage.setItem('makbills_sub_expires_iso', new Date(expDate).toISOString());
                  }
                  localStorage.setItem('makbills_last_active_paid_tier', fetchedTier);
                } else if (sub.status === 'expired' || (expDate && new Date(expDate) <= now)) {
                  fetchedTier = 'free';
                  localStorage.removeItem('makbills_last_active_paid_tier');
                }
              } else if (currentUid) {
                // If cloud query returned empty during auth initialization, preserve unexpired local trial if present
                const localSubRaw = localStorage.getItem(`makbills_sub_${currentUid}`);
                if (localSubRaw) {
                  try {
                    const parsed = JSON.parse(localSubRaw);
                    if (parsed && parsed.status === 'trialing' && parsed.expires_at && new Date(parsed.expires_at) > new Date()) {
                      const rawKey = (parsed.plan_type || parsed.plan_name || '').toLowerCase();
                      if (rawKey.includes('pro')) fetchedTier = 'pro';
                      else if (rawKey.includes('basic')) fetchedTier = 'basic';
                      else if (rawKey.includes('ent')) fetchedTier = 'unlimited';
                    }
                  } catch (e) {}
                }
              }

              // Update state & local storage from database single source of truth only if changed
              setSubscriptionTier(prev => (prev === fetchedTier ? prev : fetchedTier));
              localStorage.setItem('makbills_subscription_tier', fetchedTier);
            } catch (err) {
              console.warn('[SUPABASE SUBSCRIPTION FETCH EXCEPTION]:', err);
            }
          };

          await syncCloudSubscriptionTier();

          // 1c. Realtime listener for Subscription table, Broadcast, & User updates (Strictly Isolated Per-User Account)
          const subscriptionChannel = supabase
            .channel(`subscription_updates:${uid}:${Date.now()}`)
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'subscriptions' },
              (payload: any) => {
                const newRec = payload.new || {};
                const oldRec = payload.old || {};
                const matchesId = newRec.user_id === uid || oldRec.user_id === uid;
                const matchesEmail = activeEmail && (newRec.user_email === activeEmail || oldRec.user_email === activeEmail);
                if (matchesId || matchesEmail) {
                  syncCloudSubscriptionTier();
                }
              }
            )
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'users', filter: `uid=eq.${uid}` },
              () => {
                syncCloudSubscriptionTier();
              }
            )
            .on(
              'broadcast',
              { event: 'subscription_changed' },
              () => {
                syncCloudSubscriptionTier();
              }
            )
            .subscribe();
          activeChannels.push(subscriptionChannel);

          // 1d. Focus re-check & steady periodic poll (Guarantees multi-device sync across laptops, phones, tablets)
          const handleWindowFocus = () => {
            syncCloudSubscriptionTier();
          };
          window.addEventListener('focus', handleWindowFocus);
          window.addEventListener('visibilitychange', handleWindowFocus);
          const subPollInterval = setInterval(() => {
            syncCloudSubscriptionTier();
          }, 30_000);

          activeChannels.push({
            unsubscribe: () => {
              window.removeEventListener('focus', handleWindowFocus);
              window.removeEventListener('visibilitychange', handleWindowFocus);
              clearInterval(subPollInterval);
            }
          });

          const reconcileCloudInvoicesWithPending = (rawCloudList: any[], activeSuffix: string): Invoice[] => {
            const parsedCloud = (rawCloudList || [])
              .filter(inv => inv && inv.id && String(inv.id).trim() !== '')
              .map(inv => {
                if (inv.embeddedTemplate && typeof inv.embeddedTemplate === 'object') {
                  inv.selectedCustomTemplateId = (inv.embeddedTemplate as any)?.id;
                } else if (inv.selectedTemplateStyle && inv.selectedTemplateStyle.startsWith('{')) {
                  try {
                    const legacyBlob = JSON.parse(inv.selectedTemplateStyle);
                    if (legacyBlob && typeof legacyBlob === 'object') {
                      inv.embeddedTemplate = legacyBlob;
                      inv.selectedCustomTemplateId = legacyBlob?.id;
                      for (const key of Object.keys(legacyBlob)) {
                        if (key !== 'isDeleted' && key !== 'deletedAt' && (inv as any)[key] === undefined) {
                          (inv as any)[key] = legacyBlob[key];
                        }
                      }
                    }
                  } catch (e) {}
                }
                return inv;
              });

            // Read local invoices to find pending items (_pendingSync or _pendingDelete)
            const localMap = new Map<string, any>();
            try {
              const localRaw = localStorage.getItem(`invoice_maker_invoices${activeSuffix}`) || '[]';
              const localList: any[] = JSON.parse(localRaw);
              localList.forEach((inv: any) => {
                if (inv && inv.id && (inv._pendingSync || inv._pendingDelete)) {
                  localMap.set(inv.id, inv);
                }
              });
            } catch (e) {}

            // 1. Process cloud invoices: apply local pending modifications or filter out if pending delete
            const mergedMap = new Map<string, Invoice>();
            parsedCloud.forEach(inv => {
              if (!inv || !inv.id) return;
              const localItem = localMap.get(inv.id);
              if (localItem) {
                if (localItem._pendingDelete) {
                  // Skip adding to visible cloud list — it's pending delete
                  return;
                }
                // Overlay local pending edits over cloud record
                mergedMap.set(inv.id, { ...inv, ...localItem });
              } else {
                mergedMap.set(inv.id, inv);
              }
            });

            // 2. Add local pending records that do NOT exist in the cloud fetch at all (e.g., unsynced drafts/invoices)
            localMap.forEach((localItem, id) => {
              if (localItem && id && !localItem._pendingDelete && !mergedMap.has(id)) {
                mergedMap.set(id, localItem);
              }
            });

            return Array.from(mergedMap.values());
          };

          // 2. Load Invoices directly from Supabase Database (Single Source of Truth)
          try {
            const { data: cloudInvoices, error: fetchErr } = await supabase
              .from('invoices')
              .select('*')
              .eq('userId', uid)
              .order('date', { ascending: false });

            if (fetchErr) {
              console.warn('[SUPABASE INVOICES FETCH ERROR] Details:', {
                message: fetchErr.message,
                code: fetchErr.code,
                details: fetchErr.details,
                hint: fetchErr.hint
              });
            }

            // Passive local cache: update state with authoritative cloud fetch reconciled with local pending items
            const finalInvoices = reconcileCloudInvoicesWithPending(cloudInvoices || [], suffix);

            setInvoices(finalInvoices);
            isCloudLoadedRef.current = true;
            localStorage.setItem(`invoice_maker_invoices${suffix}`, JSON.stringify(finalInvoices));
          } catch (err) {
            console.warn('[SUPABASE GET INVOICES EXCEPTION]:', err);
            handleSupabaseError(err, OperationType.GET, `invoices[userId=${uid}]`);
          }

          const invoicesChannel = supabase
            .channel(`invoices:${uid}:${Date.now()}`)
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'invoices' },
              async (payload: any) => {
                try {
                  const newRec = payload.new || {};
                  const oldRec = payload.old || {};
                  const matchesUser = newRec.userId === uid || oldRec.userId === uid;
                  if (!matchesUser && (Object.keys(newRec).length > 0 || Object.keys(oldRec).length > 0)) return;

                  const { data } = await supabase
                    .from('invoices')
                    .select('*')
                    .eq('userId', uid)
                    .order('date', { ascending: false });

                  if (data) {
                    const finalInvoices2 = reconcileCloudInvoicesWithPending(data, suffix);
                    setInvoices(finalInvoices2);
                    localStorage.setItem(`invoice_maker_invoices${suffix}`, JSON.stringify(finalInvoices2));
                  }
                } catch (err) {
                  console.warn("Error in realtime invoice sync:", String(err));
                }
              }
            )
            .subscribe((status, err) => {
              if (status === 'SUBSCRIBED') {
                console.log('[Realtime] invoices channel subscribed');
              } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                console.warn('[Realtime] invoices channel subscription status:', status, err);
              }
            });
          activeChannels.push(invoicesChannel);

          // 3. Load Presets and attach realtime listener
          try {
            const { data: cloudPresets } = await supabase
              .from('presets')
              .select('*')
              .eq('userId', uid);
            if (cloudPresets && cloudPresets.length > 0) {
              setPresets(cloudPresets as PresetItem[]);
              localStorage.setItem(`invoice_maker_presets${suffix}`, JSON.stringify(cloudPresets));
            }
          } catch (err) {
            handleSupabaseError(err, OperationType.GET, `presets[userId=${uid}]`);
          }

          const presetsChannel = supabase
            .channel(`presets:${uid}:${Date.now()}`)
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'presets', filter: `userId=eq.${uid}` },
              async () => {
                try {
                  const { data } = await supabase
                    .from('presets')
                    .select('*')
                    .eq('userId', uid);
                  if (data) {
                    setPresets(data as PresetItem[]);
                    localStorage.setItem(`invoice_maker_presets${suffix}`, JSON.stringify(data));
                  }
                } catch (err) {
                  console.warn("Error in realtime preset sync:", String(err));
                }
              }
            )
            .subscribe((status, err) => {
              if (status === 'SUBSCRIBED') {
                console.log('[Realtime] presets channel subscribed');
              } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                console.warn('[Realtime] presets channel subscription status:', status, err);
              }
            });
          activeChannels.push(presetsChannel);

          // 4. Load Clients and attach realtime listener
          try {
            const { data: cloudClients } = await supabase
              .from('clients')
              .select('*')
              .eq('userId', uid);
            if (cloudClients && cloudClients.length > 0) {
              setClients(cloudClients as ClientProfile[]);
              localStorage.setItem(`invoice_maker_clients${suffix}`, JSON.stringify(cloudClients));
            }
          } catch (err) {
            handleSupabaseError(err, OperationType.GET, `clients[userId=${uid}]`);
          }

          const clientsChannel = supabase
            .channel(`clients:${uid}:${Date.now()}`)
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'clients', filter: `userId=eq.${uid}` },
              async () => {
                try {
                  const { data } = await supabase
                    .from('clients')
                    .select('*')
                    .eq('userId', uid);
                  if (data) {
                    setClients(data as ClientProfile[]);
                    localStorage.setItem(`invoice_maker_clients${suffix}`, JSON.stringify(data));
                  }
                } catch (err) {
                  console.warn("Error in realtime client sync:", String(err));
                }
              }
            )
            .subscribe((status, err) => {
              if (status === 'SUBSCRIBED') {
                console.log('[Realtime] clients channel subscribed');
              } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                console.warn('[Realtime] clients channel subscription status:', status, err);
              }
            });
          activeChannels.push(clientsChannel);

          // 5. Load Expenses and attach realtime listener
          try {
            const { data: cloudExpenses } = await supabase
              .from('expenses')
              .select('*')
              .eq('userId', uid);
            if (cloudExpenses) {
              setExpenses(cloudExpenses as Expense[]);
              localStorage.setItem(`invoice_maker_expenses${suffix}`, JSON.stringify(cloudExpenses));
            }
          } catch (err) {
            handleSupabaseError(err, OperationType.GET, `expenses[userId=${uid}]`);
          }

          const expensesChannel = supabase
            .channel(`expenses:${uid}:${Date.now()}`)
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'expenses', filter: `userId=eq.${uid}` },
              async () => {
                try {
                  const { data } = await supabase
                    .from('expenses')
                    .select('*')
                    .eq('userId', uid);
                  if (data) {
                    setExpenses(data as Expense[]);
                    localStorage.setItem(`invoice_maker_expenses${suffix}`, JSON.stringify(data));
                  }
                } catch (err) {
                  console.warn("Error in realtime expense sync:", String(err));
                }
              }
            )
            .subscribe((status, err) => {
              if (status === 'SUBSCRIBED') {
                console.log('[Realtime] expenses channel subscribed');
              } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                console.warn('[Realtime] expenses channel subscription status:', status, err);
              }
            });
          activeChannels.push(expensesChannel);

          // 6. Load Custom Templates from Storage and attach realtime listener
          try {
            const { data } = await supabase.storage
              .from('CompanyLogo')
              .download(`${uid}/custom_templates.json`);
            
            if (data) {
              const text = await data.text();
              const cloudTemplates = JSON.parse(text);
              if (cloudTemplates && Array.isArray(cloudTemplates) && cloudTemplates.length > 0) {
                const localData = localStorage.getItem('makbills_custom_templates');
                let localTemplates: any[] = [];
                if (localData) {
                  try { localTemplates = JSON.parse(localData); } catch (e) {}
                }

                const mergedMap = new Map<string, any>();
                cloudTemplates.forEach((ct: any) => { if (ct && ct.id) mergedMap.set(ct.id, ct); });
                let needsUpload = false;
                localTemplates.forEach((lt: any) => {
                  if (!lt || !lt.id) return;
                  const existing = mergedMap.get(lt.id);
                  if (!existing || (lt.updatedAt && lt.updatedAt > (existing.updatedAt || 0))) {
                    mergedMap.set(lt.id, lt);
                    needsUpload = true;
                  }
                });

                const finalTemplates = Array.from(mergedMap.values());
                setCustomTemplates(finalTemplates);
                localStorage.setItem('makbills_custom_templates', JSON.stringify(finalTemplates));
                window.dispatchEvent(new Event('custom_templates_updated_from_cloud'));

                if (needsUpload) {
                  try {
                    await supabase.storage
                      .from('CompanyLogo')
                      .upload(`${uid}/custom_templates.json`, JSON.stringify(finalTemplates), {
                        cacheControl: '0',
                        upsert: true,
                        contentType: 'application/json'
                      });
                  } catch (e) {}
                }
              } else {
                const localData = localStorage.getItem('makbills_custom_templates');
                let localTemplates: any[] = [];
                if (localData) {
                  try { localTemplates = JSON.parse(localData); } catch (e) {}
                }
                if (localTemplates && localTemplates.length > 0) {
                  setCustomTemplates(localTemplates);
                  try {
                    await supabase.storage
                      .from('CompanyLogo')
                      .upload(`${uid}/custom_templates.json`, JSON.stringify(localTemplates), {
                        cacheControl: '0',
                        upsert: true,
                        contentType: 'application/json'
                      });
                  } catch (e) {}
                } else {
                  setCustomTemplates([]);
                }
              }
            } else {
              const localData = localStorage.getItem('makbills_custom_templates');
              if (localData) {
                try {
                  const templates = JSON.parse(localData);
                  if (templates && templates.length > 0) {
                    await supabase.storage
                      .from('CompanyLogo')
                      .upload(`${uid}/custom_templates.json`, localData, {
                        cacheControl: '0',
                        upsert: true,
                        contentType: 'application/json'
                      });
                    setCustomTemplates(templates);
                  }
                } catch (e) {
                  console.warn("Failed to migrate stranded templates to storage", e);
                }
              }
            }
          } catch (err) {
            console.warn('Error loading custom templates from storage', err);
          }

          const templatesChannel = supabase
            .channel(`custom_templates:${uid}`)
            .on(
              'broadcast',
              { event: 'templates_updated' },
              (payload) => {
                try {
                  if (payload.payload && payload.payload.templates) {
                    const parsedTemplates = payload.payload.templates;
                    setCustomTemplates(parsedTemplates);
                    localStorage.setItem('makbills_custom_templates', JSON.stringify(parsedTemplates));
                    window.dispatchEvent(new Event('custom_templates_updated_from_cloud'));
                  }
                } catch (err) {
                  console.warn("Error in realtime templates sync:", String(err));
                }
              }
            )
            .subscribe();
          activeChannels.push(templatesChannel);

          // 8. Listen to Security PIN Updates in Realtime
          const securityChannel = supabase
            .channel(`security_updates:${uid}`)
            .on(
              'broadcast',
              { event: 'security_changed' },
              (payload) => {
                const enable = payload.payload?.isPinLockEnabled;
                if (enable !== undefined) {
                  const currentSec = getSecuritySettings();
                  if (currentSec.isPinLockEnabled !== enable) {
                    const newSec = { ...currentSec, isPinLockEnabled: enable };
                    if (enable) {
                      setIsUnlocked(false);
                    }
                    saveSecuritySettings(newSec);
                    setSecuritySettings(newSec);
                  }
                }
              }
            )
            .subscribe();
          activeChannels.push(securityChannel);
          setIsAuthLoading(false);
        } else {
          setUser(null);
          setUserEmail(null);
          setInvoices([]);
          setClients([]);
          setExpenses([]);
          setCustomTemplates([]);
          setSubscriptionTier('free');
          if (typeof window !== 'undefined' && event === 'SIGNED_OUT') {
            localStorage.removeItem('makbills_custom_templates');
            localStorage.removeItem('makbills_last_user');
            localStorage.removeItem('makbills_subscription_tier');
            localStorage.removeItem('makbills_masters_vendors');
            localStorage.removeItem('makbills_masters_actual_vendors');
            localStorage.removeItem('makbills_masters_transports');
            localStorage.removeItem('makbills_masters_hsn');
            localStorage.removeItem('makbills_masters_materials');
            localStorage.removeItem('makbills_masters_categories');
            localStorage.removeItem('makbills_masters_subcategories');
            localStorage.removeItem('makbills_masters_gl');
            localStorage.removeItem('makbills_masters_mappings');
            window.dispatchEvent(new CustomEvent('makbills_sync_vendors'));
            window.dispatchEvent(new CustomEvent('makbills_sync_actual_vendors'));
          }
          setProfile({
            uid: '',
            name: '',
            email: '',
            phone: '',
            address: '',
            taxId: '',
            currency: 'INR',
            defaultTaxRate: 18,
            updatedAt: new Date().toISOString()
          });
          setPresets([]);
          setIsAuthLoading(false);
        }
      } catch (globalAuthErr) {
        console.warn("Unhandled error in syncUserData:", String(globalAuthErr));
        setIsAuthLoading(false);
      }
    };

    // Setup Auth State Listener — runs unconditionally so login always works
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const hasUrlError = typeof window !== 'undefined' && (
          window.location.search.includes('error=') || window.location.hash.includes('error=') ||
          window.location.search.includes('error_code=') || window.location.hash.includes('error_code=')
        );

        if (hasUrlError || urlAuthError) {
          setIsAuthLoading(false);
          return;
        }

        if (event === 'PASSWORD_RECOVERY' || (typeof window !== 'undefined' && (window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery')))) {
          setIsPasswordResetMode(true);
          setIsAuthLoading(false);
          return;
        }
        if (isPasswordResetMode) {
          setIsAuthLoading(false);
          return;
        }
        await syncUserData(session?.user ?? null, event);
        if (session?.user?.id) {
          triggerBackgroundSync();
          if (typeof window !== 'undefined' && window.location.search.includes('code=')) {
            const cleanUrl = (window.location.pathname === '/' || window.location.pathname === '/dashboard') ? '/dashboard' : window.location.pathname;
            window.history.replaceState(null, '', cleanUrl);
          }
        }
      }
    );

    const checkSession = async () => {
      try {
        const hasUrlError = typeof window !== 'undefined' && (
          window.location.search.includes('error=') || window.location.hash.includes('error=') ||
          window.location.search.includes('error_code=') || window.location.hash.includes('error_code=')
        );

        if (hasUrlError || urlAuthError) {
          setIsAuthLoading(false);
          if (typeof window !== 'undefined' && window.history.replaceState) {
            const cleanPath = window.location.pathname === '/dashboard' ? '/login' : window.location.pathname;
            window.history.replaceState(null, '', cleanPath);
          }
          return;
        }

        const isRecovery = typeof window !== 'undefined' && (
          window.location.hash.includes('type=recovery') ||
          window.location.search.includes('type=recovery') ||
          window.location.pathname.includes('reset-password')
        );

        if (isRecovery) {
          setIsPasswordResetMode(true);
          setIsAuthLoading(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        
        // If there is an OAuth hash or recovery hash or PKCE code, wait for onAuthStateChange to exchange it, but clean URL once session is ready.
        if (typeof window !== 'undefined' && (window.location.hash.includes('access_token=') || window.location.hash.includes('type=recovery'))) {
          return;
        }

        if (!session) {
          setIsAuthLoading(false);
        } else if (session.user) {
          await syncUserData(session.user, 'INITIAL_GET_SESSION');
          triggerBackgroundSync();
          if (typeof window !== 'undefined' && window.location.search.includes('code=')) {
            const cleanUrl = window.location.pathname;
            window.history.replaceState(null, '', cleanUrl);
          }
        }
      } catch (err) {
        setIsAuthLoading(false);
      }
    };
    checkSession();

    return () => {
      authSubscription.unsubscribe();
      cleanupActiveListeners();
    };
  }, [isUnlocked]);

  // Load local data when unlocked (PIN gate for offline data)
  useEffect(() => {
    if (!isUnlocked) return;
    loadLocalData();
  }, [isUnlocked]);

  // System Inactivity Auto-Lock Timer (Locks workspace when idle for configured timeout)
  useEffect(() => {
    if (!isUnlocked || !securitySettings.isPinLockEnabled) return;

    const getTimeoutMs = (): number | null => {
      const saved = localStorage.getItem('mak_security_autolock_timeout');
      if (!saved || saved === 'off') return null;
      switch (saved) {
        case '5m': return 5 * 60 * 1000;
        case '15m': return 15 * 60 * 1000;
        case '30m': return 30 * 60 * 1000;
        case '1h': return 60 * 60 * 1000;
        default: return null;
      }
    };

    const timeoutMs = getTimeoutMs();
    if (!timeoutMs) return;

    let timer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setIsUnlocked(false);
      }, timeoutMs);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(evt => window.addEventListener(evt, resetTimer, { passive: true }));

    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach(evt => window.removeEventListener(evt, resetTimer));
    };
  }, [isUnlocked, securitySettings.isPinLockEnabled]);

  // Global Privacy Mode & Security Settings Sync (Applies to whole website)
  useEffect(() => {
    const syncSecurityPreferences = () => {
      const isPrivacyDirect = localStorage.getItem('mak_security_privacy_mode') === 'true';
      let isPrivacyV1 = false;
      try {
        isPrivacyV1 = JSON.parse(localStorage.getItem('mak_security_preferences_v1') || '{}').privacyMode === true;
      } catch (e) {}

      const active = isPrivacyDirect || isPrivacyV1;
      let styleTag = document.getElementById('mak-privacy-style');

      if (active) {
        document.body.classList.add('mak-privacy-active');
        if (!styleTag) {
          styleTag = document.createElement('style');
          styleTag.id = 'mak-privacy-style';
          styleTag.innerHTML = `
            body.mak-privacy-active .privacy-sensitive:not(:hover):not([data-privacy-exempt="true"]):not([data-privacy-exempt="true"] *):not(.no-privacy-blur *):not(.master-registry-container *):not(.invoice-template-builder *):not(.invoice-modal-container *):not(.invoice-preview-container *):not(.live-preview-container *):not(.preview-section *):not(.document-summary-section *):not(.document-summary *):not(.doc-preview-modal *):not([class*="preview"] *):not([class*="summary"] *):not(table *):not(tbody *):not(tr *):not(td *):not(.ledger-table *):not(.ledger-row *):not(.document-row *):not(.invoice-row *):not(.document-list-item *):not(.document-card *):not(.paper-sheet-light *):not(.paper-sheet *):not(#pdf-export-content-editable *):not(#invoice-editor *),
            body.mak-privacy-active [data-privacy-sensitive="true"]:not(:hover):not([data-privacy-exempt="true"]):not([data-privacy-exempt="true"] *):not(.no-privacy-blur *):not(.master-registry-container *):not(.invoice-template-builder *):not(.invoice-modal-container *):not(.invoice-preview-container *):not(.live-preview-container *):not(.preview-section *):not(.document-summary-section *):not(.document-summary *):not(.doc-preview-modal *):not([class*="preview"] *):not([class*="summary"] *):not(table *):not(tbody *):not(tr *):not(td *):not(.ledger-table *):not(.ledger-row *):not(.document-row *):not(.invoice-row *):not(.document-list-item *):not(.document-card *):not(.paper-sheet-light *):not(.paper-sheet *):not(#pdf-export-content-editable *):not(#invoice-editor *),
            body.mak-privacy-active .financial-amount:not(:hover):not([data-privacy-exempt="true"]):not([data-privacy-exempt="true"] *):not(.no-privacy-blur *):not(.master-registry-container *):not(.invoice-template-builder *):not(.invoice-modal-container *):not(.invoice-preview-container *):not(.live-preview-container *):not(.preview-section *):not(.document-summary-section *):not(.document-summary *):not(.doc-preview-modal *):not([class*="preview"] *):not([class*="summary"] *):not(table *):not(tbody *):not(tr *):not(td *):not(.ledger-table *):not(.ledger-row *):not(.document-row *):not(.invoice-row *):not(.document-list-item *):not(.document-card *):not(.paper-sheet-light *):not(.paper-sheet *):not(#pdf-export-content-editable *):not(#invoice-editor *),
            body.mak-privacy-active .privacy-amount:not(:hover):not([data-privacy-exempt="true"]):not([data-privacy-exempt="true"] *):not(.no-privacy-blur *):not(.master-registry-container *):not(.invoice-template-builder *):not(.invoice-modal-container *):not(.invoice-preview-container *):not(.live-preview-container *):not(.preview-section *):not(.document-summary-section *):not(.document-summary *):not(.doc-preview-modal *):not([class*="preview"] *):not([class*="summary"] *):not(table *):not(tbody *):not(tr *):not(td *):not(.ledger-table *):not(.ledger-row *):not(.document-row *):not(.invoice-row *):not(.document-list-item *):not(.document-card *):not(.paper-sheet-light *):not(.paper-sheet *):not(#pdf-export-content-editable *):not(#invoice-editor *),
            .privacy-blurred:not(:hover):not([data-privacy-exempt="true"]):not([data-privacy-exempt="true"] *):not(.no-privacy-blur *):not(.master-registry-container *):not(.invoice-template-builder *):not(.invoice-modal-container *):not(.invoice-preview-container *):not(.live-preview-container *):not(.preview-section *):not(.document-summary-section *):not(.document-summary *):not(.doc-preview-modal *):not([class*="preview"] *):not([class*="summary"] *):not(table *):not(tbody *):not(tr *):not(td *):not(.ledger-table *):not(.ledger-row *):not(.document-row *):not(.invoice-row *):not(.document-list-item *):not(.document-card *):not(.paper-sheet-light *):not(.paper-sheet *):not(#pdf-export-content-editable *):not(#invoice-editor *) {
              filter: blur(8px) !important;
              -webkit-filter: blur(8px) !important;
              user-select: none !important;
              transition: filter 0.2s ease, opacity 0.2s ease !important;
              cursor: pointer !important;
            }
            body.mak-privacy-active .privacy-sensitive:hover,
            body.mak-privacy-active .privacy-sensitive:hover *,
            body.mak-privacy-active [data-privacy-sensitive="true"]:hover,
            body.mak-privacy-active [data-privacy-sensitive="true"]:hover *,
            body.mak-privacy-active .financial-amount:hover,
            body.mak-privacy-active .financial-amount:hover *,
            body.mak-privacy-active .privacy-amount:hover,
            body.mak-privacy-active .privacy-amount:hover *,
            .privacy-blurred:hover,
            .privacy-blurred:hover *,
            [data-privacy-exempt="true"],
            [data-privacy-exempt="true"] *,
            .no-privacy-blur,
            .no-privacy-blur *,
            .master-registry-container,
            .master-registry-container *,
            .invoice-template-builder,
            .invoice-template-builder *,
            .invoice-modal-container,
            .invoice-modal-container *,
            .invoice-preview-container,
            .invoice-preview-container *,
            .live-preview-container,
            .live-preview-container *,
            .preview-section,
            .preview-section *,
            .document-summary-section,
            .document-summary-section *,
            .document-summary,
            .document-summary *,
            .doc-preview-modal,
            .doc-preview-modal *,
            [class*="preview"],
            [class*="preview"] *,
            [class*="summary"],
            [class*="summary"] *,
            table,
            table *,
            tbody,
            tbody *,
            tr,
            tr *,
            td,
            td *,
            .ledger-table,
            .ledger-table *,
            .ledger-row,
            .ledger-row *,
            .document-row,
            .document-row *,
            .invoice-row,
            .invoice-row *,
            .document-list-item,
            .document-list-item *,
            .document-card,
            .document-card *,
            .paper-sheet-light,
            .paper-sheet-light *,
            .paper-sheet,
            .paper-sheet *,
            #pdf-export-content-editable,
            #pdf-export-content-editable *,
            #invoice-editor,
            #invoice-editor * {
              filter: none !important;
              -webkit-filter: none !important;
              opacity: 1 !important;
            }
            @media print {
              *, *::before, *::after {
                filter: none !important;
                -webkit-filter: none !important;
              }
            }
          `;
          document.head.appendChild(styleTag);
        }
      } else {
        document.body.classList.remove('mak-privacy-active');
        if (styleTag) styleTag.remove();
      }
    };

    syncSecurityPreferences();

    window.addEventListener('mak_security_settings_changed', syncSecurityPreferences);
    window.addEventListener('storage', syncSecurityPreferences);

    return () => {
      window.removeEventListener('mak_security_settings_changed', syncSecurityPreferences);
      window.removeEventListener('storage', syncSecurityPreferences);
    };
  }, []);

  // Automatic DOM Financial & Stock Valuation Scanner & Tagger for Privacy Mode
  useEffect(() => {
    let observer: MutationObserver | null = null;

    const scanAndTagFinancials = () => {
      const isPrivacyDirect = localStorage.getItem('mak_security_privacy_mode') === 'true';
      let isPrivacyV1 = false;
      try {
        isPrivacyV1 = JSON.parse(localStorage.getItem('mak_security_preferences_v1') || '{}').privacyMode === true;
      } catch (e) {}

      if (!isPrivacyDirect && !isPrivacyV1) return;

      const currencyPattern = /(?:[\$\₹\€\£]|Rs\.?|USD|INR|EUR|GBP)\s*-?\d+/i;
      const numericAmountPattern = /^-?\d{1,3}(?:[,\.]\d{2,3})+(?:\.\d{1,2})?$/;

      const elements = document.querySelectorAll('span, td, div, p, strong, b, h1, h2, h3, h4, h5, h6, small');
      elements.forEach(el => {
        // Exempt Master Registry, Invoice Templates, Preview, Document Summary, and Document Tables/Rows from privacy blur
        const isExempt = el.closest('[data-privacy-exempt="true"], .no-privacy-blur, .master-registry-container, .invoice-template-builder, .invoice-modal-container, .invoice-preview-container, .live-preview-container, .preview-section, .document-summary-section, .document-summary, .doc-preview-modal, .paper-sheet-light, .paper-sheet, #pdf-export-content-editable, #invoice-editor, [class*="preview"], [class*="summary"], table, tbody, tr, td, .ledger-table, .ledger-row, .document-row, .invoice-row, .doc-table-container, .document-list-item, .document-card');
        if (isExempt) {
          el.removeAttribute('data-privacy-sensitive');
          return;
        }

        if (el.children.length === 0 && el.textContent) {
          const txt = el.textContent.trim();
          if (!txt) return;

          // Check if element contains currency or financial/stock numbers
          if (currencyPattern.test(txt) || numericAmountPattern.test(txt)) {
            el.setAttribute('data-privacy-sensitive', 'true');
          } else {
            // Check if parent container is financial or stock metrics container
            const parent = el.closest('[class*="total"], [class*="amount"], [class*="price"], [class*="revenue"], [class*="stock"], [class*="grand"], [class*="balance"], [class*="rate"], [class*="metric"], [class*="val"]');
            if (parent && !parent.closest('[data-privacy-exempt="true"], .no-privacy-blur, .master-registry-container, .invoice-template-builder, .invoice-modal-container, .invoice-preview-container, .live-preview-container, .preview-section, .document-summary-section, .document-summary, .paper-sheet-light, .paper-sheet, #pdf-export-content-editable, #invoice-editor, [class*="preview"], table, tbody, tr, td, .ledger-table, .ledger-row, .document-row, .invoice-row, .doc-table-container, .document-list-item, .document-card') && /^-?\d+(?:[,\.]\d+)*$/.test(txt)) {
              el.setAttribute('data-privacy-sensitive', 'true');
            }
          }
        }
      });
    };

    scanAndTagFinancials();

    observer = new MutationObserver(() => {
      scanAndTagFinancials();
    });

    if (typeof document !== 'undefined') {
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }

    window.addEventListener('mak_security_settings_changed', scanAndTagFinancials);

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('mak_security_settings_changed', scanAndTagFinancials);
    };
  }, []);

  // Listen for remote session revocation events across windows/tabs/devices
  useEffect(() => {
    const currentId = getDeviceId();

    const handleSessionRevoked = (e: any) => {
      const targetId = e?.detail?.targetSessionId;
      if (targetId && targetId === currentId) {
        setIsUnlocked(false);
        emitNotification('Session Revoked', 'Your session was signed out from another device.', 'warning');
      }
    };

    const handleAllOthersRevoked = (e: any) => {
      const activeId = e?.detail?.currentId;
      if (activeId && activeId !== currentId) {
        setIsUnlocked(false);
        emitNotification('Session Revoked', 'Signed out by active primary session.', 'warning');
      }
    };

    window.addEventListener('mak_session_revoked', handleSessionRevoked);
    window.addEventListener('mak_all_other_sessions_revoked', handleAllOthersRevoked);

    return () => {
      window.removeEventListener('mak_session_revoked', handleSessionRevoked);
      window.removeEventListener('mak_all_other_sessions_revoked', handleAllOthersRevoked);
    };
  }, []);



  // Listen to local template updates and sync to cloud
  useEffect(() => {
    const handleLocalTemplatesUpdate = async () => {
      if (!user || !isUnlocked) return;
      const uid = user.id;
      const localData = localStorage.getItem('makbills_custom_templates');
      if (localData) {
        try {
          const templates: InvoiceTemplate[] = JSON.parse(localData);
          
          if (templates.length > 0) {
            // Update storage
            const { error } = await supabase.storage
              .from('CompanyLogo')
              .upload(`${uid}/custom_templates.json`, localData, {
                cacheControl: '0',
                upsert: true,
                contentType: 'application/json'
              });
            
            if (error) {
              console.warn('Failed to sync custom templates to storage', error);
            } else {
              // Broadcast to other clients
              await supabase.channel(`custom_templates:${uid}`).send({
                type: 'broadcast',
                event: 'templates_updated',
                payload: { templates }
              });
            }
          }
        } catch (e) {
          console.error('Error handling local template update', e);
        }
      }
    };
    
    window.addEventListener('custom_templates_local_update', handleLocalTemplatesUpdate);
    return () => window.removeEventListener('custom_templates_local_update', handleLocalTemplatesUpdate);
  }, [user, isUnlocked]);

  // --- ACTIONS SYSTEM ---

  // 1. Google OAuth login trigger via Supabase
  const handleLogin = async () => {
    if (!navigator.onLine) {
      alert('You are currently offline. Please reconnect to sign in and sync to the cloud.');
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin + '/dashboard' : undefined,
        },
      });
      if (error) console.error('Login flow failed:', error);
    } catch (e) {
      console.error('Login flow failed:', e);
    }
  };

  const handleCustomSignup = async (name: string, companyName: string, email: string, phone: string, password?: string): Promise<{ error?: string }> => {
    let targetEmail = email;
    if (password) {
      if (!isSupabaseConfigured) {
        return { error: "Service unavailable, please try again later" };
      }
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              phone: phone,
              company_name: companyName
            }
          }
        });
        if (error) {
          console.warn("[AUTH] New User Sign-Up Failed:", email, error.message);
          return { error: error.message };
        }
        
        if (data.user && !data.session) {
          console.info("[AUTH] New User Sign-Up Success (Confirmation Pending):", email);
          return { error: "Account created! Please confirm your email address (check your inbox/spam folder) before logging in." };
        }
        
        if (data.user) {
          console.info("[AUTH] New User Sign-Up Success (Auto Logged-In):", email);
          const initProf: BusinessProfile = {
            uid: data.user.id,
            name: companyName || '',
            email: email,
            phone: phone || '',
            ownerName: name,
            address: profile.address || '',
            taxId: profile.taxId || '',
            currency: profile.currency || 'INR',
            defaultTaxRate: profile.defaultTaxRate || 18,
            updatedAt: new Date().toISOString()
          };
          await supabase.from('users').upsert(initProf);
          setProfile(initProf);
          const signupSuffix = data.user.email ? `_${encodeURIComponent(data.user.email)}` : '';
          localStorage.setItem(`invoice_maker_biz_profile${signupSuffix}`, JSON.stringify(initProf));
        }
      } catch (err: any) {
        return { error: err.message || 'Sign up failed' };
      }
    } else {
      const resolvedEmail = email || `${phone.replace(/\s+/g, '') || 'user'}@makbills.local`;
      targetEmail = resolvedEmail;
      setUserEmail(resolvedEmail);
      localStorage.setItem('makbills_custom_email', resolvedEmail);
      localStorage.setItem('makbills_custom_brand', companyName);
      localStorage.setItem('makbills_custom_owner', name);
      localStorage.setItem('makbills_custom_phone', phone);
      
      const updatedProf: BusinessProfile = {
        ...profile,
        name: companyName || '',
        email: resolvedEmail,
        phone: phone || '',
        ownerName: name,
        updatedAt: new Date().toISOString()
      };
      setProfile(updatedProf);
      const signupSuffix = resolvedEmail ? `_${encodeURIComponent(resolvedEmail)}` : '';
      localStorage.setItem(`invoice_maker_biz_profile${signupSuffix}`, JSON.stringify(updatedProf));
    }
    
    // Clear invoices, presets, clients, and expenses so a brand-new account starts completely fresh
    const finalEmail = targetEmail || '';
    const newSuffix = finalEmail ? `_${encodeURIComponent(finalEmail)}` : '';
    setInvoices([]);
    localStorage.setItem(`invoice_maker_invoices${newSuffix}`, JSON.stringify([]));
    setPresets([]);
    localStorage.setItem(`invoice_maker_presets${newSuffix}`, JSON.stringify([]));
    setClients([]);
    localStorage.setItem(`invoice_maker_clients${newSuffix}`, JSON.stringify([]));
    setExpenses([]);
    localStorage.setItem(`invoice_maker_expenses${newSuffix}`, JSON.stringify([]));
    
    setIsOnboarding(true);
    setIsProfileOpen(true);
    return {};
  };

  const handleCustomLogin = async (email: string, password?: string, phone?: string): Promise<{ error?: string }> => {
    if (email && password) {
      if (!isSupabaseConfigured) {
        return { error: "Service unavailable, please try again later" };
      }
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) {
          console.warn("[AUTH] User Login Failed:", email, error.message);
          return { error: error.message };
        }
        console.info("[AUTH] User Login Succeeded:", email);
        return {};
      } catch (err: any) {
        console.error("[AUTH] User Login Error Exception:", email, err.message || err);
        return { error: err.message || 'Login failed' };
      }
    } else {
      const resolvedEmail = email || `${(phone || '').replace(/\s+/g, '') || 'user'}@makbills.local`;
      setUserEmail(resolvedEmail);
      localStorage.setItem('makbills_custom_email', resolvedEmail);
      
      if (phone) {
        localStorage.setItem('makbills_custom_phone', phone);
      }
      
      const cachedBrand = localStorage.getItem('makbills_custom_brand') || '';
      const cachedPhone = localStorage.getItem('makbills_custom_phone') || phone || '';
      const cachedOwner = localStorage.getItem('makbills_custom_owner') || '';
      
      const updatedProf: BusinessProfile = {
        ...profile,
        name: cachedBrand,
        email: resolvedEmail,
        phone: cachedPhone,
        ownerName: cachedOwner,
        updatedAt: new Date().toISOString()
      };
      setProfile(updatedProf);
      const loginSuffix = resolvedEmail ? `_${encodeURIComponent(resolvedEmail)}` : '';
      localStorage.setItem(`invoice_maker_biz_profile${loginSuffix}`, JSON.stringify(updatedProf));
      return {};
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      
      // Clear unsuffixed active keys
      localStorage.removeItem('makbills_custom_email');
      localStorage.removeItem('makbills_custom_brand');
      localStorage.removeItem('makbills_custom_phone');
      localStorage.removeItem('makbills_custom_owner');
      localStorage.removeItem('invoice_maker_biz_profile');
      localStorage.removeItem('invoice_maker_invoices');
      localStorage.removeItem('invoice_maker_presets');
      localStorage.removeItem('invoice_maker_clients');
      localStorage.removeItem('invoice_maker_expenses');
      localStorage.removeItem('makbills_notifications');
      localStorage.removeItem('makbills_masters_vendors');
      localStorage.removeItem('makbills_masters_actual_vendors');
      localStorage.removeItem('makbills_masters_transports');
      localStorage.removeItem('makbills_masters_hsn');
      localStorage.removeItem('makbills_masters_materials');
      localStorage.removeItem('makbills_masters_categories');
      localStorage.removeItem('makbills_masters_subcategories');
      localStorage.removeItem('makbills_masters_gl');
      localStorage.removeItem('makbills_masters_mappings');
      window.dispatchEvent(new CustomEvent('makbills_sync_vendors'));
      window.dispatchEvent(new CustomEvent('makbills_sync_actual_vendors'));
      window.dispatchEvent(new CustomEvent('makbills_sync_transports'));

      setUser(null);
      setUserEmail(null);
      const locConfig = getLocalizationConfig();
      setProfile({
        uid: '',
        name: '',
        displayName: '',
        ownerName: '',
        email: '',
        phone: '',
        mobile: '',
        address: '',
        taxId: '',
        pan: '',
        currency: locConfig.currency || 'INR',
        defaultTaxRate: locConfig.defaultTaxRate || 18,
        bankName: '',
        accountNumber: '',
        ifsc: '',
        upiId: '',
        logoUrl: '',
        signature: '',
        updatedAt: new Date().toISOString()
      });
      setInvoices([]);
      setClients([]);
      setExpenses([]);
      setPresets([]);
      setCustomTemplates([]);
      isCloudLoadedRef.current = false;
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

  const getActiveUserId = (u?: User | null, emailVal?: string | null): string => {
    if (u?.id) return u.id;
    const effEmail = emailVal || userEmail || (typeof window !== 'undefined' ? localStorage.getItem('makbills_custom_email') : null);
    if (effEmail && effEmail.trim()) {
      return `user_${effEmail.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    }
    return '';
  };

  const sanitizeInvoiceForSync = (inv: Invoice, authUid?: string): any => {
    let targetUid = authUid;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!targetUid || !uuidRegex.test(targetUid)) {
      if (user?.id && uuidRegex.test(user.id)) {
        targetUid = user.id;
      } else {
        targetUid = undefined;
      }
    }

    const dataToSync: any = { ...inv };
    delete dataToSync.user_id;
    // Remove local-only tracking flags — never send to DB
    delete dataToSync._pendingSync;
    delete dataToSync._pendingDelete;
    
    if (targetUid) {
      dataToSync.userId = targetUid;
    } else {
      delete dataToSync.userId;
    }

    // Preserve the real embeddedTemplate object from the invoice
    const embeddedTemplate = { ...(dataToSync.embeddedTemplate || {}) };

    // Strip any field that is NOT in the allowed DB column list
    // (except embeddedTemplate itself, which we handle below)
    for (const key of Object.keys(dataToSync)) {
      if (!ALLOWED_SUPABASE_COLUMNS.includes(key) && key !== 'embeddedTemplate') {
        delete dataToSync[key];
      }
    }

    // Serialize the real embeddedTemplate object into the column,
    // but ONLY if it has actual template content (id, name, sections, etc.)
    // — never let isDeleted/deletedAt leak into this blob (they're now
    //   top-level columns handled by ALLOWED_SUPABASE_COLUMNS above).
    delete embeddedTemplate.isDeleted;
    delete embeddedTemplate.deletedAt;

    if (Object.keys(embeddedTemplate).length > 0) {
      dataToSync.embeddedTemplate = embeddedTemplate;
    } else {
      delete dataToSync.embeddedTemplate;
    }
    
    // Ensure mandatory columns on Supabase 'invoices' table are never null/NaN
    dataToSync.discountType = dataToSync.discountType || 'none';
    dataToSync.discountValue = Number.isFinite(Number(dataToSync.discountValue)) ? Number(dataToSync.discountValue) : 0;
    dataToSync.subtotal = Number.isFinite(Number(dataToSync.subtotal)) ? Number(dataToSync.subtotal) : 0;
    dataToSync.discountTotal = Number.isFinite(Number(dataToSync.discountTotal)) ? Number(dataToSync.discountTotal) : 0;
    dataToSync.taxTotal = Number.isFinite(Number(dataToSync.taxTotal)) ? Number(dataToSync.taxTotal) : 0;
    dataToSync.grandTotal = Number.isFinite(Number(dataToSync.grandTotal)) ? Number(dataToSync.grandTotal) : 0;
    dataToSync.freightCharges = Number.isFinite(Number(dataToSync.freightCharges)) ? Number(dataToSync.freightCharges) : 0;

    dataToSync.clientName = (dataToSync.clientName && String(dataToSync.clientName).trim()) ? dataToSync.clientName : 'Unnamed Client / Draft';
    dataToSync.invoiceNumber = (dataToSync.invoiceNumber && String(dataToSync.invoiceNumber).trim()) ? dataToSync.invoiceNumber : `DRAFT-${Date.now()}`;
    dataToSync.date = dataToSync.date || new Date().toISOString();
    dataToSync.dueDate = dataToSync.dueDate || dataToSync.date;

    delete dataToSync.selectedCustomTemplateId;
    
    return dataToSync;
  };

  // 2. Save Profile (Settings modifier)
  const handleSaveProfile = async (updatedProfile: BusinessProfile) => {
    const oldCurrency = profile.currency || 'INR';
    const newCurrency = updatedProfile.currency || 'INR';

    setProfile(updatedProfile);
    localStorage.setItem(`invoice_maker_biz_profile${suffix}`, JSON.stringify(updatedProfile));

    if (user) {
      const path = `users[uid=${user.id}]`;
      try {
        await supabase.from('users').upsert({ ...updatedProfile, uid: user.id });
      } catch (error) {
        handleSupabaseError(error, OperationType.WRITE, path);
      }
    }

    if (oldCurrency !== newCurrency) {
      try {
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        if (response.ok) {
          const data = await response.json();
          const rates = data.rates;
          
          if (rates && rates[oldCurrency] && rates[newCurrency]) {
            const factor = rates[newCurrency] / rates[oldCurrency];
            
            // 1. Convert all invoices
            const convertedInvoices = invoices.map(inv => {
              const items = (inv.items || []).map(item => ({
                ...item,
                rate: Number((item.rate * factor).toFixed(2))
              }));

              const subtotal = Number((inv.subtotal * factor).toFixed(2));
              const discountTotal = Number((inv.discountTotal * factor).toFixed(2));
              const taxTotal = Number((inv.taxTotal * factor).toFixed(2));
              const grandTotal = Number((inv.grandTotal * factor).toFixed(2));
              
              let discountValue = inv.discountValue;
              if (inv.discountType === 'flat') {
                discountValue = Number((inv.discountValue * factor).toFixed(2));
              }

              let freightCharges = inv.freightCharges;
              if (freightCharges !== undefined) {
                freightCharges = Number((freightCharges * factor).toFixed(2));
              }

              return {
                ...inv,
                items,
                subtotal,
                discountTotal,
                taxTotal,
                grandTotal,
                discountValue,
                freightCharges,
                paidAmount: inv.paidAmount !== undefined ? Number((inv.paidAmount * factor).toFixed(2)) : undefined
              };
            });
            
            setInvoices(convertedInvoices);
            localStorage.setItem(`invoice_maker_invoices${suffix}`, JSON.stringify(convertedInvoices));
            
            if (user) {
              const sanitizedInvoices = convertedInvoices.map(inv => sanitizeInvoiceForSync(inv));

              const { error } = await supabase.from('invoices').upsert(sanitizedInvoices);
              if (error) {
                console.error('[SETTINGS] Error upserting converted invoices:', error);
              }
            }

            // 2. Convert all expenses
            const convertedExpenses = expenses.map(exp => ({
              ...exp,
              amount: Number((exp.amount * factor).toFixed(2))
            }));
            
            setExpenses(convertedExpenses);
            localStorage.setItem(`invoice_maker_expenses${suffix}`, JSON.stringify(convertedExpenses));
            
            if (user) {
              const sanitizedExpenses = convertedExpenses.map(exp => {
                const sanitized: any = {};
                const validCols = ['id', 'userId', 'category', 'amount', 'date', 'description', 'createdAt'];
                validCols.forEach(col => {
                  if ((exp as any)[col] !== undefined) {
                    sanitized[col] = (exp as any)[col];
                  }
                });
                return sanitized;
              });

              const { error } = await supabase.from('expenses').upsert(sanitizedExpenses);
              if (error) {
                console.error('[SETTINGS] Error upserting converted expenses:', error);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error converting currency values:', err);
      }
    }
  };

  // 3. Save / Update Invoice
  const handleSaveInvoice = async (invoice: Invoice) => {
    // Document Quota Guard for newly created / published documents
    const existingInState = invoices.find(inv => inv.id === invoice.id);
    const isNewDocumentCreation = Boolean(
      (invoice as any).isNewDocument ||
      !existingInState ||
      existingInState.status === 'draft' ||
      (existingInState as any).isTempDraft ||
      (existingInState as any).isNewDocument
    );
    const isPublishingNewDoc = invoice.status !== 'draft' && isNewDocumentCreation;

    if (isPublishingNewDoc) {
      const { start, end } = getCurrentBillingCycleWindow();
      const startTime = start.getTime();
      const endTime = end.getTime();

      const activatedAtStr = typeof window !== 'undefined' ? localStorage.getItem('makbills_sub_activated_at') : null;
      const actTimestamp = activatedAtStr ? new Date(activatedAtStr).getTime() : 0;
      const effectiveStartTime = (!isNaN(actTimestamp) && actTimestamp > 0) ? Math.max(startTime, actTimestamp) : startTime;

      const monthlyDocCount = invoices.filter(inv => {
        if (inv.status === 'draft') return false;
        const tsStr = inv.createdAt || inv.date;
        if (!tsStr) return false;
        const dTime = new Date(tsStr).getTime();
        return !isNaN(dTime) && dTime >= effectiveStartTime && dTime < endTime;
      }).length;

      const limits = getTierLimits(subscriptionTier || 'free');
      if (monthlyDocCount >= limits.documentsPerMonth) {
        const errorMsg = `Subscription period document creation limit reached (${limits.documentsPerMonth} docs/period on ${(subscriptionTier || 'free').toUpperCase()} plan). Upgrade your plan to create more documents.`;
        showToast('Quota Exceeded 🔒', errorMsg, 'error');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('mak_navigate_tab', { detail: 'subscription' }));
        }
        throw new Error(errorMsg);
      }

      // CENTRAL DOCUMENT USAGE INCREMENT: Increment documents_used in subscription_usage table in Supabase
      try {
        const activeUid = await resolveSessionUid();
        const effectiveUid = activeUid || user?.id || (typeof window !== 'undefined' ? localStorage.getItem('makbills_user_id') : null);
        if (effectiveUid && effectiveUid !== 'local_user') {
          const nowIso = new Date().toISOString();
          supabase
            .from('subscription_usage')
            .select('id, documents_used')
            .eq('user_id', effectiveUid)
            .lte('period_start', nowIso)
            .gte('period_end', nowIso)
            .order('period_start', { ascending: false })
            .limit(1)
            .maybeSingle()
            .then(({ data: usageRow }) => {
              if (usageRow) {
                supabase.from('subscription_usage').update({
                  documents_used: (usageRow.documents_used ?? 0) + 1,
                  updated_at: new Date().toISOString(),
                }).eq('id', usageRow.id).then(({ error: uErr }) => {
                  if (!uErr) {
                    console.log('[handleSaveInvoice] Incremented documents_used in DB for user:', effectiveUid);
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('mak_subscription_change'));
                    }
                  }
                });
              } else {
                const now = new Date();
                const pEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                supabase.from('subscription_usage').insert({
                  user_id: effectiveUid,
                  period_start: now.toISOString(),
                  period_end: pEnd.toISOString(),
                  documents_used: 1,
                  reports_used: 0,
                }).then(() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('mak_subscription_change'));
                  }
                });
              }
            });
        }
      } catch (incErr) {
        console.warn('[handleSaveInvoice] Usage increment warning:', incErr);
      }
    }

    const clientsToUpsert: ClientProfile[] = [];
    let updatedClients = [...clients];

    // Clear any prior deleted tombstones so newly billed party immediately shows in Billed Clients/Vendors
    unmarkRegistryKeyDeleted(invoice, suffix);
    if (invoice.id) unmarkRegistryKeyDeleted(invoice.id, suffix);
    if (invoice.clientName) unmarkRegistryKeyDeleted(invoice.clientName, suffix);
    if (invoice.clientCompanyName || invoice.clientCompany) unmarkRegistryKeyDeleted(invoice.clientCompanyName || invoice.clientCompany, suffix);
    if (invoice.clientGstin) unmarkRegistryKeyDeleted(invoice.clientGstin, suffix);
    if (invoice.clientEmail) unmarkRegistryKeyDeleted(invoice.clientEmail, suffix);

    const processClientDetails = (invoice: Invoice) => {
      const n = (invoice.clientName || '').trim();
      const companyName = (invoice.clientCompanyName || invoice.clientCompany || '').trim();
      const e = (invoice.clientEmail || '').trim();
      const p = (invoice.clientPhone || '').trim();
      const a = (invoice.clientAddress || '').trim();
      const country = (invoice.clientCountry || 'India').trim();
      const state = (invoice.clientState || '').trim();
      const gstin = (invoice.clientGstin || '').trim();
      const pan = (invoice.clientPan || '').trim();

      if (!n && !companyName && !e && !gstin && !p) return;

      const incomingClient = {
        name: n || companyName,
        companyName: companyName || n,
        email: e,
        phone: p,
        address: a,
        country,
        state,
        gstin,
        taxId: gstin,
        pan,
        updatedAt: new Date().toISOString(),
      };

      const existingIdx = updatedClients.findIndex(c => isPartyMatch(c, incomingClient));
      const now = new Date().toISOString();

      if (existingIdx > -1) {
        const existing = updatedClients[existingIdx];
        const merged: ClientProfile = {
          ...existing,
          ...incomingClient,
          id: existing.id,
          name: n || existing.name || companyName,
          companyName: companyName || existing.companyName || n,
          email: e || existing.email,
          phone: p || existing.phone,
          address: a || existing.address,
          country: country || existing.country,
          state: state || existing.state,
          gstin: gstin || existing.gstin,
          taxId: gstin || existing.taxId,
          pan: pan || existing.pan,
          updatedAt: now,
          _pendingSync: true,
        };
        updatedClients[existingIdx] = merged;
        if (!clientsToUpsert.some(c => c.id === merged.id)) {
          clientsToUpsert.push(merged);
        }
        console.log('[App.tsx] processClientDetails: UPDATED client:', merged.name);
      } else {
        const clientToSave: ClientProfile = {
          id: crypto.randomUUID(),
          userId: user?.id || '',
          name: n || companyName,
          companyName: companyName || n,
          address: a,
          email: e,
          phone: p,
          country,
          state,
          gstin,
          taxId: gstin,
          pan,
          createdAt: now,
          updatedAt: now,
          _pendingSync: true,
        };
        clientsToUpsert.push(clientToSave);
        updatedClients = [clientToSave, ...updatedClients];
        console.log('[App.tsx] processClientDetails: INSERTED client:', clientToSave.name);
      }

      updatedClients = deduplicatePartyList(updatedClients);
    };

    // Process Vendor details for Purchase Ledger documents
    const processVendorDetails = async (invoiceObj: Invoice) => {
      try {
        const activeEmail = user?.email || (typeof window !== 'undefined' ? localStorage.getItem('makbills_user_email') : '') || '';
        const suffixKey = activeEmail ? `_${encodeURIComponent(activeEmail)}` : (typeof window !== 'undefined' ? (localStorage.getItem('makbills_company_suffix') || '') : '');
        const cachedRaw = typeof window !== 'undefined' && suffixKey ? localStorage.getItem(`makbills_masters_actual_vendors${suffixKey}`) : null;
        let existingVendors: any[] = cachedRaw ? JSON.parse(cachedRaw) : [];

        const vendorsToUpsert: any[] = [];

        const upsertOneVendor = (
          nameVal?: string,
          companyVal?: string,
          emailVal?: string,
          phoneVal?: string,
          addressVal?: string,
          gstinVal?: string,
          panVal?: string,
          stateVal?: string,
          countryVal?: string
        ) => {
          const n = (nameVal || '').trim();
          const companyName = (companyVal || '').trim();
          const e = (emailVal || '').trim();
          const p = (phoneVal || '').trim();
          const a = (addressVal || '').trim();
          const gstin = (gstinVal || '').trim();
          const pan = (panVal || '').trim();
          const state = (stateVal || '').trim();
          const country = (countryVal || 'India').trim();

          if (!n && !companyName && !e && !gstin && !p) return;

          const incomingVendor = {
            name: n || companyName,
            company: companyName || n,
            email: e,
            phone: p,
            address: a,
            gstin,
            pan,
            state,
            country,
            category: 'Vendor',
          };

          const existingIdx = existingVendors.findIndex(v => isPartyMatch(v, incomingVendor));

          if (existingIdx > -1) {
            const existing = existingVendors[existingIdx];
            const merged = mergePartyRecords(existing, incomingVendor);
            existingVendors[existingIdx] = merged;
            if (!vendorsToUpsert.some(v => v.id === merged.id)) {
              vendorsToUpsert.push(merged);
            }
            console.log('[App.tsx] processVendorDetails: UPDATED vendor:', merged.name);
          } else {
            const newVendor = {
              id: `av_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              ...incomingVendor,
              category: 'Vendor',
            };
            existingVendors = [newVendor, ...existingVendors];
            vendorsToUpsert.push(newVendor);
            console.log('[App.tsx] processVendorDetails: INSERTED vendor:', newVendor.name);
          }

          existingVendors = deduplicatePartyList(existingVendors);
        };

        // 1. Process Billed Vendor details
        upsertOneVendor(
          invoiceObj.clientName,
          invoiceObj.clientCompanyName || invoiceObj.clientCompany,
          invoiceObj.clientEmail,
          invoiceObj.clientPhone,
          invoiceObj.clientAddress,
          invoiceObj.clientGstin,
          invoiceObj.clientPan,
          invoiceObj.clientState,
          invoiceObj.clientCountry
        );

        // 2. Check if Shipped Vendor is distinct before processing to prevent duplicate entries
        const shippedName = (invoiceObj.shippedToName || '').trim();
        const shippedComp = (invoiceObj.shippedToCompanyName || invoiceObj.shippedToCompany || '').trim();
        const shippedGst = (invoiceObj.shippedToGstin || '').trim();

        if (shippedName || shippedComp || shippedGst) {
          const billedName = (invoiceObj.clientName || '').trim();
          const billedComp = (invoiceObj.clientCompanyName || invoiceObj.clientCompany || '').trim();
          const billedGst = (invoiceObj.clientGstin || '').trim();
          const billedEmail = (invoiceObj.clientEmail || '').trim();

          const isSameAsBilled = Boolean(
            (shippedGst && billedGst && shippedGst.toLowerCase() === billedGst.toLowerCase()) ||
            (shippedName && (shippedName.toLowerCase() === billedName.toLowerCase() || shippedName.toLowerCase() === billedComp.toLowerCase())) ||
            (shippedComp && (shippedComp.toLowerCase() === billedName.toLowerCase() || shippedComp.toLowerCase() === billedComp.toLowerCase())) ||
            (invoiceObj.shippedToEmail && billedEmail && invoiceObj.shippedToEmail.trim().toLowerCase() === billedEmail.toLowerCase())
          );

          if (!isSameAsBilled) {
            upsertOneVendor(
              invoiceObj.shippedToName,
              invoiceObj.shippedToCompanyName || invoiceObj.shippedToCompany,
              invoiceObj.shippedToEmail,
              invoiceObj.shippedToPhone,
              invoiceObj.shippedToAddress,
              invoiceObj.shippedToGstin,
              invoiceObj.shippedToPan,
              invoiceObj.shippedToState,
              invoiceObj.shippedToCountry
            );
          }
        }

        if (vendorsToUpsert.length > 0 && typeof window !== 'undefined' && suffixKey) {
          localStorage.setItem(`makbills_masters_actual_vendors${suffixKey}`, JSON.stringify(existingVendors));
          window.dispatchEvent(new CustomEvent('makbills_sync_actual_vendors'));

          const activeUid = await resolveSessionUid();
          const effectiveUid = activeUid || user?.id || localStorage.getItem('makbills_user_id');
          if (effectiveUid && effectiveUid !== 'local_user') {
            try {
              const vendorsWithUser = vendorsToUpsert.map(v => ({ ...v, user_id: effectiveUid }));
              await supabase.from('actual_vendors').upsert(vendorsWithUser, { onConflict: 'id' });
            } catch (vErr) {
              console.warn('[handleSaveInvoice] Supabase vendor sync warning:', vErr);
            }
          }
        }
      } catch (err) {
        console.error('[handleSaveInvoice] Vendor processing exception:', err);
      }
    };

    // Process Bill To / Vendor — pass full invoice so all fields are available
    const rawDocType = (invoice.invoiceType || '').toLowerCase().trim();
    const isPurchaseInvoice = isPurchaseDocument(rawDocType) || ['purchase', 'purchase_bill', 'vendor_bill', 'purchase_debit'].includes(rawDocType) || rawDocType.startsWith('purchase');
    if (isPurchaseInvoice) {
      // Purchase docs: save to actual_vendors (billed vendors & shipped vendors)
      await processVendorDetails(invoice);
    } else {
      // Sales docs: save to clients (billed clients)
      processClientDetails(invoice);
    }

    // ─── Sync to Master Registry (localStorage) ─────────────────────────────────
    // This ensures the party appears in Master Database and Billed Clients/Vendors views immediately.
    try {
      const partyDetails = buildClientDetails({
        clientName: (invoice.clientName || '').trim(),
        clientCompanyName: (invoice.clientCompanyName || invoice.clientCompany || '').trim(),
        clientEmail: (invoice.clientEmail || '').trim(),
        clientPhone: (invoice.clientPhone || '').trim(),
        clientAddress: (invoice.clientAddress || '').trim(),
        clientCountry: (invoice.clientCountry || 'India').trim(),
        clientState: (invoice.clientState || '').trim(),
        clientGstin: (invoice.clientGstin || '').trim(),
        clientPan: (invoice.clientPan || '').trim(),
      });
      upsertMasterRegistry(partyDetails, rawDocType, suffix);
    } catch (regErr) {
      console.warn('[handleSaveInvoice] Master registry sync warning:', regErr);
    }

    // Commit all client state updates and sync to database at once
    if (clientsToUpsert.length > 0) {
      setClients(updatedClients.filter(c => !c._pendingDelete));
      localStorage.setItem(`invoice_maker_clients${suffix}`, JSON.stringify(updatedClients));

      if (user) {
        try {
          const clientsWithUser = clientsToUpsert.map(c => ({
            ...c,
            userId: user.id,
            _pendingSync: undefined,
            _pendingDelete: undefined,
          }));
          const { error: syncErr } = await supabase.from('clients').upsert(clientsWithUser, { onConflict: 'id' });
          if (syncErr) {
            console.error('[App.tsx] Failed to sync client profiles to Supabase:', syncErr);
          } else {
            console.log('[App.tsx] ✅ Client profiles synced to Supabase:', clientsWithUser.length, 'record(s)');
            // Clear _pendingSync flag on success
            const cleared = updatedClients.map(c =>
              clientsToUpsert.some(u => u.id === c.id) ? { ...c, _pendingSync: undefined } : c
            );
            setClients(cleared.filter(c => !c._pendingDelete));
            localStorage.setItem(`invoice_maker_clients${suffix}`, JSON.stringify(cleared));
          }
        } catch (err) {
          console.error('[App.tsx] Exception syncing client profiles:', err);
        }
      }
    }


    const exists = invoices.some(inv => inv.id === invoice.id);
    const matchesList = exists
      ? invoices.map(inv => inv.id === invoice.id ? invoice : inv)
      : [invoice, ...invoices.filter(inv => inv.id !== invoice.id)];

    setInvoices(matchesList);
    localStorage.setItem(`invoice_maker_invoices${suffix}`, JSON.stringify(matchesList));
    localStorage.setItem('invoice_maker_invoices', JSON.stringify(matchesList));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('invoice_updated', { detail: invoice }));
      window.dispatchEvent(new CustomEvent('makbills_sync_vendors'));
      window.dispatchEvent(new CustomEvent('makbills_sync_actual_vendors'));
      window.dispatchEvent(new CustomEvent('makbills_registry_deleted'));
    }

    const activeUid = await resolveSessionUid();
    const effectiveUid = activeUid || user?.id || (typeof window !== 'undefined' ? localStorage.getItem('makbills_user_id') : null) || 'local_user';

    const dataToSync = sanitizeInvoiceForSync({ ...invoice, userId: effectiveUid }, effectiveUid);

    if (activeUid) {
      try {
        const { error: upsertError } = await supabase.from('invoices').upsert(dataToSync);
        if (upsertError) {
          console.warn('[handleSaveInvoice] Supabase upsert warning:', upsertError);
        } else {
          // Success path: fetch latest data from Supabase database
          const { data: latestData, error: fetchErr } = await supabase
            .from('invoices')
            .select('*')
            .eq('userId', activeUid)
            .order('date', { ascending: false });

          if (!fetchErr && latestData && latestData.length > 0) {
            const parsed = (latestData as Invoice[]).map(inv => {
              if (inv.selectedTemplateStyle && inv.selectedTemplateStyle.startsWith('{')) {
                try {
                  const embeddedTemplate = JSON.parse(inv.selectedTemplateStyle);
                  inv.embeddedTemplate = embeddedTemplate;
                  inv.selectedCustomTemplateId = embeddedTemplate?.id;
                  for (const key of Object.keys(embeddedTemplate)) {
                    if ((inv as any)[key] === undefined) {
                      (inv as any)[key] = embeddedTemplate[key];
                    }
                  }
                } catch (e) {}
              }
              return inv;
            });

            setInvoices(parsed);
            localStorage.setItem(`invoice_maker_invoices${suffix}`, JSON.stringify(parsed));
            localStorage.setItem('invoice_maker_invoices', JSON.stringify(parsed));
          }
        }
      } catch (cloudErr: any) {
        console.warn('[handleSaveInvoice] Cloud sync non-blocking exception:', cloudErr);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('invoice_updated', { detail: invoice }));
    }

    showToast('Saved Successfully', `${invoice.invoiceNumber || 'Document'} saved to ledger.`, 'success');
  };

  // 4. Delete Invoice
  const handleDeleteInvoice = async (invoiceId: string) => {
    const invoice = invoices.find(i => i.id === invoiceId);
    if (!invoice) return;
    const isDraft = invoice.status === 'draft';
    
    if (isDraft) {
      const confirmed = await confirm({
        title: 'Delete Draft',
        message: 'Are you sure you want to permanently delete this draft? This action cannot be undone.',
        confirmText: 'Delete'
      });
      if (!confirmed) return;

      const activeUid = await resolveSessionUid();
      if (!activeUid) {
        showToast('Authentication Error', 'You must be logged in to delete documents.', 'error');
        return;
      }

      try {
        const { error } = await supabase.from('invoices').delete().eq('id', invoiceId).eq('userId', activeUid);
        if (error) {
          console.error('Delete failed:', error);
          showToast('Delete Failed', `Cloud delete failed: ${error.message}`, 'error');
          return;
        }
        const remaining = invoices.filter(inv => inv.id !== invoiceId);
        setInvoices(remaining);
        localStorage.setItem(`invoice_maker_invoices${suffix}`, JSON.stringify(remaining));
        localStorage.setItem('invoice_maker_invoices', JSON.stringify(remaining));
        showToast('Draft Deleted', 'Draft permanently deleted from cloud.', 'info');
      } catch (e: any) {
        showToast('Delete Error', e.message || 'Failed to delete draft.', 'error');
      }
    } else {
      // Soft delete (Move to Bin)
      const confirmed = await confirm({
        title: 'Move to Bin',
        message: 'Are you sure you want to move this document to the bin?',
        confirmText: 'Move to Bin'
      });
      if (!confirmed) return;

      const activeUid = await resolveSessionUid();
      if (!activeUid) {
        showToast('Authentication Error', 'You must be logged in to move documents to Bin.', 'error');
        return;
      }

      try {
        const deletedAt = new Date().toISOString();
        const { error } = await supabase.from('invoices')
          .update({ isDeleted: true, deletedAt })
          .eq('id', invoiceId)
          .eq('userId', activeUid);
        if (error) {
          console.error('[SoftDelete] Failed:', error);
          showToast('Move to Bin Failed', `Couldn't move document to Bin in cloud: ${error.message}`, 'error');
          return;
        }
        const updated = invoices.map(inv => 
          inv.id === invoiceId ? { ...inv, isDeleted: true, deletedAt } : inv
        );
        setInvoices(updated);
        localStorage.setItem(`invoice_maker_invoices${suffix}`, JSON.stringify(updated));
        localStorage.setItem('invoice_maker_invoices', JSON.stringify(updated));
        showToast('Moved to Bin', 'Document moved to Bin in cloud.', 'info');
      } catch (error: any) {
        showToast('Move to Bin Error', error.message || 'Failed to move document to Bin.', 'error');
      }
    }
  };

  const handleHardDeleteInvoice = async (invoiceId: string) => {
    const confirmed = await confirm({
      title: 'Permanently Delete',
      message: 'Are you sure you want to permanently delete this document? This action cannot be undone.',
      confirmText: 'Delete Permanently'
    });
    if (!confirmed) return;

    const activeUid = await resolveSessionUid();
    if (!activeUid) {
      showToast('Authentication Error', 'You must be logged in to delete documents.', 'error');
      return;
    }

    try {
      const { error } = await supabase.from('invoices').delete().eq('id', invoiceId).eq('userId', activeUid);
      if (error) {
        console.error('Hard delete failed:', error);
        showToast('Delete Failed', `Cloud permanent delete failed: ${error.message}`, 'error');
        return;
      }
      const remaining = invoices.filter(inv => inv.id !== invoiceId);
      setInvoices(remaining);
      localStorage.setItem(`invoice_maker_invoices${suffix}`, JSON.stringify(remaining));
      localStorage.setItem('invoice_maker_invoices', JSON.stringify(remaining));
      showToast('Permanently Deleted', 'Document deleted from cloud.', 'info');
    } catch (error: any) {
      showToast('Delete Error', error.message || 'Failed to permanently delete document.', 'error');
    }
  };

  const handleBulkHardDeleteInvoices = async (invoiceIds: string[]) => {
    if (invoiceIds.length === 0) return;
    const confirmed = await confirm({
      title: 'Permanently Delete Selected',
      message: `Are you sure you want to permanently delete the ${invoiceIds.length} selected documents from Bin? This action cannot be undone.`,
      confirmText: 'Delete All Permanently'
    });
    if (!confirmed) return;

    const remaining = invoices.filter(inv => !invoiceIds.includes(inv.id));
    setInvoices(remaining);
    localStorage.setItem(`invoice_maker_invoices${suffix}`, JSON.stringify(remaining));
    localStorage.setItem('invoice_maker_invoices', JSON.stringify(remaining));

    const activeUid = await resolveSessionUid();
    if (activeUid) {
      try {
        const { error } = await supabase.from('invoices').delete().in('id', invoiceIds).eq('userId', activeUid);
        if (error) {
          console.error('[BulkHardDelete] Cloud delete failed:', error);
          invoiceIds.forEach(id => markInvoicePendingDelete(id));
        } else {
          showToast('Permanently Deleted', `Successfully deleted ${invoiceIds.length} document(s).`, 'info');
        }
      } catch (error: any) {
        console.error('[BulkHardDelete] Error:', error);
        invoiceIds.forEach(id => markInvoicePendingDelete(id));
      }
    } else {
      invoiceIds.forEach(id => markInvoicePendingDelete(id));
    }
  };

  const handleRestoreInvoice = async (invoiceId: string) => {
    const activeUid = await resolveSessionUid();
    if (!activeUid) {
      showToast('Authentication Error', 'You must be logged in to restore documents.', 'error');
      return;
    }

    try {
      const { error } = await supabase.from('invoices')
        .update({ isDeleted: false, deletedAt: null })
        .eq('id', invoiceId)
        .eq('userId', activeUid);
      if (error) {
        console.error('[Restore] Failed:', error);
        showToast('Restore Failed', `Couldn't restore document in cloud: ${error.message}`, 'error');
        return;
      }
      const updated = invoices.map(inv => {
        if (inv.id === invoiceId) {
          return {
            ...inv,
            isDeleted: false,
            deletedAt: undefined,
            updatedAt: new Date().toISOString()
          } as Invoice;
        }
        return inv;
      });
      setInvoices(updated);
      localStorage.setItem(`invoice_maker_invoices${suffix}`, JSON.stringify(updated));
      localStorage.setItem('invoice_maker_invoices', JSON.stringify(updated));
      showToast('Restored', 'Document restored in cloud.', 'success');
    } catch (error: any) {
      showToast('Restore Error', error.message || 'Failed to restore document.', 'error');
    }
  };

  // Bulk Delete Invoices
  const handleBulkDeleteInvoices = async (invoiceIds: string[]) => {
    if (invoiceIds.length === 0) return;
    
    // Check if any of the selected are non-drafts
    const selectedInvoices = invoices.filter(inv => invoiceIds.includes(inv.id));
    const hasNonDrafts = selectedInvoices.some(inv => inv.status !== 'draft');
    
    if (hasNonDrafts) {
      const confirmed = await confirm({
        title: 'Bulk Move to Bin / Delete',
        message: `Are you sure you want to process the ${invoiceIds.length} selected invoices? Drafts will be permanently deleted and others will be moved to the bin.`,
        confirmText: 'Confirm'
      });
      if (!confirmed) return;

      const draftsToDelete = selectedInvoices.filter(inv => inv.status === 'draft').map(i => i.id);
      
      const updated = invoices.map(inv => {
        if (invoiceIds.includes(inv.id) && inv.status !== 'draft') {
          return { ...inv, isDeleted: true, deletedAt: new Date().toISOString() };
        }
        return inv;
      }).filter(inv => !draftsToDelete.includes(inv.id));

      // Keep soft-deleted invoices in state (isDeleted:true) — Dashboard.tsx filters them to Bin.
      // Only hard-remove the permanently deleted drafts.
      setInvoices(updated);
      localStorage.setItem(`invoice_maker_invoices${suffix}`, JSON.stringify(updated));
      localStorage.setItem('invoice_maker_invoices', JSON.stringify(updated));

      const activeUid = await resolveSessionUid();
      if (activeUid) {
        try {
          if (draftsToDelete.length > 0) {
            const { error } = await supabase.from('invoices').delete().in('id', draftsToDelete).eq('userId', activeUid);
            if (error) {
              console.error('[BulkDelete] Draft hard-delete failed:', error.code, error.message);
              draftsToDelete.forEach(id => markInvoicePendingDelete(id));
            }
          }
          const toSoftDeleteIds = updated
            .filter(inv => invoiceIds.includes(inv.id) && inv.isDeleted)
            .map(inv => inv.id);
          if (toSoftDeleteIds.length > 0) {
            const deletedAt = new Date().toISOString();
            const { error } = await supabase.from('invoices')
              .update({ isDeleted: true, deletedAt })
              .in('id', toSoftDeleteIds)
              .eq('userId', activeUid);
            if (error) {
              console.error('[BulkDelete] Soft-delete failed:', error.code, error.message, error.details);
              showToast('Sync Failed', `Couldn't move ${toSoftDeleteIds.length} document(s) to Bin in cloud — will retry. (${error.message})`, 'error');
              toSoftDeleteIds.forEach(id => markInvoicePendingSync(id));
            }
          }
        } catch (error) {
          console.error('[BulkDelete] Exception:', error);
          draftsToDelete.forEach(id => markInvoicePendingDelete(id));
          updated.filter(inv => invoiceIds.includes(inv.id) && inv.isDeleted).forEach(inv => markInvoicePendingSync(inv.id));
        }
      } else {
        draftsToDelete.forEach(id => markInvoicePendingDelete(id));
        updated.filter(inv => invoiceIds.includes(inv.id) && inv.isDeleted).forEach(inv => markInvoicePendingSync(inv.id));
      }
    } else {
      // Only drafts
      const confirmed = await confirm({
        title: 'Bulk Delete Drafts',
        message: `Are you sure you want to permanently delete the ${invoiceIds.length} selected drafts? This action cannot be undone.`,
        confirmText: 'Delete All'
      });
      if (!confirmed) return;

      const remaining = invoices.filter(inv => !invoiceIds.includes(inv.id));
      setInvoices(remaining);
      localStorage.setItem(`invoice_maker_invoices${suffix}`, JSON.stringify(remaining));
      localStorage.setItem('invoice_maker_invoices', JSON.stringify(remaining));

      const activeUid = await resolveSessionUid();
      if (activeUid) {
        try {
          const { error } = await supabase.from('invoices').delete().in('id', invoiceIds).eq('userId', activeUid);
          if (error) {
            invoiceIds.forEach(id => markInvoicePendingDelete(id));
          }
        } catch (error) {
          invoiceIds.forEach(id => markInvoicePendingDelete(id));
        }
      } else {
        invoiceIds.forEach(id => markInvoicePendingDelete(id));
      }
    }
  };

  // Bulk Status Update Invoices
  const handleBulkUpdateInvoicesStatus = async (invoiceIds: string[], status: InvoiceStatus) => {
    if (invoiceIds.length === 0) return;
    const updated = invoices.map(inv => {
      if (invoiceIds.includes(inv.id)) {
        const paidDateUpdate: { paidDate?: string } = status === 'paid' && !inv.paidDate ? { paidDate: new Date().toISOString().split('T')[0] } : {};
        if (status !== 'paid') {
            paidDateUpdate.paidDate = undefined;
        }
        return { ...inv, status, updatedAt: new Date().toISOString(), ...paidDateUpdate };
      }
      return inv;
    });
    setInvoices(updated);
    localStorage.setItem(`invoice_maker_invoices${suffix}`, JSON.stringify(updated));
    localStorage.setItem('invoice_maker_invoices', JSON.stringify(updated));

    const activeUid = await resolveSessionUid();
    if (activeUid) {
      try {
        const bulkUpdates = invoiceIds.map(invoiceId => {
          const inv = updated.find(i => i.id === invoiceId);
          if (!inv) return null;
          return sanitizeInvoiceForSync(inv, activeUid);
        }).filter(Boolean);
        const { error } = await supabase.from('invoices').upsert(bulkUpdates);
        if (error) {
          invoiceIds.forEach(id => markInvoicePendingSync(id));
        }
      } catch (error) {
        invoiceIds.forEach(id => markInvoicePendingSync(id));
      }
    } else {
      invoiceIds.forEach(id => markInvoicePendingSync(id));
    }
  };

  const handleUpdateInvoice = async (updatedInv: Invoice) => {
    const updated = invoices.map(inv => inv.id === updatedInv.id ? updatedInv : inv);
    setInvoices(updated);
    localStorage.setItem(`invoice_maker_invoices${suffix}`, JSON.stringify(updated));
    localStorage.setItem('invoice_maker_invoices', JSON.stringify(updated));
    
    const activeUid = await resolveSessionUid();
    if (activeUid) {
      try {
        const dataToSync = sanitizeInvoiceForSync(updatedInv, activeUid);
        const { error } = await supabase.from('invoices').upsert(dataToSync);
        if (error) {
          markInvoicePendingSync(updatedInv.id);
        }
      } catch (error) {
        markInvoicePendingSync(updatedInv.id);
      }
    } else {
      markInvoicePendingSync(updatedInv.id);
    }
  };

  // 5. Onboarding quick-start preset templates loader
  const handleLoadPresetTemplate = async (templateId: string) => {
    const template = BUSINESS_TEMPLATES.find(p => p.id === templateId);
    if (!template) return;

    // Load business details
    const cleanProfile: BusinessProfile = {
      uid: user?.id || '',
      name: template.defaultProfile.name || '',
      email: template.defaultProfile.email || '',
      phone: template.defaultProfile.phone || '',
      address: template.defaultProfile.address || '',
      taxId: template.defaultProfile.taxId || '',
      currency: template.defaultProfile.currency || 'INR',
      defaultTaxRate: template.defaultProfile.defaultTaxRate || 18,
      updatedAt: new Date().toISOString()
    };

    setProfile(cleanProfile);
    localStorage.setItem(`invoice_maker_biz_profile${suffix}`, JSON.stringify(cleanProfile));

    // Seed preset catalog items
    const seededPresets: PresetItem[] = template.items.map((it) => ({
      id: it.id,
      userId: user?.id || '',
      name: it.name,
      rate: it.rate,
      taxPercentage: it.taxPercentage,
      description: it.description
    }));

    setPresets(seededPresets);
    localStorage.setItem(`invoice_maker_presets${suffix}`, JSON.stringify(seededPresets));

    // Clear and seed an initial example bill matching template
    const sample = getSampleInvoice(templateId, user?.id || '');
    setInvoices([sample]);
    localStorage.setItem(`invoice_maker_invoices${suffix}`, JSON.stringify([sample]));

    if (user) {
      // Sync seeded configurations to Supabase
      try {
        await supabase.from('users').upsert({ ...cleanProfile, uid: user.id });
        await supabase.from('invoices').upsert(sanitizeInvoiceForSync(sample));
        if (seededPresets.length > 0) {
          await supabase.from('preset_items').upsert(
            seededPresets.map(p => ({ ...p, userId: user.id }))
          );
        }
      } catch (err) {
        console.error('Failed to sync seeded template configurations', err);
      }
    }

    alert(`Successfully loaded '${template.name}' presets!`);
  };

  // 6. Sync local unsynced invoices up to cloud (Triggered only for current user's suffixed pending items)
  const handleSyncLocalInvoices = async () => {
    if (!user || !userEmail) return;

    const currentSuffix = `_${encodeURIComponent(userEmail)}`;
    const localInvoicesStr = localStorage.getItem(`invoice_maker_invoices${currentSuffix}`);
    const localClientsStr = localStorage.getItem(`invoice_maker_clients${currentSuffix}`);
    const localExpensesStr = localStorage.getItem(`invoice_maker_expenses${currentSuffix}`);
    const localPresetsStr = localStorage.getItem(`invoice_maker_presets${currentSuffix}`);
    const localProfileStr = localStorage.getItem(`invoice_maker_biz_profile${currentSuffix}`);

    try {
      // 1. Sync Invoices
      let syncedCount = 0;
      if (localInvoicesStr) {
        const localInvoices: Invoice[] = JSON.parse(localInvoicesStr);
        const toSync = localInvoices
          .filter(inv => !inv.userId)
          .map(inv => sanitizeInvoiceForSync({
            ...inv,
            updatedAt: new Date().toISOString(),
          }));
        if (toSync.length > 0) {
          const { error } = await supabase.from('invoices').upsert(toSync);
          if (error) console.error('Failed syncing offline invoices:', error);
          else syncedCount = toSync.length;
        }
      }

      // 2. Sync Clients
      if (localClientsStr) {
        const localClients: ClientProfile[] = JSON.parse(localClientsStr);
        const toSync = localClients
          .filter(c => !c.userId)
          .map(c => ({
            ...c,
            userId: user.id,
            updatedAt: new Date().toISOString(),
          }));
        if (toSync.length > 0) {
          const { error } = await supabase.from('clients').upsert(toSync);
          if (error) console.error('Failed syncing offline clients:', error);
        }
      }

      // 3. Sync Expenses
      if (localExpensesStr) {
        const localExpenses: Expense[] = JSON.parse(localExpensesStr);
        const toSync = localExpenses
          .filter(e => !e.userId)
          .map(e => ({
            ...e,
            userId: user.id,
            updatedAt: new Date().toISOString(),
          }));
        if (toSync.length > 0) {
          const { error } = await supabase.from('expenses').upsert(toSync);
          if (error) console.error('Failed syncing offline expenses:', error);
        }
      }

      // 4. Sync Presets
      if (localPresetsStr) {
        const localPresets: PresetItem[] = JSON.parse(localPresetsStr);
        const toSync = localPresets
          .filter(p => !p.userId)
          .map(p => ({
            ...p,
            userId: user.id,
            updatedAt: new Date().toISOString(),
          }));
        if (toSync.length > 0) {
          const { error } = await supabase.from('preset_items').upsert(toSync);
          if (error) console.error('Failed syncing offline presets:', error);
        }
      }

      // 5. Sync Business Profile
      if (localProfileStr) {
        const localProfile: BusinessProfile = JSON.parse(localProfileStr);
        if (!localProfile.uid) {
          const updatedProfile = {
            ...localProfile,
            uid: user.id,
            email: user.email || localProfile.email,
            updatedAt: new Date().toISOString(),
          };
          const { error } = await supabase.from('users').upsert(updatedProfile);
          if (error) console.error('Failed syncing business profile:', error);
        }
      }

      // Alert only if something was synced
      if (syncedCount > 0) {
        alert(`Cloud sync complete. ${syncedCount} offline invoices synced to your cloud account!`);
      }
      
      // Clear offline local storage keys to prevent duplicate syncs
      localStorage.removeItem('invoice_maker_invoices');
      localStorage.removeItem('invoice_maker_clients');
      localStorage.removeItem('invoice_maker_expenses');
      localStorage.removeItem('invoice_maker_presets');
      localStorage.removeItem('invoice_maker_biz_profile');
      
      // Reload current data from cloud/active profile suffix
      loadLocalData(user.email);
    } catch (err) {
      console.error('Failed syncing offline data:', err);
    }
  };

  // --- CLIENT ACTIONS ---
  const handleSaveClient = async (client: ClientProfile) => {
    const exists = clients.some(c => c.id === client.id);
    const updated = exists ? clients.map(c => c.id === client.id ? client : c) : [client, ...clients.filter(c => c.id !== client.id)];
    setClients(updated);
    localStorage.setItem(`invoice_maker_clients${suffix}`, JSON.stringify(updated));

    const activeUid = await resolveSessionUid();
    if (activeUid) {
      const clientWithUser = { ...client, userId: activeUid };
      try {
        const { error } = await supabase.from('clients').upsert(clientWithUser);
        if (error) {
          markClientPendingSync(client.id);
        }
      } catch (err) {
        markClientPendingSync(client.id);
      }
    } else {
      markClientPendingSync(client.id);
    }
  };

  const handleDeleteClient = async (clientId: string, skipConfirm = false) => {
    if (!skipConfirm) {
      const confirmed = await confirm({
        title: 'Delete Client',
        message: 'Are you sure you want to permanently delete this client profile? This action cannot be undone.',
        confirmText: 'Delete'
      });
      if (!confirmed) return;
    }

    const clean = (s: any) => String(s || '').trim().toLowerCase();

    // Find client in local clients state by ID or cross-field matching
    const clientToDelete = clients.find(c => c.id === clientId) ||
      clients.find(c => {
        if (!clientId) return false;
        const cId = clean(clientId);
        const n = clean(c.name);
        const comp = clean((c as any).companyName || (c as any).company);
        const gst = clean((c as any).gstin || (c as any).taxId);
        const em = clean(c.email);
        return (n && cId.includes(n)) || (comp && cId.includes(comp)) || (gst && cId.includes(gst)) || (em && cId.includes(em));
      });

    const clientName = clientToDelete?.name?.trim() || '';
    const compName = ((clientToDelete as any)?.companyName || (clientToDelete as any)?.company || '').trim();
    const gstin = ((clientToDelete as any)?.gstin || (clientToDelete as any)?.taxId || '').trim();
    const email = (clientToDelete?.email || '').trim();

    // Mark tombstones to prevent resurrecting
    if (clientToDelete) {
      markRegistryKeyDeleted(clientToDelete, suffix);
    }
    markRegistryKeyDeleted(clientId, suffix);
    if (clientName) markRegistryKeyDeleted(clientName, suffix);
    if (compName) markRegistryKeyDeleted(compName, suffix);
    if (gstin) markRegistryKeyDeleted(gstin, suffix);
    if (email) markRegistryKeyDeleted(email, suffix);

    const matchesClient = (c: any) => {
      if (c.id === clientId) return true;
      if (clientToDelete && c.id === clientToDelete.id) return true;
      const cName = clean(c.name);
      const cComp = clean((c as any).companyName || (c as any).company);
      const cGst = clean((c as any).gstin || (c as any).taxId);
      const cEmail = clean(c.email);

      if (gstin && cGst && cGst === clean(gstin)) return true;
      if (email && cEmail && cEmail === clean(email)) return true;
      if (clientName && (cName === clean(clientName) || cComp === clean(clientName))) return true;
      if (compName && (cComp === clean(compName) || cName === clean(compName))) return true;
      return false;
    };

    // Filter out all duplicates by ID and by name/comp/gstin from local state
    const remaining = clients.filter(c => !matchesClient(c));
    setClients(remaining);
    localStorage.setItem(`invoice_maker_clients${suffix}`, JSON.stringify(remaining));

    // Also update and sync Master Registry Client Database (vendors)
    const existingVendors = getLocalMasterRegistry('makbills_masters_vendors', suffix);
    const updatedVendors = existingVendors.filter((v: any) => !matchesClient(v));
    localStorage.setItem(`makbills_masters_vendors${suffix}`, JSON.stringify(updatedVendors));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('makbills_sync_vendors'));
      window.dispatchEvent(new CustomEvent('makbills_registry_deleted'));
    }

    const activeUid = await resolveSessionUid();
    if (activeUid) {
      try {
        // Push updated vendors to company_settings
        pushMasterRegistriesToCloud(activeUid, suffix, { vendors: updatedVendors });

        let query = supabase.from('clients').delete().eq('userId', activeUid);
        if (clientToDelete?.id && clientToDelete.id !== clientId) {
          query = query.or(`id.eq.${clientId},id.eq.${clientToDelete.id}${clientName ? `,name.ilike.${clientName}` : ''}`);
        } else if (clientName) {
          query = query.or(`id.eq.${clientId},name.ilike.${clientName}`);
        } else {
          query = query.eq('id', clientId);
        }
        const { error } = await query;
        if (error) {
          markClientPendingDelete(clientId);
        }
      } catch (err) {
        markClientPendingDelete(clientId);
      }
    } else {
      markClientPendingDelete(clientId);
    }
  };

  // --- EXPENSE ACTIONS ---
  const handleSaveExpense = async (expense: Expense) => {
    const exists = expenses.some(e => e.id === expense.id);
    const updated = exists ? expenses.map(e => e.id === expense.id ? expense : e) : [expense, ...expenses.filter(e => e.id !== expense.id)];
    setExpenses(updated);
    localStorage.setItem(`invoice_maker_expenses${suffix}`, JSON.stringify(updated));



    const activeUid = await resolveSessionUid();
    if (activeUid) {
      const expenseWithUser = { ...expense, userId: activeUid };
      try {
        const { error } = await supabase.from('expenses').upsert(expenseWithUser);
        if (error) {
          markExpensePendingSync(expense.id);
        }
      } catch (err) {
        markExpensePendingSync(expense.id);
      }
    } else {
      markExpensePendingSync(expense.id);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    const confirmed = await confirm({
      title: 'Delete Expense',
      message: 'Are you sure you want to permanently delete this business expense? This action cannot be undone.',
      confirmText: 'Delete'
    });
    if (!confirmed) return;

    const remaining = expenses.filter(e => e.id !== expenseId);
    setExpenses(remaining);
    localStorage.setItem(`invoice_maker_expenses${suffix}`, JSON.stringify(remaining));

    const activeUid = await resolveSessionUid();
    if (activeUid) {
      try {
        const { error } = await supabase.from('expenses').delete().eq('id', expenseId).eq('userId', activeUid);
        if (error) {
          markExpensePendingDelete(expenseId);
        }
      } catch (err) {
        markExpensePendingDelete(expenseId);
      }
    } else {
      markExpensePendingDelete(expenseId);
    }
  };

  // --- RECURRING BILL SCHEDULER ALGORITHM ---
  //
  // MUST STAY IN SYNC WITH backend/app/services/scheduler.py
  //   - get_next_scheduled_date() mirrors getNextScheduledDate() below
  //   - child ID format mirrors _make_child_id() in scheduler.py
  //   - the while(iterations < 10) backfill loop is identical in both
  // If you change date arithmetic or ID format here, update the backend too.
  const getNextScheduledDate = (currentDateStr: string, interval: 'weekly' | 'bi-weekly' | 'monthly' | 'yearly'): string => {
    const date = new Date(currentDateStr);
    if (isNaN(date.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    if (interval === 'weekly') {
      date.setDate(date.getDate() + 7);
    } else if (interval === 'bi-weekly') {
      date.setDate(date.getDate() + 14);
    } else if (interval === 'monthly') {
      date.setMonth(date.getMonth() + 1);
    } else if (interval === 'yearly') {
      date.setFullYear(date.getFullYear() + 1);
    }
    return date.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (invoices.length === 0) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const newSpawned: Invoice[] = [];
    const updatedParents: Invoice[] = [];

    invoices.forEach((parent) => {
      // Only process parents that have active recurring rules
      if (!parent.recurringSettings || !parent.recurringSettings.isRecurring || parent.recurringSettings.hasEnded) {
        return;
      }

      const settings = parent.recurringSettings;
      const interval = settings.interval;
      const startDate = settings.startDate;
      const endDate = settings.endDate;

      if (todayStr < startDate) return;

      const cursorDate = settings.lastGeneratedDate || startDate;
      if (settings.lastGeneratedDate && settings.lastGeneratedDate >= todayStr) return;

      let tempLastGenerated = cursorDate;
      let iterations = 0;

      while (iterations < 10) {
        const nextDate = getNextScheduledDate(tempLastGenerated, interval);
        
        if (nextDate > todayStr) {
          break;
        }

        if (endDate && nextDate > endDate) {
          parent.recurringSettings.hasEnded = true;
          break;
        }

        // Idempotency guard #2: deterministic child ID.
        // Format: inv_rec_{parentId}_{YYYYMMDD} — must stay in sync with
        // backend/app/services/scheduler.py _make_child_id().
        // Using a stable ID means if the server scheduler runs on the same day,
        // its DB insert hits ON CONFLICT (parentInvoiceId, date) and is ignored.
        const safeDate = nextDate.replace(/-/g, '');
        const spawnNumber = `${parent.invoiceNumber}-R${Math.floor(100 + Math.random() * 900)}`;
        const spawnInvoice: Invoice = {
          ...parent,
          id: `inv_rec_${parent.id}_${safeDate}`,
          invoiceNumber: spawnNumber,
          date: nextDate,
          dueDate: new Date(new Date(nextDate).setDate(new Date(nextDate).getDate() + 14)).toISOString().split('T')[0],
          status: 'pending', // Pending payment initial state
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          parentInvoiceId: parent.id,
          recurringSettings: undefined // child of recurring model is just a static bill
        };

        newSpawned.push(spawnInvoice);
        tempLastGenerated = nextDate;
        iterations++;
      }

      if (tempLastGenerated !== cursorDate || parent.recurringSettings.hasEnded) {
        const updatedParent: Invoice = {
          ...parent,
          recurringSettings: {
            ...settings,
            lastGeneratedDate: tempLastGenerated,
            hasEnded: parent.recurringSettings.hasEnded
          },
          updatedAt: new Date().toISOString()
        };
        updatedParents.push(updatedParent);
      }
    });

    if (newSpawned.length > 0) {
      // Trigger a beautiful notification alert
      const numbers = newSpawned.map(v => v.invoiceNumber).join(', ');
      alert(`[Recurring Schedules Manager] Automatically generated & drafted ${newSpawned.length} repeating bills under schedule dates: [${numbers}]. All recurring document iterations were immediately completed!`);

      let nextInvoices = [...invoices];

      updatedParents.forEach((up) => {
        nextInvoices = nextInvoices.map(it => it.id === up.id ? up : it);
      });

      newSpawned.forEach((ch) => {
        nextInvoices = [ch, ...nextInvoices];
      });

      if (user) {
        const allToSync = [
          ...updatedParents.map(up => sanitizeInvoiceForSync(up)),
          ...newSpawned.map(ch => sanitizeInvoiceForSync(ch)),
        ];
        supabase.from('invoices').upsert(allToSync).then(({ error }) => {
          if (error) console.error('Failed to sync recurring invoices:', error);
        });
      }

      setInvoices(nextInvoices);
      localStorage.setItem(`invoice_maker_invoices${suffix}`, JSON.stringify(nextInvoices));
    }
  }, [invoices.length, user]);

  const handleOpenInvoiceEditor = (invoice: Invoice | null) => {
    setEditingInvoice(invoice);
    setIsInvoiceEditorOpen(true);
  };

  // Generate on-the-fly dynamic CSS customization variables
  const getDynamicCustomizationStyle = () => {
    const accent = profile.themeAccent || 'sky';
    const font = profile.invoiceFont || 'inter';
    
    const accents = {
      sky: { light: '#0284c7', dark: '#38bdf8' },
      emerald: { light: '#059669', dark: '#10b981' },
      indigo: { light: '#4f46e5', dark: '#6366f1' },
      violet: { light: '#7c3aed', dark: '#8b5cf6' },
      rose: { light: '#e11d48', dark: '#f43f5e' },
      orange: { light: '#ea580c', dark: '#f97316' }
    };

    const fonts = {
      inter: '"Plus Jakarta Sans", "Inter", sans-serif',
      space: '"Space Grotesk", sans-serif',
      playfair: '"Playfair Display", serif',
      mono: '"JetBrains Mono", monospace'
    };

    const activeAccent = accents[accent] || accents.sky;
    const activeFont = fonts[font] || fonts.inter;
    const accentColor = theme === 'dark' ? activeAccent.dark : activeAccent.light;

    return `
      :root, .dark, html {
        --color-sky-600: ${accentColor} !important;
        --color-sky-500: ${accentColor} !important;
        --font-sans: ${activeFont} !important;
      }
    `;
  };

  const handlePublicNavigate = (path: string) => {
    if (path.includes('#')) {
      const [base, hash] = path.split('#');
      setPublicPath(base || '/');
      window.history.pushState({}, '', path);
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      setPublicPath(path);
      window.history.pushState({}, '', path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // --- RENDERING CONFIGURATION ---
  if (urlAuthError) {
    return (
      <AuthScreen
        defaultMode="forgot-password"
        initialError={urlAuthError}
        onPasswordResetComplete={() => {
          setUrlAuthError(null);
          setIsPasswordResetMode(false);
        }}
      />
    );
  }

  if (isPasswordResetMode) {
    return (
      <AuthScreen
        defaultMode="reset-password"
        onPasswordResetComplete={() => setIsPasswordResetMode(false)}
      />
    );
  }

  if (isAuthLoading || isUnlocked === null) {
    return <MakLoader variant="full-screen" label="Loading MakInvoices Workspace..." />;
  }

  if (!userEmail) {
    if (publicPath === '/pricing') {
      return (
        <PricingPage
          theme={theme}
          onNavigate={handlePublicNavigate}
          onGoogleLogin={handleLogin}
        />
      );
    }
    if (publicPath === '/guide') {
      return (
        <GuidePage
          theme={theme}
          onNavigate={handlePublicNavigate}
          onGoogleLogin={handleLogin}
        />
      );
    }
    if (publicPath === '/terms') {
      return (
        <TermsPage
          theme={theme}
          onNavigate={handlePublicNavigate}
          onGoogleLogin={handleLogin}
        />
      );
    }

    if (publicPath === '/privacy') {
      return (
        <PrivacyPage
          theme={theme}
          onNavigate={handlePublicNavigate}
          onGoogleLogin={handleLogin}
        />
      );
    }

    if (publicPath === '/security') {
      return (
        <SecurityPage
          theme={theme}
          onNavigate={handlePublicNavigate}
          onGoogleLogin={handleLogin}
        />
      );
    }

    if (publicPath === '/about') {
      return (
        <AboutPage
          theme={theme}
          onNavigate={handlePublicNavigate}
          onGoogleLogin={handleLogin}
        />
      );
    }

    if (publicPath === '/contact') {
      return (
        <ContactPage
          theme={theme}
          onNavigate={handlePublicNavigate}
          onGoogleLogin={handleLogin}
        />
      );
    }

    if (publicPath === '/login') {
      return (
        <AuthScreen
          defaultMode="login"
          onNavigate={handlePublicNavigate}
        />
      );
    }

    if (publicPath === '/signup') {
      return (
        <AuthScreen
          defaultMode="signup"
          onNavigate={handlePublicNavigate}
        />
      );
    }

    return (
      <Homepage
        isOnline={typeof navigator !== 'undefined' ? navigator.onLine : true}
        theme={theme}
        onGoogleLogin={handleLogin}
        onCustomSignup={handleCustomSignup}
        onCustomLogin={handleCustomLogin}
        onNavigate={handlePublicNavigate}
      />
    );
  }



  if (!isUnlocked) {
    return <BiometricVerification onSuccess={() => setIsUnlocked(true)} />;
  }

  return (
    <>
      <style>{getDynamicCustomizationStyle()}</style>
      {/* Visual Workspace Dashboard */}
      <Dashboard
        isOnline={typeof navigator !== 'undefined' ? navigator.onLine : true}
        invoices={invoices}
        profile={profile}
        presets={presets}
        clients={clients}
        expenses={expenses}
        theme={theme}
        toggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
        userEmail={userEmail}
        onLogin={handleLogin}
        pendingSyncCount={
          invoices.filter(i => i._pendingSync || i._pendingDelete).length
          + clients.filter(c => c._pendingSync || c._pendingDelete).length
          + expenses.filter(e => e._pendingSync || e._pendingDelete).length
        }
        onLogout={handleLogout}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenInvoiceEditor={handleOpenInvoiceEditor}
        onCloseInvoiceEditor={() => setIsInvoiceEditorOpen(false)}
        onDeleteInvoice={handleDeleteInvoice}
        onRestoreInvoice={handleRestoreInvoice}
        onHardDeleteInvoice={handleHardDeleteInvoice}
        onBulkHardDeleteInvoices={handleBulkHardDeleteInvoices}
        onBulkDeleteInvoices={handleBulkDeleteInvoices}
        onBulkUpdateInvoicesStatus={handleBulkUpdateInvoicesStatus}
        onUpdateInvoice={handleUpdateInvoice}
        onLoadPresetTemplate={handleLoadPresetTemplate}
        isPinLockEnabled={securitySettings.isPinLockEnabled}
        onToggleSecurity={handleToggleSecurity}
        onSyncLocalInvoices={handleSyncLocalInvoices}
        onSaveClient={handleSaveClient}
        onDeleteClient={handleDeleteClient}
        onSaveExpense={handleSaveExpense}
        onDeleteExpense={handleDeleteExpense}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        subscriptionTier={subscriptionTier || 'free'}
      />

      {/* Sub-modals Settings View selectors */}
      <BusinessProfileModal
        profile={profile}
        isOpen={isProfileOpen}
        isOnboarding={isOnboarding}
        onClose={() => {
          setIsProfileOpen(false);
          setIsOnboarding(false);
        }}
        onSave={handleSaveProfile}
        subscriptionTier={subscriptionTier || 'free'}
      />

      <InvoiceModal
        theme={theme}
        invoice={editingInvoice}
        presets={presets}
        clients={clients}
        invoices={invoices}
        profile={profile}
        currencySymbol={profile.currencySymbol || (profile.currency === 'GBP' ? '£' : profile.currency === 'EUR' ? '€' : profile.currency === 'JPY' ? '¥' : profile.currency === 'INR' ? '₹' : '$')}
        defaultTaxRate={profile.defaultTaxRate}
        isOpen={isInvoiceEditorOpen}
        onClose={() => setIsInvoiceEditorOpen(false)}
        onSave={handleSaveInvoice}
        userId={user?.id || null}
        subscriptionTier={subscriptionTier || 'free'}
      />

      {/* PIN Setup Modal */}
      <PinSetupModal
        isOpen={pinModalOpen}
        mode={pinModalMode}
        onConfirm={handlePinConfirm}
        onCancel={() => { setPinModalOpen(false); setPinModalError(''); }}
        isLoading={pinModalLoading}
        errorMessage={pinModalError}
      />
    </>
  );
}
