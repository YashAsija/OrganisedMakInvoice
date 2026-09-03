with open('src/components/TemplateBuilder/LivePreview.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re

old_str = "const grandTotal = isTaxPresent\n    ? (invoiceData?.grandTotal !== undefined ? invoiceData.grandTotal : subTotal + taxAmount)\n    : subTotal;"
new_str = "const grandTotal = invoiceData?.grandTotal !== undefined\n    ? invoiceData.grandTotal\n    : Math.max(0, subTotal - (invoiceData?.discountTotal || 0) + (isTaxPresent ? taxAmount : 0));"

if old_str in content:
    content = content.replace(old_str, new_str)
else:
    # try regex because of whitespace
    content = re.sub(
        r"const grandTotal = isTaxPresent\s*\?\s*\(invoiceData\?\.grandTotal !== undefined \? invoiceData\.grandTotal : subTotal \+ taxAmount\)\s*:\s*subTotal;",
        "const grandTotal = invoiceData?.grandTotal !== undefined ? invoiceData.grandTotal : Math.max(0, subTotal - (invoiceData?.discountTotal || 0) + (isTaxPresent ? taxAmount : 0));",
        content
    )

with open('src/components/TemplateBuilder/LivePreview.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated grandTotal logic")
