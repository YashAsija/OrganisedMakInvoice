import re

with open(r'f:\Projects\MakInvoice\frontend\src\components\TemplateBuilder\LivePreview.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add extraction of shipEmail and shipPan
content = content.replace(
    'const shipPhone = (invoiceData as any)?.shippedToPhone || clientPhone;',
    'const shipPhone = (invoiceData as any)?.shippedToPhone || clientPhone;\n              const shipEmail = (invoiceData as any)?.shippedToEmail || clientEmail;\n              const shipPan = (invoiceData as any)?.shippedToPan || (invoiceData as any)?.clientPan || "N/A";'
)

# Render in the 'isAdjacent' shipping section (around line 510)
# We need to insert after the phone block.
phone_block_1 = """{config.shipping.fields.includes('phone') && (
                            isAdjacent ? <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">Party Mobile No</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive(shipPhone, 'shippedToPhone')}</span></div> :
                            <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">Mobile No:</span><span className="text-gray-900 font-bold">{renderInteractive(shipPhone, 'shippedToPhone')}</span></div>
                        )}"""

replacement_1 = phone_block_1 + """
                        {config.shipping.fields.includes('email') && (
                            isAdjacent ? <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">Email ID</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive(shipEmail, 'shippedToEmail')}</span></div> :
                            <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">Email:</span><span className="text-gray-900 font-bold">{renderInteractive(shipEmail, 'shippedToEmail')}</span></div>
                        )}
                        {config.shipping.fields.includes('pan') && (
                            isAdjacent ? <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">PAN</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderInteractive(shipPan, 'shippedToPan')}</span></div> :
                            <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">PAN:</span><span className="text-gray-900 font-bold">{renderInteractive(shipPan, 'shippedToPan')}</span></div>
                        )}"""

content = content.replace(phone_block_1, replacement_1)

# Render in the standard shipping section (around line 546)
phone_block_2 = """{config.shipping.fields.includes('phone') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Phone:</strong> {(invoiceData as any)?.shippedToPhone || clientPhone}</p>}"""

replacement_2 = phone_block_2 + """
                     {config.shipping.fields.includes('email') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Email:</strong> {renderInteractive(shipEmail, 'shippedToEmail')}</p>}
                     {config.shipping.fields.includes('pan') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>PAN:</strong> {renderInteractive(shipPan, 'shippedToPan')}</p>}"""

content = content.replace(phone_block_2, replacement_2)

# Oh wait, previously we changed `shippingPhone` to `shippedToPhone` but I haven't executed the previous script to fix inline phone to renderInteractive!
# Wait, the user asked to make EVERYTHING in ship-to interactive.
# I'll replace the block to ensure it's fully interactive.
phone_block_2_old = """{config.shipping.fields.includes('phone') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Phone:</strong> {(invoiceData as any)?.shippingPhone || clientPhone}</p>}"""

replacement_2_old = """{config.shipping.fields.includes('phone') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Phone:</strong> {renderInteractive(shipPhone, 'shippedToPhone')}</p>}
                     {config.shipping.fields.includes('email') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Email:</strong> {renderInteractive(shipEmail, 'shippedToEmail')}</p>}
                     {config.shipping.fields.includes('pan') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>PAN:</strong> {renderInteractive(shipPan, 'shippedToPan')}</p>}"""

content = content.replace(phone_block_2_old, replacement_2_old)

# Address block interactive
addr_block_old = """{config.shipping.fields.includes('address') && <p style={{ fontSize: '12px', margin: '2px 0', whiteSpace: 'pre-wrap' }}>{(invoiceData as any)?.shippingAddress || clientAddr}</p>}"""
addr_block_new = """{config.shipping.fields.includes('address') && <p style={{ fontSize: '12px', margin: '2px 0', whiteSpace: 'pre-wrap' }}>{renderInteractive(shipAddr, 'shippedToAddress', 'textarea')}</p>}"""
content = content.replace(addr_block_old, addr_block_new)

# GSTIN block interactive
gstin_block_old = """{config.shipping.fields.includes('gstin') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>GSTIN:</strong> {(invoiceData as any)?.shippingGstin || clientGst}</p>}"""
gstin_block_new = """{config.shipping.fields.includes('gstin') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>GSTIN:</strong> {renderInteractive(shipGst, 'shippedToGstin')}</p>}"""
content = content.replace(gstin_block_old, gstin_block_new)


with open(r'f:\Projects\MakInvoice\frontend\src\components\TemplateBuilder\LivePreview.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched LivePreview.tsx successfully")
