import { supabase } from './supabase';
import { MasterVendor, MasterHsnCode, MasterGlAccount, MasterCategory, MasterSubCategory, MasterMapping } from '../types';

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
 * Pushes the full set of master registries to Supabase company_settings for the user
 */
export const pushMasterRegistriesToCloud = async (
  userId: string | null | undefined,
  suffix: string,
  payload: MasterRegistriesPayload
): Promise<void> => {
  if (!userId) return;

  try {
    // 1. Save current payload to local storage
    if (payload.vendors) setLocalMasterRegistry('makbills_masters_vendors', suffix, payload.vendors);
    if (payload.actualVendors) setLocalMasterRegistry('makbills_masters_actual_vendors', suffix, payload.actualVendors);
    if (payload.transports) setLocalMasterRegistry('makbills_masters_transports', suffix, payload.transports);
    if (payload.hsnCodes) setLocalMasterRegistry('makbills_masters_hsn', suffix, payload.hsnCodes);
    if (payload.materials) setLocalMasterRegistry('makbills_masters_materials', suffix, payload.materials);
    if (payload.categories) setLocalMasterRegistry('makbills_masters_categories', suffix, payload.categories);
    if (payload.subCategories) setLocalMasterRegistry('makbills_masters_subcategories', suffix, payload.subCategories);
    if (payload.glAccounts) setLocalMasterRegistry('makbills_masters_gl', suffix, payload.glAccounts);
    if (payload.mappings) setLocalMasterRegistry('makbills_masters_mappings', suffix, payload.mappings);

    // 2. Fetch existing company_settings row
    const { data: companySettings } = await supabase
      .from('company_settings')
      .select('id, master_registries, custom_templates')
      .eq('user_id', userId)
      .maybeSingle();

    const existingMasterData = companySettings?.master_registries || {};
    let customTemplatesObj: any = {};
    if (companySettings?.custom_templates) {
      try {
        customTemplatesObj = typeof companySettings.custom_templates === 'string'
          ? JSON.parse(companySettings.custom_templates)
          : companySettings.custom_templates;
      } catch (e) {}
    }

    const updatedMasterRegistries = {
      ...existingMasterData,
      ...(customTemplatesObj.master_registries || {}),
      ...payload,
      updated_at: new Date().toISOString()
    };

    // Store in custom_templates.master_registries as primary fallback + master_registries column if present
    customTemplatesObj.master_registries = updatedMasterRegistries;

    const updatePayload: Record<string, any> = {
      user_id: userId,
      custom_templates: JSON.stringify(customTemplatesObj),
      updated_at: new Date().toISOString()
    };

    // Attempt to write master_registries column directly
    updatePayload.master_registries = updatedMasterRegistries;

    if (companySettings?.id) {
      const { error } = await supabase
        .from('company_settings')
        .update(updatePayload)
        .eq('id', companySettings.id);

      if (error && error.message?.includes('master_registries')) {
        // Fallback without master_registries column if not migrated yet
        delete updatePayload.master_registries;
        await supabase.from('company_settings').update(updatePayload).eq('id', companySettings.id);
      }
    } else {
      const { error } = await supabase.from('company_settings').insert([updatePayload]);
      if (error && error.message?.includes('master_registries')) {
        delete updatePayload.master_registries;
        await supabase.from('company_settings').insert([updatePayload]);
      }
    }

    // 3. For clients in vendors list, also sync to Supabase `clients` table
    if (payload.vendors && payload.vendors.length > 0) {
      for (const clientItem of payload.vendors) {
        if (clientItem.name || clientItem.company) {
          const clientPayload = {
            userId,
            name: clientItem.name || clientItem.company || 'Unnamed Client',
            companyName: clientItem.company || clientItem.name || null,
            email: clientItem.email || null,
            phone: clientItem.phone || null,
            address: clientItem.address || null,
            gstin: clientItem.gstin || clientItem.taxId || null,
            pan: clientItem.pan || null,
            updatedAt: new Date().toISOString()
          };

          const { data: existingClient } = await supabase
            .from('clients')
            .select('id')
            .eq('userId', userId)
            .or(`name.eq."${clientItem.name}",companyName.eq."${clientItem.company}"`)
            .maybeSingle();

          if (existingClient?.id) {
            await supabase.from('clients').update(clientPayload).eq('id', existingClient.id);
          } else {
            await supabase.from('clients').insert([{ ...clientPayload, id: clientItem.id || `client_${Math.random().toString(36).substr(2, 9)}`, createdAt: new Date().toISOString() }]);
          }
        }
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
 * Fetches and merges master registries from Supabase cloud into local storage and returns unified state
 */
export const pullMasterRegistriesFromCloud = async (
  userId: string | null | undefined,
  suffix: string
): Promise<MasterRegistriesPayload | null> => {
  if (!userId) return null;

  try {
    // 1. Read company_settings
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

    // 2. Fetch clients table rows
    const { data: clientsTableRows } = await supabase
      .from('clients')
      .select('*')
      .eq('userId', userId);

    let supabaseClients: MasterVendor[] = [];
    if (clientsTableRows && clientsTableRows.length > 0) {
      supabaseClients = clientsTableRows.map((row: any) => ({
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

    // 3. Process remote registries directly from Supabase Cloud as the Single Source of Truth
    const rawRemoteVendors = mergeListsByIdOrName(remoteMasterData.vendors || [], supabaseClients);
    const rawRemoteActualVendors = remoteMasterData.actualVendors || [];

    // Strict segregation: Filter out purchase vendors from Client Database (vendors) and move to Vendor Database (actualVendors)
    const clientVendors: MasterVendor[] = [];
    const mislocatedVendors: MasterVendor[] = [];

    rawRemoteVendors.forEach((v) => {
      if (isPurchaseVendorRecord(v)) {
        mislocatedVendors.push({ ...v, category: v.category || 'Vendor' });
      } else {
        clientVendors.push(v);
      }
    });

    const mergedVendors = clientVendors;
    const mergedActualVendors = mergeListsByIdOrName(rawRemoteActualVendors, mislocatedVendors);
    const mergedTransports = remoteMasterData.transports || [];
    const mergedHsnCodes = remoteMasterData.hsnCodes || [];
    const mergedMaterials = remoteMasterData.materials || [];
    const mergedCategories = remoteMasterData.categories || [];
    const mergedSubCategories = remoteMasterData.subCategories || [];
    const mergedGlAccounts = remoteMasterData.glAccounts || [];
    const mergedMappings = remoteMasterData.mappings || [];

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
    };

    return mergedPayload;
  } catch (err) {
    console.error('[masterRegistrySync] Error pulling master registries from cloud:', err);
    return null;
  }
};
