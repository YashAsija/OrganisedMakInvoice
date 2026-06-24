import re
with open('src/components/TemplateBuilder/LivePreview.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1
content = content.replace('</>\n                    {config.client.fields.includes(\'gstin\')', '</>\n                    )}\n                    {config.client.fields.includes(\'gstin\')')

# Fix 2
content = content.replace('</>\n                    {config.tax.showIgst', '</>\n                    )}\n                    {config.tax.showIgst')

with open('src/components/TemplateBuilder/LivePreview.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Syntax fixed')
