import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  CreditCard,
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Building2,
  User,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Layers,
  Receipt,
  HelpCircle,
  RefreshCw,
  Wallet,
  Users2,
  Phone,
  Mail,
  ChevronRight as ChevronRightIcon,
  XCircle,
  PieChart,
  FileText,
  FileCode,
  Check,
  X,
  File
} from 'lucide-react';
import XLSX from 'xlsx-js-style';
import { jsPDF } from 'jspdf';
import { PaymentRecord, PaymentSettlementPayload, PaymentStatus, PaymentCategory, PaymentMethod, BusinessProfile } from '../types';
import { usePayments } from '../hooks/usePayments';
import { SettlePaymentModal } from './SettlePaymentModal';

interface PaymentsPageProps {
  invoices: any[];
  expenses?: any[];
  profile?: BusinessProfile;
  onUpdateInvoice?: (invoice: any) => void;
  onSaveExpense?: (expense: any) => void;
  currencySymbol?: string;
  userEmail?: string | null;
}

interface PartySummary {
  companyName: string;
  partyName: string;
  phone?: string;
  email?: string;
  salesTotal: number;
  salesPaid: number;
  salesDue: number; // to receive (+amount)
  purchasesTotal: number;
  purchasesPaid: number;
  purchasesDue: number; // to pay (-amount)
  netDue: number; // salesDue - purchasesDue (>0 is +To Receive, <0 is -To Pay)
  activeCategoryDue: number; // Due specifically in current active category tab
  documentsCount: number;
  pendingCount: number;
  overdueCount: number;
}

export const PaymentsPage: React.FC<PaymentsPageProps> = ({
  invoices,
  expenses = [],
  profile,
  onUpdateInvoice,
  onSaveExpense,
  currencySymbol = '₹',
  userEmail
}) => {
  const { payments, stats, settlePayment } = usePayments({
    invoices,
    expenses,
    onUpdateInvoice,
    onSaveExpense,
    userEmail
  });

  // State: Active Category Tab ('sales' | 'purchases')
  const [activeCategory, setActiveCategory] = useState<PaymentCategory>('sales');

  // Selected Company/Party for drill-down / filtering from Left Panel
  const [selectedParty, setSelectedParty] = useState<string | null>(null);

  // Search & Filter State
  const [partySearchTerm, setPartySearchTerm] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'party' | 'due' | 'docNumber'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Settlement Modal State
  const [settlingPayment, setSettlingPayment] = useState<PaymentRecord | null>(null);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState<boolean>(false);

  // Pagination State - Transactions Table (Right: exactly 15 entries)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  // Pagination State - Parties / Companies List (Left: exactly 5 entries per page with vertical scroll)
  const [partyCurrentPage, setPartyCurrentPage] = useState<number>(1);
  const partyItemsPerPage = 5;

  // Toggle Sorting for Column Headers
  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder(field === 'party' || field === 'docNumber' ? 'asc' : 'desc');
    }
    setCurrentPage(1);
  };

  // Format Helper
  const formatAmount = (val: number) => {
    return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Month options derived from payments
  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    payments.forEach((p) => {
      if (p.date) {
        const d = new Date(p.date);
        if (!isNaN(d.getTime())) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          set.add(key);
        }
      }
    });
    return Array.from(set).sort().reverse();
  }, [payments]);

  // Aggregate Party Summaries for the Left Panel (Strictly partitioned by activeCategory)
  const partySummaries: PartySummary[] = useMemo(() => {
    const partyMap = new Map<string, PartySummary>();

    // Only process payments belonging to the current active tab (Sales vs Purchases)
    const categoryPayments = payments.filter((p) => p.category === activeCategory);

    categoryPayments.forEach((p) => {
      const company = (p.companyName || p.partyName || (activeCategory === 'sales' ? 'Client Company' : 'Vendor Company')).trim();
      const party = (p.partyName || '').trim();
      const key = company.toLowerCase();

      if (!partyMap.has(key)) {
        partyMap.set(key, {
          companyName: company,
          partyName: party && party.toLowerCase() !== company.toLowerCase() ? party : (p.partyName || ''),
          phone: p.partyPhone,
          email: p.partyEmail,
          salesTotal: 0,
          salesPaid: 0,
          salesDue: 0,
          purchasesTotal: 0,
          purchasesPaid: 0,
          purchasesDue: 0,
          netDue: 0,
          activeCategoryDue: 0,
          documentsCount: 0,
          pendingCount: 0,
          overdueCount: 0,
        });
      }

      const entry = partyMap.get(key)!;
      entry.documentsCount += 1;
      if (p.status === 'pending' || p.status === 'partially_paid') {
        entry.pendingCount += 1;
      }
      if (p.status === 'overdue') {
        entry.overdueCount += 1;
      }

      if (activeCategory === 'sales') {
        entry.salesTotal += p.totalAmount;
        entry.salesPaid += p.paidAmount;
        entry.salesDue += p.dueAmount;
        entry.activeCategoryDue = entry.salesDue;
        entry.netDue = entry.salesDue;
      } else {
        entry.purchasesTotal += p.totalAmount;
        entry.purchasesPaid += p.paidAmount;
        entry.purchasesDue += p.dueAmount;
        entry.activeCategoryDue = entry.purchasesDue;
        entry.netDue = -entry.purchasesDue;
      }

      if (!entry.phone && p.partyPhone) entry.phone = p.partyPhone;
      if (!entry.email && p.partyEmail) entry.email = p.partyEmail;
      if (!entry.partyName && party) entry.partyName = party;
    });

    return Array.from(partyMap.values());
  }, [payments, activeCategory]);

  // Filtered Parties for Left Panel
  const filteredParties = useMemo(() => {
    return partySummaries.filter((party) => {
      if (partySearchTerm.trim()) {
        const q = partySearchTerm.toLowerCase().trim();
        const matchCompany = party.companyName.toLowerCase().includes(q);
        const matchName = party.partyName.toLowerCase().includes(q);
        const matchPhone = (party.phone || '').toLowerCase().includes(q);
        const matchEmail = (party.email || '').toLowerCase().includes(q);
        return matchCompany || matchName || matchPhone || matchEmail;
      }
      return true;
    }).sort((a, b) => {
      // Sort parties with highest outstanding dues first
      return b.activeCategoryDue - a.activeCategoryDue;
    });
  }, [partySummaries, partySearchTerm]);

  // Filtered Payments for Right Detail Panel
  const filteredPayments = useMemo(() => {
    return payments.filter((item) => {
      // 1. Category tab match
      if (item.category !== activeCategory) return false;

      // 2. Selected Company / Party Drill-down
      if (selectedParty) {
        const sel = selectedParty.trim().toLowerCase();
        const matchComp = (item.companyName || '').trim().toLowerCase() === sel;
        const matchPart = (item.partyName || '').trim().toLowerCase() === sel;
        if (!matchComp && !matchPart) return false;
      }

      // 3. Search term (Search company, party, doc #, ref, notes)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchCompany = (item.companyName || '').toLowerCase().includes(q);
        const matchParty = (item.partyName || '').toLowerCase().includes(q);
        const matchDoc = (item.documentNumber || '').toLowerCase().includes(q);
        const matchRef = (item.referenceNumber || '').toLowerCase().includes(q);
        const matchNotes = (item.notes || '').toLowerCase().includes(q);
        if (!matchCompany && !matchParty && !matchDoc && !matchRef && !matchNotes) return false;
      }

      // 4. Status filter
      if (statusFilter !== 'All') {
        if (statusFilter.toLowerCase() !== item.status.toLowerCase()) return false;
      }

      // 5. Payment Method filter
      if (paymentMethodFilter !== 'All') {
        if (!item.paymentMethod || item.paymentMethod.toLowerCase() !== paymentMethodFilter.toLowerCase()) {
          return false;
        }
      }

      // 6. Date / Month filter
      if (dateFilter !== 'All') {
        const d = new Date(item.date);
        if (!isNaN(d.getTime())) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (key !== dateFilter) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        const timeA = a.date ? new Date(a.date).getTime() : 0;
        const timeB = b.date ? new Date(b.date).getTime() : 0;
        comparison = timeB - timeA;
      } else if (sortBy === 'amount') {
        comparison = (b.totalAmount || 0) - (a.totalAmount || 0);
      } else if (sortBy === 'due') {
        comparison = (b.dueAmount || 0) - (a.dueAmount || 0);
      } else if (sortBy === 'party') {
        const nameA = (a.companyName || a.partyName || '').trim().toLowerCase();
        const nameB = (b.companyName || b.partyName || '').trim().toLowerCase();
        comparison = nameB.localeCompare(nameA);
      } else if (sortBy === 'docNumber') {
        const docA = (a.documentNumber || '').trim();
        const docB = (b.documentNumber || '').trim();
        comparison = docB.localeCompare(docA, undefined, { numeric: true, sensitivity: 'base' });
      }
      return sortOrder === 'asc' ? -comparison : comparison;
    });
  }, [payments, activeCategory, selectedParty, searchTerm, statusFilter, paymentMethodFilter, dateFilter, sortBy, sortOrder]);

  // Pagination Math - Transactions Table (Right)
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage) || 1;
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPayments.slice(start, start + itemsPerPage);
  }, [filteredPayments, currentPage]);

  // Pagination Math - Parties / Companies List (Left)
  const partyTotalPages = Math.ceil(filteredParties.length / partyItemsPerPage) || 1;
  const paginatedParties = useMemo(() => {
    const start = (partyCurrentPage - 1) * partyItemsPerPage;
    return filteredParties.slice(start, start + partyItemsPerPage);
  }, [filteredParties, partyCurrentPage]);

  const handleOpenSettle = (payment: PaymentRecord) => {
    setSettlingPayment(payment);
    setIsSettleModalOpen(true);
  };

  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportStartDate, setExportStartDate] = useState<string>('');
  const [exportEndDate, setExportEndDate] = useState<string>('');
  const [exportCategory, setExportCategory] = useState<'all' | 'sales' | 'purchases'>('all');
  const [exportSortBy, setExportSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'doc_asc'>('date_desc');
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf' | 'json' | 'csv'>('excel');

  // Export Type: 'company_summary' (Debtors & Creditors Ledger) vs 'itemized_invoices'
  const [exportReportType, setExportReportType] = useState<'company_summary' | 'itemized_invoices'>('company_summary');

  // Export Outstanding Filter: 'outstanding_only' vs 'all' (Both Settled & Outstanding)
  const [exportOutstandingScope, setExportOutstandingScope] = useState<'outstanding_only' | 'all'>('all');

  // Export Parameter / Column Selection State (Exact 8 user requested fields)
  const [selectedExportColumns, setSelectedExportColumns] = useState<{
    companyName: boolean;
    partyContact: boolean;
    phone: boolean;
    email: boolean;
    accountType: boolean;
    debit: boolean;
    credit: boolean;
    invoiceCounts: boolean;
  }>({
    companyName: true,
    partyContact: true,
    phone: true,
    email: true,
    accountType: true,
    debit: true,
    credit: true,
    invoiceCounts: true,
  });

  const toggleExportColumn = (key: keyof typeof selectedExportColumns) => {
    setSelectedExportColumns(prev => {
      const current = prev[key];
      // Keep at least one column active
      const activeCount = Object.values(prev).filter(Boolean).length;
      if (current && activeCount <= 1) return prev;
      return { ...prev, [key]: !current };
    });
  };

  const setAllExportColumns = (val: boolean) => {
    setSelectedExportColumns({
      companyName: true, // Company name stays on
      partyContact: val,
      phone: val,
      email: val,
      accountType: val,
      debit: val,
      credit: val,
      invoiceCounts: val,
    });
  };

  const setExportPresetColumns = (preset: 'all' | 'financial' | 'contact' | 'compact') => {
    if (preset === 'all') {
      setAllExportColumns(true);
    } else if (preset === 'financial') {
      setSelectedExportColumns({
        companyName: true,
        partyContact: false,
        phone: false,
        email: false,
        accountType: true,
        debit: true,
        credit: true,
        invoiceCounts: false,
      });
    } else if (preset === 'contact') {
      setSelectedExportColumns({
        companyName: true,
        partyContact: true,
        phone: true,
        email: true,
        accountType: true,
        debit: false,
        credit: false,
        invoiceCounts: false,
      });
    } else if (preset === 'compact') {
      setSelectedExportColumns({
        companyName: true,
        partyContact: true,
        phone: true,
        email: false,
        accountType: true,
        debit: true,
        credit: true,
        invoiceCounts: false,
      });
    }
  };

  // Company-wise Outstanding Debtors / Creditors aggregated report dataset
  const exportCompanyRecords = useMemo(() => {
    // 1. Filter raw transactions according to date range and category scope
    const scopedPayments = payments.filter((item) => {
      if (exportCategory === 'sales' && item.category !== 'sales') return false;
      if (exportCategory === 'purchases' && item.category !== 'purchases') return false;

      if (exportStartDate && (!item.date || item.date < exportStartDate)) return false;
      if (exportEndDate && (!item.date || item.date > exportEndDate)) return false;

      return true;
    });

    // 2. Aggregate by unique party / company name
    const compMap = new Map<string, {
      companyName: string;
      partyName: string;
      phone: string;
      email: string;
      accountType: 'Debtor (Customer)' | 'Creditor (Vendor)' | 'Dual Party';
      salesBilled: number;
      salesReceived: number;
      salesOutstanding: number; // Receivable (+ve)
      purchasesBilled: number;
      purchasesPaid: number;
      purchasesOutstanding: number; // Payable (-ve)
      netOutstanding: number; // >0 is User to Receive, <0 is User to Pay
      totalDocuments: number;
      pendingDocuments: number;
      overdueDocuments: number;
      settledDocuments: number;
      lastTransactionDate: string;
    }>();

    scopedPayments.forEach((p) => {
      const comp = (p.companyName || p.partyName || (p.category === 'sales' ? 'Customer' : 'Vendor')).trim();
      const key = comp.toLowerCase();

      if (!compMap.has(key)) {
        compMap.set(key, {
          companyName: comp,
          partyName: p.partyName || '',
          phone: p.partyPhone || '',
          email: p.partyEmail || '',
          accountType: p.category === 'sales' ? 'Debtor (Customer)' : 'Creditor (Vendor)',
          salesBilled: 0,
          salesReceived: 0,
          salesOutstanding: 0,
          purchasesBilled: 0,
          purchasesPaid: 0,
          purchasesOutstanding: 0,
          netOutstanding: 0,
          totalDocuments: 0,
          pendingDocuments: 0,
          overdueDocuments: 0,
          settledDocuments: 0,
          lastTransactionDate: p.date || '',
        });
      }

      const entry = compMap.get(key)!;
      entry.totalDocuments += 1;

      if (p.status === 'paid') entry.settledDocuments += 1;
      else if (p.status === 'overdue') entry.overdueDocuments += 1;
      else entry.pendingDocuments += 1;

      if (p.category === 'sales') {
        entry.salesBilled += p.totalAmount;
        entry.salesReceived += p.paidAmount;
        entry.salesOutstanding += p.dueAmount;
      } else {
        entry.purchasesBilled += p.totalAmount;
        entry.purchasesPaid += p.paidAmount;
        entry.purchasesOutstanding += p.dueAmount;
      }

      // Net due (>0: You have to receive / Customer owes, <0: You have to pay / Vendor due)
      entry.netOutstanding = entry.salesOutstanding - entry.purchasesOutstanding;

      if (entry.salesBilled > 0 && entry.purchasesBilled > 0) {
        entry.accountType = 'Dual Party';
      } else if (entry.salesBilled > 0) {
        entry.accountType = 'Debtor (Customer)';
      } else {
        entry.accountType = 'Creditor (Vendor)';
      }

      if (!entry.phone && p.partyPhone) entry.phone = p.partyPhone;
      if (!entry.email && p.partyEmail) entry.email = p.partyEmail;
      if (p.date && p.date > entry.lastTransactionDate) entry.lastTransactionDate = p.date;
    });

    let list = Array.from(compMap.values());

    // 2.5 Filter by Outstanding Scope (Outstanding Only vs All Companies)
    if (exportOutstandingScope === 'outstanding_only') {
      list = list.filter((c) => (c.salesOutstanding > 0 || c.purchasesOutstanding > 0 || c.pendingDocuments > 0 || c.overdueDocuments > 0));
    }

    // 3. Sorting logic
    return list.sort((a, b) => {
      if (exportSortBy === 'amount_desc') {
        return Math.abs(b.netOutstanding || (b.salesOutstanding + b.purchasesOutstanding)) - 
               Math.abs(a.netOutstanding || (a.salesOutstanding + a.purchasesOutstanding));
      }
      if (exportSortBy === 'amount_asc') {
        return Math.abs(a.netOutstanding) - Math.abs(b.netOutstanding);
      }
      if (exportSortBy === 'doc_asc') {
        return a.companyName.localeCompare(b.companyName);
      }
      if (exportSortBy === 'date_asc') {
        return a.lastTransactionDate.localeCompare(b.lastTransactionDate);
      }
      // date_desc (default)
      return b.lastTransactionDate.localeCompare(a.lastTransactionDate);
    });
  }, [payments, exportCategory, exportStartDate, exportEndDate, exportSortBy, exportOutstandingScope]);

  // Filtered itemized records (used if itemized mode is selected)
  const exportMatchingRecords = useMemo(() => {
    return payments.filter((item) => {
      if (exportCategory === 'sales' && item.category !== 'sales') return false;
      if (exportCategory === 'purchases' && item.category !== 'purchases') return false;

      if (exportStartDate && (!item.date || item.date < exportStartDate)) return false;
      if (exportEndDate && (!item.date || item.date > exportEndDate)) return false;

      return true;
    }).sort((a, b) => {
      if (exportSortBy === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (exportSortBy === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (exportSortBy === 'amount_desc') return b.totalAmount - a.totalAmount;
      if (exportSortBy === 'amount_asc') return a.totalAmount - b.totalAmount;
      if (exportSortBy === 'doc_asc') return (a.documentNumber || '').localeCompare(b.documentNumber || '');
      return 0;
    });
  }, [payments, exportCategory, exportStartDate, exportEndDate, exportSortBy]);

  const handleOpenExportModal = () => {
    setExportCategory(activeCategory);
    setExportReportType('company_summary');
    setIsExportModalOpen(true);
  };

  // Track active date preset for instant feedback ('all' | '1_year' | '1_month' | '1_week' | 'custom')
  const [activeDatePreset, setActiveDatePreset] = useState<'all' | '1_year' | '1_month' | '1_week' | 'custom'>('all');

  const setExportDatePreset = (preset: 'all' | '1_year' | '1_month' | '1_week' | 'custom') => {
    setActiveDatePreset(preset);
    const now = new Date();
    
    if (preset === 'all') {
      setExportStartDate('');
      setExportEndDate('');
    } else if (preset === '1_year') {
      const start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      setExportStartDate(start.toISOString().split('T')[0]);
      setExportEndDate(now.toISOString().split('T')[0]);
    } else if (preset === '1_month') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setExportStartDate(start.toISOString().split('T')[0]);
      setExportEndDate(now.toISOString().split('T')[0]);
    } else if (preset === '1_week') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setExportStartDate(start.toISOString().split('T')[0]);
      setExportEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'custom') {
      // Keep existing dates
    }
  };

  const handleExecuteExport = () => {
    if (exportCompanyRecords.length === 0) {
      alert('No records match the selected export criteria.');
      return;
    }

    // Extract user's business / company profile info
    const userCompanyName = (
      profile?.name || 
      profile?.displayName || 
      (typeof window !== 'undefined' && localStorage.getItem(`invoice_maker_profile_${encodeURIComponent(userEmail || '')}`) ? JSON.parse(localStorage.getItem(`invoice_maker_profile_${encodeURIComponent(userEmail || '')}`) || '{}').name : '') ||
      (typeof window !== 'undefined' && localStorage.getItem('invoice_maker_profile') ? JSON.parse(localStorage.getItem('invoice_maker_profile') || '{}').name : '') ||
      'MAK INVOICES'
    ).trim().toUpperCase();

    const userPhone = profile?.phone || profile?.mobile || '';
    const userEmailAddr = profile?.email || userEmail || '';
    const userAddress = profile?.address || '';
    const userGst = (profile?.taxId || (profile as any)?.gstin || '').trim();
    const userPan = profile?.pan || '';

    // Sanitize user company name for file naming
    const sanitizedCompanySlug = userCompanyName
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || 'MakInvoices';

    const timestamp = new Date().toISOString().split('T')[0];
    const baseFilename = `${sanitizedCompanySlug}_Outstanding_Statement_${exportCategory}_${timestamp}`;
    const cols = selectedExportColumns;

    if (exportFormat === 'excel') {
      // 1. EXCEL (.xlsx) COMPANY-WISE DEBTORS & CREDITORS LEDGER WITH CLEAN BORDERED TABLE
      const headers: string[] = ['#'];
      if (cols.companyName) headers.push('Company Name');
      if (cols.partyContact) headers.push('Contact Person');
      if (cols.phone) headers.push('Phone Number');
      if (cols.email) headers.push('Email Address');
      if (cols.accountType) headers.push('Type');
      if (cols.debit) headers.push('Debit (To Receive / Customer Due)');
      if (cols.credit) headers.push('Credit (To Pay / Vendor Due)');
      if (cols.invoiceCounts) {
        headers.push('Total Invoices');
        headers.push('Pending Docs');
        headers.push('Overdue Docs');
      }

      // Build 2D AoA (Array of Arrays)
      const aoaData: any[][] = [
        [userCompanyName], // Row 1: User Company Name
      ];

      // Row 2: User Address (if entered)
      if (userAddress) {
        aoaData.push([userAddress]);
      }

      // Row 3: Contact details (Phone, Email, GSTIN, PAN)
      const detailsList: string[] = [];
      if (userPhone) detailsList.push(`Phone: ${userPhone}`);
      if (userEmailAddr) detailsList.push(`Email: ${userEmailAddr}`);
      if (userGst) detailsList.push(`GSTIN: ${userGst}`);
      if (userPan) detailsList.push(`PAN: ${userPan}`);
      if (detailsList.length > 0) {
        aoaData.push([detailsList.join('   |   ')]);
      }

      // Blank line before Report Heading
      aoaData.push([]);

      // Row: Report Heading
      const catLabel = exportCategory === 'all' 
        ? 'ALL PARTIES (DEBTORS & CREDITORS LEDGER)' 
        : exportCategory === 'sales' 
        ? 'CUSTOMERS ONLY (DEBTORS / RECEIVABLES LEDGER)' 
        : 'VENDORS ONLY (CREDITORS / PAYABLES LEDGER)';
      
      aoaData.push([`OUTSTANDING STATEMENT REPORT - ${catLabel}`]);

      // Row: Metadata scope & Generated timestamp
      const rangeLabel = activeDatePreset === 'all'
        ? 'All Time'
        : activeDatePreset === '1_year'
        ? 'Past 1 Year'
        : activeDatePreset === '1_month'
        ? 'Past 1 Month'
        : activeDatePreset === '1_week'
        ? 'Past 1 Week'
        : (exportStartDate || exportEndDate) 
        ? `${exportStartDate || 'Start'} to ${exportEndDate || 'Present'}`
        : 'All Dates';

      const genDateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      aoaData.push([`Period: ${rangeLabel}   |   Generated On: ${genDateStr}   |   Total Parties: ${exportCompanyRecords.length}`]);

      // Row: Summary financial position
      const totDebtorDue = exportCompanyRecords.reduce((acc, c) => acc + c.salesOutstanding, 0);
      const totCreditorDue = exportCompanyRecords.reduce((acc, c) => acc + c.purchasesOutstanding, 0);
      const netPosition = totDebtorDue - totCreditorDue;
      const currStr = currencySymbol === '₹' ? 'Rs.' : currencySymbol;
      const fmt = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
      aoaData.push([`Total Debit (To Receive): ${currStr} ${fmt(totDebtorDue)}   |   Total Credit (To Pay): ${currStr} ${fmt(totCreditorDue)}   |   Net Balance: ${netPosition >= 0 ? '+' : '-'}${currStr} ${fmt(Math.abs(netPosition))}`]);

      // Blank line before Table Header
      aoaData.push([]);

      // Table Column Headers
      aoaData.push(headers);

      // Data Rows
      exportCompanyRecords.forEach((c, idx) => {
        const rowVals: any[] = [idx + 1];
        if (cols.companyName) rowVals.push(c.companyName || '');
        if (cols.partyContact) rowVals.push(c.partyName || '');
        if (cols.phone) rowVals.push(c.phone || '');
        if (cols.email) rowVals.push(c.email || '');
        if (cols.accountType) rowVals.push(c.accountType);
        if (cols.debit) rowVals.push(c.salesOutstanding);
        if (cols.credit) rowVals.push(c.purchasesOutstanding);
        if (cols.invoiceCounts) {
          rowVals.push(c.totalDocuments);
          rowVals.push(c.pendingDocuments);
          rowVals.push(c.overdueDocuments);
        }
        aoaData.push(rowVals);
      });

      // Total columns count in table
      const totalTableCols = headers.length;
      const lastColIndex = totalTableCols - 1; // 0-indexed

      const worksheet = XLSX.utils.aoa_to_sheet(aoaData);

      // 1. Merges for top headers across entire table width
      const merges: XLSX.Range[] = [];
      let rIdx = 0;
      // Row 0: Company Name
      merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: lastColIndex } });
      rIdx++;

      // Row 1: Address (if present)
      if (userAddress) {
        merges.push({ s: { r: rIdx, c: 0 }, e: { r: rIdx, c: lastColIndex } });
        rIdx++;
      }

      // Row 2: Contact Details (if present)
      if (detailsList.length > 0) {
        merges.push({ s: { r: rIdx, c: 0 }, e: { r: rIdx, c: lastColIndex } });
        rIdx++;
      }

      // Blank line
      rIdx++;

      // Report Heading
      const reportHeadingRowIndex = rIdx;
      merges.push({ s: { r: rIdx, c: 0 }, e: { r: rIdx, c: lastColIndex } });
      rIdx++;

      // Metadata Scope
      merges.push({ s: { r: rIdx, c: 0 }, e: { r: rIdx, c: lastColIndex } });
      rIdx++;

      // Financial Totals
      merges.push({ s: { r: rIdx, c: 0 }, e: { r: rIdx, c: lastColIndex } });
      rIdx++;

      // Blank line before Table
      rIdx++;

      // Table Header Row Index
      const tableHeaderRowIndex = rIdx;
      const totalDataRows = exportCompanyRecords.length;
      const tableEndRowIndex = tableHeaderRowIndex + totalDataRows;

      worksheet['!merges'] = merges;

      // 2. Set Row Heights (Spacious & Clean)
      const rowHeights: { hpt: number }[] = [];
      rowHeights[0] = { hpt: 24 }; // Company Name
      if (userAddress) rowHeights[1] = { hpt: 18 };
      rowHeights[reportHeadingRowIndex] = { hpt: 20 }; // Report Heading
      rowHeights[tableHeaderRowIndex] = { hpt: 22 }; // Table Header
      for (let r = tableHeaderRowIndex + 1; r <= tableEndRowIndex; r++) {
        rowHeights[r] = { hpt: 20 };
      }
      worksheet['!rows'] = rowHeights;

      // 3. Spacious Column Widths so EVERYTHING is fully visible without truncated text
      const colWidths: { wch: number }[] = [{ wch: 8 }];
      if (cols.companyName) colWidths.push({ wch: 45 }); // Generous width for long company names
      if (cols.partyContact) colWidths.push({ wch: 28 });
      if (cols.phone) colWidths.push({ wch: 22 });
      if (cols.email) colWidths.push({ wch: 32 });
      if (cols.accountType) colWidths.push({ wch: 24 });
      if (cols.debit) colWidths.push({ wch: 35 });
      if (cols.credit) colWidths.push({ wch: 35 });
      if (cols.invoiceCounts) {
        colWidths.push({ wch: 18 });
        colWidths.push({ wch: 16 });
        colWidths.push({ wch: 16 });
      }
      worksheet['!cols'] = colWidths;

      // Populate missing cells in merged top rows and entire table bounds so borders and alignment apply cleanly
      for (let r = 0; r <= tableEndRowIndex; r++) {
        for (let c = 0; c <= lastColIndex; c++) {
          const cellRef = XLSX.utils.encode_cell({ r, c });
          if (!worksheet[cellRef]) {
            worksheet[cellRef] = { t: 's', v: '' };
          }
        }
      }

      // 4. Standard clean borders (Classic black/slate lines, no bright fills)
      const standardBorder = {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      };

      // Loop through all generated sheet cells to apply clean formatting
      for (let r = 0; r <= tableEndRowIndex; r++) {
        for (let c = 0; c <= lastColIndex; c++) {
          const cellRef = XLSX.utils.encode_cell({ r, c });
          const cell = worksheet[cellRef];
          if (!cell) continue;

          cell.s = cell.s || {};

          // Top Header Rows (Centered within table boundaries, Clean standard text)
          if (r < tableHeaderRowIndex) {
            cell.s.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };

            if (r === 0) {
              // User Company Name (Prominent bold black)
              cell.s.font = { name: 'Calibri', sz: 14, bold: true, color: { rgb: '000000' } };
            } else if (r === reportHeadingRowIndex) {
              // Report Heading (Bold black)
              cell.s.font = { name: 'Calibri', sz: 11, bold: true, color: { rgb: '000000' } };
            } else {
              // Subtitles & metadata
              cell.s.font = { name: 'Calibri', sz: 10, color: { rgb: '333333' } };
            }
          }

          // Normal Table Header Row (Bold Black text, Solid Border, No colorful blue background)
          if (r === tableHeaderRowIndex) {
            cell.s.font = { name: 'Calibri', sz: 10, bold: true, color: { rgb: '000000' } };
            cell.s.fill = { fgColor: { rgb: 'F1F5F9' } }; // Light neutral gray/slate header
            cell.s.alignment = {
              horizontal: c === 0 ? 'center' : (c === 5 || c === 6) ? 'right' : 'left',
              vertical: 'center'
            };
            cell.s.border = standardBorder;
          }

          // Normal Table Data Rows (Regular text, Clean standard borders, No color text)
          if (r > tableHeaderRowIndex && r <= tableEndRowIndex) {
            cell.s.border = standardBorder;
            cell.s.font = { name: 'Calibri', sz: 10, color: { rgb: '000000' } };
            cell.s.alignment = {
              horizontal: c === 0 ? 'center' : (c === 5 || c === 6) ? 'right' : 'left',
              vertical: 'center'
            };
          }
        }
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Outstanding Statement');
      XLSX.writeFile(workbook, `${baseFilename}.xlsx`);
    } else if (exportFormat === 'json') {
      // 2. JSON (.json) COMPANY LEDGER EXPORT (FILTERED PARAMETERS)
      const sanitizedRecords = exportCompanyRecords.map((c) => {
        const item: Record<string, any> = {};
        if (cols.companyName) item.companyName = c.companyName;
        if (cols.partyContact) item.contactPerson = c.partyName;
        if (cols.phone) item.phone = c.phone;
        if (cols.email) item.email = c.email;
        if (cols.accountType) item.type = c.accountType;
        if (cols.debit) item.debit = c.salesOutstanding;
        if (cols.credit) item.credit = c.purchasesOutstanding;
        if (cols.invoiceCounts) {
          item.totalDocuments = c.totalDocuments;
          item.pendingDocuments = c.pendingDocuments;
          item.overdueDocuments = c.overdueDocuments;
        }
        return item;
      });

      const jsonContent = JSON.stringify({
        reportTitle: 'Debtors and Creditors Outstanding Statement',
        exportedAt: new Date().toISOString(),
        categoryScope: exportCategory,
        dateRange: {
          from: exportStartDate || 'All',
          to: exportEndDate || 'All'
        },
        selectedParameters: Object.keys(cols).filter(k => (cols as any)[k]),
        totalCompanies: exportCompanyRecords.length,
        financialTotals: {
          totalDebitReceivable: exportCompanyRecords.reduce((acc, c) => acc + c.salesOutstanding, 0),
          totalCreditPayable: exportCompanyRecords.reduce((acc, c) => acc + c.purchasesOutstanding, 0),
          netPosition: exportCompanyRecords.reduce((acc, c) => acc + c.netOutstanding, 0),
        },
        companies: sanitizedRecords
      }, null, 2);

      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${baseFilename}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (exportFormat === 'csv') {
      // 3. CSV (.csv) COMPANY-WISE OUTSTANDING STATEMENT (DYNAMIC COLUMNS)
      const headers: string[] = ['#'];
      if (cols.companyName) headers.push('Company Name');
      if (cols.partyContact) headers.push('Contact Person');
      if (cols.phone) headers.push('Phone Number');
      if (cols.email) headers.push('Email');
      if (cols.accountType) headers.push('Type');
      if (cols.debit) headers.push('Debit (To Receive)');
      if (cols.credit) headers.push('Credit (To Pay)');
      if (cols.invoiceCounts) {
        headers.push('Total Documents');
        headers.push('Pending Count');
        headers.push('Overdue Count');
      }

      const rows = exportCompanyRecords.map((c, i) => {
        const rowVals: any[] = [i + 1];
        if (cols.companyName) rowVals.push(`"${(c.companyName || '').replace(/"/g, '""')}"`);
        if (cols.partyContact) rowVals.push(`"${(c.partyName || '').replace(/"/g, '""')}"`);
        if (cols.phone) rowVals.push(`"${(c.phone || '').replace(/"/g, '""')}"`);
        if (cols.email) rowVals.push(`"${(c.email || '').replace(/"/g, '""')}"`);
        if (cols.accountType) rowVals.push(`"${c.accountType}"`);
        if (cols.debit) rowVals.push(c.salesOutstanding);
        if (cols.credit) rowVals.push(c.purchasesOutstanding);
        if (cols.invoiceCounts) {
          rowVals.push(c.totalDocuments);
          rowVals.push(c.pendingDocuments);
          rowVals.push(c.overdueDocuments);
        }
        return rowVals;
      });

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${baseFilename}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (exportFormat === 'pdf') {
      // 4. PDF (.pdf) COMPANY-WISE DEBTORS & CREDITORS OUTSTANDING STATEMENT (STANDARD A4 PORTRAIT)
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();   // 210 mm (A4 Portrait)
      const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
      const margin = 10;
      const contentWidth = pageWidth - (margin * 2);        // 190 mm

      // User's business / company name
      const userCompanyName = (
        profile?.name || 
        profile?.displayName || 
        (typeof window !== 'undefined' && localStorage.getItem(`invoice_maker_profile_${encodeURIComponent(userEmail || '')}`) ? JSON.parse(localStorage.getItem(`invoice_maker_profile_${encodeURIComponent(userEmail || '')}`) || '{}').name : '') ||
        (typeof window !== 'undefined' && localStorage.getItem('invoice_maker_profile') ? JSON.parse(localStorage.getItem('invoice_maker_profile') || '{}').name : '') ||
        'MAK INVOICES'
      ).trim().toUpperCase();

      const userGst = (profile?.taxId || (profile as any)?.gstin || '').trim();

      // Top Brand Header Banner (Executive Deep Navy with Cyan Accent)
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 24, 'F');
      
      // Bottom accent bar
      doc.setFillColor(2, 132, 199); // sky-600
      doc.rect(0, 24, pageWidth, 1.2, 'F');

      // 1. User Company Name (Prominent on top)
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(userCompanyName, margin, 11);

      // 2. Subtitle / Report Title & Details
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(224, 242, 254); // sky-100
      const subTitleTxt = userGst ? `OUTSTANDING STATEMENT (DEBTORS & CREDITORS)  •  GSTIN: ${userGst}` : 'OUTSTANDING STATEMENT (DEBTORS & CREDITORS)';
      doc.text(subTitleTxt, margin, 19);

      // 3. Generated Date / Time Stamp on Right
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(186, 230, 253);
      const genDateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      doc.text(`Generated: ${genDateStr}`, pageWidth - margin, 11, { align: 'right' });
      doc.setTextColor(148, 163, 184);
      doc.text(`Powered by MakInvoices`, pageWidth - margin, 19, { align: 'right' });

      // KPI / Metric Summary Bar
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, 28, contentWidth, 16, 2, 2, 'FD');

      const catLabel = exportCategory === 'all' 
        ? 'All Parties (Debtors & Creditors)' 
        : exportCategory === 'sales' 
        ? 'Customers Only (Debtors / Receivables)' 
        : 'Vendors Only (Creditors / Payables)';
      
      const rangeLabel = activeDatePreset === 'all'
        ? 'All Time'
        : activeDatePreset === '1_year'
        ? 'Past 1 Year'
        : activeDatePreset === '1_month'
        ? 'Past 1 Month'
        : activeDatePreset === '1_week'
        ? 'Past 1 Week'
        : (exportStartDate || exportEndDate) 
        ? `${exportStartDate || 'Start'} to ${exportEndDate || 'Present'}`
        : 'All Dates';

      doc.setTextColor(51, 65, 85);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`Scope: `, margin + 3, 34);
      doc.setFont('helvetica', 'normal');
      doc.text(`${catLabel}  |  Range: ${rangeLabel}  |  Total: ${exportCompanyRecords.length} parties`, margin + 13, 34);

      // Financial totals with larger numbers
      const totDebtorDue = exportCompanyRecords.reduce((a, b) => a + b.salesOutstanding, 0);
      const totCreditorDue = exportCompanyRecords.reduce((a, b) => a + b.purchasesOutstanding, 0);
      const netPosition = totDebtorDue - totCreditorDue;

      const currStr = currencySymbol === '₹' ? 'Rs.' : currencySymbol;
      const fmt = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      const summaryTotalsTxt = `Debit: ${currStr} ${fmt(totDebtorDue)}  |  Credit: ${currStr} ${fmt(totCreditorDue)}  |  Net: ${netPosition >= 0 ? '+' : '-'}${currStr} ${fmt(Math.abs(netPosition))}`;
      doc.text(summaryTotalsTxt, margin + 3, 40);

      // Dynamic Table columns based on selectedExportColumns (Exact 8 fields for A4 Portrait 190mm)
      interface PdfColDef {
        key: string;
        label: string;
        weight: number; // proportional weight
        align: 'left' | 'right' | 'center';
        getValue: (item: typeof exportCompanyRecords[0], idx: number, availableWidth: number) => { text: string; isBold?: boolean; fontSize?: number; color?: [number, number, number] };
      }

      const availableCols: PdfColDef[] = [
        {
          key: 'index',
          label: '#',
          weight: 6,
          align: 'left',
          getValue: (_, idx) => ({ text: String(idx + 1), fontSize: 9.5, color: [100, 116, 139] })
        },
        ...(cols.companyName ? [{
          key: 'companyName',
          label: 'Company Name',
          weight: 60, // Much more weight allocated so full company name easily fits
          align: 'left' as const,
          getValue: (item: typeof exportCompanyRecords[0]) => {
            return { text: item.companyName || '-', isBold: true, fontSize: 9.5, color: [15, 23, 42] as [number, number, number] };
          }
        }] : []),
        ...(cols.partyContact ? [{
          key: 'partyContact',
          label: 'Contact Person',
          weight: 24,
          align: 'left' as const,
          getValue: (item: typeof exportCompanyRecords[0]) => {
            return { text: item.partyName || '-', fontSize: 9.0, color: [71, 85, 105] as [number, number, number] };
          }
        }] : []),
        ...(cols.phone ? [{
          key: 'phone',
          label: 'Phone Number',
          weight: 22,
          align: 'left' as const,
          getValue: (item: typeof exportCompanyRecords[0]) => {
            return { text: item.phone || '-', fontSize: 9.0, color: [71, 85, 105] as [number, number, number] };
          }
        }] : []),
        ...(cols.email ? [{
          key: 'email',
          label: 'Email',
          weight: 26,
          align: 'left' as const,
          getValue: (item: typeof exportCompanyRecords[0]) => {
            return { text: item.email || '-', fontSize: 8.5, color: [71, 85, 105] as [number, number, number] };
          }
        }] : []),
        ...(cols.accountType ? [{
          key: 'accountType',
          label: 'Type',
          weight: 14, // Compact to fit "Debtor" / "Creditor" / "Dual" snugly without wasting space
          align: 'left' as const,
          getValue: (item: typeof exportCompanyRecords[0]) => {
            if (item.accountType === 'Debtor (Customer)') {
              return { text: 'Debtor', isBold: true, fontSize: 9.5, color: [16, 185, 129] as [number, number, number] };
            }
            if (item.accountType === 'Creditor (Vendor)') {
              return { text: 'Creditor', isBold: true, fontSize: 9.5, color: [37, 99, 235] as [number, number, number] };
            }
            return { text: 'Dual', isBold: true, fontSize: 9.5, color: [147, 51, 234] as [number, number, number] };
          }
        }] : []),
        ...(cols.debit ? [{
          key: 'debit',
          label: 'Debit (+)',
          weight: 24,
          align: 'right' as const,
          getValue: (item: typeof exportCompanyRecords[0]) => {
            if (item.salesOutstanding > 0) {
              return { text: `+${fmt(item.salesOutstanding)}`, isBold: true, fontSize: 10.5, color: [16, 185, 129] as [number, number, number] };
            }
            return { text: '-', fontSize: 9.5, color: [148, 163, 184] as [number, number, number] };
          }
        }] : []),
        ...(cols.credit ? [{
          key: 'credit',
          label: 'Credit (-)',
          weight: 24,
          align: 'right' as const,
          getValue: (item: typeof exportCompanyRecords[0]) => {
            if (item.purchasesOutstanding > 0) {
              return { text: `-${fmt(item.purchasesOutstanding)}`, isBold: true, fontSize: 10.5, color: [225, 29, 72] as [number, number, number] };
            }
            return { text: '-', fontSize: 9.5, color: [148, 163, 184] as [number, number, number] };
          }
        }] : []),
        ...(cols.invoiceCounts ? [{
          key: 'invoiceCounts',
          label: 'Invoices',
          weight: 18,
          align: 'center' as const,
          getValue: (item: typeof exportCompanyRecords[0]) => ({
            text: `${item.totalDocuments} (${item.pendingDocuments}P/${item.overdueDocuments}O)`,
            fontSize: 9.0,
            color: [71, 85, 105] as [number, number, number]
          })
        }] : [])
      ];

      // Scale column widths to perfectly match contentWidth (190 mm in Portrait)
      const totalWeight = availableCols.reduce((acc, c) => acc + c.weight, 0);
      let runningX = margin;
      const pdfCols = availableCols.map((c) => {
        const colW = (c.weight / totalWeight) * contentWidth;
        const colObj = {
          ...c,
          width: colW,
          startX: runningX,
          x: c.align === 'right' ? runningX + colW - 2.0 : c.align === 'center' ? runningX + (colW / 2) : runningX + 2.0
        };
        runningX += colW;
        return colObj;
      });

      let currentY = 49;
      const headerHeight = 9.0;
      const rowHeight = 9.0; // Generous height for larger numbers & text
      let tablePageTopY = currentY;

      const drawTableHeader = (topY: number) => {
        // Header background
        doc.setFillColor(241, 245, 249); // slate-100
        doc.rect(margin, topY, contentWidth, headerHeight, 'F');

        // Header bottom border
        doc.setDrawColor(148, 163, 184); // slate-400
        doc.setLineWidth(0.35);
        doc.line(margin, topY + headerHeight, margin + contentWidth, topY + headerHeight);

        // Header vertical dividers
        pdfCols.forEach((col, idx) => {
          if (idx > 0) {
            doc.line(col.startX, topY, col.startX, topY + headerHeight);
          }
        });

        // Header text
        doc.setTextColor(15, 23, 42); // slate-900
        doc.setFontSize(9.5); // Enhanced header font size
        doc.setFont('helvetica', 'bold');

        const textY = topY + 6.0;
        pdfCols.forEach((col) => {
          doc.text(col.label, col.x, textY, { align: col.align });
        });
      };

      drawTableHeader(currentY);
      currentY += headerHeight;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);

      exportCompanyRecords.forEach((item, idx) => {
        if (currentY + rowHeight > pageHeight - 16) {
          // Draw outer border & vertical grid lines for the completed table on this page
          const pageTableHeight = currentY - tablePageTopY;
          doc.setDrawColor(148, 163, 184);
          doc.setLineWidth(0.35);
          doc.rect(margin, tablePageTopY, contentWidth, pageTableHeight, 'S');

          // Draw full vertical column lines for the whole table block on this page
          pdfCols.forEach((col, cIdx) => {
            if (cIdx > 0) {
              doc.line(col.startX, tablePageTopY, col.startX, currentY);
            }
          });

          // Move to next page
          doc.addPage();
          currentY = 16;
          tablePageTopY = currentY;
          drawTableHeader(currentY);
          currentY += headerHeight;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.5);
        }

        const rowTopY = currentY;
        const rowBottomY = currentY + rowHeight;
        const textY = currentY + 5.8; // Centered baseline for 9mm row

        // Alternating row background
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, rowTopY, contentWidth, rowHeight, 'F');
        }

        // Horizontal bottom row divider line
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.2);
        doc.line(margin, rowBottomY, margin + contentWidth, rowBottomY);

        // Row text content
        pdfCols.forEach((col) => {
          const valObj = col.getValue(item, idx, col.width);
          let targetFontSize = valObj.fontSize || 9.5;
          doc.setFont('helvetica', valObj.isBold ? 'bold' : 'normal');
          doc.setFontSize(targetFontSize);

          if (valObj.color) {
            doc.setTextColor(valObj.color[0], valObj.color[1], valObj.color[2]);
          } else {
            doc.setTextColor(15, 23, 42);
          }

          // Dynamically calculate text width and auto-scale font size if text exceeds cell bounds
          const maxAllowedWidth = col.width - 4.0;
          let textWidth = doc.getTextWidth(valObj.text);
          if (textWidth > maxAllowedWidth && maxAllowedWidth > 5) {
            const scaledSize = Math.max(7.2, targetFontSize * (maxAllowedWidth / textWidth));
            doc.setFontSize(scaledSize);
          }

          doc.text(valObj.text, col.x, textY, { align: col.align });
        });

        currentY += rowHeight;
      });

      // Draw final outer border and vertical dividers on the last page
      const lastPageTableHeight = currentY - tablePageTopY;
      doc.setDrawColor(148, 163, 184); // slate-400
      doc.setLineWidth(0.35);
      doc.rect(margin, tablePageTopY, contentWidth, lastPageTableHeight, 'S');

      pdfCols.forEach((col, cIdx) => {
        if (cIdx > 0) {
          doc.line(col.startX, tablePageTopY, col.startX, currentY);
        }
      });

      // Footer Page Numbers
      const totalPagesExp = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPagesExp; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`${userCompanyName} • Financial & Settlement Ledger • Page ${i} of ${totalPagesExp}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
      }

      doc.save(`${baseFilename}.pdf`);
    }

    setIsExportModalOpen(false);
  };

  return (
    <div className="space-y-4 text-sans animate-in fade-in duration-300 w-full">
      {/* Header */}
      {/* Top Header */}
      <div>
        <h1
          className="text-xl sm:text-2xl font-black uppercase tracking-tight flex items-center gap-2"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          <span className="bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-emerald-500 bg-clip-text text-transparent">
            Payments & Settlements
          </span>
          <span className="w-2 h-2 rounded-full bg-[#0284c7] dark:bg-[#38bdf8] shrink-0" />
        </h1>
        <p className="text-[11px] sm:text-xs text-[#64748b]/90 dark:text-zinc-400 mt-0.5 font-medium">
          Unified settlements management for Sales Tax Invoices (Inflows) and Purchase Bills (Outflows)
        </p>
      </div>

      {/* Category Toggle Tabs & Export CSV Options Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Toggle Tabs */}
        <div className="order-2 sm:order-1 flex items-center gap-1.5 p-1 bg-[#e0f2fe]/50 dark:bg-[#0b1329]/80 rounded-2xl border border-[#bae6fd]/60 dark:border-[#223269]/60 w-full sm:w-auto">
          <button
            onClick={() => {
              if (activeCategory !== 'sales') {
                setActiveCategory('sales');
                setSelectedParty(null);
                setPartySearchTerm('');
                setCurrentPage(1);
              }
            }}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 py-2 px-3.5 sm:px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
              activeCategory === 'sales'
                ? 'bg-white dark:bg-[#1e293b] text-[#0284c7] dark:text-[#38bdf8] shadow-md shadow-sky-500/10 border border-[#bae6fd]/80 dark:border-sky-500/30'
                : 'text-[#64748b] dark:text-zinc-400 hover:text-[#0f172a] dark:hover:text-white'
            }`}
          >
            <ArrowDownRight className={`w-3.5 h-3.5 ${activeCategory === 'sales' ? 'text-emerald-500' : ''}`} />
            <span>Sales Payments</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
              activeCategory === 'sales' ? 'bg-[#0284c7] text-white' : 'bg-black/5 dark:bg-white/10 text-[#64748b]'
            }`}>
              {stats.salesCount}
            </span>
          </button>

          <button
            onClick={() => {
              if (activeCategory !== 'purchases') {
                setActiveCategory('purchases');
                setSelectedParty(null);
                setPartySearchTerm('');
                setCurrentPage(1);
              }
            }}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 py-2 px-3.5 sm:px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
              activeCategory === 'purchases'
                ? 'bg-white dark:bg-[#1e293b] text-blue-600 dark:text-blue-400 shadow-md shadow-blue-500/10 border border-blue-200 dark:border-blue-500/30'
                : 'text-[#64748b] dark:text-zinc-400 hover:text-[#0f172a] dark:hover:text-white'
            }`}
          >
            <ArrowUpRight className={`w-3.5 h-3.5 ${activeCategory === 'purchases' ? 'text-blue-500' : ''}`} />
            <span>Purchase Payments</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
              activeCategory === 'purchases' ? 'bg-blue-600 text-white' : 'bg-black/5 dark:bg-white/10 text-[#64748b]'
            }`}>
              {stats.purchasesCount}
            </span>
          </button>
        </div>

        {/* Export Options Button beside Tabs */}
        <div className="order-1 sm:order-2 flex items-center gap-2 shrink-0">
          <button
            onClick={handleOpenExportModal}
            title="Export Payment Records (Excel, PDF, CSV, JSON)"
            className="w-full sm:w-auto h-10 px-4.5 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#2563eb] hover:from-[#0369a1] hover:to-[#1d4ed8] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:shadow-[#0284c7]/25 active:scale-98 transition-all cursor-pointer group shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-white/90 group-hover:-translate-y-0.5 transition-transform duration-200" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* KPI OVERVIEW METRIC CARDS (2x2 on Mobile, 4 columns on Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: Total Billed */}
        <div className="bg-white dark:bg-[#111a36] border-l-4 border-l-[#0284c7] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl p-3.5 sm:p-5 shadow-xs relative flex flex-col justify-between min-h-[115px] sm:min-h-[135px]">
          <div className="flex justify-between items-start gap-1">
            <div className="w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-full bg-sky-50 text-[#0284c7] dark:bg-sky-900/30 dark:text-[#38bdf8] border border-[#bae6fd] dark:border-sky-800/60 flex items-center justify-center shrink-0">
              <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-black text-[#0284c7] bg-sky-50 dark:bg-sky-900/30 dark:text-[#38bdf8] border border-[#bae6fd] dark:border-sky-800/60 px-1.5 sm:px-2 py-0.5 rounded-full font-mono truncate">
              {activeCategory === 'sales' ? `${stats.salesCount} INVOICES` : `${stats.purchasesCount} BILLS`}
            </span>
          </div>
          <div className="mt-2 sm:mt-3">
            <span className="text-[8.5px] sm:text-[9px] uppercase font-black tracking-wider text-[#64748b]/80 dark:text-[#94a3b8]/80 block truncate">
              {activeCategory === 'sales' ? 'Total Sales Billed' : 'Total Purchases Billed'}
            </span>
            <span className="text-base sm:text-xl font-black text-[#0f172a] dark:text-white mt-0.5 sm:mt-1 block font-mono truncate">
              {currencySymbol}{formatAmount(activeCategory === 'sales' ? stats.totalSalesBilled : stats.totalPurchasesBilled)}
            </span>
            <span className="text-[7.5px] sm:text-[8px] text-[#64748b]/60 dark:text-[#94a3b8]/60 mt-0.5 block truncate">
              {activeCategory === 'sales' ? 'Gross Outbound Billing' : 'Gross Vendor Inbound Billing'}
            </span>
          </div>
        </div>

        {/* Card 2: Settled / Paid */}
        <div className="bg-white dark:bg-[#111a36] border-l-4 border-l-emerald-500 border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl p-3.5 sm:p-5 shadow-xs relative flex flex-col justify-between min-h-[115px] sm:min-h-[135px]">
          <div className="flex justify-between items-start gap-1">
            <div className="w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 px-1.5 sm:px-2 py-0.5 rounded-full font-mono truncate">
              {activeCategory === 'sales' ? `${stats.salesPaidCount} SETTLED` : `${stats.purchasesPaidCount} SETTLED`}
            </span>
          </div>
          <div className="mt-2 sm:mt-3">
            <span className="text-[8.5px] sm:text-[9px] uppercase font-black tracking-wider text-[#64748b]/80 dark:text-[#94a3b8]/80 block truncate">
              {activeCategory === 'sales' ? 'Total Received (Inflow)' : 'Total Paid Out (Outflow)'}
            </span>
            <span className="text-base sm:text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 block font-mono truncate">
              {currencySymbol}{formatAmount(activeCategory === 'sales' ? stats.totalSalesReceived : stats.totalPurchasesPaid)}
            </span>
            <span className="text-[7.5px] sm:text-[8px] text-[#64748b]/60 dark:text-[#94a3b8]/60 mt-0.5 block truncate">
              {activeCategory === 'sales' ? 'Realized Client Cash' : 'Settled Supplier Dues'}
            </span>
          </div>
        </div>

        {/* Card 3: Pending Dues */}
        <div className="bg-white dark:bg-[#111a36] border-l-4 border-l-amber-500 border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl p-3.5 sm:p-5 shadow-xs relative flex flex-col justify-between min-h-[115px] sm:min-h-[135px]">
          <div className="flex justify-between items-start gap-1">
            <div className="w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-black text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 px-1.5 sm:px-2 py-0.5 rounded-full font-mono truncate">
              {activeCategory === 'sales' ? `${stats.salesPendingCount} PENDING` : `${stats.purchasesPendingCount} PENDING`}
            </span>
          </div>
          <div className="mt-2 sm:mt-3">
            <span className="text-[8.5px] sm:text-[9px] uppercase font-black tracking-wider text-[#64748b]/80 dark:text-[#94a3b8]/80 block truncate">
              {activeCategory === 'sales' ? 'Pending Receivables' : 'Pending Payables'}
            </span>
            <span className="text-base sm:text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5 sm:mt-1 block font-mono truncate">
              {currencySymbol}{formatAmount(activeCategory === 'sales' ? stats.totalSalesPending : stats.totalPurchasesPending)}
            </span>
            <span className="text-[7.5px] sm:text-[8px] text-[#64748b]/60 dark:text-[#94a3b8]/60 mt-0.5 block truncate">
              {activeCategory === 'sales' ? 'Awaiting Customer Remittance' : 'Upcoming Vendor Commitments'}
            </span>
          </div>
        </div>

        {/* Card 4: Overdue Attention */}
        <div className="bg-white dark:bg-[#111a36] border-l-4 border-l-rose-500 border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl p-3.5 sm:p-5 shadow-xs relative flex flex-col justify-between min-h-[115px] sm:min-h-[135px]">
          <div className="flex justify-between items-start gap-1">
            <div className="w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center shrink-0">
              <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-black text-rose-600 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 px-1.5 sm:px-2 py-0.5 rounded-full font-mono truncate">
              OVERDUE
            </span>
          </div>
          <div className="mt-2 sm:mt-3">
            <span className="text-[8.5px] sm:text-[9px] uppercase font-black tracking-wider text-[#64748b]/80 dark:text-[#94a3b8]/80 block truncate">
              Past Due Date Amount
            </span>
            <span className="text-base sm:text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5 sm:mt-1 block font-mono truncate">
              {currencySymbol}{formatAmount(activeCategory === 'sales' ? stats.totalSalesOverdue : stats.totalPurchasesOverdue)}
            </span>
            <span className="text-[7.5px] sm:text-[8px] text-[#64748b]/60 dark:text-[#94a3b8]/60 mt-0.5 block truncate">
              Requires Immediate Follow-up
            </span>
          </div>
        </div>
      </div>

      {/* TWO-COLUMN LAYOUT: LEFT = PARTY COLLECTIVE BALANCES, RIGHT = DETAILED REPORTS & TABLE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT PANEL: COMPANY / PARTY BALANCES (+N RECEIVABLE / -N PAYABLE) */}
        <div className="lg:col-span-4 xl:col-span-3 bg-white dark:bg-[#111a36] border border-[#bae6fd]/80 dark:border-[#223269]/80 rounded-2xl shadow-xs flex flex-col justify-between overflow-hidden h-[420px] sm:h-[480px] lg:h-[880px]">
          
          {/* Top Fixed Area: Title, Search, and Master "All Clients / Vendors" Card */}
          <div className="p-3.5 space-y-2.5 shrink-0 border-b border-[#bae6fd]/30 dark:border-[#223269]/30">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#bae6fd]/40 dark:border-[#223269]/40">
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-[#0f172a] dark:text-white flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#0284c7] dark:text-[#38bdf8]" />
                  <span>{activeCategory === 'sales' ? 'Clients Outstanding' : 'Vendors Outstanding'}</span>
                </h2>
                <span className="text-[10px] text-[#64748b] dark:text-zinc-400 block mt-0.5 font-medium">
                  {activeCategory === 'sales' ? 'Receivables (+to receive)' : 'Payables (-to pay)'}
                </span>
              </div>

              {selectedParty && (
                <button
                  onClick={() => {
                    setSelectedParty(null);
                    setCurrentPage(1);
                  }}
                  className="text-[10px] font-bold text-[#0284c7] hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <XCircle className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Party Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
              <input
                type="text"
                placeholder={`Filter ${activeCategory === 'sales' ? 'clients' : 'vendors'}...`}
                value={partySearchTerm}
                onChange={(e) => setPartySearchTerm(e.target.value)}
                className="w-full pl-8.5 pr-3 py-1.5 bg-[#f8fafc] dark:bg-[#0b1329] border border-[#bae6fd] dark:border-[#223269] rounded-xl text-xs text-[#0f172a] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0284c7] transition-all"
              />
            </div>

            {/* Fixed Master "All Clients / Vendors" Record Box on Top */}
            <button
              onClick={() => {
                setSelectedParty(null);
                setCurrentPage(1);
              }}
              className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between shrink-0 ${
                selectedParty === null
                  ? 'bg-gradient-to-r from-sky-50 to-blue-50 dark:from-[#132554] dark:to-[#1e293b] border-[#0284c7] dark:border-[#38bdf8] ring-1 ring-[#0284c7] shadow-xs'
                  : 'bg-[#f8fafc] dark:bg-[#0b1329]/50 border-[#bae6fd]/40 dark:border-[#223269]/40 hover:border-[#0284c7]/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  selectedParty === null ? 'bg-[#0284c7] text-white' : 'bg-black/5 dark:bg-white/5 text-[#64748b]'
                }`}>
                  <Users2 className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <span className="text-xs font-black text-[#0f172a] dark:text-white block truncate">
                    All {activeCategory === 'sales' ? 'Clients' : 'Vendors'}
                  </span>
                  <span className="text-[10px] text-[#64748b] dark:text-zinc-400 block font-medium">
                    {filteredParties.length} active registered
                  </span>
                </div>
              </div>

              <div className="text-right font-mono shrink-0 ml-2">
                <span className={`text-xs font-black ${
                  activeCategory === 'sales' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {activeCategory === 'sales' ? '+' : '-'}{currencySymbol}{formatAmount(activeCategory === 'sales' ? stats.totalSalesPending : stats.totalPurchasesPending)}
                </span>
                <span className="text-[9px] text-[#64748b] block font-sans">Total Due</span>
              </div>
            </button>
          </div>

          {/* Scrollable Individual Companies List - Vertically Scrollable Full List in Compact Rows */}
          <div className="p-2 space-y-1.5 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
            {filteredParties.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#64748b] dark:text-zinc-400 font-medium">
                No matching companies found.
              </div>
            ) : (
              filteredParties.map((party) => {
                const isSelected = selectedParty?.toLowerCase() === party.companyName.toLowerCase() ||
                                   selectedParty?.toLowerCase() === party.partyName.toLowerCase();
                const dueVal = activeCategory === 'sales' ? party.salesDue : party.purchasesDue;
                const isZeroDue = dueVal <= 0.001;
                const hasSeparatePartyName = party.partyName && party.partyName.trim().toLowerCase() !== party.companyName.trim().toLowerCase();

                return (
                  <button
                    key={`${party.companyName}_${party.partyName}`}
                    onClick={() => {
                      setSelectedParty(isSelected ? null : party.companyName);
                      setCurrentPage(1);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 shrink-0 ${
                      isSelected
                        ? 'bg-sky-50/90 dark:bg-[#132554] border-[#0284c7] dark:border-[#38bdf8] ring-1 ring-[#0284c7] shadow-xs'
                        : 'bg-white dark:bg-[#0b1329] border-[#bae6fd]/40 dark:border-[#223269]/40 hover:border-[#0284c7]/50 hover:bg-[#f8fafc] dark:hover:bg-[#121c3d]'
                    }`}
                  >
                    {/* Left details: Company name & party/phone on single line */}
                    <div className="truncate flex-1 min-w-0">
                      <span className="text-xs font-bold text-[#0f172a] dark:text-white block truncate" title={party.companyName}>
                        {party.companyName}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] text-[#64748b] dark:text-zinc-400 truncate">
                        {hasSeparatePartyName && (
                          <span className="text-[#0284c7] dark:text-[#38bdf8] font-medium truncate">
                            {party.partyName}
                          </span>
                        )}
                        {hasSeparatePartyName && party.phone && <span>•</span>}
                        {party.phone && (
                          <span className="font-mono truncate">
                            {party.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right details: Collective balance tag & amount */}
                    <div className="text-right shrink-0">
                      {isZeroDue ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-block">
                          Settled
                        </span>
                      ) : (
                        <div>
                          <span className={`text-xs font-black font-mono block ${
                            activeCategory === 'sales'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {activeCategory === 'sales' ? `+${currencySymbol}${formatAmount(party.salesDue)}` : `-${currencySymbol}${formatAmount(party.purchasesDue)}`}
                          </span>
                          <span className="text-[8.5px] uppercase font-bold text-[#64748b] dark:text-zinc-400 block font-sans">
                            {activeCategory === 'sales' ? 'To Receive' : 'To Pay'}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Left Panel Bottom Sticky Status Footer */}
          <div className="p-3 px-4 bg-[#f8fafc] dark:bg-[#0b1329]/70 border-t border-[#bae6fd]/40 dark:border-[#223269]/40 flex items-center justify-between text-xs text-[#64748b] dark:text-zinc-400 shrink-0 min-h-[52px]">
            <span className="text-[11px] font-medium">
              {filteredParties.length} total registered
            </span>
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-white dark:bg-[#111a36] text-[#0284c7] dark:text-[#38bdf8] rounded-md border border-[#bae6fd]/60 dark:border-[#223269]/60">
              Scroll for all
            </span>
          </div>
        </div>

        {/* RIGHT PANEL: DETAILED REPORT, SEARCH FILTERS & DETAILED PAYMENT RECORDS */}
        <div className="lg:col-span-8 xl:col-span-9 bg-white dark:bg-[#111a36] border border-[#bae6fd]/80 dark:border-[#223269]/80 rounded-2xl shadow-xs flex flex-col overflow-hidden">
          
          {/* Top Header & Search Filter Toolbar */}
          <div className="p-3 space-y-2 border-b border-[#bae6fd]/40 dark:border-[#223269]/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1 border-b border-[#bae6fd]/30 dark:border-[#223269]/30">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#0f172a] dark:text-white">
                  {selectedParty ? `Filtered by: ${selectedParty}` : `All ${activeCategory === 'sales' ? 'Sales' : 'Purchase'} Records`}
                </span>
                {selectedParty && (
                  <button
                    onClick={() => {
                      setSelectedParty(null);
                      setCurrentPage(1);
                    }}
                    className="p-0.5 rounded-md text-[#64748b] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    title="Clear party filter"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <span className="text-[10.5px] font-mono text-[#64748b] dark:text-zinc-400 font-bold">
                {filteredPayments.length} transactions matched
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {/* Search Box (Full width on mobile/tablet, 1 col on desktop) */}
              <div className="relative col-span-2 md:col-span-3 lg:col-span-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
                <input
                  type="text"
                  placeholder={`Search company, ${activeCategory === 'sales' ? 'client' : 'vendor'}, doc #...`}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8.5 pr-2.5 py-1.5 bg-[#f8fafc] dark:bg-[#0b1329] border border-[#bae6fd] dark:border-[#223269] rounded-xl text-xs text-[#0f172a] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0284c7] transition-all"
                />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-[#f8fafc] dark:bg-[#0b1329] border border-[#bae6fd] dark:border-[#223269] rounded-xl text-xs font-semibold text-[#0f172a] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0284c7]"
                >
                  <option value="All">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="paid">Fully Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>

              {/* Payment Method Filter */}
              <div className="relative">
                <select
                  value={paymentMethodFilter}
                  onChange={(e) => {
                    setPaymentMethodFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-[#f8fafc] dark:bg-[#0b1329] border border-[#bae6fd] dark:border-[#223269] rounded-xl text-xs font-semibold text-[#0f172a] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0284c7]"
                >
                  <option value="All">All Payment Modes</option>
                  <option value="upi">UPI / QR</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card</option>
                </select>
              </div>

              {/* Month Filter */}
              <div className="relative">
                <select
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-[#f8fafc] dark:bg-[#0b1329] border border-[#bae6fd] dark:border-[#223269] rounded-xl text-xs font-semibold text-[#0f172a] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0284c7]"
                >
                  <option value="All">All Months</option>
                  {monthOptions.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Sort By Filter */}
              <div className="relative">
                <select
                  value={`${sortBy}_${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('_') as [typeof sortBy, typeof sortOrder];
                    setSortBy(field);
                    setSortOrder(order);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-[#f8fafc] dark:bg-[#0b1329] border border-[#bae6fd] dark:border-[#223269] rounded-xl text-xs font-semibold text-[#0f172a] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0284c7]"
                >
                  <option value="date_desc">Sort: Date (Newest)</option>
                  <option value="date_asc">Sort: Date (Oldest)</option>
                  <option value="docNumber_asc">Sort: Doc No. (A to Z / Low to High)</option>
                  <option value="docNumber_desc">Sort: Doc No. (Z to A / High to Low)</option>
                  <option value="amount_desc">Sort: Amount (High to Low)</option>
                  <option value="amount_asc">Sort: Amount (Low to High)</option>
                  <option value="due_desc">Sort: Due (High to Low)</option>
                  <option value="due_asc">Sort: Due (Low to High)</option>
                  <option value="party_asc">Sort: Party (A to Z)</option>
                  <option value="party_desc">Sort: Party (Z to A)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table Container */}
          {filteredPayments.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-sky-50 dark:bg-[#0b1329] text-[#0284c7] dark:text-[#38bdf8] mx-auto flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-[#0f172a] dark:text-white">
                No {activeCategory === 'sales' ? 'Sales' : 'Purchase'} Payment Records Found
              </p>
              <p className="text-xs text-[#64748b] dark:text-zinc-400 max-w-md mx-auto">
                {selectedParty 
                  ? `No matching records found for ${selectedParty} under current filters.`
                  : 'Whenever you create an invoice, purchase bill, or expense, a payment record is automatically registered here ready to be settled.'}
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto lg:overflow-x-visible custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse table-fixed min-w-[680px] lg:min-w-0">
                <colgroup>
                  <col className="w-[14%]" />
                  <col className="w-[20%]" />
                  <col className="w-[13%]" />
                  <col className="w-[11%]" />
                  <col className="w-[10%]" />
                  <col className="w-[11%]" />
                  <col className="w-[10%]" />
                  <col className="w-[11%]" />
                </colgroup>
                <thead>
                  <tr className="text-[10px] font-black uppercase text-[#64748b]/80 dark:text-zinc-400 tracking-wider border-b border-[#bae6fd]/30 dark:border-[#223269]/30 bg-[#f4f9ff]/60 dark:bg-[#0b1329]/40 h-10">
                    <th
                      onClick={() => toggleSort('docNumber')}
                      className="px-3 font-black truncate cursor-pointer select-none hover:text-[#0284c7] dark:hover:text-[#38bdf8] transition-colors"
                      title="Sort by Document Number"
                    >
                      <div className="flex items-center gap-1">
                        <span>DOCUMENT</span>
                        {sortBy === 'docNumber' && (
                          <span className="text-[11px] text-[#0284c7] dark:text-[#38bdf8] font-black">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort('party')}
                      className="px-3 font-black truncate cursor-pointer select-none hover:text-[#0284c7] dark:hover:text-[#38bdf8] transition-colors"
                      title="Sort by Company / Party Name"
                    >
                      <div className="flex items-center gap-1">
                        <span>{activeCategory === 'sales' ? 'COMPANY / CLIENT' : 'COMPANY / VENDOR'}</span>
                        {sortBy === 'party' && (
                          <span className="text-[11px] text-[#0284c7] dark:text-[#38bdf8] font-black">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort('date')}
                      className="px-2 font-black truncate cursor-pointer select-none hover:text-[#0284c7] dark:hover:text-[#38bdf8] transition-colors"
                      title="Sort by Date"
                    >
                      <div className="flex items-center gap-1">
                        <span>DATE & DUE</span>
                        {sortBy === 'date' && (
                          <span className="text-[11px] text-[#0284c7] dark:text-[#38bdf8] font-black">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort('amount')}
                      className="px-2 font-black truncate cursor-pointer select-none hover:text-[#0284c7] dark:hover:text-[#38bdf8] transition-colors"
                      title="Sort by Total Amount"
                    >
                      <div className="flex items-center gap-1">
                        <span>TOTAL</span>
                        {sortBy === 'amount' && (
                          <span className="text-[11px] text-[#0284c7] dark:text-[#38bdf8] font-black">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-2 font-black truncate">PAID</th>
                    <th
                      onClick={() => toggleSort('due')}
                      className="px-2 font-black truncate cursor-pointer select-none hover:text-[#0284c7] dark:hover:text-[#38bdf8] transition-colors"
                      title="Sort by Due Balance"
                    >
                      <div className="flex items-center gap-1">
                        <span>DUE BALANCE</span>
                        {sortBy === 'due' && (
                          <span className="text-[11px] text-[#0284c7] dark:text-[#38bdf8] font-black">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-2 font-black text-center">STATUS</th>
                    <th className="px-3 text-right font-black">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#bae6fd]/20 dark:divide-[#223269]/20">
                  {paginatedPayments.map((p, pIdx) => {
                    const isFullyPaid = p.status === 'paid';
                    const isOverdue = p.status === 'overdue';
                    const isPartial = p.status === 'partially_paid';
                    const hasDistinctParty = p.partyName && p.partyName.trim().toLowerCase() !== (p.companyName || '').trim().toLowerCase();

                    return (
                      <tr
                        key={`payment-${p.id || pIdx}-${pIdx}`}
                        className="hover:bg-[#e0f2fe]/20 dark:hover:bg-[#1b264f]/20 transition-colors group h-12"
                      >
                        {/* Document info */}
                        <td className="px-3 py-1.5 align-middle">
                          <span className="font-mono font-black text-[11px] text-[#0f172a] dark:text-white block truncate" title={p.documentNumber}>
                            {p.documentNumber}
                          </span>
                          <span className="text-[9px] uppercase font-bold text-[#64748b] dark:text-zinc-400 block truncate">
                            {p.documentType.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Company Main & Party Secondary */}
                        <td className="px-3 py-1.5 align-middle">
                          <span className="font-bold text-xs text-[#0f172a] dark:text-white block truncate" title={p.companyName || p.partyName}>
                            {p.companyName || p.partyName}
                          </span>
                          <span className="text-[10px] text-[#64748b] dark:text-zinc-400 block font-medium truncate" title={hasDistinctParty ? p.partyName : (p.partyPhone || '')}>
                            {hasDistinctParty ? p.partyName : (p.partyPhone || '—')}
                          </span>
                        </td>

                        {/* Date & Due Date */}
                        <td className="px-2 py-1.5 align-middle font-mono text-[10.5px]">
                          <span className="text-[#0f172a] dark:text-white block font-semibold truncate">
                            {p.date}
                          </span>
                          <span className={`text-[9.5px] block truncate ${isOverdue ? 'text-rose-600 font-bold' : 'text-[#64748b]'}`} title={p.dueDate ? `Due: ${p.dueDate}` : ''}>
                            {p.dueDate ? `Due: ${p.dueDate}` : '—'}
                          </span>
                        </td>

                        {/* Total */}
                        <td className="px-2 py-1.5 align-middle font-mono font-black text-[11.5px] text-[#0f172a] dark:text-white truncate">
                          {currencySymbol}{formatAmount(p.totalAmount)}
                        </td>

                        {/* Paid */}
                        <td className="px-2 py-1.5 align-middle font-mono font-bold text-[11.5px] text-emerald-600 dark:text-emerald-400 truncate">
                          {currencySymbol}{formatAmount(p.paidAmount)}
                        </td>

                        {/* Due */}
                        <td className="px-2 py-1.5 align-middle font-mono font-black text-[11.5px] truncate">
                          <span className={p.dueAmount > 0 ? (isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400') : 'text-emerald-600 dark:text-emerald-400'}>
                            {activeCategory === 'sales' ? '+' : '-'}{currencySymbol}{formatAmount(p.dueAmount)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-2 py-1.5 align-middle text-center">
                          {isFullyPaid && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-block whitespace-nowrap">
                              Paid
                            </span>
                          )}
                          {isPartial && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800 inline-block whitespace-nowrap">
                              {Math.round((p.paidAmount / (p.totalAmount || 1)) * 100)}%
                            </span>
                          )}
                          {p.status === 'pending' && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 inline-block whitespace-nowrap">
                              Pending
                            </span>
                          )}
                          {isOverdue && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 inline-block whitespace-nowrap">
                              Overdue
                            </span>
                          )}
                        </td>

                        {/* Settlement Action Button */}
                        <td className="px-3 py-1.5 align-middle text-right">
                          {isFullyPaid ? (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 inline-flex items-center justify-end gap-1 whitespace-nowrap">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>Settled</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleOpenSettle(p)}
                              className="px-2.5 py-1 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-lg text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ml-auto shadow-xs transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
                            >
                              <CreditCard className="w-3 h-3 shrink-0" />
                              <span>Settle</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINATION / FOOTER BAR */}
          <div className="p-3.5 px-4 border-t border-[#bae6fd]/30 dark:border-[#223269]/30 bg-[#f8fafc] dark:bg-[#0b1329]/70 flex flex-col sm:flex-row items-center justify-between gap-3 min-h-[52px]">
            <span className="text-xs text-[#64748b] dark:text-zinc-400 font-medium">
              Showing {filteredPayments.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredPayments.length)} of{' '}
              {filteredPayments.length} entries
            </span>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-[#bae6fd] dark:border-[#223269] text-xs font-bold text-[#0f172a] dark:text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  title="Previous page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <span className="text-xs font-bold font-mono px-2.5 py-0.5 bg-white dark:bg-[#111a36] text-[#0284c7] dark:text-[#38bdf8] rounded-lg border border-[#bae6fd]/60 dark:border-[#223269]/60">
                  {currentPage} / {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-[#bae6fd] dark:border-[#223269] text-xs font-bold text-[#0f172a] dark:text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  title="Next page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settle Payment Modal */}
      <SettlePaymentModal
        isOpen={isSettleModalOpen}
        onClose={() => setIsSettleModalOpen(false)}
        payment={settlingPayment}
        currencySymbol={currencySymbol}
        onSettle={settlePayment}
      />

      {/* Modern Export Options Modal rendered through Portal directly on body */}
      {isExportModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999999] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999999 }}
          onClick={() => setIsExportModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-[#111a36] border-t sm:border border-[#bae6fd]/80 dark:border-[#223269]/80 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-in zoom-in-95 duration-150 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[#bae6fd]/40 dark:border-[#223269]/40 bg-[#f4f9ff]/80 dark:bg-[#0b1329]/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-[#0284c7] dark:bg-sky-950/60 dark:text-[#38bdf8] flex items-center justify-center border border-[#bae6fd] dark:border-[#223269] shrink-0">
                  <Download className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-[#0f172a] dark:text-white tracking-tight">
                    Export Payments Data
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium line-clamp-1">
                    Filter by date, category & sort before downloading
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-[#e0f2fe]/60 dark:hover:bg-[#1b264f] transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3.5 sm:p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 bg-white dark:bg-[#111a36]">
              {/* 1. Category Selection */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 block mb-2">
                  1. Select Category / Type
                </label>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setExportCategory('all')}
                    className={`py-2 px-1.5 sm:px-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                      exportCategory === 'all'
                        ? 'bg-[#0284c7] text-white border-[#0284c7] shadow-sm'
                        : 'bg-[#f4f9ff]/50 dark:bg-[#0b1329]/50 border-[#bae6fd]/70 dark:border-[#223269]/70 text-slate-700 dark:text-slate-300 hover:border-[#0284c7]'
                    }`}
                  >
                    <span className="whitespace-nowrap">Both (All)</span>
                    <span className="text-[10px] opacity-80 font-mono font-normal">
                      {payments.length} items
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportCategory('sales')}
                    className={`py-2 px-1.5 sm:px-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                      exportCategory === 'sales'
                        ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                        : 'bg-[#f4f9ff]/50 dark:bg-[#0b1329]/50 border-[#bae6fd]/70 dark:border-[#223269]/70 text-slate-700 dark:text-slate-300 hover:border-[#0284c7]'
                    }`}
                  >
                    <span className="whitespace-nowrap">Sales Only</span>
                    <span className="text-[10px] opacity-80 font-mono font-normal">
                      {stats.salesCount} items
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportCategory('purchases')}
                    className={`py-2 px-1.5 sm:px-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                      exportCategory === 'purchases'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-[#f4f9ff]/50 dark:bg-[#0b1329]/50 border-[#bae6fd]/70 dark:border-[#223269]/70 text-slate-700 dark:text-slate-300 hover:border-indigo-500'
                    }`}
                  >
                    <span className="whitespace-nowrap">Purchases Only</span>
                    <span className="text-[10px] opacity-80 font-mono font-normal">
                      {stats.purchasesCount} items
                    </span>
                  </button>
                </div>
              </div>

              {/* Outstanding Scope: Only Outstanding vs All (Settled + Outstanding) */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 block mb-2">
                  2. Settlement Status Scope
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExportOutstandingScope('outstanding_only')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      exportOutstandingScope === 'outstanding_only'
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-500 ring-1 ring-rose-500/40 shadow-xs'
                        : 'bg-[#f4f9ff]/50 dark:bg-[#0b1329]/50 border-[#bae6fd]/70 dark:border-[#223269]/70 text-slate-700 dark:text-slate-300 hover:border-rose-400'
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    <span>Only Outstanding Dues</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportOutstandingScope('all')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      exportOutstandingScope === 'all'
                        ? 'bg-sky-50 dark:bg-sky-950/40 text-[#0284c7] dark:text-[#38bdf8] border-[#0284c7] dark:border-[#38bdf8] ring-1 ring-[#0284c7]/40 shadow-xs'
                        : 'bg-[#f4f9ff]/50 dark:bg-[#0b1329]/50 border-[#bae6fd]/70 dark:border-[#223269]/70 text-slate-700 dark:text-slate-300 hover:border-[#0284c7]'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0284c7] dark:text-[#38bdf8]" />
                    <span>All (Settled & Outstanding)</span>
                  </button>
                </div>
              </div>

              {/* 3. Date Range Filter & Quick Presets */}
              <div>
                <div className="flex flex-col gap-1.5 mb-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      3. Date Range
                    </label>
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono font-medium">
                      {activeDatePreset === 'all'
                        ? 'All available records'
                        : activeDatePreset === '1_year'
                        ? 'Past 365 days'
                        : activeDatePreset === '1_month'
                        ? 'Past 30 days'
                        : activeDatePreset === '1_week'
                        ? 'Past 7 days'
                        : 'Custom dates'}
                    </span>
                  </div>

                  {/* Preset Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] no-scrollbar">
                    <button
                      type="button"
                      onClick={() => setExportDatePreset('all')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer shrink-0 ${
                        activeDatePreset === 'all'
                          ? 'bg-[#0284c7] text-white shadow-xs'
                          : 'bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd]/70 dark:border-[#223269]/70 text-slate-700 dark:text-slate-300 hover:bg-[#0284c7]/15 hover:text-[#0284c7]'
                      }`}
                    >
                      All Time
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportDatePreset('1_year')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer shrink-0 ${
                        activeDatePreset === '1_year'
                          ? 'bg-[#0284c7] text-white shadow-xs'
                          : 'bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd]/70 dark:border-[#223269]/70 text-slate-700 dark:text-slate-300 hover:bg-[#0284c7]/15 hover:text-[#0284c7]'
                      }`}
                    >
                      1 Year
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportDatePreset('1_month')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer shrink-0 ${
                        activeDatePreset === '1_month'
                          ? 'bg-[#0284c7] text-white shadow-xs'
                          : 'bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd]/70 dark:border-[#223269]/70 text-slate-700 dark:text-slate-300 hover:bg-[#0284c7]/15 hover:text-[#0284c7]'
                      }`}
                    >
                      1 Month
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportDatePreset('1_week')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer shrink-0 ${
                        activeDatePreset === '1_week'
                          ? 'bg-[#0284c7] text-white shadow-xs'
                          : 'bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd]/70 dark:border-[#223269]/70 text-slate-700 dark:text-slate-300 hover:bg-[#0284c7]/15 hover:text-[#0284c7]'
                      }`}
                    >
                      1 Week
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportDatePreset('custom')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer shrink-0 ${
                        activeDatePreset === 'custom'
                          ? 'bg-[#0284c7] text-white shadow-xs'
                          : 'bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd]/70 dark:border-[#223269]/70 text-slate-700 dark:text-slate-300 hover:bg-[#0284c7]/15 hover:text-[#0284c7]'
                      }`}
                    >
                      Custom Range
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 block mb-1">
                      From Date
                    </span>
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="date"
                        value={exportStartDate}
                        onChange={(e) => {
                          setExportStartDate(e.target.value);
                          setActiveDatePreset('custom');
                        }}
                        className="w-full pl-8.5 pr-2.5 py-1.5 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd] dark:border-[#223269] rounded-xl text-xs font-semibold text-[#0f172a] dark:text-white focus:outline-none focus:border-[#0284c7]"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 block mb-1">
                      To Date
                    </span>
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="date"
                        value={exportEndDate}
                        onChange={(e) => {
                          setExportEndDate(e.target.value);
                          setActiveDatePreset('custom');
                        }}
                        className="w-full pl-8.5 pr-2.5 py-1.5 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd] dark:border-[#223269] rounded-xl text-xs font-semibold text-[#0f172a] dark:text-white focus:outline-none focus:border-[#0284c7]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Sorting Options */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 block mb-2">
                  4. Sort Companies By
                </label>
                <div className="relative">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={exportSortBy}
                    onChange={(e) => setExportSortBy(e.target.value as any)}
                    className="w-full pl-8.5 pr-3 py-2 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd] dark:border-[#223269] rounded-xl text-xs font-semibold text-[#0f172a] dark:text-white focus:outline-none focus:border-[#0284c7] cursor-pointer"
                  >
                    <option className="bg-white text-[#0f172a] dark:bg-[#0f172a] dark:text-white" value="amount_desc">Outstanding Balance (Highest first)</option>
                    <option className="bg-white text-[#0f172a] dark:bg-[#0f172a] dark:text-white" value="amount_asc">Outstanding Balance (Lowest first)</option>
                    <option className="bg-white text-[#0f172a] dark:bg-[#0f172a] dark:text-white" value="doc_asc">Company Name (A to Z)</option>
                    <option className="bg-white text-[#0f172a] dark:bg-[#0f172a] dark:text-white" value="date_desc">Latest Activity (Recent first)</option>
                    <option className="bg-white text-[#0f172a] dark:bg-[#0f172a] dark:text-white" value="date_asc">Oldest Activity first</option>
                  </select>
                </div>
              </div>

              {/* 5. Parameter / Column Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    5. Select Parameters / Fields
                  </label>
                  <span className="text-[10px] text-[#0284c7] dark:text-[#38bdf8] font-mono font-bold">
                    {Object.values(selectedExportColumns).filter(Boolean).length} / {Object.keys(selectedExportColumns).length} Active
                  </span>
                </div>

                {/* Preset Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 mb-2 text-[10px] no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setExportPresetColumns('all')}
                    className="px-2.5 py-1 rounded-lg bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd] dark:border-[#223269] text-slate-700 dark:text-slate-300 font-bold hover:bg-[#0284c7]/15 hover:text-[#0284c7] transition-all cursor-pointer shrink-0"
                  >
                    All Parameters
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportPresetColumns('financial')}
                    className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-800 text-[#0284c7] dark:text-[#38bdf8] font-bold hover:bg-sky-100 transition-all cursor-pointer shrink-0"
                  >
                    Financial Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportPresetColumns('contact')}
                    className="px-2.5 py-1 rounded-lg bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd] dark:border-[#223269] text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 transition-all cursor-pointer shrink-0"
                  >
                    Contact Info
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportPresetColumns('compact')}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 font-bold hover:bg-indigo-100 transition-all cursor-pointer shrink-0"
                  >
                    Summary (Compact)
                  </button>
                </div>

                {/* 8 Parameter Buttons Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                  {/* 1. Company Name */}
                  <button
                    type="button"
                    onClick={() => toggleExportColumn('companyName')}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      selectedExportColumns.companyName
                        ? 'bg-sky-50 dark:bg-sky-950/50 border-[#0284c7] dark:border-[#38bdf8] text-[#0284c7] dark:text-[#38bdf8] font-bold shadow-2xs ring-1 ring-[#0284c7]'
                        : 'bg-[#f4f9ff]/50 dark:bg-[#0b1329]/50 border-[#bae6fd]/70 dark:border-[#223269]/70 text-slate-600 dark:text-slate-400 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span className="text-[11px] truncate font-semibold">Company Name</span>
                    <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] shrink-0 ${
                      selectedExportColumns.companyName ? 'bg-[#0284c7] text-white' : 'border border-[#bae6fd] dark:border-[#223269]'
                    }`}>
                      {selectedExportColumns.companyName ? '✓' : ''}
                    </span>
                  </button>

                  {/* 2. Contact Person */}
                  <button
                    type="button"
                    onClick={() => toggleExportColumn('partyContact')}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      selectedExportColumns.partyContact
                        ? 'bg-sky-50 dark:bg-sky-950/50 border-[#0284c7] dark:border-[#38bdf8] text-[#0284c7] dark:text-[#38bdf8] font-bold shadow-2xs ring-1 ring-[#0284c7]'
                        : 'bg-[#f4f9ff]/50 dark:bg-[#0b1329]/50 border-[#bae6fd]/70 dark:border-[#223269]/70 text-slate-600 dark:text-slate-400 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span className="text-[11px] truncate font-semibold">Contact Person</span>
                    <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] shrink-0 ${
                      selectedExportColumns.partyContact ? 'bg-[#0284c7] text-white' : 'border border-[#bae6fd] dark:border-[#223269]'
                    }`}>
                      {selectedExportColumns.partyContact ? '✓' : ''}
                    </span>
                  </button>

                  {/* 3. Phone */}
                  <button
                    type="button"
                    onClick={() => toggleExportColumn('phone')}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      selectedExportColumns.phone
                        ? 'bg-sky-50 dark:bg-sky-950/50 border-[#0284c7] dark:border-[#38bdf8] text-[#0284c7] dark:text-[#38bdf8] font-bold shadow-2xs ring-1 ring-[#0284c7]'
                        : 'bg-[#f4f9ff]/50 dark:bg-[#0b1329]/50 border-[#bae6fd]/70 dark:border-[#223269]/70 text-slate-600 dark:text-slate-400 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span className="text-[11px] truncate font-semibold">Phone Number</span>
                    <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] shrink-0 ${
                      selectedExportColumns.phone ? 'bg-[#0284c7] text-white' : 'border border-[#bae6fd] dark:border-[#223269]'
                    }`}>
                      {selectedExportColumns.phone ? '✓' : ''}
                    </span>
                  </button>

                  {/* 4. Email */}
                  <button
                    type="button"
                    onClick={() => toggleExportColumn('email')}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      selectedExportColumns.email
                        ? 'bg-sky-50 dark:bg-sky-950/50 border-[#0284c7] dark:border-[#38bdf8] text-[#0284c7] dark:text-[#38bdf8] font-bold shadow-2xs ring-1 ring-[#0284c7]'
                        : 'bg-[#f4f9ff]/50 dark:bg-[#0b1329]/50 border-[#bae6fd]/70 dark:border-[#223269]/70 text-slate-600 dark:text-slate-400 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span className="text-[11px] truncate font-semibold">Email</span>
                    <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] shrink-0 ${
                      selectedExportColumns.email ? 'bg-[#0284c7] text-white' : 'border border-[#bae6fd] dark:border-[#223269]'
                    }`}>
                      {selectedExportColumns.email ? '✓' : ''}
                    </span>
                  </button>

                  {/* 5. Type */}
                  <button
                    type="button"
                    onClick={() => toggleExportColumn('accountType')}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      selectedExportColumns.accountType
                        ? 'bg-sky-50 dark:bg-sky-950/50 border-[#0284c7] dark:border-[#38bdf8] text-[#0284c7] dark:text-[#38bdf8] font-bold shadow-2xs ring-1 ring-[#0284c7]'
                        : 'bg-[#f4f9ff]/50 dark:bg-[#0b1329]/50 border-[#bae6fd]/70 dark:border-[#223269]/70 text-slate-600 dark:text-slate-400 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span className="text-[11px] truncate font-semibold">Type</span>
                    <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] shrink-0 ${
                      selectedExportColumns.accountType ? 'bg-[#0284c7] text-white' : 'border border-[#bae6fd] dark:border-[#223269]'
                    }`}>
                      {selectedExportColumns.accountType ? '✓' : ''}
                    </span>
                  </button>

                  {/* 6. Debit */}
                  <button
                    type="button"
                    onClick={() => toggleExportColumn('debit')}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      selectedExportColumns.debit
                        ? 'bg-sky-50 dark:bg-sky-950/50 border-[#0284c7] dark:border-[#38bdf8] text-[#0284c7] dark:text-[#38bdf8] font-bold shadow-2xs ring-1 ring-[#0284c7]'
                        : 'bg-[#f4f9ff]/50 dark:bg-[#0b1329]/50 border-[#bae6fd]/70 dark:border-[#223269]/70 text-slate-600 dark:text-slate-400 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span className="text-[11px] truncate font-semibold">Debit</span>
                    <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] shrink-0 ${
                      selectedExportColumns.debit ? 'bg-[#0284c7] text-white' : 'border border-[#bae6fd] dark:border-[#223269]'
                    }`}>
                      {selectedExportColumns.debit ? '✓' : ''}
                    </span>
                  </button>

                  {/* 7. Credit */}
                  <button
                    type="button"
                    onClick={() => toggleExportColumn('credit')}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      selectedExportColumns.credit
                        ? 'bg-sky-50 dark:bg-sky-950/50 border-[#0284c7] dark:border-[#38bdf8] text-[#0284c7] dark:text-[#38bdf8] font-bold shadow-2xs ring-1 ring-[#0284c7]'
                        : 'bg-[#f4f9ff]/50 dark:bg-[#0b1329]/50 border-[#bae6fd]/70 dark:border-[#223269]/70 text-slate-600 dark:text-slate-400 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span className="text-[11px] truncate font-semibold">Credit</span>
                    <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] shrink-0 ${
                      selectedExportColumns.credit ? 'bg-[#0284c7] text-white' : 'border border-[#bae6fd] dark:border-[#223269]'
                    }`}>
                      {selectedExportColumns.credit ? '✓' : ''}
                    </span>
                  </button>

                  {/* 8. Invoice Counts */}
                  <button
                    type="button"
                    onClick={() => toggleExportColumn('invoiceCounts')}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      selectedExportColumns.invoiceCounts
                        ? 'bg-sky-50 dark:bg-sky-950/50 border-[#0284c7] dark:border-[#38bdf8] text-[#0284c7] dark:text-[#38bdf8] font-bold shadow-2xs ring-1 ring-[#0284c7]'
                        : 'bg-[#f4f9ff]/50 dark:bg-[#0b1329]/50 border-[#bae6fd]/70 dark:border-[#223269]/70 text-slate-600 dark:text-slate-400 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span className="text-[11px] truncate font-semibold">Invoice Counts</span>
                    <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] shrink-0 ${
                      selectedExportColumns.invoiceCounts ? 'bg-[#0284c7] text-white' : 'border border-[#bae6fd] dark:border-[#223269]'
                    }`}>
                      {selectedExportColumns.invoiceCounts ? '✓' : ''}
                    </span>
                  </button>
                </div>
              </div>

              {/* 6. Format Selection */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 block mb-2">
                  6. Export Format
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Excel */}
                  <button
                    type="button"
                    onClick={() => setExportFormat('excel')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      exportFormat === 'excel'
                        ? 'bg-sky-50 dark:bg-sky-950/50 border-[#0284c7] text-[#0284c7] dark:text-[#38bdf8] ring-2 ring-[#0284c7]/30 shadow-xs'
                        : 'bg-[#f4f9ff]/50 dark:bg-[#0b1329]/50 border-[#bae6fd]/70 dark:border-[#223269]/70 text-slate-700 dark:text-slate-300 hover:border-[#0284c7]'
                    }`}
                  >
                    <FileSpreadsheet className="w-5 h-5 text-[#0284c7] dark:text-[#38bdf8]" />
                    <span className="text-[11px]">Excel (.xlsx)</span>
                  </button>

                  {/* PDF */}
                  <button
                    type="button"
                    onClick={() => setExportFormat('pdf')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      exportFormat === 'pdf'
                        ? 'bg-sky-50 dark:bg-sky-950/50 border-[#0284c7] text-[#0284c7] dark:text-[#38bdf8] ring-2 ring-[#0284c7]/30 shadow-xs'
                        : 'bg-[#f4f9ff]/50 dark:bg-[#0b1329]/50 border-[#bae6fd]/70 dark:border-[#223269]/70 text-slate-700 dark:text-slate-300 hover:border-[#0284c7]'
                    }`}
                  >
                    <FileText className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    <span className="text-[11px]">PDF (.pdf)</span>
                  </button>

                  {/* JSON */}
                  <button
                    type="button"
                    onClick={() => setExportFormat('json')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      exportFormat === 'json'
                        ? 'bg-sky-50 dark:bg-sky-950/50 border-[#0284c7] text-[#0284c7] dark:text-[#38bdf8] ring-2 ring-[#0284c7]/30 shadow-xs'
                        : 'bg-[#f4f9ff]/50 dark:bg-[#0b1329]/50 border-[#bae6fd]/70 dark:border-[#223269]/70 text-slate-700 dark:text-slate-300 hover:border-[#0284c7]'
                    }`}
                  >
                    <FileCode className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <span className="text-[11px]">JSON (.json)</span>
                  </button>

                  {/* CSV */}
                  <button
                    type="button"
                    onClick={() => setExportFormat('csv')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      exportFormat === 'csv'
                        ? 'bg-sky-50 dark:bg-sky-950/50 border-[#0284c7] text-[#0284c7] dark:text-[#38bdf8] ring-2 ring-[#0284c7]/30 shadow-xs'
                        : 'bg-[#f4f9ff]/50 dark:bg-[#0b1329]/50 border-[#bae6fd]/70 dark:border-[#223269]/70 text-slate-700 dark:text-slate-300 hover:border-[#0284c7]'
                    }`}
                  >
                    <File className="w-5 h-5 text-[#0284c7] dark:text-[#38bdf8]" />
                    <span className="text-[11px]">CSV (.csv)</span>
                  </button>
                </div>
              </div>

              {/* Summary Stats Banner */}
              <div className="p-3 rounded-2xl bg-[#f4f9ff] dark:bg-[#0b1329]/70 border border-[#bae6fd]/60 dark:border-[#223269]/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 uppercase font-bold block">
                    Companies / Parties
                  </span>
                  <span className="text-sm font-bold text-[#0f172a] dark:text-white">
                    {exportCompanyRecords.length} Parties
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 uppercase font-bold block">
                    Total Outstanding Balance
                  </span>
                  <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                    {currencySymbol}
                    {exportCompanyRecords
                      .reduce((acc, c) => acc + (c.salesOutstanding + c.purchasesOutstanding), 0)
                      .toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-5 border-t border-[#bae6fd]/40 dark:border-[#223269]/40 bg-[#f4f9ff]/80 dark:bg-[#0b1329]/60 flex flex-col sm:flex-row gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleExecuteExport}
                className="w-full py-2.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download {exportFormat.toUpperCase()}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#bae6fd] dark:border-[#223269] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-[#e0f2fe]/50 dark:hover:bg-[#1b264f] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
