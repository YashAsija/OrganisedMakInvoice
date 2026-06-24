import re

with open(r'f:\Projects\MakInvoice\frontend\src\components\TemplateBuilder\LivePreview.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# First block:
block1_old = """                    {config.shipping.sameAsBilling ? (
                       <div className="text-[12px] font-medium text-slate-500 italic mt-1 w-full">Same as Billing Address</div>
                    ) : (
                      <>"""
block1_new = """                      <>"""
content = content.replace(block1_old, block1_new)

# First block closing:
block1_end_old = """                      </>
                    )}"""
block1_end_new = """                      </>"""
content = content.replace(block1_end_old, block1_end_new)

# Second block:
block2_old = """                 {config.shipping.sameAsBilling ? (
                    <p style={{ fontSize: '12px', margin: '2px 0', fontStyle: 'italic', color: '#94a3b8' }}>Same as Billing Address</p>
                 ) : (
                   <>"""
block2_new = """                   <>"""
content = content.replace(block2_old, block2_new)

# Second block closing:
block2_end_old = """                   </>
                 )}"""
block2_end_new = """                   </>"""
content = content.replace(block2_end_old, block2_end_new)

with open(r'f:\Projects\MakInvoice\frontend\src\components\TemplateBuilder\LivePreview.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Removed sameAsBilling branching from LivePreview.tsx successfully")
