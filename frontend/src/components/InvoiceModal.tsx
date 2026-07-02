import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { X, Plus, Trash2, Check, Sparkles, AlertCircle, ShoppingBag, Settings, Download, Save, FileText, ArrowDown } from 'lucide-react';
import { Invoice, TaxClassification, InvoiceItem, InvoiceStatus, DiscountType, PresetItem, ClientProfile, RecurringInterval, BusinessProfile, InvoiceTemplate } from '../types';
import { EditableField } from './EditableField';
import { exportInvoicePDFAsync } from '../lib/pdfExporter';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { LivePreview } from './TemplateBuilder/LivePreview';
import { Country, State } from 'country-state-city';
import { TEMPLATE_PRESETS } from '../lib/templatePresets';

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
  // Client details
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [clientName, setClientName] = useState('');
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
  const [activeTemplate, setActiveTemplate] = useState<InvoiceTemplate>(TEMPLATE_PRESETS[0]);

  // Advanced features and billing options
  const [invoiceType, setInvoiceType] = useState<'invoice' | 'estimate'>('invoice');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [selectedTemplateStyle, setSelectedTemplateStyle] = useState<'minimal' | 'professional' | 'modern' | 'startup' | 'agency' | 'enterprise'>('professional');
  const [qrCodeTriggerUrl, setQrCodeTriggerUrl] = useState('');

  // AI Assist States
  const [aiPromptText, setAiPromptText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAiGeneratingDescription, setIsAiGeneratingDescription] = useState(false);

  // Recurring settings states
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<RecurringInterval>('monthly');
  const [recurringStartDate, setRecurringStartDate] = useState('');
  const [recurringEndDate, setRecurringEndDate] = useState('');
  const [endOption, setEndOption] = useState<'indefinite' | 'date'>('indefinite');

  // Pricing models
  const [items, setItems] = useState<InvoiceItem[]>([]);
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
    return profile.state || localStorage.getItem('makinvoice_tax_company_state') || 'Maharashtra';
  });
  const [companyCountry, setCompanyCountry] = useState(() => {
    return profile.country || localStorage.getItem('makinvoice_tax_company_country') || 'India';
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
  const [additionalTaxes, setAdditionalTaxes] = useState<{id: string, name: string, rate: number}[]>(() => {
    if (invoice) return invoice.additionalTaxes || [];
    return profile.additionalTaxes || [];
  });
  const [customTaxCols, setCustomTaxCols] = useState<string[]>(() => {
    if (invoice?.customTaxCols && invoice.customTaxCols.length > 0) return invoice.customTaxCols;
    return profile.customTaxCols && profile.customTaxCols.length > 0 ? profile.customTaxCols : ['Tax'];
  });

  // Helper: load the correct default template from storage
  const loadDefaultTemplate = useCallback(() => {
    // If editing an existing invoice, use its explicitly selected template
    if (invoice?.selectedCustomTemplateId) {
      const savedCustom = localStorage.getItem('makinvoice_custom_templates');
      if (savedCustom) {
        try {
          const parsed = JSON.parse(savedCustom);
          const match = parsed.find((t: InvoiceTemplate) => t.id === invoice.selectedCustomTemplateId);
          if (match) {
            setActiveTemplate(match);
            return;
          }
        } catch(e) {}
      }
      const systemMatch = TEMPLATE_PRESETS.find(t => t.id === invoice.selectedCustomTemplateId);
      if (systemMatch) {
        setActiveTemplate(systemMatch);
        return;
      }
    }

    const defaultTemplateId = localStorage.getItem('makinvoice_global_default_template');
    let loadedTemplate = TEMPLATE_PRESETS[0];

    if (defaultTemplateId) {
      let foundCustom = false;
      const savedCustom = localStorage.getItem('makinvoice_custom_templates');
      if (savedCustom) {
        try {
          const parsed = JSON.parse(savedCustom);
          const customMatch = parsed.find((t: InvoiceTemplate) => t.id === defaultTemplateId);
          if (customMatch) {
            loadedTemplate = customMatch;
            foundCustom = true;
          }
        } catch(e) {}
      }
      if (!foundCustom) {
        const systemMatch = TEMPLATE_PRESETS.find(t => t.id === defaultTemplateId);
        if (systemMatch) loadedTemplate = systemMatch;
      }
    } else {
      const savedCustom = localStorage.getItem('makinvoice_custom_templates');
      if (savedCustom) {
        try {
          const parsed = JSON.parse(savedCustom);
          const customDefault = parsed.find((t: InvoiceTemplate) => t.isDefault);
          if (customDefault) loadedTemplate = customDefault;
        } catch(e) {}
      }
    }
    setActiveTemplate(loadedTemplate);
  }, [invoice]);

  // Load template whenever the modal opens (not on every clientCountry change)
  useEffect(() => {
    if (isOpen) {
      loadDefaultTemplate();
    }
  }, [isOpen, loadDefaultTemplate]);

  // Listen for template changes made in TemplateManager while modal is open
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'makinvoice_global_default_template' || e.key === 'makinvoice_custom_templates') {
        loadDefaultTemplate();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadDefaultTemplate]);

  useEffect(() => {
    if (clientCountry && clientCountry !== 'India' && clientCountry !== 'IN') {
      setTaxMode('custom');
    }
  }, [clientCountry]);

  // Auto initialize values when editing or creating
  useEffect(() => {
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

      // Extract new fields if they exist, or set safe defaults
      setInvoiceType(invoice.invoiceType || 'invoice');
      setReferenceNumber(invoice.referenceNumber || '');
      setPoNumber(invoice.poNumber || '');
      setSelectedTemplateStyle(invoice.selectedTemplateStyle || 'professional');
      setQrCodeTriggerUrl(invoice.qrCodeTriggerUrl || '');
      setAiPromptText('');
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
      setCompanyState(invoice.companyState || profile.state || localStorage.getItem('makinvoice_tax_company_state') || 'Maharashtra');
      setCompanyCountry(invoice.companyCountry || profile.country || localStorage.getItem('makinvoice_tax_company_country') || 'India');
      setClientState(invoice.clientState || '');
      setClientCountry(invoice.clientCountry || 'India');
      setTaxMode(invoice.taxMode || 'dynamic');
      setCustomTaxName(invoice.customTaxName || 'Custom VAT');
      setCustomTaxPercentage(invoice.customTaxPercentage !== undefined ? invoice.customTaxPercentage : 0);
      setCustomTaxType(invoice.customTaxType || 'generic');

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
      const defaultNumber = `INV-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      
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

      // Advanced and custom default settings
      setInvoiceType('invoice');
      setReferenceNumber('');
      setPoNumber('');
      setSelectedTemplateStyle('professional');
      setQrCodeTriggerUrl('');
      setAiPromptText('');
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
      setCompanyState(profile.state || localStorage.getItem('makinvoice_tax_company_state') || 'Maharashtra');
      setCompanyCountry(profile.country || localStorage.getItem('makinvoice_tax_company_country') || 'India');
      setTaxMode('dynamic');
      setCustomTaxName('Custom VAT');
      setCustomTaxPercentage(0);
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

  // --- AI ASSIST ENDPOINT CLIENTS ---
  const handleAIParseInvoice = async () => {
    if (!aiPromptText.trim()) {
      alert('Please enter a natural language prompt first');
      return;
    }
    setIsAiLoading(true);
    try {
      const response = await fetch('/api/ai/parse-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPromptText })
      });
      const data = await response.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      
      // Auto-populate based on returned AI JSON!
      if (data.clientName) setClientName(data.clientName);
      if (data.clientEmail) setClientEmail(data.clientEmail || '');
      if (data.currency) {
        // Option to alert or trigger currency change
      }
      if (data.notes) setNotes(data.notes);
      
      if (data.items && data.items.length > 0) {
        const parsedItems = data.items.map((it: any) => ({
          id: `item_${Math.random().toString(36).substr(2, 5)}`,
          name: it.name || 'AI Product Service',
          rate: Number(it.rate) || 120,
          quantity: Number(it.quantity) || 1,
          taxPercentage: Number(it.taxPercentage) !== undefined ? Number(it.taxPercentage) : defaultTaxRate,
          description: it.description || ''
        }));
        setItems(parsedItems);
      }
      
      alert('🌟 Beautiful! AI Assistant successfully analyzed your guidelines and pre-filled this draft invoice.');
    } catch (err) {
      console.error(err);
      alert('Could not complete AI parse request. Running in offline fallback mode.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAIGenerateDescription = async () => {
    if (!newItemName.trim()) {
      alert('Please state a product or service name first so AI can write a description!');
      return;
    }
    setIsAiGeneratingDescription(true);
    try {
      const response = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    localStorage.setItem('makinvoice_tax_company_state', companyState);
    localStorage.setItem('makinvoice_tax_company_country', companyCountry);
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
  const calculatedTaxTotal = items.reduce((sum, item) => {
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
  }, 0);

  const roundedTaxTotal = parseFloat(calculatedTaxTotal.toFixed(2));
  const calculatedGrandTotal = parseFloat(Math.max(0, (finalDiscountedSubtotal + roundedTaxTotal)).toFixed(2));


  const buildTempInvoice = (silent = false): Invoice | null => {
    if (!silent) {
      if (invoiceType !== 'estimate' && !clientName.trim()) {
        alert('Client Name is required to export PDF.');
        return null;
      }

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
      referenceNumber: referenceNumber.trim() || undefined,
      poNumber: poNumber.trim() || undefined,
      selectedTemplateStyle,
      selectedCustomTemplateId: activeTemplate.id,
      qrCodeTriggerUrl: qrCodeTriggerUrl.trim() || undefined,
      date,
      dueDate,
      clientName: invoiceType === 'estimate' ? (clientName.trim() || 'Quote / Estimate') : clientName.trim(),
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
    poNumber, referenceNumber, invoiceType
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
    let defaultTax = 0;
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
        await exportInvoicePDFAsync(tempInvoice, profile, 'save', activeTemplate);
      } catch (err: any) {
        alert('Failed to export PDF: ' + (err.message || err.toString()));
      }
    }
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (invoiceType !== 'estimate' && !clientName.trim()) {
      alert('Client Name is required.');
      return;
    }

    if (items.length === 0) {
      alert('Please add at least one line item to build the bill.');
      return;
    }

    onSave({
      id: invoice ? invoice.id : `inv_${Math.random().toString(36).substr(2, 9)}`,
      userId: invoice ? invoice.userId : 'local',
      invoiceType,
      invoiceNumber,
      referenceNumber: referenceNumber.trim() || undefined,
      poNumber: poNumber.trim() || undefined,
      selectedTemplateStyle,
      selectedCustomTemplateId: activeTemplate.id,
      qrCodeTriggerUrl: qrCodeTriggerUrl.trim() || undefined,
      date,
      dueDate,
      clientName: invoiceType === 'estimate' ? (clientName.trim() || 'Quote / Estimate') : clientName.trim(),
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

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 bg-slate-900/65 backdrop-blur-sm overflow-y-auto overflow-x-hidden">
      <div 
        id="invoice-editor" 
        className="w-full h-full md:h-auto md:max-h-[92dvh] max-w-full md:max-w-4xl lg:max-w-5xl bg-white dark:bg-slate-900 rounded-none md:rounded-3xl overflow-hidden shadow-2xl flex flex-col border-none md:border md:border-slate-100 dark:md:border-slate-800 transition-all duration-300 md:my-auto"
      >
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-slate-805">
                {invoice ? 'Edit Invoice' : 'Create Invoice'}
              </h2>
              <span className="text-[10px] text-slate-400 font-mono block">#{invoiceNumber}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close invoice editor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toggle Mode Tab + Template Switcher */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/45 px-3 py-2 gap-2 select-none items-center flex-wrap">
          {/* Primary tab: Interactive Layout */}
          <button
            type="button"
            onClick={() => setActiveMode('editable')}
            className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
              activeMode === 'editable'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-950/10 font-extrabold'
                : 'text-slate-650 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <span>✨ Invoice Layout</span>
          </button>

          {/* Secondary tab: Advanced Settings */}
          <button
            type="button"
            onClick={() => setActiveMode('edit')}
            className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
              activeMode === 'edit'
                ? 'bg-slate-700 text-white shadow-md shadow-slate-950/10 font-extrabold'
                : 'text-slate-650 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <span>⚙️ Advanced Settings</span>
          </button>


        </div>

        {/* Scrollable Contents */}
        <form onSubmit={handleSaveSubmit} className="flex-1 overflow-y-auto p-4 md:p-6 text-sans text-sm pb-8">
          
          {activeMode === 'edit' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            
            {/* COLUMN 1: Setup & Client Metadata */}
            <div className="space-y-4">

          {/* General Metadata */}
          <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-900 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="inv-type" className="block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Document Type</label>
                <select
                  id="inv-type"
                  value={invoiceType}
                  onChange={(e) => setInvoiceType(e.target.value as 'invoice' | 'estimate')}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white font-medium text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                >
                  <option value="invoice">Invoice / Bill</option>
                  <option value="estimate">Estimate / Quote</option>
                </select>
              </div>
              <div>
                <label htmlFor="inv-num" className="block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">ID Number</label>
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
              <div>
                <label htmlFor="inv-ref" className="block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Ref Number (Optional)</label>
                <input 
                  id="inv-ref"
                  type="text" 
                  placeholder="REF-202"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white font-mono text-xs focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="inv-po" className="block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">P.O. Number (Optional)</label>
                <input 
                  id="inv-po"
                  type="text" 
                  placeholder="PO-883"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white font-mono text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-150 dark:border-slate-900/50 pt-2.5">
              <div>
                <label htmlFor="inv-date" className="block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Issue Date</label>
                <input 
                  id="inv-date"
                  type="date" 
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="inv-duedate" className="block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Due Date</label>
                <input 
                  id="inv-duedate"
                  type="date" 
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="border-t border-slate-150 dark:border-slate-900/50 pt-2.5">
              <label htmlFor="inv-status" className="block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Status</label>
              <select 
                id="inv-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white font-medium text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
              >
                <option value="pending">Unpaid</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            <div className="border-t border-slate-150 dark:border-slate-900/50 pt-2.5">
              <label htmlFor="inv-qr" className="block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Payment link URL (UPI/Venmo/Stripe/PayPal)</label>
              <input 
                id="inv-qr"
                type="text" 
                placeholder="https://paypal.me/company/total"
                value={qrCodeTriggerUrl}
                onChange={(e) => setQrCodeTriggerUrl(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Client Info */}
          {invoiceType !== 'estimate' && (
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
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Client Name *"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="col-client-email" className="sr-only">Client Email</label>
                <input 
                  id="col-client-email"
                  type="email" 
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="Client Email"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="col-client-phone" className="sr-only">Client Phone</label>
                <input 
                  id="col-client-phone"
                  type="text" 
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="Client Phone"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="col-client-address" className="sr-only">Client Address</label>
              <textarea 
                id="col-client-address"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                placeholder="Client Physical Billing Address"
                rows={1}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none resize-none"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="col-client-gstin" className="sr-only">Client GSTIN / UIN</label>
                <input 
                  id="col-client-gstin"
                  type="text" 
                  value={clientGstin}
                  onChange={(e) => setClientGstin(e.target.value)}
                  placeholder="Client GSTIN / UIN"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="col-client-pan" className="sr-only">Client PAN</label>
                <input 
                  id="col-client-pan"
                  type="text" 
                  value={clientPan}
                  onChange={(e) => setClientPan(e.target.value)}
                  placeholder="Client PAN"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
            </div>

            {(
              <div className="space-y-3 pt-3 border-t border-slate-150 dark:border-slate-800">
                <h3 className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Shipped To Details
                </h3>
                <input type="text" value={shippedToName} onChange={e => setShippedToName(e.target.value)} placeholder="Name" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    value={Country.getAllCountries().find(c => c.name === shippedToCountry)?.isoCode || ''}
                    onChange={(e) => {
                      const selectedCountry = Country.getCountryByCode(e.target.value);
                      if (selectedCountry) {
                        setShippedToCountry(selectedCountry.name);
                        setShippedToState(''); // Reset state when country changes
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none"
                  >
                    <option value="" disabled>Country</option>
                    {Country.getAllCountries().map((c) => (
                      <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                    ))}
                  </select>
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none disabled:opacity-50"
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
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input type="text" value={shippedToPhone} onChange={e => setShippedToPhone(e.target.value)} placeholder="Phone" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none" />
                  <input type="email" value={shippedToEmail} onChange={e => setShippedToEmail(e.target.value)} placeholder="Email" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none" />
                  <input type="text" value={shippedToPan} onChange={e => setShippedToPan(e.target.value)} placeholder="PAN" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none" />
                  <input type="text" value={shippedToGstin} onChange={e => setShippedToGstin(e.target.value)} placeholder="GSTIN / UIN" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none" />
                </div>
                <textarea value={shippedToAddress} onChange={e => setShippedToAddress(e.target.value)} placeholder="Shipping Address" rows={1} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none resize-none" />
              </div>
            )}
            </div>
          )}

          {/* Transport Details */}
          {invoiceType !== 'estimate' && (
            <div className="space-y-3 pt-4 border-t border-slate-150 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
              <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Transport Details
              </h3>
            </div>
            
            {hasTransport && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" value={placeOfSupply} onChange={e => setPlaceOfSupply(e.target.value)} placeholder="Place of Supply" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none" />
                <input type="text" value={transport} onChange={e => setTransport(e.target.value)} placeholder="Transport" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none" />
                <input type="text" value={grRrNo} onChange={e => setGrRrNo(e.target.value)} placeholder="GR/RR No." className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none" />
                <input type="text" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} placeholder="Vehicle No." className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none" />
                <input type="text" value={driverMobile} onChange={e => setDriverMobile(e.target.value)} placeholder="Driver Mobile" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none" />
                <input type="text" value={station} onChange={e => setStation(e.target.value)} placeholder="Station" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none" />
                <input type="text" value={ewayBillNo} onChange={e => setEwayBillNo(e.target.value)} placeholder="E-Way Bill No." className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none" />
              </div>
            )}
          </div>
          )}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">

              <div>
                <label htmlFor="tax-cl-country" className="block text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">Client Country</label>
                <select
                  id="tax-cl-country"
                  value={Country.getAllCountries().find(c => c.name === clientCountry)?.isoCode || ''}
                  onChange={(e) => {
                    const selectedCountry = Country.getCountryByCode(e.target.value);
                    if (selectedCountry) {
                      setClientCountry(selectedCountry.name);
                      setClientState(''); // Reset state when country changes
                    }
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white font-medium text-xs focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="" disabled>Select Country</option>
                  {Country.getAllCountries().map((c) => (
                    <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="tax-cl-state" className="block text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">Client State</label>
                <select
                  id="tax-cl-state"
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
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white font-medium text-xs focus:outline-none focus:border-sky-500 cursor-pointer disabled:opacity-50"
                >
                  <option value="" disabled>Select State</option>
                  {(() => {
                    const cCode = Country.getAllCountries().find(c => c.name === clientCountry)?.isoCode;
                    if (!cCode) return null;
                    return State.getStatesOfCountry(cCode).map((st) => (
                      <option key={st.isoCode} value={st.isoCode}>{st.name}</option>
                    ));
                  })()}
                </select>
              </div>
            </div>

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

          {/* TAX CALCULATOR OUTPUT DISPLAY */}
          <div className="p-4 bg-sky-50/50 dark:bg-slate-950 text-slate-805 rounded-3xl border border-sky-100/35 dark:border-slate-900 space-y-2.5">
            <span className="block text-xs font-medium uppercase tracking-wider text-sky-700 dark:text-sky-400">Tax Calculator Calculations</span>
            
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500 dark:text-slate-400 font-medium">
                <span>Subtotal base</span>
                <span>{currencySymbol}{calculatedSubtotal.toFixed(2)}</span>
              </div>
              
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
          ) : activeMode === 'editable' ? (
            <div className="w-full overflow-x-auto bg-slate-100/50 dark:bg-slate-950/30 p-2 sm:p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="w-[794px] mx-auto bg-white p-4 sm:p-8 relative min-h-[1123px] shadow-sm border border-slate-200 dark:border-slate-300" id="pdf-export-content-editable">
               
               <LivePreview 
 
                 template={activeTemplate} 
                 invoiceData={liveInvoiceData || invoice || {}} 
                 businessProfile={profile} 
                 currencySymbol={currencySymbol} 
                 isInteractive={true} 

                 onUpdateField={(field, val) => {
                    if(field==='invoiceNumber') setInvoiceNumber(val);
                    if(field==='date') setDate(val);
                    if(field==='dueDate') setDueDate(val);
                    if(field==='clientName') setClientName(val);
                    if(field==='clientEmail') setClientEmail(val);
                    if(field==='clientPhone') setClientPhone(val);
                    if(field==='clientAddress') setClientAddress(val);
                    if(field==='clientGstin') setClientGstin(val);
                    if(field==='clientState') setClientState(val);
                    if(field==='clientCountry') setClientCountry(val);
                    if(field==='shippedToName') setShippedToName(val);
                    if(field==='shippedToPhone') setShippedToPhone(val);
                    if(field==='shippedToEmail') setShippedToEmail(val);
                    if(field==='shippedToPan') setShippedToPan(val);
                    if(field==='shippedToAddress') setShippedToAddress(val);
                    if(field==='shippedToGstin') setShippedToGstin(val);
                    if(field==='shippedToState') setShippedToState(val);
                    if(field==='shippedToCountry') setShippedToCountry(val);
                    if(field==='placeOfSupply') setPlaceOfSupply(val);
                    if(field==='grRrNo') setGrRrNo(val);
                    if(field==='transport') setTransport(val);
                    if(field==='vehicleNo') setVehicleNo(val);
                    if(field==='driverMobile') setDriverMobile(val);
                    if(field==='station') setStation(val);
                    if(field==='ewayBillNo') setEwayBillNo(val);
                    if(field==='invoiceTerms') setInvoiceTerms(val);
                    if(field==='notes') setNotes(val);
                    if(field==='poNumber') setPoNumber(val);
                    if(field==='referenceNumber') setReferenceNumber(val);
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
                 }}
                 hasTransport={hasTransport}
                 onUpdateHasTransport={setHasTransport}
               />
              </div>
            </div>
          ) : null}

          {/* Triggers */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3.5 bg-white dark:bg-slate-900 hide-on-print">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDirectExportPDF}
              className="px-5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
              title="Download PDF directly without saving yet"
            >
              <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export PDF Direct</span>
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all shadow-md shadow-sky-950/20 active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Save Invoice
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
