import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  PlusCircle,
  Building2,
  User,
  Calendar,
  CreditCard,
  Hash,
  MessageSquare,
  Sparkles,
  Search,
  Check,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  History,
  QrCode,
  Landmark,
  Banknote,
  FileCheck2,
  Layers,
  Phone,
  Mail,
  AlertCircle,
  ChevronDown,
  ChevronsUpDown,
  Building
} from 'lucide-react';
import { PaymentRecord, PaymentCategory, PaymentMethod } from '../types';
import { isPartyMatch, mergePartyRecords } from '../lib/masterRegistrySync';

interface AddPaymentRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: Partial<PaymentRecord>) => Promise<any> | void;
  currencySymbol?: string;
  initialCategory?: PaymentCategory;
  masterClients?: any[];
  masterVendors?: any[];
  masterDatabaseList?: any[];
  invoices?: any[];
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string; subLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'bank_transfer', label: 'Bank Transfer', subLabel: 'NEFT / RTGS / IMPS', icon: Landmark },
  { id: 'upi', label: 'UPI / QR', subLabel: 'GPay / PhonePe / Paytm', icon: QrCode },
  { id: 'cash', label: 'Cash', subLabel: 'Physical cash', icon: Banknote },
  { id: 'cheque', label: 'Cheque', subLabel: 'Bank Cheque / DD', icon: FileCheck2 },
  { id: 'card', label: 'Card', subLabel: 'Credit / Debit Card', icon: CreditCard },
  { id: 'other', label: 'Other', subLabel: 'Adjustments / Contra', icon: Layers },
];

export const AddPaymentRecordModal: React.FC<AddPaymentRecordModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currencySymbol = '₹',
  initialCategory = 'sales',
  masterClients = [],
  masterVendors = [],
  masterDatabaseList = [],
  invoices = []
}) => {
  if (!isOpen) return null;

  // Category: 'sales' (Customer / Client) vs 'purchases' (Vendor / Supplier)
  const [category, setCategory] = useState<PaymentCategory>(initialCategory);

  // Direction: 'credit' (Money In / Receivable) vs 'debit' (Money Out / Payable)
  const [entryType, setEntryType] = useState<'credit' | 'debit'>(
    initialCategory === 'purchases' ? 'debit' : 'credit'
  );

  // Company Mode: 'master' (choose existing) vs 'manual' (fill new)
  const [companySourceMode, setCompanySourceMode] = useState<'master' | 'manual'>('master');
  const [masterSearch, setMasterSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedMasterCompany, setSelectedMasterCompany] = useState<any | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Company Details Form
  const [companyName, setCompanyName] = useState('');
  const [partyName, setPartyName] = useState('');
  const [partyGstin, setPartyGstin] = useState('');
  const [partyPhone, setPartyPhone] = useState('');
  const [partyEmail, setPartyEmail] = useState('');

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isDropdownOpen]);

  // Date & Month / Old Record
  const [isOldRecord, setIsOldRecord] = useState(false);
  const [recordDate, setRecordDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMonth, setPaymentMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Amounts
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [paidAmount, setPaidAmount] = useState<string>('');

  // Method, Ref, Notes
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [documentNumber, setDocumentNumber] = useState<string>(() => `SETTLE-${Date.now().toString().slice(-4)}`);
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync category with entryType defaults
  const handleCategoryChange = (cat: PaymentCategory) => {
    setCategory(cat);
    if (cat === 'purchases') {
      setEntryType('debit');
    } else {
      setEntryType('credit');
    }
  };

  // Compile Comprehensive Master Company list from masterDatabaseList (exact 82 unified records)
  const allMasterCompanies = useMemo(() => {
    // 1. If masterDatabaseList provided directly from Dashboard Master Database, use it directly
    if (Array.isArray(masterDatabaseList) && masterDatabaseList.length > 0) {
      return masterDatabaseList.map((item: any) => {
        const compName = (item.companyName || item.company || '').trim();
        const pName = (item.name || item.contactPerson || item.partyName || '').trim();
        const displayName = compName || pName || 'Unnamed';
        const rawType = (item.partyType || item.category || '').toLowerCase();
        let type: 'client' | 'vendor' | 'both' = 'client';
        if (rawType.includes('both') || (rawType.includes('client') && rawType.includes('vendor'))) {
          type = 'both';
        } else if (rawType.includes('vendor')) {
          type = 'vendor';
        }

        return {
          id: item.id || `m_${displayName}`,
          name: displayName,
          companyName: compName || displayName,
          partyName: pName || compName,
          gstin: item.gstin || item.taxId || '',
          phone: item.phone || item.mobile || '',
          email: item.email || '',
          type
        };
      }).sort((a, b) => a.name.localeCompare(b.name));
    }

    // 2. Fallback deduplication using intelligent isPartyMatch
    const list: any[] = [];
    const addOrMerge = (incoming: any, defaultType: 'client' | 'vendor') => {
      if (!incoming) return;
      const idx = list.findIndex(item => isPartyMatch(item, incoming));
      if (idx >= 0) {
        list[idx] = mergePartyRecords(list[idx], incoming);
      } else {
        const gstinVal = incoming.gstin || incoming.taxId || incoming.clientGstin || '';
        const comp = incoming.company || incoming.companyName || incoming.clientCompanyName || incoming.clientCompany || '';
        const name = incoming.name || incoming.clientName || incoming.contactPerson || comp || 'Unnamed';
        const partyType = incoming.partyType || defaultType;

        list.push({
          id: incoming.id || `m_${Math.random().toString(36).substr(2, 9)}`,
          name: comp || name,
          company: comp,
          companyName: comp,
          partyName: name || comp,
          email: incoming.email || incoming.clientEmail || '',
          phone: incoming.phone || incoming.mobile || incoming.clientPhone || '',
          gstin: gstinVal,
          taxId: gstinVal,
          partyType,
          type: partyType === 'Vendor' ? 'vendor' : 'client'
        });
      }
    };

    (masterClients || []).forEach(c => addOrMerge(c, 'client'));
    (masterVendors || []).forEach(v => addOrMerge(v, 'vendor'));

    return list.map(item => {
      const compName = (item.companyName || item.company || '').trim();
      const pName = (item.name || item.partyName || '').trim();
      const displayName = compName || pName || 'Unnamed';
      const rawType = (item.partyType || '').toLowerCase();
      let type: 'client' | 'vendor' | 'both' = 'client';
      if (rawType.includes('both') || (rawType.includes('client') && rawType.includes('vendor'))) {
        type = 'both';
      } else if (rawType.includes('vendor')) {
        type = 'vendor';
      }

      return {
        id: item.id || `m_${displayName}`,
        name: displayName,
        companyName: compName || displayName,
        partyName: pName || compName,
        gstin: item.gstin || item.taxId || '',
        phone: item.phone || item.mobile || '',
        email: item.email || '',
        type
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [masterDatabaseList, masterClients, masterVendors]);

  // Filtered Master Companies for Drop Box
  const filteredMasterCompanies = useMemo(() => {
    if (!masterSearch.trim()) return allMasterCompanies;
    const q = masterSearch.toLowerCase().trim();
    return allMasterCompanies.filter(
      c => c.name.toLowerCase().includes(q) || 
           (c.partyName && c.partyName.toLowerCase().includes(q)) || 
           (c.gstin && c.gstin.toLowerCase().includes(q)) ||
           (c.phone && c.phone.includes(q))
    );
  }, [allMasterCompanies, masterSearch]);

  const handleSelectMaster = (comp: any) => {
    setSelectedMasterCompany(comp);
    setCompanyName(comp.name);
    setPartyName(comp.partyName || comp.name);
    setPartyGstin(comp.gstin || '');
    setPartyPhone(comp.phone || '');
    setPartyEmail(comp.email || '');
    setIsDropdownOpen(false);
    setMasterSearch('');

    if (comp.type === 'vendor') {
      setCategory('purchases');
      setEntryType('debit');
    } else if (comp.type === 'client') {
      setCategory('sales');
      setEntryType('credit');
    }
  };

  // Quick Settled Amount Helpers
  const handleSetFullSettlement = () => {
    const tot = parseFloat(totalAmount);
    if (!isNaN(tot) && tot > 0) {
      setPaidAmount(tot.toString());
    }
  };

  const handleSetHalfSettlement = () => {
    const tot = parseFloat(totalAmount);
    if (!isNaN(tot) && tot > 0) {
      setPaidAmount((tot / 2).toFixed(2));
    }
  };

  const handleSetUnpaid = () => {
    setPaidAmount('0');
  };

  // Calculated Due
  const totalNum = parseFloat(totalAmount) || 0;
  const paidNum = parseFloat(paidAmount) || 0;
  const dueNum = Math.max(0, Number((totalNum - paidNum).toFixed(2)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('Please provide or select a Company Name.');
      return;
    }
    if (isNaN(totalNum) || totalNum <= 0) {
      setError('Please enter a valid total amount greater than 0.');
      return;
    }
    if (paidNum > totalNum + 0.01) {
      setError('Settled / Paid amount cannot exceed the Total Amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const effectiveDate = isOldRecord ? (recordDate || '2025-01-01') : recordDate;
      const effectiveMonth = isOldRecord ? 'Old / Past Record' : paymentMonth;

      await onSave({
        category,
        entryType,
        companyName: companyName.trim(),
        partyName: partyName.trim() || companyName.trim(),
        partyGstin: partyGstin.trim().toUpperCase() || undefined,
        partyPhone: partyPhone.trim() || undefined,
        partyEmail: partyEmail.trim() || undefined,
        totalAmount: totalNum,
        paidAmount: paidNum,
        dueAmount: dueNum,
        status: dueNum <= 0 ? 'paid' : (paidNum > 0 ? 'partially_paid' : 'pending'),
        date: effectiveDate,
        paymentDate: effectiveDate,
        paymentMonth: effectiveMonth,
        isOldRecord,
        paymentMethod,
        documentNumber: documentNumber.trim() || `SETTLE-${Date.now().toString().slice(-4)}`,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mak_notification', {
          detail: {
            title: 'Payment Record Added 💳',
            message: `Recorded ${entryType.toUpperCase()} of ${currencySymbol}${totalNum.toLocaleString('en-IN')} for ${companyName.trim()}.`,
            type: 'success'
          }
        }));
      }

      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save payment record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999999] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999999 }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#111a36] border-t sm:border border-[#bae6fd]/80 dark:border-[#223269]/80 rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden relative max-h-[92vh] sm:max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent Bar */}
        <div className="h-1.5 bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#38bdf8] shrink-0" />

        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-[#bae6fd]/40 dark:border-[#223269]/40 flex items-center justify-between bg-[#f4f9ff]/80 dark:bg-[#0b1329]/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-[#0284c7] dark:bg-sky-950/60 dark:text-[#38bdf8] flex items-center justify-center border border-[#bae6fd] dark:border-[#223269] shrink-0 shadow-xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-[#0f172a] dark:text-white uppercase tracking-tight flex items-center gap-2">
                <span>Add Payment Record</span>
                <span className="text-[9.5px] px-2 py-0.5 rounded-full font-bold bg-[#e0f2fe] dark:bg-[#1b264f] text-[#0284c7] dark:text-[#38bdf8] border border-[#bae6fd] dark:border-[#223269]">
                  Settlement
                </span>
              </h2>
              <p className="text-[10.5px] text-[#64748b] dark:text-zinc-400 mt-0.5">
                Record new transaction, past settlements, credit, or debit entries
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#64748b] hover:text-[#0f172a] dark:text-zinc-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Classification Toggles (Sales vs Purchase & Credit vs Debit) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Category: Sales vs Purchase */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[#0284c7] dark:text-[#38bdf8]">
                Company Type (Category)
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleCategoryChange('sales')}
                  className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    category === 'sales'
                      ? 'bg-[#0284c7] text-white shadow-xs'
                      : 'text-[#64748b] dark:text-zinc-400 hover:text-[#0f172a] dark:hover:text-white'
                  }`}
                >
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span>Sales Company</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCategoryChange('purchases')}
                  className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    category === 'purchases'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-[#64748b] dark:text-zinc-400 hover:text-[#0f172a] dark:hover:text-white'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Purchase Company</span>
                </button>
              </div>
            </div>

            {/* Entry Direction: Credit vs Debit */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[#0284c7] dark:text-[#38bdf8]">
                Transaction Entry Type
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-xl">
                <button
                  type="button"
                  onClick={() => setEntryType('credit')}
                  className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    entryType === 'credit'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-[#64748b] dark:text-zinc-400 hover:text-[#0f172a] dark:hover:text-white'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Credit (+) Received</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEntryType('debit')}
                  className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    entryType === 'debit'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-[#64748b] dark:text-zinc-400 hover:text-[#0f172a] dark:hover:text-white'
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>Debit (-) Paid Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Company Selection Mode */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-[#0b1329] border border-[#bae6fd]/60 dark:border-[#223269]/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0284c7] dark:text-[#38bdf8] flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Company Information
              </span>
              <div className="flex items-center gap-1 bg-[#f4f9ff] dark:bg-[#111a36] p-0.5 rounded-lg border border-[#bae6fd]/40 dark:border-[#223269]/40">
                <button
                  type="button"
                  onClick={() => setCompanySourceMode('master')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    companySourceMode === 'master'
                      ? 'bg-[#0284c7] text-white shadow-xs'
                      : 'text-[#64748b] hover:text-[#0f172a] dark:text-zinc-400'
                  }`}
                >
                  Master Database
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCompanySourceMode('manual');
                    setSelectedMasterCompany(null);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    companySourceMode === 'manual'
                      ? 'bg-[#0284c7] text-white shadow-xs'
                      : 'text-[#64748b] hover:text-[#0f172a] dark:text-zinc-400'
                  }`}
                >
                  New Company
                </button>
              </div>
            </div>

            {/* Master Database Drop Box / Picker */}
            {companySourceMode === 'master' && (
              <div className="space-y-1.5" ref={dropdownRef}>
                <label className="block text-[9.5px] font-extrabold uppercase tracking-wider text-[#64748b] dark:text-zinc-400">
                  Select Master Company / Client / Vendor ({allMasterCompanies.length} available)
                </label>

                <div className="relative">
                  {/* Drop Box Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#bae6fd]/80 dark:border-[#223269]/80 bg-[#f4f9ff] dark:bg-[#111a36] hover:border-[#0284c7] transition-all flex items-center justify-between text-left cursor-pointer shadow-xs focus:outline-none focus:ring-1 focus:ring-[#0284c7]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-6 h-6 rounded-lg bg-[#e0f2fe] dark:bg-[#1b264f] flex items-center justify-center shrink-0 text-[#0284c7] dark:text-[#38bdf8]">
                        <Building className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className={`text-xs block truncate ${companyName ? 'font-bold text-[#0f172a] dark:text-white' : 'font-normal text-[#64748b]/70'}`}>
                          {companyName || 'Choose company from master database...'}
                        </span>
                        {selectedMasterCompany && (
                          <span className="text-[10px] text-[#0284c7] dark:text-[#38bdf8] font-medium block truncate">
                            {selectedMasterCompany.partyName ? `${selectedMasterCompany.partyName} • ` : ''}
                            {selectedMasterCompany.type === 'both' ? 'Client & Vendor' : selectedMasterCompany.type === 'vendor' ? 'Vendor (Supplier)' : 'Client (Customer)'}
                            {selectedMasterCompany.gstin ? ` • ${selectedMasterCompany.gstin}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-[#64748b] transition-transform duration-200 shrink-0 ${isDropdownOpen ? 'rotate-180 text-[#0284c7]' : ''}`} />
                  </button>

                  {/* Drop Box Menu Panel */}
                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-[#0f172a] border border-[#bae6fd] dark:border-[#223269] rounded-2xl shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
                      {/* Search Bar inside dropdown */}
                      <div className="p-2.5 border-b border-[#bae6fd]/40 dark:border-[#223269]/40 bg-[#f4f9ff]/60 dark:bg-[#111a36]/60">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#64748b]" />
                          <input
                            type="text"
                            autoFocus
                            value={masterSearch}
                            onChange={(e) => setMasterSearch(e.target.value)}
                            placeholder="Type to filter company name, contact, GSTIN..."
                            className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-white dark:bg-[#0b1329] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-lg text-[#0f172a] dark:text-white placeholder-[#64748b]/50 focus:outline-none focus:border-[#0284c7] focus:ring-1 focus:ring-[#0284c7]"
                          />
                        </div>
                      </div>

                      {/* Options List */}
                      <div className="max-h-52 overflow-y-auto divide-y divide-[#bae6fd]/20 dark:divide-[#223269]/30">
                        {filteredMasterCompanies.length > 0 ? (
                          filteredMasterCompanies.map((comp) => {
                            const isSelected = selectedMasterCompany?.id === comp.id || companyName.toLowerCase() === comp.name.toLowerCase();
                            return (
                              <div
                                key={comp.id}
                                onClick={() => handleSelectMaster(comp)}
                                className={`px-3.5 py-2.5 cursor-pointer transition-all flex items-center justify-between gap-2 ${
                                  isSelected
                                    ? 'bg-[#e0f2fe] dark:bg-[#1b264f] text-[#0284c7] dark:text-[#38bdf8]'
                                    : 'hover:bg-[#f4f9ff] dark:hover:bg-[#111a36] text-[#0f172a] dark:text-zinc-200'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs truncate ${isSelected ? 'font-bold' : 'font-medium'}`}>
                                      {comp.name}
                                    </span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase ${
                                      comp.type === 'vendor'
                                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                        : comp.type === 'both'
                                        ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                                        : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                                    }`}>
                                      {comp.type === 'both' ? 'Client & Vendor' : comp.type === 'vendor' ? 'Vendor' : 'Client'}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-[#64748b] dark:text-zinc-400 flex items-center gap-2 mt-0.5 truncate">
                                    {comp.partyName && comp.partyName !== comp.name && <span>{comp.partyName}</span>}
                                    {comp.gstin && <span>GST: <span className="font-mono">{comp.gstin}</span></span>}
                                    {comp.phone && <span>Ph: {comp.phone}</span>}
                                  </div>
                                </div>
                                {isSelected && (
                                  <div className="w-5 h-5 rounded-full bg-[#0284c7] text-white flex items-center justify-center shrink-0">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-4 text-center">
                            <p className="text-xs text-[#64748b] font-medium">No company matching "{masterSearch}"</p>
                            <button
                              type="button"
                              onClick={() => {
                                setCompanySourceMode('manual');
                                setCompanyName(masterSearch);
                                setIsDropdownOpen(false);
                              }}
                              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0284c7] text-white text-[11px] font-bold cursor-pointer hover:bg-[#0369a1]"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              Create as New Company
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Editable Company Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-[9.5px] font-extrabold uppercase tracking-wider text-[#64748b] dark:text-zinc-400 mb-1">
                  Company / Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Corp Industries"
                  className="w-full px-3 py-2 text-xs bg-[#f4f9ff] dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-xl text-[#0f172a] dark:text-white placeholder-[#64748b]/40 focus:outline-none focus:border-[#0284c7]"
                />
              </div>

              <div>
                <label className="block text-[9.5px] font-extrabold uppercase tracking-wider text-[#64748b] dark:text-zinc-400 mb-1">
                  Contact Person / Party Name
                </label>
                <input
                  type="text"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full px-3 py-2 text-xs bg-[#f4f9ff] dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-xl text-[#0f172a] dark:text-white placeholder-[#64748b]/40 focus:outline-none focus:border-[#0284c7]"
                />
              </div>

              <div>
                <label className="block text-[9.5px] font-extrabold uppercase tracking-wider text-[#64748b] dark:text-zinc-400 mb-1">
                  GSTIN (Optional)
                </label>
                <input
                  type="text"
                  value={partyGstin}
                  onChange={(e) => setPartyGstin(e.target.value.toUpperCase())}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                  className="w-full px-3 py-2 text-xs font-mono uppercase bg-[#f4f9ff] dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-xl text-[#0f172a] dark:text-white placeholder-[#64748b]/40 focus:outline-none focus:border-[#0284c7]"
                />
              </div>

              <div>
                <label className="block text-[9.5px] font-extrabold uppercase tracking-wider text-[#64748b] dark:text-zinc-400 mb-1">
                  Phone / Mobile
                </label>
                <input
                  type="text"
                  value={partyPhone}
                  onChange={(e) => setPartyPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 text-xs bg-[#f4f9ff] dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-xl text-[#0f172a] dark:text-white placeholder-[#64748b]/40 focus:outline-none focus:border-[#0284c7]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Payment Month & Date / Old Record Checkbox */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-[#0b1329] border border-[#bae6fd]/60 dark:border-[#223269]/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0284c7] dark:text-[#38bdf8] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Date &amp; Period Settings
              </span>
              
              {/* Old Record Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isOldRecord}
                  onChange={(e) => setIsOldRecord(e.target.checked)}
                  className="w-4 h-4 text-[#0284c7] rounded-md border-[#bae6fd] focus:ring-[#0284c7] cursor-pointer"
                />
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <History className="w-3.5 h-3.5" /> Add as Old Record / Don't remember month
                </span>
              </label>
            </div>

            {isOldRecord ? (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Historical Record Mode Enabled:</span>
                  <p className="text-[10.5px] mt-0.5 opacity-90">
                    This record will be saved under Past Settlements without requiring an exact billing cycle.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9.5px] font-extrabold uppercase tracking-wider text-[#64748b] dark:text-zinc-400 mb-1">
                    Payment Month
                  </label>
                  <input
                    type="month"
                    value={paymentMonth}
                    onChange={(e) => {
                      setPaymentMonth(e.target.value);
                      if (e.target.value) {
                        setRecordDate(`${e.target.value}-01`);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-[#f4f9ff] dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-xl text-[#0f172a] dark:text-white focus:outline-none focus:border-[#0284c7]"
                  />
                </div>

                <div>
                  <label className="block text-[9.5px] font-extrabold uppercase tracking-wider text-[#64748b] dark:text-zinc-400 mb-1">
                    Transaction / Entry Date
                  </label>
                  <input
                    type="date"
                    value={recordDate}
                    onChange={(e) => setRecordDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#f4f9ff] dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-xl text-[#0f172a] dark:text-white focus:outline-none focus:border-[#0284c7]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Amount & Settlement Status */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-[#0b1329] border border-[#bae6fd]/60 dark:border-[#223269]/60 space-y-3">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0284c7] dark:text-[#38bdf8] flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" /> Amount &amp; Settlement
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[9.5px] font-extrabold uppercase tracking-wider text-[#64748b] dark:text-zinc-400 mb-1">
                  Total Billed Amount ({currencySymbol}) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-[#64748b]">{currencySymbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold bg-[#f4f9ff] dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-xl text-[#0f172a] dark:text-white focus:outline-none focus:border-[#0284c7]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[9.5px] font-extrabold uppercase tracking-wider text-[#64748b] dark:text-zinc-400">
                    Settled / Paid Amount ({currencySymbol})
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleSetFullSettlement}
                      className="text-[8.5px] font-bold text-[#0284c7] hover:underline cursor-pointer"
                    >
                      100% Full
                    </button>
                    <span className="text-[#64748b] text-[8px]">•</span>
                    <button
                      type="button"
                      onClick={handleSetHalfSettlement}
                      className="text-[8.5px] font-bold text-[#0284c7] hover:underline cursor-pointer"
                    >
                      50%
                    </button>
                    <span className="text-[#64748b] text-[8px]">•</span>
                    <button
                      type="button"
                      onClick={handleSetUnpaid}
                      className="text-[8.5px] font-bold text-[#64748b] hover:underline cursor-pointer"
                    >
                      Unpaid
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-[#64748b]">{currencySymbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold bg-[#f4f9ff] dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-xl text-[#0f172a] dark:text-white focus:outline-none focus:border-[#0284c7]"
                  />
                </div>
              </div>
            </div>

            {/* Live Settlement Status Preview */}
            <div className="p-3 rounded-xl bg-[#f4f9ff] dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold text-[#64748b] dark:text-zinc-400 block">Remaining Due</span>
                <span className="text-sm font-black font-mono text-[#0f172a] dark:text-white">
                  {currencySymbol}{dueNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase font-bold text-[#64748b] dark:text-zinc-400 block">Status</span>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border inline-block mt-0.5 ${
                  dueNum <= 0 && totalNum > 0
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : paidNum > 0
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}>
                  {dueNum <= 0 && totalNum > 0 ? 'Fully Settled' : (paidNum > 0 ? 'Partially Paid' : 'Pending Due')}
                </span>
              </div>
            </div>
          </div>

          {/* Section 5: Payment Method & Reference */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-[#0b1329] border border-[#bae6fd]/60 dark:border-[#223269]/60 space-y-3">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0284c7] dark:text-[#38bdf8] flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5" /> Payment Mode &amp; Reference
            </span>

            {/* Method Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((pm) => {
                const IconComponent = pm.icon;
                const isSelected = paymentMethod === pm.id;
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.id)}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#0284c7] bg-[#e0f2fe] text-[#0284c7] dark:bg-[#1b264f] dark:text-[#38bdf8] font-bold shadow-xs'
                        : 'border-[#bae6fd]/40 dark:border-[#223269]/40 bg-[#f4f9ff]/50 dark:bg-[#111a36]/50 hover:bg-[#e0f2fe]/40 text-[#0f172a] dark:text-zinc-300'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-[#0284c7] text-white' : 'bg-white dark:bg-[#0b1329] text-[#64748b]'}`}>
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-bold block truncate">{pm.label}</span>
                      <span className="text-[8.5px] text-[#64748b] dark:text-zinc-400 block truncate">{pm.subLabel}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Doc Number & Reference Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[9.5px] font-extrabold uppercase tracking-wider text-[#64748b] dark:text-zinc-400 mb-1">
                  Voucher / Receipt No.
                </label>
                <input
                  type="text"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="SETTLE-001"
                  className="w-full px-3 py-2 text-xs font-mono bg-[#f4f9ff] dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-xl text-[#0f172a] dark:text-white focus:outline-none focus:border-[#0284c7]"
                />
              </div>

              <div>
                <label className="block text-[9.5px] font-extrabold uppercase tracking-wider text-[#64748b] dark:text-zinc-400 mb-1">
                  UTR / Reference / Cheque No.
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. UTR12345678"
                  className="w-full px-3 py-2 text-xs font-mono bg-[#f4f9ff] dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-xl text-[#0f172a] dark:text-white focus:outline-none focus:border-[#0284c7]"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[9.5px] font-extrabold uppercase tracking-wider text-[#64748b] dark:text-zinc-400 mb-1">
                Remarks / Settlement Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Optional notes regarding this payment settlement..."
                className="w-full px-3 py-2 text-xs bg-[#f4f9ff] dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-xl text-[#0f172a] dark:text-white placeholder-[#64748b]/40 focus:outline-none focus:border-[#0284c7]"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#bae6fd] dark:border-[#223269] text-xs font-bold text-[#64748b] hover:text-[#0f172a] dark:text-zinc-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#2563eb] hover:from-[#0369a1] hover:to-[#1d4ed8] text-white text-xs font-bold uppercase tracking-wider shadow-sm hover:shadow-md hover:shadow-[#0284c7]/20 active:scale-98 transition-all cursor-pointer flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>Saving Record...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save &amp; Settle Record</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
