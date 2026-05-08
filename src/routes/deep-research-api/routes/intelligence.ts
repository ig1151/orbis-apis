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

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Deep Research API', info: '/deep-research/info', openapi: '/deep-research/openapi.json', health: 'ok' });
});

router.post('/research-topic', async (req: Request, res: Response) => {
  const { topic, depth, sources = [], focus_areas = [], max_sources } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic is required' });
  try {
    const raw = await callClaude(`Conduct cross-source research synthesis on this topic. Topic: "${topic}" Depth: "${depth || 'standard'}" Focus areas: ${JSON.stringify(focus_areas)} Sources: ${JSON.stringify(sources.slice(0, 10))} Max sources: ${max_sources || 20}

Return concise JSON:
{
  "topic": "string",
  "summary": "string",
  "key_findings": [{ "finding": "string", "confidence": 0-1, "supporting_sources": ["string"], "consensus_level": "high|medium|low|disputed" }],
  "subtopics": [{ "name": "string", "coverage": "thorough|moderate|sparse", "key_points": ["string"] }],
  "knowledge_gaps": [{ "gap": "string", "importance": "high|medium|low", "research_suggestion": "string" }],
  "contradictions": [{ "claim_a": "string", "claim_b": "string", "resolution": "string" }],
  "research_quality": { "score": 0-100, "strengths": ["string"], "limitations": ["string"] },
  "confidence_per_section": { "key_findings": 0-1, "subtopics": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/extract-facts', async (req: Request, res: Response) => {
  const { content, fact_types = [], min_confidence, source_url } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  try {
    const raw = await callClaude(`Extract verified facts with citations from this content. Fact types: ${JSON.stringify(fact_types)} Min confidence: ${min_confidence || 0.5} Source URL: "${source_url || 'not provided'}"

Content (first 3000 chars): "${content.slice(0, 3000)}"

Return concise JSON:
{
  "facts": [{ "fact": "string", "fact_type": "statistic|claim|date|entity|relationship|definition", "confidence": 0-1, "verbatim_quote": "string", "verifiable": true|false }],
  "total_facts": number,
  "high_confidence_facts": number,
  "entities_mentioned": [{ "entity": "string", "type": "person|org|location|product|event|concept", "role": "string" }],
  "temporal_markers": [{ "date": "string", "event": "string", "certainty": "exact|approximate|relative" }],
  "source_quality_indicators": { "specificity": 0-1, "recency_signals": ["string"], "authority_signals": ["string"] },
  "confidence_per_section": { "facts": 0-1, "entities": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/compare-sources', async (req: Request, res: Response) => {
  const { sources, comparison_angle } = req.body;
  if (!sources) return res.status(400).json({ error: 'sources is required' });
  try {
    const raw = await callClaude(`Compare multiple sources for consistency, credibility and perspectives. Comparison angle: "${comparison_angle || 'general'}" Sources: ${JSON.stringify(sources.slice(0, 10).map((s: any) => ({ ...s, content: s.content?.slice(0, 500) })))}

Return concise JSON:
{
  "sources_analyzed": number,
  "consensus_claims": [{ "claim": "string", "sources_agreeing": ["string"], "confidence": 0-1 }],
  "divergent_claims": [{ "claim": "string", "source_positions": [{ "source_id": "string", "position": "string" }], "divergence_reason": "string" }],
  "unique_insights": [{ "source_id": "string", "insight": "string", "value": "high|medium|low" }],
  "source_quality_ranking": [{ "source_id": "string", "title": "string", "quality_score": 0-100, "strengths": ["string"], "weaknesses": ["string"] }],
  "synthesis": "string",
  "recommendation": "string",
  "confidence_per_section": { "consensus": 0-1, "source_ranking": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/credibility-analysis', async (req: Request, res: Response) => {
  const { source_url, source_title, author, content_sample, publication_date } = req.body;
  if (!content_sample) return res.status(400).json({ error: 'content_sample is required' });
  try {
    const raw = await callClaude(`Score source credibility with bias and reliability detection. URL: "${source_url || 'not provided'}" Title: "${source_title || 'not provided'}" Author: "${author || 'not provided'}" Publication date: "${publication_date || 'not provided'}"

Content sample (first 2000 chars): "${content_sample.slice(0, 2000)}"

Return concise JSON:
{
  "credibility_score": 0-100,
  "credibility_tier": "authoritative|reliable|mixed|questionable|unreliable",
  "bias_indicators": [{ "type": "political|commercial|cultural|confirmation", "severity": "high|medium|low", "evidence": "string" }],
  "quality_signals": { "author_expertise": "high|medium|low|unknown", "citations_present": true|false, "methodology_transparent": true|false, "peer_reviewed": true|false, "publication_reputation": "string" },
  "red_flags": ["string"],
  "trust_factors": ["string"],
  "recommended_use": "primary_source|supporting_source|background_only|avoid",
  "fact_check_items": [{ "claim": "string", "verification_priority": "high|medium|low" }],
  "confidence_per_section": { "credibility_score": 0-1, "bias_indicators": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/timeline-builder', async (req: Request, res: Response) => {
  const { content, topic, timeline_type, start_date, end_date } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  if (!topic) return res.status(400).json({ error: 'topic is required' });
  try {
    const raw = await callClaude(`Build a chronological timeline from research data. Topic: "${topic}" Timeline type: "${timeline_type || 'chronological'}" Start date: "${start_date || 'not specified'}" End date: "${end_date || 'not specified'}"

Content (first 3000 chars): "${content.slice(0, 3000)}"

Return concise JSON:
{
  "topic": "string",
  "timeline_type": "string",
  "events": [{ "date": "string", "event": "string", "significance": "pivotal|major|minor", "actors": ["string"], "consequences": ["string"], "certainty": "confirmed|probable|speculative" }],
  "total_events": number,
  "date_range": { "earliest": "string", "latest": "string", "span": "string" },
  "turning_points": [{ "date": "string", "event": "string", "reason": "string" }],
  "patterns": [{ "pattern": "string", "period": "string", "implications": "string" }],
  "future_projections": [{ "timeframe": "string", "prediction": "string", "confidence": 0-1 }],
  "confidence_per_section": { "events": 0-1, "patterns": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/citation-builder', async (req: Request, res: Response) => {
  const { sources, citation_style, context } = req.body;
  if (!sources) return res.status(400).json({ error: 'sources is required' });
  try {
    const raw = await callClaude(`Format citations in various academic and professional styles. Citation style preference: "${citation_style || 'all'}" Context: "${context || 'general'}" Sources: ${JSON.stringify(sources.slice(0, 20))}

Return concise JSON:
{
  "citations": [{ "source_index": number, "title": "string", "apa": "string", "mla": "string", "chicago": "string", "harvard": "string", "url_formatted": "string" }],
  "bibliography_apa": "string",
  "bibliography_mla": "string",
  "in_text_examples": [{ "source_index": number, "apa": "string", "mla": "string" }],
  "source_count": number,
  "formatting_notes": ["string"],
  "missing_fields": [{ "source_index": number, "fields": ["string"] }],
  "confidence_per_section": { "citations": 0-1, "bibliography": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { research_context, intended_action, quality_threshold, source_count } = req.body;
  if (!research_context) return res.status(400).json({ error: 'research_context is required' });
  if (!intended_action) return res.status(400).json({ error: 'intended_action is required' });
  try {
    const raw = await callClaude(`Gate research execution based on quality and completeness. Intended action: "${intended_action}" Quality threshold: ${quality_threshold || 0.7} Source count: ${source_count || 'unknown'} Research context: ${JSON.stringify(research_context)}

Return concise JSON:
{
  "execute": true|false,
  "confidence": 0-1,
  "blocking_flags": ["string"],
  "warnings": ["string"],
  "risk_score": 0-1,
  "recommended_action": "string",
  "chain_to": ["string"],
  "research_quality": "sufficient|marginal|insufficient",
  "retry_after": "string or null",
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/deep-research', async (req: Request, res: Response) => {
  const { topic, depth, focus_areas = [], output_format } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic is required' });
  try {
    const raw = await callClaude(`Full research workflow on this topic. Topic: "${topic}" Depth: "${depth || 'standard'}" Focus areas: ${JSON.stringify(focus_areas)} Output format: "${output_format || 'structured'}"

Return concise JSON:
{
  "research_id": "string (uuid-style)",
  "topic": "string",
  "executive_summary": "string",
  "key_findings": [{ "finding": "string", "confidence": 0-1, "importance": "critical|high|medium|low" }],
  "fact_inventory": [{ "fact": "string", "confidence": 0-1, "verifiable": true|false }],
  "timeline": [{ "date": "string", "event": "string", "significance": "pivotal|major|minor" }],
  "contradictions": [{ "claim_a": "string", "claim_b": "string", "resolution": "string" }],
  "knowledge_gaps": ["string"],
  "sources_synthesized": number,
  "research_quality_score": 0-100,
  "report": "string",
  "confidence_per_section": { "key_findings": 0-1, "fact_inventory": 0-1, "timeline": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
