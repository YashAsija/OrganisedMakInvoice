import re
with open('src/components/InvoiceModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Import defaultTemplates
if 'import { defaultTemplates }' not in content:
    content = content.replace('import { LivePreview } from './TemplateBuilder/LivePreview';', 'import { LivePreview } from './TemplateBuilder/LivePreview';\nimport { defaultTemplates } from '../data/defaultTemplates';')

# 2. Remove old dynamicLocalization blocks
content = re.sub(r'  const dynamicLocalization = React\.useMemo\(\(\) => \{[\s\S]*?\}, \[.*?\]\);\s*const currencySymbol = dynamicLocalization\.symbol;', '', content)
content = re.sub(r'  const dynamicLocalization = React\.useMemo\(\(\) => \{[\s\S]*?\}, \[.*?\]\);', '', content)

# 3. Add dynamicLocalization and activeTemplate just before liveInvoiceData
new_code = '''
  const activeTemplate = defaultTemplates.find(t => t.id === selectedTemplateStyle) || defaultTemplates[0];

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

  const currencySymbol = dynamicLocalization.symbol;
'''
if 'const activeTemplate = defaultTemplates' not in content:
    content = content.replace('  const liveInvoiceData: any = {', new_code + '\n  const liveInvoiceData: any = {')

# 4. Fix LivePreview props
content = content.replace('onUpdateItem={(id, field, val) => {', 'onUpdateItemField={(id, field, val) => {')
content = content.replace('onRemoveItem={(id) => {', 'onInteractiveRemoveItem={(id) => {')
content = content.replace('onAddItem={() => {', 'onInteractiveAddItem={() => {')

with open('src/components/InvoiceModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('TSC fixed!')
