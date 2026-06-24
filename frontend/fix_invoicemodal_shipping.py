import re

with open(r'f:\Projects\MakInvoice\frontend\src\components\InvoiceModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add useState
content = content.replace(
    "const [shippedToPhone, setShippedToPhone] = useState('');",
    "const [shippedToPhone, setShippedToPhone] = useState('');\n  const [shippedToEmail, setShippedToEmail] = useState('');\n  const [shippedToPan, setShippedToPan] = useState('');"
)

# 2. Add to useEffect loading from invoice
content = content.replace(
    "setShippedToPhone(invoice.shippedToPhone || '');",
    "setShippedToPhone(invoice.shippedToPhone || '');\n      setShippedToEmail(invoice.shippedToEmail || '');\n      setShippedToPan(invoice.shippedToPan || '');"
)

# 3. Add to handle reset
content = content.replace(
    "setShippedToPhone('');",
    "setShippedToPhone('');\n      setShippedToEmail('');\n      setShippedToPan('');"
)

# 4. Add to handle fallback if shippingSameAsClient
content = content.replace(
    "setShippedToPhone(clientPhone);",
    "setShippedToPhone(clientPhone);\n      // Note: clientEmail and clientPan (if it exists) should be copied. MakInvoice doesn't seem to have clientPan in state, but we'll copy email.\n      setShippedToEmail(clientEmail);"
)

# 5. Add to buildTempInvoice
content = content.replace(
    "shippedToPhone: shippingSameAsClient ? undefined : (shippedToPhone.trim() || undefined),",
    "shippedToPhone: shippingSameAsClient ? undefined : (shippedToPhone.trim() || undefined),\n      shippedToEmail: shippingSameAsClient ? undefined : (shippedToEmail.trim() || undefined),\n      shippedToPan: shippingSameAsClient ? undefined : (shippedToPan.trim() || undefined),"
)

# 6. Add to onUpdateField
content = content.replace(
    "if(field==='shippedToPhone') setShippedToPhone(val);",
    "if(field==='shippedToPhone') setShippedToPhone(val);\n                    if(field==='shippedToEmail') setShippedToEmail(val);\n                    if(field==='shippedToPan') setShippedToPan(val);"
)

# 7. Add to Draft Information Form
form_insert = """<input type="text" value={shippedToPhone} onChange={e => setShippedToPhone(e.target.value)} placeholder="Phone" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none" />"""
form_replacement = form_insert + """
                <input type="email" value={shippedToEmail} onChange={e => setShippedToEmail(e.target.value)} placeholder="Email" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none" />
                <input type="text" value={shippedToPan} onChange={e => setShippedToPan(e.target.value)} placeholder="PAN" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none" />"""

content = content.replace(form_insert, form_replacement)

with open(r'f:\Projects\MakInvoice\frontend\src\components\InvoiceModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched InvoiceModal.tsx successfully")
