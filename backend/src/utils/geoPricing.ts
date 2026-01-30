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
// Also detects VPNs/proxies and known US carrier IPs
export async function getCountryFromIP(ip: string): Promise<string | null> {
  try {
    // Handle localhost
    if (!ip || ip === '::1' || ip === '127.0.0.1') {
      return null;
    }
    
    // Clean the IP (remove ::ffff: prefix if present)
    const cleanIP = ip.replace(/^::ffff:/, '');
    
    // Check for known US mobile carrier private IPs (CGNAT ranges)
    // These are legit US users on cellular data
    if (isKnownUSCarrierIP(cleanIP)) {
      return 'US';
    }
    
    // Skip other private IPs that aren't carrier NAT
    if (cleanIP.startsWith('192.168.') || cleanIP.startsWith('10.')) {
      return null;
    }
    
    // Use ip-api.com with additional fields for VPN detection
    const response = await fetch(`http://ip-api.com/json/${cleanIP}?fields=status,countryCode,isp,org,hosting`);
    if (!response.ok) return null;
    
    const data = await response.json() as { 
      status?: string;
      countryCode?: string;
      isp?: string;
      org?: string;
      hosting?: boolean;  // true if datacenter/hosting IP (likely VPN)
    };
    
    if (data.status !== 'success') return null;
    
    // Check if this is a datacenter/VPN IP claiming to be from Tier 1 country
    const claimedCountry = data.countryCode || null;
    const isHostingIP = data.hosting === true;
    const isSuspiciousOrg = isVPNProvider(data.org || '', data.isp || '');
    
    if (isHostingIP || isSuspiciousOrg) {
      // This is likely a VPN - if they're claiming Tier 1, don't trust it
      const wouldBeTier = getTierForCountry(claimedCountry);
      if (wouldBeTier === 1) {
        console.log(`VPN detected for IP ${cleanIP.substring(0, 8)}... claiming ${claimedCountry}, org: ${data.org}, isp: ${data.isp}`);
        return null; // Return null so they get Tier 3 (default)
      }
    }
    
    return claimedCountry;
  } catch (error) {
    console.error('Failed to get country from IP:', error);
    return null;
  }
}

// Known US mobile carrier CGNAT IP ranges
function isKnownUSCarrierIP(ip: string): boolean {
  // T-Mobile uses 172.58.x.x - 172.62.x.x for CGNAT
  if (ip.startsWith('172.58.') || ip.startsWith('172.59.') || 
      ip.startsWith('172.60.') || ip.startsWith('172.61.') || 
      ip.startsWith('172.62.')) {
    return true;
  }
  
  // Verizon Wireless CGNAT ranges
  if (ip.startsWith('174.192.') || ip.startsWith('174.193.') ||
      ip.startsWith('174.194.') || ip.startsWith('174.195.')) {
    return true;
  }
  
  // AT&T Mobility
  if (ip.startsWith('166.137.') || ip.startsWith('166.138.') ||
      ip.startsWith('166.139.') || ip.startsWith('166.140.')) {
    return true;
  }
  
  return false;
}

// Check if ISP/org name indicates a VPN provider
function isVPNProvider(org: string, isp: string): boolean {
  const vpnKeywords = [
    'vpn', 'proxy', 'tunnel', 'nordvpn', 'expressvpn', 'surfshark',
    'privateinternetaccess', 'pia', 'mullvad', 'cyberghost', 'ipvanish',
    'protonvpn', 'windscribe', 'hotspot shield', 'hidemy', 'purevpn',
    'digitalocean', 'vultr', 'linode', 'amazon', 'aws', 'google cloud',
    'microsoft azure', 'oracle cloud', 'ovh', 'hetzner', 'choopa',
    'contabo', 'hostinger', 'hostwinds', 'datacamp', 'psychz',
    'm247', 'datacamp limited', 'b2 net solutions'
  ];
  
  const combined = (org + ' ' + isp).toLowerCase();
  return vpnKeywords.some(keyword => combined.includes(keyword));
}
