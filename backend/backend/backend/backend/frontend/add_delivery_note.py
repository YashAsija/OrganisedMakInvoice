import re

with open('src/components/InvoiceModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. State variable
content = content.replace(
    "const [poNumber, setPoNumber] = useState('');",
    "const [poNumber, setPoNumber] = useState('');\n    const [deliveryNote, setDeliveryNote] = useState('');"
)

# 2. Reset logic in useEffect
content = content.replace(
    "setPoNumber(invoice.poNumber || '');",
    "setPoNumber(invoice.poNumber || '');\n        setDeliveryNote((invoice as any).deliveryNote || '');"
)

content = content.replace(
    "setPoNumber('');",
    "setPoNumber('');\n        setDeliveryNote('');"
)

# 3. form submission
content = content.replace(
    "poNumber: poNumber.trim() || undefined,",
    "poNumber: poNumber.trim() || undefined,\n        deliveryNote: deliveryNote.trim() || undefined,"
)

# 4. LiveInvoiceData useMemo
content = content.replace(
    "poNumber, referenceNumber, invoiceType",
    "poNumber, deliveryNote, referenceNumber, invoiceType"
)

# 5. JSX input field insertion (next to poNumber)
input_block = """              { activeTemplate.config.invoiceInfo?.fields.includes('poNumber') && (
              <div>
                <label htmlFor="inv-po" className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">P.O. Number (Optional)</label>
                <input 
                  id="inv-po"
                  type="text" 
                  placeholder="PO-883"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white font-mono text-xs focus:outline-none"
                />
              </div>
              ) }"""

new_input_block = input_block + """
              { activeTemplate.config.invoiceInfo?.fields.includes('deliveryNote') && (
              <div>
                <label htmlFor="inv-dn" className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Delivery Note (Optional)</label>
                <input 
                  id="inv-dn"
                  type="text" 
                  placeholder="DN-102"
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white font-mono text-xs focus:outline-none"
                />
              </div>
              ) }"""

content = content.replace(input_block, new_input_block)

# 6. interactive event handler
content = content.replace(
    "if(field==='poNumber') setPoNumber(val);",
    "if(field==='poNumber') setPoNumber(val);\n                       if(field==='deliveryNote') setDeliveryNote(val);"
)

with open('src/components/InvoiceModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Added deliveryNote to InvoiceModal.tsx")
