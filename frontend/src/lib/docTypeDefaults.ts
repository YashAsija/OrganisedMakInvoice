import { BusinessProfile } from '../types';

export interface DocTypeDefaults {
  notes: string;
  terms: string;
}

export const BUILTIN_DOC_DEFAULTS: Record<string, DocTypeDefaults> = {
  invoice: {
    notes: 'Thank you for your business!',
    terms: '1. Standard Net-15 payment terms apply.\n2. Goods once sold will not be taken back or exchanged.\n3. Unresolved overdue balances are subject to three times the RBI bank rate penalties under Indian MSME guidelines.'
  },
  proforma: {
    notes: 'This is a Proforma Invoice for advance payment estimation. Final Tax Invoice will be issued upon order confirmation.',
    terms: '1. Prices stated in this proforma are valid for 15 days.\n2. Production or delivery will commence only after receipt of agreed advance payment.\n3. This document is not a demand for payment or a tax invoice.'
  },
  debit_note: {
    notes: 'Debit Note issued towards supplementary charges / price adjustment.',
    terms: '1. This Debit Note is issued in accordance with applicable GST rules for debit adjustments.\n2. Please update your accounts payable ledger accordingly.'
  },
  credit_note: {
    notes: 'Credit Note issued towards return of goods / discount / price adjustment.',
    terms: '1. This Credit Note is issued in accordance with applicable GST rules for credit adjustments.\n2. The credited amount may be adjusted against future invoices or refunded as agreed.'
  },
  estimate: {
    notes: 'Thank you for requesting a quotation. We look forward to working with you!',
    terms: '1. This quotation is valid for 30 days from the date of issue.\n2. Taxes, shipping, and incidental charges will be calculated at final billing unless specified.\n3. Final scope of work or item quantities may adjust the grand total.'
  },
  quote: {
    notes: 'Thank you for requesting a quotation. We look forward to working with you!',
    terms: '1. This quotation is valid for 30 days from the date of issue.\n2. Taxes, shipping, and incidental charges will be calculated at final billing unless specified.\n3. Final scope of work or item quantities may adjust the grand total.'
  }
};

/**
 * Resolves default Notes and Terms for a document type.
 * Priority order:
 * 1. User-customized per-document-type note/term stored in profile
 * 2. User-customized global note/term in profile
 * 3. Built-in standard default for that document type
 */
export function getDocumentTypeDefaults(
  docType: string,
  profile?: Partial<BusinessProfile> | null
): DocTypeDefaults {
  const normType = docType === 'estimate' ? 'quote' : (docType || 'invoice');
  const builtin = BUILTIN_DOC_DEFAULTS[normType] || BUILTIN_DOC_DEFAULTS.invoice;

  if (!profile) {
    return { ...builtin };
  }

  const perTypeNotesKey = `${normType}Notes` as keyof BusinessProfile;
  const perTypeTermsKey = `${normType}Terms` as keyof BusinessProfile;

  const customNotes = (profile[perTypeNotesKey] as string) || profile.defaultNotes;
  const customTerms = (profile[perTypeTermsKey] as string) || profile.defaultTerms;

  return {
    notes: customNotes && customNotes.trim() ? customNotes : builtin.notes,
    terms: customTerms && customTerms.trim() ? customTerms : builtin.terms
  };
}
