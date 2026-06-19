import React, { useState, useRef, useEffect } from 'react';
import { X, Check, Trash2, Upload, CreditCard, ShieldCheck, Sparkles, Building2, Landmark, Sliders, Award, FileSpreadsheet, KeyRound, ArrowLeft } from 'lucide-react';
import { BusinessProfile } from '../types';
import { Country, State } from 'country-state-city';

interface BusinessProfileModalProps {
  profile: BusinessProfile;
  isOpen: boolean;
  isOnboarding?: boolean;
  onClose: () => void;
  onSave: (pf: BusinessProfile) => void;
}

export default function BusinessProfileModal({ profile, isOpen, isOnboarding = false, onClose, onSave }: BusinessProfileModalProps) {
  // Tabs State: 'company' | 'banking' | 'billing' | 'subscription'
  const [activeTab, setActiveTab] = useState<'company' | 'banking' | 'billing' | 'subscription'>('company');

  // Fields state holding actual values
  const [name, setName] = useState(profile.name || '');
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [email, setEmail] = useState(profile.email || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [address, setAddress] = useState(profile.address || '');
  const [taxId, setTaxId] = useState(profile.taxId || '');
  const [currency, setCurrency] = useState(profile.currency || 'USD');
  const [defaultTaxRate, setDefaultTaxRate] = useState(profile.defaultTaxRate || 0);
  const [logoUrl, setLogoUrl] = useState(profile.logoUrl || '');
  const [signature, setSignature] = useState(profile.signature || '');
  const [signatureMode, setSignatureMode] = useState<'draw' | 'type' | 'upload'>('draw');
  const [signatureText, setSignatureText] = useState('');
  const [themeAccent, setThemeAccent] = useState<'sky' | 'emerald' | 'indigo' | 'violet' | 'rose' | 'orange'>(profile.themeAccent || 'sky');
  const [invoiceFont, setInvoiceFont] = useState<'inter' | 'space' | 'playfair' | 'mono'>(profile.invoiceFont || 'inter');
  const [invoiceLayout, setInvoiceLayout] = useState<'modern' | 'minimal' | 'agency' | 'professional' | 'startup' | 'enterprise'>(profile.invoiceLayout || 'professional');

  // Custom Fields mapped from reference UI
  const [companyCode, setCompanyCode] = useState(profile.companyCode || '');
  const [state, setState] = useState(profile.state || '');
  const [stateCode, setStateCode] = useState(profile.stateCode || '');
  const [country, setCountry] = useState(profile.country || '');
  const [currencySymbol, setCurrencySymbol] = useState(profile.currencySymbol || '');
  const [mobile, setMobile] = useState(profile.mobile || '');

  // Banking
  const [bankName, setBankName] = useState(profile.bankName || '');
  const [accountNumber, setAccountNumber] = useState(profile.accountNumber || '');
  const [ifsc, setIfsc] = useState(profile.ifsc || '');
  const [upiId, setUpiId] = useState(profile.upiId || '');

  // Billing
  const [invoicePrefix, setInvoicePrefix] = useState(profile.invoicePrefix || 'INV');
  const [startingInvoiceNumber, setStartingInvoiceNumber] = useState(profile.startingInvoiceNumber || '1');
  const [postedInvoiceEdit, setPostedInvoiceEdit] = useState<'Enabled' | 'Disabled'>(profile.postedInvoiceEdit || 'Disabled');
  const [materialRateEdit, setMaterialRateEdit] = useState<'Enabled' | 'Disabled'>(profile.materialRateEdit || 'Disabled');
  const [materialCategorization, setMaterialCategorization] = useState<'Optional' | 'Required'>(profile.materialCategorization || 'Optional');
  const [defaultNotes, setDefaultNotes] = useState(profile.defaultNotes || 'Thank you for your business.');
  const [defaultTerms, setDefaultTerms] = useState(profile.defaultTerms || 'Goods once sold will not be taken back or exchanged.');

  // Digital Signature Pad Canvas References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureImageInputRef = useRef<HTMLInputElement>(null);

  // Auto initialize values when editing or creating
  useEffect(() => {
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
  }, [profile, isOpen]);

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
          setLogoUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
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
        ctx.font = 'italic 48px "Caveat", "Brush Script MT", cursive';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(signatureText, canvas.width / 2, canvas.height / 2);
        setSignature(canvas.toDataURL('image/png'));
      } else {
        setSignature('');
      }
    }
  }, [signatureText, signatureMode]);
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
        const signData = canvas.toDataURL('image/png');
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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      alert('Business Name is required.');
      return;
    }

    onSave({
      uid: profile.uid || 'local',
      name,
      displayName,
      email,
      phone: phone || mobile,
      address,
      taxId,
      currency,
      defaultTaxRate: Number(defaultTaxRate),
      logoUrl,
      signature,
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
      updatedAt: new Date().toISOString()
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto">
      <div 
        id="profile-modal" 
        className="relative w-full max-w-4xl bg-white dark:bg-slate-900 text-slate-805 dark:text-white rounded-2xl sm:rounded-[2rem] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[95dvh] my-auto"
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
              <h2 className="text-xl font-bold tracking-tight text-slate-805 dark:text-white">Company Settings</h2>
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

        {/* Modal Form scroll container */}
        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
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
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 select-none uppercase tracking-wider">Logo</span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <PencilIcon className="w-4 h-4 text-white" />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={triggerLogoUpload}
                  className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-755 font-bold text-[10px] uppercase tracking-wide text-slate-650 dark:text-slate-300 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {logoUrl ? 'Change' : 'Upload Logo'}
                </button>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl('')}
                    className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-900 font-bold text-[10px] uppercase tracking-wide text-red-600 dark:text-red-400 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
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
                  <div className="p-0.5 px-1.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded text-[9px] font-extrabold tracking-widest uppercase">
                    YOUR COMPANY IDENTITY
                  </div>
                </div>
                
                <div className="flex items-baseline gap-2">
                  <span className="text-slate-500 dark:text-slate-400 text-xs font-bold font-mono">Company Code :</span>
                  <span className="text-sky-600 dark:text-sky-400 text-base sm:text-lg font-black font-mono tracking-wider">
                    {companyCode || 'C0045'}
                  </span>
                </div>
                
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal max-w-md">
                  This unique company code is linked to all invoices, customers, materials and reports.
                </p>
              </div>

              {/* Capsule Badges */}
              <div className="flex flex-wrap gap-2 pt-4">
                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-[10px] font-black uppercase tracking-wider">
                  {name || 'INTEZ'}
                </span>
                <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-extrabold tracking-wider flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  Active License
                </span>
              </div>
            </div>

          </div>

          {/* TAB SEGMENTED SWITCHER CONTROL */}
          {!isOnboarding && (
            <div className="p-1 bg-slate-100 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-850 rounded-2xl flex flex-wrap gap-1 leading-none select-none">
              <button
                type="button"
                onClick={() => setActiveTab('company')}
                className={`flex-1 min-w-[80px] py-2.5 px-3 rounded-xl text-center text-xs font-bold tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'company'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-950/10'
                    : 'text-slate-550 dark:text-slate-400 hover:text-slate-805 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900/40'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Company
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('banking')}
                className={`flex-1 min-w-[80px] py-2.5 px-3 rounded-xl text-center text-xs font-bold tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'banking'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-950/10'
                    : 'text-slate-550 dark:text-slate-400 hover:text-slate-805 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900/40'
                }`}
              >
                <Landmark className="w-3.5 h-3.5" />
                Banking
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('billing')}
                className={`flex-1 min-w-[80px] py-2.5 px-3 rounded-xl text-center text-xs font-bold tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'billing'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-950/10'
                    : 'text-slate-550 dark:text-slate-400 hover:text-slate-805 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900/40'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Billing
              </button>
            </div>
          )}

          {/* TAB CONTENT PANELS */}
          
          {/* TAB 1: COMPANY */}
          {activeTab === 'company' && (
            <div className="space-y-4 animate-fade-in text-slate-805 dark:text-white">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="company-name" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Business Name</label>
                  <input 
                    id="company-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. INTEZ Systems"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 transition-all font-semibold"
                  />
                </div>
                <div>
                  <label htmlFor="company-display-name" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Owner Name</label>
                  <input 
                    id="company-display-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. INTEZ"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 transition-all font-semibold"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="company-gstin" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">GSTIN / Tax ID</label>
                  <input 
                    id="company-gstin"
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="e.g. GSTIN99238"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 transition-all font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="company-country" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Country</label>
                  <select 
                    id="company-country"
                    value={Country.getAllCountries().find(c => c.name === country)?.isoCode || ''}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 transition-all font-semibold cursor-pointer"
                  >
                    <option value="" disabled className="bg-white dark:bg-slate-900 text-slate-500">Select Country</option>
                    {Country.getAllCountries().map((c) => (
                      <option key={c.isoCode} value={c.isoCode} className="bg-white dark:bg-slate-900 text-slate-805 dark:text-white">{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="company-state" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">State</label>
                  <select 
                    id="company-state"
                    value={(() => {
                      const cCode = Country.getAllCountries().find(c => c.name === country)?.isoCode;
                      if (!cCode) return '';
                      return State.getStatesOfCountry(cCode).find(s => s.name === state)?.isoCode || '';
                    })()}
                    onChange={(e) => handleStateChange(e.target.value, country)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 transition-all font-semibold cursor-pointer"
                  >
                    <option value="" disabled className="bg-white dark:bg-slate-900 text-slate-500">Select State</option>
                    {(() => {
                      const cCode = Country.getAllCountries().find(c => c.name === country)?.isoCode;
                      if (!cCode) return null;
                      return State.getStatesOfCountry(cCode).map((st) => (
                        <option key={st.isoCode} value={st.isoCode} className="bg-white dark:bg-slate-900 text-slate-805 dark:text-white">{st.name}</option>
                      ));
                    })()}
                  </select>
                </div>
                <div>
                  <label htmlFor="company-state-code" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">State Code</label>
                  <input 
                    id="company-state-code"
                    type="number"
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                    placeholder="e.g. MH, 07"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-slate-50 dark:bg-slate-900/50 text-sm text-slate-805 dark:text-white focus:outline-none transition-all font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="company-address" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Address</label>
                <textarea 
                  id="company-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="abcd, Main Business Block, Silicon Valley"
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 transition-all resize-none"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="company-currency-symbol" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Currency Symbol</label>
                  <input 
                    id="company-currency-symbol"
                    type="text"
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    placeholder="e.g. Rp, $, ₹..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 transition-all font-bold"
                  />
                </div>
                <div>
                  <label htmlFor="company-mobile" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Mobile</label>
                  <input 
                    id="company-mobile"
                    type="text"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/[^\d\s+]/g, ''))}
                    placeholder="e.g. 9899728185"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 transition-all font-semibold"
                  />
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">Mobile number is linked with login, orders and billing records.</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="company-email" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Email *</label>
                  <input 
                    id="company-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. crixlayxd@gmail.com"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 transition-all font-semibold"
                  />
                </div>
                <div>
                  <label htmlFor="company-code-editor" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Custom Company Code</label>
                  <input 
                    id="company-code-editor"
                    type="text"
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value)}
                    placeholder="e.g. C0045"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 transition-all font-mono font-bold uppercase"
                  />
                </div>
              </div>

              {/* Pad/Signature inside Company configuration block */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Client Signature Pad</label>
                  
                  {/* Signature Mode Switcher */}
                  <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setSignatureMode('draw')}
                      className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${signatureMode === 'draw' ? 'bg-white dark:bg-slate-800 text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                      Draw
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignatureMode('type')}
                      className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${signatureMode === 'type' ? 'bg-white dark:bg-slate-800 text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                      Type
                    </button>
                    <button
                      type="button"
                      onClick={() => signatureImageInputRef.current?.click()}
                      className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all flex items-center gap-1 ${signatureMode === 'upload' ? 'bg-white dark:bg-slate-800 text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                      <Upload className="w-3 h-3" />
                      Upload
                    </button>
                  </div>
                </div>

                {signatureMode === 'type' && (
                  <div className="mb-3">
                    <input
                      type="text"
                      value={signatureText}
                      onChange={(e) => setSignatureText(e.target.value)}
                      placeholder="Type your signature here..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 transition-all font-semibold"
                    />
                  </div>
                )}

                {signatureMode === 'upload' && (
                  <div className="mb-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-medium flex items-start gap-1.5">
                    <span className="text-amber-500 mt-0.5 shrink-0">⚠️</span>
                    <span>Upload a signature photo taken on a <strong>plain white or light background</strong>. The system will automatically extract your signature.</span>
                  </div>
                )}

                <div className="relative rounded-2xl overflow-hidden border border-slate-205 dark:border-slate-800 bg-white flex flex-col">
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
                    className={`w-full h-32 bg-white ${signatureMode === 'draw' ? 'cursor-crosshair touch-none' : 'pointer-events-none'}`}
                  />
                  
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
              </div>
            </div>
          )}

          {/* TAB 2: BANKING */}
          {activeTab === 'banking' && (
            <div className="space-y-4 animate-fade-in text-slate-805 dark:text-white">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="bank-name" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Bank Name</label>
                  <input 
                    id="bank-name"
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. Axs"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 transition-all font-semibold"
                  />
                </div>
                <div>
                  <label htmlFor="bank-account" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Account Number</label>
                  <input 
                    id="bank-account"
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g. 8612345678"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 transition-all font-mono font-semibold"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="bank-ifsc" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">IFSC</label>
                  <input 
                    id="bank-ifsc"
                    type="text"
                    value={ifsc}
                    onChange={(e) => setIfsc(e.target.value)}
                    placeholder="e.g. FVER1213454"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 transition-all font-mono uppercase font-bold"
                  />
                </div>
                <div>
                  <label htmlFor="bank-upi" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">UPI ID</label>
                  <input 
                    id="bank-upi"
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. uyt6543"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 transition-all font-semibold"
                  />
                </div>
              </div>

              {/* Inline layout trigger button as seen in reference Image 3 */}
              {!isOnboarding && (
                <div className="pt-4">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-sky-900/20 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Save Company Details
                  </button>
                </div>
              )}
            </div>
          )}
          {/* TAB 3: BILLING / CUSTOMIZATION */}
          {activeTab === 'billing' && (
            <div className="space-y-4 animate-fade-in text-slate-805 dark:text-white">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="billing-prefix" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Invoice Prefix</label>
                  <input 
                    id="billing-prefix"
                    type="text"
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value)}
                    placeholder="e.g. INV"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 transition-all font-bold uppercase"
                  />
                </div>
                <div>
                  <label htmlFor="billing-start-num" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Starting Invoice Number</label>
                  <input 
                    id="billing-start-num"
                    type="number"
                    value={startingInvoiceNumber}
                    onChange={(e) => setStartingInvoiceNumber(e.target.value)}
                    placeholder="1"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 transition-all font-bold"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="billing-posted-edit" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Posted Invoice Edit</label>
                  <select 
                    id="billing-posted-edit"
                    value={postedInvoiceEdit}
                    onChange={(e) => setPostedInvoiceEdit(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 transition-all font-semibold cursor-pointer"
                  >
                    <option value="Enabled" className="bg-white dark:bg-slate-900 text-slate-805 dark:text-white">Enabled</option>
                    <option value="Disabled" className="bg-white dark:bg-slate-900 text-slate-805 dark:text-white">Disabled</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="billing-rate-edit" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Material Rate Edit</label>
                  <select 
                    id="billing-rate-edit"
                    value={materialRateEdit}
                    onChange={(e) => setMaterialRateEdit(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 transition-all font-semibold cursor-pointer"
                  >
                    <option value="Enabled" className="bg-white dark:bg-slate-900 text-slate-805 dark:text-white">Enabled</option>
                    <option value="Disabled" className="bg-white dark:bg-slate-900 text-slate-805 dark:text-white">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="billing-categ-edit" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Material Categorization</label>
                  <select 
                    id="billing-categ-edit"
                    value={materialCategorization}
                    onChange={(e) => setMaterialCategorization(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 transition-all font-semibold cursor-pointer"
                  >
                    <option value="Optional" className="bg-white dark:bg-slate-900 text-slate-805 dark:text-white">Optional</option>
                    <option value="Required" className="bg-white dark:bg-slate-900 text-slate-805 dark:text-white">Required</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="billing-tax-rate" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Default Sales Tax Rate (%)</label>
                  <input 
                    id="billing-tax-rate"
                    type="number"
                    step="0.01"
                    value={defaultTaxRate}
                    onChange={(e) => setDefaultTaxRate(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 transition-all font-bold"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="billing-notes" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Default Notes</label>
                <textarea 
                  id="billing-notes"
                  value={defaultNotes}
                  onChange={(e) => setDefaultNotes(e.target.value)}
                  placeholder="Thank you for your business."
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 transition-all resize-none"
                />
              </div>

              <div>
                <label htmlFor="billing-terms" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Default Terms & Conditions</label>
                <textarea 
                  id="billing-terms"
                  value={defaultTerms}
                  onChange={(e) => setDefaultTerms(e.target.value)}
                  placeholder="Goods once sold will not be taken back or exchanged."
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 transition-all resize-none"
                />
              </div>

              {/* INTEGRATING OLD DESIGNER / THEME PROPS TO PRESERVE CAPABILITIES */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 space-y-4">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">PDF Print Customizer</span>
                  <p className="text-[10px] text-slate-550 dark:text-slate-400">Preserve dynamic layout rendering setups for clients.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="custom-font" className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Invoice Typography</label>
                    <select
                      id="custom-font"
                      value={invoiceFont}
                      onChange={(e) => setInvoiceFont(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold focus:outline-none focus:border-sky-500 transition-all cursor-pointer text-slate-805 dark:text-white"
                    >
                      <option value="inter" className="bg-white dark:bg-slate-900">Inter (Modern Clean)</option>
                      <option value="space" className="bg-white dark:bg-slate-900">Space Grotesk (Tech Metric)</option>
                      <option value="playfair" className="bg-white dark:bg-slate-900">Playfair Display (Serif)</option>
                      <option value="mono" className="bg-white dark:bg-slate-900">JetBrains Mono (Industrial)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="custom-layout" className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Print Layout Style</label>
                    <select
                      id="custom-layout"
                      value={invoiceLayout}
                      onChange={(e) => setInvoiceLayout(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold focus:outline-none focus:border-sky-500 transition-all cursor-pointer text-slate-805 dark:text-white"
                    >
                      <option value="professional" className="bg-white dark:bg-slate-900">Corporate Business</option>
                      <option value="minimal" className="bg-white dark:bg-slate-900">Minimalist Sheet</option>
                      <option value="modern" className="bg-white dark:bg-slate-900">Modern Dual-Column</option>
                      <option value="startup" className="bg-white dark:bg-slate-900">Creative Startup</option>
                      <option value="agency" className="bg-white dark:bg-slate-900">Elegant Studio</option>
                      <option value="enterprise" className="bg-white dark:bg-slate-900">Structured Left-Align</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Accent Color Theme</label>
                  <div className="flex flex-wrap gap-2.5">
                    {(['sky', 'emerald', 'indigo', 'violet', 'rose', 'orange'] as const).map((accent) => {
                      const colorsMap = {
                        sky: 'bg-sky-500 ring-sky-300',
                        emerald: 'bg-emerald-500 ring-emerald-300',
                        indigo: 'bg-indigo-500 ring-indigo-300',
                        violet: 'bg-violet-500 ring-violet-300',
                        rose: 'bg-rose-500 ring-rose-300',
                        orange: 'bg-orange-500 ring-orange-300'
                      };
                      return (
                        <button
                          key={accent}
                          type="button"
                          onClick={() => setThemeAccent(accent)}
                          className={`w-6 h-6 rounded-full cursor-pointer relative transition-all ${colorsMap[accent]} ${
                            themeAccent === accent 
                              ? 'ring-4 scale-110 shadow-sm' 
                              : 'opacity-85 hover:opacity-100 hover:scale-105'
                          }`}
                        >
                          {themeAccent === accent && (
                            <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-[10px]">✓</span>
                          )}
                        </button>
                      );
                    })}
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
                    <div className="p-1 px-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Premium Service Stack Enabled
                    </div>
                    <span className="text-xs text-sky-600 dark:text-sky-400 font-mono font-black uppercase tracking-wider">Royal Elite Status</span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl sm:text-2xl font-black text-slate-805 dark:text-white">Acme Ledger Hub Professional</h3>
                    <p className="text-xs text-slate-550 dark:text-slate-400">The corporate grade cloud syncing environment. Bound strictly in military local encryptions.</p>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-850 pt-4 grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Active Plan Type</span>
                      <span className="text-sm font-extrabold text-slate-805 dark:text-white">Enterprise Unlimited</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Authorized Token Node</span>
                      <span className="text-sm font-bold text-sky-600 dark:text-sky-400 font-mono tracking-wide">{companyCode}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Expires / Renews</span>
                      <span className="text-sm font-extrabold text-[#10b981] dark:text-[#34d399] flex items-center gap-1">
                        June 30, 2029
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Local Node Syncing State</span>
                      <span className="text-xs font-bold text-slate-550 dark:text-slate-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                        Authenticated
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-[#0a101b]/60 rounded-2xl border border-slate-200 dark:border-slate-850 flex items-center justify-between gap-4">
                <div className="space-y-0.5 col-span-1">
                  <h4 className="text-xs font-extrabold text-slate-805 dark:text-white uppercase tracking-wider">Multi-User Collaboration & Audit System</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Authorize secure cryptographic access keys to branch office ledgers instantly.</p>
                </div>
                <button 
                  type="button"
                  onClick={() => alert('Branch key sharing token successfully synchronized locally! Check console ledger key.')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-250 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-[10px] uppercase font-black tracking-widest rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5 text-sky-600 dark:text-sky-300" />
                  Request Key
                </button>
              </div>
            </div>
          )}

          {/* Bottom Dialog controls */}
          <div className="pt-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-950 p-6 -mx-6 -mb-6 rounded-b-[2rem]">
            {!isOnboarding && (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-805 dark:hover:text-white transition-all cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                Cancel
              </button>
            )}
            
            {isOnboarding && activeTab === 'company' && (
              <button
                type="button"
                onClick={() => setActiveTab('banking')}
                className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-sky-900/20 cursor-pointer"
              >
                Next: Banking Details
              </button>
            )}
            
            {isOnboarding && activeTab === 'banking' && (
              <button
                type="button"
                onClick={() => setActiveTab('billing')}
                className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-sky-900/20 cursor-pointer"
              >
                Next: Billing Details
              </button>
            )}

            {(!isOnboarding || activeTab === 'billing') && (
              <button
                type="submit"
                className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-sky-900/20 cursor-pointer"
              >
                <Check className="w-4.5 h-4.5" />
                {isOnboarding ? 'Save Details' : 'Save Settings'}
              </button>
            )}
          </div>

        </form>
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