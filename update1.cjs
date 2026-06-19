const fs = require('fs');

let content = fs.readFileSync('./src/components/BusinessProfileModal.tsx', 'utf8');

// 1. Add imports
content = content.replace(
  "import { BusinessProfile } from '../types';",
  "import { BusinessProfile } from '../types';\nimport { Country, State } from 'country-state-city';"
);

// 2. Remove STATES_LIST
content = content.replace(/const STATES_LIST = \[\s*[\s\S]*?\];\s*/, '');

// 3. Add displayName state
content = content.replace(
  "const [name, setName] = useState(profile.name || '');",
  "const [name, setName] = useState(profile.name || '');\n  const [displayName, setDisplayName] = useState(profile.displayName || '');"
);

// 4. Add to useEffect initialization
content = content.replace(
  "setName(profile.name || '');",
  "setName(profile.name || '');\n    setDisplayName(profile.displayName || '');"
);

// 5. Update handlers
const oldHandlersRegex = /\/\/ State dropdown automatically fills correct state code if Indian state is chosen[\s\S]*?setCurrencySymbol\(symbolMap\[uppercaseCode\]\);\n    }\n  };/m;

const newHandlers = `  // Country change automatically updates states and currency
  const handleCountryChange = (isoCode: string) => {
    const selectedCountry = Country.getCountryByCode(isoCode);
    if (selectedCountry) {
      setCountry(selectedCountry.name);
      setCurrency(selectedCountry.currency || 'USD');
      
      // Try to map currency to symbol
      const symbolMap: { [key: string]: string } = {
        USD: '$', EUR: '€', GBP: '£', JPY: '¥', INR: '₹', CAD: 'C$', AUD: 'A$', IDR: 'Rp'
      };
      if (selectedCountry.currency && symbolMap[selectedCountry.currency]) {
        setCurrencySymbol(symbolMap[selectedCountry.currency]);
      } else {
        setCurrencySymbol(selectedCountry.currency || ''); // fallback
      }
      
      // Reset state when country changes
      setState('');
      setStateCode('');
    }
  };

  const handleStateChange = (isoCode: string, currentCountryName: string) => {
    const cCode = Country.getAllCountries().find(c => c.name === currentCountryName)?.isoCode;
    if (cCode) {
      const selectedState = State.getStateByCodeAndCountry(isoCode, cCode);
      if (selectedState) {
        setState(selectedState.name);
        setStateCode(selectedState.isoCode);
      }
    }
  };`;

content = content.replace(oldHandlersRegex, newHandlers);

// 6. Add displayName to onSave payload
content = content.replace(
  "uid: profile.uid || 'local',\n      name,",
  "uid: profile.uid || 'local',\n      name,\n      displayName,"
);

// Write back
fs.writeFileSync('./src/components/BusinessProfileModal.tsx', content);
console.log('Done script 1!');
