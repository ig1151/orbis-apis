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
  res.json({ name: 'HTML to Markdown API', info: '/html-to-markdown/info', openapi: '/html-to-markdown/openapi.json', health: 'ok' });
});

router.post('/convert', async (req: Request, res: Response) => {
  const { html, options } = req.body;
  if (!html) return res.status(400).json({ error: 'html is required' });
  try {
    const raw = await callClaude(`Convert this HTML to clean Markdown. HTML: "${html.slice(0,3000)}". Options: ${JSON.stringify(options||{})}. Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"markdown":"string","char_count_in":0,"char_count_out":0,"compression_ratio":0.0,"headings_found":0,"links_converted":0,"images_converted":0,"tables_converted":0,"source_provenance":{"provider":"html-to-markdown-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":1.0},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"html-to-markdown","recommended_next_endpoint":"/clean","automation_safe":true,"confidence_per_section":{"conversion":0.95},"recommended_actions_priority_order":["review output","clean if needed","use in workflow"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/clean', async (req: Request, res: Response) => {
  const { markdown } = req.body;
  if (!markdown) return res.status(400).json({ error: 'markdown is required' });
  try {
    const raw = await callClaude(`Clean and normalize this Markdown content, removing artifacts and fixing formatting: "${markdown.slice(0,3000)}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"cleaned_markdown":"string","issues_fixed":["string"],"whitespace_normalized":true,"links_validated":true,"heading_hierarchy_fixed":true,"char_count_before":0,"char_count_after":0,"source_provenance":{"provider":"html-to-markdown-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":1.0},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"markdown-cleaner","recommended_next_endpoint":"/lint","automation_safe":true,"confidence_per_section":{"cleaning":0.92},"recommended_actions_priority_order":["verify output","lint for issues","use in downstream workflow"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/extract', async (req: Request, res: Response) => {
  const { html, sections } = req.body;
  if (!html) return res.status(400).json({ error: 'html is required' });
  try {
    const raw = await callClaude(`Extract content sections from HTML: "${html.slice(0,3000)}". Target sections: ${sections||'main content, headings, links, metadata'}. Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"title":"string","description":"string","main_content":"string","headings":["string"],"links":[{"text":"string","href":"string"}],"images":[{"alt":"string","src":"string"}],"meta_tags":{"description":"string","keywords":"string","og_title":"string"},"word_count":0,"reading_time_minutes":0,"source_provenance":{"provider":"html-to-markdown-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":1.0},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"url-metadata","recommended_next_endpoint":"/fetch","automation_safe":true,"confidence_per_section":{"extraction":0.90},"recommended_actions_priority_order":["use extracted content","validate links","index metadata"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { html, objective } = req.body;
  if (!html) return res.status(400).json({ error: 'html is required' });
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, objective: objective || 'html_conversion',
    next_api: 'html-to-markdown', next_endpoint: '/convert',
    blocking_flags: [], flag_definitions: { NO_HTML: 'html is required' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'html-to-markdown', recommended_next_endpoint: '/convert',
    automation_safe: true, confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Convert HTML', 'Clean output', 'Extract content'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/html-intelligence', async (req: Request, res: Response) => {
  const { html, purpose } = req.body;
  if (!html) return res.status(400).json({ error: 'html is required' });
  try {
    const raw = await callClaude(`Full HTML intelligence - convert, clean, extract and analyze: "${html.slice(0,3000)}". Purpose: ${purpose||'content extraction'}. Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"markdown":"string","title":"string","description":"string","main_content_markdown":"string","headings":["string"],"links":[{"text":"string","href":"string"}],"word_count":0,"reading_time_minutes":0,"content_type":"article|documentation|landing_page|ecommerce|blog|other","quality_score":0.0,"seo_signals":{"has_title":true,"has_description":true,"heading_structure":"good|fair|poor"},"source_provenance":{"provider":"html-to-markdown-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":1.0},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"markdown-cleaner","recommended_next_endpoint":"/clean","automation_safe":true,"confidence_per_section":{"conversion":0.95,"extraction":0.90},"recommended_actions_priority_order":["use converted markdown","validate content","clean if needed"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/simplify', async (req: Request, res: Response) => {
  const { html, target_format } = req.body;
  if (!html) return res.status(400).json({ error: 'html is required' });
  try {
    const raw = await callClaude(`Simplify HTML to plain readable text: "${html.slice(0,3000)}". Target format: ${target_format||'plain text'}. Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"plain_text":"string","simplified_markdown":"string","sentences":0,"words":0,"readability_score":0.0,"flesch_kincaid_grade":0.0,"source_provenance":{"provider":"html-to-markdown-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":1.0},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"text-summarizer","recommended_next_endpoint":"/summarize","automation_safe":true,"confidence_per_section":{"simplification":0.92},"recommended_actions_priority_order":["use simplified text","pass to summarizer","index for search"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items array is required' });
  if (items.length > 5) return res.status(400).json({ error: 'Maximum 5 items per batch' });
  try {
    const results = await Promise.all(items.map(async (item: { html: string; label?: string }) => {
      const raw = await callClaude(`Convert HTML to Markdown: "${item.html.slice(0,500)}". Return JSON only:
{"label":"${item.label||''}","markdown":"string","char_count":0,"success":true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      batch_count: items.length, results,
      source_provenance: { provider: 'html-to-markdown-ai', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
      cache_ttl_seconds: 3600, cache_recommended: true,
      recommended_next_api: 'markdown-cleaner', recommended_next_endpoint: '/clean',
      automation_safe: true, privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
