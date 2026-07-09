import React, { useState, useRef, useEffect } from 'react';
import { X, Check, Trash2, Upload, CreditCard, ShieldCheck, Sparkles, Building2, Landmark, Sliders, Award, FileSpreadsheet, KeyRound, ArrowLeft, ArrowRight, Plus, AlertCircle } from 'lucide-react';
import { BusinessProfile } from '../types';
import { Country, State } from 'country-state-city';
import { supabase } from '../lib/supabase';

interface BusinessProfileModalProps {
  profile: BusinessProfile;
  isOpen: boolean;
  isOnboarding?: boolean;
  onClose: () => void;
  onSave: (pf: BusinessProfile) => void;
}

export default function BusinessProfileModal({ profile, isOpen, isOnboarding = false, onClose, onSave }: BusinessProfileModalProps) {
  // Tabs State: 'company' | 'banking' | 'billing' | 'subscription' | 'tax'
  const [activeTab, setActiveTab] = useState<'company' | 'banking' | 'billing' | 'subscription' | 'tax'>('company');
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

  // Fields state holding actual values
  const [name, setName] = useState(() => isOnboarding ? '' : (profile.name || ''));
  const [displayName, setDisplayName] = useState(() => isOnboarding ? '' : (profile.displayName || ''));
  const [email, setEmail] = useState(() => isOnboarding ? '' : (profile.email || ''));
  const [phone, setPhone] = useState(() => isOnboarding ? '' : (profile.phone || ''));
  const [address, setAddress] = useState(() => isOnboarding ? '' : (profile.address || ''));
  const [taxId, setTaxId] = useState(() => isOnboarding ? '' : (profile.taxId || ''));
  const [currency, setCurrency] = useState(() => isOnboarding ? '' : (profile.currency || 'USD'));
  const [defaultTaxRate, setDefaultTaxRate] = useState(() => isOnboarding ? 0 : (profile.defaultTaxRate || 0));
  const [logoUrl, setLogoUrl] = useState(() => isOnboarding ? '' : (profile.logoUrl || ''));
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

  // Billing
  const [invoicePrefix, setInvoicePrefix] = useState(() => isOnboarding ? '' : (profile.invoicePrefix || 'INV'));
  const [startingInvoiceNumber, setStartingInvoiceNumber] = useState(() => isOnboarding ? '' : (profile.startingInvoiceNumber || '1'));
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

  const handleTabChange = (targetTab: typeof activeTab) => {
    if (isOnboarding && targetTab !== 'company') {
      if (!validateCompanyProfile()) {
        return;
      }
    }
    setActiveTab(targetTab);
  };

  // Digital Signature Pad Canvas References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureImageInputRef = useRef<HTMLInputElement>(null);

  // Load settings, tax_configs, and subscriptions on mount / open
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.warn("[SETTINGS] No logged in user found:", userError);
          // Fall back to props if no auth
          if (!isOnboarding) {
            setName(profile.name || '');
            setDisplayName(profile.displayName || '');
            setEmail(profile.email || '');
            setPhone(profile.phone || '');
            setAddress(profile.address || '');
            setTaxId(profile.taxId || '');
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
          setName(settings.business_name || '');
          setDisplayName(settings.owner_name || '');
          setEmail(settings.email || '');
          setPhone(settings.phone || '');
          setAddress(settings.address || '');
          setTaxId(settings.gstin || '');
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
          setPostedInvoiceEdit(settings.posted_invoice_edit || 'Disabled');
          setMaterialRateEdit(settings.material_rate_edit || 'Disabled');
          setMaterialCategorization(settings.material_categorization || 'Optional');
          setDefaultNotes(settings.default_notes || 'Thank you for your business.');
          setDefaultTerms(settings.default_terms || 'Goods once sold will not be taken back or exchanged.');
        } else {
          // If no row exists yet, use props / defaults
          setName(profile.name || '');
          setDisplayName(profile.displayName || '');
          setEmail(profile.email || '');
          setPhone(profile.phone || '');
          setAddress(profile.address || '');
          setTaxId(profile.taxId || '');
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
  }, [isOpen, profile]);

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
          img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
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
    
    if (!validateCompanyProfile()) {
      setActiveTab('company');
      return;
    }

    setIsSaving(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        alert("Authentication error: Please log in again.");
        setIsSaving(false);
        return;
      }

      // 1. Process and upload signature if base64
      let uploadedSignatureUrl = signature;
      if (signature && signature.startsWith('data:image/png;base64,')) {
        try {
          const blob = dataURLtoBlob(signature);
          if (blob) {
            const { error: uploadError } = await supabase.storage
              .from('signature')
              .upload(`signature/${user.id}/signature.png`, blob, {
                cacheControl: '3600',
                upsert: true
              });
            if (uploadError) {
              console.error("[SETTINGS] Signature upload error:", uploadError);
              alert(`Failed to upload signature: ${uploadError.message}`);
              setIsSaving(false);
              return;
            }
            const { data: { publicUrl } } = supabase.storage
              .from('signature')
              .getPublicUrl(`signature/${user.id}/signature.png`);
            uploadedSignatureUrl = publicUrl;
          }
        } catch (uploadErr: any) {
          console.error("[SETTINGS] Signature convert/upload exception:", uploadErr);
          alert(`Failed to process signature: ${uploadErr.message || uploadErr}`);
          setIsSaving(false);
          return;
        }
      }

      // 2. Prepare company settings data
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
        logo_url: logoUrl,
        signature_url: uploadedSignatureUrl,
        signature_type: signatureMode,
        bank_name: bankName,
        account_number: accountNumber,
        ifsc,
        upi_id: upiId,
        invoice_prefix: invoicePrefix,
        starting_invoice_number: startingInvoiceNumber,
        posted_invoice_edit: postedInvoiceEdit,
        material_rate_edit: materialRateEdit,
        material_categorization: materialCategorization,
        default_notes: defaultNotes,
        default_terms: defaultTerms,
        updated_at: new Date().toISOString()
      };

      if (companyCode && companyCode.trim() !== '') {
        settingData.custom_company_code = companyCode.trim();
        settingData.company_code = companyCode.trim();
      }

      // 3. Upsert company settings
      const { data: savedSetting, error: settingError } = await supabase
        .from('company_settings')
        .upsert(settingData, { onConflict: 'user_id' })
        .select('id')
        .single();

      if (settingError) {
        console.error("[SETTINGS] Error saving company settings:", settingError);
        if (settingError.code === '23505' || (settingError.message && settingError.message.toLowerCase().includes('unique'))) {
          alert("This company code is already taken, please choose another.");
        } else {
          alert(`Failed to save settings: ${settingError.message}`);
        }
        setIsSaving(false);
        return;
      }

      const settingsRowId = savedSetting?.id;

      // 4. Handle tax configurations deletion
      if (deletedTaxIds.length > 0) {
        const { error: deleteTaxError } = await supabase
          .from('tax_configs')
          .delete()
          .in('id', deletedTaxIds);
        
        if (deleteTaxError) {
          console.error("[SETTINGS] Error deleting tax configs:", deleteTaxError);
        }
      }

      // 5. Handle tax configurations upsert
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
            row.id = tax.id; // Keep database uuid if it exists
          }
          return row;
        });

        const { error: taxUpsertError } = await supabase
          .from('tax_configs')
          .upsert(taxRows);

        if (taxUpsertError) {
          console.error("[SETTINGS] Error upserting tax configs:", taxUpsertError);
          alert(`Saved profile settings, but failed to save some tax configs: ${taxUpsertError.message}`);
        }
      }

      // Save local state for App.tsx component tree compatibility
      onSave({
        uid: user.id,
        name,
        displayName,
        ownerName: displayName,
        email,
        phone: fullPhone,
        address,
        taxId,
        currency,
        logoUrl,
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

      alert("Settings successfully saved!");
      onClose();
    } catch (err: any) {
      console.error("[SETTINGS] Unexpected error during form submission:", err);
      alert(`Unexpected error: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto">
      <div 
        id="profile-modal" 
        className="relative w-full max-w-6xl bg-white dark:bg-slate-900 text-slate-805 dark:text-white rounded-2xl sm:rounded-[2rem] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[95dvh] my-auto"
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
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            {activeTab !== 'company' && (
              <button 
                type="button"
                onClick={() => {
                  if (activeTab === 'subscription') setActiveTab('billing');
                  else if (activeTab === 'billing') setActiveTab('banking');
                  else if (activeTab === 'banking') setActiveTab('company');
                }}
                className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-700 hover:text-slate-805 dark:hover:text-white transition-all cursor-pointer hover:bg-slate-100"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600/50 text-white flex items-center justify-center shadow-md">
              <Building2 className="w-5 h-5 text-sky-100" />
            </div>
            <div>
              <h2 className="text-xl font-medium tracking-tight text-slate-805 dark:text-white">Company Settings</h2>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-450">Used as the seller details on every invoice.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close settings modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form container with Sidebar */}
        <form onSubmit={handleFormSubmit} className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* LEFT SIDEBAR (Tabs) */}
          <div className="md:w-64 lg:w-72 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex flex-row md:flex-col p-4 md:p-6 gap-2 overflow-x-auto md:overflow-y-auto shrink-0 hide-scrollbar">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 hidden md:block px-2">Settings Menu</div>
            <button
              type="button"
              onClick={() => handleTabChange('company')}
              className={`flex-1 md:flex-none py-3 px-4 rounded-xl text-left text-xs font-medium tracking-wide transition-all cursor-pointer flex items-center gap-3 ${
                activeTab === 'company'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-950/10'
                  : 'text-slate-550 dark:text-slate-400 hover:text-slate-805 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/50 hover:translate-x-1 duration-300'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Company Profile</span>
              <span className="sm:hidden">Company</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('banking')}
              className={`flex-1 md:flex-none py-3 px-4 rounded-xl text-left text-xs font-medium tracking-wide transition-all cursor-pointer flex items-center gap-3 ${
                activeTab === 'banking'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-950/10'
                  : 'text-slate-550 dark:text-slate-400 hover:text-slate-805 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/50 hover:translate-x-1 duration-300'
              }`}
            >
              <Landmark className="w-4 h-4" />
              <span className="hidden sm:inline">Banking Details</span>
              <span className="sm:hidden">Banking</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('billing')}
              className={`flex-1 md:flex-none py-3 px-4 rounded-xl text-left text-xs font-medium tracking-wide transition-all cursor-pointer flex items-center gap-3 ${
                activeTab === 'billing'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-950/10'
                  : 'text-slate-550 dark:text-slate-400 hover:text-slate-805 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/50 hover:translate-x-1 duration-300'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Billing Config</span>
              <span className="sm:hidden">Billing</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('tax')}
              className={`flex-1 md:flex-none py-3 px-4 rounded-xl text-left text-xs font-medium tracking-wide transition-all cursor-pointer flex items-center gap-3 ${
                activeTab === 'tax'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-950/10'
                  : 'text-slate-550 dark:text-slate-400 hover:text-slate-805 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/50 hover:translate-x-1 duration-300'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span className="hidden sm:inline">Tax Config</span>
              <span className="sm:hidden">Tax</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('subscription')}
              className={`flex-1 md:flex-none py-3 px-4 rounded-xl text-left text-xs font-medium tracking-wide transition-all cursor-pointer flex items-center gap-3 ${
                activeTab === 'subscription'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-950/10'
                  : 'text-slate-550 dark:text-slate-400 hover:text-slate-805 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/50 hover:translate-x-1 duration-300'
              }`}
            >
              <Award className="w-4 h-4" />
              <span className="hidden sm:inline">Subscription</span>
              <span className="sm:hidden">Sub</span>
            </button>
          </div>

          {/* MAIN SCROLLABLE CONTENT */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            <div className="p-6 md:p-8 space-y-8 flex-1">

          {/* TAB 1: COMPANY */}
          {activeTab === 'company' && (
            <div className="space-y-6 animate-fade-in text-slate-805 dark:text-white">
              {validationError && (
                <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-2.5 shadow-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}
          {/* TOP SECTION: Logo picker and Brand Identity Indicator Card */}
          <div className="grid md:grid-cols-12 gap-5 items-stretch">
            
            {/* Logo box */}
            <div className="md:col-span-4 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 flex flex-col items-center justify-center space-y-3">
              <div 
                className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 relative overflow-hidden flex items-center justify-center group cursor-pointer transition-all hover:border-sky-500"
                onClick={triggerLogoUpload}
              >
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt="Company logo preview" 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500 select-none uppercase tracking-wider">Logo</span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <PencilIcon className="w-4 h-4 text-white" />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={triggerLogoUpload}
                  className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-755 font-medium text-[10px] uppercase tracking-wide text-slate-650 dark:text-slate-300 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {logoUrl ? 'Change' : 'Upload Logo'}
                </button>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl('')}
                    className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-900 font-medium text-[10px] uppercase tracking-wide text-red-600 dark:text-red-400 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Brand identity view card (gorgeous neon overlay representation) */}
            <div className="md:col-span-8 p-6 rounded-3xl border border-slate-150 dark:border-slate-800 bg-gradient-to-br from-slate-50 via-slate-100/50 to-slate-50 dark:from-slate-950 dark:via-[#0a101d] dark:to-slate-950 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="p-0.5 px-1.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded text-[9px] font-bold tracking-widest uppercase">
                    YOUR COMPANY IDENTITY
                  </div>
                </div>
                
                <div className="flex items-baseline gap-2">
                  <span className="text-slate-500 dark:text-slate-400 text-xs font-medium font-mono">Company Code :</span>
                  <span className="text-sky-600 dark:text-sky-400 text-base sm:text-lg font-extrabold font-mono tracking-wider">
                    {companyCode || 'C0045'}
                  </span>
                </div>
                
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal max-w-md">
                  This unique company code is linked to all invoices, customers, materials and reports.
                </p>
              </div>

              {/* Capsule Badges */}
              <div className="flex flex-wrap gap-2 pt-4">
                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                  {name || 'INTEZ'}
                </span>
                <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-bold tracking-wider flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  Active License
                </span>
              </div>
            </div>

          </div>


              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="company-name" className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Business Name *</label>
                  <input 
                    id="company-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. INTEZ Systems"
                    className={`w-full px-3 py-2.5 rounded-xl border bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none shadow-sm transition-all duration-300 font-medium ${showErrors && !name.trim() ? 'border-red-500 ring-4 ring-red-500/10 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 dark:border-slate-850 focus:border-sky-500 hover:border-slate-300 dark:hover:border-slate-700 focus:ring-4 focus:ring-sky-500/10'}`}
                  />
                  {showErrors && !name.trim() && <p className="text-[10px] text-red-500 font-medium mt-1">Business Name is required</p>}
                </div>
                <div>
                  <label htmlFor="company-display-name" className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Owner Name *</label>
                  <input 
                    id="company-display-name"
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. INTEZ"
                    className={`w-full px-3 py-2.5 rounded-xl border bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none shadow-sm transition-all duration-300 font-medium ${showErrors && !displayName.trim() ? 'border-red-500 ring-4 ring-red-500/10 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 dark:border-slate-850 focus:border-sky-500 hover:border-slate-300 dark:hover:border-slate-700 focus:ring-4 focus:ring-sky-500/10'}`}
                  />
                  {showErrors && !displayName.trim() && <p className="text-[10px] text-red-500 font-medium mt-1">Owner Name is required</p>}
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="company-country" className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Country *</label>
                  <select 
                    id="company-country"
                    required
                    value={Country.getAllCountries().find(c => c.name === country)?.isoCode || ''}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none shadow-sm transition-all duration-300 font-medium cursor-pointer ${showErrors && !country.trim() ? 'border-red-500 ring-4 ring-red-500/10 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 dark:border-slate-850 focus:border-sky-500 hover:border-slate-300 dark:hover:border-slate-700 focus:ring-4 focus:ring-sky-500/10'}`}
                  >
                    <option value="" disabled className="bg-white dark:bg-slate-900 text-slate-500">Select Country</option>
                    {Country.getAllCountries().map((c) => (
                      <option key={c.isoCode} value={c.isoCode} className="bg-white dark:bg-slate-900 text-slate-850 dark:text-white">{c.name}</option>
                    ))}
                  </select>
                  {showErrors && !country.trim() && <p className="text-[10px] text-red-500 font-medium mt-1">Country is required</p>}
                </div>
                <div>
                  <label htmlFor="company-state" className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">State *</label>
                  <select 
                    id="company-state"
                    value={(() => {
                      const cCode = Country.getAllCountries().find(c => c.name === country)?.isoCode;
                      if (!cCode) return '';
                      return State.getStatesOfCountry(cCode).find(s => s.name === state)?.isoCode || '';
                    })()}
                    onChange={(e) => handleStateChange(e.target.value, country)}
                    className={`w-full px-3 py-2.5 rounded-xl border bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none shadow-sm transition-all duration-300 font-medium cursor-pointer ${showErrors && !state.trim() ? 'border-red-500 ring-4 ring-red-500/10 focus:border-red-500 focus:ring-red-505 focus:ring-red-500/10' : 'border-slate-200 dark:border-slate-850 focus:border-sky-500 hover:border-slate-300 dark:hover:border-slate-700 focus:ring-4 focus:ring-sky-500/10'}`}
                    required
                  >
                    <option value="" disabled className="bg-white dark:bg-slate-900 text-slate-500">Select State</option>
                    {(() => {
                      const cCode = Country.getAllCountries().find(c => c.name === country)?.isoCode;
                      if (!cCode) return null;
                      return State.getStatesOfCountry(cCode).map((st) => (
                        <option key={st.isoCode} value={st.isoCode} className="bg-white dark:bg-slate-900 text-slate-850 dark:text-white">{st.name}</option>
                      ));
                    })()}
                  </select>
                  {showErrors && !state.trim() && <p className="text-[10px] text-red-500 font-medium mt-1">State is required</p>}
                </div>
                <div>
                  <label htmlFor="company-state-code" className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">State Code</label>
                  <input 
                    id="company-state-code"
                    type="number"
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                    placeholder="e.g. MH, 07"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-slate-50 dark:bg-slate-900/50 text-sm text-slate-805 dark:text-white focus:outline-none shadow-sm hover:border-slate-300 dark:hover:border-slate-700 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-mono font-medium"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="company-address" className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Address</label>
                <textarea 
                  id="company-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="abcd, Main Business Block, Silicon Valley"
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 resize-none"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="company-currency-symbol" className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Currency Symbol</label>
                  <input 
                    id="company-currency-symbol"
                    type="text"
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    placeholder="e.g. Rp, $, ₹..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-medium"
                  />
                </div>
                <div>
                  <label htmlFor="company-mobile" className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Mobile *</label>
                  <input 
                    id="company-mobile"
                    type="text"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/[^\d\s+]/g, ''))}
                    placeholder="e.g. 9899728185"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-medium"
                  />
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">Mobile number is linked with login, orders and billing records.</p>
                  {showErrors && !mobile.trim() && <p className="text-[10px] text-red-500 font-medium mt-1">Mobile Number is required</p>}
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="company-email" className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Email *</label>
                  <input 
                    id="company-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. crixlayxd@gmail.com"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-medium"
                  />
                </div>
                <div>
                  <label htmlFor="company-gstin" className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">GSTIN / Tax ID</label>
                  <input 
                    id="company-gstin"
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="e.g. GSTIN99238"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="company-code-editor" className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Custom Company Code</label>
                  <input 
                    id="company-code-editor"
                    type="text"
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value)}
                    placeholder="e.g. C0045"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-mono font-medium uppercase"
                  />
                </div>
              </div>

              {/* Pad/Signature inside Company configuration block */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                  <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Client Signature Pad</label>
                  
                  {/* Signature Mode Switcher */}
                  <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setSignatureMode('draw')}
                      className={`px-3 py-1 text-[10px] font-medium rounded-md transition-all ${signatureMode === 'draw' ? 'bg-white dark:bg-slate-800 text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                      Draw
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignatureMode('type')}
                      className={`px-3 py-1 text-[10px] font-medium rounded-md transition-all ${signatureMode === 'type' ? 'bg-white dark:bg-slate-800 text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                      Type
                    </button>
                    <button
                      type="button"
                      onClick={() => signatureImageInputRef.current?.click()}
                      className={`px-3 py-1 text-[10px] font-medium rounded-md transition-all flex items-center gap-1 ${signatureMode === 'upload' ? 'bg-white dark:bg-slate-800 text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                      <Upload className="w-3 h-3" />
                      Upload
                    </button>
                  </div>
                </div>

                {signatureMode === 'type' && (
                  <div className="mb-3 flex gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={signatureText}
                        onChange={(e) => setSignatureText(e.target.value)}
                        placeholder="Type your signature here..."
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 transition-all font-medium"
                      />
                    </div>
                    <div className="w-48">
                      <select
                        value={signatureFont}
                        onChange={(e) => setSignatureFont(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 transition-all font-medium font-mono"
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
                  <div className="mb-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-medium flex items-start gap-1.5">
                    <span className="text-amber-500 mt-0.5 shrink-0">⚠️</span>
                    <span>Upload a signature photo taken on a <strong>plain white or light background</strong>. The system will automatically extract your signature.</span>
                  </div>
                )}

                <div className="relative rounded-2xl overflow-hidden border border-slate-205 dark:border-slate-800 bg-white flex flex-col">
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
                      className="w-full h-auto bg-white cursor-crosshair touch-none"
                    />
                  ) : (
                    <div className="w-full h-32 bg-white flex items-center justify-center p-4">
                      {signature ? (
                        <img 
                          src={signature} 
                          alt="Signature Preview" 
                          className="max-w-full max-h-full object-contain" 
                        />
                      ) : (
                        <span className="text-slate-400 text-xs">No signature entered yet</span>
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
                      className="absolute top-2 right-2 p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg transition-colors cursor-pointer shadow-sm border border-rose-200 dark:border-rose-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  
                  <div className="absolute bottom-2 left-3 flex items-center gap-1.5 pointer-events-none text-slate-400 dark:text-slate-500 text-[10px]">
                    <span>{signatureMode === 'draw' ? 'Draw your signature above.' : signatureMode === 'type' ? 'Your typed signature preview.' : 'Extracted signature preview.'}</span>
                  </div>
                </div>

                {/* Signature Size Adjuster */}
                <div className="mt-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Signature Display Size</span>
                    <span className="text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 px-2.5 py-1 rounded-md">
                      Size: {Math.max(1, Math.min(10, Math.round((signatureSize - 60) / 10) + 1))}
                    </span>
                  </div>
                  
                  {/* Range input */}
                  <div className="space-y-2">
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
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500 focus:outline-none"
                    />
                    <div className="flex justify-between text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
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
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${signatureSize === preset.value ? 'bg-sky-500 text-white border-sky-500 shadow-sm' : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/60'}`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BANKING */}
          {activeTab === 'banking' && (
            <div className="space-y-6 animate-fade-in text-slate-805 dark:text-white">
              <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <Landmark className="w-5 h-5 text-sky-500" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white">Bank Account Details</h3>
                </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="bank-name" className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Bank Name</label>
                  <input 
                    id="bank-name"
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. Axs"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-medium"
                  />
                </div>
                <div>
                  <label htmlFor="bank-account" className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Account Number</label>
                  <input 
                    id="bank-account"
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g. 8612345678"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-mono font-medium"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="bank-ifsc" className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">IFSC</label>
                  <input 
                    id="bank-ifsc"
                    type="text"
                    value={ifsc}
                    onChange={(e) => setIfsc(e.target.value)}
                    placeholder="e.g. FVER1213454"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-mono uppercase font-medium"
                  />
                </div>
                <div>
                  <label htmlFor="bank-upi" className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">UPI ID</label>
                  <input 
                    id="bank-upi"
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. uyt6543"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-medium"
                  />
                </div>
              </div>

              </div> {/* End Banking Card */}
              {/* Inline layout trigger button as seen in reference Image 3 */}
              {!isOnboarding && (
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-sky-900/20 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    {isSaving ? 'Saving...' : 'Save Company Details'}
                  </button>
                </div>
              )}
            </div>
          )}
          {/* TAB 3: BILLING / CUSTOMIZATION */}
          {activeTab === 'billing' && (
            <div className="space-y-8 animate-fade-in text-slate-805 dark:text-white">
              
              {/* Card 1: Invoice Numbers */}
              <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 space-y-6 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Invoice Numbering</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="billing-prefix" className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Invoice Prefix</label>
                  <input 
                    id="billing-prefix"
                    type="text"
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value)}
                    placeholder="e.g. INV"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-medium uppercase"
                  />
                </div>
                <div>
                  <label htmlFor="billing-start-num" className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Starting Invoice Number</label>
                  <input 
                    id="billing-start-num"
                    type="number"
                    value={startingInvoiceNumber}
                    onChange={(e) => setStartingInvoiceNumber(e.target.value)}
                    placeholder="1"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-medium"
                  />
                </div>
              </div>
            </div>

              {/* Card 2: Permissions & Features */}
              <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 space-y-6 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Permissions & Features</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="billing-posted-edit" className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Posted Invoice Edit</label>
                  <select 
                    id="billing-posted-edit"
                    value={postedInvoiceEdit}
                    onChange={(e) => setPostedInvoiceEdit(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-medium cursor-pointer"
                  >
                    <option value="Enabled" className="bg-white dark:bg-slate-900 text-slate-805 dark:text-white">Enabled</option>
                    <option value="Disabled" className="bg-white dark:bg-slate-900 text-slate-805 dark:text-white">Disabled</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="billing-rate-edit" className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Material Rate Edit</label>
                  <select 
                    id="billing-rate-edit"
                    value={materialRateEdit}
                    onChange={(e) => setMaterialRateEdit(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-medium cursor-pointer"
                  >
                    <option value="Enabled" className="bg-white dark:bg-slate-900 text-slate-805 dark:text-white">Enabled</option>
                    <option value="Disabled" className="bg-white dark:bg-slate-900 text-slate-805 dark:text-white">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="billing-categ-edit" className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Material Categorization</label>
                  <select 
                    id="billing-categ-edit"
                    value={materialCategorization}
                    onChange={(e) => setMaterialCategorization(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 font-medium cursor-pointer"
                  >
                    <option value="Optional" className="bg-white dark:bg-slate-900 text-slate-805 dark:text-white">Optional</option>
                    <option value="Required" className="bg-white dark:bg-slate-900 text-slate-805 dark:text-white">Required</option>
                  </select>
                </div>

              </div>
            </div>

              {/* Card 3: Default Text & Terms */}
              <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 space-y-6 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Default Text & Terms</h3>
                <div className="space-y-6">
                  <div>
                    <label htmlFor="billing-notes" className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Default Notes</label>
                <textarea 
                  id="billing-notes"
                  value={defaultNotes}
                  onChange={(e) => setDefaultNotes(e.target.value)}
                  placeholder="Thank you for your business."
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 resize-none"
                />
              </div>

              <div>
                <label htmlFor="billing-terms" className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Default Terms & Conditions</label>
                <textarea 
                  id="billing-terms"
                  value={defaultTerms}
                  onChange={(e) => setDefaultTerms(e.target.value)}
                  placeholder="Goods once sold will not be taken back or exchanged."
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 focus:ring-4 focus:ring-sky-500/10 transition-all duration-300 resize-none"
                />
              </div>

                </div>
              </div>
              

            </div>
          )}

          {/* TAB 4: SUBSCRIPTION */}
          {activeTab === 'subscription' && (
            <div className="space-y-4 animate-fade-in text-sans">
              <div className="p-6 rounded-3xl border border-slate-200 dark:border-sky-950/40 bg-gradient-to-tr from-slate-50 via-slate-100/50 to-slate-50 dark:from-slate-950 dark:to-[#0e172a] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-1 px-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Premium Service Stack Enabled
                    </div>
                    <span className="text-xs text-sky-600 dark:text-sky-400 font-mono font-extrabold uppercase tracking-wider">{subStatus}</span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl sm:text-2xl font-extrabold text-slate-805 dark:text-white">{subPlanName}</h3>
                    <p className="text-xs text-slate-550 dark:text-slate-400">The corporate grade cloud syncing environment. Bound strictly in military local encryptions.</p>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-850 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Active Plan Type</span>
                      <span className="text-sm font-bold text-slate-805 dark:text-white">{subPlanType}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Authorized Token Node</span>
                      <span className="text-sm font-medium text-sky-600 dark:text-sky-400 font-mono tracking-wide">{subAuthorizedToken || companyCode || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Expires / Renews</span>
                      <span className="text-sm font-bold text-[#10b981] dark:text-[#34d399] flex items-center gap-1">
                        {subExpiresAt}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Local Node Syncing State</span>
                      <span className="text-xs font-medium text-slate-550 dark:text-slate-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                        Authenticated
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-[#0a101b]/60 rounded-2xl border border-slate-200 dark:border-slate-850 flex items-center justify-between gap-4">
                <div className="space-y-0.5 col-span-1">
                  <h4 className="text-xs font-bold text-slate-805 dark:text-white uppercase tracking-wider">Multi-User Collaboration & Audit System</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Authorize secure cryptographic access keys to branch office ledgers instantly.</p>
                </div>
                <button 
                  type="button"
                  onClick={() => alert('Branch key sharing token successfully synchronized locally! Check console ledger key.')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-250 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-[10px] uppercase font-extrabold tracking-widest rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5 text-sky-600 dark:text-sky-300" />
                  Request Key
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: TAX CONFIG */}
          {activeTab === 'tax' && (
            <div className="space-y-6 animate-fade-in text-slate-805 dark:text-white">
              <div className="p-5 md:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 space-y-5">
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold text-slate-805 dark:text-white uppercase tracking-wider">Tax Configuration</h3>
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Configure default tax profiles for your invoices based on your operating country.</p>
                </div>

                {/* Country Detection */}
                <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">Company Operating Country</span>
                    <span className="text-sm font-bold text-slate-805 dark:text-white">{country || 'Not Selected (Please select in Profile tab)'}</span>
                  </div>
                  <span className="text-xl">
                    {country && country.toLowerCase() === 'india' ? '🇮🇳' : '🌐'}
                  </span>
                </div>

                {country && country.toLowerCase() === 'india' ? (
                  // INDIA GST TAX ENGINE CONFIG
                  <div className="space-y-5">
                    <div className="p-4 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-800/40 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-500 font-bold">ℹ️</span>
                        <span className="text-xs font-bold text-blue-750 dark:text-blue-405 uppercase tracking-wider">GST Tax Split Mechanism Active</span>
                      </div>
                      <p className="text-[10px] text-blue-650 dark:text-blue-300 leading-relaxed font-medium">
                        For invoices generated within India, taxes are dynamically split based on the state comparison:
                        <br />• <strong>Intrastate (Same State)</strong>: The configured tax will split 50/50 into <strong>CGST</strong> and <strong>SGST</strong>.
                        <br />• <strong>Interstate (Different State)</strong>: The full tax rate is applied as <strong>IGST</strong>.
                      </p>
                    </div>
                    <div className="max-w-md">
                      <label htmlFor="tax-rate-india" className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
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
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm font-medium"
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

                    <div className="grid grid-cols-2 gap-4 max-w-md pt-2 border-t border-slate-100 dark:border-slate-850">
                      <div className="p-3 bg-slate-150/40 dark:bg-slate-900 rounded-xl">
                        <span className="block text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500">CGST + SGST Split</span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{(customTaxPercentage / 2).toFixed(1)}% + {(customTaxPercentage / 2).toFixed(1)}%</span>
                      </div>
                      <div className="p-3 bg-slate-150/40 dark:bg-slate-900 rounded-xl">
                        <span className="block text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500">IGST Rate</span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{customTaxPercentage}%</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  // GENERIC COUNTRIES CUSTOM TAX ENGINE CONFIG
                  <div className="space-y-5 animate-fade-in">
                    <div className="space-y-4">
                      <div className="grid sm:grid-cols-12 gap-4 items-end">
                        <div className="sm:col-span-6">
                          <label htmlFor="custom-tax-name" className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
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
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-855 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm font-medium"
                          />
                        </div>

                        <div className="sm:col-span-5">
                          <label htmlFor="custom-tax-rate" className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
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
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-855 bg-white dark:bg-slate-955 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm font-mono font-medium"
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
                            <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                              Additional Tax {index + 1} Name
                            </label>
                            <input
                              type="text"
                              value={tax.name}
                              onChange={(e) => {
                                setAdditionalTaxes(additionalTaxes.map((t) => t.id === tax.id ? { ...t, name: e.target.value } : t));
                              }}
                              placeholder="e.g. Local Cess, Service Levy"
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-855 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm font-medium"
                            />
                          </div>

                          <div className="sm:col-span-5">
                            <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
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
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-855 bg-white dark:bg-slate-955 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-sm font-mono font-medium"
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
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-3xs"
                        >
                          <Plus className="w-4 h-4 text-sky-655" />
                          <span>Add Another Tax</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-4 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-800/40 rounded-2xl">
                      <p className="text-[10px] text-emerald-650 dark:text-emerald-305 leading-relaxed font-medium">
                        Custom tax profile is active. On newly created bills, item pricing will automatically pre-fill with <strong>{customTaxName || 'Tax'}</strong> at <strong>{customTaxPercentage}%</strong>.
                      </p>
                    </div>
                  </div>
                )}
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
                  className="px-5 py-2.5 rounded-xl text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-805 dark:hover:text-white transition-all cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 disabled:opacity-50"
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
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-sky-900/20 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4.5 h-4.5" />
                    <span>{isSaving ? 'Saving...' : 'Save Details'}</span>
                  </button>
                )}
                {/* Subscription tab fallback just in case */}
                {activeTab === 'subscription' && (
                  <button
                    type="button"
                    onClick={() => handleTabChange('tax')}
                    className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-sky-900/20 cursor-pointer"
                  >
                    <span>Next: Tax Config</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
            </div>
          </div>
        </form>
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
      </div>
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