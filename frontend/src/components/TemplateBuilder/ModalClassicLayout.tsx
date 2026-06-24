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
    minHeight: isPrintMode ? 'auto' : minHeight,
    padding: '40px',
    backgroundColor: '#ffffff',
    fontFamily: styleConfig.fontFamily || 'Inter',
    color: '#333',
    position: 'relative',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column'
  };

  const compName = businessProfile?.name || "Acme Design Studio";
  const compAddr = businessProfile?.address || "Platina Building, BKC, Bandra East\\nMumbai, Maharashtra, 400051\\nDelhi - 07";
  const compEmail = businessProfile?.email || "guest@makinvoice.local";
  const compPhone = businessProfile?.phone || "+91 9876543210";
  const compGst = businessProfile?.taxId || "27AAAAA1111A1Z1";
  
  const invNo = invoiceData?.invoiceNumber || "INV-2026-8528";
  const date = invoiceData?.date || "2026-06-22";
  const placeOfSupply = invoiceData?.placeOfSupply || "N/A";
  const grRrNo = invoiceData?.grRrNo || "N/A";
  const transport = invoiceData?.transport || "N/A";
  
  const vehicleNo = invoiceData?.vehicleNo || "N/A";
  const driverMobile = invoiceData?.driverMobile || "N/A";
  const station = invoiceData?.station || "N/A";
  const ewayBillNo = invoiceData?.ewayBillNo || "N/A";
  const poNumber = invoiceData?.poNumber || "N/A";
  
  const clientName = invoiceData?.clientName || "ABC";
  const clientPhone = invoiceData?.clientPhone || "N/A";
  const clientCountry = invoiceData?.clientCountry || "India";
  const clientState = invoiceData?.clientState || "N/A";
  const clientGstin = invoiceData?.clientGstin || "N/A";
  const clientAddress = invoiceData?.clientAddress || "N/A";

  const shipName = invoiceData?.shippedToName || clientName;
  const shipPhone = invoiceData?.shippedToPhone || clientPhone;
  const shipCountry = invoiceData?.shippedToCountry || clientCountry;
  const shipState = invoiceData?.shippedToState || clientState;
  const shipGstin = invoiceData?.shippedToGstin || clientGstin;
  const shipAddress = invoiceData?.shippedToAddress || clientAddress;

  const items = invoiceData?.items && invoiceData.items.length > 0 ? invoiceData.items : [
    { id: '1', name: 'New Item', quantity: 1, rate: 0.00, taxPercentage: 0, description: '' }
  ];

  const subTotal = invoiceData?.subtotal || 0;
  const taxTotal = invoiceData?.taxTotal || 0;
  const grandTotal = invoiceData?.grandTotal || 0;
  
  const rowStyle = "flex items-center text-[11px] mb-1.5";
  const labelStyle = "w-28 font-medium text-gray-700";
  const valStyle = "flex-1 text-gray-900";

  return (
    <div style={baseStyle} className="invoice-live-preview">
      {/* Header and Company */}
      {(sections.header?.visible !== false || sections.companyInfo?.visible !== false) && (
        <div className="flex justify-between items-start mb-6">
          <div style={{ textAlign: config.header.logoPosition === 'Center' ? 'center' : 'left', width: config.header.logoPosition === 'Center' ? '100%' : 'auto' }}>
            {sections.header?.visible !== false && config.header.showLogo && (
              <div style={{
                width: config.header.logoWidth, height: config.header.logoHeight, 
                background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                marginBottom: '10px', margin: config.header.logoPosition === 'Center' ? '0 auto 10px auto' : '0 0 10px 0'
              }} className="text-[12px] font-bold text-slate-400">LOGO</div>
            )}
            
            {sections.companyInfo?.visible !== false && (
              <>
                <h1 className="text-2xl font-bold text-gray-900 mb-1" style={{ color: styleConfig.primaryColor }}>{compName}</h1>
                <div className="text-[11px] text-gray-600 leading-relaxed">
                  {config.company.fields.includes('name') && <div>Owner: Guest User</div>}
                  {config.company.fields.includes('email') && <div>Email: {compEmail}</div>}
                  {config.company.fields.includes('phone') && <div>Phone: {compPhone}</div>}
                  {config.company.fields.includes('address') && <div className="whitespace-pre-wrap">{compAddr}</div>}
                  {config.company.fields.includes('gstin') && <div>GSTIN: {compGst}</div>}
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
        <div className="flex border border-gray-300 mb-6">
          <div className="w-1/2 border-r border-gray-300 p-2.5">
            {sections.billTo?.visible !== false && (
              <>
                <h3 className="font-bold text-[11px] text-gray-800 uppercase mb-2">BILLED TO</h3>
                {config.client.fields.includes('name') && <div className="text-[12px] font-medium text-gray-900 mb-1">{clientName}</div>}
                {config.client.fields.includes('phone') && <div className={rowStyle}><span className={labelStyle}>Party Mobile No</span><span className="mr-2">:</span><span className={valStyle}>{clientPhone}</span></div>}
                <div className={rowStyle}><span className={labelStyle}>Country</span><span className="mr-2">:</span><span className={valStyle}>{clientCountry}</span></div>
                <div className={rowStyle}><span className={labelStyle}>State</span><span className="mr-2">:</span><span className={valStyle}>{clientState}</span></div>
                {config.client.fields.includes('address') && <div className={rowStyle}><span className={labelStyle}>Address</span><span className="mr-2">:</span><span className={valStyle}>{clientAddress}</span></div>}
                {config.client.fields.includes('gstin') && <div className={rowStyle}><span className={labelStyle}>GSTIN / UIN</span><span className="mr-2">:</span><span className={valStyle}>{clientGstin}</span></div>}
              </>
            )}
          </div>
          <div className="w-1/2 p-2.5">
            {sections.shipTo?.visible !== false && (
              <>
                <h3 className="font-bold text-[11px] text-gray-800 uppercase mb-2">SHIPPED TO</h3>
                {config.shipping.fields.includes('name') && <div className="text-[12px] font-medium text-gray-900 mb-1">{shipName}</div>}
                {config.shipping.fields.includes('phone') && <div className={rowStyle}><span className={labelStyle}>Party Mobile No</span><span className="mr-2">:</span><span className={valStyle}>{shipPhone}</span></div>}
                <div className={rowStyle}><span className={labelStyle}>Country</span><span className="mr-2">:</span><span className={valStyle}>{shipCountry}</span></div>
                <div className={rowStyle}><span className={labelStyle}>State</span><span className="mr-2">:</span><span className={valStyle}>{shipState}</span></div>
                {config.shipping.fields.includes('address') && <div className={rowStyle}><span className={labelStyle}>Address</span><span className="mr-2">:</span><span className={valStyle}>{shipAddress}</span></div>}
                {config.shipping.fields.includes('gstin') && <div className={rowStyle}><span className={labelStyle}>GSTIN / UIN</span><span className="mr-2">:</span><span className={valStyle}>{shipGstin}</span></div>}
              </>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      {sections.productTable?.visible !== false && (
        <table className="w-full mb-6 text-left border-collapse border border-gray-300">
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
                  {config.table.columns.find(c => c.id === 'rate')?.visible && <td className="py-3 px-3 text-center border-r border-gray-300 text-gray-600">{item.rate.toFixed(2)}</td>}
                  {config.table.columns.find(c => c.id === 'tax')?.visible && <td className="py-3 px-3 text-center border-r border-gray-300 text-gray-500">{item.taxPercentage}%</td>}
                  {config.table.columns.find(c => c.id === 'amount')?.visible && <td className="py-3 px-3 text-right border-r border-gray-300 font-bold">{amt.toFixed(2)}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Footer */}
      <div className="flex justify-between items-start pt-2 border-t border-gray-300 mt-auto">
        <div className="w-7/12 pr-6 space-y-4">
          {sections.terms?.visible !== false && (
            <>
              <div>
                <div className="font-bold text-gray-800 text-[10px] uppercase mb-1">Notes</div>
                <div className="text-gray-600 text-[10px] leading-relaxed">Thank you for your business!</div>
              </div>
              <div>
                <div className="font-bold text-gray-800 text-[10px] mb-1">Terms & Conditions</div>
                <div className="text-gray-600 text-[10px] leading-relaxed">{config.terms.customText || "Standard Net-15 terms apply. Unresolved overdue balances are subject to three times the bank rate penalties under Indian MSME guidelines."}</div>
              </div>
            </>
          )}
          {sections.payment?.visible !== false && (
            <div>
              <div className="font-bold text-gray-800 text-[10px] mb-1">Banking Information</div>
              <div className="text-gray-600 text-[10px] leading-relaxed whitespace-pre-wrap">
                {config.payment.customNote || "Bank Name: Axis\nAccount No.: 098654345678\nIFSC Code: UTIB00056\nUPI ID: 9876543@upi"}
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
              {config.tax.showIgst && (
                <div className="flex justify-between text-gray-600 border-b border-gray-200 pb-2">
                  <span>IGST ({items[0]?.taxPercentage || 0}%)</span>
                  <span>{taxTotal.toFixed(2)}</span>
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
