import React, { useState, useEffect } from 'react';
import { PinSetupModal } from './components/PinSetupModal';
import type { User } from '@supabase/supabase-js';
import { supabase, handleSupabaseError, OperationType, isSupabaseConfigured } from './lib/supabase';
import { Invoice, BusinessProfile, PresetItem, InvoiceStatus, ClientProfile, Expense, InvoiceTemplate } from './types';
import { getSampleInvoice, BUSINESS_TEMPLATES } from './lib/presets';
import { getSecuritySettings, saveSecuritySettings, SecuritySettings, hashPin, hashPinPBKDF2, generateSalt } from './lib/biometrics';

// Global error and rejection handlers to suppress development error overlays for network blocks (adblockers/extensions)
if (typeof window !== 'undefined') {
  // Suppress Next.js Console TypeError overlay by routing network-related console.errors to console.warn
  const originalConsoleError = console.error;
  console.error = function (...args) {
    const errorString = args.map(arg => (arg instanceof Error ? arg.message : String(arg))).join(' ');
    if (errorString.includes('Failed to fetch') || errorString.includes('TypeError')) {
      console.warn('[Suppressed Next.js Overlay] Suppressed network console.error:', ...args);
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
// Path to Sidebar Tab Mapping Definitions
const tabToPath: Record<string, string> = {
  dashboard: '/dashboard',
  learn: '/learn',
  invoice_templates: '/invoice-templates',
  invoices: '/invoices',
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
};

const pathToTab: Record<string, string> = Object.entries(tabToPath).reduce(
  (acc, [tab, path]) => ({ ...acc, [path]: tab }),
  {} as Record<string, string>
);

export default function App() {
  const { confirm } = useConfirm();
  // Theme & Network states
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const cached = localStorage.getItem('invoice_maker_theme');
    if (cached === 'light' || cached === 'dark') return cached;
    return 'light'; // default light theme for professional premium readability
  });
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

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

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/invoice-templates')) {
        return 'invoice_templates';
      }
      return pathToTab[path] || 'dashboard';
    }
    return 'dashboard';
  });

  const [publicPath, setPublicPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      return ['/pricing', '/guide', '/contact', '/features', '/faq'].includes(path) ? path : '/';
    }
    return '/';
  });

  const suffix = userEmail ? `_${encodeURIComponent(userEmail)}` : '';

  // Main Business state
  const [profile, setProfile] = useState<BusinessProfile>({
    uid: 'local',
    name: '',
    email: '',
    phone: '',
    address: '',
    taxId: '',
    currency: 'INR',
    defaultTaxRate: 18,
    updatedAt: new Date().toISOString()
  });

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [presets, setPresets] = useState<PresetItem[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customTemplates, setCustomTemplates] = useState<InvoiceTemplate[]>([]);

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
            }
            
            if (matchedTab) {
              setActiveTab(matchedTab);
            } else if (path === '/') {
              // If at root and logged in, default back to dashboard
              setActiveTab('dashboard');
            }
          }
        } else {
          setPublicPath(['/pricing', '/guide', '/contact'].includes(path) ? path : '/');
        }
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [userEmail]);


  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
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

    if (enable && !isOnline) {
      setPinModalError('You must be online to set or enable a PIN lock.');
    }

    setPinModalMode(enable ? 'enable' : 'disable');
    setPinModalError('');
    setPinModalOpen(true);
  };

  const handlePinConfirm = async (rawPin: string) => {
    const current = getSecuritySettings();
    const enable = !current.isPinLockEnabled;
    setPinModalLoading(true);
    setPinModalError('');
    let pinVal = '';
    let salt: string | undefined;
    if (enable) {
      if (!isOnline) {
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
      setPinModalLoading(false);
      setPinModalOpen(false);
    } else {
      // Disabling PIN — disable server side too
      if (isOnline && user) {
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
    }

    const updated: SecuritySettings = {
      ...current,
      isPinLockEnabled: enable,
    };

    setSecuritySettings(updated);
    saveSecuritySettings(updated);

    if (user && isOnline) {
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
    const activeEmail = emailParam !== undefined ? emailParam : userEmail;
    const suffix = activeEmail ? `_${encodeURIComponent(activeEmail)}` : '';

    // Profile
    const localProfile = localStorage.getItem(`invoice_maker_biz_profile${suffix}`);
    if (localProfile) {
      try {
        setProfile(JSON.parse(localProfile));
      } catch (e) {
        console.warn('Failed to parse local profile, using default', e);
      }
    } else {
      setProfile({
        uid: activeEmail || 'local',
        name: '',
        email: activeEmail || '',
        phone: '',
        address: '',
        taxId: '',
        currency: 'INR',
        defaultTaxRate: 18,
        updatedAt: new Date().toISOString()
      });
    }

    // Invoices list
    const localInvoices = localStorage.getItem(`invoice_maker_invoices${suffix}`);
    if (localInvoices) {
      try {
        setInvoices(JSON.parse(localInvoices));
      } catch (e) {
        console.warn('Failed to parse local invoices');
        setInvoices([]);
      }
    } else {
      setInvoices([]);
      localStorage.setItem(`invoice_maker_invoices${suffix}`, JSON.stringify([]));
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
        userId: activeEmail || 'local',
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
        setClients(JSON.parse(localClients));
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
        setExpenses(JSON.parse(localExpenses));
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

    let activeChannels: ReturnType<typeof supabase.channel>[] = [];

    const cleanupActiveListeners = async () => {
      for (const channel of activeChannels) {
        try {
          await supabase.removeChannel(channel);
        } catch (e) {
          console.warn('Error cleaning up active Supabase listener:', String(e));
        }
      }
      activeChannels = [];
    };

    // Setup Auth State Listener — runs unconditionally so login always works
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          // First clean up any active snapshot listeners to prevent orphaned loops upon auth state shifts
          await cleanupActiveListeners();

        const currentUser = session?.user ?? null;

        if (currentUser) {
          setUser(currentUser);
          const activeEmail = currentUser.email ?? currentUser.phone ?? null;
          setUserEmail(activeEmail);
          const suffix = activeEmail ? `_${encodeURIComponent(activeEmail)}` : '';

          setIsAuthLoading(false);

          // Only load cloud data if unlocked (PIN gate for data protection)
          if (!isUnlocked) return;

          if (isOnline) {
            // --- SYNC / RESOLVE FROM CLOUD ---
            const uid = currentUser.id;

            // 1. Fetch Cloud Profile (users table) + company_settings for full details
            try {
              const { data: cloudProf } = await supabase
                .from('users')
                .select('*')
                .eq('uid', uid)
                .single();

              // Also fetch company_settings to get the detailed profile fields
              const { data: companySettings } = await supabase
                .from('company_settings')
                .select('*')
                .eq('user_id', uid)
                .single();

              console.log("[APP] Loaded company settings from Supabase:", companySettings);

              if (cloudProf) {
                // Merge company_settings fields into the profile if available
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
                  signature: companySettings.signature_url || cloudProf.signature || '',
                  country: companySettings.country || cloudProf.country || '',
                  state: companySettings.state || cloudProf.state || '',
                  stateCode: companySettings.state_code || cloudProf.stateCode || '',
                  currency: companySettings.currency || cloudProf.currency || 'INR',
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
                  defaultNotes: companySettings.default_notes || cloudProf.defaultNotes || '',
                  defaultTerms: companySettings.default_terms || cloudProf.defaultTerms || '',
                } : (cloudProf as BusinessProfile);

                // SYNC PIN STATUS ACROSS DEVICES
                // If the user has a PIN configured on the backend, ensure the local device enforces it.
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
                // Creating initial business profile for new users in Supabase
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
                  currency: companySettings?.currency || profile.currency || 'INR',
                  currencySymbol: companySettings?.currency_symbol || profile.currencySymbol || '',
                  taxMode: companySettings?.tax_mode || profile.taxMode || 'dynamic',
                  customTaxName: companySettings?.custom_tax_name || profile.customTaxName || 'Tax',
                  customTaxPercentage: companySettings?.custom_tax_percentage !== undefined ? companySettings.custom_tax_percentage : profile.customTaxPercentage,
                  defaultTaxRate: companySettings?.default_tax_rate !== undefined ? companySettings.default_tax_rate : (profile.defaultTaxRate || 18),
                  logoUrl: companySettings?.logo_url || profile.logoUrl || '',
                  signature: companySettings?.signature_url || profile.signature || '',
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

            // 2. Load Invoices and attach realtime listener
            try {
              const { data: cloudInvoices } = await supabase
                .from('invoices')
                .select('*')
                .eq('userId', uid)
                .order('date', { ascending: false });

              if (cloudInvoices) {
                // Merge: keep local drafts that aren't yet persisted to cloud
                const localRaw = localStorage.getItem(`invoice_maker_invoices${suffix}`);
                const localAll: Invoice[] = localRaw ? JSON.parse(localRaw) : [];
                const localDraftsOnly = localAll.filter(
                  (loc: Invoice) =>
                    loc.status === 'draft' &&
                    !cloudInvoices.some((c: any) => c.id === loc.id)
                );
                const parsedCloudInvoices = (cloudInvoices as Invoice[]).map(inv => {
                  if (inv.selectedTemplateStyle && inv.selectedTemplateStyle.startsWith('{')) {
                    try {
                      inv.embeddedTemplate = JSON.parse(inv.selectedTemplateStyle);
                      inv.selectedCustomTemplateId = inv.embeddedTemplate?.id;
                    } catch (e) {
                      // fallback if parsing fails
                    }
                  }
                  return inv;
                });
                const merged = [...localDraftsOnly, ...parsedCloudInvoices];
                setInvoices(merged);
                localStorage.setItem(`invoice_maker_invoices${suffix}`, JSON.stringify(merged));
              }
            } catch (err) {
              handleSupabaseError(err, OperationType.GET, `invoices[userId=${uid}]`);
            }

            const invoicesChannel = supabase
              .channel(`invoices:${uid}:${Date.now()}`)
              .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'invoices', filter: `userId=eq.${uid}` },
                async () => {
                  try {
                    const { data } = await supabase
                      .from('invoices')
                      .select('*')
                      .eq('userId', uid)
                      .order('date', { ascending: false });
                    if (data) {
                      // Merge: preserve local-only drafts on realtime sync
                      const localRaw2 = localStorage.getItem(`invoice_maker_invoices${suffix}`);
                      const localAll2: Invoice[] = localRaw2 ? JSON.parse(localRaw2) : [];
                      const localDraftsOnly2 = localAll2.filter(
                        (loc: Invoice) =>
                          loc.status === 'draft' &&
                          !data.some((c: any) => c.id === loc.id)
                      );
                      const parsedCloudInvoices2 = (data as Invoice[]).map(inv => {
                        if (inv.selectedTemplateStyle && inv.selectedTemplateStyle.startsWith('{')) {
                          try {
                            inv.embeddedTemplate = JSON.parse(inv.selectedTemplateStyle);
                            inv.selectedCustomTemplateId = inv.embeddedTemplate?.id;
                          } catch (e) { }
                        }
                        return inv;
                      });
                      const merged2 = [...localDraftsOnly2, ...parsedCloudInvoices2];
                      setInvoices(merged2);
                      localStorage.setItem(`invoice_maker_invoices${suffix}`, JSON.stringify(merged2));
                    }
                  } catch (err) {
                    console.warn("Error in realtime invoice sync:", String(err));
                  }
                }
              )
              .subscribe();
            activeChannels.push(invoicesChannel);

            // 3. Load Presets and attach realtime listener
            try {
              const { data: cloudPresets } = await supabase
                .from('preset_items')
                .select('*')
                .eq('userId', uid);
              if (cloudPresets) {
                setPresets(cloudPresets as PresetItem[]);
                localStorage.setItem(`invoice_maker_presets${suffix}`, JSON.stringify(cloudPresets));
              }
            } catch (err) {
              handleSupabaseError(err, OperationType.GET, `preset_items[userId=${uid}]`);
            }

            const presetsChannel = supabase
              .channel(`preset_items:${uid}:${Date.now()}`)
              .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'preset_items', filter: `userId=eq.${uid}` },
                async () => {
                  try {
                    const { data } = await supabase
                      .from('preset_items')
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
              .subscribe();
            activeChannels.push(presetsChannel);

            // 4. Load Clients and attach realtime listener
            try {
              const { data: cloudClients } = await supabase
                .from('clients')
                .select('*')
                .eq('userId', uid);
              if (cloudClients) {
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
              .subscribe();
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
              .subscribe();
            activeChannels.push(expensesChannel);

            // 6. Load Custom Templates from Storage and attach realtime listener
            try {
              const { data, error } = await supabase.storage
                .from('CompanyLogo')
                .download(`${uid}/custom_templates.json`);
              
              if (data) {
                const text = await data.text();
                const cloudTemplates = JSON.parse(text);
                if (cloudTemplates && cloudTemplates.length > 0) {
                  setCustomTemplates(cloudTemplates);
                  localStorage.setItem('makbills_custom_templates', JSON.stringify(cloudTemplates));
                  window.dispatchEvent(new Event('custom_templates_updated_from_cloud'));
                }
              } else {
                // Cloud is empty or missing. If we have stranded local templates, push them!
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
          }
        } else {
          // If no user, clear everything
          setUser(null);
          setUserEmail(null);
          setInvoices([]);
          setExpenses([]);
          setProfile({
            uid: 'local',
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
          if (event !== 'INITIAL_SESSION') {
            setIsAuthLoading(false);
          }
        }
        } catch (globalAuthErr) {
          console.warn("Unhandled error in auth state change listener:", String(globalAuthErr));
        }
      }
    );

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setIsAuthLoading(false);
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
  }, [isOnline, isUnlocked]);

  // Load local data when unlocked (PIN gate for offline data)
  useEffect(() => {
    if (!isUnlocked) return;
    loadLocalData();
  }, [isUnlocked]);



  // Listen to local template updates and sync to cloud
  useEffect(() => {
    const handleLocalTemplatesUpdate = async () => {
      if (!user || !isOnline || !isUnlocked) return;
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
  }, [user, isOnline, isUnlocked]);

  // --- ACTIONS SYSTEM ---

  // 1. Google OAuth login trigger via Supabase
  const handleLogin = async () => {
    if (!isOnline) {
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
      // Data falls back to default local storage
      loadLocalData();
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

  // 2. Save Profile (Settings modifier)
  const handleSaveProfile = async (updatedProfile: BusinessProfile) => {
    setProfile(updatedProfile);
    localStorage.setItem(`invoice_maker_biz_profile${suffix}`, JSON.stringify(updatedProfile));

    if (isOnline && user) {
      const path = `users[uid=${user.id}]`;
      try {
        await supabase.from('users').upsert({ ...updatedProfile, uid: user.id });
      } catch (error) {
        handleSupabaseError(error, OperationType.WRITE, path);
      }
    }
  };

  // 3. Save / Update Invoice
  const handleSaveInvoice = async (invoice: Invoice) => {
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
        userId: user ? user.id : '',
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

      if (isOnline && user) {
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

    if (isOnline && user) {
      // Propagate directly to Cloud
      const updatedInvoiceData = { ...invoice, userId: user.id };
      
      // SUPABASE COMPATIBILITY: Supabase rejects unknown columns. 
      // We store the embedded template JSON inside the legacy selectedTemplateStyle column for cloud sync.
      if (updatedInvoiceData.embeddedTemplate) {
        updatedInvoiceData.selectedTemplateStyle = JSON.stringify(updatedInvoiceData.embeddedTemplate);
        delete updatedInvoiceData.embeddedTemplate; // Remove so Supabase doesn't reject
      }
      
      // Remove selectedCustomTemplateId as well to avoid schema errors, since its ID is inside embeddedTemplate
      delete updatedInvoiceData.selectedCustomTemplateId;
      
      const path = `invoices[id=${invoice.id}]`;
      try {
        await supabase.from('invoices').upsert(updatedInvoiceData);
      } catch (error) {
        handleSupabaseError(error, OperationType.WRITE, path);
      }
    }
  };

  // 4. Delete Invoice
  const handleDeleteInvoice = async (invoiceId: string) => {
    const isDraft = invoices.find(i => i.id === invoiceId)?.status === 'draft';
    const confirmed = await confirm({
      title: isDraft ? 'Delete Draft' : 'Delete Invoice',
      message: `Are you sure you want to permanently delete this ${isDraft ? 'draft' : 'invoice'}? This action cannot be undone.`,
      confirmText: 'Delete'
    });
    if (!confirmed) return;

    const remaining = invoices.filter(inv => inv.id !== invoiceId);
    setInvoices(remaining);
    localStorage.setItem(`invoice_maker_invoices${suffix}`, JSON.stringify(remaining));

    if (isOnline && user) {
      const path = `invoices[id=${invoiceId}]`;
      try {
        await supabase.from('invoices').delete().eq('id', invoiceId).eq('userId', user.id);
      } catch (error) {
        handleSupabaseError(error, OperationType.DELETE, path);
      }
    }
  };

  // Bulk Delete Invoices
  const handleBulkDeleteInvoices = async (invoiceIds: string[]) => {
    if (invoiceIds.length === 0) return;
    const confirmed = await confirm({
      title: 'Bulk Delete Invoices',
      message: `Are you sure you want to delete the ${invoiceIds.length} selected invoices? This action cannot be undone.`,
      confirmText: 'Delete All'
    });
    if (!confirmed) return;

    const remaining = invoices.filter(inv => !invoiceIds.includes(inv.id));
    setInvoices(remaining);
    localStorage.setItem(`invoice_maker_invoices${suffix}`, JSON.stringify(remaining));

    if (isOnline && user) {
      try {
        await supabase.from('invoices').delete().in('id', invoiceIds).eq('userId', user.id);
      } catch (error) {
        console.error('Failed to bulk delete invoices:', error);
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
            paidDateUpdate.paidDate = undefined; // clear paid date if status changed from paid
        }
        return { ...inv, status, updatedAt: new Date().toISOString(), ...paidDateUpdate };
      }
      return inv;
    });
    setInvoices(updated);
    localStorage.setItem(`invoice_maker_invoices${suffix}`, JSON.stringify(updated));

    if (isOnline && user) {
      try {
        const bulkUpdates = invoiceIds.map(invoiceId => {
          const inv = invoices.find(i => i.id === invoiceId);
          return { ...inv, status, userId: user.id, updatedAt: new Date().toISOString() };
        }).filter(Boolean);
        await supabase.from('invoices').upsert(bulkUpdates);
      } catch (error) {
        console.error('Failed to bulk update invoices status:', error);
      }
    }
  };

  // 5. Onboarding quick-start preset templates loader
  const handleLoadPresetTemplate = async (templateId: string) => {
    const template = BUSINESS_TEMPLATES.find(p => p.id === templateId);
    if (!template) return;

    // Load business details
    const cleanProfile: BusinessProfile = {
      uid: user ? user.id : 'local',
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
      userId: user ? user.id : 'local',
      name: it.name,
      rate: it.rate,
      taxPercentage: it.taxPercentage,
      description: it.description
    }));

    setPresets(seededPresets);
    localStorage.setItem(`invoice_maker_presets${suffix}`, JSON.stringify(seededPresets));

    // Clear and seed an initial example bill matching template
    const sample = getSampleInvoice(templateId, user ? user.id : 'local');
    setInvoices([sample]);
    localStorage.setItem(`invoice_maker_invoices${suffix}`, JSON.stringify([sample]));

    if (isOnline && user) {
      // Sync seeded configurations to Supabase
      try {
        await supabase.from('users').upsert({ ...cleanProfile, uid: user.id });
        await supabase.from('invoices').upsert({ ...sample, userId: user.id });
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
    if (!user || !isOnline) return;

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
          .filter(inv => inv.userId === 'local' || !inv.userId)
          .map(inv => ({
            ...inv,
            userId: user.id,
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
          .filter(c => c.userId === 'local' || !c.userId)
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
          .filter(e => e.userId === 'local' || !e.userId)
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
          .filter(p => p.userId === 'local' || !p.userId)
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
        if (localProfile.uid === 'local' || !localProfile.uid) {
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

    if (isOnline && user) {
      const clientWithUser = { ...client, userId: user.id };
      try {
        await supabase.from('clients').upsert(clientWithUser);
      } catch (err) {
        console.error('Failed to sync client profile:', err);
      }
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

    if (isOnline && user) {
      try {
        // Delete all duplicate rows by name matching case-insensitively in Supabase
        await supabase.from('clients').delete().eq('userId', user.id).ilike('name', clientToDelete.name.trim());
      } catch (err) {
        console.error('Failed to delete client profile:', err);
      }
    }
  };

  // --- EXPENSE ACTIONS ---
  const handleSaveExpense = async (expense: Expense) => {
    const exists = expenses.some(e => e.id === expense.id);
    const updated = exists ? expenses.map(e => e.id === expense.id ? expense : e) : [expense, ...expenses];
    setExpenses(updated);
    localStorage.setItem(`invoice_maker_expenses${suffix}`, JSON.stringify(updated));

    if (isOnline && user) {
      const expenseWithUser = { ...expense, userId: user.id };
      try {
        await supabase.from('expenses').upsert(expenseWithUser);
      } catch (err) {
        console.error('Failed to sync business expense:', err);
      }
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

    if (isOnline && user) {
      try {
        await supabase.from('expenses').delete().eq('id', expenseId).eq('userId', user.id);
      } catch (err) {
        console.error('Failed to delete business expense:', err);
      }
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

      if (isOnline && user) {
        const allToSync = [
          ...updatedParents.map(up => ({ ...up, userId: user.id })),
          ...newSpawned.map(ch => ({ ...ch, userId: user.id })),
        ];
        supabase.from('invoices').upsert(allToSync).then(({ error }) => {
          if (error) console.error('Failed to sync recurring invoices:', error);
        });
      }

      setInvoices(nextInvoices);
      localStorage.setItem(`invoice_maker_invoices${suffix}`, JSON.stringify(nextInvoices));
    }
  }, [invoices.length, user, isOnline]);

  const handleOpenInvoiceEditor = (invoice: Invoice | null) => {
    setEditingInvoice(invoice);
    setIsInvoiceEditorOpen(true);
  };

  // Generate on-the-fly dynamic CSS customization variables
  const getDynamicCustomizationStyle = () => {
    const accent = profile.themeAccent || 'sky';
    const font = profile.invoiceFont || 'inter';
    
    const accents = {
      sky: { light: '#8c7558', dark: '#38bdf8' },
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
  if (isAuthLoading || isUnlocked === null) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
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
    if (publicPath === '/contact') {
      return (
        <ContactPage
          theme={theme}
          onNavigate={handlePublicNavigate}
          onGoogleLogin={handleLogin}
        />
      );
    }

    return (
      <Homepage
        theme={theme}
        onGoogleLogin={handleLogin}
        onCustomSignup={handleCustomSignup}
        onCustomLogin={handleCustomLogin}
        isOnline={isOnline}
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
        invoices={invoices}
        profile={profile}
        presets={presets}
        clients={clients}
        expenses={expenses}
        isOnline={isOnline}
        theme={theme}
        toggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
        userEmail={userEmail}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenInvoiceEditor={handleOpenInvoiceEditor}
        onDeleteInvoice={handleDeleteInvoice}
        onBulkDeleteInvoices={handleBulkDeleteInvoices}
        onBulkUpdateInvoicesStatus={handleBulkUpdateInvoicesStatus}
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
      />

      <InvoiceModal
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
