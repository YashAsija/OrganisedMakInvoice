import React, { useState, useEffect } from 'react';
import { signInWithPopup, signOut, User, getAdditionalUserInfo } from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './lib/firebase';
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

  // --- CONNECT FIREBASE LISTENERS OR DEGRADE GRACEFULLY (CLOUD SYNCING) ---
  useEffect(() => {
    // Load local storage fallback immediately so the app shows data instantly before network resolves (and works fully offline)
    loadLocalData();

    let activeUnsubscribes: (() => void)[] = [];

    const cleanupActiveListeners = () => {
      activeUnsubscribes.forEach((unsub) => {
        try {
          unsub();
        } catch (e) {
          console.error('Error cleaning up active Firebase listener:', e);
        }
      });
      activeUnsubscribes = [];
    };

    // Setup Auth State Listener
    const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
      // First clean up any active snapshot listeners to prevent orphaned loops upon auth state shifts
      cleanupActiveListeners();

      if (currentUser) {
        setUser(currentUser);
        setUserEmail(currentUser.email);

        if (isOnline) {
          // --- SYNC / RESOLVE FROM CLOUD ---
          const uid = currentUser.uid;

          // 1. Fetch Cloud Profile
          try {
            const profileRef = doc(db, 'users', uid);
            const profileSnap = await getDoc(profileRef);
            if (profileSnap.exists()) {
              const cloudProf = profileSnap.data() as BusinessProfile;
              setProfile(cloudProf);
              localStorage.setItem('invoice_maker_biz_profile', JSON.stringify(cloudProf));
            } else {
              // Creating initial business profile for new users in Firestore
              const initProf: BusinessProfile = {
                uid,
                name: profile.name || currentUser.displayName || '',
                email: profile.email || currentUser.email || '',
                phone: profile.phone || '',
                address: profile.address || '',
                taxId: profile.taxId || '',
                currency: profile.currency || 'INR',
                defaultTaxRate: profile.defaultTaxRate || 18,
                updatedAt: new Date().toISOString()
              };
              await setDoc(profileRef, initProf);
              setProfile(initProf);
            }
          } catch (err) {
            console.error('Error fetching/setting cloud profile:', err);
          }

          // 2. Attach Live Listener to Invoices
          const invoicesPath = `users/${uid}/invoices`;
          const unsubscribeInvoices = onSnapshot(
            collection(db, 'users', uid, 'invoices'),
            (snapshot) => {
              const cloudInvoices: Invoice[] = [];
              snapshot.forEach((d) => {
                cloudInvoices.push(d.data() as Invoice);
              });
              
              // Sort by date descending
              cloudInvoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              
              setInvoices(cloudInvoices);
              localStorage.setItem('invoice_maker_invoices', JSON.stringify(cloudInvoices));
            },
            (error) => {
              if (auth.currentUser) {
                handleFirestoreError(error, OperationType.GET, invoicesPath);
              }
            }
          );
          activeUnsubscribes.push(unsubscribeInvoices);

          // 3. Attach Live Listener to Presets
          const presetsPath = `users/${uid}/presetItems`;
          const unsubscribePresets = onSnapshot(
            collection(db, 'users', uid, 'presetItems'),
            (snapshot) => {
              const cloudPresets: PresetItem[] = [];
              snapshot.forEach((d) => {
                cloudPresets.push(d.data() as PresetItem);
              });
              setPresets(cloudPresets);
              localStorage.setItem('invoice_maker_presets', JSON.stringify(cloudPresets));
            },
            (error) => {
              if (auth.currentUser) {
                handleFirestoreError(error, OperationType.GET, presetsPath);
              }
            }
          );
          activeUnsubscribes.push(unsubscribePresets);

          // 4. Attach Live Listener to Clients
          const clientsPath = `users/${uid}/clients`;
          const unsubscribeClients = onSnapshot(
            collection(db, 'users', uid, 'clients'),
            (snapshot) => {
              const cloudClients: ClientProfile[] = [];
              snapshot.forEach((d) => {
                cloudClients.push(d.data() as ClientProfile);
              });
              setClients(cloudClients);
              localStorage.setItem('invoice_maker_clients', JSON.stringify(cloudClients));
            },
            (error) => {
              if (auth.currentUser) {
                handleFirestoreError(error, OperationType.GET, clientsPath);
              }
            }
          );
          activeUnsubscribes.push(unsubscribeClients);

          // 5. Attach Live Listener to Expenses
          const expensesPath = `users/${uid}/expenses`;
          const unsubscribeExpenses = onSnapshot(
            collection(db, 'users', uid, 'expenses'),
            (snapshot) => {
              const cloudExpenses: Expense[] = [];
              snapshot.forEach((d) => {
                cloudExpenses.push(d.data() as Expense);
              });
              setExpenses(cloudExpenses);
              localStorage.setItem('invoice_maker_expenses', JSON.stringify(cloudExpenses));
            },
            (error) => {
              if (auth.currentUser) {
                handleFirestoreError(error, OperationType.GET, expensesPath);
              }
            }
          );
          activeUnsubscribes.push(unsubscribeExpenses);
        }
      } else {
        setUser(null);
        setUserEmail(null);
        // Fall back to offline local storage data
        loadLocalData();
      }
    });

    return () => {
      unsubscribeAuth();
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
            userId: user ? user.uid : '',
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
        updatedClients.forEach(client => {
          const clientWithUser = { ...client, userId: user.uid };
          setDoc(doc(db, 'users', user.uid, 'clients', client.id), clientWithUser).catch(e => {
            console.error('Failed to retroactively sync client to cloud:', e);
          });
        });
      }
    }
  }, [invoices, clients, isOnline, user]);

  // --- ACTIONS SYSTEM ---

  // 1. Google OAuth Popup login trigger
  const handleLogin = async () => {
    if (!isOnline) {
      alert('You are currently offline. Please reconnect to sign in and sync to the cloud.');
      return;
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const isNewUser = getAdditionalUserInfo(result)?.isNewUser;
      if (isNewUser) {
        setIsOnboarding(true);
        setIsProfileOpen(true);
      }
    } catch (e) {
      console.error('Login flow failed:', e);
    }
  };

  const handleCustomSignup = (name: string, companyName: string, email: string, phone: string) => {
    const resolvedEmail = email || `${phone.replace(/\s+/g, '') || 'user'}@makbills.local`;
    setUserEmail(resolvedEmail);
    localStorage.setItem('makbills_custom_email', resolvedEmail);
    localStorage.setItem('makbills_custom_brand', companyName);
    localStorage.setItem('makbills_custom_owner', name);
    localStorage.setItem('makbills_custom_phone', phone);
    
    // Update company brand profile instantly so it starts with the custom business name they registered
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
    
    setIsOnboarding(true);
    setIsProfileOpen(true);
  };

  const handleCustomLogin = (email: string, phone?: string) => {
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
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('makbills_custom_email');
      localStorage.removeItem('makbills_custom_brand');
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
      const path = `users/${user.uid}`;
      try {
        await setDoc(doc(db, 'users', user.uid), updatedProfile);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
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
        userId: user ? user.uid : '',
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
      const updatedInvoiceData = { ...invoice, userId: user.uid };
      const path = `users/${user.uid}/invoices/${invoice.id}`;
      try {
        await setDoc(doc(db, 'users', user.uid, 'invoices', invoice.id), updatedInvoiceData);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
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
      const path = `users/${user.uid}/invoices/${invoiceId}`;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'invoices', invoiceId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
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
      for (const invoiceId of invoiceIds) {
        try {
          await deleteDoc(doc(db, 'users', user.uid, 'invoices', invoiceId));
        } catch (error) {
          console.error(`Failed to delete invoice ${invoiceId} in bulk:`, error);
        }
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
      for (const invoiceId of invoiceIds) {
        const inv = invoices.find(i => i.id === invoiceId);
        if (inv) {
          try {
            await setDoc(doc(db, 'users', user.uid, 'invoices', invoiceId), { ...inv, status, userId: user.uid, updatedAt: new Date().toISOString() });
          } catch (error) {
            console.error(`Failed to update invoice ${invoiceId} client status in bulk:`, error);
          }
        }
      }
    }
  };

  // 5. Onboarding quick-start preset templates loader
  const handleLoadPresetTemplate = async (templateId: string) => {
    const template = BUSINESS_TEMPLATES.find(p => p.id === templateId);
    if (!template) return;

    // Load business details
    const cleanProfile: BusinessProfile = {
      uid: user ? user.uid : 'local',
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
      userId: user ? user.uid : 'local',
      name: it.name,
      rate: it.rate,
      taxPercentage: it.taxPercentage,
      description: it.description
    }));

    setPresets(seededPresets);
    localStorage.setItem('invoice_maker_presets', JSON.stringify(seededPresets));

    // Clear and seed an initial example bill matching template
    const sample = getSampleInvoice(templateId, user ? user.uid : 'local');
    setInvoices([sample]);
    localStorage.setItem('invoice_maker_invoices', JSON.stringify([sample]));

    if (isOnline && user) {
      // Sync seeded configurations to firesore
      try {
        await setDoc(doc(db, 'users', user.uid), cleanProfile);
        
        // Write standard invoice
        await setDoc(doc(db, 'users', user.uid, 'invoices', sample.id), { ...sample, userId: user.uid });

        // Write seeded presets
        for (const presetItem of seededPresets) {
          await setDoc(doc(db, 'users', user.uid, 'presetItems', presetItem.id), presetItem);
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

    let syncedCount = 0;
    try {
      for (const inv of localInvoices) {
        const syncedInv = { ...inv, userId: user.uid, updatedAt: new Date().toISOString() };
        await setDoc(doc(db, 'users', user.uid, 'invoices', inv.id), syncedInv);
        syncedCount++;
      }
      alert(`Cloud sync complete. ${syncedCount} offline invoices synced to your cloud account!`);
      
      // Live snapshot listener will auto-update state from Firestore
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
      const clientWithUser = { ...client, userId: user.uid };
      try {
        await setDoc(doc(db, 'users', user.uid, 'clients', client.id), clientWithUser);
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
        await deleteDoc(doc(db, 'users', user.uid, 'clients', clientId));
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
      const expenseWithUser = { ...expense, userId: user.uid };
      try {
        await setDoc(doc(db, 'users', user.uid, 'expenses', expense.id), expenseWithUser);
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
        await deleteDoc(doc(db, 'users', user.uid, 'expenses', expenseId));
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
        if (isOnline && user) {
          setDoc(doc(db, 'users', user.uid, 'invoices', up.id), { ...up, userId: user.uid }).catch(console.error);
        }
      });

      newSpawned.forEach((ch) => {
        nextInvoices = [ch, ...nextInvoices];
        if (isOnline && user) {
          setDoc(doc(db, 'users', user.uid, 'invoices', ch.id), { ...ch, userId: user.uid }).catch(console.error);
        }
      });

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
