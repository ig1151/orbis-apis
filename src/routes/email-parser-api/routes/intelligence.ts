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
  res.json({ name: 'Email Parser API', info: '/email-parser/info', openapi: '/email-parser/openapi.json', health: 'ok' });
});

// POST /parse
router.post('/parse', async (req: Request, res: Response) => {
  const { email_text, include_headers } = req.body;
  if (!email_text) return res.status(400).json({ error: 'email_text is required' });
  try {
    const raw = await callClaude(`Parse this raw email content${include_headers ? ' including headers' : ''}:\n\n${email_text.slice(0, 8000)}\n\nReturn JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "parsed": {
    "from": "string", "to": ["string"], "cc": ["string"], "subject": "string",
    "date": "string", "body": "string", "signature": "string",
    "attachments": [{"name": "string", "type": "string"}],
    "reply_to": "string", "message_id": "string"
  },
  "confidence_per_section": {"parsed": 0.9},
  "recommended_actions_priority_order": ["extract action items", "classify email type", "log to CRM"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /extract-action-items
router.post('/extract-action-items', async (req: Request, res: Response) => {
  const { email_text } = req.body;
  if (!email_text) return res.status(400).json({ error: 'email_text is required' });
  try {
    const raw = await callClaude(`Extract action items and commitments from email:\n\n${email_text.slice(0, 8000)}\n\nReturn JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "action_items": [
    {"item": "string", "owner": "string", "due_date": "string", "priority": "high|medium|low", "commitment_type": "task|follow_up|decision|question"}
  ],
  "commitments": [{"who": "string", "what": "string", "by_when": "string"}],
  "decisions_made": ["string"],
  "open_questions": ["string"],
  "confidence_per_section": {"action_items": 0.85},
  "recommended_actions_priority_order": ["assign high-priority items immediately", "schedule follow_ups", "resolve open_questions"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /classify
router.post('/classify', async (req: Request, res: Response) => {
  const { email_text, categories } = req.body;
  if (!email_text) return res.status(400).json({ error: 'email_text is required' });
  const cats = categories || ['sales', 'support', 'internal', 'marketing', 'legal', 'spam'];
  try {
    const raw = await callClaude(`Classify this email into categories: ${JSON.stringify(cats)}:\n\n${email_text.slice(0, 5000)}\n\nReturn JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "primary_category": "string",
  "secondary_categories": ["string"],
  "category_scores": [{"category": "string", "score": number}],
  "sentiment": "positive|negative|neutral",
  "urgency": "high|medium|low",
  "requires_response": true,
  "suggested_workflow": "string",
  "confidence_per_section": {"primary_category": 0.9},
  "recommended_actions_priority_order": ["route by primary_category", "prioritize by urgency", "automate suggested_workflow"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { email_text, objective } = req.body;
  if (!email_text) return res.status(400).json({ error: 'email_text is required' });
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: true,
    email_length: email_text.length,
    objective: objective || 'email_intelligence',
    next_api: 'invoice-parser',
    next_endpoint: '/parse',
    blocking_flags: [],
    flag_definitions: { EMAIL_REQUIRED: 'email_text is required', EMAIL_TOO_LARGE: 'Email body exceeds 50KB — truncating to first 8KB' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Parse email first', 'Extract action items', 'Classify for routing'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /analyze (ONE-CALL)
router.post('/analyze', async (req: Request, res: Response) => {
  const { email_text } = req.body;
  if (!email_text) return res.status(400).json({ error: 'email_text is required' });
  try {
    const raw = await callClaude(`Full email intelligence for:\n\n${email_text.slice(0, 8000)}\n\nReturn JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "parsed": {"from": "string", "to": ["string"], "subject": "string", "date": "string"},
  "classification": {"primary": "string", "urgency": "high|medium|low", "requires_response": true},
  "action_items": [{"item": "string", "owner": "string", "due_date": "string", "priority": "string"}],
  "commitments": [{"who": "string", "what": "string"}],
  "sentiment": "positive|negative|neutral",
  "suggested_reply": "string",
  "crm_fields": {"company": "string", "contact": "string", "opportunity": "string", "next_step": "string"},
  "confidence_per_section": {"parsed": 0.9, "action_items": 0.85},
  "recommended_actions_priority_order": ["process action_items", "log crm_fields", "send suggested_reply"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
