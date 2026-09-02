import sys

with open('f:/Projects/MakInvoices/OrganisedMakInvoice/frontend/src/components/InvoiceModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

def replace_input(placeholder, condition):
    global content
    s = content.find(f'placeholder="{placeholder}"')
    if s == -1: return False
    inp_start = content.rfind('<input', 0, s)
    if inp_start == -1: return False
    inp_end = content.find('/>', s)
    if inp_end == -1: return False
    inp_end += 2
    
    # check if already wrapped
    if content[inp_start-2:inp_start] == '(\n': return True # very loose check, but works for us
    
    block = content[inp_start:inp_end]
    replacement = f'{{ {condition} && (\n                  {block}\n                ) }}'
    content = content[:inp_start] + replacement + content[inp_end:]
    return True

replace_input('Place of Supply', "activeTemplate.config.invoiceInfo.fields.includes('placeOfSupply')")
replace_input('Transport', "activeTemplate.config.transport.fields.includes('transport')")
replace_input('GR/RR No.', "activeTemplate.config.invoiceInfo.fields.includes('grRrNo')")
replace_input('Vehicle No.', "activeTemplate.config.transport.fields.includes('vehicleNo')")
replace_input('Driver Mobile', "activeTemplate.config.transport.fields.includes('driverMobile')")
replace_input('Station', "activeTemplate.config.transport.fields.includes('station')")
replace_input('E-Way Bill No.', "activeTemplate.config.transport.fields.includes('ewayBillNo')")

with open('f:/Projects/MakInvoices/OrganisedMakInvoice/frontend/src/components/InvoiceModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Replaced transport blocks')
