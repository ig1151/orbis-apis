const KNOWN_HOSTING_ASNS = new Set([
  'AS16509', 'AS14618', 'AS8987',   // Amazon AWS
  'AS15169', 'AS396982',             // Google Cloud
  'AS8075', 'AS45139',               // Microsoft Azure
  'AS13335',                         // Cloudflare
  'AS14061', 'AS200130',             // DigitalOcean
  'AS16276',                         // OVH
  'AS24940',                         // Hetzner
  'AS20473',                         // Vultr
  'AS394812',                        // Linode/Akamai
  'AS7922', 'AS20001',               // Comcast (sometimes hosting)
]);

const KNOWN_VPN_ORGS = [
  'nordvpn', 'expressvpn', 'surfshark', 'cyberghost', 'private internet access',
  'protonvpn', 'ipvanish', 'hidemyass', 'tunnelbear', 'windscribe',
  'mullvad', 'pia', 'vyprvpn', 'strongvpn', 'purevpn',
];

const TOR_EXIT_INDICATORS = ['tor', 'torproject', 'exit node', 'tor exit'];

export function detectHosting(asn?: string): boolean {
  if (!asn) return false;
  return KNOWN_HOSTING_ASNS.has(asn.toUpperCase());
}

export function detectVPN(org?: string, isp?: string): boolean {
  if (!org && !isp) return false;
  const text = `${org ?? ''} ${isp ?? ''}`.toLowerCase();
  return KNOWN_VPN_ORGS.some(vpn => text.includes(vpn));
}

export function detectTor(org?: string, isp?: string): boolean {
  if (!org && !isp) return false;
  const text = `${org ?? ''} ${isp ?? ''}`.toLowerCase();
  return TOR_EXIT_INDICATORS.some(indicator => text.includes(indicator));
}

export function calculateRiskScore(params: {
  isVpn: boolean;
  isProxy: boolean;
  isTor: boolean;
  isHosting: boolean;
  isPrivate: boolean;
}): number {
  let score = 0;
  if (params.isTor) score += 90;
  else if (params.isProxy) score += 70;
  else if (params.isVpn) score += 50;
  else if (params.isHosting) score += 30;
  return Math.min(100, score);
}

export function getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 80) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 20) return 'medium';
  return 'low';
}

export function getRiskFactors(params: {
  isVpn: boolean;
  isProxy: boolean;
  isTor: boolean;
  isHosting: boolean;
  isAnonymous: boolean;
}): string[] {
  const factors: string[] = [];
  if (params.isTor) factors.push('Tor exit node detected');
  if (params.isProxy) factors.push('Proxy server detected');
  if (params.isVpn) factors.push('VPN service detected');
  if (params.isHosting) factors.push('Hosted on cloud/datacenter infrastructure');
  if (params.isAnonymous) factors.push('Anonymous connection detected');
  if (factors.length === 0) factors.push('No risk factors detected');
  return factors;
}
