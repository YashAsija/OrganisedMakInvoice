with open('src/components/InvoiceModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re

old_block = """  // Calculate taxes item by item
  const calculatedTaxTotal = items.reduce((sum, item) => {
    const itemSubtotal = item.rate * item.quantity;
    const itemDiscAmount = itemSubtotal * ((item.discountPercentage || 0) / 100);
    const itemNet = itemSubtotal - itemDiscAmount;
    const itemTaxBase = itemNet * docDiscountRatio;

    // Apply geographic tax percentage
    let activeTaxPct = item.taxPercentage;
    if (taxClassification.type === 'custom') {
      activeTaxPct = item.taxPercentage + additionalTaxes.reduce((acc, t) => acc + t.rate, 0);
    } else if (taxClassification.zeroTax) {
      activeTaxPct = 0;
    }

    return sum + (itemTaxBase * (activeTaxPct / 100));
  }, 0);"""

new_block = """  // Calculate taxes item by item
  const hasTaxColActive = activeTemplate?.config?.table?.columns?.some(c => c.id === 'tax' && c.visible !== false);
  const calculatedTaxTotal = hasTaxColActive ? items.reduce((sum, item) => {
    const itemSubtotal = item.rate * item.quantity;
    const itemDiscAmount = itemSubtotal * ((item.discountPercentage || 0) / 100);
    const itemNet = itemSubtotal - itemDiscAmount;
    const itemTaxBase = itemNet * docDiscountRatio;

    // Apply geographic tax percentage
    let activeTaxPct = item.taxPercentage;
    if (taxClassification.type === 'custom') {
      activeTaxPct = item.taxPercentage + additionalTaxes.reduce((acc, t) => acc + t.rate, 0);
    } else if (taxClassification.zeroTax) {
      activeTaxPct = 0;
    }

    return sum + (itemTaxBase * (activeTaxPct / 100));
  }, 0) : 0;"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open('src/components/InvoiceModal.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated calculatedTaxTotal in InvoiceModal")
else:
    print("Could not find block in InvoiceModal")
