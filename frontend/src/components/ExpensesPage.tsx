import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Search,
  Filter,
  Pencil,
  Trash2,
  Calendar,
  Wallet,
  CheckCircle2,
  Clock,
  TrendingDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react';
import { useExpenses } from '../hooks/useExpenses';
import { Expense } from '../types';
import { AddEditExpenseModal } from './AddEditExpenseModal';

interface ExpensesPageProps {
  currencySymbol?: string;
}

const CATEGORIES = [
  'All',
  'Office Supplies',
  'Travel',
  'Utilities',
  'Rent',
  'Salaries',
  'Miscellaneous',
  'Other',
];

export const ExpensesPage: React.FC<ExpensesPageProps> = ({ currencySymbol = '₹' }) => {
  const { expenses, loading, error, stats, createExpense, updateExpense, deleteExpense } = useExpenses();

  // Filters & State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [monthFilter, setMonthFilter] = useState<string>('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Listen for direct open trigger from billing dashboard or quick actions
  useEffect(() => {
    const handleOpenTrigger = () => {
      setEditingExpense(null);
      setIsModalOpen(true);
    };
    window.addEventListener('mak_open_add_expense', handleOpenTrigger);
    return () => window.removeEventListener('mak_open_add_expense', handleOpenTrigger);
  }, []);

  // Delete Confirmation State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Format currency helper
  const formatAmount = (val: number) => {
    return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Month options derived from expenses
  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => {
      if (e.expense_date) {
        const d = new Date(e.expense_date);
        if (!isNaN(d.getTime())) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          set.add(key);
        }
      }
    });
    return Array.from(set).sort().reverse();
  }, [expenses]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      // Search
      const searchLower = searchTerm.toLowerCase().trim();
      if (searchLower) {
        const matchVendor = (item.vendor || '').toLowerCase().includes(searchLower);
        const matchDesc = (item.description || '').toLowerCase().includes(searchLower);
        const matchRef = (item.reference_number || '').toLowerCase().includes(searchLower);
        if (!matchVendor && !matchDesc && !matchRef) return false;
      }

      // Category
      if (categoryFilter !== 'All' && item.category !== categoryFilter) {
        return false;
      }

      // Status
      if (statusFilter !== 'All') {
        if (statusFilter === 'Paid' && item.status !== 'paid') return false;
        if (statusFilter === 'Pending' && item.status !== 'pending') return false;
      }

      // Month
      if (monthFilter !== 'All') {
        const d = new Date(item.expense_date);
        if (!isNaN(d.getTime())) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (key !== monthFilter) return false;
        }
      }

      return true;
    });
  }, [expenses, searchTerm, categoryFilter, statusFilter, monthFilter]);

  // Pagination Math
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage) || 1;
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredExpenses.slice(start, start + itemsPerPage);
  }, [filteredExpenses, currentPage]);

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (
    payload: Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
    id?: string
  ) => {
    if (id) {
      await updateExpense(id, payload);
    } else {
      await createExpense(payload);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    try {
      setIsDeleting(true);
      await deleteExpense(deletingId);
      setDeletingId(null);
    } catch (err) {
      console.error('Failed to delete expense:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 text-sans animate-in fade-in duration-300 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-xl font-black uppercase tracking-tight flex items-center gap-2"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
              Business Expenses
            </span>
            <span className="w-2 h-2 rounded-full bg-purple-500 dark:bg-purple-400 shrink-0" />
          </h1>
          <p className="text-[10px] text-[#64748b]/80 dark:text-zinc-400 mt-0.5">
            Track operational spending, vendor payments, and category-wise overhead costs
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* STATS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {/* Total Expenses */}
        <div className="bg-white dark:bg-[#111a36] border-l-4 border-l-purple-500 border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl p-5 shadow-xs relative flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <div className="w-8.5 h-8.5 rounded-full bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 px-2 py-0.5 rounded-full font-mono">
              {stats.count} RECS
            </span>
          </div>
          <div className="mt-3">
            <span className="text-[9px] uppercase font-black tracking-wider text-[#64748b]/80 dark:text-[#94a3b8]/80 block">
              Total Expenses
            </span>
            <span className="text-xl font-black text-[#0f172a] dark:text-white mt-1 block font-mono">
              {currencySymbol}{formatAmount(stats.totalExpenses)}
            </span>
            <span className="text-[8px] text-[#64748b]/60 dark:text-[#94a3b8]/60 mt-0.5 block">
              All Operational Costs
            </span>
          </div>
        </div>

        {/* Paid Expenses */}
        <div className="bg-white dark:bg-[#111a36] border-l-4 border-l-emerald-500 border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl p-5 shadow-xs relative flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <div className="w-8.5 h-8.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-full font-mono">
              PAID
            </span>
          </div>
          <div className="mt-3">
            <span className="text-[9px] uppercase font-black tracking-wider text-[#64748b]/80 dark:text-[#94a3b8]/80 block">
              Paid Out
            </span>
            <span className="text-xl font-black text-[#0f172a] dark:text-white mt-1 block font-mono">
              {currencySymbol}{formatAmount(stats.paidExpenses)}
            </span>
            <span className="text-[8px] text-[#64748b]/60 dark:text-[#94a3b8]/60 mt-0.5 block">
              Settled Vendor Bills
            </span>
          </div>
        </div>

        {/* Pending Expenses */}
        <div className="bg-white dark:bg-[#111a36] border-l-4 border-l-amber-500 border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl p-5 shadow-xs relative flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <div className="w-8.5 h-8.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded-full font-mono">
              DUE
            </span>
          </div>
          <div className="mt-3">
            <span className="text-[9px] uppercase font-black tracking-wider text-[#64748b]/80 dark:text-[#94a3b8]/80 block">
              Pending Outflow
            </span>
            <span className="text-xl font-black text-[#0f172a] dark:text-white mt-1 block font-mono">
              {currencySymbol}{formatAmount(stats.pendingExpenses)}
            </span>
            <span className="text-[8px] text-[#64748b]/60 dark:text-[#94a3b8]/60 mt-0.5 block">
              Unsettled Vendor Dues
            </span>
          </div>
        </div>

        {/* This Month */}
        <div className="bg-white dark:bg-[#111a36] border-l-4 border-l-sky-500 border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl p-5 shadow-xs relative flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <div className="w-8.5 h-8.5 rounded-full bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400 border border-sky-200 dark:border-sky-800/60 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 px-2 py-0.5 rounded-full font-mono">
              CURRENT
            </span>
          </div>
          <div className="mt-3">
            <span className="text-[9px] uppercase font-black tracking-wider text-[#64748b]/80 dark:text-[#94a3b8]/80 block">
              This Month
            </span>
            <span className="text-xl font-black text-[#0f172a] dark:text-white mt-1 block font-mono">
              {currencySymbol}{formatAmount(stats.thisMonthExpenses)}
            </span>
            <span className="text-[8px] text-[#64748b]/60 dark:text-[#94a3b8]/60 mt-0.5 block">
              Calendar Month Burn Rate
            </span>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Left Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto flex-1">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
            <input
              type="text"
              placeholder="Search vendor or description..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd] dark:border-[#223269] rounded-xl text-xs text-[#0f172a] dark:text-white focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#64748b] shrink-0" />
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd] dark:border-[#223269] rounded-xl text-xs font-semibold text-[#0f172a] dark:text-white focus:outline-none focus:border-purple-500 cursor-pointer transition-colors"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  Category: {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd] dark:border-[#223269] rounded-xl text-xs font-semibold text-[#0f172a] dark:text-white focus:outline-none focus:border-purple-500 cursor-pointer transition-colors"
          >
            <option value="All">Status: All</option>
            <option value="Paid">Status: Paid</option>
            <option value="Pending">Status: Pending</option>
          </select>

          {/* Month Filter */}
          {monthOptions.length > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <Calendar className="w-3.5 h-3.5 text-[#64748b] shrink-0" />
              <select
                value={monthFilter}
                onChange={(e) => {
                  setMonthFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd] dark:border-[#223269] rounded-xl text-xs font-semibold text-[#0f172a] dark:text-white focus:outline-none focus:border-purple-500 cursor-pointer transition-colors"
              >
                <option value="All">Period: All Months</option>
                {monthOptions.map((m) => {
                  const [y, mm] = m.split('-');
                  const monthName = new Date(Number(y), Number(mm) - 1, 1).toLocaleString('default', {
                    month: 'short',
                    year: 'numeric',
                  });
                  return (
                    <option key={m} value={m}>
                      {monthName}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>

        {/* Counter */}
        <div className="text-[11px] font-mono text-[#64748b] dark:text-zinc-400">
          Showing <span className="font-bold text-[#0f172a] dark:text-white">{filteredExpenses.length}</span> records
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-[#64748b] dark:text-zinc-400">
            Loading expenses from Supabase...
          </div>
        ) : error ? (
          <div className="py-12 px-4 text-center text-xs text-rose-500">
            Error loading expenses: {error}
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 flex items-center justify-center mx-auto border border-purple-200 dark:border-purple-800">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-[#0f172a] dark:text-white">No Expense Records Found</p>
            <p className="text-[11px] text-[#64748b] max-w-sm mx-auto">
              Click "+ Add Expense" to log your first business expense record.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-[10px] font-black uppercase text-[#64748b]/80 dark:text-zinc-400 tracking-wider border-b border-[#bae6fd]/30 dark:border-[#223269]/30 bg-[#f4f9ff]/60 dark:bg-[#0b1329]/40">
                  <th className="py-3 px-4 font-black">DATE</th>
                  <th className="py-3 px-4 font-black">CATEGORY</th>
                  <th className="py-3 px-4 font-black">VENDOR</th>
                  <th className="py-3 px-4 font-black">DESCRIPTION</th>
                  <th className="py-3 px-4 font-black">AMOUNT</th>
                  <th className="py-3 px-4 font-black">MODE</th>
                  <th className="py-3 px-4 font-black">STATUS</th>
                  <th className="py-3 px-4 text-right font-black">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#bae6fd]/20 dark:divide-[#223269]/20">
                {paginatedExpenses.map((exp, expIdx) => (
                  <tr
                    key={`exp-${exp.id || expIdx}-${expIdx}`}
                    className="hover:bg-[#e0f2fe]/20 dark:hover:bg-[#1b264f]/20 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-[11px] text-[#0f172a] dark:text-white font-bold whitespace-nowrap">
                      {exp.expense_date}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#0f172a] dark:text-white whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[10px] font-bold">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-[#0f172a] dark:text-white truncate max-w-[150px]">
                      {exp.vendor}
                    </td>
                    <td className="py-3 px-4 text-[#64748b] dark:text-zinc-300 truncate max-w-[200px]">
                      {exp.description || '—'}
                      {exp.reference_number && (
                        <span className="block text-[9.5px] font-mono text-[#94a3b8]">
                          Ref: {exp.reference_number}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-black text-[12px] text-[#0f172a] dark:text-white whitespace-nowrap">
                      {currencySymbol}{formatAmount(exp.amount)}
                    </td>
                    <td className="py-3 px-4 text-[#64748b] dark:text-zinc-300 whitespace-nowrap font-medium text-[11px]">
                      {exp.payment_mode}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {exp.status === 'paid' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Paid
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(exp)}
                          title="Edit Expense"
                          className="p-1.5 text-[#64748b] hover:text-[#0284c7] dark:hover:text-[#38bdf8] hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingId(exp.id)}
                          title="Delete Expense"
                          className="p-1.5 text-[#64748b] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
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

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#bae6fd]/30 dark:border-[#223269]/30 flex items-center justify-between text-xs bg-[#f4f9ff]/40 dark:bg-[#0b1329]/30">
            <span className="text-[#64748b] dark:text-zinc-400 text-[11px]">
              Page <span className="font-bold text-[#0f172a] dark:text-white">{currentPage}</span> of{' '}
              <span className="font-bold text-[#0f172a] dark:text-white">{totalPages}</span>
            </span>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-[#bae6fd] dark:border-[#223269] text-[#64748b] dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-[#bae6fd] dark:border-[#223269] text-[#64748b] dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      <AddEditExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialData={editingExpense}
        currencySymbol={currencySymbol}
      />

      {/* DELETE CONFIRMATION DIALOG */}
      {deletingId && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999 }}
          onClick={() => setDeletingId(null)}
        >
          <div
            className="bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-tight text-[#0f172a] dark:text-white" style={{ fontFamily: "'Fraunces', serif" }}>
                  Delete Expense Record?
                </h3>
                <p className="text-[10px] text-[#64748b] dark:text-zinc-400">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <p className="text-xs text-[#64748b] dark:text-zinc-300">
              Are you sure you want to permanently remove this expense record from Supabase?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-3.5 py-1.5 bg-[#f8fafc] dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-[#64748b] dark:text-zinc-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-1.5 bg-rose-600 text-white hover:bg-rose-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
