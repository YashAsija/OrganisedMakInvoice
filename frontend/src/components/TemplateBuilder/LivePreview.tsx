import React, { useState, useEffect } from 'react';


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
import { ensureAllColumns } from '../../lib/templatePresets';

const InlineEditable = ({ value, onSave, type = 'text', isNumber = false, options = [], placeholder = '' }: any) => {
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
        val = Number(val.replace(/[^0-9.-]+/g, ""));
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
    const selectedLabel = options.find((opt: any) => opt.value === value)?.label || placeholder || value || '';

    return (
      <div className="relative inline-block max-w-[180px] bg-slate-50 outline-dashed outline-1 outline-sky-300/80 hover:bg-slate-200/50 hover:outline-sky-400 focus-within:bg-white focus-within:outline-solid focus-within:outline-2 focus-within:outline-sky-500 rounded px-1 cursor-pointer transition-all print:outline-none print:bg-transparent print:border-none">
        <span className={`inline-block break-words whitespace-normal text-left max-w-full ${!value ? 'text-slate-400 opacity-60' : ''}`} style={{ fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit' }}>
          {selectedLabel}
        </span>
        <select
          value={value || ''}
          onChange={(e) => onSave(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none"
        >
          {placeholder && <option value="" disabled hidden>{placeholder}</option>}
          {options.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>
    );
  }

  return (
    <span
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      data-placeholder={placeholder}
      className={`editable-placeholder bg-slate-50 outline-dashed outline-1 outline-sky-300/80 hover:bg-slate-200/50 hover:outline-sky-400 focus:bg-white focus:outline-solid focus:outline-2 focus:outline-sky-500 cursor-text transition-all print:outline-none print:bg-transparent print:border-none min-w-[30px] max-w-full inline-block px-0.5 -ml-0.5 py-0 rounded ${type === 'textarea' ? '' : 'truncate'}`}
      style={{ whiteSpace: type === 'textarea' ? 'pre-wrap' : 'normal', wordBreak: 'break-word', outlineOffset: '0px' }}
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

  const [croppedSignature, setCroppedSignature] = useState<string>('');

  useEffect(() => {
    const rawSig = (businessProfile as any)?.signatureUrl || (businessProfile as any)?.signature;
    if (!rawSig) {
      setCroppedSignature('');
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        setCroppedSignature(rawSig);
        return;
      }
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imgData.data;
      let minX = img.width, minY = img.height, maxX = 0, maxY = 0;
      let hasContent = false;

      for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
          const index = (y * img.width + x) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          const a = data[index + 3];

          if (a > 10 && (r < 250 || g < 250 || b < 250)) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            hasContent = true;
          }
        }
      }

      if (!hasContent) {
        setCroppedSignature(rawSig);
        return;
      }

      const pad = 10;
      minX = Math.max(0, minX - pad);
      minY = Math.max(0, minY - pad);
      maxX = Math.min(img.width, maxX + pad);
      maxY = Math.min(img.height, maxY + pad);

      const cropW = maxX - minX;
      const cropH = maxY - minY;

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = cropW;
      cropCanvas.height = cropH;
      const cropCtx = cropCanvas.getContext('2d');
      if (!cropCtx) {
        setCroppedSignature(rawSig);
        return;
      }

      cropCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
      setCroppedSignature(cropCanvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      setCroppedSignature(rawSig);
    };
    img.src = rawSig;
  }, [businessProfile]);

  const renderSelectInteractive = (value: string, fieldKey: string, options: any[], placeholder = '') => {
    if (isInteractive && onUpdateField) {
      return <InlineEditable value={value} onSave={(v: any) => onUpdateField(fieldKey, v)} type="select" options={options} placeholder={placeholder} />;
    }
    return value;
  };

  const renderInteractive = (value: string | number, fieldKey: string, type: 'text' | 'textarea' = 'text', placeholder = '') => {
    if (isInteractive && onUpdateField) {
      return <InlineEditable value={value} onSave={(v: any) => onUpdateField(fieldKey, v)} type={type} placeholder={placeholder} />;
    }
    return value;
  };

  const renderItemInteractive = (itemId: string, value: string | number, fieldKey: string, type: 'text' | 'textarea' | 'number' = 'text', placeholder = '') => {
    if (isInteractive && onUpdateItemField) {
      return <InlineEditable value={value} onSave={(v: any) => {
        if (fieldKey === 'taxPercentage_cgst' || fieldKey === 'taxPercentage_sgst') {
          onUpdateItemField(itemId, 'taxPercentage', Number(v) * 2);
        } else {
          onUpdateItemField(itemId, fieldKey, v);
        }
      }} type={type} isNumber={type === 'number'} placeholder={placeholder} />;
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

    const padVal = bg ? '15px' : '0px';
    return {
      backgroundColor: bg || 'transparent',
      borderRadius: getBorderRadius(),
      paddingTop: padVal,
      paddingRight: padVal,
      paddingBottom: padVal,
      paddingLeft: padVal,
      marginBottom: styleConfig.spacing === 'Compact' ? '10px' : styleConfig.spacing === 'Spacious' ? '30px' : '20px',
      gridColumn: `${colStart} / span ${span}`
    };
  };

  // Safe data getters
  const compName = (businessProfile as any)?.name || (businessProfile as any)?.companyName || 'Shiv Hardware';
  const compAddr = businessProfile?.address || '123 Business Block, Main Street, New Delhi, India';
  const compGst = (businessProfile as any)?.taxId || (businessProfile as any)?.gstin || '07AAAAA1111A1Z1';
  const compPhone = businessProfile?.phone || '+91 9899728185';
  const compEmail = businessProfile?.email || 'contact@shivhardware.com';
  const compPan = (businessProfile as any)?.pan || 'ABCDE1234F';
  const compWebsite = (businessProfile as any)?.website || 'www.shivhardware.com';
  const compLogo = (businessProfile as any)?.logoUrl || (businessProfile as any)?.logo || null;

  const invNo = invoiceData?.invoiceNumber || 'INV-2023-001';
  const invDate = invoiceData?.date || '';
  const dueDate = invoiceData?.dueDate || '';

  const clientName = invoiceData?.clientName || (isInteractive ? '' : 'Sameer Enterprises');
  const clientAddr = invoiceData?.clientAddress || (isInteractive ? '' : 'Plot No. 45, Phase 3, Okhla Industrial Area, New Delhi');
  const clientGst = (invoiceData as any)?.clientGstin || (invoiceData as any)?.clientTaxId || (isInteractive ? '' : '07SM123456789A1');
  const clientPhone = invoiceData?.clientPhone || (isInteractive ? '' : '+91 9999988888');
  const clientEmail = invoiceData?.clientEmail || (isInteractive ? '' : 'sameer@enterprises.com');
  const clientState = (invoiceData as any)?.clientState || (isInteractive ? '' : 'Delhi');
  const clientCountry = (invoiceData as any)?.clientCountry || (isInteractive ? '' : 'India');

  const items: any[] = invoiceData?.items || [];

  const subTotal = items.reduce((a: number, b: any) => a + ((b as any).amount || ((b as any).quantity * (b as any).rate) || 0), 0);
  const taxMode = invoiceData?.taxMode || businessProfile?.taxMode || 'dynamic';
  const taxName = taxMode === 'custom'
    ? (invoiceData?.customTaxName || businessProfile?.customTaxName || 'Tax')
    : 'GST';

  const taxRate = taxMode === 'custom'
    ? ((invoiceData as any)?.customTaxPercentage !== undefined ? (invoiceData as any).customTaxPercentage : (businessProfile?.customTaxPercentage !== undefined ? businessProfile.customTaxPercentage : 18))
    : ((invoiceData as any)?.taxRate !== undefined ? (invoiceData as any).taxRate : (businessProfile?.defaultTaxRate !== undefined ? businessProfile.defaultTaxRate : 18));

  const shipState = ((invoiceData as any)?.shippedToState || invoiceData?.clientState || '').trim().toLowerCase();
  const shipCountry = ((invoiceData as any)?.shippedToCountry || invoiceData?.clientCountry || '').trim().toLowerCase() || 'india';
  const compCountry = ((businessProfile as any)?.country || 'india').trim().toLowerCase();
  const compState = ((businessProfile as any)?.state || '').trim().toLowerCase();

  let dynamicTaxHeader = 'TAX %';
  if (taxMode === 'custom') {
    dynamicTaxHeader = `${taxName} (${taxRate}%)`;
  } else {
    if ((compCountry === 'india' || compCountry === 'in') && shipState === compState && shipState !== '') {
      dynamicTaxHeader = `CGST + SGST (${taxRate}%)`;
    } else {
      dynamicTaxHeader = `IGST (${taxRate}%)`;
    }
  }

  const taxAmount = (subTotal * taxRate) / 100;
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
              const renderLogoPlaceholder = (position: 'Left' | 'Right' | 'Center') => (
                <div style={{ width: config.header.logoWidth * 1.4, height: config.header.logoHeight * 1.4, border: '2px dashed #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', backgroundColor: '#f8fafc', marginBottom: position === 'Center' ? '10px' : '0px' }}>
                  Logo Space
                </div>
              );

              if (config.header.logoPosition === 'Center' && config.header.showLogo) {
                return (
                  <div key="header" style={{ ...getSectionStyle('header'), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: '0px', marginBottom: '0px' }}>
                    {compLogo ? (
                      <div style={{ width: config.header.logoWidth * 1.4, height: config.header.logoHeight * 1.4, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                        <img src={compLogo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      </div>
                    ) : (
                      renderLogoPlaceholder('Center')
                    )}
                    <h1 className="text-3xl font-bold tracking-wider text-gray-900 uppercase" style={{ color: styleConfig.primaryColor, textAlign: config.header.titleAlignment === 'Right' ? 'right' : config.header.titleAlignment === 'Left' ? 'left' : 'center' }}>{config.header.invoiceTitle}</h1>
                  </div>
                );
              }

              return (
                <div key="header" style={{ ...getSectionStyle('header'), display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0px', marginBottom: '0px' }}>
                  {config.header.logoPosition === 'Left' && config.header.showLogo && (
                    compLogo ? (
                      <div style={{ width: config.header.logoWidth * 1.4, height: config.header.logoHeight * 1.4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={compLogo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      </div>
                    ) : (
                      renderLogoPlaceholder('Left')
                    )
                  )}

                  <div style={{ flex: 1, textAlign: config.header.titleAlignment === 'Right' ? 'right' : config.header.titleAlignment === 'Left' ? 'left' : 'center' }}>
                    <h1 className="text-3xl font-bold tracking-wider text-gray-900 uppercase" style={{ color: styleConfig.primaryColor }}>{config.header.invoiceTitle}</h1>
                  </div>

                  {config.header.logoPosition === 'Right' && config.header.showLogo && (
                    compLogo ? (
                      <div style={{ width: config.header.logoWidth * 1.4, height: config.header.logoHeight * 1.4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={compLogo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      </div>
                    ) : (
                      renderLogoPlaceholder('Right')
                    )
                  )}
                </div>
              );
            }
            const isPremium = styleConfig.sectionBackgroundColors['header'] !== undefined;
            const textColor = isPremium ? '#ffffff' : styleConfig.primaryColor;

            if (config.header.logoPosition === 'Center' && config.header.showLogo) {
              return (
                <div key="header" style={{ ...getSectionStyle('header'), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: textColor }}>
                  {compLogo ? (
                    <div style={{ width: config.header.logoWidth * 1.4, height: config.header.logoHeight * 1.4, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                      <img src={compLogo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    </div>
                  ) : (
                    <div style={{ width: config.header.logoWidth * 1.4, height: config.header.logoHeight * 1.4, border: '2px dashed #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', backgroundColor: '#f8fafc', marginBottom: '10px' }}>
                      Logo Space
                    </div>
                  )}
                  <h1 style={{ color: textColor, fontSize: '32px', margin: 0, fontWeight: 'bold' }}>{config.header.invoiceTitle}</h1>
                </div>
              );
            }

            return (
              <div key="header" style={{ ...getSectionStyle('header'), display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: textColor }}>
                {config.header.logoPosition === 'Left' && config.header.showLogo && (
                  compLogo ? (
                    <div style={{ width: config.header.logoWidth * 1.4, height: config.header.logoHeight * 1.4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={compLogo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    </div>
                  ) : (
                    <div style={{ width: config.header.logoWidth * 1.4, height: config.header.logoHeight * 1.4, border: '2px dashed #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
                      Logo Space
                    </div>
                  )
                )}

                <div style={{ flex: 1, textAlign: config.header.titleAlignment === 'Right' ? 'right' : config.header.titleAlignment === 'Left' ? 'left' : 'center' }}>
                  <h1 style={{ color: textColor, fontSize: '32px', margin: 0, fontWeight: 'bold' }}>{config.header.invoiceTitle}</h1>
                </div>

                {config.header.logoPosition === 'Right' && config.header.showLogo && (
                  compLogo ? (
                    <div style={{ width: config.header.logoWidth * 1.4, height: config.header.logoHeight * 1.4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={compLogo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    </div>
                  ) : (
                    <div style={{ width: config.header.logoWidth * 1.4, height: config.header.logoHeight * 1.4, border: '2px dashed #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
                      Logo Space
                    </div>
                  )
                )}
              </div>
            );
          }

          if (section.id === 'companyInfo') {
            if (layout.type === 'Modal Classic') {
              if (!compLogo && !config.header.showLogo) return null;

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
                <div key="invoiceInfo" style={{ ...getSectionStyle('invoiceInfo'), paddingTop: '0px', paddingRight: '0px', paddingBottom: '0px', paddingLeft: '0px' }}>
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

              const clientCountry = (invoiceData as any)?.clientCountry || (isInteractive ? "" : "India");
              const clientState = (invoiceData as any)?.clientState || (isInteractive ? "" : "Delhi");
              const isAdjacent = dynamicSpans['billTo'] !== 12;
              const amigoIndex = orderedSections.filter(s => ['billTo', 'shipTo', 'transport'].includes(s.id)).findIndex(a => a.id === 'billTo');
              const isSecondCol = amigoIndex === 1;

              return (
                <div key="billTo" style={{ ...getSectionStyle('billTo'), paddingTop: '0px', paddingRight: '0px', paddingBottom: '0px', paddingLeft: '0px', marginTop: '20px' }}>
                  <div className={`border border-gray-300 p-2.5 h-full flex ${isAdjacent ? 'flex-col gap-y-0.5' : 'flex-wrap items-center gap-x-6 gap-y-1'}`}>
                    <h3 className={`font-bold text-[11px] text-gray-800 uppercase ${isAdjacent ? 'mb-1' : 'w-full mb-0'}`}>BILLED TO</h3>
                    {config.client.fields.includes('name') && <div className={`${isAdjacent ? 'text-[12px] font-medium text-gray-900 mb-0.5' : 'flex items-center text-[10px]'}`}>{isAdjacent ? renderInteractive(clientName, 'clientName', 'text', 'Client Name') : <><span className="text-gray-500 font-medium mr-1">Name:</span><span className="text-gray-900 font-bold">{renderInteractive(clientName, 'clientName', 'text', 'Client Name')}</span></>}</div>}
                    {config.client.fields.includes('phone') && (
                      isAdjacent ? <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">Party Mobile No</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive(clientPhone, 'clientPhone', 'text', 'Phone')}</span></div> :
                        <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">Mobile No:</span><span className="text-gray-900 font-bold">{renderInteractive(clientPhone, 'clientPhone', 'text', 'Phone')}</span></div>
                    )}
                    {config.client.fields.includes('email') && (
                      isAdjacent ? <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">Email</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive(clientEmail, 'clientEmail', 'text', 'Email')}</span></div> :
                        <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">Email:</span><span className="text-gray-900 font-bold">{renderInteractive(clientEmail, 'clientEmail', 'text', 'Email')}</span></div>
                    )}
                    {config.client.fields.includes('address') && (
                      isAdjacent ? <>
                        <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">Country</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderSelectInteractive(clientCountry, 'clientCountry', Country.getAllCountries().map(c => ({ label: c.name, value: c.name })), 'Select Country')}</span></div>
                        <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">State</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderSelectInteractive(clientState, 'clientState', State.getStatesOfCountry(Country.getAllCountries().find(c => c.name === clientCountry)?.isoCode || '').map(s => ({ label: s.name, value: s.name })), 'Select State')}</span></div>
                        <div className="flex items-start text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">Address</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive(clientAddr, 'clientAddress', 'textarea', 'Address')}</span></div>
                      </> : <>
                        <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">Country:</span><span className="text-gray-900 font-bold">{renderSelectInteractive(clientCountry, 'clientCountry', Country.getAllCountries().map(c => ({ label: c.name, value: c.name })), 'Select Country')}</span></div>
                        <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">State:</span><span className="text-gray-900 font-bold">{renderSelectInteractive(clientState, 'clientState', State.getStatesOfCountry(Country.getAllCountries().find(c => c.name === clientCountry)?.isoCode || '').map(s => ({ label: s.name, value: s.name })), 'Select State')}</span></div>
                        <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">Address:</span><span className="text-gray-900 font-bold">{renderInteractive(clientAddr, 'clientAddress', 'textarea', 'Address')}</span></div>
                      </>
                    )}
                    {config.client.fields.includes('gstin') && (
                      isAdjacent ? <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">GSTIN / UIN</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive(clientGst, 'clientGstin', 'text', 'GSTIN')}</span></div> :
                        <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">GSTIN:</span><span className="text-gray-900 font-bold">{renderInteractive(clientGst, 'clientGstin', 'text', 'GSTIN')}</span></div>
                    )}
                    {config.client.fields.includes('pan') && (
                      isAdjacent ? <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">PAN</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive((invoiceData as any)?.clientPan || (isInteractive ? '' : 'ABCDE1234F'), 'clientPan', 'text', 'PAN')}</span></div> :
                        <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">PAN:</span><span className="text-gray-900 font-bold">{renderInteractive((invoiceData as any)?.clientPan || (isInteractive ? '' : 'ABCDE1234F'), 'clientPan', 'text', 'PAN')}</span></div>
                    )}
                  </div>
                </div>
              );

            }
            const clientCountryNM = clientCountry;
            const clientStateNM = clientState;
            return (
              <div key="billTo" style={getSectionStyle('billTo')}>
                <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>Bill To</h4>
                <h3 style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>{renderInteractive(clientName, 'clientName', 'text', 'Client Name')}</h3>
                {config.client.fields.includes('address') && <>
                  <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Country:</strong> {renderSelectInteractive(clientCountryNM, 'clientCountry', Country.getAllCountries().map(c => ({ label: c.name, value: c.name })), 'Select Country')}</p>
                  <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>State:</strong> {renderSelectInteractive(clientStateNM, 'clientState', State.getStatesOfCountry(Country.getAllCountries().find(c => c.name === clientCountryNM)?.isoCode || '').map(s => ({ label: s.name, value: s.name })), 'Select State')}</p>
                  <p style={{ fontSize: '12px', margin: '2px 0', whiteSpace: 'pre-wrap' }}>{renderInteractive(clientAddr, 'clientAddress', 'textarea', 'Address')}</p>
                </>}
                {config.client.fields.includes('gstin') && (clientGst || isInteractive) && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>GSTIN:</strong> {renderInteractive(clientGst, 'clientGstin', 'text', 'GSTIN')}</p>}
                {config.client.fields.includes('phone') && (clientPhone || isInteractive) && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Phone:</strong> {renderInteractive(clientPhone, 'clientPhone', 'text', 'Phone')}</p>}
                {config.client.fields.includes('email') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Email:</strong> {renderInteractive(clientEmail, 'clientEmail', 'text', 'Email')}</p>}
              </div>
            );
          }

          if (section.id === 'shipTo') {
            const shipName = (invoiceData as any)?.shippedToName || (isInteractive ? '' : 'Sameer Enterprises');
            const shipPhone = (invoiceData as any)?.shippedToPhone || (isInteractive ? '' : '+91 9999988888');
            const shipEmail = (invoiceData as any)?.shippedToEmail || (isInteractive ? '' : 'sameer@enterprises.com');
            const shipPan = (invoiceData as any)?.shippedToPan || (isInteractive ? '' : 'PANSM1234E');
            const shipCountry = (invoiceData as any)?.shippedToCountry || (isInteractive ? '' : 'India');
            const shipState = (invoiceData as any)?.shippedToState || (isInteractive ? '' : 'Delhi');
            const shipAddr = (invoiceData as any)?.shippedToAddress || (isInteractive ? '' : 'Plot No. 45, Phase 3, Okhla Industrial Area, New Delhi');
            const shipGst = (invoiceData as any)?.shippedToGstin || (isInteractive ? '' : '07SM123456789A1');

            if (layout.type === 'Modal Classic') {

              const isAdjacent = dynamicSpans['shipTo'] !== 12;
              const amigoIndex = orderedSections.filter(s => ['billTo', 'shipTo', 'transport'].includes(s.id)).findIndex(a => a.id === 'shipTo');
              const isSecondCol = amigoIndex === 1;

              return (
                <div key="shipTo" style={{ ...getSectionStyle('shipTo'), paddingTop: '0px', paddingRight: '0px', paddingBottom: '0px', paddingLeft: '0px', marginTop: '20px' }}>
                  <div className={`border border-gray-300 p-2.5 h-full flex ${isAdjacent ? 'flex-col gap-y-0.5' : 'flex-wrap items-center gap-x-6 gap-y-1'}`}>
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
                      {config.shipping.fields.includes('name') && <div className={`${isAdjacent ? 'text-[12px] font-medium text-gray-900 mb-0.5' : 'flex items-center text-[10px]'}`}>{isAdjacent ? renderInteractive(shipName, 'shippedToName', 'text', 'Client Name') : <><span className="text-gray-500 font-medium mr-1">Name:</span><span className="text-gray-900 font-bold">{renderInteractive(shipName, 'shippedToName', 'text', 'Client Name')}</span></>}</div>}
                      {config.shipping.fields.includes('phone') && (
                        isAdjacent ? <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">Party Mobile No</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive(shipPhone, 'shippedToPhone', 'text', 'Phone')}</span></div> :
                          <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">Mobile No:</span><span className="text-gray-900 font-bold">{renderInteractive(shipPhone, 'shippedToPhone', 'text', 'Phone')}</span></div>
                      )}
                      {config.shipping.fields.includes('email') && (
                        isAdjacent ? <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">Email ID</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive(shipEmail, 'shippedToEmail', 'text', 'Email')}</span></div> :
                          <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">Email:</span><span className="text-gray-900 font-bold">{renderInteractive(shipEmail, 'shippedToEmail', 'text', 'Email')}</span></div>
                      )}
                      {config.shipping.fields.includes('pan') && (
                        isAdjacent ? <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">PAN</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive(shipPan, 'shippedToPan', 'text', 'PAN')}</span></div> :
                          <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">PAN:</span><span className="text-gray-900 font-bold">{renderInteractive(shipPan, 'shippedToPan', 'text', 'PAN')}</span></div>
                      )}
                      {config.shipping.fields.includes('email') && (
                        isAdjacent ? <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">Email ID</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive(shipEmail, 'shippedToEmail', 'text', 'Email')}</span></div> :
                          <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">Email:</span><span className="text-gray-900 font-bold">{renderInteractive(shipEmail, 'shippedToEmail', 'text', 'Email')}</span></div>
                      )}
                      {config.shipping.fields.includes('pan') && (
                        isAdjacent ? <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">PAN</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive(shipPan, 'shippedToPan', 'text', 'PAN')}</span></div> :
                          <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">PAN:</span><span className="text-gray-900 font-bold">{renderInteractive(shipPan, 'shippedToPan', 'text', 'PAN')}</span></div>
                      )}
                      {config.shipping.fields.includes('address') && (
                        isAdjacent ? <>
                          <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">Country</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderSelectInteractive(shipCountry, 'shippedToCountry', Country.getAllCountries().map(c => ({ label: c.name, value: c.name })), 'Select Country')}</span></div>
                          <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">State</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderSelectInteractive(shipState, 'shippedToState', State.getStatesOfCountry(Country.getAllCountries().find(c => c.name === shipCountry)?.isoCode || '').map(s => ({ label: s.name, value: s.name })), 'Select State')}</span></div>
                          <div className="flex items-start text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">Address</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive(shipAddr, 'shippedToAddress', 'textarea', 'Address')}</span></div>
                        </> : <>
                          <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">Country:</span><span className="text-gray-900 font-bold">{renderSelectInteractive(shipCountry, 'shippedToCountry', Country.getAllCountries().map(c => ({ label: c.name, value: c.name })), 'Select Country')}</span></div>
                          <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">State:</span><span className="text-gray-900 font-bold">{renderSelectInteractive(shipState, 'shippedToState', State.getStatesOfCountry(Country.getAllCountries().find(c => c.name === shipCountry)?.isoCode || '').map(s => ({ label: s.name, value: s.name })), 'Select State')}</span></div>
                          <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">Address:</span><span className="text-gray-900 font-bold">{renderInteractive(shipAddr, 'shippedToAddress', 'textarea', 'Address')}</span></div>
                        </>
                      )}
                      {config.shipping.fields.includes('gstin') && (
                        isAdjacent ? <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">GSTIN / UIN</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive(shipGst, 'shippedToGstin', 'text', 'GSTIN')}</span></div> :
                          <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">GSTIN:</span><span className="text-gray-900 font-bold">{renderInteractive(shipGst, 'shippedToGstin', 'text', 'GSTIN')}</span></div>
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
                  <h3 style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>{renderInteractive(shipName, "shippedToName", 'text', 'Client Name')}</h3>
                  {config.shipping.fields.includes('address') && <>
                    <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Country:</strong> {renderSelectInteractive(shipCountry, 'shippedToCountry', Country.getAllCountries().map(c => ({ label: c.name, value: c.name })), 'Select Country')}</p>
                    <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>State:</strong> {renderSelectInteractive(shipState, 'shippedToState', State.getStatesOfCountry(Country.getAllCountries().find(c => c.name === shipCountry)?.isoCode || '').map(s => ({ label: s.name, value: s.name })), 'Select State')}</p>
                    <p style={{ fontSize: '12px', margin: '2px 0', whiteSpace: 'pre-wrap' }}>{renderInteractive(shipAddr, 'shippedToAddress', 'textarea', 'Address')}</p>
                  </>}
                  {config.shipping.fields.includes('gstin') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>GSTIN:</strong> {renderInteractive(shipGst, 'shippedToGstin', 'text', 'GSTIN')}</p>}
                  {config.shipping.fields.includes('phone') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Phone:</strong> {renderInteractive(shipPhone, 'shippedToPhone', 'text', 'Phone')}</p>}
                  {config.shipping.fields.includes('email') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Email:</strong> {renderInteractive(shipEmail, 'shippedToEmail', 'text', 'Email')}</p>}
                  {config.shipping.fields.includes('pan') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>PAN:</strong> {renderInteractive(shipPan, 'shippedToPan', 'text', 'PAN')}</p>}
                </>
              </div>
            );
          }

          if (section.id === 'productTable') {
            if (layout.type === 'Modal Classic') {

              const visibleCols = ensureAllColumns(config.table.columns).filter(c => c.visible);
              const isLocalTax = taxMode !== 'custom' && (compCountry === 'india' || compCountry === 'in') && shipState === compState && shipState !== '';
              const renderCols = (() => {
                const cols: any[] = [];
                visibleCols.forEach(col => {
                  if (col.id === 'tax' && isLocalTax) {
                    cols.push({
                      ...col,
                      id: 'cgst',
                      label: `CGST (${taxRate / 2}%)`
                    });
                    cols.push({
                      ...col,
                      id: 'sgst',
                      label: `SGST (${taxRate / 2}%)`
                    });
                  } else {
                    cols.push(col);
                  }
                });
                return cols;
              })();

              return (
                <div key="productTable" style={{ ...getSectionStyle('productTable'), marginTop: '20px' }}>
                  <table className="w-full text-left border-collapse border border-gray-300">
                    <thead>
                      <tr className="text-white text-[10px] uppercase tracking-wide" style={{ backgroundColor: styleConfig.tableHeaderBackground, color: styleConfig.tableHeaderTextColor }}>
                        {renderCols.map(col => (
                          <th key={col.id} className="py-2.5 px-3 border border-gray-300 text-left uppercase">
                            {col.id === 'tax' ? dynamicTaxHeader : col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-300">
                      {items.map((item, idx) => {
                        return (
                          <tr key={idx} className="align-top text-[11px] relative group">
                            {renderCols.map((col, colIdx) => (
                              <td key={col.id} style={{ verticalAlign: 'top' }} className={`py-3 px-3 border-r border-gray-300 relative ${colIdx === 0 && isInteractive ? 'pl-7' : ''} ${col.id === 'sr' ? 'text-left text-gray-500' : 'text-left font-bold'}`}>
                                {colIdx === 0 && isInteractive && onInteractiveRemoveItem && (
                                  <button
                                    onClick={() => onInteractiveRemoveItem(item.id)}
                                    className="print:hidden absolute left-1 top-[12px] text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-rose-50 rounded"
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
                                ) : col.id === 'hsn' ? renderItemInteractive(item.id, (item as any).hsnCode || (item as any).sacCode || '-', 'hsnCode') : col.id === 'qty' ? (
                                  <div className="flex flex-col items-start">
                                    <div>{renderItemInteractive(item.id, item.quantity, 'quantity', 'number')}</div>
                                    {((item as any).quantityType || isInteractive) && (
                                      <div className="text-[9px] text-gray-500 mt-0.5 font-normal normal-case">
                                        {renderItemInteractive(item.id, (item as any).quantityType || '', 'quantityType', 'text', 'type')}
                                      </div>
                                    )}
                                  </div>
                                ) : col.id === 'rate' ? (
                                  <div className="inline-flex items-center justify-start gap-0.5 w-full font-bold text-gray-900">
                                    <span className="text-gray-500 font-medium">{currencySymbol}</span>
                                    <span>{renderItemInteractive(item.id, (item as any).rate, 'rate', 'number')}</span>
                                  </div>
                                ) : col.id === 'tax' ? (
                                  <div className="inline-flex items-center justify-start gap-0.5 w-full font-bold text-gray-900">
                                    <span>{renderItemInteractive(item.id, (item as any).taxPercentage || 0, 'taxPercentage', 'number')}</span>
                                    <span className="text-gray-500 font-medium">%</span>
                                  </div>
                                ) : col.id === 'cgst' ? (
                                  <div className="inline-flex items-center justify-start gap-0.5 w-full font-bold text-gray-900">
                                    <span>{renderItemInteractive(item.id, ((item as any).taxPercentage || 0) / 2, 'taxPercentage_cgst', 'number')}</span>
                                    <span className="text-gray-500 font-medium">%</span>
                                  </div>
                                ) : col.id === 'sgst' ? (
                                  <div className="inline-flex items-center justify-start gap-0.5 w-full font-bold text-gray-900">
                                    <span>{renderItemInteractive(item.id, ((item as any).taxPercentage || 0) / 2, 'taxPercentage_sgst', 'number')}</span>
                                    <span className="text-gray-500 font-medium">%</span>
                                  </div>
                                ) : col.id === 'amount' ? (
                                  <div className="inline-flex items-center justify-start gap-0.5 w-full font-bold text-gray-900">
                                    <span className="text-gray-500 font-medium">{currencySymbol}</span>
                                    <span>{((item as any).amount || (item as any).quantity * (item as any).rate).toFixed(2)}</span>
                                  </div>
                                ) : '-'}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                      {isInteractive && onInteractiveAddItem && (
                        <tr className="print:hidden border-t border-dashed border-gray-300">
                          <td colSpan={renderCols.length} className="py-2 px-3 text-center">
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
            const visibleCols = ensureAllColumns(config.table.columns).filter(c => c.visible);
            const isLocalTax = taxMode !== 'custom' && (compCountry === 'india' || compCountry === 'in') && shipState === compState && shipState !== '';
            const renderCols = (() => {
              const cols: any[] = [];
              visibleCols.forEach(col => {
                if (col.id === 'tax' && isLocalTax) {
                  cols.push({
                    ...col,
                    id: 'cgst',
                    label: `CGST (${taxRate / 2}%)`
                  });
                  cols.push({
                    ...col,
                    id: 'sgst',
                    label: `SGST (${taxRate / 2}%)`
                  });
                } else {
                  cols.push(col);
                }
              });
              return cols;
            })();

            return (
              <div key="productTable" style={getSectionStyle('productTable')}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: styleConfig.tableHeaderBackground, color: styleConfig.tableHeaderTextColor }}>
                      {renderCols.map((col, idx) => (
                        <th key={col.id} style={{ padding: '10px', textAlign: 'left', borderRadius: styleConfig.roundedCorners ? (idx === 0 ? '8px 0 0 8px' : idx === renderCols.length - 1 ? '0 8px 8px 0' : '0') : '0' }}>{col.id === 'tax' ? dynamicTaxHeader.toUpperCase() : col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="relative group" style={{ borderBottom: styleConfig.borderStyle !== 'None' ? '1px solid #e2e8f0' : 'none', backgroundColor: styleConfig.alternatingRowColors && index % 2 !== 0 ? '#f8fafc' : 'transparent' }}>
                        {renderCols.map((col, colIdx) => (
                          <td key={col.id} style={{ padding: '10px', paddingLeft: colIdx === 0 && isInteractive ? '28px' : '10px', textAlign: 'left', position: colIdx === 0 ? 'relative' : undefined, verticalAlign: 'top' }}>
                            {colIdx === 0 && isInteractive && onInteractiveRemoveItem && (
                              <button
                                onClick={() => onInteractiveRemoveItem(item.id)}
                                className="print:hidden absolute left-1 top-[10px] text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-rose-50 rounded"
                                title="Remove Item"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                              </button>
                            )}
                            {col.id === 'sr' ? index + 1 :
                              col.id === 'name' ? renderItemInteractive(item.id, item.name, 'name') :
                                col.id === 'hsn' ? renderItemInteractive(item.id, (item as any).hsnCode || (item as any).sacCode || '-', 'hsnCode') :
                                  col.id === 'qty' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                      <div>{renderItemInteractive(item.id, item.quantity, 'quantity', 'number')}</div>
                                      {((item as any).quantityType || isInteractive) && (
                                        <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px', fontWeight: 'normal' }}>
                                          {renderItemInteractive(item.id, (item as any).quantityType || '', 'quantityType', 'text', 'type')}
                                        </div>
                                      )}
                                    </div>
                                  ) :
                                    col.id === 'rate' ? (
                                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', width: '100%', justifyContent: 'flex-start' }}>
                                        <span style={{ color: '#64748b', fontWeight: 'normal' }}>{currencySymbol}</span>
                                        {renderItemInteractive(item.id, item.rate, 'rate', 'number')}
                                      </div>
                                    ) :
                                      col.id === 'tax' ? <>{renderItemInteractive(item.id, (item as any).taxPercentage || 0, 'taxPercentage', 'number')}%</> :
                                        col.id === 'cgst' ? <>{renderItemInteractive(item.id, ((item as any).taxPercentage || 0) / 2, 'taxPercentage_cgst', 'number')}%</> :
                                          col.id === 'sgst' ? <>{renderItemInteractive(item.id, ((item as any).taxPercentage || 0) / 2, 'taxPercentage_sgst', 'number')}%</> :
                                            col.id === 'amount' ? (
                                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', width: '100%', justifyContent: 'flex-start' }}>
                                                <span style={{ color: '#64748b', fontWeight: 'normal' }}>{currencySymbol}</span>
                                                <span>{((item as any).amount ? (item as any).amount.toFixed(2) : ((item as any).quantity * (item as any).rate).toFixed(2) || '-')}</span>
                                              </div>
                                            ) : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {isInteractive && onInteractiveAddItem && (
                      <tr className="print:hidden border-t border-dashed" style={{ borderColor: '#e2e8f0' }}>
                        <td colSpan={renderCols.length} style={{ padding: '8px', textAlign: 'center' }}>
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
            const bothAdded = !!(sections.billTo?.visible && sections.shipTo?.visible);

            if (layout.type === 'Modal Classic') {

              const vehicleNo = (invoiceData as any)?.vehicleNo || (isInteractive ? "" : "N/A");
              const driverMobile = (invoiceData as any)?.driverMobileNo || (isInteractive ? "" : "N/A");
              const station = (invoiceData as any)?.station || (isInteractive ? "" : "N/A");
              const ewayBillNo = (invoiceData as any)?.eWayBillNo || (isInteractive ? "" : "N/A");
              const poNumber = invoiceData?.poNumber || (isInteractive ? "" : "N/A");

              const isAdjacent = dynamicSpans['transport'] !== 12;
              const amigoIndex = orderedSections.filter(s => ['billTo', 'shipTo', 'transport'].includes(s.id)).findIndex(a => a.id === 'transport');
              const isSecondCol = amigoIndex === 1;

              return (
                <div key="transport" style={{ ...getSectionStyle('transport'), paddingTop: '0px', paddingRight: '0px', paddingBottom: '0px', paddingLeft: '0px', marginTop: '20px' }}>
                  <div className={`border border-gray-300 p-2.5 h-full flex ${(isAdjacent && !bothAdded) ? 'flex-col gap-y-0.5' : 'flex-wrap items-center gap-x-6 gap-y-1'}`} style={{ borderLeft: isSecondCol ? 'none' : '1px solid #d1d5db' }}>
                    <div className={`flex justify-between items-center ${(isAdjacent && !bothAdded) ? 'mb-1' : 'w-full mb-0'}`}>
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
                      (isAdjacent && !bothAdded) ?
                        <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">Vehicle No.</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive(vehicleNo, 'vehicleNo', 'text', 'Vehicle No')}</span></div> :
                        <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">Vehicle No:</span><span className="text-gray-900 font-bold">{renderInteractive(vehicleNo, 'vehicleNo', 'text', 'Vehicle No')}</span></div>
                    )}
                    {config.transport.fields.includes('poNumber') && (
                      (isAdjacent && !bothAdded) ?
                        <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">PO Number</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive(poNumber, 'poNumber', 'text', 'PO Number')}</span></div> :
                        <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">PO Number:</span><span className="text-gray-900 font-bold">{renderInteractive(poNumber, 'poNumber', 'text', 'PO Number')}</span></div>
                    )}
                    {config.transport.fields.includes('transportName') && (
                      (isAdjacent && !bothAdded) ?
                        <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">Transport Name</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive((invoiceData as any)?.transportName || (isInteractive ? '' : 'N/A'), 'transport', 'text', 'Transporter Name')}</span></div> :
                        <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">Transport Name:</span><span className="text-gray-900 font-bold">{renderInteractive((invoiceData as any)?.transportName || (isInteractive ? '' : 'N/A'), 'transport', 'text', 'Transporter Name')}</span></div>
                    )}
                    {config.transport.fields.includes('driverMobileNo') && (
                      (isAdjacent && !bothAdded) ?
                        <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">Driver Mobile</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive(driverMobile, 'driverMobile', 'text', 'Driver Mobile')}</span></div> :
                        <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">Driver Mobile:</span><span className="text-gray-900 font-bold">{renderInteractive(driverMobile, 'driverMobile', 'text', 'Driver Mobile')}</span></div>
                    )}
                    {config.transport.fields.includes('station') && (
                      (isAdjacent && !bothAdded) ?
                        <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">Station</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive(station, 'station', 'text', 'Station')}</span></div> :
                        <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">Station:</span><span className="text-gray-900 font-bold">{renderInteractive(station, 'station', 'text', 'Station')}</span></div>
                    )}
                    {config.transport.fields.includes('eWayBillNo') && (
                      (isAdjacent && !bothAdded) ?
                        <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">E-Way Bill No.</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive(ewayBillNo, 'ewayBillNo', 'text', 'E-Way Bill No')}</span></div> :
                        <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">E-Way Bill No:</span><span className="text-gray-900 font-bold">{renderInteractive(ewayBillNo, 'ewayBillNo', 'text', 'E-Way Bill No')}</span></div>
                    )}
                  </div>
                </div>
              );

            }
            return (
              <div key="transport" style={getSectionStyle('transport')}>
                <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>Transport Details</h4>
                <div style={bothAdded ? { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '24px', alignItems: 'center' } : {}}>
                  {config.transport.fields.includes('vehicleNo') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Vehicle No:</strong> {renderInteractive((invoiceData as any)?.vehicleNo || (isInteractive ? '' : 'MH 12 AB 1234'), 'vehicleNo', 'text', 'Vehicle No')}</p>}
                  {config.transport.fields.includes('poNumber') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>PO Number:</strong> {renderInteractive((invoiceData as any)?.poNumber || (isInteractive ? '' : 'N/A'), 'poNumber', 'text', 'PO Number')}</p>}
                  {config.transport.fields.includes('transportName') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Transporter:</strong> {renderInteractive((invoiceData as any)?.transportName || (isInteractive ? '' : 'Fast Logistics'), 'transport', 'text', 'Transporter Name')}</p>}
                  {config.transport.fields.includes('eWayBillNo') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>E-Way Bill No:</strong> {renderInteractive((invoiceData as any)?.eWayBillNo || (isInteractive ? '' : '123456789012'), 'ewayBillNo', 'text', 'E-Way Bill No')}</p>}
                  {config.transport.fields.includes('station') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Station:</strong> {renderInteractive((invoiceData as any)?.station || (isInteractive ? '' : 'Mumbai HQ'), 'station', 'text', 'Station')}</p>}
                  {config.transport.fields.includes('driverMobileNo') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Driver Mobile No:</strong> {renderInteractive((invoiceData as any)?.driverMobileNo || (isInteractive ? '' : '+91 9876543210'), 'driverMobile', 'text', 'Driver Mobile')}</p>}
                </div>
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
                    {taxMode === 'custom' ? (
                      <div className="flex justify-between text-gray-600 border-b border-gray-200 pb-2">
                        <span>{taxName} ({taxRate}%)</span>
                        <span>{taxAmount.toFixed(2)}</span>
                      </div>
                    ) : (
                      <>
                        {config.tax.showCgstSgst && (
                          <>
                            <div className="flex justify-between text-gray-600">
                              <span>CGST ({taxRate / 2}%)</span>
                              <span>{(taxAmount / 2).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                              <span>SGST ({taxRate / 2}%)</span>
                              <span>{(taxAmount / 2).toFixed(2)}</span>
                            </div>
                          </>
                        )}
                        {config.tax.showIgst && (
                          <div className="flex justify-between text-gray-600 border-b border-gray-200 pb-2">
                            <span>IGST ({taxRate}%)</span>
                            <span>{taxAmount.toFixed(2)}</span>
                          </div>
                        )}
                      </>
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
                    {taxMode === 'custom' ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}>
                        <span>{taxName} ({taxRate}%):</span>
                        <span>{currencySymbol} {taxAmount.toFixed(2)}</span>
                      </div>
                    ) : (
                      <>
                        {config.tax.showCgstSgst && (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}><span>CGST ({taxRate / 2}%):</span> <span>{currencySymbol} {(taxAmount / 2).toFixed(2)}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}><span>SGST ({taxRate / 2}%):</span> <span>{currencySymbol} {(taxAmount / 2).toFixed(2)}</span></div>
                          </>
                        )}
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
                    {config.payment.generateQrCode && <div style={{ width: 60, height: 60, backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '5px' }}>QR</div>}
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
                    {config.signature.showStamp && <div style={{ width: 60, height: 60, borderRadius: '50%', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#94a3b8' }}>STAMP</div>}
                    {config.signature.showSignature && <div style={{ width: 100, borderBottom: '1px solid #000', marginBottom: '5px' }}></div>}
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
                      {croppedSignature ? (
                        <img src={croppedSignature} alt="Signature" style={{ width: '220px', height: 'auto', maxHeight: '80px', objectFit: 'contain', marginBottom: '-12px' }} />
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
