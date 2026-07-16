import re

with open('src/components/InvoiceModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "activeTemplate.config.client?.fields.includes('address') || activeTemplate.config.client?.fields.includes('country') &&",
    "(activeTemplate.config.client?.fields.includes('address') || activeTemplate.config.client?.fields.includes('country')) &&"
)

content = content.replace(
    "activeTemplate.config.client?.fields.includes('address') || activeTemplate.config.client?.fields.includes('state') &&",
    "(activeTemplate.config.client?.fields.includes('address') || activeTemplate.config.client?.fields.includes('state')) &&"
)

content = content.replace(
    "activeTemplate.config.shipping?.fields.includes('address') || activeTemplate.config.shipping?.fields.includes('country') &&",
    "(activeTemplate.config.shipping?.fields.includes('address') || activeTemplate.config.shipping?.fields.includes('country')) &&"
)

content = content.replace(
    "activeTemplate.config.shipping?.fields.includes('address') || activeTemplate.config.shipping?.fields.includes('state') &&",
    "(activeTemplate.config.shipping?.fields.includes('address') || activeTemplate.config.shipping?.fields.includes('state')) &&"
)

with open('src/components/InvoiceModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed operator precedence")
