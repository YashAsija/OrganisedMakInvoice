import React, { useState, useRef, useEffect } from 'react';
import { X, Check, Trash2, Upload, CreditCard, ShieldCheck, Sparkles, Building2, Landmark, Sliders, Award, FileSpreadsheet, KeyRound, ArrowLeft, ArrowRight, Plus, AlertCircle, Lock, Banknote, SlidersHorizontal, Hash, FileText, HelpCircle, RefreshCw } from 'lucide-react';
import { BusinessProfile } from '../types';
import { Country, State } from 'country-state-city';
import { supabase } from '../lib/supabase';
import { emitNotification } from '../lib/notifications';

interface BusinessProfileModalProps {
  profile: BusinessProfile;
  isOpen: boolean;
  isOnboarding?: boolean;
  onClose: () => void;
  onSave: (pf: BusinessProfile) => void;
}

export default function BusinessProfileModal({ profile, isOpen, isOnboarding = false, onClose, onSave }: BusinessProfileModalProps) {
  // Tabs State: 'company' | 'banking' | 'billing' | 'subscription' | 'tax'
  type TabType = 'company' | 'banking' | 'billing' | 'subscription' | 'tax';
  const validTabs: TabType[] = ['company', 'banking', 'billing', 'subscription', 'tax'];

  const [activeTab, setActiveTabState] = useState<TabType>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '') as TabType;
      if (validTabs.includes(hash)) {
        return hash;
      }
    }
    return 'company';
  });

  const setActiveTab = (tab: TabType) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname + '#' + tab);
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as TabType;
      if (validTabs.includes(hash)) {
        setActiveTabState(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  const [showErrors, setShowErrors] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [deletedTaxIds, setDeletedTaxIds] = useState<string[]>([]);

  // Subscription states
  const [subPlanName, setSubPlanName] = useState('Acme Ledger Hub Professional');
  const [subPlanType, setSubPlanType] = useState('Enterprise Unlimited');
  const [subStatus, setSubStatus] = useState('Royal Elite Status');
  const [subExpiresAt, setSubExpiresAt] = useState('June 30, 2029');
  const [subAuthorizedToken, setSubAuthorizedToken] = useState('');

  // Custom Notifications State
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info'; title?: string } | null>(null);

  // Fields state holding actual values
  const [name, setName] = useState(() => isOnboarding ? '' : (profile.name || ''));
  const [displayName, setDisplayName] = useState(() => isOnboarding ? '' : (profile.displayName || ''));
  const [email, setEmail] = useState(() => isOnboarding ? '' : (profile.email || ''));
  const [phone, setPhone] = useState(() => isOnboarding ? '' : (profile.phone || ''));
  const [address, setAddress] = useState(() => isOnboarding ? '' : (profile.address || ''));
  const [taxId, setTaxId] = useState(() => isOnboarding ? '' : (profile.taxId || ''));
  const [pan, setPan] = useState(() => isOnboarding ? '' : (profile.pan || ''));
  const [currency, setCurrency] = useState(() => isOnboarding ? '' : (profile.currency || 'USD'));
  const [defaultTaxRate, setDefaultTaxRate] = useState(() => isOnboarding ? 0 : (profile.defaultTaxRate || 0));
  const [logoUrl, setLogoUrl] = useState(() => isOnboarding ? '' : (profile.logoUrl || ''));
  const [website, setWebsite] = useState(() => isOnboarding ? '' : (profile.website || ''));
  const [signature, setSignature] = useState(() => isOnboarding ? '' : (profile.signature || ''));
  const [signatureSize, setSignatureSize] = useState<number>(() => isOnboarding ? 150 : (profile.signatureSize || 150));
  const [signatureMode, setSignatureMode] = useState<'draw' | 'type' | 'upload'>('draw');
  const [signatureText, setSignatureText] = useState('');
  const [signatureFont, setSignatureFont] = useState<string>('Caveat');
  const [themeAccent, setThemeAccent] = useState<'sky' | 'emerald' | 'indigo' | 'violet' | 'rose' | 'orange'>(() => isOnboarding ? 'sky' : (profile.themeAccent || 'sky'));
  const [invoiceFont, setInvoiceFont] = useState<'inter' | 'space' | 'playfair' | 'mono'>(() => isOnboarding ? 'inter' : (profile.invoiceFont || 'inter'));
  const [invoiceLayout, setInvoiceLayout] = useState<'modern' | 'minimal' | 'agency' | 'professional' | 'startup' | 'enterprise'>(() => isOnboarding ? 'professional' : (profile.invoiceLayout || 'professional'));

  // Custom Fields mapped from reference UI
  const [companyCode, setCompanyCode] = useState(() => isOnboarding ? '' : (profile.companyCode || ''));
  const [state, setState] = useState(() => isOnboarding ? '' : (profile.state || ''));
  const [stateCode, setStateCode] = useState(() => isOnboarding ? '' : (profile.stateCode || ''));
  const [country, setCountry] = useState(() => isOnboarding ? '' : (profile.country || ''));
  const [currencySymbol, setCurrencySymbol] = useState(() => isOnboarding ? '' : (profile.currencySymbol || ''));
  const [mobile, setMobile] = useState(() => isOnboarding ? '' : (profile.mobile || ''));

  // Banking
  const [bankName, setBankName] = useState(() => isOnboarding ? '' : (profile.bankName || ''));
  const [accountNumber, setAccountNumber] = useState(() => isOnboarding ? '' : (profile.accountNumber || ''));
  const [ifsc, setIfsc] = useState(() => isOnboarding ? '' : (profile.ifsc || ''));
  const [upiId, setUpiId] = useState(() => isOnboarding ? '' : (profile.upiId || ''));

  // Banking verification states
  const [upiVerified, setUpiVerified] = useState<boolean | null>(() => profile.upiId ? true : null);
  const [ifscVerified, setIfscVerified] = useState<boolean | null>(() => profile.ifsc ? true : null);
  const [accountVerified, setAccountVerified] = useState<boolean | null>(() => profile.accountNumber ? true : null);

  const [upiChecking, setUpiChecking] = useState(false);
  const [ifscChecking, setIfscChecking] = useState(false);
  const [accountChecking, setAccountChecking] = useState(false);

  const [upiError, setUpiError] = useState<string>('');
  const [ifscError, setIfscError] = useState<string>('');
  const [accountError, setAccountError] = useState<string>('');

  // Billing
  const [invoicePrefix, setInvoicePrefix] = useState(() => isOnboarding ? '' : (profile.invoicePrefix || 'INV'));
  const [startingInvoiceNumber, setStartingInvoiceNumber] = useState(() => isOnboarding ? '' : (profile.startingInvoiceNumber || '1'));
  const [proformaPrefix, setProformaPrefix] = useState(() => isOnboarding ? '' : (profile.proformaPrefix || 'PI'));
  const [startingProformaNumber, setStartingProformaNumber] = useState(() => isOnboarding ? '' : (profile.startingProformaNumber || '1'));
  const [debitNotePrefix, setDebitNotePrefix] = useState(() => isOnboarding ? '' : (profile.debitNotePrefix || 'DN'));
  const [startingDebitNoteNumber, setStartingDebitNoteNumber] = useState(() => isOnboarding ? '' : (profile.startingDebitNoteNumber || '1'));
  const [creditNotePrefix, setCreditNotePrefix] = useState(() => isOnboarding ? '' : (profile.creditNotePrefix || 'CN'));
  const [startingCreditNoteNumber, setStartingCreditNoteNumber] = useState(() => isOnboarding ? '' : (profile.startingCreditNoteNumber || '1'));
  const [quotePrefix, setQuotePrefix] = useState(() => isOnboarding ? '' : (profile.quotePrefix || 'EST'));
  const [startingQuoteNumber, setStartingQuoteNumber] = useState(() => isOnboarding ? '' : (profile.startingQuoteNumber || '1'));
  const [purchaseOrderPrefix, setPurchaseOrderPrefix] = useState(() => isOnboarding ? '' : (profile.purchaseOrderPrefix || 'PO'));
  const [startingPurchaseOrderNumber, setStartingPurchaseOrderNumber] = useState(() => isOnboarding ? '' : (profile.startingPurchaseOrderNumber || '1'));
  const [purchasesPrefix, setPurchasesPrefix] = useState(() => isOnboarding ? '' : (profile.purchasesPrefix || 'PUR'));
  const [startingPurchasesNumber, setStartingPurchasesNumber] = useState(() => isOnboarding ? '' : (profile.startingPurchasesNumber || '1'));
  const [postedInvoiceEdit, setPostedInvoiceEdit] = useState<'Enabled' | 'Disabled'>(() => isOnboarding ? 'Disabled' : (profile.postedInvoiceEdit || 'Disabled'));
  const [materialRateEdit, setMaterialRateEdit] = useState<'Enabled' | 'Disabled'>(() => isOnboarding ? 'Disabled' : (profile.materialRateEdit || 'Disabled'));
  const [materialCategorization, setMaterialCategorization] = useState<'Optional' | 'Required'>(() => isOnboarding ? 'Optional' : (profile.materialCategorization || 'Optional'));
  const [defaultNotes, setDefaultNotes] = useState(() => isOnboarding ? '' : (profile.defaultNotes || 'Thank you for your business.'));
  const [defaultTerms, setDefaultTerms] = useState(() => isOnboarding ? '' : (profile.defaultTerms || 'Goods once sold will not be taken back or exchanged.'));

  // Tax Config
  const [taxMode, setTaxMode] = useState<'dynamic' | 'custom'>(() => isOnboarding ? 'dynamic' : (profile.taxMode || 'dynamic'));
  const [customTaxName, setCustomTaxName] = useState(() => isOnboarding ? '' : (profile.customTaxName || 'Tax'));
  const [customTaxPercentage, setCustomTaxPercentage] = useState<number>(() => isOnboarding ? 0 : (profile.customTaxPercentage !== undefined ? profile.customTaxPercentage : 18));
  const [customTaxCols, setCustomTaxCols] = useState<string[]>(() => isOnboarding ? [] : (profile.customTaxCols || ['Tax']));
  const [additionalTaxes, setAdditionalTaxes] = useState<{ id: string; name: string; rate: number }[]>(() => isOnboarding ? [] : (profile.additionalTaxes || []));

  // Logo Crop/Adjust States
  const [logoToCrop, setLogoToCrop] = useState<string | null>(null);
  const [showLogoOptions, setShowLogoOptions] = useState(false);
  const [showLogoPreview, setShowLogoPreview] = useState(false);
  const [cropZoom, setCropZoom] = useState<number>(1);
  const [cropPanX, setCropPanX] = useState<number>(0);
  const [cropPanY, setCropPanY] = useState<number>(0);
  const [cropRatio, setCropRatio] = useState<'1:1' | '3:1' | 'free'>('1:1');
  const cropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPanningLogo, setIsPanningLogo] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  const validateCompanyProfile = (): boolean => {
    if (!name.trim()) {
      setValidationError('Business Name is required.');
      setShowErrors(true);
      return false;
    }
    if (!displayName.trim()) {
      setValidationError('Owner Name is required.');
      setShowErrors(true);
      return false;
    }
    if (!country.trim()) {
      setValidationError('Country is required.');
      setShowErrors(true);
      return false;
    }
    if (!state.trim()) {
      setValidationError('State is required.');
      setShowErrors(true);
      return false;
    }
    if (!mobile.trim()) {
      setValidationError('Mobile Number is required.');
      setShowErrors(true);
      return false;
    }
    setValidationError(null);
    setShowErrors(false);
    return true;
  };

  const TABS_ORDER = ['company', 'banking', 'billing', 'tax', 'subscription'] as const;

  const handleVerifyIFSC = async (codeToVerify?: string) => {
    const code = (codeToVerify !== undefined ? codeToVerify : ifsc).trim().toUpperCase();
    if (!code) {
      setIfscError('');
      setIfscVerified(null);
      return true;
    }
    if (!/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(code)) {
      setIfscError('Invalid IFSC format. Must be 11 characters (e.g. HDFC0001234).');
      setIfscVerified(false);
      return false;
    }
    setIfscChecking(true);
    setIfscError('');
    try {
      const res = await fetch(`https://ifsc.razorpay.com/${code}`);
      if (res.ok) {
        const data = await res.json();
        if (data.BANK) {
          setBankName(data.BANK);
        }
        setIfscVerified(true);
        setIfscError('');
        return true;
      } else {
        setIfscError('IFSC Code not found on official registry.');
        setIfscVerified(false);
        return false;
      }
    } catch {
      // Offline fallback: format matches, so we allow it but warn
      setIfscError('Failed to verify IFSC online (Offline fallback allowed).');
      setIfscVerified(true);
      return true;
    } finally {
      setIfscChecking(false);
    }
  };

  const handleVerifyUPI = async (idToVerify?: string) => {
    const upi = (idToVerify !== undefined ? idToVerify : upiId).trim();
    if (!upi) {
      setUpiVerified(null);
      setUpiError('');
      return true;
    }
    if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upi)) {
      setUpiError('Invalid UPI ID format (e.g. name@bank).');
      setUpiVerified(false);
      return false;
    }
    setUpiChecking(true);
    setUpiError('');
    await new Promise(resolve => setTimeout(resolve, 500));
    setUpiVerified(true);
    setUpiError('');
    setUpiChecking(false);
    return true;
  };

  const handleVerifyAccount = async (numToVerify?: string) => {
    const num = (numToVerify !== undefined ? numToVerify : accountNumber).trim();
    if (!num) {
      setAccountError('');
      setAccountVerified(null);
      return true;
    }
    if (!/^\d{9,18}$/.test(num)) {
      setAccountError('Invalid Account Number. Must be 9 to 18 digits.');
      setAccountVerified(false);
      return false;
    }
    setAccountChecking(true);
    setAccountError('');
    await new Promise(resolve => setTimeout(resolve, 400));
    setAccountVerified(true);
    setAccountError('');
    setAccountChecking(false);
    return true;
  };

  const validateBankingDetails = async (): Promise<boolean> => {
    setValidationError(null);
    setShowErrors(false);

    const hasBankDetails = bankName.trim() || accountNumber.trim() || ifsc.trim() || upiId.trim();
    if (hasBankDetails) {

      if (accountNumber.trim()) {
        const isAccountValid = await handleVerifyAccount();
        if (!isAccountValid) {
          setValidationError(accountError || 'Invalid Account Number.');
          setShowErrors(true);
          return false;
        }
      }

      if (ifsc.trim()) {
        const isIfscValid = await handleVerifyIFSC();
        if (!isIfscValid) {
          setValidationError(ifscError || 'Invalid IFSC Code.');
          setShowErrors(true);
          return false;
        }
      }

      if (upiId.trim()) {
        const isUpiValid = await handleVerifyUPI();
        if (!isUpiValid) {
          setValidationError(upiError || 'Invalid UPI ID.');
          setShowErrors(true);
          return false;
        }
      }
    }
    return true;
  };

  const validateBillingConfig = (): boolean => {
    if (!invoicePrefix || !invoicePrefix.toString().trim()) {
      setValidationError('Invoice Prefix is required.');
      setShowErrors(true);
      return false;
    }
    if (startingInvoiceNumber === undefined || startingInvoiceNumber === null || startingInvoiceNumber.toString().trim() === '') {
      setValidationError('Starting Invoice Number is required.');
      setShowErrors(true);
      return false;
    }
    setValidationError(null);
    setShowErrors(false);
    return true;
  };

  const validateTaxConfig = (): boolean => {
    if (country.toLowerCase() !== 'india') {
      if (!customTaxName.trim()) {
        setValidationError('Custom Tax Name is required.');
        setShowErrors(true);
        return false;
      }
    }
    setValidationError(null);
    setShowErrors(false);
    return true;
  };

  const getTabOpacityClass = (tab: typeof activeTab): string => {
    if (!isOnboarding) return 'opacity-100';
    
    const activeIdx = TABS_ORDER.indexOf(activeTab);
    const targetIdx = TABS_ORDER.indexOf(tab);
    
    return targetIdx <= activeIdx ? 'opacity-100' : 'opacity-40';
  };

  const handleTabChange = async (targetTab: typeof activeTab) => {
    if (isOnboarding) {
      const activeIdx = TABS_ORDER.indexOf(activeTab);
      const targetIdx = TABS_ORDER.indexOf(targetTab);
      
      if (targetIdx > activeIdx) {
        // Enforce sequential progression
        if (targetIdx > activeIdx + 1) {
          setValidationError('Please complete the steps in order.');
          setShowErrors(true);
          return;
        }
        
        // Validate active step before going to the next one
        if (activeTab === 'company' && !validateCompanyProfile()) return;
        if (activeTab === 'banking' && !(await validateBankingDetails())) return;
        if (activeTab === 'billing' && !validateBillingConfig()) return;
        if (activeTab === 'tax' && !validateTaxConfig()) return;

        // Save current tab details to database so next steps have complete details
        const success = await saveSettingsToDB();
        if (!success) return; // Stop tab change if save failed
      }
    }
    setValidationError(null);
    setShowErrors(false);
    setActiveTab(targetTab);
  };

  const renderSidebarBadge = (tab: typeof activeTab, defaultIcon: React.ReactNode, index: number) => {
    if (!isOnboarding) {
      return (
        <div className={`w-6.5 h-6.5 rounded-lg flex items-center justify-center transition-colors ${activeTab === tab ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-sky-600'}`}>
          {defaultIcon}
        </div>
      );
    }

    const activeIdx = TABS_ORDER.indexOf(activeTab);
    const hasPassed = index < activeIdx;

    return (
      <div className={`w-6.5 h-6.5 rounded-full flex items-center justify-center font-extrabold text-[10px] transition-all border ${
        activeTab === tab 
          ? 'bg-white text-sky-600 border-white shadow-sm'
          : hasPassed
            ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
            : 'bg-slate-100 dark:bg-zinc-850 text-sky-600 border-slate-200 dark:border-zinc-800'
      }`}>
        {hasPassed ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : (index + 1)}
      </div>
    );
  };

  // Digital Signature Pad Canvas References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureImageInputRef = useRef<HTMLInputElement>(null);

  // Load settings, tax_configs, and subscriptions on mount / open
  useEffect(() => {
    if (!isOpen) return;

    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '') as typeof activeTab;
      if (['company', 'banking', 'billing', 'subscription', 'tax'].includes(hash)) {
        setActiveTab(hash);
      } else {
        setActiveTab('company');
      }
    } else {
      setActiveTab('company');
    }

    const loadData = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.warn("[SETTINGS] No logged in user found:", userError);
          // Fall back to props if no auth
          if (!isOnboarding) {
            setName(profile.name || '');
            setDisplayName(profile.displayName || '');
            setWebsite(profile.website || '');
            setEmail(profile.email || '');
            setPhone(profile.phone || '');
            setAddress(profile.address || '');
            setTaxId(profile.taxId || '');
            setPan(profile.pan || '');
            setCurrency(profile.currency || 'USD');
            setDefaultTaxRate(profile.defaultTaxRate || 0);
            setLogoUrl(profile.logoUrl || '');
            setSignature(profile.signature || '');
            setSignatureSize(profile.signatureSize || 150);
            setThemeAccent(profile.themeAccent || 'sky');
            setInvoiceFont(profile.invoiceFont || 'inter');
            setInvoiceLayout(profile.invoiceLayout || 'professional');

            setCompanyCode(profile.companyCode || '');
            setState(profile.state || '');
            setStateCode(profile.stateCode || '');
            setCountry(profile.country || '');
            setCurrencySymbol(profile.currencySymbol || '');
            setMobile(profile.mobile || '');

            setBankName(profile.bankName || '');
            setAccountNumber(profile.accountNumber || '');
            setIfsc(profile.ifsc || '');
            setUpiId(profile.upiId || '');

            setInvoicePrefix(profile.invoicePrefix || 'INV');
            setStartingInvoiceNumber(profile.startingInvoiceNumber || '1');
            setProformaPrefix(profile.proformaPrefix || 'PI');
            setStartingProformaNumber(profile.startingProformaNumber || '1');
            setDebitNotePrefix(profile.debitNotePrefix || 'DN');
            setStartingDebitNoteNumber(profile.startingDebitNoteNumber || '1');
            setCreditNotePrefix(profile.creditNotePrefix || 'CN');
            setStartingCreditNoteNumber(profile.startingCreditNoteNumber || '1');
            setQuotePrefix(profile.quotePrefix || 'EST');
            setStartingQuoteNumber(profile.startingQuoteNumber || '1');
            setPurchaseOrderPrefix(profile.purchaseOrderPrefix || 'PO');
            setStartingPurchaseOrderNumber(profile.startingPurchaseOrderNumber || '1');
            setPurchasesPrefix(profile.purchasesPrefix || 'PUR');
            setStartingPurchasesNumber(profile.startingPurchasesNumber || '1');
            setPostedInvoiceEdit(profile.postedInvoiceEdit || 'Disabled');
            setMaterialRateEdit(profile.materialRateEdit || 'Disabled');
            setMaterialCategorization(profile.materialCategorization || 'Optional');
            setDefaultNotes(profile.defaultNotes || 'Thank you for your business.');
            setDefaultTerms(profile.defaultTerms || 'Goods once sold will not be taken back or exchanged.');

            setTaxMode(profile.taxMode || 'dynamic');
            setCustomTaxName(profile.customTaxName || 'Tax');
            setCustomTaxPercentage(profile.customTaxPercentage !== undefined ? profile.customTaxPercentage : 18);
            setCustomTaxCols(profile.customTaxCols || ['Tax']);
            setAdditionalTaxes(profile.additionalTaxes || []);
          }
          return;
        }

        // Fetch company settings
        const { data: settings, error: settingsError } = await supabase
          .from('company_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (settingsError && settingsError.code !== 'PGRST116') {
          console.error("[SETTINGS] Error fetching settings:", settingsError);
        }

        if (settings) {
          console.log("[SETTINGS] Loaded settings logo_url:", settings.logo_url, "signature_url:", settings.signature_url);
          setName(settings.business_name || '');
          setDisplayName(settings.owner_name || '');
          setEmail(settings.email || '');
          setPhone(settings.phone || '');
          setAddress(settings.address || '');
          setTaxId(settings.gstin || '');
          setPan(settings.pan || '');
          setCurrency(settings.currency || 'USD');
          setLogoUrl(settings.logo_url || '');
          setSignature(settings.signature_url || '');
          setSignatureMode(settings.signature_type || 'draw');
          
          setCompanyCode(settings.company_code || '');
          setState(settings.state || '');
          setStateCode(settings.state_code || '');
          setCountry(settings.country || '');
          setCurrencySymbol(settings.currency_symbol || '');
          setMobile(settings.mobile || '');

          setBankName(settings.bank_name || '');
          setAccountNumber(settings.account_number || '');
          setIfsc(settings.ifsc || '');
          setUpiId(settings.upi_id || '');

          setInvoicePrefix(settings.invoice_prefix || 'INV');
          setStartingInvoiceNumber(settings.starting_invoice_number || '1');
          setProformaPrefix(settings.proforma_prefix || 'PRO');
          setStartingProformaNumber(settings.starting_proforma_number || '1');
          setDebitNotePrefix(settings.debit_note_prefix || 'DN');
          setStartingDebitNoteNumber(settings.starting_debit_note_number || '1');
          setCreditNotePrefix(settings.credit_note_prefix || 'CN');
          setStartingCreditNoteNumber(settings.starting_credit_note_number || '1');
          setQuotePrefix(settings.quote_prefix || 'EST');
          setStartingQuoteNumber(settings.starting_quote_number || '1');
          setPostedInvoiceEdit(settings.posted_invoice_edit === true ? 'Enabled' : 'Disabled');
          setMaterialRateEdit(settings.material_rate_edit === true ? 'Enabled' : 'Disabled');
          setMaterialCategorization(
            settings.material_categorization 
              ? (settings.material_categorization.charAt(0).toUpperCase() + settings.material_categorization.slice(1)) 
              : 'Optional'
          );
          setDefaultNotes(settings.default_notes || 'Thank you for your business.');
          setDefaultTerms(settings.default_terms || 'Goods once sold will not be taken back or exchanged.');
        } else {
          // If no row exists yet, use props / defaults
          setName(profile.name || '');
          setDisplayName(profile.displayName || '');
          setWebsite(profile.website || '');
          setEmail(profile.email || '');
          setPhone(profile.phone || '');
          setAddress(profile.address || '');
          setTaxId(profile.taxId || '');
          setPan(profile.pan || '');
          setCurrency(profile.currency || 'USD');
          setDefaultTaxRate(profile.defaultTaxRate || 0);
          setLogoUrl(profile.logoUrl || '');
          setSignature(profile.signature || '');
          setSignatureSize(profile.signatureSize || 150);
          setThemeAccent(profile.themeAccent || 'sky');
          setInvoiceFont(profile.invoiceFont || 'inter');
          setInvoiceLayout(profile.invoiceLayout || 'professional');

          setCompanyCode(profile.companyCode || '');
          setState(profile.state || '');
          setStateCode(profile.stateCode || '');
          setCountry(profile.country || '');
          setCurrencySymbol(profile.currencySymbol || '');
          setMobile(profile.mobile || '');

          setBankName(profile.bankName || '');
          setAccountNumber(profile.accountNumber || '');
          setIfsc(profile.ifsc || '');
          setUpiId(profile.upiId || '');

          setInvoicePrefix(profile.invoicePrefix || 'INV');
          setStartingInvoiceNumber(profile.startingInvoiceNumber || '1');
          setProformaPrefix(profile.proformaPrefix || 'PI');
          setStartingProformaNumber(profile.startingProformaNumber || '1');
          setDebitNotePrefix(profile.debitNotePrefix || 'DN');
          setStartingDebitNoteNumber(profile.startingDebitNoteNumber || '1');
          setCreditNotePrefix(profile.creditNotePrefix || 'CN');
          setStartingCreditNoteNumber(profile.startingCreditNoteNumber || '1');
          setQuotePrefix(profile.quotePrefix || 'EST');
          setStartingQuoteNumber(profile.startingQuoteNumber || '1');
          setPostedInvoiceEdit(profile.postedInvoiceEdit || 'Disabled');
          setMaterialRateEdit(profile.materialRateEdit || 'Disabled');
          setMaterialCategorization(profile.materialCategorization || 'Optional');
          setDefaultNotes(profile.defaultNotes || 'Thank you for your business.');
          setDefaultTerms(profile.defaultTerms || 'Goods once sold will not be taken back or exchanged.');
        }

        // Fetch tax configs
        const { data: taxes, error: taxesError } = await supabase
          .from('tax_configs')
          .select('*')
          .eq('user_id', user.id);

        if (taxesError) {
          console.error("[SETTINGS] Error fetching tax configs:", taxesError);
        } else if (taxes && taxes.length > 0) {
          const mappedTaxes = taxes.map(t => ({
            id: t.id,
            name: t.tax_label,
            rate: Number(t.tax_percentage)
          }));
          setAdditionalTaxes(mappedTaxes);
        } else {
          setAdditionalTaxes(profile.additionalTaxes || []);
        }

        // Fetch subscriptions
        const { data: sub, error: subError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (subError && subError.code !== 'PGRST116') {
          console.error("[SETTINGS] Error fetching subscription:", subError);
        }

        if (sub) {
          setSubPlanName(sub.plan_name || 'Acme Ledger Hub Professional');
          setSubPlanType(sub.plan_type || 'Enterprise Unlimited');
          setSubStatus(sub.status || 'Royal Elite Status');
          setSubExpiresAt(sub.expires_at || 'June 30, 2029');
          setSubAuthorizedToken(sub.authorized_token_node || '');
        }
      } catch (err) {
        console.error("[SETTINGS] Unexpected error loading profile settings:", err);
      }
    };

    loadData();
  }, [isOpen]);

  // Handle opening of Canvas & Initializing signature preview
  useEffect(() => {
    if (isOpen && canvasRef.current && (activeTab === 'company' || activeTab === 'billing')) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#ffffff'; // light signature color for dark pad
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Refit coordinates
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        ctx.fillStyle = '#090d16'; // deep obsidian fill
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Preload signature if exists
        if (signature) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          };
          img.onerror = () => {
            const cleanImg = new Image();
            cleanImg.onload = () => {
              ctx.drawImage(cleanImg, 0, 0, canvas.width, canvas.height);
            };
            cleanImg.src = signature;
          };
          img.src = signature;
        }
      }
    }
  }, [isOpen, activeTab, signature]);

  // if (!isOpen) return null; // Removed early return to prevent hook errors

  // Real offline-ready Base64 logo upload triggers
  const triggerLogoUpload = () => {
    fileInputRef.current?.click();
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setLogoToCrop(event.target.result as string);
          setCropZoom(1);
          setCropPanX(0);
          setCropPanY(0);
          setCropRatio('1:1');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Render crop preview
  useEffect(() => {
    if (!logoToCrop || !cropCanvasRef.current) return;
    const canvas = cropCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let cropW = 160;
      let cropH = 160;
      if (cropRatio === '3:1') {
        cropW = 180;
        cropH = 60;
      } else if (cropRatio === 'free') {
        const imgAspect = img.width / img.height;
        if (imgAspect >= 1) {
          cropW = 180;
          cropH = Math.max(40, Math.min(180, 180 / imgAspect));
        } else {
          cropH = 120;
          cropW = Math.max(40, Math.min(120, 120 * imgAspect));
        }
      }

      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      ctx.beginPath();
      ctx.rect(cx - cropW/2, cy - cropH/2, cropW, cropH);
      ctx.clip();

      const drawW = img.width * cropZoom;
      const drawH = img.height * cropZoom;
      ctx.drawImage(
        img,
        cx - drawW / 2 + cropPanX,
        cy - drawH / 2 + cropPanY,
        drawW,
        drawH
      );

      ctx.restore();

      ctx.strokeStyle = '#0ea5e9';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - cropW/2, cy - cropH/2, cropW, cropH);

      ctx.fillStyle = 'rgba(9, 13, 22, 0.7)';
      ctx.fillRect(0, 0, canvas.width, cy - cropH/2);
      ctx.fillRect(0, cy + cropH/2, canvas.width, cy - cropH/2);
      ctx.fillRect(0, cy - cropH/2, cx - cropW/2, cropH);
      ctx.fillRect(cx + cropW/2, cy - cropH/2, cx - cropW/2, cropH);
    };
    img.src = logoToCrop;
  }, [logoToCrop, cropZoom, cropPanX, cropPanY, cropRatio]);

  const handleApplyLogoCrop = () => {
    if (!logoToCrop) return;
    const img = new Image();
    img.onload = () => {
      const croppedCanvas = document.createElement('canvas');
      
      let cropW = 160;
      let cropH = 160;
      if (cropRatio === '3:1') {
        cropW = 180;
        cropH = 60;
      } else if (cropRatio === 'free') {
        const imgAspect = img.width / img.height;
        if (imgAspect >= 1) {
          cropW = 180;
          cropH = Math.max(40, Math.min(180, 180 / imgAspect));
        } else {
          cropH = 120;
          cropW = Math.max(40, Math.min(120, 120 * imgAspect));
        }
      }

      croppedCanvas.width = cropW;
      croppedCanvas.height = cropH;
      const ctx = croppedCanvas.getContext('2d');
      if (!ctx) return;

      const drawW = img.width * cropZoom;
      const drawH = img.height * cropZoom;
      
      ctx.drawImage(
        img,
        - (drawW / 2 - cropW / 2) + cropPanX,
        - (drawH / 2 - cropH / 2) + cropPanY,
        drawW,
        drawH
      );

      setLogoUrl(croppedCanvas.toDataURL('image/png'));
      setLogoToCrop(null);
    };
    img.src = logoToCrop;
  };

  const handleLogoPanStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsPanningLogo(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    panStart.current = {
      x: clientX - cropPanX,
      y: clientY - cropPanY
    };
  };

  const handleLogoPanMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isPanningLogo) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setCropPanX(clientX - panStart.current.x);
    setCropPanY(clientY - panStart.current.y);
  };

  const handleLogoPanEnd = () => {
    setIsPanningLogo(false);
  };

    // Country change automatically updates states and currency
    // Map of Indian State ISO codes to numeric GST state codes
  const INDIAN_NUMERIC_STATE_CODES: { [key: string]: string } = {
    'DL': '07', 'MH': '27', 'KA': '29', 'TN': '33', 'UP': '09',
    'GJ': '24', 'WB': '19', 'TG': '36', 'AP': '37', 'BR': '10',
    'MP': '23', 'RJ': '08', 'CH': '04', 'HR': '06', 'UK': '05',
    'KL': '32', 'OR': '21', 'PB': '03', 'AS': '18', 'JH': '20',
    'CT': '22', 'HP': '02', 'TR': '16', 'ML': '17', 'MN': '14',
    'NL': '13', 'AR': '12', 'MZ': '15', 'SK': '11', 'GA': '30',
    'PY': '34', 'AN': '35', 'LD': '31', 'DN': '26', 'DD': '25',
    'LA': '38'
  };

  // Country change automatically updates states, currency, and phone prefix
  const handleCountryChange = (isoCode: string) => {
    const selectedCountry = Country.getCountryByCode(isoCode);
    if (selectedCountry) {
      setCountry(selectedCountry.name);
      setCurrency(selectedCountry.currency || 'USD');
      
      // Update phone prefix
      if (selectedCountry.phonecode) {
        setPhone('+' + selectedCountry.phonecode + ' ');
      }
      
      // Try to map currency to symbol
      const symbolMap: { [key: string]: string } = {
        USD: '$', EUR: '€', GBP: '£', JPY: '¥', INR: '₹', CAD: 'C$', AUD: 'A$', IDR: 'Rp'
      };
      if (selectedCountry.currency && symbolMap[selectedCountry.currency]) {
        setCurrencySymbol(symbolMap[selectedCountry.currency]);
      } else {
        setCurrencySymbol(selectedCountry.currency || ''); // fallback
      }
      
      // Reset state when country changes
      setState('');
      setStateCode('');
    }
  };

  const handleStateChange = (isoCode: string, currentCountryName: string) => {
    const cCode = Country.getAllCountries().find(c => c.name === currentCountryName)?.isoCode;
    if (cCode) {
      const selectedState = State.getStateByCodeAndCountry(isoCode, cCode);
      if (selectedState) {
        setState(selectedState.name);
        
        // If it's India, use numeric GST code, otherwise leave it empty so they can type numbers
        if (cCode === 'IN') {
          setStateCode(INDIAN_NUMERIC_STATE_CODES[isoCode] || '');
        } else {
          setStateCode('');
        }
      }
    }
  };

  // Helper to crop canvas signature to content boundaries
  const getCroppedCanvas = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return canvas;
    const w = canvas.width;
    const h = canvas.height;
    if (w === 0 || h === 0) return canvas;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    
    let minX = w, minY = h, maxX = 0, maxY = 0;
    let hasContent = false;
    
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const index = (y * w + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const a = data[index + 3];
        
        // Check if pixel is not fully white and has some alpha transparency
        if (a > 10 && (r < 250 || g < 250 || b < 250)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          hasContent = true;
        }
      }
    }
    
    if (!hasContent) return canvas;
    
    // Add small padding around cropped signature
    const padding = 10;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(w, maxX + padding);
    maxY = Math.min(h, maxY + padding);
    
    const cropW = maxX - minX;
    const cropH = maxY - minY;
    
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = cropW;
    cropCanvas.height = cropH;
    const cropCtx = cropCanvas.getContext('2d');
    if (!cropCtx) return canvas;
    
    cropCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
    return cropCanvas;
  };

  // --- HTML5 CANVAS COORDINATE TRANSLATORS ---
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  useEffect(() => {
    // If no signature, init canvas to white
    if (!signature && signatureMode === 'draw') {
      initCanvas();
    }
  }, [isOpen, signatureMode]);

  useEffect(() => {
    if (signatureMode === 'type') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      
      const drawText = () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (signatureText.trim()) {
          ctx.font = `italic 96px "${signatureFont}", "Brush Script MT", cursive`;
          ctx.fillStyle = '#000000';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(signatureText, canvas.width / 2, canvas.height / 2);
          
          const croppedCanvas = getCroppedCanvas(canvas);
          setSignature(croppedCanvas.toDataURL('image/png'));
        } else {
          setSignature('');
        }
      };

      if (document.fonts) {
        document.fonts.load(`italic 96px "${signatureFont}"`).then(drawText).catch(drawText);
      } else {
        drawText();
      }
    }
  }, [signatureText, signatureMode, signatureFont]);
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (signatureMode !== 'draw') return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const coords = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const coords = getCoordinates(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (canvas) {
        const croppedCanvas = getCroppedCanvas(canvas);
        const signData = croppedCanvas.toDataURL('image/png');
        setSignature(signData);
      }
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setSignature('');
        setSignatureText('');
      }
    }
  };

  // Upload image and extract signature from it onto the canvas
  const handleSignatureImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const canvas = canvasRef.current;
      if (!canvas) {
        // Fallback: just save the image directly as the signature
        setSignature(dataUrl);
        return;
      }
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        if (!tempCtx) return;
        
        tempCtx.drawImage(img, 0, 0);
        const imgData = tempCtx.getImageData(0, 0, img.width, img.height);
        const data = imgData.data;
        
        let minX = img.width, minY = img.height, maxX = 0, maxY = 0;
        let hasSignature = false;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2];
          const brightness = (0.299 * r + 0.587 * g + 0.114 * b);
          
          if (brightness > 200) {
            data[i+3] = 0; // Transparent
          } else {
            data[i] = 0; data[i+1] = 0; data[i+2] = 0; data[i+3] = 255;
            const x = (i / 4) % img.width;
            const y = Math.floor((i / 4) / img.width);
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            hasSignature = true;
          }
        }
        
        if (hasSignature) {
          tempCtx.putImageData(imgData, 0, 0);
          const sigWidth = maxX - minX;
          const sigHeight = maxY - minY;
          const scale = Math.min((canvas.width - 40) / sigWidth, (canvas.height - 40) / sigHeight);
          const drawW = sigWidth * scale;
          const drawH = sigHeight * scale;
          const drawX = (canvas.width - drawW) / 2;
          const drawY = (canvas.height - drawH) / 2;
          
          ctx.drawImage(tempCanvas, minX, minY, sigWidth, sigHeight, drawX, drawY, drawW, drawH);
        }
        
        setSignatureMode('upload');
        setSignature(canvas.toDataURL('image/png'));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    // Reset so same file can be re-uploaded
    e.target.value = '';
  };

  const dataURLtoBlob = (dataurl: string) => {
    try {
      const arr = dataurl.split(',');
      if (arr.length < 2) return null;
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    } catch (e) {
      console.error("[SETTINGS] dataURLtoBlob conversion error:", e);
      return null;
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isOnboarding) {
      if (!validateCompanyProfile()) {
        setActiveTab('company');
        return;
      }
      if (!(await validateBankingDetails())) {
        setActiveTab('banking');
        return;
      }
      if (!validateBillingConfig()) {
        setActiveTab('billing');
        return;
      }
      if (!validateTaxConfig()) {
        setActiveTab('tax');
        return;
      }
    } else {
      if (!validateCompanyProfile()) {
        setActiveTab('company');
        return;
      }
      if (!(await validateBankingDetails())) {
        setActiveTab('banking');
        return;
      }
      if (!validateBillingConfig()) {
        setActiveTab('billing');
        return;
      }
      if (!validateTaxConfig()) {
        setActiveTab('tax');
        return;
      }
    }

    const success = await saveSettingsToDB();
    if (success) {
      emitNotification('Company Settings Updated', 'Your business profile and settings have been successfully saved.', 'success');
      setNotification({ message: 'Settings saved successfully!', type: 'success' });
    }
  };

  const saveSettingsToDB = async (): Promise<boolean> => {
    setIsSaving(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setNotification({ message: "Authentication error: Please log in again.", type: 'error' });
        setIsSaving(false);
        return false;
      }

      // 1. Process and upload logo if base64
      let uploadedLogoUrl = logoUrl;
      if (logoUrl && logoUrl.startsWith('data:image/png;base64,')) {
        try {
          const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
          if (!sessionData.session) {
            setNotification({ message: "No active session found. Please log in again.", type: 'error' });
            setIsSaving(false);
            return false;
          }

          const blob = dataURLtoBlob(logoUrl);
          if (blob) {
            let bucketUsed = 'CompanyLogo';
            let { error: uploadError } = await supabase.storage
              .from('CompanyLogo')
              .upload(`${user.id}/logo.png`, blob, {
                cacheControl: '3600',
                upsert: true
              });
            
            if (uploadError) {
              bucketUsed = 'Logo';
              const { error: fallbackError } = await supabase.storage
                .from('Logo')
                .upload(`${user.id}/logo.png`, blob, {
                  cacheControl: '3600',
                  upsert: true
                });
              uploadError = fallbackError;
            }

            if (uploadError) {
              bucketUsed = 'Signature';
              const { error: signatureFallbackError } = await supabase.storage
                .from('Signature')
                .upload(`${user.id}/logo.png`, blob, {
                  cacheControl: '3600',
                  upsert: true
                });
              uploadError = signatureFallbackError;
            }

            if (uploadError) {
              console.error("[SETTINGS] Logo upload error:", uploadError);
              setNotification({ message: `Failed to upload logo: ${uploadError.message}`, type: 'error' });
              setIsSaving(false);
              return false;
            }

            const { data: { publicUrl } } = supabase.storage
              .from(bucketUsed)
              .getPublicUrl(`${user.id}/logo.png`);
            uploadedLogoUrl = publicUrl;
          }
        } catch (uploadErr: any) {
          console.error("[SETTINGS] Logo convert/upload exception:", uploadErr);
          setNotification({ message: `Failed to process logo: ${uploadErr.message || uploadErr}`, type: 'error' });
          setIsSaving(false);
          return false;
        }
      }

      // 2. Process and upload signature if base64
      let uploadedSignatureUrl = signature;
      if (signature && signature.startsWith('data:image/png;base64,')) {
        try {
          const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
          if (!sessionData.session) {
            setNotification({ message: "No active session found. Please log in again.", type: 'error' });
            setIsSaving(false);
            return false;
          }

          const blob = dataURLtoBlob(signature);
          if (blob) {
            const { error: uploadError } = await supabase.storage
              .from('Signature')
              .upload(`${user.id}/signature.png`, blob, {
                cacheControl: '3600',
                upsert: true
              });
            if (uploadError) {
              console.error("[SETTINGS] Signature upload error:", uploadError);
              setNotification({ message: `Failed to upload signature: ${uploadError.message}`, type: 'error' });
              setIsSaving(false);
              return false;
            }
            const { data: { publicUrl } } = supabase.storage
              .from('Signature')
              .getPublicUrl(`${user.id}/signature.png`);
            uploadedSignatureUrl = publicUrl;
          }
        } catch (uploadErr: any) {
          console.error("[SETTINGS] Signature convert/upload exception:", uploadErr);
          setNotification({ message: `Failed to process signature: ${uploadErr.message || uploadErr}`, type: 'error' });
          setIsSaving(false);
          return false;
        }
      }

      // 3. Prepare company settings data
      const selectedCountry = Country.getAllCountries().find(c => c.name === country);
      const prefix = selectedCountry?.phonecode ? `+${selectedCountry.phonecode} ` : '';
      const fullPhone = mobile.trim().startsWith('+') ? mobile.trim() : `${prefix}${mobile.trim()}`;

      const settingData: any = {
        user_id: user.id,
        business_name: name,
        owner_name: displayName,
        country,
        state,
        state_code: stateCode,
        address,
        currency_symbol: currencySymbol,
        mobile,
        email,
        gstin: taxId,
        pan: pan,
        logo_url: uploadedLogoUrl,
        signature_url: uploadedSignatureUrl,
        signature_type: signatureMode,
        bank_name: bankName,
        account_number: accountNumber,
        ifsc,
        upi_id: upiId,
        invoice_prefix: invoicePrefix,
        starting_invoice_number: startingInvoiceNumber,
        proforma_prefix: proformaPrefix,
        starting_proforma_number: startingProformaNumber,
        debit_note_prefix: debitNotePrefix,
        starting_debit_note_number: startingDebitNoteNumber,
        credit_note_prefix: creditNotePrefix,
        starting_credit_note_number: startingCreditNoteNumber,
        quote_prefix: quotePrefix,
        starting_quote_number: startingQuoteNumber,
        purchase_order_prefix: purchaseOrderPrefix,
        starting_purchase_order_number: startingPurchaseOrderNumber,
        purchases_prefix: purchasesPrefix,
        starting_purchases_number: startingPurchasesNumber,
        posted_invoice_edit: postedInvoiceEdit === 'Enabled',
        material_rate_edit: materialRateEdit === 'Enabled',
        material_categorization: materialCategorization.toLowerCase(),
        default_notes: defaultNotes,
        default_terms: defaultTerms,
        updated_at: new Date().toISOString()
      };

      if (companyCode && companyCode.trim() !== '') {
        settingData.custom_company_code = companyCode.trim();
        settingData.company_code = companyCode.trim();
      }

      // 4. Upsert company settings
      // Try with all columns first (including new doc-numbering ones).
      // If the DB doesn't have those columns yet (migration pending), fall back
      // to a stripped payload so saving still succeeds.
      let savedSetting: any = null;
      let settingError: any = null;

      ({ data: savedSetting, error: settingError } = await supabase
        .from('company_settings')
        .upsert(settingData, { onConflict: 'user_id' })
        .select('id')
        .single());

      if (settingError) {
        // PGRST204 = column not found in schema cache (migration not yet run)
        // Also catch generic empty-error edge cases
        const errMsg = settingError.message || JSON.stringify(settingError) || '';
        const isColumnError =
          settingError.code === 'PGRST204' ||
          errMsg.toLowerCase().includes('column') ||
          errMsg.toLowerCase().includes('schema cache') ||
          errMsg.toLowerCase().includes('does not exist') ||
          (errMsg === '' && Object.keys(settingError).length === 0);

        if (isColumnError) {
          console.warn("[SETTINGS] New columns not found in DB yet (PGRST204), retrying without doc-numbering fields...");
          const { proforma_prefix, starting_proforma_number, debit_note_prefix, starting_debit_note_number,
            credit_note_prefix, starting_credit_note_number, quote_prefix, starting_quote_number,
            ...fallbackData } = settingData;

          ({ data: savedSetting, error: settingError } = await supabase
            .from('company_settings')
            .upsert(fallbackData, { onConflict: 'user_id' })
            .select('id')
            .single());
        }
      }

      if (settingError) {
        console.error("[SETTINGS] Error saving company settings:", settingError);
        if (settingError.code === '23505' || (settingError.message && settingError.message.toLowerCase().includes('unique'))) {
          setNotification({ message: "This company code is already taken, please choose another.", type: 'error' });
        } else {
          setNotification({ message: `Failed to save settings: ${settingError.message}`, type: 'error' });
        }
        setIsSaving(false);
        return false;
      }

      const settingsRowId = savedSetting?.id;

      // 5. Handle tax configurations deletion
      if (deletedTaxIds.length > 0) {
        const { error: deleteTaxError } = await supabase
          .from('tax_configs')
          .delete()
          .in('id', deletedTaxIds);
        
        if (deleteTaxError) {
          console.error("[SETTINGS] Error deleting tax configs:", deleteTaxError);
        }
      }

      // 6. Handle tax configurations upsert
      if (additionalTaxes.length > 0 && settingsRowId) {
        const taxRows = additionalTaxes.map(tax => {
          const isTempId = tax.id.startsWith('tax_');
          const row: any = {
            user_id: user.id,
            company_settings_id: settingsRowId,
            tax_label: tax.name,
            tax_percentage: Number(tax.rate),
            is_default: false
          };
          if (!isTempId) {
            row.id = tax.id;
          }
          return row;
        });

        const { error: taxUpsertError } = await supabase
          .from('tax_configs')
          .upsert(taxRows);

        if (taxUpsertError) {
          console.error("[SETTINGS] Error upserting tax configs:", taxUpsertError);
        }
      }

      setSignature(uploadedSignatureUrl);
      setLogoUrl(uploadedLogoUrl);

      // Save local state for App.tsx component tree compatibility
      onSave({
        uid: user.id,
        name,
        displayName,
        ownerName: displayName,
        website,
        email,
        phone: fullPhone,
        address,
        taxId,
        pan,
        currency,
        logoUrl: uploadedLogoUrl,
        signature: uploadedSignatureUrl,
        signatureSize,
        themeAccent,
        invoiceFont,
        invoiceLayout,
        companyCode,
        state,
        stateCode,
        country,
        currencySymbol,
        mobile,
        bankName,
        accountNumber,
        ifsc,
        upiId,
        invoicePrefix,
        startingInvoiceNumber,
        proformaPrefix,
        startingProformaNumber,
        debitNotePrefix,
        startingDebitNoteNumber,
        creditNotePrefix,
        startingCreditNoteNumber,
        quotePrefix,
        startingQuoteNumber,
        purchaseOrderPrefix,
        startingPurchaseOrderNumber,
        purchasesPrefix,
        startingPurchasesNumber,
        postedInvoiceEdit,
        materialRateEdit,
        materialCategorization,
        defaultNotes,
        defaultTerms,
        taxMode,
        customTaxName,
        customTaxPercentage: Number(customTaxPercentage),
        defaultTaxRate: Number(customTaxPercentage),
        customTaxCols,
        additionalTaxes,
        updatedAt: new Date().toISOString()
      });

      return true;
    } catch (err: any) {
      console.error("[SETTINGS] Unexpected error during saving settings:", err);
      setNotification({ message: `Unexpected error: ${err.message || err}`, type: 'error' });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto">
      <div 
        id="profile-modal" 
        className="relative w-full max-w-6xl bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-[#e2e8f0] rounded-2xl sm:rounded-[2rem] overflow-hidden shadow-2xl border border-slate-200 dark:border-zinc-800 flex flex-col max-h-[95dvh] my-auto"
      >
        {/* Hidden File Picker reference */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleLogoFileChange} 
          className="hidden" 
          accept="image/*" 
        />
        {/* Hidden Signature Image Picker */}
        <input
          type="file"
          ref={signatureImageInputRef}
          onChange={handleSignatureImageUpload}
          className="hidden"
          accept="image/*"
        />

        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-950">
          <div className="flex items-center gap-2.5">
            {activeTab !== 'company' && (
              <button 
                type="button"
                onClick={() => {
                  if (activeTab === 'subscription') setActiveTab('billing');
                  else if (activeTab === 'billing') setActiveTab('banking');
                  else if (activeTab === 'banking') setActiveTab('company');
                }}
                className="w-10 h-10 rounded-2xl bg-white dark:bg-zinc-800 text-sky-600 flex items-center justify-center shadow-sm border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 transition-all cursor-pointer"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-10 h-10 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-md">
              <Building2 className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">Company Settings</h2>
              <p className="text-[11px] font-medium text-sky-600/70 dark:text-slate-400">Used as the seller details on every invoice.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-sky-600 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close settings modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form container with Sidebar */}
        <form onSubmit={handleFormSubmit} className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* LEFT SIDEBAR (Tabs) */}
          <div className="md:w-64 lg:w-72 border-b md:border-b-0 md:border-r border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955/30 flex flex-row md:flex-col p-4 md:p-6 gap-3 overflow-x-auto md:overflow-y-auto shrink-0 hide-scrollbar">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-sky-600/60 dark:text-zinc-500 mb-2 hidden md:block px-2">Settings Menu</div>
            
            <div className="relative flex flex-row md:flex-col gap-2 md:gap-3 flex-1 md:flex-none">
              {/* Vertical stepper connector line behind icons */}
              <div className="absolute left-[27px] top-6 bottom-6 w-[1.5px] bg-[#e2e8f0]/80 dark:bg-zinc-800 hidden md:block pointer-events-none" />

              <button
                type="button"
                onClick={() => handleTabChange('company')}
                className={`z-10 flex-1 md:flex-none py-2.5 px-4 rounded-xl text-left text-xs font-semibold tracking-wide transition-all duration-300 cursor-pointer flex items-center gap-3 ${getTabOpacityClass('company')} ${
                  activeTab === 'company'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-sky-600 dark:text-[#e2e8f0] hover:text-slate-800 hover:bg-slate-100/50 dark:hover:bg-zinc-850'
                }`}
              >
                {renderSidebarBadge('company', <Building2 className="w-3.5 h-3.5" />, 0)}
                <span className="hidden sm:inline">Company Profile</span>
                <span className="sm:hidden">Company</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('banking')}
                className={`z-10 flex-1 md:flex-none py-2.5 px-4 rounded-xl text-left text-xs font-semibold tracking-wide transition-all duration-300 cursor-pointer flex items-center gap-3 ${getTabOpacityClass('banking')} ${
                  activeTab === 'banking'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-sky-600 dark:text-[#e2e8f0] hover:text-slate-800 hover:bg-slate-100/50 dark:hover:bg-zinc-850'
                }`}
              >
                {renderSidebarBadge('banking', <Landmark className="w-3.5 h-3.5" />, 1)}
                <span className="hidden sm:inline">Banking Details</span>
                <span className="sm:hidden">Banking</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('billing')}
                className={`z-10 flex-1 md:flex-none py-2.5 px-4 rounded-xl text-left text-xs font-semibold tracking-wide transition-all duration-300 cursor-pointer flex items-center gap-3 ${getTabOpacityClass('billing')} ${
                  activeTab === 'billing'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-sky-600 dark:text-[#e2e8f0] hover:text-slate-800 hover:bg-slate-100/50 dark:hover:bg-zinc-850'
                }`}
              >
                {renderSidebarBadge('billing', <FileSpreadsheet className="w-3.5 h-3.5" />, 2)}
                <span className="hidden sm:inline">Billing Config</span>
                <span className="sm:hidden">Billing</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('tax')}
                className={`z-10 flex-1 md:flex-none py-2.5 px-4 rounded-xl text-left text-xs font-semibold tracking-wide transition-all duration-300 cursor-pointer flex items-center gap-3 ${getTabOpacityClass('tax')} ${
                  activeTab === 'tax'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-sky-600 dark:text-[#e2e8f0] hover:text-slate-800 hover:bg-slate-100/50 dark:hover:bg-zinc-850'
                }`}
              >
                {renderSidebarBadge('tax', <Sliders className="w-3.5 h-3.5" />, 3)}
                <span className="hidden sm:inline">Tax Config</span>
                <span className="sm:hidden">Tax</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('subscription')}
                className={`z-10 flex-1 md:flex-none py-2.5 px-4 rounded-xl text-left text-xs font-semibold tracking-wide transition-all duration-300 cursor-pointer flex items-center gap-3 ${getTabOpacityClass('subscription')} ${
                  activeTab === 'subscription'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-sky-600 dark:text-[#e2e8f0] hover:text-slate-800 hover:bg-slate-100/50 dark:hover:bg-zinc-850'
                }`}
              >
                {renderSidebarBadge('subscription', <Award className="w-3.5 h-3.5" />, 4)}
                <span className="hidden sm:inline">Subscription</span>
                <span className="sm:hidden">Sub</span>
              </button>
            </div>
          </div>

          {/* MAIN SCROLLABLE CONTENT */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            <div className="p-6 md:p-8 space-y-8 flex-1">
          {/* TAB 1: COMPANY */}
          {activeTab === 'company' && (
            <div className="space-y-6 animate-fade-in text-slate-800 dark:text-[#e2e8f0]">
              {validationError && (
                <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-2.5 shadow-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* CARD 1: COMPANY IDENTITY */}
              <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
                <div className="bg-slate-100 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-850 px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-800 dark:text-[#e2e8f0]">
                  Company Identity
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid md:grid-cols-12 gap-6 items-stretch">
                    {/* Logo upload (cols 5) */}
                    <div className="md:col-span-5 p-5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955/30 flex flex-col items-center justify-center space-y-4">
                      <div 
                        className="w-32 h-32 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 relative overflow-hidden flex items-center justify-center group cursor-pointer transition-all hover:border-sky-500"
                        onClick={() => logoUrl ? setShowLogoPreview(true) : triggerLogoUpload()}
                      >
                        {logoUrl ? (
                          <img 
                            src={logoUrl} 
                            alt="Company logo preview" 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <span className="text-[10px] font-bold text-sky-600/60 dark:text-zinc-500 uppercase tracking-widest">LOGO</span>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          {logoUrl ? (
                            <EyeIcon className="w-5 h-5 text-white" />
                          ) : (
                            <Upload className="w-5 h-5 text-white" />
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => logoUrl ? setShowLogoOptions(true) : triggerLogoUpload()}
                          className="px-4 py-2 bg-slate-100 hover:bg-[#e2e8f0] border border-slate-200 font-extrabold text-[10px] uppercase tracking-wider text-slate-800 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          {logoUrl ? 'Edit Logo' : 'Upload Logo'}
                        </button>
                        {logoUrl && (
                          <button
                            type="button"
                            onClick={() => setLogoUrl('')}
                            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900 font-extrabold text-[10px] uppercase tracking-wider text-rose-600 dark:text-rose-400 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Right side fields (cols 7) */}
                    <div className="md:col-span-7 space-y-4">
                      {/* System Company Code card */}
                      <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/30 flex items-center justify-between">
                        <div>
                          <span className="block text-[8px] font-bold text-sky-600/70 dark:text-zinc-400 uppercase tracking-widest mb-1">System Company Code</span>
                          <span className="text-xl sm:text-2xl font-extrabold font-mono text-slate-800 dark:text-[#e2e8f0] tracking-wider block">
                            {companyCode || 'C0045'}
                          </span>
                          <span className="text-[9px] text-sky-600/60 dark:text-zinc-500 block mt-0.5">Immutable code linked to all system records.</span>
                        </div>
                        <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded text-[9px] font-extrabold uppercase tracking-wider">
                          Active License
                        </span>
                      </div>

                      {/* Business Name */}
                      <div>
                        <label htmlFor="company-name" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">Business Name *</label>
                        <input 
                          id="company-name"
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Acme Corporation"
                          className={`w-full px-3 py-2.5 rounded-xl border bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none shadow-sm transition-all font-medium ${showErrors && !name.trim() ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-zinc-800 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10'}`}
                        />
                        {showErrors && !name.trim() && <p className="text-[10px] text-red-500 font-medium mt-1">Business Name is required</p>}
                      </div>

                      {/* Owner Name */}
                      <div>
                        <label htmlFor="company-display-name" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">Owner Name *</label>
                        <input 
                          id="company-display-name"
                          type="text"
                          required
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="e.g. John Doe"
                          className={`w-full px-3 py-2.5 rounded-xl border bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none shadow-sm transition-all font-medium ${showErrors && !displayName.trim() ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-zinc-800 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10'}`}
                        />
                        {showErrors && !displayName.trim() && <p className="text-[10px] text-red-500 font-medium mt-1">Owner Name is required</p>}
                      </div>

                      {/* Website URL */}
                      <div>
                        <label htmlFor="company-website" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">Website URL</label>
                        <input 
                          id="company-website"
                          type="text"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          placeholder="e.g. www.acme.com"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none shadow-sm transition-all font-medium focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 2: LOCATION DETAILS */}
              <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
                <div className="bg-slate-100 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-850 px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-800 dark:text-[#e2e8f0]">
                  Location Details
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <label htmlFor="company-country" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">Country *</label>
                      <select 
                        id="company-country"
                        required
                        value={Country.getAllCountries().find(c => c.name === country)?.isoCode || ''}
                        onChange={(e) => handleCountryChange(e.target.value)}
                        className={`w-full px-3 py-2.5 rounded-xl border bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none shadow-sm transition-all font-medium cursor-pointer ${showErrors && !country.trim() ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-zinc-800 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10'}`}
                      >
                        <option value="" disabled className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-white">Select Country</option>
                        {Country.getAllCountries().map((c) => (
                          <option key={c.isoCode} value={c.isoCode} className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-white">{c.name}</option>
                        ))}
                      </select>
                      {showErrors && !country.trim() && <p className="text-[10px] text-red-500 font-medium mt-1">Country is required</p>}
                    </div>
                    <div>
                      <label htmlFor="company-state" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">State *</label>
                      <select 
                        id="company-state"
                        value={(() => {
                          const cCode = Country.getAllCountries().find(c => c.name === country)?.isoCode;
                          if (!cCode) return '';
                          return State.getStatesOfCountry(cCode).find(s => s.name === state)?.isoCode || '';
                        })()}
                        onChange={(e) => handleStateChange(e.target.value, country)}
                        className={`w-full px-3 py-2.5 rounded-xl border bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none shadow-sm transition-all font-medium cursor-pointer ${showErrors && !state.trim() ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-zinc-800 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10'}`}
                        required
                      >
                        <option value="" disabled className="bg-white dark:bg-zinc-900 text-slate-500">Select State</option>
                        {(() => {
                          const cCode = Country.getAllCountries().find(c => c.name === country)?.isoCode;
                          if (!cCode) return null;
                          return State.getStatesOfCountry(cCode).map((st) => (
                            <option key={st.isoCode} value={st.isoCode} className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-white">{st.name}</option>
                          ));
                        })()}
                      </select>
                      {showErrors && !state.trim() && <p className="text-[10px] text-red-500 font-medium mt-1">State is required</p>}
                    </div>
                    <div>
                      <label htmlFor="company-state-code" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">State Code</label>
                      <input 
                        id="company-state-code"
                        type="text"
                        value={stateCode}
                        onChange={(e) => setStateCode(e.target.value)}
                        placeholder="07"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm focus:ring-4 focus:ring-sky-500/10 transition-all font-mono font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="company-address" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">Full Office Address</label>
                    <textarea 
                      id="company-address"
                      value={address || ''}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. 123 Business Rd, City Centre"
                      rows={2}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm focus:ring-4 focus:ring-sky-500/10 transition-all resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* CARD 3: CONTACT & COMPLIANCE */}
              <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
                <div className="bg-slate-100 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-850 px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-800 dark:text-[#e2e8f0]">
                  Contact & Compliance
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="company-mobile" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">Mobile *</label>
                      <input 
                        id="company-mobile"
                        type="text"
                        required
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value.replace(/[^\d\s+]/g, ''))}
                        placeholder="e.g. +1 555-0199"
                        className={`w-full px-3 py-2.5 rounded-xl border bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none shadow-sm transition-all font-medium ${showErrors && !mobile.trim() ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-zinc-800 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10'}`}
                      />
                      {showErrors && !mobile.trim() && <p className="text-[10px] text-red-500 font-medium mt-1">Mobile Number is required</p>}
                    </div>
                    <div>
                      <label htmlFor="company-email" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">Email *</label>
                      <input 
                        id="company-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. contact@acme.com"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm focus:ring-4 focus:ring-sky-500/10 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <label htmlFor="company-currency-symbol" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">Currency Symbol</label>
                      <input 
                        id="company-currency-symbol"
                        type="text"
                        value={currencySymbol}
                        onChange={(e) => setCurrencySymbol(e.target.value)}
                        placeholder="e.g. ₹"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm focus:ring-4 focus:ring-sky-500/10 transition-all font-medium"
                      />
                    </div>
                    <div>
                      <label htmlFor="company-gstin" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">GSTIN / Tax ID</label>
                      <input 
                        id="company-gstin"
                        type="text"
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                        placeholder="e.g. GSTIN99238"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm focus:ring-4 focus:ring-sky-500/10 transition-all font-mono"
                      />
                    </div>
                    <div>
                      <label htmlFor="company-pan" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">PAN Number</label>
                      <input 
                        id="company-pan"
                        type="text"
                        value={pan}
                        onChange={(e) => setPan(e.target.value)}
                        placeholder="e.g. ABCDE1234F"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm focus:ring-4 focus:ring-sky-500/10 transition-all font-mono uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 4: CLIENT SIGNATURE PAD */}
              <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
                <div className="bg-slate-100 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-850 px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-800 dark:text-[#e2e8f0]">
                  Client Signature Pad
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400">Signature Configuration</label>
                      
                      {/* Signature Mode Switcher */}
                      <div className="flex bg-slate-50 dark:bg-zinc-900 p-0.5 rounded-lg border border-slate-200 dark:border-zinc-800">
                        <button
                          type="button"
                          onClick={() => setSignatureMode('draw')}
                          className={`px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md transition-all cursor-pointer ${signatureMode === 'draw' ? 'bg-sky-600 text-white shadow-sm' : 'text-sky-600/70 hover:text-slate-800 dark:hover:text-zinc-300'}`}
                        >
                          Draw
                        </button>
                        <button
                          type="button"
                          onClick={() => setSignatureMode('type')}
                          className={`px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md transition-all cursor-pointer ${signatureMode === 'type' ? 'bg-sky-600 text-white shadow-sm' : 'text-sky-600/70 hover:text-slate-800 dark:hover:text-zinc-300'}`}
                        >
                          Type
                        </button>
                        <button
                          type="button"
                          onClick={() => signatureImageInputRef.current?.click()}
                          className={`px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md transition-all flex items-center gap-1 cursor-pointer ${signatureMode === 'upload' ? 'bg-sky-600 text-white shadow-sm' : 'text-sky-600/70 hover:text-slate-800 dark:hover:text-zinc-300'}`}
                        >
                          <Upload className="w-3 h-3" />
                          Upload
                        </button>
                      </div>
                    </div>

                    {signatureMode === 'type' && (
                      <div className="mb-4 flex gap-3">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={signatureText}
                            onChange={(e) => setSignatureText(e.target.value)}
                            placeholder="Type your signature here..."
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 transition-all font-medium"
                          />
                        </div>
                        <div className="w-48">
                          <select
                            value={signatureFont}
                            onChange={(e) => setSignatureFont(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 transition-all font-medium cursor-pointer"
                            style={{ fontFamily: signatureFont }}
                          >
                            <option value="Caveat" style={{ fontFamily: 'Caveat' }}>Caveat</option>
                            <option value="Sacramento" style={{ fontFamily: 'Sacramento' }}>Sacramento</option>
                            <option value="Dancing Script" style={{ fontFamily: 'Dancing Script' }}>Dancing Script</option>
                            <option value="Great Vibes" style={{ fontFamily: 'Great Vibes' }}>Great Vibes</option>
                            <option value="Alex Brush" style={{ fontFamily: 'Alex Brush' }}>Alex Brush</option>
                            <option value="Parisienne" style={{ fontFamily: 'Parisienne' }}>Parisienne</option>
                            <option value="Yellowtail" style={{ fontFamily: 'Yellowtail' }}>Yellowtail</option>
                            <option value="Mrs Saint Delafield" style={{ fontFamily: 'Mrs Saint Delafield' }}>Mrs Saint Delafield</option>
                            <option value="Reenie Beanie" style={{ fontFamily: 'Reenie Beanie' }}>Reenie Beanie</option>
                            <option value="Herr Von Muellerhoff" style={{ fontFamily: 'Herr Von Muellerhoff' }}>Herr Von Muellerhoff</option>
                            <option value="Monsieur La Doulaise" style={{ fontFamily: 'Monsieur La Doulaise' }}>Monsieur La Doulaise</option>
                            <option value="Pinyon Script" style={{ fontFamily: 'Pinyon Script' }}>Pinyon Script</option>
                            <option value="Zeyada" style={{ fontFamily: 'Zeyada' }}>Zeyada</option>
                            <option value="Mr De Haviland" style={{ fontFamily: 'Mr De Haviland' }}>Mr De Haviland</option>
                            <option value="La Belle Aurore" style={{ fontFamily: 'La Belle Aurore' }}>La Belle Aurore</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {signatureMode === 'upload' && (
                      <div className="mb-3 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-semibold flex items-start gap-1.5">
                        <span className="text-amber-500 mt-0.5 shrink-0">⚠️</span>
                        <span>Upload a signature photo taken on a <strong>plain white or light background</strong>. The system will automatically extract your signature.</span>
                      </div>
                    )}

                    <div className="relative rounded-2xl overflow-hidden border-2 border-dashed border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex flex-col my-4">
                      {signatureMode === 'draw' ? (
                        <canvas 
                          ref={canvasRef}
                          width={800}
                          height={256}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                          className="w-full h-auto bg-transparent cursor-crosshair touch-none"
                        />
                      ) : (
                        <div className="w-full h-32 bg-transparent flex items-center justify-center p-4">
                          {signature ? (
                            <img 
                              src={signature} 
                              alt="Signature Preview" 
                              className="max-w-full max-h-full object-contain" 
                            />
                          ) : (
                            <span className="text-sky-600/60 text-xs font-semibold uppercase tracking-wider">No signature entered yet</span>
                          )}
                          {/* Mount canvas hidden so text/upload crop drawing works in background */}
                           <canvas 
                             ref={canvasRef}
                             width={800}
                             height={256}
                             style={{ position: 'absolute', left: '-9999px', top: '-9999px', visibility: 'hidden' }}
                           />
                        </div>
                      )}
                      
                      {signature && (
                        <button 
                          type="button" 
                          onClick={clearSignature}
                          className="absolute top-2 right-2 p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg transition-colors cursor-pointer shadow-sm border border-rose-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      
                      <div className="absolute bottom-2 left-3 flex items-center gap-1.5 pointer-events-none text-sky-600/50 dark:text-zinc-500 text-[8px] font-bold uppercase tracking-wider">
                        <span>{signatureMode === 'draw' ? 'Draw your signature above.' : signatureMode === 'type' ? 'Your typed signature preview.' : 'Extracted signature preview.'}</span>
                      </div>
                    </div>

                    {/* Signature Size Adjuster */}
                    <div className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400">Signature Display Size</span>
                        <span className="text-xs font-extrabold text-sky-600 bg-white dark:bg-zinc-950 px-2.5 py-1 rounded-md border border-slate-200">
                          Size: {Math.max(1, Math.min(10, Math.round((signatureSize - 60) / 10) + 1))}
                        </span>
                      </div>
                      
                      {/* Range input */}
                      <div className="space-y-2.5">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="1"
                          value={Math.max(1, Math.min(10, Math.round((signatureSize - 60) / 10) + 1))}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setSignatureSize(60 + (val - 1) * 10);
                          }}
                          className="w-full h-1.5 bg-[#e2e8f0] dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-sky-600 focus:outline-none"
                        />
                        <div className="flex justify-between text-[8px] font-extrabold text-sky-600/60 uppercase tracking-widest">
                          <span>1 (Small)</span>
                          <span>5 (Medium)</span>
                          <span>10 (Large)</span>
                        </div>
                      </div>

                      {/* Preset Buttons */}
                      <div className="flex gap-2 mt-4">
                        {[
                          { label: 'Small', value: 60 },
                          { label: 'Medium', value: 100 },
                          { label: 'Large', value: 150 },
                        ].map((preset) => (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => setSignatureSize(preset.value)}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all border cursor-pointer ${signatureSize === preset.value ? 'bg-sky-600 text-white border-sky-600 shadow-sm' : 'bg-white dark:bg-zinc-950 text-sky-600 border-slate-200 dark:border-zinc-800 hover:bg-slate-50'}`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BANKING */}
          {activeTab === 'banking' && (
            <div className="space-y-6 animate-fade-in text-slate-800 dark:text-[#e2e8f0]">
              {/* White background main Card with brown border */}
              <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
                <div className="bg-slate-100 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-850 px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-800 dark:text-[#e2e8f0]">
                  Primary Bank Account
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="bank-name" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">Bank Name</label>
                      <input 
                        id="bank-name"
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g. HDFC Bank"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-200 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-medium"
                      />
                    </div>
                    <div>
                      <label htmlFor="bank-account" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5 flex justify-between items-center">
                        <span>Account Number</span>
                        {accountVerified && <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase flex items-center gap-0.5"><ShieldCheck className="w-3 h-3" /> Verified</span>}
                      </label>
                      <div className="relative">
                        <input 
                          id="bank-account"
                          type="text"
                          value={accountNumber}
                          onChange={(e) => {
                            setAccountNumber(e.target.value);
                            setAccountVerified(null);
                            setAccountError('');
                          }}
                          onBlur={() => handleVerifyAccount()}
                          placeholder="e.g. 50100234567890"
                          className={`w-full px-3 py-2.5 rounded-xl border bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none shadow-sm focus:ring-4 transition-all duration-300 font-mono font-medium ${
                            accountVerified === true ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/10' :
                            accountVerified === false ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10' :
                            'border-slate-200 dark:border-zinc-800 focus:border-sky-500 focus:ring-sky-500/10'
                          }`}
                        />
                        {accountChecking && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                      {accountError && <p className="text-[10px] text-rose-500 font-medium mt-1">{accountError}</p>}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="bank-ifsc" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5 flex justify-between items-center">
                        <span>IFSC Code</span>
                        {ifscVerified && <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase flex items-center gap-0.5"><ShieldCheck className="w-3 h-3" /> Verified</span>}
                      </label>
                      <div className="relative">
                        <input 
                          id="bank-ifsc"
                          type="text"
                          value={ifsc}
                          onChange={(e) => {
                            setIfsc(e.target.value);
                            setIfscVerified(null);
                            setIfscError('');
                          }}
                          onBlur={() => handleVerifyIFSC()}
                          placeholder="e.g. HDFC0001234"
                          className={`w-full px-3 py-2.5 rounded-xl border bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none shadow-sm focus:ring-4 transition-all duration-300 font-mono uppercase font-medium ${
                            ifscVerified === true ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/10' :
                            ifscVerified === false ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10' :
                            'border-slate-200 dark:border-zinc-800 focus:border-sky-500 focus:ring-sky-500/10'
                          }`}
                        />
                        {ifscChecking && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                      {ifscError && <p className="text-[10px] text-rose-500 font-medium mt-1">{ifscError}</p>}
                    </div>
                    <div>
                      <label htmlFor="bank-upi" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5 flex justify-between items-center">
                        <span>UPI ID</span>
                        {upiVerified && <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase flex items-center gap-0.5"><ShieldCheck className="w-3 h-3" /> Verified</span>}
                      </label>
                      <div className="relative">
                        <input 
                          id="bank-upi"
                          type="text"
                          value={upiId}
                          onChange={(e) => {
                            setUpiId(e.target.value);
                            setUpiVerified(null);
                            setUpiError('');
                          }}
                          onBlur={() => handleVerifyUPI()}
                          placeholder="e.g. upi@okaxis"
                          className={`w-full px-3 py-2.5 rounded-xl border bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none shadow-sm focus:ring-4 transition-all duration-300 font-medium ${
                            upiVerified === true ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/10' :
                            upiVerified === false ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10' :
                            'border-slate-200 dark:border-zinc-800 focus:border-sky-500 focus:ring-sky-500/10'
                          }`}
                        />
                        {upiChecking && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                      {upiError && <p className="text-[10px] text-rose-500 font-medium mt-1">{upiError}</p>}
                    </div>
                  </div>

                  <div className="border-t border-slate-200 dark:border-zinc-800 pt-6 flex items-center justify-start">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-sky-900/20 cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      {isSaving ? 'Saving...' : 'Save Bank Details'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Three Beige Info Cards */}
              <div className="grid md:grid-cols-3 gap-5">
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-100/40 dark:bg-zinc-900/40 text-slate-800 dark:text-[#e2e8f0] space-y-2 flex flex-col justify-start">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-sky-600" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Secure Storage</span>
                  </div>
                  <p className="text-[10px] text-sky-600/80 dark:text-slate-400 leading-normal">
                    Your banking data is encrypted and stored according to industry standards.
                  </p>
                </div>
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-100/40 dark:bg-zinc-900/40 text-slate-800 dark:text-[#e2e8f0] space-y-2 flex flex-col justify-start">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-sky-600" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Automated Payouts</span>
                  </div>
                  <p className="text-[10px] text-sky-600/80 dark:text-slate-400 leading-normal">
                    Ensure accuracy to prevent delays in processing your invoice settlements.
                  </p>
                </div>
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-100/40 dark:bg-zinc-900/40 text-slate-800 dark:text-[#e2e8f0] space-y-2 flex flex-col justify-start">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-sky-600" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Verification</span>
                  </div>
                  <p className="text-[10px] text-sky-600/80 dark:text-slate-400 leading-normal">
                    Changes to banking details may require a one-time verification step.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BILLING / CUSTOMIZATION */}
          {activeTab === 'billing' && (
            <div className="space-y-6 animate-fade-in text-slate-800 dark:text-[#e2e8f0]">
              
              {/* Card 1: Invoice Numbering */}
              <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
                <div className="bg-slate-100 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-850 px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-800 dark:text-[#e2e8f0]">
                  Invoice Numbering
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="billing-prefix" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">Invoice Prefix</label>
                      <input 
                        id="billing-prefix"
                        type="text"
                        value={invoicePrefix}
                        onChange={(e) => setInvoicePrefix(e.target.value)}
                        placeholder="e.g. INV"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-200 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-medium uppercase"
                      />
                    </div>
                    <div>
                      <label htmlFor="billing-start-num" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">Starting Invoice Number</label>
                      <input 
                        id="billing-start-num"
                        type="number"
                        value={startingInvoiceNumber}
                        onChange={(e) => setStartingInvoiceNumber(e.target.value)}
                        placeholder="1"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-200 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 1b: Document Numbering */}
              <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
                <div className="bg-slate-100 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-850 px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-800 dark:text-[#e2e8f0]">
                  Document Numbering
                </div>
                <div className="p-6 space-y-6">
                  <p className="text-[10px] text-slate-500 dark:text-zinc-500 -mt-2">Set the prefix and starting number for each document type. These will be used when creating new documents.</p>

                  {/* Proforma Invoice */}
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-500 inline-block"></span>
                      Proforma Invoice
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="proforma-prefix" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">Prefix</label>
                        <input
                          id="proforma-prefix"
                          type="text"
                          value={proformaPrefix}
                          onChange={(e) => setProformaPrefix(e.target.value)}
                          placeholder="e.g. PRO"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-200 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-medium uppercase"
                        />
                      </div>
                      <div>
                        <label htmlFor="proforma-start-num" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">Starting Number</label>
                        <input
                          id="proforma-start-num"
                          type="number"
                          value={startingProformaNumber}
                          onChange={(e) => setStartingProformaNumber(e.target.value)}
                          placeholder="1"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-200 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Debit Note */}
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                      Debit Note
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="debit-note-prefix" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">Prefix</label>
                        <input
                          id="debit-note-prefix"
                          type="text"
                          value={debitNotePrefix}
                          onChange={(e) => setDebitNotePrefix(e.target.value)}
                          placeholder="e.g. DN"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-200 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-medium uppercase"
                        />
                      </div>
                      <div>
                        <label htmlFor="debit-note-start-num" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">Starting Number</label>
                        <input
                          id="debit-note-start-num"
                          type="number"
                          value={startingDebitNoteNumber}
                          onChange={(e) => setStartingDebitNoteNumber(e.target.value)}
                          placeholder="1"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-200 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Credit Note */}
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-500 inline-block"></span>
                      Credit Note
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="credit-note-prefix" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">Prefix</label>
                        <input
                          id="credit-note-prefix"
                          type="text"
                          value={creditNotePrefix}
                          onChange={(e) => setCreditNotePrefix(e.target.value)}
                          placeholder="e.g. CN"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-200 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-medium uppercase"
                        />
                      </div>
                      <div>
                        <label htmlFor="credit-note-start-num" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">Starting Number</label>
                        <input
                          id="credit-note-start-num"
                          type="number"
                          value={startingCreditNoteNumber}
                          onChange={(e) => setStartingCreditNoteNumber(e.target.value)}
                          placeholder="1"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-200 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quote / Estimate */}
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-teal-500 inline-block"></span>
                      Quote / Estimate
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="quote-prefix" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">Prefix</label>
                        <input
                          id="quote-prefix"
                          type="text"
                          value={quotePrefix}
                          onChange={(e) => setQuotePrefix(e.target.value)}
                          placeholder="e.g. EST"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-200 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-medium uppercase"
                        />
                      </div>
                      <div>
                        <label htmlFor="quote-start-num" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">Starting Number</label>
                        <input
                          id="quote-start-num"
                          type="number"
                          value={startingQuoteNumber}
                          onChange={(e) => setStartingQuoteNumber(e.target.value)}
                          placeholder="1"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-200 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Purchases / Purchase Bill */}
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                      Purchases / Purchase Bill
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="purchases-prefix" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">Prefix</label>
                        <input
                          id="purchases-prefix"
                          type="text"
                          value={purchasesPrefix}
                          onChange={(e) => setPurchasesPrefix(e.target.value)}
                          placeholder="e.g. PUR"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-200 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-medium uppercase"
                        />
                      </div>
                      <div>
                        <label htmlFor="purchases-start-num" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">Starting Number</label>
                        <input
                          id="purchases-start-num"
                          type="number"
                          value={startingPurchasesNumber}
                          onChange={(e) => setStartingPurchasesNumber(e.target.value)}
                          placeholder="1"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-200 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Purchase Order */}
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                      Purchase Order
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="po-prefix" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">Prefix</label>
                        <input
                          id="po-prefix"
                          type="text"
                          value={purchaseOrderPrefix}
                          onChange={(e) => setPurchaseOrderPrefix(e.target.value)}
                          placeholder="e.g. PO"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-200 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-medium uppercase"
                        />
                      </div>
                      <div>
                        <label htmlFor="po-start-num" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">Starting Number</label>
                        <input
                          id="po-start-num"
                          type="number"
                          value={startingPurchaseOrderNumber}
                          onChange={(e) => setStartingPurchaseOrderNumber(e.target.value)}
                          placeholder="1"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-200 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-medium"
                        />
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Card 2: Permissions & Features */}
              <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
                <div className="bg-slate-100 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-850 px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-800 dark:text-[#e2e8f0]">
                  Permissions & Features
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="billing-posted-edit" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">Posted Invoice Edit</label>
                      <select 
                        id="billing-posted-edit"
                        value={postedInvoiceEdit}
                        onChange={(e) => setPostedInvoiceEdit(e.target.value as any)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-200 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-medium cursor-pointer"
                      >
                        <option value="Enabled" className="bg-white dark:bg-zinc-900 text-slate-805 dark:text-white">Enabled</option>
                        <option value="Disabled" className="bg-white dark:bg-zinc-900 text-slate-805 dark:text-white">Disabled</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="billing-rate-edit" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">Material Rate Edit</label>
                      <select 
                        id="billing-rate-edit"
                        value={materialRateEdit}
                        onChange={(e) => setMaterialRateEdit(e.target.value as any)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-200 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-medium cursor-pointer"
                      >
                        <option value="Enabled" className="bg-white dark:bg-zinc-900 text-slate-805 dark:text-white">Enabled</option>
                        <option value="Disabled" className="bg-white dark:bg-zinc-900 text-slate-805 dark:text-white">Disabled</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="billing-categ-edit" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">Material Categorization</label>
                      <select 
                        id="billing-categ-edit"
                        value={materialCategorization}
                        onChange={(e) => setMaterialCategorization(e.target.value as any)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-200 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-medium cursor-pointer"
                      >
                        <option value="Optional" className="bg-white dark:bg-zinc-900 text-slate-805 dark:text-white">Optional</option>
                        <option value="Required" className="bg-white dark:bg-zinc-900 text-slate-805 dark:text-white">Required</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Default Text & Terms */}
              <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
                <div className="bg-slate-100 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-850 px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-800 dark:text-[#e2e8f0]">
                  Default Text & Terms
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <label htmlFor="billing-notes" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">Default Notes</label>
                    <textarea 
                      id="billing-notes"
                      value={defaultNotes || ''}
                      onChange={(e) => setDefaultNotes(e.target.value)}
                      placeholder="Thank you for your business."
                      rows={2}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-200 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 resize-none font-medium"
                    />
                  </div>

                  <div>
                    <label htmlFor="billing-terms" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">Default Terms & Conditions</label>
                    <textarea 
                      id="billing-terms"
                      value={defaultTerms || ''}
                      onChange={(e) => setDefaultTerms(e.target.value)}
                      placeholder="Goods once sold will not be taken back or exchanged."
                      rows={2}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-200 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 resize-none font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Lower Section (Configure Smarter & Need Assistance) */}
              <div className="grid md:grid-cols-12 gap-5 pt-2">
                <div className="md:col-span-8 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-100/40 dark:bg-zinc-900/40 text-slate-800 dark:text-[#e2e8f0] relative overflow-hidden flex flex-col justify-center min-h-[120px]">
                  <h4 className="text-sm font-extrabold text-sky-600 dark:text-white mb-2">Configure Smarter</h4>
                  <p className="text-[10px] text-sky-600/90 dark:text-slate-400 max-w-[80%] leading-relaxed">
                    Changes made here will be reflected globally on all new generated invoices. Maintain consistency across your brand identity.
                  </p>
                  <FileSpreadsheet className="absolute -bottom-4 -right-4 w-28 h-28 text-sky-600/10 dark:text-white/5 pointer-events-none rotate-12" />
                </div>

                <div className="md:col-span-4 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-[#e2e8f0] flex flex-col justify-between min-h-[120px] shadow-sm">
                  <div className="flex items-start gap-2.5">
                    <HelpCircle className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-white mb-1.5">Need Assistance?</h4>
                      <p className="text-[10px] text-sky-600/80 dark:text-slate-400 leading-normal">
                        Review our Billing Documentation for detailed configuration guides.
                      </p>
                    </div>
                  </div>
                  <a href="#" className="text-[10px] font-extrabold text-sky-600 hover:text-slate-800 flex items-center gap-1 mt-3 transition-colors uppercase tracking-wider">
                    Learn More &rarr;
                  </a>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: SUBSCRIPTION */}
          {activeTab === 'subscription' && (
            <div className="space-y-6 animate-fade-in text-slate-800 dark:text-[#e2e8f0]">
              <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
                <div className="bg-slate-100 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-850 px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-800 dark:text-[#e2e8f0]">
                  Subscription Details
                </div>
                <div className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="p-1 px-3 bg-slate-100 dark:bg-zinc-800 text-sky-600 dark:text-[#e2e8f0] border border-slate-200 dark:border-zinc-700 rounded-full text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Premium Service Stack Enabled
                      </div>
                      <span className="text-xs text-sky-600 dark:text-zinc-400 font-mono font-extrabold uppercase tracking-wider">{subStatus}</span>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white">{subPlanName}</h3>
                      <p className="text-xs text-sky-600/80 dark:text-slate-400">The corporate grade cloud syncing environment. Bound strictly in military local encryptions.</p>
                    </div>

                    <div className="border-t border-slate-200 dark:border-zinc-850 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="block text-[9px] font-extrabold text-sky-600/60 dark:text-slate-500 uppercase tracking-widest">Active Plan Type</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-white">{subPlanType}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-extrabold text-sky-600/60 dark:text-slate-500 uppercase tracking-widest">Authorized Token Node</span>
                        <span className="text-sm font-medium text-sky-600 dark:text-zinc-400 font-mono tracking-wide">{subAuthorizedToken || companyCode || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-extrabold text-sky-600/60 dark:text-slate-500 uppercase tracking-widest">Expires / Renews</span>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          {subExpiresAt}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-extrabold text-sky-600/60 dark:text-slate-500 uppercase tracking-widest">Local Node Syncing State</span>
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                          Authenticated
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-zinc-955/30 rounded-2xl border border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Multi-User Collaboration & Audit System</h4>
                  <p className="text-[10px] text-sky-600/80 dark:text-slate-400">Authorize secure cryptographic access keys to branch office ledgers instantly.</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setNotification({ message: 'Branch key sharing token successfully synchronized locally! Check console ledger key.', type: 'info', title: 'Branch Key Request' })}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-[10px] uppercase font-extrabold tracking-widest rounded-xl transition-all cursor-pointer flex items-center gap-1.5 self-stretch sm:self-auto justify-center"
                >
                  <KeyRound className="w-3.5 h-3.5 text-white" />
                  Request Key
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: TAX CONFIG */}
          {activeTab === 'tax' && (
            <div className="space-y-6 animate-fade-in text-slate-800 dark:text-[#e2e8f0]">
              <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
                <div className="bg-slate-100 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-850 px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-800 dark:text-[#e2e8f0]">
                  Tax Configuration
                </div>
                <div className="p-6 space-y-6">
                  
                  {/* Country Detection */}
                  <div className="p-4 bg-slate-50 dark:bg-zinc-955/30 rounded-2xl border border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] font-extrabold text-sky-600/60 dark:text-zinc-500 uppercase tracking-widest leading-none mb-1">Company Operating Country</span>
                      <span className="text-sm font-extrabold text-slate-800 dark:text-white">{country || 'Not Selected (Please select in Profile tab)'}</span>
                    </div>
                    <span className="text-xl">
                      {country && country.toLowerCase() === 'india' ? '🇮🇳' : '🌐'}
                    </span>
                  </div>

                  {country && country.toLowerCase() === 'india' ? (
                    // INDIA GST TAX ENGINE CONFIG
                    <div className="space-y-5">
                      <div className="p-4 bg-slate-100/40 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 rounded-2xl space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sky-600 font-bold">ℹ️</span>
                          <span className="text-[10px] font-extrabold text-sky-600 uppercase tracking-wider">GST Tax Split Mechanism Active</span>
                        </div>
                        <p className="text-[10px] text-sky-600/90 dark:text-slate-300 leading-relaxed font-medium">
                          For invoices generated within India, taxes are dynamically split based on the state comparison:
                          <br />• <strong>Intrastate (Same State)</strong>: The configured tax will split 50/50 into <strong>CGST</strong> and <strong>SGST</strong>.
                          <br />• <strong>Interstate (Different State)</strong>: The full tax rate is applied as <strong>IGST</strong>.
                        </p>
                      </div>
                      <div className="max-w-md">
                        <label htmlFor="tax-rate-india" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">
                          Default GST Rate (%)
                        </label>
                        <select
                          id="tax-rate-india"
                          value={customTaxPercentage}
                          onChange={(e) => {
                            const rateVal = parseFloat(e.target.value);
                            setCustomTaxPercentage(rateVal);
                            setDefaultTaxRate(rateVal);
                          }}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm font-medium"
                        >
                          <option value={0}>0% (Nil/Exempt): Unprocessed food, healthcare or education services</option>
                          <option value={5}>5% (Merit Rate): Packaged food, daily essentials</option>
                          <option value={18}>18% (Standard Rate): Services, logistics, and hospitality</option>
                          <option value={40}>40% (Luxury/Sin Goods): Luxury items</option>
                          {![0, 5, 18, 40].includes(customTaxPercentage) && (
                            <option value={customTaxPercentage}>{customTaxPercentage}% (Custom)</option>
                          )}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4 max-w-md pt-2 border-t border-slate-200 dark:border-zinc-800">
                        <div className="p-3 bg-slate-50 dark:bg-zinc-955/30 border border-slate-200 dark:border-zinc-800 rounded-xl">
                          <span className="block text-[9px] uppercase font-bold text-sky-600/60 dark:text-zinc-500">CGST + SGST Split</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-white">{(customTaxPercentage / 2).toFixed(1)}% + {(customTaxPercentage / 2).toFixed(1)}%</span>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-zinc-955/30 border border-slate-200 dark:border-zinc-800 rounded-xl">
                          <span className="block text-[9px] uppercase font-bold text-sky-600/60 dark:text-zinc-500">IGST Rate</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-white">{customTaxPercentage}%</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // GENERIC COUNTRIES CUSTOM TAX ENGINE CONFIG
                    <div className="space-y-5 animate-fade-in">
                      <div className="space-y-4">
                        <div className="grid sm:grid-cols-12 gap-4 items-end">
                          <div className="sm:col-span-6">
                            <label htmlFor="custom-tax-name" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">
                              Custom Tax Label / Name
                            </label>
                            <input
                              id="custom-tax-name"
                              type="text"
                              value={customTaxName}
                              onChange={(e) => {
                                setCustomTaxName(e.target.value);
                                setCustomTaxCols([e.target.value]);
                              }}
                              placeholder="e.g. VAT, Sales Tax, GST"
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-200 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-medium"
                            />
                          </div>

                          <div className="sm:col-span-5">
                            <label htmlFor="custom-tax-rate" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">
                              Tax Percentage Rate (%)
                            </label>
                            <input
                              id="custom-tax-rate"
                              type="number"
                              min={0}
                              max={100}
                              step="0.01"
                              value={customTaxPercentage}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setCustomTaxPercentage(val);
                                setDefaultTaxRate(val);
                              }}
                              placeholder="0"
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-200 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-mono font-medium"
                            />
                          </div>
                          
                          <div className="sm:col-span-1 h-10 flex items-center justify-center">
                            {/* Spacing alignment */}
                          </div>
                        </div>

                        {/* List of Additional Taxes */}
                        {additionalTaxes.map((tax, index) => (
                          <div key={tax.id} className="grid sm:grid-cols-12 gap-4 items-end animate-fade-in">
                            <div className="sm:col-span-6">
                              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">
                                Additional Tax {index + 1} Name
                              </label>
                              <input
                                type="text"
                                value={tax.name}
                                onChange={(e) => {
                                  setAdditionalTaxes(additionalTaxes.map((t) => t.id === tax.id ? { ...t, name: e.target.value } : t));
                                }}
                                placeholder="e.g. Local Cess, Service Levy"
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-200 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-medium"
                              />
                            </div>

                            <div className="sm:col-span-5">
                              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-400 mb-1.5">
                                Tax Percentage Rate (%)
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step="0.01"
                                value={tax.rate}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setAdditionalTaxes(additionalTaxes.map((t) => t.id === tax.id ? { ...t, rate: val } : t));
                                }}
                                placeholder="0"
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-200 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-mono font-medium"
                              />
                            </div>

                            <div className="sm:col-span-1 h-[42px] flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!tax.id.startsWith('tax_')) {
                                    setDeletedTaxIds([...deletedTaxIds, tax.id]);
                                  }
                                  setAdditionalTaxes(additionalTaxes.filter((t) => t.id !== tax.id));
                                }}
                                className="w-9 h-9 bg-rose-50 hover:bg-rose-100 dark:bg-rose-955/20 dark:hover:bg-rose-955/40 text-rose-600 dark:text-rose-400 border border-transparent dark:border-rose-900/35 rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-95"
                                title="Remove Tax"
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Plus button to add more taxes */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setAdditionalTaxes([...additionalTaxes, { id: `tax_${Date.now()}`, name: '', rate: 0 }]);
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-zinc-950 text-sky-600 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
                          >
                            <Plus className="w-4 h-4 text-sky-600" />
                            <span>Add Another Tax</span>
                          </button>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-100/40 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 rounded-2xl">
                        <p className="text-[10px] text-sky-600/90 dark:text-emerald-305 leading-relaxed font-medium">
                          Custom tax profile is active. On newly created bills, item pricing will automatically pre-fill with <strong>{customTaxName || 'Tax'}</strong> at <strong>{customTaxPercentage}%</strong>.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

            </div> {/* End of scrollable padding area */}

            {/* Bottom Dialog controls */}
            <div className="border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-white dark:bg-slate-900 p-5 md:px-8 mt-auto shrink-0 z-10 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
            {!isOnboarding ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider text-sky-600 hover:text-slate-800 transition-all cursor-pointer hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-sky-900/20 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4.5 h-4.5" />
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
              </>
            ) : (
              <>
                {activeTab === 'company' && (
                  <button
                    type="button"
                    onClick={() => handleTabChange('banking')}
                    className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-sky-900/20 cursor-pointer"
                  >
                    <span>Next: Banking Details</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                {activeTab === 'banking' && (
                  <button
                    type="button"
                    onClick={() => handleTabChange('billing')}
                    className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-sky-900/20 cursor-pointer"
                  >
                    <span>Next: Billing Config</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                {activeTab === 'billing' && (
                  <button
                    type="button"
                    onClick={() => handleTabChange('tax')}
                    className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-sky-900/20 cursor-pointer"
                  >
                    <span>Next: Tax Config</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                {activeTab === 'tax' && (
                  <button
                    type="button"
                    onClick={() => handleTabChange('subscription')}
                    className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-sky-900/20 cursor-pointer"
                  >
                    <span>Next: Subscription Details</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                {activeTab === 'subscription' && (
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-sky-900/20 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4.5 h-4.5" />
                    <span>{isSaving ? 'Saving...' : 'Save & Finish Onboarding'}</span>
                  </button>
                )}
              </>
            )}
            </div>
          </div>
        </form>
      </div>
      {/* Logo Cropping and Adjustment Modal */}
      {logoToCrop && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-[999] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-100 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-scale-up">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-850 dark:text-white">Adjust & Crop Logo</h3>
              <button
                type="button"
                onClick={() => setLogoToCrop(null)}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-605 dark:hover:text-white cursor-pointer transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Canvas Body */}
            <div className="p-6 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-955/50">
              <canvas
                ref={cropCanvasRef}
                width={300}
                height={220}
                onMouseDown={handleLogoPanStart}
                onMouseMove={handleLogoPanMove}
                onMouseUp={handleLogoPanEnd}
                onMouseLeave={handleLogoPanEnd}
                onTouchStart={handleLogoPanStart}
                onTouchMove={handleLogoPanMove}
                onTouchEnd={handleLogoPanEnd}
                className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-[#090d16] cursor-move shadow-inner"
              />
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-medium">Drag on the box above to pan/reposition the logo.</p>
            </div>

            {/* Controls */}
             <div className="p-5 space-y-4">
               {/* Zoom Slider */}
               <div className="space-y-1.5">
                 <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                   <span>Zoom / Scale</span>
                   <span className="font-mono text-slate-700 dark:text-slate-350">{Math.round(cropZoom * 100)}%</span>
                 </div>
                 <input
                   type="range"
                   min="0.1"
                   max="3.0"
                   step="0.05"
                   value={cropZoom}
                   onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                   className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-600"
                 />
               </div>
 
               {/* Ratio Selection */}
               <div className="space-y-1.5">
                 <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Display Ratio Aspect</span>
                 <div className="grid grid-cols-3 gap-2">
                   {(['1:1', '3:1', 'free'] as const).map((r) => (
                     <button
                       key={r}
                       type="button"
                       onClick={() => setCropRatio(r)}
                       className={`py-2 text-[10px] font-bold uppercase rounded-lg border transition-all cursor-pointer ${cropRatio === r ? 'bg-sky-600 border-sky-600 text-white shadow-sm' : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 bg-white dark:bg-slate-900'}`}
                     >
                       {r === '1:1' ? 'Square' : r === '3:1' ? 'Landscape' : 'Original'}
                     </button>
                   ))}
                 </div>
               </div>
             </div>

            {/* Footer Buttons */}
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50/50 dark:bg-slate-955/20">
              <button
                type="button"
                onClick={() => setLogoToCrop(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyLogoCrop}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-[320px] rounded-2xl border border-slate-200 bg-slate-50 dark:bg-zinc-900 p-6 shadow-xl animate-scale-in text-center flex flex-col items-center">
            <div className="mb-4">
              {notification.type === 'success' ? (
                <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-500 border border-emerald-200 dark:border-emerald-800">
                  <Check className="w-6 h-6 stroke-[2]" />
                </div>
              ) : notification.type === 'error' ? (
                <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950 flex items-center justify-center text-rose-500 border border-rose-200 dark:border-rose-800">
                  <AlertCircle className="w-6 h-6 stroke-[2]" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-sky-600 border border-slate-200 dark:border-zinc-700">
                  <HelpCircle className="w-6 h-6 stroke-[2]" />
                </div>
              )}
            </div>
            
            <div className="space-y-1 mb-5">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-white">
                {notification.title || (notification.type === 'success' ? 'Success' : notification.type === 'error' ? 'Error' : 'Notification')}
              </h3>
              <p className="text-xs text-sky-600/90 dark:text-zinc-400 font-medium font-sans">
                {notification.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const isSuccess = notification.type === 'success';
                setNotification(null);
                if (isSuccess && isOnboarding && activeTab === 'subscription') {
                  onClose();
                }
              }}
              className="px-8 py-2 bg-sky-600 hover:bg-sky-500 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-extrabold text-[10px] uppercase tracking-widest rounded-xl transition-all duration-300 shadow-sm cursor-pointer hover:shadow"
            >
              OK
            </button>
          </div>
        </div>
      )}
      {showLogoOptions && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-[320px] rounded-2xl border border-slate-200 bg-slate-50 dark:bg-zinc-900 p-6 shadow-xl animate-scale-in text-center flex flex-col items-center">
            
            <div className="flex justify-between w-full items-center mb-4">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-800 dark:text-white">
                Edit Logo Options
              </h3>
              <button 
                type="button" 
                onClick={() => setShowLogoOptions(false)}
                className="p-1 rounded-full text-sky-600 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="w-full space-y-3">
              <button
                type="button"
                onClick={() => {
                  setShowLogoOptions(false);
                  triggerLogoUpload();
                }}
                className="w-full py-3 px-4 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-750 text-sky-600 dark:text-[#e2e8f0] font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                Add New Logo
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowLogoOptions(false);
                  setLogoToCrop(logoUrl);
                }}
                className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <PencilIcon className="w-4 h-4 text-white" />
                Edit Existing Logo
              </button>
            </div>
          </div>
        </div>
      )}
      {showLogoPreview && (
        <div 
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/30 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowLogoPreview(false)}
        >
          <div 
            className="bg-slate-50 dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-850 p-5 shadow-xl animate-scale-in w-full max-w-[280px] flex flex-col space-y-3 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Elegant Header Line */}
            <div className="flex justify-between items-center w-full pb-1.5 border-b border-slate-200/40 dark:border-zinc-800">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-sky-600">
                Logo Preview
              </span>
              <button 
                type="button" 
                onClick={() => setShowLogoPreview(false)}
                className="p-1 rounded-full text-sky-600/75 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Premium Showcase Image Box */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-slate-200/50 dark:border-zinc-750 shadow-inner flex items-center justify-center aspect-square w-full p-0 overflow-hidden relative">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="Company Logo Preview" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain transition-transform duration-300 hover:scale-102"
                />
              ) : (
                <span className="text-sky-600/50 text-[10px] font-extrabold uppercase tracking-wider">No Logo</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact helper components to bypass local icon scope
function PencilIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}
