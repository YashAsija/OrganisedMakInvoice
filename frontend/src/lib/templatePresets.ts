import { InvoiceTemplate } from '../types';

const generateBaseTemplate = (id: string, name: string, category: string): InvoiceTemplate => ({
  id,
  name,
  description: `${name} template configuration`,
  isDefault: false,
  category: category as any,
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
    company: { fields: ['name', 'address', 'gstin', 'email', 'phone'] },
    invoiceInfo: { fields: ['invoiceNumber', 'invoiceDate', 'dueDate'], customFields: [], position: 'Right' },
    client: { fields: ['name', 'address', 'gstin'] },
    shipping: { fields: ['name', 'address', 'gstin', 'phone', 'email', 'pan'], sameAsBilling: false },
    transport: { fields: ['vehicleNo', 'transportName'] },
    table: {
      columns: [
        { id: 'sr', visible: true, label: 'Sr No', type: 'Number', order: 1 },
        { id: 'name', visible: true, label: 'Item Name', type: 'Text', order: 2 },
        { id: 'hsn', visible: false, label: 'HSN/SAC', type: 'Text', order: 3 },
        { id: 'qty', visible: true, label: 'Qty', type: 'Number', order: 4 },
        { id: 'rate', visible: true, label: 'Rate', type: 'Currency', order: 5 },
        { id: 'tax', visible: false, label: 'Tax %', type: 'Number', order: 6 },
        { id: 'amount', visible: true, label: 'Amount', type: 'Formula', formula: 'qty*rate', order: 7 }
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

export const TEMPLATE_PRESETS: InvoiceTemplate[] = [
  {
    ...generateBaseTemplate('preset_modal_classic', 'MakInvoice Original', 'Default'),
    description: 'The exact original structured layout from the Add New Invoice screen.',
    isDefault: true,
    layout: {
      type: 'Modal Classic',
      pageSize: 'A4',
      orientation: 'Portrait',
      margins: 'Standard',
      watermark: { enabled: false, text: 'DRAFT', opacity: 0.1, position: 'Center', rotation: -45 }
    },
    sections: {
      ...generateBaseTemplate('preset_modal_classic', 'MakInvoice Original', 'Default').sections,
      transport: { id: 'transport', visible: true, order: 3.5, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
      payment: { id: 'payment', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
      taxEngine: { id: 'taxEngine', visible: true, order: 9, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
      amountInWords: { id: 'amountInWords', visible: true, order: 10, gridColumnSpan: 12, customLabels: {}, customStyles: {} },
      terms: { id: 'terms', visible: true, order: 11, gridColumnSpan: 6, customLabels: {}, customStyles: {} }
    },
    config: {
      ...generateBaseTemplate('preset_modal_classic', 'MakInvoice Original', 'Default').config
    },
    styleConfig: {
      ...generateBaseTemplate('preset_modal_classic', 'MakInvoice Original', 'Default').styleConfig,
      primaryColor: '#1f2937',
      fontFamily: 'Inter',
      borderStyle: 'Light',
      tableHeaderBackground: '#1f2937',
      tableHeaderTextColor: '#ffffff',
      alternatingRowColors: false,
      roundedCorners: false,
      spacing: 'Compact'
    }
  },
  {
    ...generateBaseTemplate('preset_user', 'Personal & Simple', 'User'),
    description: 'A deeply customized, clean layout for personal or custom use.',
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
          { id: 'name', visible: true, label: 'Description', type: 'Text' as any, order: 1 },
          { id: 'amount', visible: true, label: 'Total', type: 'Formula' as any, formula: 'qty*rate', order: 2 }
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
    description: 'Strictly compliant Indian GST layout with full tax breakdown and HSN.',
    sections: {
      ...generateBaseTemplate('preset_gst', 'GST Exhaustive', 'GST').sections,
      shipTo: { id: 'shipTo', visible: true, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
      transport: { id: 'transport', visible: true, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} },
      taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} }
    },
    config: {
      ...generateBaseTemplate('preset_gst', 'GST Exhaustive', 'GST').config,
      header: { showLogo: true, logoPosition: 'Left', logoWidth: 120, logoHeight: 60, titleAlignment: 'Right', invoiceTitle: 'TAX INVOICE' },
      company: { fields: ['name', 'address', 'gstin', 'email', 'phone'] },
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
    description: 'Fast, compact layout suitable for retail counters or point of sale.',
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
          { id: 'sr', visible: true, label: '#', type: 'Number' as any, order: 1 },
          { id: 'name', visible: true, label: 'Product', type: 'Text' as any, order: 2 },
          { id: 'qty', visible: true, label: 'Qty', type: 'Number' as any, order: 3 },
          { id: 'rate', visible: true, label: 'Price', type: 'Currency' as any, order: 4 },
          { id: 'amount', visible: true, label: 'Total', type: 'Formula' as any, formula: 'qty*rate', order: 5 }
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
    description: 'Traditional, exhaustive corporate layout for compliance and B2B billing.',
    sections: {
      ...generateBaseTemplate('preset_corporate', 'Corporate Professional', 'Default').sections,
      shipTo: { id: 'shipTo', visible: true, order: 5, gridColumnSpan: 6, customLabels: {}, customStyles: {} },
      transport: { id: 'transport', visible: true, order: 6, gridColumnSpan: 12, customLabels: {}, customStyles: {} },
      taxEngine: { id: 'taxEngine', visible: true, order: 8, gridColumnSpan: 6, customLabels: {}, customStyles: {} }
    },
    config: {
      ...generateBaseTemplate('preset_corporate', 'Corporate Professional', 'Default').config,
      header: { showLogo: true, logoPosition: 'Left', logoWidth: 120, logoHeight: 60, titleAlignment: 'Right', invoiceTitle: 'TAX INVOICE' },
      company: { fields: ['name', 'address', 'gstin', 'email', 'phone'] },
      client: { fields: ['name', 'address', 'gstin'] },
      tax: { showTaxableAmount: true, showCgstSgst: true, showIgst: true, showCess: false, showDiscount: true, showRoundOff: true, showTotal: true, enableHsnSummary: true, enableGstSummary: false, enableTaxBreakdown: true },
      table: {
        columns: [
          { id: 'sr', visible: true, label: 'Sr No', type: 'Number' as any, order: 1 },
          { id: 'name', visible: true, label: 'Item Name', type: 'Text' as any, order: 2 },
          { id: 'hsn', visible: true, label: 'HSN/SAC', type: 'Text' as any, order: 3 },
          { id: 'qty', visible: true, label: 'Qty', type: 'Number' as any, order: 4 },
          { id: 'rate', visible: true, label: 'Rate', type: 'Currency' as any, order: 5 },
          { id: 'tax', visible: true, label: 'Tax %', type: 'Number' as any, order: 6 },
          { id: 'amount', visible: true, label: 'Amount', type: 'Formula' as any, formula: 'qty*rate', order: 7 }
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
    description: 'Ultra-clean, modern layout with tech-forward fonts and no borders.',
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
          { id: 'name', visible: true, label: 'Service Description', type: 'Text' as any, order: 1 },
          { id: 'qty', visible: true, label: 'Hours', type: 'Number' as any, order: 2 },
          { id: 'rate', visible: true, label: 'Rate', type: 'Currency' as any, order: 3 },
          { id: 'amount', visible: true, label: 'Amount', type: 'Formula' as any, formula: 'qty*rate', order: 4 }
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
    description: 'International export invoice with detailed shipping and terms.',
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
          { id: 'sr', visible: true, label: 'Sr', type: 'Number' as any, order: 1 },
          { id: 'name', visible: true, label: 'Product Description', type: 'Text' as any, order: 2 },
          { id: 'hsn', visible: true, label: 'HSN', type: 'Text' as any, order: 3 },
          { id: 'qty', visible: true, label: 'Qty', type: 'Number' as any, order: 4 },
          { id: 'rate', visible: true, label: 'Unit Price', type: 'Currency' as any, order: 5 },
          { id: 'amount', visible: true, label: 'Total Value', type: 'Formula' as any, formula: 'qty*rate', order: 6 }
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
          { id: 'sr', visible: true, label: '#', type: 'Number' as any, order: 1 },
          { id: 'name', visible: true, label: 'Treatment / Medicine', type: 'Text' as any, order: 2 },
          { id: 'qty', visible: true, label: 'Quantity', type: 'Number' as any, order: 3 },
          { id: 'rate', visible: true, label: 'Cost', type: 'Currency' as any, order: 4 },
          { id: 'amount', visible: true, label: 'Total', type: 'Formula' as any, formula: 'qty*rate', order: 5 }
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
          { id: 'name', visible: true, label: 'Item Description', type: 'Text' as any, order: 1 },
          { id: 'qty', visible: true, label: 'Quantity', type: 'Number' as any, order: 2 },
          { id: 'rate', visible: true, label: 'Price', type: 'Currency' as any, order: 3 },
          { id: 'amount', visible: true, label: 'Amount', type: 'Formula' as any, formula: 'qty*rate', order: 4 }
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
    ...generateBaseTemplate('preset_credit_note', 'Credit Note', 'Default'),
    description: 'A standard credit note layout to issue refunds or balance adjustments.',
    config: {
      ...generateBaseTemplate('preset_credit_note', 'Credit Note', 'Default').config,
      header: { ...generateBaseTemplate('preset_credit_note', 'Credit Note', 'Default').config.header, invoiceTitle: 'CREDIT NOTE' }
    }
  },
  {
    ...generateBaseTemplate('preset_debit_note', 'Debit Note', 'Default'),
    description: 'A standard debit note layout to issue additional charges or balance corrections.',
    config: {
      ...generateBaseTemplate('preset_debit_note', 'Debit Note', 'Default').config,
      header: { ...generateBaseTemplate('preset_debit_note', 'Debit Note', 'Default').config.header, invoiceTitle: 'DEBIT NOTE' }
    }
  },
  {
    ...generateBaseTemplate('preset_quotation', 'Quotation / Estimate', 'Default'),
    description: 'A standard quotation template for providing cost estimates to clients before billing.',
    config: {
      ...generateBaseTemplate('preset_quotation', 'Quotation / Estimate', 'Default').config,
      header: { ...generateBaseTemplate('preset_quotation', 'Quotation / Estimate', 'Default').config.header, invoiceTitle: 'QUOTATION / ESTIMATE' }
    }
  }
];
