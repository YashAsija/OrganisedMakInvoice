import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  CheckCircle2,
  Calendar,
  CreditCard,
  FileText,
  AlertCircle,
  Hash,
  MessageSquare,
  ArrowRight,
  Building2,
  User,
  QrCode,
  Landmark,
  Banknote,
  FileCheck2,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet
} from 'lucide-react';
import { PaymentRecord, PaymentSettlementPayload, PaymentMethod } from '../types';

interface SettlePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentRecord | null;
  currencySymbol?: string;
  onSettle: (payload: PaymentSettlementPayload) => Promise<void> | void;
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string; subLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'upi', label: 'UPI / QR', subLabel: 'Instant', icon: QrCode },
  { id: 'bank_transfer', label: 'Bank Transfer', subLabel: 'NEFT / RTGS / IMPS', icon: Landmark },
  { id: 'cash', label: 'Cash', subLabel: 'Physical cash', icon: Banknote },
  { id: 'cheque', label: 'Cheque', subLabel: 'Cheque / DD', icon: FileCheck2 },
  { id: 'card', label: 'Card', subLabel: 'Debit / Credit', icon: CreditCard },
  { id: 'other', label: 'Other', subLabel: 'Adjustments', icon: Layers },
];

export const SettlePaymentModal: React.FC<SettlePaymentModalProps> = ({
  isOpen,
  onClose,
  payment,
  currencySymbol = '₹',
  onSettle,
}) => {
  if (!isOpen || !payment) return null;

  const [settleAmount, setSettleAmount] = useState<string>(payment.dueAmount.toString());
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const formatAmount = (val: number) => {
    return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleQuickSetAmount = (amount: number) => {
    setSettleAmount(amount.toString());
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(settleAmount);

    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid settlement amount greater than 0.');
      return;
    }

    if (amountNum > payment.dueAmount + 0.01) {
      setError(`Settlement amount cannot exceed the remaining due of ${currencySymbol}${formatAmount(payment.dueAmount)}.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await onSettle({
        paymentId: payment.id,
        documentId: payment.documentId,
        settleAmount: amountNum,
        paymentDate,
        paymentMethod,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to record settlement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalMarkup = (
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
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-[#0284c7] dark:bg-sky-950/60 dark:text-[#38bdf8] flex items-center justify-center border border-[#bae6fd] dark:border-[#223269] shrink-0">
              {payment.category === 'sales' ? (
                <ArrowDownLeft className="w-4.5 h-4.5" />
              ) : (
                <ArrowUpRight className="w-4.5 h-4.5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-[#0f172a] dark:text-white tracking-tight">
                  Record Settlement
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

          {/* Outstanding Balance Banner */}
          <div className="p-3.5 rounded-xl bg-[#f4f9ff] dark:bg-[#0b1329]/70 border border-[#bae6fd]/60 dark:border-[#223269]/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Total Document Amount
              </span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {currencySymbol}{formatAmount(payment.totalAmount)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                Pending Due Balance
              </span>
              <span className="text-base font-bold text-rose-600 dark:text-rose-400 font-mono">
                {currencySymbol}{formatAmount(payment.dueAmount)}
              </span>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Settlement Amount
              </label>
              <button
                type="button"
                onClick={() => handleQuickSetAmount(payment.dueAmount)}
                className="text-[11px] font-semibold text-[#0284c7] dark:text-[#38bdf8] hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>Full Due ({currencySymbol}{formatAmount(payment.dueAmount)})</span>
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                {currencySymbol}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={payment.dueAmount}
                value={settleAmount}
                onChange={(e) => {
                  setSettleAmount(e.target.value);
                  setError(null);
                }}
                className="w-full pl-8 pr-3 py-2 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd] dark:border-[#223269] rounded-xl text-base font-bold text-[#0f172a] dark:text-white focus:outline-none focus:border-[#0284c7] focus:ring-1 focus:ring-[#0284c7]"
                placeholder="0.00"
                required
              />
            </div>
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

          {/* Date & Ref Number Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
                Payment Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd] dark:border-[#223269] rounded-xl text-xs font-medium text-[#0f172a] dark:text-white focus:outline-none focus:border-[#0284c7] focus:ring-1 focus:ring-[#0284c7]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
                Ref / Txn ID (Optional)
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. UPI-9284..."
                  className="w-full pl-9 pr-3 py-2 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd] dark:border-[#223269] rounded-xl text-xs font-medium text-[#0f172a] dark:text-white focus:outline-none focus:border-[#0284c7] focus:ring-1 focus:ring-[#0284c7]"
                />
              </div>
            </div>
          </div>

          {/* Settlement Notes */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
              Settlement Notes / Remarks (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add payment memo or transaction details..."
              className="w-full px-3 py-2 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd] dark:border-[#223269] rounded-xl text-xs text-[#0f172a] dark:text-white focus:outline-none focus:border-[#0284c7] focus:ring-1 focus:ring-[#0284c7] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[#bae6fd] dark:border-[#223269] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-[#e0f2fe]/50 dark:hover:bg-[#1b264f] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-[2] py-2.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Recording...' : 'Confirm Settlement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalMarkup, document.body);
  }

  return modalMarkup;
};
