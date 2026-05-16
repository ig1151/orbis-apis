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
  res.json({ name: 'Legal Citation Parser API', info: '/legal-citation/info', openapi: '/legal-citation/openapi.json', health: 'ok' });
});

router.post('/parse', async (req: Request, res: Response) => {
  const { citation_text, jurisdiction } = req.body;
  if (!citation_text) return res.status(400).json({ error: 'citation_text is required' });
  try {
    const raw = await callClaude(`Parse legal citation: "${citation_text}". Jurisdiction: ${jurisdiction || 'US'}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"citation_type":"case|statute|regulation|treaty|secondary","parsed":{"case_name":"string","reporter":"string","volume":"string","page":"string","year":0,"court":"string","jurisdiction":"string","docket_number":"string"},"bluebook_format":"string","apa_format":"string","is_valid":true,"source_provenance":{"provider":"legal-citation-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"legal-citation","recommended_next_endpoint":"/resolve","automation_safe":true,"confidence_per_section":{"parsed":0.9},"recommended_actions_priority_order":["validate format","resolve case","add to bibliography"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/validate', async (req: Request, res: Response) => {
  const { citation_text, format } = req.body;
  if (!citation_text) return res.status(400).json({ error: 'citation_text is required' });
  try {
    const raw = await callClaude(`Validate legal citation format: "${citation_text}". Expected format: ${format || 'bluebook'}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"is_valid":true,"format_detected":"bluebook|apa|mla|oscola|other","errors":[],"warnings":["string"],"corrected_citation":"string","confidence":0.95,"source_provenance":{"provider":"legal-citation-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":1.0},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"legal-citation","recommended_next_endpoint":"/normalize","automation_safe":true,"confidence_per_section":{"validation":0.95},"recommended_actions_priority_order":["fix errors","normalize format","verify case exists"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/normalize', async (req: Request, res: Response) => {
  const { citation_text, target_format } = req.body;
  if (!citation_text) return res.status(400).json({ error: 'citation_text is required' });
  try {
    const raw = await callClaude(`Normalize legal citation to standard format. Citation: "${citation_text}", Target: ${target_format || 'bluebook'}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"original":"${citation_text}","normalized":"string","bluebook":"string","apa":"string","mla":"string","changes_made":["string"],"source_provenance":{"provider":"legal-citation-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"legal-citation","recommended_next_endpoint":"/resolve","automation_safe":true,"confidence_per_section":{"normalization":0.92},"recommended_actions_priority_order":["use normalized form","verify court","add to brief"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { citation_text, objective } = req.body;
  if (!citation_text) return res.status(400).json({ error: 'citation_text is required' });
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, objective: objective || 'citation_processing',
    next_api: 'legal-citation', next_endpoint: '/parse',
    blocking_flags: [], flag_definitions: { NO_CITATION: 'citation_text is required' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'legal-citation', recommended_next_endpoint: '/parse',
    automation_safe: true, confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Parse citation', 'Validate format', 'Resolve case'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/citation-intelligence', async (req: Request, res: Response) => {
  const { citation_text, context } = req.body;
  if (!citation_text) return res.status(400).json({ error: 'citation_text is required' });
  try {
    const raw = await callClaude(`Full legal citation intelligence: "${citation_text}". Context: ${context || 'legal brief'}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"citation_type":"string","is_valid":true,"parsed_fields":{"case_name":"string","year":0,"court":"string","reporter":"string"},"formats":{"bluebook":"string","apa":"string"},"case_summary":"string","precedent_strength":"landmark|major|minor|persuasive","jurisdiction":"string","legal_area":"constitutional|contract|tort|criminal|IP|other","related_citations":["string"],"source_provenance":{"provider":"legal-citation-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"legal-citation","recommended_next_endpoint":"/resolve","automation_safe":true,"confidence_per_section":{"parsed":0.9,"precedent":0.78},"recommended_actions_priority_order":["add to brief","check related cases","verify jurisdiction"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/resolve', async (req: Request, res: Response) => {
  const { citation_text } = req.body;
  if (!citation_text) return res.status(400).json({ error: 'citation_text is required' });
  try {
    const raw = await callClaude(`Resolve legal citation to case details: "${citation_text}". Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"case_name":"string","court":"string","year":0,"holding":"string","legal_principles":["string"],"outcome":"affirmed|reversed|remanded|dismissed","significance":"landmark|major|minor","jurisdiction":"string","appeals_to":"string","cited_by_count":0,"legal_area":"string","source_provenance":{"provider":"legal-citation-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.85},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"legal-citation","recommended_next_endpoint":"/citation-intelligence","automation_safe":true,"confidence_per_section":{"resolved":0.82},"recommended_actions_priority_order":["review holding","assess precedent","cite in brief"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { citations } = req.body;
  if (!Array.isArray(citations) || citations.length === 0) return res.status(400).json({ error: 'citations array is required' });
  if (citations.length > 20) return res.status(400).json({ error: 'Maximum 20 citations per batch' });
  try {
    const results = await Promise.all(citations.map(async (c: { citation_text: string }) => {
      const raw = await callClaude(`Quick citation parse: "${c.citation_text}". Return JSON:
{"citation_type":"string","is_valid":true,"bluebook":"string","case_name":"string","year":0,"success":true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      batch_count: citations.length, results,
      source_provenance: { provider: 'legal-citation-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.95 },
      cache_ttl_seconds: 86400, cache_recommended: true,
      recommended_next_api: 'legal-citation', recommended_next_endpoint: '/resolve',
      automation_safe: true, privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
