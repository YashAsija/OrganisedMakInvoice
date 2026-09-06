/**
 * stateUtils.ts
 * GST State Code resolution & formatting utilities for Indian states
 */

import { Country, State } from 'country-state-city';

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

export const cleanStateName = (stateName?: string): string => {
  if (!stateName || !stateName.trim()) return '';
  return stateName.replace(/\(\d{2}\)/g, '').trim();
};

export const getStateCode = (stateName?: string, gstin?: string): string | null => {
  if (gstin && gstin.trim().length >= 2) {
    const prefix = gstin.trim().substring(0, 2);
    if (/^\d{2}$/.test(prefix)) return prefix;
  }
  if (!stateName || !stateName.trim()) return null;
  const clean = cleanStateName(stateName).toLowerCase();
  
  // Check if stateName already has code in brackets e.g. "Karnataka (29)"
  const bracketMatch = stateName.match(/\((\d{2})\)/);
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
  return code ? `${cleanStateName(trimmed)} (${code})` : trimmed;
};

export const findMatchingStateIso = (rawStateName?: string, countryName?: string): string => {
  if (!rawStateName || !rawStateName.trim()) return '';
  const country = countryName && countryName.trim() ? countryName.trim() : 'India';
  const cCode = Country.getAllCountries().find(c => c.name.toLowerCase() === country.toLowerCase())?.isoCode || 'IN';
  const states = State.getStatesOfCountry(cCode);
  if (!states || states.length === 0) return '';
  
  const clean = cleanStateName(rawStateName).toLowerCase();
  const rawLower = rawStateName.trim().toLowerCase();
  
  const matched = states.find(s => 
    s.name.toLowerCase() === clean || 
    s.isoCode.toLowerCase() === clean ||
    s.name.toLowerCase() === rawLower ||
    s.isoCode.toLowerCase() === rawLower
  );
  
  return matched ? matched.isoCode : '';
};

export const getStateNameFromGstCode = (gstinOrCode?: string): string | null => {
  if (!gstinOrCode || !gstinOrCode.trim()) return null;
  const clean = gstinOrCode.trim();
  const code = clean.length >= 2 ? clean.substring(0, 2) : clean;
  if (!/^\d{2}$/.test(code)) return null;

  const CODE_TO_NAME: Record<string, string> = {
    '01': 'Jammu and Kashmir',
    '02': 'Himachal Pradesh',
    '03': 'Punjab',
    '04': 'Chandigarh',
    '05': 'Uttarakhand',
    '06': 'Haryana',
    '07': 'Delhi',
    '08': 'Rajasthan',
    '09': 'Uttar Pradesh',
    '10': 'Bihar',
    '11': 'Sikkim',
    '12': 'Arunachal Pradesh',
    '13': 'Nagaland',
    '14': 'Manipur',
    '15': 'Mizoram',
    '16': 'Tripura',
    '17': 'Meghalaya',
    '18': 'Assam',
    '19': 'West Bengal',
    '20': 'Jharkhand',
    '21': 'Odisha',
    '22': 'Chhattisgarh',
    '23': 'Madhya Pradesh',
    '24': 'Gujarat',
    '25': 'Daman and Diu',
    '26': 'Dadra and Nagar Haveli and Daman and Diu',
    '27': 'Maharashtra',
    '28': 'Andhra Pradesh',
    '29': 'Karnataka',
    '30': 'Goa',
    '31': 'Lakshadweep',
    '32': 'Kerala',
    '33': 'Tamil Nadu',
    '34': 'Puducherry',
    '35': 'Andaman and Nicobar Islands',
    '36': 'Telangana',
    '37': 'Andhra Pradesh',
    '38': 'Ladakh',
  };

  return CODE_TO_NAME[code] || null;
};

