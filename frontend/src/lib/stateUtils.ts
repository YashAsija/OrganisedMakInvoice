/**
 * stateUtils.ts
 * GST State Code resolution & formatting utilities for Indian states
 */

export const INDIAN_STATE_NAME_TO_CODE: Record<string, string> = {
  'andaman and nicobar islands': '35',
  'andhra pradesh': '37',
  'arunachal pradesh': '12',
  'assam': '18',
  'bihar': '10',
  'chandigarh': '04',
  'chhattisgarh': '22',
  'dadra and nagar haveli and daman and diu': '26',
  'dadra and nagar haveli': '26',
  'daman and diu': '25',
  'delhi': '07',
  'new delhi': '07',
  'goa': '30',
  'gujarat': '24',
  'haryana': '06',
  'himachal pradesh': '02',
  'jammu and kashmir': '01',
  'jammu & kashmir': '01',
  'jharkhand': '20',
  'karnataka': '29',
  'kerala': '32',
  'ladakh': '38',
  'lakshadweep': '31',
  'madhya pradesh': '23',
  'maharashtra': '27',
  'manipur': '14',
  'meghalaya': '17',
  'mizoram': '15',
  'nagaland': '13',
  'odisha': '21',
  'orissa': '21',
  'puducherry': '34',
  'pondicherry': '34',
  'punjab': '03',
  'rajasthan': '08',
  'sikkim': '11',
  'tamil nadu': '33',
  'telangana': '36',
  'tripura': '16',
  'uttar pradesh': '09',
  'uttarakhand': '05',
  'west bengal': '19',
};

export const getStateCode = (stateName?: string, gstin?: string): string | null => {
  if (gstin && gstin.trim().length >= 2) {
    const prefix = gstin.trim().substring(0, 2);
    if (/^\d{2}$/.test(prefix)) return prefix;
  }
  if (!stateName || !stateName.trim()) return null;
  const clean = stateName.trim().toLowerCase();
  
  // Check if stateName already has code in brackets e.g. "Karnataka (29)"
  const bracketMatch = clean.match(/\((\d{2})\)/);
  if (bracketMatch) return bracketMatch[1];
  
  return INDIAN_STATE_NAME_TO_CODE[clean] || null;
};

export const formatStateWithCode = (stateName?: string, gstin?: string): string => {
  if (!stateName || !stateName.trim()) return '';
  const trimmed = stateName.trim();
  // Don't format placeholder strings
  if (trimmed.toLowerCase().includes('select state') || trimmed.toLowerCase() === 'state') return trimmed;
  // If already formatted with code in brackets like "Karnataka (29)", return as-is
  if (/\(\d{2}\)/.test(trimmed)) return trimmed;
  
  const code = getStateCode(trimmed, gstin);
  return code ? `${trimmed} (${code})` : trimmed;
};
