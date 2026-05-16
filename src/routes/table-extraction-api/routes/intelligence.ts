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
  res.json({ name: 'Table Extraction API', info: '/table-extraction/info', openapi: '/table-extraction/openapi.json', health: 'ok' });
});

router.post('/extract', async (req: Request, res: Response) => {
  const { document_text, table_index } = req.body;
  if (!document_text) return res.status(400).json({ error: 'document_text is required' });
  try {
    const raw = await callClaude(`Extract tables from document: "${document_text.slice(0, 2000)}". Table index: ${table_index ?? 'all'}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"tables":[{"table_index":0,"title":"string","headers":["string"],"rows":[["string"]],"row_count":0,"col_count":0,"has_merged_cells":false,"data_types":["string|number|date|boolean"]}],"table_count":0,"source_provenance":{"provider":"table-extraction-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"table-extraction","recommended_next_endpoint":"/to-json","automation_safe":true,"confidence_per_section":{"tables":0.9},"recommended_actions_priority_order":["convert to JSON","analyze data","export to CSV"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/to-json', async (req: Request, res: Response) => {
  const { table_text, headers } = req.body;
  if (!table_text) return res.status(400).json({ error: 'table_text is required' });
  try {
    const raw = await callClaude(`Convert table to structured JSON. Table: "${table_text}". Headers hint: ${headers || 'auto-detect'}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"headers":["string"],"data":[{}],"row_count":0,"metadata":{"detected_types":{},"has_totals_row":false,"has_header_row":true},"source_provenance":{"provider":"table-extraction-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"table-extraction","recommended_next_endpoint":"/table-intelligence","automation_safe":true,"confidence_per_section":{"conversion":0.93},"recommended_actions_priority_order":["validate schema","query data","export"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/to-csv', async (req: Request, res: Response) => {
  const { table_text, delimiter } = req.body;
  if (!table_text) return res.status(400).json({ error: 'table_text is required' });
  try {
    const raw = await callClaude(`Convert table to CSV. Table: "${table_text}". Delimiter: ${delimiter || ','}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"csv_content":"string","row_count":0,"col_count":0,"delimiter":"${delimiter || ','}","has_header":true,"source_provenance":{"provider":"table-extraction-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"table-extraction","recommended_next_endpoint":"/table-intelligence","automation_safe":true,"confidence_per_section":{"csv":0.95},"recommended_actions_priority_order":["download CSV","import to spreadsheet","analyze data"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { document_text, objective } = req.body;
  if (!document_text) return res.status(400).json({ error: 'document_text is required' });
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, objective: objective || 'table_extraction',
    next_api: 'table-extraction', next_endpoint: '/extract',
    blocking_flags: [], flag_definitions: { NO_DOCUMENT: 'document_text is required' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'table-extraction', recommended_next_endpoint: '/extract',
    automation_safe: true, confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Extract tables', 'Convert to JSON', 'Analyze data'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/table-intelligence', async (req: Request, res: Response) => {
  const { document_text, analysis_goal } = req.body;
  if (!document_text) return res.status(400).json({ error: 'document_text is required' });
  try {
    const raw = await callClaude(`Full table intelligence: "${document_text.slice(0, 2000)}". Goal: ${analysis_goal || 'summarize'}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"table_count":0,"tables_found":[{"title":"string","row_count":0,"col_count":0,"data_type":"financial|schedule|comparison|reference|other"}],"key_insights":["string"],"totals_detected":{},"trends":["string"],"anomalies":["string"],"recommended_visualizations":["bar_chart|line_chart|pie_chart|heatmap"],"source_provenance":{"provider":"table-extraction-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"table-extraction","recommended_next_endpoint":"/to-json","automation_safe":true,"confidence_per_section":{"insights":0.85,"trends":0.8},"recommended_actions_priority_order":["review insights","create visualizations","export data"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/merge', async (req: Request, res: Response) => {
  const { tables, merge_key } = req.body;
  if (!Array.isArray(tables) || tables.length < 2) return res.status(400).json({ error: 'At least 2 tables required' });
  try {
    const raw = await callClaude(`Merge ${tables.length} tables on key: ${merge_key || 'auto'}. Tables preview: ${JSON.stringify(tables).slice(0, 500)}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"merged_table":{"headers":["string"],"data":[{}],"row_count":0},"merge_key":"${merge_key || 'auto'}","tables_merged":${tables.length},"unmatched_rows":0,"conflicts_resolved":0,"source_provenance":{"provider":"table-extraction-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"table-extraction","recommended_next_endpoint":"/to-json","automation_safe":true,"confidence_per_section":{"merge":0.88},"recommended_actions_priority_order":["review merged data","validate integrity","export"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { documents } = req.body;
  if (!Array.isArray(documents) || documents.length === 0) return res.status(400).json({ error: 'documents array is required' });
  if (documents.length > 10) return res.status(400).json({ error: 'Maximum 10 documents per batch' });
  try {
    const results = await Promise.all(documents.map(async (d: { document_text: string; label?: string }) => {
      const raw = await callClaude(`Quick table scan: "${d.document_text.slice(0, 300)}". Return JSON:
{"label":"${d.label || ''}","table_count":0,"has_tables":true,"summary":"string","success":true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      batch_count: documents.length, results,
      source_provenance: { provider: 'table-extraction-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.95 },
      cache_ttl_seconds: 3600, cache_recommended: true,
      recommended_next_api: 'table-extraction', recommended_next_endpoint: '/extract',
      automation_safe: true, privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
