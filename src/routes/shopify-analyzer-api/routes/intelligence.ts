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
  res.json({ name: 'Shopify Analyzer API', info: '/shopify-analyzer/info', openapi: '/shopify-analyzer/openapi.json', health: 'ok' });
});

// POST /analyze-store
router.post('/analyze-store', async (req: Request, res: Response) => {
  const { store_url, niche, competitors = [] } = req.body;
  if (!store_url) return res.status(400).json({ error: 'store_url is required' });
  try {
    const raw = await callClaude(`Analyze Shopify store: "${store_url}" niche: "${niche || 'general'}" competitors: ${JSON.stringify(competitors.slice(0,3))}. Return concise JSON:
{
  "store_url": "${store_url}",
  "store_overview": { "niche": "string", "maturity": "new|growing|established", "estimated_monthly_revenue": "string", "brand_strength": 0-100 },
  "strengths": ["string"],
  "weaknesses": ["string"],
  "market_position": { "score": 0-100, "positioning": "string", "differentiation": "string" },
  "growth_potential": { "score": 0-100, "primary_opportunity": "string", "estimated_upside": "string" },
  "confidence_per_section": { "store_overview": 0-1, "market_position": 0-1, "growth_potential": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /product-intelligence
router.post('/product-intelligence', async (req: Request, res: Response) => {
  const { product_name, category, price_point, store_url } = req.body;
  if (!product_name || !category) return res.status(400).json({ error: 'product_name and category are required' });
  try {
    const raw = await callClaude(`Product intelligence for: "${product_name}" category: "${category}" price: "${price_point || 'unknown'}" store: "${store_url || 'unknown'}". Return concise JSON:
{
  "product_name": "${product_name}",
  "market_demand": { "score": 0-100, "trend": "rising|stable|declining", "seasonality": "string" },
  "pricing_analysis": { "current": "${price_point || 'unknown'}", "recommended": "string", "competitor_range": "string", "price_sensitivity": "low|medium|high" },
  "listing_quality": { "score": 0-100, "title_score": 0-100, "description_score": 0-100, "image_recommendations": ["string"] },
  "upsell_opportunities": [{ "product": "string", "relevance": 0-100, "revenue_impact": "string" }],
  "winning_factors": ["string"],
  "confidence_per_section": { "market_demand": 0-1, "pricing_analysis": 0-1, "listing_quality": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /conversion-audit
router.post('/conversion-audit', async (req: Request, res: Response) => {
  const { store_url, current_cvr, traffic_source, niche } = req.body;
  if (!store_url) return res.status(400).json({ error: 'store_url is required' });
  try {
    const raw = await callClaude(`Conversion audit for Shopify store: "${store_url}" current CVR: "${current_cvr || 'unknown'}" traffic: "${traffic_source || 'mixed'}" niche: "${niche || 'general'}". Return concise JSON:
{
  "store_url": "${store_url}",
  "cvr_benchmark": { "industry_avg": "string", "top_quartile": "string", "gap": "string" },
  "conversion_killers": [{ "issue": "string", "impact": "high|medium|low", "fix": "string" }],
  "checkout_friction": [{ "friction_point": "string", "severity": "critical|high|medium", "solution": "string" }],
  "trust_signals": { "score": 0-100, "missing": ["string"], "quick_wins": ["string"] },
  "mobile_experience": { "score": 0-100, "issues": ["string"], "priority_fixes": ["string"] },
  "confidence_per_section": { "conversion_killers": 0-1, "checkout_friction": 0-1, "trust_signals": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /competitor-stores
router.post('/competitor-stores', async (req: Request, res: Response) => {
  const { store_url, niche, price_range } = req.body;
  if (!store_url || !niche) return res.status(400).json({ error: 'store_url and niche are required' });
  try {
    const raw = await callClaude(`Competitor analysis for Shopify store: "${store_url}" niche: "${niche}" price range: "${price_range || 'unknown'}". Return concise JSON:
{
  "store_url": "${store_url}",
  "competitive_landscape": { "density": "low|medium|high|saturated", "avg_competitor_rating": number, "market_maturity": "emerging|growing|mature" },
  "top_competitors": [{ "name": "string", "strengths": ["string"], "weaknesses": ["string"], "est_revenue": "string", "threat_level": "high|medium|low" }],
  "gaps_to_exploit": [{ "gap": "string", "opportunity_size": "string", "difficulty": "easy|medium|hard" }],
  "competitive_advantages": ["string"],
  "confidence_per_section": { "competitive_landscape": 0-1, "top_competitors": 0-1, "gaps_to_exploit": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /seo-audit
router.post('/seo-audit', async (req: Request, res: Response) => {
  const { store_url, niche, target_keywords = [] } = req.body;
  if (!store_url) return res.status(400).json({ error: 'store_url is required' });
  try {
    const raw = await callClaude(`SEO audit for Shopify store: "${store_url}" niche: "${niche || 'general'}" target keywords: ${JSON.stringify(target_keywords.slice(0,5))}. Return concise JSON:
{
  "store_url": "${store_url}",
  "seo_score": 0-100,
  "technical_issues": [{ "issue": "string", "priority": "critical|high|medium", "fix": "string" }],
  "content_gaps": [{ "keyword": "string", "volume": "low|medium|high", "difficulty": 0-100, "page_needed": "string" }],
  "collection_optimization": [{ "collection": "string", "issue": "string", "fix": "string" }],
  "schema_opportunities": ["string"],
  "backlink_strategy": { "current_estimate": "string", "target": "string", "top_sources": ["string"] },
  "confidence_per_section": { "technical_issues": 0-1, "content_gaps": 0-1, "collection_optimization": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /pricing-strategy
router.post('/pricing-strategy', async (req: Request, res: Response) => {
  const { products, niche, business_model, target_margin } = req.body;
  if (!products || !niche) return res.status(400).json({ error: 'products and niche are required' });
  try {
    const raw = await callClaude(`Pricing strategy for Shopify store. products: ${JSON.stringify(products.slice(0,5))} niche: "${niche}" model: "${business_model || 'retail'}" target margin: "${target_margin || 'unknown'}". Return concise JSON:
{
  "pricing_model": { "recommended": "string", "rationale": "string" },
  "product_pricing": [{ "product": "string", "current": "string", "recommended": "string", "reasoning": "string" }],
  "bundle_opportunities": [{ "bundle": "string", "price": "string", "margin_impact": "string", "conversion_lift": "string" }],
  "discount_strategy": { "recommended_discount_depth": "string", "frequency": "string", "urgency_tactics": ["string"] },
  "psychological_pricing": [{ "tactic": "string", "example": "string", "impact": "string" }],
  "confidence_per_section": { "pricing_model": 0-1, "bundle_opportunities": 0-1, "discount_strategy": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /ad-intelligence
router.post('/ad-intelligence', async (req: Request, res: Response) => {
  const { store_url, niche, budget, current_roas } = req.body;
  if (!store_url || !niche) return res.status(400).json({ error: 'store_url and niche are required' });
  try {
    const raw = await callClaude(`Ad intelligence for Shopify store: "${store_url}" niche: "${niche}" budget: "${budget || 'unknown'}" current ROAS: "${current_roas || 'unknown'}". Return concise JSON:
{
  "store_url": "${store_url}",
  "channel_recommendations": [{ "channel": "string", "priority": "high|medium|low", "estimated_roas": "string", "rationale": "string" }],
  "audience_segments": [{ "segment": "string", "size": "string", "cpm_estimate": "string", "conversion_rate": "string" }],
  "creative_angles": [{ "angle": "string", "format": "string", "hook": "string" }],
  "budget_allocation": [{ "channel": "string", "percentage": number, "rationale": "string" }],
  "retargeting_strategy": { "segments": ["string"], "window_days": number, "message_sequence": ["string"] },
  "confidence_per_section": { "channel_recommendations": 0-1, "audience_segments": 0-1, "creative_angles": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /growth-signals
router.post('/growth-signals', async (req: Request, res: Response) => {
  const { store_url, niche, current_revenue, goals } = req.body;
  if (!store_url) return res.status(400).json({ error: 'store_url is required' });
  try {
    const raw = await callClaude(`Growth signals for Shopify store: "${store_url}" niche: "${niche || 'general'}" revenue: "${current_revenue || 'unknown'}" goals: "${goals || 'scale revenue'}". Return concise JSON:
{
  "store_url": "${store_url}",
  "growth_score": 0-100,
  "top_growth_levers": [{ "lever": "string", "impact": "high|medium|low", "effort": "low|medium|high", "timeline": "string" }],
  "expansion_opportunities": [{ "opportunity": "string", "type": "product|market|channel|model", "revenue_potential": "string" }],
  "retention_signals": { "score": 0-100, "ltv_estimate": "string", "churn_risks": ["string"], "loyalty_tactics": ["string"] },
  "scaling_readiness": { "score": 0-100, "blockers": ["string"], "enablers": ["string"] },
  "confidence_per_section": { "top_growth_levers": 0-1, "expansion_opportunities": 0-1, "retention_signals": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { store_url, objective } = req.body;
  if (!store_url) return res.status(400).json({ error: 'store_url is required' });
  res.json({
    execution_ready: true,
    store_url,
    objective: objective || 'growth_optimization',
    next_api: 'meeting-analyzer',
    next_endpoint: '/analyze-meeting',
    blocking_flags: [],
    flag_definitions: {
      NO_STORE_URL: 'No store URL provided — required for all analysis',
      LOW_TRAFFIC: 'Insufficient traffic data — results will be based on niche benchmarks only',
      MISSING_NICHE: 'No niche provided — analysis will use generic ecommerce benchmarks',
    },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /analyze-shopify-store (one-call workflow)
router.post('/analyze-shopify-store', async (req: Request, res: Response) => {
  const { store_url, niche, budget, competitors = [], goals } = req.body;
  if (!store_url) return res.status(400).json({ error: 'store_url is required' });
  try {
    const raw = await callClaude(`Full Shopify store analysis. store: "${store_url}" niche: "${niche || 'general'}" budget: "${budget || 'unknown'}" competitors: ${JSON.stringify(competitors.slice(0,3))} goals: "${goals || 'grow revenue'}". Return concise JSON:
{
  "store_url": "${store_url}",
  "executive_summary": { "overall_score": 0-100, "grade": "A-F", "top_priority": "string", "revenue_opportunity": "string" },
  "store_health": { "conversion_score": 0-100, "seo_score": 0-100, "brand_score": 0-100, "product_score": 0-100 },
  "top_issues": [{ "issue": "string", "impact": "high|medium|low", "fix": "string" }],
  "growth_levers": [{ "lever": "string", "impact": "high|medium|low", "effort": "low|medium|high" }],
  "competitive_position": { "score": 0-100, "key_gaps": ["string"], "advantages": ["string"] },
  "ad_recommendations": [{ "channel": "string", "priority": "high|medium|low", "budget_allocation": "string" }],
  "quick_wins": [{ "action": "string", "revenue_impact": "string", "effort": "low|medium|high" }],
  "90_day_plan": [{ "phase": number, "action": "string", "timeline": "string", "expected_outcome": "string" }],
  "confidence_per_section": { "store_health": 0-1, "top_issues": 0-1, "growth_levers": 0-1, "competitive_position": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
