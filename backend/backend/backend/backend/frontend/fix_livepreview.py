import re

with open('src/components/TemplateBuilder/LivePreview.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix Place of Supply
content = content.replace(
    """<div className={rowStyle}><span className={labelStyle}>Place of Supply</span><span className="mr-2">:</span><span className={valStyle}>{renderInteractive(placeOfSupply, 'placeOfSupply')}</span></div>""",
    """{config.invoiceInfo.fields.includes('placeOfSupply') && <div className={rowStyle}><span className={labelStyle}>Place of Supply</span><span className="mr-2">:</span><span className={valStyle}>{renderInteractive(placeOfSupply, 'placeOfSupply')}</span></div>}"""
)

# Fix GR/RR No
content = content.replace(
    """<div className={rowStyle}><span className={labelStyle}>GR/RR No.</span><span className="mr-2">:</span><span className={valStyle}>{renderInteractive(grRrNo, 'grRrNo')}</span></div>""",
    """{config.invoiceInfo.fields.includes('grRrNo') && <div className={rowStyle}><span className={labelStyle}>GR/RR No.</span><span className="mr-2">:</span><span className={valStyle}>{renderInteractive(grRrNo, 'grRrNo')}</span></div>}"""
)

# Fix Ref. No in Modal Classic
content = content.replace(
    """<div className={rowStyle}><span className={labelStyle}>Ref. No.</span><span className="mr-2">:</span><span className={valStyle}>{renderInteractive(referenceNumber, 'referenceNumber')}</span></div>""",
    """{config.invoiceInfo.fields.includes('referenceNumber') && <div className={rowStyle}><span className={labelStyle}>Ref. No.</span><span className="mr-2">:</span><span className={valStyle}>{renderInteractive(referenceNumber, 'referenceNumber')}</span></div>}"""
)

# Fix Ref No in Default layout
content = content.replace(
    """<p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Ref No:</strong> {renderInteractive((invoiceData as any)?.referenceNumber || getFallback('N/A'), 'referenceNumber')}</p>""",
    """{config.invoiceInfo.fields.includes('referenceNumber') && <p style={{ fontSize: '12px', margin: '2px 0' }}><strong>Ref No:</strong> {renderInteractive((invoiceData as any)?.referenceNumber || getFallback('N/A'), 'referenceNumber')}</p>}"""
)

with open('src/components/TemplateBuilder/LivePreview.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated LivePreview.tsx")
