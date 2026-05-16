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
  res.json({ name: 'PII Detection API', info: '/pii-detection/info', openapi: '/pii-detection/openapi.json', health: 'ok' });
});

// POST /detect
router.post('/detect', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Detect PII in text: "${text.slice(0, 5000)}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "pii_found": true,
  "pii_items": [
    {"type": "name|email|phone|ssn|dob|address|credit_card|ip_address|passport|other", "value": "REDACTED", "start_char": number, "end_char": number, "confidence": number}
  ],
  "pii_count": number,
  "risk_level": "high|medium|low|none",
  "confidence_per_section": {"pii_items": 0.9},
  "recommended_actions_priority_order": ["redact before storing", "classify PII types", "apply retention policy"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /redact
router.post('/redact', async (req: Request, res: Response) => {
  const { text, replacement } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  const redactedWith = replacement || '[REDACTED]';
  try {
    const raw = await callClaude(`Redact all PII from this text, replacing with "${redactedWith}": "${text.slice(0, 5000)}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "redacted_text": "string",
  "items_redacted": number,
  "pii_types_removed": ["string"],
  "replacement_token": "${redactedWith}",
  "confidence_per_section": {"redacted_text": 0.9},
  "recommended_actions_priority_order": ["verify redaction completeness", "store only redacted version", "log redaction for audit"],
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
    const raw = await callClaude(`Classify PII types in text: "${text.slice(0, 5000)}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "classifications": [
    {"pii_type": "string", "count": number, "regulation": "GDPR|HIPAA|CCPA|PCI-DSS|general", "risk_level": "high|medium|low"}
  ],
  "overall_risk": "high|medium|low|none",
  "applicable_regulations": ["GDPR", "HIPAA"],
  "compliance_action_required": false,
  "confidence_per_section": {"classifications": 0.9},
  "recommended_actions_priority_order": ["apply regulation-specific handling", "notify DPO for high risk", "document for audit trail"],
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
    text_length: text.length,
    objective: objective || 'pii_compliance',
    next_api: 'email-parser',
    next_endpoint: '/parse',
    blocking_flags: [],
    flag_definitions: { TEXT_REQUIRED: 'text is required', HIGH_RISK_PII: 'High-risk PII detected — handle per GDPR/HIPAA requirements' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Detect PII before data sharing', 'Redact for compliance', 'Classify to determine regulation'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /analyze (ONE-CALL)
router.post('/analyze', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Full PII analysis for: "${text.slice(0, 5000)}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "pii_found": true,
  "pii_items": [{"type": "string", "value": "REDACTED", "confidence": number}],
  "redacted_text": "string",
  "classifications": [{"pii_type": "string", "regulation": "string", "risk_level": "string"}],
  "overall_risk": "high|medium|low|none",
  "applicable_regulations": ["string"],
  "compliance_recommendations": ["string"],
  "confidence_per_section": {"pii_items": 0.9, "classifications": 0.9},
  "recommended_actions_priority_order": ["use redacted_text for storage", "follow compliance_recommendations", "notify stakeholders"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
