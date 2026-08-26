import React from 'react';
import { Invoice, BusinessProfile } from '../../types';
import { Plus, FileText, ArrowUpRight, DollarSign, Clock, CheckCircle2, TrendingUp } from 'lucide-react';

export interface OverviewTabProps {
  invoices: Invoice[];
  profile: BusinessProfile;
  currencySymbol: string;
  onOpenInvoiceEditor: (invoice: Invoice | null) => void;
  onOpenProfile?: () => void;
  setActiveTab: (tab: string) => void;
  theme?: 'light' | 'dark';
}

export default function OverviewTab({
  invoices = [],
  profile,
  currencySymbol = '₹',
  onOpenInvoiceEditor,
  onOpenProfile,
  setActiveTab,
  theme = 'light'
}: OverviewTabProps) {
  const totalInvoiced = invoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);
  const paidInvoices = invoices.filter(inv => inv.status === 'paid');
  const totalPaid = paidInvoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);
  const pendingInvoices = invoices.filter(inv => inv.status === 'pending' || inv.status === 'sent');
  const totalPending = pendingInvoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);
  const recentInvoices = invoices.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Quick Action Banner */}
      <div className="bg-gradient-to-r from-[#0284c7] to-[#0369a1] dark:from-[#1b264f] dark:to-[#111a36] p-6 rounded-2xl text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight">Welcome back, {profile?.name || 'Business Owner'}</h2>
          <p className="text-sm opacity-90 mt-1">Manage your invoicing, track payments, and optimize billing workflow.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onOpenInvoiceEditor(null)}
            className="px-4 py-2.5 rounded-xl bg-white text-[#0284c7] font-black text-xs uppercase tracking-wider hover:bg-slate-50 transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#111a36] p-5 rounded-2xl border border-slate-200/80 dark:border-[#223269]/70 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider">
            <span>Total Invoiced</span>
            <DollarSign className="w-4 h-4 text-[#0284c7]" />
          </div>
          <p className="text-2xl font-black text-[#0f172a] dark:text-white font-mono">
            {currencySymbol}{totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-400 block">{invoices.length} Total Documents</span>
        </div>

        <div className="bg-white dark:bg-[#111a36] p-5 rounded-2xl border border-slate-200/80 dark:border-[#223269]/70 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider">
            <span>Collected</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {currencySymbol}{totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-400 block">{paidInvoices.length} Paid Invoices</span>
        </div>

        <div className="bg-white dark:bg-[#111a36] p-5 rounded-2xl border border-slate-200/80 dark:border-[#223269]/70 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider">
            <span>Pending Receivables</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {currencySymbol}{totalPending.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-400 block">{pendingInvoices.length} Awaiting Payment</span>
        </div>
      </section>

      {/* Recent Activity Table */}
      <div className="bg-white dark:bg-[#111a36] p-6 rounded-2xl border border-slate-200/80 dark:border-[#223269]/70 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-[#0f172a] dark:text-white uppercase tracking-wider">Recent Invoices</h3>
          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className="text-xs font-bold text-[#0284c7] dark:text-[#38bdf8] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="py-8 text-center text-slate-400 dark:text-zinc-500 text-xs font-bold">
            No invoices created yet. Click "Create Invoice" to get started!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-medium">
              <thead className="text-[10px] uppercase font-black tracking-wider text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-800">
                <tr>
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Client</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-mono">
                {recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-3 font-bold text-[#0f172a] dark:text-zinc-200">{inv.invoiceNumber}</td>
                    <td className="py-3 px-3 font-sans text-slate-600 dark:text-zinc-300">{inv.clientName || 'N/A'}</td>
                    <td className="py-3 px-3 text-slate-500 dark:text-zinc-400">{inv.date}</td>
                    <td className="py-3 px-3 font-bold text-[#0f172a] dark:text-white">
                      {currencySymbol}{(inv.grandTotal || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' :
                        inv.status === 'overdue' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400' :
                        'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
