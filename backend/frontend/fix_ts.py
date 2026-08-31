with open('src/components/TemplateBuilder/LivePreview.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "{(invoiceData?.discountTotal > 0 || isInteractive) && (",
    "{((invoiceData?.discountTotal || 0) > 0 || isInteractive) && ("
)

with open('src/components/TemplateBuilder/LivePreview.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated TypeScript error")
