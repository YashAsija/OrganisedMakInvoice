import { InvoiceTemplate } from '../types';

const generateBaseTemplate = (id: string, name: string, category: InvoiceTemplate['category']): InvoiceTemplate => ({
  id,
  name,
  description: `${name} template configuration`,
  isDefault: false,
  category: category,
  layout: {
    type: 'Classic',
    pageSize: 'A4',
    orientation: 'Portrait',
    margins: 'Standard',
    watermark: { enabled: false, text: 'CONFIDENTIAL', opacity: 0.1, position: 'Center', rotation: -45 }
  },
  sections: {
    header: { id: 'header', visible: true, order: 1, gridColumnSpan: 12, customLabels: {}, customStyles: {} },
    companyInfo: { id: 'companyInfo', visible: true, order: 2, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
    invoiceInfo: { id: 'invoiceInfo', visible: true, order: 3, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
    billTo: { id: 'billTo', visible: true, order: 4, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
    shipTo: { id: 'shipTo', visible: false, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
    transport: { id: 'transport', visible: false, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} },
    productTable: { id: 'productTable', visible: true, order: 7, gridColumnSpan: 12, customLabels: {}, customStyles: {} },
    taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
    payment: { id: 'payment', visible: true, order: 9, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
    amountInWords: { id: 'amountInWords', visible: true, order: 10, gridColumnSpan: 12, customLabels: {}, customStyles: {} },
    terms: { id: 'terms', visible: true, order: 11, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
    signature: { id: 'signature', visible: true, order: 12, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
    footer: { id: 'footer', visible: true, order: 13, gridColumnSpan: 12, customLabels: {}, customStyles: {} }
  },
  config: {
    header: { showLogo: true, logoPosition: 'Left', logoWidth: 120, logoHeight: 60, titleAlignment: 'Right', invoiceTitle: 'TAX INVOICE' },
    company: { fields: ['name', 'address', 'gstin', 'email', 'phone', 'pan'] },
    invoiceInfo: { fields: ['invoiceNumber', 'invoiceDate', 'dueDate'], customFields: [], position: 'Right' },
    client: { fields: ['name', 'address', 'gstin'] },
    shipping: { fields: ['name', 'address', 'gstin', 'phone', 'email', 'pan'], sameAsBilling: false },
    transport: { fields: ['vehicleNo', 'transportName'] },
    table: {
      columns: [
        { id: 'sr', visible: true, label: 'SR NO', type: 'Number', order: 1 },
        { id: 'name', visible: true, label: 'ITEM NAME', type: 'Text', order: 2 },
        { id: 'hsn', visible: true, label: 'HSN/SAC', type: 'Text', order: 3 },
        { id: 'qty', visible: true, label: 'QTY', type: 'Number', order: 4 },
        { id: 'rate', visible: true, label: 'RATE', type: 'Currency', order: 5 },
        { id: 'tax', visible: true, label: 'Tax %', type: 'Number', order: 6 },
        { id: 'amount', visible: true, label: 'AMOUNT', type: 'Formula', formula: 'qty*rate', order: 7 }
      ]
    },
    tax: { showTaxableAmount: true, showCgstSgst: true, showIgst: true, showCess: false, showDiscount: true, showRoundOff: true, showTotal: true, enableHsnSummary: false, enableGstSummary: false, enableTaxBreakdown: true },
    payment: { generateQrCode: true, enableInstructions: true, customNote: 'Please include invoice number in payment.' },
    amountInWords: { format: 'Indian', enabled: true },
    terms: { presetId: 'default', customText: '1. Subject to local jurisdiction.\n2. Goods once sold will not be taken back.' },
    signature: { showSignature: true, showStamp: false, position: 'Right', width: 150, height: 60, signatoryName: 'Authorized Signatory', designation: '' },
    footer: { message: 'Thank you for your business!', thankYouNote: '', supportContact: '', website: '', showPageNumbers: true, showGeneratedBy: true, customText: '' }
  },
  styleConfig: {
    primaryColor: '#4f46e5',
    secondaryColor: '#f1f5f9',
    accentColor: '#10b981',
    fontFamily: 'Inter',
    spacing: 'Normal',
    borderStyle: 'Light',
    roundedCorners: true,
    sectionBackgroundColors: {},
    alternatingRowColors: true,
    tableHeaderBackground: '#4f46e5',
    tableHeaderTextColor: '#ffffff'
  }
});

export const makInvoicesOriginalPreset: InvoiceTemplate = {
  ...generateBaseTemplate('preset_modal_classic', 'MakInvoices Original', 'Default'),
  description: 'The exact original structured layout from the Add New Invoice screen. It features a comprehensive, traditional design perfectly suited for detailed service or product billing.',
  isDefault: true,
  layout: {
    type: 'Modal Classic',
    pageSize: 'A4',
    orientation: 'Portrait',
    margins: 'Standard',
    watermark: { enabled: false, text: 'DRAFT', opacity: 0.1, position: 'Center', rotation: -45 }
  },
  sections: {
    ...generateBaseTemplate('preset_modal_classic', 'MakInvoices Original', 'Default').sections,
    // All major sections visible by default to match the original invoice view
    shipTo:       { id: 'shipTo',       visible: true,  order: 5,    gridColumnSpan: 6,  customLabels: {}, customStyles: {} },
    transport:    { id: 'transport',    visible: true,  order: 6,    gridColumnSpan: 12, customLabels: {}, customStyles: {} },
    taxEngine:    { id: 'taxEngine',    visible: true,  order: 8,    gridColumnSpan: 6,  customLabels: {}, customStyles: {} },
    payment:      { id: 'payment',      visible: true,  order: 9,    gridColumnSpan: 6,  customLabels: {}, customStyles: {} },
    amountInWords:{ id: 'amountInWords',visible: true,  order: 10,   gridColumnSpan: 12, customLabels: {}, customStyles: {} },
    terms:        { id: 'terms',        visible: true,  order: 11,   gridColumnSpan: 6,  customLabels: {}, customStyles: {} },
    signature:    { id: 'signature',    visible: true,  order: 12,   gridColumnSpan: 6,  customLabels: {}, customStyles: {} },
    footer:       { id: 'footer',       visible: true,  order: 13,   gridColumnSpan: 12, customLabels: {}, customStyles: {} },
  },
  config: {
    ...generateBaseTemplate('preset_modal_classic', 'MakInvoices Original', 'Default').config,
    // Header: Logo left, TAX INVOICE right
    header: {
      showLogo: true,
      logoPosition: 'Left',
      logoWidth: 120,
      logoHeight: 60,
      titleAlignment: 'Right',
      invoiceTitle: 'TAX INVOICE'
    },
    // Company info: all fields shown as in screenshot
    company: {
      fields: ['name', 'owner', 'email', 'phone', 'address', 'state', 'country', 'gstin']
    },
    // Invoice info block: all right-side fields shown in screenshot
    invoiceInfo: {
      fields: ['invoiceNumber', 'invoiceDate', 'dueDate', 'placeOfSupply', 'grRrNo', 'referenceNumber'],
      customFields: [],
      position: 'Right'
    },
    // Bill To: all fields shown in screenshot
    client: {
      fields: ['name', 'phone', 'country', 'state', 'address', 'gstin']
    },
    // Ship To: mirrors Bill To fields as shown in screenshot
    shipping: {
      fields: ['name', 'phone', 'country', 'state', 'address', 'gstin'],
      sameAsBilling: false
    },
    // Transport: all 3 fields shown in screenshot
    transport: {
      fields: ['vehicleNo', 'driverMobile', 'ewayBillNo']
    },
    // Product table columns matching screenshot: SR NO, ITEM NAME, HSN/SAC, QTY, RATE, TAX %, AMOUNT
    table: {
      columns: [
        { id: 'sr',     visible: true,  label: 'SR NO',      type: 'Number',  order: 1 },
        { id: 'name',   visible: true,  label: 'ITEM NAME',  type: 'Text',    order: 2 },
        { id: 'hsn',    visible: true,  label: 'HSN/SAC',    type: 'Text',    order: 3 },
        { id: 'qty',    visible: true,  label: 'QTY',        type: 'Number',  order: 4 },
        { id: 'rate',   visible: true,  label: 'RATE',       type: 'Currency',order: 5 },
        { id: 'tax',    visible: true,  label: 'Tax %',      type: 'Number',  order: 6 },
        { id: 'amount', visible: true,  label: 'AMOUNT',     type: 'Formula', formula: 'qty*rate', order: 7 }
      ]
    },
    // Tax engine: Sub Total + IGST/CGST+SGST + Total
    tax: {
      showTaxableAmount: true,
      showCgstSgst: true,
      showIgst: true,
      showCess: false,
      showDiscount: true,
      showRoundOff: true,
      showTotal: true,
      enableHsnSummary: false,
      enableGstSummary: false,
      enableTaxBreakdown: true
    },
    // Payment / Banking block with QR
    payment: {
      generateQrCode: true,
      enableInstructions: true,
      customNote: 'Please include invoice number in payment.'
    },
    // Amount in words
    amountInWords: { format: 'Indian', enabled: true },
    // Terms & conditions
    terms: {
      presetId: 'default',
      customText: '1. Subject to local jurisdiction.\n2. Goods once sold will not be taken back.'
    },
    // Authorized Signatory on right
    signature: {
      showSignature: true,
      showStamp: false,
      position: 'Right',
      width: 150,
      height: 60,
      signatoryName: 'Authorized Signatory',
      designation: ''
    },
    // Footer with page numbers
    footer: {
      message: 'Thank you for your business!',
      thankYouNote: '',
      supportContact: '',
      website: '',
      showPageNumbers: true,
      showGeneratedBy: true,
      customText: ''
    }
  },
  styleConfig: {
    ...generateBaseTemplate('preset_modal_classic', 'MakInvoices Original', 'Default').styleConfig,
    primaryColor: '#1f2937',
    fontFamily: 'Inter',
    borderStyle: 'Light',
    tableHeaderBackground: '#1f2937',
    tableHeaderTextColor: '#ffffff',
    alternatingRowColors: false,
    roundedCorners: false,
    spacing: 'Compact'
  }
};

export const TEMPLATE_PRESETS: InvoiceTemplate[] = [
  {
    ...generateBaseTemplate('preset_user', 'Personal & Simple', 'User'),
    description: 'A deeply customized, clean layout for personal or custom use. It removes complex shipping or tax details, focusing purely on item descriptions and totals for a clean, simple look.',
    sections: {
      ...generateBaseTemplate('preset_user', 'Personal & Simple', 'User').sections,
      shipTo: { id: 'shipTo', visible: false, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
      transport: { id: 'transport', visible: false, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} },
      taxEngine: { id: 'taxEngine', visible: false, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} }
    },
    config: {
      ...generateBaseTemplate('preset_user', 'Personal & Simple', 'User').config,
      header: { showLogo: true, logoPosition: 'Center', logoWidth: 90, logoHeight: 90, titleAlignment: 'Center', invoiceTitle: 'INVOICE' },
      company: { fields: ['name', 'email'] },
      client: { fields: ['name'] },
      tax: { showTaxableAmount: false, showCgstSgst: false, showIgst: false, showCess: false, showDiscount: false, showRoundOff: false, showTotal: true, enableHsnSummary: false, enableGstSummary: false, enableTaxBreakdown: true },
      table: {
        columns: [
          { id: 'name', visible: true, label: 'Description', type: 'Text', order: 1 },
          { id: 'amount', visible: true, label: 'Total', type: 'Formula', formula: 'qty*rate', order: 2 }
        ]
      }
    },
    styleConfig: {
      ...generateBaseTemplate('preset_user', 'Personal & Simple', 'User').styleConfig,
      primaryColor: '#334155',
      fontFamily: 'Inter',
      borderStyle: 'None',
      tableHeaderBackground: '#e2e8f0',
      tableHeaderTextColor: '#334155',
      alternatingRowColors: false,
      roundedCorners: true,
      spacing: 'Spacious'
    }
  },
  {
    ...generateBaseTemplate('preset_gst', 'GST Exhaustive', 'GST'),
    description: 'Strictly compliant Indian GST layout with full tax breakdown and HSN. This layout provides all required fields for B2B transactions including IGST, CGST, SGST, and transportation details.',
    sections: {
      ...generateBaseTemplate('preset_gst', 'GST Exhaustive', 'GST').sections,
      shipTo: { id: 'shipTo', visible: true, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
      transport: { id: 'transport', visible: true, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} },
      taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} }
    },
    config: {
      ...generateBaseTemplate('preset_gst', 'GST Exhaustive', 'GST').config,
      header: { showLogo: true, logoPosition: 'Left', logoWidth: 120, logoHeight: 60, titleAlignment: 'Right', invoiceTitle: 'TAX INVOICE' },
      company: { fields: ['name', 'address', 'gstin', 'email', 'phone', 'pan'] },
      client: { fields: ['name', 'address', 'gstin'] },
      tax: { showTaxableAmount: true, showCgstSgst: true, showIgst: true, showCess: false, showDiscount: true, showRoundOff: true, showTotal: true, enableHsnSummary: true, enableGstSummary: true, enableTaxBreakdown: true }
    },
    styleConfig: {
      ...generateBaseTemplate('preset_gst', 'GST Exhaustive', 'GST').styleConfig,
      primaryColor: '#ea580c',
      fontFamily: 'Roboto',
      borderStyle: 'Heavy',
      tableHeaderBackground: '#fff7ed',
      tableHeaderTextColor: '#ea580c',
      alternatingRowColors: true,
      roundedCorners: false,
      spacing: 'Compact'
    }
  },
  {
    ...generateBaseTemplate('preset_retail', 'Retail Shop', 'Retail'),
    description: 'Fast, compact layout suitable for retail counters or point of sale. Designed to be printed quickly with minimal shipping and tax overhead, keeping the focus entirely on products.',
    layout: { ...generateBaseTemplate('preset_retail', 'Retail Shop', 'Retail').layout, type: 'Modern' },
    sections: {
      ...generateBaseTemplate('preset_retail', 'Retail Shop', 'Retail').sections,
      shipTo: { id: 'shipTo', visible: false, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
      transport: { id: 'transport', visible: false, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} }
    },
    config: {
      ...generateBaseTemplate('preset_retail', 'Retail Shop', 'Retail').config,
      header: { showLogo: true, logoPosition: 'Left', logoWidth: 100, logoHeight: 50, titleAlignment: 'Right', invoiceTitle: 'TAX INVOICE / BILL' },
      payment: { generateQrCode: true, enableInstructions: false, customNote: 'Scan to pay.' },
      tax: { showTaxableAmount: false, showCgstSgst: true, showIgst: false, showCess: false, showDiscount: false, showRoundOff: true, showTotal: true, enableHsnSummary: false, enableGstSummary: false, enableTaxBreakdown: true },
      table: {
        columns: [
          { id: 'sr', visible: true, label: '#', type: 'Number', order: 1 },
          { id: 'name', visible: true, label: 'Product', type: 'Text', order: 2 },
          { id: 'qty', visible: true, label: 'Qty', type: 'Number', order: 3 },
          { id: 'rate', visible: true, label: 'Price', type: 'Currency', order: 4 },
          { id: 'amount', visible: true, label: 'Total', type: 'Formula', formula: 'qty*rate', order: 5 }
        ]
      }
    },
    styleConfig: {
      ...generateBaseTemplate('preset_retail', 'Retail Shop', 'Retail').styleConfig,
      primaryColor: '#0ea5e9',
      fontFamily: 'Inter',
      borderStyle: 'Light',
      tableHeaderBackground: '#e0f2fe',
      tableHeaderTextColor: '#0284c7',
      spacing: 'Compact'
    }
  },
  {
    ...generateBaseTemplate('preset_corporate', 'Corporate Professional', 'Default'),
    description: 'Traditional, exhaustive corporate layout for compliance and B2B billing. It includes heavy borders and dark table headers, giving a very strict, highly professional corporate impression.',
    sections: {
      ...generateBaseTemplate('preset_corporate', 'Corporate Professional', 'Default').sections,
      shipTo: { id: 'shipTo', visible: true, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
      transport: { id: 'transport', visible: true, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} },
      taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} }
    },
    config: {
      ...generateBaseTemplate('preset_corporate', 'Corporate Professional', 'Default').config,
      header: { showLogo: true, logoPosition: 'Left', logoWidth: 120, logoHeight: 60, titleAlignment: 'Right', invoiceTitle: 'TAX INVOICE' },
      company: { fields: ['name', 'address', 'gstin', 'email', 'phone', 'pan'] },
      client: { fields: ['name', 'address', 'gstin'] },
      tax: { showTaxableAmount: true, showCgstSgst: true, showIgst: true, showCess: false, showDiscount: true, showRoundOff: true, showTotal: true, enableHsnSummary: true, enableGstSummary: false, enableTaxBreakdown: true },
      table: {
        columns: [
          { id: 'sr', visible: true, label: 'Sr No', type: 'Number', order: 1 },
          { id: 'name', visible: true, label: 'Item Name', type: 'Text', order: 2 },
          { id: 'hsn', visible: true, label: 'HSN/SAC', type: 'Text', order: 3 },
          { id: 'qty', visible: true, label: 'Qty', type: 'Number', order: 4 },
          { id: 'rate', visible: true, label: 'Rate', type: 'Currency', order: 5 },
          { id: 'tax', visible: true, label: 'Tax %', type: 'Number', order: 6 },
          { id: 'amount', visible: true, label: 'Amount', type: 'Formula', formula: 'qty*rate', order: 7 }
        ]
      }
    },
    styleConfig: {
      ...generateBaseTemplate('preset_corporate', 'Corporate Professional', 'Default').styleConfig,
      primaryColor: '#1e3a8a',
      fontFamily: 'Roboto',
      borderStyle: 'Heavy',
      roundedCorners: false,
      tableHeaderBackground: '#1e3a8a',
      tableHeaderTextColor: '#ffffff'
    }
  },
  {
    ...generateBaseTemplate('preset_minimalist_tech', 'Minimalist Tech', 'Service'),
    description: 'Ultra-clean, modern layout with tech-forward fonts and no borders. Perfect for digital agencies and freelancers, presenting services in a borderless, wide-spaced minimalist design.',
    layout: { ...generateBaseTemplate('preset_minimalist_tech', 'Minimalist Tech', 'Service').layout, type: 'Minimal' },
    sections: {
      ...generateBaseTemplate('preset_minimalist_tech', 'Minimalist Tech', 'Service').sections,
      shipTo: { id: 'shipTo', visible: false, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
      transport: { id: 'transport', visible: false, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} }
    },
    config: {
      ...generateBaseTemplate('preset_minimalist_tech', 'Minimalist Tech', 'Service').config,
      header: { showLogo: true, logoPosition: 'Left', logoWidth: 80, logoHeight: 40, titleAlignment: 'Right', invoiceTitle: 'INVOICE' },
      table: {
        columns: [
          { id: 'name', visible: true, label: 'Service Description', type: 'Text', order: 1 },
          { id: 'qty', visible: true, label: 'Hours', type: 'Number', order: 2 },
          { id: 'rate', visible: true, label: 'Rate', type: 'Currency', order: 3 },
          { id: 'amount', visible: true, label: 'Amount', type: 'Formula', formula: 'qty*rate', order: 4 }
        ]
      }
    },
    styleConfig: {
      ...generateBaseTemplate('preset_minimalist_tech', 'Minimalist Tech', 'Service').styleConfig,
      primaryColor: '#000000',
      fontFamily: 'Outfit',
      borderStyle: 'None',
      roundedCorners: false,
      tableHeaderBackground: '#ffffff',
      tableHeaderTextColor: '#000000',
      sectionBackgroundColors: {}
    }
  },
  {
    ...generateBaseTemplate('preset_b2b_export', 'B2B Export Invoice', 'GST'),
    description: 'International export invoice with detailed shipping and terms. Includes all necessary fields for cross-border trade, customs compliance, and international banking instructions.',
    layout: { ...generateBaseTemplate('preset_b2b_export', 'B2B Export Invoice', 'GST').layout, type: 'Classic' },
    sections: {
      ...generateBaseTemplate('preset_b2b_export', 'B2B Export Invoice', 'GST').sections,
      shipTo: { id: 'shipTo', visible: true, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
      transport: { id: 'transport', visible: true, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} }
    },
    config: {
      ...generateBaseTemplate('preset_b2b_export', 'B2B Export Invoice', 'GST').config,
      header: { showLogo: true, logoPosition: 'Left', logoWidth: 150, logoHeight: 60, titleAlignment: 'Right', invoiceTitle: 'EXPORT INVOICE' },
      transport: { fields: ['vehicleNo', 'transportName', 'eWayBillNo', 'station'] },
      terms: { presetId: 'default', customText: '1. Export under LUT.\n2. Subject to international trade laws.\n3. Payable in USD.' },
      amountInWords: { format: 'International', enabled: true },
      table: {
        columns: [
          { id: 'sr', visible: true, label: 'Sr', type: 'Number', order: 1 },
          { id: 'name', visible: true, label: 'Product Description', type: 'Text', order: 2 },
          { id: 'hsn', visible: true, label: 'HSN', type: 'Text', order: 3 },
          { id: 'qty', visible: true, label: 'Qty', type: 'Number', order: 4 },
          { id: 'rate', visible: true, label: 'Unit Price', type: 'Currency', order: 5 },
          { id: 'amount', visible: true, label: 'Total Value', type: 'Formula', formula: 'qty*rate', order: 6 }
        ]
      }
    },
    styleConfig: {
      ...generateBaseTemplate('preset_b2b_export', 'B2B Export Invoice', 'GST').styleConfig,
      primaryColor: '#0284c7',
      fontFamily: 'Inter',
      borderStyle: 'Light',
      roundedCorners: false,
      tableHeaderBackground: '#f0f9ff',
      tableHeaderTextColor: '#0284c7'
    }
  },
  {
    ...generateBaseTemplate('preset_medical', 'Medical & Healthcare', 'Retail'),
    description: 'Clean layout tailored for clinics, hospitals, and pharmacies.',
    layout: { ...generateBaseTemplate('preset_medical', 'Medical & Healthcare', 'Retail').layout, type: 'Modern' },
    sections: {
      ...generateBaseTemplate('preset_medical', 'Medical & Healthcare', 'Retail').sections,
      shipTo: { id: 'shipTo', visible: false, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
      transport: { id: 'transport', visible: false, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} }
    },
    config: {
      ...generateBaseTemplate('preset_medical', 'Medical & Healthcare', 'Retail').config,
      header: { showLogo: true, logoPosition: 'Center', logoWidth: 80, logoHeight: 80, titleAlignment: 'Right', invoiceTitle: 'MEDICAL RECEIPT' },
      client: { fields: ['name', 'address', 'phone'] },
      table: {
        columns: [
          { id: 'sr', visible: true, label: '#', type: 'Number', order: 1 },
          { id: 'name', visible: true, label: 'Treatment / Medicine', type: 'Text', order: 2 },
          { id: 'qty', visible: true, label: 'Quantity', type: 'Number', order: 3 },
          { id: 'rate', visible: true, label: 'Cost', type: 'Currency', order: 4 },
          { id: 'amount', visible: true, label: 'Total', type: 'Formula', formula: 'qty*rate', order: 5 }
        ]
      }
    },
    styleConfig: {
      ...generateBaseTemplate('preset_medical', 'Medical & Healthcare', 'Retail').styleConfig,
      primaryColor: '#10b981',
      fontFamily: 'Inter',
      borderStyle: 'Light',
      roundedCorners: true,
      tableHeaderBackground: '#d1fae5',
      tableHeaderTextColor: '#065f46',
      sectionBackgroundColors: { header: '#10b981' }
    }
  },
  {
    ...generateBaseTemplate('preset_barebones', 'Barebones Receipt', 'User'),
    description: 'An extremely minimal receipt layout showing only the absolute essentials.',
    layout: { ...generateBaseTemplate('preset_barebones', 'Barebones Receipt', 'User').layout, type: 'Minimal', margins: 'Compact' },
    sections: {
      ...generateBaseTemplate('preset_barebones', 'Barebones Receipt', 'User').sections,
      billTo: { id: 'billTo', visible: false, order: 4, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
      shipTo: { id: 'shipTo', visible: false, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
      transport: { id: 'transport', visible: false, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} },
      payment: { id: 'payment', visible: false, order: 9, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
      amountInWords: { id: 'amountInWords', visible: false, order: 10, gridColumnSpan: 12, customLabels: {}, customStyles: {} },
      terms: { id: 'terms', visible: false, order: 11, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
      signature: { id: 'signature', visible: false, order: 12, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
      footer: { id: 'footer', visible: false, order: 13, gridColumnSpan: 12, customLabels: {}, customStyles: {} }
    },
    config: {
      ...generateBaseTemplate('preset_barebones', 'Barebones Receipt', 'User').config,
      header: { showLogo: false, logoPosition: 'Left', logoWidth: 100, logoHeight: 50, titleAlignment: 'Center', invoiceTitle: 'RECEIPT' },
      company: { fields: ['name'] },
      invoiceInfo: { fields: ['invoiceNumber'], customFields: [], position: 'Right' },
      tax: { showTaxableAmount: false, showCgstSgst: false, showIgst: false, showCess: false, showDiscount: false, showRoundOff: false, showTotal: true, enableHsnSummary: false, enableGstSummary: false, enableTaxBreakdown: true },
      table: {
        columns: [
          { id: 'name', visible: true, label: 'Item Description', type: 'Text', order: 1 },
          { id: 'qty', visible: true, label: 'Quantity', type: 'Number', order: 2 },
          { id: 'rate', visible: true, label: 'Price', type: 'Currency', order: 3 },
          { id: 'amount', visible: true, label: 'Amount', type: 'Formula', formula: 'qty*rate', order: 4 }
        ]
      }
    },
    styleConfig: {
      ...generateBaseTemplate('preset_barebones', 'Barebones Receipt', 'User').styleConfig,
      primaryColor: '#000000',
      fontFamily: 'Inter',
      borderStyle: 'None',
      roundedCorners: false,
      tableHeaderBackground: '#f8fafc',
      tableHeaderTextColor: '#000000',
      sectionBackgroundColors: {},
      spacing: 'Compact'
    }
  },
  {
    ...generateBaseTemplate('preset_proforma_invoice', 'Proforma Invoice', 'Service'),
    description: 'A formal corporate proforma invoice layout with advance payment instructions, estimated validity dates, and clear terms before final billing.',
    layout: {
      type: 'Corporate',
      pageSize: 'A4',
      orientation: 'Portrait',
      margins: 'Standard',
      watermark: { enabled: false, text: 'PROFORMA', opacity: 0.1, position: 'Center', rotation: -45 }
    },
    sections: {
      ...generateBaseTemplate('preset_proforma_invoice', 'Proforma Invoice', 'Service').sections,
      shipTo:       { id: 'shipTo',       visible: true,  order: 5,    gridColumnSpan: 6,  customLabels: {}, customStyles: {} },
      transport:    { id: 'transport',    visible: true,  order: 6,    gridColumnSpan: 12, customLabels: {}, customStyles: {} },
      taxEngine:    { id: 'taxEngine',    visible: true,  order: 8,    gridColumnSpan: 6,  customLabels: {}, customStyles: {} },
      payment:      { id: 'payment',      visible: true,  order: 9,    gridColumnSpan: 6,  customLabels: {}, customStyles: {} },
      amountInWords:{ id: 'amountInWords',visible: true,  order: 10,   gridColumnSpan: 12, customLabels: {}, customStyles: {} },
      terms:        { id: 'terms',        visible: true,  order: 11,   gridColumnSpan: 6,  customLabels: {}, customStyles: {} },
      signature:    { id: 'signature',    visible: true,  order: 12,   gridColumnSpan: 6,  customLabels: {}, customStyles: {} },
      footer:       { id: 'footer',       visible: true,  order: 13,   gridColumnSpan: 12, customLabels: {}, customStyles: {} },
    },
    config: {
      ...generateBaseTemplate('preset_proforma_invoice', 'Proforma Invoice', 'Service').config,
      header: {
        showLogo: true,
        logoPosition: 'Left',
        logoWidth: 130,
        logoHeight: 60,
        titleAlignment: 'Right',
        invoiceTitle: 'PROFORMA INVOICE'
      },
      payment: {
        generateQrCode: true,
        enableInstructions: true,
        customNote: 'This is a Proforma Invoice for advance payment authorization.'
      },
      terms: {
        presetId: 'default',
        customText: '1. Proforma Invoice valid for 30 days from date of issue.\n2. Dispatch will commence upon receipt of advance payment.'
      }
    },
    styleConfig: {
      ...generateBaseTemplate('preset_proforma_invoice', 'Proforma Invoice', 'Service').styleConfig,
      primaryColor: '#0284c7',
      secondaryColor: '#f0f9ff',
      accentColor: '#0369a1',
      fontFamily: 'Outfit',
      borderStyle: 'Medium',
      roundedCorners: true,
      tableHeaderBackground: '#0284c7',
      tableHeaderTextColor: '#ffffff',
      alternatingRowColors: true,
      spacing: 'Normal'
    }
  },
  {
    ...generateBaseTemplate('preset_quotation', 'Quote / Price Estimate', 'User'),
    description: 'A sleek, modern quotation and price estimate preset with interactive item breakdown, project scope terms, and client approval signature.',
    layout: {
      type: 'Modern',
      pageSize: 'A4',
      orientation: 'Portrait',
      margins: 'Standard',
      watermark: { enabled: false, text: 'ESTIMATE', opacity: 0.1, position: 'Center', rotation: -45 }
    },
    sections: {
      ...generateBaseTemplate('preset_quotation', 'Quote / Price Estimate', 'User').sections,
      shipTo:       { id: 'shipTo',       visible: false, order: 5,    gridColumnSpan: 6,  customLabels: {}, customStyles: {} },
      transport:    { id: 'transport',    visible: false, order: 6,    gridColumnSpan: 12, customLabels: {}, customStyles: {} },
      taxEngine:    { id: 'taxEngine',    visible: true,  order: 8,    gridColumnSpan: 6,  customLabels: {}, customStyles: {} },
      payment:      { id: 'payment',      visible: true,  order: 9,    gridColumnSpan: 6,  customLabels: {}, customStyles: {} },
      amountInWords:{ id: 'amountInWords',visible: true,  order: 10,   gridColumnSpan: 12, customLabels: {}, customStyles: {} },
      terms:        { id: 'terms',        visible: true,  order: 11,   gridColumnSpan: 6,  customLabels: {}, customStyles: {} },
      signature:    { id: 'signature',    visible: true,  order: 12,   gridColumnSpan: 6,  customLabels: {}, customStyles: {} },
      footer:       { id: 'footer',       visible: true,  order: 13,   gridColumnSpan: 12, customLabels: {}, customStyles: {} },
    },
    config: {
      ...generateBaseTemplate('preset_quotation', 'Quote / Price Estimate', 'User').config,
      header: {
        showLogo: true,
        logoPosition: 'Left',
        logoWidth: 120,
        logoHeight: 60,
        titleAlignment: 'Right',
        invoiceTitle: 'QUOTATION / ESTIMATE'
      },
      terms: {
        presetId: 'default',
        customText: '1. Estimate valid for 15 calendar days from issue date.\n2. Prices quoted are subject to final scope confirmation.'
      }
    },
    styleConfig: {
      ...generateBaseTemplate('preset_quotation', 'Quote / Price Estimate', 'User').styleConfig,
      primaryColor: '#7c3aed',
      secondaryColor: '#f5f3ff',
      accentColor: '#10b981',
      fontFamily: 'Inter',
      borderStyle: 'Light',
      roundedCorners: true,
      tableHeaderBackground: '#7c3aed',
      tableHeaderTextColor: '#ffffff',
      alternatingRowColors: true,
      spacing: 'Normal'
    }
  },
  {
    ...generateBaseTemplate('preset_credit_note', 'Credit Note', 'GST'),
    description: 'A distinctive rose-accented credit note layout designed for billing adjustments, goods return credits, and tax adjustments.',
    layout: {
      type: 'GST Standard',
      pageSize: 'A4',
      orientation: 'Portrait',
      margins: 'Standard',
      watermark: { enabled: false, text: 'CREDIT NOTE', opacity: 0.1, position: 'Center', rotation: -45 }
    },
    config: {
      ...generateBaseTemplate('preset_credit_note', 'Credit Note', 'GST').config,
      header: {
        showLogo: true,
        logoPosition: 'Left',
        logoWidth: 120,
        logoHeight: 60,
        titleAlignment: 'Right',
        invoiceTitle: 'CREDIT NOTE'
      }
    },
    styleConfig: {
      ...generateBaseTemplate('preset_credit_note', 'Credit Note', 'GST').styleConfig,
      primaryColor: '#be123c',
      secondaryColor: '#fff1f2',
      accentColor: '#e11d48',
      fontFamily: 'Roboto',
      borderStyle: 'Medium',
      roundedCorners: false,
      tableHeaderBackground: '#be123c',
      tableHeaderTextColor: '#ffffff',
      spacing: 'Normal'
    }
  },
  {
    ...generateBaseTemplate('preset_debit_note', 'Debit Note', 'GST'),
    description: 'An amber-accented debit note preset to issue supplementary charges, price adjustments, or additional billing corrections.',
    layout: {
      type: 'GST Standard',
      pageSize: 'A4',
      orientation: 'Portrait',
      margins: 'Standard',
      watermark: { enabled: false, text: 'DEBIT NOTE', opacity: 0.1, position: 'Center', rotation: -45 }
    },
    config: {
      ...generateBaseTemplate('preset_debit_note', 'Debit Note', 'GST').config,
      header: {
        showLogo: true,
        logoPosition: 'Left',
        logoWidth: 120,
        logoHeight: 60,
        titleAlignment: 'Right',
        invoiceTitle: 'DEBIT NOTE'
      }
    },
    styleConfig: {
      ...generateBaseTemplate('preset_debit_note', 'Debit Note', 'GST').styleConfig,
      primaryColor: '#b45309',
      secondaryColor: '#fffbeb',
      accentColor: '#d97706',
      fontFamily: 'Roboto',
      borderStyle: 'Medium',
      roundedCorners: false,
      tableHeaderBackground: '#b45309',
      tableHeaderTextColor: '#ffffff',
      spacing: 'Normal'
    }
  },
  {
    ...generateBaseTemplate('preset_compact_nano', 'Compact Express Receipt', 'Retail'),
    description: 'Ultra-compact, single-column receipt layout tailored for small retail transactions, quick billing, and low-paper footprint.',
    layout: {
      type: 'Retail',
      pageSize: 'A4',
      orientation: 'Portrait',
      margins: 'Compact',
      watermark: { enabled: false, text: '', opacity: 0.1, position: 'Center', rotation: 0 }
    },
    sections: {
      ...generateBaseTemplate('preset_compact_nano', 'Compact Express Receipt', 'Retail').sections,
      shipTo: { id: 'shipTo', visible: false, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
      transport: { id: 'transport', visible: false, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} },
      taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} }
    },
    config: {
      ...generateBaseTemplate('preset_compact_nano', 'Compact Express Receipt', 'Retail').config,
      header: { showLogo: true, logoPosition: 'Left', logoWidth: 80, logoHeight: 40, titleAlignment: 'Right', invoiceTitle: 'CASH RECEIPT' },
      company: { fields: ['name', 'phone', 'address'] },
      client: { fields: ['name', 'phone'] },
      tax: { showTaxableAmount: true, showCgstSgst: true, showIgst: false, showCess: false, showDiscount: true, showRoundOff: true, showTotal: true, enableHsnSummary: false, enableGstSummary: false, enableTaxBreakdown: false }
    },
    styleConfig: {
      ...generateBaseTemplate('preset_compact_nano', 'Compact Express Receipt', 'Retail').styleConfig,
      primaryColor: '#1e293b',
      secondaryColor: '#f8fafc',
      accentColor: '#475569',
      fontFamily: 'Inter',
      borderStyle: 'Light',
      tableHeaderBackground: '#e2e8f0',
      tableHeaderTextColor: '#0f172a',
      alternatingRowColors: false,
      roundedCorners: true,
      spacing: 'Compact'
    }
  },
  {
    ...generateBaseTemplate('preset_detailed_enterprise_b2b', 'Detailed Enterprise B2B', 'GST'),
    description: 'Exhaustive multi-section B2B invoice with full tax engine, HSN summary, payment QR code, transport details, and legal compliance signatures.',
    layout: {
      type: 'Corporate',
      pageSize: 'A4',
      orientation: 'Portrait',
      margins: 'Standard',
      watermark: { enabled: false, text: 'ORIGINAL', opacity: 0.08, position: 'Center', rotation: -30 }
    },
    sections: {
      ...generateBaseTemplate('preset_detailed_enterprise_b2b', 'Detailed Enterprise B2B', 'GST').sections,
      shipTo:       { id: 'shipTo',       visible: true,  order: 5,    gridColumnSpan: 6,  customLabels: {}, customStyles: {} },
      transport:    { id: 'transport',    visible: true,  order: 6,    gridColumnSpan: 12, customLabels: {}, customStyles: {} },
      taxEngine:    { id: 'taxEngine',    visible: true,  order: 8,    gridColumnSpan: 6,  customLabels: {}, customStyles: {} },
      payment:      { id: 'payment',      visible: true,  order: 9,    gridColumnSpan: 6,  customLabels: {}, customStyles: {} },
      amountInWords:{ id: 'amountInWords',visible: true,  order: 10,   gridColumnSpan: 12, customLabels: {}, customStyles: {} },
      terms:        { id: 'terms',        visible: true,  order: 11,   gridColumnSpan: 6,  customLabels: {}, customStyles: {} },
      signature:    { id: 'signature',    visible: true,  order: 12,   gridColumnSpan: 6,  customLabels: {}, customStyles: {} },
      footer:       { id: 'footer',       visible: true,  order: 13,   gridColumnSpan: 12, customLabels: {}, customStyles: {} },
    },
    config: {
      ...generateBaseTemplate('preset_detailed_enterprise_b2b', 'Detailed Enterprise B2B', 'GST').config,
      header: { showLogo: true, logoPosition: 'Left', logoWidth: 140, logoHeight: 65, titleAlignment: 'Right', invoiceTitle: 'TAX INVOICE' },
      company: { fields: ['name', 'owner', 'email', 'phone', 'address', 'state', 'country', 'gstin', 'pan', 'website'] },
      client: { fields: ['name', 'phone', 'country', 'state', 'address', 'gstin'] },
      shipping: { fields: ['name', 'phone', 'country', 'state', 'address', 'gstin'], sameAsBilling: false },
      transport: { fields: ['vehicleNo', 'driverMobile', 'ewayBillNo'] },
      tax: { showTaxableAmount: true, showCgstSgst: true, showIgst: true, showCess: true, showDiscount: true, showRoundOff: true, showTotal: true, enableHsnSummary: true, enableGstSummary: true, enableTaxBreakdown: true },
      payment: { generateQrCode: true, enableInstructions: true, customNote: 'Official B2B Invoice. Wire transfer details provided.' }
    },
    styleConfig: {
      ...generateBaseTemplate('preset_detailed_enterprise_b2b', 'Detailed Enterprise B2B', 'GST').styleConfig,
      primaryColor: '#0f172a',
      secondaryColor: '#f1f5f9',
      accentColor: '#2563eb',
      fontFamily: 'Roboto',
      borderStyle: 'Heavy',
      tableHeaderBackground: '#0f172a',
      tableHeaderTextColor: '#ffffff',
      alternatingRowColors: true,
      roundedCorners: false,
      spacing: 'Normal'
    }
  },
  {
    ...generateBaseTemplate('preset_executive_consulting', 'Executive Advisory & Consulting', 'Service'),
    description: 'Sophisticated, high-end service agreement layout tailored for consultancy, legal practices, and executive advisory firms.',
    layout: {
      type: 'Modern',
      pageSize: 'A4',
      orientation: 'Portrait',
      margins: 'Standard',
      watermark: { enabled: false, text: '', opacity: 0.1, position: 'Center', rotation: 0 }
    },
    sections: {
      ...generateBaseTemplate('preset_executive_consulting', 'Executive Advisory & Consulting', 'Service').sections,
      shipTo: { id: 'shipTo', visible: false, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
      transport: { id: 'transport', visible: false, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} },
      taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} }
    },
    config: {
      ...generateBaseTemplate('preset_executive_consulting', 'Executive Advisory & Consulting', 'Service').config,
      header: { showLogo: true, logoPosition: 'Left', logoWidth: 125, logoHeight: 55, titleAlignment: 'Right', invoiceTitle: 'CONSULTING INVOICE' },
      terms: { presetId: 'default', customText: '1. Retainer & Milestone fees payable within 15 days of invoice date.\n2. Confidentiality & Non-Disclosure agreements apply.' }
    },
    styleConfig: {
      ...generateBaseTemplate('preset_executive_consulting', 'Executive Advisory & Consulting', 'Service').styleConfig,
      primaryColor: '#064e3b',
      secondaryColor: '#f0fdf4',
      accentColor: '#059669',
      fontFamily: 'Outfit',
      borderStyle: 'Light',
      tableHeaderBackground: '#064e3b',
      tableHeaderTextColor: '#ffffff',
      alternatingRowColors: true,
      roundedCorners: true,
      spacing: 'Normal'
    }
  },
  {
    ...generateBaseTemplate('preset_detailed_manufacturing_dispatch', 'Detailed Logistics & Dispatch', 'GST'),
    description: 'Heavy industrial dispatch template with detailed vehicle numbers, e-way bill IDs, driver mobile contacts, and complete GST breakdown.',
    layout: {
      type: 'GST Standard',
      pageSize: 'A4',
      orientation: 'Portrait',
      margins: 'Standard',
      watermark: { enabled: false, text: 'DISPATCH', opacity: 0.1, position: 'Center', rotation: -45 }
    },
    sections: {
      ...generateBaseTemplate('preset_detailed_manufacturing_dispatch', 'Detailed Logistics & Dispatch', 'GST').sections,
      shipTo:       { id: 'shipTo',       visible: true,  order: 5,    gridColumnSpan: 6,  customLabels: {}, customStyles: {} },
      transport:    { id: 'transport',    visible: true,  order: 6,    gridColumnSpan: 12, customLabels: {}, customStyles: {} },
      taxEngine:    { id: 'taxEngine',    visible: true,  order: 8,    gridColumnSpan: 6,  customLabels: {}, customStyles: {} },
      payment:      { id: 'payment',      visible: true,  order: 9,    gridColumnSpan: 6,  customLabels: {}, customStyles: {} },
      amountInWords:{ id: 'amountInWords',visible: true,  order: 10,   gridColumnSpan: 12, customLabels: {}, customStyles: {} },
      terms:        { id: 'terms',        visible: true,  order: 11,   gridColumnSpan: 6,  customLabels: {}, customStyles: {} },
      signature:    { id: 'signature',    visible: true,  order: 12,   gridColumnSpan: 6,  customLabels: {}, customStyles: {} },
      footer:       { id: 'footer',       visible: true,  order: 13,   gridColumnSpan: 12, customLabels: {}, customStyles: {} },
    },
    config: {
      ...generateBaseTemplate('preset_detailed_manufacturing_dispatch', 'Detailed Logistics & Dispatch', 'GST').config,
      header: { showLogo: true, logoPosition: 'Left', logoWidth: 110, logoHeight: 50, titleAlignment: 'Right', invoiceTitle: 'DELIVERY CHALLAN & INVOICE' }
    },
    styleConfig: {
      ...generateBaseTemplate('preset_detailed_manufacturing_dispatch', 'Detailed Logistics & Dispatch', 'GST').styleConfig,
      primaryColor: '#292524',
      secondaryColor: '#fafaf9',
      accentColor: '#78716c',
      fontFamily: 'Roboto',
      borderStyle: 'Medium',
      tableHeaderBackground: '#292524',
      tableHeaderTextColor: '#ffffff',
      alternatingRowColors: true,
      roundedCorners: false,
      spacing: 'Normal'
    }
  },
  {
    ...generateBaseTemplate('preset_compact_agency', 'Studio & Creative Agency', 'User'),
    description: 'Clean, minimalist agency invoice layout with prominent brand logo, elegant typography, and streamlined item totals.',
    layout: {
      type: 'Minimal',
      pageSize: 'A4',
      orientation: 'Portrait',
      margins: 'Standard',
      watermark: { enabled: false, text: '', opacity: 0.1, position: 'Center', rotation: 0 }
    },
    sections: {
      ...generateBaseTemplate('preset_compact_agency', 'Studio & Creative Agency', 'User').sections,
      shipTo: { id: 'shipTo', visible: false, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
      transport: { id: 'transport', visible: false, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} },
      taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} }
    },
    config: {
      ...generateBaseTemplate('preset_compact_agency', 'Studio & Creative Agency', 'User').config,
      header: { showLogo: true, logoPosition: 'Left', logoWidth: 130, logoHeight: 60, titleAlignment: 'Right', invoiceTitle: 'CREATIVE INVOICE' }
    },
    styleConfig: {
      ...generateBaseTemplate('preset_compact_agency', 'Studio & Creative Agency', 'User').styleConfig,
      primaryColor: '#3730a3',
      secondaryColor: '#e0e7ff',
      accentColor: '#4f46e5',
      fontFamily: 'Outfit',
      borderStyle: 'None',
      tableHeaderBackground: '#e0e7ff',
      tableHeaderTextColor: '#3730a3',
      alternatingRowColors: false,
      roundedCorners: true,
      spacing: 'Normal'
    }
  },
  {
    ...generateBaseTemplate('preset_it_saas_subscription', 'SaaS & Cloud Subscription', 'Service'),
    description: 'Modern subscription billing layout designed for SaaS platforms, cloud software, and digital recurring services.',
    layout: {
      type: 'Modern',
      pageSize: 'A4',
      orientation: 'Portrait',
      margins: 'Standard',
      watermark: { enabled: false, text: '', opacity: 0.1, position: 'Center', rotation: 0 }
    },
    sections: {
      ...generateBaseTemplate('preset_it_saas_subscription', 'SaaS & Cloud Subscription', 'Service').sections,
      shipTo: { id: 'shipTo', visible: false, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
      transport: { id: 'transport', visible: false, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} },
      taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} }
    },
    config: {
      ...generateBaseTemplate('preset_it_saas_subscription', 'SaaS & Cloud Subscription', 'Service').config,
      header: { showLogo: true, logoPosition: 'Left', logoWidth: 130, logoHeight: 55, titleAlignment: 'Right', invoiceTitle: 'SUBSCRIPTION INVOICE' },
      terms: { presetId: 'default', customText: '1. Monthly recurring subscription billed in advance.\n2. Automatic renewal unless cancelled 7 days prior to cycle.' }
    },
    styleConfig: {
      ...generateBaseTemplate('preset_it_saas_subscription', 'SaaS & Cloud Subscription', 'Service').styleConfig,
      primaryColor: '#4f46e5',
      secondaryColor: '#e0e7ff',
      accentColor: '#6366f1',
      fontFamily: 'Inter',
      borderStyle: 'Light',
      tableHeaderBackground: '#4f46e5',
      tableHeaderTextColor: '#ffffff',
      alternatingRowColors: true,
      roundedCorners: true,
      spacing: 'Normal'
    }
  },
  {
    ...generateBaseTemplate('preset_construction_milestone', 'Construction & Infrastructure', 'GST'),
    description: 'Heavy-duty milestone billing invoice layout for construction contractors, civil engineering, and infrastructure projects.',
    layout: {
      type: 'GST Standard',
      pageSize: 'A4',
      orientation: 'Portrait',
      margins: 'Standard',
      watermark: { enabled: false, text: 'MILESTONE', opacity: 0.08, position: 'Center', rotation: -30 }
    },
    sections: {
      ...generateBaseTemplate('preset_construction_milestone', 'Construction & Infrastructure', 'GST').sections,
      shipTo:       { id: 'shipTo',       visible: true,  order: 5,    gridColumnSpan: 6,  customLabels: {}, customStyles: {} },
      transport:    { id: 'transport',    visible: true,  order: 6,    gridColumnSpan: 12, customLabels: {}, customStyles: {} },
      taxEngine:    { id: 'taxEngine',    visible: true,  order: 8,    gridColumnSpan: 6,  customLabels: {}, customStyles: {} },
      payment:      { id: 'payment',      visible: true,  order: 9,    gridColumnSpan: 6,  customLabels: {}, customStyles: {} },
      amountInWords:{ id: 'amountInWords',visible: true,  order: 10,   gridColumnSpan: 12, customLabels: {}, customStyles: {} },
      terms:        { id: 'terms',        visible: true,  order: 11,   gridColumnSpan: 6,  customLabels: {}, customStyles: {} },
      signature:    { id: 'signature',    visible: true,  order: 12,   gridColumnSpan: 6,  customLabels: {}, customStyles: {} },
      footer:       { id: 'footer',       visible: true,  order: 13,   gridColumnSpan: 12, customLabels: {}, customStyles: {} },
    },
    config: {
      ...generateBaseTemplate('preset_construction_milestone', 'Construction & Infrastructure', 'GST').config,
      header: { showLogo: true, logoPosition: 'Left', logoWidth: 120, logoHeight: 50, titleAlignment: 'Right', invoiceTitle: 'PROJECT MILESTONE BILL' },
      terms: { presetId: 'default', customText: '1. Retention money will be released post completion audit.\n2. Payment terms 30 days from RA bill verification.' }
    },
    styleConfig: {
      ...generateBaseTemplate('preset_construction_milestone', 'Construction & Infrastructure', 'GST').styleConfig,
      primaryColor: '#c2410c',
      secondaryColor: '#ffedd5',
      accentColor: '#ea580c',
      fontFamily: 'Roboto',
      borderStyle: 'Heavy',
      tableHeaderBackground: '#c2410c',
      tableHeaderTextColor: '#ffffff',
      alternatingRowColors: true,
      roundedCorners: false,
      spacing: 'Normal'
    }
  },
  {
    ...generateBaseTemplate('preset_legal_advocate', 'Legal Chambers & Retainer Fee', 'Service'),
    description: 'Formal, authoritative legal fee statement for law firms, advocate chambers, and corporate legal advisors.',
    layout: {
      type: 'Classic',
      pageSize: 'A4',
      orientation: 'Portrait',
      margins: 'Standard',
      watermark: { enabled: false, text: '', opacity: 0.1, position: 'Center', rotation: 0 }
    },
    sections: {
      ...generateBaseTemplate('preset_legal_advocate', 'Legal Chambers & Retainer Fee', 'Service').sections,
      shipTo: { id: 'shipTo', visible: false, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
      transport: { id: 'transport', visible: false, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} },
      taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} }
    },
    config: {
      ...generateBaseTemplate('preset_legal_advocate', 'Legal Chambers & Retainer Fee', 'Service').config,
      header: { showLogo: true, logoPosition: 'Left', logoWidth: 100, logoHeight: 50, titleAlignment: 'Right', invoiceTitle: 'FEE STATEMENT' },
      terms: { presetId: 'default', customText: '1. Professional legal fees payable upon statement receipt.\n2. Court fees and disbursements billed at actuals.' }
    },
    styleConfig: {
      ...generateBaseTemplate('preset_legal_advocate', 'Legal Chambers & Retainer Fee', 'Service').styleConfig,
      primaryColor: '#15803d',
      secondaryColor: '#f0fdf4',
      accentColor: '#16a34a',
      fontFamily: 'Outfit',
      borderStyle: 'Medium',
      tableHeaderBackground: '#15803d',
      tableHeaderTextColor: '#ffffff',
      alternatingRowColors: false,
      roundedCorners: false,
      spacing: 'Normal'
    }
  },
  {
    ...generateBaseTemplate('preset_ecommerce_shipping', 'E-Commerce & Courier Dispatch', 'Retail'),
    description: 'E-commerce packing slip and invoice combo featuring barcoded tracking, courier dispatch IDs, and return policies.',
    layout: {
      type: 'Retail',
      pageSize: 'A4',
      orientation: 'Portrait',
      margins: 'Compact',
      watermark: { enabled: false, text: '', opacity: 0.1, position: 'Center', rotation: 0 }
    },
    sections: {
      ...generateBaseTemplate('preset_ecommerce_shipping', 'E-Commerce & Courier Dispatch', 'Retail').sections,
      shipTo: { id: 'shipTo', visible: true, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
      transport: { id: 'transport', visible: true, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} },
      taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} }
    },
    config: {
      ...generateBaseTemplate('preset_ecommerce_shipping', 'E-Commerce & Courier Dispatch', 'Retail').config,
      header: { showLogo: true, logoPosition: 'Left', logoWidth: 110, logoHeight: 45, titleAlignment: 'Right', invoiceTitle: 'DISPATCH PACKING SLIP' }
    },
    styleConfig: {
      ...generateBaseTemplate('preset_ecommerce_shipping', 'E-Commerce & Courier Dispatch', 'Retail').styleConfig,
      primaryColor: '#0284c7',
      secondaryColor: '#f0f9ff',
      accentColor: '#0369a1',
      fontFamily: 'Roboto',
      borderStyle: 'Light',
      tableHeaderBackground: '#0284c7',
      tableHeaderTextColor: '#ffffff',
      alternatingRowColors: true,
      roundedCorners: true,
      spacing: 'Compact'
    }
  },
  {
    ...generateBaseTemplate('preset_medical_diagnostic', 'Healthcare & Diagnostic Lab', 'Service'),
    description: 'Clean healthcare invoice with patient ID, doctor reference, lab report numbers, and health insurance claim notes.',
    layout: {
      type: 'Modern',
      pageSize: 'A4',
      orientation: 'Portrait',
      margins: 'Standard',
      watermark: { enabled: false, text: '', opacity: 0.1, position: 'Center', rotation: 0 }
    },
    sections: {
      ...generateBaseTemplate('preset_medical_diagnostic', 'Healthcare & Diagnostic Lab', 'Service').sections,
      shipTo: { id: 'shipTo', visible: false, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
      transport: { id: 'transport', visible: false, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} },
      taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} }
    },
    config: {
      ...generateBaseTemplate('preset_medical_diagnostic', 'Healthcare & Diagnostic Lab', 'Service').config,
      header: { showLogo: true, logoPosition: 'Left', logoWidth: 120, logoHeight: 50, titleAlignment: 'Right', invoiceTitle: 'MEDICAL BILL & RECEIPT' },
      terms: { presetId: 'default', customText: '1. Valid for medical insurance reimbursement.\n2. Please retain for tax deduction under Section 80D.' }
    },
    styleConfig: {
      ...generateBaseTemplate('preset_medical_diagnostic', 'Healthcare & Diagnostic Lab', 'Service').styleConfig,
      primaryColor: '#0d9488',
      secondaryColor: '#ccfbf1',
      accentColor: '#14b8a6',
      fontFamily: 'Inter',
      borderStyle: 'Light',
      tableHeaderBackground: '#0d9488',
      tableHeaderTextColor: '#ffffff',
      alternatingRowColors: true,
      roundedCorners: true,
      spacing: 'Normal'
    }
  },
  {
    ...generateBaseTemplate('preset_automotive_repair', 'Automotive & Garage Workshop', 'Service'),
    description: 'Specialized automotive repair and service station invoice layout with spare parts breakdown and labor charges.',
    layout: { type: 'Classic', pageSize: 'A4', orientation: 'Portrait', margins: 'Standard', watermark: { enabled: false, text: '', opacity: 0.1, position: 'Center', rotation: 0 } },
    sections: { ...generateBaseTemplate('preset_automotive_repair', 'Automotive & Garage Workshop', 'Service').sections, shipTo: { id: 'shipTo', visible: false, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} }, transport: { id: 'transport', visible: false, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} }, taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} } },
    config: { ...generateBaseTemplate('preset_automotive_repair', 'Automotive & Garage Workshop', 'Service').config, header: { showLogo: true, logoPosition: 'Left', logoWidth: 120, logoHeight: 50, titleAlignment: 'Right', invoiceTitle: 'AUTOMOTIVE WORKSHOP BILL' }, terms: { presetId: 'default', customText: '1. 30-day warranty on genuine spare parts replacement.\n2. Vehicles delivered post full settlement of invoice.' } },
    styleConfig: { ...generateBaseTemplate('preset_automotive_repair', 'Automotive & Garage Workshop', 'Service').styleConfig, primaryColor: '#374151', secondaryColor: '#f3f4f6', accentColor: '#4b5563', fontFamily: 'Roboto', borderStyle: 'Medium', tableHeaderBackground: '#374151', tableHeaderTextColor: '#ffffff', alternatingRowColors: true, roundedCorners: false, spacing: 'Normal' }
  },
  {
    ...generateBaseTemplate('preset_real_estate_lease', 'Real Estate & Property Management', 'Service'),
    description: 'Elegant commercial property lease & maintenance fee invoice layout tailored for real estate developers and landlords.',
    layout: { type: 'Modern', pageSize: 'A4', orientation: 'Portrait', margins: 'Standard', watermark: { enabled: false, text: '', opacity: 0.1, position: 'Center', rotation: 0 } },
    sections: { ...generateBaseTemplate('preset_real_estate_lease', 'Real Estate & Property Management', 'Service').sections, shipTo: { id: 'shipTo', visible: false, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} }, transport: { id: 'transport', visible: false, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} }, taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} } },
    config: { ...generateBaseTemplate('preset_real_estate_lease', 'Real Estate & Property Management', 'Service').config, header: { showLogo: true, logoPosition: 'Left', logoWidth: 125, logoHeight: 55, titleAlignment: 'Right', invoiceTitle: 'RENTAL & LEASE BILL' }, terms: { presetId: 'default', customText: '1. Monthly rent payable by 5th of each calendar month.\n2. Late payment surcharge of 1.5% per month applies.' } },
    styleConfig: { ...generateBaseTemplate('preset_real_estate_lease', 'Real Estate & Property Management', 'Service').styleConfig, primaryColor: '#b45309', secondaryColor: '#fffbeb', accentColor: '#d97706', fontFamily: 'Outfit', borderStyle: 'Light', tableHeaderBackground: '#b45309', tableHeaderTextColor: '#ffffff', alternatingRowColors: true, roundedCorners: true, spacing: 'Normal' }
  },
  {
    ...generateBaseTemplate('preset_education_tuition', 'Education & Coaching Academy', 'User'),
    description: 'Clean academic fee invoice for schools, coaching institutes, universities, and online learning platforms.',
    layout: { type: 'Minimal', pageSize: 'A4', orientation: 'Portrait', margins: 'Standard', watermark: { enabled: false, text: '', opacity: 0.1, position: 'Center', rotation: 0 } },
    sections: { ...generateBaseTemplate('preset_education_tuition', 'Education & Coaching Academy', 'User').sections, shipTo: { id: 'shipTo', visible: false, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} }, transport: { id: 'transport', visible: false, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} }, taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} } },
    config: { ...generateBaseTemplate('preset_education_tuition', 'Education & Coaching Academy', 'User').config, header: { showLogo: true, logoPosition: 'Left', logoWidth: 110, logoHeight: 50, titleAlignment: 'Right', invoiceTitle: 'TUITION FEE RECEIPT' }, terms: { presetId: 'default', customText: '1. Tuition fees once paid are non-refundable.\n2. Please retain this receipt for annual tax verification.' } },
    styleConfig: { ...generateBaseTemplate('preset_education_tuition', 'Education & Coaching Academy', 'User').styleConfig, primaryColor: '#1d4ed8', secondaryColor: '#dbeafe', accentColor: '#2563eb', fontFamily: 'Inter', borderStyle: 'None', tableHeaderBackground: '#dbeafe', tableHeaderTextColor: '#1e40af', alternatingRowColors: false, roundedCorners: true, spacing: 'Normal' }
  },
  {
    ...generateBaseTemplate('preset_hospitality_hotel', 'Hotel & Resort Hospitality', 'Service'),
    description: 'Luxurious hotel room folio and guest checkout bill layout with room service and amenity charges.',
    layout: { type: 'Corporate', pageSize: 'A4', orientation: 'Portrait', margins: 'Standard', watermark: { enabled: false, text: '', opacity: 0.1, position: 'Center', rotation: 0 } },
    sections: { ...generateBaseTemplate('preset_hospitality_hotel', 'Hotel & Resort Hospitality', 'Service').sections, shipTo: { id: 'shipTo', visible: false, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} }, transport: { id: 'transport', visible: false, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} }, taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} } },
    config: { ...generateBaseTemplate('preset_hospitality_hotel', 'Hotel & Resort Hospitality', 'Service').config, header: { showLogo: true, logoPosition: 'Left', logoWidth: 140, logoHeight: 60, titleAlignment: 'Right', invoiceTitle: 'GUEST ROOM FOLIO' }, terms: { presetId: 'default', customText: '1. Checkout time 11:00 AM.\n2. Room tariff includes applicable luxury tax and GST.' } },
    styleConfig: { ...generateBaseTemplate('preset_hospitality_hotel', 'Hotel & Resort Hospitality', 'Service').styleConfig, primaryColor: '#854d0e', secondaryColor: '#fef3c7', accentColor: '#a16207', fontFamily: 'Outfit', borderStyle: 'Light', tableHeaderBackground: '#854d0e', tableHeaderTextColor: '#ffffff', alternatingRowColors: true, roundedCorners: true, spacing: 'Normal' }
  },
  {
    ...generateBaseTemplate('preset_event_wedding', 'Event Management & Catering', 'Service'),
    description: 'Vibrant event planning, wedding management, and catering milestone billing template.',
    layout: { type: 'Modern', pageSize: 'A4', orientation: 'Portrait', margins: 'Standard', watermark: { enabled: false, text: '', opacity: 0.1, position: 'Center', rotation: 0 } },
    sections: { ...generateBaseTemplate('preset_event_wedding', 'Event Management & Catering', 'Service').sections, shipTo: { id: 'shipTo', visible: false, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} }, transport: { id: 'transport', visible: false, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} }, taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} } },
    config: { ...generateBaseTemplate('preset_event_wedding', 'Event Management & Catering', 'Service').config, header: { showLogo: true, logoPosition: 'Left', logoWidth: 120, logoHeight: 50, titleAlignment: 'Right', invoiceTitle: 'EVENT SERVICES BILL' }, terms: { presetId: 'default', customText: '1. 50% advance booking deposit required.\n2. Balance settlement due 48 hours prior to event commencement.' } },
    styleConfig: { ...generateBaseTemplate('preset_event_wedding', 'Event Management & Catering', 'Service').styleConfig, primaryColor: '#be123c', secondaryColor: '#ffe4e6', accentColor: '#e11d48', fontFamily: 'Inter', borderStyle: 'Light', tableHeaderBackground: '#be123c', tableHeaderTextColor: '#ffffff', alternatingRowColors: true, roundedCorners: true, spacing: 'Normal' }
  },
  {
    ...generateBaseTemplate('preset_freight_logistics_b2b', 'Third-Party Logistics (3PL)', 'GST'),
    description: 'High-density 3PL logistics invoice with consignment notes, container IDs, and transit insurance details.',
    layout: { type: 'GST Standard', pageSize: 'A4', orientation: 'Portrait', margins: 'Standard', watermark: { enabled: false, text: 'LOGISTICS', opacity: 0.08, position: 'Center', rotation: -30 } },
    sections: { ...generateBaseTemplate('preset_freight_logistics_b2b', 'Third-Party Logistics (3PL)', 'GST').sections, shipTo: { id: 'shipTo', visible: true, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} }, transport: { id: 'transport', visible: true, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} }, taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} } },
    config: { ...generateBaseTemplate('preset_freight_logistics_b2b', 'Third-Party Logistics (3PL)', 'GST').config, header: { showLogo: true, logoPosition: 'Left', logoWidth: 130, logoHeight: 55, titleAlignment: 'Right', invoiceTitle: 'FREIGHT & LOGISTICS BILL' } },
    styleConfig: { ...generateBaseTemplate('preset_freight_logistics_b2b', 'Third-Party Logistics (3PL)', 'GST').styleConfig, primaryColor: '#1e293b', secondaryColor: '#f8fafc', accentColor: '#3b82f6', fontFamily: 'Roboto', borderStyle: 'Heavy', tableHeaderBackground: '#1e293b', tableHeaderTextColor: '#ffffff', alternatingRowColors: true, roundedCorners: false, spacing: 'Normal' }
  },
  {
    ...generateBaseTemplate('preset_solar_renewable', 'Solar Energy & Green Tech', 'GST'),
    description: 'Clean energy installation and solar EPC project billing invoice with net metering details.',
    layout: { type: 'GST Standard', pageSize: 'A4', orientation: 'Portrait', margins: 'Standard', watermark: { enabled: false, text: '', opacity: 0.1, position: 'Center', rotation: 0 } },
    sections: { ...generateBaseTemplate('preset_solar_renewable', 'Solar Energy & Green Tech', 'GST').sections, shipTo: { id: 'shipTo', visible: true, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} }, transport: { id: 'transport', visible: true, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} }, taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} } },
    config: { ...generateBaseTemplate('preset_solar_renewable', 'Solar Energy & Green Tech', 'GST').config, header: { showLogo: true, logoPosition: 'Left', logoWidth: 120, logoHeight: 50, titleAlignment: 'Right', invoiceTitle: 'SOLAR EPC INVOICE' }, terms: { presetId: 'default', customText: '1. 5-year comprehensive solar inverter warranty included.\n2. Subsidy approval subject to DISCOM inspection.' } },
    styleConfig: { ...generateBaseTemplate('preset_solar_renewable', 'Solar Energy & Green Tech', 'GST').styleConfig, primaryColor: '#047857', secondaryColor: '#d1fae5', accentColor: '#10b981', fontFamily: 'Inter', borderStyle: 'Medium', tableHeaderBackground: '#047857', tableHeaderTextColor: '#ffffff', alternatingRowColors: true, roundedCorners: true, spacing: 'Normal' }
  },
  {
    ...generateBaseTemplate('preset_architecture_blueprint', 'Architectural & Interior Studio', 'Service'),
    description: 'Sophisticated architectural blueprint fee invoice tailored for interior designers and spatial planners.',
    layout: { type: 'Modern', pageSize: 'A4', orientation: 'Portrait', margins: 'Standard', watermark: { enabled: false, text: '', opacity: 0.1, position: 'Center', rotation: 0 } },
    sections: { ...generateBaseTemplate('preset_architecture_blueprint', 'Architectural & Interior Studio', 'Service').sections, shipTo: { id: 'shipTo', visible: false, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} }, transport: { id: 'transport', visible: false, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} }, taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} } },
    config: { ...generateBaseTemplate('preset_architecture_blueprint', 'Architectural & Interior Studio', 'Service').config, header: { showLogo: true, logoPosition: 'Left', logoWidth: 130, logoHeight: 60, titleAlignment: 'Right', invoiceTitle: 'ARCHITECTURAL FEE BILL' } },
    styleConfig: { ...generateBaseTemplate('preset_architecture_blueprint', 'Architectural & Interior Studio', 'Service').styleConfig, primaryColor: '#18181b', secondaryColor: '#f4f4f5', accentColor: '#27272a', fontFamily: 'Outfit', borderStyle: 'Light', tableHeaderBackground: '#18181b', tableHeaderTextColor: '#ffffff', alternatingRowColors: false, roundedCorners: true, spacing: 'Normal' }
  },
  {
    ...generateBaseTemplate('preset_pharmaceutical_wholesale', 'Pharma Wholesale & Biotech', 'GST'),
    description: 'Strictly compliant pharmaceutical wholesale invoice with batch numbers, expiry dates, and drug license IDs.',
    layout: { type: 'GST Standard', pageSize: 'A4', orientation: 'Portrait', margins: 'Standard', watermark: { enabled: false, text: 'PHARMA', opacity: 0.08, position: 'Center', rotation: -30 } },
    sections: { ...generateBaseTemplate('preset_pharmaceutical_wholesale', 'Pharma Wholesale & Biotech', 'GST').sections, shipTo: { id: 'shipTo', visible: true, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} }, transport: { id: 'transport', visible: true, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} }, taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} } },
    config: { ...generateBaseTemplate('preset_pharmaceutical_wholesale', 'Pharma Wholesale & Biotech', 'GST').config, header: { showLogo: true, logoPosition: 'Left', logoWidth: 120, logoHeight: 50, titleAlignment: 'Right', invoiceTitle: 'PHARMACEUTICAL INVOICE' }, terms: { presetId: 'default', customText: '1. Goods sold against valid Drug License only.\n2. Store below 25°C in cool and dry place.' } },
    styleConfig: { ...generateBaseTemplate('preset_pharmaceutical_wholesale', 'Pharma Wholesale & Biotech', 'GST').styleConfig, primaryColor: '#0e7490', secondaryColor: '#cffaff', accentColor: '#06b6d4', fontFamily: 'Roboto', borderStyle: 'Medium', tableHeaderBackground: '#0e7490', tableHeaderTextColor: '#ffffff', alternatingRowColors: true, roundedCorners: false, spacing: 'Normal' }
  },
  {
    ...generateBaseTemplate('preset_fitness_gym_membership', 'Fitness Center & Training', 'User'),
    description: 'High-energy fitness club, gym membership, and personal training package bill layout.',
    layout: { type: 'Minimal', pageSize: 'A4', orientation: 'Portrait', margins: 'Standard', watermark: { enabled: false, text: '', opacity: 0.1, position: 'Center', rotation: 0 } },
    sections: { ...generateBaseTemplate('preset_fitness_gym_membership', 'Fitness Center & Training', 'User').sections, shipTo: { id: 'shipTo', visible: false, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} }, transport: { id: 'transport', visible: false, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} }, taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} } },
    config: { ...generateBaseTemplate('preset_fitness_gym_membership', 'Fitness Center & Training', 'User').config, header: { showLogo: true, logoPosition: 'Left', logoWidth: 110, logoHeight: 45, titleAlignment: 'Right', invoiceTitle: 'MEMBERSHIP RECEIPT' } },
    styleConfig: { ...generateBaseTemplate('preset_fitness_gym_membership', 'Fitness Center & Training', 'User').styleConfig, primaryColor: '#b91c1c', secondaryColor: '#fee2e2', accentColor: '#dc2626', fontFamily: 'Inter', borderStyle: 'None', tableHeaderBackground: '#fee2e2', tableHeaderTextColor: '#991b1b', alternatingRowColors: false, roundedCorners: true, spacing: 'Normal' }
  },
  {
    ...generateBaseTemplate('preset_media_production', 'Film & Media Production', 'User'),
    description: 'Creative studio invoice for videography, post-production VFX, audio editing, and commercial media shoots.',
    layout: { type: 'Modern', pageSize: 'A4', orientation: 'Portrait', margins: 'Standard', watermark: { enabled: false, text: '', opacity: 0.1, position: 'Center', rotation: 0 } },
    sections: { ...generateBaseTemplate('preset_media_production', 'Film & Media Production', 'User').sections, shipTo: { id: 'shipTo', visible: false, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} }, transport: { id: 'transport', visible: false, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} }, taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} } },
    config: { ...generateBaseTemplate('preset_media_production', 'Film & Media Production', 'User').config, header: { showLogo: true, logoPosition: 'Left', logoWidth: 130, logoHeight: 55, titleAlignment: 'Right', invoiceTitle: 'PRODUCTION INVOICE' } },
    styleConfig: { ...generateBaseTemplate('preset_media_production', 'Film & Media Production', 'User').styleConfig, primaryColor: '#6d28d9', secondaryColor: '#ede9fe', accentColor: '#7c3aed', fontFamily: 'Outfit', borderStyle: 'Light', tableHeaderBackground: '#6d28d9', tableHeaderTextColor: '#ffffff', alternatingRowColors: true, roundedCorners: true, spacing: 'Normal' }
  },
  {
    ...generateBaseTemplate('preset_it_hardware_maintenance', 'IT Maintenance & AMC', 'GST'),
    description: 'Comprehensive IT hardware supply and Annual Maintenance Contract (AMC) billing template.',
    layout: { type: 'GST Standard', pageSize: 'A4', orientation: 'Portrait', margins: 'Standard', watermark: { enabled: false, text: '', opacity: 0.1, position: 'Center', rotation: 0 } },
    sections: { ...generateBaseTemplate('preset_it_hardware_maintenance', 'IT Maintenance & AMC', 'GST').sections, shipTo: { id: 'shipTo', visible: true, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} }, transport: { id: 'transport', visible: false, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} }, taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} } },
    config: { ...generateBaseTemplate('preset_it_hardware_maintenance', 'IT Maintenance & AMC', 'GST').config, header: { showLogo: true, logoPosition: 'Left', logoWidth: 125, logoHeight: 50, titleAlignment: 'Right', invoiceTitle: 'IT SERVICE & AMC BILL' } },
    styleConfig: { ...generateBaseTemplate('preset_it_hardware_maintenance', 'IT Maintenance & AMC', 'GST').styleConfig, primaryColor: '#1e3a8a', secondaryColor: '#eff6ff', accentColor: '#2563eb', fontFamily: 'Roboto', borderStyle: 'Medium', tableHeaderBackground: '#1e3a8a', tableHeaderTextColor: '#ffffff', alternatingRowColors: true, roundedCorners: false, spacing: 'Normal' }
  },
  {
    ...generateBaseTemplate('preset_agriculture_produce', 'Agri-Tech & Produce Export', 'GST'),
    description: 'Organic farming, agricultural produce supply, and mandi wholesale billing invoice.',
    layout: { type: 'Classic', pageSize: 'A4', orientation: 'Portrait', margins: 'Standard', watermark: { enabled: false, text: '', opacity: 0.1, position: 'Center', rotation: 0 } },
    sections: { ...generateBaseTemplate('preset_agriculture_produce', 'Agri-Tech & Produce Export', 'GST').sections, shipTo: { id: 'shipTo', visible: true, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} }, transport: { id: 'transport', visible: true, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} }, taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} } },
    config: { ...generateBaseTemplate('preset_agriculture_produce', 'Agri-Tech & Produce Export', 'GST').config, header: { showLogo: true, logoPosition: 'Left', logoWidth: 110, logoHeight: 45, titleAlignment: 'Right', invoiceTitle: 'AGRICULTURE PRODUCE BILL' } },
    styleConfig: { ...generateBaseTemplate('preset_agriculture_produce', 'Agri-Tech & Produce Export', 'GST').styleConfig, primaryColor: '#4d7c0f', secondaryColor: '#ecfdf5', accentColor: '#65a30d', fontFamily: 'Inter', borderStyle: 'Light', tableHeaderBackground: '#4d7c0f', tableHeaderTextColor: '#ffffff', alternatingRowColors: true, roundedCorners: true, spacing: 'Normal' }
  },
  {
    ...generateBaseTemplate('preset_accounting_audit', 'Chartered Accountancy & Audit', 'Service'),
    description: 'Authoritative tax audit and financial advisory fee bill for CA firms and accounting practitioners.',
    layout: { type: 'Classic', pageSize: 'A4', orientation: 'Portrait', margins: 'Standard', watermark: { enabled: false, text: '', opacity: 0.1, position: 'Center', rotation: 0 } },
    sections: { ...generateBaseTemplate('preset_accounting_audit', 'Chartered Accountancy & Audit', 'Service').sections, shipTo: { id: 'shipTo', visible: false, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} }, transport: { id: 'transport', visible: false, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} }, taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} } },
    config: { ...generateBaseTemplate('preset_accounting_audit', 'Chartered Accountancy & Audit', 'Service').config, header: { showLogo: true, logoPosition: 'Left', logoWidth: 115, logoHeight: 50, titleAlignment: 'Right', invoiceTitle: 'AUDIT & ADVISORY BILL' } },
    styleConfig: { ...generateBaseTemplate('preset_accounting_audit', 'Chartered Accountancy & Audit', 'Service').styleConfig, primaryColor: '#27272a', secondaryColor: '#f4f4f5', accentColor: '#3f3f46', fontFamily: 'Roboto', borderStyle: 'Medium', tableHeaderBackground: '#27272a', tableHeaderTextColor: '#ffffff', alternatingRowColors: false, roundedCorners: false, spacing: 'Normal' }
  },
  {
    ...generateBaseTemplate('preset_fashion_boutique', 'Luxury Apparel & Fashion Studio', 'Retail'),
    description: 'Chic, high-fashion invoice template tailored for clothing boutiques, designer wear, and custom tailors.',
    layout: { type: 'Minimal', pageSize: 'A4', orientation: 'Portrait', margins: 'Standard', watermark: { enabled: false, text: '', opacity: 0.1, position: 'Center', rotation: 0 } },
    sections: { ...generateBaseTemplate('preset_fashion_boutique', 'Luxury Apparel & Fashion Studio', 'Retail').sections, shipTo: { id: 'shipTo', visible: false, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} }, transport: { id: 'transport', visible: false, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} }, taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} } },
    config: { ...generateBaseTemplate('preset_fashion_boutique', 'Luxury Apparel & Fashion Studio', 'Retail').config, header: { showLogo: true, logoPosition: 'Left', logoWidth: 130, logoHeight: 55, titleAlignment: 'Right', invoiceTitle: 'BOUTIQUE SALES RECEIPT' } },
    styleConfig: { ...generateBaseTemplate('preset_fashion_boutique', 'Luxury Apparel & Fashion Studio', 'Retail').styleConfig, primaryColor: '#a21caf', secondaryColor: '#fdf4ff', accentColor: '#c026d3', fontFamily: 'Outfit', borderStyle: 'None', tableHeaderBackground: '#fdf4ff', tableHeaderTextColor: '#86198f', alternatingRowColors: false, roundedCorners: true, spacing: 'Normal' }
  },
  {
    ...generateBaseTemplate('preset_cleaning_facility', 'Facility & Janitorial Services', 'Service'),
    description: 'Industrial cleaning, corporate facility management, and janitorial maintenance billing template.',
    layout: { type: 'Modern', pageSize: 'A4', orientation: 'Portrait', margins: 'Standard', watermark: { enabled: false, text: '', opacity: 0.1, position: 'Center', rotation: 0 } },
    sections: { ...generateBaseTemplate('preset_cleaning_facility', 'Facility & Janitorial Services', 'Service').sections, shipTo: { id: 'shipTo', visible: false, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} }, transport: { id: 'transport', visible: false, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} }, taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} } },
    config: { ...generateBaseTemplate('preset_cleaning_facility', 'Facility & Janitorial Services', 'Service').config, header: { showLogo: true, logoPosition: 'Left', logoWidth: 120, logoHeight: 50, titleAlignment: 'Right', invoiceTitle: 'FACILITY SERVICES BILL' } },
    styleConfig: { ...generateBaseTemplate('preset_cleaning_facility', 'Facility & Janitorial Services', 'Service').styleConfig, primaryColor: '#0284c7', secondaryColor: '#e0f2fe', accentColor: '#0369a1', fontFamily: 'Inter', borderStyle: 'Light', tableHeaderBackground: '#0284c7', tableHeaderTextColor: '#ffffff', alternatingRowColors: true, roundedCorners: true, spacing: 'Normal' }
  },
  {
    ...generateBaseTemplate('preset_security_guard_service', 'Industrial Security & Guarding', 'GST'),
    description: 'Security agency man-power deployment invoice with shift rates and statutory compliance notes.',
    layout: { type: 'GST Standard', pageSize: 'A4', orientation: 'Portrait', margins: 'Standard', watermark: { enabled: false, text: '', opacity: 0.1, position: 'Center', rotation: 0 } },
    sections: { ...generateBaseTemplate('preset_security_guard_service', 'Industrial Security & Guarding', 'GST').sections, shipTo: { id: 'shipTo', visible: false, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} }, transport: { id: 'transport', visible: false, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} }, taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} } },
    config: { ...generateBaseTemplate('preset_security_guard_service', 'Industrial Security & Guarding', 'GST').config, header: { showLogo: true, logoPosition: 'Left', logoWidth: 125, logoHeight: 50, titleAlignment: 'Right', invoiceTitle: 'SECURITY GUARDING BILL' } },
    styleConfig: { ...generateBaseTemplate('preset_security_guard_service', 'Industrial Security & Guarding', 'GST').styleConfig, primaryColor: '#0f172a', secondaryColor: '#f1f5f9', accentColor: '#334155', fontFamily: 'Roboto', borderStyle: 'Heavy', tableHeaderBackground: '#0f172a', tableHeaderTextColor: '#ffffff', alternatingRowColors: true, roundedCorners: false, spacing: 'Normal' }
  },
  {
    ...generateBaseTemplate('preset_printing_publishing', 'Commercial Printing & Packaging', 'GST'),
    description: 'Commercial printing, box packaging, and publishing invoice with paper GSM and quantity specs.',
    layout: { type: 'GST Standard', pageSize: 'A4', orientation: 'Portrait', margins: 'Standard', watermark: { enabled: false, text: '', opacity: 0.1, position: 'Center', rotation: 0 } },
    sections: { ...generateBaseTemplate('preset_printing_publishing', 'Commercial Printing & Packaging', 'GST').sections, shipTo: { id: 'shipTo', visible: true, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} }, transport: { id: 'transport', visible: true, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} }, taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} } },
    config: { ...generateBaseTemplate('preset_printing_publishing', 'Commercial Printing & Packaging', 'GST').config, header: { showLogo: true, logoPosition: 'Left', logoWidth: 120, logoHeight: 45, titleAlignment: 'Right', invoiceTitle: 'PRINTING & PACKAGING BILL' } },
    styleConfig: { ...generateBaseTemplate('preset_printing_publishing', 'Commercial Printing & Packaging', 'GST').styleConfig, primaryColor: '#d97706', secondaryColor: '#fef3c7', accentColor: '#b45309', fontFamily: 'Roboto', borderStyle: 'Medium', tableHeaderBackground: '#d97706', tableHeaderTextColor: '#ffffff', alternatingRowColors: true, roundedCorners: false, spacing: 'Normal' }
  },
  {
    ...generateBaseTemplate('preset_dental_clinic', 'Dental Clinic & Oral Surgery', 'Service'),
    description: 'Clean dental clinic bill & treatment receipt layout for oral procedures and dental implants.',
    layout: { type: 'Modern', pageSize: 'A4', orientation: 'Portrait', margins: 'Standard', watermark: { enabled: false, text: '', opacity: 0.1, position: 'Center', rotation: 0 } },
    sections: { ...generateBaseTemplate('preset_dental_clinic', 'Dental Clinic & Oral Surgery', 'Service').sections, shipTo: { id: 'shipTo', visible: false, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} }, transport: { id: 'transport', visible: false, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} }, taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} } },
    config: { ...generateBaseTemplate('preset_dental_clinic', 'Dental Clinic & Oral Surgery', 'Service').config, header: { showLogo: true, logoPosition: 'Left', logoWidth: 115, logoHeight: 50, titleAlignment: 'Right', invoiceTitle: 'DENTAL TREATMENT BILL' } },
    styleConfig: { ...generateBaseTemplate('preset_dental_clinic', 'Dental Clinic & Oral Surgery', 'Service').styleConfig, primaryColor: '#0891b2', secondaryColor: '#cffaff', accentColor: '#06b6d4', fontFamily: 'Inter', borderStyle: 'Light', tableHeaderBackground: '#0891b2', tableHeaderTextColor: '#ffffff', alternatingRowColors: true, roundedCorners: true, spacing: 'Normal' }
  },
  {
    ...generateBaseTemplate('preset_travel_agency_tour', 'Travel Agency & Tour Booking', 'Service'),
    description: 'Flight ticketing, holiday tour package, and hotel booking invoice layout for travel agencies.',
    layout: { type: 'Modern', pageSize: 'A4', orientation: 'Portrait', margins: 'Standard', watermark: { enabled: false, text: '', opacity: 0.1, position: 'Center', rotation: 0 } },
    sections: { ...generateBaseTemplate('preset_travel_agency_tour', 'Travel Agency & Tour Booking', 'Service').sections, shipTo: { id: 'shipTo', visible: false, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} }, transport: { id: 'transport', visible: false, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} }, taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} } },
    config: { ...generateBaseTemplate('preset_travel_agency_tour', 'Travel Agency & Tour Booking', 'Service').config, header: { showLogo: true, logoPosition: 'Left', logoWidth: 130, logoHeight: 55, titleAlignment: 'Right', invoiceTitle: 'TRAVEL TOUR INVOICE' } },
    styleConfig: { ...generateBaseTemplate('preset_travel_agency_tour', 'Travel Agency & Tour Booking', 'Service').styleConfig, primaryColor: '#c2410c', secondaryColor: '#ffedd5', accentColor: '#ea580c', fontFamily: 'Outfit', borderStyle: 'Light', tableHeaderBackground: '#c2410c', tableHeaderTextColor: '#ffffff', alternatingRowColors: true, roundedCorners: true, spacing: 'Normal' }
  },
  {
    ...generateBaseTemplate('preset_textile_garments', 'Textile Mill & Fabric Export', 'GST'),
    description: 'Textile manufacturing, fabric roll wholesale, and garment export billing invoice.',
    layout: { type: 'GST Standard', pageSize: 'A4', orientation: 'Portrait', margins: 'Standard', watermark: { enabled: false, text: '', opacity: 0.1, position: 'Center', rotation: 0 } },
    sections: { ...generateBaseTemplate('preset_textile_garments', 'Textile Mill & Fabric Export', 'GST').sections, shipTo: { id: 'shipTo', visible: true, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} }, transport: { id: 'transport', visible: true, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} }, taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} } },
    config: { ...generateBaseTemplate('preset_textile_garments', 'Textile Mill & Fabric Export', 'GST').config, header: { showLogo: true, logoPosition: 'Left', logoWidth: 120, logoHeight: 50, titleAlignment: 'Right', invoiceTitle: 'TEXTILE FABRIC INVOICE' } },
    styleConfig: { ...generateBaseTemplate('preset_textile_garments', 'Textile Mill & Fabric Export', 'GST').styleConfig, primaryColor: '#701a75', secondaryColor: '#fdf4ff', accentColor: '#86198f', fontFamily: 'Roboto', borderStyle: 'Medium', tableHeaderBackground: '#701a75', tableHeaderTextColor: '#ffffff', alternatingRowColors: true, roundedCorners: false, spacing: 'Normal' }
  },
  {
    ...generateBaseTemplate('preset_consulting_retainer', 'Corporate Retainer & Strategy', 'Service'),
    description: 'High-level management consulting, strategic advisory, and retainer billing invoice.',
    layout: { type: 'Corporate', pageSize: 'A4', orientation: 'Portrait', margins: 'Standard', watermark: { enabled: false, text: '', opacity: 0.1, position: 'Center', rotation: 0 } },
    sections: { ...generateBaseTemplate('preset_consulting_retainer', 'Corporate Retainer & Strategy', 'Service').sections, shipTo: { id: 'shipTo', visible: false, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} }, transport: { id: 'transport', visible: false, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} }, taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} } },
    config: { ...generateBaseTemplate('preset_consulting_retainer', 'Corporate Retainer & Strategy', 'Service').config, header: { showLogo: true, logoPosition: 'Left', logoWidth: 140, logoHeight: 60, titleAlignment: 'Right', invoiceTitle: 'STRATEGY RETAINER BILL' } },
    styleConfig: { ...generateBaseTemplate('preset_consulting_retainer', 'Corporate Retainer & Strategy', 'Service').styleConfig, primaryColor: '#172554', secondaryColor: '#eff6ff', accentColor: '#1e40af', fontFamily: 'Outfit', borderStyle: 'Light', tableHeaderBackground: '#172554', tableHeaderTextColor: '#ffffff', alternatingRowColors: true, roundedCorners: true, spacing: 'Normal' }
  },
  {
    ...generateBaseTemplate('preset_hardware_sanitary', 'Building Hardware & Sanitary Goods', 'Retail'),
    description: 'Sanitaryware, plumbing fittings, and construction hardware retail POS invoice.',
    layout: { type: 'Retail', pageSize: 'A4', orientation: 'Portrait', margins: 'Compact', watermark: { enabled: false, text: '', opacity: 0.1, position: 'Center', rotation: 0 } },
    sections: { ...generateBaseTemplate('preset_hardware_sanitary', 'Building Hardware & Sanitary Goods', 'Retail').sections, shipTo: { id: 'shipTo', visible: false, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} }, transport: { id: 'transport', visible: false, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} }, taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} } },
    config: { ...generateBaseTemplate('preset_hardware_sanitary', 'Building Hardware & Sanitary Goods', 'Retail').config, header: { showLogo: true, logoPosition: 'Left', logoWidth: 110, logoHeight: 45, titleAlignment: 'Right', invoiceTitle: 'HARDWARE STORE BILL' } },
    styleConfig: { ...generateBaseTemplate('preset_hardware_sanitary', 'Building Hardware & Sanitary Goods', 'Retail').styleConfig, primaryColor: '#3f3f46', secondaryColor: '#f4f4f5', accentColor: '#52525b', fontFamily: 'Roboto', borderStyle: 'Light', tableHeaderBackground: '#e4e4e7', tableHeaderTextColor: '#18181b', alternatingRowColors: false, roundedCorners: true, spacing: 'Compact' }
  },
  {
    ...makInvoicesOriginalPreset,
    id: 'preset_makinvoices_proforma',
    name: 'MakInvoices Proforma Invoice',
    description: 'Official MakInvoices Proforma Invoice layout featuring Deep Corporate Sapphire Navy theme, Outfit typography, and custom advance payment terms.',
    isDefault: false,
    category: 'Default',
    config: {
      ...makInvoicesOriginalPreset.config,
      header: {
        ...makInvoicesOriginalPreset.config.header,
        invoiceTitle: 'PROFORMA INVOICE'
      },
      payment: {
        ...makInvoicesOriginalPreset.config.payment,
        customNote: 'Proforma Invoice for advance payment processing & order confirmation.'
      },
      terms: {
        presetId: 'default',
        customText: '1. Proforma Invoice valid for 30 calendar days.\n2. Order fulfillment begins upon receipt of advance payment.'
      }
    },
    styleConfig: {
      ...makInvoicesOriginalPreset.styleConfig,
      primaryColor: '#1e3a8a',
      secondaryColor: '#f8fafc',
      accentColor: '#2563eb',
      fontFamily: 'Outfit',
      borderStyle: 'Light',
      roundedCorners: true,
      alternatingRowColors: true,
      tableHeaderBackground: '#1e3a8a',
      tableHeaderTextColor: '#ffffff',
      spacing: 'Normal'
    }
  },
  {
    ...makInvoicesOriginalPreset,
    id: 'preset_makinvoices_credit_note',
    name: 'MakInvoices Credit Note',
    description: 'Official MakInvoices Credit Note layout featuring Steel Charcoal theme, crisp borders, and return credit terms.',
    isDefault: false,
    category: 'Default',
    config: {
      ...makInvoicesOriginalPreset.config,
      header: {
        ...makInvoicesOriginalPreset.config.header,
        invoiceTitle: 'CREDIT NOTE'
      },
      terms: {
        presetId: 'default',
        customText: '1. Credit Note issued against return/adjustment of items.\n2. Amount will be adjusted against future invoices or refunded.'
      }
    },
    styleConfig: {
      ...makInvoicesOriginalPreset.styleConfig,
      primaryColor: '#334155',
      secondaryColor: '#f8fafc',
      accentColor: '#475569',
      fontFamily: 'Roboto',
      borderStyle: 'Light',
      roundedCorners: true,
      alternatingRowColors: false,
      tableHeaderBackground: '#334155',
      tableHeaderTextColor: '#ffffff',
      spacing: 'Compact'
    }
  },
  {
    ...makInvoicesOriginalPreset,
    id: 'preset_makinvoices_debit_note',
    name: 'MakInvoices Debit Note',
    description: 'Official MakInvoices Debit Note layout featuring Dark Graphite accent, bold table styling, and supplementary billing terms.',
    isDefault: false,
    category: 'Default',
    config: {
      ...makInvoicesOriginalPreset.config,
      header: {
        ...makInvoicesOriginalPreset.config.header,
        invoiceTitle: 'DEBIT NOTE'
      },
      terms: {
        presetId: 'default',
        customText: '1. Debit Note issued for supplementary price adjustments or tax corrections.\n2. Payment due within 7 days of issue.'
      }
    },
    styleConfig: {
      ...makInvoicesOriginalPreset.styleConfig,
      primaryColor: '#1e293b',
      secondaryColor: '#f8fafc',
      accentColor: '#3b82f6',
      fontFamily: 'Roboto',
      borderStyle: 'Medium',
      roundedCorners: false,
      alternatingRowColors: true,
      tableHeaderBackground: '#1e293b',
      tableHeaderTextColor: '#ffffff',
      spacing: 'Normal'
    }
  },
  {
    ...makInvoicesOriginalPreset,
    id: 'preset_makinvoices_quotation',
    name: 'MakInvoices Quote / Estimate',
    description: 'Official MakInvoices Quotation & Cost Estimate layout featuring Corporate Emerald Teal palette, Inter typography, and estimate validity terms.',
    isDefault: false,
    category: 'Default',
    config: {
      ...makInvoicesOriginalPreset.config,
      header: {
        ...makInvoicesOriginalPreset.config.header,
        invoiceTitle: 'QUOTATION / ESTIMATE'
      },
      terms: {
        presetId: 'default',
        customText: '1. Quotation valid for 15 days from date of issuance.\n2. Subject to final agreement on project scope and timeline.'
      }
    },
    styleConfig: {
      ...makInvoicesOriginalPreset.styleConfig,
      primaryColor: '#0f766e',
      secondaryColor: '#f0fdf4',
      accentColor: '#0d9488',
      fontFamily: 'Inter',
      borderStyle: 'Light',
      roundedCorners: true,
      alternatingRowColors: true,
      tableHeaderBackground: '#0f766e',
      tableHeaderTextColor: '#ffffff',
      spacing: 'Normal'
    }
  },
  makInvoicesOriginalPreset
];

export function getDefaultTemplatePreset(): InvoiceTemplate {
  return TEMPLATE_PRESETS.find(t => t.isDefault) || makInvoicesOriginalPreset || TEMPLATE_PRESETS[0];
}

export function ensureAllColumns(existingCols: any[]): any[] {
  const defaultCols = [
    { id: 'sr', visible: true, label: 'SR NO', type: 'Number', order: 1 },
    { id: 'name', visible: true, label: 'ITEM NAME', type: 'Text', order: 2 },
    { id: 'hsn', visible: true, label: 'HSN/SAC', type: 'Text', order: 3 },
    { id: 'qty', visible: true, label: 'QTY', type: 'Number', order: 4 },
    { id: 'rate', visible: true, label: 'RATE', type: 'Currency', order: 5 },
    { id: 'tax', visible: true, label: 'Tax %', type: 'Number', order: 6 },
    { id: 'amount', visible: true, label: 'AMOUNT', type: 'Formula', formula: 'qty*rate', order: 7 }
  ];

  if (!existingCols || existingCols.length === 0) return defaultCols;

  // Build final list keeping existing configurations (labels, order, visible status etc.)
  const result = defaultCols.map(def => {
    const match = existingCols.find(c => c.id === def.id);
    if (match) {
      const isRequired = ['name', 'qty', 'rate', 'amount'].includes(def.id);
      return {
        ...def,
        ...match,
        // Override visible status if it's a required column
        visible: isRequired ? true : match.visible
      };
    }
    return def;
  });

  // Sort by order
  return result.sort((a, b) => a.order - b.order);
}
