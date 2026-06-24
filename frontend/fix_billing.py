import re
with open('src/components/InvoiceModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_code = '''                 onUpdateShippingSameAsClient={(val) => {
                   setShippingSameAsClient(val);
                   if (!val) {
                     setShippedToName('');
                     setShippedToPhone('');
                     setShippedToEmail('');
                     setShippedToCountry('');
                     setShippedToState('');
                     setShippedToAddress('');
                     setShippedToGstin('');
                   }
                 }}'''

new_code = '''                 onUpdateShippingSameAsClient={(val) => {
                   setShippingSameAsClient(val);
                   if (val) {
                     setShippedToName(clientName);
                     setShippedToPhone(clientPhone);
                     setShippedToEmail(clientEmail);
                     setShippedToCountry(clientCountry);
                     setShippedToState(clientState);
                     setShippedToAddress(clientAddress);
                     setShippedToGstin(clientGstin);
                   } else {
                     setShippedToName('');
                     setShippedToPhone('');
                     setShippedToEmail('');
                     setShippedToCountry('');
                     setShippedToState('');
                     setShippedToAddress('');
                     setShippedToGstin('');
                   }
                 }}'''

content = content.replace(old_code, new_code)

with open('src/components/InvoiceModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Billing fixed!')
