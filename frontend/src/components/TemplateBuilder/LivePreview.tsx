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
import { InvoiceTemplate, Invoice, BusinessProfile, ClientProfile } from '../../types';
import { numberToWords } from '../../lib/numberToWords';
import { EditableField } from '../EditableField';
import { Country, State } from 'country-state-city';
import { ensureAllColumns } from '../../lib/templatePresets';

const InlineEditable = ({ value, onSave, type = 'text', isNumber = false, options = [], placeholder = '', list = '' }: any) => {
  const ref = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    if (type !== 'select' && type !== 'client-select' && ref.current && document.activeElement !== ref.current) {
      const strVal = value?.toString() || '';
      if (ref.current.innerText !== strVal) {
        ref.current.innerText = strVal;
      }
    }
  }, [value, type]);

  const handleBlur = () => {
    if (type !== 'select' && type !== 'client-select' && ref.current) {
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
    e.stopPropagation();
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

  if (type === 'client-select') {
    return (
      <div className="relative inline-block w-full bg-slate-50 outline-dashed outline-1 outline-sky-300/80 hover:bg-slate-200/50 hover:outline-sky-400 focus-within:bg-white focus-within:outline-solid focus-within:outline-2 focus-within:outline-sky-500 rounded px-1 cursor-pointer transition-all print:outline-none print:bg-transparent print:border-none">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onSave(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          placeholder={placeholder}
          list={list}
          className="w-full bg-transparent border-none outline-none focus:ring-0 focus:outline-none text-inherit font-inherit"
          style={{ fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit', padding: 0, border: 'none' }}
        />
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
      style={{ whiteSpace: type === 'textarea' ? 'pre-wrap' : 'pre', wordBreak: type === 'textarea' ? 'break-word' : 'normal', outlineOffset: '0px', verticalAlign: 'middle' }}
    />
  );
};

export interface LivePreviewProps {
  template: InvoiceTemplate;
  invoiceData?: Partial<Invoice>;
  businessProfile?: Partial<BusinessProfile>;
  currencySymbol?: string;
  isPrintMode?: boolean;
  forceFullHeight?: boolean;
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
  printPageChunks?: any[][];
  clients?: ClientProfile[];
}

export const LivePreview: React.FC<LivePreviewProps> = ({
  template,
  invoiceData,
  businessProfile,
  currencySymbol = '$',
  isPrintMode = false,
  forceFullHeight = false,
  width = '100%',
  minHeight = '1122px',
  isInteractive = false,
  onUpdateField,
  onUpdateItemField,
  onInteractiveAddItem,
  onInteractiveRemoveItem,
  onCopyBillingToShipping,
  hasTransport,
  onUpdateHasTransport,
  printPageChunks,
  clients = []
}) => {
  const { layout, config, styleConfig, sections } = template;

  const [croppedSignature, setCroppedSignature] = useState<string>('');

  const rawSignature = (businessProfile as any)?.signatureUrl || (businessProfile as any)?.signature || (invoiceData as any)?.signature || (invoiceData as any)?.signatureUrl || '';
  const activeSignature = croppedSignature || rawSignature;

  useEffect(() => {
    let rawSig = rawSignature;
    if (!rawSig) {
      setCroppedSignature('');
      return;
    }

    if (typeof rawSig === 'string' && rawSig.includes('supabase') && rawSig.includes('/storage/')) {
      const buster = `t=${businessProfile?.updatedAt ? new Date(businessProfile.updatedAt).getTime() : Date.now()}`;
      rawSig = rawSig.includes('?') ? `${rawSig}&${buster}` : `${rawSig}?${buster}`;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous'; // Prevent canvas taint from cross-origin Supabase Storage URLs
    img.onerror = () => {
      setCroppedSignature(rawSig);
    };
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

      let imgData: ImageData;
      try {
        imgData = ctx.getImageData(0, 0, img.width, img.height);
      } catch {
        // Canvas tainted (e.g. CORS mismatch) — just use raw URL directly
        setCroppedSignature(rawSig);
        return;
      }
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
      if (fieldKey === 'clientName') {
        return <InlineEditable value={value} onSave={(v: any) => onUpdateField(fieldKey, v)} type="client-select" list="billed-to-clients" placeholder={placeholder} />;
      }
      if (fieldKey === 'shippedToName') {
        return <InlineEditable value={value} onSave={(v: any) => onUpdateField(fieldKey, v)} type="client-select" list="shipped-to-clients" placeholder={placeholder} />;
      }
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

  const rowStyle = "flex items-center text-[11px] mb-1";
  const labelStyle = "w-28 font-medium text-gray-700";
  const valStyle = "flex-1 text-gray-900";

  const getPadding = () => {
    if (layout.compact) return '25px';
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
    height: (isPrintMode || forceFullHeight) ? minHeight : 'auto',
    minHeight: (isPrintMode || forceFullHeight) ? minHeight : 'auto',
    paddingTop: layout.compact ? '15px' : (layout.margins === 'Compact' ? '10px' : '20px'),
    paddingLeft: getPadding(),
    paddingRight: getPadding(),
    paddingBottom: '15px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    fontFamily: styleConfig.fontFamily,
    color: '#333',
    position: 'relative',
    overflow: isPrintMode ? 'hidden' : 'visible',
    boxShadow: isPrintMode ? 'none' : '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
    transform: isPrintMode ? 'none' : 'scale(var(--preview-scale, 1))',
    transformOrigin: 'top center',
    margin: isPrintMode ? '0' : '0 auto',
    display: 'flex',
    flexDirection: 'column',
  };

  const orderedSections = Object.values(sections)
    .filter(s => s.visible)
    .sort((a, b) => a.order - b.order);

  const gridSections = orderedSections.filter(
    s => !((layout.type === 'Modal Classic' || isPrintMode) && ['terms', 'signature', 'footer'].includes(s.id))
  );

  // Pre-calculate rows and columns for each visible section to handle side-by-side alignment in CSS Grid
  const sectionLayouts: Record<string, { row: number; colStart: number; span: number }> = {};
  const dynamicSpans: Record<string, number> = {};
  let currentRow = 0;
  let currentCol = 0;

  for (let i = 0; i < gridSections.length; i++) {
    const secId = gridSections[i].id;
    let currentSpan = sections[secId as keyof typeof sections].gridColumnSpan;

    // For Modal Classic: billTo, shipTo, transport adjust automatically. First two span 6, third spans 12.
    if (layout.type === 'Modal Classic' && ['billTo', 'shipTo', 'transport'].includes(secId)) {
      const visibleAmigos = gridSections.filter(s => ['billTo', 'shipTo', 'transport'].includes(s.id));
      const index = visibleAmigos.findIndex(a => a.id === secId);
      currentSpan = (index === 2) ? 12 : 6;
    } else if (layout.type === 'Modal Classic' && ['terms', 'signature'].includes(secId)) {
      currentSpan = 6;
    } else if (layout.type === 'Modal Classic' && secId === 'amountInWords') {
      currentSpan = 6;
    } else {
      // Auto-adjust transport span to 6 if it can perfectly fill the remaining half of a row
      if (secId === 'transport' && currentSpan === 12 && layout.type !== 'Modal Classic') {
        if (currentCol === 6) {
          currentSpan = 6;
        }
      }
    }

    if (currentCol + currentSpan > 12) {
      currentRow++;
      currentCol = 0;
    }

    sectionLayouts[secId] = {
      row: currentRow,
      colStart: currentCol,
      span: currentSpan
    };
    dynamicSpans[secId] = currentSpan;

    currentCol += currentSpan;
  }

  const getFooterAlignment = (sectionId: 'terms' | 'signature' | 'payment') => {
    const layoutInfo = sectionLayouts[sectionId];
    if (!layoutInfo) return 'left';

    const sameRowFooters = gridSections
      .filter(s => ['terms', 'signature', 'payment'].includes(s.id) && sectionLayouts[s.id]?.row === layoutInfo.row)
      .sort((a, b) => (sectionLayouts[a.id]?.colStart ?? 0) - (sectionLayouts[b.id]?.colStart ?? 0));

    if (sameRowFooters.length < 2) {
      if (sectionId === 'signature') return 'right';
      return 'left';
    }

    const idx = sameRowFooters.findIndex(s => s.id === sectionId);
    if (sameRowFooters.length === 2) {
      return idx === 0 ? 'left' : 'right';
    }
    if (idx === 0) return 'left';
    if (idx === 1) return 'center';
    return 'right';
  };

  const getSectionAlignment = (sectionId: string): 'left' | 'right' => {
    const layoutInfo = sectionLayouts[sectionId];
    if (!layoutInfo) return 'left';
    return layoutInfo.colStart >= 6 ? 'right' : 'left';
  };

  const getSectionStyle = (sectionId: string): React.CSSProperties => {
    const bg = styleConfig.sectionBackgroundColors[sectionId as keyof typeof styleConfig.sectionBackgroundColors];
    const span = dynamicSpans[sectionId] || sections[sectionId as keyof typeof sections].gridColumnSpan;

    const baseMarginBottom = layout.compact ? '4px' : (styleConfig.spacing === 'Compact' ? '6px' : styleConfig.spacing === 'Spacious' ? '16px' : '10px');
    const marginTop = (sectionId === 'taxEngine' || sectionId === 'payment') ? '8px' : undefined;
    const marginBottom = sectionId === 'productTable' 
      ? '8px' 
      : (['taxEngine', 'payment'].includes(sectionId) ? '8px' : baseMarginBottom);

    const padVal = bg ? '15px' : '0px';
    return {
      backgroundColor: bg || 'transparent',
      borderRadius: getBorderRadius(),
      paddingTop: padVal,
      paddingRight: padVal,
      paddingBottom: padVal,
      paddingLeft: padVal,
      marginBottom,
      marginTop,
      alignSelf: 'start',
      gridColumn: (layout.type === 'Modal Classic' && sectionId === 'amountInWords')
        ? ((sections.payment?.order ?? 0) < (sections.taxEngine?.order ?? 0) ? '7 / span 6' : '1 / span 6')
        : `span ${span}`
    };
  };

  // Safe data getters
  const compName = (businessProfile as any)?.name || (businessProfile as any)?.companyName || "";
  const compAddr = businessProfile?.address || "";
  const compGst = (businessProfile as any)?.taxId || (businessProfile as any)?.gstin || "";
  const compPhone = businessProfile?.phone || (businessProfile as any)?.mobile || "";
  const compEmail = businessProfile?.email || "";
  const compPan = (businessProfile as any)?.pan || "";
  const compWebsite = (businessProfile as any)?.website || "";
  const ownerName = (businessProfile as any)?.displayName || (businessProfile as any)?.ownerName || "";
  let compLogo = (businessProfile as any)?.logoUrl || (businessProfile as any)?.logo || null;
  if (compLogo && typeof compLogo === 'string' && compLogo.includes('supabase') && compLogo.includes('/storage/')) {
    const buster = `t=${businessProfile?.updatedAt ? new Date(businessProfile.updatedAt).getTime() : new Date().getTime()}`;
    compLogo = compLogo.includes('?') ? `${compLogo}&${buster}` : `${compLogo}?${buster}`;
  }
  const compStateCode = (businessProfile as any)?.stateCode || "";

  const invNo = invoiceData?.invoiceNumber || 'INV-2023-001';
  const rawType = (invoiceData?.invoiceType || '').toLowerCase().trim();
  const isPurchase = ['purchases', 'purchase_bill', 'purchase', 'purchase_order', 'po', 'purchase_debit_note', 'purchase_dn'].includes(rawType) ||
                    (invoiceData?.embeddedTemplate?.config?.header?.invoiceTitle || '').toLowerCase().includes('purchase') ||
                    (template?.config?.header?.invoiceTitle || '').toLowerCase().includes('purchase');
  const invDate = invoiceData?.date || '';
  const dueDate = invoiceData?.dueDate || '';

  const isRealInvoice = invoiceData !== undefined && invoiceData !== null;
  const getFallback = (defaultMock: string) => isRealInvoice ? '' : defaultMock;

  const clientName = invoiceData?.clientName || getFallback('Sameer Enterprises');
  const clientAddr = invoiceData?.clientAddress || getFallback('Plot No. 45, Phase 3, Okhla Industrial Area, New Delhi');
  const clientGst = (invoiceData as any)?.clientGstin || (invoiceData as any)?.clientTaxId || getFallback('07SM123456789A1');
  const clientPhone = invoiceData?.clientPhone || getFallback('+91 9999988888');
  const clientEmail = invoiceData?.clientEmail || getFallback('sameer@enterprises.com');
  const clientState = (invoiceData as any)?.clientState || getFallback('Delhi');
  const clientCountry = (invoiceData as any)?.clientCountry || getFallback('India');

  const isGlobalCompact = layout.compact === true || layout.margins === 'Compact' || styleConfig.spacing === 'Compact';
  const cellPadding = (isGlobalCompact || config.table.isCompact) ? '6px' : '10px';
  const items: any[] = invoiceData?.items || [];

  const subTotal = invoiceData?.subtotal !== undefined
    ? invoiceData.subtotal
    : items.reduce((a: number, b: any) => a + ((b as any).amount || ((b as any).quantity * (b as any).rate) || 0), 0);

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
    } else if (compCountry === 'india' || compCountry === 'in') {
      dynamicTaxHeader = `IGST (${taxRate}%)`;
    } else {
      const internationalTaxName = businessProfile?.customTaxName || invoiceData?.customTaxName || 'TAX';
      dynamicTaxHeader = `${internationalTaxName} (${taxRate}%)`;
    }
  }

  const hasTaxCol = ensureAllColumns(config.table.columns).some(c => c.id === 'tax' && c.visible !== false);
  const isTaxEngineVisible = sections?.taxEngine?.visible !== false;
  const isTaxPresent = hasTaxCol && isTaxEngineVisible;

  const taxAmount = isTaxPresent
    ? (invoiceData?.taxTotal !== undefined ? invoiceData.taxTotal : ((subTotal + (invoiceData?.freightCharges || 0)) * taxRate) / 100)
    : 0;

  const grandTotal = invoiceData?.grandTotal !== undefined
    ? invoiceData.grandTotal
    : Math.max(0, subTotal - (invoiceData?.discountTotal || 0) + (isTaxPresent ? taxAmount : 0) + (invoiceData?.freightCharges || 0));

  const renderInvoiceContent = (
    currentItems?: any[],
    startSrNo: number = 0,
    isFirstPage: boolean = true,
    isLastPage: boolean = true,
    pageIdx: number = 0,
    totalPages: number = 1
  ) => {
    const activeItems = currentItems || items;
    return (
      <div className="invoice-live-preview relative flex flex-col h-full w-full paper-sheet-light live-preview-container no-privacy-blur" data-privacy-exempt="true" style={{ flex: 1 }}>
      {/* Cancelled Document Top Banner */}
      {((invoiceData?.status || '').toLowerCase() === 'cancelled' || (invoiceData as any)?.cancelled) && (
        <div 
          className="cancelled-banner-stamp"
          style={{
            width: '100%',
            backgroundColor: '#dc2626',
            color: '#ffffff',
            textAlign: 'center',
            padding: '8px 12px',
            fontWeight: 900,
            fontSize: '13px',
            lineHeight: '1.2',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            borderRadius: '6px',
            marginBottom: '16px',
            boxShadow: '0 2px 4px rgba(220, 38, 38, 0.25)',
            position: 'relative',
            display: 'block',
            flex: 'none',
            zIndex: 50,
            boxSizing: 'border-box'
          }}
        >
          CANCELLED
        </div>
      )}
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gridAutoFlow: 'row', columnGap: '20px', rowGap: '0px', position: 'relative', zIndex: 1, flex: 'none' }}>

        {orderedSections.filter(s => !['terms', 'signature', 'footer'].includes(s.id)).map(section => {
          // Headers will render on every page as per pagination requirements
          if (['header', 'billTo', 'shipTo', 'transport'].includes(section.id)) {
            // Now rendering these sections on every page as requested
          }
          if (['taxEngine', 'payment', 'amountInWords'].includes(section.id)) {
            if (!isLastPage) return null;
          }
          if (section.id === 'header') {
            const logoSize = config.header.logoSize ?? config.header.logoWidth ?? 120;
            const logoWidth = logoSize * 1.4;
            const logoHeight = logoSize * 1.4 * 0.45;

            const headerSize = config.header.headerSize || 'Medium';
            let headerPaddingTop = '8px';
            let headerPaddingBottom = '8px';
            let headerMarginBottom = '12px';
            let titleFontSize = '30px';
            let titleClassName = 'text-3xl font-bold tracking-wider text-gray-900 uppercase';

            if (headerSize === 'Small') {
              headerPaddingTop = '4px';
              headerPaddingBottom = '4px';
              headerMarginBottom = '4px';
              titleFontSize = '20px';
              titleClassName = 'text-xl font-bold tracking-wider text-gray-900 uppercase';
            } else if (headerSize === 'Large') {
              headerPaddingTop = '16px';
              headerPaddingBottom = '16px';
              headerMarginBottom = '24px';
              titleFontSize = '40px';
              titleClassName = 'text-5xl font-bold tracking-wider text-gray-900 uppercase';
            }

            if (layout.type === 'Modal Classic') {
              const renderLogoPlaceholder = (position: 'Left' | 'Right' | 'Center') => (
                <div style={{ width: logoWidth, height: logoHeight, border: '2px dashed #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', backgroundColor: '#f8fafc', marginBottom: position === 'Center' ? '10px' : '0px' }}>
                  Logo Space
                </div>
              );

              if (config.header.logoPosition === 'Center' && config.header.showLogo) {
                return (
                  <div key="header" style={{ ...getSectionStyle('header'), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: headerPaddingTop, paddingBottom: headerPaddingBottom, marginBottom: headerMarginBottom }}>
                    {compLogo ? (
                      <div style={{ width: logoWidth, height: logoHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                        <img src={compLogo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
                      </div>
                    ) : (
                      renderLogoPlaceholder('Center')
                    )}
                    <h1 className={titleClassName} style={{ color: styleConfig.primaryColor, fontSize: titleFontSize, textAlign: config.header.titleAlignment === 'Right' ? 'right' : config.header.titleAlignment === 'Left' ? 'left' : 'center', whiteSpace: 'nowrap' }}>{config.header.invoiceTitle}</h1>
                  </div>
                );
              }

              return (
                <div key="header" style={{ ...getSectionStyle('header'), display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: headerPaddingTop, paddingBottom: headerPaddingBottom, marginBottom: headerMarginBottom }}>
                  {config.header.logoPosition === 'Left' && config.header.showLogo && (
                    compLogo ? (
                      <div style={{ width: logoWidth, height: logoHeight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={compLogo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
                      </div>
                    ) : (
                      renderLogoPlaceholder('Left')
                    )
                  )}

                  <div style={{ flex: 1, textAlign: config.header.titleAlignment === 'Right' ? 'right' : config.header.titleAlignment === 'Left' ? 'left' : 'center' }}>
                    <h1 className={titleClassName} style={{ color: styleConfig.primaryColor, fontSize: titleFontSize, whiteSpace: 'nowrap' }}>{config.header.invoiceTitle}</h1>
                  </div>

                  {config.header.logoPosition === 'Right' && config.header.showLogo && (
                    compLogo ? (
                      <div style={{ width: logoWidth, height: logoHeight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={compLogo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
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
                <div key="header" style={{ ...getSectionStyle('header'), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: textColor, paddingTop: headerPaddingTop, paddingBottom: headerPaddingBottom, marginBottom: headerMarginBottom }}>
                  {compLogo ? (
                    <div style={{ width: logoWidth, height: logoHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                      <img src={compLogo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
                    </div>
                  ) : (
                    <div style={{ width: logoWidth, height: logoHeight, border: '2px dashed #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', backgroundColor: '#f8fafc', marginBottom: '10px' }}>
                      Logo Space
                    </div>
                  )}
                  <h1 style={{ color: textColor, fontSize: titleFontSize, margin: 0, fontWeight: 'bold', whiteSpace: 'nowrap' }}>{config.header.invoiceTitle}</h1>
                </div>
              );
            }

            return (
              <div key="header" style={{ ...getSectionStyle('header'), display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: textColor, paddingTop: headerPaddingTop, paddingBottom: headerPaddingBottom, marginBottom: headerMarginBottom }}>
                {config.header.logoPosition === 'Left' && config.header.showLogo && (
                  compLogo ? (
                    <div style={{ width: logoWidth, height: logoHeight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={compLogo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
                    </div>
                  ) : (
                    <div style={{ width: logoWidth, height: logoHeight, border: '2px dashed #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
                      Logo Space
                    </div>
                  )
                )}

                <div style={{ flex: 1, textAlign: config.header.titleAlignment === 'Right' ? 'right' : config.header.titleAlignment === 'Left' ? 'left' : 'center' }}>
                  <h1 style={{ color: textColor, fontSize: titleFontSize, margin: 0, fontWeight: 'bold', whiteSpace: 'nowrap' }}>{config.header.invoiceTitle}</h1>
                </div>

                {config.header.logoPosition === 'Right' && config.header.showLogo && (
                  compLogo ? (
                    <div style={{ width: logoWidth, height: logoHeight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={compLogo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
                    </div>
                  ) : (
                    <div style={{ width: logoWidth, height: logoHeight, border: '2px dashed #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
                      Logo Space
                    </div>
                  )
                )}
              </div>
            );
          }

          if (section.id === 'companyInfo') {
            const hasOwner = config.company.fields.includes('name') && ownerName && ownerName.trim() !== '';
            const hasEmail = config.company.fields.includes('email') && compEmail && compEmail.trim() !== '';
            const hasPhone = config.company.fields.includes('phone') && compPhone && compPhone.trim() !== '';
            const hasAddr = config.company.fields.includes('address') && compAddr && compAddr.trim() !== '';
            const hasGst = config.company.fields.includes('gstin') && compGst && compGst.trim() !== '';
            const hasPan = config.company.fields.includes('pan') && compPan && compPan.trim() !== '';
            const hasWebsite = config.company.fields.includes('website') && compWebsite && compWebsite.trim() !== '';
            const compStateFull = (businessProfile as any)?.state || '';
            const compStateCodeFull = (businessProfile as any)?.stateCode || compStateCode || '';
            const compCountryFull = (businessProfile as any)?.country || '';
            const hasState = config.company.fields.includes('state') && compStateFull.trim() !== '';
            const hasStateCode = compStateCodeFull.trim() !== '';
            const hasCountry = config.company.fields.includes('country') && compCountryFull.trim() !== '';

            const isCompCompact = config.company.isCompact === true || isGlobalCompact;
            const showLabels = config.company.showLabels !== false;
            if (layout.type === 'Modal Classic') {
              if (!compLogo && !config.header.showLogo) return null;

              return (
                <div key="companyInfo" style={{ ...getSectionStyle('companyInfo'), marginBottom: isCompCompact ? '8px' : '20px' }}>
                  {compName && <h1 className={`${isCompCompact ? 'text-lg mb-0.5' : 'text-2xl mb-1'} font-bold text-gray-900`} style={{ color: styleConfig.primaryColor }}>{compName}</h1>}
                  <div className={`${isCompCompact ? 'text-[9.5px]' : 'text-[11px]'} text-gray-600 leading-relaxed`}>
                    {hasOwner && <div>{showLabels ? 'Owner: ' : ''}{ownerName}</div>}
                    {hasEmail && <div>{showLabels ? 'Email: ' : ''}{compEmail}</div>}
                    {hasPhone && <div>{showLabels ? 'Phone: ' : ''}{compPhone}</div>}
                    {hasAddr && <div className="whitespace-pre-wrap">{compAddr}</div>}
                    {hasState && <div>{showLabels ? 'State: ' : ''}{compStateFull}{hasStateCode ? ` (${compStateCodeFull})` : ''}</div>}
                    {hasCountry && <div>{showLabels ? 'Country: ' : ''}{compCountryFull}</div>}
                    {hasGst && <div>{showLabels ? 'GSTIN: ' : ''}{compGst}</div>}
                    {hasPan && <div>{showLabels ? 'PAN: ' : ''}{compPan}</div>}
                    {hasWebsite && <div>{showLabels ? 'Website: ' : ''}{compWebsite}</div>}
                  </div>
                </div>
              );

            }
            return (
              <div key="companyInfo" style={getSectionStyle('companyInfo')}>
                {compName && <h3 style={{ fontWeight: 'bold', fontSize: isCompCompact ? '13px' : '16px', color: styleConfig.primaryColor, marginBottom: isCompCompact ? '2px' : '5px' }}>{compName}</h3>}
                {hasOwner && <p style={{ fontSize: isCompCompact ? '10px' : '12px', margin: isCompCompact ? '0px' : '2px 0' }}>{showLabels && <strong>Owner: </strong>}{ownerName}</p>}
                {hasAddr && <p style={{ fontSize: isCompCompact ? '10px' : '12px', margin: isCompCompact ? '0px' : '2px 0', whiteSpace: 'pre-wrap' }}>{compAddr}</p>}
                {hasState && <p style={{ fontSize: isCompCompact ? '10px' : '12px', margin: isCompCompact ? '0px' : '2px 0' }}>{showLabels && <strong>State: </strong>}{compStateFull}{hasStateCode ? ` (${compStateCodeFull})` : ''}</p>}
                {hasCountry && <p style={{ fontSize: isCompCompact ? '10px' : '12px', margin: isCompCompact ? '0px' : '2px 0' }}>{showLabels && <strong>Country: </strong>}{compCountryFull}</p>}
                {hasGst && <p style={{ fontSize: isCompCompact ? '10px' : '12px', margin: isCompCompact ? '0px' : '2px 0' }}>{showLabels && <strong>GSTIN: </strong>}{compGst}</p>}
                {hasPhone && <p style={{ fontSize: isCompCompact ? '10px' : '12px', margin: isCompCompact ? '0px' : '2px 0' }}>{showLabels && <strong>Phone: </strong>}{compPhone}</p>}
                {hasEmail && <p style={{ fontSize: isCompCompact ? '10px' : '12px', margin: isCompCompact ? '0px' : '2px 0' }}>{showLabels && <strong>Email: </strong>}{compEmail}</p>}
                {hasPan && <p style={{ fontSize: isCompCompact ? '10px' : '12px', margin: isCompCompact ? '0px' : '2px 0' }}>{showLabels && <strong>PAN: </strong>}{compPan}</p>}
                {showLabels && hasWebsite && <p style={{ fontSize: isCompCompact ? '10px' : '12px', margin: isCompCompact ? '0px' : '2px 0' }}><strong>Website: </strong>{compWebsite}</p>}
                {!showLabels && hasWebsite && <p style={{ fontSize: isCompCompact ? '10px' : '12px', margin: isCompCompact ? '0px' : '2px 0' }}>{compWebsite}</p>}
              </div>
            );
          }

          if (section.id === 'invoiceInfo') {
            const docType = (invoiceData?.invoiceType || '').toLowerCase().trim();
            const titleLower = config.header.invoiceTitle.toLowerCase();
            const isEstimate = docType === 'estimate' || docType === 'quote' || titleLower.includes('estimate') || titleLower.includes('quotation');
            const isProforma = docType === 'proforma' || titleLower.includes('proforma');
            const isCreditNote = docType === 'credit_note' || titleLower.includes('credit');
            const isPurchaseDebit = docType === 'purchase_debit_note' || titleLower.includes('purchase debit') || titleLower.includes('purchase dn');
            const isPurchaseOrder = docType === 'purchase_order' || titleLower.includes('purchase order') || titleLower.includes('po');
            const isPurchases = docType === 'purchases' || (!isPurchaseDebit && !isPurchaseOrder && (titleLower.includes('purchase') || titleLower.includes('bill')));
            const isDebitNote = docType === 'debit_note' || titleLower.includes('debit');

            const detailTitle = 
              isEstimate ? 'Estimate Details' : 
              isProforma ? 'Proforma Details' : 
              isCreditNote ? 'Credit Note Details' : 
              isPurchaseDebit ? 'Purchase Debit Note Details' :
              isPurchaseOrder ? 'Purchase Order Details' :
              isPurchases ? 'Purchase Details' :
              isDebitNote ? 'Debit Note Details' : 
              'Invoice Details';

            const noLabel = 
              isEstimate ? 'Est No.' : 
              isProforma ? 'Proforma No.' : 
              isCreditNote ? 'CN No.' : 
              isPurchaseDebit ? 'Debit Note No.' :
              isPurchaseOrder ? 'PO No.' :
              isPurchases ? 'Bill No.' :
              isDebitNote ? 'DN No.' : 
              'Invoice No.';

            const dueDateLabel = 
              isEstimate ? 'Valid Until' : 
              isPurchaseOrder ? 'Expected Delivery' :
              'Due Date';
            const isInvCompact = config.invoiceInfo.isCompact === true || isGlobalCompact;
            const showLabels = config.invoiceInfo.showLabels !== false;
            if (layout.type === 'Modal Classic') {
              const placeOfSupply = invoiceData?.placeOfSupply || getFallback('N/A');
              const grRrNo = invoiceData?.grRrNo || getFallback('N/A');
              const referenceNumber = (invoiceData as any)?.referenceNumber || getFallback('N/A');
              
              const localRowStyle = isInvCompact ? "flex items-center text-[9.5px] mb-0.5" : rowStyle;
              const localLabelStyle = isInvCompact ? "w-24 font-medium text-gray-700 shrink-0" : labelStyle;
              
              return (
                <div key="invoiceInfo" style={{ ...getSectionStyle('invoiceInfo'), paddingTop: '0px', paddingRight: '0px', paddingBottom: '0px', paddingLeft: '0px' }}>
                  <div className="border border-gray-300 px-2.5 py-1 h-full" style={{ borderRadius: getBorderRadius() }}>
                    {config.invoiceInfo.fields.includes('invoiceNumber') && <div className={localRowStyle}>{showLabels && <><span className={localLabelStyle}>{noLabel}</span><span className="mr-2">:</span></>}<span className={valStyle}>{renderInteractive(invNo, 'invoiceNumber')}</span></div>}
                    {config.invoiceInfo.fields.includes('invoiceDate') && <div className={localRowStyle}>{showLabels && <><span className={localLabelStyle}>Dated</span><span className="mr-2">:</span></>}<span className={valStyle}>{renderInteractive(invDate, 'date')}</span></div>}
                    {config.invoiceInfo.fields.includes('dueDate') && <div className={localRowStyle}>{showLabels && <><span className={localLabelStyle}>{dueDateLabel}</span><span className="mr-2">:</span></>}<span className={valStyle}>{renderInteractive(dueDate, 'dueDate')}</span></div>}
                    {config.invoiceInfo.fields.includes('poNumber') && <div className={localRowStyle}>{showLabels && <><span className={localLabelStyle}>PO Number</span><span className="mr-2">:</span></>}<span className={valStyle}>{renderInteractive((invoiceData as any)?.poNumber || getFallback('N/A'), 'poNumber')}</span></div>}
                    {config.invoiceInfo.fields.includes('deliveryNote') && <div className={localRowStyle}>{showLabels && <><span className={localLabelStyle}>Delivery Note</span><span className="mr-2">:</span></>}<span className={valStyle}>{renderInteractive((invoiceData as any)?.deliveryNote || getFallback('N/A'), 'deliveryNote')}</span></div>}
                    {config.invoiceInfo.fields.includes('placeOfSupply') && <div className={localRowStyle}>{showLabels && <><span className={localLabelStyle}>Place of Supply</span><span className="mr-2">:</span></>}<span className={valStyle}>{renderInteractive(placeOfSupply, 'placeOfSupply')}</span></div>}
                    {config.invoiceInfo.fields.includes('grRrNo') && <div className={localRowStyle}>{showLabels && <><span className={localLabelStyle}>GR/RR No.</span><span className="mr-2">:</span></>}<span className={valStyle}>{renderInteractive(grRrNo, 'grRrNo')}</span></div>}
                    {config.invoiceInfo.fields.includes('referenceNumber') && <div className={localRowStyle}>{showLabels && <><span className={localLabelStyle}>Ref. No.</span><span className="mr-2">:</span></>}<span className={valStyle}>{renderInteractive(referenceNumber, 'referenceNumber')}</span></div>}
                    {config.invoiceInfo.customFields.map(f => (
                       <div key={f.id} className={localRowStyle}>{showLabels && <><span className={localLabelStyle}>{f.label}</span><span className="mr-2">:</span></>}<span className={valStyle}>{renderInteractive(f.value, `customField_${f.id}`)}</span></div>
                    ))}
                  </div>
                </div>
              );

            }

            return (
              <div key="invoiceInfo" style={{ ...getSectionStyle('invoiceInfo'), textAlign: (!sections.companyInfo?.visible) ? 'left' : config.invoiceInfo.position === 'Right' ? 'right' : config.invoiceInfo.position === 'Left' ? 'left' : 'center' }}>
                <h3 style={{ fontWeight: 'bold', fontSize: isInvCompact ? '13px' : '16px', color: styleConfig.primaryColor, marginBottom: isInvCompact ? '2px' : '5px' }}>{detailTitle}</h3>
                {config.invoiceInfo.fields.includes('invoiceNumber') && <p style={{ fontSize: isInvCompact ? '10px' : '12px', margin: isInvCompact ? '0px' : '2px 0' }}>{showLabels && <strong>{noLabel}: </strong>}{renderInteractive(invNo, 'invoiceNumber')}</p>}
                {config.invoiceInfo.fields.includes('invoiceDate') && <p style={{ fontSize: isInvCompact ? '10px' : '12px', margin: isInvCompact ? '0px' : '2px 0' }}>{showLabels && <strong>Date: </strong>}{renderInteractive(invDate, 'date')}</p>}
                {config.invoiceInfo.fields.includes('dueDate') && <p style={{ fontSize: isInvCompact ? '10px' : '12px', margin: isInvCompact ? '0px' : '2px 0' }}>{showLabels && <strong>{dueDateLabel}: </strong>}{renderInteractive(dueDate, 'dueDate')}</p>}
                {config.invoiceInfo.fields.includes('poNumber') && <p style={{ fontSize: isInvCompact ? '10px' : '12px', margin: isInvCompact ? '0px' : '2px 0' }}>{showLabels && <strong>PO No: </strong>}{renderInteractive((invoiceData as any)?.poNumber || getFallback('N/A'), 'poNumber')}</p>}
                {config.invoiceInfo.fields.includes('referenceNumber') && <p style={{ fontSize: isInvCompact ? '10px' : '12px', margin: isInvCompact ? '0px' : '2px 0' }}>{showLabels && <strong>Ref No: </strong>}{renderInteractive((invoiceData as any)?.referenceNumber || getFallback('N/A'), 'referenceNumber')}</p>}
                {config.invoiceInfo.customFields.map(f => (
                  <p key={f.id} style={{ fontSize: isInvCompact ? '10px' : '12px', margin: isInvCompact ? '0px' : '2px 0' }}>{showLabels && <strong>{f.label}: </strong>}{renderInteractive(f.value, `customField_${f.id}`)}</p>
                ))}
              </div>
            );
          }

          if (section.id === 'billTo') {
            const clientCountry = (invoiceData as any)?.clientCountry || getFallback('India');
            const clientState = (invoiceData as any)?.clientState || getFallback('Delhi');
            const clientCompany = (invoiceData as any)?.clientCompanyName || (invoiceData as any)?.clientCompany || getFallback('Acme Corp Ltd');
            const isClientCompact = config.client.isCompact === true || isGlobalCompact;
            const showLabels = config.client.showLabels !== false;
            if (layout.type === 'Modal Classic') {
              const amigoIndex = orderedSections.filter(s => ['billTo', 'shipTo', 'transport'].includes(s.id)).findIndex(a => a.id === 'billTo');
              const isSecondCol = amigoIndex === 1;
              const isVertical = amigoIndex !== 2;

              return (
                <div key="billTo" style={{ ...getSectionStyle('billTo'), paddingTop: '0px', paddingRight: '0px', paddingBottom: '0px', paddingLeft: '0px', marginBottom: '0px', marginTop: amigoIndex === 2 ? '-1px' : '5px' }}>
                  <div className={`border border-gray-300 px-2.5 py-1 h-full flex ${isVertical ? 'flex-col gap-y-0.5' : 'flex-wrap items-center gap-x-6 gap-y-1'}`} style={{ borderRadius: getBorderRadius() }}>
                    <h3 className={`font-bold ${isClientCompact ? 'text-[9.5px] mb-0.5' : 'text-[11px] mb-1'} text-gray-800 uppercase ${!isVertical && 'w-full mb-0'} whitespace-nowrap`}>{isPurchase ? 'BILL FROM' : 'BILLED TO'}</h3>
                    {(config.client.fields.includes('companyName') || config.client.fields.includes('company') || !!((invoiceData as any)?.clientCompanyName || (invoiceData as any)?.clientCompany)) ? (
                      <>
                        {(clientCompany || isInteractive) ? (
                          <div className={`${isVertical ? `${isClientCompact ? 'text-[10px]' : 'text-[12px]'} font-bold text-gray-900 mb-0.5` : `flex items-center ${isClientCompact ? 'text-[9px]' : 'text-[10px]'}`}`}>
                            {isVertical ? renderInteractive(clientCompany, 'clientCompanyName', 'text', 'Company Name') : <>{showLabels && <span className="text-gray-500 font-medium mr-1">Company:</span>}<span className="text-gray-900 font-bold">{renderInteractive(clientCompany, 'clientCompanyName', 'text', 'Company Name')}</span></>}
                          </div>
                        ) : null}
                        {(config.client.fields.includes('name') || config.client.fields.includes('partyName')) && (
                          isVertical ? <div className={`flex items-center ${isClientCompact ? 'text-[9.5px]' : 'text-[11px]'} mb-0.5`}>{showLabels && <><span className={`${isClientCompact ? 'w-24' : 'w-28'} font-medium text-gray-700 shrink-0`}>Customer Name</span><span className="mr-2">:</span></>}<span className="flex-1 text-gray-900 font-medium">{renderInteractive(clientName, 'clientName', 'text', isPurchase ? 'Supplier Name' : 'Customer Name')}</span></div> :
                            <div className={`flex items-center ${isClientCompact ? 'text-[9px]' : 'text-[10px]'}`}>{showLabels && <span className="text-gray-500 font-medium mr-1">Customer:</span>}<span className="text-gray-900 font-bold">{renderInteractive(clientName, 'clientName', 'text', isPurchase ? 'Supplier Name' : 'Customer Name')}</span></div>
                        )}
                      </>
                    ) : (
                      (config.client.fields.includes('name') || config.client.fields.includes('partyName')) && (
                        <div className={`${isVertical ? `${isClientCompact ? 'text-[10px]' : 'text-[12px]'} font-bold text-gray-900 mb-0.5` : `flex items-center ${isClientCompact ? 'text-[9px]' : 'text-[10px]'}`}`}>{isVertical ? renderInteractive(clientName, 'clientName', 'text', isPurchase ? 'Supplier Name' : 'Customer Name') : <>{showLabels && <span className="text-gray-500 font-medium mr-1">Name:</span>}<span className="text-gray-900 font-bold">{renderInteractive(clientName, 'clientName', 'text', isPurchase ? 'Supplier Name' : 'Customer Name')}</span></>}</div>
                      )
                    )}
                    {config.client.fields.includes('phone') && (
                      isVertical ? <div className={`flex items-center ${isClientCompact ? 'text-[9.5px]' : 'text-[11px]'} mb-0.5`}>{showLabels && <><span className={`${isClientCompact ? 'w-24' : 'w-28'} font-medium text-gray-700 shrink-0`}>Customer Mobile No</span><span className="mr-2">:</span></>}<span className="flex-1 text-gray-900 font-medium">{renderInteractive(clientPhone, 'clientPhone', 'text', 'Phone')}</span></div> :
                        <div className={`flex items-center ${isClientCompact ? 'text-[9px]' : 'text-[10px]'}`}>{showLabels && <span className="text-gray-500 font-medium mr-1">Mobile No:</span>}<span className="text-gray-900 font-bold">{renderInteractive(clientPhone, 'clientPhone', 'text', 'Phone')}</span></div>
                    )}
                    {config.client.fields.includes('email') && (
                      isVertical ? <div className={`flex items-center ${isClientCompact ? 'text-[9.5px]' : 'text-[11px]'} mb-0.5`}>{showLabels && <><span className={`${isClientCompact ? 'w-24' : 'w-28'} font-medium text-gray-700 shrink-0`}>Email</span><span className="mr-2">:</span></>}<span className="flex-1 text-gray-900 font-medium">{renderInteractive(clientEmail, 'clientEmail', 'text', 'Email')}</span></div> :
                        <div className={`flex items-center ${isClientCompact ? 'text-[9px]' : 'text-[10px]'}`}>{showLabels && <span className="text-gray-500 font-medium mr-1">Email:</span>}<span className="text-gray-900 font-bold">{renderInteractive(clientEmail, 'clientEmail', 'text', 'Email')}</span></div>
                    )}
                    {config.client.fields.includes('address') && (
                      isVertical ? <>
                        <div className={`flex items-center ${isClientCompact ? 'text-[9.5px]' : 'text-[11px]'} mb-0.5`}>{showLabels && <><span className={`${isClientCompact ? 'w-24' : 'w-28'} font-medium text-gray-700 shrink-0`}>Country</span><span className="mr-2">:</span></>}<span className="flex-1 text-gray-900 font-medium">{renderSelectInteractive(clientCountry, 'clientCountry', Country.getAllCountries().map(c => ({ label: c.name, value: c.name })), 'Select Country')}</span></div>
                        <div className={`flex items-center ${isClientCompact ? 'text-[9.5px]' : 'text-[11px]'} mb-0.5`}>{showLabels && <><span className={`${isClientCompact ? 'w-24' : 'w-28'} font-medium text-gray-700 shrink-0`}>State</span><span className="mr-2">:</span></>}<span className="flex-1 text-gray-900 font-medium">{renderSelectInteractive(clientState, 'clientState', State.getStatesOfCountry(Country.getAllCountries().find(c => c.name === clientCountry)?.isoCode || '').map(s => ({ label: s.name, value: s.name })), 'Select State')}</span></div>
                        <div className={`flex items-start ${isClientCompact ? 'text-[9.5px]' : 'text-[11px]'} mb-0.5`}>{showLabels && <><span className={`${isClientCompact ? 'w-24' : 'w-28'} font-medium text-gray-700 shrink-0`}>Address</span><span className="mr-2">:</span></>}<span className="flex-1 text-gray-900 font-medium">{renderInteractive(clientAddr, 'clientAddress', 'textarea', 'Address')}</span></div>
                      </> : <>
                        <div className={`flex items-center ${isClientCompact ? 'text-[9px]' : 'text-[10px]'}`}>{showLabels && <span className="text-gray-500 font-medium mr-1">Country:</span>}<span className="text-gray-900 font-bold">{renderSelectInteractive(clientCountry, 'clientCountry', Country.getAllCountries().map(c => ({ label: c.name, value: c.name })), 'Select Country')}</span></div>
                        <div className={`flex items-center ${isClientCompact ? 'text-[9px]' : 'text-[10px]'}`}>{showLabels && <span className="text-gray-500 font-medium mr-1">State:</span>}<span className="text-gray-900 font-bold">{renderSelectInteractive(clientState, 'clientState', State.getStatesOfCountry(Country.getAllCountries().find(c => c.name === clientCountry)?.isoCode || '').map(s => ({ label: s.name, value: s.name })), 'Select State')}</span></div>
                        <div className={`flex items-center ${isClientCompact ? 'text-[9px]' : 'text-[10px]'}`}>{showLabels && <span className="text-gray-500 font-medium mr-1">Address:</span>}<span className="text-gray-900 font-bold">{renderInteractive(clientAddr, 'clientAddress', 'textarea', 'Address')}</span></div>
                      </>
                    )}
                    {config.client.fields.includes('gstin') && (
                      isVertical ? <div className={`flex items-center ${isClientCompact ? 'text-[9.5px]' : 'text-[11px]'} mb-0.5`}>{showLabels && <><span className={`${isClientCompact ? 'w-24' : 'w-28'} font-medium text-gray-700 shrink-0`}>GSTIN / UIN</span><span className="mr-2">:</span></>}<span className="flex-1 text-gray-900 font-medium">{renderInteractive(clientGst, 'clientGstin', 'text', 'GSTIN')}</span></div> :
                        <div className={`flex items-center ${isClientCompact ? 'text-[9px]' : 'text-[10px]'}`}>{showLabels && <span className="text-gray-500 font-medium mr-1">GSTIN:</span>}<span className="text-gray-900 font-bold">{renderInteractive(clientGst, 'clientGstin', 'text', 'GSTIN')}</span></div>
                    )}
                    {config.client.fields.includes('pan') && (
                      isVertical ? <div className={`flex items-center ${isClientCompact ? 'text-[9.5px]' : 'text-[11px]'} mb-0.5`}>{showLabels && <><span className={`${isClientCompact ? 'w-24' : 'w-28'} font-medium text-gray-700 shrink-0`}>PAN</span><span className="mr-2">:</span></>}<span className="flex-1 text-gray-900 font-medium">{renderInteractive((invoiceData as any)?.clientPan || getFallback('ABCDE1234F'), 'clientPan', 'text', 'PAN')}</span></div> :
                        <div className={`flex items-center ${isClientCompact ? 'text-[9px]' : 'text-[10px]'}`}>{showLabels && <span className="text-gray-500 font-medium mr-1">PAN:</span>}<span className="text-gray-900 font-bold">{renderInteractive((invoiceData as any)?.clientPan || getFallback('ABCDE1234F'), 'clientPan', 'text', 'PAN')}</span></div>
                    )}
                  </div>
                </div>
              );

            }
            const clientCountryNM = clientCountry;
            const clientStateNM = clientState;
            return (
              <div key="billTo" style={getSectionStyle('billTo')}>
                <h4 style={{ fontSize: isClientCompact ? '11px' : '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: isClientCompact ? '2px' : '5px', whiteSpace: 'nowrap' }}>{isPurchase ? 'Bill From' : 'Bill To'}</h4>
                {(config.client.fields.includes('companyName') || config.client.fields.includes('company') || !!((invoiceData as any)?.clientCompanyName || (invoiceData as any)?.clientCompany)) ? (
                  <>
                    <h3 style={{ fontWeight: 'bold', fontSize: isClientCompact ? '12px' : '14px', color: '#1e293b' }}>{renderInteractive(clientCompany, 'clientCompanyName', 'text', 'Company Name')}</h3>
                    {(config.client.fields.includes('name') || config.client.fields.includes('partyName')) && (
                      <p style={{ fontSize: isClientCompact ? '10px' : '12px', margin: isClientCompact ? '0px' : '2px 0' }}>{showLabels && <strong>Customer Name: </strong>}{renderInteractive(clientName, 'clientName', 'text', isPurchase ? 'Supplier Name' : 'Customer Name')}</p>
                    )}
                  </>
                ) : (
                  (config.client.fields.includes('name') || config.client.fields.includes('partyName')) && (
                    <h3 style={{ fontWeight: 'bold', fontSize: isClientCompact ? '12px' : '14px', color: '#1e293b' }}>{renderInteractive(clientName, 'clientName', 'text', isPurchase ? 'Supplier Name' : 'Customer Name')}</h3>
                  )
                )}
                {config.client.fields.includes('address') && <>
                  <div style={{ fontSize: isClientCompact ? '10px' : '12px', margin: isClientCompact ? '0px' : '2px 0' }}>{showLabels && <strong>Country: </strong>}{renderSelectInteractive(clientCountryNM, 'clientCountry', Country.getAllCountries().map(c => ({ label: c.name, value: c.name })), 'Select Country')}</div>
                  <div style={{ fontSize: isClientCompact ? '10px' : '12px', margin: isClientCompact ? '0px' : '2px 0' }}>{showLabels && <strong>State: </strong>}{renderSelectInteractive(clientStateNM, 'clientState', State.getStatesOfCountry(Country.getAllCountries().find(c => c.name === clientCountryNM)?.isoCode || '').map(s => ({ label: s.name, value: s.name })), 'Select State')}</div>
                  <p style={{ fontSize: isClientCompact ? '10px' : '12px', margin: isClientCompact ? '0px' : '2px 0', whiteSpace: 'pre-wrap' }}>{renderInteractive(clientAddr, 'clientAddress', 'textarea', 'Address')}</p>
                </>}
                {config.client.fields.includes('gstin') && (clientGst || isInteractive) && <p style={{ fontSize: isClientCompact ? '10px' : '12px', margin: isClientCompact ? '0px' : '2px 0' }}>{showLabels && <strong>GSTIN: </strong>}{renderInteractive(clientGst, 'clientGstin', 'text', 'GSTIN')}</p>}
                {config.client.fields.includes('phone') && (clientPhone || isInteractive) && <p style={{ fontSize: isClientCompact ? '10px' : '12px', margin: isClientCompact ? '0px' : '2px 0' }}>{showLabels && <strong>Phone: </strong>}{renderInteractive(clientPhone, 'clientPhone', 'text', 'Phone')}</p>}
                {config.client.fields.includes('email') && <p style={{ fontSize: isClientCompact ? '10px' : '12px', margin: isClientCompact ? '0px' : '2px 0' }}>{showLabels && <strong>Email: </strong>}{renderInteractive(clientEmail, 'clientEmail', 'text', 'Email')}</p>}
              </div>
            );
          }

          if (section.id === 'shipTo') {
            const shipName = (invoiceData as any)?.shippedToName || getFallback('Sameer Enterprises');
            const shipCompany = (invoiceData as any)?.shippedToCompanyName || (invoiceData as any)?.shippedToCompany || getFallback('Global Logistics Ltd');
            const shipPhone = (invoiceData as any)?.shippedToPhone || getFallback('+91 9999988888');
            const shipEmail = (invoiceData as any)?.shippedToEmail || getFallback('sameer@enterprises.com');
            const shipPan = (invoiceData as any)?.shippedToPan || getFallback('PANSM1234E');
            const shipCountry = (invoiceData as any)?.shippedToCountry || getFallback('India');
            const shipState = (invoiceData as any)?.shippedToState || getFallback('Delhi');
            const shipAddr = (invoiceData as any)?.shippedToAddress || getFallback('Plot No. 45, Phase 3, Okhla Industrial Area, New Delhi');
            const shipGst = (invoiceData as any)?.shippedToGstin || getFallback('07SM123456789A1');

            const isShipCompact = config.shipping.isCompact === true || isGlobalCompact;
            const showLabels = config.shipping.showLabels !== false;
            if (layout.type === 'Modal Classic') {
              const amigoIndex = orderedSections.filter(s => ['billTo', 'shipTo', 'transport'].includes(s.id)).findIndex(a => a.id === 'shipTo');
              const isSecondCol = amigoIndex === 1;
              const isVertical = amigoIndex !== 2;

              return (
                <div key="shipTo" style={{ ...getSectionStyle('shipTo'), paddingTop: '0px', paddingRight: '0px', paddingBottom: '0px', paddingLeft: '0px', marginBottom: '0px', marginTop: amigoIndex === 2 ? '-1px' : '5px' }}>
                  <div className={`border border-gray-300 px-2.5 py-1 h-full flex ${isVertical ? 'flex-col gap-y-0.5' : 'flex-wrap items-center gap-x-6 gap-y-1'}`} style={{ borderRadius: getBorderRadius() }}>
                    <div className={`flex justify-between items-center ${isVertical ? 'mb-1' : 'w-full mb-0'}`}>
                      <h3 className={`font-bold ${isShipCompact ? 'text-[9.5px] mb-0.5' : 'text-[11px]'} text-gray-800 uppercase whitespace-nowrap`}>{isPurchase ? 'SHIP FROM' : 'SHIPPED TO'}</h3>
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
                      {(config.shipping.fields.includes('companyName') || config.shipping.fields.includes('company') || !!((invoiceData as any)?.shippedToCompanyName || (invoiceData as any)?.shippedToCompany)) ? (
                        <>
                          {(shipCompany || isInteractive) ? (
                            <div className={`${isVertical ? `${isShipCompact ? 'text-[10px]' : 'text-[12px]'} font-bold text-gray-900 mb-0.5` : `flex items-center ${isShipCompact ? 'text-[9px]' : 'text-[10px]'}`}`}>
                              {isVertical ? renderInteractive(shipCompany, 'shippedToCompanyName', 'text', 'Company Name') : <>{showLabels && <span className="text-gray-500 font-medium mr-1">Company:</span>}<span className="text-gray-900 font-bold">{renderInteractive(shipCompany, 'shippedToCompanyName', 'text', 'Company Name')}</span></>}
                            </div>
                          ) : null}
                          {(config.shipping.fields.includes('name') || config.shipping.fields.includes('partyName')) && (
                            isVertical ? <div className={`flex items-center ${isShipCompact ? 'text-[9.5px]' : 'text-[11px]'} mb-0.5`}>{showLabels && <><span className={`${isShipCompact ? 'w-24' : 'w-28'} font-medium text-gray-700 shrink-0`}>Customer Name</span><span className="mr-2">:</span></>}<span className="flex-1 text-gray-900 font-medium">{renderInteractive(shipName, 'shippedToName', 'text', isPurchase ? 'Supplier Name' : 'Customer Name')}</span></div> :
                              <div className={`flex items-center ${isShipCompact ? 'text-[9px]' : 'text-[10px]'}`}>{showLabels && <span className="text-gray-500 font-medium mr-1">Customer:</span>}<span className="text-gray-900 font-bold">{renderInteractive(shipName, 'shippedToName', 'text', isPurchase ? 'Supplier Name' : 'Customer Name')}</span></div>
                          )}
                        </>
                      ) : (
                        (config.shipping.fields.includes('name') || config.shipping.fields.includes('partyName')) && (
                          <div className={`${isVertical ? `${isShipCompact ? 'text-[10px]' : 'text-[12px]'} font-medium text-gray-900 mb-0.5` : `flex items-center ${isShipCompact ? 'text-[9px]' : 'text-[10px]'}`}`}>{isVertical ? renderInteractive(shipName, 'shippedToName', 'text', isPurchase ? 'Supplier Name' : 'Customer Name') : <>{showLabels && <span className="text-gray-500 font-medium mr-1">Name:</span>}<span className="text-gray-900 font-bold">{renderInteractive(shipName, 'shippedToName', 'text', isPurchase ? 'Supplier Name' : 'Customer Name')}</span></>}</div>
                        )
                      )}
                      {config.shipping.fields.includes('phone') && (
                        isVertical ? <div className={`flex items-center ${isShipCompact ? 'text-[9.5px]' : 'text-[11px]'} mb-0.5`}>{showLabels && <><span className={`${isShipCompact ? 'w-24' : 'w-28'} font-medium text-gray-700 shrink-0`}>Customer Mobile No</span><span className="mr-2">:</span></>}<span className="flex-1 text-gray-900 font-medium">{renderInteractive(shipPhone, 'shippedToPhone', 'text', 'Phone')}</span></div> :
                          <div className={`flex items-center ${isShipCompact ? 'text-[9px]' : 'text-[10px]'}`}>{showLabels && <span className="text-gray-500 font-medium mr-1">Mobile No:</span>}<span className="text-gray-900 font-bold">{renderInteractive(shipPhone, 'shippedToPhone', 'text', 'Phone')}</span></div>
                      )}
                      {config.shipping.fields.includes('email') && (
                        isVertical ? <div className={`flex items-center ${isShipCompact ? 'text-[9.5px]' : 'text-[11px]'} mb-0.5`}>{showLabels && <><span className={`${isShipCompact ? 'w-24' : 'w-28'} font-medium text-gray-700 shrink-0`}>Email</span><span className="mr-2">:</span></>}<span className="flex-1 text-gray-900 font-medium">{renderInteractive(shipEmail, 'shippedToEmail', 'text', 'Email')}</span></div> :
                          <div className={`flex items-center ${isShipCompact ? 'text-[9px]' : 'text-[10px]'}`}>{showLabels && <span className="text-gray-500 font-medium mr-1">Email:</span>}<span className="text-gray-900 font-bold">{renderInteractive(shipEmail, 'shippedToEmail', 'text', 'Email')}</span></div>
                      )}
                      {config.shipping.fields.includes('pan') && (
                        isVertical ? <div className={`flex items-center ${isShipCompact ? 'text-[9.5px]' : 'text-[11px]'} mb-0.5`}>{showLabels && <><span className={`${isShipCompact ? 'w-24' : 'w-28'} font-medium text-gray-700 shrink-0`}>PAN</span><span className="mr-2">:</span></>}<span className="flex-1 text-gray-900 font-medium">{renderInteractive(shipPan, 'shippedToPan', 'text', 'PAN')}</span></div> :
                          <div className={`flex items-center ${isShipCompact ? 'text-[9px]' : 'text-[10px]'}`}>{showLabels && <span className="text-gray-500 font-medium mr-1">PAN:</span>}<span className="text-gray-900 font-bold">{renderInteractive(shipPan, 'shippedToPan', 'text', 'PAN')}</span></div>
                      )}
                      {config.shipping.fields.includes('address') && (
                        isVertical ? <>
                          <div className={`flex items-center ${isShipCompact ? 'text-[9.5px]' : 'text-[11px]'} mb-0.5`}>{showLabels && <><span className={`${isShipCompact ? 'w-24' : 'w-28'} font-medium text-gray-700 shrink-0`}>Country</span><span className="mr-2">:</span></>}<span className="flex-1 text-gray-900 font-medium">{renderSelectInteractive(shipCountry, 'shippedToCountry', Country.getAllCountries().map(c => ({ label: c.name, value: c.name })), 'Select Country')}</span></div>
                          <div className={`flex items-center ${isShipCompact ? 'text-[9.5px]' : 'text-[11px]'} mb-0.5`}>{showLabels && <><span className={`${isShipCompact ? 'w-24' : 'w-28'} font-medium text-gray-700 shrink-0`}>State</span><span className="mr-2">:</span></>}<span className="flex-1 text-gray-900 font-medium">{renderSelectInteractive(shipState, 'shippedToState', State.getStatesOfCountry(Country.getAllCountries().find(c => c.name === shipCountry)?.isoCode || '').map(s => ({ label: s.name, value: s.name })), 'Select State')}</span></div>
                          <div className={`flex items-start ${isShipCompact ? 'text-[9.5px]' : 'text-[11px]'} mb-0.5`}>{showLabels && <><span className={`${isShipCompact ? 'w-24' : 'w-28'} font-medium text-gray-700 shrink-0`}>Address</span><span className="mr-2">:</span></>}<span className="flex-1 text-gray-900 font-medium">{renderInteractive(shipAddr, 'shippedToAddress', 'textarea', 'Address')}</span></div>
                        </> : <>
                          <div className={`flex items-center ${isShipCompact ? 'text-[9px]' : 'text-[10px]'}`}>{showLabels && <span className="text-gray-500 font-medium mr-1">Country:</span>}<span className="text-gray-900 font-bold">{renderSelectInteractive(shipCountry, 'shippedToCountry', Country.getAllCountries().map(c => ({ label: c.name, value: c.name })), 'Select Country')}</span></div>
                          <div className={`flex items-center ${isShipCompact ? 'text-[9px]' : 'text-[10px]'}`}>{showLabels && <span className="text-gray-500 font-medium mr-1">State:</span>}<span className="text-gray-900 font-bold">{renderSelectInteractive(shipState, 'shippedToState', State.getStatesOfCountry(Country.getAllCountries().find(c => c.name === shipCountry)?.isoCode || '').map(s => ({ label: s.name, value: s.name })), 'Select State')}</span></div>
                          <div className={`flex items-center ${isShipCompact ? 'text-[9px]' : 'text-[10px]'}`}>{showLabels && <span className="text-gray-500 font-medium mr-1">Address:</span>}<span className="text-gray-900 font-bold">{renderInteractive(shipAddr, 'shippedToAddress', 'textarea', 'Address')}</span></div>
                        </>
                      )}
                      {config.shipping.fields.includes('gstin') && (
                        isVertical ? <div className={`flex items-center ${isShipCompact ? 'text-[9.5px]' : 'text-[11px]'} mb-0.5`}>{showLabels && <><span className={`${isShipCompact ? 'w-24' : 'w-28'} font-medium text-gray-700 shrink-0`}>GSTIN / UIN</span><span className="mr-2">:</span></>}<span className="flex-1 text-gray-900 font-medium">{renderInteractive(shipGst, 'shippedToGstin', 'text', 'GSTIN')}</span></div> :
                          <div className={`flex items-center ${isShipCompact ? 'text-[9px]' : 'text-[10px]'}`}>{showLabels && <span className="text-gray-500 font-medium mr-1">GSTIN:</span>}<span className="text-gray-900 font-bold">{renderInteractive(shipGst, 'shippedToGstin', 'text', 'GSTIN')}</span></div>
                      )}
                    </>
                  </div>
                </div>
              );

            }
            return (
              <div key="shipTo" style={getSectionStyle('shipTo')}>
                <div className={`flex justify-between items-center ${isShipCompact ? 'mb-0.5' : 'mb-[5px]'}`}>
                  <h4 style={{ fontSize: isShipCompact ? '11px' : '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', margin: 0, whiteSpace: 'nowrap' }}>{isPurchase ? 'Ship From' : 'Ship To'}</h4>
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
                  {(config.shipping.fields.includes('companyName') || config.shipping.fields.includes('company') || !!((invoiceData as any)?.shippedToCompanyName || (invoiceData as any)?.shippedToCompany)) ? (
                    <>
                      <h3 style={{ fontWeight: 'bold', fontSize: isShipCompact ? '12px' : '14px', color: '#1e293b' }}>{renderInteractive(shipCompany, 'shippedToCompanyName', 'text', 'Company Name')}</h3>
                      {(config.shipping.fields.includes('name') || config.shipping.fields.includes('partyName')) && (
                        <p style={{ fontSize: isShipCompact ? '10px' : '12px', margin: isShipCompact ? '0px' : '2px 0' }}>{showLabels && <strong>Customer Name: </strong>}{renderInteractive(shipName, 'shippedToName', 'text', isPurchase ? 'Supplier Name' : 'Customer Name')}</p>
                      )}
                    </>
                  ) : (
                    (config.shipping.fields.includes('name') || config.shipping.fields.includes('partyName')) && (
                      <h3 style={{ fontWeight: 'bold', fontSize: isShipCompact ? '12px' : '14px', color: '#1e293b' }}>{renderInteractive(shipName, 'shippedToName', 'text', isPurchase ? 'Supplier Name' : 'Customer Name')}</h3>
                    )
                  )}
                  {config.shipping.fields.includes('address') && <>
                    <div style={{ fontSize: isShipCompact ? '10px' : '12px', margin: isShipCompact ? '0px' : '2px 0' }}>{showLabels && <strong>Country: </strong>}{renderSelectInteractive(shipCountry, 'shippedToCountry', Country.getAllCountries().map(c => ({ label: c.name, value: c.name })), 'Select Country')}</div>
                    <div style={{ fontSize: isShipCompact ? '10px' : '12px', margin: isShipCompact ? '0px' : '2px 0' }}>{showLabels && <strong>State: </strong>}{renderSelectInteractive(shipState, 'shippedToState', State.getStatesOfCountry(Country.getAllCountries().find(c => c.name === shipCountry)?.isoCode || '').map(s => ({ label: s.name, value: s.name })), 'Select State')}</div>
                    <p style={{ fontSize: isShipCompact ? '10px' : '12px', margin: isShipCompact ? '0px' : '2px 0', whiteSpace: 'pre-wrap' }}>{renderInteractive(shipAddr, 'shippedToAddress', 'textarea', 'Address')}</p>
                  </>}
                  {config.shipping.fields.includes('gstin') && <p style={{ fontSize: isShipCompact ? '10px' : '12px', margin: isShipCompact ? '0px' : '2px 0' }}>{showLabels && <strong>GSTIN: </strong>}{renderInteractive(shipGst, 'shippedToGstin', 'text', 'GSTIN')}</p>}
                  {config.shipping.fields.includes('phone') && <p style={{ fontSize: isShipCompact ? '10px' : '12px', margin: isShipCompact ? '0px' : '2px 0' }}>{showLabels && <strong>Phone: </strong>}{renderInteractive(shipPhone, 'shippedToPhone', 'text', 'Phone')}</p>}
                  {config.shipping.fields.includes('email') && <p style={{ fontSize: isShipCompact ? '10px' : '12px', margin: isShipCompact ? '0px' : '2px 0' }}>{showLabels && <strong>Email: </strong>}{renderInteractive(shipEmail, 'shippedToEmail', 'text', 'Email')}</p>}
                  {config.shipping.fields.includes('pan') && <p style={{ fontSize: isShipCompact ? '10px' : '12px', margin: isShipCompact ? '0px' : '2px 0' }}>{showLabels && <strong>PAN: </strong>}{renderInteractive(shipPan, 'shippedToPan', 'text', 'PAN')}</p>}
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
                <div key="productTable" style={{ ...getSectionStyle('productTable'), marginTop: '5px', gridColumn: 'span 12' }}>
                  <div style={{ borderRadius: getBorderRadius(), overflow: 'hidden', border: '1px solid #d1d5db' }}>
                    <table className="w-full text-left" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                      <thead>
                        <tr className="text-white text-[10px] uppercase tracking-wide" style={{ backgroundColor: styleConfig.tableHeaderBackground, color: styleConfig.tableHeaderTextColor }}>
                          {renderCols.map((col, colIdx) => (
                            <th key={col.id} className={`${(layout.compact || config.table.isCompact || styleConfig.spacing === 'Compact') ? 'py-1.5 px-2' : 'py-2.5 px-3'} text-left uppercase`} style={{ borderBottom: '1px solid #d1d5db', borderRight: colIdx === renderCols.length - 1 ? 'none' : '1px solid #d1d5db' }}>
                              {col.id === 'tax' ? dynamicTaxHeader : col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                    <tbody>
                      {activeItems.map((item, idx) => {
                        return (
                          <tr key={idx} className={`align-top ${(isGlobalCompact || config.table.isCompact) ? 'text-[9.5px]' : 'text-[11px]'} relative group`}>
                            {renderCols.map((col, colIdx) => (
                              <td key={col.id} style={{ verticalAlign: 'top', borderBottom: idx === activeItems.length - 1 ? 'none' : '1px solid #d1d5db', borderRight: colIdx === renderCols.length - 1 ? 'none' : '1px solid #d1d5db' }} className={`${(isGlobalCompact || config.table.isCompact) ? 'py-1.5 px-2' : 'py-3 px-3'} relative ${colIdx === 0 && isInteractive ? 'pl-7' : ''} ${col.id === 'sr' ? 'text-left text-gray-500' : 'text-left font-bold'}`}>
                                {colIdx === 0 && isInteractive && onInteractiveRemoveItem && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      onInteractiveRemoveItem(item.id);
                                    }}
                                    className={`print:hidden absolute left-1 ${(layout.compact || config.table.isCompact || styleConfig.spacing === 'Compact') ? 'top-[4px]' : 'top-[12px]'} text-rose-500 transition-opacity p-1 hover:bg-rose-50 rounded`}
                                    title="Remove Item"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                  </button>
                                )}
                                {col.id === 'sr' ? startSrNo + idx + 1 : col.id === 'name' ? (
                                  <div>
                                    <div className="font-medium text-gray-900">{renderItemInteractive(item.id, item.name, 'name')}</div>
                                    {(item as any).description && <div className="text-[10px] text-gray-500 mt-0.5">{(item as any).description}</div>}
                                  </div>
                                ) : col.id === 'hsn' ? renderItemInteractive(item.id, (item as any).hsnCode || (item as any).sacCode || '-', 'hsnCode') : col.id === 'qty' ? (
                                  <div className={`flex ${(isGlobalCompact || config.table.isCompact) ? 'flex-row items-baseline gap-1' : 'flex-col items-start'}`}>
                                    <div>{renderItemInteractive(item.id, item.quantity, 'quantity', 'number')}</div>
                                    {((item as any).quantityType || isInteractive) && (
                                      <div className={`${(isGlobalCompact || config.table.isCompact) ? 'text-[9px] text-gray-500 font-normal normal-case' : 'text-[9px] text-gray-500 mt-0.5 font-normal normal-case'}`}>
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
              <div key="productTable" style={{ ...getSectionStyle('productTable'), marginTop: '0px', gridColumn: 'span 12' }}>
                <div style={{ border: styleConfig.borderStyle !== 'None' ? '1px solid #e2e8f0' : 'none', borderRadius: getBorderRadius(), overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0', fontSize: (isGlobalCompact || config.table.isCompact) ? '10.5px' : '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: styleConfig.tableHeaderBackground, color: styleConfig.tableHeaderTextColor }}>
                      {renderCols.map((col, idx) => (
                        <th key={col.id} style={{ padding: cellPadding, textAlign: 'left', borderBottom: styleConfig.borderStyle !== 'None' ? '1px solid #e2e8f0' : 'none', borderRight: styleConfig.borderStyle !== 'None' && idx !== renderCols.length - 1 ? '1px solid #e2e8f0' : 'none', borderRadius: styleConfig.roundedCorners ? (idx === 0 ? '8px 0 0 0' : idx === renderCols.length - 1 ? '0 8px 0 0' : '0') : '0' }}>{col.id === 'tax' ? dynamicTaxHeader.toUpperCase() : col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeItems.map((item, index) => (
                      <tr key={index} className="relative group" style={{ backgroundColor: styleConfig.alternatingRowColors && index % 2 !== 0 ? '#f8fafc' : 'transparent' }}>
                        {renderCols.map((col, colIdx) => (
                          <td key={col.id} style={{ padding: cellPadding, paddingLeft: colIdx === 0 && isInteractive ? '28px' : cellPadding, textAlign: 'left', position: colIdx === 0 ? 'relative' : undefined, verticalAlign: 'top', borderBottom: styleConfig.borderStyle !== 'None' && index !== activeItems.length - 1 ? '1px solid #e2e8f0' : 'none', borderRight: styleConfig.borderStyle !== 'None' && colIdx !== renderCols.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                            {colIdx === 0 && isInteractive && onInteractiveRemoveItem && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onInteractiveRemoveItem(item.id);
                                }}
                                className="print:hidden absolute left-1 top-[6px] text-rose-500 transition-opacity p-1 hover:bg-rose-50 rounded"
                                title="Remove Item"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                              </button>
                            )}
                            {col.id === 'sr' ? startSrNo + index + 1 :
                              col.id === 'name' ? renderItemInteractive(item.id, item.name, 'name') :
                                col.id === 'hsn' ? renderItemInteractive(item.id, (item as any).hsnCode || (item as any).sacCode || '-', 'hsnCode') :
                                  col.id === 'qty' ? (
                                    <div style={{ display: 'flex', flexDirection: (isGlobalCompact || config.table.isCompact) ? 'row' : 'column', alignItems: (isGlobalCompact || config.table.isCompact) ? 'baseline' : 'flex-start', gap: (isGlobalCompact || config.table.isCompact) ? '4px' : '0' }}>
                                      <div>{renderItemInteractive(item.id, item.quantity, 'quantity', 'number')}</div>
                                      {((item as any).quantityType || isInteractive) && (
                                        <div style={{ fontSize: '9px', color: '#64748b', marginTop: (isGlobalCompact || config.table.isCompact) ? '0' : '2px', fontWeight: 'normal' }}>
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
              </div>
            );
          }

          if (section.id === 'transport') {
            const bothAdded = !!(sections.billTo?.visible && sections.shipTo?.visible);
            const vehicleNo = (invoiceData as any)?.vehicleNo || (isInteractive ? "" : "N/A");
            const driverMobile = (invoiceData as any)?.driverMobileNo || (invoiceData as any)?.driverMobile || (isInteractive ? "" : "N/A");
            const station = (invoiceData as any)?.station || (isInteractive ? "" : "N/A");
            const ewayBillNo = (invoiceData as any)?.eWayBillNo || (invoiceData as any)?.ewayBillNo || (isInteractive ? "" : "N/A");
            const transportName = (invoiceData as any)?.transportName || (invoiceData as any)?.transport || (isInteractive ? "" : "N/A");
            const poNumber = invoiceData?.poNumber || (isInteractive ? "" : "N/A");
            const grRrNo = invoiceData?.grRrNo || (isInteractive ? "" : "N/A");
            const marka = (invoiceData as any)?.marka && (invoiceData as any).marka.trim() !== '' ? (invoiceData as any).marka.trim() : (isInteractive ? "" : "N/A");

            const isTransCompact = config.transport.isCompact === true || isGlobalCompact;
            const showLabels = config.transport.showLabels !== false;
            if (layout.type === 'Modal Classic') {

              const amigoIndex = orderedSections.filter(s => ['billTo', 'shipTo', 'transport'].includes(s.id)).findIndex(a => a.id === 'transport');
              const isSecondCol = amigoIndex === 1;
              const isVertical = amigoIndex !== 2;

              return (
                <div key="transport" style={{ ...getSectionStyle('transport'), paddingTop: '0px', paddingRight: '0px', paddingBottom: '0px', paddingLeft: '0px', marginBottom: '0px', marginTop: amigoIndex === 2 ? '-1px' : '5px' }}>
                  <div className={`border border-gray-300 px-2.5 py-1 h-full flex ${isVertical ? 'flex-col gap-y-0.5' : 'flex-wrap items-center gap-x-6 gap-y-1'}`} style={{ borderRadius: getBorderRadius() }}>
                    <div className="flex items-center justify-between w-full">
                      <h3 className={`font-bold ${isTransCompact ? 'text-[9.5px]' : 'text-[11px]'} text-gray-800 uppercase`}>TRANSPORT</h3>
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
                    {(!config.transport?.fields || config.transport.fields.includes('vehicleNo')) && (
                      isVertical ?
                        <div className={`flex items-center ${isTransCompact ? 'text-[9.5px]' : 'text-[11px]'} mb-0.5`}>{showLabels && <><span className={`${isTransCompact ? 'w-24' : 'w-28'} font-medium text-gray-700 shrink-0 whitespace-nowrap`}>Vehicle No.</span><span className="mr-2">:</span></>}<span className="flex-1 text-gray-900 font-medium">{renderInteractive(vehicleNo, 'vehicleNo', 'text', 'Vehicle No')}</span></div> :
                        <div className={`flex items-center ${isTransCompact ? 'text-[9px]' : 'text-[10px]'} whitespace-nowrap`}>{showLabels && <span className="text-gray-500 font-medium mr-1 whitespace-nowrap shrink-0">Vehicle No:</span>}<span className="text-gray-900 font-bold">{renderInteractive(vehicleNo, 'vehicleNo', 'text', 'Vehicle No')}</span></div>
                    )}
                    {(!config.transport?.fields || config.transport.fields.includes('poNumber')) && (
                      isVertical ?
                        <div className={`flex items-center ${isTransCompact ? 'text-[9.5px]' : 'text-[11px]'} mb-0.5`}>{showLabels && <><span className={`${isTransCompact ? 'w-24' : 'w-28'} font-medium text-gray-700 shrink-0 whitespace-nowrap`}>PO Number</span><span className="mr-2">:</span></>}<span className="flex-1 text-gray-900 font-medium">{renderInteractive(poNumber, 'poNumber', 'text', 'PO Number')}</span></div> :
                        <div className={`flex items-center ${isTransCompact ? 'text-[9px]' : 'text-[10px]'} whitespace-nowrap`}>{showLabels && <span className="text-gray-500 font-medium mr-1 whitespace-nowrap shrink-0">PO Number:</span>}<span className="text-gray-900 font-bold">{renderInteractive(poNumber, 'poNumber', 'text', 'PO Number')}</span></div>
                    )}
                    {(!config.transport?.fields || config.transport.fields.includes('transport')) && (
                      isVertical ?
                        <div className={`flex items-center ${isTransCompact ? 'text-[9.5px]' : 'text-[11px]'} mb-0.5`}>{showLabels && <><span className={`${isTransCompact ? 'w-24' : 'w-28'} font-medium text-gray-700 shrink-0 whitespace-nowrap`}>Transport Name</span><span className="mr-2">:</span></>}<span className="flex-1 text-gray-900 font-medium">{renderInteractive(transportName, 'transport', 'text', 'Transporter Name')}</span></div> :
                        <div className={`flex items-center ${isTransCompact ? 'text-[9px]' : 'text-[10px]'} whitespace-nowrap`}>{showLabels && <span className="text-gray-500 font-medium mr-1 whitespace-nowrap shrink-0">Transport Name:</span>}<span className="text-gray-900 font-bold">{renderInteractive(transportName, 'transport', 'text', 'Transporter Name')}</span></div>
                    )}
                    {(!config.transport?.fields || config.transport.fields.includes('driverMobile')) && (
                      isVertical ?
                        <div className={`flex items-center ${isTransCompact ? 'text-[9.5px]' : 'text-[11px]'} mb-0.5`}>{showLabels && <><span className={`${isTransCompact ? 'w-24' : 'w-28'} font-medium text-gray-700 shrink-0 whitespace-nowrap`}>Driver Mobile</span><span className="mr-2">:</span></>}<span className="flex-1 text-gray-900 font-medium">{renderInteractive(driverMobile, 'driverMobile', 'text', 'Driver Mobile')}</span></div> :
                        <div className={`flex items-center ${isTransCompact ? 'text-[9px]' : 'text-[10px]'} whitespace-nowrap`}>{showLabels && <span className="text-gray-500 font-medium mr-1 whitespace-nowrap shrink-0">Driver Mobile:</span>}<span className="text-gray-900 font-bold">{renderInteractive(driverMobile, 'driverMobile', 'text', 'Driver Mobile')}</span></div>
                    )}
                    {(!config.transport?.fields || config.transport.fields.includes('station')) && (
                      isVertical ?
                        <div className={`flex items-center ${isTransCompact ? 'text-[9.5px]' : 'text-[11px]'} mb-0.5`}>{showLabels && <><span className={`${isTransCompact ? 'w-24' : 'w-28'} font-medium text-gray-700 shrink-0 whitespace-nowrap`}>Station</span><span className="mr-2">:</span></>}<span className="flex-1 text-gray-900 font-medium">{renderInteractive(station, 'station', 'text', 'Station')}</span></div> :
                        <div className={`flex items-center ${isTransCompact ? 'text-[9px]' : 'text-[10px]'} whitespace-nowrap`}>{showLabels && <span className="text-gray-500 font-medium mr-1 whitespace-nowrap shrink-0">Station:</span>}<span className="text-gray-900 font-bold">{renderInteractive(station, 'station', 'text', 'Station')}</span></div>
                    )}
                    {(!config.transport?.fields || config.transport.fields.includes('ewayBillNo')) && (
                      isVertical ?
                        <div className={`flex items-center ${isTransCompact ? 'text-[9.5px]' : 'text-[11px]'} mb-0.5`}>{showLabels && <><span className={`${isTransCompact ? 'w-24' : 'w-28'} font-medium text-gray-700 shrink-0 whitespace-nowrap`}>E-Way Bill No.</span><span className="mr-2">:</span></>}<span className="flex-1 text-gray-900 font-medium">{renderInteractive(ewayBillNo, 'ewayBillNo', 'text', 'E-Way Bill No')}</span></div> :
                        <div className={`flex items-center ${isTransCompact ? 'text-[9px]' : 'text-[10px]'} whitespace-nowrap`}>{showLabels && <span className="text-gray-500 font-medium mr-1 whitespace-nowrap shrink-0">E-Way Bill No:</span>}<span className="text-gray-900 font-bold">{renderInteractive(ewayBillNo, 'ewayBillNo', 'text', 'E-Way Bill No')}</span></div>
                    )}
                    {(!config.transport?.fields || config.transport.fields.includes('grRrNo')) && (
                      isVertical ?
                        <div className={`flex items-center ${isTransCompact ? 'text-[9.5px]' : 'text-[11px]'} mb-0.5`}>{showLabels && <><span className={`${isTransCompact ? 'w-24' : 'w-28'} font-medium text-gray-700 shrink-0 whitespace-nowrap`}>GR/RR No.</span><span className="mr-2">:</span></>}<span className="flex-1 text-gray-900 font-medium">{renderInteractive(grRrNo, 'grRrNo', 'text', 'GR/RR No')}</span></div> :
                        <div className={`flex items-center ${isTransCompact ? 'text-[9px]' : 'text-[10px]'} whitespace-nowrap`}>{showLabels && <span className="text-gray-500 font-medium mr-1 whitespace-nowrap shrink-0">GR/RR No:</span>}<span className="text-gray-900 font-bold">{renderInteractive(grRrNo, 'grRrNo', 'text', 'GR/RR No')}</span></div>
                    )}
                    {(!config.transport?.fields || config.transport.fields.includes('marka')) && (
                      isVertical ?
                        <div className={`flex items-center ${isTransCompact ? 'text-[9.5px]' : 'text-[11px]'} mb-0.5`}>{showLabels && <><span className={`${isTransCompact ? 'w-24' : 'w-28'} font-medium text-gray-700 shrink-0 whitespace-nowrap`}>Marka</span><span className="mr-2">:</span></>}<span className="flex-1 text-gray-900 font-medium">{renderInteractive(marka, 'marka', 'text', 'Marka')}</span></div> :
                        <div className={`flex items-center ${isTransCompact ? 'text-[9px]' : 'text-[10px]'} whitespace-nowrap`}>{showLabels && <span className="text-gray-500 font-medium mr-1 whitespace-nowrap shrink-0">Marka:</span>}<span className="text-gray-900 font-bold">{renderInteractive(marka, 'marka', 'text', 'Marka')}</span></div>
                    )}
                  </div>
                </div>
              );

            }
            return (
              <div key="transport" style={getSectionStyle('transport')}>
                <h4 style={{ fontSize: isTransCompact ? '11px' : '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: isTransCompact ? '2px' : '5px' }}>Transport Details</h4>
                <div style={bothAdded ? { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', columnGap: isTransCompact ? '12px' : '24px', rowGap: isTransCompact ? '2px' : '6px', alignItems: 'center' } : { display: 'flex', flexDirection: 'column', rowGap: isTransCompact ? '2px' : '4px' }}>
                  {(!config.transport?.fields || config.transport.fields.includes('vehicleNo')) && <div style={{ fontSize: isTransCompact ? '10px' : '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{showLabels && <strong>Vehicle No:</strong>} {renderInteractive(vehicleNo || (isInteractive ? '' : 'MH 12 AB 1234'), 'vehicleNo', 'text', 'Vehicle No')}</div>}
                  {(!config.transport?.fields || config.transport.fields.includes('poNumber')) && <div style={{ fontSize: isTransCompact ? '10px' : '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{showLabels && <strong>PO Number:</strong>} {renderInteractive((invoiceData as any)?.poNumber || (isInteractive ? '' : 'N/A'), 'poNumber', 'text', 'PO Number')}</div>}
                  {(!config.transport?.fields || config.transport.fields.includes('transport')) && <div style={{ fontSize: isTransCompact ? '10px' : '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{showLabels && <strong>Transporter:</strong>} {renderInteractive((invoiceData as any)?.transportName || (invoiceData as any)?.transport || (isInteractive ? '' : 'Fast Logistics'), 'transport', 'text', 'Transporter Name')}</div>}
                  {(!config.transport?.fields || config.transport.fields.includes('ewayBillNo')) && <div style={{ fontSize: isTransCompact ? '10px' : '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{showLabels && <strong>E-Way Bill No:</strong>} {renderInteractive(ewayBillNo || (isInteractive ? '' : '123456789012'), 'ewayBillNo', 'text', 'E-Way Bill No')}</div>}
                  {(!config.transport?.fields || config.transport.fields.includes('station')) && <div style={{ fontSize: isTransCompact ? '10px' : '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{showLabels && <strong>Station:</strong>} {renderInteractive(station || (isInteractive ? '' : 'Mumbai HQ'), 'station', 'text', 'Station')}</div>}
                  {(!config.transport?.fields || config.transport.fields.includes('driverMobile')) && <div style={{ fontSize: isTransCompact ? '10px' : '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{showLabels && <strong>Driver Mobile No:</strong>} {renderInteractive(driverMobile || (isInteractive ? '' : '+91 9876543210'), 'driverMobile', 'text', 'Driver Mobile')}</div>}
                  {(!config.transport?.fields || config.transport.fields.includes('grRrNo')) && <div style={{ fontSize: isTransCompact ? '10px' : '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{showLabels && <strong>GR/RR No:</strong>} {renderInteractive(grRrNo || (isInteractive ? '' : 'N/A'), 'grRrNo', 'text', 'GR/RR No')}</div>}
                  {(!config.transport?.fields || config.transport.fields.includes('marka')) && <div style={{ fontSize: isTransCompact ? '10px' : '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{showLabels && <strong>Marka:</strong>} {renderInteractive(marka || (isInteractive ? '' : 'N/A'), 'marka', 'text', 'Marka')}</div>}
                </div>
              </div>
            );
          }
          if (section.id === 'taxEngine') {
            const hasTaxCol = ensureAllColumns(config.table.columns).some(c => c.id === 'tax' && c.visible !== false);
            // Determine which tax type to show — must match the items table column header
            const isCgstSgst = dynamicTaxHeader.toUpperCase().startsWith('CGST');
            const isIgst = dynamicTaxHeader.toUpperCase().startsWith('IGST');
            const isCustomTax = taxMode === 'custom';

            if (layout.type === 'Modal Classic') {
              const align = getSectionAlignment('taxEngine');
              const paddingStyle = align === 'right' ? { paddingRight: '20px', paddingLeft: '0px' } : { paddingLeft: '0px', paddingRight: '0px' };
              
              return (
                <div id="section-taxEngine" key="taxEngine" style={{ ...getSectionStyle('taxEngine'), ...paddingStyle, display: 'flex', flexDirection: 'column', alignItems: align === 'right' ? 'flex-end' : 'flex-start', width: '100%' }}>
                  <div className={`space-y-${(isGlobalCompact || config.table?.isCompact) ? '1' : '2'} ${(isGlobalCompact || config.table?.isCompact) ? 'text-[9.5px]' : 'text-[11px]'} w-full max-w-[240px]`}>
                    {config.tax.showTotal && (
                      <div className="flex justify-between text-gray-600">
                        <span>Sub Total</span>
                        <span>{subTotal.toFixed(2)}</span>
                      </div>
                    )}
                    {/* Freight Charges Row */}
                    {isInteractive ? (
                      <div className="flex justify-between text-gray-600 mb-1">
                        <span
                          style={{ cursor: 'pointer', textDecoration: 'underline dashed', textUnderlineOffset: '2px' }}
                          onClick={() => {
                            if (onUpdateField) {
                              const hasFreight = invoiceData?.isFreightAdded || (invoiceData?.freightCharges || 0) > 0;
                              if (hasFreight) {
                                onUpdateField('isFreightAdded', 'false');
                                onUpdateField('freightCharges', '0');
                              } else {
                                onUpdateField('isFreightAdded', 'true');
                                onUpdateField('freightCharges', '50');
                              }
                            }
                          }}
                          title="Click to toggle Freight Charges"
                        >
                          Freight {(invoiceData?.isFreightAdded || (invoiceData?.freightCharges || 0) > 0) ? '(Remove)' : '(Add)'}
                        </span>
                        {(invoiceData?.isFreightAdded || (invoiceData?.freightCharges || 0) > 0) && (
                          <span className="font-semibold text-gray-800">
                            {currencySymbol} {renderInteractive(invoiceData?.freightCharges || 0, 'freightCharges', 'text', 'Freight')}
                          </span>
                        )}
                      </div>
                    ) : (
                      (invoiceData?.isFreightAdded || (invoiceData?.freightCharges || 0) > 0) && (
                        <div className="flex justify-between text-gray-600 mb-1">
                          <span>Freight Charges</span>
                          <span className="font-semibold text-gray-800">
                            {currencySymbol} {(invoiceData?.freightCharges || 0).toFixed(2)}
                          </span>
                        </div>
                      )
                    )}
                    {/* Discount row - always visible for every template */}
                    {((invoiceData?.discountTotal || 0) > 0 || (invoiceData?.discountValue || 0) > 0 || isInteractive) && (() => {
                      const discVal = Number(invoiceData?.discountValue || 0);
                      const discType = invoiceData?.discountType || 'none';
                      const isDiscPercent = discType === 'percent';
                      const isDiscFlat = discType === 'flat';
                      const isDiscNone = discType === 'none';
                      const calcDiscTotal = isDiscPercent
                        ? parseFloat(((subTotal * discVal) / 100).toFixed(2))
                        : (invoiceData?.discountTotal !== undefined && invoiceData?.discountTotal !== 0 ? invoiceData.discountTotal : discVal);

                      return (
                        <div className="flex justify-between items-center" style={{ color: '#e11d48', margin: '4px 0' }}>
                          <div className="flex items-center gap-1.5">
                            <span
                              style={isInteractive ? { cursor: 'pointer', textDecoration: 'underline dashed', textUnderlineOffset: '2px' } : {}}
                              onClick={() => {
                                if (isInteractive && onUpdateField) {
                                  const nextType = isDiscNone ? 'percent' : isDiscPercent ? 'flat' : 'none';
                                  onUpdateField('discountType', nextType);
                                  if (nextType === 'none') onUpdateField('discountValue', '0');
                                }
                              }}
                              title={isInteractive ? 'Click to toggle discount mode (Percent %, Flat Amount, Off)' : ''}
                            >
                              Discount {isDiscPercent ? (isInteractive ? `(${renderInteractive(discVal, 'discountValue', 'text', '0')}%)` : `(${discVal}%)`) : isDiscFlat ? '(Flat)' : '(Off)'}
                            </span>
                          </div>
                          {(calcDiscTotal > 0 || discVal > 0 || isInteractive) && (
                            <div className="flex items-center">
                              {isDiscPercent ? (
                                <span>- {currencySymbol} {calcDiscTotal.toFixed(2)}</span>
                              ) : (
                                <span>- {currencySymbol} {renderInteractive(discVal, 'discountValue', 'text', '0.00')}</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    {hasTaxCol && (
                      isCustomTax ? (
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
                      )
                    )}
                    <div className="flex justify-between text-gray-900 font-bold text-[14px] pt-1">
                      <span>TOTAL</span>
                      <span>{currencySymbol} {grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            }
            const freightChargesRow = (
              isInteractive ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', color: '#475569' }}>
                  <span
                    style={{ cursor: 'pointer', textDecoration: 'underline dashed', textUnderlineOffset: '2px' }}
                    onClick={() => {
                      if (onUpdateField) {
                        const hasFreight = invoiceData?.isFreightAdded || (invoiceData?.freightCharges || 0) > 0;
                        if (hasFreight) {
                          onUpdateField('isFreightAdded', 'false');
                          onUpdateField('freightCharges', '0');
                        } else {
                          onUpdateField('isFreightAdded', 'true');
                          onUpdateField('freightCharges', '50');
                        }
                      }
                    }}
                    title="Click to toggle Freight Charges"
                  >
                    Freight {(invoiceData?.isFreightAdded || (invoiceData?.freightCharges || 0) > 0) ? '(Remove)' : '(Add)'}
                  </span>
                  {(invoiceData?.isFreightAdded || (invoiceData?.freightCharges || 0) > 0) && (
                    <span style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
                      {currencySymbol} {renderInteractive(invoiceData?.freightCharges || 0, 'freightCharges', 'text', 'Freight')}
                    </span>
                  )}
                </div>
              ) : (
                (invoiceData?.isFreightAdded || (invoiceData?.freightCharges || 0) > 0) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', color: '#475569' }}>
                    <span>Freight Charges</span>
                    <span style={{ fontWeight: 'bold' }}>
                      {currencySymbol} {(invoiceData?.freightCharges || 0).toFixed(2)}
                    </span>
                  </div>
                )
              )
            );

            const discountRow = (
              ((invoiceData?.discountTotal || 0) > 0 || (invoiceData?.discountValue || 0) > 0 || isInteractive) && (() => {
                const discVal = Number(invoiceData?.discountValue || 0);
                const discType = invoiceData?.discountType || 'none';
                const isDiscPercent = discType === 'percent';
                const isDiscFlat = discType === 'flat';
                const isDiscNone = discType === 'none';
                const calcDiscTotal = isDiscPercent
                  ? parseFloat(((subTotal * discVal) / 100).toFixed(2))
                  : (invoiceData?.discountTotal !== undefined && invoiceData?.discountTotal !== 0 ? invoiceData.discountTotal : discVal);

                return (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '12px', color: '#e11d48' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={isInteractive ? { cursor: 'pointer', textDecoration: 'underline dashed', textUnderlineOffset: '2px' } : {}}
                        onClick={() => {
                          if (isInteractive && onUpdateField) {
                            const nextType = isDiscNone ? 'percent' : isDiscPercent ? 'flat' : 'none';
                            onUpdateField('discountType', nextType);
                            if (nextType === 'none') onUpdateField('discountValue', '0');
                          }
                        }}
                        title={isInteractive ? 'Click to toggle discount mode (Percent %, Flat Amount, Off)' : ''}
                      >
                        Discount {isDiscPercent ? (isInteractive ? `(${renderInteractive(discVal, 'discountValue', 'text', '0')}%)` : `(${discVal}%)`) : isDiscFlat ? '(Flat)' : '(Off)'}
                      </span>
                    </div>
                    {(calcDiscTotal > 0 || discVal > 0 || isInteractive) && (
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {isDiscPercent ? (
                          <span>- {currencySymbol} {calcDiscTotal.toFixed(2)}</span>
                        ) : (
                          <span>- {currencySymbol} {renderInteractive(discVal, 'discountValue', 'text', '0.00')}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()
            );

            return (
              <div id="section-taxEngine" key="taxEngine" style={getSectionStyle('taxEngine')}>
                {config.tax.enableTaxBreakdown && (
                  <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: getBorderRadius(), border: '1px solid #e2e8f0', width: '100%' }}>
                    {freightChargesRow}
                    {discountRow}
                    {config.tax.showTaxableAmount && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}><span>Taxable Amount:</span> <span>{currencySymbol} {subTotal.toFixed(2)}</span></div>}
                    {hasTaxCol && (
                      isCustomTax ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}>
                          <span>{taxName} ({taxRate}%):</span>
                          <span>{currencySymbol} {taxAmount.toFixed(2)}</span>
                        </div>
                      ) : isCgstSgst ? (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}><span>CGST ({taxRate / 2}%):</span> <span>{currencySymbol} {(taxAmount / 2).toFixed(2)}</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}><span>SGST ({taxRate / 2}%):</span> <span>{currencySymbol} {(taxAmount / 2).toFixed(2)}</span></div>
                        </>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}>
                          <span>{dynamicTaxHeader}:</span>
                          <span>{currencySymbol} {taxAmount.toFixed(2)}</span>
                        </div>
                      )
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '2px solid #e2e8f0', fontSize: '16px', fontWeight: 'bold', color: styleConfig.primaryColor }}><span>Grand Total:</span> <span>{currencySymbol} {grandTotal.toFixed(2)}</span></div>
                  </div>
                )}
                {!config.tax.enableTaxBreakdown && (
                  <div style={{ width: '100%' }}>
                    {freightChargesRow}
                    {discountRow}
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e2e8f0', fontSize: '14px', fontWeight: 'bold', color: styleConfig.primaryColor }}>
                      <span>Grand Total:</span>
                      <span>{currencySymbol} {grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          if (section.id === 'amountInWords') {
            if (layout.type === 'Modal Classic') {
              if (!config.amountInWords.enabled) return null;
              const words = numberToWords(grandTotal || 0, config.amountInWords.format);
              const isPaymentBeforeTax = (sections.payment?.order ?? 0) < (sections.taxEngine?.order ?? 0);
              const alignClass = isPaymentBeforeTax ? 'text-right' : 'text-left';
              return (
                <div id="section-amountInWords" key="amountInWords" style={getSectionStyle('amountInWords')}>
                  <div className={`${alignClass} pt-1`}>
                    <div className="font-bold text-[10px] text-gray-800">Amount in Words:</div>
                    <div className="text-[10px] text-gray-500 italic mt-0.5">{words}</div>
                  </div>
                </div>
              );

            }
            if (!config.amountInWords.enabled) return null;
            const words = numberToWords(grandTotal || 0, config.amountInWords.format);
            return (
              <div id="section-amountInWords" key="amountInWords" style={getSectionStyle('amountInWords')}>
                <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0 }}>Amount in Words:</p>
                <p style={{ fontSize: '12px', fontStyle: 'italic', margin: '4px 0', textTransform: 'capitalize' }}>{words}</p>
              </div>
            );
          }

          if (section.id === 'terms') {
            const showNotes = config.terms.showNotes !== false;
            const showTerms = config.terms.showTerms !== false;
            if (!showNotes && !showTerms) return null;

            const notesContent = (invoiceData?.notes !== undefined && invoiceData?.notes !== null && invoiceData?.notes !== '')
              ? invoiceData.notes 
              : (config.terms.notesText || 'Thank you for your business!');
            const termsContent = (invoiceData?.invoiceTerms !== undefined && invoiceData?.invoiceTerms !== null && invoiceData?.invoiceTerms !== '')
              ? invoiceData.invoiceTerms 
              : (config.terms.customText || 'Standard terms apply.');

            if (layout.type === 'Modal Classic') {
              return (
                <div key="terms" style={{ ...getSectionStyle('terms'), marginTop: 'auto' }}>
                  {showNotes && (
                    <div className="mb-3">
                      <div className="font-bold text-gray-800 text-[10px] uppercase mb-1">Notes</div>
                      <div className="text-gray-600 text-[10px] leading-relaxed whitespace-pre-wrap">{renderInteractive(notesContent, 'notes', 'textarea')}</div>
                    </div>
                  )}
                  {showTerms && (
                    <div>
                      <div className="font-bold text-gray-800 text-[10px] uppercase mb-1">Terms & Conditions</div>
                      <div className="text-gray-600 text-[10px] leading-relaxed whitespace-pre-wrap">{renderInteractive(termsContent, 'invoiceTerms', 'textarea')}</div>
                    </div>
                  )}
                </div>
              );
            }

            const termsAlign = getFooterAlignment('terms');
            return (
              <div key="terms" style={{ ...getSectionStyle('terms'), textAlign: termsAlign }}>
                {showNotes && (
                  <div style={{ marginBottom: showTerms ? '8px' : '0' }}>
                    <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0, color: '#64748b' }}>Notes</p>
                    <div style={{ fontSize: '10px', margin: '4px 0', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{renderInteractive(notesContent, 'notes', 'textarea')}</div>
                  </div>
                )}
                {showTerms && (
                  <div>
                    <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0, color: '#64748b' }}>Terms & Conditions</p>
                    <div style={{ fontSize: '10px', margin: '4px 0', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{renderInteractive(termsContent, 'invoiceTerms', 'textarea')}</div>
                  </div>
                )}
              </div>
            );
          }

           if (section.id === 'payment') {
            const upiIdVal = businessProfile?.upiId || (invoiceData as any)?.upiId || '';
            const upiPayeeName = businessProfile?.name || '';
            const upiAmount = grandTotal || 0;
            const upiUri = upiIdVal ? `upi://pay?pa=${upiIdVal}&pn=${encodeURIComponent(upiPayeeName)}&am=${upiAmount}&cu=INR` : '';
            const qrCodeUrl = upiUri ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiUri)}` : '';

            const getBankDetailsText = () => {
              const parts = [];
              if (businessProfile?.bankName) parts.push(`Bank: ${businessProfile.bankName}`);
              if (businessProfile?.accountNumber) parts.push(`A/C No: ${businessProfile.accountNumber}`);
              if (businessProfile?.ifsc) parts.push(`IFSC: ${businessProfile.ifsc}`);
              if (businessProfile?.upiId) parts.push(`UPI ID: ${businessProfile.upiId}`);
              
              if (parts.length > 0) {
                if (config.payment.customNote) {
                  return `${parts.join('\n')}\nNote: ${config.payment.customNote}`;
                }
                return parts.join('\n');
              }
              
              return config.payment.customNote || 'Bank: HDFC Bank\nA/C No: 1234567890\nIFSC: HDFC0001234';
            };

            const bankDetailsText = getBankDetailsText();

            const isPaymentAfterTax = (sections.payment?.order ?? 0) > (sections.taxEngine?.order ?? 0);

            if (layout.type === 'Modal Classic') {
              const align = getSectionAlignment('payment');
              const qrBlock = config.payment.generateQrCode && (
                qrCodeUrl ? (
                  <div className="no-privacy-blur qr-code-container" data-privacy-exempt="true" style={{ flexShrink: 0 }}>
                    <img src={qrCodeUrl} alt="UPI QR Code" data-privacy-exempt="true" className="no-privacy-blur" style={{ width: 60, height: 60, display: 'block', border: '1px solid #e2e8f0', padding: '1px', backgroundColor: '#fff', filter: 'none', WebkitFilter: 'none' }} crossOrigin="anonymous" />
                  </div>
                ) : (
                  <div className="no-privacy-blur qr-code-container" data-privacy-exempt="true" style={{ width: 60, height: 60, backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: '#64748b', textAlign: 'center', flexShrink: 0 }}>No UPI ID</div>
                )
              );

              const detailsBlock = (
                <div className="no-privacy-blur" data-privacy-exempt="true" style={{ whiteSpace: 'pre-wrap', textAlign: 'left', fontSize: '10px', color: '#475569' }}>
                  {bankDetailsText}
                </div>
              );

              return (
                <div id="section-payment" key="payment" className="no-privacy-blur" data-privacy-exempt="true" style={{ ...getSectionStyle('payment'), textAlign: align, display: 'flex', flexDirection: 'column', alignItems: align === 'right' ? 'flex-end' : 'flex-start', width: '100%', marginBottom: config.payment.isCompact ? '4px' : undefined, paddingBottom: config.payment.isCompact ? '4px' : undefined }}>
                  <div className="font-bold text-gray-800 text-[10px] mb-1">Banking Information</div>
                  <div className="text-gray-600 text-[10px] leading-relaxed whitespace-pre-wrap" style={{ textAlign: align, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: config.payment.isCompact ? '6px' : '12px', marginTop: config.payment.isCompact ? '2px' : '4px' }}>
                    {isPaymentAfterTax ? (
                      <>
                        {detailsBlock}
                        {qrBlock}
                      </>
                    ) : (
                      <>
                        {qrBlock}
                        {detailsBlock}
                      </>
                    )}
                  </div>
                </div>
              );
            }
            const payAlign = getFooterAlignment('payment');
            const payJustify = payAlign === 'left' ? 'flex-start' : payAlign === 'center' ? 'center' : 'flex-end';
            
            const qrBlockLarge = config.payment.generateQrCode && (
              qrCodeUrl ? (
                <div className="no-privacy-blur qr-code-container" data-privacy-exempt="true" style={{ flexShrink: 0 }}>
                  <img src={qrCodeUrl} alt="UPI QR Code" data-privacy-exempt="true" className="no-privacy-blur" style={{ width: '80px', height: '80px', display: 'block', border: '1px solid #e2e8f0', padding: '2px', backgroundColor: '#fff', filter: 'none', WebkitFilter: 'none' }} crossOrigin="anonymous" />
                </div>
              ) : (
                <div className="no-privacy-blur qr-code-container" data-privacy-exempt="true" style={{ width: '80px', height: '80px', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#64748b', textAlign: 'center', flexShrink: 0 }}>No UPI ID</div>
              )
            );

            const detailsBlockLarge = (
              <div style={{ fontSize: '11px', textAlign: 'left' }}>
                <p style={{ margin: '2px 0', whiteSpace: 'pre-wrap' }}>{bankDetailsText}</p>
              </div>
            );

            return (
              <div id="section-payment" key="payment" style={{ ...getSectionStyle('payment'), textAlign: payAlign, marginBottom: config.payment.isCompact ? '4px' : undefined, paddingTop: config.payment.isCompact ? '4px' : undefined, paddingBottom: config.payment.isCompact ? '4px' : undefined }}>
                <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0, color: '#64748b' }}>Payment Details</p>
                <div style={{ display: 'flex', gap: config.payment.isCompact ? '10px' : '20px', marginTop: config.payment.isCompact ? '4px' : '10px', justifyContent: payJustify, alignItems: 'center' }}>
                  {isPaymentAfterTax ? (
                    <>
                      {detailsBlockLarge}
                      {qrBlockLarge}
                    </>
                  ) : (
                    <>
                      {qrBlockLarge}
                      {detailsBlockLarge}
                    </>
                  )}
                </div>
              </div>
            );
          }

          if (section.id === 'signature') {
            if (layout.type === 'Modal Classic') {

              return (
                <div key="signature" style={{ ...getSectionStyle('signature'), textAlign: 'right', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                    {config.signature.showStamp && <div style={{ width: 60, height: 60, borderRadius: '50%', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#94a3b8' }}>STAMP</div>}
                    {config.signature.showSignature && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginBottom: '4px' }}>
                        {activeSignature ? (
                          <img src={activeSignature} alt="Signature" style={{ width: `${businessProfile?.signatureSize || 180}px`, height: 'auto', maxHeight: '70px', objectFit: 'contain', marginBottom: '4px' }} crossOrigin="anonymous" />
                        ) : (
                          <div style={{ width: 100, borderBottom: '1px solid #000', marginBottom: '5px' }}></div>
                        )}
                      </div>
                    )}
                    <div className="text-[10px] text-gray-600 font-bold">{config.signature.signatoryName || "Authorized Signatory"}</div>
                    <div className="text-[9px] text-gray-400">{config.signature.designation || "Signatory"}</div>
                  </div>
                </div>
              );

            }
            const sigAlign = getFooterAlignment('signature');
            const sigAlignItems = sigAlign === 'left' ? 'flex-start' : 'flex-end';
            const sigJustify = sigAlign === 'left' ? 'flex-start' : 'flex-end';
            return (
              <div key="signature" style={{ ...getSectionStyle('signature'), display: 'flex', flexDirection: 'column', alignItems: sigAlignItems, justifyContent: 'flex-end', textAlign: sigAlign }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', justifyContent: sigJustify }}>
                  {config.signature.showStamp && (
                    <div style={{ width: 80, height: 80, borderRadius: '50%', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#94a3b8', marginBottom: '10px' }}>STAMP</div>
                  )}
                  {config.signature.showSignature && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: sigAlignItems }}>
                      {activeSignature ? (
                        <img src={activeSignature} alt="Signature" style={{ width: `${businessProfile?.signatureSize || 220}px`, height: 'auto', maxHeight: `${Math.round((businessProfile?.signatureSize || 220) * 0.4)}px`, objectFit: 'contain', marginBottom: '4px' }} crossOrigin="anonymous" />
                      ) : (
                        <div style={{ width: `${businessProfile?.signatureSize || 220}px`, height: config.signature.height, borderBottom: '1px solid #cbd5e1', marginBottom: '10px' }}></div>
                      )}
                      <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0 }}>{config.signature.signatoryName || compName}</p>
                      <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>{config.signature.designation || 'Authorized Signatory'}</p>
                    </div>
                  )}
                  {!config.signature.showSignature && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: sigAlignItems }}>
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
              <div key="footer" style={{ ...getSectionStyle('footer'), borderTop: '1px solid #e2e8f0', paddingTop: '20px', marginTop: 'auto', textAlign: 'center' }}>
                {config.footer.message && <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0' }}>{config.footer.message}</p>}
                {(() => {
                  const contactParts = [];
                  if (config.footer.showWebsite !== false && compWebsite && compWebsite.trim() !== '') {
                    contactParts.push(compWebsite);
                  }
                  if (config.footer.showContact !== false) {
                    if (compEmail && compEmail.trim() !== '') contactParts.push(compEmail);
                    if (compPhone && compPhone.trim() !== '') contactParts.push(compPhone);
                  }
                  const footerLine = contactParts.filter(Boolean).join(' | ');
                  return footerLine ? (
                    <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0' }}>{footerLine}</p>
                  ) : null;
                })()}
                {config.footer.showPageNumbers && <p style={{ fontSize: '10px', color: '#94a3b8', margin: '10px 0 0 0' }}>Page 1 of 1</p>}
              </div>
            );
          }

          return null;
        })}
      </div>

      {true && (
        <div id="pinned-footer-container" style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px', zIndex: 1 }}>
          {/* Row for Terms and Signature */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '40px' }}>
            {/* Left Column: Terms */}
            <div style={{ flex: 1 }}>
              {sections.terms?.visible !== false && (config.terms.showNotes !== false || config.terms.showTerms !== false) && (
                <div>
                  {config.terms.showNotes !== false && (
                    <>
                      <div className="font-bold text-gray-800 text-[10px] uppercase mb-1">NOTES</div>
                      <div className="text-gray-600 text-[10px] leading-relaxed mb-4">{renderInteractive(invoiceData?.notes || config.terms.notesText || 'Thank you for your business!', 'notes', 'textarea')}</div>
                    </>
                  )}
                  {config.terms.showTerms !== false && (
                    <>
                      <div className="font-bold text-gray-800 text-[10px] mb-1">Terms & Conditions</div>
                      <div className="text-gray-600 text-[10px] leading-relaxed whitespace-pre-wrap">{renderInteractive(invoiceData?.invoiceTerms || config.terms.customText, 'invoiceTerms', 'textarea')}</div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Signature */}
            <div style={{ width: '220px', textAlign: 'right' }}>
              {sections.signature?.visible !== false && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                  {config.signature.showStamp && <div style={{ width: 60, height: 60, borderRadius: '50%', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#94a3b8' }}>STAMP</div>}
                  {config.signature.showSignature && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      {activeSignature ? (
                        <img src={activeSignature} alt="Signature" style={{ width: `${businessProfile?.signatureSize || 220}px`, height: 'auto', maxHeight: `${Math.round((businessProfile?.signatureSize || 220) * 0.4)}px`, objectFit: 'contain', marginBottom: '4px' }} crossOrigin="anonymous" />
                      ) : (
                        <div style={{ width: `${businessProfile?.signatureSize || 220}px`, height: config.signature.height, borderBottom: '1px solid #cbd5e1', marginBottom: '10px' }}></div>
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
              )}
            </div>
          </div>

          {/* Footer Row */}
          {sections.footer?.visible !== false && (
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '15px', textAlign: 'center' }}>
              {config.footer.message && <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0' }}>{config.footer.message}</p>}
                {(() => {
                  const contactParts = [];
                  if (config.footer.showWebsite !== false && compWebsite && compWebsite.trim() !== '') {
                    contactParts.push(compWebsite);
                  }
                  if (config.footer.showContact !== false) {
                    if (compEmail && compEmail.trim() !== '') contactParts.push(compEmail);
                    if (compPhone && compPhone.trim() !== '') contactParts.push(compPhone);
                  }
                  const footerLine = contactParts.filter(Boolean).join(' | ');
                  return footerLine ? (
                    <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0' }}>{footerLine}</p>
                  ) : null;
                })()}
              {config.footer.showPageNumbers && <p style={{ fontSize: '10px', color: '#94a3b8', margin: '8px 0 0 0' }}>Page {pageIdx + 1} of {totalPages}</p>}
            </div>
          )}
        </div>
      )}
        </div>
      </div>
    );
  };

  let pages: any[][] = [];
  if (printPageChunks && printPageChunks.length > 0) {
    pages = printPageChunks;
  } else {
    const FIRST_PAGE_ITEMS = 8;
    const SUBSEQUENT_PAGE_ITEMS = 7;
    
    if (!items || items.length === 0) {
      pages = [[]];
    } else if (!isPrintMode) {
      pages = [[...items]];
    } else {
      const remainingItems = [...items];
      pages.push(remainingItems.splice(0, FIRST_PAGE_ITEMS));
      while (remainingItems.length > 0) {
        pages.push(remainingItems.splice(0, SUBSEQUENT_PAGE_ITEMS));
      }
    }
  }

  const selectedCopies = (invoiceData as any)?.selectedCopies || (invoiceData as any)?.embeddedTemplate?.selectedCopies || { customer: true };
  const copiesToRender: string[] = [];
  if (selectedCopies.customer) copiesToRender.push('ORIGINAL FOR RECIPIENT');
  if (selectedCopies.transport) copiesToRender.push('DUPLICATE FOR TRANSPORTER');
  if (selectedCopies.supplier) copiesToRender.push('TRIPLICATE FOR SUPPLIER');
  if (selectedCopies.challan) copiesToRender.push('DELIVERY CHALLAN');

  if (copiesToRender.length === 0) {
    copiesToRender.push('ORIGINAL FOR RECIPIENT');
  }

  const totalPages = pages.length;

  return (
    <div className={`invoice-live-preview-container ${isPrintMode ? 'invoice-print-container' : 'flex-1 h-full'}`} style={isPrintMode ? { display: 'flex', flexDirection: 'column', gap: '40px', backgroundColor: 'transparent' } : { display: 'flex', flexDirection: 'column', gap: '40px', height: '100%', flex: 1 }}>
      {copiesToRender.map((copyLabel, copyIdx) =>
        pages.map((pageItems, pageIdx) => {
          const isFirstPage = pageIdx === 0;
          const isLastPage = pageIdx === totalPages - 1;
          
          let startSrNo = 0;
          for (let p = 0; p < pageIdx; p++) {
            startSrNo += pages[p].length;
          }

          return (
            <div
              key={`${copyIdx}-${pageIdx}`}
              className={isPrintMode ? "invoice-pdf-page bg-white relative flex flex-col" : "invoice-live-preview relative flex flex-col"}
              style={isPrintMode ? {
                width: layout.pageSize === 'A4' ? '794px' : '816px',
                minHeight: layout.pageSize === 'A4' ? '1123px' : '1056px',
                paddingTop: '20px',
                paddingLeft: '40px',
                paddingRight: '40px',
                paddingBottom: '20px',
                boxSizing: 'border-box',
                fontFamily: styleConfig.fontFamily || 'Inter',
                color: '#333',
                backgroundColor: '#ffffff',
                position: 'relative'
              } : { ...baseStyle, position: 'relative' }}
            >
              {/* Copy Label Indicator in top-right corner of the page */}
              <div 
                className="absolute top-3.5 right-6 px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-md border select-none whitespace-nowrap shrink-0 inline-block"
                style={{
                  fontSize: '8.5px',
                  lineHeight: '1.2',
                  fontWeight: '900',
                  border: '1px solid #bae6fd',
                  backgroundColor: '#e0f2fe',
                  color: '#0284c7',
                  width: 'max-content',
                  whiteSpace: 'nowrap',
                  zIndex: 20
                }}
              >
                {copyLabel}
              </div>

              {renderInvoiceContent(pageItems, startSrNo, isFirstPage, isLastPage, pageIdx, totalPages)}
            </div>
          );
        })
      )}
      
      {isInteractive && clients && clients.length > 0 && (
        <>
          <datalist id="billed-to-clients">
            {clients.map((c) => (
              <option key={`bill-${c.id}`} value={c.name}>
                {c.companyName && c.companyName !== c.name ? `${c.companyName}` : ''}
              </option>
            ))}
          </datalist>
          <datalist id="shipped-to-clients">
            {clients.map((c) => (
              <option key={`ship-${c.id}`} value={c.name}>
                {c.companyName && c.companyName !== c.name ? `${c.companyName}` : ''}
              </option>
            ))}
          </datalist>
        </>
      )}
    </div>
  );
};
