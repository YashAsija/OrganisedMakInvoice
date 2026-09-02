/**
 * documentUtils.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Utilities for:
 *   1. Classifying invoice types as sales vs. purchase documents
 *   2. Extracting client / vendor details from InvoiceModal state
 *   3. Persisting those details to:
 *        • localStorage master registry  (always, for offline use)
 *        • Supabase `clients` table      (sales docs, when user is signed in)
 *   4. Upsert logic: match on gstin → email → company_name → client_name
 */

import { supabase } from './supabase';

// ─── Document Type Classification ────────────────────────────────────────────

/** Internal InvoiceModal invoiceType values that represent sales transactions */
export const SALES_DOC_TYPES = new Set([
  'invoice',
  'proforma',
  'credit_note',
  'debit_note',
  'estimate',
  'quote',
]);

/** Internal InvoiceModal invoiceType values that represent purchase transactions */
export const PURCHASE_DOC_TYPES = new Set([
  'purchases',
  'purchase_order',
  'purchase_debit_note',
]);

export const isSalesDocument = (docType: string): boolean =>
  SALES_DOC_TYPES.has(docType.toLowerCase());

export const isPurchaseDocument = (docType: string): boolean =>
  PURCHASE_DOC_TYPES.has(docType.toLowerCase());

// ─── ClientDetails Shape ──────────────────────────────────────────────────────

export interface ClientDetails {
  client_name: string | null;
  company_name: string | null;
  email: string | null;
  mobile: string | null;
  country: string | null;
  state: string | null;
  address: string | null;
  gstin: string | null;
  pan: string | null;
}

/**
 * Build a ClientDetails object from the flat state variables in InvoiceModal.
 * All parameters match the state variable names used in InvoiceModal.tsx.
 */
export const buildClientDetails = (params: {
  clientName: string;
  clientCompanyName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  clientCountry: string;
  clientState: string;
  clientGstin: string;
  clientPan: string;
}): ClientDetails => ({
  client_name: params.clientName?.trim() || null,
  company_name: params.clientCompanyName?.trim() || null,
  email: params.clientEmail?.trim() || null,
  mobile: params.clientPhone?.trim() || null,
  country: params.clientCountry?.trim() || null,
  state: params.clientState?.trim() || null,
  address: params.clientAddress?.trim() || null,
  gstin: params.clientGstin?.trim() || null,
  pan: params.clientPan?.trim() || null,
});

// ─── Master Registry (localStorage) Upsert ───────────────────────────────────

/**
 * Upsert a client/vendor record in the localStorage master registry.
 *
 * Sales docs  → writes to `makbills_masters_vendors<suffix>`
 * Purchase docs → writes to `makbills_masters_actual_vendors<suffix>`
 *
 * After writing, dispatches the corresponding sync CustomEvent so any open
 * Dashboard view immediately reflects the change.
 */
export const upsertMasterRegistry = (
  details: ClientDetails,
  docType: string,
  suffix: string,           // e.g. `_${encodeURIComponent(email)}`
): void => {
  const isPurchase = isPurchaseDocument(docType);
  const registryKey = isPurchase
    ? `makbills_masters_actual_vendors${suffix}`
    : `makbills_masters_vendors${suffix}`;
  const syncEvent = isPurchase
    ? 'makbills_sync_actual_vendors'
    : 'makbills_sync_vendors';

  const hasIdentifier =
    details.client_name || details.company_name || details.email || details.gstin;
  if (!hasIdentifier) {
    console.log('[documentUtils] upsertMasterRegistry: no identifier — skipping');
    return;
  }

  let registry: any[] = [];
  try {
    registry = JSON.parse(localStorage.getItem(registryKey) || '[]');
  } catch {
    registry = [];
  }

  // Match priority: gstin → email → company_name → client_name
  const nameLower = (details.client_name || details.company_name || '').toLowerCase();
  const existingIdx = registry.findIndex((r: any) => {
    if (details.gstin && r.gstin && r.gstin.toLowerCase() === details.gstin.toLowerCase()) return true;
    if (details.email && r.email && r.email.toLowerCase() === details.email.toLowerCase()) return true;
    if (details.company_name && r.company_name && r.company_name.toLowerCase() === details.company_name.toLowerCase()) return true;
    if (details.company_name && r.company && r.company.toLowerCase() === details.company_name.toLowerCase()) return true;
    if (details.company_name && r.companyName && r.companyName.toLowerCase() === details.company_name.toLowerCase()) return true;
    if (nameLower && r.name && r.name.toLowerCase() === nameLower) return true;
    return false;
  });

  const record = {
    name: details.client_name || details.company_name || 'Unknown',
    companyName: details.company_name || details.client_name || '',
    company: details.company_name || details.client_name || '',
    company_name: details.company_name || null,
    email: details.email || '',
    phone: details.mobile || '',
    mobile: details.mobile || '',
    address: details.address || '',
    country: details.country || 'India',
    state: details.state || '',
    taxId: details.gstin || '',
    gstin: details.gstin || '',
    pan: details.pan || '',
    category: isPurchase ? 'Auto-Added from Purchase' : 'Auto-Added from Invoice',
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx > -1) {
    // Merge — only overwrite non-empty values
    const existing = registry[existingIdx];
    registry[existingIdx] = {
      ...existing,
      ...Object.fromEntries(
        Object.entries(record).filter(([, v]) => v !== '' && v !== null && v !== undefined)
      ),
    };
    console.log(`[documentUtils] upsertMasterRegistry: UPDATED existing record in ${registryKey}`, details);
  } else {
    registry.push({
      id: `mat_${Math.random().toString(36).substr(2, 9)}`,
      ...record,
      createdAt: new Date().toISOString(),
    });
    console.log(`[documentUtils] upsertMasterRegistry: INSERTED new record in ${registryKey}`, details);
  }

  localStorage.setItem(registryKey, JSON.stringify(registry));
  window.dispatchEvent(new CustomEvent(syncEvent));
};

// ─── Supabase Upsert (Sales only → `clients` table) ──────────────────────────

/**
 * Upsert client details into the Supabase `clients` table.
 * Only called for sales documents where a userId is available.
 *
 * Match priority: gstin → email → companyName → name
 * If a match is found → UPDATE; otherwise → INSERT.
 */
export const upsertSupabaseClient = async (
  details: ClientDetails,
  userId: string,
): Promise<void> => {
  const hasIdentifier =
    details.client_name || details.company_name || details.email || details.gstin;
  if (!hasIdentifier || !userId) {
    console.log('[documentUtils] upsertSupabaseClient: no identifier or userId — skipping');
    return;
  }

  console.log('[documentUtils] upsertSupabaseClient: Saving to clients table:', details);

  try {
    // Build the lookup query — match on most-unique field first
    let query = supabase
      .from('clients')
      .select('id, name, companyName, email, phone, address, gstin, pan, state, country')
      .eq('userId', userId);

    if (details.gstin) {
      query = query.eq('gstin', details.gstin);
    } else if (details.email) {
      query = query.eq('email', details.email);
    } else if (details.company_name) {
      query = query.eq('companyName', details.company_name);
    } else {
      query = query.eq('name', details.client_name!);
    }

    const { data: existing, error: fetchErr } = await query.maybeSingle();
    if (fetchErr) {
      console.warn('[documentUtils] upsertSupabaseClient: lookup error', fetchErr);
    }

    const payload: Record<string, any> = {
      userId,
      name: details.client_name || details.company_name || 'Unknown',
      companyName: details.company_name || null,
      email: details.email || null,
      phone: details.mobile || null,
      address: details.address || null,
      country: details.country || null,
      state: details.state || null,
      gstin: details.gstin || null,
      pan: details.pan || null,
      updatedAt: new Date().toISOString(),
    };

    if (existing?.id) {
      // Merge — only overwrite with non-null values
      const mergedPayload = Object.fromEntries(
        Object.entries(payload).filter(([, v]) => v !== null && v !== undefined)
      );
      const { error: updateErr } = await supabase
        .from('clients')
        .update(mergedPayload)
        .eq('id', existing.id);

      if (updateErr) {
        console.error('[documentUtils] upsertSupabaseClient: UPDATE error', updateErr);
      } else {
        console.log('[documentUtils] upsertSupabaseClient: ✅ UPDATED client in Supabase', existing.id);
      }
    } else {
      payload.createdAt = new Date().toISOString();
      payload.id = `client_${Math.random().toString(36).substr(2, 9)}`;
      const { error: insertErr } = await supabase.from('clients').insert(payload);

      if (insertErr) {
        console.error('[documentUtils] upsertSupabaseClient: INSERT error', insertErr);
      } else {
        console.log('[documentUtils] upsertSupabaseClient: ✅ INSERTED client into Supabase');
      }
    }
  } catch (err) {
    console.error('[documentUtils] upsertSupabaseClient: Exception', err);
  }
};

// ─── Combined Save ────────────────────────────────────────────────────────────

import { pushMasterRegistriesToCloud, getLocalMasterRegistry } from './masterRegistrySync';

/**
 * Primary entry point called after every successful document save.
 *
 * 1. Always writes to localStorage master registry (offline-first)
 * 2. For sales documents: also upserts to Supabase `clients` table
 * 3. Syncs updated master database with Supabase cloud across all devices
 *
 * @param details  - Extracted client/vendor details from the document
 * @param docType  - The invoiceType string from InvoiceModal (e.g. 'invoice', 'purchases')
 * @param userId   - Supabase user id (null/undefined for offline users)
 * @param suffix   - localStorage key suffix based on profile email
 */
export const persistBilledParty = async (
  details: ClientDetails,
  docType: string,
  userId: string | null | undefined,
  suffix: string,
): Promise<void> => {
  // 1. Always save to localStorage master registry
  upsertMasterRegistry(details, docType, suffix);

  // 2. For sales documents, also sync to Supabase clients table
  if (isSalesDocument(docType) && userId) {
    await upsertSupabaseClient(details, userId);
  }

  // 3. Sync updated master database with Supabase cloud across all devices
  if (userId) {
    try {
      const isSales = isSalesDocument(docType);
      const key = isSales ? 'makbills_masters_vendors' : 'makbills_masters_actual_vendors';
      const updatedList = getLocalMasterRegistry(key, suffix);
      const transportList = getLocalMasterRegistry('makbills_masters_transports', suffix);

      await pushMasterRegistriesToCloud(userId, suffix, {
        [isSales ? 'vendors' : 'actualVendors']: updatedList,
        transports: transportList,
      });
    } catch (err) {
      console.warn('[documentUtils] Failed to sync master party to cloud:', err);
    }
  }
};
