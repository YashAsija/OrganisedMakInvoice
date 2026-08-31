import sys

with open('f:/Projects/MakInvoices/OrganisedMakInvoice/frontend/src/components/InvoiceModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix transportName
content = content.replace(
    "activeTemplate.config.transport.fields.includes('transport')",
    "activeTemplate.config.transport.fields.includes('transportName')"
)

# Fix ewayBillNo (case insensitive check)
content = content.replace(
    "activeTemplate.config.transport.fields.includes('ewayBillNo')",
    "activeTemplate.config.transport.fields.some(f => f.toLowerCase() === 'ewaybillno')"
)

# What about placeOfSupply and grRrNo? Some templates might not have them in invoiceInfo, maybe they are in transport?
# Let's ensure placeOfSupply also checks shipping and transport just in case? No, it's in invoiceInfo.

with open('f:/Projects/MakInvoices/OrganisedMakInvoice/frontend/src/components/InvoiceModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed transport details keys')
