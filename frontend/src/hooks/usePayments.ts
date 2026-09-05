import { useMemo, useCallback } from 'react';
import { Invoice, Expense, PaymentRecord, PaymentSettlementPayload, PaymentStatus, InvoiceStatus } from '../types';
import { supabase } from '../lib/supabase';

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

export function usePayments({
  invoices,
  expenses = [],
  onUpdateInvoice,
  onSaveExpense,
  userEmail
}: UsePaymentsProps) {
  const suffix = userEmail ? `_${encodeURIComponent(userEmail)}` : '';

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

  // Derive unified payment records from Invoices and Purchases
  const payments: PaymentRecord[] = useMemo(() => {
    const settlements = getSettlementsMap();
    const records: PaymentRecord[] = [];
    const today = new Date().toISOString().split('T')[0];

    // 1. Process Invoices (Sales: ONLY Tax Invoices 'invoice' | Purchases: ONLY Purchase Bills 'purchases')
    invoices.forEach((inv) => {
      // Ignore soft-deleted items, temporary drafts, or non-finalized drafts
      if (inv.isDeleted || inv.status === 'draft') return;

      const docType = inv.invoiceType || 'invoice';
      
      // STRICT FILTER: Only 'invoice' for Sales and 'purchases' for Purchases
      const isSalesTaxInvoice = docType === 'invoice';
      const isPurchaseBill = docType === 'purchases';

      if (!isSalesTaxInvoice && !isPurchaseBill) {
        return; // Skip proforma, quotes, estimates, credit notes, purchase orders, debit notes
      }

      const category = isPurchaseBill ? 'purchases' : 'sales';

      const total = Number(inv.grandTotal) || 0;
      
      // Check for custom settlement overrides if any
      const settlement = settlements[inv.id] || {};
      const paid = inv.paidAmount !== undefined 
        ? Number(inv.paidAmount) 
        : (inv.status === 'paid' ? total : (settlement.paidAmount !== undefined ? Number(settlement.paidAmount) : 0));
      
      const due = Math.max(0, Number((total - paid).toFixed(2)));

      // Calculate Payment Status
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
        _pendingSync: inv._pendingSync
      });
    });

    // Sort: newest documents first
    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, expenses, getSettlementsMap]);

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

  // Settle / Record Payment for a Document
  const settlePayment = useCallback(async (payload: PaymentSettlementPayload) => {
    const { documentId, settleAmount, paymentDate, paymentMethod, referenceNumber, notes } = payload;
    const nowIso = new Date().toISOString();

    // 1. Save settlement meta to localStorage
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
    }

    // 2. If it's an Invoice / Purchase document
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

    // 3. If it's an Expense
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

    // 4. Try saving to Supabase payments table if exists (non-blocking)
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
  }, [invoices, expenses, onUpdateInvoice, onSaveExpense, getSettlementsMap, suffix]);

  return {
    payments,
    stats,
    settlePayment,
    salesPayments: payments.filter(p => p.category === 'sales'),
    purchasesPayments: payments.filter(p => p.category === 'purchases')
  };
}
