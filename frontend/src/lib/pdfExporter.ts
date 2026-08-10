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
  invoices: Invoice[], profile: BusinessProfile, periodName: string
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const sym = getCurrencySymbol(profile.currency || 'INR');
  const W = 210, H = 297;
  const mL = 14, mR = 14;
  const cW = W - mL - mR;

  doc.setFont('Helvetica', 'normal');

  const hRule = (y: number, thick = 0.2, r = 226, g = 232, b = 240) => {
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(thick);
    doc.line(mL, y, W - mR, y);
  };

  // Header bar
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 13, 'F');
  doc.setFontSize(7.5); doc.setFont('Helvetica', 'bold'); doc.setTextColor(255, 255, 255);
  doc.text('BUSINESS LEDGER & FINANCIAL STATEMENT', mL, 8.5);
  doc.text(`Report: ${new Date().toLocaleDateString('en-IN')}`, W - mR, 8.5, { align: 'right' });

  let y = 22;
  doc.setFontSize(14); doc.setFont('Helvetica', 'bold'); doc.setTextColor(15, 23, 42);
  doc.text(profile.name || 'My Business', mL, y);
  doc.setFontSize(9.5); doc.setTextColor(2, 132, 199);
  doc.text('LEDGER STATEMENT', W - mR, y, { align: 'right' });
  y += 5;

  doc.setFontSize(7.2); doc.setFont('Helvetica', 'normal'); doc.setTextColor(71, 85, 105);
  [profile.address, profile.email && `Email: ${profile.email}`, profile.taxId && `GSTIN: ${profile.taxId}`]
    .filter(Boolean).forEach(l => { doc.text(l as string, mL, y); y += 3.7; });

  let ry = 27;
  doc.setFontSize(7.8); doc.setFont('Helvetica', 'bold'); doc.setTextColor(30, 41, 59);
  doc.text('Period:', W - mR - 55, ry); doc.setFont('Helvetica', 'normal');
  doc.text(periodName.toUpperCase(), W - mR, ry, { align: 'right' }); ry += 4.5;
  doc.setFont('Helvetica', 'bold'); doc.text('Records:', W - mR - 55, ry); doc.setFont('Helvetica', 'normal');
  doc.text(`${invoices.length} invoice(s)`, W - mR, ry, { align: 'right' });

  y = Math.max(y + 2, ry + 6);
  hRule(y, 0.3, 30, 41, 59); y += 7;

  // Stats cards
  const totalGrand = invoices.reduce((s, i) => s + i.grandTotal, 0);
  const totalPaid = invoices.reduce((s, i) => s + (i.status === 'paid' ? (i.paidAmount ?? i.grandTotal) : (i.paidAmount ?? 0)), 0);
  const totalTax = invoices.reduce((s, i) => s + i.taxTotal, 0);
  const pending = invoices.reduce((s, i) => s + (i.status === 'paid' ? 0 : Math.max(0, i.grandTotal - (i.paidAmount ?? 0))), 0);

  const cards = [
    { label: 'TOTAL BILLED', val: fmt(totalGrand, sym), bg: [240, 246, 255], fg: [37, 99, 235] },
    { label: 'COLLECTED', val: fmt(totalPaid, sym), bg: [240, 253, 250], fg: [13, 148, 136] },
    { label: 'OUTSTANDING', val: fmt(pending, sym), bg: [254, 243, 199], fg: [146, 64, 14] },
    { label: 'TAX LIABILITY', val: fmt(totalTax, sym), bg: [254, 226, 226], fg: [153, 27, 27] },
  ];
  const cardW = (cW - 9) / 4;
  cards.forEach((c, i) => {
    const cx = mL + i * (cardW + 3);
    doc.setFillColor(c.bg[0], c.bg[1], c.bg[2]);
    doc.roundedRect(cx, y, cardW, 14, 1.5, 1.5, 'F');
    doc.setFontSize(6.2); doc.setFont('Helvetica', 'bold');
    doc.setTextColor(c.fg[0], c.fg[1], c.fg[2]);
    doc.text(c.label, cx + 3, y + 5.5);
    doc.setFontSize(8.2); doc.text(c.val, cx + 3, y + 11);
  });
  y += 20; hRule(y); y += 6;

  // Table header
  doc.setFillColor(241, 245, 249);
  doc.rect(mL, y, cW, 7, 'F');
  doc.setFontSize(6.5); doc.setFont('Helvetica', 'bold'); doc.setTextColor(71, 85, 105);
  const cols = { date: mL + 2, inv: mL + 22, client: mL + 46, sub: W - mR - 56, tax: W - mR - 34, grand: W - mR - 13, status: W - mR };
  doc.text('DATE', cols.date, y + 4.8);
  doc.text('INV NO', cols.inv, y + 4.8);
  doc.text('CLIENT', cols.client, y + 4.8);
  doc.text('SUBTOTAL', cols.sub, y + 4.8, { align: 'right' });
  doc.text('TAX', cols.tax, y + 4.8, { align: 'right' });
  doc.text('TOTAL', cols.grand, y + 4.8, { align: 'right' });
  doc.text('STATUS', cols.status, y + 4.8, { align: 'right' });
  y += 7;

  if (invoices.length === 0) {
    doc.setFontSize(7.8); doc.setFont('Helvetica', 'normal'); doc.setTextColor(100, 116, 139);
    doc.text('No records found for this period.', mL + 10, y + 6); y += 12;
  } else {
    invoices.forEach((inv, i) => {
      if (y > H - 30) {
        doc.addPage(); y = 15;
        doc.setFillColor(15, 23, 42); doc.rect(0, 0, W, 3.5, 'F');
      }
      if (i % 2 === 1) { doc.setFillColor(252, 253, 254); doc.rect(mL, y, cW, 9, 'F'); }

      doc.setFontSize(7.2); doc.setFont('Helvetica', 'normal'); doc.setTextColor(30, 41, 59);
      doc.text(inv.date, cols.date, y + 5.5);
      doc.text(inv.invoiceNumber, cols.inv, y + 5.5);
      const cn = inv.clientName.length > 20 ? inv.clientName.slice(0, 20) + '…' : inv.clientName;
      doc.text(cn, cols.client, y + 5.5);
      doc.text(fmt(inv.subtotal, sym), cols.sub, y + 5.5, { align: 'right' });
      doc.text(fmt(inv.taxTotal, sym), cols.tax, y + 5.5, { align: 'right' });
      doc.text(fmt(inv.grandTotal, sym), cols.grand, y + 5.5, { align: 'right' });

      const sc = statusColors(inv.status);
      doc.setFont('Helvetica', 'bold'); doc.setTextColor(sc.text[0], sc.text[1], sc.text[2]);

      if (inv.status === 'paid' && inv.paidDate) {
        doc.text('PAID', cols.status, y + 4, { align: 'right' });
        doc.setFontSize(5);
        doc.text(`ON ${inv.paidDate}`, cols.status, y + 7.5, { align: 'right' });
      } else {
        doc.text((inv.status || 'pending').toUpperCase(), cols.status, y + 5.5, { align: 'right' });
      }

      doc.setFont('Helvetica', 'normal');
      y += 9;
    });
  }

  hRule(y, 0.3, 30, 41, 59); y += 7;

  // Totals row
  if (y > H - 30) { doc.addPage(); y = 20; }
  doc.setFillColor(240, 249, 255);
  doc.rect(mL, y, cW, 9, 'F');
  doc.setFontSize(7.8); doc.setFont('Helvetica', 'bold'); doc.setTextColor(2, 132, 199);
  doc.text(`TOTALS (${invoices.length} records)`, mL + 3, y + 6);
  doc.text(fmt(totalGrand, sym), cols.grand, y + 6, { align: 'right' });
  doc.setTextColor(30, 41, 59);
  doc.text(fmt(totalTax, sym), cols.tax, y + 6, { align: 'right' });
  y += 16;

  if (y < H - 35) {
    doc.setFillColor(248, 250, 252);
    doc.rect(mL, y, cW, 18, 'F');
    doc.setFontSize(7.5); doc.setFont('Helvetica', 'bold'); doc.setTextColor(30, 41, 59);
    doc.text('GST COMPLIANCE NOTE', mL + 3, y + 6);
    doc.setFont('Helvetica', 'normal'); doc.setFontSize(6.8); doc.setTextColor(100, 116, 139);
    doc.text('This statement summarizes invoices generated for tax reconciliation. Each invoice applies CGST/SGST (intra-state) or IGST (inter-state/export) as per GST rules. Verify all figures against your GSTR-1 filing before submission.', mL + 3, y + 11, { maxWidth: cW - 6 });
  }

  const totalPgs = doc.getNumberOfPages();
  for (let p = 1; p <= totalPgs; p++) {
    doc.setPage(p);
    doc.setFillColor(15, 23, 42); doc.rect(0, H - 3.5, W, 3.5, 'F');
    doc.setFontSize(6.8); doc.setFont('Helvetica', 'normal'); doc.setTextColor(148, 163, 184);
    doc.text(`Ledger Statement  |  Page ${p} of ${totalPgs}  |  MakInvoices`, W / 2, H - 6, { align: 'center' });
  }

  doc.save(`ledger_${periodName.toLowerCase().replace(/\s+/g, '_')}.pdf`);
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

export async function exportInvoicePDFAsync(invoice: Invoice, profile: BusinessProfile, action: 'save' | 'datauri' | 'blob' = 'save', templateOverride?: InvoiceTemplate): Promise<string | Blob | void> {
  // Use the provided template override if available (exact instance from modal = no race condition)
  // Otherwise fall back to the global default from localStorage
  let activeTemplate: InvoiceTemplate = templateOverride || getDefaultTemplatePreset();

  if (!templateOverride) {
    if (invoice.embeddedTemplate) {
      activeTemplate = invoice.embeddedTemplate;
    } else if (!invoice.selectedCustomTemplateId && invoice.selectedTemplateStyle) {
      const style = invoice.selectedTemplateStyle.toLowerCase();
      if (style === 'minimal') activeTemplate = TEMPLATE_PRESETS.find(t => t.id === 'preset_barebones') || TEMPLATE_PRESETS[0];
      else if (style === 'modern') activeTemplate = TEMPLATE_PRESETS.find(t => t.id === 'preset_medical') || TEMPLATE_PRESETS[0];
      else if (style === 'professional') activeTemplate = TEMPLATE_PRESETS.find(t => t.id === 'preset_corporate') || TEMPLATE_PRESETS[0];
      else if (style === 'startup' || style === 'agency') activeTemplate = TEMPLATE_PRESETS.find(t => t.id === 'preset_user') || TEMPLATE_PRESETS[0];
      else if (style === 'enterprise') activeTemplate = TEMPLATE_PRESETS.find(t => t.id === 'preset_gst') || TEMPLATE_PRESETS[0];
    } else {
      const targetTemplateId = invoice.selectedCustomTemplateId || localStorage.getItem('makbills_global_default_template');
      if (targetTemplateId) {
        let foundCustom = false;
        const saved = localStorage.getItem('makbills_custom_templates');
        if (saved) {
          try {
            const templates = JSON.parse(saved);
            const custom = templates.find((t: any) => t.id === targetTemplateId);
            if (custom) {
              activeTemplate = custom;
              foundCustom = true;
            }
          } catch (e) {}
        }
        if (!foundCustom) {
          const preset = TEMPLATE_PRESETS.find(t => t.id === targetTemplateId);
          if (preset) activeTemplate = preset;
        }
      }
    }
  }

  // Create a hidden container within viewport bounds to prevent blank captures
  const container = document.createElement('div');
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

  const root = createRoot(container);

  // Render the template
  root.render(
    React.createElement(LivePreview, {
      template: activeTemplate,
      invoiceData: tempInvoice,
      businessProfile: profile,
      currencySymbol: currencySymbol,
      isInteractive: false,
      isPrintMode: true
    })
  );

  // Wait for React first-render to complete so we can measure DOM elements
  await new Promise(r => setTimeout(r, 1200));

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

    const items = tempInvoice.items || [];
    const N = items.length;
    const chunks: any[][] = [];
    const availablePageHeight = pageHeight - footerHeight - 20; // 20px bottom padding
    const page1Budget = availablePageHeight - tableTop - tableHeaderHeight;
    const subsequentPageBudget = page1Budget; // Headers are now rendered on every page, so budget is same as page 1

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

    // Re-render with calculated chunks and restore original copies selection
    root.render(
      React.createElement(LivePreview, {
        template: activeTemplate,
        invoiceData: { ...invoice, items: tempInvoice.items },
        businessProfile: profile,
        currencySymbol: currencySymbol,
        isInteractive: false,
        isPrintMode: true,
        printPageChunks: chunks
      })
    );

    // Wait for the re-render to apply in DOM
    await new Promise(r => setTimeout(r, 1200));

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
          toPng(pages[i], { quality: 1, pixelRatio: 2, skipFonts: true, cacheBust: false }),
          new Promise<string>((_, reject) => setTimeout(() => reject(new Error('html-to-image timeout')), 20000))
        ]);
        pdf.addImage(pageDataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }
    } else {
      const dataUrl = await Promise.race([
        toPng(container, { quality: 1, pixelRatio: 2, skipFonts: true, cacheBust: false }),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('html-to-image timeout')), 20000))
      ]);
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
    }

    root.unmount();
    if (container.parentNode) {
      document.body.removeChild(container);
    }

    if (action === 'save') {
      pdf.save(`${invoice.invoiceNumber}.pdf`);
      emitNotification('PDF Downloaded', `${invoice.invoiceNumber}.pdf downloaded successfully.`, 'success');
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
