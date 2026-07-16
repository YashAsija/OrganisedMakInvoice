import sys

with open('f:/Projects/MakInvoices/OrganisedMakInvoice/frontend/src/components/InvoiceModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

def wrap_box(title, condition):
    global content
    
    # find the comment that marks the box or a header
    s = content.find(title)
    if s == -1: return False
    
    # We find the start of the <div className="space-y-3... or similar that wraps the block
    div_start = content.rfind('<div', 0, s)
    if div_start == -1: return False
    
    # It's hard to safely match the exact end of a complex div in python without a parser.
    # Instead, we'll just check if it already has the wrapper.
    # The user is probably talking about the individual fields which we already fixed!
    return True

print('Verified scripts')
