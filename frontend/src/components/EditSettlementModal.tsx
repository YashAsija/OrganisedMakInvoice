import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  CreditCard,
  AlertCircle,
  QrCode,
  Landmark,
  Banknote,
  FileCheck2,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Save
} from 'lucide-react';
import { PaymentRecord, PaymentUpdatePayload, PaymentMethod } from '../types';

interface EditSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentRecord | null;
  currencySymbol?: string;
  onUpdate: (payload: PaymentUpdatePayload) => Promise<void> | void;
  onUndo: (documentId: string) => Promise<void> | void;
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string; subLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'upi', label: 'UPI / QR', subLabel: 'Instant', icon: QrCode },
  { id: 'bank_transfer', label: 'Bank Transfer', subLabel: 'NEFT / RTGS / IMPS', icon: Landmark },
  { id: 'cash', label: 'Cash', subLabel: 'Physical cash', icon: Banknote },
  { id: 'cheque', label: 'Cheque', subLabel: 'Cheque / DD', icon: FileCheck2 },
  { id: 'card', label: 'Card', subLabel: 'Debit / Credit', icon: CreditCard },
  { id: 'other', label: 'Other', subLabel: 'Adjustments', icon: Layers },
];

export const EditSettlementModal: React.FC<EditSettlementModalProps> = ({
  isOpen,
  onClose,
  payment,
  currencySymbol = '₹',
  onUpdate,
  onUndo,
}) => {
  if (!isOpen || !payment) return null;

  const [settledAmount, setSettledAmount] = useState<string>(payment.paidAmount.toString());
  const [paymentDate, setPaymentDate] = useState<string>(
    payment.paymentDate || payment.date || new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    (payment.paymentMethod as PaymentMethod) || 'upi'
  );
  const [referenceNumber, setReferenceNumber] = useState<string>(payment.referenceNumber || '');
  const [notes, setNotes] = useState<string>(payment.notes || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showUndoConfirm, setShowUndoConfirm] = useState<boolean>(false);

  useEffect(() => {
    if (payment) {
      setSettledAmount(payment.paidAmount.toString());
      setPaymentDate(payment.paymentDate || payment.date || new Date().toISOString().split('T')[0]);
      setPaymentMethod((payment.paymentMethod as PaymentMethod) || 'upi');
      setReferenceNumber(payment.referenceNumber || '');
      setNotes(payment.notes || '');
      setError(null);
      setShowUndoConfirm(false);
    }
  }, [payment]);

  const formatAmount = (val: number) => {
    return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parsedAmount = parseFloat(settledAmount) || 0;
  const computedDue = Math.max(0, Number((payment.totalAmount - parsedAmount).toFixed(2)));

  const handleQuickSet = (amt: number) => {
    setSettledAmount(amt.toFixed(2));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(settledAmount);

    if (isNaN(amountNum) || amountNum < 0) {
      setError('Please enter a valid amount (0 or greater).');
      return;
    }

    if (amountNum > payment.totalAmount + 0.01) {
      setError(`Settled amount cannot exceed total bill amount of ${currencySymbol}${formatAmount(payment.totalAmount)}.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await onUpdate({
        paymentId: payment.id,
        documentId: payment.documentId,
        paidAmount: amountNum,
        paymentDate,
        paymentMethod,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update settlement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectUndo = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await onUndo(payment.documentId);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to undo settlement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return typeof window !== 'undefined' ? createPortal(
    <div
      className="fixed inset-0 z-[9999999] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999999 }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#111a36] border-t sm:border border-[#bae6fd]/80 dark:border-[#223269]/80 rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden relative max-h-[92vh] sm:max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#bae6fd]/40 dark:border-[#223269]/40 flex items-center justify-between bg-[#f4f9ff]/70 dark:bg-[#0b1329]/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400 flex items-center justify-center border border-violet-200 dark:border-violet-800 shrink-0">
              {payment.category === 'sales' ? (
                <ArrowDownLeft className="w-4.5 h-4.5" />
              ) : (
                <ArrowUpRight className="w-4.5 h-4.5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-[#0f172a] dark:text-white tracking-tight">
                  Edit Settlement
                </h3>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                  payment.category === 'sales'
                    ? 'bg-sky-50 text-[#0284c7] dark:bg-sky-950 dark:text-[#38bdf8] border border-sky-200 dark:border-sky-800'
                    : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                }`}>
                  {payment.category === 'sales' ? 'Sales Inflow' : 'Purchase Outflow'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 truncate max-w-[260px] sm:max-w-xs">
                Ref: <span className="font-mono font-bold text-[#0f172a] dark:text-slate-200">{payment.documentNumber}</span> • <span className="font-medium text-slate-700 dark:text-slate-300">{payment.companyName || payment.partyName}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-[#e0f2fe]/60 dark:hover:bg-[#1b264f] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar bg-white dark:bg-[#111a36]">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Document Summary Matrix */}
          <div className="p-3.5 rounded-xl bg-[#f4f9ff] dark:bg-[#0b1329]/70 border border-[#bae6fd]/60 dark:border-[#223269]/60 grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
                Total Billed
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono block mt-0.5">
                {currencySymbol}{formatAmount(payment.totalAmount)}
              </span>
            </div>
            <div className="border-x border-[#bae6fd]/40 dark:border-[#223269]/40 px-1">
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block truncate">
                Settled Amount
              </span>
              <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono block mt-0.5">
                {currencySymbol}{formatAmount(parsedAmount)}
              </span>
            </div>
            <div>
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block truncate">
                Remaining Due
              </span>
              <span className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 font-mono block mt-0.5">
                {currencySymbol}{formatAmount(computedDue)}
              </span>
            </div>
          </div>

          {/* Settled Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Adjust Settled Amount
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickSet(0)}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer"
                >
                  Reset (₹0)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSet(payment.totalAmount / 2)}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 hover:bg-sky-100 text-[#0284c7] dark:bg-sky-950/50 dark:text-[#38bdf8] border border-sky-200 dark:border-sky-900 transition-colors cursor-pointer"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSet(payment.totalAmount)}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 transition-colors cursor-pointer"
                >
                  Full (100%)
                </button>
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                {currencySymbol}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                max={payment.totalAmount}
                value={settledAmount}
                onChange={(e) => {
                  setSettledAmount(e.target.value);
                  setError(null);
                }}
                className="w-full pl-8 pr-3 py-2 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd] dark:border-[#223269] rounded-xl text-base font-bold text-[#0f172a] dark:text-white focus:outline-none focus:border-[#0284c7] focus:ring-1 focus:ring-[#0284c7]"
                placeholder="0.00"
                required
              />
            </div>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1">
              Setting to <strong>0</strong> will reset this transaction to unpaid (pending / overdue).
            </p>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
              Payment Method
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((method) => {
                const IconComponent = method.icon;
                const isSelected = paymentMethod === method.id;
                return (
                  <button
                    type="button"
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      isSelected
                        ? 'bg-sky-50 dark:bg-sky-950/50 border-[#0284c7] dark:border-[#38bdf8] text-[#0284c7] dark:text-[#38bdf8] shadow-xs ring-1 ring-[#0284c7]'
                        : 'bg-[#f4f9ff]/50 dark:bg-[#0b1329]/50 border-[#bae6fd]/70 dark:border-[#223269]/70 text-slate-700 dark:text-slate-300 hover:border-[#0284c7]'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-[#0284c7] text-white'
                        : 'bg-white dark:bg-[#1b264f] text-[#0284c7] dark:text-[#38bdf8] border border-[#bae6fd]/60 dark:border-[#223269]'
                    }`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold block truncate leading-tight">{method.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Date */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
              Settlement Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd] dark:border-[#223269] rounded-xl text-xs font-semibold text-[#0f172a] dark:text-white focus:outline-none focus:border-[#0284c7]"
                required
              />
            </div>
          </div>

          {/* Reference & Notes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1">
                Transaction / Ref ID
              </label>
              <input
                type="text"
                placeholder="e.g. UPI-1234567, NEFT-8899"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full px-3 py-2 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd] dark:border-[#223269] rounded-xl text-xs text-[#0f172a] dark:text-white focus:outline-none focus:border-[#0284c7]"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1">
                Notes / Memo
              </label>
              <input
                type="text"
                placeholder="e.g. Adjusted discount, partial settlement"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd] dark:border-[#223269] rounded-xl text-xs text-[#0f172a] dark:text-white focus:outline-none focus:border-[#0284c7]"
              />
            </div>
          </div>

          {/* Direct Undo Confirmation Warning if triggered */}
          {showUndoConfirm && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-900/60 animate-in fade-in duration-150">
              <p className="text-xs font-bold text-rose-800 dark:text-rose-200">
                Are you sure you want to completely undo this settlement?
              </p>
              <p className="text-[11px] text-rose-600 dark:text-rose-300 mt-0.5">
                The paid amount will be reset to ₹0, restoring full pending due balance on the document.
              </p>
              <div className="flex items-center gap-2 mt-2.5">
                <button
                  type="button"
                  onClick={handleDirectUndo}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'Resetting...' : 'Yes, Undo Settlement'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUndoConfirm(false)}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Bottom Actions */}
          <div className="pt-2 border-t border-[#bae6fd]/40 dark:border-[#223269]/40 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            {!showUndoConfirm && (
              <button
                type="button"
                onClick={() => setShowUndoConfirm(true)}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Undo Settlement</span>
              </button>
            )}

            <div className="w-full sm:w-auto flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#2563eb] hover:from-[#0369a1] hover:to-[#1d4ed8] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-[#0284c7]/20 transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Saving...' : 'Update Settlement'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  ) : null;
};
