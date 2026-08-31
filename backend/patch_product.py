import sys

with open('f:/Projects/MakInvoices/OrganisedMakInvoice/frontend/src/components/InvoiceModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

def replace_div(placeholder, condition):
    global content
    s = content.find(placeholder)
    if s == -1: return False
    div_start = content.rfind('<div', 0, s)
    if div_start == -1: return False
    div_end = content.find('</div>', s)
    if div_end == -1: return False
    div_end += 6
    
    block = content[div_start:div_end]
    if condition in block: return True 
    
    replacement = f'{{ {condition} && (\n                {block}\n              ) }}'
    content = content[:div_start] + replacement + content[div_end:]
    return True

replace_div('id="custom-item-hsn"', "activeTemplate.config.table.columns.some(c => c.id === 'hsn' && c.visible !== false)")
replace_div('id="custom-item-size"', "activeTemplate.config.table.columns.some(c => c.id === 'size' && c.visible !== false)")
replace_div('id="custom-item-type"', "activeTemplate.config.table.columns.some(c => c.id === 'type' && c.visible !== false)")
replace_div('id="custom-item-discount"', "activeTemplate.config.tax.showDiscount")
replace_div('id="custom-item-terms"', "activeTemplate.config.table.columns.some(c => c.id === 'terms' && c.visible !== false)")

with open('f:/Projects/MakInvoices/OrganisedMakInvoice/frontend/src/components/InvoiceModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Replaced product table details')
