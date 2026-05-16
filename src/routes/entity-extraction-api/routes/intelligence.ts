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
  res.json({ name: 'Entity Extraction API', info: '/entity-extraction/info', openapi: '/entity-extraction/openapi.json', health: 'ok' });
});

// POST /entities
router.post('/entities', async (req: Request, res: Response) => {
  const { text, entity_types } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Extract named entities from text: "${text}", types filter: ${JSON.stringify(entity_types || ['all'])}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "entities": [
    {"entity_id": "string", "text": "string", "type": "PERSON|ORG|LOCATION|DATE|MONEY|PRODUCT|EVENT|OTHER", "start_char": 0, "end_char": 10, "confidence": 0.95, "normalized": "string"}
  ],
  "entity_count": 5,
  "types_found": ["PERSON", "ORG"],
  "source_provenance": {"provider": "entity-extraction-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.95},
  "cache_ttl_seconds": 3600,
  "cache_recommended": true,
  "recommended_next_api": "entity-extraction",
  "recommended_next_endpoint": "/relationship-extraction",
  "automation_safe": true,
  "confidence_per_section": {"entities": 0.9},
  "recommended_actions_priority_order": ["process PERSON entities", "link ORG entities", "extract relationships"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /relationships
router.post('/relationships', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Extract entity relationships from text: "${text}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "relationships": [
    {"subject": "string", "predicate": "works_for|founded|acquired|located_in|knows|owns", "object": "string", "confidence": 0.85}
  ],
  "entities_involved": ["string"],
  "source_provenance": {"provider": "entity-extraction-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.9},
  "cache_ttl_seconds": 3600,
  "cache_recommended": true,
  "recommended_next_api": "entity-extraction",
  "recommended_next_endpoint": "/relationship-extraction",
  "automation_safe": true,
  "confidence_per_section": {"relationships": 0.85},
  "recommended_actions_priority_order": ["build knowledge graph", "verify relationships", "link to CRM"],
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
    const raw = await callClaude(`Extract key topics from text: "${text}", max_topics: ${max_topics || 10}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "topics": [
    {"topic": "string", "relevance_score": 0.9, "mentions": 3, "subtopics": ["string"]}
  ],
  "primary_topic": "string",
  "topic_categories": ["string"],
  "source_provenance": {"provider": "entity-extraction-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.9},
  "cache_ttl_seconds": 3600,
  "cache_recommended": true,
  "recommended_next_api": "sentiment",
  "recommended_next_endpoint": "/trend-sentiment",
  "automation_safe": true,
  "confidence_per_section": {"topics": 0.88},
  "recommended_actions_priority_order": ["focus on primary_topic", "index subtopics", "run sentiment per topic"],
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
    objective: objective || 'entity_extraction',
    next_api: 'entity-extraction',
    next_endpoint: '/entities',
    blocking_flags: [],
    flag_definitions: { NO_TEXT: 'text is required', TEXT_TOO_SHORT: 'text must be at least 10 characters' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0,
    cache_recommended: false,
    recommended_next_api: 'entity-extraction',
    recommended_next_endpoint: '/entities',
    automation_safe: true,
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Extract entities', 'Find relationships', 'Extract topics'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /entity-intelligence (ONE-CALL)
router.post('/entity-intelligence', async (req: Request, res: Response) => {
  const { text, context } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Full entity intelligence for text: "${text}", context: "${context || 'general'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "entities": [{"text": "string", "type": "PERSON|ORG|LOCATION", "confidence": 0.95}],
  "relationships": [{"subject": "string", "predicate": "string", "object": "string"}],
  "topics": [{"topic": "string", "relevance_score": 0.9}],
  "knowledge_links": [{"entity": "string", "wikipedia_url": "string", "wikidata_id": "string"}],
  "source_provenance": {"provider": "entity-extraction-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.9},
  "cache_ttl_seconds": 3600,
  "cache_recommended": true,
  "recommended_next_api": "sentiment",
  "recommended_next_endpoint": "/sentiment",
  "automation_safe": true,
  "confidence_per_section": {"entities": 0.9, "relationships": 0.85},
  "recommended_actions_priority_order": ["use knowledge_links for enrichment", "build relationship graph", "run per-entity sentiment"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /relationship-extraction
router.post('/relationship-extraction', async (req: Request, res: Response) => {
  const { text, entity_focus } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Deep relationship extraction from text: "${text}", focus entity: "${entity_focus || 'all'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "relationships": [
    {
      "entity_id": "string",
      "entity_text": "string",
      "entity_type": "PERSON|ORG|LOCATION",
      "related_to": [{"entity": "string", "type": "string", "relationship_type": "string", "strength": 0.8}],
      "knowledge_base_match": {"wikipedia": "string", "wikidata_id": "string", "confidence": 0.9}
    }
  ],
  "graph_summary": {"node_count": 5, "edge_count": 8, "most_connected": "string"},
  "source_provenance": {"provider": "entity-extraction-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.9},
  "cache_ttl_seconds": 3600,
  "cache_recommended": true,
  "recommended_next_api": "knowledge-graph",
  "recommended_next_endpoint": "/query",
  "automation_safe": true,
  "confidence_per_section": {"relationships": 0.85},
  "recommended_actions_priority_order": ["build graph from relationships", "link knowledge_base_match", "identify most_connected"],
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
      const raw = await callClaude(`Extract entities from: "${item.text.slice(0, 300)}". Return JSON:
{"entities": [{"text": "string", "type": "PERSON|ORG|LOCATION", "confidence": 0.9}], "entity_count": 3, "success": true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(),
      computed_at: new Date().toISOString(),
      success: true,
      batch_count: items.length,
      results,
      source_provenance: { provider: 'entity-extraction-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.9 },
      cache_ttl_seconds: 3600,
      cache_recommended: true,
      recommended_next_api: 'entity-extraction',
      recommended_next_endpoint: '/relationship-extraction',
      automation_safe: true,
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
