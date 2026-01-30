// Geo-based pricing tiers for gift cards
// This ensures fair pricing based on regional ad revenue (eCPM)

export interface GeoTier {
  tier: 1 | 2 | 3;
  multiplier: number;
  countries: string[];
}

// Tier 1: High eCPM regions ($15-50) - 1x multiplier
const TIER_1_COUNTRIES = [
  'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'JP', 'NL', 'SE', 'NO', 
  'DK', 'FI', 'CH', 'AT', 'BE', 'IE', 'NZ', 'LU'
];

// Tier 2: Medium eCPM regions ($8-15) - 1.5x multiplier
const TIER_2_COUNTRIES = [
  'KR', 'SG', 'AE', 'SA', 'QA', 'KW', 'BH', 'IT', 'ES', 'PT',
  'PL', 'CZ', 'HU', 'IL', 'TW', 'HK', 'MY', 'TH'
];

// Tier 3: Lower eCPM regions ($1-5) - 3x multiplier
// All other countries default to Tier 3

export const TIER_MULTIPLIERS = {
  1: 1.0,   // 5,000 credits = $5 gift card
  2: 1.5,   // 7,500 credits = $5 gift card
  3: 3.0,   // 15,000 credits = $5 gift card
};

export function getTierForCountry(countryCode: string | null): 1 | 2 | 3 {
  if (!countryCode) return 3; // Default to tier 3 if unknown
  
  const code = countryCode.toUpperCase();
  
  if (TIER_1_COUNTRIES.includes(code)) return 1;
  if (TIER_2_COUNTRIES.includes(code)) return 2;
  return 3;
}

export function getMultiplierForCountry(countryCode: string | null): number {
  const tier = getTierForCountry(countryCode);
  return TIER_MULTIPLIERS[tier];
}

export function getAdjustedPrice(basePrice: number, countryCode: string | null): number {
  const multiplier = getMultiplierForCountry(countryCode);
  return Math.round(basePrice * multiplier);
}

export function getTierInfo(countryCode: string | null): { tier: number; multiplier: number; description: string } {
  const tier = getTierForCountry(countryCode);
  const multiplier = TIER_MULTIPLIERS[tier];
  
  const descriptions = {
    1: 'Standard pricing',
    2: 'Regional pricing (1.5x)',
    3: 'Regional pricing (3x)',
  };
  
  return {
    tier,
    multiplier,
    description: descriptions[tier],
  };
}

// Get country from IP using free ip-api.com service
export async function getCountryFromIP(ip: string): Promise<string | null> {
  try {
    // Handle localhost/private IPs
    if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return null;
    }
    
    // Clean the IP (remove ::ffff: prefix if present)
    const cleanIP = ip.replace(/^::ffff:/, '');
    
    const response = await fetch(`http://ip-api.com/json/${cleanIP}?fields=countryCode`);
    if (!response.ok) return null;
    
    const data = await response.json() as { countryCode?: string };
    return data.countryCode || null;
  } catch (error) {
    console.error('Failed to get country from IP:', error);
    return null;
  }
}
