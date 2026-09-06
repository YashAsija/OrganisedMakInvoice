import { supabase } from './supabase';
import { MasterVendor, MasterHsnCode, MasterGlAccount, MasterCategory, MasterSubCategory, MasterMapping, PaymentRecord } from '../types';

export interface MasterRegistriesPayload {
  vendors?: MasterVendor[];
  actualVendors?: MasterVendor[];
  transports?: any[];
  hsnCodes?: MasterHsnCode[];
  materials?: any[];
  categories?: MasterCategory[];
  subCategories?: MasterSubCategory[];
  glAccounts?: MasterGlAccount[];
  mappings?: MasterMapping[];
  manualPayments?: PaymentRecord[];
  settlements?: Record<string, any>;
}

/**
 * Helper to get local master registry array for a given key suffix
 */
export const getLocalMasterRegistry = (key: string, suffix: string, fallback: any[] = []): any[] => {
  if (typeof window === 'undefined') return fallback;
  try {
    const cached = localStorage.getItem(`${key}${suffix}`);
    if (cached) return JSON.parse(cached);
  } catch (e) {}
  return fallback;
};

/**
 * Helper to save local master registry array for a given key suffix
 */
export const setLocalMasterRegistry = (key: string, suffix: string, data: any[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${key}${suffix}`, JSON.stringify(data));
  } catch (e) {}
};

/**
 * Tombstone Helpers: Records signatures of explicitly deleted records to prevent
 * invoice auto-extract or background merges from resurrecting deleted records.
 */
export const getDeletedRegistryKeys = (suffix: string): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const cached = localStorage.getItem(`makbills_masters_deleted${suffix}`);
    if (cached) return new Set(JSON.parse(cached));
  } catch (e) {}
  return new Set();
};

export const markRegistryKeyDeleted = (keyOrItem: any, suffix: string): void => {
  if (typeof window === 'undefined' || !keyOrItem) return;
  try {
    const set = getDeletedRegistryKeys(suffix);
    const clean = (s: any) => String(s || '').toLowerCase().trim();

    if (typeof keyOrItem === 'string') {
      const s = clean(keyOrItem);
      if (s) {
        set.add(s);
        set.add(`id_${s}`);
        set.add(`name_${s}`);
        set.add(`comp_${s}`);
        set.add(`gst_${s}`);
        set.add(`email_${s}`);
        set.add(`cl_${s}`);
        set.add(`ven_${s}`);
        set.add(`billed_${s}`);
      }
    } else {
      const id = clean(keyOrItem.id);
      const name = clean(keyOrItem.name || keyOrItem.clientName || keyOrItem.vendorName || keyOrItem.contactPerson || keyOrItem.contactName);
      const comp = clean(keyOrItem.company || keyOrItem.companyName || keyOrItem.clientCompanyName || keyOrItem.clientCompany || keyOrItem.firmName);
      const gstin = clean(keyOrItem.gstin || keyOrItem.taxId || keyOrItem.clientGstin);
      const email = clean(keyOrItem.email || keyOrItem.clientEmail);
      const phone = clean(keyOrItem.phone || keyOrItem.mobile || keyOrItem.clientPhone).replace(/\D/g, '');

      if (id) {
        set.add(id);
        set.add(`id_${id}`);
        set.add(`cl_${id}`);
        set.add(`ven_${id}`);
        set.add(`billed_${id}`);
      }
      if (name) {
        set.add(name);
        set.add(`name_${name}`);
        set.add(`cl_name_${name}`);
        set.add(`ven_name_${name}`);
        set.add(`billed_name_${name}`);
      }
      if (comp) {
        set.add(comp);
        set.add(`comp_${comp}`);
        set.add(`name_${comp}`);
        set.add(`cl_comp_${comp}`);
        set.add(`ven_comp_${comp}`);
        set.add(`billed_comp_${comp}`);
      }
      if (name && comp) {
        set.add(`comp_${comp}__name_${name}`);
        set.add(`name_${name}__comp_${comp}`);
        set.add(`cl_comp_${comp}__name_${name}`);
        set.add(`ven_comp_${comp}__name_${name}`);
        set.add(`billed_comp_${comp}__name_${name}`);
      }
      if (gstin && gstin.length >= 8) {
        set.add(gstin);
        set.add(`gst_${gstin}`);
        set.add(`tax_${gstin}`);
        set.add(`cl_gst_${gstin}`);
        set.add(`ven_gst_${gstin}`);
        set.add(`billed_gst_${gstin}`);
      }
      if (email && email.includes('@')) {
        set.add(email);
        set.add(`email_${email}`);
        set.add(`cl_email_${email}`);
        set.add(`ven_email_${email}`);
        set.add(`billed_email_${email}`);
      }
      if (phone && phone.length >= 7) {
        set.add(`phone_${phone}`);
      }
    }
    localStorage.setItem(`makbills_masters_deleted${suffix}`, JSON.stringify(Array.from(set)));
    window.dispatchEvent(new CustomEvent('makbills_registry_deleted'));
  } catch (e) {}
};

export const unmarkRegistryKeyDeleted = (keyOrItem: any, suffix: string): void => {
  if (typeof window === 'undefined' || !keyOrItem) return;
  try {
    const set = getDeletedRegistryKeys(suffix);
    if (set.size === 0) return;

    const clean = (s: any) => String(s || '').toLowerCase().trim();
    const toRemove: string[] = [];

    if (typeof keyOrItem === 'string') {
      const s = clean(keyOrItem);
      if (s) {
        toRemove.push(s, `id_${s}`, `name_${s}`, `gst_${s}`, `email_${s}`, `comp_${s}`, `cl_${s}`, `ven_${s}`);
        set.forEach(k => {
          if (k.includes(s)) toRemove.push(k);
        });
      }
    } else {
      const id = clean(keyOrItem.id);
      const name = clean(keyOrItem.name || keyOrItem.clientName || keyOrItem.vendorName || keyOrItem.client_name);
      const comp = clean(keyOrItem.company || keyOrItem.companyName || keyOrItem.clientCompanyName || keyOrItem.clientCompany || keyOrItem.company_name);
      const gstin = clean(keyOrItem.gstin || keyOrItem.taxId || keyOrItem.clientGstin || keyOrItem.tax_id);
      const email = clean(keyOrItem.email || keyOrItem.clientEmail);

      if (id) toRemove.push(id, `id_${id}`, `cl_${id}`, `ven_${id}`);
      if (name) {
        toRemove.push(name, `name_${name}`);
        set.forEach(k => { if (k.includes(name)) toRemove.push(k); });
      }
      if (comp) {
        toRemove.push(comp, `comp_${comp}`, `name_${comp}`);
        set.forEach(k => { if (k.includes(comp)) toRemove.push(k); });
      }
      if (gstin) {
        toRemove.push(gstin, `gst_${gstin}`);
        set.forEach(k => { if (k.includes(gstin)) toRemove.push(k); });
      }
      if (email) {
        toRemove.push(email, `email_${email}`);
        set.forEach(k => { if (k.includes(email)) toRemove.push(k); });
      }
    }

    let changed = false;
    toRemove.forEach(k => {
      if (set.has(k)) {
        set.delete(k);
        changed = true;
      }
    });

    if (changed) {
      localStorage.setItem(`makbills_masters_deleted${suffix}`, JSON.stringify(Array.from(set)));
      window.dispatchEvent(new CustomEvent('makbills_registry_deleted'));
    }
  } catch (e) {}
};

export const isRegistryItemDeleted = (item: any, suffix: string): boolean => {
  if (!item) return false;
  const set = getDeletedRegistryKeys(suffix);
  if (set.size === 0) return false;

  const clean = (s: any) => String(s || '').toLowerCase().trim();

  if (typeof item === 'string') {
    const s = clean(item);
    if (!s) return false;
    return set.has(s) || set.has(`id_${s}`) || set.has(`name_${s}`) || set.has(`comp_${s}`) || set.has(`gst_${s}`) || set.has(`email_${s}`) || set.has(`billed_${s}`);
  }

  const id = clean(item.id);
  const name = clean(item.name || item.clientName || item.vendorName || item.contactPerson || item.contactName);
  const comp = clean(item.company || item.companyName || item.clientCompanyName || item.clientCompany || item.firmName);
  const gstin = clean(item.gstin || item.taxId || item.clientGstin);
  const email = clean(item.email || item.clientEmail);
  const phone = clean(item.phone || item.mobile || item.clientPhone).replace(/\D/g, '');

  if (id && (set.has(id) || set.has(`id_${id}`) || set.has(`cl_${id}`) || set.has(`ven_${id}`) || set.has(`billed_${id}`))) return true;
  if (gstin && gstin.length >= 8 && (set.has(gstin) || set.has(`gst_${gstin}`) || set.has(`tax_${gstin}`) || set.has(`cl_gst_${gstin}`) || set.has(`ven_gst_${gstin}`) || set.has(`billed_gst_${gstin}`))) return true;
  if (email && email.includes('@') && (set.has(email) || set.has(`email_${email}`) || set.has(`cl_email_${email}`) || set.has(`ven_email_${email}`) || set.has(`billed_email_${email}`))) return true;
  if (phone && phone.length >= 7 && set.has(`phone_${phone}`)) return true;
  if (name && comp && (set.has(`comp_${comp}__name_${name}`) || set.has(`name_${name}__comp_${comp}`) || set.has(`billed_comp_${comp}__name_${name}`))) return true;
  if (name && name.length >= 4 && (set.has(`name_${name}`) || set.has(`billed_name_${name}`))) return true;
  if (comp && comp.length >= 4 && (set.has(`comp_${comp}`) || set.has(`billed_comp_${comp}`))) return true;

  return false;
};

/**
 * Intelligent Party Matcher: Matches across GSTIN, PAN, Email, Phone (10 digits), and Name / Company.
 * Prevents double entries when one record has a GSTIN and another does not, or when company name is used as party name.
 */
export const isPartyMatch = (a: any, b: any): boolean => {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.id && b.id && a.id === b.id) return true;

  const clean = (s: any) => String(s || '').trim().toLowerCase();
  const cleanNum = (s: any) => String(s || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const cleanPhone = (s: any) => String(s || '').replace(/\D/g, '').slice(-10);

  // 1. Match by GSTIN / Tax ID (length >= 10)
  const aGst = cleanNum(a.gstin || a.taxId || a.clientGstin);
  const bGst = cleanNum(b.gstin || b.taxId || b.clientGstin);
  if (aGst && bGst && aGst.length >= 10 && aGst === bGst) return true;

  // 2. Match by PAN (length >= 10)
  const aPan = cleanNum(a.pan || a.clientPan);
  const bPan = cleanNum(b.pan || b.clientPan);
  if (aPan && bPan && aPan.length >= 10 && aPan === bPan) return true;

  // 3. Match by Email
  const aEmail = clean(a.email || a.clientEmail);
  const bEmail = clean(b.email || b.clientEmail);
  if (aEmail && bEmail && aEmail.includes('@') && aEmail === bEmail) return true;

  const aName = clean(a.name || a.clientName || a.contactPerson || a.contactName);
  const bName = clean(b.name || b.clientName || b.contactPerson || b.contactName);
  const aComp = clean(a.company || a.companyName || a.clientCompanyName || a.clientCompany || a.firmName);
  const bComp = clean(b.company || b.companyName || b.clientCompanyName || b.clientCompany || b.firmName);

  // 4. Match by 10-digit Phone if names/companies are non-contradictory
  const aPhone = cleanPhone(a.phone || a.mobile || a.clientPhone);
  const bPhone = cleanPhone(b.phone || b.mobile || b.clientPhone);
  if (aPhone && bPhone && aPhone.length >= 10 && aPhone === bPhone) {
    if (!aName && !bName && !aComp && !bComp) return true;
    if (
      (aName && bName && (aName === bName || aName.includes(bName) || bName.includes(aName))) ||
      (aComp && bComp && (aComp === bComp || aComp.includes(bComp) || bComp.includes(aComp))) ||
      (aName && bComp && (aName === bComp || aName.includes(bComp) || bComp.includes(aName))) ||
      (aComp && bName && (aComp === bName || aComp.includes(bName) || bName.includes(aComp)))
    ) {
      return true;
    }
  }

  // 5. Cross-match Name and Company
  if (aName && bName && aName.length >= 2 && aName === bName) return true;
  if (aComp && bComp && aComp.length >= 2 && aComp === bComp) return true;
  if (aName && bComp && aName.length >= 2 && aName === bComp) return true;
  if (aComp && bName && aComp.length >= 2 && aComp === bName) return true;

  return false;
};

/**
 * Merge two party records safely, preserving all non-empty fields and accumulating metrics
 */
export const mergePartyRecords = (existing: any, incoming: any): any => {
  const gstin = incoming.gstin || incoming.taxId || incoming.clientGstin || existing.gstin || existing.taxId || '';
  const pan = incoming.pan || incoming.clientPan || existing.pan || (gstin.length === 15 ? gstin.substring(2, 12) : '');
  const name = incoming.name || incoming.clientName || existing.name || incoming.company || existing.company || '';
  const comp = incoming.company || incoming.companyName || incoming.clientCompanyName || existing.company || existing.companyName || '';
  const email = incoming.email || incoming.clientEmail || existing.email || '';
  const phone = incoming.phone || incoming.mobile || incoming.clientPhone || existing.phone || existing.mobile || '';
  const address = incoming.address || incoming.clientAddress || existing.address || '';
  const state = incoming.state || incoming.clientState || existing.state || '';
  const country = incoming.country || incoming.clientCountry || existing.country || 'India';

  let partyType = existing.partyType || 'Client';
  const incomingType = incoming.partyType || (incoming.category?.includes('Vendor') ? 'Vendor' : 'Client');
  if (existing.partyType && incomingType && existing.partyType !== incomingType) {
    partyType = 'Client & Vendor';
  } else if (incoming.partyType) {
    partyType = incoming.partyType;
  }

  const category = existing.category || incoming.category || (partyType === 'Vendor' ? 'Vendor' : 'Client');
  const displayName = comp && comp !== name ? `${comp} (${name})` : (name || comp);

  return {
    ...existing,
    ...incoming,
    id: existing.id || incoming.id,
    name,
    company: comp,
    companyName: comp,
    displayName,
    email,
    phone,
    mobile: phone,
    address,
    state,
    country,
    gstin,
    taxId: gstin,
    pan,
    partyType,
    category,
    documentCount: (existing.documentCount || 0) + (incoming.documentCount || 0),
    totalBilled: (existing.totalBilled || 0) + (incoming.totalBilled || 0),
    updatedAt: new Date().toISOString(),
  };
};

/**
 * Deduplicate an array of party records using intelligent multi-field matching
 */
export const deduplicatePartyList = <T extends Record<string, any>>(list: T[]): T[] => {
  if (!Array.isArray(list) || list.length <= 1) return list || [];
  const result: T[] = [];
  list.forEach(item => {
    if (!item) return;
    const idx = result.findIndex(existing => isPartyMatch(existing, item));
    if (idx >= 0) {
      result[idx] = mergePartyRecords(result[idx], item);
    } else {
      result.push({ ...item });
    }
  });
  return result;
};

/**
 * Merge two arrays of objects by unique identifier (id or name/code)
 */
export const mergeListsByIdOrName = <T extends Record<string, any>>(localList: T[], remoteList: T[], keyField = 'id', altKeyField = 'name'): T[] => {
  const map = new Map<string, T>();

  // Add local items first
  localList.forEach(item => {
    const key = item[keyField] || item[altKeyField] || item.code || item.vehicleNo;
    if (key) map.set(String(key).toLowerCase(), item);
  });

  // Merge remote items (remote takes precedence if updated)
  remoteList.forEach(item => {
    const key = item[keyField] || item[altKeyField] || item.code || item.vehicleNo;
    if (key) {
      const existing = map.get(String(key).toLowerCase());
      map.set(String(key).toLowerCase(), existing ? { ...existing, ...item } : item);
    }
  });

  return Array.from(map.values());
};

/**
 * Pushes the full set of master registries to Supabase company_settings for the user.
 * Authoritative: When a field is passed in payload, it directly replaces that array in the cloud.
 */
export const pushMasterRegistriesToCloud = async (
  userId: string | null | undefined,
  suffix: string,
  payload: MasterRegistriesPayload
): Promise<void> => {
  if (!userId) return;

  try {
    // 1. Save current payload to local storage
    if (payload.vendors !== undefined) setLocalMasterRegistry('makbills_masters_vendors', suffix, payload.vendors);
    if (payload.actualVendors !== undefined) setLocalMasterRegistry('makbills_masters_actual_vendors', suffix, payload.actualVendors);
    if (payload.transports !== undefined) setLocalMasterRegistry('makbills_masters_transports', suffix, payload.transports);
    if (payload.hsnCodes !== undefined) setLocalMasterRegistry('makbills_masters_hsn', suffix, payload.hsnCodes);
    if (payload.materials !== undefined) setLocalMasterRegistry('makbills_masters_materials', suffix, payload.materials);
    if (payload.categories !== undefined) setLocalMasterRegistry('makbills_masters_categories', suffix, payload.categories);
    if (payload.subCategories !== undefined) setLocalMasterRegistry('makbills_masters_subcategories', suffix, payload.subCategories);
    if (payload.glAccounts !== undefined) setLocalMasterRegistry('makbills_masters_gl', suffix, payload.glAccounts);
    if (payload.mappings !== undefined) setLocalMasterRegistry('makbills_masters_mappings', suffix, payload.mappings);
    if (payload.manualPayments !== undefined) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`makbills_manual_payments${suffix}`, JSON.stringify(payload.manualPayments));
        localStorage.setItem('makbills_manual_payments', JSON.stringify(payload.manualPayments));
      }
    }
    if (payload.settlements !== undefined) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`makbills_payments_settlements${suffix}`, JSON.stringify(payload.settlements));
        localStorage.setItem('makbills_payments_settlements', JSON.stringify(payload.settlements));
      }
    }

    // 2. Fetch existing company_settings row
    const { data: companySettings } = await supabase
      .from('company_settings')
      .select('id, master_registries, custom_templates')
      .eq('user_id', userId)
      .maybeSingle();

    const existingMasterData = (companySettings?.master_registries && typeof companySettings.master_registries === 'object') 
      ? companySettings.master_registries 
      : {};

    let customTemplatesObj: any = {};
    if (companySettings?.custom_templates) {
      try {
        customTemplatesObj = typeof companySettings.custom_templates === 'string'
          ? JSON.parse(companySettings.custom_templates)
          : companySettings.custom_templates;
      } catch (e) {}
    }

    // Direct replacement for provided payload fields (authoritative updates/deletions)
    const updatedMasterRegistries = {
      ...existingMasterData,
      ...payload,
      updated_at: new Date().toISOString()
    };

    // Store in custom_templates.master_registries as primary fallback + master_registries column
    customTemplatesObj.master_registries = updatedMasterRegistries;

    const updatePayload: Record<string, any> = {
      user_id: userId,
      custom_templates: JSON.stringify(customTemplatesObj),
      master_registries: updatedMasterRegistries,
      updated_at: new Date().toISOString()
    };

    if (companySettings?.id) {
      const { error } = await supabase
        .from('company_settings')
        .update(updatePayload)
        .eq('id', companySettings.id);

      if (error) {
        // Fallback without master_registries column if not migrated yet
        delete updatePayload.master_registries;
        await supabase.from('company_settings').update(updatePayload).eq('id', companySettings.id);
      }
    } else {
      const { error } = await supabase.from('company_settings').insert([updatePayload]);
      if (error) {
        delete updatePayload.master_registries;
        await supabase.from('company_settings').insert([updatePayload]);
      }
    }
  } catch (err) {
    console.error('[masterRegistrySync] Error pushing master registries to cloud:', err);
  }
};

export const isPurchaseVendorRecord = (item: any): boolean => {
  if (!item) return false;
  const cat = (item.category || '').toLowerCase();
  const name = (item.name || item.company || '').toLowerCase();
  if (cat.includes('purchase') || cat.includes('vendor') || cat.includes('supplier') || cat.includes('overheads') || cat.includes('saas subscriptions') || cat.includes('rent & overheads')) {
    return true;
  }
  if (['aws cloud hosting', 'wework office space', 'google suite workspace', 'amazon web services'].includes(name)) {
    return true;
  }
  return false;
};

/**
 * Fetches and merges master registries from Supabase cloud into local storage and returns unified state.
 * Supabase company_settings.master_registries is the authoritative single source of truth across all devices.
 */
export const pullMasterRegistriesFromCloud = async (
  userId: string | null | undefined,
  suffix: string
): Promise<MasterRegistriesPayload | null> => {
  if (!userId) return null;

  try {
    // 1. Read company_settings (Primary Source of Truth)
    const { data: companySettings } = await supabase
      .from('company_settings')
      .select('master_registries, custom_templates')
      .eq('user_id', userId)
      .maybeSingle();

    let remoteMasterData: MasterRegistriesPayload = {};
    if (companySettings) {
      if (companySettings.master_registries && typeof companySettings.master_registries === 'object') {
        remoteMasterData = companySettings.master_registries;
      }
      if (companySettings.custom_templates) {
        try {
          const parsedObj = typeof companySettings.custom_templates === 'string'
            ? JSON.parse(companySettings.custom_templates)
            : companySettings.custom_templates;
          if (parsedObj?.master_registries) {
            remoteMasterData = { ...parsedObj.master_registries, ...remoteMasterData };
          }
        } catch (e) {}
      }
    }

    // 2. Fetch clients table rows ONLY as initial seed if remoteMasterData.vendors is completely missing
    let rawRemoteVendors: MasterVendor[] = [];
    if (Array.isArray(remoteMasterData.vendors)) {
      rawRemoteVendors = remoteMasterData.vendors;
    } else {
      const { data: clientsTableRows } = await supabase
        .from('clients')
        .select('*')
        .eq('userId', userId);

      if (clientsTableRows && clientsTableRows.length > 0) {
        rawRemoteVendors = clientsTableRows.map((row: any) => ({
          id: row.id,
          name: row.name || row.companyName || 'Client',
          company: row.companyName || row.name || '',
          email: row.email || '',
          phone: row.phone || '',
          address: row.address || '',
          gstin: row.gstin || row.taxId || '',
          pan: row.pan || '',
          state: row.state || '',
          country: row.country || ''
        }));
      }
    }

    const rawRemoteActualVendors = Array.isArray(remoteMasterData.actualVendors) ? remoteMasterData.actualVendors : [];

    // Filter out any explicitly deleted tombstones
    const filteredVendors = rawRemoteVendors.filter(v => !isRegistryItemDeleted(v, suffix));
    const filteredActualVendors = rawRemoteActualVendors.filter(v => !isRegistryItemDeleted(v, suffix));

    // Strict segregation: Filter out purchase vendors from Client Database (vendors) and move to Vendor Database (actualVendors)
    const clientVendors: MasterVendor[] = [];
    const mislocatedVendors: MasterVendor[] = [];

    filteredVendors.forEach((v) => {
      if (isPurchaseVendorRecord(v)) {
        mislocatedVendors.push({ ...v, category: v.category || 'Vendor' });
      } else {
        clientVendors.push(v);
      }
    });

    const mergedVendors = deduplicatePartyList(clientVendors);
    const mergedActualVendors = deduplicatePartyList(mergeListsByIdOrName(filteredActualVendors, mislocatedVendors));
    const mergedTransports = (remoteMasterData.transports || []).filter(t => !isRegistryItemDeleted(t, suffix));
    const mergedHsnCodes = (remoteMasterData.hsnCodes || []).filter(h => !isRegistryItemDeleted(h, suffix));
    const mergedMaterials = (remoteMasterData.materials || []).filter(m => !isRegistryItemDeleted(m, suffix));
    const mergedCategories = (remoteMasterData.categories || []).filter(c => !isRegistryItemDeleted(c, suffix));
    const mergedSubCategories = (remoteMasterData.subCategories || []).filter(s => !isRegistryItemDeleted(s, suffix));
    const mergedGlAccounts = (remoteMasterData.glAccounts || []).filter(g => !isRegistryItemDeleted(g, suffix));
    const mergedMappings = (remoteMasterData.mappings || []).filter(m => !isRegistryItemDeleted(m, suffix));

    // 4. Update scoped cache strictly for this user account
    setLocalMasterRegistry('makbills_masters_vendors', suffix, mergedVendors);
    setLocalMasterRegistry('makbills_masters_actual_vendors', suffix, mergedActualVendors);
    setLocalMasterRegistry('makbills_masters_transports', suffix, mergedTransports);
    setLocalMasterRegistry('makbills_masters_hsn', suffix, mergedHsnCodes);
    setLocalMasterRegistry('makbills_masters_materials', suffix, mergedMaterials);
    setLocalMasterRegistry('makbills_masters_categories', suffix, mergedCategories);
    setLocalMasterRegistry('makbills_masters_subcategories', suffix, mergedSubCategories);
    setLocalMasterRegistry('makbills_masters_gl', suffix, mergedGlAccounts);
    setLocalMasterRegistry('makbills_masters_mappings', suffix, mergedMappings);

    // Sync Manual Payments & Settlements across devices
    let mergedManualPayments = Array.isArray(remoteMasterData.manualPayments) ? remoteMasterData.manualPayments : undefined;
    if (mergedManualPayments !== undefined && typeof window !== 'undefined') {
      localStorage.setItem(`makbills_manual_payments${suffix}`, JSON.stringify(mergedManualPayments));
      localStorage.setItem('makbills_manual_payments', JSON.stringify(mergedManualPayments));
      window.dispatchEvent(new CustomEvent('mak_manual_payment_added'));
    }

    let mergedSettlements = (remoteMasterData.settlements && typeof remoteMasterData.settlements === 'object') ? remoteMasterData.settlements : undefined;
    if (mergedSettlements !== undefined && typeof window !== 'undefined') {
      localStorage.setItem(`makbills_payments_settlements${suffix}`, JSON.stringify(mergedSettlements));
      localStorage.setItem('makbills_payments_settlements', JSON.stringify(mergedSettlements));
      window.dispatchEvent(new CustomEvent('mak_payment_settled'));
    }

    const mergedPayload: MasterRegistriesPayload = {
      vendors: mergedVendors,
      actualVendors: mergedActualVendors,
      transports: mergedTransports,
      hsnCodes: mergedHsnCodes,
      materials: mergedMaterials,
      categories: mergedCategories,
      subCategories: mergedSubCategories,
      glAccounts: mergedGlAccounts,
      mappings: mergedMappings,
      manualPayments: mergedManualPayments,
      settlements: mergedSettlements
    };

    return mergedPayload;
  } catch (err) {
    console.error('[masterRegistrySync] Error pulling master registries from cloud:', err);
    return null;
  }
};
