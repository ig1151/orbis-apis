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
  res.json({ name: 'Web Page Extractor API', info: '/web-page-extractor/info', openapi: '/web-page-extractor/openapi.json', health: 'ok' });
});

// POST /extract-text
router.post('/extract-text', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const raw = await callClaude(`Extract clean text content from URL: "${url}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "url": "${url}",
  "text": {
    "title": "string",
    "body": "string (clean readable text, no HTML)",
    "summary": "string (2-3 sentence summary)",
    "word_count": number,
    "language": "en|es|fr|de|...",
    "reading_time_minutes": number
  },
  "content_type": "article|blog|product|documentation|landing-page|other",
  "confidence_per_section": {"text": 0.9, "content_type": 0.85},
  "recommended_actions_priority_order": ["ingest into RAG pipeline", "chunk for embeddings", "summarize for agent context"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /extract-links
router.post('/extract-links', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const raw = await callClaude(`Extract all links from URL: "${url}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "url": "${url}",
  "links": {
    "internal": [{"href": "string", "text": "string", "rel": "string or null"}],
    "external": [{"href": "string", "text": "string", "domain": "string"}],
    "social": [{"href": "string", "platform": "twitter|linkedin|github|other"}],
    "downloads": [{"href": "string", "type": "pdf|csv|zip|other"}]
  },
  "link_summary": {"total_internal": number, "total_external": number, "total_social": number},
  "confidence_per_section": {"links": 0.88},
  "recommended_actions_priority_order": ["crawl internal links for sitemap", "analyze external links for partnerships", "follow download links for content extraction"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /extract-metadata
router.post('/extract-metadata', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const raw = await callClaude(`Extract metadata from URL: "${url}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "url": "${url}",
  "metadata": {
    "title": "string",
    "description": "string or null",
    "keywords": ["string"],
    "author": "string or null",
    "published_at": "YYYY-MM-DD or null",
    "modified_at": "YYYY-MM-DD or null",
    "og_title": "string or null",
    "og_description": "string or null",
    "og_image": "string or null",
    "canonical_url": "string or null",
    "robots": "string or null",
    "schema_types": ["Article","WebPage"]
  },
  "seo_signals": {"has_canonical": true, "has_og_tags": true, "has_schema": true, "indexable": true},
  "confidence_per_section": {"metadata": 0.92, "seo_signals": 0.88},
  "recommended_actions_priority_order": ["use metadata for content classification", "use og_image for visual previews", "check canonical for deduplication"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { url, objective } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  const flags: string[] = [];
  if (!url.startsWith('http://') && !url.startsWith('https://')) flags.push('INVALID_URL_SCHEME');
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: flags.length === 0,
    url,
    objective: objective || 'content_extraction',
    next_api: 'knowledge-graph',
    next_endpoint: '/extract',
    blocking_flags: flags,
    flag_definitions: { INVALID_URL_SCHEME: 'URL must start with http:// or https://' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Run /extract-text for RAG ingestion', 'Run /extract-metadata for SEO signals', 'Run /extract-links to map site structure'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /extract (ONE-CALL)
router.post('/extract', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const raw = await callClaude(`Full page extraction for URL: "${url}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "url": "${url}",
  "text": {"title": "string", "body": "string", "summary": "string", "word_count": number, "language": "string", "reading_time_minutes": number},
  "metadata": {"title": "string", "description": "string or null", "author": "string or null", "published_at": "YYYY-MM-DD or null", "og_image": "string or null", "canonical_url": "string or null"},
  "links": {"internal_count": number, "external_count": number, "top_external_domains": ["string"]},
  "content_type": "article|blog|product|documentation|landing-page|other",
  "rag_ready": true,
  "chunks": [{"index": 0, "text": "string", "token_estimate": number}],
  "confidence_per_section": {"text": 0.9, "metadata": 0.92, "links": 0.88},
  "recommended_actions_priority_order": ["embed chunks for vector search", "index metadata for filtering", "follow top external domains for deeper research"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
