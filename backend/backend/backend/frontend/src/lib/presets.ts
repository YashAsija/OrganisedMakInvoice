import { Invoice, PresetItem, BusinessProfile } from '../types';

export interface BusinessTemplate {
  id: string;
  name: string;
  description: string;
  defaultProfile: Partial<BusinessProfile>;
  items: Omit<PresetItem, 'userId'>[];
}

export const BUSINESS_TEMPLATES: BusinessTemplate[] = [
  {
    id: 'freelance_tech',
    name: 'Freelancer / Developer',
    description: 'Perfect for software engineers, designers, and creative artists in India.',
    defaultProfile: {
      name: '',
      email: '',
      phone: '',
      address: '',
      taxId: '',
      currency: 'INR',
      defaultTaxRate: 18,
    },
    items: [
      { id: 'item_dev', name: 'Software Development & API Consulting (SAC 998311)', rate: 45000, taxPercentage: 18, description: 'Design and deployment of web endpoints' },
      { id: 'item_design', name: 'UI/UX Visual Prototyping (SAC 998313)', rate: 25000, taxPercentage: 18, description: 'Aesthetic wireframes and branding review' },
      { id: 'item_consulting', name: 'Cloud Architecture & Systems Planning', rate: 55000, taxPercentage: 18, description: 'Cloud infrastructure security audits' },
      { id: 'item_qa', name: 'Software Quality Assurance & QA Testing', rate: 15000, taxPercentage: 18, description: 'Bugs hunting and Cypress integration validations' }
    ]
  },
  {
    id: 'consulting_corp',
    name: 'Professional Consulting',
    description: 'Best for business strategist, legal consulting, and advisors.',
    defaultProfile: {
      name: '',
      email: '',
      phone: '',
      address: '',
      taxId: '',
      currency: 'USD',
      defaultTaxRate: 15,
    },
    items: [
      { id: 'item_retain', name: 'Monthly Strategy Retainer', rate: 2500, taxPercentage: 0, description: 'Corporate advisory and board strategy' },
      { id: 'item_eval', name: 'Risk Assessment & Audit Report', rate: 4500, taxPercentage: 15, description: 'Comprehensive operational and compliance review' },
      { id: 'item_workshop', name: 'Executive Training Workshop', rate: 1800, taxPercentage: 15, description: 'On-site leadership training day' }
    ]
  },
  {
    id: 'retail_boutique',
    name: 'Retail Store / Boutique',
    description: 'Customized for physical goods, wholesalers, and cafes.',
    defaultProfile: {
      name: '',
      email: '',
      phone: '',
      address: '',
      taxId: '',
      currency: 'GBP',
      defaultTaxRate: 20,
    },
    items: [
      { id: 'item_artisan', name: 'Handcrafted Ceramic Vase (Case of 6)', rate: 180, taxPercentage: 20, description: 'Premium glaze home goods' },
      { id: 'item_linen', name: 'Organic Flax Linen Bedding Set', rate: 220, taxPercentage: 20, description: 'Hypoallergenic king sized grey pack' },
      { id: 'item_custom_order', name: 'Custom Interior Styling Fee', rate: 350, taxPercentage: 20, description: 'Two hour in-home layout review' }
    ]
  },
  {
    id: 'trade_contractor',
    name: 'Trades / General Contractor',
    description: 'Fits plumbers, electricians, and construction builders.',
    defaultProfile: {
      name: '',
      email: '',
      phone: '',
      address: '',
      taxId: '',
      currency: 'EUR',
      defaultTaxRate: 19.6,
    },
    items: [
      { id: 'item_labor', name: 'Plumbing Labor Charge (per hour)', rate: 85, taxPercentage: 19.6, description: 'Licensed emergency standard rates' },
      { id: 'item_copper', name: 'Copper pipe replacement kit', rate: 120, taxPercentage: 19.6, description: 'Solid grade high pressure parts' },
      { id: 'item_fixture', name: 'Premium Brass Bathroom Faucet', rate: 299, taxPercentage: 19.6, description: 'Water saving certified fixture' }
    ]
  }
];

export function getSampleInvoice(templateId: string, userId: string = 'local'): Invoice {
  const template = BUSINESS_TEMPLATES.find(p => p.id === templateId) || BUSINESS_TEMPLATES[0];
  const defaultPf = template.defaultProfile;
  
  // Custom date creation
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const dueDateObj = new Date();
  dueDateObj.setDate(now.getDate() + 14);
  const dueStr = dueDateObj.toISOString().split('T')[0];

  const subtotal = template.items.reduce((acc, it) => acc + (it.rate * 1), 0);
  const taxTotal = template.items.reduce((acc, it) => acc + (it.rate * 1 * (it.taxPercentage / 100)), 0);

  return {
    id: `inv_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    invoiceNumber: `INV-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    date: dateStr,
    dueDate: dueStr,
    clientName: 'Johnathan Doe',
    clientEmail: 'john.doe@corporate.com',
    clientPhone: '+1 (555) 432-8765',
    clientAddress: '500 Prosperity Blvd, Suite 100, Austin, TX',
    notes: 'Thank you for your business! Please pay within 14 days of receiving this invoice.',
    subtotal: subtotal,
    discountType: 'none',
    discountValue: 0,
    discountTotal: 0,
    taxTotal: parseFloat(taxTotal.toFixed(2)),
    grandTotal: parseFloat((subtotal + taxTotal).toFixed(2)),
    status: 'pending',
    items: template.items.map((it, idx) => ({
      id: `item_${idx}_${Math.random().toString(36).substr(2, 4)}`,
      name: it.name,
      rate: it.rate,
      quantity: 1,
      taxPercentage: it.taxPercentage,
      description: it.description
    })),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
}
