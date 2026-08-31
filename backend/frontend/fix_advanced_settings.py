import re

with open('src/components/InvoiceModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Client Country
content = re.sub(
    r"activeTemplate\.config\.client\?\.fields\.includes\('country'\)",
    "activeTemplate.config.client?.fields.includes('address') || activeTemplate.config.client?.fields.includes('country')",
    content
)

# Client State
content = re.sub(
    r"activeTemplate\.config\.client\?\.fields\.includes\('state'\)",
    "activeTemplate.config.client?.fields.includes('address') || activeTemplate.config.client?.fields.includes('state')",
    content
)

# Shipping Country
content = re.sub(
    r"activeTemplate\.config\.shipping\?\.fields\.includes\('country'\)",
    "activeTemplate.config.shipping?.fields.includes('address') || activeTemplate.config.shipping?.fields.includes('country')",
    content
)

# Shipping State
content = re.sub(
    r"activeTemplate\.config\.shipping\?\.fields\.includes\('state'\)",
    "activeTemplate.config.shipping?.fields.includes('address') || activeTemplate.config.shipping?.fields.includes('state')",
    content
)

with open('src/components/InvoiceModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated visibility conditions in InvoiceModal.tsx")
