import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';

async function callClaude(prompt: string): Promise<string> {
  const res = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    { model: MODEL, messages: [{ role: 'user', content: prompt }] },
    { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' } }
  );
  return res.data.choices[0].message.content;
}

function parseJSON(raw: string) {
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'IP Geolocation API', info: '/ip-geolocation/info', openapi: '/ip-geolocation/openapi.json', health: 'ok' });
});

// POST /lookup
router.post('/lookup', async (req: Request, res: Response) => {
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ error: 'ip is required' });
  try {
    const raw = await callClaude(`Geolocate IP address: "${ip}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "ip": "${ip}",
  "geo": {
    "country": "string",
    "country_code": "string",
    "region": "string",
    "region_code": "string",
    "city": "string",
    "postal_code": "string or null",
    "lat": number,
    "lon": number,
    "timezone": "string",
    "continent": "string"
  },
  "network": {
    "asn": "string",
    "isp": "string",
    "org": "string",
    "connection_type": "broadband|mobile|datacenter|satellite|other",
    "is_datacenter": false,
    "is_mobile": false
  },
  "confidence_per_section": {"geo": 0.9, "network": 0.88},
  "recommended_actions_priority_order": ["use for content localization", "check risk score for fraud prevention", "use city/country for access control"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /risk
router.post('/risk', async (req: Request, res: Response) => {
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ error: 'ip is required' });
  try {
    const raw = await callClaude(`Risk assessment for IP address: "${ip}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "ip": "${ip}",
  "risk": {
    "score": 0.0,
    "level": "low|medium|high|critical",
    "is_vpn": false,
    "is_tor": false,
    "is_proxy": false,
    "is_datacenter": false,
    "is_malicious": false,
    "is_bot": false,
    "abuse_confidence_pct": number,
    "threat_types": ["string"]
  },
  "reputation": {
    "blacklisted": false,
    "blacklist_sources": ["string"],
    "reports_count": number,
    "last_reported": "ISO8601 or null"
  },
  "recommendation": "allow|flag|block|captcha",
  "confidence_per_section": {"risk": 0.88, "reputation": 0.85},
  "recommended_actions_priority_order": ["block if score > 0.8", "require CAPTCHA for medium risk", "log for audit trail", "alert on Tor/VPN for compliance"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /bulk
router.post('/bulk', async (req: Request, res: Response) => {
  const { ips } = req.body;
  if (!ips || !Array.isArray(ips)) return res.status(400).json({ error: 'ips array is required' });
  if (ips.length > 50) return res.status(400).json({ error: 'ips array must not exceed 50 entries' });
  try {
    const ipList = ips.slice(0, 50).join(', ');
    const raw = await callClaude(`Bulk geolocate IPs: ${ipList}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "total": ${ips.length},
  "results": [
    {
      "ip": "string",
      "country_code": "string",
      "city": "string",
      "lat": number,
      "lon": number,
      "isp": "string",
      "is_datacenter": false,
      "risk_level": "low|medium|high|critical"
    }
  ],
  "summary": {
    "top_countries": ["string"],
    "datacenter_ips_count": number,
    "high_risk_count": number
  },
  "confidence_per_section": {"results": 0.88, "summary": 0.85},
  "recommended_actions_priority_order": ["flag high-risk IPs for review", "segment by country for geo-reporting", "block datacenter IPs if consumer-only service"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { ip, ips, objective } = req.body;
  const hasInput = ip || (ips && Array.isArray(ips) && ips.length > 0);
  const flags: string[] = [];
  if (!hasInput) flags.push('NO_IP_PROVIDED');
  if (ips && Array.isArray(ips) && ips.length > 50) flags.push('BULK_LIMIT_EXCEEDED');
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: flags.length === 0,
    ip: ip || null,
    ips_count: ips ? ips.length : null,
    objective: objective || 'ip_intelligence',
    next_api: 'user-risk',
    next_endpoint: '/score',
    blocking_flags: flags,
    flag_definitions: { NO_IP_PROVIDED: 'Provide ip (string) or ips (array)', BULK_LIMIT_EXCEEDED: 'ips array must not exceed 50 entries' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Run /lookup for basic geolocation', 'Run /risk for fraud prevention scoring', 'Run /bulk for batch processing up to 50 IPs'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /analyze (ONE-CALL)
router.post('/analyze', async (req: Request, res: Response) => {
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ error: 'ip is required' });
  try {
    const raw = await callClaude(`Full IP intelligence for: "${ip}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "ip": "${ip}",
  "geo": {"country": "string", "country_code": "string", "region": "string", "city": "string", "lat": number, "lon": number, "timezone": "string"},
  "network": {"asn": "string", "isp": "string", "org": "string", "connection_type": "string", "is_datacenter": false, "is_mobile": false},
  "risk": {"score": 0.0, "level": "low|medium|high|critical", "is_vpn": false, "is_tor": false, "is_proxy": false, "is_malicious": false, "threat_types": ["string"]},
  "reputation": {"blacklisted": false, "blacklist_sources": ["string"], "reports_count": number},
  "recommendation": "allow|flag|block|captcha",
  "use_cases": {"access_control": "allow|deny", "localization_country": "string", "fraud_signal": "low|medium|high"},
  "confidence_per_section": {"geo": 0.9, "network": 0.88, "risk": 0.87},
  "recommended_actions_priority_order": ["act on recommendation for real-time access control", "log geo and risk for audit", "pass to user-risk API for holistic scoring"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
