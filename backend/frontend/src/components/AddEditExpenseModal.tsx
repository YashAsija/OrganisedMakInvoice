import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, AlertCircle } from 'lucide-react';
import { Expense } from '../types';

interface AddEditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'userId' | 'date' | 'createdAt'>, id?: string) => Promise<void>;
  initialData?: Expense | null;
  currencySymbol?: string;
}

const CATEGORIES = [
  'Office Supplies',
  'Travel',
  'Utilities',
  'Rent',
  'Salaries',
  'Miscellaneous',
  'Other',
];

const PAYMENT_MODES = [
  'Cash',
  'UPI',
  'Bank Transfer',
  'Credit Card',
  'Cheque',
];

export const AddEditExpenseModal: React.FC<AddEditExpenseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  currencySymbol = '₹',
}) => {
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<string>('Office Supplies');
  const [vendor, setVendor] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('UPI');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [status, setStatus] = useState<'paid' | 'pending'>('paid');

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (initialData) {
      setExpenseDate(initialData.expense_date || new Date().toISOString().split('T')[0]);
      setCategory(initialData.category || 'Office Supplies');
      setVendor(initialData.vendor || '');
      setDescription(initialData.description || '');
      setAmount(initialData.amount ? String(initialData.amount) : '');
      setPaymentMode(initialData.payment_mode || 'UPI');
      setReferenceNumber(initialData.reference_number || '');
      setStatus(initialData.status || 'paid');
    } else {
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setCategory('Office Supplies');
      setVendor('');
      setDescription('');
      setAmount('');
      setPaymentMode('UPI');
      setReferenceNumber('');
      setStatus('paid');
    }
    setFormError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!expenseDate) {
      setFormError('Expense date is required.');
      return;
    }
    if (!category.trim()) {
      setFormError('Category is required.');
      return;
    }
    if (!vendor.trim()) {
      setFormError('Vendor name is required.');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid expense amount greater than 0.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(
        {
          expense_date: expenseDate,
          category,
          vendor: vendor.trim(),
          description: description.trim() || undefined,
          amount: numAmount,
          payment_mode: paymentMode,
          reference_number: referenceNumber.trim() || undefined,
          status,
        },
        initialData?.id
      );
      onClose();
    } catch (err: any) {
      console.error('Submit expense error:', err);
      setFormError(err?.message || 'Failed to save expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalMarkup = (
    <div
      className="fixed inset-0 z-[999999] flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-xs p-0 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-150"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999 }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#111a36] border-t sm:border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#bae6fd]/30 dark:border-[#223269]/30 flex items-center justify-between bg-[#f4f9ff]/50 dark:bg-[#0b1329]/40 shrink-0">
          <div>
            <h2 className="text-sm sm:text-base font-black text-[#0f172a] dark:text-white uppercase tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              {initialData ? 'Edit Expense Record' : 'Record New Expense'}
            </h2>
            <p className="text-[10px] sm:text-xs text-[#64748b] dark:text-zinc-400 mt-0.5">
              Enter operational costs and vendor payment details
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748b] hover:text-[#0f172a] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 sm:space-y-4 overflow-y-auto flex-1 text-xs custom-scrollbar">
          {formError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl text-rose-700 dark:text-rose-300 flex items-center gap-2 text-[11px]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
            {/* Expense Date */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#64748b] dark:text-zinc-400 mb-1">
                Expense Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd] dark:border-[#223269] rounded-xl text-xs font-medium text-[#0f172a] dark:text-white focus:outline-none focus:border-[#0284c7] transition-colors"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#64748b] dark:text-zinc-400 mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd] dark:border-[#223269] rounded-xl text-xs font-medium text-[#0f172a] dark:text-white focus:outline-none focus:border-[#0284c7] transition-colors cursor-pointer"
                required
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
            {/* Vendor Name */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#64748b] dark:text-zinc-400 mb-1">
                Vendor / Payee Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Acme Stationers"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full px-3 py-2 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd] dark:border-[#223269] rounded-xl text-xs font-medium text-[#0f172a] dark:text-white focus:outline-none focus:border-[#0284c7] transition-colors"
                required
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#64748b] dark:text-zinc-400 mb-1">
                Amount ({currencySymbol}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd] dark:border-[#223269] rounded-xl text-xs font-black font-mono text-[#0f172a] dark:text-white focus:outline-none focus:border-[#0284c7] transition-colors"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-3.5">
            {/* Payment Mode */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#64748b] dark:text-zinc-400 mb-1">
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-3 py-2 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd] dark:border-[#223269] rounded-xl text-xs font-medium text-[#0f172a] dark:text-white focus:outline-none focus:border-[#0284c7] transition-colors cursor-pointer"
              >
                {PAYMENT_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </div>

            {/* Reference Number */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#64748b] dark:text-zinc-400 mb-1">
                Reference / Txn #
              </label>
              <input
                type="text"
                placeholder="e.g. UPI-984201"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full px-3 py-2 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd] dark:border-[#223269] rounded-xl text-xs font-medium text-[#0f172a] dark:text-white focus:outline-none focus:border-[#0284c7] transition-colors font-mono"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#64748b] dark:text-zinc-400 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'paid' | 'pending')}
                className="w-full px-3 py-2 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd] dark:border-[#223269] rounded-xl text-xs font-black uppercase tracking-wider text-[#0f172a] dark:text-white focus:outline-none focus:border-[#0284c7] transition-colors cursor-pointer"
              >
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-[#64748b] dark:text-zinc-400 mb-1">
              Description / Remarks (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Provide context or item details for this expense..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd] dark:border-[#223269] rounded-xl text-xs font-medium text-[#0f172a] dark:text-white focus:outline-none focus:border-[#0284c7] transition-colors resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-[#bae6fd]/30 dark:border-[#223269]/30 flex flex-row items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-[#f8fafc] dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-[#64748b] dark:text-zinc-300 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-[#0284c7] dark:bg-[#38bdf8] text-white dark:text-[#0b1329] hover:bg-[#0369a1] dark:hover:bg-[#0284c7] rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : initialData ? 'Update Expense' : 'Save Expense'}</span>
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
