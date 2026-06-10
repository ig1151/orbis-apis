import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';


function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'API Health Check API', info: '/api-health-check/info', openapi: '/api-health-check/openapi.json', health: 'ok' });
});

router.post('/check', async (req: Request, res: Response) => {
  const { url, method, expected_status, headers: reqHeaders, timeout_ms } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const start = Date.now();
    let actual_status = 0;
    let reachable = false;
    try {
      const resp = await axios({ method: method || 'GET', url, headers: reqHeaders || {}, timeout: timeout_ms || 5000, validateStatus: () => true });
      actual_status = resp.status;
      reachable = true;
    } catch { reachable = false; }
    const latency_ms = Date.now() - start;
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      url, method: method || 'GET', reachable,
      status_code: actual_status, expected_status: expected_status || 200,
      status_match: actual_status === (expected_status || 200),
      latency_ms, health: reachable && actual_status < 500 ? 'healthy' : 'unhealthy',
      source_provenance: { provider: 'api-health-check', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
      cache_ttl_seconds: 30, cache_recommended: false,
      recommended_next_api: 'api-health-check', recommended_next_endpoint: '/monitor',
      automation_safe: true, confidence_per_section: { health: 1.0 },
      recommended_actions_priority_order: ['alert if unhealthy', 'monitor latency', 'set up recurring checks'],
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/monitor', async (req: Request, res: Response) => {
  const { endpoints } = req.body;
  if (!Array.isArray(endpoints) || endpoints.length === 0) return res.status(400).json({ error: 'endpoints array is required' });
  if (endpoints.length > 20) return res.status(400).json({ error: 'Maximum 20 endpoints per monitor' });
  try {
    const results = await Promise.all(endpoints.map(async (ep: { url: string; method?: string; name?: string }) => {
      const start = Date.now();
      let status = 0; let reachable = false;
      try {
        const r = await axios({ method: ep.method || 'GET', url: ep.url, timeout: 5000, validateStatus: () => true });
        status = r.status; reachable = true;
      } catch { reachable = false; }
      return { name: ep.name || ep.url, url: ep.url, reachable, status_code: status, latency_ms: Date.now() - start, health: reachable && status < 500 ? 'healthy' : 'unhealthy' };
    }));
    const healthy = results.filter(r => r.health === 'healthy').length;
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      total: endpoints.length, healthy, unhealthy: endpoints.length - healthy,
      health_ratio: healthy / endpoints.length, results,
      overall_status: healthy === endpoints.length ? 'all_healthy' : healthy > 0 ? 'degraded' : 'all_down',
      source_provenance: { provider: 'api-health-check', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
      cache_ttl_seconds: 30, cache_recommended: false,
      recommended_next_api: 'api-health-check', recommended_next_endpoint: '/alert',
      automation_safe: true, confidence_per_section: { health: 1.0 },
      recommended_actions_priority_order: ['alert on unhealthy', 'investigate degraded', 'schedule next check'],
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/latency', async (req: Request, res: Response) => {
  const { url, samples } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  const sampleCount = Math.min(samples || 3, 5);
  try {
    const timings: number[] = [];
    for (let i = 0; i < sampleCount; i++) {
      const s = Date.now();
      try { await axios.get(url, { timeout: 5000, validateStatus: () => true }); } catch {}
      timings.push(Date.now() - s);
    }
    const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
    const min = Math.min(...timings); const max = Math.max(...timings);
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      url, samples: sampleCount, timings_ms: timings,
      avg_ms: Math.round(avg), min_ms: min, max_ms: max,
      p95_ms: Math.round(timings.sort((a, b) => a - b)[Math.floor(sampleCount * 0.95)] || max),
      latency_grade: avg < 200 ? 'excellent' : avg < 500 ? 'good' : avg < 1000 ? 'acceptable' : 'poor',
      source_provenance: { provider: 'api-health-check', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
      cache_ttl_seconds: 60, cache_recommended: false,
      recommended_next_api: 'api-health-check', recommended_next_endpoint: '/health-intelligence',
      automation_safe: true, confidence_per_section: { latency: 1.0 },
      recommended_actions_priority_order: ['alert if avg > threshold', 'investigate high p95', 'optimize slow endpoints'],
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { url, objective } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, objective: objective || 'api_health_monitoring',
    next_api: 'api-health-check', next_endpoint: '/check',
    blocking_flags: [], flag_definitions: { NO_URL: 'url is required' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'api-health-check', recommended_next_endpoint: '/check',
    automation_safe: true, confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Check endpoint', 'Measure latency', 'Set up monitoring'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/health-intelligence', async (req: Request, res: Response) => {
  const { url, history } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const raw = await callClaude(`Analyze API health for ${url}. History: ${JSON.stringify(history || []).slice(0, 500)}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"url":"${url}","health_trend":"improving|stable|degrading","uptime_percent":0.0,"avg_latency_ms":0,"incidents":[],"recommendations":["string"],"sla_compliance":true,"alert_threshold_ms":500,"root_cause_hypothesis":"string","source_provenance":{"provider":"api-health-check","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":300,"cache_recommended":true,"recommended_next_api":"api-health-check","recommended_next_endpoint":"/alert","automation_safe":true,"confidence_per_section":{"trend":0.85,"recommendations":0.8},"recommended_actions_priority_order":["set alert thresholds","notify oncall","optimize performance"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/alert', async (req: Request, res: Response) => {
  const { url, status, latency_ms, threshold_ms } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const raw = await callClaude(`Generate API health alert for ${url}. Status: ${status || 'unknown'}, Latency: ${latency_ms || 0}ms, Threshold: ${threshold_ms || 500}ms. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"alert_triggered":false,"alert_severity":"none|info|warning|critical","alert_message":"string","recommended_actions":["string"],"escalation_required":false,"estimated_impact":"none|low|medium|high|critical","runbook_steps":["string"],"source_provenance":{"provider":"api-health-check","retrieved_at":"${new Date().toISOString()}","freshness_score":1.0},"cache_ttl_seconds":0,"cache_recommended":false,"recommended_next_api":"api-health-check","recommended_next_endpoint":"/health-intelligence","automation_safe":true,"confidence_per_section":{"alert":0.95},"recommended_actions_priority_order":["notify oncall","run diagnostics","apply runbook"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { urls } = req.body;
  if (!Array.isArray(urls) || urls.length === 0) return res.status(400).json({ error: 'urls array is required' });
  if (urls.length > 20) return res.status(400).json({ error: 'Maximum 20 URLs per batch' });
  try {
    const results = await Promise.all(urls.map(async (u: string | { url: string; name?: string }) => {
      const url = typeof u === 'string' ? u : u.url;
      const name = typeof u === 'object' ? u.name : url;
      let status = 0; let reachable = false; const start = Date.now();
      try { const r = await axios.get(url, { timeout: 4000, validateStatus: () => true }); status = r.status; reachable = true; } catch {}
      return { name, url, reachable, status_code: status, latency_ms: Date.now() - start, health: reachable && status < 500 ? 'healthy' : 'unhealthy' };
    }));
    const healthy = results.filter(r => r.health === 'healthy').length;
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      batch_count: urls.length, healthy, unhealthy: urls.length - healthy, results,
      source_provenance: { provider: 'api-health-check', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
      cache_ttl_seconds: 30, cache_recommended: false,
      recommended_next_api: 'api-health-check', recommended_next_endpoint: '/alert',
      automation_safe: true, privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
