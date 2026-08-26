import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TEMPLATE_PRESETS } from '../../../../lib/templatePresets';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Helper: derive currency code from symbol (mirrors App.tsx logic)
const deriveCurrencyCode = (sym: string | null | undefined, fallback: string): string => {
  if (!sym) return fallback;
  const symToCode: Record<string, string> = {
    '₹': 'INR', '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY',
    'C$': 'CAD', 'A$': 'AUD', 'Fr': 'CHF', 'HK$': 'HKD', 'S$': 'SGD',
    'NZ$': 'NZD', '₩': 'KRW', 'R$': 'BRL', '₽': 'RUB', 'R': 'ZAR',
    '₺': 'TRY', 'kr': 'SEK', 'zł': 'PLN', '฿': 'THB', 'Rp': 'IDR',
    'RM': 'MYR', '₱': 'PHP', '₫': 'VND', '₦': 'NGN', '₪': 'ILS',
    'Kč': 'CZK', 'Ft': 'HUF', '₴': 'UAH', '₾': 'GEL', '₸': 'KZT',
    'NT$': 'TWD', '₵': 'GHS', 'KSh': 'KES', '₼': 'AZN',
    '﷼': 'SAR', 'د.إ': 'AED', '₮': 'MNT',
  };
  return symToCode[sym] || fallback;
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing invoice id' }, { status: 400 });
    }

    const client = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // 1. Fetch the invoice (bypasses RLS with service role; or uses public-read policy with anon key)
    const { data: invoice, error: invoiceError } = await client
      .from('invoices')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (invoiceError) {
      console.error('[invoice-preview] Supabase select error:', invoiceError);
      return NextResponse.json({ error: invoiceError.message }, { status: 500 });
    }

    if (!invoice) {
      console.error(`[invoice-preview] Invoice not found or not public for id=${id}`);
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Restore embeddedTemplate from selectedTemplateStyle column if present
    if (invoice.selectedTemplateStyle && invoice.selectedTemplateStyle.startsWith('{')) {
      try {
        const embeddedTemplate = JSON.parse(invoice.selectedTemplateStyle);
        invoice.embeddedTemplate = embeddedTemplate;
        for (const key of Object.keys(embeddedTemplate)) {
          if (embeddedTemplate[key] !== undefined && embeddedTemplate[key] !== null) {
            (invoice as any)[key] = embeddedTemplate[key];
          }
        }
      } catch (e) {}
    } else if (invoice.selectedTemplateStyle) {
      const preset = TEMPLATE_PRESETS.find(t => t.id === invoice.selectedTemplateStyle);
      if (preset) {
        invoice.embeddedTemplate = preset;
      }
    }

    // 2. Fetch business profile of the owner
    let profile = null;
    const userId = invoice.userId;

    if (userId && userId !== 'local') {
      try {
        const { data: cloudProf } = await client
          .from('users')
          .select('*')
          .eq('uid', userId)
          .maybeSingle();

        const { data: companySettings } = await client
          .from('company_settings')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (cloudProf || companySettings) {
          const baseProf = cloudProf || {};
          profile = companySettings ? {
            ...baseProf,
            uid: userId,
            name: companySettings.business_name || baseProf.name || '',
            displayName: companySettings.owner_name || baseProf.displayName || '',
            ownerName: companySettings.owner_name || baseProf.ownerName || '',
            email: companySettings.email || baseProf.email || '',
            phone: companySettings.mobile || baseProf.phone || '',
            mobile: companySettings.mobile || '',
            address: companySettings.address || baseProf.address || '',
            taxId: companySettings.gstin || baseProf.taxId || '',
            pan: companySettings.pan || baseProf.pan || '',
            logoUrl: companySettings.logo_url || baseProf.logoUrl || '',
            signature: companySettings.signature_url || baseProf.signature || '',
            country: companySettings.country || baseProf.country || '',
            state: companySettings.state || baseProf.state || '',
            stateCode: companySettings.state_code || baseProf.stateCode || '',
            currency: companySettings.currency || deriveCurrencyCode(companySettings.currency_symbol, baseProf.currency || 'INR'),
            currencySymbol: companySettings.currency_symbol || baseProf.currencySymbol || '',
            taxMode: companySettings.tax_mode || baseProf.taxMode || 'dynamic',
            customTaxName: companySettings.custom_tax_name || baseProf.customTaxName || 'Tax',
            customTaxPercentage: companySettings.custom_tax_percentage !== undefined ? companySettings.custom_tax_percentage : baseProf.customTaxPercentage,
            defaultTaxRate: companySettings.default_tax_rate !== undefined ? companySettings.default_tax_rate : (baseProf.defaultTaxRate || 18),
            bankName: companySettings.bank_name || baseProf.bankName || '',
            accountNumber: companySettings.account_number || baseProf.accountNumber || '',
            ifsc: companySettings.ifsc || baseProf.ifsc || '',
            upiId: companySettings.upi_id || baseProf.upiId || '',
            invoicePrefix: companySettings.invoice_prefix || baseProf.invoicePrefix || 'INV',
            startingInvoiceNumber: companySettings.starting_invoice_number || baseProf.startingInvoiceNumber || '1',
            defaultNotes: companySettings.default_notes || baseProf.defaultNotes || '',
            defaultTerms: companySettings.default_terms || baseProf.defaultTerms || '',
          } : cloudProf;
        }
      } catch (err) {
        console.error('[invoice-preview] Error resolving profile:', err);
      }
    }

    return NextResponse.json({ invoice, profile });
  } catch (err) {
    console.error('[invoice-preview] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
