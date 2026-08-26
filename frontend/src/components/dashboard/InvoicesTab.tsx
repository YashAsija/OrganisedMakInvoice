import React, { useState, useMemo } from 'react';
import { Invoice, InvoiceStatus } from '../../types';
import { Plus, Search, Filter, Trash2, Edit2, Download, Eye, FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export interface InvoicesTabProps {
  invoices: Invoice[];
  currencySymbol: string;
  onOpenInvoiceEditor: (invoice: Invoice | null) => void;
  onDeleteInvoice: (id: string) => void;
  onBulkDeleteInvoices?: (ids: string[]) => void;
  onBulkUpdateInvoicesStatus?: (ids: string[], status: InvoiceStatus) => void;
  onUpdateInvoice?: (invoice: Invoice) => void;
  theme?: 'light' | 'dark';
}

export default function InvoicesTab({
  invoices = [],
  currencySymbol = '₹',
  onOpenInvoiceEditor,
  onDeleteInvoice,
  onBulkDeleteInvoices,
  onBulkUpdateInvoicesStatus,
  onUpdateInvoice,
  theme = 'light'
}: InvoicesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = 
        (inv.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.clientName || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredInvoices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredInvoices.map(i => i.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#111a36] p-4 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-[#223269]/70 shadow-xs">
        <div>
          <h2 className="text-base font-black text-[#0f172a] dark:text-white uppercase tracking-wider">Invoice Manager</h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Filter, track, and process client billing documents.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search invoice or client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#1b264f] border border-slate-200 dark:border-[#223269] text-[#0f172a] dark:text-white focus:outline-hidden"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-[#1b264f] border border-slate-200 dark:border-[#223269] text-[#0f172a] dark:text-white focus:outline-hidden"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>

          <button
            type="button"
            onClick={() => onOpenInvoiceEditor(null)}
            className="px-4 py-2.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* Bulk Action Bar if selected */}
      {selectedIds.length > 0 && (
        <div className="bg-[#e0f2fe] dark:bg-[#1b264f] p-3 px-4 rounded-xl border border-[#bae6fd] dark:border-[#223269] flex items-center justify-between text-xs font-bold text-[#0284c7] dark:text-[#38bdf8]">
          <span>{selectedIds.length} invoice(s) selected</span>
          <div className="flex items-center gap-2">
            {onBulkDeleteInvoices && (
              <button
                type="button"
                onClick={() => {
                  onBulkDeleteInvoices(selectedIds);
                  setSelectedIds([]);
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-black hover:bg-rose-700 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-[#111a36] rounded-2xl border border-slate-200/80 dark:border-[#223269]/70 shadow-xs overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-zinc-500 text-xs font-bold space-y-2">
            <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-zinc-600" />
            <p>No invoices found matching your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-medium">
              <thead className="bg-slate-50/70 dark:bg-[#162044] text-[10px] uppercase font-black tracking-wider text-slate-400 dark:text-zinc-400 border-b border-slate-100 dark:border-zinc-800">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredInvoices.length && filteredInvoices.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded-sm border-slate-300 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-mono">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(inv.id)}
                        onChange={() => toggleSelect(inv.id)}
                        className="rounded-sm border-slate-300 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4 font-bold text-[#0f172a] dark:text-zinc-100">{inv.invoiceNumber}</td>
                    <td className="py-3 px-4 font-sans text-slate-600 dark:text-zinc-300">{inv.clientName || 'N/A'}</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-zinc-400">{inv.date}</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-zinc-400">{inv.dueDate}</td>
                    <td className="py-3 px-4 font-bold text-[#0f172a] dark:text-white">
                      {currencySymbol}{(inv.grandTotal || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' :
                        inv.status === 'overdue' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400' :
                        'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenInvoiceEditor(inv)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#0284c7] hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                          title="Edit Invoice"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteInvoice(inv.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete Invoice"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
