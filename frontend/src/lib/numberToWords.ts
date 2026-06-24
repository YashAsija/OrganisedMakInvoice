export function numberToWords(num: number, format: 'Indian' | 'International', currencyName: string = 'Rupees'): string {
  if (num === 0) return 'Zero';

  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertToWords = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? convertToWords(n % 100) : '');
    return '';
  };

  const toIndianFormat = (num: number): string => {
    if (num === 0) return '';
    let str = '';
    if (num >= 10000000) {
      str += convertToWords(Math.floor(num / 10000000)) + 'Crore ';
      num %= 10000000;
    }
    if (num >= 100000) {
      str += convertToWords(Math.floor(num / 100000)) + 'Lakh ';
      num %= 100000;
    }
    if (num >= 1000) {
      str += convertToWords(Math.floor(num / 1000)) + 'Thousand ';
      num %= 1000;
    }
    str += convertToWords(num);
    return str;
  };

  const toInternationalFormat = (num: number): string => {
    if (num === 0) return '';
    let str = '';
    if (num >= 1000000000) {
      str += convertToWords(Math.floor(num / 1000000000)) + 'Billion ';
      num %= 1000000000;
    }
    if (num >= 1000000) {
      str += convertToWords(Math.floor(num / 1000000)) + 'Million ';
      num %= 1000000;
    }
    if (num >= 1000) {
      str += convertToWords(Math.floor(num / 1000)) + 'Thousand ';
      num %= 1000;
    }
    str += convertToWords(num);
    return str;
  };

  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);

  let wordResult = '';
  if (intPart > 0) {
    if (format === 'Indian') {
      wordResult += toIndianFormat(intPart);
    } else {
      wordResult += toInternationalFormat(intPart);
    }
  } else {
    wordResult += 'Zero ';
  }

  // Handle currency name based on format if not specifically passed, else use what's passed
  let currency = currencyName;
  if (currencyName === 'Rupees' && format === 'International') {
    currency = 'Dollars';
  } else if (currencyName === 'Dollars' && format === 'Indian') {
    currency = 'Rupees';
  }

  wordResult = wordResult.trim() + ' ' + currency;

  if (decPart > 0) {
    wordResult += ' and ' + convertToWords(decPart).trim() + ' Cents'; // Or Paise, depending on the currency, but let's keep it simple
  }

  return wordResult.trim() + ' Only';
}
