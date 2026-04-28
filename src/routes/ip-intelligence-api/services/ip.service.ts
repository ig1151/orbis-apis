import https from 'https';
import http from 'http';
import { isPrivateIP, isValidIP } from '../utils/validation';
import { detectHosting, detectVPN, detectTor, calculateRiskScore, getRiskLevel, getRiskFactors } from '../utils/ipdata';
import { logger } from '../utils/logger';
import type { LookupRequest, LookupResponse } from '../types/index';

function httpGet(url: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Invalid JSON response')); }
      });
    }).on('error', reject);
  });
}

export async function lookupIP(req: LookupRequest): Promise<LookupResponse> {
  const t0 = Date.now();
  const ip = req.ip.trim();

  logger.info({ ip }, 'Starting IP lookup');

  if (!isValidIP(ip)) {
    return {
      ip,
      type: 'unknown',
      status: 'error',
      latency_ms: Date.now() - t0,
      created_at: new Date().toISOString(),
    };
  }

  if (isPrivateIP(ip)) {
    return {
      ip,
      type: 'private',
      status: 'success',
      risk: {
        score: 0,
        threat_level: 'low',
        is_vpn: false,
        is_proxy: false,
        is_tor: false,
        is_hosting: false,
        is_anonymous: false,
        is_bogon: true,
        confidence: 1.0,
        factors: ['Private/internal IP address'],
      },
      latency_ms: Date.now() - t0,
      created_at: new Date().toISOString(),
    };
  }

  try {
    const data = await httpGet(
      `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,currency,isp,org,as,asname,proxy,hosting,query`
    );

    if (data.status === 'fail') {
      throw new Error(String(data.message ?? 'IP lookup failed'));
    }

    const asn = String(data.as ?? '');
    const org = String(data.org ?? '');
    const isp = String(data.isp ?? '');

    const isVpn = detectVPN(org, isp) || Boolean(data.proxy);
    const isTor = detectTor(org, isp);
    const isHosting = Boolean(data.hosting) || detectHosting(asn);
    const isProxy = Boolean(data.proxy);
    const isAnonymous = isVpn || isTor || isProxy;

    const riskScore = calculateRiskScore({ isVpn, isProxy, isTor, isHosting, isPrivate: false });
    const threatLevel = getRiskLevel(riskScore);
    const factors = getRiskFactors({ isVpn, isProxy, isTor, isHosting, isAnonymous });
    const ipType = ip.includes(':') ? 'IPv6' : 'IPv4';
    const confidence = isVpn || isTor ? 0.92 : isHosting ? 0.88 : 0.95;

    logger.info({ ip, riskScore, threatLevel }, 'IP lookup complete');

    return {
      ip: String(data.query ?? ip),
      type: ipType,
      status: 'success',
      location: {
        country: String(data.country ?? ''),
        country_code: String(data.countryCode ?? ''),
        region: String(data.regionName ?? ''),
        region_code: String(data.region ?? ''),
        city: String(data.city ?? ''),
        postal_code: String(data.zip ?? ''),
        latitude: Number(data.lat ?? 0),
        longitude: Number(data.lon ?? 0),
        timezone: String(data.timezone ?? ''),
        currency: String(data.currency ?? ''),
        accuracy_radius: 50,
      },
      network: {
        asn,
        asn_number: parseInt(asn.replace(/AS(\d+).*/, '$1'), 10),
        org,
        isp,
        connection_type: isHosting ? 'hosting' : 'broadband',
      },
      risk: {
        score: riskScore,
        threat_level: threatLevel,
        is_vpn: isVpn,
        is_proxy: isProxy,
        is_tor: isTor,
        is_hosting: isHosting,
        is_anonymous: isAnonymous,
        is_bogon: false,
        confidence,
        factors,
      },
      latency_ms: Date.now() - t0,
      created_at: new Date().toISOString(),
    };
  } catch (err) {
    logger.error({ ip, err }, 'IP lookup failed');
    throw err;
  }
}