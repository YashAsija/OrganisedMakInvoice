import re
with open('src/components/InvoiceModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to find where activeTemplate and dynamicLocalization are defined (around line 790)
# and move them above handleDirectExportPDF (around line 700)

code_to_move = '''  const activeTemplate = TEMPLATE_PRESETS.find(t => t.id === selectedTemplateStyle) || TEMPLATE_PRESETS[0];

  const dynamicLocalization = React.useMemo(() => {
    const activeShippedToCountry = shippingSameAsClient ? undefined : shippedToCountry;
    const targetCountry = (activeShippedToCountry || clientCountry || '').trim().toLowerCase() || 'india';
    if (targetCountry === 'india' || targetCountry === 'in') return { symbol: '₹', format: 'Indian' as 'Indian' | 'International' };
    if (targetCountry === 'united states' || targetCountry === 'us' || targetCountry === 'usa') return { symbol: '$', format: 'International' as 'Indian' | 'International' };
    if (targetCountry === 'united kingdom' || targetCountry === 'uk') return { symbol: '£', format: 'International' as 'Indian' | 'International' };
    if (targetCountry === 'europe' || targetCountry === 'eu' || targetCountry === 'germany' || targetCountry === 'france' || targetCountry === 'italy' || targetCountry === 'spain') return { symbol: '€', format: 'International' as 'Indian' | 'International' };
    if (targetCountry === 'united arab emirates' || targetCountry === 'uae' || targetCountry === 'dubai') return { symbol: 'AED ', format: 'International' as 'Indian' | 'International' };
    if (targetCountry === 'canada' || targetCountry === 'ca') return { symbol: 'CAD ', format: 'International' as 'Indian' | 'International' };
    if (targetCountry === 'australia' || targetCountry === 'au') return { symbol: 'AUD ', format: 'International' as 'Indian' | 'International' };
    return { symbol: defaultCurrencySymbol, format: 'International' as 'Indian' | 'International' };
  }, [shippingSameAsClient, shippedToCountry, clientCountry, defaultCurrencySymbol]);

  const currencySymbol = dynamicLocalization.symbol;'''

if code_to_move in content:
    content = content.replace(code_to_move, '')
    content = content.replace('  const handleDirectExportPDF = () => {', code_to_move + '\n\n  const handleDirectExportPDF = () => {')

# Also fix exportInvoicePDF call
content = content.replace('exportInvoicePDF(tempInvoice, profile);', 'exportInvoicePDF(tempInvoice, profile, \\'save\\', activeTemplate);')

with open('src/components/InvoiceModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Export fixed!')
