import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { X, Plus, Trash2, Check, Sparkles, AlertCircle, ShoppingBag, Settings, Download, Save, FileText, ArrowDown, Loader2 } from 'lucide-react';
import { Invoice, TaxClassification, InvoiceItem, InvoiceStatus, DiscountType, PresetItem, ClientProfile, RecurringInterval, BusinessProfile, InvoiceTemplate } from '../types';
import { EditableField } from './EditableField';
import { exportInvoicePDFAsync } from '../lib/pdfExporter';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { LivePreview } from './TemplateBuilder/LivePreview';
import { Country, State } from 'country-state-city';
import { TEMPLATE_PRESETS, getDefaultTemplatePreset } from '../lib/templatePresets';
import { supabase } from '../lib/supabase';
import { emitNotification } from '../lib/notifications';
import { SmartBillingBox } from './SmartBillingBox';


interface InvoiceModalProps {
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
}

const getNextInvoiceNumber = (prefixInput: string, startingInput: any, invoicesList: Invoice[], docType: string = 'invoice') => {
  const defaultPrefixes: Record<string, string> = {
    invoice: 'INV',
    proforma: 'PRO',
    debit_note: 'DN',
    credit_note: 'CN',
    estimate: 'EST',
    quote: 'EST'
  };
  const prefix = prefixInput ? String(prefixInput).trim() : (defaultPrefixes[docType] || 'INV');
  const starting = startingInput !== undefined && startingInput !== null && String(startingInput).trim() !== '' ? String(startingInput).trim() : '1';

  const currentYear = new Date().getFullYear();
  const formatPrefix = `${prefix}-${currentYear}-`; // e.g. "INV-2026-"

  // Extract digits from starting input suffix
  const match = starting.match(/^(.*?)(\d+)$/);
  const startNumStr = match ? match[2] : '1';
  const startNum = parseInt(startNumStr, 10);
  const padLength = Math.max(4, startNumStr.length);

  let maxNum = startNum - 1;
  if (invoicesList && invoicesList.length > 0) {
    invoicesList.forEach(inv => {
      const invNum = inv.invoiceNumber || '';
      if (invNum.startsWith(formatPrefix)) {
        const suffix = invNum.substring(formatPrefix.length);
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
  invoice,
  presets,
  clients,
  invoices,
  profile,
  currencySymbol,
  defaultTaxRate,
  isOpen,
  onClose,
  onSave
}: InvoiceModalProps) {
  // GUI Preview and Form Edit State
  const [activeMode, setActiveMode] = useState<'edit' | 'preview' | 'editable'>('editable');

  // Master Registry Client Database loader
  const [registryClients, setRegistryClients] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      const cached = localStorage.getItem('makbills_masters_vendors');
      if (cached) {
        try {
          setRegistryClients(JSON.parse(cached));
        } catch (e) { }
      }
    }
  }, [isOpen]);

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

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280) { // 1280px is xl
        const fitScale = Math.max(0.35, Math.min(0.88, (window.innerWidth - 32) / 794));
        setModalPreviewScale(fitScale);
      } else {
        setModalPreviewScale(0.88);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Advanced features and billing options
  const [invoiceType, setInvoiceType] = useState<'invoice' | 'proforma' | 'debit_note' | 'credit_note' | 'estimate' | 'quote'>('invoice');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [selectedTemplateStyle, setSelectedTemplateStyle] = useState<string>('professional');
  const [qrCodeTriggerUrl, setQrCodeTriggerUrl] = useState('');

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
    const docTypeDefaultKey = `makbills_default_template_${docType}`;
    const userSelectedDocDefaultId = localStorage.getItem(docTypeDefaultKey);
    const globalDefaultId = localStorage.getItem('makbills_global_default_template');
    const targetId = userSelectedDocDefaultId || globalDefaultId;

    const savedCustom = localStorage.getItem('makbills_custom_templates');
    let customTemplates: InvoiceTemplate[] = [];
    if (savedCustom) {
      try {
        customTemplates = JSON.parse(savedCustom);
      } catch (e) {}
    }

    if (targetId) {
      const matchCustom = customTemplates.find(t => t.id === targetId);
      if (matchCustom) return matchCustom;
      const matchSystem = TEMPLATE_PRESETS.find(t => t.id === targetId);
      if (matchSystem) return matchSystem;
    }

    // Map doc type to default MakInvoices Original template variant
    const presetDocMap: Record<string, string> = {
      invoice: 'preset_makinvoices_invoice',
      proforma: 'preset_makinvoices_proforma',
      debit_note: 'preset_makinvoices_debit_note',
      credit_note: 'preset_makinvoices_credit_note',
      estimate: 'preset_makinvoices_quotation',
      quote: 'preset_makinvoices_quotation'
    };
    const defaultPresetId = presetDocMap[docType] || 'preset_makinvoices_invoice';
    return TEMPLATE_PRESETS.find(t => t.id === defaultPresetId) || getDefaultTemplatePreset();
  }, []);

  // Helper: load the correct default template from storage
  const loadDefaultTemplate = useCallback((typeToUse?: string) => {
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
      setInvoiceNumber(invoice.invoiceNumber);
      setDate(invoice.date);
      setDueDate(invoice.dueDate);
      setClientName(invoice.clientName);
      setClientEmail(invoice.clientEmail);
      setClientPhone(invoice.clientPhone);
      setClientAddress(invoice.clientAddress);
      setNotes(invoice.notes);
      setInvoiceTerms(invoice.invoiceTerms || '');
      setStatus(invoice.status);
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
      setHasTransport(!!(invoice.placeOfSupply || invoice.transport || invoice.grRrNo || invoice.vehicleNo || invoice.driverMobile || invoice.station || invoice.ewayBillNo));
      setPlaceOfSupply(invoice.placeOfSupply || '');
      setGrRrNo(invoice.grRrNo || '');
      setTransport(invoice.transport || '');
      setVehicleNo(invoice.vehicleNo || '');
      setDriverMobile(invoice.driverMobile || '');
      setStation(invoice.station || '');
      setEwayBillNo(invoice.ewayBillNo || '');
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
    } else {
      // Set default for new invoice
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const dueStr = new Date(now.setDate(now.getDate() + 14)).toISOString().split('T')[0];
      const initialConfig = getDocTypeConfig('invoice');
      const defaultNumber = getNextInvoiceNumber(initialConfig.prefix, initialConfig.startingNumber, invoices, 'invoice');

      setInvoiceNumber(defaultNumber);
      setDate(dateStr);
      setDueDate(dueStr);
      setClientName('');
      setClientEmail('');
      setClientPhone('');
      setClientAddress('');
      setNotes('Thank you for your business!');
      setInvoiceTerms('Standard Net-15 terms apply. Unresolved overdue balances are subject to three times the RBI bank rate penalties under Indian MSME guidelines.');
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
      pFix = activeProfile.proformaPrefix || profile.proformaPrefix || 'PRO';
      sNum = activeProfile.startingProformaNumber || profile.startingProformaNumber || '1';
    } else if (type === 'debit_note') {
      pFix = activeProfile.debitNotePrefix || profile.debitNotePrefix || 'DN';
      sNum = activeProfile.startingDebitNoteNumber || profile.startingDebitNoteNumber || '1';
    } else if (type === 'credit_note') {
      pFix = activeProfile.creditNotePrefix || profile.creditNotePrefix || 'CN';
      sNum = activeProfile.startingCreditNoteNumber || profile.startingCreditNoteNumber || '1';
    } else if (type === 'estimate' || type === 'quote') {
      pFix = activeProfile.quotePrefix || profile.quotePrefix || 'EST';
      sNum = activeProfile.startingQuoteNumber || profile.startingQuoteNumber || '1';
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
  }, [
    activeProfile.startingInvoiceNumber, profile.startingInvoiceNumber, activeProfile.invoicePrefix, profile.invoicePrefix,
    activeProfile.startingProformaNumber, profile.startingProformaNumber, activeProfile.proformaPrefix, profile.proformaPrefix,
    activeProfile.startingDebitNoteNumber, profile.startingDebitNoteNumber, activeProfile.debitNotePrefix, profile.debitNotePrefix,
    activeProfile.startingCreditNoteNumber, profile.startingCreditNoteNumber, activeProfile.creditNotePrefix, profile.creditNotePrefix,
    activeProfile.startingQuoteNumber, profile.startingQuoteNumber, activeProfile.quotePrefix, profile.quotePrefix,
    invoices, isOpen, invoice, invoiceType, getDocTypeConfig
  ]);

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
              setActiveProfile(prev => ({
                ...prev,
                logoUrl: settings.logo_url || prev.logoUrl,
                signature: settings.signature_url || prev.signature,
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
                startingQuoteNumber: settings.starting_quote_number || profile.startingQuoteNumber || prev.startingQuoteNumber
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
      subtotal: parseFloat(calculatedSubtotal.toFixed(2)),
      discountType,
      discountValue: Number(discountValue),
      discountTotal: parseFloat((totalItemDiscounts + calculatedDiscountTotal).toFixed(2)),
      freightCharges: Number(freightCharges),
      taxTotal: roundedTaxTotal,
      grandTotal: calculatedGrandTotal,
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
      shippedToName: silent ? shippedToName : (shippedToName.trim() || undefined),
      shippedToPhone: silent ? shippedToPhone : (shippedToPhone.trim() || undefined),
      shippedToEmail: silent ? shippedToEmail : (shippedToEmail.trim() || undefined),
      shippedToPan: silent ? shippedToPan : (shippedToPan.trim() || undefined),
      shippedToState: silent ? shippedToState : (shippedToState.trim() || undefined),
      shippedToCountry: silent ? shippedToCountry : (shippedToCountry.trim() || undefined),
      shippedToGstin: silent ? shippedToGstin : (shippedToGstin.trim() || undefined),
      shippedToAddress: silent ? shippedToAddress : (shippedToAddress.trim() || undefined),
      customTaxCols
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
    transport, vehicleNo, driverMobile, station, ewayBillNo, grRrNo,
    placeOfSupply, calculatedSubtotal, roundedTaxTotal, calculatedGrandTotal,
    poNumber, deliveryNote, referenceNumber, invoiceType
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
        await exportInvoicePDFAsync(tempInvoice, activeProfile, 'save', activeTemplate);
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
  const draftIdRef = useRef<string>(invoice?.id ?? `inv_draft_${Math.random().toString(36).substr(2, 9)}`);

  // Tracks the real authenticated userId — updated whenever the session is available.
  // Used by buildAndSave() so sendBeacon payloads always carry the correct userId.
  const userIdRef = useRef<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.id) userIdRef.current = data.session.user.id;
    });
  }, []);

  // Reset draftId when the modal opens for a brand-new invoice
  useEffect(() => {
    if (isOpen && !invoice) {
      draftIdRef.current = `inv_draft_${Math.random().toString(36).substr(2, 9)}`;
    } else if (isOpen && invoice) {
      draftIdRef.current = invoice.id;
    }
  }, [isOpen, invoice]);

  // Resume draft banner state
  const [resumableDraft, setResumableDraft] = useState<{ id: string; clientName: string; updatedAt: string } | null>(null);
  const [resumeBannerDismissed, setResumeBannerDismissed] = useState(false);

  // On modal open for a NEW invoice — check for any unsaved draft to offer resuming.
  useEffect(() => {
    if (!isOpen || invoice) return; // only for new invoices
    setResumeBannerDismissed(false);

    const userEmail = localStorage.getItem('makbills_custom_email');
    const suffix = userEmail ? `_${encodeURIComponent(userEmail)}` : '';
    const storageKey = `invoice_maker_invoices${suffix}`;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setResumableDraft(null);
        return;
      }
      const all = JSON.parse(raw) as any[];
      const pendingDraftId = localStorage.getItem('makbills_pending_resume_draft');

      let targetDraft = null;
      if (pendingDraftId) {
        targetDraft = all.find(i => i.id === pendingDraftId && i.status === 'draft');
      }

      if (!targetDraft) {
        targetDraft = all
          .filter(i =>
            i.status === 'draft' &&
            ((i.clientName && i.clientName.trim() !== '') || (Array.isArray(i.items) && i.items.length > 0))
          )
          .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())[0];
      }

      if (targetDraft) {
        setResumableDraft({
          id: targetDraft.id,
          clientName: targetDraft.clientName || 'Untitled Draft',
          updatedAt: targetDraft.updatedAt || new Date().toISOString()
        });
      } else {
        setResumableDraft(null);
      }
    } catch {
      setResumableDraft(null);
    }
  }, [isOpen, invoice]);

  // Helper: get the correct storage key for this user
  const getStorageKey = useCallback(() => {
    const userEmail = localStorage.getItem('makbills_custom_email');
    const suffix = userEmail ? `_${encodeURIComponent(userEmail)}` : '';
    return `invoice_maker_invoices${suffix}`;
  }, []);

  // Core save-to-localStorage function (synchronous, safe for unload)
  const saveDraftToLocalStorage = useCallback((draftInvoice: any) => {
    try {
      const storageKey = getStorageKey();
      const raw = localStorage.getItem(storageKey);
      const all = raw ? JSON.parse(raw) : [];
      const idx = all.findIndex((i: any) => i.id === draftInvoice.id);
      if (idx > -1) all[idx] = draftInvoice;
      else all.push(draftInvoice);
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
    if (!isOpen) return;

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
          await supabase.from('invoices').upsert({ ...draftToSave, userId: session.user.id });
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
    isOpen, clientName, clientEmail, clientPhone, clientAddress, notes, invoiceTerms,
    items, discountType, discountValue, referenceNumber, poNumber, deliveryNote,
    shippedToName, shippedToPhone, shippedToEmail, shippedToAddress,
    transport, vehicleNo, driverMobile, station, ewayBillNo, grRrNo, placeOfSupply,
  ]);

  // ─── Unload handlers: beforeunload + visibilitychange ──────────────────────
  useEffect(() => {
    const buildAndSave = () => {
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

    if (!clientName || !clientName.trim()) {
      setShowClientNameError(true);
      emitNotification('Validation Error', 'Client Name is required to build the invoice.', 'error');
      return;
    }

    if (items.length === 0) {
      setShowLineItemsError(true);
      emitNotification('Validation Error', 'Please add at least one line item to build the bill.', 'error');
      return;
    }

    const draftInvoice = buildTempInvoice(true);
    if (!draftInvoice) return;

    const draftId = invoice ? invoice.id : `inv_${Math.random().toString(36).substr(2, 9)}`;

    onSave({
      ...draftInvoice,
      status: 'draft',
      id: draftId,
    });

    emitNotification('Draft Saved', `Invoice draft for ${clientName} has been saved.`, 'success');
    onClose();
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName || !clientName.trim()) {
      setShowClientNameError(true);
      emitNotification('Validation Error', 'Client Name is required to build the invoice.', 'error');
      return;
    }

    if (items.length === 0) {
      setShowLineItemsError(true);
      emitNotification('Validation Error', 'Please add at least one line item to build the bill.', 'error');
      return;
    }

    // Save/update to master registry client database (vendors)
    if (clientName && clientName.trim() !== '') {
      const currentRegistry = [...registryClients];
      const nameLower = clientName.trim().toLowerCase();
      const existingIdx = currentRegistry.findIndex(c =>
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
          name: clientName.trim(),
          company: clientName.trim(),
          address: clientAddress || '',
          email: clientEmail || '',
          phone: clientPhone || '',
          category: 'Auto-Added from Invoice'
        });
      }
      localStorage.setItem('makbills_masters_vendors', JSON.stringify(currentRegistry));
      window.dispatchEvent(new CustomEvent('makbills_sync_vendors'));
    }

    if (shippedToName && shippedToName.trim() !== '') {
      const currentRegistry = JSON.parse(localStorage.getItem('makbills_masters_transports') || '[]');
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
          localStorage.setItem('makbills_masters_transports', JSON.stringify(currentRegistry));
          window.dispatchEvent(new CustomEvent('makbills_sync_transports'));
        }
      } else {
        currentRegistry.push({
          id: `trans_${Math.random().toString(36).substr(2, 9)}`,
          ...newTransportRecord
        });
        localStorage.setItem('makbills_masters_transports', JSON.stringify(currentRegistry));
        window.dispatchEvent(new CustomEvent('makbills_sync_transports'));
      }
    }

    onSave({
      id: invoice ? invoice.id : `inv_${Math.random().toString(36).substr(2, 9)}`,
      userId: invoice ? invoice.userId : 'local',
      invoiceType,
      invoiceNumber,
      referenceNumber: referenceNumber.trim() || undefined,
      poNumber: poNumber.trim() || undefined,
      deliveryNote: deliveryNote.trim() || undefined,
      selectedTemplateStyle,
      selectedCustomTemplateId: activeTemplate.id,
      embeddedTemplate: activeTemplate,
      qrCodeTriggerUrl: qrCodeTriggerUrl.trim() || undefined,
      date,
      dueDate,
      clientName: invoiceType === 'estimate'
        ? (clientName.trim() || 'Quote / Estimate')
        : (clientName.trim() || (() => {
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
      taxTotal: roundedTaxTotal,
      grandTotal: calculatedGrandTotal,
      status,
      paidDate: status === 'paid' ? (invoice?.paidDate || new Date().toISOString().split('T')[0]) : undefined,
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
      invoiceTerms,
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
      shippedToGstin: shippedToGstin.trim() || undefined,
      shippedToAddress: shippedToAddress.trim() || undefined
    });

    // ─── Draft cleanup on successful submit ────────────────────────────────
    // Remove the draft from localStorage so it doesn't show as resumable
    try {
      const storageKey = getStorageKey();
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const all = JSON.parse(raw) as any[];
        const filtered = all.filter((i: any) => i.id !== draftIdRef.current);
        localStorage.setItem(storageKey, JSON.stringify(filtered));
      }
    } catch { /* ignore */ }
    // Also clean up from Supabase if online
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user && draftIdRef.current.startsWith('inv_draft_')) {
        supabase.from('invoices').delete().eq('id', draftIdRef.current).then(() => { });
      }
    });

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

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 bg-slate-900/65 backdrop-blur-sm overflow-hidden">
      <div
        id="invoice-editor"
        className="w-full h-full md:h-auto md:max-h-[96dvh] max-w-full md:max-w-4xl lg:max-w-5xl xl:max-w-[95vw] 2xl:max-w-[1700px] bg-white dark:bg-slate-900 rounded-none md:rounded-3xl overflow-hidden shadow-2xl flex flex-col border-none md:border md:border-slate-100 dark:md:border-slate-800 transition-all duration-300 md:my-auto"
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
                      setGrRrNo(d.grRrNo || '');
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
                      setResumableDraft(null);
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
                    // Discard: remove from localStorage + Supabase
                    try {
                      const storageKey = getStorageKey();
                      const raw = localStorage.getItem(storageKey);
                      if (raw) {
                        const all = JSON.parse(raw) as any[];
                        localStorage.setItem(storageKey, JSON.stringify(all.filter((i: any) => i.id !== resumableDraft.id)));
                      }
                    } catch { /* ignore */ }
                    try {
                      await supabase.from('invoices').delete().eq('id', resumableDraft.id);
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
        <div className="px-5 py-3.5 md:px-6 border-b border-slate-200/70 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-zinc-950 relative overflow-hidden shrink-0">
          {/* Subtle background glow effect */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 via-sky-300 to-transparent opacity-70"></div>

          <div className="flex items-center justify-between md:justify-start gap-3.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-white to-slate-50 dark:from-zinc-800 dark:to-zinc-900 text-slate-700 dark:text-slate-300 flex items-center justify-center shadow-sm border border-slate-200/80 dark:border-zinc-700/80 relative overflow-hidden shrink-0">
                <ShoppingBag className="w-4 h-4 relative z-10" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <h2 className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
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

          {/* Document Type Selector Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none max-w-full">
            {[
              { id: 'invoice', label: 'Tax Invoice' },
              { id: 'proforma', label: 'Proforma' },
              { id: 'debit_note', label: 'Debit Note' },
              { id: 'credit_note', label: 'Credit Note' },
              { id: 'estimate', label: 'Quote / Est' }
            ].map(type => {
              const isActive = invoiceType === type.id || (type.id === 'estimate' && invoiceType === 'quote');
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setInvoiceType(type.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 border ${
                    isActive
                      ? 'bg-sky-600 text-white border-sky-600 shadow-sm shadow-sky-600/20 scale-[1.02]'
                      : 'bg-slate-100/70 dark:bg-zinc-900 text-slate-650 dark:text-zinc-400 border-slate-200/80 dark:border-zinc-800 hover:bg-slate-200/60 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {type.label}
                </button>
              );
            })}
          </div>

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
                ? 'bg-sky-600 text-white shadow-sm ring-1 ring-slate-900/5'
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
              setAiExtraData, setActiveTemplate,
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
          {showClientNameError && !clientName?.trim() && (
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
                  <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-900 space-y-3">
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
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 dark:text-white font-medium text-[13px] text-slate-800 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                      >
                        <option value="pending">Unpaid</option>
                        <option value="paid">Paid</option>
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
                          <select
                            id="select-pre-client"
                            onChange={(e) => {
                              const selectedId = e.target.value;
                              const found = clients.find(c => c.id === selectedId);
                              if (found) {
                                setClientName(found.name);
                                setClientEmail(found.email || '');
                                setClientPhone(found.phone || '');
                                setClientAddress(found.address || '');
                                setClientPan((found as any).pan || (found as any).taxId || '');
                              }
                            }}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white text-xs font-medium focus:ring-1 focus:ring-sky-500"
                            defaultValue=""
                          >
                            <option value="" disabled>-- Select a pre-saved client profile --</option>
                            {clients.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.name} {c.companyName ? `(${c.companyName})` : ''}
                              </option>
                            ))}
                          </select>
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
                          <div className="flex items-center justify-between">
                            <h3 className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                              Shipped To Details
                            </h3>
                            <button
                              type="button"
                              onClick={() => {
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
                                onClick={() => removeItem(item.id)}
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
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3.5 shadow-sm">
                    <span className="block text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Add Custom Line Item
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Product/Line Item Name */}
                      <div className="col-span-2">
                        <label htmlFor="custom-item-name" className="block text-[10px] text-slate-500 font-medium uppercase mb-1">Product Name *</label>
                        <input
                          id="custom-item-name"
                          type="text"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          list="past-names"
                          placeholder="e.g. Standard Software Consulting"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:text-white font-medium text-xs focus:outline-none focus:border-sky-500"
                        />
                        <datalist id="past-names">
                          {pastNames.map(name => (
                            <option key={name} value={name} />
                          ))}
                        </datalist>
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
                      className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer shadow-md shadow-sky-900/20 border-none"
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
                            className="text-[10px] font-bold uppercase text-sky-600 hover:text-sky-700 bg-sky-50 px-2 py-0.5 rounded cursor-pointer transition-colors"
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
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="block text-xs font-medium text-slate-800 dark:text-slate-200">Recurring Invoice Settings</span>
                        <span className="text-[10px] text-slate-400 block">Auto-generate copies of this bill on selected schedules</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isRecurring}
                          onChange={(e) => {
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
                          <label htmlFor="recurring-interval" className="block text-[10px] font-medium text-slate-500 uppercase">Billing Frequency</label>
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
                          <label htmlFor="recurring-start" className="block text-[10px] font-medium text-slate-500 uppercase">First Bill Date</label>
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
                          <label className="block text-[10px] font-medium text-slate-400 uppercase mb-1">Ending Criteria</label>
                          <div className="flex items-center gap-4 text-xs font-medium text-slate-705 dark:text-slate-300 mt-1">
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
                    <label htmlFor="invoice-notes" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Custom Footnotes / Payment Instructions</label>
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
                    <label htmlFor="invoice-terms" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Invoice Terms & Conditions (Jurisdictional/MSME)</label>
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
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100/70 dark:border-slate-900 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-900/50 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-emerald-600 rounded-full animate-ping"></span>
                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          Tax Compliance & Policies
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-sky-600 bg-sky-50 dark:bg-sky-950/50 px-2 py-0.5 rounded-md uppercase">
                        {taxClassification.name}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {taxClassification.desc}
                    </p>

                    <div className="pt-2.5 border-t border-slate-150 dark:border-slate-800 space-y-2">
                      <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Tax Application Mode</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                          <input
                            type="radio"
                            name="tax-mode-toggle"
                            checked={taxMode === 'dynamic'}
                            onChange={() => setTaxMode('dynamic')}
                            className="text-sky-600 focus:ring-sky-500"
                          />
                          Auto Regional Tax
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
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
                              <label htmlFor="custom-tax-name" className="block text-[9px] font-medium text-slate-400 dark:text-slate-550 uppercase">Tax Label/Name</label>
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
                              <label htmlFor="custom-tax-rate-val" className="block text-[9px] font-medium text-slate-400 dark:text-slate-550 uppercase">Override Rate (%)</label>
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
                              className="w-full py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-[11px] font-medium text-slate-500 hover:text-sky-600 hover:border-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                              onClick={() => setAdditionalTaxes([...additionalTaxes, { id: Date.now().toString(), name: 'Additional Tax', rate: 0 }])}
                            >
                              <Plus size={14} strokeWidth={3} /> Add more taxes
                            </button>
                            {additionalTaxes.length > 0 && (
                              <div className="space-y-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/50">
                                {additionalTaxes.map((tax, index) => (
                                  <div key={tax.id} className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end relative group">
                                    <div>
                                      <label className="block text-[9px] font-medium text-slate-400 dark:text-slate-550 uppercase mb-1">Additional Tax Name</label>
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
                                      <label className="block text-[9px] font-medium text-slate-400 dark:text-slate-550 uppercase mb-1">Rate (%)</label>
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
                  <div className="p-4 bg-sky-50/50 dark:bg-slate-950 text-slate-805 rounded-3xl border border-sky-100/35 dark:border-slate-900 space-y-2.5">
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
              <div style={{ width: 794 * modalPreviewScale, height: 1123 * modalPreviewScale, transition: 'all 0.2s ease' }} className="shrink-0 mx-auto relative xl:mx-0 xl:-mb-[135px]">
                <div
                  id="pdf-export-content-editable"
                  className="shadow-sm bg-white origin-top-left absolute top-0 left-0 flex flex-col border border-slate-200 dark:border-slate-300 p-4 sm:p-8 xl:p-5"
                  style={{
                    width: '794px',
                    minHeight: '1123px',
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
                      if (field === 'invoiceTerms') setInvoiceTerms(val);
                      if (field === 'notes') setNotes(val);
                      if (field === 'poNumber') setPoNumber(val);
                      if (field === 'deliveryNote') setDeliveryNote(val);
                      if (field === 'referenceNumber') setReferenceNumber(val);
                      if (field === 'discountType') setDiscountType(val as any);
                      if (field === 'discountValue') {
                        const parsed = parseFloat(val);
                        setDiscountValue(!isNaN(parsed) ? parsed : 0);
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
            </div>

          </div> {/* End Wrapper */}

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between sm:justify-end gap-2.5 sm:gap-3.5 bg-white dark:bg-slate-900 hide-on-print w-full shrink-0 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-3 sm:px-5 py-2.5 sm:py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDirectExportPDF}
              className="flex px-3 sm:px-5 py-2.5 sm:py-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-medium items-center justify-center gap-1.5 transition-all cursor-pointer"
              title="Download PDF directly without saving yet"
            >
              <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="hidden sm:inline">Export PDF Direct</span>
            </button>
            <button
              type="button"
              onClick={handleSaveAsDraft}
              className="flex px-3 sm:px-5 py-2.5 sm:py-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-medium items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
              title="Save as Draft"
            >
              <Save className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="hidden sm:inline">Save as Draft</span>
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-none justify-center px-3 sm:px-6 py-2.5 sm:py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-sky-950/20 active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">Save Invoice</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
