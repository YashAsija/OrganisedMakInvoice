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

export type InvoiceStatus = 'draft' | 'sent' | 'pending' | 'paid' | 'cancelled' | 'approved' | 'rejected';
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
  invoiceType?: 'invoice' | 'estimate'; // Estimate versus Invoice document type
  invoiceNumber: string;
  referenceNumber?: string; // Reference number support
  poNumber?: string; // Purchase Order number support
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
  taxTotal: number;
  grandTotal: number;
  status: InvoiceStatus;
  items: InvoiceItem[];
  createdAt: string;
  updatedAt: string;
  paidDate?: string;
  recurringSettings?: RecurringSettings; // Optional recurring invoice setup
  parentInvoiceId?: string; // Tracks which recurring series this was auto-generated from
  selectedTemplateStyle?: 'minimal' | 'professional' | 'modern' | 'startup' | 'agency' | 'enterprise'; // Selected visual invoice layout style
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
  shippedToState?: string;
  shippedToCountry?: string;
  shippedToGstin?: string;
  shippedToAddress?: string;
  clientGstin?: string;
  customTaxCols?: string[];
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
  logoUrl?: string;
  signature?: string; // Base64 data URI of drawn signature
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
  postedInvoiceEdit?: 'Enabled' | 'Disabled';
  materialRateEdit?: 'Enabled' | 'Disabled';
  materialCategorization?: 'Optional' | 'Required';
  defaultNotes?: string;
  defaultTerms?: string;
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

