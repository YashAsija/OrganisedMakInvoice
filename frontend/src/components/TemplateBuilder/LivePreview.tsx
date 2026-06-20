import React from 'react';
import { InvoiceTemplate, Invoice, BusinessProfile } from '../../types';

interface LivePreviewProps {
  template: InvoiceTemplate;
  isPrintMode?: boolean;
  invoiceData?: Invoice;
  businessProfile?: BusinessProfile;
  currencySymbol?: string;
}

export const LivePreview: React.FC<LivePreviewProps> = ({ template, isPrintMode = false, invoiceData, businessProfile, currencySymbol = '₹' }) => {
  const { layout, config, styleConfig, sections } = template;
  
  const width = layout.pageSize === 'A4' ? '794px' : '816px';
  const minHeight = layout.pageSize === 'A4' ? '1123px' : '1056px';
  
  const getPadding = () => {
    switch (layout.margins) {
      case 'Compact': return '20px';
      case 'Wide': return '60px';
      case 'Custom': return '40px';
      case 'Standard':
      default: return '40px';
    }
  };

  const getBorderRadius = () => styleConfig.roundedCorners ? '8px' : '0';
  
  const baseStyle: React.CSSProperties = {
    width: isPrintMode ? '100%' : width,
    minHeight: isPrintMode ? 'auto' : minHeight,
    padding: getPadding(),
    backgroundColor: '#ffffff',
    fontFamily: styleConfig.fontFamily,
    color: '#333',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: isPrintMode ? 'none' : '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
    transform: isPrintMode ? 'none' : 'scale(var(--preview-scale, 1))',
    transformOrigin: 'top center',
    margin: isPrintMode ? '0' : '0 auto',
  };

  const orderedSections = Object.values(sections)
    .filter(s => s.visible)
    .sort((a, b) => a.order - b.order);

  const getSectionStyle = (sectionId: string): React.CSSProperties => {
    const bg = styleConfig.sectionBackgroundColors[sectionId];
    return {
      backgroundColor: bg || 'transparent',
      borderRadius: getBorderRadius(),
      padding: bg ? '15px' : '0',
      marginBottom: styleConfig.spacing === 'Compact' ? '10px' : styleConfig.spacing === 'Spacious' ? '30px' : '20px',
      gridColumn: `span ${sections[sectionId as keyof typeof sections].gridColumnSpan} / span ${sections[sectionId as keyof typeof sections].gridColumnSpan}`
    };
  };

  // Safe data getters
  const compName = (businessProfile as any)?.name || (businessProfile as any)?.companyName || 'Company Name';
  const compAddr = businessProfile?.address || '123 Business Street, Tech Park, City - 400001';
  const compGst = (businessProfile as any)?.taxId || (businessProfile as any)?.gstin || '27AADCB2230M1Z2';
  const compPhone = businessProfile?.phone || '+91 9876543210';
  const compEmail = businessProfile?.email || 'contact@company.com';
  const compLogo = (businessProfile as any)?.logoUrl || (businessProfile as any)?.logo || null;
  
  const invNo = invoiceData?.invoiceNumber || 'INV-2023-001';
  const invDate = invoiceData?.date || '21-Jun-2026';
  const dueDate = invoiceData?.dueDate || '21-Jul-2026';
  
  const clientName = invoiceData?.clientName || 'Client Company Name';
  const clientAddr = invoiceData?.clientAddress || '456 Client Avenue, Block B, State - 100002';
  const clientGst = (invoiceData as any)?.clientGstin || (invoiceData as any)?.clientTaxId || '07AABCB2230M1Z2';
  const clientPhone = invoiceData?.clientPhone || '+91 1122334455';
  
  const items = invoiceData?.items || [
     { id: '1', name: 'Professional Services', quantity: 40, rate: 1500, discount: 0, amount: 60000 },
     { id: '2', name: 'Software License', quantity: 1, rate: 25000, discount: 0, amount: 25000 }
  ];

  const subTotal = items.reduce((a, b) => a + ((b as any).amount || ((b as any).quantity * (b as any).rate) || 0), 0);
  const taxAmount = (subTotal * ((invoiceData as any)?.taxRate || 18)) / 100;
  const grandTotal = subTotal + taxAmount;

  return (
    <div style={baseStyle} className="invoice-live-preview">
      {layout.watermark.enabled && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: layout.watermark.opacity,
          transform: `rotate(${layout.watermark.rotation}deg)`,
          fontSize: '120px',
          fontWeight: 'bold',
          color: styleConfig.primaryColor,
          pointerEvents: 'none',
          zIndex: 0
        }}>
          {layout.watermark.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '20px', position: 'relative', zIndex: 1 }}>
        
        {orderedSections.map(section => {
          if (section.id === 'header') {
            return (
              <div key="header" style={getSectionStyle('header')} className="flex items-center justify-between">
                {config.header.logoPosition === 'Left' && config.header.showLogo && (
                  <div style={{ width: config.header.logoWidth, height: config.header.logoHeight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     {compLogo ? <img src={compLogo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <div style={{width:'100%', height:'100%', backgroundColor: '#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8', fontSize:'12px'}}>LOGO</div>}
                  </div>
                )}
                
                <div style={{ flex: 1, textAlign: config.header.titleAlignment === 'Right' ? 'right' : config.header.titleAlignment === 'Left' ? 'left' : 'center' }}>
                  <h1 style={{ color: styleConfig.primaryColor, fontSize: '32px', margin: 0, fontWeight: 'bold' }}>{config.header.invoiceTitle}</h1>
                </div>

                {config.header.logoPosition === 'Right' && config.header.showLogo && (
                  <div style={{ width: config.header.logoWidth, height: config.header.logoHeight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     {compLogo ? <img src={compLogo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <div style={{width:'100%', height:'100%', backgroundColor: '#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8', fontSize:'12px'}}>LOGO</div>}
                  </div>
                )}
              </div>
            );
          }

          if (section.id === 'companyInfo') {
            return (
              <div key="companyInfo" style={getSectionStyle('companyInfo')}>
                 <h3 style={{ fontWeight: 'bold', fontSize: '16px', color: styleConfig.primaryColor, marginBottom: '5px' }}>{compName}</h3>
                 {config.company.fields.includes('address') && <p style={{ fontSize: '12px', margin: '2px 0', whiteSpace: 'pre-wrap' }}>{compAddr}</p>}
                 {config.company.fields.includes('gstin') && compGst && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>GSTIN:</strong> {compGst}</p>}
                 {config.company.fields.includes('phone') && compPhone && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Phone:</strong> {compPhone}</p>}
                 {config.company.fields.includes('email') && compEmail && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Email:</strong> {compEmail}</p>}
              </div>
            );
          }
          
          if (section.id === 'invoiceInfo') {
             return (
              <div key="invoiceInfo" style={{ ...getSectionStyle('invoiceInfo'), textAlign: config.invoiceInfo.position === 'Right' ? 'right' : config.invoiceInfo.position === 'Left' ? 'left' : 'center' }}>
                 <h3 style={{ fontWeight: 'bold', fontSize: '16px', color: styleConfig.primaryColor, marginBottom: '5px' }}>Invoice Details</h3>
                 {config.invoiceInfo.fields.includes('invoiceNumber') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Inv No:</strong> {invNo}</p>}
                 {config.invoiceInfo.fields.includes('invoiceDate') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Date:</strong> {invDate}</p>}
                 {config.invoiceInfo.fields.includes('dueDate') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Due Date:</strong> {dueDate}</p>}
                 {config.invoiceInfo.customFields.map(f => (
                   <p key={f.id} style={{ fontSize: '12px', margin: '2px 0' }}><strong>{f.label}:</strong> {f.value}</p>
                 ))}
              </div>
             );
          }

          if (section.id === 'billTo') {
             return (
              <div key="billTo" style={getSectionStyle('billTo')}>
                 <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>Bill To</h4>
                 <h3 style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>{clientName}</h3>
                 {config.client.fields.includes('address') && <p style={{ fontSize: '12px', margin: '2px 0', whiteSpace: 'pre-wrap' }}>{clientAddr}</p>}
                 {config.client.fields.includes('gstin') && clientGst && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>GSTIN:</strong> {clientGst}</p>}
                 {config.client.fields.includes('phone') && clientPhone && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Phone:</strong> {clientPhone}</p>}
              </div>
             );
          }
          
          if (section.id === 'shipTo') {
             return (
              <div key="shipTo" style={getSectionStyle('shipTo')}>
                 <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>Ship To</h4>
                 {config.shipping.sameAsBilling ? (
                    <p style={{ fontSize: '12px', margin: '2px 0', fontStyle: 'italic', color: '#94a3b8' }}>Same as Billing Address</p>
                 ) : (
                   <>
                     <h3 style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>{(invoiceData as any)?.shippingName || clientName}</h3>
                     {config.shipping.fields.includes('address') && <p style={{ fontSize: '12px', margin: '2px 0', whiteSpace: 'pre-wrap' }}>{(invoiceData as any)?.shippingAddress || clientAddr}</p>}
                   </>
                 )}
              </div>
             );
          }
          
          if (section.id === 'productTable') {
            const visibleCols = config.table.columns.filter(c => c.visible).sort((a,b) => a.order - b.order);
            return (
              <div key="productTable" style={getSectionStyle('productTable')}>
                 <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                   <thead>
                     <tr style={{ backgroundColor: styleConfig.tableHeaderBackground, color: styleConfig.tableHeaderTextColor }}>
                       {visibleCols.map((col, idx) => (
                         <th key={col.id} style={{ padding: '10px', textAlign: col.type === 'Number' || col.type === 'Currency' ? 'right' : 'left', borderRadius: styleConfig.roundedCorners ? (idx === 0 ? '8px 0 0 8px' : idx === visibleCols.length-1 ? '0 8px 8px 0' : '0') : '0' }}>{col.label}</th>
                       ))}
                     </tr>
                   </thead>
                   <tbody>
                     {items.map((item, index) => (
                       <tr key={index} style={{ borderBottom: styleConfig.borderStyle !== 'None' ? '1px solid #e2e8f0' : 'none', backgroundColor: styleConfig.alternatingRowColors && index % 2 !== 0 ? '#f8fafc' : 'transparent' }}>
                         {visibleCols.map((col) => (
                           <td key={col.id} style={{ padding: '10px', textAlign: col.type === 'Number' || col.type === 'Currency' ? 'right' : 'left' }}>
                              {col.id === 'sr' ? index + 1 :
                               col.id === 'name' ? item.name :
                               col.id === 'qty' ? item.quantity :
                               col.id === 'rate' ? `${currencySymbol}${item.rate.toFixed(2)}` :
                               col.id === 'amount' ? `${currencySymbol}${(item as any).amount ? (item as any).amount.toFixed(2) : ((item as any).quantity * (item as any).rate).toFixed(2)}` : '-'}
                           </td>
                         ))}
                       </tr>
                     ))}
                   </tbody>
                 </table>
              </div>
            );
          }
          
          if (section.id === 'taxEngine') {
             return (
              <div key="taxEngine" style={getSectionStyle('taxEngine')}>
                 {config.tax.enableTaxBreakdown && (
                    <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: getBorderRadius(), border: '1px solid #e2e8f0', width: '100%' }}>
                      {config.tax.showTaxableAmount && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}><span>Taxable Amount:</span> <span>{currencySymbol} {subTotal.toFixed(2)}</span></div>}
                      {config.tax.showCgstSgst && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}><span>CGST ({((invoiceData as any)?.taxRate || 18)/2}%):</span> <span>{currencySymbol} {(taxAmount/2).toFixed(2)}</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}><span>SGST ({((invoiceData as any)?.taxRate || 18)/2}%):</span> <span>{currencySymbol} {(taxAmount/2).toFixed(2)}</span></div>
                        </>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '2px solid #e2e8f0', fontSize: '16px', fontWeight: 'bold', color: styleConfig.primaryColor }}><span>Grand Total:</span> <span>{currencySymbol} {grandTotal.toFixed(2)}</span></div>
                    </div>
                 )}
              </div>
             );
          }
          
          if (section.id === 'amountInWords') {
             return (
               <div key="amountInWords" style={getSectionStyle('amountInWords')}>
                 <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0 }}>Amount in Words:</p>
                 <p style={{ fontSize: '12px', fontStyle: 'italic', margin: '4px 0' }}>Rupees Only.</p>
               </div>
             );
          }
          
          if (section.id === 'terms') {
             return (
               <div key="terms" style={getSectionStyle('terms')}>
                 <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0, color: '#64748b' }}>Terms & Conditions</p>
                 <pre style={{ fontSize: '10px', margin: '4px 0', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{invoiceData?.notes || config.terms.customText}</pre>
               </div>
             );
          }

          if (section.id === 'payment') {
             return (
               <div key="payment" style={getSectionStyle('payment')}>
                 <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0, color: '#64748b' }}>Payment Details</p>
                 <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                   {config.payment.generateQrCode && (
                     <div style={{ width: '80px', height: '80px', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>QR CODE</div>
                   )}
                   <div style={{ fontSize: '11px' }}>
                     <p style={{ margin: '2px 0', whiteSpace: 'pre-wrap' }}>{(businessProfile as any)?.bankDetails || 'Bank: HDFC Bank\nA/C No: 1234567890\nIFSC: HDFC0001234'}</p>
                     {config.payment.customNote && <p style={{ margin: '4px 0', color: '#64748b', fontStyle: 'italic' }}>{config.payment.customNote}</p>}
                   </div>
                 </div>
               </div>
             );
          }

          if (section.id === 'signature') {
             return (
               <div key="signature" style={{ ...getSectionStyle('signature'), display: 'flex', flexDirection: 'column', alignItems: config.signature.position === 'Right' ? 'flex-end' : config.signature.position === 'Left' ? 'flex-start' : 'center', justifyContent: 'flex-end' }}>
                 {(businessProfile as any)?.signatureUrl || (businessProfile as any)?.signature ? (
                   <img src={((businessProfile as any).signatureUrl || (businessProfile as any).signature)} alt="Signature" style={{ width: config.signature.width, height: config.signature.height, objectFit: 'contain', marginBottom: '10px' }} />
                 ) : (
                   <div style={{ width: config.signature.width, height: config.signature.height, borderBottom: '1px solid #cbd5e1', marginBottom: '10px' }}></div>
                 )}
                 <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0 }}>{config.signature.signatoryName || compName}</p>
                 <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>{config.signature.designation || 'Authorized Signatory'}</p>
               </div>
             );
          }
          
          if (section.id === 'footer') {
             return (
               <div key="footer" style={{ ...getSectionStyle('footer'), borderTop: '1px solid #e2e8f0', paddingTop: '20px', marginTop: '20px', textAlign: 'center' }}>
                 <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0' }}>{config.footer.message}</p>
                 <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0' }}>{config.footer.website || compEmail} | {config.footer.supportContact || compPhone}</p>
                 {config.footer.showPageNumbers && <p style={{ fontSize: '10px', color: '#94a3b8', margin: '10px 0 0 0' }}>Page 1 of 1</p>}
               </div>
             );
          }

          return null;
        })}
      </div>
    </div>
  );
};
