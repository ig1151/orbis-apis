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

// Root GET
router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'SERP Intelligence API',
    info: '/serp-intelligence/info',
    openapi: '/serp-intelligence/openapi.json',
    health: 'ok',
  });
});

// POST /analyze-serp
router.post('/analyze', async (req, res) => { req.url = '/analyze-serp'; (router as any).handle(req, res, () => res.status(404).json({ error: 'Not found' })); });
router.post('/analyze-serp', async (req: Request, res: Response) => {
  const { keyword, domain, location = 'US', search_engine = 'google' } = req.body;
  if (!keyword) return res.status(400).json({ error: 'keyword is required' });
  try {
    const raw = await callClaude(`Analyze SERP for keyword: "${keyword}" domain: "${domain || 'none'}" location: ${location} engine: ${search_engine}. Return concise JSON:
{
  "keyword": "${keyword}",
  "serp_overview": { "difficulty": 0-100, "commercial_intent": "low|medium|high", "local_intent": true|false, "informational_intent": true|false, "serp_features": ["featured_snippet","knowledge_panel","local_pack","shopping","video","image"] },
  "top_ranking_signals": [{"signal": "string", "weight": "high|medium|low", "explanation": "string"}],
  "content_type_distribution": { "articles": 0-100, "product_pages": 0-100, "guides": 0-100, "videos": 0-100 },
  "ranking_opportunity": { "score": 0-100, "grade": "A-F", "quick_wins": ["string"] },
  "confidence_per_section": { "serp_overview": 0-1, "top_ranking_signals": 0-1, "content_type_distribution": 0-1, "ranking_opportunity": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /keyword-intelligence
router.post('/keyword-intelligence', async (req: Request, res: Response) => {
  const { keyword, niche, competitors = [] } = req.body;
  if (!keyword) return res.status(400).json({ error: 'keyword is required' });
  try {
    const raw = await callClaude(`Keyword intelligence for: "${keyword}" niche: "${niche || 'general'}" competitors: ${JSON.stringify(competitors.slice(0,3))}. Return concise JSON:
{
  "keyword": "${keyword}",
  "search_volume": { "estimated_monthly": number, "trend": "rising|stable|declining", "seasonality": "string" },
  "difficulty": { "score": 0-100, "label": "easy|medium|hard|very_hard", "domain_authority_needed": number },
  "intent": { "primary": "informational|navigational|commercial|transactional", "secondary": "string", "buyer_stage": "awareness|consideration|decision" },
  "cpc_estimate": { "low": "$X.XX", "avg": "$X.XX", "high": "$X.XX" },
  "related_keywords": [{"keyword": "string", "volume": "low|medium|high", "difficulty": 0-100}],
  "long_tail_opportunities": ["string"],
  "confidence_per_section": { "search_volume": 0-1, "difficulty": 0-1, "intent": 0-1, "cpc_estimate": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /ranking-signals
router.post('/ranking-signals', async (req: Request, res: Response) => {
  const { keyword, url, industry } = req.body;
  if (!keyword) return res.status(400).json({ error: 'keyword is required' });
  try {
    const raw = await callClaude(`Analyze ranking signals for keyword: "${keyword}" url: "${url || 'not provided'}" industry: "${industry || 'general'}". Return concise JSON:
{
  "keyword": "${keyword}",
  "on_page_signals": [{"signal": "string", "importance": "critical|high|medium|low", "status": "present|missing|needs_improvement", "action": "string"}],
  "off_page_signals": [{"signal": "string", "importance": "critical|high|medium|low", "benchmark": "string"}],
  "technical_signals": [{"signal": "string", "importance": "critical|high|medium|low", "action": "string"}],
  "content_signals": { "ideal_length": number, "heading_structure": "string", "schema_recommended": ["string"], "media_types": ["string"] },
  "overall_score": 0-100,
  "confidence_per_section": { "on_page_signals": 0-1, "off_page_signals": 0-1, "technical_signals": 0-1, "content_signals": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /competitor-gap
router.post('/competitor-gap', async (req: Request, res: Response) => {
  const { domain, competitors, niche } = req.body;
  if (!domain || !competitors) return res.status(400).json({ error: 'domain and competitors are required' });
  try {
    const raw = await callClaude(`Keyword gap analysis for domain: "${domain}" vs competitors: ${JSON.stringify(competitors.slice(0,3))} niche: "${niche || 'general'}". Return concise JSON:
{
  "domain": "${domain}",
  "gap_summary": { "total_gaps_estimated": number, "opportunity_score": 0-100, "urgency": "high|medium|low" },
  "keyword_gaps": [{"keyword": "string", "competitor_has": ["string"], "volume": "low|medium|high", "difficulty": 0-100, "opportunity": "string"}],
  "content_gaps": [{"topic": "string", "gap_type": "missing|thin|outdated", "priority": "high|medium|low"}],
  "quick_wins": [{"keyword": "string", "reason": "string", "estimated_traffic": "string"}],
  "confidence_per_section": { "gap_summary": 0-1, "keyword_gaps": 0-1, "content_gaps": 0-1, "quick_wins": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /content-opportunities
router.post('/content-opportunities', async (req: Request, res: Response) => {
  const { topic, domain, target_audience } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic is required' });
  try {
    const raw = await callClaude(`Content opportunities for topic: "${topic}" domain: "${domain || 'general'}" audience: "${target_audience || 'general'}". Return concise JSON:
{
  "topic": "${topic}",
  "opportunity_score": 0-100,
  "content_formats": [{"format": "string", "priority": "high|medium|low", "rationale": "string"}],
  "cluster_opportunities": [{"cluster_topic": "string", "pillar_page": "string", "supporting_pages": ["string"]}],
  "serp_feature_opportunities": [{"feature": "string", "target_keyword": "string", "content_requirement": "string"}],
  "content_calendar_suggestions": [{"week": number, "content_type": "string", "title_idea": "string", "target_keyword": "string"}],
  "confidence_per_section": { "content_formats": 0-1, "cluster_opportunities": 0-1, "serp_feature_opportunities": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /featured-snippet
router.post('/featured-snippet', async (req: Request, res: Response) => {
  const { keyword, current_content, content_type } = req.body;
  if (!keyword) return res.status(400).json({ error: 'keyword is required' });
  try {
    const raw = await callClaude(`Featured snippet optimization for keyword: "${keyword}" content_type: "${content_type || 'article'}" existing_content: "${current_content ? 'provided' : 'none'}". Return concise JSON:
{
  "keyword": "${keyword}",
  "snippet_type": "paragraph|list|table|video",
  "eligibility_score": 0-100,
  "optimization_requirements": [{"requirement": "string", "priority": "critical|high|medium", "current_status": "met|not_met|unknown"}],
  "ideal_answer_structure": { "format": "string", "ideal_length": number, "key_elements": ["string"] },
  "sample_optimized_content": "string",
  "voice_search_fit": { "score": 0-100, "conversational_keywords": ["string"] },
  "confidence_per_section": { "eligibility_score": 0-1, "optimization_requirements": 0-1, "ideal_answer_structure": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /local-pack-signals
router.post('/local-pack-signals', async (req: Request, res: Response) => {
  const { business_name, location, category, keyword } = req.body;
  if (!keyword || !location) return res.status(400).json({ error: 'keyword and location are required' });
  try {
    const raw = await callClaude(`Local pack signals for keyword: "${keyword}" location: "${location}" business: "${business_name || 'unknown'}" category: "${category || 'general'}". Return concise JSON:
{
  "keyword": "${keyword}",
  "location": "${location}",
  "local_pack_difficulty": 0-100,
  "ranking_factors": [{"factor": "string", "weight": "critical|high|medium|low", "action": "string"}],
  "gmb_optimization": [{"element": "string", "status": "optimized|needs_work|missing", "tip": "string"}],
  "citation_requirements": { "estimated_citations_needed": number, "top_directories": ["string"], "consistency_importance": "string" },
  "review_strategy": { "target_count": number, "target_rating": number, "response_template": "string" },
  "confidence_per_section": { "ranking_factors": 0-1, "gmb_optimization": 0-1, "citation_requirements": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /search-intent
router.post('/search-intent', async (req: Request, res: Response) => {
  const { keyword, industry, current_page_type } = req.body;
  if (!keyword) return res.status(400).json({ error: 'keyword is required' });
  try {
    const raw = await callClaude(`Search intent analysis for keyword: "${keyword}" industry: "${industry || 'general'}" current_page_type: "${current_page_type || 'unknown'}". Return concise JSON:
{
  "keyword": "${keyword}",
  "intent_classification": { "primary_intent": "informational|navigational|commercial|transactional", "confidence": 0-1, "micro_intent": "string" },
  "user_journey_stage": { "stage": "awareness|consideration|decision|retention", "persona": "string", "pain_points": ["string"] },
  "content_alignment": { "ideal_page_type": "string", "ideal_cta": "string", "alignment_score": 0-100, "mismatch_penalty": "none|low|medium|high" },
  "modifiers_analysis": [{"modifier_type": "string", "examples": ["string"], "impact_on_intent": "string"}],
  "conversion_potential": { "score": 0-100, "barriers": ["string"], "accelerators": ["string"] },
  "confidence_per_section": { "intent_classification": 0-1, "user_journey_stage": 0-1, "content_alignment": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { keyword, domain, objective } = req.body;
  if (!keyword) return res.status(400).json({ error: 'keyword is required' });
  res.json({
    execution_ready: true,
    keyword,
    domain: domain || null,
    objective: objective || 'search_visibility',
    next_api: 'content-optimizer',
    next_endpoint: '/optimize-content',
    blocking_flags: [],
    flag_definitions: {
      NO_KEYWORD: 'No target keyword provided — required for SERP analysis',
      HIGH_DIFFICULTY: 'Keyword difficulty above 80 — review competitive strategy first',
      INTENT_MISMATCH: 'Page type misaligned with search intent — update content strategy',
    },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /analyze-search-visibility (one-call workflow)
router.post('/analyze-search-visibility', async (req: Request, res: Response) => {
  const { keyword, domain, location = 'US', niche, competitors = [] } = req.body;
  if (!keyword) return res.status(400).json({ error: 'keyword is required' });
  try {
    const raw = await callClaude(`Full search visibility analysis. keyword: "${keyword}" domain: "${domain || 'not provided'}" location: "${location}" niche: "${niche || 'general'}" competitors: ${JSON.stringify(competitors.slice(0,3))}. Return concise JSON:
{
  "keyword": "${keyword}",
  "executive_summary": { "visibility_score": 0-100, "grade": "A-F", "top_priority": "string", "estimated_traffic_potential": "string" },
  "serp_overview": { "difficulty": 0-100, "commercial_intent": "low|medium|high", "serp_features_present": ["string"] },
  "keyword_intelligence": { "estimated_monthly_volume": number, "trend": "rising|stable|declining", "intent": "string", "cpc_avg": "$X.XX" },
  "ranking_signals": [{"signal": "string", "importance": "high|medium|low", "status": "present|missing"}],
  "content_opportunities": [{"type": "string", "title": "string", "priority": "high|medium|low"}],
  "quick_wins": [{"action": "string", "impact": "high|medium|low", "effort": "low|medium|high"}],
  "competitive_position": { "gap_count": number, "opportunity_score": 0-100, "immediate_actions": ["string"] },
  "execution_plan": [{"phase": number, "action": "string", "timeline": "string"}],
  "confidence_per_section": { "serp_overview": 0-1, "keyword_intelligence": 0-1, "ranking_signals": 0-1, "content_opportunities": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
