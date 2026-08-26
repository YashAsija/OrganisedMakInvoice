import React from 'react';
import { Invoice } from '../../types';
import { RefreshCw, Plus, Calendar, Clock, CheckCircle2 } from 'lucide-react';

export interface RecurringTabProps {
  invoices: Invoice[];
  onOpenInvoiceEditor: (invoice: Invoice | null) => void;
  currencySymbol?: string;
  theme?: 'light' | 'dark';
}

export default function RecurringTab({
  invoices = [],
  onOpenInvoiceEditor,
  currencySymbol = '₹',
  theme = 'light'
}: RecurringTabProps) {
  // Filter parent recurring invoices
  const recurringInvoices = invoices.filter(inv => inv.recurringSettings && inv.recurringSettings.isRecurring);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#111a36] p-4 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-[#223269]/70 shadow-xs">
        <div>
          <h2 className="text-base font-black text-[#0f172a] dark:text-white uppercase tracking-wider">Recurring Billing Schedule</h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Automated invoice schedules and recurring parent profiles.</p>
        </div>

        <button
          type="button"
          onClick={() => onOpenInvoiceEditor(null)}
          className="px-4 py-2.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Recurring Invoice</span>
        </button>
      </div>

      {/* Content Grid */}
      {recurringInvoices.length === 0 ? (
        <div className="bg-white dark:bg-[#111a36] p-12 rounded-2xl border border-slate-200/80 dark:border-[#223269]/70 text-center space-y-3">
          <RefreshCw className="w-10 h-10 text-slate-300 dark:text-zinc-600 mx-auto animate-spin-slow" />
          <h3 className="text-sm font-bold text-[#0f172a] dark:text-white">No Active Recurring Schedules</h3>
          <p className="text-xs text-slate-400 dark:text-zinc-400 max-w-sm mx-auto">
            Set up recurring billing on any invoice to automatically issue child invoices on weekly, monthly, or yearly schedules.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recurringInvoices.map((inv) => {
            const rec = inv.recurringSettings!;
            return (
              <div
                key={inv.id}
                className="bg-white dark:bg-[#111a36] p-5 rounded-2xl border border-slate-200/80 dark:border-[#223269]/70 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-black text-[#0f172a] dark:text-white font-mono">{inv.invoiceNumber}</h3>
                    <p className="text-xs font-medium text-slate-600 dark:text-zinc-300 mt-0.5">{inv.clientName || 'Unnamed Client'}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    rec.hasEnded ? 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                  }`}>
                    {rec.hasEnded ? 'Completed' : 'Active'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-500 dark:text-zinc-400 pt-2 border-t border-slate-100 dark:border-zinc-800">
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-400 block">Interval</span>
                    <span className="font-bold text-[#0f172a] dark:text-white capitalize">{rec.interval || 'Monthly'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-400 block">Amount</span>
                    <span className="font-bold text-[#0f172a] dark:text-white">{currencySymbol}{(inv.grandTotal || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-400 block">Start Date</span>
                    <span>{rec.startDate || inv.date}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-400 block">Last Generated</span>
                    <span>{rec.lastGeneratedDate || 'None'}</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => onOpenInvoiceEditor(inv)}
                    className="text-xs font-bold text-[#0284c7] hover:underline cursor-pointer"
                  >
                    Edit Schedule
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
