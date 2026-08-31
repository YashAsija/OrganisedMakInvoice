import re

with open('src/components/BusinessProfileModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Backgrounds
content = content.replace('bg-[#8C7A6B]', 'bg-sky-600')
content = content.replace('hover:bg-[#5C5043]', 'hover:bg-sky-500')
content = content.replace('bg-[#FCFAF7]', 'bg-slate-50')
content = content.replace('bg-[#f8fafc]', 'bg-slate-100')
content = content.replace('shadow-[#8C7A6B]/20', 'shadow-sky-900/20')

# Borders
content = content.replace('border-[#e2e8f0]', 'border-slate-200')
content = content.replace('focus:border-[#8C7A6B]', 'focus:border-sky-500')
content = content.replace('focus:ring-[#8C7A6B]/10', 'focus:ring-sky-500/10')

# Text colors
content = content.replace('text-[#8C7A6B]', 'text-sky-600')
content = content.replace('hover:text-[#5C5043]', 'hover:text-slate-800')
content = content.replace('text-[#5C5043]', 'text-slate-800')

with open('src/components/BusinessProfileModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Reverted colors")
