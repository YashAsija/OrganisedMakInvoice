with open('src/components/TemplateBuilder/LivePreview.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if skip:
        if "</div>" in line and "}" in lines[i+1] and "{" not in line:
            # this is a bit fragile, let's use exact match or line numbers.
            pass

# Let's find the exact line indices
start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if "{(invoiceData?.discountTotal > 0 || isInteractive) && (" in line:
        start_idx = i
    if start_idx != -1 and i > start_idx:
        if "</div>" in line:
            if ")}" in lines[i+1]:
                end_idx = i + 1
                break

if start_idx != -1 and end_idx != -1:
    print(f"Found discount block from line {start_idx} to {end_idx}")
    new_block = """                      {(invoiceData?.discountTotal > 0 || isInteractive) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px', color: '#e11d48' }}>
                          <span 
                            style={isInteractive ? { cursor: 'pointer', textDecoration: 'underline dashed', textUnderlineOffset: '2px' } : {}}
                            onClick={() => {
                              if (isInteractive && onUpdateField) {
                                const nextType = invoiceData?.discountType === 'none' ? 'percent' : invoiceData?.discountType === 'percent' ? 'flat' : 'none';
                                onUpdateField('discountType', nextType);
                                if (nextType === 'none') {
                                  onUpdateField('discountValue', '0');
                                }
                              }
                            }}
                            title={isInteractive ? "Click to toggle discount type (None, %, Flat)" : ""}
                          >
                            Discount {invoiceData?.discountType === 'percent' ? '(%)' : invoiceData?.discountType === 'flat' ? '(Flat)' : '(Add)'}
                          </span>
                          {invoiceData?.discountType !== 'none' && (
                            <span style={{ display: 'flex', alignItems: 'center' }}>
                              -{currencySymbol} {renderInteractive(invoiceData?.discountValue || 0, 'discountValue', 'text', 'Amount')}
                            </span>
                          )}
                        </div>
                      )}
"""
    lines[start_idx:end_idx+1] = [new_block]
    
    with open('src/components/TemplateBuilder/LivePreview.tsx', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Updated successfully")
else:
    print("Could not find block")
