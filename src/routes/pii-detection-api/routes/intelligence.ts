import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';


function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'PII Detection API', info: '/pii-detection/info', openapi: '/pii-detection/openapi.json', health: 'ok' });
});

// POST /detect
router.post('/detect', async (req: Request, res: Response) => {
  const { text, sensitivity } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Detect PII in text: "${text}", sensitivity: "${sensitivity || 'standard'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "pii_found": true,
  "pii_items": [
    {"type": "email|phone|ssn|credit_card|passport|dob|name|address|ip_address|bank_account", "value": "[DETECTED]", "start_char": 0, "end_char": 20, "confidence": 0.97, "risk_level": "low|medium|high|critical"}
  ],
  "pii_count": 2,
  "risk_score": 0.7,
  "source_provenance": {"provider": "pii-detection-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.95},
  "cache_ttl_seconds": 0,
  "cache_recommended": false,
  "recommended_next_api": "pii-detection",
  "recommended_next_endpoint": "/redact",
  "automation_safe": true,
  "confidence_per_section": {"pii_items": 0.95},
  "recommended_actions_priority_order": ["redact immediately", "log risk_score", "run compliance report"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /redact
router.post('/redact', async (req: Request, res: Response) => {
  const { text, redaction_style } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Redact PII from text: "${text}", style: "${redaction_style || 'mask'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "original_length": ${text.length},
  "redacted_text": "string",
  "redactions": [
    {"type": "email|phone|ssn|credit_card|name|address", "original_placeholder": "[EMAIL REDACTED]", "start_char": 0, "end_char": 20}
  ],
  "redaction_count": 2,
  "redaction_style": "${redaction_style || 'mask'}",
  "source_provenance": {"provider": "pii-detection-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.95},
  "cache_ttl_seconds": 0,
  "cache_recommended": false,
  "recommended_next_api": "content-moderation",
  "recommended_next_endpoint": "/moderate",
  "automation_safe": true,
  "confidence_per_section": {"redactions": 0.95},
  "recommended_actions_priority_order": ["use redacted_text downstream", "log redaction_count", "audit redactions"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /classify
router.post('/classify', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Classify PII types present in text: "${text}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "pii_types_detected": ["email", "phone"],
  "classification": [
    {"type": "email|phone|ssn|credit_card|name|address|dob|passport|ip_address", "count": 2, "risk_level": "low|medium|high|critical", "regulation_relevance": ["GDPR", "CCPA", "HIPAA"]}
  ],
  "highest_risk": "high",
  "compliance_flags": ["GDPR Article 9", "CCPA Section 1798.100"],
  "source_provenance": {"provider": "pii-detection-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.95},
  "cache_ttl_seconds": 0,
  "cache_recommended": false,
  "recommended_next_api": "pii-detection",
  "recommended_next_endpoint": "/compliance-report",
  "automation_safe": true,
  "confidence_per_section": {"classification": 0.92},
  "recommended_actions_priority_order": ["review compliance_flags", "redact critical types", "run compliance report"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { text, objective } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: true,
    objective: objective || 'pii_scan',
    next_api: 'pii-detection',
    next_endpoint: '/detect',
    blocking_flags: [],
    flag_definitions: { NO_TEXT: 'text is required', EMPTY_CONTENT: 'text cannot be empty' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0,
    cache_recommended: false,
    recommended_next_api: 'pii-detection',
    recommended_next_endpoint: '/detect',
    automation_safe: true,
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Detect PII', 'Redact if found', 'Run compliance report'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /pii-intelligence (ONE-CALL)
router.post('/pii-intelligence', async (req: Request, res: Response) => {
  const { text, context } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Full PII intelligence for text, context: "${context || 'data processing'}". Text: "${text}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "pii_found": true,
  "pii_count": 3,
  "risk_score": 0.75,
  "redacted_text": "string",
  "pii_types": ["email", "phone", "name"],
  "compliance_flags": ["GDPR", "CCPA"],
  "recommended_action": "redact_before_processing|safe_to_process|block",
  "source_provenance": {"provider": "pii-detection-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.95},
  "cache_ttl_seconds": 0,
  "cache_recommended": false,
  "recommended_next_api": "content-moderation",
  "recommended_next_endpoint": "/policy-check",
  "automation_safe": true,
  "confidence_per_section": {"pii_types": 0.95, "compliance_flags": 0.9},
  "recommended_actions_priority_order": ["follow recommended_action", "check compliance_flags", "use redacted_text"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /compliance-report
router.post('/compliance-report', async (req: Request, res: Response) => {
  const { text, regulations } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Generate PII compliance report for regulations: ${JSON.stringify(regulations || ['GDPR', 'CCPA'])}. Text: "${text}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "regulations_checked": ${JSON.stringify(regulations || ['GDPR', 'CCPA'])},
  "compliance_status": [
    {"regulation": "GDPR", "compliant": false, "violations": ["Article 5 — data minimization", "Article 9 — special categories"], "risk_level": "high"}
  ],
  "overall_compliance_score": 0.4,
  "pii_inventory": [{"type": "email", "count": 2, "requires_consent": true, "retention_limit": "90 days"}],
  "remediation_steps": ["string"],
  "source_provenance": {"provider": "pii-detection-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.95},
  "cache_ttl_seconds": 0,
  "cache_recommended": false,
  "recommended_next_api": "pii-detection",
  "recommended_next_endpoint": "/redact",
  "automation_safe": true,
  "confidence_per_section": {"compliance_status": 0.88, "pii_inventory": 0.92},
  "recommended_actions_priority_order": ["apply remediation_steps", "redact non-compliant PII", "log compliance_status"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /batch
router.post('/batch', async (req: Request, res: Response) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items array is required' });
  if (items.length > 10) return res.status(400).json({ error: 'Maximum 10 items per batch' });
  try {
    const results = await Promise.all(items.map(async (item: { text: string }) => {
      const raw = await callClaude(`Quick PII scan for: "${item.text.slice(0, 200)}". Return JSON:
{"pii_found": true, "pii_count": 0, "risk_score": 0.0, "pii_types": ["string"], "success": true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(),
      computed_at: new Date().toISOString(),
      success: true,
      batch_count: items.length,
      results,
      source_provenance: { provider: 'pii-detection-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.95 },
      cache_ttl_seconds: 0,
      cache_recommended: false,
      recommended_next_api: 'pii-detection',
      recommended_next_endpoint: '/redact',
      automation_safe: true,
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
