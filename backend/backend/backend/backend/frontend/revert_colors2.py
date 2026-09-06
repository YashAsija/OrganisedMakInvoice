with open('src/components/BusinessProfileModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('bg-[#5C5043]/40', 'bg-slate-950/40')
content = content.replace('bg-[#5C5043]/30', 'bg-slate-950/30')
content = content.replace('accent-[#8C7A6B]', 'accent-sky-600')
content = content.replace('hover:border-[#8C7A6B]', 'hover:border-sky-500')
content = content.replace('border-[#8C7A6B]', 'border-sky-600')

with open('src/components/BusinessProfileModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Reverted remaining colors")
