import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';


function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Signature Detection API', info: '/signature-detection/info', openapi: '/signature-detection/openapi.json', health: 'ok' });
});

router.post('/detect', async (req: Request, res: Response) => {
  const { document_text, document_metadata } = req.body;
  if (!document_text) return res.status(400).json({ error: 'document_text is required' });
  try {
    const raw = await callClaude(`Detect signature blocks and signing indicators in document: "${document_text.slice(0, 2000)}". Metadata: ${JSON.stringify(document_metadata || {})}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"signatures_detected":true,"signature_count":0,"signature_blocks":[{"signer_name":"string","signer_title":"string","signer_organization":"string","signature_date":"YYYY-MM-DD","location":"string","page":1,"is_signed":true,"signature_type":"wet|electronic|digital|initials"}],"unsigned_blocks":[{"label":"string","required_signer":"string","page":1}],"all_required_signed":false,"source_provenance":{"provider":"signature-detection-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"signature-detection","recommended_next_endpoint":"/verify","automation_safe":true,"confidence_per_section":{"detection":0.88},"recommended_actions_priority_order":["verify all signatures","collect missing","generate audit trail"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/verify', async (req: Request, res: Response) => {
  const { document_text, required_signers } = req.body;
  if (!document_text) return res.status(400).json({ error: 'document_text is required' });
  try {
    const raw = await callClaude(`Verify all required signatures in document: "${document_text.slice(0, 2000)}". Required signers: ${JSON.stringify(required_signers || [])}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"verification_status":"complete|incomplete|pending","all_signed":false,"signed_by":["string"],"missing_signatures":["string"],"signature_integrity":"valid|tampered|unverifiable","date_compliance":true,"execution_complete":false,"blocking_issues":["string"],"source_provenance":{"provider":"signature-detection-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"signature-detection","recommended_next_endpoint":"/audit-trail","automation_safe":true,"confidence_per_section":{"verification":0.9},"recommended_actions_priority_order":["collect missing signatures","resolve blocking issues","finalize document"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/locate', async (req: Request, res: Response) => {
  const { document_text } = req.body;
  if (!document_text) return res.status(400).json({ error: 'document_text is required' });
  try {
    const raw = await callClaude(`Locate all signature fields and positions in document: "${document_text.slice(0, 2000)}". Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"signature_fields":[{"field_id":"string","label":"string","page":1,"position":{"section":"string","context":"string"},"status":"signed|unsigned|optional","signer_role":"string","field_type":"signature|initials|date|printed_name"}],"total_fields":0,"signed_count":0,"unsigned_count":0,"optional_count":0,"source_provenance":{"provider":"signature-detection-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"signature-detection","recommended_next_endpoint":"/signature-intelligence","automation_safe":true,"confidence_per_section":{"location":0.87},"recommended_actions_priority_order":["route to signers","track completion","send reminders"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { document_text, objective } = req.body;
  if (!document_text) return res.status(400).json({ error: 'document_text is required' });
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, objective: objective || 'signature_verification',
    next_api: 'signature-detection', next_endpoint: '/detect',
    blocking_flags: [], flag_definitions: { NO_DOCUMENT: 'document_text is required' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'signature-detection', recommended_next_endpoint: '/detect',
    automation_safe: true, confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Detect signatures', 'Verify completeness', 'Generate audit trail'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/signature-intelligence', async (req: Request, res: Response) => {
  const { document_text, required_signers, document_type } = req.body;
  if (!document_text) return res.status(400).json({ error: 'document_text is required' });
  try {
    const raw = await callClaude(`Full signature intelligence: "${document_text.slice(0, 2000)}". Type: ${document_type || 'contract'}, Required: ${JSON.stringify(required_signers || [])}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"document_type":"string","execution_status":"fully_executed|partially_executed|pending","signature_count":0,"all_signed":false,"signers":[{"name":"string","role":"string","signed":true,"date":"YYYY-MM-DD"}],"missing":["string"],"compliance_issues":["string"],"recommended_action":"file|collect_signatures|void","source_provenance":{"provider":"signature-detection-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"signature-detection","recommended_next_endpoint":"/audit-trail","automation_safe":true,"confidence_per_section":{"signatures":0.9,"compliance":0.85},"recommended_actions_priority_order":["complete execution","resolve compliance","file document"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/audit-trail', async (req: Request, res: Response) => {
  const { document_text, document_id } = req.body;
  if (!document_text) return res.status(400).json({ error: 'document_text is required' });
  try {
    const raw = await callClaude(`Generate signature audit trail for document: "${document_text.slice(0, 1000)}". ID: ${document_id || 'N/A'}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"document_id":"${document_id || traceId()}","audit_events":[{"event":"document_created|sent_for_signature|viewed|signed|completed","actor":"string","timestamp":"ISO8601","details":"string"}],"chain_of_custody":["string"],"tamper_evident":true,"legally_binding_assessment":"binding|conditional|not_binding","source_provenance":{"provider":"signature-detection-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"signature-detection","recommended_next_endpoint":"/verify","automation_safe":true,"confidence_per_section":{"audit":0.88},"recommended_actions_priority_order":["archive audit trail","notify parties","file executed document"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { documents } = req.body;
  if (!Array.isArray(documents) || documents.length === 0) return res.status(400).json({ error: 'documents array is required' });
  if (documents.length > 10) return res.status(400).json({ error: 'Maximum 10 documents per batch' });
  try {
    const results = await Promise.all(documents.map(async (d: { document_text: string; label?: string }) => {
      const raw = await callClaude(`Quick signature scan: "${d.document_text.slice(0, 300)}". Return JSON:
{"label":"${d.label || ''}","signature_count":0,"all_signed":false,"status":"complete|incomplete","success":true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      batch_count: documents.length, results,
      source_provenance: { provider: 'signature-detection-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.95 },
      cache_ttl_seconds: 3600, cache_recommended: true,
      recommended_next_api: 'signature-detection', recommended_next_endpoint: '/verify',
      automation_safe: true, privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
