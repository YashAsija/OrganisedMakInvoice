with open('src/components/TemplateBuilder/LivePreview.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# The discount block is currently inside enableTaxBreakdown.
# We need to move it OUTSIDE enableTaxBreakdown so it shows for every template.

# The key structure is:
# <div id="section-taxEngine">
#   {config.tax.enableTaxBreakdown && (
#     <div>
#       {showTaxableAmount && ...}
#       {discount block}
#       {tax rows}
#       {grand total row}
#     </div>
#   )}
# </div>

# We'll restructure it to:
# <div id="section-taxEngine">
#   {discount always visible block}
#   {config.tax.enableTaxBreakdown && (
#     <div>
#       {showTaxableAmount && ...}
#       {tax rows}
#       {grand total row}
#     </div>
#   )}
#   {!config.tax.enableTaxBreakdown && grandTotal simple row if needed}
# </div>

DISCOUNT_BLOCK = """                      {((invoiceData?.discountTotal || 0) > 0 || isInteractive) && (
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
                        )}"""

# OLD: discount block is INSIDE enableTaxBreakdown
old_section = """              return (
                <div id="section-taxEngine" key="taxEngine" style={getSectionStyle('taxEngine')}>
                  {config.tax.enableTaxBreakdown && (
                    <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: getBorderRadius(), border: '1px solid #e2e8f0', width: '100%' }}>
                      {config.tax.showTaxableAmount && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}><span>Taxable Amount:</span> <span>{currencySymbol} {subTotal.toFixed(2)}</span></div>}
                        {((invoiceData?.discountTotal || 0) > 0 || isInteractive) && (
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
                        )}"""

new_section = """              return (
                <div id="section-taxEngine" key="taxEngine" style={getSectionStyle('taxEngine')}>
                  {/* Discount row - always visible for every template */}
                  {((invoiceData?.discountTotal || 0) > 0 || isInteractive) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', color: '#e11d48' }}>
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
                  {config.tax.enableTaxBreakdown && (
                    <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: getBorderRadius(), border: '1px solid #e2e8f0', width: '100%' }}>
                      {config.tax.showTaxableAmount && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}><span>Taxable Amount:</span> <span>{currencySymbol} {subTotal.toFixed(2)}</span></div>}"""

if old_section in content:
    content = content.replace(old_section, new_section)
    print("Replaced successfully!")
else:
    print("Could not find exact block - checking what's there...")
    idx = content.find('id="section-taxEngine"')
    if idx != -1:
        print(repr(content[idx:idx+500]))

with open('src/components/TemplateBuilder/LivePreview.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
