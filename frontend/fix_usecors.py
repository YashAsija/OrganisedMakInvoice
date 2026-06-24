import re
with open('src/lib/pdfExporter.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('useCORS: true', '')
content = content.replace(',  }', ' }')

with open('src/lib/pdfExporter.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print('useCORS fixed!')
