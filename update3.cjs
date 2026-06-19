const fs = require('fs');

let content = fs.readFileSync('./src/components/BusinessProfileModal.tsx', 'utf8');

const regex = /const handleCountryChange = \([\s\S]*?setStateCode\([\s\S]*?\}\n  \};/m;

const replacement = `  // Map of Indian State ISO codes to numeric GST state codes
  const INDIAN_NUMERIC_STATE_CODES: { [key: string]: string } = {
    'DL': '07', 'MH': '27', 'KA': '29', 'TN': '33', 'UP': '09',
    'GJ': '24', 'WB': '19', 'TG': '36', 'AP': '37', 'BR': '10',
    'MP': '23', 'RJ': '08', 'CH': '04', 'HR': '06', 'UK': '05',
    'KL': '32', 'OR': '21', 'PB': '03', 'AS': '18', 'JH': '20',
    'CT': '22', 'HP': '02', 'TR': '16', 'ML': '17', 'MN': '14',
    'NL': '13', 'AR': '12', 'MZ': '15', 'SK': '11', 'GA': '30',
    'PY': '34', 'AN': '35', 'LD': '31', 'DN': '26', 'DD': '25',
    'LA': '38'
  };

  // Country change automatically updates states, currency, and phone prefix
  const handleCountryChange = (isoCode: string) => {
    const selectedCountry = Country.getCountryByCode(isoCode);
    if (selectedCountry) {
      setCountry(selectedCountry.name);
      setCurrency(selectedCountry.currency || 'USD');
      
      // Update phone prefix
      if (selectedCountry.phonecode) {
        setPhone('+' + selectedCountry.phonecode + ' ');
      }
      
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
        
        // If it's India, use numeric GST code, otherwise leave it empty so they can type numbers, 
        // or default to numeric chars of isoCode if any exist.
        if (cCode === 'IN') {
          setStateCode(INDIAN_NUMERIC_STATE_CODES[isoCode] || '');
        } else {
          // Clear state code for non-Indian states to let users type numeric codes manually
          setStateCode('');
        }
      }
    }
  };`;

content = content.replace(regex, replacement);

// Make state code input only accept numbers
const stateCodeInputRegex = /id="company-state-code"\n\s*type="text"/;
content = content.replace(stateCodeInputRegex, 'id="company-state-code"\n                    type="number"');

fs.writeFileSync('./src/components/BusinessProfileModal.tsx', content);
console.log('Successfully updated the handlers and state code input type.');
