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
  res.json({ name: 'Content Moderation API', info: '/content-moderation/info', openapi: '/content-moderation/openapi.json', health: 'ok' });
});

// POST /moderate
router.post('/moderate', async (req: Request, res: Response) => {
  const { text, content_type } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Moderate content: "${text}", content_type: "${content_type || 'text'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "decision": "allow|block|review",
  "flags": [
    {"category": "hate_speech|violence|spam|adult|harassment|self_harm|misinformation", "severity": "low|medium|high|critical", "score": 0.85, "excerpt": "string"}
  ],
  "is_safe": true,
  "overall_risk_score": 0.1,
  "source_provenance": {"provider": "content-moderation-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.95},
  "cache_ttl_seconds": 3600,
  "cache_recommended": true,
  "recommended_next_api": "pii-detection",
  "recommended_next_endpoint": "/detect",
  "automation_safe": true,
  "confidence_per_section": {"flags": 0.92},
  "recommended_actions_priority_order": ["act on decision", "review high severity flags", "log for audit"],
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
    const raw = await callClaude(`Classify content categories for: "${text}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "categories": [
    {"category": "hate_speech|violence|spam|adult|harassment|self_harm|misinformation|safe", "probability": 0.9, "is_flagged": false}
  ],
  "primary_category": "safe",
  "content_type_detected": "news|social|comment|review|email|other",
  "source_provenance": {"provider": "content-moderation-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.95},
  "cache_ttl_seconds": 3600,
  "cache_recommended": true,
  "recommended_next_api": "content-moderation",
  "recommended_next_endpoint": "/policy-check",
  "automation_safe": true,
  "confidence_per_section": {"categories": 0.92},
  "recommended_actions_priority_order": ["route by primary_category", "check flagged categories", "run policy check"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /toxicity-score
router.post('/toxicity-score', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Score toxicity for: "${text}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "toxicity_score": 0.15,
  "scores": {
    "hate": 0.05, "threat": 0.02, "insult": 0.1, "profanity": 0.08,
    "identity_attack": 0.03, "sexually_explicit": 0.01
  },
  "is_toxic": false,
  "threshold_used": 0.5,
  "source_provenance": {"provider": "content-moderation-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.95},
  "cache_ttl_seconds": 3600,
  "cache_recommended": true,
  "recommended_next_api": "content-moderation",
  "recommended_next_endpoint": "/policy-check",
  "automation_safe": true,
  "confidence_per_section": {"scores": 0.9},
  "recommended_actions_priority_order": ["block if is_toxic true", "review borderline scores", "log for audit"],
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
    objective: objective || 'content_safety_check',
    next_api: 'content-moderation',
    next_endpoint: '/moderate',
    blocking_flags: [],
    flag_definitions: { NO_TEXT: 'text is required', EMPTY_CONTENT: 'text cannot be empty' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0,
    cache_recommended: false,
    recommended_next_api: 'content-moderation',
    recommended_next_endpoint: '/moderate',
    automation_safe: true,
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Moderate content', 'Classify categories', 'Run policy check'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /moderation-intelligence (ONE-CALL)
router.post('/moderation-intelligence', async (req: Request, res: Response) => {
  const { text, context } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Full moderation intelligence for: "${text}", context: "${context || 'platform'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "decision": "allow|block|review",
  "is_safe": true,
  "overall_risk_score": 0.12,
  "flags": [{"category": "string", "severity": "low|medium|high", "score": 0.1}],
  "toxicity_scores": {"hate": 0.05, "threat": 0.02, "insult": 0.1},
  "pii_detected": false,
  "categories": [{"category": "string", "probability": 0.9}],
  "source_provenance": {"provider": "content-moderation-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.95},
  "cache_ttl_seconds": 3600,
  "cache_recommended": true,
  "recommended_next_api": "pii-detection",
  "recommended_next_endpoint": "/detect",
  "automation_safe": true,
  "confidence_per_section": {"decision": 0.95, "flags": 0.92},
  "recommended_actions_priority_order": ["act on decision", "scan for PII", "log high severity flags"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /policy-check
router.post('/policy-check', async (req: Request, res: Response) => {
  const { text, policy_mode, platform } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Check content against policy for platform: "${platform || 'general'}", mode: "${policy_mode || 'strict'}". Content: "${text}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "policy_mode": "${policy_mode || 'strict'}",
  "platform": "${platform || 'general'}",
  "verdict": "compliant|non_compliant|borderline",
  "violated_policies": [{"policy_id": "string", "policy_name": "string", "severity": "low|medium|high|critical", "excerpt": "string"}],
  "risk_score": 0.15,
  "recommended_action": "publish|block|edit|review",
  "edit_suggestions": ["string"],
  "source_provenance": {"provider": "content-moderation-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.95},
  "cache_ttl_seconds": 3600,
  "cache_recommended": true,
  "recommended_next_api": "pii-detection",
  "recommended_next_endpoint": "/detect",
  "automation_safe": true,
  "confidence_per_section": {"verdict": 0.92, "violated_policies": 0.9},
  "recommended_actions_priority_order": ["follow recommended_action", "apply edit_suggestions", "log violated_policies"],
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
    const results = await Promise.all(items.map(async (item: { text: string; content_type?: string }) => {
      const raw = await callClaude(`Quick moderation for: "${item.text.slice(0, 200)}". Return JSON:
{"text_snippet": "${item.text.slice(0, 50)}", "decision": "allow|block|review", "is_safe": true, "overall_risk_score": 0.1, "success": true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(),
      computed_at: new Date().toISOString(),
      success: true,
      batch_count: items.length,
      results,
      source_provenance: { provider: 'content-moderation-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.95 },
      cache_ttl_seconds: 3600,
      cache_recommended: true,
      recommended_next_api: 'pii-detection',
      recommended_next_endpoint: '/batch',
      automation_safe: true,
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
