/**
 * International Location & Auto-Localization Engine
 * Auto-detects user/client country via Cloudflare / Vercel IP headers or browser timezone fallback.
 * Provides intelligent default settings for currency, country calling codes, date formats, paper sizes, and tax labels.
 */

export interface LocalizationConfig {
  countryCode: string; // ISO 2-letter country code e.g. "US", "IN", "GB", "DE"
  countryName: string;
  currency: string; // ISO 3-letter currency code e.g. "USD", "INR", "EUR", "GBP"
  currencySymbol: string; // e.g. "$", "₹", "€", "£"
  callingCode: string; // e.g. "+1", "+91", "+44", "+49"
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  paperSize: 'A4' | 'LETTER';
  taxLabel: string; // e.g. "Sales Tax", "GST", "VAT", "Tax"
  taxIdLabel: string; // e.g. "EIN / SSN", "GSTIN", "VAT Reg No", "TRN"
  defaultTaxRate: number;
  currencyFormat: 'standard' | 'lakhs' | 'european';
}

export const COUNTRY_LOCALIZATION_MAP: Record<string, LocalizationConfig> = {
  US: {
    countryCode: 'US',
    countryName: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    callingCode: '+1',
    dateFormat: 'MM/DD/YYYY',
    paperSize: 'LETTER',
    taxLabel: 'Sales Tax',
    taxIdLabel: 'EIN / SSN',
    defaultTaxRate: 8.5,
    currencyFormat: 'standard',
  },
  IN: {
    countryCode: 'IN',
    countryName: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    callingCode: '+91',
    dateFormat: 'DD/MM/YYYY',
    paperSize: 'A4',
    taxLabel: 'GST',
    taxIdLabel: 'GSTIN / PAN',
    defaultTaxRate: 18,
    currencyFormat: 'lakhs',
  },
  GB: {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    currency: 'GBP',
    currencySymbol: '£',
    callingCode: '+44',
    dateFormat: 'DD/MM/YYYY',
    paperSize: 'A4',
    taxLabel: 'VAT',
    taxIdLabel: 'VAT Reg No',
    defaultTaxRate: 20,
    currencyFormat: 'standard',
  },
  DE: {
    countryCode: 'DE',
    countryName: 'Germany',
    currency: 'EUR',
    currencySymbol: '€',
    callingCode: '+49',
    dateFormat: 'DD/MM/YYYY',
    paperSize: 'A4',
    taxLabel: 'MwSt. / VAT',
    taxIdLabel: 'USt-IdNr.',
    defaultTaxRate: 19,
    currencyFormat: 'european',
  },
  FR: {
    countryCode: 'FR',
    countryName: 'France',
    currency: 'EUR',
    currencySymbol: '€',
    callingCode: '+33',
    dateFormat: 'DD/MM/YYYY',
    paperSize: 'A4',
    taxLabel: 'TVA',
    taxIdLabel: 'N° TVA',
    defaultTaxRate: 20,
    currencyFormat: 'european',
  },
  CA: {
    countryCode: 'CA',
    countryName: 'Canada',
    currency: 'CAD',
    currencySymbol: '$',
    callingCode: '+1',
    dateFormat: 'YYYY-MM-DD',
    paperSize: 'LETTER',
    taxLabel: 'GST/HST',
    taxIdLabel: 'Business No',
    defaultTaxRate: 13,
    currencyFormat: 'standard',
  },
  AU: {
    countryCode: 'AU',
    countryName: 'Australia',
    currency: 'AUD',
    currencySymbol: '$',
    callingCode: '+61',
    dateFormat: 'DD/MM/YYYY',
    paperSize: 'A4',
    taxLabel: 'GST',
    taxIdLabel: 'ABN / ACN',
    defaultTaxRate: 10,
    currencyFormat: 'standard',
  },
  AE: {
    countryCode: 'AE',
    countryName: 'United Arab Emirates',
    currency: 'AED',
    currencySymbol: 'AED',
    callingCode: '+971',
    dateFormat: 'DD/MM/YYYY',
    paperSize: 'A4',
    taxLabel: 'VAT',
    taxIdLabel: 'TRN',
    defaultTaxRate: 5,
    currencyFormat: 'standard',
  },
  SA: {
    countryCode: 'SA',
    countryName: 'Saudi Arabia',
    currency: 'SAR',
    currencySymbol: 'SAR',
    callingCode: '+966',
    dateFormat: 'DD/MM/YYYY',
    paperSize: 'A4',
    taxLabel: 'VAT',
    taxIdLabel: 'TRN',
    defaultTaxRate: 15,
    currencyFormat: 'standard',
  },
  SG: {
    countryCode: 'SG',
    countryName: 'Singapore',
    currency: 'SGD',
    currencySymbol: '$',
    callingCode: '+65',
    dateFormat: 'DD/MM/YYYY',
    paperSize: 'A4',
    taxLabel: 'GST',
    taxIdLabel: 'UEN',
    defaultTaxRate: 9,
    currencyFormat: 'standard',
  },
};

// Default fallback for any unmatched country
export const DEFAULT_LOCALIZATION: LocalizationConfig = {
  countryCode: 'US',
  countryName: 'Global',
  currency: 'USD',
  currencySymbol: '$',
  callingCode: '+1',
  dateFormat: 'MM/DD/YYYY',
  paperSize: 'LETTER',
  taxLabel: 'Tax',
  taxIdLabel: 'Tax ID',
  defaultTaxRate: 0,
  currencyFormat: 'standard',
};

/**
 * Infer Country Code from Timezone (Client-side fallback when headers absent)
 */
export function inferCountryFromTimezone(): string {
  if (typeof Intl === 'undefined' || !Intl.DateTimeFormat) return 'US';
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return 'US';
    if (tz.includes('Kolkata') || tz.includes('Calcutta') || tz.startsWith('Asia/Kolkata')) return 'IN';
    if (tz.includes('London') || tz.startsWith('Europe/London')) return 'GB';
    if (tz.includes('Berlin') || tz.includes('Frankfurt')) return 'DE';
    if (tz.includes('Paris')) return 'FR';
    if (tz.includes('Toronto') || tz.includes('Vancouver')) return 'CA';
    if (tz.includes('Sydney') || tz.includes('Melbourne')) return 'AU';
    if (tz.includes('Dubai')) return 'AE';
    if (tz.includes('Riyadh')) return 'SA';
    if (tz.includes('Singapore')) return 'SG';
    if (tz.startsWith('America/')) return 'US';
    if (tz.startsWith('Europe/')) return 'DE';
    if (tz.startsWith('Asia/')) return 'SG';
  } catch (e) {}
  return 'US';
}

/**
 * Get Localization Config for a given Country Code
 */
export function getLocalizationConfig(countryCode?: string): LocalizationConfig {
  const code = (countryCode || '').toUpperCase().trim();
  if (code && COUNTRY_LOCALIZATION_MAP[code]) {
    return COUNTRY_LOCALIZATION_MAP[code];
  }
  const inferred = inferCountryFromTimezone();
  return COUNTRY_LOCALIZATION_MAP[inferred] || DEFAULT_LOCALIZATION;
}

/**
 * Format Currency according to Local System (Lakhs, Standard Western, European decimal)
 */
export function formatLocalizedCurrency(amount: number, config: LocalizationConfig): string {
  const num = isNaN(amount) ? 0 : amount;
  
  if (config.currencyFormat === 'lakhs') {
    // Indian Numbering Format: 1,00,000.00
    const parts = num.toFixed(2).split('.');
    let lastThree = parts[0].substring(parts[0].length - 3);
    const otherNumbers = parts[0].substring(0, parts[0].length - 3);
    if (otherNumbers !== '') {
      lastThree = ',' + lastThree;
    }
    const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
    return `${config.currencySymbol}${formattedInt}.${parts[1]}`;
  } else if (config.currencyFormat === 'european') {
    // European Format: 100.000,00 €
    const formatted = num.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formatted} ${config.currencySymbol}`;
  } else {
    // Standard Western Format: $100,000.00
    const formatted = num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${config.currencySymbol}${formatted}`;
  }
}
