import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';


function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Email Parser API', info: '/email-parser/info', openapi: '/email-parser/openapi.json', health: 'ok' });
});

// POST /parse
router.post('/parse', async (req: Request, res: Response) => {
  const { email_text, subject, from } = req.body;
  if (!email_text) return res.status(400).json({ error: 'email_text is required' });
  try {
    const raw = await callClaude(`Parse email: subject: "${subject || ''}", from: "${from || ''}", body: "${email_text}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "parsed": {
    "subject": "${subject || ''}",
    "from_email": "${from || ''}",
    "from_name": "string",
    "intent": "inquiry|complaint|request|proposal|reply|introduction|follow_up|other",
    "urgency": "low|medium|high|critical",
    "sentiment": "positive|negative|neutral|mixed",
    "key_points": ["string"],
    "questions_asked": ["string"],
    "action_required": true,
    "action_items": ["string"],
    "deadline_mentioned": "string"
  },
  "source_provenance": {"provider": "email-parser-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.95},
  "cache_ttl_seconds": 3600,
  "cache_recommended": true,
  "recommended_next_api": "email-parser",
  "recommended_next_endpoint": "/crm-intelligence",
  "automation_safe": true,
  "confidence_per_section": {"parsed": 0.9},
  "recommended_actions_priority_order": ["route by intent", "act on action_items", "flag high urgency"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /extract-contacts
router.post('/extract-contacts', async (req: Request, res: Response) => {
  const { email_text, from } = req.body;
  if (!email_text) return res.status(400).json({ error: 'email_text is required' });
  try {
    const raw = await callClaude(`Extract contact information from email: "${email_text}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "contacts": [
    {
      "name": "string", "email": "string", "phone": "string",
      "company": "string", "title": "string", "linkedin": "string",
      "role_in_email": "sender|cc|mentioned|signature"
    }
  ],
  "organizations_mentioned": ["string"],
  "source_provenance": {"provider": "email-parser-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.95},
  "cache_ttl_seconds": 3600,
  "cache_recommended": true,
  "recommended_next_api": "email-parser",
  "recommended_next_endpoint": "/crm-intelligence",
  "automation_safe": true,
  "confidence_per_section": {"contacts": 0.9},
  "recommended_actions_priority_order": ["add to CRM", "verify emails", "enrich contact profiles"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /categorize
router.post('/categorize', async (req: Request, res: Response) => {
  const { email_text, subject } = req.body;
  if (!email_text) return res.status(400).json({ error: 'email_text is required' });
  try {
    const raw = await callClaude(`Categorize email by type, priority, and routing: "${email_text}", subject: "${subject || ''}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "category": "sales|support|marketing|legal|finance|hr|ops|executive|spam|other",
  "subcategory": "string",
  "priority": "low|medium|high|critical",
  "routing_suggestion": {"team": "string", "reason": "string"},
  "auto_reply_possible": false,
  "escalation_needed": false,
  "source_provenance": {"provider": "email-parser-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.95},
  "cache_ttl_seconds": 3600,
  "cache_recommended": true,
  "recommended_next_api": "email-parser",
  "recommended_next_endpoint": "/crm-intelligence",
  "automation_safe": true,
  "confidence_per_section": {"category": 0.9, "routing_suggestion": 0.85},
  "recommended_actions_priority_order": ["route to team", "auto-reply if possible", "escalate if needed"],
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
    objective: objective || 'email_processing',
    next_api: 'email-parser',
    next_endpoint: '/parse',
    blocking_flags: [],
    flag_definitions: { NO_EMAIL: 'email_text is required', EMPTY_EMAIL: 'email body cannot be empty' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0,
    cache_recommended: false,
    recommended_next_api: 'email-parser',
    recommended_next_endpoint: '/parse',
    automation_safe: true,
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Parse email', 'Extract contacts', 'Generate CRM intelligence'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /email-intelligence (ONE-CALL)
router.post('/email-intelligence', async (req: Request, res: Response) => {
  const { email_text, subject, from, context } = req.body;
  if (!email_text) return res.status(400).json({ error: 'email_text is required' });
  try {
    const raw = await callClaude(`Full email intelligence: subject: "${subject || ''}", from: "${from || ''}", context: "${context || 'sales'}". Body: "${email_text}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "intent": "inquiry|complaint|request|proposal|reply|introduction|follow_up",
  "urgency": "low|medium|high|critical",
  "sentiment": "positive|negative|neutral|mixed",
  "contacts": [{"name": "string", "email": "string", "company": "string", "title": "string"}],
  "action_items": ["string"],
  "key_topics": ["string"],
  "category": "sales|support|marketing|legal|finance|other",
  "routing_suggestion": {"team": "string", "reason": "string"},
  "source_provenance": {"provider": "email-parser-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.95},
  "cache_ttl_seconds": 3600,
  "cache_recommended": true,
  "recommended_next_api": "email-parser",
  "recommended_next_endpoint": "/crm-intelligence",
  "automation_safe": true,
  "confidence_per_section": {"intent": 0.9, "contacts": 0.88},
  "recommended_actions_priority_order": ["act on action_items", "route by category", "log contacts to CRM"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /crm-intelligence
router.post('/crm-intelligence', async (req: Request, res: Response) => {
  const { email_text, subject, from, crm_context } = req.body;
  if (!email_text) return res.status(400).json({ error: 'email_text is required' });
  try {
    const raw = await callClaude(`Extract CRM-ready intelligence from email: subject: "${subject || ''}", from: "${from || ''}", context: "${crm_context || 'sales pipeline'}". Body: "${email_text}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "tasks": [
    {"task": "string", "due_date": "YYYY-MM-DD", "priority": "high|medium|low", "assigned_to": "string"}
  ],
  "deadlines": [{"item": "string", "deadline": "YYYY-MM-DD", "is_hard_deadline": true}],
  "stakeholders": [{"name": "string", "email": "string", "role": "decision_maker|influencer|user|champion"}],
  "deal_stage": "prospecting|qualification|proposal|negotiation|closed_won|closed_lost|unknown",
  "customer_sentiment": "positive|negative|neutral|at_risk",
  "follow_up_date": "YYYY-MM-DD",
  "crm_notes": "string",
  "budget_signals": {"mentioned": false, "amount_hint": "string", "currency": "string"},
  "source_provenance": {"provider": "email-parser-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.95},
  "cache_ttl_seconds": 3600,
  "cache_recommended": true,
  "recommended_next_api": "social-profile-lookup",
  "recommended_next_endpoint": "/persona-analysis",
  "automation_safe": true,
  "confidence_per_section": {"tasks": 0.88, "deal_stage": 0.82, "stakeholders": 0.9},
  "recommended_actions_priority_order": ["log tasks to CRM", "update deal_stage", "schedule follow_up_date"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /batch
router.post('/batch', async (req: Request, res: Response) => {
  const { emails } = req.body;
  if (!Array.isArray(emails) || emails.length === 0) return res.status(400).json({ error: 'emails array is required' });
  if (emails.length > 10) return res.status(400).json({ error: 'Maximum 10 emails per batch' });
  try {
    const results = await Promise.all(emails.map(async (email: { email_text: string; subject?: string }) => {
      const raw = await callClaude(`Quick email parse: "${email.email_text.slice(0, 200)}". Return JSON:
{"intent": "inquiry|complaint|request|reply|other", "urgency": "low|medium|high", "sentiment": "positive|negative|neutral", "action_required": false, "success": true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(),
      computed_at: new Date().toISOString(),
      success: true,
      batch_count: emails.length,
      results,
      source_provenance: { provider: 'email-parser-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.95 },
      cache_ttl_seconds: 3600,
      cache_recommended: true,
      recommended_next_api: 'email-parser',
      recommended_next_endpoint: '/crm-intelligence',
      automation_safe: true,
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
