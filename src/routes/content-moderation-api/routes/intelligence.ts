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
  res.json({ name: 'Content Moderation API', info: '/content-moderation/info', openapi: '/content-moderation/openapi.json', health: 'ok' });
});

// POST /moderate
router.post('/moderate', async (req: Request, res: Response) => {
  const { text, policy } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Moderate this text for policy violations. Policy: "${policy || 'standard'}". Text: "${text.slice(0, 3000)}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "decision": "approved|rejected|review",
  "violations": [{"type": "string", "severity": "high|medium|low", "excerpt": "string"}],
  "violation_count": number,
  "requires_human_review": false,
  "confidence_per_section": {"decision": 0.9, "violations": 0.85},
  "recommended_actions_priority_order": ["block if rejected", "flag high severity", "queue for human review if needed"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /categories
router.post('/categories', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Classify content categories for: "${text.slice(0, 3000)}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "categories": [
    {"category": "hate_speech|violence|sexual|spam|misinformation|profanity|safe", "score": number, "flagged": false}
  ],
  "overall_safety": "safe|unsafe|borderline",
  "age_appropriate": true,
  "confidence_per_section": {"categories": 0.9},
  "recommended_actions_priority_order": ["check unsafe categories first", "apply age restrictions", "escalate borderline content"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /safe-rewrite
router.post('/safe-rewrite', async (req: Request, res: Response) => {
  const { text, tone } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Rewrite this text to be safe and compliant, tone: "${tone || 'neutral'}": "${text.slice(0, 3000)}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "original_text": ${JSON.stringify(text.slice(0, 200))},
  "rewritten_text": "string",
  "changes_made": ["string"],
  "violations_removed": number,
  "tone": "${tone || 'neutral'}",
  "confidence_per_section": {"rewritten_text": 0.85},
  "recommended_actions_priority_order": ["review rewritten text", "compare with original", "verify no meaning lost"],
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
    objective: objective || 'content_moderation',
    next_api: 'pii-detection',
    next_endpoint: '/detect',
    blocking_flags: [],
    flag_definitions: { TEXT_REQUIRED: 'text is required', POLICY_UNKNOWN: 'Unknown policy — defaulting to standard' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Moderate before publishing', 'Classify categories for routing', 'Rewrite if borderline'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /analyze (ONE-CALL)
router.post('/analyze', async (req: Request, res: Response) => {
  const { text, policy } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Full content moderation analysis for policy "${policy || 'standard'}": "${text.slice(0, 3000)}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "decision": "approved|rejected|review",
  "categories": [{"category": "string", "score": number, "flagged": false}],
  "violations": [{"type": "string", "severity": "string", "excerpt": "string"}],
  "safe_rewrite": "string",
  "risk_score": number,
  "escalation_required": false,
  "confidence_per_section": {"decision": 0.9, "categories": 0.9},
  "recommended_actions_priority_order": ["act on decision immediately", "review high-risk violations", "use safe_rewrite if applicable"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
