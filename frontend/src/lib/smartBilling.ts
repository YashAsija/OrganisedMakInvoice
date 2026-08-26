/**
 * smartBilling.ts — Isolated AI Smart Billing Module
 *
 * Responsibilities:
 *   A. buildTemplateFieldSchema(template) → read-only schema from active template
 *   B. extractInvoiceData(prompt, schema, ...) → calls backend, validates, returns typed result
 *   C. applySmartBillingData(extracted, setters, existingState) → writes to form state only
 *
 * This module has NO side effects on template structure and never mutates activeTemplate.
 * If this file is deleted, the only required change in InvoiceModal is to remove <SmartBillingBox />.
 */

import { InvoiceTemplate, InvoiceItem, RecurringInterval, InvoiceStatus } from '../types';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface SmartBillingField {
  path: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array';
}

export interface SmartBillingSchema {
  templateId: string;
  templateName: string;
  fields: SmartBillingField[];
}

export interface SmartBillingExtracted {
  // Client
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientGstin?: string;
  clientPan?: string;
  clientState?: string;
  clientCountry?: string;
  // Shipping
  shippedToName?: string;
  shippedToPhone?: string;
  shippedToEmail?: string;
  shippedToAddress?: string;
  shippedToGstin?: string;
  shippedToPan?: string;
  shippedToState?: string;
  shippedToCountry?: string;
  copyBillingToShipping?: boolean;
  // Transport
  transport?: string;
  vehicleNo?: string;
  grRrNo?: string;
  driverMobile?: string;
  station?: string;
  ewayBillNo?: string;
  placeOfSupply?: string;
  // Document meta
  invoiceNumber?: string;
  date?: string;
  dueDate?: string;
  poNumber?: string;
  referenceNumber?: string;
  deliveryNote?: string;
  // Line items
  items?: Array<{
    name: string;
    rate: number;
    quantity: number;
    quantityType?: string;
    hsnCode?: string;
    taxPercentage?: number;
    discountPercentage?: number;
    description?: string;
  }>;
  // Financials
  discountValue?: number;
  discountType?: 'flat' | 'percent';
  freightCharges?: number;
  // Notes
  notes?: string;
  invoiceTerms?: string;
  // Advanced
  invoiceType?: string;
  status?: string;
  taxMode?: string;
  customTaxName?: string;
  customTaxPercentage?: number;
  isRecurring?: boolean;
  recurringInterval?: string;
  // Extra data — AI extracted values that have no field in current template
  _extraData?: Record<string, any>;
}

export interface SmartBillingSetters {
  setClientName: (v: string) => void;
  setClientEmail: (v: string) => void;
  setClientPhone: (v: string) => void;
  setClientAddress: (v: string) => void;
  setClientGstin: (v: string) => void;
  setClientPan: (v: string) => void;
  setClientState: (v: string) => void;
  setClientCountry: (v: string) => void;
  setShippedToName: (v: string) => void;
  setShippedToPhone: (v: string) => void;
  setShippedToEmail: (v: string) => void;
  setShippedToAddress: (v: string) => void;
  setShippedToGstin: (v: string) => void;
  setShippedToPan: (v: string) => void;
  setShippedToState: (v: string) => void;
  setShippedToCountry: (v: string) => void;
  setTransport: (v: string) => void;
  setVehicleNo: (v: string) => void;
  setGrRrNo: (v: string) => void;
  setDriverMobile: (v: string) => void;
  setStation: (v: string) => void;
  setEwayBillNo: (v: string) => void;
  setPlaceOfSupply: (v: string) => void;
  setHasTransport: (v: boolean) => void;
  setInvoiceNumber: (v: string) => void;
  setDate: (v: string) => void;
  setDueDate: (v: string) => void;
  setPoNumber: (v: string) => void;
  setReferenceNumber: (v: string) => void;
  setDeliveryNote: (v: string) => void;
  setNotes: (fn: (prev: string) => string) => void;
  setInvoiceTerms: (v: string) => void;
  setItems: (fn: (prev: InvoiceItem[]) => InvoiceItem[]) => void;
  setDiscountValue: (v: number) => void;
  setDiscountType: (v: string) => void;
  setFreightCharges: (v: number) => void;
  setIsFreightAdded: (v: boolean) => void;
  setInvoiceType: (v: 'invoice' | 'estimate') => void;
  setStatus: (v: InvoiceStatus) => void;
  setTaxMode: (v: 'dynamic' | 'custom') => void;
  setCustomTaxName: (v: string) => void;
  setCustomTaxPercentage: (v: number) => void;
  setIsRecurring: (v: boolean) => void;
  setRecurringInterval: (v: RecurringInterval) => void;
  setAiExtraData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
}

export interface SmartBillingExistingState {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  clientGstin: string;
  clientPan: string;
  clientState: string;
  clientCountry: string;
  shippedToName?: string;
  shippedToPhone?: string;
  shippedToEmail?: string;
  shippedToAddress?: string;
  shippedToGstin?: string;
  shippedToPan?: string;
  shippedToState?: string;
  shippedToCountry?: string;
  transport?: string;
  vehicleNo?: string;
  grRrNo?: string;
  driverMobile?: string;
  station?: string;
  ewayBillNo?: string;
  placeOfSupply?: string;
  invoiceNumber?: string;
  date?: string;
  dueDate?: string;
  poNumber?: string;
  referenceNumber?: string;
  deliveryNote?: string;
  notes?: string;
  invoiceTerms?: string;
  items: InvoiceItem[];
  discountValue?: number;
  discountType?: string;
  freightCharges?: number;
  isFreightAdded?: boolean;
  invoiceType?: string;
  status?: string;
  defaultTaxRate: number;
  customTaxCols: string[];
  registryClients: any[];
  presets: any[];
  aiExtraData: Record<string, any>;
}

// ─── Step A: Template Field Schema Reader (READ-ONLY) ──────────────────────

/**
 * Reads the active template config and returns a flat list of all form fields.
 * NEVER mutates the template. This is a pure function — same input, same output.
 * All fields are always included so AI can extract any detail; the apply step
 * decides what actually gets written to visible fields vs. stored in _extraData.
 */
export function buildTemplateFieldSchema(template: InvoiceTemplate | null | undefined): SmartBillingSchema {
  const fields: SmartBillingField[] = [
    // Client
    { path: 'clientName', label: 'Client / Party Name', type: 'string' },
    { path: 'clientEmail', label: 'Client Email', type: 'string' },
    { path: 'clientPhone', label: 'Client Phone Number', type: 'string' },
    { path: 'clientAddress', label: 'Client Billing Address', type: 'string' },
    { path: 'clientGstin', label: 'Client GSTIN / Tax ID', type: 'string' },
    { path: 'clientPan', label: 'Client PAN Number', type: 'string' },
    { path: 'clientState', label: 'Client State / Province', type: 'string' },
    { path: 'clientCountry', label: 'Client Country', type: 'string' },
    // Shipping
    { path: 'shippedToName', label: 'Ship-To Name', type: 'string' },
    { path: 'shippedToPhone', label: 'Ship-To Phone', type: 'string' },
    { path: 'shippedToEmail', label: 'Ship-To Email', type: 'string' },
    { path: 'shippedToAddress', label: 'Ship-To Address', type: 'string' },
    { path: 'shippedToGstin', label: 'Ship-To GSTIN', type: 'string' },
    { path: 'shippedToPan', label: 'Ship-To PAN', type: 'string' },
    { path: 'shippedToState', label: 'Ship-To State', type: 'string' },
    { path: 'shippedToCountry', label: 'Ship-To Country', type: 'string' },
    { path: 'copyBillingToShipping', label: 'Copy Billing Info to Shipping', type: 'boolean' },
    // Transport
    { path: 'transport', label: 'Transport / Carrier Name', type: 'string' },
    { path: 'vehicleNo', label: 'Vehicle / Truck Registration Number', type: 'string' },
    { path: 'grRrNo', label: 'GR / RR Number', type: 'string' },
    { path: 'driverMobile', label: 'Driver Mobile', type: 'string' },
    { path: 'station', label: 'Station', type: 'string' },
    { path: 'ewayBillNo', label: 'E-Way Bill Number', type: 'string' },
    { path: 'placeOfSupply', label: 'Place of Supply', type: 'string' },
    // Document meta
    { path: 'invoiceNumber', label: 'Invoice Number / ID', type: 'string' },
    { path: 'date', label: 'Invoice Date (YYYY-MM-DD)', type: 'date' },
    { path: 'dueDate', label: 'Due Date (YYYY-MM-DD)', type: 'date' },
    { path: 'poNumber', label: 'Purchase Order Number', type: 'string' },
    { path: 'referenceNumber', label: 'Reference / Tracking Number', type: 'string' },
    { path: 'deliveryNote', label: 'Delivery Note', type: 'string' },
    // Line items
    { path: 'items', label: 'Line Items Array', type: 'array' },
    // Financials
    { path: 'discountValue', label: 'Invoice-Level Discount Value', type: 'number' },
    { path: 'discountType', label: 'Discount Type: flat or percent', type: 'string' },
    { path: 'freightCharges', label: 'Freight / Delivery Charges', type: 'number' },
    // Notes
    { path: 'notes', label: 'Notes and Comments', type: 'string' },
    { path: 'invoiceTerms', label: 'Terms and Conditions', type: 'string' },
    // Advanced
    { path: 'invoiceType', label: 'Invoice Type: invoice or estimate', type: 'string' },
    { path: 'status', label: 'Invoice Status: pending, paid, draft', type: 'string' },
    { path: 'taxMode', label: 'Tax Mode: dynamic or custom', type: 'string' },
    { path: 'customTaxName', label: 'Custom Tax Name', type: 'string' },
    { path: 'customTaxPercentage', label: 'Custom Tax Percentage', type: 'number' },
    { path: 'isRecurring', label: 'Is Recurring Invoice: true or false', type: 'boolean' },
    { path: 'recurringInterval', label: 'Recurring Interval: weekly, monthly, quarterly, yearly', type: 'string' },
  ];

  const schema: SmartBillingSchema = {
    templateId: template?.id ?? 'default',
    templateName: template?.name ?? 'Default',
    fields,
  };

  // Expose for debugging in browser console
  if (typeof window !== 'undefined') {
    (window as any).__SMART_BILLING_SCHEMA__ = schema;
  }

  return schema;
}

// ─── Step B: AI Extraction ─────────────────────────────────────────────────

/**
 * Calls the Next.js /api/smart-billing/parse endpoint.
 * Builds a rich system prompt from the schema, validates the response,
 * strips unexpected keys, and returns a SmartBillingExtracted object.
 * Returns null on failure (caller shows error toast).
 */
export async function extractInvoiceData(
  prompt: string,
  schema: SmartBillingSchema,
  token: string | undefined,
  currentState: Partial<SmartBillingExistingState>
): Promise<SmartBillingExtracted | null> {

  const fieldPaths = schema.fields.map(f => f.path);

  const currentInvoicePayload = {
    clientName: currentState.clientName || '',
    clientEmail: currentState.clientEmail || '',
    clientPhone: currentState.clientPhone || '',
    clientAddress: currentState.clientAddress || '',
    clientGstin: currentState.clientGstin || '',
    clientPan: currentState.clientPan || '',
    clientState: currentState.clientState || '',
    clientCountry: currentState.clientCountry || '',
    items: currentState.items || [],
  };

  let rawData: any = null;

  const makeRequest = async (authToken?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    return fetch('/api/smart-billing/parse', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt: prompt.trim(),
        current_invoice: currentInvoicePayload,
        allowed_fields: fieldPaths,
      }),
    });
  };

  // First attempt (with auth token if available)
  try {
    let response = await makeRequest(token);

    // If backend returns 401 (token expired or required), retry without token
    if (response.status === 401 && token) {
      console.warn('[SmartBilling] Auth token rejected (401). Retrying without auth header...');
      response = await makeRequest(undefined);
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const msg = errData.detail || errData.error || `HTTP ${response.status}`;
      console.error('[SmartBilling] Backend error:', msg);
      return null;
    }

    rawData = await response.json();
  } catch (networkErr) {
    console.error('[SmartBilling] Network error:', networkErr);
    return null;
  }

  // Validate: must be a plain object
  if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
    console.warn('[SmartBilling] Invalid AI response shape — retrying once');

    // Retry once
    try {
      let retryRes = await makeRequest(token);
      if (retryRes.status === 401 && token) {
        retryRes = await makeRequest(undefined);
      }
      rawData = retryRes.ok ? await retryRes.json() : null;
    } catch {
      return null;
    }

    if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
      console.error('[SmartBilling] Retry also failed');
      return null;
    }
  }

  console.log('[SmartBilling] Raw AI response:', rawData);

  // Strip unexpected top-level keys
  const knownKeys = new Set([...fieldPaths, 'warning', 'error']);
  const cleaned: SmartBillingExtracted = {};
  for (const key of Object.keys(rawData)) {
    if (knownKeys.has(key)) {
      (cleaned as any)[key] = rawData[key];
    }
  }

  // Sanitize clientName
  if (cleaned.clientName) {
    const lower = String(cleaned.clientName).toLowerCase();
    if (/ship to|bill to|same as|copy bill|details same/.test(lower)) {
      delete cleaned.clientName;
    }
  }

  // Pull freight/transport masquerading as line items into freightCharges
  if (Array.isArray(cleaned.items)) {
    const safeItems: typeof cleaned.items = [];
    for (const it of cleaned.items) {
      const n = String(it.name || '').toLowerCase();
      if (/freight|shipping charge|delivery charge|transport charge/.test(n)) {
        if (!cleaned.freightCharges) {
          cleaned.freightCharges = Number(it.rate || 0);
        }
      } else if (/\bdiscount\b/.test(n)) {
        if (!cleaned.discountValue) {
          cleaned.discountValue = Number(it.rate || 0);
          cleaned.discountType = 'flat';
        }
      } else {
        safeItems.push(it);
      }
    }
    cleaned.items = safeItems;
  }

  return cleaned;
}

// ─── Step C: Apply Data to Existing Form Fields Only ──────────────────────

/**
 * Writes each value from `extracted` to the matching form state setter.
 * Rules:
 *   1. Only fills EMPTY fields unless `overwrite` is true (used for "Regenerate All").
 *   2. Never creates new UI elements — only calls existing setters.
 *   3. Data with no matching setter goes into aiExtraData for future template switches.
 *
 * Returns a Set of the field names that were actually written.
 */
export function applySmartBillingData(
  extracted: SmartBillingExtracted,
  setters: SmartBillingSetters,
  existing: SmartBillingExistingState,
  promptText: string,
  overwrite = false
): Set<string> {
  const filled = new Set<string>();

  const toTitleCase = (s: string) =>
    s.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.substring(1).toLowerCase());

  const fill = <T>(
    key: keyof SmartBillingExtracted,
    setter: (v: T) => void,
    existingVal: T,
    transform?: (v: any) => T
  ) => {
    const raw = extracted[key];
    if (raw === undefined || raw === null || raw === '') return;
    const val = transform ? transform(raw) : (raw as unknown as T);
    setter(val);
    filled.add(key as string);
  };

  // 1. Client — also auto-fills from registry if the name matches a saved client
  if (extracted.clientName) {
    const lowerName = String(extracted.clientName).toLowerCase();
    const badWords = ['ship to', 'bill to', 'same as', 'copy bill', 'details same'];
    if (!badWords.some(w => lowerName.includes(w))) {
      const cleanName = toTitleCase(String(extracted.clientName));
      
      // If the client name is changing, clear the old client details first so we don't persist stale data
      if (cleanName.toLowerCase() !== (existing.clientName || '').toLowerCase()) {
        setters.setClientEmail('');
        setters.setClientPhone('');
        setters.setClientAddress('');
        setters.setClientGstin('');
        setters.setClientPan('');
        setters.setClientState('');
        setters.setClientCountry('');
      }

      setters.setClientName(cleanName);
      filled.add('clientName');

      // Registry lookup — auto-fill other client fields
      const found = existing.registryClients.find((c: any) =>
        c.name?.toLowerCase() === cleanName.toLowerCase() ||
        cleanName.toLowerCase().includes(c.name?.toLowerCase() || '') ||
        (c.name?.toLowerCase() || '').includes(cleanName.toLowerCase())
      );
      if (found) {
        if (found.email) { setters.setClientEmail(found.email); filled.add('clientEmail'); }
        if (found.phone) { setters.setClientPhone(found.phone); filled.add('clientPhone'); }
        if (found.address) { setters.setClientAddress(found.address); filled.add('clientAddress'); }
        if (found.gstin) { setters.setClientGstin(found.gstin); filled.add('clientGstin'); }
        if (found.pan) { setters.setClientPan(found.pan); filled.add('clientPan'); }
        if (found.state) { setters.setClientState(found.state); filled.add('clientState'); }
        if (found.country) { setters.setClientCountry(found.country); filled.add('clientCountry'); }
      }
    }
  }

  fill('clientEmail', setters.setClientEmail, existing.clientEmail);
  fill('clientPhone', setters.setClientPhone, existing.clientPhone);
  fill('clientAddress', setters.setClientAddress, existing.clientAddress);
  fill('clientGstin', setters.setClientGstin, existing.clientGstin);
  fill('clientPan', setters.setClientPan, existing.clientPan);
  fill('clientState', setters.setClientState, '');
  fill('clientCountry', setters.setClientCountry, '');

  // 2. Shipping — copy billing if prompt says so
  const isCopyPrompt =
    extracted.copyBillingToShipping ||
    /same as (?:bill|billing)|copy (?:bill|billing) to ship|ship to (?:details )?same/i.test(promptText);
  if (isCopyPrompt) {
    const srcName = extracted.clientName || existing.clientName;
    if (srcName) { setters.setShippedToName(toTitleCase(srcName)); filled.add('shippedToName'); }
    if (extracted.clientEmail || existing.clientEmail) { setters.setShippedToEmail(extracted.clientEmail || existing.clientEmail); filled.add('shippedToEmail'); }
    if (extracted.clientPhone || existing.clientPhone) { setters.setShippedToPhone(extracted.clientPhone || existing.clientPhone); filled.add('shippedToPhone'); }
    if (extracted.clientAddress || existing.clientAddress) { setters.setShippedToAddress(extracted.clientAddress || existing.clientAddress); filled.add('shippedToAddress'); }
    if (extracted.clientCountry || existing.clientCountry) { setters.setShippedToCountry(extracted.clientCountry || existing.clientCountry); filled.add('shippedToCountry'); }
  }
  fill('shippedToName', setters.setShippedToName, '');
  fill('shippedToPhone', setters.setShippedToPhone, '');
  fill('shippedToEmail', setters.setShippedToEmail, '');
  fill('shippedToAddress', setters.setShippedToAddress, '');
  fill('shippedToGstin', setters.setShippedToGstin, '');
  fill('shippedToPan', setters.setShippedToPan, '');
  fill('shippedToState', setters.setShippedToState, '');
  fill('shippedToCountry', setters.setShippedToCountry, '');

  // 3. Transport metadata (Carrier name only — excluding transport charges/fees)
  if (extracted.transport) {
    const tLower = String(extracted.transport).toLowerCase();
    if (/charge|fee|cost|rate|amount|freight|shipping|delivery|add transport|\d/.test(tLower)) {
      delete extracted.transport;
    }
  }

  const parsedVehicleNo = extracted.vehicleNo || (extracted as any).vehicleNumber || (extracted as any).vehicle_no || '';
  fill('transport', setters.setTransport, '');
  if (parsedVehicleNo) { setters.setVehicleNo(parsedVehicleNo); filled.add('vehicleNo'); }
  fill('grRrNo', setters.setGrRrNo, '');
  fill('driverMobile', setters.setDriverMobile, '');
  fill('station', setters.setStation, '');
  fill('ewayBillNo', setters.setEwayBillNo, '');
  fill('placeOfSupply', setters.setPlaceOfSupply, '');
  if (extracted.transport || parsedVehicleNo || extracted.ewayBillNo || extracted.grRrNo || extracted.station || extracted.driverMobile) {
    setters.setHasTransport(true);
  }

  // 4. Document Meta
  fill('invoiceNumber', setters.setInvoiceNumber, '');
  fill('date', setters.setDate, '');
  fill('dueDate', setters.setDueDate, '');
  fill('poNumber', setters.setPoNumber, '');
  fill('referenceNumber', setters.setReferenceNumber, '');
  fill('deliveryNote', setters.setDeliveryNote, '');
  if (extracted.notes) { setters.setNotes((prev: string) => prev ? `${prev}\n${extracted.notes}` : extracted.notes!); filled.add('notes'); }
  fill('invoiceTerms', setters.setInvoiceTerms, '');

  // 5. Financials
  if (extracted.discountValue !== undefined) {
    const val = Number(extracted.discountValue) || 0;
    setters.setDiscountValue(val);
    filled.add('discountValue');
    if (val > 0) {
      const dtRaw = (extracted.discountType as string) || (promptText.includes('%') ? 'percent' : 'flat');
      setters.setDiscountType(dtRaw.includes('percent') ? 'percent' : 'flat');
      filled.add('discountType');
    }
  }
  if (extracted.freightCharges !== undefined) {
    const val = Number(extracted.freightCharges) || 0;
    setters.setFreightCharges(val);
    setters.setIsFreightAdded(val > 0);
    filled.add('freightCharges');
  }

  // 6. Advanced
  if (extracted.invoiceType) { setters.setInvoiceType(extracted.invoiceType.toLowerCase() === 'estimate' ? 'estimate' : 'invoice'); filled.add('invoiceType'); }
  if (extracted.status) { setters.setStatus(extracted.status.toLowerCase() as InvoiceStatus); filled.add('status'); }
  if (extracted.taxMode) { setters.setTaxMode(extracted.taxMode.toLowerCase() === 'custom' ? 'custom' : 'dynamic'); filled.add('taxMode'); }
  fill('customTaxName', setters.setCustomTaxName, '');
  if (extracted.customTaxPercentage !== undefined) { setters.setCustomTaxPercentage(Number(extracted.customTaxPercentage) || 0); filled.add('customTaxPercentage'); }
  if (extracted.isRecurring !== undefined) { setters.setIsRecurring(Boolean(extracted.isRecurring)); filled.add('isRecurring'); }
  if (extracted.recurringInterval) { setters.setRecurringInterval(extracted.recurringInterval.toLowerCase() as RecurringInterval); filled.add('recurringInterval'); }

  // 7. Line Items — preset lookup + safe field mapping
  if (Array.isArray(extracted.items) && extracted.items.length > 0) {
    const parsedItems: InvoiceItem[] = extracted.items.map((it) => {
      const cleanName = String(it.name || '').trim();
      const foundPreset = existing.presets?.find(
        (p: any) => p.name?.toLowerCase() === cleanName.toLowerCase()
      );
      const initialCustomTaxes: Record<string, number> = {};
      (existing.customTaxCols || []).forEach(col => { initialCustomTaxes[col] = 0; });

      return {
        id: `item_${Math.random().toString(36).substr(2, 5)}`,
        name: foundPreset ? foundPreset.name : (cleanName || 'Product / Service'),
        rate: Number(it.rate) || (foundPreset ? Number(foundPreset.rate) : 0),
        quantity: Number(it.quantity) || 1,
        quantityType: it.quantityType || (foundPreset as any)?.quantityType || '',
        taxPercentage: it.taxPercentage !== undefined ? Number(it.taxPercentage) : (foundPreset ? Number(foundPreset.taxPercentage) : existing.defaultTaxRate),
        description: it.description || foundPreset?.description || '',
        hsnCode: it.hsnCode || (foundPreset as any)?.hsnCode || '',
        discountPercentage: Number(it.discountPercentage) || 0,
        customTaxes: initialCustomTaxes,
      } as InvoiceItem;
    });

    setters.setItems((prev) => {
      if (overwrite) return parsedItems;

      const updatedList = [...prev];

      parsedItems.forEach((newItem) => {
        const cleanNewName = newItem.name.trim().toLowerCase();

        // Check helper supporting simple singular/plural match (e.g. laptop matching laptops)
        const isNameMatch = (n1: string, n2: string) => {
          const base1 = n1.replace(/s$/, '');
          const base2 = n2.replace(/s$/, '');
          return base1 === base2;
        };

        const existingIdx = updatedList.findIndex((existingItem) => {
          const cleanExistingName = (existingItem.name || '').trim().toLowerCase();
          const nameMatches = isNameMatch(cleanExistingName, cleanNewName);
          if (nameMatches) {
            const newRate = Number(newItem.rate || 0);
            const existingRate = Number(existingItem.rate || 0);
            // Match if rates are identical, OR if the new item doesn't specify a rate (i.e. rate is 0)
            return newRate === 0 || existingRate === newRate;
          }
          return false;
        });

        if (existingIdx > -1) {
          // Add the new quantity to the existing quantity
          updatedList[existingIdx] = {
            ...updatedList[existingIdx],
            quantity: (updatedList[existingIdx].quantity || 0) + (newItem.quantity || 1)
          };
        } else {
          // Add as a new item row
          updatedList.push(newItem);
        }
      });

      return updatedList;
    });
    filled.add('items');
  }

  // Store any extra data for future template switches
  setters.setAiExtraData((prev) => ({ ...prev, ...extracted }));

  console.log('[SmartBilling] Applied fields:', Array.from(filled));
  return filled;
}
