const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'lib', 'pdfExporter.ts');
let content = fs.readFileSync(filePath, 'utf8');

const replacement = `
function numberToWords(num: number): string {
  const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
  const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];
  const numStr = Math.floor(num).toString();
  if (numStr.length > 9) return 'overflow';
  const n = ('000000000' + numStr).substr(-9).match(/^(\\d{2})(\\d{2})(\\d{2})(\\d{1})(\\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (n[1] != '00') ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : '';
  str += (n[2] != '00') ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : '';
  str += (n[3] != '00') ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : '';
  str += (n[4] != '0') ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : '';
  str += (n[5] != '00') ? ((str != '') ? '' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) : '';
  return str.trim() ? str.trim() + ' Only' : 'Zero Only';
}

export function exportInvoicePDF(invoice: Invoice, profile: BusinessProfile): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const sym = getCurrencySymbol(profile.currency || 'INR');
  const W = 210, H = 297;
  const mL = 14, mR = 14;
  const cW = W - mL - mR;
  const docType = (invoice.invoiceType || 'invoice').toUpperCase() === 'ESTIMATE' ? 'ESTIMATE' : 'TAX INVOICE';
  const taxMode = resolveTaxMode(invoice);
  doc.setFont('Helvetica', 'normal');

  const T_txt = (text: string, x: number, y: number, opts: any = {}) => {
    const { size = 8, bold = false, color = [0,0,0], align = 'left' } = opts;
    doc.setFontSize(size); doc.setFont('Helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(text, x, y, { align });
  };
  const pageFooter = (pg: number, total: number) => {
    T_txt(\`Page \${pg} of \${total}\`, W / 2, H - 6, { align: 'center', color: [156,163,175] });
  };

  let y = 15;

  // Header
  T_txt(profile.name || 'My Business', mL, y, { size: 16, bold: true, color: [17, 24, 39] });
  T_txt(docType, W - mR, y, { size: 22, bold: false, align: 'right', color: [31, 41, 55] });
  y += 6;

  const bizDetails = [];
  if (profile.address) bizDetails.push(profile.address);
  if (profile.state) bizDetails.push(\`\${profile.state} \${profile.stateCode ? '- '+profile.stateCode : ''}\`);
  if (profile.taxId) bizDetails.push(\`GSTIN: \${profile.taxId}\`);
  
  bizDetails.forEach(line => {
    const wrapped = doc.splitTextToSize(line, 100);
    wrapped.forEach((l: string) => { T_txt(l, mL, y, { size: 9, color: [107, 114, 128] }); y += 4.5; });
  });
  
  y += 4;
  
  // Detail boxes
  doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.2); // Slate-300
  let boxY = y;
  doc.rect(mL, boxY, cW, 30); // 1st box
  doc.line(W/2, boxY, W/2, boxY + 30); // split
  
  let leftY = boxY + 5;
  let rightY = boxY + 5;
  const addDetail = (lbl: string, val: string, xPos: number, isRight: boolean) => {
    T_txt(lbl, xPos + 2, isRight ? rightY : leftY, { size: 8, color: [31, 41, 55] });
    T_txt(':', xPos + 28, isRight ? rightY : leftY, { size: 8, color: [31, 41, 55] });
    T_txt((val || '-'), xPos + 31, isRight ? rightY : leftY, { size: 8, color: [31, 41, 55] });
    if (isRight) rightY += 5; else leftY += 5;
  };
  
  addDetail('Invoice No.', invoice.invoiceNumber, mL, false);
  addDetail('Dated', invoice.date, mL, false);
  addDetail('Place Of Supply', invoice.placeOfSupply || '-', mL, false);
  addDetail('GR/RR No.', invoice.grRrNo || '-', mL, false);
  addDetail('Transport', invoice.transport || '-', mL, false);

  addDetail('Vehicle No.', invoice.vehicleNo || '-', W/2, true);
  addDetail('Driver Mobile', invoice.driverMobile || '-', W/2, true);
  addDetail('Station', invoice.station || '-', W/2, true);
  addDetail('E-Way Bill No.', invoice.ewayBillNo || '-', W/2, true);
  addDetail('Purchase Order', invoice.poNumber || '-', W/2, true);
  
  y = boxY + 30;
  
  // Parties box
  let partyY = y;
  doc.rect(mL, partyY, cW, 35);
  doc.line(W/2, partyY, W/2, partyY + 35);
  
  T_txt('BILLED TO', mL + 2, partyY + 5, { size: 8, bold: true, color: [31, 41, 55] });
  T_txt('SHIPPED TO', W/2 + 2, partyY + 5, { size: 8, bold: true, color: [31, 41, 55] });
  
  leftY = partyY + 11;
  T_txt(invoice.clientName || '', mL + 2, leftY, { size: 8, color: [31, 41, 55] }); leftY += 5;
  T_txt('Party Mobile No', mL + 2, leftY, { size: 8, color: [31, 41, 55] }); T_txt(':', mL + 28, leftY, { size: 8, color: [31, 41, 55] }); T_txt(invoice.clientPhone || '-', mL + 31, leftY, { size: 8, color: [31, 41, 55] }); leftY += 5;
  T_txt('State', mL + 2, leftY, { size: 8, color: [31, 41, 55] }); T_txt(':', mL + 28, leftY, { size: 8, color: [31, 41, 55] }); T_txt(invoice.clientState || '-', mL + 31, leftY, { size: 8, color: [31, 41, 55] }); leftY += 5;
  T_txt('GSTIN / UIN', mL + 2, leftY, { size: 8, color: [31, 41, 55] }); T_txt(':', mL + 28, leftY, { size: 8, color: [31, 41, 55] }); T_txt(invoice.clientGstin || '-', mL + 31, leftY, { size: 8, color: [31, 41, 55] }); leftY += 5;
  if(invoice.clientAddress) {
      doc.splitTextToSize(invoice.clientAddress, cW/2 - 4).forEach((l:string) => { T_txt(l, mL + 2, leftY, { size: 8, color: [31, 41, 55] }); leftY += 4; });
  }

  rightY = partyY + 11;
  T_txt(invoice.shippedToName || invoice.clientName || '', W/2 + 2, rightY, { size: 8, color: [31, 41, 55] }); rightY += 5;
  T_txt('Party Mobile No', W/2 + 2, rightY, { size: 8, color: [31, 41, 55] }); T_txt(':', W/2 + 28, rightY, { size: 8, color: [31, 41, 55] }); T_txt(invoice.shippedToPhone || invoice.clientPhone || '-', W/2 + 31, rightY, { size: 8, color: [31, 41, 55] }); rightY += 5;
  T_txt('State', W/2 + 2, rightY, { size: 8, color: [31, 41, 55] }); T_txt(':', W/2 + 28, rightY, { size: 8, color: [31, 41, 55] }); T_txt(invoice.shippedToState || invoice.clientState || '-', W/2 + 31, rightY, { size: 8, color: [31, 41, 55] }); rightY += 5;
  T_txt('GSTIN / UIN', W/2 + 2, rightY, { size: 8, color: [31, 41, 55] }); T_txt(':', W/2 + 28, rightY, { size: 8, color: [31, 41, 55] }); T_txt(invoice.shippedToGstin || invoice.clientGstin || '-', W/2 + 31, rightY, { size: 8, color: [31, 41, 55] }); rightY += 5;
  if(invoice.shippedToAddress || invoice.clientAddress) {
      doc.splitTextToSize(invoice.shippedToAddress || invoice.clientAddress || '', cW/2 - 4).forEach((l:string) => { T_txt(l, W/2 + 2, rightY, { size: 8, color: [31, 41, 55] }); rightY += 4; });
  }
  
  y = partyY + 43;

  // Table header
  doc.setFillColor(0, 0, 0);
  doc.rect(mL, y, cW, 8, 'F');
  
  const colDesc = mL + 3;
  const colQty = mL + 85;
  const colRate = mL + 105;
  const colSGST = mL + 125;
  const colCGST = mL + 145;
  const colIGST = mL + 165;
  const colAmt = W - mR - 3;

  const hOpts = { size: 8, bold: true, color: [255,255,255] };
  const hOptsC = { ...hOpts, align: 'center' };
  const hOptsR = { ...hOpts, align: 'right' };
  
  T_txt('Item Description', colDesc, y + 5.5, hOpts);
  T_txt('Qty', colQty, y + 5.5, hOptsC);
  T_txt('Rate', colRate, y + 5.5, hOptsC);
  T_txt('SGST', colSGST, y + 5.5, hOptsC);
  T_txt('CGST', colCGST, y + 5.5, hOptsC);
  T_txt('IGST', colIGST, y + 5.5, hOptsC);
  T_txt('Amount', colAmt, y + 5.5, hOptsR);
  
  y += 8;
  
  // Rows
  let itemTotal = 0;
  let sgstTotal = 0;
  let cgstTotal = 0;
  let igstTotal = 0;

  invoice.items.forEach((item, idx) => {
    let tY = y + 5;
    const nameStr = \`\${item.name} \${item.sacCode ? '(SAC ' + item.sacCode + ')' : ''}\`;
    const nameLines = doc.splitTextToSize(nameStr, 70);
    const descLines = item.description ? doc.splitTextToSize(item.description, 70) : [];
    
    nameLines.forEach((l:string) => { T_txt(l, colDesc, tY, { size: 8, color: [75, 85, 99] }); tY += 4; });
    descLines.forEach((l:string) => { T_txt(l, colDesc, tY, { size: 8, color: [107, 114, 128] }); tY += 4; });
    
    let rowH = Math.max(tY - y, 12);
    
    const baseAmt = item.rate * item.quantity;
    const disc = item.discountPercentage || 0;
    const taxable = baseAmt - (baseAmt * disc / 100);
    const taxAmt = taxable * (item.taxPercentage / 100);
    
    T_txt(\`\${item.quantity}\`, colQty, y + 5, { size: 8, align: 'center', color: [75, 85, 99] });
    T_txt(fmt(item.rate, ''), colRate, y + 5, { size: 8, align: 'center', color: [75, 85, 99] }); // removed symbol for rate to match image
    
    let sgstAmt = 0, cgstAmt = 0, igstAmt = 0;
    
    if (taxMode === 'cgst_sgst') {
      const halfPct = item.taxPercentage / 2;
      sgstAmt = taxAmt / 2;
      cgstAmt = taxAmt / 2;
      T_txt(\`\${halfPct}%\`, colSGST, y + 5, { size: 8, align: 'center', color: [75, 85, 99] });
      T_txt(fmt(sgstAmt, ''), colSGST, y + 9, { size: 8, align: 'center', color: [75, 85, 99] });
      
      T_txt(\`\${halfPct}%\`, colCGST, y + 5, { size: 8, align: 'center', color: [75, 85, 99] });
      T_txt(fmt(cgstAmt, ''), colCGST, y + 9, { size: 8, align: 'center', color: [75, 85, 99] });
      
      T_txt('-', colIGST, y + 5, { size: 8, align: 'center', color: [75, 85, 99] });
    } else {
      igstAmt = taxAmt;
      T_txt('-', colSGST, y + 5, { size: 8, align: 'center', color: [75, 85, 99] });
      T_txt('-', colCGST, y + 5, { size: 8, align: 'center', color: [75, 85, 99] });
      T_txt(\`\${item.taxPercentage}%\`, colIGST, y + 5, { size: 8, align: 'center', color: [75, 85, 99] });
      T_txt(fmt(igstAmt, ''), colIGST, y + 9, { size: 8, align: 'center', color: [75, 85, 99] });
    }
    
    itemTotal += taxable;
    sgstTotal += sgstAmt;
    cgstTotal += cgstAmt;
    igstTotal += igstAmt;
    
    T_txt(fmt(taxable, ''), colAmt, y + 5, { size: 8, align: 'right', color: [75, 85, 99] });
    
    y += rowH + 2;
    // Bottom border for row
    doc.setDrawColor(243, 244, 246); // gray-100
    doc.setLineWidth(0.2);
    doc.line(mL, y, W - mR, y);
    y += 4;
  });

  y += 5;
  
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
  if (profile.bankName) { T_txt(\`Bank Name: \${profile.bankName}\`, mL, lY, { size: 8, color: [75, 85, 99] }); lY += 4; }
  if (profile.accountNumber) { T_txt(\`Account No.: \${profile.accountNumber}\`, mL, lY, { size: 8, color: [75, 85, 99] }); lY += 4; }
  if (profile.ifsc) { T_txt(\`IFSC Code: \${profile.ifsc}\`, mL, lY, { size: 8, color: [75, 85, 99] }); lY += 4; }
  if (profile.upiId) { T_txt(\`UPI ID: \${profile.upiId}\`, mL, lY, { size: 8, color: [75, 85, 99] }); lY += 4; }
  
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
      // Find average tax % to display
      let taxPct = invoice.items.length > 0 ? (invoice.items[0].taxPercentage / 2) : 9;
      tRow(\`SGST (\${taxPct}%)\`, fmt(sgstTotal, ''));
      tRow(\`CGST (\${taxPct}%)\`, fmt(cgstTotal, ''));
  } else {
      let taxPct = invoice.items.length > 0 ? invoice.items[0].taxPercentage : 18;
      tRow(\`IGST (\${taxPct}%)\`, fmt(igstTotal, ''));
  }
  
  doc.setFillColor(248, 250, 252); // light background for total
  doc.rect(tLx - 5, rY - 4, totW + 5, 8, 'F');
  T_txt('TOTAL', tLx, rY + 1.5, { size: 10, bold: true, color: [17, 24, 39] });
  T_txt(\`\${sym} \${fmt(invoice.grandTotal, '')}\`, W - mR, rY + 1.5, { size: 10, bold: true, align: 'right', color: [17, 24, 39] });
  rY += 10;
  
  T_txt('Amount in Words:', W - mR, rY, { size: 8, bold: true, align: 'right', color: [17, 24, 39] }); rY += 4;
  doc.splitTextToSize(numberToWords(invoice.grandTotal), totW + 20).forEach((l:string) => {
      T_txt(l, W - mR, rY, { size: 8, align: 'right', color: [107, 114, 128] }); rY += 4;
  });
  
  rY += 20;
  T_txt('Authorized Signatory', W - mR, rY + 4, { size: 8, align: 'right', color: [156, 163, 175] });
  if (profile.signature) {
      try { doc.addImage(profile.signature, 'PNG', W - mR - 30, rY - 15, 30, 12); } catch(e){}
  }

  const totalPgs = doc.getNumberOfPages();
  for (let p = 1; p <= totalPgs; p++) {
    doc.setPage(p);
    pageFooter(p, totalPgs);
  }

  doc.save(\`\${invoice.invoiceNumber}.pdf\`);
}
`;

const startStr = 'export function exportInvoicePDF(invoice: Invoice, profile: BusinessProfile): void {';
const endStr = 'export function exportCollectiveReportPDF(';

const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    const before = content.substring(0, startIdx);
    let lastComment = content.lastIndexOf('// ═══════════════════════════════════════════════════════════════════════════════', endIdx);
    if (lastComment !== -1 && lastComment > startIdx) {
        const after = content.substring(lastComment);
        fs.writeFileSync(filePath, before + replacement + '\\n' + after, 'utf8');
        console.log("Replaced successfully.");
    } else {
        const after = content.substring(endIdx);
        fs.writeFileSync(filePath, before + replacement + '\\n' + after, 'utf8');
        console.log("Replaced successfully (no comment).");
    }
} else {
    console.error("Indices not found", startIdx, endIdx);
}
