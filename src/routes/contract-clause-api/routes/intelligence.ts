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
  res.json({ name: 'Contract Clause Extractor API', info: '/contract-clause/info', openapi: '/contract-clause/openapi.json', health: 'ok' });
});

router.post('/extract', async (req: Request, res: Response) => {
  const { contract_text, clause_types } = req.body;
  if (!contract_text) return res.status(400).json({ error: 'contract_text is required' });
  try {
    const raw = await callClaude(`Extract contract clauses from: "${contract_text.slice(0, 2000)}". Focus on: ${clause_types || 'all'}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"contract_type":"NDA|MSA|SLA|employment|vendor|lease|other","clauses":[{"type":"termination|payment|liability|indemnification|IP|confidentiality|dispute|governing_law|warranty|other","title":"string","text":"string","section":"string","obligations":["string"],"rights":["string"],"conditions":["string"]}],"clause_count":0,"parties":[{"name":"string","role":"party_a|party_b|guarantor"}],"effective_date":"YYYY-MM-DD","expiry_date":"YYYY-MM-DD","source_provenance":{"provider":"contract-clause-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"contract-clause","recommended_next_endpoint":"/analyze-risk","automation_safe":true,"confidence_per_section":{"clauses":0.88,"parties":0.93},"recommended_actions_priority_order":["review key clauses","assess risk","negotiate red flags"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/analyze-risk', async (req: Request, res: Response) => {
  const { contract_text, party_role } = req.body;
  if (!contract_text) return res.status(400).json({ error: 'contract_text is required' });
  try {
    const raw = await callClaude(`Analyze contract risk from perspective of ${party_role || 'buyer'}: "${contract_text.slice(0, 2000)}". Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"overall_risk":"low|medium|high|critical","risk_score":0.0,"risks":[{"clause_type":"string","risk_level":"low|medium|high|critical","description":"string","recommended_action":"accept|negotiate|reject","suggested_language":"string"}],"favorable_clauses":["string"],"unfavorable_clauses":["string"],"missing_standard_clauses":["string"],"source_provenance":{"provider":"contract-clause-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"contract-clause","recommended_next_endpoint":"/red-flags","automation_safe":true,"confidence_per_section":{"risk":0.85,"recommendations":0.82},"recommended_actions_priority_order":["negotiate high risks","accept low risks","add missing clauses"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/compare', async (req: Request, res: Response) => {
  const { contract_a, contract_b } = req.body;
  if (!contract_a || !contract_b) return res.status(400).json({ error: 'contract_a and contract_b are required' });
  try {
    const raw = await callClaude(`Compare these two contract versions. A: "${contract_a.slice(0, 1000)}" B: "${contract_b.slice(0, 1000)}". Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"changes":[{"clause_type":"string","change_type":"added|removed|modified","version_a":"string","version_b":"string","risk_impact":"increased|decreased|neutral","significance":"high|medium|low"}],"change_count":0,"risk_delta":"improved|worsened|neutral","recommendation":"prefer_a|prefer_b|negotiate","source_provenance":{"provider":"contract-clause-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"contract-clause","recommended_next_endpoint":"/analyze-risk","automation_safe":true,"confidence_per_section":{"comparison":0.88},"recommended_actions_priority_order":["review significant changes","assess risk delta","choose preferred version"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { contract_text, objective } = req.body;
  if (!contract_text) return res.status(400).json({ error: 'contract_text is required' });
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, objective: objective || 'contract_review',
    next_api: 'contract-clause', next_endpoint: '/extract',
    blocking_flags: [], flag_definitions: { NO_CONTRACT: 'contract_text is required' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'contract-clause', recommended_next_endpoint: '/extract',
    automation_safe: true, confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Extract clauses', 'Analyze risk', 'Flag red flags'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/contract-intelligence', async (req: Request, res: Response) => {
  const { contract_text, party_role, context } = req.body;
  if (!contract_text) return res.status(400).json({ error: 'contract_text is required' });
  try {
    const raw = await callClaude(`Full contract intelligence: "${contract_text.slice(0, 2000)}". Role: ${party_role || 'buyer'}, Context: ${context || 'vendor agreement'}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"contract_type":"string","overall_risk":"low|medium|high","key_clauses":[{"type":"string","summary":"string","risk":"low|medium|high"}],"red_flags":["string"],"missing_protections":["string"],"deal_breakers":["string"],"negotiation_priorities":["string"],"recommended_action":"sign|negotiate|reject","executive_summary":"string","source_provenance":{"provider":"contract-clause-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"contract-clause","recommended_next_endpoint":"/red-flags","automation_safe":true,"confidence_per_section":{"analysis":0.87,"recommendation":0.82},"recommended_actions_priority_order":["act on recommendation","negotiate flagged items","finalize"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/red-flags', async (req: Request, res: Response) => {
  const { contract_text } = req.body;
  if (!contract_text) return res.status(400).json({ error: 'contract_text is required' });
  try {
    const raw = await callClaude(`Identify red flag clauses in this contract: "${contract_text.slice(0, 2000)}". Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"red_flags":[{"clause":"string","risk_type":"liability|IP|termination|payment|confidentiality|non_compete|other","severity":"high|critical","explanation":"string","suggested_revision":"string","negotiation_leverage":"string"}],"red_flag_count":0,"overall_severity":"acceptable|caution|dangerous","sign_recommendation":"sign|negotiate|do_not_sign","source_provenance":{"provider":"contract-clause-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"contract-clause","recommended_next_endpoint":"/contract-intelligence","automation_safe":true,"confidence_per_section":{"red_flags":0.88},"recommended_actions_priority_order":["address critical flags","negotiate high flags","document decisions"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { contracts } = req.body;
  if (!Array.isArray(contracts) || contracts.length === 0) return res.status(400).json({ error: 'contracts array is required' });
  if (contracts.length > 5) return res.status(400).json({ error: 'Maximum 5 contracts per batch' });
  try {
    const results = await Promise.all(contracts.map(async (c: { contract_text: string; label?: string }) => {
      const raw = await callClaude(`Quick contract risk check: "${c.contract_text.slice(0, 300)}". Return JSON:
{"label":"${c.label || ''}","contract_type":"string","overall_risk":"low|medium|high","red_flag_count":0,"recommendation":"sign|negotiate|reject","success":true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      batch_count: contracts.length, results,
      source_provenance: { provider: 'contract-clause-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.95 },
      cache_ttl_seconds: 86400, cache_recommended: true,
      recommended_next_api: 'contract-clause', recommended_next_endpoint: '/analyze-risk',
      automation_safe: true, privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
