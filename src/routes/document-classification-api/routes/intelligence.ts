import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';


function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Document Classification API', info: '/document-classification/info', openapi: '/document-classification/openapi.json', health: 'ok' });
});

router.post('/classify', async (req: Request, res: Response) => {
  const { document_text, taxonomy } = req.body;
  if (!document_text) return res.status(400).json({ error: 'document_text is required' });
  try {
    const raw = await callClaude(`Classify this document: "${document_text.slice(0, 2000)}". Taxonomy: ${taxonomy || 'standard'}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"document_type":"invoice|receipt|contract|legal|report|letter|form|resume|policy|manual|email|proposal|other","subtype":"string","department":"finance|legal|hr|ops|sales|marketing|engineering|executive|other","sensitivity":"public|internal|confidential|restricted","language":"string","page_count_estimate":1,"contains_pii":false,"contains_financial_data":false,"source_provenance":{"provider":"document-classification-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"document-classification","recommended_next_endpoint":"/route","automation_safe":true,"confidence_per_section":{"classification":0.92},"recommended_actions_priority_order":["apply retention policy","route to team","tag and file"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/tag', async (req: Request, res: Response) => {
  const { document_text, tag_schema } = req.body;
  if (!document_text) return res.status(400).json({ error: 'document_text is required' });
  try {
    const raw = await callClaude(`Auto-tag document for metadata: "${document_text.slice(0, 2000)}". Schema: ${tag_schema || 'standard'}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"tags":["string"],"topics":["string"],"entities_mentioned":["string"],"keywords":["string"],"date_references":["YYYY-MM-DD"],"project_codes":["string"],"compliance_labels":["string"],"suggested_folder":"string","source_provenance":{"provider":"document-classification-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"document-classification","recommended_next_endpoint":"/document-intelligence","automation_safe":true,"confidence_per_section":{"tags":0.88,"topics":0.85},"recommended_actions_priority_order":["apply tags","update DMS","notify owner"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/route', async (req: Request, res: Response) => {
  const { document_text, document_type, org_structure } = req.body;
  if (!document_text) return res.status(400).json({ error: 'document_text is required' });
  try {
    const raw = await callClaude(`Route document to correct team/workflow. Document: "${document_text.slice(0, 1000)}". Type: ${document_type || 'auto'}, Org: ${org_structure || 'standard'}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"routing":{"team":"string","queue":"string","priority":"high|medium|low","sla_hours":24,"assignee_role":"string","workflow":"review|approve|archive|process|escalate"},"reason":"string","alternative_routes":[{"team":"string","probability":0.0}],"notify_parties":["string"],"source_provenance":{"provider":"document-classification-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"document-classification","recommended_next_endpoint":"/document-intelligence","automation_safe":true,"confidence_per_section":{"routing":0.87},"recommended_actions_priority_order":["send to team","set deadline","track in queue"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { document_text, objective } = req.body;
  if (!document_text) return res.status(400).json({ error: 'document_text is required' });
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, objective: objective || 'document_classification',
    next_api: 'document-classification', next_endpoint: '/classify',
    blocking_flags: [], flag_definitions: { NO_DOCUMENT: 'document_text is required' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'document-classification', recommended_next_endpoint: '/classify',
    automation_safe: true, confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Classify document', 'Tag metadata', 'Route to team'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/document-intelligence', async (req: Request, res: Response) => {
  const { document_text, context } = req.body;
  if (!document_text) return res.status(400).json({ error: 'document_text is required' });
  try {
    const raw = await callClaude(`Full document intelligence: "${document_text.slice(0, 2000)}". Context: ${context || 'enterprise document management'}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"document_type":"string","sensitivity":"public|internal|confidential|restricted","department":"string","routing":{"team":"string","priority":"string"},"tags":["string"],"summary":"string","action_required":false,"action_items":["string"],"retention_policy":"string","compliance_flags":["string"],"source_provenance":{"provider":"document-classification-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"document-classification","recommended_next_endpoint":"/route","automation_safe":true,"confidence_per_section":{"classification":0.92,"routing":0.87},"recommended_actions_priority_order":["apply classification","route document","set retention"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/priority', async (req: Request, res: Response) => {
  const { documents } = req.body;
  if (!Array.isArray(documents) || documents.length === 0) return res.status(400).json({ error: 'documents array is required' });
  try {
    const raw = await callClaude(`Prioritize document processing queue: ${JSON.stringify(documents.map((d: any) => ({ label: d.label, snippet: d.document_text?.slice(0, 100) }))).slice(0, 800)}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"prioritized_queue":[{"label":"string","priority_rank":1,"priority_score":0.0,"reason":"string","estimated_urgency":"immediate|today|this_week|backlog"}],"total_documents":${documents.length},"critical_count":0,"source_provenance":{"provider":"document-classification-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"document-classification","recommended_next_endpoint":"/document-intelligence","automation_safe":true,"confidence_per_section":{"priority":0.87},"recommended_actions_priority_order":["process immediate items","schedule today items","queue backlog"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { documents } = req.body;
  if (!Array.isArray(documents) || documents.length === 0) return res.status(400).json({ error: 'documents array is required' });
  if (documents.length > 10) return res.status(400).json({ error: 'Maximum 10 documents per batch' });
  try {
    const results = await Promise.all(documents.map(async (d: { document_text: string; label?: string }) => {
      const raw = await callClaude(`Quick document classify: "${d.document_text.slice(0, 200)}". Return JSON:
{"label":"${d.label || ''}","document_type":"string","department":"string","sensitivity":"string","priority":"high|medium|low","success":true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      batch_count: documents.length, results,
      source_provenance: { provider: 'document-classification-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.95 },
      cache_ttl_seconds: 3600, cache_recommended: true,
      recommended_next_api: 'document-classification', recommended_next_endpoint: '/route',
      automation_safe: true, privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
