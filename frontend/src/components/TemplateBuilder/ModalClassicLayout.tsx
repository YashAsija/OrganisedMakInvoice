import React from 'react';
import { InvoiceTemplate, Invoice, BusinessProfile } from '../../types';

interface LivePreviewProps {
  template: InvoiceTemplate;
  isPrintMode?: boolean;
  invoiceData?: Invoice;
  businessProfile?: BusinessProfile;
  currencySymbol?: string;
}

export const ModalClassicLayout: React.FC<LivePreviewProps> = ({ template, isPrintMode = false, invoiceData, businessProfile, currencySymbol = '₹' }) => {
  const { styleConfig, config, sections } = template;
  
  const width = template.layout.pageSize === 'A4' ? '794px' : '816px';
  const minHeight = template.layout.pageSize === 'A4' ? '1123px' : '1056px';

  const baseStyle: React.CSSProperties = {
    width: isPrintMode ? '100%' : width,
    minHeight: minHeight,
    paddingTop: '40px',
    paddingLeft: '40px',
    paddingRight: '40px',
    paddingBottom: '15px',
    backgroundColor: '#ffffff',
    fontFamily: styleConfig.fontFamily || 'Inter',
    color: '#333',
    position: 'relative',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column'
  };

  const compName = businessProfile?.name || "";
  const compAddr = businessProfile?.address || "";
  const compEmail = businessProfile?.email || "";
  const compPhone = businessProfile?.phone || (businessProfile as any)?.mobile || "";
  const compGst = businessProfile?.taxId || (businessProfile as any)?.gstin || "";
  const compPan = businessProfile?.pan || "";
  const ownerName = businessProfile?.displayName || businessProfile?.ownerName || "";
  const compState = (businessProfile as any)?.state || "";
  const compStateCode = (businessProfile as any)?.stateCode || "";
  const compCountry = (businessProfile as any)?.country || "";
  
  const invNo = invoiceData?.invoiceNumber || "INV-2026-8528";
  const rawType = (invoiceData?.invoiceType || '').toLowerCase().trim();
  const isPurchase = ['purchases', 'purchase_bill', 'purchase', 'purchase_order', 'po', 'purchase_debit_note', 'purchase_dn'].includes(rawType) ||
                    (invoiceData?.embeddedTemplate?.config?.header?.invoiceTitle || '').toLowerCase().includes('purchase');
  const date = invoiceData?.date || "";
  const placeOfSupply = invoiceData?.placeOfSupply || "";
  const grRrNo = invoiceData?.grRrNo || "";
  const transport = invoiceData?.transport || "";
  
  const vehicleNo = invoiceData?.vehicleNo || "";
  const driverMobile = invoiceData?.driverMobile || "";
  const station = invoiceData?.station || "";
  const ewayBillNo = invoiceData?.ewayBillNo || "";
  const poNumber = invoiceData?.poNumber || "";
  
  const clientName = invoiceData?.clientName || "";
  const clientPhone = invoiceData?.clientPhone || "";
  const clientCountry = invoiceData?.clientCountry || "";
  const clientState = invoiceData?.clientState || "";
  const clientGstin = invoiceData?.clientGstin || "";
  const clientAddress = invoiceData?.clientAddress || "";

  const shipName = invoiceData?.shippedToName || clientName;
  const shipPhone = invoiceData?.shippedToPhone || clientPhone;
  const shipCountry = invoiceData?.shippedToCountry || clientCountry;
  const shipState = invoiceData?.shippedToState || clientState;
  const shipGstin = invoiceData?.shippedToGstin || clientGstin;
  const shipAddress = invoiceData?.shippedToAddress || clientAddress;

  const items = invoiceData?.items && invoiceData.items.length > 0 ? invoiceData.items : [];

  const subTotal = invoiceData?.subtotal || 0;

  // Compute the same dynamic tax header as LivePreview — determines CGST+SGST vs IGST
  const taxMode = invoiceData?.taxMode || (businessProfile as any)?.taxMode || 'dynamic';
  const taxName = taxMode === 'custom'
    ? (invoiceData?.customTaxName || (businessProfile as any)?.customTaxName || 'Tax')
    : 'GST';
  const taxRate = taxMode === 'custom'
    ? ((invoiceData as any)?.customTaxPercentage !== undefined ? (invoiceData as any).customTaxPercentage : ((businessProfile as any)?.customTaxPercentage !== undefined ? (businessProfile as any).customTaxPercentage : 18))
    : ((invoiceData as any)?.taxRate !== undefined ? (invoiceData as any).taxRate : ((businessProfile as any)?.defaultTaxRate !== undefined ? (businessProfile as any).defaultTaxRate : 18));
  
  const hasTaxCol = (config.table.columns || []).some((c: any) => c.id === 'tax' && c.visible !== false);
  const isTaxEngineVisible = sections.taxEngine?.visible !== false;
  const isTaxPresent = hasTaxCol && isTaxEngineVisible;

  const taxAmount = isTaxPresent
    ? (invoiceData?.taxTotal !== undefined ? invoiceData.taxTotal : (subTotal * taxRate) / 100)
    : 0;

  const grandTotal = isTaxPresent
    ? (invoiceData?.grandTotal !== undefined ? invoiceData.grandTotal : subTotal + taxAmount)
    : subTotal;

  const shipStateForTax = ((invoiceData as any)?.shippedToState || invoiceData?.clientState || '').trim().toLowerCase();
  const compCountryForTax = ((businessProfile as any)?.country || 'india').trim().toLowerCase();
  const compStateForTax = ((businessProfile as any)?.state || '').trim().toLowerCase();

  let dynamicTaxHeader = 'TAX %';
  if (taxMode === 'custom') {
    dynamicTaxHeader = `${taxName} (${taxRate}%)`;
  } else if ((compCountryForTax === 'india' || compCountryForTax === 'in') && shipStateForTax === compStateForTax && shipStateForTax !== '') {
    dynamicTaxHeader = `CGST + SGST (${taxRate}%)`;
  } else {
    dynamicTaxHeader = `IGST (${taxRate}%)`;
  }

  const isCgstSgst = dynamicTaxHeader.toUpperCase().startsWith('CGST');
  const isIgst = dynamicTaxHeader.toUpperCase().startsWith('IGST');
  const isCustomTax = taxMode === 'custom';
  
  const rowStyle = "flex items-center text-[11px] mb-0.5";
  const labelStyle = "w-28 font-medium text-gray-700";
  const valStyle = "flex-1 text-gray-900";

  return (
    <div style={baseStyle} className="invoice-live-preview paper-sheet-light">
      {/* Header and Company */}
      {(sections.header?.visible !== false || sections.companyInfo?.visible !== false) && (
        <div className="flex justify-between items-start mb-3">
          <div style={{ textAlign: config.header.logoPosition === 'Center' ? 'center' : 'left', width: config.header.logoPosition === 'Center' ? '100%' : 'auto' }}>
            {sections.header?.visible !== false && config.header.showLogo && businessProfile?.logoUrl && (
              <div style={{
                width: config.header.logoWidth * 1.4, height: config.header.logoHeight * 1.4, 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                marginBottom: '10px', margin: config.header.logoPosition === 'Center' ? '0 auto 10px auto' : '0 0 10px 0',
                overflow: 'hidden'
              }}>
                <img 
                  src={businessProfile.logoUrl} 
                  alt="Company Logo" 
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              </div>
            )}
            
            {sections.companyInfo?.visible !== false && (
              <>
                {compName && <h1 className="text-2xl font-bold text-gray-900 mb-1" style={{ color: styleConfig.primaryColor }}>{compName}</h1>}
                <div className="text-[11px] text-gray-600 leading-relaxed">
                  {config.company.fields.includes('name') && ownerName && ownerName.trim() !== '' && <div>Owner: {ownerName}</div>}
                  {config.company.fields.includes('email') && compEmail && compEmail.trim() !== '' && <div>Email: {compEmail}</div>}
                  {config.company.fields.includes('phone') && compPhone && compPhone.trim() !== '' && <div>Phone: {compPhone}</div>}
                  {config.company.fields.includes('address') && compAddr && compAddr.trim() !== '' && <div className="whitespace-pre-wrap">{compAddr}</div>}
                  {config.company.fields.includes('state') && compState.trim() !== '' && <div>State: {compState}{compStateCode.trim() !== '' ? ` (${compStateCode})` : ''}</div>}
                  {config.company.fields.includes('country') && compCountry.trim() !== '' && <div>Country: {compCountry}</div>}
                  {config.company.fields.includes('gstin') && compGst && compGst.trim() !== '' && <div>GSTIN: {compGst}</div>}
                  {config.company.fields.includes('pan') && compPan && compPan.trim() !== '' && <div>PAN: {compPan}</div>}
                  {config.company.fields.includes('website') && (businessProfile as any)?.website && (businessProfile as any)?.website.trim() !== '' && <div>Website: {(businessProfile as any).website}</div>}
                </div>
              </>
            )}
          </div>
          
          {sections.header?.visible !== false && config.header.logoPosition !== 'Center' && (
            <div className="text-right">
              <h1 className="text-3xl font-bold tracking-wider text-gray-900 uppercase" style={{ color: styleConfig.primaryColor }}>{config.header.invoiceTitle}</h1>
            </div>
          )}
        </div>
      )}

      {/* Invoice Details */}
      {sections.invoiceInfo?.visible !== false && (
        <div className="flex border border-gray-300 mb-1">
          <div className="w-1/2 border-r border-gray-300 p-2.5">
            {config.invoiceInfo.fields.includes('invoiceNumber') && <div className={rowStyle}><span className={labelStyle}>Invoice No.</span><span className="mr-2">:</span><span className={valStyle}>{invNo}</span></div>}
            {config.invoiceInfo.fields.includes('invoiceDate') && <div className={rowStyle}><span className={labelStyle}>Dated</span><span className="mr-2">:</span><span className={valStyle}>{date}</span></div>}
            <div className={rowStyle}><span className={labelStyle}>Place Of Supply</span><span className="mr-2">:</span><span className={valStyle}>{placeOfSupply}</span></div>
            <div className={rowStyle}><span className={labelStyle}>GR/RR No.</span><span className="mr-2">:</span><span className={valStyle}>{grRrNo}</span></div>
            <div className={rowStyle}><span className={labelStyle}>Transport</span><span className="mr-2">:</span><span className={valStyle}>{transport}</span></div>
          </div>
          <div className="w-1/2 p-2.5">
            <div className={rowStyle}><span className={labelStyle}>Vehicle No.</span><span className="mr-2">:</span><span className={valStyle}>{vehicleNo}</span></div>
            <div className={rowStyle}><span className={labelStyle}>Driver Mobile</span><span className="mr-2">:</span><span className={valStyle}>{driverMobile}</span></div>
            <div className={rowStyle}><span className={labelStyle}>Station</span><span className="mr-2">:</span><span className={valStyle}>{station}</span></div>
            <div className={rowStyle}><span className={labelStyle}>E-Way Bill No.</span><span className="mr-2">:</span><span className={valStyle}>{ewayBillNo}</span></div>
            {config.invoiceInfo.fields.includes('poNumber') && <div className={rowStyle}><span className={labelStyle}>Purchase Order</span><span className="mr-2">:</span><span className={valStyle}>{poNumber}</span></div>}
          </div>
        </div>
      )}

      {/* Parties */}
      {(sections.billTo?.visible !== false || sections.shipTo?.visible !== false) && (
        <div className="flex border border-gray-300 mb-3">
          <div className="w-1/2 border-r border-gray-300 p-2.5">
            {sections.billTo?.visible !== false && (
              <>
                <h3 className="font-bold text-[11px] text-gray-800 uppercase mb-2 whitespace-nowrap">{isPurchase ? 'BILL FROM' : 'BILLED TO'}</h3>
                {(config.client.fields.includes('companyName') || config.client.fields.includes('company') || !!((invoiceData as any)?.clientCompanyName || (invoiceData as any)?.clientCompany)) ? (
                  <>
                    {!!((invoiceData as any)?.clientCompanyName || (invoiceData as any)?.clientCompany) && (
                      <div className="text-[12px] font-bold text-gray-900 mb-1">{(invoiceData as any)?.clientCompanyName || (invoiceData as any)?.clientCompany}</div>
                    )}
                    {(config.client.fields.includes('name') || config.client.fields.includes('partyName')) && (
                      <div className={rowStyle}><span className={labelStyle}>Customer Name</span><span className="mr-2">:</span><span className={valStyle}>{clientName}</span></div>
                    )}
                  </>
                ) : (
                  (config.client.fields.includes('name') || config.client.fields.includes('partyName')) && (
                    <div className="text-[12px] font-bold text-gray-900 mb-1">{clientName}</div>
                  )
                )}
                {config.client.fields.includes('phone') && <div className={rowStyle}><span className={labelStyle}>Customer Mobile No</span><span className="mr-2">:</span><span className={valStyle}>{clientPhone}</span></div>}
                {config.client.fields.includes('address') && (
                  <>
                    <div className={rowStyle}><span className={labelStyle}>Country</span><span className="mr-2">:</span><span className={valStyle}>{clientCountry}</span></div>
                    <div className={rowStyle}><span className={labelStyle}>State</span><span className="mr-2">:</span><span className={valStyle}>{clientState}</span></div>
                    <div className={rowStyle}><span className={labelStyle}>Address</span><span className="mr-2">:</span><span className={valStyle}>{clientAddress}</span></div>
                  </>
                )}
                {config.client.fields.includes('gstin') && <div className={rowStyle}><span className={labelStyle}>GSTIN / UIN</span><span className="mr-2">:</span><span className={valStyle}>{clientGstin}</span></div>}
                {config.client.fields.includes('pan') && <div className={rowStyle}><span className={labelStyle}>PAN</span><span className="mr-2">:</span><span className={valStyle}>{invoiceData?.clientPan || 'ABCDE1234F'}</span></div>}
              </>
            )}
          </div>
          <div className="w-1/2 p-2.5">
            {sections.shipTo?.visible !== false && (
              <>
                <h3 className="font-bold text-[11px] text-gray-800 uppercase mb-2 whitespace-nowrap">{isPurchase ? 'SHIP FROM' : 'SHIPPED TO'}</h3>
                {(config.shipping.fields.includes('companyName') || config.shipping.fields.includes('company') || !!((invoiceData as any)?.shippedToCompanyName || (invoiceData as any)?.shippedToCompany)) ? (
                  <>
                    {!!((invoiceData as any)?.shippedToCompanyName || (invoiceData as any)?.shippedToCompany) && (
                      <div className="text-[12px] font-bold text-gray-900 mb-1">{(invoiceData as any)?.shippedToCompanyName || (invoiceData as any)?.shippedToCompany}</div>
                    )}
                    {(config.shipping.fields.includes('name') || config.shipping.fields.includes('partyName')) && (
                      <div className={rowStyle}><span className={labelStyle}>Customer Name</span><span className="mr-2">:</span><span className={valStyle}>{shipName}</span></div>
                    )}
                  </>
                ) : (
                  (config.shipping.fields.includes('name') || config.shipping.fields.includes('partyName')) && (
                    <div className="text-[12px] font-bold text-gray-900 mb-1">{shipName}</div>
                  )
                )}
                {config.shipping.fields.includes('phone') && <div className={rowStyle}><span className={labelStyle}>Customer Mobile No</span><span className="mr-2">:</span><span className={valStyle}>{shipPhone}</span></div>}
                 {config.shipping.fields.includes('address') && (
                   <>
                     <div className={rowStyle}><span className={labelStyle}>Country</span><span className="mr-2">:</span><span className={valStyle}>{shipCountry}</span></div>
                     <div className={rowStyle}><span className={labelStyle}>State</span><span className="mr-2">:</span><span className={valStyle}>{shipState}</span></div>
                     <div className={rowStyle}><span className={labelStyle}>Address</span><span className="mr-2">:</span><span className={valStyle}>{shipAddress}</span></div>
                   </>
                 )}
                {config.shipping.fields.includes('gstin') && <div className={rowStyle}><span className={labelStyle}>GSTIN / UIN</span><span className="mr-2">:</span><span className={valStyle}>{shipGstin}</span></div>}
                {config.shipping.fields.includes('pan') && <div className={rowStyle}><span className={labelStyle}>PAN</span><span className="mr-2">:</span><span className={valStyle}>{invoiceData?.shippedToPan || 'WXYZ9876E'}</span></div>}
              </>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      {sections.productTable?.visible !== false && (
        <table className="w-full mb-3 text-left border-collapse border border-gray-300">
          <thead>
            <tr className="text-white text-[10px] uppercase tracking-wide" style={{ backgroundColor: styleConfig.tableHeaderBackground, color: styleConfig.tableHeaderTextColor }}>
              <th className="py-2.5 px-3 border border-gray-300 w-10 text-center">SL</th>
              {config.table.columns.find(c => c.id === 'name')?.visible && <th className="py-2.5 px-3 border border-gray-300 text-left">{config.table.columns.find(c => c.id === 'name')?.label || 'ITEM DESCRIPTION'}</th>}
              {config.table.columns.find(c => c.id === 'quantity')?.visible && <th className="py-2.5 px-3 border border-gray-300 w-16 text-center">{config.table.columns.find(c => c.id === 'quantity')?.label || 'QTY'}</th>}
              {config.table.columns.find(c => c.id === 'rate')?.visible && <th className="py-2.5 px-3 border border-gray-300 w-24 text-center">{config.table.columns.find(c => c.id === 'rate')?.label || 'RATE'}</th>}
              {config.table.columns.find(c => c.id === 'tax')?.visible && <th className="py-2.5 px-3 border border-gray-300 w-24 text-center">{config.table.columns.find(c => c.id === 'tax')?.label || 'IGST%'}</th>}
              {config.table.columns.find(c => c.id === 'amount')?.visible && <th className="py-2.5 px-3 border border-gray-300 w-28 text-right">{config.table.columns.find(c => c.id === 'amount')?.label || 'AMOUNT'}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {items.map((item, idx) => {
              const amt = item.quantity * item.rate;
              return (
                <tr key={idx} className="align-top text-[11px]">
                  <td className="py-3 px-3 text-center border-r border-gray-300 text-gray-500">{idx + 1}</td>
                  {config.table.columns.find(c => c.id === 'name')?.visible && (
                    <td className="py-3 px-3 border-r border-gray-300">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      {item.description && <div className="text-[10px] text-gray-500 mt-0.5">{item.description}</div>}
                    </td>
                  )}
                  {config.table.columns.find(c => c.id === 'quantity')?.visible && <td className="py-3 px-3 text-center font-bold border-r border-gray-300">{item.quantity}</td>}
                  {config.table.columns.find(c => c.id === 'rate')?.visible && <td className="py-3 px-3 text-right border-r border-gray-300 text-gray-600 font-bold">{currencySymbol}{item.rate.toFixed(2)}</td>}
                  {config.table.columns.find(c => c.id === 'tax')?.visible && <td className="py-3 px-3 text-right border-r border-gray-300 text-gray-500 font-bold">{item.taxPercentage}%</td>}
                  {config.table.columns.find(c => c.id === 'amount')?.visible && <td className="py-3 px-3 text-right border-r border-gray-300 font-bold">{currencySymbol}{amt.toFixed(2)}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Footer */}
      <div className="flex justify-between items-start pt-2 border-t border-gray-300 mt-auto">
        <div className="w-7/12 pr-6 space-y-4">
          {sections.terms?.visible !== false && (config.terms.showNotes !== false || config.terms.showTerms !== false) && (
            <>
              {config.terms.showNotes !== false && (
                <div>
                  <div className="font-bold text-gray-800 text-[10px] uppercase mb-1">Notes</div>
                  <div className="text-gray-600 text-[10px] leading-relaxed">{invoiceData?.notes || config.terms.notesText || "Thank you for your business!"}</div>
                </div>
              )}
              {config.terms.showTerms !== false && (
                <div>
                  <div className="font-bold text-gray-800 text-[10px] mb-1">Terms & Conditions</div>
                  <div className="text-gray-600 text-[10px] leading-relaxed">{config.terms.customText || "Standard Net-15 terms apply. Unresolved overdue balances are subject to three times the bank rate penalties under Indian MSME guidelines."}</div>
                </div>
              )}
            </>
          )}
          {sections.payment?.visible !== false && (
            <div>
              <div className="font-bold text-gray-800 text-[10px] mb-1">Banking Information</div>
              <div className="text-gray-600 text-[10px] leading-relaxed whitespace-pre-wrap">
                {(() => {
                  const parts = [];
                  if (businessProfile?.bankName) parts.push(`Bank Name: ${businessProfile.bankName}`);
                  if (businessProfile?.accountNumber) parts.push(`Account No.: ${businessProfile.accountNumber}`);
                  if (businessProfile?.ifsc) parts.push(`IFSC Code: ${businessProfile.ifsc}`);
                  if (businessProfile?.upiId) parts.push(`UPI ID: ${businessProfile.upiId}`);
                  
                  if (parts.length > 0) {
                    if (config.payment.customNote) {
                      return `${parts.join('\n')}\nNote: ${config.payment.customNote}`;
                    }
                    return parts.join('\n');
                  }
                  
                  return config.payment.customNote || "Bank Name: Axis\nAccount No.: 098654345678\nIFSC Code: UTIB00056\nUPI ID: 9876543@upi";
                })()}
              </div>
            </div>
          )}
        </div>
        
        <div className="w-5/12 space-y-2 text-[11px]">
          {sections.taxEngine?.visible !== false && (
            <>
              {config.tax.showTotal && (
                <div className="flex justify-between text-gray-600">
                  <span>Sub Total</span>
                  <span>{subTotal.toFixed(2)}</span>
                </div>
              )}
              {(invoiceData?.isFreightAdded || (invoiceData?.freightCharges || 0) > 0) && (
                <div className="flex justify-between text-gray-600">
                  <span>Freight Charges</span>
                  <span>+{currencySymbol}{(invoiceData?.freightCharges || 0).toFixed(2)}</span>
                </div>
              )}
              {(invoiceData?.discountType !== 'none' || (invoiceData?.discountValue || 0) > 0) && (
                <div className="flex justify-between text-rose-500 font-medium">
                  <span>Discount {invoiceData?.discountType === 'percent' ? `(${invoiceData?.discountValue}%)` : '(Flat)'}</span>
                  <span>-{currencySymbol}{(invoiceData?.discountTotal || invoiceData?.discountValue || 0).toFixed(2)}</span>
                </div>
              )}
              {isCustomTax ? (
                <div className="flex justify-between text-gray-600 border-b border-gray-200 pb-2">
                  <span>{taxName} ({taxRate}%)</span>
                  <span>{taxAmount.toFixed(2)}</span>
                </div>
              ) : isCgstSgst ? (
                <>
                  <div className="flex justify-between text-gray-600">
                    <span>CGST ({taxRate / 2}%)</span>
                    <span>{(taxAmount / 2).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 border-b border-gray-200 pb-2">
                    <span>SGST ({taxRate / 2}%)</span>
                    <span>{(taxAmount / 2).toFixed(2)}</span>
                  </div>
                </>
              ) : isIgst ? (
                <div className="flex justify-between text-gray-600 border-b border-gray-200 pb-2">
                  <span>IGST ({taxRate}%)</span>
                  <span>{taxAmount.toFixed(2)}</span>
                </div>
              ) : (
                <div className="flex justify-between text-gray-600 border-b border-gray-200 pb-2">
                  <span>{dynamicTaxHeader}</span>
                  <span>{taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-900 font-bold text-[14px] pt-1">
                <span>TOTAL</span>
                <span>{currencySymbol} {grandTotal.toFixed(2)}</span>
              </div>
            </>
          )}
          {sections.amountInWords?.visible !== false && config.amountInWords.enabled && (
            <div className="text-right pt-4">
              <div className="font-bold text-[10px] text-gray-800">Amount in Words:</div>
              <div className="text-[10px] text-gray-500 italic">Zero Only</div>
            </div>
          )}
        </div>
      </div>
      
      {sections.signature?.visible !== false && config.signature.showSignature && (
        <div className="text-right mt-12 text-[10px] text-gray-400">
          {config.signature.signatoryName || "Authorized Signatory"}
        </div>
      )}
    </div>
  );
};
