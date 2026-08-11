export interface InvoiceItem {
  id: string;
  name: string;
  rate: number;
  quantity: number;
  taxPercentage: number;
  customTaxes?: Record<string, number>;
  description?: string;
  productType?: string;
  size?: string;
  discountPercentage?: number;
  itemTerms?: string;
  sacCode?: string;
  hsnCode?: string;
  quantityType?: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'pending' | 'paid' | 'partially_paid' | 'cancelled' | 'approved' | 'rejected';
export type DiscountType = 'none' | 'percent' | 'flat';
export type RecurringInterval = 'weekly' | 'bi-weekly' | 'monthly' | 'yearly';

export interface RecurringSettings {
  isRecurring: boolean;
  interval: RecurringInterval;
  startDate: string;
  endDate?: string; // empty/undefined means continue indefinitely
  hasEnded?: boolean;
  lastGeneratedDate?: string;
}

export interface Invoice {
  id: string;
  userId: string;
  invoiceType?: 'invoice' | 'proforma' | 'debit_note' | 'credit_note' | 'estimate' | 'quote' | 'purchases' | 'purchase_order' | 'purchase_debit_note'; // Document type support
  invoiceNumber: string;
  referenceNumber?: string; // Reference number support
  poNumber?: string; // Purchase Order number support
  deliveryNote?: string; // Delivery Note support
  date: string;
  dueDate: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  notes: string;
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  discountTotal: number;
  freightCharges?: number;
  isFreightAdded?: boolean;
  taxTotal: number;
  grandTotal: number;
  status: InvoiceStatus;
  items: InvoiceItem[];
  createdAt: string;
  updatedAt: string;
  paidDate?: string;
  paidAmount?: number; // Tracks cumulative amount paid (for partial payment tracking)
  recurringSettings?: RecurringSettings; // Optional recurring invoice setup
  parentInvoiceId?: string; // Tracks which recurring series this was auto-generated from
  selectedTemplateStyle?: string; // Selected visual invoice layout style
  selectedCustomTemplateId?: string; // Tracks which template was specifically chosen or defaulted for this invoice
  embeddedTemplate?: any; // The snapshotted template for this invoice
  qrCodeTriggerUrl?: string; // Optional custom payment link (UPI, PayPal, Stripe etc)
  companyState?: string;
  companyCountry?: string;
  customTaxCols?: string[];
  clientState?: string;
  clientCountry?: string;
  taxMode?: 'dynamic' | 'custom';
  customTaxName?: string;
  customTaxPercentage?: number;
  customTaxType?: 'local' | 'interstate' | 'generic';
  additionalTaxes?: { id: string, name: string, rate: number }[];
  invoiceTerms?: string;
  placeOfSupply?: string;
  grRrNo?: string;
  transport?: string;
  vehicleNo?: string;
  driverMobile?: string;
  station?: string;
  ewayBillNo?: string;
  shippedToName?: string;
  shippedToPhone?: string;
  shippedToEmail?: string;
  shippedToPan?: string;
  shippedToState?: string;
  shippedToCountry?: string;
  shippedToGstin?: string;
  shippedToAddress?: string;
  clientGstin?: string;
  clientPan?: string;
}

export interface ClientProfile {
  id: string;
  userId: string;
  name: string;
  companyName: string;
  address: string;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  userId: string;
  category: string;
  amount: number;
  date: string;
  description?: string;
  createdAt: string;
}

export interface BusinessProfile {
  uid: string;
  name: string;
  displayName?: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  pan?: string;
  website?: string;
  logoUrl?: string;
  signature?: string; // Base64 data URI of drawn signature
  signatureSize?: number; // Size/width of signature in pixels (e.g. 100 to 300)
  signatureMode?: 'draw' | 'type' | 'upload';
  signatureText?: string;
  signatureFont?: string;
  currency: string;
  defaultTaxRate: number;
  themeAccent?: 'sky' | 'emerald' | 'indigo' | 'violet' | 'rose' | 'orange';
  invoiceFont?: 'inter' | 'space' | 'playfair' | 'mono';
  invoiceLayout?: 'modern' | 'minimal' | 'agency' | 'professional' | 'startup' | 'enterprise';
  updatedAt: string;
  ownerName?: string;

  // New Fields for customized profile setup
  companyCode?: string;
  state?: string;
  stateCode?: string;
  country?: string;
  currencySymbol?: string;
  mobile?: string;

  // Banking Tab
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  upiId?: string;

  // Billing & Preset Rules Tab
  invoicePrefix?: string;
  startingInvoiceNumber?: string;
  proformaPrefix?: string;
  startingProformaNumber?: string;
  debitNotePrefix?: string;
  startingDebitNoteNumber?: string;
  creditNotePrefix?: string;
  startingCreditNoteNumber?: string;
  quotePrefix?: string;
  startingQuoteNumber?: string;
  purchaseOrderPrefix?: string;
  startingPurchaseOrderNumber?: string;
  purchasesPrefix?: string;
  startingPurchasesNumber?: string;
  postedInvoiceEdit?: 'Enabled' | 'Disabled';
  materialRateEdit?: 'Enabled' | 'Disabled';
  materialCategorization?: 'Optional' | 'Required';
  defaultNotes?: string;
  defaultTerms?: string;

  // Tax Configuration Tab
  taxMode?: 'dynamic' | 'custom';
  customTaxName?: string;
  customTaxPercentage?: number;
  customTaxCols?: string[];
  additionalTaxes?: { id: string, name: string, rate: number }[];
}

export interface PresetItem {
  id: string;
  userId: string;
  name: string;
  rate: number;
  taxPercentage: number;
  description?: string;
  quantity?: number;
}

export type TemplateSectionId = 'header' | 'companyInfo' | 'invoiceInfo' | 'billTo' | 'shipTo' | 'transport' | 'productTable' | 'taxEngine' | 'payment' | 'amountInWords' | 'terms' | 'signature' | 'footer';

export interface TemplateSection {
  id: TemplateSectionId;
  visible: boolean;
  order: number; // For drag and drop ordering
  gridColumnSpan: number; // 1 to 12 for grid layouts
  customLabels: Record<string, string>; // mapping internal field keys to custom labels
  customStyles: Record<string, string>; // generic css overrides per section
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  description: string;
  isDefault?: boolean;
  category: 'Default' | 'GST' | 'Service' | 'Retail' | 'User' | 'Purchase Order' | 'Purchases';

  layout: {
    type: 'Classic' | 'Modern' | 'Minimal' | 'Corporate' | 'GST Standard' | 'Retail' | 'Fully Custom' | 'Modal Classic';
    pageSize: 'A4' | 'Letter';
    orientation: 'Portrait' | 'Landscape';
    margins: 'Compact' | 'Standard' | 'Wide' | 'Custom';
    compact?: boolean;
    watermark: {
      enabled: boolean;
      text: string;
      opacity: number;
      position: 'Center' | 'Tile';
      rotation: number;
    }
  };

  sections: Record<TemplateSectionId, TemplateSection>;

  config: {
    header: { showLogo: boolean; logoPosition: 'Left' | 'Center' | 'Right'; logoWidth: number; logoHeight: number; titleAlignment: 'Left' | 'Center' | 'Right'; invoiceTitle: string; logoSize?: number; headerSize?: 'Small' | 'Medium' | 'Large'; };
    company: { fields: string[]; isCompact?: boolean; showLabels?: boolean; };
    invoiceInfo: { fields: string[]; customFields: { id: string; label: string; type: string; value: string; }[]; position: 'Left' | 'Center' | 'Right'; isCompact?: boolean; showLabels?: boolean; };
    client: { fields: string[]; isCompact?: boolean; showLabels?: boolean; };
    shipping: { fields: string[]; sameAsBilling: boolean; isCompact?: boolean; showLabels?: boolean; };
    transport: { fields: string[]; isCompact?: boolean; showLabels?: boolean; };
    table: {
      columns: { id: string; visible: boolean; label: string; type: 'Text' | 'Number' | 'Currency' | 'Percentage' | 'Formula'; formula?: string; width?: string; order: number; }[];
    };
    tax: { showTaxableAmount: boolean; showCgstSgst: boolean; showIgst: boolean; showCess: boolean; showDiscount: boolean; showRoundOff: boolean; showTotal: boolean; enableHsnSummary: boolean; enableGstSummary: boolean; enableTaxBreakdown: boolean; };
    payment: { generateQrCode: boolean; enableInstructions: boolean; customNote: string; isCompact?: boolean; };
    amountInWords: { format: 'Indian' | 'International'; enabled: boolean; };
    terms: { presetId: string; customText: string; notesText?: string; showNotes?: boolean; showTerms?: boolean; };
    signature: { showSignature: boolean; showStamp: boolean; position: 'Left' | 'Center' | 'Right'; width: number; height: number; signatoryName: string; designation: string; };
    footer: { message: string; thankYouNote: string; supportContact: string; website: string; showPageNumbers: boolean; showGeneratedBy: boolean; customText: string; showContact?: boolean; showWebsite?: boolean; };
  };

  styleConfig: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily: string;
    spacing: 'Compact' | 'Normal' | 'Spacious';
    borderStyle: 'None' | 'Light' | 'Medium' | 'Heavy';
    roundedCorners: boolean;
    sectionBackgroundColors: Record<string, string>;
    alternatingRowColors: boolean;
    tableHeaderBackground: string;
    tableHeaderTextColor: string;
  };
}


export type TaxClassification = any;
