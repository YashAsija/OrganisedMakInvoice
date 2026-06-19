const fs = require('fs');

let content = fs.readFileSync('src/components/BusinessProfileModal.tsx', 'utf8');

const badValueMatch = `                    <select 
                    id="company-state"
                    value={stateCode || ''}`;

const fixedValueMatch = `                    <select 
                    id="company-state"
                    value={(() => {
                      const cCode = Country.getAllCountries().find(c => c.name === country)?.isoCode;
                      if (!cCode) return '';
                      return State.getStatesOfCountry(cCode).find(s => s.name === state)?.isoCode || '';
                    })()}`;

if (content.includes(badValueMatch)) {
  content = content.replace(badValueMatch, fixedValueMatch);
  fs.writeFileSync('src/components/BusinessProfileModal.tsx', content);
  console.log('Fixed state select bug.');
} else {
  console.log('Could not find the match.');
}
