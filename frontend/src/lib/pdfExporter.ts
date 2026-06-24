import { jsPDF } from 'jspdf';
import { Invoice, BusinessProfile } from '../types';
import { toPng } from 'html-to-image';
import { createRoot } from 'react-dom/client';
import React from 'react';
import { LivePreview } from '../components/TemplateBuilder/LivePreview';
import { TEMPLATE_PRESETS } from './templatePresets';


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
  if (s === 'paid')                    return { bg: [209,250,229], text: [6,95,70] };
  if (s === 'pending' || s === 'sent') return { bg: [254,243,199], text: [146,64,14] };
  if (s === 'overdue' || s === 'cancelled') return { bg: [254,226,226], text: [153,27,27] };
  if (s === 'approved')                return { bg: [219,234,254], text: [30,64,175] };
  return                                      { bg: [241,245,249], text: [71,85,105] };
}

// ─── THEME PALETTE ────────────────────────────────────────────────────────────
interface Theme {
  primary: number[]; accent: number[]; headerBg: number[]; headerText: number[];
  dark: number[]; mid: number[]; light: number[]; line: number[];
}
function getTheme(style: string): Theme {
  switch (style) {
    case 'modern':     return { primary:[79,70,229],  accent:[245,243,255], headerBg:[238,242,255], headerText:[67,56,202],  dark:[15,23,42], mid:[71,85,105], light:[100,116,139], line:[203,213,225] };
    case 'startup':    return { primary:[13,148,136], accent:[240,253,250], headerBg:[204,251,241], headerText:[15,118,110], dark:[15,23,42], mid:[71,85,105], light:[100,116,139], line:[203,213,225] };
    case 'agency':     return { primary:[147,51,234], accent:[250,245,255], headerBg:[243,232,255], headerText:[107,33,168], dark:[15,23,42], mid:[71,85,105], light:[100,116,139], line:[203,213,225] };
    case 'enterprise': return { primary:[225,29,72],  accent:[255,241,242], headerBg:[255,228,230], headerText:[190,24,74],  dark:[15,23,42], mid:[71,85,105], light:[100,116,139], line:[203,213,225] };
    case 'minimal':    return { primary:[30,41,59],   accent:[248,250,252], headerBg:[241,245,249], headerText:[30,41,59],   dark:[15,23,42], mid:[71,85,105], light:[100,116,139], line:[226,232,240] };
    default:           return { primary:[2,132,199],  accent:[240,249,255], headerBg:[224,242,254], headerText:[3,105,161],  dark:[15,23,42], mid:[71,85,105], light:[100,116,139], line:[203,213,225] };
  }
}

// Returns 'cgst_sgst' | 'igst' | 'generic'
function resolveTaxMode(invoice: Invoice, profile: BusinessProfile): 'cgst_sgst' | 'igst' | 'generic' {
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

function getTaxRate(invoice: Invoice): number {
  if (invoice.taxMode === 'custom' && invoice.customTaxPercentage != null) {
    return invoice.customTaxPercentage;
  }
  // Derive from items average — use per-item tax in rows; grand tax total is already computed
  return 0; // fallback
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN INVOICE PDF EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

function numberToWords(num: number): string {
  const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
  const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];
  const numStr = Math.floor(num).toString();
  if (numStr.length > 9) return 'overflow';
  const n = ('000000000' + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (n[1] != '00') ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : '';
  str += (n[2] != '00') ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : '';
  str += (n[3] != '00') ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : '';
  str += (n[4] != '0') ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : '';
  str += (n[5] != '00') ? ((str != '') ? '' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) : '';
  return str.trim() ? str.trim() + ' Only' : 'Zero Only';
}


export function exportInvoicePDF(invoice: Invoice, profile: BusinessProfile, action: 'save' | 'datauri' | 'blob' = 'save'): string | Blob | void {
  // Check for custom template
  let customTemplate: any = null;
  if ((invoice as any).selectedCustomTemplateId) {
    try {
      const saved = localStorage.getItem('makinvoice_custom_templates');
      if (saved) {
        const templates = JSON.parse(saved);
        customTemplate = templates.find((t: any) => t.id === (invoice as any).selectedCustomTemplateId);
      }
    } catch (e) {}
  }

  const primaryRGB = customTemplate?.styleConfig?.primaryColor 
    ? [
        parseInt(customTemplate.styleConfig.primaryColor.slice(1, 3), 16),
        parseInt(customTemplate.styleConfig.primaryColor.slice(3, 5), 16),
        parseInt(customTemplate.styleConfig.primaryColor.slice(5, 7), 16)
      ]
    : [31, 41, 55];

  const primaryColArray = primaryRGB as [number, number, number];

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const sym = getCurrencySymbol(profile.currency || 'INR');
  const W = 210, H = 297;
  const mL = 14, mR = 14;
  const cW = W - mL - mR;
  const docType = (invoice.invoiceType || 'invoice').toUpperCase() === 'ESTIMATE' ? 'QUOTE' : 'TAX INVOICE';
  const taxMode = resolveTaxMode(invoice, profile);
  doc.setFont('Helvetica', 'normal');

  const T_txt = (text: string, x: number, y: number, opts: any = {}) => {
    const { size = 8, bold = false, color = [0,0,0], align = 'left' } = opts;
    doc.setFontSize(size); doc.setFont('Helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(text, x, y, { align });
  };
  const pageFooter = (pg: number, total: number) => {
    const sigY = H - 25;
    T_txt('Authorized Signatory', W - mR, sigY + 4, { size: 8, align: 'right', color: [156, 163, 175] });
    if (profile.signature) {
        try { doc.addImage(profile.signature, 'PNG', W - mR - 30, sigY - 10, 30, 12); } catch(e){}
    }
    T_txt(`Page ${pg} of ${total}`, W / 2, H - 6, { align: 'center', color: [156,163,175] });
  };

  let y = 15;

  // Header
  
  const finalDocType = customTemplate?.config?.header?.invoiceTitle || docType;
  const tAlign = customTemplate?.config?.header?.titleAlignment === 'Left' ? 'left' : customTemplate?.config?.header?.titleAlignment === 'Center' ? 'center' : 'right';
  const tX = tAlign === 'left' ? mL : tAlign === 'center' ? W/2 : W - mR;
  T_txt(finalDocType.toUpperCase(), tX, 15, { size: 22, bold: true, align: tAlign, color: primaryColArray });


  const bizDetails = [];
  
  const displayOwner = profile.ownerName || profile.displayName;
  const showCompName = customTemplate ? customTemplate?.config?.company?.fields?.includes('name') ?? true : true;
  const showCompPhone = customTemplate ? customTemplate?.config?.company?.fields?.includes('phone') ?? true : true;
  const showCompEmail = customTemplate ? customTemplate?.config?.company?.fields?.includes('email') ?? true : true;
  const showCompAddress = customTemplate ? customTemplate?.config?.company?.fields?.includes('address') ?? true : true;
  const showCompGstin = customTemplate ? customTemplate?.config?.company?.fields?.includes('gstin') ?? true : true;

  if (displayOwner && showCompName) bizDetails.push(`Owner: ${displayOwner}`);
  if (profile.mobile && showCompPhone) bizDetails.push(`Phone: ${profile.mobile}`);
  if (profile.email && showCompEmail) bizDetails.push(`Email: ${profile.email}`);
  if (profile.address && showCompAddress) bizDetails.push(profile.address);
  if (profile.state && showCompAddress) bizDetails.push(`${profile.state} ${profile.stateCode ? '- '+profile.stateCode : ''}`);
  if (profile.taxId && showCompGstin) bizDetails.push(`GSTIN: ${profile.taxId}`);

  
  // Calculate total height of the company details block
  doc.setFontSize(9);
  let totalLines = 0;
  bizDetails.forEach(line => {
    totalLines += doc.splitTextToSize(line, 100).length;
  });
  const blockHeight = 6.5 + (totalLines * 4.5); // Accurately matches ascent and descent of the text block
  
  let textStartX = mL;

  
  const showLogo = customTemplate ? customTemplate?.config?.header?.showLogo ?? true : true;
  if (showLogo && profile.logoUrl) {
    const lPos = customTemplate?.config?.header?.logoPosition || 'Left';

    try {
      const imgProps = doc.getImageProperties(profile.logoUrl);
      const ratio = imgProps.width / imgProps.height;
      let logoWidth = blockHeight * ratio;
      if (logoWidth > 70) { logoWidth = 70; } // Limit logo max width
      
      doc.addImage(profile.logoUrl, 'PNG', mL, y - 5.5, logoWidth, blockHeight);
      textStartX = mL + logoWidth + 4; // Offset text to the right of the logo
    } catch (e) {
      try {
        doc.addImage(profile.logoUrl, 'PNG', mL, y - 5.5, blockHeight, blockHeight);
        textStartX = mL + blockHeight + 4;
      } catch (innerErr) {
        console.warn('Failed to add logo to PDF:', innerErr);
        // Continue without logo
      }
    }
  }

  
  if (showCompName) {
    T_txt(profile.name || 'My Business', textStartX, y, { size: 16, bold: true, color: [17, 24, 39] });
  }

  let textY = y + 6;

  bizDetails.forEach(line => {
    const wrapped = doc.splitTextToSize(line, 100);
    wrapped.forEach((l: string) => { T_txt(l, textStartX, textY, { size: 9, color: [107, 114, 128] }); textY += 4.5; });
  });

  y = Math.max(y + blockHeight, textY) + 6;
  
  // Detail boxes
  doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.2); // Slate-300
  let boxY = y;
  
  const isQuote = invoice.invoiceType === 'estimate';
  const boxHeight = isQuote ? 18 : 30;
  
  doc.rect(mL, boxY, cW, boxHeight); // 1st box
  doc.line(W/2, boxY, W/2, boxY + boxHeight); // split
  
  let leftY = boxY + 5;
  let rightY = boxY + 5;
  const addDetail = (lbl: string, val: string, xPos: number, isRight: boolean) => {
    T_txt(lbl, xPos + 2, isRight ? rightY : leftY, { size: 8, color: [31, 41, 55] });
    T_txt(':', xPos + 28, isRight ? rightY : leftY, { size: 8, color: [31, 41, 55] });
    T_txt((val || 'N/A'), xPos + 31, isRight ? rightY : leftY, { size: 8, color: [31, 41, 55] });
    if (isRight) rightY += 5; else leftY += 5;
  };
  
  addDetail(isQuote ? 'Quote No.' : 'Invoice No.', invoice.invoiceNumber, mL, false);
  addDetail('Dated', invoice.date, mL, false);
  addDetail('Place Of Supply', invoice.placeOfSupply || 'N/A', mL, false);
  
  if (!isQuote) {
    addDetail('GR/RR No.', invoice.grRrNo || 'N/A', mL, false);
    addDetail('Transport', invoice.transport || 'N/A', mL, false);

    addDetail('Vehicle No.', invoice.vehicleNo || 'N/A', W/2, true);
    addDetail('Driver Mobile', invoice.driverMobile || 'N/A', W/2, true);
    addDetail('Station', invoice.station || 'N/A', W/2, true);
    addDetail('E-Way Bill No.', invoice.ewayBillNo || 'N/A', W/2, true);
  }
  
  addDetail('Purchase Order', invoice.poNumber || 'N/A', W/2, true);
  
  y = boxY + boxHeight;
  
  // Parties box
  let partyY = y;
  
  T_txt('BILLED TO', mL + 2, partyY + 5, { size: 8, bold: true, color: [31, 41, 55] });
  T_txt('SHIPPED TO', W/2 + 2, partyY + 5, { size: 8, bold: true, color: [31, 41, 55] });
  
  leftY = partyY + 11;
  T_txt(invoice.clientName || '', mL + 2, leftY, { size: 8, color: [31, 41, 55] }); leftY += 5;
  T_txt('Party Mobile No', mL + 2, leftY, { size: 8, color: [31, 41, 55] }); T_txt(':', mL + 28, leftY, { size: 8, color: [31, 41, 55] }); T_txt(invoice.clientPhone || 'N/A', mL + 31, leftY, { size: 8, color: [31, 41, 55] }); leftY += 5;
  T_txt('Country', mL + 2, leftY, { size: 8, color: [31, 41, 55] }); T_txt(':', mL + 28, leftY, { size: 8, color: [31, 41, 55] }); T_txt(invoice.clientCountry || 'N/A', mL + 31, leftY, { size: 8, color: [31, 41, 55] }); leftY += 5;
  T_txt('State', mL + 2, leftY, { size: 8, color: [31, 41, 55] }); T_txt(':', mL + 28, leftY, { size: 8, color: [31, 41, 55] }); T_txt(invoice.clientState || 'N/A', mL + 31, leftY, { size: 8, color: [31, 41, 55] }); leftY += 5;
  if(invoice.clientAddress) {
      doc.splitTextToSize(invoice.clientAddress, cW/2 - 4).forEach((l:string) => { T_txt(l, mL + 2, leftY, { size: 8, color: [31, 41, 55] }); leftY += 4; });
  }
  T_txt('GSTIN / UIN', mL + 2, leftY, { size: 8, color: [31, 41, 55] }); T_txt(':', mL + 28, leftY, { size: 8, color: [31, 41, 55] }); T_txt(invoice.clientGstin || 'N/A', mL + 31, leftY, { size: 8, color: [31, 41, 55] }); leftY += 3;

  const isShippingSame = !invoice.shippedToName && !invoice.shippedToAddress;
  const shipName = isShippingSame ? invoice.clientName : invoice.shippedToName;
  const shipPhone = isShippingSame ? invoice.clientPhone : invoice.shippedToPhone;
  const shipCountry = isShippingSame ? invoice.clientCountry : invoice.shippedToCountry;
  const shipState = isShippingSame ? invoice.clientState : invoice.shippedToState;
  const shipAddress = isShippingSame ? invoice.clientAddress : invoice.shippedToAddress;
  const shipGstin = isShippingSame ? invoice.clientGstin : invoice.shippedToGstin;

  rightY = partyY + 11;
  T_txt(shipName || '', W/2 + 2, rightY, { size: 8, color: [31, 41, 55] }); rightY += 5;
  T_txt('Party Mobile No', W/2 + 2, rightY, { size: 8, color: [31, 41, 55] }); T_txt(':', W/2 + 28, rightY, { size: 8, color: [31, 41, 55] }); T_txt(shipPhone || 'N/A', W/2 + 31, rightY, { size: 8, color: [31, 41, 55] }); rightY += 5;
  T_txt('Country', W/2 + 2, rightY, { size: 8, color: [31, 41, 55] }); T_txt(':', W/2 + 28, rightY, { size: 8, color: [31, 41, 55] }); T_txt(shipCountry || 'N/A', W/2 + 31, rightY, { size: 8, color: [31, 41, 55] }); rightY += 5;
  T_txt('State', W/2 + 2, rightY, { size: 8, color: [31, 41, 55] }); T_txt(':', W/2 + 28, rightY, { size: 8, color: [31, 41, 55] }); T_txt(shipState || 'N/A', W/2 + 31, rightY, { size: 8, color: [31, 41, 55] }); rightY += 5;
  if(shipAddress) {
      doc.splitTextToSize(shipAddress, cW/2 - 4).forEach((l:string) => { T_txt(l, W/2 + 2, rightY, { size: 8, color: [31, 41, 55] }); rightY += 4; });
  }
  T_txt('GSTIN / UIN', W/2 + 2, rightY, { size: 8, color: [31, 41, 55] }); T_txt(':', W/2 + 28, rightY, { size: 8, color: [31, 41, 55] }); T_txt(shipGstin || 'N/A', W/2 + 31, rightY, { size: 8, color: [31, 41, 55] }); rightY += 3;
  
  const partyBoxHeight = Math.max(leftY, rightY) - partyY;
  doc.rect(mL, partyY, cW, partyBoxHeight);
  doc.line(W/2, partyY, W/2, partyY + partyBoxHeight);

  y = partyY + partyBoxHeight + 8;
  
  // Table header
  
  doc.setFillColor(primaryColArray[0], primaryColArray[1], primaryColArray[2]);
  if (customTemplate?.styleConfig?.roundedCorners) {
    doc.roundedRect(mL, y, cW, 8, 2, 2, 'F');
  } else {
    doc.rect(mL, y, cW, 8, 'F');
  }

  
  const hasHSN = invoice.items.some(i => i.hsnCode || i.sacCode);
  const taxColCount = (taxMode === 'cgst_sgst') ? 2 : ((taxMode === 'generic' && invoice.customTaxCols) ? Math.max(1, invoice.customTaxCols.length) : 1);
  
  const wSL = 10;
  const wHSN = hasHSN ? 18 : 0;
  const wQTY = 16;
  const wRATE = 20;
  const wAMOUNT = 27;
  const wTAX = Math.max(20, taxColCount * 14); // Dynamic width to accommodate multiple taxes
  const totalFixed = wSL + wHSN + wQTY + wRATE + wTAX + wAMOUNT;
  const wDESC = Math.max(20, (W - mL - mR) - totalFixed);
  
  const v0 = mL;
  const v1 = v0 + wSL;
  const v2 = v1 + wDESC;
  const v3 = v2 + wHSN;
  const v4 = v3 + wQTY;
  const v5 = v4 + wRATE;
  const v6 = v5 + wTAX;
  const v7 = W - mR;

  const hOpts = { size: 8, bold: true, color: [255,255,255] };
  const hOptsC = { ...hOpts, align: 'center' as const };
  const hOptsR = { ...hOpts, align: 'right' as const };
  
  T_txt('SL', v0 + wSL/2, y + 5.5, hOptsC);
  T_txt('ITEM DESCRIPTION', v1 + 2, y + 5.5, hOpts);
  if (hasHSN) T_txt('HSN', v2 + wHSN/2, y + 5.5, hOptsC);
  T_txt('QTY', v3 + wQTY/2, y + 5.5, hOptsC);
  T_txt('RATE', v4 + wRATE/2, y + 5.5, hOptsC);

  if (taxMode === 'cgst_sgst') {
    T_txt('CGST%', v5 + wTAX/4, y + 5.5, hOptsC);
    T_txt('SGST%', v5 + wTAX*3/4, y + 5.5, hOptsC);
  } else if (taxMode === 'generic' && invoice.customTaxCols && invoice.customTaxCols.length > 0) {
    const taxWidth = wTAX / invoice.customTaxCols.length;
    invoice.customTaxCols.forEach((col, i) => {
      T_txt(`${col}%`, v5 + (i * taxWidth) + (taxWidth / 2), y + 5.5, hOptsC);
    });
  } else {
    let taxLabel = taxMode === 'generic' ? (invoice.customTaxName || 'TAX%') : 'IGST%';
    T_txt(taxLabel, v5 + wTAX/2, y + 5.5, hOptsC);
  }

  T_txt('AMOUNT', v7 - 2, y + 5.5, hOptsR);
  
  y += 8;
  
  // Rows
  let itemTotal = 0;
  let sgstTotal = 0;
  let cgstTotal = 0;
  let igstTotal = 0;

  invoice.items.forEach((item, idx) => {
    const nameStr = `${item.name}`;
    const nameLines = doc.splitTextToSize(nameStr, wDESC - 4);
    const descLines = item.description ? doc.splitTextToSize(item.description, wDESC - 4) : [];
    
    let estTY = y + 5;
    estTY += nameLines.length * 4;
    estTY += descLines.length * 4;
    let estRowH = Math.max(estTY - y, 12);
    
    if (y + estRowH > H - 45) {
      doc.addPage();
      y = 15;
      
      doc.setFillColor(0, 0, 0);
      doc.rect(mL, y, cW, 8, 'F');
      
      const hOpts = { size: 8, bold: true, color: [255,255,255] };
      const hOptsC = { ...hOpts, align: 'center' as const };
      const hOptsR = { ...hOpts, align: 'right' as const };
      
      T_txt('SL', v0 + wSL/2, y + 5.5, hOptsC);
      T_txt('ITEM DESCRIPTION', v1 + 2, y + 5.5, hOpts);
      if (hasHSN) T_txt('HSN', v2 + wHSN/2, y + 5.5, hOptsC);
      T_txt('QTY', v3 + wQTY/2, y + 5.5, hOptsC);
      T_txt('RATE', v4 + wRATE/2, y + 5.5, hOptsC);

      if (taxMode === 'cgst_sgst') {
        T_txt('CGST%', v5 + wTAX/4, y + 5.5, hOptsC);
        T_txt('SGST%', v5 + wTAX*3/4, y + 5.5, hOptsC);
      } else if (taxMode === 'generic' && invoice.customTaxCols && invoice.customTaxCols.length > 0) {
        const taxWidth = wTAX / invoice.customTaxCols.length;
        invoice.customTaxCols.forEach((col, i) => {
          T_txt(`${col}%`, v5 + (i * taxWidth) + (taxWidth / 2), y + 5.5, hOptsC);
        });
      } else {
        let taxLabel = taxMode === 'generic' ? (invoice.customTaxName || 'TAX%') : 'IGST%';
        T_txt(taxLabel, v5 + wTAX/2, y + 5.5, hOptsC);
      }
      T_txt('AMOUNT', v7 - 2, y + 5.5, hOptsR);
      y += 8;
    }

    let tY = y + 5;
    
    T_txt(`${idx + 1}`, v0 + wSL/2, tY, { size: 8, align: 'center', color: [75, 85, 99] });

    nameLines.forEach((l:string) => { T_txt(l, v1 + 2, tY, { size: 8, bold: true, color: [31, 41, 55] }); tY += 4; });
    descLines.forEach((l:string) => { T_txt(l, v1 + 2, tY, { size: 8, color: [107, 114, 128] }); tY += 4; });
    
    let rowH = Math.max(tY - y, 12);
    
    const baseAmt = item.rate * item.quantity;
    const disc = item.discountPercentage || 0;
    const taxable = baseAmt - (baseAmt * disc / 100);
    
    let activeTaxPct = item.taxPercentage;
    if (taxMode === 'generic') {
      if (item.customTaxes && invoice.customTaxCols && invoice.customTaxCols.length > 0) {
        activeTaxPct = invoice.customTaxCols.reduce((sum, c) => sum + (item.customTaxes![c] || 0), 0);
      } else {
        activeTaxPct = invoice.customTaxPercentage || 0;
        if (invoice.additionalTaxes) {
          activeTaxPct += invoice.additionalTaxes.reduce((sum, t) => sum + t.rate, 0);
        }
      }
    }
    const taxAmt = taxable * (activeTaxPct / 100);
    
    if (hasHSN) {
      const hsnStr = item.hsnCode || item.sacCode || '...';
      T_txt(hsnStr, v2 + wHSN/2, y + 5, { size: 8, align: 'center', color: [156, 163, 175] });
    }
    
    const qtyStr = item.quantityType ? `${item.quantity} ${item.quantityType}` : `${item.quantity}`;
    T_txt(qtyStr, v3 + wQTY/2, y + 5, { size: 8, bold: true, align: 'center', color: [31, 41, 55] });
    
    T_txt(fmt(item.rate, ''), v4 + wRATE/2, y + 5, { size: 8, align: 'center', color: [75, 85, 99] });
    
    if (taxMode === 'cgst_sgst') {
      T_txt(`${activeTaxPct / 2}%`, v5 + wTAX/4, y + 5, { size: 8, align: 'center', color: [107, 114, 128] });
      T_txt(`${activeTaxPct / 2}%`, v5 + wTAX*3/4, y + 5, { size: 8, align: 'center', color: [107, 114, 128] });
    } else if (taxMode === 'generic' && invoice.customTaxCols && invoice.customTaxCols.length > 0) {
      const taxWidth = wTAX / invoice.customTaxCols.length;
      invoice.customTaxCols.forEach((col, i) => {
        const cVal = item.customTaxes?.[col] || 0;
        T_txt(`${cVal}%`, v5 + (i * taxWidth) + (taxWidth / 2), y + 5, { size: 8, align: 'center', color: [107, 114, 128] });
      });
    } else {
      T_txt(`${activeTaxPct}%`, v5 + wTAX/2, y + 5, { size: 8, align: 'center', color: [107, 114, 128] });
    }
    
    T_txt(fmt(taxable + taxAmt, ''), v7 - 2, y + 5, { size: 8, bold: true, align: 'right', color: [31, 41, 55] });

    if (taxMode === 'cgst_sgst') {
      sgstTotal += taxAmt / 2;
      cgstTotal += taxAmt / 2;
    } else {
      igstTotal += taxAmt;
    }
    itemTotal += taxable;
    
    // Bottom border for row
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.2);
    doc.line(mL, y + rowH + 2, W - mR, y + rowH + 2);
    
    // Vertical lines
    const vLines = [v0, v1, v2, v3, v4, v5, v6, v7];
    if (!hasHSN) vLines.splice(2, 1); // Remove v2 if HSN is omitted
    
    Array.from(new Set(vLines)).forEach(vx => {
      doc.line(vx, y, vx, y + rowH + 2);
    });
    
    if (taxMode === 'cgst_sgst') {
      doc.line(v5 + wTAX/2, y, v5 + wTAX/2, y + rowH + 2); // Center split for CGST/SGST
    } else if (taxMode === 'generic' && invoice.customTaxCols && invoice.customTaxCols.length > 1) {
      const taxWidth = wTAX / invoice.customTaxCols.length;
      for (let i = 1; i < invoice.customTaxCols.length; i++) {
        const divX = v5 + (i * taxWidth);
        doc.line(divX, y, divX, y + rowH + 2);
      }
    }

    y += rowH + 2;
  });

  y += 5;
  
  if (y > H - 70) {
      doc.addPage();
      y = 15;
  }
  
  // Footer
  let footY = y;
  
  // Left Side Notes
  let lY = footY;
  if(invoice.notes) {
      T_txt('Notes', mL, lY, { size: 7, bold: true, color: [31, 41, 55] }); lY += 4;
      doc.splitTextToSize(invoice.notes, 110).forEach((l:string) => { T_txt(l, mL, lY, { size: 8, color: [75, 85, 99] }); lY += 3.5; });
      lY += 4;
  }
  if(invoice.invoiceTerms) {
      T_txt('Terms & Conditions', mL, lY, { size: 7, bold: true, color: [31, 41, 55] }); lY += 4;
      doc.splitTextToSize(invoice.invoiceTerms, 110).forEach((l:string) => { T_txt(l, mL, lY, { size: 8, color: [75, 85, 99] }); lY += 3.5; });
      lY += 4;
  }
  T_txt('Banking Information', mL, lY, { size: 7, bold: true, color: [31, 41, 55] }); lY += 4;
  if (profile.bankName) { T_txt(`Bank Name: ${profile.bankName}`, mL, lY, { size: 8, color: [75, 85, 99] }); lY += 4; }
  if (profile.accountNumber) { T_txt(`Account No.: ${profile.accountNumber}`, mL, lY, { size: 8, color: [75, 85, 99] }); lY += 4; }
  if (profile.ifsc) { T_txt(`IFSC Code: ${profile.ifsc}`, mL, lY, { size: 8, color: [75, 85, 99] }); lY += 4; }
  if (profile.upiId) { T_txt(`UPI ID: ${profile.upiId}`, mL, lY, { size: 8, color: [75, 85, 99] }); lY += 4; }
  
  // Right Side Totals
  let rY = footY;
  const totW = 65;
  const tLx = W - mR - totW;
  
  const tRow = (lbl:string, val:string, bold=false) => {
      T_txt(lbl, tLx, rY, { size: 9, bold, color: [75, 85, 99] });
      T_txt(val, W - mR, rY, { size: 9, bold, align: 'right', color: [75, 85, 99] });
      rY += 6;
  };
  
  tRow('Sub Total', fmt(itemTotal, ''));
  if(invoice.discountTotal > 0) tRow('Discount', '-' + fmt(invoice.discountTotal, ''));
  if(taxMode === 'cgst_sgst') {
      let taxPct = invoice.items.length > 0 ? (invoice.items[0].taxPercentage / 2) : 9;
      tRow(`SGST (${taxPct}%)`, fmt(sgstTotal, ''));
      tRow(`CGST (${taxPct}%)`, fmt(cgstTotal, ''));
  } else {
      let activePct = invoice.items.length > 0 ? invoice.items[0].taxPercentage : 0;
      if (taxMode === 'generic') {
        if (taxMode === 'generic' && invoice.customTaxCols && invoice.customTaxCols.length > 0 && invoice.items.length > 0) {
          const firstItem = invoice.items[0];
          activePct = invoice.customTaxCols.reduce((sum, c) => sum + (firstItem.customTaxes?.[c] || 0), 0);
        } else {
          activePct = invoice.customTaxPercentage || 0;
          if (invoice.additionalTaxes) {
            activePct += invoice.additionalTaxes.reduce((sum, t) => sum + t.rate, 0);
          }
        }
      }
      let taxLabel = 'IGST';
      if (taxMode === 'generic') {
        taxLabel = (invoice.customTaxCols && invoice.customTaxCols.length > 0)
          ? invoice.customTaxCols.join(' + ')
          : (invoice.customTaxName || 'Tax');
      }
      tRow(`${taxLabel} (${activePct}%)`, fmt(igstTotal, ''));
  }
  
  doc.setFillColor(248, 250, 252); // light background for total
  doc.rect(tLx - 5, rY - 4, totW + 5, 8, 'F');
  T_txt('TOTAL', tLx, rY + 1.5, { size: 10, bold: true, color: [17, 24, 39] });
  T_txt(`${sym} ${fmt(invoice.grandTotal, '')}`, W - mR, rY + 1.5, { size: 10, bold: true, align: 'right', color: [17, 24, 39] });
  rY += 10;
  
  T_txt('Amount in Words:', W - mR, rY, { size: 8, bold: true, align: 'right', color: [17, 24, 39] }); rY += 4;
  doc.splitTextToSize(numberToWords(invoice.grandTotal), totW + 20).forEach((l:string) => {
      T_txt(l, W - mR, rY, { size: 8, align: 'right', color: [107, 114, 128] }); rY += 4;
  });
  
  if (rY > H - 45 || lY > H - 45) {
      doc.addPage();
  }

  const totalPgs = doc.getNumberOfPages();
  for (let p = 1; p <= totalPgs; p++) {
    doc.setPage(p);
    pageFooter(p, totalPgs);
  }

  if (action === 'datauri') {
    return doc.output('datauristring');
  } else if (action === 'blob') {
    return doc.output('blob');
  }
  doc.save(`${invoice.invoiceNumber}.pdf`);
}
// ═══════════════════════════════════════════════════════════════════════════════
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
  doc.setFontSize(7.5); doc.setFont('Helvetica', 'bold'); doc.setTextColor(255,255,255);
  doc.text('BUSINESS LEDGER & FINANCIAL STATEMENT', mL, 8.5);
  doc.text(`Report: ${new Date().toLocaleDateString('en-IN')}`, W-mR, 8.5, { align: 'right' });

  let y = 22;
  doc.setFontSize(14); doc.setFont('Helvetica', 'bold'); doc.setTextColor(15,23,42);
  doc.text(profile.name || 'My Business', mL, y);
  doc.setFontSize(9.5); doc.setTextColor(2,132,199);
  doc.text('LEDGER STATEMENT', W-mR, y, { align: 'right' });
  y += 5;

  doc.setFontSize(7.2); doc.setFont('Helvetica', 'normal'); doc.setTextColor(71,85,105);
  [profile.address, profile.email && `Email: ${profile.email}`, profile.taxId && `GSTIN: ${profile.taxId}`]
    .filter(Boolean).forEach(l => { doc.text(l as string, mL, y); y += 3.7; });

  let ry = 27;
  doc.setFontSize(7.8); doc.setFont('Helvetica', 'bold'); doc.setTextColor(30,41,59);
  doc.text('Period:', W-mR-55, ry); doc.setFont('Helvetica','normal');
  doc.text(periodName.toUpperCase(), W-mR, ry, { align: 'right' }); ry+=4.5;
  doc.setFont('Helvetica','bold'); doc.text('Records:', W-mR-55, ry); doc.setFont('Helvetica','normal');
  doc.text(`${invoices.length} invoice(s)`, W-mR, ry, { align: 'right' });

  y = Math.max(y + 2, ry + 6);
  hRule(y, 0.3, 30, 41, 59); y += 7;

  // Stats cards
  const totalGrand = invoices.reduce((s,i) => s+i.grandTotal, 0);
  const totalPaid  = invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+i.grandTotal,0);
  const totalTax   = invoices.reduce((s,i)=>s+i.taxTotal, 0);
  const pending    = totalGrand - totalPaid;

  const cards = [
    { label:'TOTAL BILLED',  val:fmt(totalGrand,sym), bg:[240,246,255], fg:[37,99,235] },
    { label:'COLLECTED',     val:fmt(totalPaid,sym),  bg:[240,253,250], fg:[13,148,136] },
    { label:'OUTSTANDING',   val:fmt(pending,sym),    bg:[254,243,199], fg:[146,64,14] },
    { label:'TAX LIABILITY', val:fmt(totalTax,sym),   bg:[254,226,226], fg:[153,27,27] },
  ];
  const cardW = (cW-9)/4;
  cards.forEach((c,i) => {
    const cx = mL + i*(cardW+3);
    doc.setFillColor(c.bg[0],c.bg[1],c.bg[2]);
    doc.roundedRect(cx, y, cardW, 14, 1.5, 1.5, 'F');
    doc.setFontSize(6.2); doc.setFont('Helvetica','bold');
    doc.setTextColor(c.fg[0],c.fg[1],c.fg[2]);
    doc.text(c.label, cx+3, y+5.5);
    doc.setFontSize(8.2); doc.text(c.val, cx+3, y+11);
  });
  y += 20; hRule(y); y += 6;

  // Table header
  doc.setFillColor(241,245,249);
  doc.rect(mL, y, cW, 7, 'F');
  doc.setFontSize(6.5); doc.setFont('Helvetica','bold'); doc.setTextColor(71,85,105);
  const cols = { date:mL+2, inv:mL+22, client:mL+46, sub:W-mR-56, tax:W-mR-34, grand:W-mR-13, status:W-mR };
  doc.text('DATE',     cols.date,   y+4.8);
  doc.text('INV NO',   cols.inv,    y+4.8);
  doc.text('CLIENT',   cols.client, y+4.8);
  doc.text('SUBTOTAL', cols.sub,    y+4.8, {align:'right'});
  doc.text('TAX',      cols.tax,    y+4.8, {align:'right'});
  doc.text('TOTAL',    cols.grand,  y+4.8, {align:'right'});
  doc.text('STATUS',   cols.status, y+4.8, {align:'right'});
  y += 7;

  if (invoices.length === 0) {
    doc.setFontSize(7.8); doc.setFont('Helvetica','normal'); doc.setTextColor(100,116,139);
    doc.text('No records found for this period.', mL+10, y+6); y+=12;
  } else {
    invoices.forEach((inv, i) => {
      if (y > H-30) {
        doc.addPage(); y=15;
        doc.setFillColor(15,23,42); doc.rect(0,0,W,3.5,'F');
      }
      if (i%2===1) { doc.setFillColor(252,253,254); doc.rect(mL,y,cW,9,'F'); }

      doc.setFontSize(7.2); doc.setFont('Helvetica','normal'); doc.setTextColor(30,41,59);
      doc.text(inv.date, cols.date, y+5.5);
      doc.text(inv.invoiceNumber, cols.inv, y+5.5);
      const cn = inv.clientName.length>20 ? inv.clientName.slice(0,20)+'…' : inv.clientName;
      doc.text(cn, cols.client, y+5.5);
      doc.text(fmt(inv.subtotal,sym),   cols.sub,   y+5.5, {align:'right'});
      doc.text(fmt(inv.taxTotal,sym),   cols.tax,   y+5.5, {align:'right'});
      doc.text(fmt(inv.grandTotal,sym), cols.grand, y+5.5, {align:'right'});

      const sc = statusColors(inv.status);
      doc.setFont('Helvetica','bold'); doc.setTextColor(sc.text[0],sc.text[1],sc.text[2]);
      
      if (inv.status === 'paid' && inv.paidDate) {
        doc.text('PAID', cols.status, y+4, {align:'right'});
        doc.setFontSize(5);
        doc.text(`ON ${inv.paidDate}`, cols.status, y+7.5, {align:'right'});
      } else {
        doc.text((inv.status||'pending').toUpperCase(), cols.status, y+5.5, {align:'right'});
      }
      
      doc.setFont('Helvetica','normal');
      y += 9;
    });
  }

  hRule(y, 0.3, 30, 41, 59); y += 7;

  // Totals row
  if (y>H-30) { doc.addPage(); y=20; }
  doc.setFillColor(240,249,255);
  doc.rect(mL, y, cW, 9, 'F');
  doc.setFontSize(7.8); doc.setFont('Helvetica','bold'); doc.setTextColor(2,132,199);
  doc.text(`TOTALS (${invoices.length} records)`, mL+3, y+6);
  doc.text(fmt(totalGrand,sym), cols.grand, y+6, {align:'right'});
  doc.setTextColor(30,41,59);
  doc.text(fmt(totalTax,sym),   cols.tax,   y+6, {align:'right'});
  y += 16;

  if (y < H-35) {
    doc.setFillColor(248,250,252);
    doc.rect(mL, y, cW, 18, 'F');
    doc.setFontSize(7.5); doc.setFont('Helvetica','bold'); doc.setTextColor(30,41,59);
    doc.text('GST COMPLIANCE NOTE', mL+3, y+6);
    doc.setFont('Helvetica','normal'); doc.setFontSize(6.8); doc.setTextColor(100,116,139);
    doc.text('This statement summarizes invoices generated for tax reconciliation. Each invoice applies CGST/SGST (intra-state) or IGST (inter-state/export) as per GST rules. Verify all figures against your GSTR-1 filing before submission.', mL+3, y+11, { maxWidth: cW-6 });
  }

  const totalPgs = doc.getNumberOfPages();
  for (let p=1; p<=totalPgs; p++) {
    doc.setPage(p);
    doc.setFillColor(15,23,42); doc.rect(0,H-3.5,W,3.5,'F');
    doc.setFontSize(6.8); doc.setFont('Helvetica','normal'); doc.setTextColor(148,163,184);
    doc.text(`Ledger Statement  |  Page ${p} of ${totalPgs}  |  MakInvoice`, W/2, H-6, {align:'center'});
  }

  doc.save(`ledger_${periodName.toLowerCase().replace(/\s+/g,'_')}.pdf`);
}

import { InvoiceTemplate } from '../types';

export async function exportInvoicePDFAsync(invoice: Invoice, profile: BusinessProfile, action: 'save' | 'datauri' | 'blob' = 'save', templateOverride?: InvoiceTemplate): Promise<string | Blob | void> {
  // Use the provided template override if available (exact instance from modal = no race condition)
  // Otherwise fall back to the global default from localStorage
  let activeTemplate: InvoiceTemplate = templateOverride || TEMPLATE_PRESETS[0];

  if (!templateOverride) {
    const globalDefaultId = localStorage.getItem('makinvoice_global_default_template');
    if (globalDefaultId) {
      let foundCustom = false;
      const saved = localStorage.getItem('makinvoice_custom_templates');
      if (saved) {
        try {
          const templates = JSON.parse(saved);
          const custom = templates.find((t: any) => t.id === globalDefaultId);
          if (custom) {
            activeTemplate = custom;
            foundCustom = true;
          }
        } catch (e) {}
      }
      if (!foundCustom) {
        const preset = TEMPLATE_PRESETS.find(t => t.id === globalDefaultId);
        if (preset) activeTemplate = preset;
      }
    }
  }

  // Create a hidden container within viewport bounds to prevent blank captures
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.zIndex = '-9999'; // Hide behind app
  container.style.width = activeTemplate.layout.pageSize === 'A4' ? '794px' : '816px';
  container.style.minHeight = activeTemplate.layout.pageSize === 'A4' ? '1123px' : '1056px';
  container.style.backgroundColor = 'white';
  document.body.appendChild(container);

  const currencySymbol = getCurrencySymbol(profile.currency || 'INR');

  // We need to resolve the taxMode and apply it properly to the invoice data
  const taxMode = resolveTaxMode(invoice, profile);
  const tempInvoice = { ...invoice };
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

  // Wait for React to render and images to load fully
  await new Promise(r => setTimeout(r, 1500));

  try {
    // Patch CSSStyleSheet to ignore SecurityError from cross-origin stylesheets (like extensions or missing CORS)
    const originalCssRules = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'cssRules');
    if (originalCssRules) {
      Object.defineProperty(CSSStyleSheet.prototype, 'cssRules', {
        get() {
          try {
            return originalCssRules.get?.call(this) || [];
          } catch (e) {
            return []; // Ignore SecurityError
          }
        },
        configurable: true
      });
    }

    const dataUrl = await Promise.race([
      toPng(container, { quality: 1, pixelRatio: 2 }),
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error('html-to-image timeout')), 10000))
    ]);
    
    // Restore original
    if (originalCssRules) {
      Object.defineProperty(CSSStyleSheet.prototype, 'cssRules', originalCssRules);
    }

    const containerWidth = container.offsetWidth || 794;
    const containerHeight = container.offsetHeight || 1123;
    
    root.unmount();
    if (container.parentNode) {
      document.body.removeChild(container);
    }
    
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (containerHeight * pdfWidth) / containerWidth;
    pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
    
    if (action === 'save') {
      pdf.save(`${invoice.invoiceNumber}.pdf`);
    } else if (action === 'datauri') {
      return pdf.output('datauristring');
    } else if (action === 'blob') {
      return pdf.output('blob');
    }
  } catch (err) {
    console.error('PDF Generation Failed', err);
    try { root.unmount(); } catch (e) {}
    if (container.parentNode) {
      try { document.body.removeChild(container); } catch (e) {}
    }
    throw err;
  }
}
