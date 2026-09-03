import { headers } from 'next/headers';
import PricingPage from '../../components/PricingPage';

export default async function PricingRoutePage() {
  const headersList = await headers();
  // Get country code from common headers
  let countryCode = headersList.get('x-vercel-ip-country') || headersList.get('cf-ipcountry') || undefined;

  // Clean countryCode if it is sentinel or invalid
  if (countryCode && (countryCode === 'OTHERS' || countryCode.trim() === '')) {
    countryCode = undefined;
  }

  return <PricingPage country={countryCode} theme="light" />;
}
