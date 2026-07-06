import React, { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, handleSupabaseError, OperationType, isSupabaseConfigured } from './lib/supabase';
import { Invoice, BusinessProfile, PresetItem, InvoiceStatus, ClientProfile, Expense } from './types';
import { getSampleInvoice, BUSINESS_TEMPLATES } from './lib/presets';
import { getSecuritySettings, saveSecuritySettings, SecuritySettings } from './lib/biometrics';

// Sub-components
import BiometricVerification from './components/BiometricVerification';
import Dashboard from './components/Dashboard';
import BusinessProfileModal from './components/BusinessProfileModal';
import InvoiceModal from './components/InvoiceModal';
import Homepage from './components/Homepage';

export default function App() {
  // Theme & Network states
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const cached = localStorage.getItem('invoice_maker_theme');
    if (cached === 'light' || cached === 'dark') return cached;
    return 'light'; // default light theme for professional premium readability
  });
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  // Security Lock state
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(() => getSecuritySettings());
  const [isUnlocked, setIsUnlocked] = useState(() => {
    // If locks are active, require unlock screen on startup
    const current = getSecuritySettings();
    return !current.isPinLockEnabled && !current.isBiometricsEnabled;
  });

  // User details
  const [user, setUser] = useState<User | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    return localStorage.getItem('makbills_custom_email') || null;
  });

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

  // Modals active states
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isInvoiceEditorOpen, setIsInvoiceEditorOpen] = useState(false);
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

  // --- INITIALIZE SECURITY SETTINGS OR RE-SYNC ON EDIT ---
  const handleToggleSecurity = (type: 'pin' | 'bio') => {
    const current = getSecuritySettings();
    let updated: SecuritySettings;

    if (type === 'pin') {
      const enable = !current.isPinLockEnabled;
      updated = {
        ...current,
        isPinLockEnabled: enable,
        hashedPin: enable ? '1234' : '' // Default passcode for testing
      };
      if (enable) alert("Security Passcode set to '1234' for preview lock. You will be prompted on app refresh!");
    } else {
      updated = {
        ...current,
        isBiometricsEnabled: !current.isBiometricsEnabled
      };
    }

    setSecuritySettings(updated);
    saveSecuritySettings(updated);
  };

  // --- LOCAL CACHING LOAD MECHANISM (OFFLINE CAPABILITIES) ---
  const loadLocalData = () => {
    // Profile
    const localProfile = localStorage.getItem('invoice_maker_biz_profile');
    if (localProfile) {
      try {
        setProfile(JSON.parse(localProfile));
      } catch (e) {
        console.warn('Failed to parse local profile, using default', e);
      }
    }

    // Invoices list
    const localInvoices = localStorage.getItem('invoice_maker_invoices');
    if (localInvoices) {
      try {
        setInvoices(JSON.parse(localInvoices));
      } catch (e) {
        console.warn('Failed to parse local invoices, importing examples');
      }
    } else {
      // Preload example invoices on first onboarding to make is extremely easy for new users
      const sample = getSampleInvoice('freelance_tech', 'local');
      setInvoices([sample]);
      localStorage.setItem('invoice_maker_invoices', JSON.stringify([sample]));
    }

    // Presets catalog
    const localPresets = localStorage.getItem('invoice_maker_presets');
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
        userId: 'local',
        name: it.name,
        rate: it.rate,
        taxPercentage: it.taxPercentage,
        description: it.description
      }));
      setPresets(standardTemplateItems);
      localStorage.setItem('invoice_maker_presets', JSON.stringify(standardTemplateItems));
    }

    // Clients list
    const localClients = localStorage.getItem('invoice_maker_clients');
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
    const localExpenses = localStorage.getItem('invoice_maker_expenses');
    if (localExpenses) {
      try {
        setExpenses(JSON.parse(localExpenses));
      } catch (e) {
        console.warn('Failed to parse local expenses', e);
      }
    } else {
      setExpenses([]);
    }
  };

  // --- CONNECT SUPABASE LISTENERS OR DEGRADE GRACEFULLY (CLOUD SYNCING) ---
  useEffect(() => {
    // Load local storage fallback immediately so the app shows data instantly before network resolves (and works fully offline)
    loadLocalData();

    let activeChannels: ReturnType<typeof supabase.channel>[] = [];

    const cleanupActiveListeners = async () => {
      for (const channel of activeChannels) {
        try {
          await supabase.removeChannel(channel);
        } catch (e) {
          console.error('Error cleaning up active Supabase listener:', e);
        }
      }
      activeChannels = [];
    };

    // Setup Auth State Listener
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // First clean up any active snapshot listeners to prevent orphaned loops upon auth state shifts
        cleanupActiveListeners();

        const currentUser = session?.user ?? null;

        if (currentUser) {
          setUser(currentUser);
          setUserEmail(currentUser.email ?? null);

          if (isOnline) {
            // --- SYNC / RESOLVE FROM CLOUD ---
            const uid = currentUser.id;

            // 1. Fetch Cloud Profile
            try {
              const { data: cloudProf } = await supabase
                .from('users')
                .select('*')
                .eq('uid', uid)
                .single();

              if (cloudProf) {
                setProfile(cloudProf as BusinessProfile);
                localStorage.setItem('invoice_maker_biz_profile', JSON.stringify(cloudProf));
              } else {
                // Creating initial business profile for new users in Supabase
                const initProf: BusinessProfile = {
                  uid,
                  name: profile.name || currentUser.user_metadata?.full_name || '',
                  email: profile.email || currentUser.email || '',
                  phone: profile.phone || '',
                  address: profile.address || '',
                  taxId: profile.taxId || '',
                  currency: profile.currency || 'INR',
                  defaultTaxRate: profile.defaultTaxRate || 18,
                  updatedAt: new Date().toISOString()
                };
                await supabase.from('users').upsert(initProf);
                setProfile(initProf);
              }
            } catch (err) {
              console.error('Error fetching/setting cloud profile:', err);
            }

            // 2. Load Invoices from Supabase and attach realtime listener
            try {
              const { data: cloudInvoices } = await supabase
                .from('invoices')
                .select('*')
                .eq('userId', uid)
                .order('date', { ascending: false });

              if (cloudInvoices) {
                setInvoices(cloudInvoices as Invoice[]);
                localStorage.setItem('invoice_maker_invoices', JSON.stringify(cloudInvoices));
              }
            } catch (err) {
              handleSupabaseError(err, OperationType.GET, `invoices[userId=${uid}]`);
            }

            const invoicesChannel = supabase
              .channel(`invoices:${uid}`)
              .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'invoices', filter: `userId=eq.${uid}` },
                async () => {
                  const { data } = await supabase
                    .from('invoices')
                    .select('*')
                    .eq('userId', uid)
                    .order('date', { ascending: false });
                  if (data) {
                    setInvoices(data as Invoice[]);
                    localStorage.setItem('invoice_maker_invoices', JSON.stringify(data));
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
                localStorage.setItem('invoice_maker_presets', JSON.stringify(cloudPresets));
              }
            } catch (err) {
              handleSupabaseError(err, OperationType.GET, `preset_items[userId=${uid}]`);
            }

            const presetsChannel = supabase
              .channel(`preset_items:${uid}`)
              .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'preset_items', filter: `userId=eq.${uid}` },
                async () => {
                  const { data } = await supabase
                    .from('preset_items')
                    .select('*')
                    .eq('userId', uid);
                  if (data) {
                    setPresets(data as PresetItem[]);
                    localStorage.setItem('invoice_maker_presets', JSON.stringify(data));
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
                localStorage.setItem('invoice_maker_clients', JSON.stringify(cloudClients));
              }
            } catch (err) {
              handleSupabaseError(err, OperationType.GET, `clients[userId=${uid}]`);
            }

            const clientsChannel = supabase
              .channel(`clients:${uid}`)
              .on(
                 'postgres_changes',
                { event: '*', schema: 'public', table: 'clients', filter: `userId=eq.${uid}` },
                async () => {
                  const { data } = await supabase
                    .from('clients')
                    .select('*')
                    .eq('userId', uid);
                  if (data) {
                    setClients(data as ClientProfile[]);
                    localStorage.setItem('invoice_maker_clients', JSON.stringify(data));
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
                localStorage.setItem('invoice_maker_expenses', JSON.stringify(cloudExpenses));
              }
            } catch (err) {
              handleSupabaseError(err, OperationType.GET, `expenses[userId=${uid}]`);
            }

            const expensesChannel = supabase
              .channel(`expenses:${uid}`)
              .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'expenses', filter: `userId=eq.${uid}` },
                async () => {
                  const { data } = await supabase
                    .from('expenses')
                    .select('*')
                    .eq('userId', uid);
                  if (data) {
                    setExpenses(data as Expense[]);
                    localStorage.setItem('invoice_maker_expenses', JSON.stringify(data));
                  }
                }
              )
              .subscribe();
            activeChannels.push(expensesChannel);
          }
        } else {
          setUser(null);
          setUserEmail(null);
          // Fall back to offline local storage data
          loadLocalData();
        }
      }
    );

    return () => {
      authSubscription.unsubscribe();
      cleanupActiveListeners();
    };
  }, [isOnline]);

  // --- Retroactive Sync of Clients from Existing Invoices ---
  useEffect(() => {
    if (invoices.length === 0) return;
    
    let clientsChanged = false;
    const updatedClients = [...clients];

    invoices.forEach(inv => {
      if (inv.clientName && inv.clientName.trim() !== '') {
        const nameLower = inv.clientName.trim().toLowerCase();
        const exists = updatedClients.some(c => 
          c.name.toLowerCase() === nameLower || 
          c.companyName.toLowerCase() === nameLower
        );
        
        if (!exists) {
          clientsChanged = true;
          updatedClients.push({
            id: crypto.randomUUID(),
            userId: user ? user.id : '',
            name: inv.clientName.trim(),
            companyName: inv.clientName.trim(),
            address: inv.clientAddress || '',
            email: inv.clientEmail || '',
            phone: inv.clientPhone || '',
            createdAt: inv.createdAt || new Date().toISOString(),
            updatedAt: inv.createdAt || new Date().toISOString()
          });
        }
      }
    });

    if (clientsChanged) {
      setClients(updatedClients);
      localStorage.setItem('invoice_maker_clients', JSON.stringify(updatedClients));
      
      if (isOnline && user) {
        const clientsWithUser = updatedClients.map(c => ({ ...c, userId: user.id }));
        supabase.from('clients').upsert(clientsWithUser).then(null, (e: unknown) => {
          console.error('Failed to retroactively sync clients to cloud:', e);
        });
      }
    }
  }, [invoices, clients, isOnline, user]);

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
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });
      if (error) console.error('Login flow failed:', error);
    } catch (e) {
      console.error('Login flow failed:', e);
    }
  };

  const handleCustomSignup = async (name: string, companyName: string, email: string, phone: string, password?: string): Promise<{ error?: string }> => {
    if (isSupabaseConfigured && password) {
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
          localStorage.setItem('invoice_maker_biz_profile', JSON.stringify(initProf));
        }
      } catch (err: any) {
        return { error: err.message || 'Sign up failed' };
      }
    } else {
      const resolvedEmail = email || `${phone.replace(/\s+/g, '') || 'user'}@makbills.local`;
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
      localStorage.setItem('invoice_maker_biz_profile', JSON.stringify(updatedProf));
    }
    
    // Clear invoices, presets, clients, and expenses so a brand-new account starts completely fresh
    setInvoices([]);
    localStorage.setItem('invoice_maker_invoices', JSON.stringify([]));
    setPresets([]);
    localStorage.setItem('invoice_maker_presets', JSON.stringify([]));
    setClients([]);
    localStorage.setItem('invoice_maker_clients', JSON.stringify([]));
    setExpenses([]);
    localStorage.setItem('invoice_maker_expenses', JSON.stringify([]));
    
    setIsOnboarding(true);
    setIsProfileOpen(true);
    return {};
  };

  const handleCustomLogin = async (email: string, password?: string, phone?: string): Promise<{ error?: string }> => {
    if (isSupabaseConfigured && email && password) {
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
      localStorage.setItem('invoice_maker_biz_profile', JSON.stringify(updatedProf));
    }
    return {};
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
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
      // Data falls back to local storage
      loadLocalData();
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

  // 2. Save Profile (Settings modifier)
  const handleSaveProfile = async (updatedProfile: BusinessProfile) => {
    setProfile(updatedProfile);
    localStorage.setItem('invoice_maker_biz_profile', JSON.stringify(updatedProfile));

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
    // Automatically create or update client database based on invoice
    if (invoice.clientName && invoice.clientName.trim() !== '') {
      const clientNameLower = invoice.clientName.trim().toLowerCase();
      const existingClient = clients.find(c => 
        c.name.toLowerCase() === clientNameLower || 
        c.companyName.toLowerCase() === clientNameLower
      );

      const clientToSave: ClientProfile = existingClient ? {
        ...existingClient,
        // Update with latest details from invoice if present
        address: invoice.clientAddress || existingClient.address,
        email: invoice.clientEmail || existingClient.email,
        phone: invoice.clientPhone || existingClient.phone,
        updatedAt: new Date().toISOString()
      } : {
        id: crypto.randomUUID(),
        userId: user ? user.id : '',
        name: invoice.clientName.trim(),
        companyName: invoice.clientName.trim(),
        address: invoice.clientAddress || '',
        email: invoice.clientEmail || '',
        phone: invoice.clientPhone || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await handleSaveClient(clientToSave);
    }

    const updatedInvoices = invoices.map(inv => inv.id === invoice.id ? invoice : inv);
    
    // Check if newly created
    const exists = invoices.some(inv => inv.id === invoice.id);
    const matchesList = exists ? updatedInvoices : [invoice, ...invoices];

    setInvoices(matchesList);
    localStorage.setItem('invoice_maker_invoices', JSON.stringify(matchesList));

    if (isOnline && user) {
      // Propagate directly to Cloud
      const updatedInvoiceData = { ...invoice, userId: user.id };
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
    const confirmed = window.confirm('Are you sure you want to delete this invoice?');
    if (!confirmed) return;

    const remaining = invoices.filter(inv => inv.id !== invoiceId);
    setInvoices(remaining);
    localStorage.setItem('invoice_maker_invoices', JSON.stringify(remaining));

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
    const confirmed = window.confirm(`Are you sure you want to delete the ${invoiceIds.length} selected invoices?`);
    if (!confirmed) return;

    const remaining = invoices.filter(inv => !invoiceIds.includes(inv.id));
    setInvoices(remaining);
    localStorage.setItem('invoice_maker_invoices', JSON.stringify(remaining));

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
    localStorage.setItem('invoice_maker_invoices', JSON.stringify(updated));

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
    localStorage.setItem('invoice_maker_biz_profile', JSON.stringify(cleanProfile));

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
    localStorage.setItem('invoice_maker_presets', JSON.stringify(seededPresets));

    // Clear and seed an initial example bill matching template
    const sample = getSampleInvoice(templateId, user ? user.id : 'local');
    setInvoices([sample]);
    localStorage.setItem('invoice_maker_invoices', JSON.stringify([sample]));

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

    const localInvoices = invoices.filter(inv => inv.userId === 'local');
    if (localInvoices.length === 0) return;

    try {
      const syncedInvoices = localInvoices.map(inv => ({
        ...inv,
        userId: user.id,
        updatedAt: new Date().toISOString(),
      }));
      const { error } = await supabase.from('invoices').upsert(syncedInvoices);
      if (error) throw error;
      alert(`Cloud sync complete. ${syncedInvoices.length} offline invoices synced to your cloud account!`);
      // Realtime channel will auto-update state from Supabase
    } catch (err) {
      console.error('Failed syncing offline invoices:', err);
    }
  };

  // --- CLIENT ACTIONS ---
  const handleSaveClient = async (client: ClientProfile) => {
    const exists = clients.some(c => c.id === client.id);
    const updated = exists ? clients.map(c => c.id === client.id ? client : c) : [client, ...clients];
    setClients(updated);
    localStorage.setItem('invoice_maker_clients', JSON.stringify(updated));

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
    const confirmed = window.confirm('Are you sure you want to delete this client profile?');
    if (!confirmed) return;

    const remaining = clients.filter(c => c.id !== clientId);
    setClients(remaining);
    localStorage.setItem('invoice_maker_clients', JSON.stringify(remaining));

    if (isOnline && user) {
      try {
        await supabase.from('clients').delete().eq('id', clientId).eq('userId', user.id);
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
    localStorage.setItem('invoice_maker_expenses', JSON.stringify(updated));

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
    const confirmed = window.confirm('Are you sure you want to delete this business expense?');
    if (!confirmed) return;

    const remaining = expenses.filter(e => e.id !== expenseId);
    setExpenses(remaining);
    localStorage.setItem('invoice_maker_expenses', JSON.stringify(remaining));

    if (isOnline && user) {
      try {
        await supabase.from('expenses').delete().eq('id', expenseId).eq('userId', user.id);
      } catch (err) {
        console.error('Failed to delete business expense:', err);
      }
    }
  };

  // --- RECURRING BILL SCHEDULER ALGORITHM ---
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

        // Spawn a brand-new actual repeating invoice bill matching the template
        const spawnNumber = `${parent.invoiceNumber}-R${Math.floor(100 + Math.random() * 900)}`;
        const spawnInvoice: Invoice = {
          ...parent,
          id: `inv_rec_${Math.random().toString(36).substr(2, 9)}`,
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
      localStorage.setItem('invoice_maker_invoices', JSON.stringify(nextInvoices));
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

  // --- RENDERING CONFIGURATION ---
  if (!userEmail) {
    return (
      <Homepage
        theme={theme}
        onGoogleLogin={handleLogin}
        onCustomSignup={handleCustomSignup}
        onCustomLogin={handleCustomLogin}
        isOnline={isOnline}
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
        isBiometricsEnabled={securitySettings.isBiometricsEnabled}
        onToggleSecurity={handleToggleSecurity}
        onSyncLocalInvoices={handleSyncLocalInvoices}
        onSaveClient={handleSaveClient}
        onDeleteClient={handleDeleteClient}
        onSaveExpense={handleSaveExpense}
        onDeleteExpense={handleDeleteExpense}
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
        currencySymbol={profile.currency === 'GBP' ? '£' : profile.currency === 'EUR' ? '€' : profile.currency === 'JPY' ? '¥' : profile.currency === 'INR' ? '₹' : '$'}
        defaultTaxRate={profile.defaultTaxRate}
        isOpen={isInvoiceEditorOpen}
        onClose={() => setIsInvoiceEditorOpen(false)}
        onSave={handleSaveInvoice}
      />
    </>
  );
}
