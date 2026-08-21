import { jsPDF } from 'jspdf';
import { Invoice, BusinessProfile } from '../types';
import { toPng } from 'html-to-image';
import { createRoot } from 'react-dom/client';
import React from 'react';
import { LivePreview } from '../components/TemplateBuilder/LivePreview';
import { TEMPLATE_PRESETS, getDefaultTemplatePreset } from './templatePresets';
import { emitNotification } from './notifications';


// ─── CURRENCY HELPER ────────────────────────────────────────────────────────
function getCurrencySymbol(code: string): string {
  const map: Record<string, string> = {
    USD: '$', EUR: 'EUR ', GBP: 'GBP ', JPY: 'JPY ', INR: 'Rs.', AUD: 'AUD ', CAD: 'CAD ', IDR: 'Rp '
  };
  return map[code] || '$';
}

// jsPDF Helvetica cannot render ₹ — we use "Rs." which renders cleanly.
// Amount formatter — no locale separators that cause jsPDF to insert 1
function fmt(n: number, sym: string): string {
  const abs = Math.abs(n);
  const formatted = abs.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (n < 0 ? '-' : '') + sym + formatted;
}

// ─── STATUS COLORS ────────────────────────────────────────────────────────────
function statusColors(status: string): { bg: number[]; text: number[] } {
  const s = (status || 'pending').toLowerCase();
  if (s === 'paid') return { bg: [209, 250, 229], text: [6, 95, 70] };
  if (s === 'pending' || s === 'sent') return { bg: [254, 243, 199], text: [146, 64, 14] };
  if (s === 'overdue' || s === 'cancelled') return { bg: [254, 226, 226], text: [153, 27, 27] };
  if (s === 'approved') return { bg: [219, 234, 254], text: [30, 64, 175] };
  return { bg: [241, 245, 249], text: [71, 85, 105] };
}

export function exportCollectiveReportPDF(
  invoices: Invoice[],
  profile: BusinessProfile,
  periodName: string,
  docTypeFilter: string = 'all'
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const sym = getCurrencySymbol(profile.currency || 'INR');
  const W = 210, H = 297;
  const mL = 14, mR = 14;
  const cW = W - mL - mR;

  // Dynamic titles and labels mapping
  const docTitles: Record<string, { topBanner: string; subTitle: string; card1: string; card2: string; card3: string; card4: string; themeRgb: [number, number, number] }> = {
    all: {
      topBanner: 'MASTER ACCOUNTING LEDGER STATEMENT',
      subTitle: 'ALL TRANSACTIONS LEDGER',
      card1: 'TOTAL BILLED', card2: 'COLLECTED', card3: 'OUTSTANDING', card4: 'TAX LIABILITY',
      themeRgb: [2, 132, 199]
    },
    all_sales: {
      topBanner: 'MASTER SALES ACCOUNTING LEDGER REPORT',
      subTitle: 'ALL SALES TRANSACTIONS LEDGER',
      card1: 'TOTAL SALES BILLED', card2: 'COLLECTED REVENUE', card3: 'RECEIVABLE BALANCE', card4: 'OUTPUT GST TAX',
      themeRgb: [2, 132, 199]
    },
    all_purchases: {
      topBanner: 'MASTER PURCHASE ACCOUNTING LEDGER REPORT',
      subTitle: 'ALL PURCHASE TRANSACTIONS LEDGER',
      card1: 'TOTAL PURCHASED', card2: 'PAID OUT TO VENDORS', card3: 'PAYABLE BALANCE', card4: 'INPUT GST CREDIT',
      themeRgb: [99, 102, 241]
    },
    tax_invoice: {
      topBanner: 'TAX INVOICE ACCOUNTING LEDGER STATEMENT',
      subTitle: 'TAX INVOICES STATEMENT',
      card1: 'TOTAL INVOICED', card2: 'COLLECTED REVENUE', card3: 'DUE BALANCE', card4: 'GST OUTPUT TAX',
      themeRgb: [2, 132, 199]
    },
    proforma: {
      topBanner: 'PROFORMA INVOICE ACCOUNTING STATEMENT',
      subTitle: 'PROFORMA INVOICES LEDGER',
      card1: 'TOTAL PROFORMA BILLED', card2: 'ADVANCE COLLECTED', card3: 'OPEN BALANCE', card4: 'ESTIMATED TAX',
      themeRgb: [14, 165, 233]
    },
    receipt: {
      topBanner: 'CASH RECEIPT & VOUCHER STATEMENT',
      subTitle: 'CASH RECEIPTS LEDGER',
      card1: 'TOTAL CASH RECEIVED', card2: 'CLEARED RECEIPTS', card3: 'ZERO BALANCE', card4: 'TAX PORTION',
      themeRgb: [16, 185, 129]
    },
    quote: {
      topBanner: 'QUOTATION & ESTIMATE STATEMENT',
      subTitle: 'QUOTATION LEDGER',
      card1: 'TOTAL QUOTED VALUE', card2: 'CONVERTED ORDERS', card3: 'OPEN QUOTATIONS', card4: 'TAX ESTIMATE',
      themeRgb: [245, 158, 11]
    },
    credit_note: {
      topBanner: 'CREDIT NOTE ACCOUNTING STATEMENT',
      subTitle: 'CREDIT NOTES STATEMENT',
      card1: 'TOTAL CREDIT ISSUED', card2: 'ADJUSTED VALUE', card3: 'REMAINING CREDIT', card4: 'TAX ADJUSTED',
      themeRgb: [225, 29, 72]
    },
    purchase_order: {
      topBanner: 'PURCHASE ORDER STATEMENT REPORT',
      subTitle: 'PURCHASE ORDERS LEDGER',
      card1: 'TOTAL ORDERED', card2: 'FULFILLED PURCHASES', card3: 'OPEN PO BALANCE', card4: 'INPUT TAX ESTIMATE',
      themeRgb: [99, 102, 241]
    },
    purchase_invoice: {
      topBanner: 'PURCHASE INVOICE ACCOUNTING REPORT',
      subTitle: 'PURCHASE INVOICES LEDGER',
      card1: 'TOTAL PURCHASE BILLED', card2: 'PAID TO SUPPLIERS', card3: 'PAYABLE BALANCE', card4: 'INPUT TAX CREDIT',
      themeRgb: [139, 92, 246]
    },
    debit_note: {
      topBanner: 'DEBIT NOTE ACCOUNTING REPORT',
      subTitle: 'DEBIT NOTES STATEMENT',
      card1: 'TOTAL DEBIT ISSUED', card2: 'RECOVERED VALUE', card3: 'REMAINING DEBIT', card4: 'TAX ADJUSTMENT',
      themeRgb: [217, 70, 239]
    }
  };

  const meta = docTitles[docTypeFilter] || docTitles.all;

  doc.setFont('Helvetica', 'normal');

  const hRule = (y: number, thick = 0.2, r = 226, g = 232, b = 240) => {
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(thick);
    doc.line(mL, y, W - mR, y);
  };

  // Header top strip
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 13, 'F');
  doc.setFontSize(7.5); doc.setFont('Helvetica', 'bold'); doc.setTextColor(255, 255, 255);
  doc.text(meta.topBanner, mL, 8.5);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, W - mR, 8.5, { align: 'right' });

  let y = 20;

  // Business Name & Title
  doc.setFontSize(13); doc.setFont('Helvetica', 'bold'); doc.setTextColor(15, 23, 42);
  doc.text(profile.name || 'My Business', mL, y);

  doc.setFontSize(9); doc.setTextColor(meta.themeRgb[0], meta.themeRgb[1], meta.themeRgb[2]);
  doc.text(meta.subTitle, W - mR, y, { align: 'right' });
  y += 4.5;

  // Business Sub-details
  doc.setFontSize(7); doc.setFont('Helvetica', 'normal'); doc.setTextColor(71, 85, 105);
  const busLines = [
    profile.address,
    profile.email && `Email: ${profile.email}`,
    profile.phone && `Phone: ${profile.phone}`,
    profile.taxId && `GSTIN: ${profile.taxId}`,
    (profile as any).pan && `PAN: ${(profile as any).pan}`
  ].filter(Boolean);

  let ly = y;
  busLines.forEach(l => { doc.text(l as string, mL, ly); ly += 3.5; });

  // Right-aligned Metadata Box
  let ry = y;
  doc.setFontSize(7.5); doc.setFont('Helvetica', 'bold'); doc.setTextColor(30, 41, 59);
  doc.text('Period:', W - mR - 55, ry); doc.setFont('Helvetica', 'normal');
  doc.text(periodName.toUpperCase(), W - mR, ry, { align: 'right' }); ry += 4;

  doc.setFont('Helvetica', 'bold'); doc.text('Filter:', W - mR - 55, ry); doc.setFont('Helvetica', 'normal');
  doc.text(docTypeFilter.replace('_', ' ').toUpperCase(), W - mR, ry, { align: 'right' }); ry += 4;

  doc.setFont('Helvetica', 'bold'); doc.text('Records:', W - mR - 55, ry); doc.setFont('Helvetica', 'normal');
  doc.text(`${invoices.length} document(s)`, W - mR, ry, { align: 'right' });

  y = Math.max(ly + 1, ry + 4);
  hRule(y, 0.3, 30, 41, 59); y += 6;

  // Stats cards
  const totalGrand = invoices.reduce((s, i) => s + i.grandTotal, 0);
  const totalPaid = invoices.reduce((s, i) => s + (i.status === 'paid' ? (i.paidAmount ?? i.grandTotal) : (i.paidAmount ?? 0)), 0);
  const totalTax = invoices.reduce((s, i) => s + i.taxTotal, 0);
  const pending = invoices.reduce((s, i) => s + (i.status === 'paid' ? 0 : Math.max(0, i.grandTotal - (i.paidAmount ?? 0))), 0);

  const cards = [
    { label: meta.card1, val: fmt(totalGrand, sym), bg: [240, 246, 255], fg: [37, 99, 235] },
    { label: meta.card2, val: fmt(totalPaid, sym), bg: [240, 253, 250], fg: [13, 148, 136] },
    { label: meta.card3, val: fmt(pending, sym), bg: [254, 243, 199], fg: [146, 64, 14] },
    { label: meta.card4, val: fmt(totalTax, sym), bg: [254, 226, 226], fg: [153, 27, 27] },
  ];
  const cardW = (cW - 9) / 4;
  cards.forEach((c, i) => {
    const cx = mL + i * (cardW + 3);
    doc.setFillColor(c.bg[0], c.bg[1], c.bg[2]);
    doc.roundedRect(cx, y, cardW, 14, 1.5, 1.5, 'F');
    doc.setFontSize(6); doc.setFont('Helvetica', 'bold');
    doc.setTextColor(c.fg[0], c.fg[1], c.fg[2]);
    doc.text(c.label, cx + 3, y + 5);
    doc.setFontSize(8); doc.text(c.val, cx + 3, y + 10.5);
  });
  y += 18; hRule(y); y += 5;

  // Helper to categorize an invoice
  const getDocTypeKey = (inv: Invoice): string => {
    const rawType = (inv.invoiceType || (inv as any).type || 'invoice').toLowerCase();
    const isPurchase = (inv as any).isPurchase || rawType.includes('purchase') || rawType === 'debit_note';
    if (rawType === 'proforma' || rawType === 'proforma_invoice') return 'proforma';
    if (rawType === 'receipt') return 'receipt';
    if (rawType === 'quote' || rawType === 'estimate') return 'quote';
    if (rawType === 'credit_note') return 'credit_note';
    if (rawType === 'purchase_order' || rawType === 'po') return 'purchase_order';
    if (rawType === 'purchase_invoice' || (isPurchase && rawType.includes('invoice'))) return 'purchase_invoice';
    if (rawType === 'debit_note') return 'debit_note';
    return 'tax_invoice';
  };

  const SECTIONS = [
    { key: 'tax_invoice', title: 'TAX INVOICE TRANSACTIONS', subtitle: 'TAX INVOICES', partyHeader: 'CLIENT / BUYER', color: [2, 132, 199] as [number, number, number] },
    { key: 'proforma', title: 'PROFORMA INVOICE TRANSACTIONS', subtitle: 'PROFORMA INVOICES', partyHeader: 'CLIENT / BUYER', color: [14, 165, 233] as [number, number, number] },
    { key: 'receipt', title: 'CASH RECEIPT & VOUCHER TRANSACTIONS', subtitle: 'CASH RECEIPTS', partyHeader: 'CLIENT / PAYER', color: [16, 185, 129] as [number, number, number] },
    { key: 'quote', title: 'QUOTATION & ESTIMATE TRANSACTIONS', subtitle: 'QUOTATIONS / ESTIMATES', partyHeader: 'PROSPECT / CLIENT', color: [245, 158, 11] as [number, number, number] },
    { key: 'credit_note', title: 'CREDIT NOTE ADJUSTMENTS', subtitle: 'CREDIT NOTES', partyHeader: 'CLIENT / PARTY', color: [225, 29, 72] as [number, number, number] },
    { key: 'purchase_order', title: 'PURCHASE ORDER TRANSACTIONS', subtitle: 'PURCHASE ORDERS', partyHeader: 'VENDOR / SUPPLIER', color: [99, 102, 241] as [number, number, number] },
    { key: 'purchase_invoice', title: 'PURCHASE INVOICE TRANSACTIONS', subtitle: 'PURCHASE INVOICES', partyHeader: 'VENDOR / SUPPLIER', color: [139, 92, 246] as [number, number, number] },
    { key: 'debit_note', title: 'DEBIT NOTE ADJUSTMENTS', subtitle: 'DEBIT NOTES', partyHeader: 'VENDOR / SUPPLIER', color: [217, 70, 239] as [number, number, number] },
  ];

  // Group invoices by document type
  const groupedInvoices: Record<string, Invoice[]> = {};
  invoices.forEach(inv => {
    const key = getDocTypeKey(inv);
    if (!groupedInvoices[key]) groupedInvoices[key] = [];
    groupedInvoices[key].push(inv);
  });

  const activeSections = SECTIONS.filter(sec => (groupedInvoices[sec.key] || []).length > 0);
  const cols = { date: mL + 2, inv: mL + 20, client: mL + 45, sub: W - mR - 56, tax: W - mR - 34, grand: W - mR - 13, status: W - mR };

  if (invoices.length === 0 || activeSections.length === 0) {
    doc.setFillColor(241, 245, 249);
    doc.rect(mL, y, cW, 7, 'F');
    doc.setFontSize(6.5); doc.setFont('Helvetica', 'bold'); doc.setTextColor(71, 85, 105);
    doc.text('DATE', cols.date, y + 4.8);
    doc.text('DOC NO', cols.inv, y + 4.8);
    doc.text('PARTY NAME', cols.client, y + 4.8);
    doc.text('SUBTOTAL', cols.sub, y + 4.8, { align: 'right' });
    doc.text('TAX', cols.tax, y + 4.8, { align: 'right' });
    doc.text('TOTAL', cols.grand, y + 4.8, { align: 'right' });
    doc.text('STATUS', cols.status, y + 4.8, { align: 'right' });
    y += 7;

    doc.setFontSize(7.8); doc.setFont('Helvetica', 'normal'); doc.setTextColor(100, 116, 139);
    doc.text('No matching document records found for this period.', mL + 10, y + 6); y += 12;
  } else {
    activeSections.forEach((sec, sIdx) => {
      const items = groupedInvoices[sec.key];
      if (!items || items.length === 0) return;

      if (y > H - 40) {
        doc.addPage(); y = 15;
        doc.setFillColor(15, 23, 42); doc.rect(0, 0, W, 3.5, 'F');
      }

      // --- SECTION SUB-TITLE HEADER BANNER ---
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(mL, y, cW, 8.5, 1, 1, 'F');
      doc.setFillColor(sec.color[0], sec.color[1], sec.color[2]);
      doc.rect(mL, y, 2.5, 8.5, 'F');

      doc.setFontSize(7.8); doc.setFont('Helvetica', 'bold'); doc.setTextColor(sec.color[0], sec.color[1], sec.color[2]);
      doc.text(`SEQUENCE ${sIdx + 1}: ${sec.title}`, mL + 5, y + 5.5);

      doc.setFontSize(6.5); doc.setFont('Helvetica', 'bold'); doc.setTextColor(100, 116, 139);
      doc.text(`${items.length} RECORD(S)`, W - mR - 3, y + 5.5, { align: 'right' });
      y += 10;

      // Table Header for this section
      doc.setFillColor(241, 245, 249);
      doc.rect(mL, y, cW, 6.5, 'F');
      doc.setFontSize(6.2); doc.setFont('Helvetica', 'bold'); doc.setTextColor(71, 85, 105);
      doc.text('DATE', cols.date, y + 4.5);
      doc.text('DOC NO', cols.inv, y + 4.5);
      doc.text(sec.partyHeader, cols.client, y + 4.5);
      doc.text('SUBTOTAL', cols.sub, y + 4.5, { align: 'right' });
      doc.text('TAX', cols.tax, y + 4.5, { align: 'right' });
      doc.text('TOTAL', cols.grand, y + 4.5, { align: 'right' });
      doc.text('STATUS', cols.status, y + 4.5, { align: 'right' });
      y += 6.5;

      let secGrand = 0;
      let secTax = 0;

      items.forEach((inv, i) => {
        if (y > H - 25) {
          doc.addPage(); y = 15;
          doc.setFillColor(15, 23, 42); doc.rect(0, 0, W, 3.5, 'F');

          doc.setFillColor(241, 245, 249);
          doc.rect(mL, y, cW, 6.5, 'F');
          doc.setFontSize(6.2); doc.setFont('Helvetica', 'bold'); doc.setTextColor(71, 85, 105);
          doc.text('DATE', cols.date, y + 4.5);
          doc.text('DOC NO', cols.inv, y + 4.5);
          doc.text(sec.partyHeader, cols.client, y + 4.5);
          doc.text('SUBTOTAL', cols.sub, y + 4.5, { align: 'right' });
          doc.text('TAX', cols.tax, y + 4.5, { align: 'right' });
          doc.text('TOTAL', cols.grand, y + 4.5, { align: 'right' });
          doc.text('STATUS', cols.status, y + 4.5, { align: 'right' });
          y += 6.5;
        }

        if (i % 2 === 1) { doc.setFillColor(252, 253, 254); doc.rect(mL, y, cW, 8.5, 'F'); }

        secGrand += inv.grandTotal;
        secTax += inv.taxTotal;

        doc.setFontSize(7.2); doc.setFont('Helvetica', 'normal'); doc.setTextColor(30, 41, 59);
        doc.text(inv.date, cols.date, y + 5.2);
        doc.text(inv.invoiceNumber, cols.inv, y + 5.2);
        const cn = inv.clientName.length > 22 ? inv.clientName.slice(0, 22) + '…' : inv.clientName;
        doc.text(cn, cols.client, y + 5.2);
        doc.text(fmt(inv.subtotal, sym), cols.sub, y + 5.2, { align: 'right' });
        doc.text(fmt(inv.taxTotal, sym), cols.tax, y + 5.2, { align: 'right' });
        doc.text(fmt(inv.grandTotal, sym), cols.grand, y + 5.2, { align: 'right' });

        const sc = statusColors(inv.status);
        doc.setFont('Helvetica', 'bold'); doc.setTextColor(sc.text[0], sc.text[1], sc.text[2]);

        if (inv.status === 'paid' && inv.paidDate) {
          doc.text('PAID', cols.status, y + 3.8, { align: 'right' });
          doc.setFontSize(5);
          doc.text(`ON ${inv.paidDate}`, cols.status, y + 7, { align: 'right' });
        } else {
          doc.text((inv.status || 'pending').toUpperCase(), cols.status, y + 5.2, { align: 'right' });
        }

        doc.setFont('Helvetica', 'normal');
        y += 8.5;
      });

      // SECTION SUBTOTAL BAR
      if (y > H - 25) { doc.addPage(); y = 15; }
      doc.setFillColor(245, 247, 250);
      doc.rect(mL, y, cW, 7, 'F');
      doc.setFontSize(6.8); doc.setFont('Helvetica', 'bold'); doc.setTextColor(71, 85, 105);
      doc.text(`SUBTOTAL (${sec.subtitle} - ${items.length} Records):`, mL + 4, y + 4.8);
      doc.setTextColor(sec.color[0], sec.color[1], sec.color[2]);
      doc.text(fmt(secGrand, sym), cols.grand, y + 4.8, { align: 'right' });
      doc.setTextColor(71, 85, 105);
      doc.text(fmt(secTax, sym), cols.tax, y + 4.8, { align: 'right' });
      y += 10;
    });
  }

  hRule(y, 0.3, 30, 41, 59); y += 6;

  // GRAND TOTALS ROW
  if (y > H - 30) { doc.addPage(); y = 20; }
  doc.setFillColor(240, 249, 255);
  doc.rect(mL, y, cW, 9, 'F');
  doc.setFontSize(7.8); doc.setFont('Helvetica', 'bold'); doc.setTextColor(2, 132, 199);
  doc.text(`GRAND COMBINED TOTALS (${invoices.length} total records across ${activeSections.length} document categories)`, mL + 3, y + 6);
  doc.text(fmt(totalGrand, sym), cols.grand, y + 6, { align: 'right' });
  doc.setTextColor(30, 41, 59);
  doc.text(fmt(totalTax, sym), cols.tax, y + 6, { align: 'right' });
  y += 15;

  if (y < H - 35) {
    doc.setFillColor(248, 250, 252);
    doc.rect(mL, y, cW, 16, 'F');
    doc.setFontSize(7.2); doc.setFont('Helvetica', 'bold'); doc.setTextColor(30, 41, 59);
    doc.text('GST & AUDIT COMPLIANCE STATEMENT', mL + 3, y + 5);
    doc.setFont('Helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(100, 116, 139);
    doc.text('This statement provides an official accounting ledger breakdown categorized by document sequence. All values include appropriate tax computations (CGST/SGST/IGST) as required by GST tax regulations.', mL + 3, y + 9.5, { maxWidth: cW - 6 });
  }

  const totalPgs = doc.getNumberOfPages();
  for (let p = 1; p <= totalPgs; p++) {
    doc.setPage(p);
    doc.setFillColor(15, 23, 42); doc.rect(0, H - 3.5, W, 3.5, 'F');
    doc.setFontSize(6.8); doc.setFont('Helvetica', 'normal'); doc.setTextColor(148, 163, 184);
    doc.text(`Ledger Statement  |  Page ${p} of ${totalPgs}  |  MakInvoices Enterprise Accounting`, W / 2, H - 6, { align: 'center' });
  }

  doc.save(`Ledger_Report_${docTypeFilter}_${periodName.replace(/\s+/g, '_')}.pdf`);
  emitNotification('Ledger PDF Downloaded', `Ledger statement report (${periodName}) downloaded as PDF.`, 'success');
}

import { InvoiceTemplate } from '../types';

export function resolveTaxMode(invoice: Invoice, profile: BusinessProfile): 'cgst_sgst' | 'igst' | 'generic' {
  const targetState = (invoice.shippedToState || invoice.clientState || '').trim().toLowerCase();
  const targetCountry = (invoice.shippedToCountry || invoice.clientCountry || '').trim().toLowerCase() || 'india';
  const compCountry = (profile.country || invoice.companyCountry || 'india').trim().toLowerCase();
  const compState = (profile.state || invoice.companyState || '').trim().toLowerCase();

  if (targetCountry !== 'india' && targetCountry !== 'in') {
    return 'generic';
  }
  if ((compCountry === 'india' || compCountry === 'in') && targetState === compState && targetState !== '') {
    return 'cgst_sgst';
  }
  return 'igst';
}

export function resolveTemplateForInvoice(invoice: Invoice, templateOverride?: InvoiceTemplate): InvoiceTemplate {
  if (templateOverride) return templateOverride;

  const docType = (invoice?.invoiceType || 'invoice').toLowerCase().trim();

  const defaultDocPresetMap: Record<string, string> = {
    invoice: 'preset_modal_classic',
    proforma: 'preset_makinvoices_proforma',
    debit_note: 'preset_mak_debit_note',
    purchase_debit_note: 'preset_mak_debit_note',
    credit_note: 'preset_makinvoices_credit_note',
    estimate: 'preset_makinvoices_quotation',
    quote: 'preset_makinvoices_quotation',
    purchase_order: 'preset_mak_po',
    purchases: 'preset_mak_purchases'
  };

  const docPresetTypeMap: Record<string, string[]> = {
    proforma: ['preset_makinvoices_proforma'],
    estimate: ['preset_makinvoices_quotation'],
    quote: ['preset_makinvoices_quotation'],
    purchase_order: ['preset_mak_po', 'preset_po_enterprise', 'preset_po_minimal'],
    purchases: ['preset_mak_purchases', 'preset_purchases_vendor_bill', 'preset_purchases_logistics'],
    debit_note: ['preset_mak_debit_note'],
    purchase_debit_note: ['preset_mak_debit_note'],
    credit_note: ['preset_makinvoices_credit_note'],
    invoice: ['preset_modal_classic', 'preset_corporate', 'preset_gst', 'preset_minimal', 'preset_user']
  };

  const isPresetMismatch = (presetId?: string): boolean => {
    if (!presetId || !presetId.startsWith('preset_')) return false;
    const validPresets = docPresetTypeMap[docType];
    if (!validPresets) return false;
    return !validPresets.includes(presetId);
  };

  const applyDocTypeHeaderTitle = (tmpl: InvoiceTemplate): InvoiceTemplate => {
    if (!invoice?.invoiceType) return tmpl;
    const typeMap: Record<string, string> = {
      invoice: 'TAX INVOICE',
      proforma: 'PROFORMA INVOICE',
      credit_note: 'CREDIT NOTE',
      debit_note: 'DEBIT NOTE',
      estimate: 'QUOTATION / ESTIMATE',
      quote: 'QUOTATION / ESTIMATE',
      purchases: 'PURCHASE BILL',
      purchase_order: 'PURCHASE ORDER',
      purchase_debit_note: 'DEBIT NOTE'
    };
    const targetTitle = typeMap[invoice.invoiceType];
    if (targetTitle && tmpl.config?.header) {
      return {
        ...tmpl,
        config: {
          ...tmpl.config,
          header: {
            ...tmpl.config.header,
            invoiceTitle: targetTitle
          }
        }
      };
    }
    return tmpl;
  };

  // Check custom user-created templates first
  const targetId = invoice?.embeddedTemplate?.id || invoice?.selectedCustomTemplateId || invoice?.selectedTemplateStyle;
  if (typeof localStorage !== 'undefined' && targetId && !targetId.startsWith('preset_')) {
    const saved = localStorage.getItem('makbills_custom_templates');
    if (saved) {
      try {
        const templates = JSON.parse(saved);
        const customMatch = templates.find((t: any) => t.id === targetId || t.id.toLowerCase() === targetId.toLowerCase());
        if (customMatch) return applyDocTypeHeaderTitle(customMatch);
      } catch (e) {}
    }
  }

  // If embeddedTemplate exists AND is NOT a preset mismatch from a converted original document, use it
  if (invoice?.embeddedTemplate && !isPresetMismatch(invoice.embeddedTemplate.id)) {
    return applyDocTypeHeaderTitle(invoice.embeddedTemplate);
  }

  if (invoice?.selectedTemplateStyle) {
    const style = invoice.selectedTemplateStyle.trim();
    if (style.startsWith('{')) {
      try {
        const parsed = JSON.parse(style);
        if (parsed && !isPresetMismatch(parsed.id)) {
          return applyDocTypeHeaderTitle(parsed);
        }
      } catch (e) {}
    }
    const preset = TEMPLATE_PRESETS.find(t => t.id === style || t.id.toLowerCase() === style.toLowerCase());
    if (preset && !isPresetMismatch(preset.id)) return preset;
  }

  // Fallback to default preset corresponding to invoiceType
  const defaultPresetId = defaultDocPresetMap[docType] || 'preset_modal_classic';
  const targetPreset = TEMPLATE_PRESETS.find(t => t.id === defaultPresetId) || getDefaultTemplatePreset();
  return applyDocTypeHeaderTitle(targetPreset);
}

export async function exportInvoicePDFAsync(invoice: Invoice, profile: BusinessProfile, action: 'save' | 'datauri' | 'blob' = 'save', templateOverride?: InvoiceTemplate): Promise<string | Blob | void> {
  const activeTemplate: InvoiceTemplate = resolveTemplateForInvoice(invoice, templateOverride);

  // Create a hidden container within viewport bounds to prevent blank captures
  const container = document.createElement('div');
  container.className = 'paper-sheet-light';
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.zIndex = '-9999'; // Hide behind app
  container.style.width = activeTemplate.layout.pageSize === 'A4' ? '794px' : '816px';
  container.style.minHeight = 'auto';
  container.style.backgroundColor = 'white';
  document.body.appendChild(container);

  const currencySymbol = getCurrencySymbol(profile.currency || 'INR');

  // We need to resolve the taxMode and apply it properly to the invoice data
  const taxMode = resolveTaxMode(invoice, profile);
  const tempInvoice = {
    ...invoice,
    selectedCopies: { customer: true } // Force only one copy for initial height measurement
  };
  if (taxMode === 'cgst_sgst' || taxMode === 'igst') {
    tempInvoice.items = tempInvoice.items.map(item => {
      const customTaxes = { ...item.customTaxes };
      if (taxMode === 'cgst_sgst') {
        customTaxes['CGST'] = item.taxPercentage / 2;
        customTaxes['SGST'] = item.taxPercentage / 2;
        delete customTaxes['IGST'];
      } else {
        customTaxes['IGST'] = item.taxPercentage;
        delete customTaxes['CGST'];
        delete customTaxes['SGST'];
      }
      return { ...item, customTaxes };
    });
  }

  const items = tempInvoice.items || [];
  const N = items.length;

  // Single-pass optimization for standard invoices (<= 6 line items)
  const isStandardSinglePage = N <= 6;
  const initialChunks = isStandardSinglePage ? [items] : undefined;

  const root = createRoot(container);

  // Render the template
  root.render(
    React.createElement(LivePreview, {
      template: activeTemplate,
      invoiceData: tempInvoice,
      businessProfile: profile,
      currencySymbol: currencySymbol,
      isInteractive: false,
      isPrintMode: true,
      printPageChunks: initialChunks
    })
  );

  // DOM paint wait for React render & images (200ms)
  await new Promise(r => setTimeout(r, 200));

  try {
    const pageHeight = activeTemplate.layout.pageSize === 'A4' ? 1123 : 1056;

    const footerEl = container.querySelector('#pinned-footer-container') as HTMLElement;
    const footerHeight = footerEl && footerEl.offsetHeight > 50 ? footerEl.offsetHeight : 240;

    const tableEl = container.querySelector('table') as HTMLElement;
    let tableTop = tableEl ? tableEl.getBoundingClientRect().top - container.getBoundingClientRect().top : 450;
    if (tableTop < 100) {
      tableTop = 450;
    }

    const theadEl = container.querySelector('thead') as HTMLElement;
    const tableHeaderHeight = theadEl && theadEl.offsetHeight > 10 ? theadEl.offsetHeight : 35;

    const rows = Array.from(container.querySelectorAll('tbody tr')) as HTMLElement[];
    const rowHeights = rows.map(r => r.offsetHeight > 20 ? r.offsetHeight : 55);

    // Calculate totalsHeight by measuring bottom totals grid
    let totalsHeight = 0;
    const totalsEls = Array.from(container.querySelectorAll('#section-taxEngine, #section-payment, #section-amountInWords')) as HTMLElement[];
    if (totalsEls.length > 0) {
      let minTop = Infinity;
      let maxBottom = 0;
      totalsEls.forEach(el => {
        const rect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const top = rect.top - containerRect.top;
        const bottom = rect.bottom - containerRect.top;
        if (top < minTop) minTop = top;
        if (bottom > maxBottom) maxBottom = bottom;
      });
      if (maxBottom > minTop && (maxBottom - minTop) > 50) {
        totalsHeight = maxBottom - minTop;
      }
    }

    const chunks: any[][] = [];
    const availablePageHeight = pageHeight - footerHeight - 20; // 20px bottom padding
    const page1Budget = availablePageHeight - tableTop - tableHeaderHeight;
    const subsequentPageBudget = page1Budget;

    const totalRowsHeight = rowHeights.reduce((a, b) => a + b, 0);
    const singlePageBudget = page1Budget - totalsHeight;

    // Check if everything fits on a single page
    if (totalRowsHeight <= singlePageBudget || N === 0) {
      chunks.push(items);
    } else {
      // Split items dynamically based on measured row heights
      let currentHeight = 0;
      let idx = 0;
      const p1Items: any[] = [];
      while (idx < N) {
        const isLastItem = (idx === N - 1);
        const requiredBudget = isLastItem ? rowHeights[idx] + totalsHeight : rowHeights[idx];
        if (currentHeight + requiredBudget <= page1Budget) {
          currentHeight += rowHeights[idx];
          p1Items.push(items[idx]);
          idx++;
        } else {
          break;
        }
      }
      if (p1Items.length === 0 && N > 0) {
        currentHeight += rowHeights[0];
        p1Items.push(items[0]);
        idx++;
      }
      chunks.push(p1Items);

      while (idx < N) {
        const pageItems: any[] = [];
        let curHeight = 0;

        let remainingRowsHeight = 0;
        for (let r = idx; r < N; r++) {
          remainingRowsHeight += rowHeights[r];
        }
        if (remainingRowsHeight + totalsHeight <= subsequentPageBudget) {
          chunks.push(items.slice(idx));
          break;
        }

        while (idx < N) {
          const isLastItem = (idx === N - 1);
          const requiredBudget = isLastItem ? rowHeights[idx] + totalsHeight : rowHeights[idx];
          if (curHeight + requiredBudget <= subsequentPageBudget) {
            curHeight += rowHeights[idx];
            pageItems.push(items[idx]);
            idx++;
          } else {
            break;
          }
        }
        if (pageItems.length === 0 && N > 0) {
          curHeight += rowHeights[idx];
          pageItems.push(items[idx]);
          idx++;
        }
        chunks.push(pageItems);
      }
    }

    const effectiveSelectedCopies = (invoice as any)?.selectedCopies || { customer: true, transport: false, supplier: false, challan: false };

    // Re-render with calculated chunks if multi-page split was necessary or non-standard single page
    if (!isStandardSinglePage || chunks.length > 1) {
      root.render(
        React.createElement(LivePreview, {
          template: activeTemplate,
          invoiceData: { ...invoice, items: tempInvoice.items, selectedCopies: effectiveSelectedCopies } as any,
          businessProfile: profile,
          currencySymbol: currencySymbol,
          isInteractive: false,
          isPrintMode: true,
          printPageChunks: chunks
        })
      );

      // DOM re-render paint wait (200ms)
      await new Promise(r => setTimeout(r, 200));
    }

    // Patch CSSStyleSheet to ignore SecurityError from cross-origin stylesheets
    const originalCssRules = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'cssRules');
    if (originalCssRules) {
      Object.defineProperty(CSSStyleSheet.prototype, 'cssRules', {
        get() {
          try {
            return originalCssRules.get?.call(this) || [];
          } catch (e) {
            return [];
          }
        },
        configurable: true
      });
    }

    const pages = Array.from(container.querySelectorAll('.invoice-pdf-page')) as HTMLElement[];

    // Restore original stylesheets
    if (originalCssRules) {
      Object.defineProperty(CSSStyleSheet.prototype, 'cssRules', originalCssRules);
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    if (pages.length > 0) {
      for (let i = 0; i < pages.length; i++) {
        if (i > 0) {
          pdf.addPage();
        }
        const pageDataUrl = await Promise.race([
          toPng(pages[i], {
            quality: 0.9,
            pixelRatio: 1.6,
            skipFonts: true,
            cacheBust: false,
            filter: (node) => !(node instanceof HTMLScriptElement)
          }),
          new Promise<string>((_, reject) => setTimeout(() => reject(new Error('html-to-image timeout')), 10000))
        ]);
        pdf.addImage(pageDataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }
    } else {
      const dataUrl = await Promise.race([
        toPng(container, {
          quality: 0.9,
          pixelRatio: 1.6,
          skipFonts: true,
          cacheBust: false,
          filter: (node) => !(node instanceof HTMLScriptElement)
        }),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('html-to-image timeout')), 10000))
      ]);
      pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    }

    root.unmount();
    if (container.parentNode) {
      document.body.removeChild(container);
    }

    if (action === 'save') {
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoice.invoiceNumber}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      emitNotification('PDF Downloaded', `invoice-${invoice.invoiceNumber}.pdf downloaded successfully.`, 'success');
    } else if (action === 'datauri') {
      return pdf.output('datauristring');
    } else if (action === 'blob') {
      return pdf.output('blob');
    }
  } catch (err) {
    console.error('PDF Generation Failed', err);
    try { root.unmount(); } catch (e) { }
    if (container.parentNode) {
      try { document.body.removeChild(container); } catch (e) { }
    }
    throw err;
  }
}
