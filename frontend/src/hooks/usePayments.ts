import { useState, useEffect, useMemo, useCallback } from 'react';
import { Invoice, Expense, PaymentRecord, PaymentSettlementPayload, PaymentStatus, InvoiceStatus } from '../types';
import { supabase } from '../lib/supabase';
import { pushMasterRegistriesToCloud, unmarkRegistryKeyDeleted } from '../lib/masterRegistrySync';

export interface PaymentSummaryStats {
  // Sales
  totalSalesBilled: number;
  totalSalesReceived: number;
  totalSalesPending: number;
  totalSalesOverdue: number;
  salesCount: number;
  salesPendingCount: number;
  salesPaidCount: number;
  
  // Purchases
  totalPurchasesBilled: number;
  totalPurchasesPaid: number;
  totalPurchasesPending: number;
  totalPurchasesOverdue: number;
  purchasesCount: number;
  purchasesPendingCount: number;
  purchasesPaidCount: number;

  // Combined
  totalBilled: number;
  totalReceived: number;
  totalPaidOut: number;
  totalPending: number;
}

interface UsePaymentsProps {
  invoices: Invoice[];
  expenses?: Expense[];
  onUpdateInvoice?: (invoice: Invoice) => void;
  onSaveExpense?: (expense: Expense) => void;
  userEmail?: string | null;
}

const SETTLEMENTS_STORAGE_KEY = 'makbills_payments_settlements';
const MANUAL_PAYMENTS_STORAGE_KEY = 'makbills_manual_payments';

export function usePayments({
  invoices,
  expenses = [],
  onUpdateInvoice,
  onSaveExpense,
  userEmail
}: UsePaymentsProps) {
  const suffix = userEmail ? `_${encodeURIComponent(userEmail)}` : '';
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Real-time synchronization listeners for manual records and settlements
  useEffect(() => {
    const handleSync = () => setRefreshTrigger(prev => prev + 1);
    window.addEventListener('mak_manual_payment_added', handleSync);
    window.addEventListener('mak_manual_payment_deleted', handleSync);
    window.addEventListener('mak_payment_settled', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('mak_manual_payment_added', handleSync);
      window.removeEventListener('mak_manual_payment_deleted', handleSync);
      window.removeEventListener('mak_payment_settled', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Helper to get local settlements map
  const getSettlementsMap = useCallback((): Record<string, any> => {
    if (typeof window === 'undefined') return {};
    try {
      const stored = localStorage.getItem(`${SETTLEMENTS_STORAGE_KEY}${suffix}`) || localStorage.getItem(SETTLEMENTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  }, [suffix]);

  // Helper to get manual payments
  const getManualPayments = useCallback((): PaymentRecord[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(`${MANUAL_PAYMENTS_STORAGE_KEY}${suffix}`) || localStorage.getItem(MANUAL_PAYMENTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }, [suffix]);

  // Derive unified payment records from Invoices, Purchases, and Manual Records
  const payments: PaymentRecord[] = useMemo(() => {
    const settlements = getSettlementsMap();
    const records: PaymentRecord[] = [];
    const today = new Date().toISOString().split('T')[0];

    // 1. Process Invoices (Sales: ONLY Tax Invoices 'invoice' | Purchases: ONLY Purchase Bills 'purchases')
    invoices.forEach((inv) => {
      if (inv.isDeleted || inv.status === 'draft') return;

      const docType = inv.invoiceType || 'invoice';
      const isSalesTaxInvoice = docType === 'invoice';
      const isPurchaseBill = docType === 'purchases';

      if (!isSalesTaxInvoice && !isPurchaseBill) {
        return;
      }

      const category = isPurchaseBill ? 'purchases' : 'sales';
      const total = Number(inv.grandTotal) || 0;
      const settlement = settlements[inv.id] || {};
      const paid = inv.paidAmount !== undefined 
        ? Number(inv.paidAmount) 
        : (inv.status === 'paid' ? total : (settlement.paidAmount !== undefined ? Number(settlement.paidAmount) : 0));
      
      const due = Math.max(0, Number((total - paid).toFixed(2)));

      let status: PaymentStatus = 'pending';
      if (due <= 0 && total > 0) {
        status = 'paid';
      } else if (paid > 0 && due > 0) {
        status = 'partially_paid';
      } else if (inv.dueDate && inv.dueDate < today && due > 0) {
        status = 'overdue';
      } else if (inv.status === 'paid') {
        status = 'paid';
      } else if (inv.status === 'partially_paid') {
        status = 'partially_paid';
      } else {
        status = 'pending';
      }

      const company = (inv.clientCompanyName || inv.clientCompany || (inv.clientName ? `${inv.clientName}` : '')).trim() || (isPurchaseBill ? 'Vendor Company' : 'Client Company');
      const party = (inv.clientName || '').trim() || company;

      records.push({
        id: `pmt_inv_${inv.id}`,
        userId: inv.userId,
        documentId: inv.id,
        documentNumber: inv.invoiceNumber || 'DOC-000',
        documentType: docType as any,
        category,
        companyName: company,
        partyName: party,
        partyEmail: inv.clientEmail,
        partyPhone: inv.clientPhone,
        partyGstin: inv.clientGstin,
        totalAmount: total,
        paidAmount: paid,
        dueAmount: due,
        status,
        date: inv.date || inv.createdAt?.split('T')[0] || today,
        dueDate: inv.dueDate,
        paymentDate: inv.paidDate || settlement.paymentDate,
        paymentMethod: settlement.paymentMethod || 'cash',
        referenceNumber: settlement.referenceNumber || inv.referenceNumber,
        notes: settlement.notes || inv.notes,
        createdAt: inv.createdAt || today,
        updatedAt: inv.updatedAt || today,
        _pendingSync: inv._pendingSync,
        entryType: category === 'purchases' ? 'debit' : 'credit'
      });
    });

    // 2. Process Manual Payment / Settlement Records
    const manualRecords = getManualPayments();
    manualRecords.forEach((m) => {
      const total = Number(m.totalAmount) || 0;
      const settlement = settlements[m.id] || settlements[m.documentId] || {};
      const paid = m.paidAmount !== undefined 
        ? Number(m.paidAmount) 
        : (settlement.paidAmount !== undefined ? Number(settlement.paidAmount) : total);
      const due = Math.max(0, Number((total - paid).toFixed(2)));

      let status: PaymentStatus = m.status || (due <= 0 ? 'paid' : (paid > 0 ? 'partially_paid' : 'pending'));
      if (due <= 0 && total > 0) status = 'paid';

      records.push({
        ...m,
        id: m.id || `pmt_manual_${Date.now()}`,
        documentId: m.documentId || m.id,
        documentNumber: m.documentNumber || `REC-${m.category === 'purchases' ? 'PUR' : 'SAL'}-${(m.id || '').slice(-4)}`,
        documentType: 'manual_record',
        category: m.category || 'sales',
        companyName: m.companyName || 'Company',
        partyName: m.partyName || m.companyName || 'Party',
        partyEmail: m.partyEmail,
        partyPhone: m.partyPhone,
        partyGstin: m.partyGstin,
        totalAmount: total,
        paidAmount: paid,
        dueAmount: due,
        status,
        date: m.date || today,
        dueDate: m.dueDate,
        paymentDate: m.paymentDate || m.date || today,
        paymentMethod: m.paymentMethod || 'cash',
        referenceNumber: m.referenceNumber,
        notes: m.notes,
        createdAt: m.createdAt || today,
        updatedAt: m.updatedAt || today,
        entryType: m.entryType || (m.category === 'purchases' ? 'debit' : 'credit'),
        isManualRecord: true,
        isOldRecord: !!m.isOldRecord,
        paymentMonth: m.paymentMonth
      });
    });

    // Sort: newest records first
    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, expenses, getSettlementsMap, getManualPayments, refreshTrigger]);

  // Compute Statistics
  const stats: PaymentSummaryStats = useMemo(() => {
    let totalSalesBilled = 0;
    let totalSalesReceived = 0;
    let totalSalesPending = 0;
    let totalSalesOverdue = 0;
    let salesCount = 0;
    let salesPendingCount = 0;
    let salesPaidCount = 0;

    let totalPurchasesBilled = 0;
    let totalPurchasesPaid = 0;
    let totalPurchasesPending = 0;
    let totalPurchasesOverdue = 0;
    let purchasesCount = 0;
    let purchasesPendingCount = 0;
    let purchasesPaidCount = 0;

    payments.forEach((p) => {
      if (p.category === 'sales') {
        salesCount++;
        totalSalesBilled += p.totalAmount;
        totalSalesReceived += p.paidAmount;
        totalSalesPending += p.dueAmount;
        if (p.status === 'overdue') {
          totalSalesOverdue += p.dueAmount;
        }
        if (p.status === 'paid') {
          salesPaidCount++;
        } else {
          salesPendingCount++;
        }
      } else {
        purchasesCount++;
        totalPurchasesBilled += p.totalAmount;
        totalPurchasesPaid += p.paidAmount;
        totalPurchasesPending += p.dueAmount;
        if (p.status === 'overdue') {
          totalPurchasesOverdue += p.dueAmount;
        }
        if (p.status === 'paid') {
          purchasesPaidCount++;
        } else {
          purchasesPendingCount++;
        }
      }
    });

    return {
      totalSalesBilled: Number(totalSalesBilled.toFixed(2)),
      totalSalesReceived: Number(totalSalesReceived.toFixed(2)),
      totalSalesPending: Number(totalSalesPending.toFixed(2)),
      totalSalesOverdue: Number(totalSalesOverdue.toFixed(2)),
      salesCount,
      salesPendingCount,
      salesPaidCount,

      totalPurchasesBilled: Number(totalPurchasesBilled.toFixed(2)),
      totalPurchasesPaid: Number(totalPurchasesPaid.toFixed(2)),
      totalPurchasesPending: Number(totalPurchasesPending.toFixed(2)),
      totalPurchasesOverdue: Number(totalPurchasesOverdue.toFixed(2)),
      purchasesCount,
      purchasesPendingCount,
      purchasesPaidCount,

      totalBilled: Number((totalSalesBilled + totalPurchasesBilled).toFixed(2)),
      totalReceived: Number(totalSalesReceived.toFixed(2)),
      totalPaidOut: Number(totalPurchasesPaid.toFixed(2)),
      totalPending: Number((totalSalesPending + totalPurchasesPending).toFixed(2))
    };
  }, [payments]);

  // Add Standalone Manual Record
  const addManualPaymentRecord = useCallback(async (record: Partial<PaymentRecord>): Promise<PaymentRecord> => {
    const nowIso = new Date().toISOString();
    const id = record.id || `pmt_manual_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const currentManuals = getManualPayments();

    const total = Number(record.totalAmount) || 0;
    const paid = Number(record.paidAmount) || 0;
    const due = Math.max(0, Number((total - paid).toFixed(2)));
    
    let status: PaymentStatus = record.status || (due <= 0 ? 'paid' : (paid > 0 ? 'partially_paid' : 'pending'));
    if (due <= 0 && total > 0) status = 'paid';

    const newRecord: PaymentRecord = {
      id,
      documentId: id,
      documentNumber: record.documentNumber || `SETTLE-${record.category === 'purchases' ? 'PUR' : 'SAL'}-${String(currentManuals.length + 1).padStart(4, '0')}`,
      documentType: 'manual_record',
      category: record.category || 'sales',
      companyName: record.companyName || 'Company',
      partyName: record.partyName || record.companyName || 'Party',
      partyEmail: record.partyEmail,
      partyPhone: record.partyPhone,
      partyGstin: record.partyGstin,
      totalAmount: total,
      paidAmount: paid,
      dueAmount: due,
      status,
      date: record.date || nowIso.split('T')[0],
      dueDate: record.dueDate,
      paymentDate: record.paymentDate || record.date || nowIso.split('T')[0],
      paymentMethod: record.paymentMethod || 'bank_transfer',
      referenceNumber: record.referenceNumber,
      notes: record.notes,
      createdAt: nowIso,
      updatedAt: nowIso,
      entryType: record.entryType || (record.category === 'purchases' ? 'debit' : 'credit'),
      isManualRecord: true,
      isOldRecord: !!record.isOldRecord,
      paymentMonth: record.paymentMonth
    };

    const updated = [newRecord, ...currentManuals.filter(m => m.id !== id)];
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${MANUAL_PAYMENTS_STORAGE_KEY}${suffix}`, JSON.stringify(updated));
      localStorage.setItem(MANUAL_PAYMENTS_STORAGE_KEY, JSON.stringify(updated));

      // Automatically register new company in Master Database (Clients / Vendors registries)
      try {
        const rawComp = (record.companyName || '').trim();
        const rawParty = (record.partyName || rawComp || '').trim();
        const isPurchase = record.category === 'purchases' || record.entryType === 'debit';
        const targetStorageKey = isPurchase ? 'makbills_masters_actual_vendors' : 'makbills_masters_vendors';
        const partyTypeStr = isPurchase ? 'Vendor' : 'Client';

        if (rawComp || rawParty) {
          const cachedRegistryRaw = localStorage.getItem(`${targetStorageKey}${suffix}`) || localStorage.getItem(targetStorageKey) || '[]';
          let cachedRegistry = JSON.parse(cachedRegistryRaw);
          if (!Array.isArray(cachedRegistry)) cachedRegistry = [];

          const existingIdx = cachedRegistry.findIndex((p: any) => {
            const pComp = (p.company || p.companyName || '').toLowerCase().trim();
            const pName = (p.name || '').toLowerCase().trim();
            const rComp = rawComp.toLowerCase();
            const rName = rawParty.toLowerCase();
            const rGst = (record.partyGstin || '').toUpperCase().trim();
            const pGst = (p.gstin || p.taxId || '').toUpperCase().trim();

            if (rGst && pGst && rGst.length >= 10 && rGst === pGst) return true;
            if (rComp && pComp && rComp === pComp) return true;
            if (rName && pName && rName === pName) return true;
            return false;
          });

          const newMasterParty = {
            id: `settle_reg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: rawParty || rawComp,
            company: rawComp || rawParty,
            companyName: rawComp || rawParty,
            partyType: partyTypeStr,
            category: 'Added from Payment Settlement',
            gstin: record.partyGstin || '',
            taxId: record.partyGstin || '',
            pan: (record.partyGstin || '').length === 15 ? (record.partyGstin || '').substring(2, 12) : '',
            email: record.partyEmail || '',
            phone: record.partyPhone || '',
            mobile: record.partyPhone || '',
            address: '',
            state: '',
            country: 'India',
            createdAt: nowIso,
            updatedAt: nowIso
          };

          unmarkRegistryKeyDeleted(newMasterParty, suffix);
          unmarkRegistryKeyDeleted(rawComp, suffix);
          if (rawParty && rawParty !== rawComp) unmarkRegistryKeyDeleted(rawParty, suffix);
          if (record.partyGstin) unmarkRegistryKeyDeleted(record.partyGstin, suffix);

          if (existingIdx >= 0) {
            cachedRegistry[existingIdx] = {
              ...cachedRegistry[existingIdx],
              gstin: record.partyGstin || cachedRegistry[existingIdx].gstin || '',
              taxId: record.partyGstin || cachedRegistry[existingIdx].taxId || '',
              email: record.partyEmail || cachedRegistry[existingIdx].email || '',
              phone: record.partyPhone || cachedRegistry[existingIdx].phone || '',
              mobile: record.partyPhone || cachedRegistry[existingIdx].mobile || '',
              updatedAt: nowIso
            };
          } else {
            cachedRegistry.unshift(newMasterParty);
          }

          localStorage.setItem(`${targetStorageKey}${suffix}`, JSON.stringify(cachedRegistry));
          localStorage.setItem(targetStorageKey, JSON.stringify(cachedRegistry));

          // Also ensure the primary key 'makbills_masters_vendors' or 'makbills_masters_actual_vendors' is synchronized
          if (suffix) {
            localStorage.setItem(targetStorageKey, JSON.stringify(cachedRegistry));
          }

          // Dispatch Master Database refresh events immediately for all listeners & reactive hooks
          window.dispatchEvent(new CustomEvent(isPurchase ? 'makbills_sync_actual_vendors' : 'makbills_sync_vendors'));
          window.dispatchEvent(new CustomEvent('makbills_sync_vendors'));
          window.dispatchEvent(new CustomEvent('makbills_sync_actual_vendors'));
          window.dispatchEvent(new CustomEvent('makbills_registry_deleted'));
          window.dispatchEvent(new CustomEvent('storage'));

          // Push to Supabase Cloud so both new company registry AND payment records sync across all devices
          supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session?.user?.id) {
              await pushMasterRegistriesToCloud(session.user.id, suffix, {
                [isPurchase ? 'actualVendors' : 'vendors']: cachedRegistry,
                manualPayments: updated
              });

              if (!isPurchase) {
                try {
                  await supabase.from('clients').upsert({
                    id: newMasterParty.id,
                    userId: session.user.id,
                    name: newMasterParty.name,
                    companyName: newMasterParty.companyName,
                    company: newMasterParty.companyName,
                    gstin: newMasterParty.gstin,
                    email: newMasterParty.email,
                    phone: newMasterParty.phone,
                    updatedAt: nowIso
                  }, { onConflict: 'id' });
                } catch {
                  // Ignore client upsert errors
                }
              }
            }
          }).catch(cloudErr => {
            console.warn('[usePayments] Master database cloud push notice:', cloudErr);
          });
        } else {
          // If no new party details, still push the updated manualPayments list to cloud
          supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session?.user?.id) {
              await pushMasterRegistriesToCloud(session.user.id, suffix, {
                manualPayments: updated
              });
            }
          }).catch(() => {});
        }
      } catch (err) {
        console.warn('[usePayments] Master database registry insertion notice:', err);
      }

      window.dispatchEvent(new CustomEvent('mak_manual_payment_added', { detail: newRecord }));
    }

    setRefreshTrigger(prev => prev + 1);
    return newRecord;
  }, [getManualPayments, suffix]);

  // Delete Standalone Manual Record
  const deleteManualPaymentRecord = useCallback(async (id: string) => {
    const currentManuals = getManualPayments();
    const updated = currentManuals.filter(m => m.id !== id && m.documentId !== id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${MANUAL_PAYMENTS_STORAGE_KEY}${suffix}`, JSON.stringify(updated));
      localStorage.setItem(MANUAL_PAYMENTS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('mak_manual_payment_deleted', { detail: { id } }));

      // Push deletion to Supabase Cloud
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user?.id) {
          await pushMasterRegistriesToCloud(session.user.id, suffix, {
            manualPayments: updated
          });
        }
      }).catch(() => {});
    }
    setRefreshTrigger(prev => prev + 1);
  }, [getManualPayments, suffix]);

  // Settle / Record Payment for a Document
  const settlePayment = useCallback(async (payload: PaymentSettlementPayload) => {
    const { documentId, settleAmount, paymentDate, paymentMethod, referenceNumber, notes } = payload;
    const nowIso = new Date().toISOString();

    // 1. Check if it's a manual record
    const currentManuals = getManualPayments();
    const manualMatch = currentManuals.find(m => m.id === documentId || m.documentId === documentId);
    if (manualMatch) {
      const currentPaid = Number(manualMatch.paidAmount) || 0;
      const newPaid = Number((currentPaid + settleAmount).toFixed(2));
      const total = Number(manualMatch.totalAmount) || 0;
      const due = Math.max(0, Number((total - newPaid).toFixed(2)));
      let status: PaymentStatus = due <= 0 ? 'paid' : 'partially_paid';

      const updatedManuals = currentManuals.map(m => {
        if (m.id === documentId || m.documentId === documentId) {
          return {
            ...m,
            paidAmount: newPaid,
            dueAmount: due,
            status,
            paymentDate,
            paymentMethod,
            referenceNumber: referenceNumber || m.referenceNumber,
            notes: notes || m.notes,
            updatedAt: nowIso
          };
        }
        return m;
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem(`${MANUAL_PAYMENTS_STORAGE_KEY}${suffix}`, JSON.stringify(updatedManuals));
        localStorage.setItem(MANUAL_PAYMENTS_STORAGE_KEY, JSON.stringify(updatedManuals));
        window.dispatchEvent(new CustomEvent('mak_manual_payment_added', { detail: { documentId } }));
      }
    }

    // 2. Save settlement meta to localStorage
    const currentSettlements = getSettlementsMap();
    const existingSettlement = currentSettlements[documentId] || {};
    const newPaidTotal = (existingSettlement.paidAmount || 0) + settleAmount;

    currentSettlements[documentId] = {
      ...existingSettlement,
      paidAmount: newPaidTotal,
      paymentDate,
      paymentMethod,
      referenceNumber,
      notes,
      updatedAt: nowIso
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(`${SETTLEMENTS_STORAGE_KEY}${suffix}`, JSON.stringify(currentSettlements));
      localStorage.setItem(SETTLEMENTS_STORAGE_KEY, JSON.stringify(currentSettlements));

      // Push settlements and manual payments to Supabase Cloud
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user?.id) {
          const cloudPayload: any = {
            settlements: currentSettlements
          };
          if (manualMatch) {
            const currentLatestManuals = getManualPayments();
            cloudPayload.manualPayments = currentLatestManuals;
          }
          await pushMasterRegistriesToCloud(session.user.id, suffix, cloudPayload);
        }
      }).catch(() => {});
    }

    // 3. If it's an Invoice / Purchase document
    const invoiceMatch = invoices.find(inv => inv.id === documentId);
    if (invoiceMatch && onUpdateInvoice) {
      const currentPaid = Number(invoiceMatch.paidAmount) || (invoiceMatch.status === 'paid' ? Number(invoiceMatch.grandTotal) : 0);
      const cumulativePaid = Number((currentPaid + settleAmount).toFixed(2));
      const totalAmount = Number(invoiceMatch.grandTotal) || 0;
      
      let nextStatus: InvoiceStatus = 'pending';
      if (cumulativePaid >= totalAmount) {
        nextStatus = 'paid';
      } else if (cumulativePaid > 0) {
        nextStatus = 'partially_paid';
      }

      const updatedInvoice: Invoice = {
        ...invoiceMatch,
        paidAmount: cumulativePaid,
        paidDate: paymentDate,
        status: nextStatus,
        updatedAt: nowIso
      };

      onUpdateInvoice(updatedInvoice);
    }

    // 4. If it's an Expense
    const expenseMatch = expenses.find(exp => exp.id === documentId);
    if (expenseMatch && onSaveExpense) {
      const updatedExpense: Expense = {
        ...expenseMatch,
        status: 'paid',
        payment_mode: paymentMethod,
        reference_number: referenceNumber || expenseMatch.reference_number,
        updated_at: nowIso
      };
      onSaveExpense(updatedExpense);
    }

    // 5. Try saving to Supabase payments table if exists (non-blocking)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('payments').upsert({
          id: payload.paymentId || `pmt_${documentId}_${Date.now()}`,
          user_id: user.id,
          document_id: documentId,
          amount: settleAmount,
          payment_date: paymentDate,
          payment_method: paymentMethod,
          reference_number: referenceNumber,
          notes: notes,
          created_at: nowIso
        });
      }
    } catch (err) {
      console.warn('[usePayments] Supabase payment logging notice:', err);
    }

    // Dispatch global event for instant reactivity
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mak_payment_settled', { detail: payload }));
    }
    setRefreshTrigger(prev => prev + 1);
  }, [invoices, expenses, onUpdateInvoice, onSaveExpense, getSettlementsMap, getManualPayments, suffix]);

  // Update / Adjust Existing Settlement for a Document
  const updateSettlement = useCallback(async (payload: import('../types').PaymentUpdatePayload) => {
    const { documentId, paidAmount, paymentDate, paymentMethod, referenceNumber, notes } = payload;
    const nowIso = new Date().toISOString();
    const today = nowIso.split('T')[0];

    // 1. Check if it's a manual record
    const currentManuals = getManualPayments();
    const manualMatch = currentManuals.find(m => m.id === documentId || m.documentId === documentId);
    if (manualMatch) {
      const total = Number(manualMatch.totalAmount) || 0;
      const targetPaid = Math.max(0, Number(paidAmount) || 0);
      const due = Math.max(0, Number((total - targetPaid).toFixed(2)));
      let status: PaymentStatus = due <= 0 && total > 0 ? 'paid' : (targetPaid > 0 ? 'partially_paid' : 'pending');

      const updatedManuals = currentManuals.map(m => {
        if (m.id === documentId || m.documentId === documentId) {
          return {
            ...m,
            paidAmount: targetPaid,
            dueAmount: due,
            status,
            paymentDate: targetPaid > 0 ? (paymentDate || m.paymentDate) : undefined,
            paymentMethod: paymentMethod || m.paymentMethod,
            referenceNumber: referenceNumber !== undefined ? referenceNumber : m.referenceNumber,
            notes: notes !== undefined ? notes : m.notes,
            updatedAt: nowIso
          };
        }
        return m;
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem(`${MANUAL_PAYMENTS_STORAGE_KEY}${suffix}`, JSON.stringify(updatedManuals));
        localStorage.setItem(MANUAL_PAYMENTS_STORAGE_KEY, JSON.stringify(updatedManuals));
        window.dispatchEvent(new CustomEvent('mak_manual_payment_added', { detail: { documentId } }));
      }
    }

    // 2. Save settlement meta to localStorage
    const currentSettlements = getSettlementsMap();
    const targetPaid = Math.max(0, Number(paidAmount) || 0);

    if (targetPaid <= 0) {
      delete currentSettlements[documentId];
    } else {
      const existingSettlement = currentSettlements[documentId] || {};
      currentSettlements[documentId] = {
        ...existingSettlement,
        paidAmount: targetPaid,
        paymentDate: paymentDate || existingSettlement.paymentDate || today,
        paymentMethod: paymentMethod || existingSettlement.paymentMethod || 'cash',
        referenceNumber: referenceNumber !== undefined ? referenceNumber : existingSettlement.referenceNumber,
        notes: notes !== undefined ? notes : existingSettlement.notes,
        updatedAt: nowIso
      };
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(`${SETTLEMENTS_STORAGE_KEY}${suffix}`, JSON.stringify(currentSettlements));
      localStorage.setItem(SETTLEMENTS_STORAGE_KEY, JSON.stringify(currentSettlements));

      // Push settlements and manual payments to Supabase Cloud
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user?.id) {
          const cloudPayload: any = {
            settlements: currentSettlements
          };
          if (manualMatch) {
            const currentLatestManuals = getManualPayments();
            cloudPayload.manualPayments = currentLatestManuals;
          }
          await pushMasterRegistriesToCloud(session.user.id, suffix, cloudPayload);
        }
      }).catch(() => {});
    }

    // 3. If it's an Invoice / Purchase document
    const invoiceMatch = invoices.find(inv => inv.id === documentId);
    if (invoiceMatch && onUpdateInvoice) {
      const totalAmount = Number(invoiceMatch.grandTotal) || 0;
      const targetPaidClamped = Math.max(0, Math.min(totalAmount, targetPaid));
      const remainingDue = Math.max(0, Number((totalAmount - targetPaidClamped).toFixed(2)));

      let nextStatus: InvoiceStatus = 'pending';
      if (remainingDue <= 0 && totalAmount > 0) {
        nextStatus = 'paid';
      } else if (targetPaidClamped > 0) {
        nextStatus = 'partially_paid';
      } else {
        nextStatus = 'pending';
      }

      const updatedInvoice: Invoice = {
        ...invoiceMatch,
        paidAmount: targetPaidClamped,
        paidDate: targetPaidClamped > 0 ? (paymentDate || invoiceMatch.paidDate || today) : undefined,
        status: nextStatus,
        updatedAt: nowIso
      };

      onUpdateInvoice(updatedInvoice);
    }

    // 4. If it's an Expense
    const expenseMatch = expenses.find(exp => exp.id === documentId);
    if (expenseMatch && onSaveExpense) {
      const updatedExpense: Expense = {
        ...expenseMatch,
        status: targetPaid > 0 ? 'paid' : 'pending',
        payment_mode: (paymentMethod as any) || expenseMatch.payment_mode,
        reference_number: referenceNumber !== undefined ? referenceNumber : expenseMatch.reference_number,
        updated_at: nowIso
      };
      onSaveExpense(updatedExpense);
    }

    // Dispatch global event for instant reactivity
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mak_payment_settled', { detail: payload }));
    }
    setRefreshTrigger(prev => prev + 1);
  }, [invoices, expenses, onUpdateInvoice, onSaveExpense, getSettlementsMap, getManualPayments, suffix]);

  // Reset / Undo Settlement for a Document
  const undoSettlement = useCallback(async (documentId: string) => {
    await updateSettlement({
      documentId,
      paidAmount: 0
    });
  }, [updateSettlement]);

  return {
    payments,
    stats,
    settlePayment,
    updateSettlement,
    undoSettlement,
    addManualPaymentRecord,
    deleteManualPaymentRecord,
    salesPayments: payments.filter(p => p.category === 'sales'),
    purchasesPayments: payments.filter(p => p.category === 'purchases')
  };
}
