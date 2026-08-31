import sys

with open('f:/Projects/MakInvoices/OrganisedMakInvoice/frontend/src/components/InvoiceModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

def replace_block(start_marker, end_marker, condition):
    global content
    s = content.find(start_marker)
    if s == -1: return False
    div_start = content.rfind('<div', 0, s)
    if div_start == -1: return False
    e = content.find(end_marker, s)
    if e == -1: return False
    div_end = content.find('</div>', e)
    if div_end == -1: return False
    div_end += 6
    block = content[div_start:div_end]
    if condition in block: return True
    replacement = f'{{ {condition} && (\n{block}\n) }}'
    content = content[:div_start] + replacement + content[div_end:]
    return True

replace_block('htmlFor="inv-ref"', 'id="inv-ref"', "activeTemplate.config.invoiceInfo.fields.includes('referenceNumber')")
replace_block('htmlFor="inv-date"', 'id="inv-date"', "activeTemplate.config.invoiceInfo.fields.includes('invoiceDate')")
replace_block('htmlFor="inv-due"', 'id="inv-due"', "activeTemplate.config.invoiceInfo.fields.includes('dueDate')")

replace_block('htmlFor="col-client-email"', 'id="col-client-email"', "activeTemplate.config.client.fields.includes('email')")
replace_block('htmlFor="col-client-phone"', 'id="col-client-phone"', "activeTemplate.config.client.fields.includes('phone')")
replace_block('htmlFor="col-client-address"', 'id="col-client-address"', "activeTemplate.config.client.fields.includes('address')")
replace_block('htmlFor="client-country"', 'id="client-country"', "activeTemplate.config.client.fields.includes('country')")
replace_block('htmlFor="client-state"', 'id="client-state"', "activeTemplate.config.client.fields.includes('state')")
replace_block('htmlFor="col-client-gstin"', 'id="col-client-gstin"', "activeTemplate.config.client.fields.includes('gstin')")
replace_block('htmlFor="col-client-pan"', 'id="col-client-pan"', "activeTemplate.config.client.fields.includes('pan')")

replace_block('htmlFor="col-shipped-email"', 'id="col-shipped-email"', "activeTemplate.config.shipping.fields.includes('email')")
replace_block('htmlFor="col-shipped-phone"', 'id="col-shipped-phone"', "activeTemplate.config.shipping.fields.includes('phone')")
replace_block('htmlFor="col-shipped-address"', 'id="col-shipped-address"', "activeTemplate.config.shipping.fields.includes('address')")
replace_block('htmlFor="shipped-country"', 'id="shipped-country"', "activeTemplate.config.shipping.fields.includes('country')")
replace_block('htmlFor="shipped-state"', 'id="shipped-state"', "activeTemplate.config.shipping.fields.includes('state')")
replace_block('htmlFor="col-shipped-gstin"', 'id="col-shipped-gstin"', "activeTemplate.config.shipping.fields.includes('gstin')")
replace_block('htmlFor="col-shipped-pan"', 'id="col-shipped-pan"', "activeTemplate.config.shipping.fields.includes('pan')")

with open('f:/Projects/MakInvoices/OrganisedMakInvoice/frontend/src/components/InvoiceModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Replaced blocks')
