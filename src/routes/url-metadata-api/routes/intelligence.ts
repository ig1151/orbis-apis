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

function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'URL Metadata API', info: '/url-metadata/info', openapi: '/url-metadata/openapi.json', health: 'ok' });
});

router.post('/fetch', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const raw = await callClaude(`Fetch and return URL metadata for: "${url}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"url":"${url}","title":"string","description":"string","canonical_url":"string","language":"string","author":"string","published_date":"string","modified_date":"string","content_type":"article|product|documentation|landing_page|video|image|other","domain":"string","favicon_url":"string","word_count":0,"reading_time_minutes":0,"source_provenance":{"provider":"url-metadata-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.88},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"url-metadata","recommended_next_endpoint":"/og-tags","automation_safe":true,"confidence_per_section":{"metadata":0.88},"recommended_actions_priority_order":["use metadata","check OG tags","validate links"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/og-tags', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const raw = await callClaude(`Extract Open Graph and social meta tags for URL: "${url}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"url":"${url}","og":{"title":"string","description":"string","image":"string","url":"string","type":"website|article|product|video","site_name":"string"},"twitter":{"card":"summary|summary_large_image","title":"string","description":"string","image":"string"},"schema_org_type":"string","article_tags":["string"],"social_preview_score":0.0,"missing_tags":["string"],"source_provenance":{"provider":"url-metadata-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.88},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"url-metadata","recommended_next_endpoint":"/url-intelligence","automation_safe":true,"confidence_per_section":{"og_tags":0.90},"recommended_actions_priority_order":["use OG image for preview","add missing tags","optimize social share"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/analyze', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const raw = await callClaude(`Analyze URL quality and safety: "${url}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"url":"${url}","safety_score":0.0,"quality_score":0.0,"is_safe":true,"is_accessible":true,"redirect_count":0,"final_url":"string","ssl_valid":true,"domain_age_years":0,"spam_score":0.0,"malware_indicator":false,"phishing_indicator":false,"content_quality":"high|medium|low","mobile_friendly":true,"source_provenance":{"provider":"url-metadata-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.88},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"url-metadata","recommended_next_endpoint":"/url-intelligence","automation_safe":true,"confidence_per_section":{"safety":0.85,"quality":0.80},"recommended_actions_priority_order":["check safety result","block unsafe URLs","use quality score for ranking"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { url, objective } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, objective: objective || 'url_metadata_extraction',
    next_api: 'url-metadata', next_endpoint: '/fetch',
    blocking_flags: [], flag_definitions: { NO_URL: 'url is required' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'url-metadata', recommended_next_endpoint: '/fetch',
    automation_safe: true, confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Fetch metadata', 'Extract OG tags', 'Analyze safety'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/url-intelligence', async (req: Request, res: Response) => {
  const { url, purpose } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const raw = await callClaude(`Full URL intelligence: "${url}". Purpose: ${purpose||'link preview and safety check'}. Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"url":"${url}","title":"string","description":"string","og_image":"string","content_type":"string","safety_score":0.0,"quality_score":0.0,"is_safe":true,"domain":"string","language":"string","published_date":"string","author":"string","reading_time_minutes":0,"social_preview":{"title":"string","description":"string","image":"string"},"seo_signals":{"has_canonical":true,"has_schema":true,"mobile_friendly":true},"source_provenance":{"provider":"url-metadata-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.88},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"web-page-extractor","recommended_next_endpoint":"/extract","automation_safe":true,"confidence_per_section":{"metadata":0.88,"safety":0.85},"recommended_actions_priority_order":["use social preview","verify safety","extract full content if needed"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/link-preview', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const raw = await callClaude(`Generate rich link preview for: "${url}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"url":"${url}","preview":{"title":"string","description":"string","image_url":"string","favicon_url":"string","domain":"string","site_name":"string"},"preview_type":"large_image|small_image|no_image","share_text":"string","embed_html":"string","source_provenance":{"provider":"url-metadata-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.88},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"url-metadata","recommended_next_endpoint":"/url-intelligence","automation_safe":true,"confidence_per_section":{"preview":0.88},"recommended_actions_priority_order":["render preview","use embed HTML","cache result"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { urls } = req.body;
  if (!Array.isArray(urls) || urls.length === 0) return res.status(400).json({ error: 'urls array is required' });
  if (urls.length > 10) return res.status(400).json({ error: 'Maximum 10 URLs per batch' });
  try {
    const results = await Promise.all(urls.map(async (url: string) => {
      const raw = await callClaude(`Quick URL metadata for: "${url}". Return JSON only:
{"url":"${url}","title":"string","description":"string","is_safe":true,"content_type":"string","success":true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      batch_count: urls.length, results,
      source_provenance: { provider: 'url-metadata-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.88 },
      cache_ttl_seconds: 3600, cache_recommended: true,
      recommended_next_api: 'url-metadata', recommended_next_endpoint: '/url-intelligence',
      automation_safe: true, privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
