import { InvoiceTemplate } from '../types';

export interface QuickBuilderState {
  invoiceType: 'Invoice' | 'Estimate' | 'Credit Note' | 'Proforma';
  templateStyle: 'Modern' | 'Corporate' | 'Minimal' | 'Premium';
  branding: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    showLogo: boolean;
    titleAlignment: 'Left' | 'Center' | 'Right';
  };
  sections: {
    company: boolean;
    customer: boolean;
    gst: boolean;
    transport: boolean;
    payment: boolean;
    qrCode: boolean;
    signature: boolean;
    terms: boolean;
    notes: boolean;
  };
  tableLayout: 'Compact' | 'Standard' | 'Detailed';
}

export const generateTemplateFromQuickState = (state: QuickBuilderState): InvoiceTemplate => {
  const id = `tmpl_${Math.random().toString(36).substr(2, 9)}`;
  
  // Base style configuration depending on selected style
  const styleConfig: InvoiceTemplate['styleConfig'] = {
    primaryColor: state.branding.primaryColor,
    secondaryColor: state.branding.secondaryColor,
    accentColor: state.branding.primaryColor,
    fontFamily: state.branding.fontFamily,
    spacing: 'Normal',
    borderStyle: 'Light',
    roundedCorners: true,
    sectionBackgroundColors: {},
    alternatingRowColors: true,
    tableHeaderBackground: state.branding.primaryColor,
    tableHeaderTextColor: '#ffffff'
  };

  if (state.templateStyle === 'Corporate') {
    styleConfig.borderStyle = 'Heavy';
    styleConfig.roundedCorners = false;
    styleConfig.tableHeaderBackground = '#1e293b'; // Darker header for corporate
  } else if (state.templateStyle === 'Minimal') {
    styleConfig.borderStyle = 'None';
    styleConfig.tableHeaderBackground = '#f8fafc';
    styleConfig.tableHeaderTextColor = '#0f172a';
    styleConfig.alternatingRowColors = false;
  } else if (state.templateStyle === 'Premium') {
    styleConfig.borderStyle = 'Medium';
    styleConfig.roundedCorners = true;
    styleConfig.sectionBackgroundColors = { header: state.branding.primaryColor }; // Filled header
  }

  type ColumnConfig = InvoiceTemplate['config']['table']['columns'][0];

  // Table Configuration based on layout
  const columns: ColumnConfig[] = [
    { id: 'sr', visible: state.tableLayout !== 'Compact', label: '#', type: 'Number', order: 1 },
    { id: 'name', visible: true, label: 'Item Description', type: 'Text', order: 2 },
    { id: 'qty', visible: state.tableLayout !== 'Compact', label: 'Qty', type: 'Number', order: 4 },
    { id: 'rate', visible: state.tableLayout !== 'Compact', label: 'Rate', type: 'Currency', order: 5 },
    { id: 'amount', visible: true, label: 'Amount', type: 'Formula', formula: 'qty*rate', order: 7 }
  ];

  if (state.tableLayout === 'Detailed') {
    columns.push({ id: 'hsn', visible: state.sections.gst, label: 'HSN/SAC', type: 'Text', order: 3 });
    columns.push({ id: 'tax', visible: state.sections.gst, label: 'Tax %', type: 'Number', order: 6 });
  }

  return {
    id,
    name: `Quick ${state.templateStyle} Template`,
    description: `Generated via Quick Builder. Type: ${state.invoiceType}`,
    isDefault: false,
    category: 'User',
    layout: {
      type: state.templateStyle === 'Minimal' ? 'Modern' : 'Classic',
      pageSize: 'A4',
      orientation: 'Portrait',
      margins: state.tableLayout === 'Compact' ? 'Compact' : 'Standard',
      watermark: { enabled: false, text: 'CONFIDENTIAL', opacity: 0.1, position: 'Center', rotation: -45 }
    },
    sections: {
      header: { id: 'header', visible: true, order: 1, gridColumnSpan: 12, customLabels: {}, customStyles: {} },
      companyInfo: { id: 'companyInfo', visible: state.sections.company, order: 2, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
      invoiceInfo: { id: 'invoiceInfo', visible: true, order: 3, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
      billTo: { id: 'billTo', visible: state.sections.customer, order: 4, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
      shipTo: { id: 'shipTo', visible: state.sections.transport, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
      transport: { id: 'transport', visible: state.sections.transport, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} },
      productTable: { id: 'productTable', visible: true, order: 7, gridColumnSpan: 12, customLabels: {}, customStyles: {} },
      taxEngine: { id: 'taxEngine', visible: state.sections.gst, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
      payment: { id: 'payment', visible: state.sections.payment, order: 9, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
      amountInWords: { id: 'amountInWords', visible: true, order: 10, gridColumnSpan: 12, customLabels: {}, customStyles: {} },
      terms: { id: 'terms', visible: state.sections.terms, order: 11, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
      signature: { id: 'signature', visible: state.sections.signature, order: 12, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
      footer: { id: 'footer', visible: state.sections.notes, order: 13, gridColumnSpan: 12, customLabels: {}, customStyles: {} }
    },
    config: {
      header: { 
        showLogo: state.branding.showLogo, 
        logoPosition: state.branding.titleAlignment === 'Left' ? 'Right' : state.branding.titleAlignment === 'Right' ? 'Left' : 'Center', 
        logoWidth: 120, logoHeight: 60, 
        titleAlignment: state.branding.titleAlignment, 
        invoiceTitle: state.invoiceType.toUpperCase() 
      },
      company: { fields: ['name', 'address', state.sections.gst ? 'gstin' : '', 'email', 'phone'].filter(Boolean) },
      invoiceInfo: { fields: ['invoiceNumber', 'invoiceDate', 'dueDate'], customFields: [], position: 'Right' },
      client: { fields: ['name', 'address', state.sections.gst ? 'gstin' : ''].filter(Boolean) },
      shipping: { fields: ['name', 'address'], sameAsBilling: true },
      transport: { fields: ['vehicleNo', 'transportName'] },
      table: {
        columns: columns.sort((a, b) => a.order - b.order)
      },
      tax: { 
        showTaxableAmount: state.sections.gst, 
        showCgstSgst: state.sections.gst, 
        showIgst: state.sections.gst, 
        showCess: false, 
        showDiscount: true, 
        showRoundOff: true, 
        showTotal: true, 
        enableHsnSummary: state.sections.gst && state.tableLayout === 'Detailed', 
        enableGstSummary: false, 
        enableTaxBreakdown: state.sections.gst 
      },
      payment: { generateQrCode: state.sections.qrCode, enableInstructions: true, customNote: 'Please include invoice number in payment.' },
      amountInWords: { format: 'Indian', enabled: true },
      terms: { presetId: 'default', customText: '1. Subject to local jurisdiction.\\n2. Goods once sold will not be taken back.' },
      signature: { showSignature: true, showStamp: false, position: 'Right', width: 150, height: 60, signatoryName: 'Authorized Signatory', designation: '' },
      footer: { message: 'Thank you for your business!', thankYouNote: '', supportContact: '', website: '', showPageNumbers: true, showGeneratedBy: true, customText: '' }
    },
    styleConfig
  };
};
