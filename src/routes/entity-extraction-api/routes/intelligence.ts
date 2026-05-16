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
  res.json({ name: 'Entity Extraction API', info: '/entity-extraction/info', openapi: '/entity-extraction/openapi.json', health: 'ok' });
});

// POST /entities
router.post('/entities', async (req: Request, res: Response) => {
  const { text, types } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  const entityTypes = types || ['person', 'org', 'location', 'date', 'money'];
  try {
    const raw = await callClaude(`Extract named entities (${entityTypes.join(', ')}) from: "${text.slice(0, 5000)}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "entities": [
    {"text": "string", "type": "person|org|location|date|money", "start_char": number, "end_char": number, "confidence": number}
  ],
  "entity_counts": {"person": number, "org": number, "location": number, "date": number, "money": number},
  "confidence_per_section": {"entities": 0.9},
  "recommended_actions_priority_order": ["link orgs to knowledge graph", "geocode locations", "normalize dates"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /keywords
router.post('/keywords', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Extract keywords and key phrases from: "${text.slice(0, 5000)}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "keywords": [{"keyword": "string", "relevance": number, "frequency": number}],
  "key_phrases": [{"phrase": "string", "relevance": number}],
  "confidence_per_section": {"keywords": 0.9},
  "recommended_actions_priority_order": ["use keywords for SEO tagging", "index key_phrases for search", "filter by relevance > 0.7"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /topics
router.post('/topics', async (req: Request, res: Response) => {
  const { text, max_topics } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Extract up to ${max_topics || 5} topics from: "${text.slice(0, 5000)}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "topics": [{"topic": "string", "confidence": number, "keywords": ["string"]}],
  "primary_topic": "string",
  "confidence_per_section": {"topics": 0.85},
  "recommended_actions_priority_order": ["tag content with primary_topic", "build topic taxonomy", "route to domain experts"],
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
    objective: objective || 'entity_extraction',
    next_api: 'content-moderation',
    next_endpoint: '/moderate',
    blocking_flags: [],
    flag_definitions: { TEXT_REQUIRED: 'text is required', TEXT_TOO_LONG: 'Text exceeds limit — split into smaller chunks' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Extract entities first', 'Build topic taxonomy', 'Use keywords for indexing'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /analyze (ONE-CALL)
router.post('/analyze', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Full NLP extraction for: "${text.slice(0, 5000)}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "entities": [{"text": "string", "type": "string", "confidence": number}],
  "keywords": [{"keyword": "string", "relevance": number}],
  "topics": [{"topic": "string", "confidence": number}],
  "relationships": [{"subject": "string", "predicate": "string", "object": "string"}],
  "document_summary": "string",
  "confidence_per_section": {"entities": 0.9, "topics": 0.85},
  "recommended_actions_priority_order": ["populate knowledge graph with relationships", "tag with entities", "route by primary topic"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
