import React from 'react';


// Ensure fonts are loaded
const loadFonts = () => {
  if (typeof document !== 'undefined') {
    if (!document.getElementById('invoice-fonts')) {
      const link = document.createElement('link');
      link.id = 'invoice-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Outfit:wght@400;700&family=Roboto:wght@400;700&display=swap';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    }
  }
};
loadFonts();
import { InvoiceTemplate, Invoice, BusinessProfile } from '../../types';
import { numberToWords } from '../../lib/numberToWords';
import { EditableField } from '../EditableField';
import { Country, State } from 'country-state-city';

const InlineEditable = ({ value, onSave, type = 'text', isNumber = false, options = [] }: any) => {
  const ref = React.useRef<HTMLSpanElement>(null);
  
  React.useEffect(() => {
    if (type !== 'select' && ref.current && document.activeElement !== ref.current) {
      const strVal = value?.toString() || '';
      if (ref.current.innerText !== strVal) {
        ref.current.innerText = strVal;
      }
    }
  }, [value, type]);

  const handleBlur = () => {
    if (type !== 'select' && ref.current) {
      let val: string | number = ref.current.innerText;
      if (isNumber) {
        val = Number(val.replace(/[^0-9.-]+/g,""));
      }
      if (val !== value) {
        onSave(val);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault();
      ref.current?.blur();
    }
  };

  if (type === 'select') {
    return (
      <select
        value={value || ''}
        onChange={(e) => onSave(e.target.value)}
        className="hover:bg-slate-200/50 hover:outline-dashed hover:outline-1 hover:outline-sky-400 focus:bg-white focus:outline-solid focus:outline-2 focus:outline-sky-500 cursor-pointer transition-all print:outline-none bg-transparent appearance-none min-w-[50px] inline-block"
        style={{ outlineOffset: '2px', padding: 0, margin: 0, border: 'none', color: 'inherit', font: 'inherit' }}
      >
        {options.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    );
  }

  return (
    <span
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className="hover:bg-slate-200/50 hover:outline-dashed hover:outline-1 hover:outline-sky-400 focus:bg-white focus:outline-solid focus:outline-2 focus:outline-sky-500 cursor-text transition-all print:outline-none min-w-[30px] inline-block px-1 -ml-1 rounded"
      style={{ whiteSpace: type === 'textarea' ? 'pre-wrap' : 'normal', wordBreak: 'break-word', outlineOffset: '2px' }}
    />
  );
};

export interface LivePreviewProps {
  template: InvoiceTemplate;
  invoiceData?: Partial<Invoice>;
  businessProfile?: Partial<BusinessProfile>;
  currencySymbol?: string;
  isPrintMode?: boolean;
  width?: string;
  minHeight?: string;
  isInteractive?: boolean;
  onUpdateField?: (field: string, val: any) => void;
  onUpdateItemField?: (itemId: string, field: string, val: any) => void;
  onInteractiveAddItem?: () => void;
  onInteractiveRemoveItem?: (id: string) => void;
  onCopyBillingToShipping?: () => void;
  hasTransport?: boolean;
  onUpdateHasTransport?: (val: boolean) => void;
}

export const LivePreview: React.FC<LivePreviewProps> = ({
  template,
  invoiceData,
  businessProfile,
  currencySymbol = '$',
  isPrintMode = false,
  width = '100%',
  minHeight = '1122px',
  isInteractive = false,
  onUpdateField,
  onUpdateItemField,
  onInteractiveAddItem,
  onInteractiveRemoveItem,
  onCopyBillingToShipping,
  hasTransport,
  onUpdateHasTransport
}) => {
  const { layout, config, styleConfig, sections } = template;
  const renderSelectInteractive = (value: string, fieldKey: string, options: any[]) => {
    if (isInteractive && onUpdateField) {
      return <InlineEditable value={value} onSave={(v: any) => onUpdateField(fieldKey, v)} type="select" options={options} />;
    }
    return value;
  };

  const renderInteractive = (value: string | number, fieldKey: string, type: 'text' | 'textarea' = 'text') => {
    if (isInteractive && onUpdateField) {
      return <InlineEditable value={value} onSave={(v: any) => onUpdateField(fieldKey, v)} type={type} />;
    }
    return value;
  };

  const renderItemInteractive = (itemId: string, value: string | number, fieldKey: string, type: 'text' | 'textarea' | 'number' = 'text') => {
    if (isInteractive && onUpdateItemField) {
      return <InlineEditable value={value} onSave={(v: any) => onUpdateItemField(itemId, fieldKey, v)} type={type} isNumber={type === 'number'} />;
    }
    return value;
  };
  
  const rowStyle = "flex items-center text-[11px] mb-1.5";
  const labelStyle = "w-28 font-medium text-gray-700";
  const valStyle = "flex-1 text-gray-900";

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

  // Pre-calculate dynamic spans to ensure perfect grid wrapping
  const dynamicSpans: Record<string, number> = {};
  let accumulatedSpan = 0;
  
  for (let i = 0; i < orderedSections.length; i++) {
      const secId = orderedSections[i].id;
      let currentSpan = sections[secId as keyof typeof sections].gridColumnSpan;
      
      // For Modal Classic: billTo, shipTo, transport adjust automatically. First two span 6, third spans 12.
      if (layout.type === 'Modal Classic' && ['billTo', 'shipTo', 'transport'].includes(secId)) {
          const visibleAmigos = orderedSections.filter(s => ['billTo', 'shipTo', 'transport'].includes(s.id));
          const index = visibleAmigos.findIndex(a => a.id === secId);
          currentSpan = (index === 2) ? 12 : 6;
      } else if (layout.type === 'Modal Classic' && secId === 'amountInWords') {
          const taxIndex = orderedSections.findIndex(s => s.id === 'taxEngine');
          const amountIndex = orderedSections.findIndex(s => s.id === 'amountInWords');
          if (taxIndex !== -1 && amountIndex === taxIndex + 1) {
              currentSpan = 0;
          }
      } else if (layout.type === 'Modal Classic' && secId === 'terms') {
          const pIdx = orderedSections.findIndex(s => s.id === 'payment');
          const tIdx = orderedSections.findIndex(s => s.id === 'terms');
          let groupWithPayment = false;
          if (pIdx !== -1 && tIdx !== -1 && tIdx > pIdx) {
              groupWithPayment = true;
              for (let j = pIdx + 1; j < tIdx; j++) {
                  if (orderedSections[j].id !== 'taxEngine' && orderedSections[j].id !== 'amountInWords') {
                      groupWithPayment = false;
                      break;
                  }
              }
          }
          if (groupWithPayment) {
              currentSpan = 0;
          }
      } else if (layout.type === 'Modal Classic' && secId === 'signature') {
          currentSpan = 12;
      } else {
          // Auto-adjust transport span to 6 if it can perfectly fill the remaining half of a row
          if (secId === 'transport' && currentSpan === 12 && layout.type !== 'Modal Classic') {
              if (accumulatedSpan === 6) {
                  currentSpan = 6;
              }
          }
      }
      
      dynamicSpans[secId] = currentSpan;
      accumulatedSpan += currentSpan;
      if (accumulatedSpan >= 12) {
          accumulatedSpan = accumulatedSpan % 12;
      }
  }

  const getSectionStyle = (sectionId: string): React.CSSProperties => {
    const bg = styleConfig.sectionBackgroundColors[sectionId as keyof typeof styleConfig.sectionBackgroundColors];
    const span = dynamicSpans[sectionId] || sections[sectionId as keyof typeof sections].gridColumnSpan;
    
    // Let grid naturally flow left if previous sibling is hidden.
    const colStart = 'auto';
    
    return {
      backgroundColor: bg || 'transparent',
      borderRadius: getBorderRadius(),
      padding: bg ? '15px' : '0',
      marginBottom: styleConfig.spacing === 'Compact' ? '10px' : styleConfig.spacing === 'Spacious' ? '30px' : '20px',
      gridColumn: `${colStart} / span ${span}`
    };
  };

  // Safe data getters
  const compName = (businessProfile as any)?.name || (businessProfile as any)?.companyName || 'Company Name';
  const compAddr = businessProfile?.address || '123 Business Street, Tech Park, City - 400001';
  const compGst = (businessProfile as any)?.taxId || (businessProfile as any)?.gstin || '27AADCB2230M1Z2';
  const compPhone = businessProfile?.phone || '+91 9876543210';
  const compEmail = businessProfile?.email || 'contact@company.com';
  const compPan = (businessProfile as any)?.pan || 'ABCDE1234F';
  const compWebsite = (businessProfile as any)?.website || 'www.company.com';
  const compLogo = (businessProfile as any)?.logoUrl || (businessProfile as any)?.logo || null;
  
  const invNo = invoiceData?.invoiceNumber || 'INV-2023-001';
  const invDate = invoiceData?.date || '21-Jun-2026';
  const dueDate = invoiceData?.dueDate || '21-Jul-2026';
  
  const clientName = invoiceData?.clientName || 'Client Company Name';
  const clientAddr = invoiceData?.clientAddress || '456 Client Avenue, Block B, State - 100002';
  const clientGst = (invoiceData as any)?.clientGstin || (invoiceData as any)?.clientTaxId || '07AABCB2230M1Z2';
  const clientPhone = invoiceData?.clientPhone || '+91 1122334455';
  const clientEmail = invoiceData?.clientEmail || 'client@example.com';

  const items: any[] = invoiceData?.items || [
     { id: '1', name: 'Professional Services', quantity: 40, rate: 1500, discount: 0, amount: 60000 },
     { id: '2', name: 'Software License', quantity: 1, rate: 25000, discount: 0, amount: 25000 }
  ];

  const subTotal = items.reduce((a: number, b: any) => a + ((b as any).amount || ((b as any).quantity * (b as any).rate) || 0), 0);
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
            if (layout.type === 'Modal Classic') {
              if (config.header.logoPosition === 'Center' && config.header.showLogo) {
                  return (
                    <div key="header" style={{ ...getSectionStyle('header'), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: '20px' }}>
                        <div style={{ width: config.header.logoWidth, height: config.header.logoHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                           {compLogo ? <img src={compLogo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <div style={{width:'100%', height:'100%', backgroundColor: '#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', color: '#94a3b8', fontSize:'12px'}}>LOGO</div>}
                        </div>
                        <h1 className="text-3xl font-bold tracking-wider text-gray-900 uppercase" style={{ color: styleConfig.primaryColor, textAlign: config.header.titleAlignment === 'Right' ? 'right' : config.header.titleAlignment === 'Left' ? 'left' : 'center' }}>{config.header.invoiceTitle}</h1>
                    </div>
                  );
              }

              return (
                <div key="header" style={{ ...getSectionStyle('header'), display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '20px' }}>
                  {config.header.logoPosition === 'Left' && config.header.showLogo && (
                    <div style={{ width: config.header.logoWidth, height: config.header.logoHeight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       {compLogo ? <img src={compLogo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <div style={{width:'100%', height:'100%', backgroundColor: '#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', color: '#94a3b8', fontSize:'12px'}}>LOGO</div>}
                    </div>
                  )}
                  
                  <div style={{ flex: 1, textAlign: config.header.titleAlignment === 'Right' ? 'right' : config.header.titleAlignment === 'Left' ? 'left' : 'center' }}>
                    <h1 className="text-3xl font-bold tracking-wider text-gray-900 uppercase" style={{ color: styleConfig.primaryColor }}>{config.header.invoiceTitle}</h1>
                  </div>

                  {config.header.logoPosition === 'Right' && config.header.showLogo && (
                    <div style={{ width: config.header.logoWidth, height: config.header.logoHeight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       {compLogo ? <img src={compLogo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <div style={{width:'100%', height:'100%', backgroundColor: '#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', color: '#94a3b8', fontSize:'12px'}}>LOGO</div>}
                    </div>
                  )}
                </div>
              );
            }
            const isPremium = styleConfig.sectionBackgroundColors['header'] !== undefined;
            const textColor = isPremium ? '#ffffff' : styleConfig.primaryColor;
            
            if (config.header.logoPosition === 'Center' && config.header.showLogo) {
                return (
                  <div key="header" style={{...getSectionStyle('header'), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: textColor}}>
                      <div style={{ width: config.header.logoWidth, height: config.header.logoHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                         {compLogo ? <img src={compLogo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <div style={{width:'100%', height:'100%', backgroundColor: isPremium ? 'rgba(255,255,255,0.2)' : '#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', color: isPremium ? '#fff' : '#94a3b8', fontSize:'12px'}}>LOGO</div>}
                      </div>
                      <h1 style={{ color: textColor, fontSize: '32px', margin: 0, fontWeight: 'bold' }}>{config.header.invoiceTitle}</h1>
                  </div>
                );
            }

            return (
              <div key="header" style={{...getSectionStyle('header'), display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: textColor}}>
                {config.header.logoPosition === 'Left' && config.header.showLogo && (
                  <div style={{ width: config.header.logoWidth, height: config.header.logoHeight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     {compLogo ? <img src={compLogo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <div style={{width:'100%', height:'100%', backgroundColor: isPremium ? 'rgba(255,255,255,0.2)' : '#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', color: isPremium ? '#fff' : '#94a3b8', fontSize:'12px'}}>LOGO</div>}
                  </div>
                )}
                
                <div style={{ flex: 1, textAlign: config.header.titleAlignment === 'Right' ? 'right' : config.header.titleAlignment === 'Left' ? 'left' : 'center' }}>
                  <h1 style={{ color: textColor, fontSize: '32px', margin: 0, fontWeight: 'bold' }}>{config.header.invoiceTitle}</h1>
                </div>

                {config.header.logoPosition === 'Right' && config.header.showLogo && (
                  <div style={{ width: config.header.logoWidth, height: config.header.logoHeight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     {compLogo ? <img src={compLogo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <div style={{width:'100%', height:'100%', backgroundColor: isPremium ? 'rgba(255,255,255,0.2)' : '#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', color: isPremium ? '#fff' : '#94a3b8', fontSize:'12px'}}>LOGO</div>}
                  </div>
                )}
              </div>
            );
          }

          if (section.id === 'companyInfo') {
            if (layout.type === 'Modal Classic') {

              return (
                <div key="companyInfo" style={{ ...getSectionStyle('companyInfo'), marginBottom: '20px' }}>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1" style={{ color: styleConfig.primaryColor }}>{compName}</h1>
                  <div className="text-[11px] text-gray-600 leading-relaxed">
                    {config.company.fields.includes('name') && <div>Owner: Guest User</div>}
                    {config.company.fields.includes('email') && <div>Email: {compEmail}</div>}
                    {config.company.fields.includes('phone') && <div>Phone: {compPhone}</div>}
                    {config.company.fields.includes('address') && <div className="whitespace-pre-wrap">{compAddr}</div>}
                    {config.company.fields.includes('gstin') && <div>GSTIN: {compGst}</div>}
                    {config.company.fields.includes('pan') && <div>PAN: {compPan}</div>}
                    {config.company.fields.includes('website') && <div>Website: {compWebsite}</div>}
                  </div>
                </div>
              );

            }
            return (
              <div key="companyInfo" style={getSectionStyle('companyInfo')}>
                 <h3 style={{ fontWeight: 'bold', fontSize: '16px', color: styleConfig.primaryColor, marginBottom: '5px' }}>{compName}</h3>
                 {config.company.fields.includes('address') && <p style={{ fontSize: '12px', margin: '2px 0', whiteSpace: 'pre-wrap' }}>{compAddr}</p>}
                 {config.company.fields.includes('gstin') && compGst && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>GSTIN:</strong> {compGst}</p>}
                 {config.company.fields.includes('phone') && compPhone && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Phone:</strong> {compPhone}</p>}
                 {config.company.fields.includes('email') && compEmail && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Email:</strong> {compEmail}</p>}
                 {config.company.fields.includes('pan') && compPan && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>PAN:</strong> {compPan}</p>}
                 {config.company.fields.includes('website') && compWebsite && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Website:</strong> {compWebsite}</p>}
              </div>
            );
          }
          
          if (section.id === 'invoiceInfo') {
             const titleLower = config.header.invoiceTitle.toLowerCase();
             const isEstimate = titleLower.includes('estimate') || titleLower.includes('quotation');
             const isProforma = titleLower.includes('proforma');
             const isCreditNote = titleLower.includes('credit');
             const isDebitNote = titleLower.includes('debit');
             
             const detailTitle = isEstimate ? 'Estimate Details' : isProforma ? 'Proforma Details' : isCreditNote ? 'Credit Note Details' : isDebitNote ? 'Debit Note Details' : 'Invoice Details';
             const noLabel = isEstimate ? 'Est No.' : isProforma ? 'Proforma No.' : isCreditNote ? 'CN No.' : isDebitNote ? 'DN No.' : 'Invoice No.';
             const dueDateLabel = isEstimate ? 'Valid Until' : 'Due Date';

            if (layout.type === 'Modal Classic') {

              const placeOfSupply = invoiceData?.placeOfSupply || "N/A";
               const grRrNo = invoiceData?.grRrNo || "N/A";
               const referenceNumber = (invoiceData as any)?.referenceNumber || "N/A";
              return (
                <div key="invoiceInfo" style={{ ...getSectionStyle('invoiceInfo'), padding: 0 }}>
                  <div className="border border-gray-300 p-2.5 h-full">
                    {config.invoiceInfo.fields.includes('invoiceNumber') && <div className={rowStyle}><span className={labelStyle}>{noLabel}</span><span className="mr-2">:</span><span className={valStyle}>{renderInteractive(invNo, 'invoiceNumber')}</span></div>}
                    {config.invoiceInfo.fields.includes('invoiceDate') && <div className={rowStyle}><span className={labelStyle}>Dated</span><span className="mr-2">:</span><span className={valStyle}>{renderInteractive(invDate, 'date')}</span></div>}
                    {config.invoiceInfo.fields.includes('dueDate') && <div className={rowStyle}><span className={labelStyle}>{dueDateLabel}</span><span className="mr-2">:</span><span className={valStyle}>{renderInteractive(dueDate, 'dueDate')}</span></div>}
                    {config.invoiceInfo.fields.includes('poNumber') && <div className={rowStyle}><span className={labelStyle}>PO Number</span><span className="mr-2">:</span><span className={valStyle}>{renderInteractive((invoiceData as any)?.poNumber || 'N/A', 'poNumber')}</span></div>}
                    {config.invoiceInfo.fields.includes('deliveryNote') && <div className={rowStyle}><span className={labelStyle}>Delivery Note</span><span className="mr-2">:</span><span className={valStyle}>{renderInteractive((invoiceData as any)?.deliveryNote || 'N/A', 'deliveryNote')}</span></div>}
                    <div className={rowStyle}><span className={labelStyle}>Place of Supply</span><span className="mr-2">:</span><span className={valStyle}>{renderInteractive(placeOfSupply, 'placeOfSupply')}</span></div>
                    <div className={rowStyle}><span className={labelStyle}>GR/RR No.</span><span className="mr-2">:</span><span className={valStyle}>{renderInteractive(grRrNo, 'grRrNo')}</span></div>
                    <div className={rowStyle}><span className={labelStyle}>Ref. No.</span><span className="mr-2">:</span><span className={valStyle}>{renderInteractive(referenceNumber, 'referenceNumber')}</span></div>
                    {config.invoiceInfo.customFields.map(f => (
                      <div key={f.id} className={rowStyle}><span className={labelStyle}>{f.label}</span><span className="mr-2">:</span><span className={valStyle}>{renderInteractive(f.value, `customField_${f.id}`)}</span></div>
                    ))}
                  </div>
                </div>
              );

            }

             return (
              <div key="invoiceInfo" style={{ ...getSectionStyle('invoiceInfo'), textAlign: (!sections.companyInfo?.visible) ? 'left' : config.invoiceInfo.position === 'Right' ? 'right' : config.invoiceInfo.position === 'Left' ? 'left' : 'center' }}>
                 <h3 style={{ fontWeight: 'bold', fontSize: '16px', color: styleConfig.primaryColor, marginBottom: '5px' }}>{detailTitle}</h3>
                 {config.invoiceInfo.fields.includes('invoiceNumber') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>{noLabel}</strong> {renderInteractive(invNo, 'invoiceNumber')}</p>}
                 {config.invoiceInfo.fields.includes('invoiceDate') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Date:</strong> {renderInteractive(invDate, 'date')}</p>}
                 {config.invoiceInfo.fields.includes('dueDate') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>{dueDateLabel}</strong> {renderInteractive(dueDate, 'dueDate')}</p>}
                 {config.invoiceInfo.fields.includes('poNumber') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>PO No:</strong> {renderInteractive((invoiceData as any)?.poNumber || 'N/A', 'poNumber')}</p>}
                 <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Ref No:</strong> {renderInteractive((invoiceData as any)?.referenceNumber || 'N/A', 'referenceNumber')}</p>
                 {config.invoiceInfo.customFields.map(f => (
                   <p key={f.id} style={{ fontSize: '12px', margin: '2px 0' }}><strong>{f.label}:</strong> {renderInteractive(f.value, `customField_${f.id}`)}</p>
                 ))}
              </div>
             );
          }

          if (section.id === 'billTo') {
            if (layout.type === 'Modal Classic') {

              const clientCountry = (invoiceData as any)?.clientCountry || "India";
              const clientState = (invoiceData as any)?.clientState || "N/A";
              const isAdjacent = dynamicSpans['billTo'] !== 12;
              const amigoIndex = orderedSections.filter(s => ['billTo', 'shipTo', 'transport'].includes(s.id)).findIndex(a => a.id === 'billTo');
              const isSecondCol = amigoIndex === 1;

              return (
                <div key="billTo" style={{ ...getSectionStyle('billTo'), padding: 0, marginTop: '20px' }}>
                  <div className={`border border-gray-300 p-2.5 h-full flex ${isAdjacent ? 'flex-col gap-y-0.5' : 'flex-wrap items-center gap-x-6 gap-y-1'}`} style={{ borderLeft: isSecondCol ? 'none' : '1px solid #d1d5db' }}>
                    <h3 className={`font-bold text-[11px] text-gray-800 uppercase ${isAdjacent ? 'mb-1' : 'w-full mb-0'}`}>BILLED TO</h3>
                    {config.client.fields.includes('name') && <div className={`${isAdjacent ? 'text-[12px] font-medium text-gray-900 mb-0.5' : 'flex items-center text-[10px]'}`}>{isAdjacent ? renderInteractive(clientName, 'clientName') : <><span className="text-gray-500 font-medium mr-1">Name:</span><span className="text-gray-900 font-bold">{renderInteractive(clientName, 'clientName')}</span></>}</div>}
                    {config.client.fields.includes('phone') && (
                        isAdjacent ? <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">Party Mobile No</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive(clientPhone, 'clientPhone')}</span></div> :
                        <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">Mobile No:</span><span className="text-gray-900 font-bold">{renderInteractive(clientPhone, 'clientPhone')}</span></div>
                    )}
                    {config.client.fields.includes('email') && (
                        isAdjacent ? <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">Email</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive((invoiceData as any)?.clientEmail || 'client@example.com', 'clientEmail')}</span></div> :
                        <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">Email:</span><span className="text-gray-900 font-bold">{renderInteractive((invoiceData as any)?.clientEmail || 'client@example.com', 'clientEmail')}</span></div>
                    )}
                    {config.client.fields.includes('address') && (
                        isAdjacent ? <>
                          <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">Country</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderSelectInteractive(clientCountry, 'clientCountry', Country.getAllCountries().map(c => ({ label: c.name, value: c.name })))}</span></div>
                          <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">State</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderSelectInteractive(clientState, 'clientState', State.getStatesOfCountry(Country.getAllCountries().find(c => c.name === clientCountry)?.isoCode || '').map(s => ({ label: s.name, value: s.name })))}</span></div>
                          <div className="flex items-start text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">Address</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive(clientAddr, 'clientAddress', 'textarea')}</span></div>
                        </> : <>
                          <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">Country:</span><span className="text-gray-900 font-bold">{renderSelectInteractive(clientCountry, 'clientCountry', Country.getAllCountries().map(c => ({ label: c.name, value: c.name })))}</span></div>
                          <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">State:</span><span className="text-gray-900 font-bold">{renderSelectInteractive(clientState, 'clientState', State.getStatesOfCountry(Country.getAllCountries().find(c => c.name === clientCountry)?.isoCode || '').map(s => ({ label: s.name, value: s.name })))}</span></div>
                          <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">Address:</span><span className="text-gray-900 font-bold">{renderInteractive(clientAddr, 'clientAddress', 'textarea')}</span></div>
                        </>
                    )}
                    {config.client.fields.includes('gstin') && (
                        isAdjacent ? <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">GSTIN / UIN</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive(clientGst, 'clientGstin')}</span></div> :
                        <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">GSTIN:</span><span className="text-gray-900 font-bold">{renderInteractive(clientGst, 'clientGstin')}</span></div>
                    )}
                    {config.client.fields.includes('pan') && (
                        isAdjacent ? <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">PAN</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive((invoiceData as any)?.clientPan || 'ABCDE1234F', 'clientPan')}</span></div> :
                        <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">PAN:</span><span className="text-gray-900 font-bold">{renderInteractive((invoiceData as any)?.clientPan || 'ABCDE1234F', 'clientPan')}</span></div>
                    )}
                  </div>
                </div>
              );

            }
             const clientCountryNM = (invoiceData as any)?.clientCountry || 'India';
             const clientStateNM = (invoiceData as any)?.clientState || 'N/A';
             return (
              <div key="billTo" style={getSectionStyle('billTo')}>
                 <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>Bill To</h4>
                 <h3 style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>{renderInteractive(clientName, 'clientName')}</h3>
                 {config.client.fields.includes('address') && <>
                   <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Country:</strong> {renderSelectInteractive(clientCountryNM, 'clientCountry', Country.getAllCountries().map(c => ({ label: c.name, value: c.name })))}</p>
                   <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>State:</strong> {renderSelectInteractive(clientStateNM, 'clientState', State.getStatesOfCountry(Country.getAllCountries().find(c => c.name === clientCountryNM)?.isoCode || '').map(s => ({ label: s.name, value: s.name })))}</p>
                   <p style={{ fontSize: '12px', margin: '2px 0', whiteSpace: 'pre-wrap' }}>{renderInteractive(clientAddr, 'clientAddress', 'textarea')}</p>
                 </>}
                 {config.client.fields.includes('gstin') && clientGst && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>GSTIN:</strong> {renderInteractive(clientGst, 'clientGstin')}</p>}
                 {config.client.fields.includes('phone') && clientPhone && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Phone:</strong> {renderInteractive(clientPhone, 'clientPhone')}</p>}
                 {config.client.fields.includes('email') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Email:</strong> {renderInteractive(clientEmail, 'clientEmail')}</p>}
              </div>
             );
          }
          
          if (section.id === 'shipTo') {
            if (layout.type === 'Modal Classic') {

              const shipName = (invoiceData as any)?.shippedToName || '';
              const shipPhone = (invoiceData as any)?.shippedToPhone || '';
              const shipEmail = (invoiceData as any)?.shippedToEmail || '';
              const shipPan = (invoiceData as any)?.shippedToPan || '';
              const shipCountry = (invoiceData as any)?.shippedToCountry || '';
              const shipState = (invoiceData as any)?.shippedToState || '';
              const shipAddr = (invoiceData as any)?.shippedToAddress || '';
              const shipGst = (invoiceData as any)?.shippedToGstin || '';

              const isAdjacent = dynamicSpans['shipTo'] !== 12;
              const amigoIndex = orderedSections.filter(s => ['billTo', 'shipTo', 'transport'].includes(s.id)).findIndex(a => a.id === 'shipTo');
              const isSecondCol = amigoIndex === 1;

              return (
                <div key="shipTo" style={{ ...getSectionStyle('shipTo'), padding: 0, marginTop: '20px' }}>
                  <div className={`border border-gray-300 p-2.5 h-full flex ${isAdjacent ? 'flex-col gap-y-0.5' : 'flex-wrap items-center gap-x-6 gap-y-1'}`} style={{ borderLeft: isSecondCol ? 'none' : '1px solid #d1d5db' }}>
                    <div className={`flex justify-between items-center ${isAdjacent ? 'mb-1' : 'w-full mb-0'}`}>
                      <h3 className={`font-bold text-[11px] text-gray-800 uppercase`}>SHIPPED TO</h3>
                      {isInteractive && onCopyBillingToShipping && (
                         <button 
                           type="button"
                           onClick={onCopyBillingToShipping}
                           className="px-2 py-0.5 text-[9px] font-bold uppercase rounded transition-colors hide-on-print bg-slate-100 text-slate-500 hover:bg-slate-200"
                         >
                           Copy from Billed
                         </button>
                      )}
                    </div>
                      <>
                        {config.shipping.fields.includes('name') && <div className={`${isAdjacent ? 'text-[12px] font-medium text-gray-900 mb-0.5' : 'flex items-center text-[10px]'}`}>{isAdjacent ? renderInteractive(shipName, 'shippedToName') : <><span className="text-gray-500 font-medium mr-1">Name:</span><span className="text-gray-900 font-bold">{renderInteractive(shipName, 'shippedToName')}</span></>}</div>}
                        {config.shipping.fields.includes('phone') && (
                            isAdjacent ? <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">Party Mobile No</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive(shipPhone, 'shippedToPhone')}</span></div> :
                            <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">Mobile No:</span><span className="text-gray-900 font-bold">{renderInteractive(shipPhone, 'shippedToPhone')}</span></div>
                        )}
                        {config.shipping.fields.includes('email') && (
                            isAdjacent ? <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">Email ID</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive(shipEmail, 'shippedToEmail')}</span></div> :
                            <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">Email:</span><span className="text-gray-900 font-bold">{renderInteractive(shipEmail, 'shippedToEmail')}</span></div>
                        )}
                        {config.shipping.fields.includes('pan') && (
                            isAdjacent ? <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">PAN</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive(shipPan, 'shippedToPan')}</span></div> :
                            <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">PAN:</span><span className="text-gray-900 font-bold">{renderInteractive(shipPan, 'shippedToPan')}</span></div>
                        )}
                        {config.shipping.fields.includes('email') && (
                            isAdjacent ? <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">Email ID</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive(shipEmail, 'shippedToEmail')}</span></div> :
                            <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">Email:</span><span className="text-gray-900 font-bold">{renderInteractive(shipEmail, 'shippedToEmail')}</span></div>
                        )}
                        {config.shipping.fields.includes('pan') && (
                            isAdjacent ? <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">PAN</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive(shipPan, 'shippedToPan')}</span></div> :
                            <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">PAN:</span><span className="text-gray-900 font-bold">{renderInteractive(shipPan, 'shippedToPan')}</span></div>
                        )}
                        {config.shipping.fields.includes('address') && (
                            isAdjacent ? <>
                              <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">Country</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderSelectInteractive(shipCountry, 'shippedToCountry', Country.getAllCountries().map(c => ({ label: c.name, value: c.name })))}</span></div>
                              <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">State</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderSelectInteractive(shipState, 'shippedToState', State.getStatesOfCountry(Country.getAllCountries().find(c => c.name === shipCountry)?.isoCode || '').map(s => ({ label: s.name, value: s.name })))}</span></div>
                              <div className="flex items-start text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">Address</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive(shipAddr, 'shippedToAddress', 'textarea')}</span></div>
                            </> : <>
                              <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">Country:</span><span className="text-gray-900 font-bold">{renderSelectInteractive(shipCountry, 'shippedToCountry', Country.getAllCountries().map(c => ({ label: c.name, value: c.name })))}</span></div>
                              <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">State:</span><span className="text-gray-900 font-bold">{renderSelectInteractive(shipState, 'shippedToState', State.getStatesOfCountry(Country.getAllCountries().find(c => c.name === shipCountry)?.isoCode || '').map(s => ({ label: s.name, value: s.name })))}</span></div>
                              <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">Address:</span><span className="text-gray-900 font-bold">{renderInteractive(shipAddr, 'shippedToAddress', 'textarea')}</span></div>
                            </>
                        )}
                        {config.shipping.fields.includes('gstin') && (
                            isAdjacent ? <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">GSTIN / UIN</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive(shipGst, 'shippedToGstin')}</span></div> :
                            <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">GSTIN:</span><span className="text-gray-900 font-bold">{renderInteractive(shipGst, 'shippedToGstin')}</span></div>
                        )}
                      </>
                  </div>
                </div>
              );

            }
             return (
              <div key="shipTo" style={getSectionStyle('shipTo')}>
                 <div className="flex justify-between items-center mb-[5px]">
                   <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', margin: 0 }}>Ship To</h4>
                   {isInteractive && onCopyBillingToShipping && (
                     <button 
                       type="button"
                       onClick={onCopyBillingToShipping}
                       className="print:hidden text-[9px] px-2 py-0.5 rounded border transition-colors bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                     >
                        Copy from Billed
                     </button>
                   )}
                 </div>
                   <>
                     <h3 style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>{renderInteractive((invoiceData as any)?.shippedToName || '', "shippedToName")}</h3>
                     {config.shipping.fields.includes('address') && <p style={{ fontSize: '12px', margin: '2px 0', whiteSpace: 'pre-wrap' }}>{renderInteractive((invoiceData as any)?.shippedToAddress || '', 'shippedToAddress', 'textarea')}</p>}
                     {config.shipping.fields.includes('gstin') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>GSTIN:</strong> {renderInteractive((invoiceData as any)?.shippedToGstin || '', 'shippedToGstin')}</p>}
                     {config.shipping.fields.includes('phone') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Phone:</strong> {renderInteractive((invoiceData as any)?.shippedToPhone || '', 'shippedToPhone')}</p>}
                     {config.shipping.fields.includes('email') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Email:</strong> {renderInteractive((invoiceData as any)?.shippedToEmail || '', 'shippedToEmail')}</p>}
                     {config.shipping.fields.includes('pan') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>PAN:</strong> {renderInteractive((invoiceData as any)?.shippedToPan || '', 'shippedToPan')}</p>}
                   </>
              </div>
             );
          }
          
          if (section.id === 'productTable') {
            if (layout.type === 'Modal Classic') {

              const visibleCols = config.table.columns.filter(c => c.visible).sort((a,b) => a.order - b.order);
              return (
                <div key="productTable" style={{ ...getSectionStyle('productTable'), marginTop: '20px' }}>
                  <table className="w-full text-left border-collapse border border-gray-300">
                    <thead>
                      <tr className="text-white text-[10px] uppercase tracking-wide" style={{ backgroundColor: styleConfig.tableHeaderBackground, color: styleConfig.tableHeaderTextColor }}>
                        {visibleCols.map(col => (
                          <th key={col.id} className={`py-2.5 px-3 border border-gray-300 ${col.id === 'sr' ? 'w-10 text-center' : col.type === 'Number' || col.type === 'Currency' ? 'text-right' : 'text-left'}`}>
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-300">
                      {items.map((item, idx) => {
                        return (
                          <tr key={idx} className="align-top text-[11px] relative group">
                            {visibleCols.map(col => (
                              <td key={col.id} className={`py-3 px-3 border-r border-gray-300 relative ${col.id === 'sr' ? 'text-center text-gray-500' : col.type === 'Number' || col.type === 'Currency' ? 'text-right font-bold' : 'text-left'}`}>
                                {col.id === 'sr' && isInteractive && onInteractiveRemoveItem && (
                                    <button 
                                      onClick={() => onInteractiveRemoveItem(item.id)}
                                      className="print:hidden absolute -left-8 top-1/2 -translate-y-1/2 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-rose-50 rounded"
                                      title="Remove Item"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                    </button>
                                  )}
                                {col.id === 'sr' ? idx + 1 : col.id === 'name' ? (
                                  <div>
                                    <div className="font-medium text-gray-900">{renderItemInteractive(item.id, item.name, 'name')}</div>
                                    {(item as any).description && <div className="text-[10px] text-gray-500 mt-0.5">{(item as any).description}</div>}
                                  </div>
                                ) : col.id === 'hsn' ? renderItemInteractive(item.id, (item as any).hsnCode || (item as any).sacCode || '-', 'hsnCode') : col.id === 'qty' ? renderItemInteractive(item.id, item.quantity, 'quantity', 'number') : col.id === 'rate' ? <>{currencySymbol}{renderItemInteractive(item.id, (item as any).rate, 'rate', 'number')}</> : col.id === 'tax' ? <>{renderItemInteractive(item.id, (item as any).taxPercentage || 0, 'taxPercentage', 'number')}%</> : col.id === 'amount' ? `${currencySymbol}${((item as any).amount || (item as any).quantity * (item as any).rate).toFixed(2)}` : '-'}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                      {isInteractive && onInteractiveAddItem && (
                        <tr className="print:hidden border-t border-dashed border-gray-300">
                          <td colSpan={visibleCols.length} className="py-2 px-3 text-center">
                            <button 
                              type="button"
                              onClick={onInteractiveAddItem}
                              className="text-xs font-medium text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-4 py-1.5 rounded-md transition-colors inline-flex items-center gap-1"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                              Add New Item
                            </button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              );

            }
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
                       <tr key={index} className="relative group" style={{ borderBottom: styleConfig.borderStyle !== 'None' ? '1px solid #e2e8f0' : 'none', backgroundColor: styleConfig.alternatingRowColors && index % 2 !== 0 ? '#f8fafc' : 'transparent' }}>
                         {visibleCols.map((col, colIdx) => (
                           <td key={col.id} style={{ padding: '10px', textAlign: col.type === 'Number' || col.type === 'Currency' ? 'right' : 'left', position: colIdx === 0 ? 'relative' : undefined }}>
                              {col.id === 'sr' && colIdx === 0 && isInteractive && onInteractiveRemoveItem && (
                                <button 
                                  onClick={() => onInteractiveRemoveItem(item.id)}
                                  className="print:hidden absolute -left-8 top-1/2 -translate-y-1/2 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-rose-50 rounded"
                                  title="Remove Item"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                </button>
                              )}
                              {col.id === 'sr' ? index + 1 :
                               col.id === 'name' ? renderItemInteractive(item.id, item.name, 'name') :
                               col.id === 'hsn' ? renderItemInteractive(item.id, (item as any).hsnCode || (item as any).sacCode || '-', 'hsnCode') :
                               col.id === 'qty' ? renderItemInteractive(item.id, item.quantity, 'quantity', 'number') :
                               col.id === 'rate' ? <>{currencySymbol}{renderItemInteractive(item.id, item.rate, 'rate', 'number')}</> :
                               col.id === 'tax' ? <>{renderItemInteractive(item.id, (item as any).taxPercentage || 0, 'taxPercentage', 'number')}%</> :
                               col.id === 'amount' ? `${currencySymbol}${(item as any).amount ? (item as any).amount.toFixed(2) : ((item as any).quantity * (item as any).rate).toFixed(2)}` : '-'}
                           </td>
                         ))}
                       </tr>
                     ))}
                     {isInteractive && onInteractiveAddItem && (
                       <tr className="print:hidden border-t border-dashed" style={{ borderColor: '#e2e8f0' }}>
                         <td colSpan={visibleCols.length} style={{ padding: '8px', textAlign: 'center' }}>
                           <button 
                             type="button"
                             onClick={onInteractiveAddItem}
                             className="text-xs font-medium text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-4 py-1.5 rounded-md transition-colors inline-flex items-center gap-1"
                           >
                             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                             Add New Item
                           </button>
                         </td>
                       </tr>
                     )}
                   </tbody>
                 </table>
              </div>
            );
          }
          
          if (section.id === 'transport') {
            if (layout.type === 'Modal Classic') {

              const vehicleNo = (invoiceData as any)?.vehicleNo || "N/A";
              const driverMobile = (invoiceData as any)?.driverMobileNo || "N/A";
              const station = (invoiceData as any)?.station || "N/A";
              const ewayBillNo = (invoiceData as any)?.eWayBillNo || "N/A";
              const poNumber = invoiceData?.poNumber || "N/A";
              
              const isAdjacent = dynamicSpans['transport'] !== 12;
              const amigoIndex = orderedSections.filter(s => ['billTo', 'shipTo', 'transport'].includes(s.id)).findIndex(a => a.id === 'transport');
              const isSecondCol = amigoIndex === 1;

              return (
                <div key="transport" style={{ ...getSectionStyle('transport'), padding: 0, marginTop: '20px' }}>
                  <div className={`border border-gray-300 p-2.5 h-full flex ${isAdjacent ? 'flex-col gap-y-0.5' : 'flex-wrap items-center gap-x-6 gap-y-1'}`} style={{ borderLeft: isSecondCol ? 'none' : '1px solid #d1d5db' }}>
                    <div className={`flex justify-between items-center ${isAdjacent ? 'mb-1' : 'w-full mb-0'}`}>
                      <h3 className={`font-bold text-[11px] text-gray-800 uppercase`}>TRANSPORT</h3>
                      {isInteractive && onUpdateHasTransport && (
                         <button 
                           type="button"
                           onClick={() => onUpdateHasTransport(!hasTransport)}
                           className={`print:hidden text-[9px] px-2 py-0.5 rounded border transition-colors ${hasTransport ? 'bg-sky-500 text-white border-sky-500 shadow-sm' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}
                         >
                            Include Details
                         </button>
                      )}
                    </div>
                    {config.transport.fields.includes('vehicleNo') && (
                        isAdjacent ? 
                        <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">Vehicle No.</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive(vehicleNo, 'vehicleNo')}</span></div> :
                        <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">Vehicle No:</span><span className="text-gray-900 font-bold">{renderInteractive(vehicleNo, 'vehicleNo')}</span></div>
                    )}
                    {config.transport.fields.includes('transportName') && (
                        isAdjacent ? 
                        <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">Transport Name</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive((invoiceData as any)?.transportName || 'N/A', 'transport')}</span></div> :
                        <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">Transport Name:</span><span className="text-gray-900 font-bold">{renderInteractive((invoiceData as any)?.transportName || 'N/A', 'transport')}</span></div>
                    )}
                    {config.transport.fields.includes('driverMobileNo') && (
                        isAdjacent ? 
                        <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">Driver Mobile</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive(driverMobile, 'driverMobile')}</span></div> :
                        <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">Driver Mobile:</span><span className="text-gray-900 font-bold">{renderInteractive(driverMobile, 'driverMobile')}</span></div>
                    )}
                    {config.transport.fields.includes('station') && (
                        isAdjacent ? 
                        <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">Station</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive(station, 'station')}</span></div> :
                        <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">Station:</span><span className="text-gray-900 font-bold">{renderInteractive(station, 'station')}</span></div>
                    )}
                    {config.transport.fields.includes('eWayBillNo') && (
                        isAdjacent ? 
                        <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">E-Way Bill No.</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive(ewayBillNo, 'ewayBillNo')}</span></div> :
                        <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">E-Way Bill No:</span><span className="text-gray-900 font-bold">{renderInteractive(ewayBillNo, 'ewayBillNo')}</span></div>
                    )}
                  </div>
                </div>
              );

            }
             return (
               <div key="transport" style={getSectionStyle('transport')}>
                 <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>Transport Details</h4>
                 {config.transport.fields.includes('vehicleNo') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Vehicle No:</strong> {renderInteractive((invoiceData as any)?.vehicleNo || 'MH 12 AB 1234', 'vehicleNo')}</p>}
                 {config.transport.fields.includes('transportName') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Transporter:</strong> {renderInteractive((invoiceData as any)?.transportName || 'Fast Logistics', 'transport')}</p>}
                 {config.transport.fields.includes('eWayBillNo') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>E-Way Bill No:</strong> {renderInteractive((invoiceData as any)?.eWayBillNo || '123456789012', 'ewayBillNo')}</p>}
                 {config.transport.fields.includes('station') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Station:</strong> {renderInteractive((invoiceData as any)?.station || 'Mumbai HQ', 'station')}</p>}
                 {config.transport.fields.includes('driverMobileNo') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Driver Mobile No:</strong> {renderInteractive((invoiceData as any)?.driverMobileNo || '+91 9876543210', 'driverMobile')}</p>}
               </div>
             );
          }
          if (section.id === 'taxEngine') {
            if (layout.type === 'Modal Classic') {
              const taxIndex = orderedSections.findIndex(s => s.id === 'taxEngine');
              const amountIndex = orderedSections.findIndex(s => s.id === 'amountInWords');
              const renderAmountInWords = taxIndex !== -1 && amountIndex === taxIndex + 1 && config.amountInWords.enabled;
              const words = numberToWords(invoiceData?.grandTotal || 0, config.amountInWords.format);

              return (
                <div key="taxEngine" style={{ ...getSectionStyle('taxEngine'), paddingLeft: '20px' }}>
                  <div className="space-y-2 text-[11px]">
                    {config.tax.showTotal && (
                      <div className="flex justify-between text-gray-600">
                        <span>Sub Total</span>
                        <span>{subTotal.toFixed(2)}</span>
                      </div>
                    )}
                    {config.tax.showCgstSgst && (
                      <>
                        <div className="flex justify-between text-gray-600">
                          <span>CGST ({((invoiceData as any)?.taxRate || 18)/2}%)</span>
                          <span>{(taxAmount/2).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>SGST ({((invoiceData as any)?.taxRate || 18)/2}%)</span>
                          <span>{(taxAmount/2).toFixed(2)}</span>
                        </div>
                      </>
                    )}
                    {config.tax.showIgst && (
                      <div className="flex justify-between text-gray-600 border-b border-gray-200 pb-2">
                        <span>IGST ({((invoiceData as any)?.taxRate || 18)}%)</span>
                        <span>{taxAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-900 font-bold text-[14px] pt-1">
                      <span>TOTAL</span>
                      <span>{currencySymbol} {grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                  {renderAmountInWords && (
                    <div className="text-left pt-6">
                      <div className="font-bold text-[10px] text-gray-800">Amount in Words:</div>
                      <div className="text-[10px] text-gray-500 italic mt-0.5">{words}</div>
                    </div>
                  )}
                </div>
              );

            }
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
            if (layout.type === 'Modal Classic') {
              const taxIndex = orderedSections.findIndex(s => s.id === 'taxEngine');
              const amountIndex = orderedSections.findIndex(s => s.id === 'amountInWords');
              if (taxIndex !== -1 && amountIndex === taxIndex + 1) {
                  return null;
              }

              if (!config.amountInWords.enabled) return null;
              const words = numberToWords(invoiceData?.grandTotal || 0, config.amountInWords.format);
              return (
                <div key="amountInWords" style={getSectionStyle('amountInWords')}>
                  <div className="text-right pt-4">
                    <div className="font-bold text-[10px] text-gray-800">Amount in Words:</div>
                    <div className="text-[10px] text-gray-500 italic">{words}</div>
                  </div>
                </div>
              );

            }
             if (!config.amountInWords.enabled) return null;
             const words = numberToWords(invoiceData?.grandTotal || 0, config.amountInWords.format);
             return (
               <div key="amountInWords" style={getSectionStyle('amountInWords')}>
                 <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0 }}>Amount in Words:</p>
                 <p style={{ fontSize: '12px', fontStyle: 'italic', margin: '4px 0', textTransform: 'capitalize' }}>{words}</p>
               </div>
             );
          }
          
          if (section.id === 'terms') {
            if (layout.type === 'Modal Classic') {
              const pIdx = orderedSections.findIndex(s => s.id === 'payment');
              const tIdx = orderedSections.findIndex(s => s.id === 'terms');
              let skipTerms = false;
              if (pIdx !== -1 && tIdx !== -1 && tIdx > pIdx) {
                  skipTerms = true;
                  for (let j = pIdx + 1; j < tIdx; j++) {
                      if (orderedSections[j].id !== 'taxEngine' && orderedSections[j].id !== 'amountInWords') {
                          skipTerms = false;
                          break;
                      }
                  }
              }
              if (skipTerms) return null;

              return (
                <div key="terms" style={getSectionStyle('terms')}>
                  <div className="font-bold text-gray-800 text-[10px] uppercase mb-1">Notes</div>
                  <div className="text-gray-600 text-[10px] leading-relaxed mb-4">{renderInteractive(invoiceData?.notes || 'Thank you for your business!', 'notes', 'textarea')}</div>
                  <div className="font-bold text-gray-800 text-[10px] mb-1">Terms & Conditions</div>
                  <div className="text-gray-600 text-[10px] leading-relaxed whitespace-pre-wrap">{renderInteractive(invoiceData?.invoiceTerms || config.terms.customText, 'invoiceTerms', 'textarea')}</div>
                </div>
              );

            }
             return (
               <div key="terms" style={getSectionStyle('terms')}>
                 <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0, color: '#64748b' }}>Notes</p>
                 <div style={{ fontSize: '10px', margin: '4px 0', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{renderInteractive(invoiceData?.notes || 'Thank you for your business!', 'notes', 'textarea')}</div>
                 <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '8px 0 0 0', color: '#64748b' }}>Terms & Conditions</p>
                 <div style={{ fontSize: '10px', margin: '4px 0', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{renderInteractive(invoiceData?.invoiceTerms || config.terms.customText, 'invoiceTerms', 'textarea')}</div>
               </div>
             );
          }

          if (section.id === 'payment') {
            if (layout.type === 'Modal Classic') {
              const pIdx = orderedSections.findIndex(s => s.id === 'payment');
              const tIdx = orderedSections.findIndex(s => s.id === 'terms');
              let renderTerms = false;
              if (pIdx !== -1 && tIdx !== -1 && tIdx > pIdx) {
                  renderTerms = true;
                  for (let j = pIdx + 1; j < tIdx; j++) {
                      if (orderedSections[j].id !== 'taxEngine' && orderedSections[j].id !== 'amountInWords') {
                          renderTerms = false;
                          break;
                      }
                  }
              }

              return (
                <div key="payment" style={getSectionStyle('payment')}>
                  <div className="font-bold text-gray-800 text-[10px] mb-1">Banking Information</div>
                  <div className="text-gray-600 text-[10px] leading-relaxed whitespace-pre-wrap">
                    {config.payment.generateQrCode && <div style={{width: 60, height: 60, backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '5px'}}>QR</div>}
                    {config.payment.customNote || `Bank Name: Axis\nAccount No.: 098654345678\nIFSC Code: UTIB00056`}
                  </div>
                  {renderTerms && (
                    <div className="pt-6 mt-6 border-t border-gray-200">
                      <div className="font-bold text-gray-800 text-[10px] uppercase mb-1">Notes</div>
                      <div className="text-gray-600 text-[10px] leading-relaxed mb-4">{renderInteractive(invoiceData?.notes || 'Thank you for your business!', 'notes', 'textarea')}</div>
                      <div className="font-bold text-gray-800 text-[10px] mb-1">Terms & Conditions</div>
                      <div className="text-gray-600 text-[10px] leading-relaxed whitespace-pre-wrap">{renderInteractive(invoiceData?.invoiceTerms || config.terms.customText, 'invoiceTerms', 'textarea')}</div>
                    </div>
                  )}
                </div>
              );

            }
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
            if (layout.type === 'Modal Classic') {

              return (
                <div key="signature" style={{ ...getSectionStyle('signature'), textAlign: 'right', marginTop: '48px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                    {config.signature.showStamp && <div style={{width: 60, height: 60, borderRadius: '50%', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#94a3b8'}}>STAMP</div>}
                    {config.signature.showSignature && <div style={{width: 100, borderBottom: '1px solid #000', marginBottom: '5px'}}></div>}
                    <div className="text-[10px] text-gray-600 font-bold">{config.signature.signatoryName || "Authorized Signatory"}</div>
                    <div className="text-[9px] text-gray-400">{config.signature.designation || "Signatory"}</div>
                  </div>
                </div>
              );

            }
             return (
               <div key="signature" style={{ ...getSectionStyle('signature'), display: 'flex', flexDirection: 'column', alignItems: (!sections.terms?.visible) ? 'flex-start' : config.signature.position === 'Right' ? 'flex-end' : config.signature.position === 'Left' ? 'flex-start' : 'center', justifyContent: 'flex-end' }}>
                 <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px' }}>
                   {config.signature.showStamp && (
                     <div style={{ width: 80, height: 80, borderRadius: '50%', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#94a3b8', marginBottom: '10px' }}>STAMP</div>
                   )}
                   {config.signature.showSignature && (
                     <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                       {(businessProfile as any)?.signatureUrl || (businessProfile as any)?.signature ? (
                         <img src={((businessProfile as any).signatureUrl || (businessProfile as any).signature)} alt="Signature" style={{ width: config.signature.width, height: config.signature.height, objectFit: 'contain', marginBottom: '10px' }} />
                       ) : (
                         <div style={{ width: config.signature.width, height: config.signature.height, borderBottom: '1px solid #cbd5e1', marginBottom: '10px' }}></div>
                       )}
                       <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0 }}>{config.signature.signatoryName || compName}</p>
                       <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>{config.signature.designation || 'Authorized Signatory'}</p>
                     </div>
                   )}
                   {!config.signature.showSignature && (
                     <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                       <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0 }}>{config.signature.signatoryName || compName}</p>
                       <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>{config.signature.designation || 'Authorized Signatory'}</p>
                     </div>
                   )}
                 </div>
               </div>
             );
          }
          
          if (section.id === 'footer') {
             return (
               <div key="footer" style={{ ...getSectionStyle('footer'), borderTop: '1px solid #e2e8f0', paddingTop: '20px', marginTop: '20px', textAlign: 'center' }}>
                 {config.footer.message && <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0' }}>{config.footer.message}</p>}
                 {(config.footer.website || config.footer.supportContact || compEmail || compPhone) && (
                     <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0' }}>{[config.footer.website || compEmail, config.footer.supportContact || compPhone].filter(Boolean).join(' | ')}</p>
                 )}
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
