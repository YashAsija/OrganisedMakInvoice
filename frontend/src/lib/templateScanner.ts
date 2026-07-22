import { InvoiceTemplate } from '../types';

export interface SchemaField {
  path: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'date';
  label: string;
  visible: boolean;
}

export interface FieldSchema {
  templateId: string;
  templateName: string;
  visibleFields: SchemaField[];
  storableFields: SchemaField[];
}

/**
 * Reads the active template config and sections (READ-ONLY).
 * Never mutates, adds, or infers new sections or columns.
 */
export function scanActiveTemplate(template: InvoiceTemplate | null | undefined): FieldSchema {
  const visible: SchemaField[] = [];
  const storable: SchemaField[] = [];

  const addField = (path: string, type: SchemaField['type'], label: string, isVis: boolean = true) => {
    visible.push({ path, type, label, visible: true });
  };

  // 1. Client / Billed To Fields
  addField('clientName', 'string', 'Client / Party Name');
  addField('clientEmail', 'string', 'Client Email');
  addField('clientPhone', 'string', 'Client Phone Number');
  addField('clientAddress', 'string', 'Client Address');
  addField('clientGstin', 'string', 'Client GSTIN / Tax ID');
  addField('clientPan', 'string', 'Client PAN');
  addField('clientState', 'string', 'Client State');
  addField('clientCountry', 'string', 'Client Country');

  // 2. Shipping / Ship To Fields
  addField('shippedToName', 'string', 'Shipping Name');
  addField('shippedToPhone', 'string', 'Shipping Phone');
  addField('shippedToEmail', 'string', 'Shipping Email');
  addField('shippedToAddress', 'string', 'Shipping Address');
  addField('shippedToGstin', 'string', 'Shipping GSTIN');
  addField('shippedToPan', 'string', 'Shipping PAN');
  addField('shippedToState', 'string', 'Shipping State');
  addField('shippedToCountry', 'string', 'Shipping Country');
  addField('copyBillingToShipping', 'boolean', 'Copy Billing to Shipping');

  // 3. Transport / Carrier Fields
  addField('transport', 'string', 'Transport Carrier Name');
  addField('vehicleNo', 'string', 'Vehicle / Truck Registration Number');
  addField('grRrNo', 'string', 'GR/RR Number');
  addField('driverMobile', 'string', 'Driver Mobile Number');
  addField('station', 'string', 'Station');
  addField('ewayBillNo', 'string', 'E-Way Bill Number');
  addField('placeOfSupply', 'string', 'Place of Supply');

  // 4. Document Meta & Dates
  addField('invoiceNumber', 'string', 'Invoice Number');
  addField('date', 'date', 'Invoice Date');
  addField('dueDate', 'date', 'Due Date');
  addField('poNumber', 'string', 'PO / Purchase Order Number');
  addField('referenceNumber', 'string', 'Reference / Tracking Number');
  addField('deliveryNote', 'string', 'Delivery Note');

  // 5. Line Item Table Columns & Items Array
  addField('items', 'array', 'Line Items Array');
  addField('items[].name', 'string', 'Product / Service Name');
  addField('items[].rate', 'number', 'Product Rate / Price');
  addField('items[].quantity', 'number', 'Quantity');
  addField('items[].quantityType', 'string', 'Quantity Unit / Type');
  addField('items[].hsnCode', 'string', 'HSN / SAC Code');
  addField('items[].taxPercentage', 'number', 'Tax Percentage');
  addField('items[].discountPercentage', 'number', 'Item Discount Percentage');
  addField('items[].description', 'string', 'Item Description');

  // 6. Financials, Discounts & Charges
  addField('discountValue', 'number', 'Invoice Discount Value');
  addField('discountType', 'string', 'Discount Type (flat/percent)');
  addField('freightCharges', 'number', 'Freight / Delivery Charges');

  // 7. Notes & Terms
  addField('notes', 'string', 'Notes & Comments');
  addField('invoiceTerms', 'string', 'Terms & Conditions');

  // 8. Advanced Settings
  addField('invoiceType', 'string', 'Invoice Type (invoice/estimate)');
  addField('status', 'string', 'Status (pending/paid/draft)');
  addField('taxMode', 'string', 'Tax Mode (dynamic/custom)');
  addField('customTaxName', 'string', 'Custom Tax Name');
  addField('customTaxPercentage', 'number', 'Custom Tax Percentage');
  addField('isRecurring', 'boolean', 'Is Recurring Invoice');
  addField('recurringInterval', 'string', 'Recurring Interval');

  const schema: FieldSchema = {
    templateId: template?.id || 'custom',
    templateName: template?.name || 'Custom Template',
    visibleFields: visible,
    storableFields: storable
  };

  if (typeof window !== 'undefined') {
    (window as any).__ACTIVE_TEMPLATE_SCHEMA__ = schema;
  }

  return schema;
}
