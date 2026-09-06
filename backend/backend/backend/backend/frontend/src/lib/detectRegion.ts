/**
 * Multi-Signal Region Detection Module
 * Prioritizes server-side header IP lookup -> fallback client endpoints -> INTL default fallback.
 * Safe 1-hour cache expiration in sessionStorage.
 */

export type Region = 'IN' | 'INTL';

const REGION_STORAGE_KEY = 'user_region';
const REGION_TIMESTAMP_KEY = 'user_region_at';

async function detectViaServer(): Promise<Region> {
  const res = await fetch('/api/utils/detect-region');
  if (!res.ok) throw new Error('Server detection failed');
  const data = await res.json();
  return data.country === 'IN' ? 'IN' : 'INTL';
}

async function detectViaIpApi(): Promise<Region> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);
  const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
  clearTimeout(timeoutId);
  if (!res.ok) throw new Error('ipapi failed');
  const data = await res.json();
  return data.country_code === 'IN' ? 'IN' : 'INTL';
}

export async function getUserRegion(): Promise<Region> {
  if (typeof window === 'undefined') return 'IN';

  // 0. Manual developer/user override check
  try {
    const override = localStorage.getItem('makinvoices_forced_region') || sessionStorage.getItem(REGION_STORAGE_KEY);
    const cachedAt = sessionStorage.getItem(REGION_TIMESTAMP_KEY);

    if (override === 'IN' || override === 'INTL') {
      if (cachedAt) {
        const age = Date.now() - parseInt(cachedAt, 10);
        if (age < 60 * 60 * 1000) return override as Region;
      } else {
        return override as Region;
      }
    }
  } catch (e) {}

  // 1. Browser Environment Signals (Timezone & Language)
  let isIndianBrowser = false;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const languages = navigator.languages || [navigator.language || ''];
    if (tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta') {
      isIndianBrowser = true;
    } else if (languages.some(lang => lang.toLowerCase().includes('-in') || lang.toLowerCase() === 'hi')) {
      isIndianBrowser = true;
    }
  } catch (e) {}

  let region: Region = isIndianBrowser ? 'IN' : 'INTL';

  try {
    const serverRegion = await detectViaServer();
    if (serverRegion === 'IN') {
      region = 'IN';
    } else if (serverRegion === 'INTL' && !isIndianBrowser) {
      region = 'INTL';
    }
  } catch {
    try {
      const ipRegion = await detectViaIpApi();
      if (ipRegion === 'IN') {
        region = 'IN';
      }
    } catch {
      // Fallback to browser timezone signal if network IP lookups fail
      region = isIndianBrowser ? 'IN' : 'INTL';
    }
  }

  try {
    sessionStorage.setItem(REGION_STORAGE_KEY, region);
    sessionStorage.setItem(REGION_TIMESTAMP_KEY, Date.now().toString());
  } catch (e) {}

  return region;
}

export async function detectRegion(): Promise<Region> {
  return getUserRegion();
}

export function clearRegionCache(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(REGION_STORAGE_KEY);
    sessionStorage.removeItem(REGION_TIMESTAMP_KEY);
    localStorage.removeItem('makinvoices_forced_region');
  } catch (e) {}
}

export function overrideRegion(region: 'IN' | 'INTL'): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(REGION_STORAGE_KEY, region);
    sessionStorage.setItem(REGION_TIMESTAMP_KEY, Date.now().toString());
    localStorage.setItem('makinvoices_forced_region', region);
  } catch (e) {}
  window.location.reload();
}

// Dev mode helpers window attachment
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__setRegion = overrideRegion;
  (window as any).__clearRegion = clearRegionCache;
}
