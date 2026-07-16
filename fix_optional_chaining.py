import sys

with open('f:/Projects/MakInvoices/OrganisedMakInvoice/frontend/src/components/InvoiceModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix optional chaining for safety
content = content.replace("activeTemplate.config.transport.fields", "activeTemplate.config.transport?.fields")
content = content.replace("activeTemplate.config.shipping.fields", "activeTemplate.config.shipping?.fields")
content = content.replace("activeTemplate.config.client.fields", "activeTemplate.config.client?.fields")
content = content.replace("activeTemplate.config.invoiceInfo.fields", "activeTemplate.config.invoiceInfo?.fields")

with open('f:/Projects/MakInvoices/OrganisedMakInvoice/frontend/src/components/InvoiceModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed optional chaining')
