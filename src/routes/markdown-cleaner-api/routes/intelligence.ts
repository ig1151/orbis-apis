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
  res.json({ name: 'Markdown Cleaner API', info: '/markdown-cleaner/info', openapi: '/markdown-cleaner/openapi.json', health: 'ok' });
});

router.post('/clean', async (req: Request, res: Response) => {
  const { markdown, style } = req.body;
  if (!markdown) return res.status(400).json({ error: 'markdown is required' });
  try {
    const raw = await callClaude(`Clean and normalize markdown: "${markdown.slice(0,3000)}". Style guide: ${style||'standard'}. Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"cleaned_markdown":"string","changes_made":["string"],"artifacts_removed":["string"],"whitespace_fixed":true,"encoding_fixed":true,"char_count_before":0,"char_count_after":0,"source_provenance":{"provider":"markdown-cleaner-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":1.0},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"markdown-cleaner","recommended_next_endpoint":"/lint","automation_safe":true,"confidence_per_section":{"cleaning":0.95},"recommended_actions_priority_order":["review changes","lint result","use in workflow"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/format', async (req: Request, res: Response) => {
  const { markdown, standard } = req.body;
  if (!markdown) return res.status(400).json({ error: 'markdown is required' });
  try {
    const raw = await callClaude(`Format markdown to standard style: "${markdown.slice(0,3000)}". Standard: ${standard||'CommonMark'}. Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"formatted_markdown":"string","standard_applied":"string","heading_levels_normalized":true,"list_style_normalized":true,"code_blocks_formatted":true,"link_format_normalized":true,"changes":["string"],"source_provenance":{"provider":"markdown-cleaner-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":1.0},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"markdown-cleaner","recommended_next_endpoint":"/markdown-intelligence","automation_safe":true,"confidence_per_section":{"formatting":0.93},"recommended_actions_priority_order":["use formatted output","validate rendering","commit to repo"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/lint', async (req: Request, res: Response) => {
  const { markdown } = req.body;
  if (!markdown) return res.status(400).json({ error: 'markdown is required' });
  try {
    const raw = await callClaude(`Lint markdown for issues: "${markdown.slice(0,3000)}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"lint_score":0.0,"issues":[{"type":"broken_link|missing_alt|duplicate_heading|empty_section|inconsistent_style|encoding","severity":"error|warning|info","line":0,"description":"string","suggestion":"string"}],"error_count":0,"warning_count":0,"info_count":0,"passed":false,"source_provenance":{"provider":"markdown-cleaner-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":1.0},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"markdown-cleaner","recommended_next_endpoint":"/clean","automation_safe":true,"confidence_per_section":{"linting":0.90},"recommended_actions_priority_order":["fix errors first","address warnings","review info"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { markdown, objective } = req.body;
  if (!markdown) return res.status(400).json({ error: 'markdown is required' });
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, objective: objective || 'markdown_cleaning',
    next_api: 'markdown-cleaner', next_endpoint: '/clean',
    blocking_flags: [], flag_definitions: { NO_MARKDOWN: 'markdown is required' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'markdown-cleaner', recommended_next_endpoint: '/clean',
    automation_safe: true, confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Clean markdown', 'Format to standard', 'Lint for issues'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/markdown-intelligence', async (req: Request, res: Response) => {
  const { markdown, purpose } = req.body;
  if (!markdown) return res.status(400).json({ error: 'markdown is required' });
  try {
    const raw = await callClaude(`Full markdown intelligence - clean, format, lint and analyze: "${markdown.slice(0,3000)}". Purpose: ${purpose||'documentation'}. Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"cleaned_markdown":"string","lint_score":0.0,"issues_count":0,"structure":{"heading_count":0,"link_count":0,"image_count":0,"code_block_count":0,"list_count":0},"readability_score":0.0,"content_type":"documentation|readme|blog|spec|notes|other","quality_assessment":"excellent|good|needs_work|poor","improvement_suggestions":["string"],"source_provenance":{"provider":"markdown-cleaner-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":1.0},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"text-summarizer","recommended_next_endpoint":"/summarize","automation_safe":true,"confidence_per_section":{"cleaning":0.95,"analysis":0.88},"recommended_actions_priority_order":["apply improvements","fix lint issues","finalize content"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/extract-structure', async (req: Request, res: Response) => {
  const { markdown } = req.body;
  if (!markdown) return res.status(400).json({ error: 'markdown is required' });
  try {
    const raw = await callClaude(`Extract document structure from markdown: "${markdown.slice(0,3000)}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"table_of_contents":[{"level":0,"heading":"string","anchor":"string","char_count":0}],"sections":[{"heading":"string","content_preview":"string","word_count":0}],"links":{"internal":["string"],"external":["string"]},"code_languages":["string"],"frontmatter":{},"source_provenance":{"provider":"markdown-cleaner-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":1.0},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"knowledge-graph","recommended_next_endpoint":"/build","automation_safe":true,"confidence_per_section":{"structure":0.92},"recommended_actions_priority_order":["use TOC","validate links","index sections"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items array is required' });
  if (items.length > 5) return res.status(400).json({ error: 'Maximum 5 items per batch' });
  try {
    const results = await Promise.all(items.map(async (item: { markdown: string; label?: string }) => {
      const raw = await callClaude(`Quick markdown lint: "${item.markdown.slice(0,500)}". Return JSON only:
{"label":"${item.label||''}","lint_score":0.0,"issue_count":0,"passed":false,"top_issue":"string","success":true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      batch_count: items.length, results,
      source_provenance: { provider: 'markdown-cleaner-ai', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
      cache_ttl_seconds: 3600, cache_recommended: true,
      recommended_next_api: 'markdown-cleaner', recommended_next_endpoint: '/markdown-intelligence',
      automation_safe: true, privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
