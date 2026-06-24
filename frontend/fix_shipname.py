import re

with open(r'f:\Projects\MakInvoice\frontend\src\components\TemplateBuilder\LivePreview.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix shipName extraction
content = content.replace(
    'const shipName = (invoiceData as any)?.shippingName || clientName;',
    'const shipName = (invoiceData as any)?.shippedToName || clientName;'
)

# Fix shipName inline in line 543
content = content.replace(
    '{(invoiceData as any)?.shippingName || clientName}',
    '{renderInteractive((invoiceData as any)?.shippedToName || clientName, "shippedToName")}'
)

# Fix clientName inline in line 443 where it wasn't interactive
content = content.replace(
    '{isAdjacent ? clientName : <><span className="text-gray-500 font-medium mr-1">Name:</span><span className="text-gray-900 font-bold">{renderInteractive(clientName, \'clientName\')}</span></>}',
    '{isAdjacent ? renderInteractive(clientName, \'clientName\') : <><span className="text-gray-500 font-medium mr-1">Name:</span><span className="text-gray-900 font-bold">{renderInteractive(clientName, \'clientName\')}</span></>}'
)

# Also fix the shipName header if it isn't interactive
content = content.replace(
    '<h3 style={{ fontWeight: \'bold\', fontSize: \'14px\', color: \'#1e293b\' }}>{shipName}</h3>',
    '<h3 style={{ fontWeight: \'bold\', fontSize: \'14px\', color: \'#1e293b\' }}>{renderInteractive(shipName, \'shippedToName\')}</h3>'
)

with open(r'f:\Projects\MakInvoice\frontend\src\components\TemplateBuilder\LivePreview.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched LivePreview.tsx successfully")
