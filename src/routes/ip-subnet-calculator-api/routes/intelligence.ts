import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';

const router = Router();

const PRIVACY = { data_stored: false, retention: 'none' as const };
const CHAIN_TO = [
  { api: 'ip-geolocation', reason: 'Geolocate specific hosts discovered within this subnet.' },
  { api: 'ip-intelligence', reason: 'Threat-score and detect VPN/proxy on hosts in this range.' },
];

// ---- real IPv4 CIDR math (no LLM) ------------------------------------------
function ipToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const o = Number(p);
    if (o < 0 || o > 255) return null;
    n = (n << 8) | o;
  }
  return n >>> 0;
}
function intToIp(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}
function parseCidr(cidr: string): { ip: number; prefix: number } | null {
  const m = String(cidr).trim().match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/);
  if (!m) return null;
  const ip = ipToInt(m[1]);
  const prefix = Number(m[2]);
  if (ip === null || prefix < 0 || prefix > 32) return null;
  return { ip, prefix };
}
function isPrivate(net: number): boolean {
  const a = (net >>> 24) & 255, b = (net >>> 16) & 255;
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}
interface Subnet {
  input: { cidr: string };
  ip_version: 'IPv4';
  cidr_prefix: number;
  network_address: string;
  broadcast_address: string;
  netmask: string;
  wildcard_mask: string;
  first_usable_host: string | null;
  last_usable_host: string | null;
  total_addresses: number;
  usable_hosts: number;
  is_private: boolean;
}
function calcSubnet(cidr: string): Subnet | null {
  const p = parseCidr(cidr);
  if (!p) return null;
  const mask = p.prefix === 0 ? 0 : (0xffffffff << (32 - p.prefix)) >>> 0;
  const wildcard = (~mask) >>> 0;
  const network = (p.ip & mask) >>> 0;
  const broadcast = (network | wildcard) >>> 0;
  const total = Math.pow(2, 32 - p.prefix);
  let usable: number, first: string | null, last: string | null;
  if (p.prefix === 32) { usable = 1; first = last = intToIp(network); }
  else if (p.prefix === 31) { usable = 2; first = intToIp(network); last = intToIp(broadcast); }
  else { usable = total - 2; first = intToIp((network + 1) >>> 0); last = intToIp((broadcast - 1) >>> 0); }
  return {
    input: { cidr },
    ip_version: 'IPv4',
    cidr_prefix: p.prefix,
    network_address: intToIp(network),
    broadcast_address: intToIp(broadcast),
    netmask: intToIp(mask),
    wildcard_mask: intToIp(wildcard),
    first_usable_host: first,
    last_usable_host: last,
    total_addresses: total,
    usable_hosts: usable,
    is_private: isPrivate(network),
  };
}
function range(cidr: string): { lo: number; hi: number } | null {
  const p = parseCidr(cidr);
  if (!p) return null;
  const mask = p.prefix === 0 ? 0 : (0xffffffff << (32 - p.prefix)) >>> 0;
  const lo = (p.ip & mask) >>> 0;
  const hi = (lo | ((~mask) >>> 0)) >>> 0;
  return { lo, hi };
}
type Relationship = 'disjoint' | 'identical' | 'a_contains_b' | 'b_contains_a' | 'partial';
function overlapOf(a: string, b: string) {
  const ra = range(a), rb = range(b);
  if (!ra || !rb) return null;
  const overlaps = ra.lo <= rb.hi && rb.lo <= ra.hi;
  let relationship: Relationship = 'disjoint';
  if (overlaps) {
    if (ra.lo === rb.lo && ra.hi === rb.hi) relationship = 'identical';
    else if (ra.lo <= rb.lo && ra.hi >= rb.hi) relationship = 'a_contains_b';
    else if (rb.lo <= ra.lo && rb.hi >= ra.hi) relationship = 'b_contains_a';
    else relationship = 'partial';
  }
  const oLo = Math.max(ra.lo, rb.lo), oHi = Math.min(ra.hi, rb.hi);
  return {
    overlaps,
    relationship,
    overlap_address_count: overlaps ? oHi - oLo + 1 : 0,
    overlap_start: overlaps ? intToIp(oLo) : null,
    overlap_end: overlaps ? intToIp(oHi) : null,
  };
}

// ---- discovery -------------------------------------------------------------
router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'IP Subnet Calculator API', version: '1.0.0',
    description: 'Deterministic IPv4 CIDR math for network-aware agents: subnet boundaries, usable host ranges, mask conversion, and overlap detection. Real computation — no estimation.',
    openapi_url: 'https://orbis-apis.onrender.com/ip-subnet-calculator/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/calculate', summary: 'CIDR → network, broadcast, mask, usable host range', price_usdc: 0.001 },
      { method: 'POST', path: '/overlap', summary: 'Detect overlap/containment between two CIDR blocks', price_usdc: 0.002 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: full subnet breakdown + optional overlap + recommendations', price_usdc: 0.003 },
    ],
    x402_compatible: true,
  });
});

// ---- POST /calculate -------------------------------------------------------
router.post('/calculate', (req: Request, res: Response) => {
  const t0 = Date.now();
  const { cidr } = req.body ?? {};
  if (!cidr || typeof cidr !== 'string') return fail(res, t0, 400, 'missing_cidr', 'Body must include a string "cidr", e.g. "10.0.0.0/24".');
  const s = calcSubnet(cidr);
  if (!s) return fail(res, t0, 400, 'invalid_cidr', `Could not parse "${cidr}" as IPv4 CIDR (expected a.b.c.d/0-32).`);
  respond(res, t0, {
    ...s,
    confidence_score: 1.0,
    recommended_actions_priority_order: [
      s.usable_hosts < 2 ? 'Point-to-point or host route — no usable host pool.' : `Allocate hosts between ${s.first_usable_host} and ${s.last_usable_host}.`,
      s.is_private ? 'Private (RFC1918) range — not internet-routable.' : 'Public range — verify ownership before routing.',
    ],
    chain_to: CHAIN_TO,
    privacy: PRIVACY,
  });
});

// ---- POST /overlap ---------------------------------------------------------
router.post('/overlap', (req: Request, res: Response) => {
  const t0 = Date.now();
  const { cidr_a, cidr_b } = req.body ?? {};
  if (!cidr_a || !cidr_b || typeof cidr_a !== 'string' || typeof cidr_b !== 'string')
    return fail(res, t0, 400, 'missing_cidrs', 'Body must include string "cidr_a" and "cidr_b".');
  const o = overlapOf(cidr_a, cidr_b);
  if (!o) return fail(res, t0, 400, 'invalid_cidr', 'One or both CIDRs failed to parse as IPv4 a.b.c.d/0-32.');
  respond(res, t0, {
    input: { cidr_a, cidr_b },
    ...o,
    confidence_score: 1.0,
    recommended_actions_priority_order: o.overlaps
      ? ['Resolve the address conflict before assigning either block.', `Relationship: ${o.relationship}.`]
      : ['Blocks are disjoint — safe to route independently.'],
    chain_to: CHAIN_TO,
    privacy: PRIVACY,
  });
});

// ---- POST /lookup ----------------------------------------------------------
router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const { cidr, other_cidr } = req.body ?? {};
  if (!cidr || typeof cidr !== 'string') return fail(res, t0, 400, 'missing_cidr', 'Body must include a string "cidr".');
  const s = calcSubnet(cidr);
  if (!s) return fail(res, t0, 400, 'invalid_cidr', `Could not parse "${cidr}" as IPv4 CIDR.`);
  const ov = other_cidr && typeof other_cidr === 'string' ? overlapOf(cidr, other_cidr) : null;
  if (other_cidr && !ov) return fail(res, t0, 400, 'invalid_other_cidr', `Could not parse other_cidr "${other_cidr}".`);
  respond(res, t0, {
    subnet: s,
    overlap: ov ? { input: { cidr_a: cidr, cidr_b: other_cidr }, ...ov } : null,
    reasoning: {
      why_result_generated: 'Computed directly from the CIDR using deterministic IPv4 bitmask arithmetic.',
      key_factors: [`prefix /${s.cidr_prefix}`, `${s.usable_hosts} usable hosts`, s.is_private ? 'RFC1918 private' : 'public range'],
      invalidators: ['Input is IPv6 (not supported).', 'CIDR prefix or octets out of range.'],
    },
    confidence_score: 1.0,
    recommended_actions_priority_order: [
      `Usable host pool: ${s.first_usable_host ?? 'n/a'} – ${s.last_usable_host ?? 'n/a'} (${s.usable_hosts}).`,
      ov?.overlaps ? `Overlaps other_cidr (${ov.relationship}) — resolve before assignment.` : 'No overlap conflict detected.',
      s.is_private ? 'Private range — add NAT/route policy for egress.' : 'Public range — confirm allocation ownership.',
    ],
    chain_to: CHAIN_TO,
    privacy: PRIVACY,
  });
});

export default router;
