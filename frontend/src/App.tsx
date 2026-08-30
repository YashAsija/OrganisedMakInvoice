import React, { useState, useEffect, useRef } from 'react';
import AuthScreen from './components/AuthScreen';
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
  'station', 'ewayBillNo', 'shippedToName', 'shippedToCompanyName', 'shippedToPhone', 'shippedToEmail', 
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
      errorString.includes('Supabase')
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
import BiometricVerification from './components/BiometricVerification';
import { useConfirm } from './components/ConfirmContext';
import Dashboard from './components/Dashboard';
import BusinessProfileModal from './components/BusinessProfileModal';
import InvoiceModal from './components/InvoiceModal';
import Homepage from './components/Homepage';
import PricingPage from './components/PricingPage';
import GuidePage from './components/GuidePage';
import ContactPage from './components/ContactPage';
import SecurityPage from './components/SecurityPage';
import TermsPage from './components/TermsPage';
import PrivacyPage from './components/PrivacyPage';
import AboutPage from './components/AboutPage';
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
  const [isUnlocked, setIsUnlocked] = useState<boolean | null>(null);

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
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
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
            return 'The password reset link is invalid or has expired. Please enter your email below to request a new link.';
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
        return 'invoices';
      }
      if (path.startsWith('/invoice-templates')) {
        return 'invoice_templates';
      }
      if (path.startsWith('/purchases')) {
        return 'purchases';
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

  // Main Business state
  const [profile, setProfile] = useState<BusinessProfile>({
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

  const [subscriptionTier, setSubscriptionTier] = useState<'free' | 'basic' | 'pro' | 'unlimited' | 'enterprise'>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('makbills_subscription_tier');
      return (cached as 'free' | 'basic' | 'pro' | 'unlimited' | 'enterprise') || 'free';
    }
    return 'free';
  });

  useEffect(() => {
    const handleSubChange = (e: any) => {
      const newTier = e.detail || localStorage.getItem('makbills_subscription_tier') || 'free';
      setSubscriptionTier(newTier as any);
    };
    window.addEventListener('mak_subscription_change', handleSubChange);
    window.addEventListener('storage', handleSubChange);
    return () => {
      window.removeEventListener('mak_subscription_change', handleSubChange);
      window.removeEventListener('storage', handleSubChange);
    };
  }, []);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const isCloudLoadedRef = useRef<boolean>(false);
  const [presets, setPresets] = useState<PresetItem[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customTemplates, setCustomTemplates] = useState<InvoiceTemplate[]>([]);

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
        let expectedPath = tabToPath[activeTab] || '/invoices';
        if (isInvoiceEditorOpen) {
          expectedPath = '/quick-bill';
        } else if (isProfileOpen) {
          expectedPath = '/company-settings';
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
          window.history.pushState(null, '', expectedPath);
        }
      } else {
        const expectedPath = publicPath;
        if (path !== expectedPath) {
          window.history.pushState(null, '', expectedPath);
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
              // If at root or /dashboard on back navigation, default to invoices (Sales Ledger)
              setActiveTab('invoices');
            }
          }
        } else {
          setPublicPath(['/pricing', '/guide', '/contact', '/security', '/terms', '/privacy'].includes(path) ? path : '/');
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
  const loadLocalData = (emailParam?: string | null) => {
    if (isCloudLoadedRef.current) {
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

    // Invoices list (combines suffixed and guest storage to prevent loss across auth shifts)
    const localMap = new Map<string, Invoice>();
    const localSourcesInit = [
      localStorage.getItem(`invoice_maker_invoices${suffix}`),
      localStorage.getItem('invoice_maker_invoices')
    ];
    localSourcesInit.forEach(raw => {
      if (raw) {
        try {
          const list: Invoice[] = JSON.parse(raw);
          if (Array.isArray(list)) {
            list.forEach((inv: Invoice) => {
              if (inv && inv.id) {
                const existing = localMap.get(inv.id);
                if (!existing) localMap.set(inv.id, inv);
                else localMap.set(inv.id, { ...existing, ...inv });
              }
            });
          }
        } catch (e) {}
      }
    });

    const initialInvoicesList = Array.from(localMap.values());
    const visibleInvoicesList = initialInvoicesList.filter((inv: any) => !inv._pendingDelete);
    setInvoices(visibleInvoicesList);
    if (initialInvoicesList.length > 0) {
      localStorage.setItem(`invoice_maker_invoices${suffix}`, JSON.stringify(initialInvoicesList));
      localStorage.setItem('invoice_maker_invoices', JSON.stringify(initialInvoicesList));
    }

    // Presets catalog
    const localPresets = localStorage.getItem(`invoice_maker_presets${suffix}`);
    if (localPresets) {
      try {
        setPresets(JSON.parse(localPresets));
      } catch (e) {
        console.warn('Failed to parse local presets');
      }
    } else {
      // Load standard freelance templates catalog
      const standardTemplateItems = BUSINESS_TEMPLATES[0].items.map(it => ({
        id: it.id,
        userId: user?.id || '',
        name: it.name,
        rate: it.rate,
        taxPercentage: it.taxPercentage,
        description: it.description
      }));
      setPresets(standardTemplateItems);
      localStorage.setItem(`invoice_maker_presets${suffix}`, JSON.stringify(standardTemplateItems));
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
            setInvoices([]);
            setClients([]);
            setExpenses([]);
            setPresets([]);
            setCustomTemplates([]);
            if (typeof window !== 'undefined') {
              localStorage.removeItem('makbills_custom_templates');
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
                name: companySettings?.business_name || (typeof window !== 'undefined' ? localStorage.getItem('makbills_custom_brand') : null) || profile.name || '',
                displayName: companySettings?.owner_name || (typeof window !== 'undefined' ? localStorage.getItem('makbills_custom_owner') : null) || profile.displayName || currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '',
                ownerName: companySettings?.owner_name || (typeof window !== 'undefined' ? localStorage.getItem('makbills_custom_owner') : null) || profile.ownerName || currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '',
                email: companySettings?.email || profile.email || currentUser.email || '',
                phone: companySettings?.mobile || profile.phone || '',
                mobile: companySettings?.mobile || '',
                address: companySettings?.address || profile.address || '',
                taxId: companySettings?.gstin || profile.taxId || '',
                pan: companySettings?.pan || profile.pan || '',
                country: companySettings?.country || profile.country || '',
                state: companySettings?.state || profile.state || '',
                stateCode: companySettings?.state_code || profile.stateCode || '',
                currency: companySettings?.currency || deriveCurrencyCode(companySettings?.currency_symbol, profile.currency || 'INR'),
                currencySymbol: companySettings?.currency_symbol || profile.currencySymbol || '',
                taxMode: companySettings?.tax_mode || profile.taxMode || 'dynamic',
                customTaxName: companySettings?.custom_tax_name || profile.customTaxName || 'Tax',
                customTaxPercentage: companySettings?.custom_tax_percentage !== undefined ? companySettings.custom_tax_percentage : profile.customTaxPercentage,
                defaultTaxRate: companySettings?.default_tax_rate !== undefined ? companySettings.default_tax_rate : (profile.defaultTaxRate || 18),
                logoUrl: companySettings?.logo_url || profile.logoUrl || '',
                signature: companySettings?.signature_url || profile.signature || '',
                bankName: companySettings?.bank_name || profile.bankName || '',
                accountNumber: companySettings?.account_number || profile.accountNumber || '',
                ifsc: companySettings?.ifsc || profile.ifsc || '',
                upiId: companySettings?.upi_id || profile.upiId || '',
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
              let fetchedTier: 'free' | 'basic' | 'pro' | 'unlimited' | 'enterprise' = 'free';
              
              let subData = null;
              // 1. Try querying subscriptions table by user_id
              const { data: subById } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', uid)
                .order('updated_at', { ascending: false })
                .limit(1);

              if (subById && subById.length > 0) {
                subData = subById;
              } else if (activeEmail) {
                // 1b. Try querying subscriptions table by user_email
                const { data: subByEmail } = await supabase
                  .from('subscriptions')
                  .select('*')
                  .eq('user_email', activeEmail)
                  .order('updated_at', { ascending: false })
                  .limit(1);
                subData = subByEmail;
              }

              // 1c. If no subscription record exists at all for this user ID, insert default Starter/Free row
              if (!subData || subData.length === 0) {
                try {
                  const defaultPayload = {
                    user_id: uid,
                    plan_name: 'Free',
                    plan_type: 'free',
                    status: 'active',
                    expires_at: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString(),
                    renews_at: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString(),
                    updated_at: new Date().toISOString(),
                  };
                  await supabase.from('subscriptions').upsert(defaultPayload, { onConflict: 'user_id' });
                  subData = [defaultPayload];
                } catch (starterErr) {
                  console.warn('[Cloud Sync] Starter subscription auto-create warning:', starterErr);
                }
              }

              if (subData && subData.length > 0) {
                const sub = subData[0];
                const now = new Date();
                const expDate = sub.expires_at || sub.renews_at || sub.current_period_end;
                const isNotExpired = !expDate || new Date(expDate) > now;
                const isActiveStatus = !sub.status || sub.status === 'active' || sub.status === 'trialing';

                if (isNotExpired && isActiveStatus && (sub.plan_type || sub.plan_name || sub.plan_key || sub.plan_id)) {
                  const rawKey = (sub.plan_type || sub.plan_name || sub.plan_key || sub.plan_id).toLowerCase();
                  if (rawKey.includes('enterprise') || rawKey.includes('unlimited')) fetchedTier = 'unlimited';
                  else if (rawKey.includes('professional') || rawKey.includes('pro')) fetchedTier = 'pro';
                  else if (rawKey.includes('basic')) fetchedTier = 'basic';

                  if (expDate) {
                    localStorage.setItem('makbills_sub_expires_iso', new Date(expDate).toISOString());
                  }
                  localStorage.setItem('makbills_last_active_paid_tier', fetchedTier);
                }
              }

              // 2. Fallback check on users table if subscriptions table didn't yield an active tier
              if (fetchedTier === 'free') {
                const { data: uData1 } = await supabase
                  .from('users')
                  .select('uid, email, name, updatedAt')
                  .eq('uid', uid)
                  .limit(1);

                if (uData1 && uData1.length > 0 && uData1[0].updatedAt) {
                  localStorage.setItem('makbills_sub_activated_at', uData1[0].updatedAt);
                }
              }

              // 3. Fallback check local active window (for active trial or reclaimed plan active within window)
              if (fetchedTier === 'free' && typeof window !== 'undefined') {
                const localTier = localStorage.getItem('makbills_subscription_tier');
                const lastPaidTier = localStorage.getItem('makbills_last_active_paid_tier');
                const expiresIsoRaw = localStorage.getItem('makbills_sub_expires_iso');

                const rawTier = (localTier && localTier !== 'free' ? localTier : lastPaidTier) as string | null;

                if (rawTier && rawTier !== 'free') {
                  const isNotExpired = !expiresIsoRaw || new Date(expiresIsoRaw).getTime() > Date.now();
                  if (isNotExpired) {
                    if (rawTier === 'pro' || rawTier === 'professional') fetchedTier = 'pro';
                    else if (rawTier === 'unlimited' || rawTier === 'enterprise' || rawTier === 'ent') fetchedTier = 'unlimited';
                    else if (rawTier === 'basic') fetchedTier = 'basic';
                  }
                }
              }

              setSubscriptionTier(fetchedTier);
              localStorage.setItem('makbills_subscription_tier', fetchedTier);
            } catch (err) {
              console.warn('[SUPABASE SUBSCRIPTION FETCH EXCEPTION]:', err);
            }
          };

          await syncCloudSubscriptionTier();

          // 1c. Realtime listener for Subscription table, Broadcast, & User updates (Strictly Isolated Per-User Account)
          const subscriptionChannel = supabase
            .channel(`subscription_updates:${uid}`)
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

          // 1d. Focus re-check, visibilitychange & fast periodic poll (Guarantees multi-device sync across laptops, phones, tablets)
          const handleWindowFocus = () => {
            syncCloudSubscriptionTier();
          };
          window.addEventListener('focus', handleWindowFocus);
          window.addEventListener('visibilitychange', handleWindowFocus);
          const subPollInterval = setInterval(() => {
            syncCloudSubscriptionTier();
          }, 5_000);

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
            const mergedCloud: Invoice[] = [];
            parsedCloud.forEach(inv => {
              const localItem = localMap.get(inv.id);
              if (localItem) {
                if (localItem._pendingDelete) {
                  // Skip adding to visible cloud list — it's pending delete
                  return;
                }
                // Overlay local pending edits (e.g. pending soft delete, updated fields) over cloud record
                mergedCloud.push({ ...inv, ...localItem });
              } else {
                mergedCloud.push(inv);
              }
            });

            // 2. Add local pending records that do NOT exist in the cloud fetch at all (e.g., unsynced drafts/invoices)
            const missingPending: Invoice[] = [];
            localMap.forEach((localItem, id) => {
              if (!localItem._pendingDelete && !mergedCloud.find(inv => inv.id === id)) {
                missingPending.push(localItem);
              }
            });

            return [...missingPending, ...mergedCloud];
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
            localStorage.setItem('invoice_maker_invoices', JSON.stringify(finalInvoices));
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
                    localStorage.setItem('invoice_maker_invoices', JSON.stringify(finalInvoices2));
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
            const cleanUrl = window.location.pathname === '/' ? '/dashboard' : window.location.pathname;
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

      setUser(null);
      setUserEmail(null);
      isCloudLoadedRef.current = false;
      // Data falls back to default local storage
      loadLocalData();
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
    const isExistingDoc = invoices.some(inv => inv.id === invoice.id);
    const isEditingExistingNonDraft = isExistingDoc && invoices.find(inv => inv.id === invoice.id)?.status !== 'draft';
    const isPublishingNewDoc = invoice.status !== 'draft' && !isEditingExistingNonDraft;

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

      const limits = getTierLimits(subscriptionTier);
      if (monthlyDocCount >= limits.documentsPerMonth) {
        const errorMsg = `Subscription period document creation limit reached (${limits.documentsPerMonth} docs/period on ${subscriptionTier.toUpperCase()} plan). Upgrade your plan to create more documents.`;
        showToast('Quota Exceeded 🔒', errorMsg, 'error');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('mak_navigate_tab', { detail: 'subscription' }));
        }
        throw new Error(errorMsg);
      }
    }

    const clientsToUpsert: ClientProfile[] = [];
    let updatedClients = [...clients];

    const processClientDetails = (name?: string, email?: string, phone?: string, address?: string) => {
      if (!name || name.trim() === '') return;
      const n = name.trim();
      const e = (email || '').trim();
      const p = (phone || '').trim();
      const a = (address || '').trim();

      // Check if EXACT match exists in updatedClients
      const isClientExact = updatedClients.some((c) => 
        (c.name.trim().toLowerCase() === n.toLowerCase() || c.companyName?.trim().toLowerCase() === n.toLowerCase()) &&
        (c.email || '').trim() === e &&
        (c.phone || '').trim() === p &&
        (c.address || '').trim() === a
      );
      if (isClientExact) return;

      // Create new independent client record
      const clientToSave: ClientProfile = {
        id: crypto.randomUUID(),
        userId: user?.id || '',
        name: n,
        companyName: n,
        address: a,
        email: e,
        phone: p,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      clientsToUpsert.push(clientToSave);
      updatedClients = [clientToSave, ...updatedClients];
    };

    // 1. Process Bill To
    processClientDetails(invoice.clientName, invoice.clientEmail, invoice.clientPhone, invoice.clientAddress);

    // 2. Process Ship To
    processClientDetails(invoice.shippedToName, invoice.shippedToEmail, invoice.shippedToPhone, invoice.shippedToAddress);

    // Commit all client state updates and sync to database at once
    if (clientsToUpsert.length > 0) {
      setClients(updatedClients);
      localStorage.setItem(`invoice_maker_clients${suffix}`, JSON.stringify(updatedClients));

      if (user) {
        try {
          const clientsWithUser = clientsToUpsert.map(c => ({ ...c, userId: user.id }));
          await supabase.from('clients').upsert(clientsWithUser);
        } catch (err) {
          console.error('Failed to sync client profiles:', err);
        }
      }
    }


    const updatedInvoices = invoices.map(inv => inv.id === invoice.id ? invoice : inv);
    
    // Check if newly created
    const exists = invoices.some(inv => inv.id === invoice.id);
    const matchesList = exists ? updatedInvoices : [invoice, ...invoices];

    setInvoices(matchesList);
    localStorage.setItem(`invoice_maker_invoices${suffix}`, JSON.stringify(matchesList));
    localStorage.setItem('invoice_maker_invoices', JSON.stringify(matchesList));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('invoice_updated', { detail: invoice }));
    }

    const activeUid = await resolveSessionUid();

    if (!activeUid) {
      const err = new Error('You must be signed in to save invoices.');
      showToast('Authentication Error', err.message, 'error');
      throw err;
    }

    const dataToSync = sanitizeInvoiceForSync({ ...invoice, userId: activeUid }, activeUid);
    try {
      const { error: upsertError } = await supabase.from('invoices').upsert(dataToSync);
      if (upsertError) {
        console.error('[handleSaveInvoice] Supabase upsert failed:', upsertError);
        showToast('Save Failed', `Cloud save failed: ${upsertError.message || 'Database error'}`, 'error');
        throw upsertError;
      }

      // Success path: fetch latest data and update state
      const { data: latestData, error: fetchErr } = await supabase
        .from('invoices')
        .select('*')
        .eq('userId', activeUid)
        .order('date', { ascending: false });

      if (fetchErr) {
        console.error('[handleSaveInvoice] Error fetching updated invoices:', fetchErr);
      } else if (latestData) {
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

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('invoice_updated', { detail: invoice }));
      }

      showToast('Saved Successfully', `${invoice.invoiceNumber || 'Document'} saved to cloud.`, 'success');
    } catch (error: any) {
      if (error?.message && !error?.message?.includes('Supabase upsert failed')) {
        showToast('Save Error', error.message || 'Failed to save document to cloud.', 'error');
      }
      throw error;
    }
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

  // 6. Sync local unsynced invoices up to cloud (Triggered upon login)
  const handleSyncLocalInvoices = async () => {
    if (!user) return;

    // Load guest/offline data from localStorage (suffix is '')
    const localInvoicesStr = localStorage.getItem('invoice_maker_invoices');
    const localClientsStr = localStorage.getItem('invoice_maker_clients');
    const localExpensesStr = localStorage.getItem('invoice_maker_expenses');
    const localPresetsStr = localStorage.getItem('invoice_maker_presets');
    const localProfileStr = localStorage.getItem('invoice_maker_biz_profile');

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
    const updated = exists ? clients.map(c => c.id === client.id ? client : c) : [client, ...clients];
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

  const handleDeleteClient = async (clientId: string) => {
    const confirmed = await confirm({
      title: 'Delete Client',
      message: 'Are you sure you want to permanently delete this client profile? This action cannot be undone.',
      confirmText: 'Delete'
    });
    if (!confirmed) return;

    const clientToDelete = clients.find(c => c.id === clientId);
    if (!clientToDelete) return;

    const nameLower = clientToDelete.name.trim().toLowerCase();

    // Filter out all duplicates by name from local state
    const remaining = clients.filter(c => c.name.trim().toLowerCase() !== nameLower);
    setClients(remaining);
    localStorage.setItem(`invoice_maker_clients${suffix}`, JSON.stringify(remaining));

    const activeUid = await resolveSessionUid();
    if (activeUid) {
      try {
        const { error } = await supabase.from('clients').delete().eq('userId', activeUid).ilike('name', clientToDelete.name.trim());
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
    const updated = exists ? expenses.map(e => e.id === expense.id ? expense : e) : [expense, ...expenses];
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
        subscriptionTier={subscriptionTier}
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
        subscriptionTier={subscriptionTier}
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
        subscriptionTier={subscriptionTier}
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
