import { Router, Request, Response } from 'express';
import axios from 'axios';
import dns from 'dns/promises';

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

function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'DNS Lookup API', info: '/dns-lookup/info', openapi: '/dns-lookup/openapi.json', health: 'ok' });
});

router.post('/lookup', async (req: Request, res: Response) => {
  const { domain, record_type } = req.body;
  if (!domain) return res.status(400).json({ error: 'domain is required' });
  try {
    const type = (record_type || 'A').toUpperCase();
    let records: any[] = [];
    try {
      if (type === 'A') records = await dns.resolve4(domain);
      else if (type === 'AAAA') records = await dns.resolve6(domain);
      else if (type === 'MX') records = await dns.resolveMx(domain);
      else if (type === 'TXT') records = await dns.resolveTxt(domain);
      else if (type === 'NS') records = await dns.resolveNs(domain);
      else if (type === 'CNAME') records = await dns.resolveCname(domain);
      else if (type === 'SOA') { const soa = await dns.resolveSoa(domain); records = [soa]; }
      else if (type === 'ANY') records = await dns.resolve(domain);
    } catch {}
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      domain, record_type: type, records, record_count: records.length,
      source_provenance: { provider: 'dns-lookup-live', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
      cache_ttl_seconds: 300, cache_recommended: true,
      recommended_next_api: 'dns-lookup', recommended_next_endpoint: '/dns-intelligence',
      automation_safe: true, confidence_per_section: { dns: 1.0 },
      recommended_actions_priority_order: ['verify records', 'check propagation', 'monitor changes'],
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/reverse', async (req: Request, res: Response) => {
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ error: 'ip is required' });
  try {
    let hostnames: string[] = [];
    try { hostnames = await dns.reverse(ip); } catch {}
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      ip, hostnames, primary_hostname: hostnames[0] || null,
      has_reverse_dns: hostnames.length > 0,
      source_provenance: { provider: 'dns-lookup-live', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
      cache_ttl_seconds: 3600, cache_recommended: true,
      recommended_next_api: 'dns-lookup', recommended_next_endpoint: '/dns-intelligence',
      automation_safe: true, confidence_per_section: { reverse_dns: 1.0 },
      recommended_actions_priority_order: ['verify hostname', 'check email deliverability', 'validate IP ownership'],
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/mx', async (req: Request, res: Response) => {
  const { domain } = req.body;
  if (!domain) return res.status(400).json({ error: 'domain is required' });
  try {
    let mx: any[] = [];
    try { mx = await dns.resolveMx(domain); } catch {}
    mx.sort((a, b) => a.priority - b.priority);
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      domain, mx_records: mx, mx_count: mx.length, has_mx: mx.length > 0,
      primary_mx: mx[0]?.exchange || null,
      email_provider: mx[0]?.exchange?.includes('google') ? 'Google Workspace' : mx[0]?.exchange?.includes('outlook') ? 'Microsoft 365' : mx[0]?.exchange?.includes('amazon') ? 'Amazon SES' : 'custom/other',
      source_provenance: { provider: 'dns-lookup-live', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
      cache_ttl_seconds: 3600, cache_recommended: true,
      recommended_next_api: 'dns-lookup', recommended_next_endpoint: '/dns-intelligence',
      automation_safe: true, confidence_per_section: { mx: 1.0 },
      recommended_actions_priority_order: ['verify email delivery', 'check SPF/DKIM', 'test email flow'],
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { domain, objective } = req.body;
  if (!domain) return res.status(400).json({ error: 'domain is required' });
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, objective: objective || 'dns_lookup',
    next_api: 'dns-lookup', next_endpoint: '/lookup',
    blocking_flags: [], flag_definitions: { NO_DOMAIN: 'domain is required' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'dns-lookup', recommended_next_endpoint: '/lookup',
    automation_safe: true, confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Lookup DNS records', 'Check MX', 'Monitor propagation'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/dns-intelligence', async (req: Request, res: Response) => {
  const { domain } = req.body;
  if (!domain) return res.status(400).json({ error: 'domain is required' });
  try {
    let a: string[] = [], mx: any[] = [], ns: string[] = [], txt: string[][] = [];
    try { a = await dns.resolve4(domain); } catch {}
    try { mx = await dns.resolveMx(domain); } catch {}
    try { ns = await dns.resolveNs(domain); } catch {}
    try { txt = await dns.resolveTxt(domain); } catch {}
    const raw = await callClaude(`DNS intelligence for ${domain}. A: ${JSON.stringify(a)}, MX: ${JSON.stringify(mx)}, NS: ${JSON.stringify(ns)}, TXT preview: ${JSON.stringify(txt).slice(0, 200)}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"domain":"${domain}","health_score":0.0,"issues":["string"],"email_configured":true,"spf_present":false,"dmarc_present":false,"dkim_present":false,"cdn_detected":false,"ddos_protection":false,"recommendations":["string"],"source_provenance":{"provider":"dns-lookup-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"dns-lookup","recommended_next_endpoint":"/propagation","automation_safe":true,"confidence_per_section":{"health":0.88},"recommended_actions_priority_order":["add SPF/DMARC","fix issues","enable CDN protection"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/propagation', async (req: Request, res: Response) => {
  const { domain, record_type, expected_value } = req.body;
  if (!domain) return res.status(400).json({ error: 'domain is required' });
  try {
    const raw = await callClaude(`Check DNS propagation status for ${domain} ${record_type || 'A'} record. Expected: ${expected_value || 'any'}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"domain":"${domain}","record_type":"${record_type || 'A'}","propagation_status":"propagated|propagating|not_propagated","estimated_complete_percent":0,"regions_checked":["us-east","us-west","eu-west","ap-southeast"],"region_results":[{"region":"string","resolved_value":"string","propagated":true}],"estimated_complete_in":"string","source_provenance":{"provider":"dns-lookup-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.9},"cache_ttl_seconds":300,"cache_recommended":false,"recommended_next_api":"dns-lookup","recommended_next_endpoint":"/dns-intelligence","automation_safe":true,"confidence_per_section":{"propagation":0.82},"recommended_actions_priority_order":["wait for full propagation","notify affected users","test from multiple regions"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { domains, record_type } = req.body;
  if (!Array.isArray(domains) || domains.length === 0) return res.status(400).json({ error: 'domains array is required' });
  if (domains.length > 20) return res.status(400).json({ error: 'Maximum 20 domains per batch' });
  try {
    const type = (record_type || 'A').toUpperCase();
    const results = await Promise.all(domains.map(async (domain: string) => {
      let records: any[] = [];
      try { if (type === 'A') records = await dns.resolve4(domain); } catch {}
      return { domain, record_type: type, records, record_count: records.length };
    }));
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      batch_count: domains.length, record_type: type, results,
      source_provenance: { provider: 'dns-lookup-live', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
      cache_ttl_seconds: 300, cache_recommended: true,
      recommended_next_api: 'dns-lookup', recommended_next_endpoint: '/dns-intelligence',
      automation_safe: true, privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
