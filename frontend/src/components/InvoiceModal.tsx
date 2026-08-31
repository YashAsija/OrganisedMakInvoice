import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { X, Plus, Trash2, Check, Sparkles, AlertCircle, ShoppingBag, Settings, Download, Save, FileText, ArrowDown, Loader2, ChevronDown, Smartphone, Mail, FileDown, Printer, Package, Lock, ExternalLink } from 'lucide-react';
import { Invoice, TaxClassification, InvoiceItem, InvoiceStatus, DiscountType, PresetItem, ClientProfile, RecurringInterval, BusinessProfile, InvoiceTemplate } from '../types';
import { EditableField } from './EditableField';
import { exportInvoicePDFAsync } from '../lib/pdfExporter';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { LivePreview } from './TemplateBuilder/LivePreview';
import { Country, State } from 'country-state-city';
import { TEMPLATE_PRESETS, getDefaultTemplatePreset } from '../lib/templatePresets';
import { supabase } from '../lib/supabase';
import { useSubscription } from '../hooks/useSubscription';
import { emitNotification } from '../lib/notifications';
import { SmartBillingBox } from './SmartBillingBox';
import { getDocumentTypeDefaults } from '../lib/docTypeDefaults';
import { getLocalizationConfig } from '../lib/localizationEngine';


interface InvoiceModalProps {
  theme: 'light' | 'dark';
  invoice: Invoice | null; // null means create new
  presets: PresetItem[];
  clients: ClientProfile[];
  invoices: Invoice[];
  profile: BusinessProfile;
  currencySymbol: string;
  defaultTaxRate: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (inv: Invoice) => void;
  userId?: string | null;
  subscriptionTier?: 'free' | 'basic' | 'pro' | 'unlimited' | 'enterprise';
  isTutorialHighlight?: boolean;
}

export const getFinancialYearShort = (dateInput?: string | Date): string => {
  const d = dateInput ? new Date(dateInput) : new Date();
  const year = isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
  const month = isNaN(d.getTime()) ? new Date().getMonth() : d.getMonth();
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;
  const y1 = String(startYear).slice(-2);
  const y2 = String(endYear).slice(-2);
  return `${y1}-${y2}`;
};

export const getNextInvoiceNumber = (prefixInput: string, startingInput: any, invoicesList: Invoice[], docType: string = 'invoice', docDate?: string) => {
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
  const prefix = prefixInput ? String(prefixInput).trim() : (defaultPrefixes[docType] || 'INV');
  const starting = startingInput !== undefined && startingInput !== null && String(startingInput).trim() !== '' ? String(startingInput).trim() : '1';

  const fy = getFinancialYearShort(docDate);
  const formatPrefix = `${prefix}-${fy}-`; // e.g. "INV-26-27-"
  const currentYear = new Date().getFullYear();
  const oldFormatPrefix = `${prefix}-${currentYear}-`; // e.g. "INV-2026-"

  // Extract digits from starting input suffix
  const match = starting.match(/^(.*?)(\d+)$/);
  const startNumStr = match ? match[2] : '1';
  const startNum = parseInt(startNumStr, 10);
  const padLength = Math.max(4, startNumStr.length);

  let maxNum = startNum - 1;
  if (invoicesList && invoicesList.length > 0) {
    invoicesList.forEach(inv => {
      if (inv.status === 'draft' || inv.isDeleted === true) {
        return;
      }
      const invNum = inv.invoiceNumber || '';
      if (invNum.startsWith(formatPrefix)) {
        const suffix = invNum.substring(formatPrefix.length);
        if (/^\d+$/.test(suffix)) {
          const num = parseInt(suffix, 10);
          if (num > maxNum) {
            maxNum = num;
          }
        }
      } else if (invNum.startsWith(oldFormatPrefix)) {
        const suffix = invNum.substring(oldFormatPrefix.length);
        if (/^\d+$/.test(suffix)) {
          const num = parseInt(suffix, 10);
          if (num > maxNum) {
            maxNum = num;
          }
        }
      }
    });
  }
  const nextNum = maxNum + 1;
  const nextNumStr = String(nextNum).padStart(padLength, '0');
  return `${formatPrefix}${nextNumStr}`;
};

export default function InvoiceModal({
  theme,
  invoice,
  presets,
  clients,
  invoices,
  profile,
  currencySymbol,
  defaultTaxRate,
  isOpen,
  onClose,
  onSave,
  userId,
  subscriptionTier = 'free',
  isTutorialHighlight = false
}: InvoiceModalProps) {
  // GUI Preview and Form Edit State
  const [activeMode, setActiveMode] = useState<'edit' | 'preview' | 'editable'>('editable');
  const [savedInvoiceForPreview, setSavedInvoiceForPreview] = useState<Invoice | null>(null);
  const [isAiBoxHighlighted, setIsAiBoxHighlighted] = useState<boolean>(isTutorialHighlight);
  const { trackDocumentUsage } = useSubscription();

  useEffect(() => {
    setIsAiBoxHighlighted(isTutorialHighlight);
  }, [isTutorialHighlight]);

  useEffect(() => {
    const handleHighlightEvent = (e: any) => {
      setIsAiBoxHighlighted(Boolean(e.detail));
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('mak_tutorial_highlight_ai_box', handleHighlightEvent);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('mak_tutorial_highlight_ai_box', handleHighlightEvent);
      }
    };
  }, []);

  // Master Registry Client Database loader
  const [registryClients, setRegistryClients] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSavedInvoiceForPreview(null);
      const suffix = profile?.email ? `_${encodeURIComponent(profile.email)}` : '';
      const cached = localStorage.getItem('makbills_masters_vendors' + suffix);
      if (cached) {
        try {
          setRegistryClients(JSON.parse(cached));
        } catch (e) { }
      }
    }
  }, [isOpen, profile]);

  // Client details
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [clientName, setClientName] = useState('');
  const [showClientNameError, setShowClientNameError] = useState(false);

  useEffect(() => {
    if (clientName && clientName.trim() !== '') {
      setShowClientNameError(false);
    }
  }, [clientName]);

  const [showLineItemsError, setShowLineItemsError] = useState(false);
  const [freightCharges, setFreightCharges] = useState<number>(0);
  const [isFreightAdded, setIsFreightAdded] = useState<boolean>(false);

  const [clientEmail, setClientEmail] = useState('');
  const [selectedCopies, setSelectedCopies] = useState({
    customer: true,
    transport: false,
    supplier: false,
    challan: false,
  });
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [pdfZoom, setPdfZoom] = useState<number>(100);
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [invoiceTerms, setInvoiceTerms] = useState('');
  const [status, setStatus] = useState<InvoiceStatus>('pending');
  const [clientGstin, setClientGstin] = useState('');
  const [clientPan, setClientPan] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [grRrNo, setGrRrNo] = useState('');
  const [transport, setTransport] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [station, setStation] = useState('');
  const [ewayBillNo, setEwayBillNo] = useState('');
  const [marka, setMarka] = useState('');
  const [clientCompanyName, setClientCompanyName] = useState('');
  const [shippedToCompanyName, setShippedToCompanyName] = useState('');
  const [shippedToName, setShippedToName] = useState('');
  const [shippedToPhone, setShippedToPhone] = useState('');
  const [shippedToEmail, setShippedToEmail] = useState('');
  const [shippedToPan, setShippedToPan] = useState('');
  const [shippedToState, setShippedToState] = useState('');
  const [shippedToCountry, setShippedToCountry] = useState('');
  const [shippedToGstin, setShippedToGstin] = useState('');
  const [shippedToAddress, setShippedToAddress] = useState('');


  // Active Template
  const [activeTemplate, setActiveTemplate] = useState<InvoiceTemplate>(getDefaultTemplatePreset());
  const [activeProfile, setActiveProfile] = useState<BusinessProfile>(profile);
  const [modalPreviewScale, setModalPreviewScale] = useState(0.88);
  const [successPreviewScale, setSuccessPreviewScale] = useState(0.82);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280) { // 1280px is xl
        const fitScale = Math.max(0.35, Math.min(0.88, (window.innerWidth - 32) / 794));
        setModalPreviewScale(fitScale);
      } else {
        setModalPreviewScale(0.88);
      }

      if (window.innerWidth < 768) {
        const padding = 32; // 16px padding on left & right
        const fitScale = Math.max(0.35, Math.min(0.82, (window.innerWidth - padding) / 794));
        setSuccessPreviewScale(fitScale);
      } else if (window.innerWidth < 1024) { // less than lg
        const padding = 64;
        const fitScale = Math.max(0.4, Math.min(0.82, (window.innerWidth - 380 - padding) / 794));
        setSuccessPreviewScale(fitScale);
      } else {
        setSuccessPreviewScale(0.82);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Advanced features and billing options
  const [invoiceType, setInvoiceType] = useState<'invoice' | 'proforma' | 'debit_note' | 'credit_note' | 'estimate' | 'quote' | 'purchases' | 'purchase_order' | 'purchase_debit_note'>('invoice');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [selectedTemplateStyle, setSelectedTemplateStyle] = useState<string>('professional');
  const [qrCodeTriggerUrl, setQrCodeTriggerUrl] = useState('');

  const logoBase64Ref = useRef<string | null>(null);
  const signatureBase64Ref = useRef<string | null>(null);

  useEffect(() => {
    const imageToBase64 = async (url: string): Promise<string> => {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        return url;
      }
    };

    if (activeProfile?.logoUrl || (activeProfile as any)?.companyLogo) {
      imageToBase64(activeProfile?.logoUrl || (activeProfile as any)?.companyLogo).then(b64 => { logoBase64Ref.current = b64; });
    }
    if ((activeProfile as any)?.signatureUrl || activeProfile?.signature) {
      imageToBase64((activeProfile as any)?.signatureUrl || activeProfile?.signature || '').then(b64 => { signatureBase64Ref.current = b64; });
    }
  }, [activeProfile]);

  // AI Assist States
  const [isAiGeneratingDescription, setIsAiGeneratingDescription] = useState(false);
  // aiExtraData: stores AI-extracted values for fields not visible in current template.
  // When template switches, a useEffect hydrates newly visible fields from this store.
  const [aiExtraData, setAiExtraData] = useState<Record<string, any>>({});

  // Recurring settings states
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<RecurringInterval>('monthly');
  const [recurringStartDate, setRecurringStartDate] = useState('');
  const [recurringEndDate, setRecurringEndDate] = useState('');
  const [endOption, setEndOption] = useState<'indefinite' | 'date'>('indefinite');

  const [items, setItems] = useState<InvoiceItem[]>([]);

  const editablePreviewRef = useRef<HTMLDivElement>(null);
  const [measuredEditableHeight, setMeasuredEditableHeight] = useState(1123);

  const successPreviewRef = useRef<HTMLDivElement>(null);
  const [measuredSuccessHeight, setMeasuredSuccessHeight] = useState(1123);

  useEffect(() => {
    const element = editablePreviewRef.current;
    if (!element) return;
    setMeasuredEditableHeight(element.scrollHeight || 1123);

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setMeasuredEditableHeight(entry.target.scrollHeight || 1123);
      }
    });

    resizeObserver.observe(element);
    return () => {
      resizeObserver.disconnect();
    };
  }, [isOpen, items]);

  useEffect(() => {
    const element = successPreviewRef.current;
    if (!element) return;
    setMeasuredSuccessHeight(element.scrollHeight || 1123);

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setMeasuredSuccessHeight(entry.target.scrollHeight || 1123);
      }
    });

    resizeObserver.observe(element);
    return () => {
      resizeObserver.disconnect();
    };
  }, [savedInvoiceForPreview]);

  useEffect(() => {
    if (items && items.length > 0) {
      setShowLineItemsError(false);
    }
  }, [items]);
  const [discountType, setDiscountType] = useState<DiscountType>('none');
  const [discountValue, setDiscountValue] = useState(0);

  // New item draft line
  const [newItemName, setNewItemName] = useState('');
  const [newItemRate, setNewItemRate] = useState<number>(0);
  const [newItemQty, setNewItemQty] = useState<number>(1);
  const [newItemTax, setNewItemTax] = useState<number>(() => {
    if (profile.customTaxPercentage !== undefined) {
      return profile.customTaxPercentage;
    }
    return defaultTaxRate;
  });
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemHsnCode, setNewItemHsnCode] = useState('');
  const [newItemQtyType, setNewItemQtyType] = useState('');

  // Customizable item extra state fields
  const [newItemType, setNewItemType] = useState('');
  const [newItemSize, setNewItemSize] = useState('');
  const [newItemDiscount, setNewItemDiscount] = useState<number>(0);
  const [newItemTerms, setNewItemTerms] = useState('');

  // Geographic location states for taxes
  const [companyState, setCompanyState] = useState(() => {
    return profile.state || localStorage.getItem('makbills_tax_company_state') || 'Maharashtra';
  });
  const [companyCountry, setCompanyCountry] = useState(() => {
    return profile.country || localStorage.getItem('makbills_tax_company_country') || 'India';
  });
  const [clientState, setClientState] = useState('');
  const [clientCountry, setClientCountry] = useState('India');
  const [hasTransport, setHasTransport] = useState(false);

  // Override / Custom tax options
  const [taxMode, setTaxMode] = useState<'dynamic' | 'custom'>(() => {
    if (invoice) return invoice.taxMode || 'dynamic';
    return profile.taxMode || 'dynamic';
  });
  const [customTaxName, setCustomTaxName] = useState(() => {
    if (invoice) return invoice.customTaxName || 'Tax';
    return profile.customTaxName || 'Tax';
  });
  const [customTaxPercentage, setCustomTaxPercentage] = useState(() => {
    if (invoice) return invoice.customTaxPercentage || 0;
    return profile.customTaxPercentage !== undefined ? profile.customTaxPercentage : profile.defaultTaxRate || 0;
  });
  const [customTaxType, setCustomTaxType] = useState<TaxClassification>(invoice?.customTaxType || 'local');
  const [additionalTaxes, setAdditionalTaxes] = useState<{ id: string, name: string, rate: number }[]>(() => {
    if (invoice) return invoice.additionalTaxes || [];
    return profile.additionalTaxes || [];
  });
  const [customTaxCols, setCustomTaxCols] = useState<string[]>(() => {
    if (invoice?.customTaxCols && invoice.customTaxCols.length > 0) return invoice.customTaxCols;
    return profile.customTaxCols && profile.customTaxCols.length > 0 ? profile.customTaxCols : ['Tax'];
  });

  // Helper: load the correct default template from storage
  // Helper: resolve default template for a given document type
  const getDocTypeDefaultTemplate = useCallback((docType: string): InvoiceTemplate => {
    const normType = docType === 'quote' ? 'estimate' : docType;
    const docTypeDefaultKey = `makbills_default_template_${normType}`;
    const userSelectedDocDefaultId = localStorage.getItem(docTypeDefaultKey);

    const savedCustom = localStorage.getItem('makbills_custom_templates');
    let customTemplates: InvoiceTemplate[] = [];
    if (savedCustom) {
      try {
        customTemplates = JSON.parse(savedCustom);
      } catch (e) {}
    }

    // 1. Check if user set a specific default for this document type
    if (userSelectedDocDefaultId) {
      const matchCustom = customTemplates.find(t => t.id === userSelectedDocDefaultId);
      if (matchCustom) return matchCustom;
      const matchSystem = TEMPLATE_PRESETS.find(t => t.id === userSelectedDocDefaultId);
      if (matchSystem) return matchSystem;
    }

    // 2. Default to the built-in MakInvoices Original template for this document type
    const presetDocMap: Record<string, string> = {
      invoice: 'preset_modal_classic',
      proforma: 'preset_makinvoices_proforma',
      debit_note: 'preset_mak_debit_note',
      purchase_debit_note: 'preset_mak_debit_note',
      credit_note: 'preset_makinvoices_credit_note',
      estimate: 'preset_makinvoices_quotation',
      quote: 'preset_makinvoices_quotation',
      purchase_order: 'preset_mak_po',
      purchases: 'preset_mak_purchases'
    };
    const defaultPresetId = presetDocMap[normType] || 'preset_modal_classic';
    const matchCustomDefault = customTemplates.find(t => t.id === defaultPresetId);
    if (matchCustomDefault) return matchCustomDefault;
    const builtInPreset = TEMPLATE_PRESETS.find(t => t.id === defaultPresetId);
    if (builtInPreset) return builtInPreset;

    // 3. Fallback to global default template if needed
    const globalDefaultId = localStorage.getItem('makbills_global_default_template');
    if (globalDefaultId) {
      const matchCustomGlobal = customTemplates.find(t => t.id === globalDefaultId);
      if (matchCustomGlobal) return matchCustomGlobal;
      const matchSystemGlobal = TEMPLATE_PRESETS.find(t => t.id === globalDefaultId);
      if (matchSystemGlobal) return matchSystemGlobal;
    }

    return getDefaultTemplatePreset();
  }, []);

  // Helper: load the correct default template from storage
  const loadDefaultTemplate = useCallback((typeToUse?: string, forceDocTypeChange: boolean = false) => {
    const isExistingDoc = Boolean(invoice && (invoice.id || '').trim() !== '') && !forceDocTypeChange;
    const isTypeMismatch = typeToUse && invoice?.invoiceType && typeToUse !== invoice.invoiceType;

    if (isExistingDoc && !isTypeMismatch) {
      // If user edited/updated this template in TemplateManager, load the latest version from customTemplates
      const targetId = invoice?.embeddedTemplate?.id || invoice?.selectedCustomTemplateId;
      if (targetId) {
        const savedCustom = localStorage.getItem('makbills_custom_templates');
        if (savedCustom) {
          try {
            const parsed = JSON.parse(savedCustom);
            const match = parsed.find((t: InvoiceTemplate) => t.id === targetId);
            if (match) {
              setActiveTemplate(match);
              return;
            }
          } catch (e) {}
        }
      }

      // If an exact snapshot of the template was embedded in the invoice, use it to ensure historical consistency
      if (invoice?.embeddedTemplate) {
        setActiveTemplate(invoice.embeddedTemplate);
        return;
      }

      // For very old invoices that didn't have selectedCustomTemplateId, map their selectedTemplateStyle
      if (invoice && !invoice.selectedCustomTemplateId && invoice.selectedTemplateStyle) {
        const style = invoice.selectedTemplateStyle.toLowerCase();
        if (style === 'minimal') { setActiveTemplate(TEMPLATE_PRESETS.find(t => t.id === 'preset_barebones') || TEMPLATE_PRESETS[0]); return; }
        if (style === 'modern') { setActiveTemplate(TEMPLATE_PRESETS.find(t => t.id === 'preset_medical') || TEMPLATE_PRESETS[0]); return; }
        if (style === 'professional') { setActiveTemplate(TEMPLATE_PRESETS.find(t => t.id === 'preset_corporate') || TEMPLATE_PRESETS[0]); return; }
        if (style === 'startup' || style === 'agency') { setActiveTemplate(TEMPLATE_PRESETS.find(t => t.id === 'preset_user') || TEMPLATE_PRESETS[0]); return; }
        if (style === 'enterprise') { setActiveTemplate(TEMPLATE_PRESETS.find(t => t.id === 'preset_gst') || TEMPLATE_PRESETS[0]); return; }
      }

      // If editing an existing invoice that doesn't have an embedded template (legacy)
      if (invoice?.selectedCustomTemplateId) {
        const savedCustom = localStorage.getItem('makbills_custom_templates');
        if (savedCustom) {
          try {
            const parsed = JSON.parse(savedCustom);
            const match = parsed.find((t: InvoiceTemplate) => t.id === invoice.selectedCustomTemplateId);
            if (match) {
              setActiveTemplate(match);
              return;
            }
          } catch (e) { }
        }
        const systemMatch = TEMPLATE_PRESETS.find(t => t.id === invoice.selectedCustomTemplateId);
        if (systemMatch) {
          setActiveTemplate(systemMatch);
          return;
        }
      }
    }

    const currentDocType = typeToUse || invoiceType || 'invoice';
    const loadedTemplate = getDocTypeDefaultTemplate(currentDocType);
    setActiveTemplate(loadedTemplate);
  }, [invoice, invoiceType, getDocTypeDefaultTemplate]);

  // Load template whenever the modal opens or doc type changes for new invoices
  useEffect(() => {
    if (isOpen) {
      loadDefaultTemplate(invoiceType);
    }
  }, [isOpen, invoiceType, loadDefaultTemplate]);

  // Listen for template changes made in TemplateManager while modal is open
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'makbills_global_default_template' || e.key === 'makbills_custom_templates') {
        loadDefaultTemplate();
      }
    };
    const handleCustomUpdate = () => {
      loadDefaultTemplate();
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('custom_templates_local_update', handleCustomUpdate);
    window.addEventListener('custom_templates_updated_from_cloud', handleCustomUpdate);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('custom_templates_local_update', handleCustomUpdate);
      window.removeEventListener('custom_templates_updated_from_cloud', handleCustomUpdate);
    };
  }, [loadDefaultTemplate]);

  useEffect(() => {
    if (clientCountry && clientCountry !== 'India' && clientCountry !== 'IN') {
      setTaxMode('custom');
    }
  }, [clientCountry]);

  // Auto initialize values when editing or creating
  useEffect(() => {
    setShowClientNameError(false);
    setShowLineItemsError(false);
    if (invoice) {
      const isDraft = invoice.status === 'draft';
      const type = invoice.invoiceType || 'invoice';
      const numberIsTaken = invoices.some(inv => inv.status !== 'draft' && inv.invoiceNumber === invoice.invoiceNumber && (inv.invoiceType || 'invoice') === type);
      
      if (isDraft && numberIsTaken) {
        const config = getDocTypeConfig(type);
        const nextAvailableNumber = getNextInvoiceNumber(config.prefix, config.startingNumber, invoices, type);
        setInvoiceNumber(nextAvailableNumber);
      } else {
        setInvoiceNumber(invoice.invoiceNumber);
      }
      setDate(invoice.date);
      setDueDate(invoice.dueDate);
      setClientName(invoice.clientName);
      setClientEmail(invoice.clientEmail);
      setClientPhone(invoice.clientPhone);
      setClientAddress(invoice.clientAddress);
      setNotes(invoice.notes);
      setInvoiceTerms(invoice.invoiceTerms || '');
      setStatus(invoice.status === 'draft' ? 'pending' : invoice.status);
      setItems(invoice.items);
      setDiscountType(invoice.discountType || 'none');
      setDiscountValue(invoice.discountValue || 0);
      setFreightCharges((invoice as any).freightCharges || 0);
      setIsFreightAdded((invoice as any).isFreightAdded || ((invoice as any).freightCharges || 0) > 0);

      // Extract new fields if they exist, or set safe defaults
      setInvoiceType(invoice.invoiceType || 'invoice');
      setReferenceNumber(invoice.referenceNumber || '');
      setPoNumber(invoice.poNumber || '');
      setDeliveryNote((invoice as any).deliveryNote || '');
      setSelectedTemplateStyle(invoice.selectedTemplateStyle || 'professional');
      setQrCodeTriggerUrl(invoice.qrCodeTriggerUrl || '');
      setClientGstin(invoice.clientGstin || '');
      setClientPan((invoice as any).clientPan || '');
      setHasTransport(!!(invoice.placeOfSupply || invoice.transport || invoice.grRrNo || invoice.vehicleNo || invoice.driverMobile || invoice.station || invoice.ewayBillNo || (invoice as any).marka));
      setPlaceOfSupply(invoice.placeOfSupply || '');
      setGrRrNo(invoice.grRrNo || '');
      setTransport(invoice.transport || '');
      setVehicleNo(invoice.vehicleNo || '');
      setDriverMobile(invoice.driverMobile || '');
      setStation(invoice.station || '');
      setEwayBillNo(invoice.ewayBillNo || '');
      setMarka((invoice as any).marka || '');
      setClientCompanyName((invoice as any).clientCompanyName || '');
      setShippedToCompanyName((invoice as any).shippedToCompanyName || '');
      setShippedToName(invoice.shippedToName || '');
      setShippedToPhone(invoice.shippedToPhone || '');
      setShippedToEmail(invoice.shippedToEmail || '');
      setShippedToPan(invoice.shippedToPan || '');
      setShippedToState(invoice.shippedToState || '');
      setShippedToCountry(invoice.shippedToCountry || '');
      setShippedToGstin(invoice.shippedToGstin || '');
      setShippedToAddress(invoice.shippedToAddress || '');
      if (invoice.shippedToName || invoice.shippedToAddress) {

      }

      // Geographic/tax options loader
      // Geographic/tax options loader
      setCompanyState(invoice.companyState || profile.state || localStorage.getItem('makbills_tax_company_state') || 'Maharashtra');
      setCompanyCountry(invoice.companyCountry || profile.country || localStorage.getItem('makbills_tax_company_country') || 'India');
      setClientState(invoice.clientState || '');
      setClientCountry(invoice.clientCountry || 'India');
      setTaxMode(invoice.taxMode || profile.taxMode || 'dynamic');
      setCustomTaxName(invoice.customTaxName || profile.customTaxName || 'Custom VAT');
      setCustomTaxPercentage(invoice.customTaxPercentage !== undefined ? invoice.customTaxPercentage : (profile.customTaxPercentage !== undefined ? profile.customTaxPercentage : 0));
      setCustomTaxType(invoice.customTaxType || 'generic');
      setAdditionalTaxes(invoice.additionalTaxes || profile.additionalTaxes || []);

      if (invoice.recurringSettings) {
        setIsRecurring(invoice.recurringSettings.isRecurring);
        setRecurringInterval(invoice.recurringSettings.interval);
        setRecurringStartDate(invoice.recurringSettings.startDate);
        if (invoice.recurringSettings.endDate) {
          setRecurringEndDate(invoice.recurringSettings.endDate);
          setEndOption('date');
        } else {
          setRecurringEndDate('');
          setEndOption('indefinite');
        }
      } else {
        setIsRecurring(false);
        setRecurringInterval('monthly');
        setRecurringStartDate(invoice.date || '');
        setRecurringEndDate('');
        setEndOption('indefinite');
      }

      // Always default to single original (Customer) copy when opening preview/editor
      setSelectedCopies({ customer: true, transport: false, supplier: false, challan: false });
    } else {
      // Set default for new invoice
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const dueStr = new Date(now.setDate(now.getDate() + 14)).toISOString().split('T')[0];
      const initialConfig = getDocTypeConfig('invoice');
      const defaultNumber = getNextInvoiceNumber(initialConfig.prefix, initialConfig.startingNumber, invoices, 'invoice');

      const initialDefaults = getDocumentTypeDefaults('invoice', profile);
      setInvoiceNumber(defaultNumber);
      setDate(dateStr);
      setDueDate(dueStr);
      setClientName('');
      setClientEmail('');
      setClientPhone('');
      setClientAddress('');
      const defaultInvoiceTmpl = getDocTypeDefaultTemplate('invoice');
      const templateNotes = defaultInvoiceTmpl?.config?.terms?.notesText;
      const templateTerms = defaultInvoiceTmpl?.config?.terms?.customText;
      setNotes(templateNotes !== undefined && templateNotes !== null && templateNotes !== '' ? templateNotes : (initialDefaults.notes || ''));
      setInvoiceTerms(templateTerms !== undefined && templateTerms !== null && templateTerms !== '' ? templateTerms : (initialDefaults.terms || ''));
      setStatus('pending');
      setItems([]);
      setDiscountType('none');
      setDiscountValue(0);
      setFreightCharges(0);

      // Advanced and custom default settings
      setInvoiceType('invoice');
      setReferenceNumber('');
      setPoNumber('');
      setDeliveryNote('');
      setSelectedTemplateStyle('professional');
      setQrCodeTriggerUrl('');
      setClientGstin('');
      setClientPan('');
      setClientCompanyName('');
      setShippedToCompanyName('');
      setPlaceOfSupply('');
      setGrRrNo('');
      setTransport('');
      setVehicleNo('');
      setDriverMobile('');
      setStation('');
      setEwayBillNo('');
      setShippedToName('');
      setShippedToPhone('');
      setShippedToEmail('');
      setShippedToPan('');
      setShippedToState('');
      setShippedToCountry('');
      setShippedToGstin('');
      setShippedToAddress('');

      setIsRecurring(false);
      setRecurringInterval('monthly');
      setRecurringStartDate(dateStr);
      setRecurringEndDate('');
      setEndOption('indefinite');

      // Set locations defaults
      setClientState('');
      setClientCountry('India');
      setCompanyState(profile.state || localStorage.getItem('makbills_tax_company_state') || 'Maharashtra');
      setCompanyCountry(profile.country || localStorage.getItem('makbills_tax_company_country') || 'India');
      setTaxMode(profile.taxMode || 'dynamic');
      setCustomTaxName(profile.customTaxName || 'Custom VAT');
      setCustomTaxPercentage(profile.customTaxPercentage !== undefined ? profile.customTaxPercentage : 0);
      setAdditionalTaxes(profile.additionalTaxes || []);
      // Reset selectedCopies for a new invoice
      setSelectedCopies({ customer: true, transport: false, supplier: false, challan: false });
    }
  }, [invoice, isOpen, defaultTaxRate]);


  // Auto-clear transport details if hasTransport is false
  useEffect(() => {
    if (!hasTransport) {
      setTransport('');
      setVehicleNo('');
      setDriverMobile('');
      setStation('');
      setEwayBillNo('');
      setGrRrNo('');
    } else {
      if (transport === 'N/A') setTransport('');
      if (vehicleNo === 'N/A') setVehicleNo('');
      if (driverMobile === 'N/A') setDriverMobile('');
      if (station === 'N/A') setStation('');
      if (ewayBillNo === 'N/A') setEwayBillNo('');
      if (grRrNo === 'N/A') setGrRrNo('');
    }
  }, [hasTransport]);

  // Auto-update items' tax percentages to match template columns and default tax rate
  useEffect(() => {
    if (items.length > 0) {
      const hasTaxCol = activeTemplate.config.table.columns.some(c => c.id === 'tax' && c.visible !== false);
      const targetTax = hasTaxCol ? defaultTaxRate : 0;

      setItems(prev => prev.map(item => {
        if (item.taxPercentage !== targetTax) {
          return { ...item, taxPercentage: targetTax };
        }
        return item;
      }));
    }
  }, [activeTemplate, defaultTaxRate]);

  // Sync activeProfile with profile prop
  useEffect(() => {
    setActiveProfile(profile);
  }, [profile]);

  // Helper function to resolve document prefix and starting number by document type
  const getDocTypeConfig = useCallback((type: string) => {
    let pFix = activeProfile.invoicePrefix || profile.invoicePrefix || 'INV';
    let sNum = activeProfile.startingInvoiceNumber || profile.startingInvoiceNumber || '1';

    if (type === 'proforma') {
      pFix = activeProfile.proformaPrefix || profile.proformaPrefix || 'PI';
      sNum = activeProfile.startingProformaNumber || profile.startingProformaNumber || '1';
    } else if (type === 'debit_note' || type === 'purchase_debit_note') {
      pFix = activeProfile.debitNotePrefix || profile.debitNotePrefix || 'DN';
      sNum = activeProfile.startingDebitNoteNumber || profile.startingDebitNoteNumber || '1';
    } else if (type === 'credit_note') {
      pFix = activeProfile.creditNotePrefix || profile.creditNotePrefix || 'CN';
      sNum = activeProfile.startingCreditNoteNumber || profile.startingCreditNoteNumber || '1';
    } else if (type === 'estimate' || type === 'quote') {
      pFix = activeProfile.quotePrefix || profile.quotePrefix || 'EST';
      sNum = activeProfile.startingQuoteNumber || profile.startingQuoteNumber || '1';
    } else if (type === 'purchases') {
      pFix = activeProfile.purchasesPrefix || profile.purchasesPrefix || 'PUR';
      sNum = activeProfile.startingPurchasesNumber || profile.startingPurchasesNumber || '1';
    } else if (type === 'purchase_order') {
      pFix = activeProfile.purchaseOrderPrefix || profile.purchaseOrderPrefix || 'PO';
      sNum = activeProfile.startingPurchaseOrderNumber || profile.startingPurchaseOrderNumber || '1';
    }

    return { prefix: pFix, startingNumber: sNum };
  }, [activeProfile, profile]);

  // Sync default invoice number for new invoices when starting settings load or document type changes
  useEffect(() => {
    if (isOpen && !invoice) {
      const config = getDocTypeConfig(invoiceType);
      const defaultNumber = getNextInvoiceNumber(config.prefix, config.startingNumber, invoices, invoiceType);
      setInvoiceNumber(defaultNumber);
    }
  }, [isOpen, invoice, invoiceType, invoices, getDocTypeConfig]);

  // Synchronize activeProfile state when profile prop changes
  useEffect(() => {
    if (profile) {
      setActiveProfile(profile);
    }
  }, [profile]);

  // Fetch fresh company settings from Supabase on modal mount/open
  useEffect(() => {
    if (isOpen) {
      const fetchFreshCompanySettings = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: settings } = await supabase
              .from('company_settings')
              .select('*')
              .eq('user_id', user.id)
              .single();
            if (settings) {
              let extraConfig: any = {};
              if (settings.custom_templates) {
                try {
                  extraConfig = typeof settings.custom_templates === 'string'
                    ? JSON.parse(settings.custom_templates)
                    : settings.custom_templates;
                } catch (e) {}
              }

              setActiveProfile(prev => ({
                ...prev,
                logoUrl: settings.logo_url || prev.logoUrl,
                signature: settings.signature_url ? `${settings.signature_url.split('?')[0]}?t=${Date.now()}` : prev.signature,
                signatureSize: extraConfig.signatureSize || prev.signatureSize || 150,
                signatureText: extraConfig.signatureText || prev.signatureText || '',
                signatureFont: extraConfig.signatureFont || prev.signatureFont || 'Caveat',
                signatureMode: settings.signature_type || extraConfig.signatureMode || prev.signatureMode || 'draw',
                name: settings.business_name || prev.name,
                displayName: settings.owner_name || prev.displayName,
                ownerName: settings.owner_name || prev.ownerName,
                address: settings.address || prev.address,
                phone: settings.phone || prev.phone,
                taxId: settings.gstin || prev.taxId,
                state: settings.state || prev.state,
                country: settings.country || prev.country,
                currencySymbol: settings.currency_symbol || prev.currencySymbol,
                stateCode: settings.state_code || prev.stateCode,
                startingInvoiceNumber: settings.starting_invoice_number || profile.startingInvoiceNumber || prev.startingInvoiceNumber,
                invoicePrefix: settings.invoice_prefix || profile.invoicePrefix || prev.invoicePrefix,
                proformaPrefix: settings.proforma_prefix || profile.proformaPrefix || prev.proformaPrefix,
                startingProformaNumber: settings.starting_proforma_number || profile.startingProformaNumber || prev.startingProformaNumber,
                debitNotePrefix: settings.debit_note_prefix || profile.debitNotePrefix || prev.debitNotePrefix,
                startingDebitNoteNumber: settings.starting_debit_note_number || profile.startingDebitNoteNumber || prev.startingDebitNoteNumber,
                creditNotePrefix: settings.credit_note_prefix || profile.creditNotePrefix || prev.creditNotePrefix,
                startingCreditNoteNumber: settings.starting_credit_note_number || profile.startingCreditNoteNumber || prev.startingCreditNoteNumber,
                quotePrefix: settings.quote_prefix || profile.quotePrefix || prev.quotePrefix,
                startingQuoteNumber: settings.starting_quote_number || profile.startingQuoteNumber || prev.startingQuoteNumber,
                purchaseOrderPrefix: settings.purchase_order_prefix || profile.purchaseOrderPrefix || prev.purchaseOrderPrefix,
                startingPurchaseOrderNumber: settings.starting_purchase_order_number || profile.startingPurchaseOrderNumber || prev.startingPurchaseOrderNumber,
                purchasesPrefix: settings.purchases_prefix || profile.purchasesPrefix || prev.purchasesPrefix,
                startingPurchasesNumber: settings.starting_purchases_number || profile.startingPurchasesNumber || prev.startingPurchasesNumber
              }));
              if (settings.state) setCompanyState(settings.state);
              if (settings.country) setCompanyCountry(settings.country);
            }
          }
        } catch (e) {
          console.warn('[INVOICE_MODAL] Failed to fetch fresh company settings:', e);
        }
      };
      fetchFreshCompanySettings();
    }
  }, [isOpen]);


  // --- SEARCHABLE CLIENT DROPDOWN STATE & LOGIC ---
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  const [isShipClientDropdownOpen, setIsShipClientDropdownOpen] = useState(false);
  const [shipClientSearchQuery, setShipClientSearchQuery] = useState('');
  const shipClientDropdownRef = useRef<HTMLDivElement>(null);

  // Close client dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setIsClientDropdownOpen(false);
      }
      if (shipClientDropdownRef.current && !shipClientDropdownRef.current.contains(e.target as Node)) {
        setIsShipClientDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter billing clients dynamically
  const filteredClients = useMemo(() => {
    if (!clients || clients.length === 0) return [];
    const sorted = [...clients].sort((a, b) => {
      const compA = ((a as any).companyName || (a as any).company || '').toLowerCase();
      const compB = ((b as any).companyName || (b as any).company || '').toLowerCase();
      if (compA && compB && compA !== compB) return compA.localeCompare(compB);
      if (compA && !compB) return -1;
      if (!compA && compB) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });

    if (!clientSearchQuery.trim()) return sorted;
    const q = clientSearchQuery.toLowerCase();
    return sorted.filter(c => {
      const comp = ((c as any).companyName || (c as any).company || '').toLowerCase();
      const name = (c.name || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const gstin = ((c as any).gstin || '').toLowerCase();
      return comp.includes(q) || name.includes(q) || email.includes(q) || phone.includes(q) || gstin.includes(q);
    });
  }, [clients, clientSearchQuery]);

  // Filter shipping clients dynamically
  const filteredShipClients = useMemo(() => {
    if (!clients || clients.length === 0) return [];
    const sorted = [...clients].sort((a, b) => {
      const compA = ((a as any).companyName || (a as any).company || '').toLowerCase();
      const compB = ((b as any).companyName || (b as any).company || '').toLowerCase();
      if (compA && compB && compA !== compB) return compA.localeCompare(compB);
      if (compA && !compB) return -1;
      if (!compA && compB) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });

    if (!shipClientSearchQuery.trim()) return sorted;
    const q = shipClientSearchQuery.toLowerCase();
    return sorted.filter(c => {
      const comp = ((c as any).companyName || (c as any).company || '').toLowerCase();
      const name = (c.name || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const gstin = ((c as any).gstin || '').toLowerCase();
      return comp.includes(q) || name.includes(q) || email.includes(q) || phone.includes(q) || gstin.includes(q);
    });
  }, [clients, shipClientSearchQuery]);

  // --- MATERIAL CATALOG DROPDOWN STATE & LOGIC ---
  const [isCatalogDropdownOpen, setIsCatalogDropdownOpen] = useState(false);
  const catalogDropdownRef = useRef<HTMLDivElement>(null);

  // Close catalog dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (catalogDropdownRef.current && !catalogDropdownRef.current.contains(e.target as Node)) {
        setIsCatalogDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Full Material Catalog options combining Presets & Past Invoice Line Items
  const materialCatalogOptions = useMemo(() => {
    const itemsMap = new Map<string, {
      name: string;
      rate?: number;
      taxPercentage?: number;
      description?: string;
      hsnCode?: string;
      quantityType?: string;
      source: string;
    }>();

    // Add preset catalog items
    if (presets && presets.length > 0) {
      presets.forEach(p => {
        if (p.name?.trim()) {
          itemsMap.set(p.name.trim().toLowerCase(), {
            name: p.name.trim(),
            rate: p.rate,
            taxPercentage: p.taxPercentage,
            description: p.description || '',
            hsnCode: (p as any).hsnCode || '',
            quantityType: (p as any).quantityType || '',
            source: 'Material Preset',
          });
        }
      });
    }

    // Add past invoice line items
    if (invoices && invoices.length > 0) {
      invoices.forEach(inv => {
        if (inv.items) {
          inv.items.forEach(it => {
            if (it.name?.trim()) {
              const key = it.name.trim().toLowerCase();
              if (!itemsMap.has(key)) {
                itemsMap.set(key, {
                  name: it.name.trim(),
                  rate: it.rate,
                  taxPercentage: it.taxPercentage,
                  description: it.description || '',
                  hsnCode: it.hsnCode || '',
                  quantityType: it.quantityType || '',
                  source: 'Past Item',
                });
              }
            }
          });
        }
      });
    }

    return Array.from(itemsMap.values());
  }, [presets, invoices]);

  // Filter catalog options dynamically based on text typed in product name
  const filteredCatalogOptions = useMemo(() => {
    if (!newItemName.trim()) return materialCatalogOptions;
    const q = newItemName.toLowerCase();
    return materialCatalogOptions.filter(
      opt => opt.name.toLowerCase().includes(q) || (opt.hsnCode && opt.hsnCode.toLowerCase().includes(q))
    );
  }, [materialCatalogOptions, newItemName]);

  // --- DYNAMIC SELECTION LISTS FROM PAST DATA & PRESETS ---
  const pastNames = React.useMemo(() => {
    const namesSet = new Set<string>();
    // From presets
    presets.forEach(p => { if (p.name) namesSet.add(p.name); });
    // From past invoices
    if (invoices) {
      invoices.forEach(inv => {
        if (inv.items) {
          inv.items.forEach(it => { if (it.name) namesSet.add(it.name); });
        }
      });
    }
    return Array.from(namesSet);
  }, [presets, invoices]);

  const pastTypes = React.useMemo(() => {
    const typesSet = new Set<string>();
    if (invoices) {
      invoices.forEach(inv => {
        if (inv.items) {
          inv.items.forEach(it => { if (it.productType) typesSet.add(it.productType); });
        }
      });
    }
    // Add common types as fallback options
    ['Software Consulting', 'Hardware Goods', 'SaaS subscriptions', 'Content Creation', 'Freelance Work'].forEach(t => typesSet.add(t));
    return Array.from(typesSet);
  }, [invoices]);

  const pastSizes = React.useMemo(() => {
    const sizesSet = new Set<string>();
    if (invoices) {
      invoices.forEach(inv => {
        if (inv.items) {
          inv.items.forEach(it => { if (it.size) sizesSet.add(it.size); });
        }
      });
    }
    // Add standard size guidelines as fallback
    ['Small', 'Medium', 'Large', 'Standard', 'Custom', 'S', 'M', 'L', 'XL'].forEach(s => sizesSet.add(s));
    return Array.from(sizesSet);
  }, [invoices]);

  // --- CATALOG PRESET LAUNCHER ---
  const applyCatalogPreset = (preset: PresetItem) => {
    // Add directly to item list
    const addedItem: InvoiceItem = {
      id: `item_${Math.random().toString(36).substr(2, 5)}`,
      name: preset.name,
      rate: preset.rate,
      quantity: 1,
      taxPercentage: preset.taxPercentage !== undefined ? preset.taxPercentage : defaultTaxRate,
      description: preset.description || '',
      productType: '',
      size: '',
      discountPercentage: 0,
      itemTerms: ''
    };

    setItems([...items, addedItem]);
  };

  // --- ITEM HANDLERS ---
  const handleAddNewItem = () => {
    if (!newItemName.trim()) {
      alert('Product or service name is required.');
      return;
    }

    const addedItem: InvoiceItem = {
      id: `item_${Math.random().toString(36).substr(2, 5)}`,
      name: newItemName.trim(),
      rate: Number(newItemRate),
      quantity: Number(newItemQty) || 1, // Optional quantity default
      taxPercentage: Number(newItemTax),
      description: newItemDesc.trim(),
      productType: newItemType.trim() || undefined,
      size: newItemSize.trim() || undefined,
      discountPercentage: newItemDiscount > 0 ? Number(newItemDiscount) : undefined,
      itemTerms: newItemTerms.trim() || undefined,
      hsnCode: newItemHsnCode.trim() || undefined,
      quantityType: newItemQtyType.trim() || undefined
    };

    setItems([...items, addedItem]);

    // reset fields
    setNewItemName('');
    setNewItemRate(0);
    setNewItemQty(1);
    setNewItemTax(defaultTaxRate);
    setNewItemDesc('');
    setNewItemType('');
    setNewItemSize('');
    setNewItemDiscount(0);
    setNewItemTerms('');
    setNewItemHsnCode('');
    setNewItemQtyType('');
  };

  const removeItem = (id: string) => {
    setItems(items.filter(it => it.id !== id));
  };

  const updateItemQty = (id: string, newQty: number) => {
    if (newQty < 1) return;
    setItems(items.map(it => it.id === id ? { ...it, quantity: newQty } : it));
  };


  const handleAIGenerateDescription = async () => {
    if (!newItemName.trim()) {
      alert('Please state a product or service name first so AI can write a description!');
      return;
    }
    setIsAiGeneratingDescription(true);
    try {
      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes.data.session?.access_token;

      const response = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ name: newItemName })
      });
      const data = await response.json();
      if (data.description) {
        setNewItemDesc(data.description);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiGeneratingDescription(false);
    }
  };

  // --- GEOGRAPHIC TAX CLASSIFICATION ---
  const taxClassification = React.useMemo<TaxClassification>(() => {
    const targetState = (shippedToState || clientState || '').trim().toLowerCase();
    const targetCountry = (shippedToCountry || clientCountry || '').trim().toLowerCase() || 'india';
    const compCountry = (companyCountry || 'india').trim().toLowerCase();
    const compState = (companyState || '').trim().toLowerCase();

    // 1. Foreign Country -> Export / Custom Tax
    if (targetCountry !== 'india' && targetCountry !== 'in') {
      return {
        type: 'custom',
        name: customTaxName || 'Export Tax',
        desc: 'International Export / Custom Tax',
        rateMultiplier: 1,
        rate: customTaxPercentage,
        zeroTax: false
      };
    }

    // 2. India -> Same State -> Local (CGST + SGST)
    if ((compCountry === 'india' || compCountry === 'in') && targetState === compState && targetState !== '') {
      return {
        type: 'local',
        name: 'CGST + SGST',
        desc: `Intra-State Supply (${companyState || 'Local'}): Divided into 50% Central and 50% State`,
        rateMultiplier: 1,
        zeroTax: false
      };
    }

    // 3. India -> Other State -> IGST
    return {
      type: 'interstate',
      name: 'IGST',
      desc: 'Inter-State Supply: 100% Integrated Tax',
      rateMultiplier: 1,
      zeroTax: false
    };
  }, [clientState, shippedToState, clientCountry, shippedToCountry, customTaxName, customTaxPercentage, companyState, companyCountry]);

  // Save company config state to localstorage
  useEffect(() => {
    localStorage.setItem('makbills_tax_company_state', companyState);
    localStorage.setItem('makbills_tax_company_country', companyCountry);
  }, [companyState, companyCountry]);

  // --- FINANCIAL CALCULATOR ENGINE ---
  // Subtotal of lines: calculated from (item.rate * item.quantity)
  const calculatedSubtotal = items.reduce((sum, item) => sum + (item.rate * item.quantity), 0);

  // Custom item-level discounts total sum
  const totalItemDiscounts = items.reduce((sum, item) => {
    const amount = item.rate * item.quantity;
    const discPercentage = item.discountPercentage || 0;
    return sum + (amount * (discPercentage / 100));
  }, 0);

  // Remaining subtotal after applying custom item-level discounts
  const subtotalAfterItemDiscounts = Math.max(0, calculatedSubtotal - totalItemDiscounts);

  // Calculate invoice-level document discount
  let calculatedDiscountTotal = 0;
  if (discountType === 'percent') {
    calculatedDiscountTotal = parseFloat((subtotalAfterItemDiscounts * (discountValue / 100)).toFixed(2));
  } else if (discountType === 'flat') {
    calculatedDiscountTotal = Number(discountValue);
  }

  // Final subtotal before tax is calculated
  const finalDiscountedSubtotal = Math.max(0, subtotalAfterItemDiscounts - calculatedDiscountTotal);

  // Proportional ratio of invoice-level document discount applied to items
  const docDiscountRatio = subtotalAfterItemDiscounts > 0
    ? finalDiscountedSubtotal / subtotalAfterItemDiscounts
    : 1;

  // Calculate taxes item by item
  const hasTaxColActive = activeTemplate?.config?.table?.columns?.some(c => c.id === 'tax' && c.visible !== false);
  const calculatedTaxTotal = hasTaxColActive ? items.reduce((sum, item) => {
    const itemSubtotal = item.rate * item.quantity;
    const itemDiscAmount = itemSubtotal * ((item.discountPercentage || 0) / 100);
    const itemNet = itemSubtotal - itemDiscAmount;
    const itemTaxBase = itemNet * docDiscountRatio;

    // Apply geographic tax percentage
    let activeTaxPct = item.taxPercentage;
    if (taxClassification.type === 'custom') {
      activeTaxPct = item.taxPercentage + additionalTaxes.reduce((acc, t) => acc + t.rate, 0);
    } else if (taxClassification.zeroTax) {
      activeTaxPct = 0;
    }

    return sum + (itemTaxBase * (activeTaxPct / 100));
  }, 0) : 0;

  let freightTaxRate = 0;
  if (hasTaxColActive) {
    if (taxClassification.type === 'custom') {
      freightTaxRate = (customTaxPercentage || 0) + additionalTaxes.reduce((acc, t) => acc + t.rate, 0);
    } else if (taxClassification.zeroTax) {
      freightTaxRate = 0;
    } else {
      freightTaxRate = defaultTaxRate || 0;
    }
  }
  const freightTax = hasTaxColActive ? freightCharges * (freightTaxRate / 100) : 0;

  const roundedTaxTotal = parseFloat((calculatedTaxTotal + freightTax).toFixed(2));
  const calculatedGrandTotal = parseFloat(Math.max(0, (finalDiscountedSubtotal + roundedTaxTotal + freightCharges)).toFixed(2));


  const buildTempInvoice = (silent = false): Invoice | null => {
    if (!silent) {
      if (items.length === 0) {
        alert('Please add at least one line item to build the PDF.');
        return null;
      }
    }

    return {
      // eslint-disable-next-line react-hooks/purity
      id: invoice ? invoice.id : `inv_preview_${Math.random().toString(36).substr(2, 9)}`,
      userId: invoice ? invoice.userId : 'local',
      invoiceType,
      invoiceNumber,
      referenceNumber: silent ? referenceNumber : (referenceNumber.trim() || undefined),
      poNumber: silent ? poNumber : (poNumber.trim() || undefined),
      deliveryNote: silent ? deliveryNote : (deliveryNote.trim() || undefined),
      selectedTemplateStyle,
      selectedCustomTemplateId: activeTemplate.id,
      embeddedTemplate: activeTemplate,
      qrCodeTriggerUrl: silent ? qrCodeTriggerUrl : (qrCodeTriggerUrl.trim() || undefined),
      date,
      dueDate,
      clientName: silent
        ? clientName
        : (invoiceType === 'estimate'
          ? (clientName.trim() || 'Quote / Estimate')
          : (clientName.trim() || (() => {
            const now = new Date();
            const formattedDate = now.toISOString().replace(/T/, ' ').replace(/\..+/, '');
            const guestId = `Guest-${Math.floor(1000 + Math.random() * 9000)}`;
            return `${guestId} (${formattedDate})`;
          })())),
      isFreightAdded,
      clientEmail: invoiceType === 'estimate' ? '' : (silent ? clientEmail : clientEmail.trim()),
      clientPhone: invoiceType === 'estimate' ? '' : (silent ? clientPhone : clientPhone.trim()),
      clientAddress: invoiceType === 'estimate' ? '' : (silent ? clientAddress : clientAddress.trim()),
      notes: silent ? notes : notes.trim(),
      subtotal: Number.isFinite(calculatedSubtotal) ? parseFloat(calculatedSubtotal.toFixed(2)) : 0,
      discountType: discountType || 'none',
      discountValue: Number.isFinite(Number(discountValue)) ? Number(discountValue) : 0,
      discountTotal: Number.isFinite(totalItemDiscounts + calculatedDiscountTotal) ? parseFloat((totalItemDiscounts + calculatedDiscountTotal).toFixed(2)) : 0,
      freightCharges: Number.isFinite(Number(freightCharges)) ? Number(freightCharges) : 0,
      taxTotal: Number.isFinite(roundedTaxTotal) ? roundedTaxTotal : 0,
      grandTotal: Number.isFinite(calculatedGrandTotal) ? calculatedGrandTotal : 0,
      status,
      items,
      createdAt: invoice ? invoice.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      recurringSettings: isRecurring ? {
        isRecurring: true,
        interval: recurringInterval,
        startDate: recurringStartDate || date,
        endDate: endOption === 'date' && recurringEndDate ? recurringEndDate : undefined,
        hasEnded: false,
        lastGeneratedDate: invoice?.recurringSettings?.lastGeneratedDate || undefined
      } : undefined,
      parentInvoiceId: invoice?.parentInvoiceId || undefined,
      companyState,
      companyCountry,
      clientState,
      clientCountry,
      taxMode,
      customTaxName,
      customTaxPercentage,
      customTaxType,
      additionalTaxes,
      invoiceTerms,
      clientGstin: silent ? clientGstin : (clientGstin.trim() || undefined),
      clientPan: silent ? clientPan : (clientPan.trim() || undefined),
      placeOfSupply: silent ? placeOfSupply : (placeOfSupply.trim() || undefined),
      grRrNo: silent ? grRrNo : (grRrNo.trim() || undefined),
      transport: silent ? transport : (transport.trim() || undefined),
      vehicleNo: silent ? vehicleNo : (vehicleNo.trim() || undefined),
      driverMobile: silent ? driverMobile : (driverMobile.trim() || undefined),
      station: silent ? station : (station.trim() || undefined),
      ewayBillNo: silent ? ewayBillNo : (ewayBillNo.trim() || undefined),
      marka: silent ? marka : (marka.trim() || undefined),
      clientCompanyName: clientCompanyName,
      shippedToCompanyName: shippedToCompanyName,
      shippedToName: silent ? shippedToName : (shippedToName.trim() || undefined),
      shippedToPhone: silent ? shippedToPhone : (shippedToPhone.trim() || undefined),
      shippedToEmail: silent ? shippedToEmail : (shippedToEmail.trim() || undefined),
      shippedToPan: silent ? shippedToPan : (shippedToPan.trim() || undefined),
      shippedToState: silent ? shippedToState : (shippedToState.trim() || undefined),
      shippedToCountry: silent ? shippedToCountry : (shippedToCountry.trim() || undefined),
      shippedToGstin: silent ? shippedToGstin : (shippedToGstin.trim() || undefined),
      shippedToAddress: silent ? shippedToAddress : (shippedToAddress.trim() || undefined),
      customTaxCols,
      selectedCopies
    } as Invoice;
  };

  // Memoized invoice data — placed AFTER buildTempInvoice to avoid temporal dead zone
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const liveInvoiceData = useMemo(() => buildTempInvoice(true), [
    invoiceNumber, date, dueDate, clientName, clientEmail, clientPhone,
    clientAddress, clientGstin, clientPan, clientState, clientCountry, notes, invoiceTerms,
    items, discountType, discountValue, shippedToName, shippedToPhone,
    shippedToEmail, shippedToPan, shippedToState, shippedToCountry,
    shippedToGstin, shippedToAddress,
    transport, vehicleNo, driverMobile, station, ewayBillNo, grRrNo, marka,
    clientCompanyName, shippedToCompanyName,
    placeOfSupply, calculatedSubtotal, roundedTaxTotal, calculatedGrandTotal,
  ]);

  const handleUpdateItemCustomTax = (id: string, colName: string, value: number) => {
    setItems(items.map(i => {
      if (i.id === id) {
        return { ...i, customTaxes: { ...(i.customTaxes || {}), [colName]: value } };
      }
      return i;
    }));
  };

  const handleFillCustomTaxColumn = (colName: string) => {
    if (items.length === 0) return;
    const firstVal = items[0].customTaxes?.[colName] || 0;
    setItems(items.map(item => ({
      ...item,
      customTaxes: {
        ...(item.customTaxes || {}),
        [colName]: firstVal
      }
    })));
  };

  const handleUpdateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleAddItem = () => {
    const newItemId = `item_${Date.now()}`;
    let defaultTax = defaultTaxRate;
    if (taxClassification.type === 'custom' || taxClassification.zeroTax) defaultTax = 0;

    const initialCustomTaxes: Record<string, number> = {};
    customTaxCols.forEach(col => {
      initialCustomTaxes[col] = 0;
    });

    const newItem: InvoiceItem = {
      id: newItemId,
      name: 'New Item',
      quantity: 1,
      rate: 0,
      taxPercentage: defaultTax,
      description: '',
      hsnCode: '',
      discountPercentage: 0,
      customTaxes: initialCustomTaxes,
    };
    setItems([...items, newItem]);
  };

  const handleInteractiveRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleDirectExportPDF = async () => {
    const tempInvoice = buildTempInvoice();
    if (tempInvoice) {
      try {
        const { pdf } = await import('@react-pdf/renderer');
        const { getPDFTemplate } = await import('./PDFTemplates');
        const PDFTemplate = getPDFTemplate(tempInvoice.selectedTemplateStyle || selectedTemplateStyle);
        
        const blob = await pdf(
          <PDFTemplate 
            invoice={tempInvoice}
            profile={activeProfile}
            logo={logoBase64Ref.current}
            signature={signatureBase64Ref.current}
          />
        ).toBlob();
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `invoice-${tempInvoice.invoiceNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        emitNotification('PDF Downloaded', `Invoice #${invoiceNumber} PDF has been downloaded successfully.`, 'success');
      } catch (err: any) {
        emitNotification('Download Failed', `Failed to export PDF: ${err.message || err.toString()}`, 'error');
        alert('Failed to export PDF: ' + (err.message || err.toString()));
      }
    }
  };

  // ─── Draft Auto-Save System ────────────────────────────────────────────────

  // A stable ID for this WIP invoice. Generated once on first edit, reused.
  // If we're editing an existing invoice, use its ID; otherwise generate a new one.
  const draftIdRef = useRef<string>((invoice?.id || '').trim() !== '' ? invoice!.id : `inv_draft_${Math.random().toString(36).substr(2, 9)}`);
  const isSavedSuccessfullyRef = useRef<boolean>(false);

  // Tracks the real authenticated userId — updated whenever the session is available or passed as prop.
  // Used by buildAndSave() so sendBeacon payloads always carry the correct userId.
  const userIdRef = useRef<string | null>(userId || null);
  useEffect(() => {
    if (userId) {
      userIdRef.current = userId;
    }
  }, [userId]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.id) userIdRef.current = data.session.user.id;
    });
  }, []);

  // Reset draftId when the modal opens for a brand-new invoice
  useEffect(() => {
    if (isOpen && (!invoice || (invoice.id || '').trim() === '')) {
      draftIdRef.current = `inv_draft_${Math.random().toString(36).substr(2, 9)}`;
      isSavedSuccessfullyRef.current = false;
    } else if (isOpen && invoice) {
      draftIdRef.current = invoice.id;
      isSavedSuccessfullyRef.current = false;
    }
  }, [isOpen, invoice]);

  // Resume draft banner state
  const [resumableDraft, setResumableDraft] = useState<{ id: string; clientName: string; updatedAt: string } | null>(null);
  const [resumeBannerDismissed, setResumeBannerDismissed] = useState(false);

  // On modal open for a NEW invoice — check for any unsaved draft to offer resuming.
  useEffect(() => {
    if (!isOpen || invoice || isSavedSuccessfullyRef.current || savedInvoiceForPreview) return; // only for unsaved new invoices
    setResumeBannerDismissed(false);

    const userEmail = localStorage.getItem('makbills_custom_email');
    const suffix = userEmail ? `_${encodeURIComponent(userEmail)}` : '';
    const storageKey = `invoice_maker_invoices${suffix}`;
    try {
      const pendingDraftId = localStorage.getItem('makbills_pending_resume_draft');
      if (!pendingDraftId || !pendingDraftId.startsWith('inv_draft_')) {
        localStorage.removeItem('makbills_pending_resume_draft');
        setResumableDraft(null);
        return;
      }

      // Check if this pendingDraftId belongs to an already saved billed document
      const isAlreadyBilledDoc = (invoices || []).some(i => i.id === pendingDraftId && i.status !== 'draft');
      if (isAlreadyBilledDoc || isSavedSuccessfullyRef.current) {
        localStorage.removeItem('makbills_pending_resume_draft');
        setResumableDraft(null);
        return;
      }

      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setResumableDraft(null);
        return;
      }
      const all = JSON.parse(raw) as any[];

      const found = all.find(i => i.id === pendingDraftId && i.status === 'draft');
      if (found) {
        const hasRealName = found.clientName && found.clientName.trim() !== '' && !found.clientName.startsWith('Guest-') && found.clientName !== 'Quote / Estimate';
        const hasRealItems = Array.isArray(found.items) && found.items.length > 0;
        if (hasRealName || hasRealItems) {
          setResumableDraft({
            id: found.id,
            clientName: found.clientName || 'Untitled Draft',
            updatedAt: found.updatedAt || new Date().toISOString()
          });
          return;
        }
      }
      setResumableDraft(null);
    } catch {
      setResumableDraft(null);
    }
  }, [isOpen, invoice, invoices]);

  // Helper: get the correct storage key for this user
  const getStorageKey = useCallback(() => {
    const userEmail = localStorage.getItem('makbills_custom_email');
    const suffix = userEmail ? `_${encodeURIComponent(userEmail)}` : '';
    return `invoice_maker_invoices${suffix}`;
  }, []);

  // Core save-to-localStorage function (synchronous, safe for unload)
  const saveDraftToLocalStorage = useCallback((draftInvoice: any) => {
    // NEVER save or set as draft if ID is not a temporary inv_draft_ prefix
    if (!draftInvoice.id || !draftInvoice.id.startsWith('inv_draft_')) {
      return;
    }
    try {
      const storageKey = getStorageKey();
      const raw = localStorage.getItem(storageKey);
      const all = raw ? JSON.parse(raw) : [];
      const idx = all.findIndex((i: any) => i.id === draftInvoice.id);
      if (idx > -1) {
        if (all[idx].status && all[idx].status !== 'draft') {
          return; // Do NOT overwrite an already billed invoice
        }
        all[idx] = draftInvoice;
      } else {
        all.push(draftInvoice);
      }
      localStorage.setItem(storageKey, JSON.stringify(all));
    } catch (err) {
      console.error('[draft] localStorage save failed', err);
    }
  }, [getStorageKey]);

  // Keep a ref to buildTempInvoice so unload listeners (closures) always call the latest version
  const buildTempInvoiceRef = useRef(buildTempInvoice);
  useEffect(() => {
    buildTempInvoiceRef.current = buildTempInvoice;
  });

  // ─── Debounced autosave while typing (3 s after last change) ───────────────
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Watch all key form fields — debounce the save
  useEffect(() => {
    if (!isOpen || isSavedSuccessfullyRef.current || savedInvoiceForPreview) return;
    // CRITICAL: Do NOT autosave as draft if editing an existing billed invoice OR if ID is not a temporary draft
    if ((invoice && invoice.status !== 'draft') || !draftIdRef.current.startsWith('inv_draft_')) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      const draft = buildTempInvoiceRef.current(true);
      if (!draft) return;

      // Only autosave if AT LEAST ONE condition is met:
      // 1. A real client name is entered
      // 2. At least 1 line item exists
      const hasRealClientName =
        draft.clientName &&
        draft.clientName.trim() !== '' &&
        draft.clientName !== 'Quote / Estimate' &&
        !draft.clientName.startsWith('Guest-');

      const hasItems = Array.isArray(draft.items) && draft.items.length > 0;

      if (!hasRealClientName && !hasItems) return;

      const draftToSave = {
        ...draft,
        id: draftIdRef.current,
        status: 'draft' as const,
        updatedAt: new Date().toISOString(),
      };

      // 1. Always save to localStorage immediately
      saveDraftToLocalStorage(draftToSave);

      // 2. If online, also persist to Supabase
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const ALLOWED_COLUMNS = [
            'id', 'userId', 'invoiceType', 'invoiceNumber', 'referenceNumber', 'poNumber', 'date', 
            'dueDate', 'clientName', 'clientEmail', 'clientPhone', 'clientAddress', 'clientCompany',
            'clientGstin', 'clientPan', 'clientState', 'clientCountry', 'clientGST', 'notes', 
            'invoiceTerms', 'terms', 'subtotal', 'discountType', 'discountValue', 'discountTotal', 
            'taxTotal', 'taxAmount', 'grandTotal', 'totalAmount', 'discount', 'currency', 'status', 
            'items', 'paidDate', 'recurringSettings', 'parentInvoiceId', 'selectedTemplateStyle',
            'selectedCustomTemplateId', 'qrCodeTriggerUrl', 'companyState', 'companyCountry',
            'customTaxCols', 'taxMode', 'customTaxName', 'customTaxPercentage', 'customTaxType',
            'additionalTaxes', 'placeOfSupply', 'grRrNo', 'transport', 'vehicleNo', 'driverMobile',
            'station', 'ewayBillNo', 'shippedToName', 'shippedToPhone', 'shippedToEmail', 
            'shippedToPan', 'shippedToState', 'shippedToCountry', 'shippedToGstin', 
            'shippedToAddress', 'embeddedTemplate', 'isDeleted', 'deletedAt', 'deliveryNote',
            'invoiceDate', 'isBin', 'freightCharges', 'packagingCharges', 'otherCharges', 
            'roundOff', 'bankDetails', 'signature', 'companyName', 'companyAddress', 'companyPhone',
            'companyEmail', 'companyGstin', 'companyPan', 'companyLogo', 'updatedAt'
          ];
          const payload: any = { ...draftToSave, userId: session.user.id };
          const cleanDraft: any = {};
          for (const key of ALLOWED_COLUMNS) {
            if (payload[key] !== undefined) cleanDraft[key] = payload[key];
          }
          await supabase.from('invoices').upsert(cleanDraft);
        }
      } catch (err) {
        console.warn('[draft] Supabase debounced save failed (offline?)', err);
      }
    }, 3000);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isOpen, invoice, clientName, clientEmail, clientPhone, clientAddress, notes, invoiceTerms,
    items, discountType, discountValue, referenceNumber, poNumber, deliveryNote,
    shippedToName, shippedToPhone, shippedToEmail, shippedToAddress,
    transport, vehicleNo, driverMobile, station, ewayBillNo, grRrNo, placeOfSupply,
  ]);

  // ─── Unload handlers: beforeunload + visibilitychange ──────────────────────
  useEffect(() => {
    const buildAndSave = () => {
      // CRITICAL: Do NOT save draft on reload if document was saved, OR editing an existing billed invoice, OR if ID is not a temporary draft
      if (isSavedSuccessfullyRef.current || savedInvoiceForPreview || (invoice && invoice.status !== 'draft') || !draftIdRef.current.startsWith('inv_draft_')) return;

      const draft = buildTempInvoiceRef.current(true);
      if (!draft) return;

      // Only save draft on reload if AT LEAST ONE condition is met:
      // 1. Client name is actually filled (not empty/default)
      // 2. At least 1 line item exists
      const hasRealClientName =
        draft.clientName &&
        draft.clientName.trim() !== '' &&
        draft.clientName !== 'Quote / Estimate' &&
        !draft.clientName.startsWith('Guest-');

      const hasItems = Array.isArray(draft.items) && draft.items.length > 0;

      if (!hasRealClientName && !hasItems) return;

      const draftToSave = {
        ...draft,
        id: draftIdRef.current,
        status: 'draft',
        updatedAt: new Date().toISOString(),
        // Always use the real authenticated userId so the draft syncs across devices
        ...(userIdRef.current ? { userId: userIdRef.current } : {}),
      };

      // Synchronous localStorage write (always works in unload)
      saveDraftToLocalStorage(draftToSave);

      // Set a flag so the resume banner shows ONLY on the next Quick Bill open after this reload
      localStorage.setItem('makbills_pending_resume_draft', draftToSave.id);

      // sendBeacon to backend (fire-and-forget, survives unload)
      try {
        // Find the Supabase access token from localStorage (key pattern varies by project ref)
        let accessToken: string | null = null;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes('-auth-token')) {
            try {
              const parsed = JSON.parse(localStorage.getItem(key) || '');
              if (parsed?.access_token) { accessToken = parsed.access_token; break; }
            } catch { /* ignore */ }
          }
        }

        const payload = JSON.stringify({ draft: draftToSave, accessToken });
        const beaconSent = navigator.sendBeacon('/api/save-draft', new Blob([payload], { type: 'application/json' }));
        if (!beaconSent) {
          console.warn('[draft] sendBeacon returned false — beacon queue may be full');
        }
      } catch (err) {
        console.warn('[draft] sendBeacon failed', err);
      }
    };

    const handleBeforeUnload = () => buildAndSave();

    // visibilitychange catches mobile tab-switches and background transitions
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') buildAndSave();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [invoice, saveDraftToLocalStorage]);

  const handleSaveAsDraft = (e: React.MouseEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      setShowLineItemsError(true);
      emitNotification('Validation Error', 'Please add at least one line item to save a draft.', 'error');
      return;
    }

    let currentName = clientName;
    if (!currentName || !currentName.trim()) {
      currentName = `Guest_${invoiceNumber || Math.random().toString(36).substr(2, 6)}`;
      setClientName(currentName);
    }

    const draftInvoice = buildTempInvoice(true);
    if (!draftInvoice) return;
    draftInvoice.clientName = currentName;

    const draftId = invoice ? invoice.id : `inv_${Math.random().toString(36).substr(2, 9)}`;

    onSave({
      ...draftInvoice,
      status: 'draft',
      id: draftId,
    });

    emitNotification('Draft Saved', `Invoice draft for ${currentName} has been saved.`, 'success');
    onClose();
  };

  const triggerWhatsAppShare = (inv: Invoice) => {
    const sym = activeProfile.currency === 'INR' ? '₹' : (activeProfile.currency === 'USD' ? '$' : activeProfile.currency + ' ');
    const previewUrl = `${window.location.origin}/invoice/preview?id=${inv.id}`;
    const message = `Hi ${inv.clientName || 'Client'}, please find your ${inv.invoiceType?.toUpperCase() ?? 'INVOICE'} ${inv.invoiceNumber} from ${activeProfile.name || 'us'} for ${sym}${inv.grandTotal.toFixed(2)} (Due: ${inv.dueDate}). You can view the document preview here:\n${previewUrl}\n\nThank you!`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const triggerEmailShare = (inv: Invoice) => {
    const sym = activeProfile.currency === 'INR' ? '₹' : (activeProfile.currency === 'USD' ? '$' : activeProfile.currency + ' ');
    const previewUrl = `${window.location.origin}/invoice/preview?id=${inv.id}`;
    const subject = `${inv.invoiceType?.toUpperCase() ?? 'INVOICE'} ${inv.invoiceNumber} from ${activeProfile.name}`;
    const body = `Hi ${inv.clientName},\n\nPlease find details for your ${inv.invoiceType?.toUpperCase() ?? 'INVOICE'} ${inv.invoiceNumber} for ${sym}${inv.grandTotal.toFixed(2)} at the following link:\n\n${previewUrl}\n\nSummary:\n- Number: ${inv.invoiceNumber}\n- Amount: ${sym}${inv.grandTotal.toFixed(2)}\n- Issue Date: ${inv.date}\n- Due Date: ${inv.dueDate}\n\nThank you for your business.\n\nWarm regards,\n${activeProfile.name}${activeProfile.phone ? '\nTel: ' + activeProfile.phone : ''}${activeProfile.email ? '\nEmail: ' + activeProfile.email : ''}`;
    const mailto = `mailto:${inv.clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  const handleDirectPrint = async (inv: Invoice) => {
    try {
      emitNotification('Preparing Print', 'Generating high-quality print document...', 'info');
      const pdfBlob = await exportInvoicePDFAsync(inv, activeProfile, 'blob', inv.embeddedTemplate || activeTemplate);
      if (pdfBlob instanceof Blob) {
        const blobUrl = URL.createObjectURL(pdfBlob);
        const existingFrame = document.getElementById('invoice-print-iframe');
        if (existingFrame) existingFrame.remove();
        
        const iframe = document.createElement('iframe');
        iframe.id = 'invoice-print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.src = blobUrl;
        
        iframe.onload = () => {
          setTimeout(() => {
            try {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
            } catch (e) {
              window.open(blobUrl, '_blank');
            }
          }, 300);
        };
        
        document.body.appendChild(iframe);
      }
    } catch (err: any) {
      alert('Failed to trigger print: ' + (err.message || err.toString()));
    }
  };

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

    const fmt = (n: number, symStr: string) => {
      return symStr + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

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
        <table class="header-table">
          <tr>
            <td>
              <div class="biz-title">${activeProfile.name || 'My Business'}</div>
              <div>${activeProfile.address || ''}</div>
              <div>${activeProfile.email || ''}</div>
            </td>
            <td style="text-align: right; vertical-align: top;">
              <div class="doc-title">${inv.invoiceType || 'INVOICE'}</div>
              <div style="margin-top: 8px;"><span class="status-badge">${statusUpper}</span></div>
            </td>
          </tr>
        </table>
        
        <table class="details-table">
          <tr>
            <td class="details-card">
              <div style="font-weight: bold; margin-bottom: 5px; color: #475569;">Billed To:</div>
              <div style="font-size: 15px; font-weight: bold;">${inv.clientName}</div>
              <div>${inv.clientAddress || ''}</div>
              <div>${inv.clientEmail || ''}</div>
            </td>
            <td style="width: 4%;"></td>
            <td class="details-card">
              <div style="font-weight: bold; margin-bottom: 5px; color: #475569;">Document Details:</div>
              <div><span class="meta-label">Invoice No:</span> <span class="meta-val">${inv.invoiceNumber}</span></div>
              <div><span class="meta-label">Date:</span> <span class="meta-val">${inv.date}</span></div>
              <div><span class="meta-label">Due Date:</span> <span class="meta-val">${inv.dueDate}</span></div>
              ${inv.poNumber ? `<div><span class="meta-label">P.O. No:</span> <span class="meta-val">${inv.poNumber}</span></div>` : ''}
            </td>
          </tr>
        </table>

        <table class="items-table">
          <thead>
            <tr>
              <th>Item & Description</th>
              <th style="text-align: right; width: 100px;">Rate</th>
              <th style="text-align: center; width: 80px;">Qty</th>
              <th style="text-align: right; width: 120px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${inv.items.map((item, idx) => `
              <tr class="${idx % 2 === 1 ? 'stripe' : ''}">
                <td>
                  <div style="font-weight: bold;">${item.name}</div>
                  ${item.description ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">${item.description}</div>` : ''}
                </td>
                <td style="text-align: right;">${fmt(item.rate, '')}</td>
                <td style="text-align: center;">${item.quantity}</td>
                <td style="text-align: right; font-weight: bold;">${fmt(item.rate * item.quantity, '')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <table class="totals-table">
          <tr>
            <td style="width: 50%;"></td>
            <td>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td class="totals-cell">Subtotal:</td>
                  <td class="totals-cell" style="width: 120px; font-weight: bold;">${fmt(inv.subtotal, '')}</td>
                </tr>
                ${inv.discountTotal ? `
                <tr>
                  <td class="totals-cell">Discount:</td>
                  <td class="totals-cell" style="color: #b91c1c;">-${fmt(inv.discountTotal, '')}</td>
                </tr>
                ` : ''}
                <tr>
                  <td class="totals-cell">Tax Total:</td>
                  <td class="totals-cell" style="font-weight: bold;">${fmt(inv.taxTotal, '')}</td>
                </tr>
                <tr>
                  <td class="totals-cell" style="padding-top: 10px;"><span class="grand-total-text">Grand Total:</span></td>
                  <td class="totals-cell" style="padding-top: 10px; width: 120px;"><span class="grand-total-text">${fmt(inv.grandTotal, '')}</span></td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        ${inv.notes ? `
          <div class="footer-note">
            <div style="font-weight: bold; margin-bottom: 4px; color: #475569;">Footnotes:</div>
            <div>${inv.notes}</div>
          </div>
        ` : ''}
      </body>
      </html>
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

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check usage limit for brand new documents
    if (!invoice || invoice.status === 'draft') {
      const allowed = await trackDocumentUsage();
      if (!allowed) return;
    }

    if (items.length === 0) {
      setShowLineItemsError(true);
      emitNotification('Validation Error', 'Please add at least one line item to save.', 'error');
      return;
    }

    let currentName = clientName;
    if (!currentName || !currentName.trim()) {
      currentName = `Guest_${invoiceNumber || Math.random().toString(36).substr(2, 6)}`;
      setClientName(currentName);
    }

    const suffix = activeProfile?.email ? `_${encodeURIComponent(activeProfile.email)}` : '';

    // Save/update to master registry client database (vendors)
    if (currentName && currentName.trim() !== '') {
      const currentRegistry = JSON.parse(localStorage.getItem('makbills_masters_vendors' + suffix) || '[]');
      const nameLower = currentName.trim().toLowerCase();
      const existingIdx = currentRegistry.findIndex((c: any) =>
        (c.name && c.name.toLowerCase() === nameLower) ||
        (c.company && c.company.toLowerCase() === nameLower)
      );

      if (existingIdx > -1) {
        currentRegistry[existingIdx] = {
          ...currentRegistry[existingIdx],
          address: clientAddress || currentRegistry[existingIdx].address || '',
          email: clientEmail || currentRegistry[existingIdx].email || '',
          phone: clientPhone || currentRegistry[existingIdx].phone || '',
        };
      } else {
        currentRegistry.push({
          id: `mat_${Math.random().toString(36).substr(2, 9)}`,
          name: currentName.trim(),
          company: currentName.trim(),
          address: clientAddress || '',
          email: clientEmail || '',
          phone: clientPhone || '',
          category: 'Auto-Added from Invoice'
        });
      }
      localStorage.setItem('makbills_masters_vendors' + suffix, JSON.stringify(currentRegistry));
      window.dispatchEvent(new CustomEvent('makbills_sync_vendors'));
    }

    if (shippedToName && shippedToName.trim() !== '') {
      const currentRegistry = JSON.parse(localStorage.getItem('makbills_masters_transports' + suffix) || '[]');
      const nameLower = shippedToName.trim().toLowerCase();
      const existingIdx = currentRegistry.findIndex((t: any) =>
        (t.name && t.name.toLowerCase() === nameLower)
      );

      const newTransportRecord = {
        name: shippedToName.trim(),
        address: shippedToAddress || '',
        email: shippedToEmail || '',
        phone: shippedToPhone || '',
        gstin: shippedToGstin || '',
        pan: shippedToPan || '',
        state: shippedToState || '',
        country: shippedToCountry || ''
      };

      if (existingIdx > -1) {
        const existing = currentRegistry[existingIdx];
        const isDifferent =
          existing.address !== newTransportRecord.address ||
          existing.email !== newTransportRecord.email ||
          existing.phone !== newTransportRecord.phone ||
          existing.gstin !== newTransportRecord.gstin ||
          existing.pan !== newTransportRecord.pan ||
          existing.state !== newTransportRecord.state ||
          existing.country !== newTransportRecord.country;

        if (isDifferent) {
          currentRegistry[existingIdx] = {
            ...existing,
            ...newTransportRecord
          };
          localStorage.setItem('makbills_masters_transports' + suffix, JSON.stringify(currentRegistry));
          window.dispatchEvent(new CustomEvent('makbills_sync_transports'));
        }
      } else {
        currentRegistry.push({
          id: `trans_${Math.random().toString(36).substr(2, 9)}`,
          ...newTransportRecord
        });
        localStorage.setItem('makbills_masters_transports' + suffix, JSON.stringify(currentRegistry));
        window.dispatchEvent(new CustomEvent('makbills_sync_transports'));
      }
    }

    let finalInvoiceNumber = invoiceNumber;
    if (!finalInvoiceNumber || status === 'draft' || (invoice && invoice.status === 'draft')) {
      const config = getDocTypeConfig(invoiceType);
      finalInvoiceNumber = getNextInvoiceNumber(config.prefix, config.startingNumber, invoices, invoiceType);
    }

    // For new invoices (drafted locally), replace the inv_draft_ ID with a real UUID
    // so the upsert to Supabase uses a valid ID AND the draft cleanup below deletes
    // the old draft without accidentally deleting the newly saved invoice.
    const savedDraftId = draftIdRef.current; // keep reference to old draft ID for cleanup
    const finalInvoiceId = savedDraftId.startsWith('inv_draft_')
      ? crypto.randomUUID()
      : savedDraftId;

    const finalInvoiceObj: Invoice = {
      id: finalInvoiceId,
      userId: userIdRef.current || (invoice ? invoice.userId : 'local'),
      invoiceType,
      invoiceNumber: finalInvoiceNumber,
      referenceNumber: referenceNumber.trim() || undefined,
      poNumber: poNumber.trim() || undefined,
      deliveryNote: deliveryNote.trim() || undefined,
      selectedTemplateStyle,
      selectedCustomTemplateId: activeTemplate.id,
      embeddedTemplate: { ...activeTemplate, selectedCopies },
      qrCodeTriggerUrl: qrCodeTriggerUrl.trim() || undefined,
      date,
      dueDate,
      clientName: invoiceType === 'estimate'
        ? (currentName.trim() || 'Quote / Estimate')
        : (currentName.trim() || (() => {
          const now = new Date();
          const formattedDate = now.toISOString().replace(/T/, ' ').replace(/\..+/, '');
          const guestId = `Guest-${Math.floor(1000 + Math.random() * 9000)}`;
          return `${guestId} (${formattedDate})`;
        })()),
      clientEmail: invoiceType === 'estimate' ? '' : clientEmail.trim(),
      clientPhone: invoiceType === 'estimate' ? '' : clientPhone.trim(),
      clientAddress: invoiceType === 'estimate' ? '' : clientAddress.trim(),
      notes: notes.trim(),
      subtotal: parseFloat(calculatedSubtotal.toFixed(2)),
      discountType,
      discountValue: Number(discountValue),
      discountTotal: parseFloat((totalItemDiscounts + calculatedDiscountTotal).toFixed(2)),
      freightCharges: Number(freightCharges),
      isFreightAdded,
      taxTotal: roundedTaxTotal,
      grandTotal: calculatedGrandTotal,
      status: (status === 'draft' || !status) ? 'pending' : status,
      paidDate: status === 'paid' ? (invoice?.paidDate || new Date().toISOString().split('T')[0]) : undefined,
      items,
      createdAt: (invoice && (invoice.id || '').trim() !== '') ? invoice.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      recurringSettings: isRecurring ? {
        isRecurring: true,
        interval: recurringInterval,
        startDate: recurringStartDate || date,
        endDate: endOption === 'date' && recurringEndDate ? recurringEndDate : undefined,
        hasEnded: false,
        lastGeneratedDate: invoice?.recurringSettings?.lastGeneratedDate || undefined
      } : undefined,
      parentInvoiceId: invoice?.parentInvoiceId || undefined,
      companyState,
      companyCountry,
      clientState,
      clientCountry,
      taxMode,
      customTaxName,
      customTaxPercentage,
      customTaxType,
      clientCompanyName: clientCompanyName ? clientCompanyName.trim() : undefined,
      clientCompany: clientCompanyName ? clientCompanyName.trim() : undefined,
      shippedToCompanyName: shippedToCompanyName ? shippedToCompanyName.trim() : undefined,
      shippedToCompany: shippedToCompanyName ? shippedToCompanyName.trim() : undefined,
      clientGstin: clientGstin.trim() || undefined,
      clientPan: clientPan.trim() || undefined,
      placeOfSupply: placeOfSupply.trim() || undefined,
      grRrNo: grRrNo.trim() || undefined,
      transport: transport.trim() || undefined,
      vehicleNo: vehicleNo.trim() || undefined,
      driverMobile: driverMobile.trim() || undefined,
      station: station.trim() || undefined,
      ewayBillNo: ewayBillNo.trim() || undefined,
      shippedToName: shippedToName.trim() || undefined,
      shippedToPhone: shippedToPhone.trim() || undefined,
      shippedToEmail: shippedToEmail.trim() || undefined,
      shippedToPan: shippedToPan.trim() || undefined,
      shippedToState: shippedToState.trim() || undefined,
      shippedToCountry: shippedToCountry.trim() || undefined,
      shippedToGstin: shippedToGstin.trim() || undefined,
      shippedToAddress: shippedToAddress.trim() || undefined,
      marka: marka.trim() || undefined
    };

    isSavedSuccessfullyRef.current = true;
    try {
      await onSave(finalInvoiceObj);

      // ─── Draft cleanup on successful submit ────────────────────────────────
      // Remove the draft from localStorage so it doesn't show as resumable
      try {
        localStorage.removeItem('makbills_pending_resume_draft');
        setResumableDraft(null);
        // Only clean up temporary drafts from local storage, ensure finalInvoiceObj remains present
        const storageKey = getStorageKey();
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const all = JSON.parse(raw) as any[];
          const filtered = all.filter((i: any) => i.id !== savedDraftId || i.id === finalInvoiceObj.id);
          localStorage.setItem(storageKey, JSON.stringify(filtered));
        }
      } catch { /* ignore */ }
      // Also clean up temporary draft from Supabase (ONLY if savedDraftId was a temp draft)
      if (savedDraftId.startsWith('inv_draft_')) {
        supabase.auth.getSession().then(({ data }) => {
          if (data.session?.user) {
            supabase.from('invoices').delete().eq('id', savedDraftId).then(() => { });
          }
        });
      }
      // ─── Usage tracking: Increment documents_used in subscription_usage table ────
      try {
        if (userIdRef.current) {
          const uId = userIdRef.current;
          const now = new Date();
          const pStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          const pEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

          supabase
            .from('subscription_usage')
            .select('id, documents_used')
            .eq('user_id', uId)
            .gte('period_start', pStart)
            .maybeSingle()
            .then(({ data: existingUsage }) => {
              const curCount = existingUsage?.documents_used ?? 0;
              supabase.from('subscription_usage').upsert({
                user_id: uId,
                period_start: pStart,
                period_end: pEnd,
                documents_used: curCount + 1,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'user_id,period_start' }).then(({ error: usageErr }) => {
                if (usageErr) console.warn('[Subscription Usage Record Warning]', usageErr);
              });
            });
        }
      } catch (uErr) {
        console.warn('[Subscription Usage Record Exception]', uErr);
      }

      // Reset draftIdRef to a new temp draft ID
      draftIdRef.current = `inv_draft_${Math.random().toString(36).substr(2, 9)}`;

      const docTypeNames: Record<string, string> = {
        proforma: 'Proforma Invoice',
        credit_note: 'Credit Note',
        debit_note: 'Debit Note',
        estimate: 'Quotation / Estimate',
        invoice: 'Tax Invoice'
      };
      const docName = docTypeNames[invoiceType] || 'Tax Invoice';
      const notifTitle = invoice ? `${docName} Updated` : `${docName} Created`;

      emitNotification(
        notifTitle,
        `${docName} #${invoiceNumber} for ${clientName || 'Client'} has been saved to your ledger.`,
        'success'
      );

      setSavedInvoiceForPreview({
        ...finalInvoiceObj,
        selectedCopies
      } as any);
    } catch (saveErr) {
      // Save blocked by quota guard or database error — do not show success UI/notification
      console.warn('[InvoiceModal] Save cancelled or failed:', saveErr);
      isSavedSuccessfullyRef.current = false;
    }
  };

    const variables = theme === 'dark' ? `
    :root {
      --ink-deep: #0b1329;
      --ink-panel: #111a36;
      --ink-panel-2: #1b264f;
      --paper: #111a36;
      --paper-dim: #0b1329;
      --paper-line: #223269;
      --stamp-red: #38bdf8;
      --stamp-red-dark: #0284c7;
      --ledger-gold: #60a5fa;
      --text-dark-bg: #f8fafc;
      --text-dark-bg-dim: #94a3b8;
      --text-on-paper: #f8fafc;
      --text-on-paper-dim: #94a3b8;
      --radius-doc: 8px;
      --font-display: 'Fraunces', serif;
      --font-body: 'IBM Plex Sans', sans-serif;
      --font-mono: 'IBM Plex Mono', monospace;
    }
  ` : `
    :root {
      --ink-deep: #f4f9ff;
      --ink-panel: #ffffff;
      --ink-panel-2: #e0f2fe;
      --paper: #ffffff;
      --paper-dim: #f8fafc;
      --paper-line: #bae6fd;
      --stamp-red: #0284c7;
      --stamp-red-dark: #0369a1;
      --ledger-gold: #2563eb;
      --text-dark-bg: #0f172a;
      --text-dark-bg-dim: #475569;
      --text-on-paper: #0f172a;
      --text-on-paper-dim: #475569;
      --radius-doc: 8px;
      --font-display: 'Fraunces', serif;
      --font-body: 'IBM Plex Sans', sans-serif;
      --font-mono: 'IBM Plex Mono', monospace;

      /* Override light brown / warm slate theme colors with clean slate grays */
      --color-slate-50: #f8fafc;
      --color-slate-100: #f1f5f9;
      --color-slate-150: #e2e8f0;
      --color-slate-200: #e2e8f0;
      --color-slate-205: #cbd5e1;
      --color-slate-350: #64748b;
      --color-slate-405: #475569;
      --color-slate-450: #334155;
      --color-slate-550: #1e293b;
      --color-slate-650: #0f172a;
      --color-slate-705: #0f172a;
      --color-slate-750: #020617;
      --color-slate-805: #020617;
      --color-slate-850: #e2e8f0;
      --color-slate-900: #ffffff;
      --color-slate-950: #f8fafc;

      /* Override warm sky colors with clean sky blues */
      --color-sky-50: #f0f9ff;
      --color-sky-100: #e0f2fe;
      --color-sky-102: #e0f2fe;
      --color-sky-305: #7dd3fc;
      --color-sky-600: #0284c7;
      --color-sky-650: #0369a1;
      --color-sky-700: #0369a1;
      --color-sky-750: #075985;
      --color-sky-800: #0c4a6e;
      --color-sky-850: #0a3d5c;
      --color-sky-955: #bae6fd;
    }
  `;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 bg-slate-900/65 backdrop-blur-sm overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: variables }} />
      <div
        id="invoice-editor"
        data-privacy-exempt="true"
        className="w-full h-full md:h-auto md:max-h-[96dvh] max-w-full md:max-w-4xl lg:max-w-5xl xl:max-w-[95vw] 2xl:max-w-[1700px] rounded-none md:rounded-3xl overflow-hidden shadow-2xl flex flex-col border-none md:border transition-all duration-300 md:my-auto master-registry-container invoice-template-builder invoice-modal-container no-privacy-blur" style={{ backgroundColor: "var(--ink-deep)", borderColor: "var(--paper-line)" }}
      >

        {/* ─── Resume Draft Banner ─────────────────────────────────────────── */}
        {resumableDraft && !resumeBannerDismissed && !invoice && (() => {
          const timeAgo = (() => {
            const ms = Date.now() - new Date(resumableDraft.updatedAt).getTime();
            const mins = Math.floor(ms / 60000);
            if (mins < 1) return 'just now';
            if (mins < 60) return `${mins}m ago`;
            const hrs = Math.floor(mins / 60);
            if (hrs < 24) return `${hrs}h ago`;
            return `${Math.floor(hrs / 24)}d ago`;
          })();
          return (
            <div className="resume-draft-banner flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 px-3.5 sm:px-4 py-2.5 text-xs font-medium hide-on-print shrink-0 z-30 transition-all">
              <div className="w-full sm:w-auto flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 dark:bg-amber-400/20 flex items-center justify-center shrink-0 text-amber-800 dark:text-amber-300">
                  <Save className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
                  <span className="font-extrabold text-amber-900 dark:text-amber-100 uppercase tracking-wider text-[10px] bg-amber-200/80 dark:bg-amber-900/80 px-2 py-0.5 rounded-md shrink-0">
                    Unsaved Draft
                  </span>
                  <span className="font-medium truncate">
                    for <span className="client-name font-extrabold">{resumableDraft.clientName}</span>
                  </span>
                  <span className="time-text text-[11px] font-semibold shrink-0">
                    • saved {timeAgo}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-amber-300/40 dark:border-amber-700/40">
                <button
                  type="button"
                  onClick={() => {
                    // Restore draft into form
                    const storageKey = getStorageKey();
                    try {
                      const raw = localStorage.getItem(storageKey);
                      if (!raw) return;
                      const all = JSON.parse(raw) as any[];
                      const d = all.find((i: any) => i.id === resumableDraft.id);
                      if (!d) return;
                      // Reuse the draft's id so future saves update the same record
                      draftIdRef.current = d.id;
                      // Repopulate form
                      setClientName(d.clientName || '');
                      setClientEmail(d.clientEmail || '');
                      setClientPhone(d.clientPhone || '');
                      setClientAddress(d.clientAddress || '');
                      setNotes(d.notes || '');
                      setInvoiceTerms(d.invoiceTerms || '');
                      setItems(d.items || []);
                      setDiscountType(d.discountType || 'none');
                      setDiscountValue(d.discountValue || 0);
                      setReferenceNumber(d.referenceNumber || '');
                      setPoNumber(d.poNumber || '');
                      setDeliveryNote(d.deliveryNote || '');
                      setInvoiceType(d.invoiceType || 'invoice');
                      setClientGstin(d.clientGstin || '');
                      setClientPan(d.clientPan || '');
                      setPlaceOfSupply(d.placeOfSupply || '');
                      setTransport(d.transport || '');
                      setVehicleNo(d.vehicleNo || '');
                      setDriverMobile(d.driverMobile || '');
                      setStation(d.station || '');
                      setEwayBillNo(d.ewayBillNo || '');
                      setClientCompanyName(d.clientCompanyName || d.clientCompany || '');
                      setShippedToCompanyName(d.shippedToCompanyName || d.shippedToCompany || '');
                      setShippedToName(d.shippedToName || '');
                      setShippedToPhone(d.shippedToPhone || '');
                      setShippedToEmail(d.shippedToEmail || '');
                      setShippedToAddress(d.shippedToAddress || '');
                      setShippedToGstin(d.shippedToGstin || '');
                      setShippedToPan(d.shippedToPan || '');
                      setShippedToState(d.shippedToState || '');
                      setShippedToCountry(d.shippedToCountry || '');
                      setClientState(d.clientState || '');
                      setClientCountry(d.clientCountry || 'India');
                      if (d.hasTransport !== undefined) setHasTransport(d.hasTransport);
                      try {
                        localStorage.removeItem('makbills_pending_resume_draft');
                      } catch { /* ignore */ }
                      setResumableDraft(null);
                      setResumeBannerDismissed(true);
                      emitNotification('Draft Restored', 'Your previous draft has been loaded.', 'success');
                    } catch { /* ignore */ }
                  }}
                  className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 dark:bg-amber-500 dark:hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95 text-center"
                >
                  Resume Draft
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const draftIdToDiscard = resumableDraft?.id;
                    try {
                      const storageKey = getStorageKey();
                      const raw = localStorage.getItem(storageKey);
                      if (raw && draftIdToDiscard) {
                        const all = JSON.parse(raw) as any[];
                        // ONLY remove draft records, preserve any real non-draft documents
                        localStorage.setItem(storageKey, JSON.stringify(all.filter((i: any) => i.id !== draftIdToDiscard || i.status !== 'draft')));
                      }
                    } catch { /* ignore */ }
                    // SAFETY CHECK: ONLY delete from Supabase if ID starts with 'inv_draft_'!
                    // NEVER delete real billed documents!
                    if (draftIdToDiscard && draftIdToDiscard.startsWith('inv_draft_')) {
                      try {
                        await supabase.from('invoices').delete().eq('id', draftIdToDiscard);
                      } catch { /* ignore */ }
                    }
                    try {
                      localStorage.removeItem('makbills_pending_resume_draft');
                    } catch { /* ignore */ }
                    setResumableDraft(null);
                    setResumeBannerDismissed(true);
                  }}
                  className="px-2.5 py-1.5 text-amber-900 dark:text-amber-200 hover:bg-amber-200/60 dark:hover:bg-amber-900/60 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center shrink-0"
                >
                  Discard
                </button>
              </div>
            </div>
          );
        })()}

        {/* Header */}
        <div className="px-5 py-3.5 md:px-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 relative overflow-hidden shrink-0" style={{ backgroundColor: "var(--ink-panel)", borderBottomColor: "var(--paper-line)" }}>
          {/* Subtle background glow effect */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#38bdf8] opacity-70"></div>

          <div className="flex items-center justify-between md:justify-start gap-3.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-white to-slate-50 dark:from-zinc-800 dark:to-zinc-900 text-slate-700 dark:text-slate-300 flex items-center justify-center shadow-sm border border-slate-200/80 dark:border-zinc-700/80 relative overflow-hidden shrink-0">
                <ShoppingBag className="w-4 h-4 relative z-10" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <h2 className="text-sm md:text-base font-bold text-slate-805 dark:text-white tracking-tight leading-tight">
                  {invoice ? 'Edit Document' : 'Quick Bill'}
                </h2>
                <div className="flex items-center mt-0.5">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] md:text-[11px] font-mono font-medium bg-slate-100 dark:bg-zinc-800/80 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-zinc-700/80 shadow-xs">
                    <span className="opacity-60 mr-[1px]">#</span>{invoiceNumber}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              title="Close"
            >
              <X className="w-4.5 h-4.5" strokeWidth={2.5} />
            </button>
          </div>

          {/* Document Type Selector: Dropdown on Mobile, Pill Bar on Desktop */}
          {!invoice && (
            <div className="flex items-center gap-1.5 max-w-full">
              {/* Mobile Select Dropdown (< md) */}
              <div className="md:hidden relative inline-flex items-center">
                <select
                  value={invoiceType === 'quote' ? 'estimate' : invoiceType}
                  onChange={(e) => {
                    const newType = e.target.value as any;
                    const currentWip = buildTempInvoiceRef.current(true);
                    if (currentWip) {
                      const hasName = currentWip.clientName && currentWip.clientName.trim() !== '' && !currentWip.clientName.startsWith('Guest-') && currentWip.clientName !== 'Quote / Estimate';
                      const hasItems = Array.isArray(currentWip.items) && currentWip.items.length > 0;
                      if (!isSavedSuccessfullyRef.current && !savedInvoiceForPreview && currentWip && (!invoice || (invoice as any).status === 'draft') && draftIdRef.current.startsWith('inv_draft_')) {
                        const draftToSave = {
                          ...currentWip,
                          id: draftIdRef.current,
                          status: 'draft',
                          updatedAt: new Date().toISOString()
                        };
                        saveDraftToLocalStorage(draftToSave);
                        localStorage.setItem('makbills_pending_resume_draft', draftToSave.id);
                      }
                    }
                    setInvoiceType(newType);
                    loadDefaultTemplate(newType, true);
                    if (!invoice) {
                      const newDefaults = getDocumentTypeDefaults(newType, profile);
                      setNotes(newDefaults.notes);
                      setInvoiceTerms(newDefaults.terms);
                    }
                  }}
                  className="appearance-none pl-3.5 pr-8 py-2 rounded-xl border border-[#bae6fd] dark:border-[#223269]/60 bg-[#e0f2fe]/60 dark:bg-[#1b264f]/70 text-[#0284c7] dark:text-[#38bdf8] font-extrabold text-xs focus:ring-2 focus:ring-[#0284c7]/50 focus:outline-none cursor-pointer shadow-xs transition-all tracking-tight"
                >
                  <option value="invoice">Tax Invoice</option>
                  <option value="proforma">Proforma Invoice</option>
                  <option value="credit_note">Credit Note</option>
                  <option value="estimate">Quote / Estimate</option>
                  <option value="purchases">Purchase Bill</option>
                  <option value="purchase_order">Purchase Order</option>
                  <option value="purchase_debit_note">Debit Note</option>
                </select>
                <ChevronDown className="w-4 h-4 text-[#0369a1] dark:text-[#38bdf8] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={2.5} />
              </div>

              {/* Desktop Pill Tabs (>= md) */}
              <div className="hidden md:flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none max-w-full">
                {[
                  { id: 'invoice', label: 'Tax Invoice' },
                  { id: 'proforma', label: 'Proforma' },
                  { id: 'credit_note', label: 'Credit Note' },
                  { id: 'estimate', label: 'Quote / Est' },
                  { id: 'purchases', label: 'Purchases' },
                  { id: 'purchase_order', label: 'P.O.' },
                  { id: 'purchase_debit_note', label: 'Debit Note' }
                ].map(type => {
                  const isActive = invoiceType === type.id || (type.id === 'estimate' && invoiceType === 'quote');
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => {
                        const newType = type.id as any;
                        // Save WIP draft before switching document type if work was started
                        const currentWip = buildTempInvoiceRef.current(true);
                        if (currentWip) {
                          const hasName = currentWip.clientName && currentWip.clientName.trim() !== '' && !currentWip.clientName.startsWith('Guest-') && currentWip.clientName !== 'Quote / Estimate';
                          const hasItems = Array.isArray(currentWip.items) && currentWip.items.length > 0;
                          if (!isSavedSuccessfullyRef.current && !savedInvoiceForPreview && (!invoice || (invoice as any).status === 'draft') && draftIdRef.current.startsWith('inv_draft_') && (hasName || hasItems)) {
                            const draftToSave = {
                              ...currentWip,
                              id: draftIdRef.current,
                              status: 'draft',
                              updatedAt: new Date().toISOString()
                            };
                            saveDraftToLocalStorage(draftToSave);
                            if (!resumeBannerDismissed) {
                              localStorage.setItem('makbills_pending_resume_draft', draftToSave.id);
                            }
                          }
                        }
                        setInvoiceType(newType);
                        const loadedTmpl = getDocTypeDefaultTemplate(newType);
                        setActiveTemplate(loadedTmpl);
                        if (!invoice) {
                          const newDefaults = getDocumentTypeDefaults(newType, profile);
                          const tmplNotes = loadedTmpl?.config?.terms?.notesText;
                          const tmplTerms = loadedTmpl?.config?.terms?.customText;
                          setNotes(tmplNotes !== undefined && tmplNotes !== null && tmplNotes !== '' ? tmplNotes : (newDefaults.notes || ''));
                          setInvoiceTerms(tmplTerms !== undefined && tmplTerms !== null && tmplTerms !== '' ? tmplTerms : (newDefaults.terms || ''));
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 border ${
                        isActive
                          ? 'bg-[#0284c7] text-white border-[#0284c7] shadow-sm shadow-sky-500/20 scale-[1.02]'
                          : 'bg-slate-100/70 dark:bg-zinc-900 text-slate-650 dark:text-zinc-400 border-slate-200/80 dark:border-zinc-800 hover:bg-slate-200/60 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="hidden md:flex w-8 h-8 items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer focus:outline-none shrink-0"
            title="Close"
          >
            <X className="w-4.5 h-4.5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Toggle Mode Tab + Template Switcher */}
        <div className="flex xl:hidden border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-zinc-950 px-3 sm:px-4 py-2.5 sm:py-3 gap-2 select-none items-center justify-between shadow-xs z-10 relative">
          {/* Primary tab: Live Bill Preview */}
          <button
            type="button"
            onClick={() => setActiveMode('editable')}
            className={`flex-1 justify-center py-2 rounded-lg text-xs sm:text-[13px] font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer ${activeMode === 'editable'
                ? 'bg-[#0284c7] text-white shadow-sm ring-1 ring-slate-900/5'
                : 'text-slate-650 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
          >
            <span>Bill Preview</span>
          </button>

          {/* Secondary tab: Invoice Form Details */}
          <button
            type="button"
            onClick={() => setActiveMode('edit')}
            className={`flex-1 justify-center py-2 rounded-lg text-xs sm:text-[13px] font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer ${activeMode === 'edit'
                ? 'bg-slate-700 text-white shadow-sm ring-1 ring-slate-900/5'
                : 'text-slate-650 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
          >
            <span>Invoice Details</span>
          </button>
        </div>

        {/* Scrollable Contents */}
        <form onSubmit={handleSaveSubmit} className="flex-1 overflow-hidden px-3 sm:px-4 md:px-6 pt-1.5 sm:pt-2 md:pt-2.5 pb-6 sm:pb-8 text-sans text-sm flex flex-col">

          {/* ── AI Smart Billing (isolated module) ─────────────────────────────── */}
          <SmartBillingBox
            activeTemplate={activeTemplate}
            isHighlight={isAiBoxHighlighted || isTutorialHighlight}
            isAllowed={subscriptionTier === 'pro' || subscriptionTier === 'unlimited' || subscriptionTier === 'enterprise'}
            onUpgradeClick={() => {
              onClose();
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('mak_navigate_tab', { detail: 'subscription' }));
              }
            }}
            setters={{
              setClientName, setClientEmail, setClientPhone, setClientAddress,
              setClientGstin, setClientPan, setClientState, setClientCountry,
              setShippedToName, setShippedToPhone, setShippedToEmail, setShippedToAddress,
              setShippedToGstin, setShippedToPan, setShippedToState, setShippedToCountry,
              setTransport, setVehicleNo, setGrRrNo, setDriverMobile, setStation,
              setEwayBillNo, setPlaceOfSupply, setHasTransport,
              setInvoiceNumber, setDate, setDueDate, setPoNumber, setReferenceNumber,
              setDeliveryNote, setNotes, setInvoiceTerms,
              setItems,
              setDiscountValue: (v: number) => setDiscountValue(v),
              setDiscountType: (v: string) => setDiscountType(v as DiscountType),
              setFreightCharges, setIsFreightAdded,
              setInvoiceType: (v: string) => setInvoiceType(v as 'invoice' | 'estimate'),
              setStatus: (v: string) => setStatus(v as InvoiceStatus),
              setTaxMode: (v: string) => setTaxMode(v as 'dynamic' | 'custom'),
              setCustomTaxName, setCustomTaxPercentage,
              setIsRecurring, setRecurringInterval: (v: string) => setRecurringInterval(v as RecurringInterval),
              setAiExtraData,
            }}
            existingState={{
              clientName, clientEmail, clientPhone, clientAddress,
              clientGstin, clientPan, clientState, clientCountry,
              shippedToName, shippedToPhone, shippedToEmail, shippedToAddress,
              shippedToGstin, shippedToPan, shippedToState, shippedToCountry,
              transport, vehicleNo, grRrNo, driverMobile, station, ewayBillNo, placeOfSupply,
              invoiceNumber, date, dueDate, poNumber, referenceNumber, deliveryNote,
              notes, invoiceTerms, items, discountValue, discountType, freightCharges, isFreightAdded,
              invoiceType, status, defaultTaxRate, customTaxCols, registryClients, presets,
              aiExtraData,
            }}
          />

          {/* ──────────────────────────────────────────────────────────────────── */}

          {/* Client Name Required Error Banner (shows on both mobile and desktop when saved without name) */}
          {showClientNameError && !clientName?.trim() && activeTemplate.sections?.billTo?.visible !== false && (
            <div className="mx-1 mb-4 p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-zinc-900/60 dark:to-zinc-900/40 border border-amber-250 dark:border-amber-900/50 rounded-2xl flex items-center gap-2.5 shadow-xs shrink-0">
              <AlertCircle className="w-4.5 h-4.5 shrink-0 text-amber-500" />
              <span className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                Client Name Required
              </span>
            </div>
          )}

          {/* Line Items Required Error Banner (shows on both mobile and desktop when saved without line items) */}
          {showLineItemsError && items.length === 0 && (
            <div className="mx-1 mb-4 p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-zinc-900/60 dark:to-zinc-900/40 border border-amber-250 dark:border-amber-900/50 rounded-2xl flex items-center gap-2.5 shadow-xs shrink-0">
              <AlertCircle className="w-4.5 h-4.5 shrink-0 text-amber-500" />
              <span className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                Please add at least one line item to build the bill.
              </span>
            </div>
          )}

          {/* Wrapper for the two panes */}
          <div className="flex-1 overflow-y-auto xl:overflow-hidden xl:flex xl:flex-row-reverse xl:gap-6">

            {/* Advanced Settings Column */}
            <div className={`xl:w-[45%] xl:block xl:overflow-y-auto xl:pl-2 xl:pr-4 ${activeMode === 'edit' ? 'block' : 'hidden'}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

                {/* COLUMN 1: Setup & Client Metadata */}
                <div className="space-y-4">

                  {/* General Metadata */}
                  <div className="p-3.5 rounded-2xl border space-y-3 shadow-xs" style={{ backgroundColor: "var(--ink-panel)", borderColor: "var(--paper-line)" }}>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label htmlFor="inv-num" className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">ID Number</label>
                        <input
                          id="inv-num"
                          type="text"
                          required
                          value={invoiceNumber}
                          onChange={(e) => setInvoiceNumber(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white font-medium font-mono text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-150 dark:border-slate-900/50 pt-2.5">
                      {(activeTemplate.config.invoiceInfo?.fields.includes('referenceNumber') || Boolean(referenceNumber)) && (
                        <div>
                          <label htmlFor="inv-ref" className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Ref Number (Optional)</label>
                          <input
                            id="inv-ref"
                            type="text"
                            placeholder="REF-202"
                            value={referenceNumber}
                            onChange={(e) => setReferenceNumber(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white font-mono text-xs focus:outline-none"
                          />
                        </div>
                      )}
                      {(activeTemplate.config.invoiceInfo?.fields.includes('poNumber') || Boolean(poNumber)) && (
                        <div>
                          <label htmlFor="inv-po" className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">P.O. Number (Optional)</label>
                          <input
                            id="inv-po"
                            type="text"
                            placeholder="PO-883"
                            value={poNumber}
                            onChange={(e) => setPoNumber(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white font-mono text-xs focus:outline-none"
                          />
                        </div>
                      )}
                      {(activeTemplate.config.invoiceInfo?.fields.includes('deliveryNote') || Boolean(deliveryNote)) && (
                        <div>
                          <label htmlFor="inv-dn" className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Delivery Note (Optional)</label>
                          <input
                            id="inv-dn"
                            type="text"
                            placeholder="DN-102"
                            value={deliveryNote}
                            onChange={(e) => setDeliveryNote(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white font-mono text-xs focus:outline-none"
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-150 dark:border-slate-900/50 pt-2.5">
                      {activeTemplate.config.invoiceInfo?.fields.includes('invoiceDate') && (
                        <div>
                          <label htmlFor="inv-date" className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Issue Date</label>
                          <input
                            id="inv-date"
                            type="date"
                            required
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:outline-none"
                          />
                        </div>
                      )}
                      {activeTemplate.config.invoiceInfo?.fields.includes('dueDate') && (
                        <div>
                          <label htmlFor="inv-duedate" className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Due Date</label>
                          <input
                            id="inv-duedate"
                            type="date"
                            required
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:outline-none"
                          />
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-150 dark:border-slate-900/50 pt-2.5">
                      <label htmlFor="inv-status" className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
                      <select
                        id="inv-status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 dark:text-white font-medium text-[13px] text-slate-800 focus:ring-1 focus:ring-sky-500 focus:outline-none cursor-pointer"
                      >
                        {invoiceType === 'credit_note' || invoiceType === 'purchase_debit_note' ? (
                          <>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Not Approved</option>
                          </>
                        ) : (
                          <>
                            <option value="pending">Unpaid / Pending</option>
                            <option value="paid">Paid</option>
                            <option value="cancelled">Cancelled</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div className="border-t border-slate-150 dark:border-slate-900/50 pt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeTemplate.config.invoiceInfo?.fields?.includes('placeOfSupply') && (
                        <div>
                          <label htmlFor="inv-pos" className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Place of Supply</label>
                          <input id="inv-pos" type="text" value={placeOfSupply} onChange={e => setPlaceOfSupply(e.target.value)} placeholder="Place of Supply" className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:outline-none" />
                        </div>
                      )}
                      {activeTemplate.config.invoiceInfo?.fields?.includes('grRrNo') && (
                        <div>
                          <label htmlFor="inv-gr" className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">GR/RR No.</label>
                          <input id="inv-gr" type="text" value={grRrNo} onChange={e => setGrRrNo(e.target.value)} placeholder="GR/RR No." className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:outline-none" />
                        </div>
                      )}
                    </div>


                  </div>

                  {/* Client Info */}
                  {activeTemplate.sections.billTo?.visible !== false && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1 flex justify-between items-center">
                        <span>Client Details</span>
                        {clients && clients.length > 0 && (
                          <span className="text-[9px] font-medium text-sky-500 font-mono">Select Profile to Auto-Fill</span>
                        )}
                      </h3>

                      {clients && clients.length > 0 && (
                        <div className="bg-sky-50/30 dark:bg-slate-950 p-2.5 rounded-2xl border border-sky-100/20 dark:border-slate-800/65">
                          <label htmlFor="select-pre-client" className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Populate from Clients:</label>
                          <div className="relative" ref={clientDropdownRef}>
                            <div className="relative flex items-center">
                              <input
                                id="select-pre-client"
                                type="text"
                                value={clientSearchQuery}
                                onChange={(e) => {
                                  setClientSearchQuery(e.target.value);
                                  setIsClientDropdownOpen(true);
                                }}
                                onFocus={() => setIsClientDropdownOpen(true)}
                                placeholder="-- Select or type to search client profile --"
                                className="w-full pl-3 pr-16 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white text-xs font-medium focus:ring-1 focus:ring-sky-500 shadow-xs"
                              />
                              <div className="absolute right-1.5 flex items-center gap-1">
                                {clientSearchQuery && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setClientSearchQuery('');
                                      setIsClientDropdownOpen(false);
                                    }}
                                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    title="Clear client filter"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                                  title="Toggle client list"
                                  className="p-1 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer"
                                >
                                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isClientDropdownOpen ? 'rotate-180 text-sky-500' : ''}`} />
                                </button>
                              </div>
                            </div>

                            {/* Dropdown Menu */}
                            {isClientDropdownOpen && filteredClients.length > 0 && (
                              <div className="absolute left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto bg-white dark:bg-slate-900 border border-sky-200 dark:border-slate-700 rounded-xl shadow-xl z-50 divide-y divide-slate-100 dark:divide-slate-800">
                                <div className="px-3 py-1 bg-sky-50/90 dark:bg-slate-800/90 flex items-center justify-between sticky top-0 backdrop-blur-xs z-10">
                                  <span className="text-[10px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
                                    Saved Clients ({filteredClients.length})
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setIsClientDropdownOpen(false)}
                                    className="text-[9px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                  >
                                    Close
                                  </button>
                                </div>
                                {filteredClients.map((c) => {
                                  const comp = (c as any).companyName || (c as any).company;
                                  const displayName = comp ? `${comp} - ${c.name}` : c.name;
                                  return (
                                    <button
                                      key={c.id}
                                      type="button"
                                      onClick={() => {
                                        setClientName(c.name);
                                        setClientCompanyName((c as any).companyName || (c as any).company || '');
                                        setClientEmail(c.email || '');
                                        setClientPhone(c.phone || '');
                                        setClientAddress(c.address || '');
                                        setClientPan((c as any).pan || (c as any).taxId || '');
                                        setClientGstin((c as any).gstin || '');
                                        setClientCountry((c as any).country || (c as any).clientCountry || '');
                                        setClientState((c as any).state || (c as any).clientState || '');
                                        setClientSearchQuery(displayName);
                                        setIsClientDropdownOpen(false);
                                      }}
                                      className="w-full px-3 py-2 text-left hover:bg-sky-50 dark:hover:bg-slate-800/90 transition-colors flex items-center justify-between gap-2 group cursor-pointer"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-sky-600 dark:group-hover:text-sky-400">
                                          {displayName}
                                        </div>
                                        {(c.email || c.phone) && (
                                          <div className="text-[10px] text-slate-400 truncate">
                                            {[c.email, c.phone].filter(Boolean).join(' • ')}
                                          </div>
                                        )}
                                      </div>
                                      {(c as any).gstin && (
                                        <span className="px-1.5 py-0.5 text-[9px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 shrink-0">
                                          GST: {(c as any).gstin}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div>
                        <label htmlFor="col-client-name" className="sr-only">Client Name</label>
                        <input
                          id="col-client-name"
                          type="text"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder="Client Name *"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 dark:text-white text-[13px] text-slate-800 font-medium focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="col-client-company-name" className="sr-only">Client Company Name</label>
                        <input
                          id="col-client-company-name"
                          type="text"
                          value={clientCompanyName}
                          onChange={(e) => setClientCompanyName(e.target.value)}
                          placeholder="Client Company Name"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 dark:text-white text-[13px] text-slate-800 font-medium focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activeTemplate.config.client?.fields.includes('email') && (
                          <div>
                            <label htmlFor="col-client-email" className="sr-only">Client Email</label>
                            <input
                              id="col-client-email"
                              type="email"
                              value={clientEmail}
                              onChange={(e) => setClientEmail(e.target.value)}
                              placeholder="Client Email"
                              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 dark:text-white text-[13px] text-slate-800 font-medium focus:outline-none"
                            />
                          </div>
                        )}
                        {activeTemplate.config.client?.fields.includes('phone') && (
                          <div>
                            <label htmlFor="col-client-phone" className="sr-only">Client Phone</label>
                            <input
                              id="col-client-phone"
                              type="text"
                              value={clientPhone}
                              onChange={(e) => setClientPhone(e.target.value)}
                              placeholder="Client Phone"
                              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 dark:text-white text-[13px] text-slate-800 font-medium focus:outline-none"
                            />
                          </div>
                        )}
                      </div>

                      {activeTemplate.config.client?.fields.includes('address') && (
                        <div>
                          <label htmlFor="col-client-address" className="sr-only">Client Address</label>
                          <textarea
                            id="col-client-address"
                            value={clientAddress}
                            onChange={(e) => setClientAddress(e.target.value)}
                            placeholder="Client Physical Billing Address"
                            rows={1}
                            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 dark:text-white text-[13px] text-slate-800 font-medium focus:outline-none resize-none"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(activeTemplate.config.client?.fields.includes('address') || activeTemplate.config.client?.fields.includes('country')) && (
                          <div>
                            <label htmlFor="client-country" className="sr-only">Client Country</label>
                            <select
                              id="client-country"
                              value={Country.getAllCountries().find(c => c.name === clientCountry)?.isoCode || ''}
                              onChange={(e) => {
                                const selectedCountry = Country.getCountryByCode(e.target.value);
                                if (selectedCountry) {
                                  setClientCountry(selectedCountry.name);
                                  setClientState(''); // Reset state when country changes
                                }
                              }}
                              className={`w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 dark:text-white font-medium text-[13px] focus:outline-none cursor-pointer ${!clientCountry ? 'text-slate-400' : 'text-slate-800 dark:text-white'}`}
                            >
                              <option value="" disabled>Client Country</option>
                              {Country.getAllCountries().map((c) => (
                                <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        {(activeTemplate.config.client?.fields.includes('address') || activeTemplate.config.client?.fields.includes('state')) && (
                          <div>
                            <label htmlFor="client-state" className="sr-only">Client State</label>
                            <select
                              id="client-state"
                              value={(() => {
                                const cCode = Country.getAllCountries().find(c => c.name === clientCountry)?.isoCode;
                                if (!cCode) return '';
                                return State.getStatesOfCountry(cCode).find(s => s.name === clientState)?.isoCode || '';
                              })()}
                              onChange={(e) => {
                                const cCode = Country.getAllCountries().find(c => c.name === clientCountry)?.isoCode;
                                if (cCode) {
                                  const selectedState = State.getStateByCodeAndCountry(e.target.value, cCode);
                                  if (selectedState) {
                                    setClientState(selectedState.name);
                                  }
                                }
                              }}
                              disabled={!clientCountry}
                              className={`w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 dark:text-white font-medium text-[13px] focus:outline-none cursor-pointer disabled:opacity-50 ${!clientState ? 'text-slate-400' : 'text-slate-800 dark:text-white'}`}
                            >
                              <option value="" disabled>Client State</option>
                              {(() => {
                                const cCode = Country.getAllCountries().find(c => c.name === clientCountry)?.isoCode;
                                if (!cCode) return null;
                                return State.getStatesOfCountry(cCode).map((st) => (
                                  <option key={st.isoCode} value={st.isoCode}>{st.name}</option>
                                ));
                              })()}
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activeTemplate.config.client?.fields.includes('gstin') && (
                          <div>
                            <label htmlFor="col-client-gstin" className="sr-only">Client GSTIN / UIN</label>
                            <input
                              id="col-client-gstin"
                              type="text"
                              value={clientGstin}
                              onChange={(e) => setClientGstin(e.target.value)}
                              placeholder="Client GSTIN / UIN"
                              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 dark:text-white text-[13px] text-slate-800 font-medium focus:outline-none"
                            />
                          </div>
                        )}
                        {activeTemplate.config.client?.fields.includes('pan') && (
                          <div>
                            <label htmlFor="col-client-pan" className="sr-only">Client PAN</label>
                            <input
                              id="col-client-pan"
                              type="text"
                              value={clientPan}
                              onChange={(e) => setClientPan(e.target.value)}
                              placeholder="Client PAN"
                              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 dark:text-white text-[13px] text-slate-800 font-medium focus:outline-none"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2">
                      </div>

                      {activeTemplate.sections.shipTo?.visible !== false && (
                        <div className="space-y-3 pt-3 border-t border-slate-150 dark:border-slate-800">
                          {clients && clients.length > 0 && (
                            <div className="bg-sky-50/30 dark:bg-slate-950 p-2.5 rounded-2xl border border-sky-100/20 dark:border-slate-800/65">
                              <label htmlFor="select-pre-client-shipto" className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Populate from Clients:</label>
                              <div className="relative" ref={shipClientDropdownRef}>
                                <div className="relative flex items-center">
                                  <input
                                    id="select-pre-client-shipto"
                                    type="text"
                                    value={shipClientSearchQuery}
                                    onChange={(e) => {
                                      setShipClientSearchQuery(e.target.value);
                                      setIsShipClientDropdownOpen(true);
                                    }}
                                    onFocus={() => setIsShipClientDropdownOpen(true)}
                                    placeholder="-- Select or type to search ship-to client profile --"
                                    className="w-full pl-3 pr-16 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white text-xs font-medium focus:ring-1 focus:ring-sky-500 shadow-xs"
                                  />
                                  <div className="absolute right-1.5 flex items-center gap-1">
                                    {shipClientSearchQuery && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShipClientSearchQuery('');
                                          setIsShipClientDropdownOpen(false);
                                        }}
                                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                        title="Clear client filter"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => setIsShipClientDropdownOpen(!isShipClientDropdownOpen)}
                                      title="Toggle client list"
                                      className="p-1 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer"
                                    >
                                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isShipClientDropdownOpen ? 'rotate-180 text-sky-500' : ''}`} />
                                    </button>
                                  </div>
                                </div>

                                {/* Dropdown Menu */}
                                {isShipClientDropdownOpen && filteredShipClients.length > 0 && (
                                  <div className="absolute left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto bg-white dark:bg-slate-900 border border-sky-200 dark:border-slate-700 rounded-xl shadow-xl z-50 divide-y divide-slate-100 dark:divide-slate-800">
                                    <div className="px-3 py-1 bg-sky-50/90 dark:bg-slate-800/90 flex items-center justify-between sticky top-0 backdrop-blur-xs z-10">
                                      <span className="text-[10px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
                                        Saved Clients ({filteredShipClients.length})
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setIsShipClientDropdownOpen(false)}
                                        className="text-[9px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                      >
                                        Close
                                      </button>
                                    </div>
                                    {filteredShipClients.map((c) => {
                                      const comp = (c as any).companyName || (c as any).company;
                                      const displayName = comp ? `${comp} - ${c.name}` : c.name;
                                      return (
                                        <button
                                          key={c.id}
                                          type="button"
                                          onClick={() => {
                                            setShippedToName(c.name);
                                            setShippedToCompanyName((c as any).companyName || (c as any).company || '');
                                            setShippedToEmail(c.email || '');
                                            setShippedToPhone(c.phone || '');
                                            setShippedToAddress(c.address || '');
                                            setShippedToPan((c as any).pan || (c as any).taxId || '');
                                            setShippedToGstin((c as any).gstin || '');
                                            setShippedToCountry((c as any).country || (c as any).clientCountry || '');
                                            setShippedToState((c as any).state || (c as any).clientState || '');
                                            setShipClientSearchQuery(displayName);
                                            setIsShipClientDropdownOpen(false);
                                          }}
                                          className="w-full px-3 py-2 text-left hover:bg-sky-50 dark:hover:bg-slate-800/90 transition-colors flex items-center justify-between gap-2 group cursor-pointer"
                                        >
                                          <div className="min-w-0 flex-1">
                                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-sky-600 dark:group-hover:text-sky-400">
                                              {displayName}
                                            </div>
                                            {(c.email || c.phone) && (
                                              <div className="text-[10px] text-slate-400 truncate">
                                                {[c.email, c.phone].filter(Boolean).join(' • ')}
                                              </div>
                                            )}
                                          </div>
                                          {(c as any).gstin && (
                                            <span className="px-1.5 py-0.5 text-[9px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 shrink-0">
                                              GST: {(c as any).gstin}
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <h3 className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                              Shipped To Details
                            </h3>
                            <button
                              type="button"
                              onClick={() => {
                                setShippedToCompanyName(clientCompanyName);
                                setShippedToName(clientName);
                                setShippedToEmail(clientEmail);
                                setShippedToPhone(clientPhone);
                                setShippedToAddress(clientAddress);
                                setShippedToGstin(clientGstin);
                                setShippedToPan(clientPan);
                                setShippedToCountry(clientCountry);
                                setShippedToState(clientState);
                              }}
                              className="text-[9px] font-medium text-sky-500 hover:text-sky-600 font-mono flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
                              title="Copy all details from Client/Bill To section"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                              Same as Client
                            </button>
                          </div>
                          {activeTemplate.config.shipping?.fields.includes('name') && (
                            <input type="text" value={shippedToName} onChange={e => setShippedToName(e.target.value)} placeholder="Name" className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 dark:text-white text-[13px] text-slate-800 font-medium focus:outline-none" />
                          )}
                          <input type="text" value={shippedToCompanyName} onChange={e => setShippedToCompanyName(e.target.value)} placeholder="Company Name" className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 dark:text-white text-[13px] text-slate-800 font-medium focus:outline-none" />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(activeTemplate.config.shipping?.fields.includes('address') || activeTemplate.config.shipping?.fields.includes('country')) && (
                              <select
                                value={Country.getAllCountries().find(c => c.name === shippedToCountry)?.isoCode || ''}
                                onChange={(e) => {
                                  const selectedCountry = Country.getCountryByCode(e.target.value);
                                  if (selectedCountry) {
                                    setShippedToCountry(selectedCountry.name);
                                    setShippedToState(''); // Reset state when country changes
                                  }
                                }}
                                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 dark:text-white text-[13px] text-slate-800 font-medium focus:outline-none"
                              >
                                <option value="" disabled>Country</option>
                                {Country.getAllCountries().map((c) => (
                                  <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                                ))}
                              </select>
                            )}
                            {(activeTemplate.config.shipping?.fields.includes('address') || activeTemplate.config.shipping?.fields.includes('state')) && (
                              <select
                                value={(() => {
                                  const cCode = Country.getAllCountries().find(c => c.name === shippedToCountry)?.isoCode;
                                  if (!cCode) return '';
                                  return State.getStatesOfCountry(cCode).find(s => s.name === shippedToState)?.isoCode || '';
                                })()}
                                onChange={(e) => {
                                  const cCode = Country.getAllCountries().find(c => c.name === shippedToCountry)?.isoCode;
                                  if (cCode) {
                                    const selectedState = State.getStateByCodeAndCountry(e.target.value, cCode);
                                    if (selectedState) {
                                      setShippedToState(selectedState.name);
                                    }
                                  }
                                }}
                                disabled={!shippedToCountry}
                                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 dark:text-white text-[13px] text-slate-800 font-medium focus:outline-none disabled:opacity-50"
                              >
                                <option value="" disabled>State</option>
                                {(() => {
                                  const cCode = Country.getAllCountries().find(c => c.name === shippedToCountry)?.isoCode;
                                  if (!cCode) return null;
                                  return State.getStatesOfCountry(cCode).map((st) => (
                                    <option key={st.isoCode} value={st.isoCode}>{st.name}</option>
                                  ));
                                })()}
                              </select>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {activeTemplate.config.shipping?.fields.includes('phone') && (
                              <input type="text" value={shippedToPhone} onChange={e => setShippedToPhone(e.target.value)} placeholder="Phone" className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 dark:text-white text-[13px] text-slate-800 font-medium focus:outline-none" />
                            )}
                            {activeTemplate.config.shipping?.fields.includes('email') && (
                              <input type="email" value={shippedToEmail} onChange={e => setShippedToEmail(e.target.value)} placeholder="Email" className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 dark:text-white text-[13px] text-slate-800 font-medium focus:outline-none" />
                            )}
                            {activeTemplate.config.shipping?.fields.includes('pan') && (
                              <input type="text" value={shippedToPan} onChange={e => setShippedToPan(e.target.value)} placeholder="PAN" className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 dark:text-white text-[13px] text-slate-800 font-medium focus:outline-none" />
                            )}
                            {activeTemplate.config.shipping?.fields.includes('gstin') && (
                              <input type="text" value={shippedToGstin} onChange={e => setShippedToGstin(e.target.value)} placeholder="GSTIN / UIN" className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 dark:text-white text-[13px] text-slate-800 font-medium focus:outline-none" />
                            )}
                          </div>
                          {activeTemplate.config.shipping?.fields.includes('address') && (
                            <textarea value={shippedToAddress} onChange={e => setShippedToAddress(e.target.value)} placeholder="Shipping Address" rows={1} className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 dark:text-white text-[13px] text-slate-800 font-medium focus:outline-none resize-none" />
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Transport Details */}
                  {activeTemplate.sections.transport?.visible !== false && (
                    <div className="space-y-3 pt-4 pb-3 border-t border-slate-150 dark:border-slate-800">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                        <h3 className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                          Transport Details
                        </h3>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={hasTransport}
                            onChange={(e) => setHasTransport(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-gray-600 peer-checked:bg-sky-500"></div>
                        </label>
                      </div>

                      {hasTransport && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {activeTemplate.config.transport?.fields?.includes('transportName') && (
                            <input type="text" value={transport} onChange={e => setTransport(e.target.value)} placeholder="Transport" className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 dark:text-white text-[13px] text-slate-800 font-medium focus:outline-none" />
                          )}
                          {activeTemplate.config.transport?.fields?.includes('vehicleNo') && (
                            <input type="text" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} placeholder="Vehicle No." className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 dark:text-white text-[13px] text-slate-800 font-medium focus:outline-none" />
                          )}
                          {activeTemplate.config.transport?.fields?.includes('driverMobile') && (
                            <input type="text" value={driverMobile} onChange={e => setDriverMobile(e.target.value)} placeholder="Driver Mobile" className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 dark:text-white text-[13px] text-slate-800 font-medium focus:outline-none" />
                          )}
                          {activeTemplate.config.transport?.fields?.includes('station') && (
                            <input type="text" value={station} onChange={e => setStation(e.target.value)} placeholder="Station" className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 dark:text-white text-[13px] text-slate-800 font-medium focus:outline-none" />
                          )}
                          {activeTemplate.config.transport?.fields?.some(f => f.toLowerCase() === 'ewaybillno') && (
                            <input type="text" value={ewayBillNo} onChange={e => setEwayBillNo(e.target.value)} placeholder="E-Way Bill No." className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 dark:text-white text-[13px] text-slate-800 font-medium focus:outline-none" />
                          )}
                          {activeTemplate.config.transport?.fields?.includes('marka') && (
                            <input type="text" value={marka} onChange={e => setMarka(e.target.value)} placeholder="Marka" className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 dark:text-white text-[13px] text-slate-800 font-medium focus:outline-none" />
                          )}
                        </div>
                      )}
                    </div>
                  )}


                </div>

                {/* COLUMN 2: Deliverables, Catalog Presets & Calculations */}
                <div className="space-y-4">


                  {/* Added Invoiced Items List */}
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1">Line Items List ({items.length})</h3>

                    {items.length === 0 ? (
                      <div className="p-5 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center text-xs text-slate-400">
                        No items added. Add a product or service preset item below.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {items.map(item => (
                          <div
                            key={item.id}
                            className="p-3 bg-slate-50 dark:bg-slate-950/80 rounded-2xl flex items-center justify-between border border-slate-55 dark:border-slate-900 relative"
                          >
                            <div className="flex-1 pr-3">
                              <h4 className="font-medium text-slate-800 dark:text-white line-clamp-1">{item.name}</h4>
                              {item.description && <span className="text-[10px] text-slate-400 block line-clamp-1 mt-0.5">{item.description}</span>}

                              {/* Product Type, Size, Discount % and Individual Terms Badges */}
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.productType && (
                                  <span className="text-[9px] bg-slate-150/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400 font-medium">
                                    Type: {item.productType}
                                  </span>
                                )}
                                {item.size && (
                                  <span className="text-[9px] bg-slate-150/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400 font-mono font-medium">
                                    Size: {item.size}
                                  </span>
                                )}
                                {item.discountPercentage !== undefined && item.discountPercentage > 0 && (
                                  <span className="text-[9px] bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/60 px-1.5 py-0.5 rounded text-rose-600 dark:text-rose-400 font-medium">
                                    Disc: -{item.discountPercentage}%
                                  </span>
                                )}
                                {item.itemTerms && (
                                  <span className="text-[9px] bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/60 px-1.5 py-0.5 rounded text-amber-700 dark:text-amber-300 italic">
                                    T&C: {item.itemTerms}
                                  </span>
                                )}
                                {item.hsnCode && (
                                  <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 px-1.5 py-0.5 rounded text-indigo-700 dark:text-indigo-300 font-medium">
                                    HSN: {item.hsnCode}
                                  </span>
                                )}
                              </div>

                              {/* Subdetails tag */}
                              <span className="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400 block mt-1.5">
                                {currencySymbol}{item.rate.toFixed(2)} × {item.quantity}
                              </span>
                            </div>

                            {/* Numeric Quantity Touch Helpers + Remove */}
                            <div className="flex items-center gap-2.5">
                              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-1.5 py-1 rounded-xl shadow-sm">
                                <button
                                  type="button"
                                  onClick={() => updateItemQty(item.id, item.quantity - 1)}
                                  className="w-5 h-5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center font-medium font-sans cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="w-5 text-center text-xs font-medium dark:text-white font-mono">{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => updateItemQty(item.id, item.quantity + 1)}
                                  className="w-5 h-5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center font-medium font-sans cursor-pointer"
                                >
                                  +
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  removeItem(item.id);
                                }}
                                className="p-1.5 rounded-lg text-rose-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/35 transition-colors cursor-pointer"
                                aria-label={`Remove invoice item ${item.name}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Draw/Draft New Custom Line Item */}
                  <div className="p-4 rounded-2xl border space-y-3.5 shadow-sm" style={{ backgroundColor: "var(--ink-panel)", borderColor: "var(--paper-line)" }}>
                    <span className="block text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Add Custom Line Item
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Product/Line Item Name — Searchable Material Catalog Combobox */}
                      <div className="col-span-2 relative" ref={catalogDropdownRef}>
                        <div className="flex items-center justify-between mb-1">
                          <label htmlFor="custom-item-name" className="block text-[10px] text-slate-500 font-medium uppercase">
                            Product Name *
                          </label>
                          {materialCatalogOptions.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setIsCatalogDropdownOpen(!isCatalogDropdownOpen)}
                              className="text-[9.5px] font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer flex items-center gap-0.5"
                            >
                              <Package className="w-3 h-3 text-sky-500" />
                              <span>Catalog ({materialCatalogOptions.length})</span>
                            </button>
                          )}
                        </div>

                        <div className="relative flex items-center">
                          <input
                            id="custom-item-name"
                            type="text"
                            value={newItemName}
                            onChange={(e) => {
                              setNewItemName(e.target.value);
                              setIsCatalogDropdownOpen(true);
                            }}
                            onFocus={() => setIsCatalogDropdownOpen(true)}
                            placeholder="e.g. Standard Software Consulting or select from catalog..."
                            className="w-full pl-3 pr-10 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:text-white font-medium text-xs focus:outline-none focus:border-sky-500 shadow-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setIsCatalogDropdownOpen(!isCatalogDropdownOpen)}
                            title="Toggle Material Catalog Dropdown"
                            className="absolute right-1.5 p-1.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isCatalogDropdownOpen ? 'rotate-180 text-sky-500' : ''}`} />
                          </button>
                        </div>

                        {/* Material Catalog Searchable Dropdown Popup */}
                        {isCatalogDropdownOpen && filteredCatalogOptions.length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1.5 max-h-60 overflow-y-auto bg-white dark:bg-slate-900 border border-sky-200 dark:border-slate-700 rounded-xl shadow-xl z-50 divide-y divide-slate-100 dark:divide-slate-800">
                            <div className="px-3 py-1.5 bg-sky-50/90 dark:bg-slate-800/90 flex items-center justify-between sticky top-0 backdrop-blur-xs z-10">
                              <span className="text-[10px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider flex items-center gap-1">
                                <Package className="w-3.5 h-3.5 text-sky-500" /> Material Catalog
                              </span>
                              <span className="text-[9px] font-semibold text-slate-400 font-mono">
                                {filteredCatalogOptions.length} item{filteredCatalogOptions.length === 1 ? '' : 's'}
                              </span>
                            </div>
                            {filteredCatalogOptions.map((opt, idx) => (
                              <button
                                key={`${opt.name}_${idx}`}
                                type="button"
                                onClick={() => {
                                  setNewItemName(opt.name);
                                  if (opt.rate !== undefined) setNewItemRate(opt.rate);
                                  if (opt.taxPercentage !== undefined) setNewItemTax(opt.taxPercentage);
                                  if (opt.description) setNewItemDesc(opt.description);
                                  if (opt.hsnCode) setNewItemHsnCode(opt.hsnCode);
                                  if (opt.quantityType) setNewItemQtyType(opt.quantityType);
                                  setIsCatalogDropdownOpen(false);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-sky-50 dark:hover:bg-slate-800/90 transition-colors flex items-center justify-between gap-2 group cursor-pointer"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-sky-600 dark:group-hover:text-sky-400">
                                    {opt.name}
                                  </div>
                                  {opt.description && (
                                    <div className="text-[10px] text-slate-400 truncate">
                                      {opt.description}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right shrink-0">
                                  {opt.rate !== undefined && (
                                    <div className="text-xs font-extrabold font-mono text-slate-800 dark:text-slate-200">
                                      {currencySymbol}{opt.rate.toLocaleString('en-IN')}
                                    </div>
                                  )}
                                  {opt.hsnCode && (
                                    <div className="text-[9.5px] text-slate-400 font-mono">
                                      HSN: {opt.hsnCode}
                                    </div>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* SAC & Product Size */}
                      {activeTemplate.config.table.columns.some(c => c.id === 'hsn' && c.visible !== false) && (
                        <div>
                          <label htmlFor="custom-item-hsn" className="block text-[10px] text-slate-500 font-medium uppercase mb-1">HSN Code</label>
                          <input
                            id="custom-item-hsn"
                            type="text"
                            value={newItemHsnCode}
                            onChange={(e) => setNewItemHsnCode(e.target.value)}
                            placeholder="e.g. 998311"
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:text-white text-xs focus:outline-none focus:border-sky-500"
                          />
                        </div>
                      )}
                      {activeTemplate.config.table.columns.some(c => c.id === 'size' && c.visible !== false) && (
                        <div>
                          <label htmlFor="custom-item-size" className="block text-[10px] text-slate-500 font-medium uppercase mb-1">Size (Optional)</label>
                          <input
                            id="custom-item-size"
                            type="text"
                            value={newItemSize}
                            onChange={(e) => setNewItemSize(e.target.value)}
                            list="past-sizes"
                            placeholder="Standard / XL / 1kg"
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:text-white text-xs focus:outline-none focus:border-sky-500"
                          />
                          <datalist id="past-sizes">
                            {pastSizes.map(s => (
                              <option key={s} value={s} />
                            ))}
                          </datalist>
                        </div>
                      )}

                      {/* Price / Rate (Required) */}
                      <div>
                        <label htmlFor="custom-item-rate" className="block text-[10px] text-slate-500 font-medium uppercase mb-1">Rate / Price * ({currencySymbol})</label>
                        <input
                          id="custom-item-rate"
                          type="number"
                          min="0"
                          step="0.01"
                          value={newItemRate || ''}
                          onChange={(e) => setNewItemRate(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:text-white font-medium font-mono text-xs focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      {/* Qty / Amount (Optional, default to 1) */}
                      <div>
                        <label htmlFor="custom-item-qty" className="block text-[10px] text-slate-500 font-medium uppercase mb-1">Qty & Type (Optional)</label>
                        <div className="flex gap-2">
                          <input
                            id="custom-item-qty"
                            type="number"
                            min="1"
                            value={newItemQty || ''}
                            onChange={(e) => setNewItemQty(parseInt(e.target.value) || 0)}
                            placeholder="1"
                            className="w-1/2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:text-white font-medium font-mono text-xs focus:outline-none focus:border-sky-500"
                          />
                          <input
                            id="custom-item-qty-type"
                            type="text"
                            value={newItemQtyType}
                            onChange={(e) => setNewItemQtyType(e.target.value)}
                            placeholder="Nos, Kg..."
                            className="w-1/2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:text-white font-medium font-mono text-xs focus:outline-none focus:border-sky-500"
                          />
                        </div>
                      </div>




                      {/* Particular Product Terms */}
                      {activeTemplate.config.table.columns.some(c => c.id === 'terms' && c.visible !== false) && (
                        <div className="col-span-2">
                          <label htmlFor="custom-item-terms" className="block text-[10px] text-slate-500 font-medium uppercase mb-1">Product Terms (Optional)</label>
                          <input
                            id="custom-item-terms"
                            type="text"
                            value={newItemTerms}
                            onChange={(e) => setNewItemTerms(e.target.value)}
                            placeholder="e.g. 1 year replacement warranty, No refunds"
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:text-white text-xs focus:outline-none focus:border-sky-500"
                          />
                        </div>
                      )}

                      {/* Description */}
                      <div className="col-span-2">
                        <label htmlFor="custom-item-desc" className="block text-[10px] text-slate-400 font-medium uppercase mb-1">Item Description (Optional)</label>
                        <input
                          id="custom-item-desc"
                          type="text"
                          value={newItemDesc}
                          onChange={(e) => setNewItemDesc(e.target.value)}
                          placeholder="Brief service description..."
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:text-white text-xs focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddNewItem}
                      className="w-full py-2.5 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer shadow-md shadow-sky-950/10 border-none"
                    >
                      <Plus className="w-4 h-4" />
                      Add Item to draft
                    </button>
                  </div>

                  {/* Tax, Discounts & Adjustments Calculator panel */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1">Tax Adjustments & Discounts</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-50 dark:border-slate-905">
                      <div className="sm:col-span-2 border-b border-slate-100 dark:border-slate-900 pb-3">
                        <div className="flex items-center justify-between mb-2">
                          <label htmlFor="freight-charges" className="block text-[10px] font-medium text-slate-500 uppercase">Freight Charges ({currencySymbol})</label>
                          <button
                            type="button"
                            onClick={() => {
                              setIsFreightAdded(!isFreightAdded);
                              if (isFreightAdded) setFreightCharges(0);
                            }}
                            className="text-[10px] font-bold uppercase text-[#0284c7] hover:text-[#0369a1] bg-[#e0f2fe] px-2 py-0.5 rounded cursor-pointer transition-colors"
                          >
                            {isFreightAdded ? 'Remove' : 'Add'}
                          </button>
                        </div>
                        {isFreightAdded && (
                          <input
                            id="freight-charges"
                            type="number"
                            min="0"
                            value={freightCharges || ''}
                            onChange={(e) => setFreightCharges(parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 dark:text-white font-medium font-mono text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        )}
                      </div>

                      <div>
                        <label htmlFor="discount-type" className="block text-[10px] font-medium text-slate-500 uppercase">Discount Code / Type</label>
                        <select
                          id="discount-type"
                          value={discountType}
                          onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white text-xs font-medium focus:outline-none"
                        >
                          <option value="none">No Discount</option>
                          <option value="percent">Percentage (%)</option>
                          <option value="flat">Flat Amount ({currencySymbol})</option>
                        </select>
                      </div>

                      {discountType !== 'none' && (
                        <div>
                          <label htmlFor="discount-val" className="block text-[10px] font-medium text-slate-500 uppercase">
                            {discountType === 'percent' ? 'Discount Rate (%)' : `Discount Value (${currencySymbol})`}
                          </label>
                          <input
                            id="discount-val"
                            type="number"
                            min="0"
                            value={discountValue || ''}
                            onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white font-medium font-mono text-xs focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recurring Schedule Option */}
                  <div className="p-3.5 rounded-2xl border space-y-3 shadow-xs" style={{ backgroundColor: "var(--ink-panel)", borderColor: "var(--paper-line)" }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div>
                          <span className="block text-xs font-extrabold text-slate-100 dark:text-white" style={{ color: "var(--text-dark-bg, #f8fafc)" }}>Recurring Invoice Settings</span>
                          <span className="text-[10px] text-slate-300 dark:text-slate-300 block" style={{ color: "var(--text-dark-bg-dim, #cbd5e1)" }}>Auto-generate copies of this bill on selected schedules</span>
                        </div>
                        {(subscriptionTier === 'free' || subscriptionTier === 'basic') && (
                          <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-1" />
                        )}
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isRecurring}
                          onChange={(e) => {
                            if (subscriptionTier === 'free' || subscriptionTier === 'basic') {
                              emitNotification('Plan Limit', 'Recurring invoice scheduler is available on Professional and Enterprise plans. Upgrade to unlock.', 'warning');
                              onClose();
                              if (typeof window !== 'undefined') {
                                window.dispatchEvent(new CustomEvent('mak_navigate_tab', { detail: 'subscription' }));
                              }
                              return;
                            }
                            setIsRecurring(e.target.checked);
                            if (e.target.checked && !recurringStartDate) {
                              setRecurringStartDate(date || new Date().toISOString().split('T')[0]);
                            }
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-250 peer-focus:outline-none rounded-full peer dark:bg-slate-750 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-sky-600"></div>
                      </label>
                    </div>

                    {isRecurring && (
                      <div className="space-y-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/65 grid grid-cols-1 sm:grid-cols-2 gap-3 transition-all duration-300">
                        <div className="col-span-1">
                          <label htmlFor="recurring-interval" className="block text-[10px] font-bold text-slate-300 dark:text-slate-300 uppercase tracking-wide" style={{ color: "var(--text-dark-bg-dim, #cbd5e1)" }}>Billing Frequency</label>
                          <select
                            id="recurring-interval"
                            value={recurringInterval}
                            onChange={(e) => setRecurringInterval(e.target.value as RecurringInterval)}
                            className="w-full px-2 py-1.5 mt-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white text-xs font-medium focus:outline-none"
                          >
                            <option value="weekly">Weekly</option>
                            <option value="bi-weekly">Bi-weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                          </select>
                        </div>

                        <div className="col-span-1">
                          <label htmlFor="recurring-start" className="block text-[10px] font-bold text-slate-300 dark:text-slate-300 uppercase tracking-wide" style={{ color: "var(--text-dark-bg-dim, #cbd5e1)" }}>First Bill Date</label>
                          <input
                            id="recurring-start"
                            type="date"
                            required={isRecurring}
                            value={recurringStartDate}
                            onChange={(e) => setRecurringStartDate(e.target.value)}
                            className="w-full px-2 py-1.5 mt-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white text-xs font-medium focus:outline-none"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-slate-300 dark:text-slate-300 uppercase tracking-wide mb-1" style={{ color: "var(--text-dark-bg-dim, #cbd5e1)" }}>Ending Criteria</label>
                          <div className="flex items-center gap-4 text-xs font-semibold text-slate-200 dark:text-slate-200 mt-1" style={{ color: "var(--text-dark-bg, #f8fafc)" }}>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name="recurring-end"
                                checked={endOption === 'indefinite'}
                                onChange={() => setEndOption('indefinite')}
                                className="text-sky-600 focus:ring-sky-500 scale-95"
                              />
                              Continuous Indefinite
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name="recurring-end"
                                checked={endOption === 'date'}
                                onChange={() => setEndOption('date')}
                                className="text-sky-600 focus:ring-sky-500 scale-95"
                              />
                              End by Specific Date
                            </label>
                          </div>

                          {endOption === 'date' && (
                            <div className="mt-2.5">
                              <label htmlFor="recurring-end-by" className="sr-only">Ending Date</label>
                              <input
                                id="recurring-end-by"
                                type="date"
                                required={endOption === 'date'}
                                value={recurringEndDate}
                                onChange={(e) => setRecurringEndDate(e.target.value)}
                                className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white text-xs font-medium focus:outline-none"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Custom Invoice Notes */}
                  <div>
                    <label htmlFor="invoice-notes" className="block text-xs font-bold text-slate-100 dark:text-white mb-1" style={{ color: "var(--text-dark-bg, #f8fafc)" }}>Custom Footnotes / Payment Instructions</label>
                    <textarea
                      id="invoice-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Please wire to Account 8820-2212, SWIFT CORPNY."
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white text-xs focus:outline-none resize-none"
                    />
                  </div>

                  {/* Custom Invoice Terms & Conditions */}
                  <div>
                    <label htmlFor="invoice-terms" className="block text-xs font-bold text-slate-100 dark:text-white mb-1" style={{ color: "var(--text-dark-bg, #f8fafc)" }}>Invoice Terms & Conditions (Jurisdictional/MSME)</label>
                    <textarea
                      id="invoice-terms"
                      value={invoiceTerms}
                      onChange={(e) => setInvoiceTerms(e.target.value)}
                      placeholder="Specify jurisdictional, Indian MSME, fallback penalty terms or standard compliance."
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white text-xs focus:outline-none resize-none"
                    />
                  </div>

                  {/* GEOGRAPHIC TAX ENGINE CONTROLLER */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3" style={{ backgroundColor: "var(--ink-panel)", borderColor: "var(--paper-line)" }}>
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-100 dark:text-white" style={{ color: "var(--text-dark-bg, #f8fafc)" }}>
                          Tax Compliance & Policies
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded-md uppercase border border-sky-800/50">
                        {taxClassification.name}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 dark:text-slate-200 leading-relaxed font-medium" style={{ color: "var(--text-dark-bg-dim, #cbd5e1)" }}>
                      {taxClassification.desc}
                    </p>

                    <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-2">
                      <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-300 dark:text-slate-300" style={{ color: "var(--text-dark-bg-dim, #cbd5e1)" }}>Tax Application Mode</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1.5 text-xs text-slate-200 dark:text-slate-200 font-semibold cursor-pointer" style={{ color: "var(--text-dark-bg, #f8fafc)" }}>
                          <input
                            type="radio"
                            name="tax-mode-toggle"
                            checked={taxMode === 'dynamic'}
                            onChange={() => setTaxMode('dynamic')}
                            className="text-sky-600 focus:ring-sky-500"
                          />
                          Auto Regional Tax
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-slate-200 dark:text-slate-200 font-semibold cursor-pointer" style={{ color: "var(--text-dark-bg, #f8fafc)" }}>
                          <input
                            type="radio"
                            name="tax-mode-toggle"
                            checked={taxMode === 'custom'}
                            onChange={() => setTaxMode('custom')}
                            className="text-sky-600 focus:ring-sky-500"
                          />
                          Custom Tax Override
                        </label>
                      </div>

                      {taxMode === 'custom' && (
                        <div className="space-y-3 pt-1.5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label htmlFor="custom-tax-name" className="block text-[9px] font-bold text-slate-300 dark:text-slate-300 uppercase" style={{ color: "var(--text-dark-bg-dim, #cbd5e1)" }}>Tax Label/Name</label>
                              <input
                                id="custom-tax-name"
                                type="text"
                                value={customTaxName}
                                onChange={(e) => {
                                  setCustomTaxName(e.target.value);
                                  if (customTaxCols.length === 1) {
                                    setCustomTaxCols([e.target.value || 'Tax']);
                                  }
                                }}
                                placeholder="e.g. VAT"
                                className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-lg dark:text-white focus:outline-none focus:border-sky-500"
                              />
                            </div>
                            <div>
                              <label htmlFor="custom-tax-rate-val" className="block text-[9px] font-bold text-slate-300 dark:text-slate-300 uppercase" style={{ color: "var(--text-dark-bg-dim, #cbd5e1)" }}>Override Rate (%)</label>
                              <input
                                id="custom-tax-rate-val"
                                type="number"
                                value={customTaxPercentage}
                                onChange={(e) => setCustomTaxPercentage(parseFloat(e.target.value) || 0)}
                                placeholder="e.g. 15"
                                className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono rounded-lg dark:text-white focus:outline-none focus:border-sky-500"
                              />
                            </div>
                          </div>

                          <div>
                            <button
                              type="button"
                              className="w-full py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-300 dark:text-slate-300 hover:text-sky-400 dark:hover:text-sky-400 hover:border-sky-500 hover:bg-sky-950/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                              onClick={() => setAdditionalTaxes([...additionalTaxes, { id: Date.now().toString(), name: 'Additional Tax', rate: 0 }])}
                              style={{ color: "var(--text-dark-bg-dim, #cbd5e1)" }}
                            >
                              <Plus size={14} strokeWidth={3} /> Add more taxes
                            </button>
                            {additionalTaxes.length > 0 && (
                              <div className="space-y-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/50">
                                {additionalTaxes.map((tax, index) => (
                                  <div key={tax.id} className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end relative group">
                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-300 dark:text-slate-300 uppercase mb-1" style={{ color: "var(--text-dark-bg-dim, #cbd5e1)" }}>Additional Tax Name</label>
                                      <input
                                        type="text"
                                        value={tax.name}
                                        onChange={(e) => {
                                          const newTaxes = [...additionalTaxes];
                                          newTaxes[index].name = e.target.value;
                                          setAdditionalTaxes(newTaxes);
                                        }}
                                        className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-lg dark:text-white focus:outline-none focus:border-sky-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-300 dark:text-slate-300 uppercase mb-1" style={{ color: "var(--text-dark-bg-dim, #cbd5e1)" }}>Rate (%)</label>
                                      <div className="relative">
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.1"
                                          value={tax.rate}
                                          onChange={(e) => {
                                            const newTaxes = [...additionalTaxes];
                                            newTaxes[index].rate = parseFloat(e.target.value) || 0;
                                            setAdditionalTaxes(newTaxes);
                                          }}
                                          className="w-full px-2 py-1.5 pr-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-lg dark:text-white focus:outline-none focus:border-sky-500"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newTaxes = [...additionalTaxes];
                                            newTaxes.splice(index, 1);
                                            setAdditionalTaxes(newTaxes);
                                          }}
                                          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-opacity"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* TAX CALCULATOR OUTPUT DISPLAY */}
                  <div className="p-4 bg-sky-50/50 dark:bg-slate-950 text-slate-805 rounded-3xl border border-sky-100/35 dark:border-slate-900 space-y-2.5 document-summary-section document-summary no-privacy-blur" data-privacy-exempt="true">
                    <span className="block text-xs font-medium uppercase tracking-wider text-sky-700 dark:text-sky-400">Tax Calculator Calculations</span>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-500 dark:text-slate-400 font-medium">
                        <span>Subtotal base</span>
                        <span>{currencySymbol}{calculatedSubtotal.toFixed(2)}</span>
                      </div>

                      {freightCharges > 0 && (
                        <div className="flex justify-between text-slate-500 dark:text-slate-400 font-medium">
                          <span>Freight Charges</span>
                          <span>+{currencySymbol}{freightCharges.toFixed(2)}</span>
                        </div>
                      )}

                      {discountType !== 'none' && (
                        <div className="flex justify-between text-rose-500 font-medium">
                          <span>Subtotal Discount ({discountType === 'percent' ? `${discountValue}%` : 'Flat'})</span>
                          <span>-{currencySymbol}{calculatedDiscountTotal.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-slate-500 dark:text-slate-400 font-medium">
                        <span>Calculated Tax Accruals</span>
                        <span>{currencySymbol}{roundedTaxTotal.toFixed(2)}</span>
                      </div>

                      <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between font-medium text-slate-805 text-sm">
                        <span>Grand Total Invoice Bill</span>
                        <span className="text-sky-600 dark:text-sky-400 font-mono">{currencySymbol}{calculatedGrandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* Invoice Layout Column */}
            <div className={`xl:w-[55%] xl:block xl:overflow-y-auto ${activeMode === 'editable' ? 'block' : 'hidden'}`}>
              {(() => {
                const previewHeight = measuredEditableHeight;
                const previewContainerHeight = previewHeight * modalPreviewScale;
                return (
                  <div style={{ width: 794 * modalPreviewScale, height: previewContainerHeight, transition: 'all 0.2s ease' }} className="shrink-0 mx-auto relative xl:mx-0 xl:-mb-[135px]">
                    <div
                      ref={editablePreviewRef}
                      id="pdf-export-content-editable"
                      data-privacy-exempt="true"
                      className="origin-top-left absolute top-0 left-0 flex flex-col paper-sheet-light bg-white text-slate-900 shadow-md invoice-modal-container invoice-preview-container master-registry-container invoice-template-builder no-privacy-blur"
                      style={{
                        width: '794px',
                        height: 'auto',
                        transform: `scale(${modalPreviewScale})`,
                        transformOrigin: 'top left',
                        transition: 'transform 0.2s ease',
                      }}
                    >
                      <LivePreview
                        template={activeTemplate}
                        invoiceData={liveInvoiceData || invoice || {}}
                        businessProfile={activeProfile}
                        currencySymbol={currencySymbol}
                        isInteractive={true}
                        clients={registryClients}
                        onUpdateField={(field, val) => {
                          if (field === 'invoiceNumber') setInvoiceNumber(val);
                          if (field === 'date') setDate(val);
                          if (field === 'dueDate') setDueDate(val);
                          if (field === 'clientName') {
                            setClientName(val);
                            const matched = registryClients.find(c => c.name?.trim().toLowerCase() === val.trim().toLowerCase() || c.company?.trim().toLowerCase() === val.trim().toLowerCase() || c.companyName?.trim().toLowerCase() === val.trim().toLowerCase());
                            if (matched) {
                              if ((matched as any).companyName || (matched as any).company) {
                                setClientCompanyName((matched as any).companyName || (matched as any).company);
                              }
                              if (matched.email) setClientEmail(matched.email);
                              if (matched.phone) setClientPhone(matched.phone);
                              if (matched.address) setClientAddress(matched.address);
                              if ((matched as any).gstin || (matched as any).clientGstin) {
                                setClientGstin((matched as any).gstin || (matched as any).clientGstin);
                              }
                              if ((matched as any).state || (matched as any).clientState) {
                                setClientState((matched as any).state || (matched as any).clientState);
                              }
                              if ((matched as any).country || (matched as any).clientCountry) {
                                setClientCountry((matched as any).country || (matched as any).clientCountry);
                              }
                              if ((matched as any).pan || (matched as any).clientPan) {
                                setClientPan((matched as any).pan || (matched as any).clientPan);
                              }
                            }
                          }
                          if (field === 'clientEmail') setClientEmail(val);
                          if (field === 'clientPhone') setClientPhone(val);
                          if (field === 'clientAddress') setClientAddress(val);
                          if (field === 'clientGstin') setClientGstin(val);
                          if (field === 'clientState') setClientState(val);
                          if (field === 'clientCountry') setClientCountry(val);
                          if (field === 'shippedToName') {
                            setShippedToName(val);
                            const matched = registryClients.find(c => c.name?.trim().toLowerCase() === val.trim().toLowerCase() || c.company?.trim().toLowerCase() === val.trim().toLowerCase() || c.companyName?.trim().toLowerCase() === val.trim().toLowerCase());
                            if (matched) {
                              if ((matched as any).companyName || (matched as any).company) {
                                setShippedToCompanyName((matched as any).companyName || (matched as any).company);
                              }
                              if (matched.email) setShippedToEmail(matched.email);
                              if (matched.phone) setShippedToPhone(matched.phone);
                              if (matched.address) setShippedToAddress(matched.address);
                              if ((matched as any).gstin || (matched as any).clientGstin) {
                                setShippedToGstin((matched as any).gstin || (matched as any).clientGstin);
                              }
                              if ((matched as any).state || (matched as any).clientState) {
                                setShippedToState((matched as any).state || (matched as any).clientState);
                              }
                              if ((matched as any).country || (matched as any).clientCountry) {
                                setShippedToCountry((matched as any).country || (matched as any).clientCountry);
                              }
                              if ((matched as any).pan || (matched as any).clientPan) {
                                setShippedToPan((matched as any).pan || (matched as any).clientPan);
                              }
                            }
                          }
                          if (field === 'shippedToPhone') setShippedToPhone(val);
                          if (field === 'shippedToEmail') setShippedToEmail(val);
                          if (field === 'shippedToPan') setShippedToPan(val);
                          if (field === 'shippedToAddress') setShippedToAddress(val);
                          if (field === 'shippedToGstin') setShippedToGstin(val);
                          if (field === 'shippedToState') setShippedToState(val);
                          if (field === 'shippedToCountry') setShippedToCountry(val);
                          if (field === 'placeOfSupply') setPlaceOfSupply(val);
                          if (field === 'grRrNo') setGrRrNo(val);
                          if (field === 'transport') setTransport(val);
                          if (field === 'vehicleNo') setVehicleNo(val);
                          if (field === 'driverMobile') setDriverMobile(val);
                          if (field === 'station') setStation(val);
                          if (field === 'ewayBillNo') setEwayBillNo(val);
                          if (field === 'marka') setMarka(val);
                          if (field === 'clientCompanyName') setClientCompanyName(val);
                          if (field === 'shippedToCompanyName') setShippedToCompanyName(val);
                          if (field === 'invoiceTerms') setInvoiceTerms(val);
                          if (field === 'notes') setNotes(val);
                          if (field === 'poNumber') setPoNumber(val);
                          if (field === 'deliveryNote') setDeliveryNote(val);
                          if (field === 'referenceNumber') setReferenceNumber(val);
                          if (field === 'discountType') setDiscountType(val as any);
                          if (field === 'discountValue') {
                            const parsed = parseFloat(val);
                            const numericVal = !isNaN(parsed) ? parsed : 0;
                            setDiscountValue(numericVal);
                            if (numericVal > 0 && discountType === 'none') {
                              setDiscountType('flat');
                            }
                          }
                          if (field === 'freightCharges') {
                            const parsed = parseFloat(val);
                            setFreightCharges(!isNaN(parsed) ? parsed : 0);
                          }
                          if (field === 'isFreightAdded') {
                            setIsFreightAdded(val === 'true');
                            if (val === 'false') setFreightCharges(0);
                          }
                        }}
                        onInteractiveAddItem={handleAddItem}
                        onInteractiveRemoveItem={handleInteractiveRemoveItem}
                        onUpdateItemField={(itemId, field, val) => {
                          setItems(prev => prev.map(item => item.id === itemId ? { ...item, [field]: val } : item));
                        }}
                        onCopyBillingToShipping={() => {
                          setShippedToCompanyName(clientCompanyName);
                          setShippedToName(clientName);
                          setShippedToPhone(clientPhone);
                          setShippedToEmail(clientEmail);
                          setShippedToCountry(clientCountry);
                          setShippedToState(clientState);
                          setShippedToAddress(clientAddress);
                          setShippedToGstin(clientGstin);
                          setShippedToPan(clientPan);
                        }}
                        hasTransport={hasTransport}
                        onUpdateHasTransport={setHasTransport}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>

          </div> {/* End Wrapper */}

          <div className="pt-4 border-t flex flex-wrap items-center justify-between sm:justify-end gap-2.5 sm:gap-3.5 hide-on-print w-full shrink-0 mt-2 px-6 pb-2 bg-slate-50 dark:bg-[#0b1329] border-slate-200 dark:border-[#223269]/60">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-3 sm:px-5 py-2.5 sm:py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-all cursor-pointer text-center border border-slate-200 dark:border-zinc-700 shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAsDraft}
              className="flex px-3 sm:px-5 py-2.5 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-[#1b264f] dark:hover:bg-[#223269] dark:text-[#38bdf8] rounded-xl text-xs font-bold items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-300 dark:border-[#223269] shadow-2xs"
              title="Save as Draft"
            >
              <Save className="w-4 h-4 shrink-0 text-slate-600 dark:text-[#38bdf8]" />
              <span className="hidden sm:inline">Save as Draft</span>
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-none justify-center px-3 sm:px-6 py-2.5 sm:py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-sky-950/20 active:scale-95 cursor-pointer border border-[#0284c7]"
            >
              <Check className="w-4 h-4 shrink-0 stroke-[3]" />
              <span className="whitespace-nowrap">Save</span>
            </button>
          </div>

        </form>
      </div>

      {savedInvoiceForPreview && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 md:p-4 bg-[#0b1329]/80 backdrop-blur-md animate-in fade-in duration-300 no-privacy-blur" data-privacy-exempt="true">
          <div className="w-full h-full md:h-[92dvh] max-w-full md:max-w-5xl lg:max-w-6xl xl:max-w-7xl bg-white dark:bg-[#111a36] rounded-none md:rounded-3xl overflow-hidden shadow-2xl border-none md:border md:border-[#bae6fd]/30 dark:md:border-[#223269]/60 flex flex-col animate-in zoom-in-95 duration-200 doc-preview-modal invoice-preview-container no-privacy-blur" data-privacy-exempt="true">
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-[#bae6fd]/30 dark:border-[#223269]/50 bg-[#f4f9ff] dark:bg-[#0b1329] flex items-center justify-between relative">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner shrink-0">
                  <Check className="w-5 h-5" strokeWidth={3} />
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-black text-[#0f172a] dark:text-white uppercase tracking-wide">
                    Document Saved Successfully!
                  </h3>
                  <p className="text-[10px] md:text-[11px] text-[#64748b]/80 dark:text-zinc-400 mt-0.5">
                    {savedInvoiceForPreview.invoiceType?.toUpperCase() ?? 'INVOICE'} #{savedInvoiceForPreview.invoiceNumber} for {savedInvoiceForPreview.clientName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem('makbills_pending_resume_draft');
                  setSavedInvoiceForPreview(null);
                  onClose();
                }}
                className="text-[10px] font-black uppercase tracking-widest text-[#0284c7] dark:text-[#38bdf8] cursor-pointer px-4 py-2 rounded-xl bg-[#e0f2fe] dark:bg-[#1b264f] hover:bg-[#bae6fd]/40 dark:hover:bg-[#1b264f]/80 transition-all hover:scale-105 active:scale-95 shrink-0"
              >
                Close Dialog
              </button>
            </div>

            {/* Split Content */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              {/* Left pane: Actions & Stats */}
              <div className="w-full md:w-[380px] shrink-0 border-b md:border-b-0 md:border-r border-[#bae6fd]/30 dark:border-[#223269]/50 p-4 md:p-6 flex flex-col justify-between overflow-y-auto max-h-[45vh] md:max-h-none space-y-4 md:space-y-6 order-2 md:order-1">
                <div className="space-y-6">
                  {/* Summary card */}
                  <div className="hidden md:block p-4 rounded-2xl border border-[#bae6fd] dark:border-[#223269]/60 bg-white dark:bg-[#111a36] space-y-3 shadow-xs document-summary-section document-summary no-privacy-blur" data-privacy-exempt="true">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-[#64748b]/80 dark:text-zinc-400">
                      Billing Summary
                    </span>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between text-slate-500 dark:text-zinc-400 font-medium">
                        <span>Subtotal</span>
                        <span>{currencySymbol}{savedInvoiceForPreview.subtotal.toFixed(2)}</span>
                      </div>
                      {savedInvoiceForPreview.discountTotal > 0 && (
                        <div className="flex justify-between text-rose-500 font-medium">
                          <span>Discount</span>
                          <span>-{currencySymbol}{savedInvoiceForPreview.discountTotal.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-500 dark:text-zinc-400 font-medium">
                        <span>Tax Total</span>
                        <span>{currencySymbol}{savedInvoiceForPreview.taxTotal.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-[#bae6fd]/50 dark:border-[#223269]/50 pt-3 flex justify-between font-black text-slate-805 text-sm dark:text-white">
                        <span>Grand Total</span>
                        <span className="text-[#0284c7] dark:text-[#38bdf8] font-mono text-base">
                          {currencySymbol}{savedInvoiceForPreview.grandTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dispatch / Share Actions */}
                  <div className="space-y-2.5">
                    <span className="block text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                      Share & Dispatch
                    </span>
                    
                    <button
                      type="button"
                      onClick={() => triggerWhatsAppShare(savedInvoiceForPreview)}
                      className="w-full flex items-center justify-center gap-2 p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer shadow-emerald-500/10"
                    >
                      <Smartphone className="w-4 h-4 shrink-0" />
                      Share via WhatsApp
                    </button>

                    <button
                      type="button"
                      onClick={() => triggerEmailShare(savedInvoiceForPreview)}
                      className="w-full flex items-center justify-center gap-2 p-3 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer shadow-sky-500/10"
                    >
                      <Mail className="w-4 h-4 shrink-0" />
                      Dispatch via Email
                    </button>
                  </div>

                  {/* Download Options */}
                  <div className="space-y-2.5">
                    <span className="block text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                      Local Export
                    </span>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => exportInvoicePDFAsync(savedInvoiceForPreview, activeProfile, 'save', savedInvoiceForPreview.embeddedTemplate || activeTemplate)}
                        className="flex items-center justify-center gap-1.5 p-2.5 bg-[#f4f9ff] dark:bg-[#111a36] text-[#0f172a] dark:text-white hover:bg-[#e0f2fe]/40 dark:hover:bg-[#1b264f]/40 rounded-xl text-xs font-bold cursor-pointer transition-all border border-[#bae6fd] dark:border-[#223269]/50"
                      >
                        <FileDown className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>Export PDF</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExportMSWord(savedInvoiceForPreview)}
                        className="flex items-center justify-center gap-1.5 p-2.5 bg-[#f4f9ff] dark:bg-[#111a36] text-[#0f172a] dark:text-white hover:bg-[#e0f2fe]/40 dark:hover:bg-[#1b264f]/40 rounded-xl text-xs font-bold cursor-pointer transition-all border border-[#bae6fd] dark:border-[#223269]/50"
                      >
                        <FileDown className="w-4 h-4 text-blue-500 shrink-0" />
                        <span>Word Doc</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDirectPrint(savedInvoiceForPreview)}
                        className="col-span-2 flex items-center justify-center gap-1.5 p-2.5 bg-[#f4f9ff] dark:bg-[#111a36] text-[#0f172a] dark:text-white hover:bg-[#e0f2fe]/40 dark:hover:bg-[#1b264f]/40 rounded-xl text-xs font-bold cursor-pointer transition-all border border-[#bae6fd] dark:border-[#223269]/50"
                      >
                        <Printer className="w-4 h-4 text-violet-500 shrink-0" />
                        <span>Print Document</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#bae6fd]/30 dark:border-[#223269]/50 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (savedInvoiceForPreview?.id) {
                        window.location.href = `/invoice/preview?id=${savedInvoiceForPreview.id}`;
                      }
                    }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.97] cursor-pointer shadow-md shadow-emerald-950/10 flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View Full Page Preview</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem('makbills_pending_resume_draft');
                      setSavedInvoiceForPreview(null);
                      onClose();
                    }}
                    className="w-full py-2.5 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-xl text-xs font-bold transition-all active:scale-[0.97] cursor-pointer shadow-md shadow-sky-950/10"
                  >
                    Finish and Close
                  </button>
                </div>
              </div>

              {/* Right pane: Document Preview */}
              {(() => {
                const previewHeight = measuredSuccessHeight;
                return (
                  <div className="flex-1 p-4 md:p-6 overflow-auto flex flex-col items-center justify-start order-1 md:order-2 border-l border-[#bae6fd]/30 dark:border-[#223269]/50 space-y-4" style={{ backgroundColor: "var(--ink-deep)" }}>
                    {/* Copy Selector Checkboxes on Success Preview Screen */}
                    <div className="w-full max-w-[794px] bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl p-4 flex flex-wrap items-center gap-6 justify-center shadow-xs">
                      {[
                        { key: 'customer', label: 'Customer' },
                        { key: 'transport', label: 'Transport' },
                        { key: 'supplier', label: 'Supplier' },
                        { key: 'challan', label: 'Delivery Challan' },
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-2 text-xs font-bold text-slate-705 dark:text-zinc-300 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={!!((savedInvoiceForPreview as any)?.selectedCopies?.[key])}
                            onChange={(e) => {
                              const currentCopies = (savedInvoiceForPreview as any)?.selectedCopies || { customer: true };
                              const updatedCopies = { ...currentCopies, [key]: e.target.checked };
                              if (Object.values(updatedCopies).some(Boolean)) {
                                const updatedInvoice = {
                                  ...savedInvoiceForPreview,
                                  selectedCopies: updatedCopies,
                                  embeddedTemplate: {
                                    ...(savedInvoiceForPreview?.embeddedTemplate || activeTemplate),
                                    selectedCopies: updatedCopies,
                                  },
                                } as Invoice;
                                setSavedInvoiceForPreview(updatedInvoice);
                                // Persist so other devices see the selection
                                onSave(updatedInvoice);
                              }
                            }}
                            className="w-4.5 h-4.5 rounded border-[#bae6fd] text-[#0284c7] focus:ring-[#0284c7] cursor-pointer"
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>

                    <div 
                      className="relative shrink-0"
                      style={{ 
                        width: 794 * successPreviewScale, 
                        height: previewHeight * successPreviewScale, 
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div
                        ref={successPreviewRef}
                        className="absolute top-0 left-0 origin-top-left paper-sheet-light bg-white text-slate-900 shadow-md"
                        style={{
                          width: '794px',
                          height: 'auto',
                          transform: `scale(${successPreviewScale})`,
                        }}
                      >
                        <LivePreview
                          template={savedInvoiceForPreview.embeddedTemplate || activeTemplate}
                          invoiceData={savedInvoiceForPreview}
                          businessProfile={activeProfile}
                          currencySymbol={currencySymbol}
                          isInteractive={false}
                          isPrintMode={false}
                          clients={[]}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
