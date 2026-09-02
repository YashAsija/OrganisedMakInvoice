import sys

with open('f:/Projects/MakInvoices/OrganisedMakInvoice/frontend/src/components/InvoiceModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove placeOfSupply from Transport Details
p_supply = """                  { activeTemplate.config.invoiceInfo?.fields?.includes('placeOfSupply') && (
                    <input type="text" value={placeOfSupply} onChange={e => setPlaceOfSupply(e.target.value)} placeholder="Place of Supply" className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 dark:text-white text-[13px] text-slate-800 font-medium focus:outline-none" />
                  ) }
"""
content = content.replace(p_supply, "")

# Remove grRrNo from Transport Details
g_rr = """                  { activeTemplate.config.invoiceInfo?.fields?.includes('grRrNo') && (
                    <input type="text" value={grRrNo} onChange={e => setGrRrNo(e.target.value)} placeholder="GR/RR No." className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 dark:text-white text-[13px] text-slate-800 font-medium focus:outline-none" />
                  ) }
"""
content = content.replace(g_rr, "")

# Add them to General Metadata, above the payment link URL block
insertion = """            <div className="border-t border-slate-150 dark:border-slate-900/50 pt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              { activeTemplate.config.invoiceInfo?.fields?.includes('placeOfSupply') && (
                <div>
                  <label htmlFor="inv-pos" className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Place of Supply</label>
                  <input id="inv-pos" type="text" value={placeOfSupply} onChange={e => setPlaceOfSupply(e.target.value)} placeholder="Place of Supply" className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:outline-none" />
                </div>
              ) }
              { activeTemplate.config.invoiceInfo?.fields?.includes('grRrNo') && (
                <div>
                  <label htmlFor="inv-gr" className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">GR/RR No.</label>
                  <input id="inv-gr" type="text" value={grRrNo} onChange={e => setGrRrNo(e.target.value)} placeholder="GR/RR No." className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:outline-none" />
                </div>
              ) }
            </div>

            <div className="border-t border-slate-150 dark:border-slate-900/50 pt-2.5">
"""

content = content.replace('            <div className="border-t border-slate-150 dark:border-slate-900/50 pt-2.5">\n              <label htmlFor="inv-qr"', insertion + '              <label htmlFor="inv-qr"')

with open('f:/Projects/MakInvoices/OrganisedMakInvoice/frontend/src/components/InvoiceModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Moved placeOfSupply and grRrNo')
