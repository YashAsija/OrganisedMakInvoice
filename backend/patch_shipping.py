import sys

with open('f:/Projects/MakInvoices/OrganisedMakInvoice/frontend/src/components/InvoiceModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

s_start = content.find('Shipped To Details')
if s_start == -1:
    print('Shipped To Details not found')
    sys.exit(1)

s_end = content.find('Transport Details', s_start)
if s_end == -1:
    print('Transport Details not found')
    sys.exit(1)

def replace_shipping_input(placeholder, condition):
    global content
    
    s_start = content.find('Shipped To Details')
    s_end = content.find('Transport Details', s_start)
    
    # search within s_start and s_end
    s = content.find(f'placeholder="{placeholder}"', s_start, s_end)
    if s == -1: return False
    
    inp_start = content.rfind('<input', s_start, s)
    is_textarea = False
    if inp_start == -1:
        inp_start = content.rfind('<textarea', s_start, s)
        is_textarea = True
        
    if inp_start == -1: return False
    
    inp_end = content.find('/>', s)
    if inp_end == -1: return False
    inp_end += 2
    
    block = content[inp_start:inp_end]
    if condition in block: return True
    if 'activeTemplate.config' in content[inp_start-50:inp_start]: return True
    
    replacement = f'{{ {condition} && (\n                  {block}\n                ) }}'
    content = content[:inp_start] + replacement + content[inp_end:]
    return True

def replace_shipping_select(disabled_str, condition):
    global content
    
    s_start = content.find('Shipped To Details')
    s_end = content.find('Transport Details', s_start)
    
    s = content.find(f'<option value="" disabled>{disabled_str}</option>', s_start, s_end)
    if s == -1: return False
    
    sel_start = content.rfind('<select', s_start, s)
    if sel_start == -1: return False
    
    sel_end = content.find('</select>', s)
    if sel_end == -1: return False
    sel_end += 9
    
    block = content[sel_start:sel_end]
    if condition in block: return True
    if 'activeTemplate.config' in content[sel_start-50:sel_start]: return True
    
    replacement = f'{{ {condition} && (\n                  {block}\n                ) }}'
    content = content[:sel_start] + replacement + content[sel_end:]
    return True

replace_shipping_input('Name', "activeTemplate.config.shipping.fields.includes('name')")
replace_shipping_select('Country', "activeTemplate.config.shipping.fields.includes('country')")
replace_shipping_select('State', "activeTemplate.config.shipping.fields.includes('state')")
replace_shipping_input('Phone', "activeTemplate.config.shipping.fields.includes('phone')")
replace_shipping_input('Email', "activeTemplate.config.shipping.fields.includes('email')")
replace_shipping_input('PAN', "activeTemplate.config.shipping.fields.includes('pan')")
replace_shipping_input('GSTIN / UIN', "activeTemplate.config.shipping.fields.includes('gstin')")
replace_shipping_input('Shipping Address', "activeTemplate.config.shipping.fields.includes('address')")

with open('f:/Projects/MakInvoices/OrganisedMakInvoice/frontend/src/components/InvoiceModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Replaced shipping details')
