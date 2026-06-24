import os

filepath = r"f:\Projects\MakInvoice\frontend\src\components\TemplateBuilder\LivePreview.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Imports
if "import { Country, State } from 'country-state-city';" not in content:
    content = content.replace(
        "import { EditableField } from '../EditableField';",
        "import { EditableField } from '../EditableField';\nimport { Country, State } from 'country-state-city';"
    )

# 2. poNumber
content = content.replace(
    '{(invoiceData as any)?.poNumber || \'N/A\'}',
    '{renderInteractive((invoiceData as any)?.poNumber || \'N/A\', \'poNumber\')}'
)

# 3. clientEmail
content = content.replace(
    '{(invoiceData as any)?.clientEmail || \'client@example.com\'}',
    '{renderInteractive((invoiceData as any)?.clientEmail || \'client@example.com\', \'clientEmail\')}'
)

# 4. clientCountry and clientState (isAdjacent)
old_client_adj = """<div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">Country</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{clientCountry}</span></div>
                          <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">State</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{clientState}</span></div>"""

new_client_adj = """<div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">Country</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderSelectInteractive(clientCountry, 'clientCountry', Country.getAllCountries().map(c => ({ label: c.name, value: c.name })))}</span></div>
                          <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">State</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderSelectInteractive(clientState, 'clientState', State.getStatesOfCountry(Country.getAllCountries().find(c => c.name === clientCountry)?.isoCode || '').map(s => ({ label: s.name, value: s.name })))}</span></div>"""

content = content.replace(old_client_adj, new_client_adj)

# 5. clientCountry and clientState (not adjacent)
old_client_not_adj = """<div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">Country:</span><span className="text-gray-900 font-bold">{clientCountry}</span></div>
                          <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">State:</span><span className="text-gray-900 font-bold">{clientState}</span></div>"""

new_client_not_adj = """<div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">Country:</span><span className="text-gray-900 font-bold">{renderSelectInteractive(clientCountry, 'clientCountry', Country.getAllCountries().map(c => ({ label: c.name, value: c.name })))}</span></div>
                          <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">State:</span><span className="text-gray-900 font-bold">{renderSelectInteractive(clientState, 'clientState', State.getStatesOfCountry(Country.getAllCountries().find(c => c.name === clientCountry)?.isoCode || '').map(s => ({ label: s.name, value: s.name })))}</span></div>"""

content = content.replace(old_client_not_adj, new_client_not_adj)

# 6. shipCountry and shipState (isAdjacent)
old_ship_adj = """<div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">Country</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{shipCountry}</span></div>
                              <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">State</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{shipState}</span></div>"""

new_ship_adj = """<div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">Country</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderSelectInteractive(shipCountry, 'shippedToCountry', Country.getAllCountries().map(c => ({ label: c.name, value: c.name })))}</span></div>
                              <div className="flex items-center text-[11px] mb-0.5"><span className="w-28 font-medium text-gray-700 shrink-0">State</span><span className="mr-2">:</span><span className="flex-1 text-gray-900 font-medium">{renderSelectInteractive(shipState, 'shippedToState', State.getStatesOfCountry(Country.getAllCountries().find(c => c.name === shipCountry)?.isoCode || '').map(s => ({ label: s.name, value: s.name })))}</span></div>"""

content = content.replace(old_ship_adj, new_ship_adj)

# 7. shipCountry and shipState (not adjacent)
old_ship_not_adj = """<div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">Country:</span><span className="text-gray-900 font-bold">{shipCountry}</span></div>
                              <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">State:</span><span className="text-gray-900 font-bold">{shipState}</span></div>"""

new_ship_not_adj = """<div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">Country:</span><span className="text-gray-900 font-bold">{renderSelectInteractive(shipCountry, 'shippedToCountry', Country.getAllCountries().map(c => ({ label: c.name, value: c.name })))}</span></div>
                              <div className="flex items-center text-[10px]"><span className="text-gray-500 font-medium mr-1">State:</span><span className="text-gray-900 font-bold">{renderSelectInteractive(shipState, 'shippedToState', State.getStatesOfCountry(Country.getAllCountries().find(c => c.name === shipCountry)?.isoCode || '').map(s => ({ label: s.name, value: s.name })))}</span></div>"""

content = content.replace(old_ship_not_adj, new_ship_not_adj)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("Replaced content!")
