import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';

async function callClaude(systemPrompt: string, userPrompt: string): Promise<any> {
  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 2000
    },
    {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  const raw = response.data.choices[0].message.content;
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

router.get('/', (_req, res) => {
  res.json({ name: 'local-business API', info: '/local-business/info', openapi: '/local-business/openapi.json', health: 'ok' });
});

router.post('/analyze-business', async (req: Request, res: Response) => {
  const { business_name, location, category, competitors } = req.body;
  if (!business_name || !location) return res.status(400).json({ error: 'business_name and location are required' });
  try {
    const result = await callClaude(
      'You are a local business intelligence analyst. Return only valid JSON.',
      `Analyze this local business and return JSON with fields: business_score (0-100), market_position (leader/challenger/follower/niche), strengths (array max 4), weaknesses (array max 4), opportunities (array max 4), threats (array max 4), customer_demographics (primary_age_range, income_level, lifestyle), foot_traffic_estimate (low/medium/high), peak_hours (array), seasonal_patterns, competitive_advantage, recommended_actions (array max 4), confidence (object with market_position, demographics, foot_traffic each 0-100). Data: ${JSON.stringify({ business_name, location, category, competitors })}`
    );
    res.json({ success: true, business_name, location, ...result, analyzed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Business analysis failed', details: e.message }); }
});

router.post('/reputation-analysis', async (req: Request, res: Response) => {
  const { business_name, location, category, review_data } = req.body;
  if (!business_name || !location) return res.status(400).json({ error: 'business_name and location are required' });
  try {
    const result = await callClaude(
      'You are a local business reputation analyst. Return only valid JSON.',
      `Analyze this business reputation and return JSON with fields: reputation_score (0-100), sentiment_breakdown (positive, neutral, negative as percentages), review_themes (positive_themes array, negative_themes array), response_rate_estimate, owner_engagement_score (0-100), trust_signals (array), red_flags (array), competitor_reputation_comparison, improvement_priorities (array max 4 with priority, action, expected_impact), recommended_response_templates (array max 2), confidence (object with sentiment, themes, trust_signals each 0-100). Data: ${JSON.stringify({ business_name, location, category, review_data })}`
    );
    res.json({ success: true, business_name, ...result, analyzed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Reputation analysis failed', details: e.message }); }
});

router.post('/foot-traffic-signals', async (req: Request, res: Response) => {
  const { business_name, location, category, time_period } = req.body;
  if (!business_name || !location) return res.status(400).json({ error: 'business_name and location are required' });
  try {
    const result = await callClaude(
      'You are a foot traffic and location intelligence analyst. Return only valid JSON.',
      `Analyze foot traffic signals and return JSON with fields: traffic_score (0-100), estimated_daily_visitors (range as string), peak_days (array), peak_hours (array), slow_periods (array), traffic_drivers (array), catchment_area_profile (radius_estimate, population_density, accessibility_score), seasonal_index (object with months as keys, index values), nearby_anchors (array of nearby traffic generators), optimization_opportunities (array max 4), confidence (object with traffic_estimate, peak_times, catchment each 0-100). Data: ${JSON.stringify({ business_name, location, category, time_period })}`
    );
    res.json({ success: true, business_name, location, ...result, analyzed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Foot traffic analysis failed', details: e.message }); }
});

router.post('/local-competitors', async (req: Request, res: Response) => {
  const { business_name, location, category, radius_km } = req.body;
  if (!business_name || !location) return res.status(400).json({ error: 'business_name and location are required' });
  try {
    const result = await callClaude(
      'You are a local competitive intelligence specialist. Return only valid JSON.',
      `Analyze local competitive landscape and return JSON with fields: competitive_density (low/medium/high/saturated), estimated_competitor_count, competitor_profiles (array max 5 with name, estimated_distance, threat_level, key_strength, key_weakness), market_saturation_score (0-100), differentiation_opportunities (array max 4), underserved_segments (array), location_advantages (array), location_disadvantages (array), recommended_positioning, confidence (object with density, profiles, opportunities each 0-100). Data: ${JSON.stringify({ business_name, location, category, radius_km: radius_km || 2 })}`
    );
    res.json({ success: true, business_name, location, ...result, analyzed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Local competitor analysis failed', details: e.message }); }
});

router.post('/market-opportunity', async (req: Request, res: Response) => {
  const { location, category, target_demographic, investment_level } = req.body;
  if (!location || !category) return res.status(400).json({ error: 'location and category are required' });
  try {
    const result = await callClaude(
      'You are a local market opportunity analyst. Return only valid JSON.',
      `Analyze local market opportunity and return JSON with fields: opportunity_score (0-100), market_size_estimate (annual_revenue_potential, addressable_customers), demand_signals (array), supply_gap_analysis (underserved_needs array, oversupplied_areas array), entry_barriers (array with barrier, severity, mitigation), success_factors (array max 4), risk_factors (array max 4), recommended_entry_strategy, break_even_estimate, roi_projection (12_month, 24_month, 36_month as percentages), confidence (object with market_size, demand, roi each 0-100). Data: ${JSON.stringify({ location, category, target_demographic, investment_level })}`
    );
    res.json({ success: true, location, category, ...result, analyzed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Market opportunity analysis failed', details: e.message }); }
});

router.post('/customer-profile', async (req: Request, res: Response) => {
  const { business_name, location, category, existing_customer_data } = req.body;
  if (!business_name || !location) return res.status(400).json({ error: 'business_name and location are required' });
  try {
    const result = await callClaude(
      'You are a local business customer profiling specialist. Return only valid JSON.',
      `Build a customer profile and return JSON with fields: primary_persona (name, age_range, income, lifestyle, pain_points array, motivations array), secondary_personas (array max 2 with same fields), lifetime_value_estimate, acquisition_channels (array with channel, effectiveness, cost_estimate), retention_drivers (array), churn_risks (array), upsell_opportunities (array), local_marketing_recommendations (array max 4), seasonal_behavior_patterns, confidence (object with persona, ltv, channels each 0-100). Data: ${JSON.stringify({ business_name, location, category, existing_customer_data })}`
    );
    res.json({ success: true, business_name, ...result, analyzed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Customer profiling failed', details: e.message }); }
});

router.post('/location-score', async (req: Request, res: Response) => {
  const { address, category, business_requirements } = req.body;
  if (!address || !category) return res.status(400).json({ error: 'address and category are required' });
  try {
    const result = await callClaude(
      'You are a commercial location scoring specialist. Return only valid JSON.',
      `Score this business location and return JSON with fields: location_score (0-100), grade (A+/A/B/C/D), dimension_scores (visibility, accessibility, foot_traffic, demographics, competition, parking, cost_efficiency each 0-100), strengths (array max 4), weaknesses (array max 4), nearby_demand_generators (array), zoning_considerations, lease_negotiation_tips (array), alternative_locations_suggestion, recommended_actions_priority_order (array of slugs), confidence (object with visibility, demographics, competition each 0-100). Data: ${JSON.stringify({ address, category, business_requirements })}`
    );
    res.json({ success: true, address, category, ...result, scored_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Location scoring failed', details: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { business_score, reputation_score, market_opportunity_score, location_grade } = req.body;
  const score = business_score || 0;
  const reputation = reputation_score || 0;
  const opportunity = market_opportunity_score || 0;
  const blocking_flags: string[] = [];
  if (score < 40) blocking_flags.push('business_score_too_low');
  if (reputation < 40) blocking_flags.push('reputation_score_too_low');
  if (location_grade === 'D') blocking_flags.push('poor_location_grade');
  if (opportunity < 30) blocking_flags.push('insufficient_market_opportunity');
  const execution_ready = blocking_flags.length === 0;
  res.json({
    execution_ready,
    business_score: score,
    reputation_score: reputation,
    blocking_flags,
    blocking_flag_definitions: {
      business_score_too_low: 'Overall business score below 40',
      reputation_score_too_low: 'Reputation score below 40 — address reviews before proceeding',
      poor_location_grade: 'Location graded D — consider relocation or major improvements',
      insufficient_market_opportunity: 'Market opportunity score below 30 — market may be oversaturated'
    },
    next_api: execution_ready ? 'serp-intelligence' : null,
    next_endpoint: execution_ready ? '/serp-intelligence/analyze' : null,
    recommended_action: execution_ready ? 'proceed_with_local_strategy' : 'address_blocking_issues_first',
    privacy: { data_stored: false, retention: 'none' },
    evaluated_at: new Date().toISOString()
  });
});

router.post('/analyze-local-business', async (req: Request, res: Response) => {
  const { business_name, location, category, competitors, review_data } = req.body;
  if (!business_name || !location) return res.status(400).json({ error: 'business_name and location are required' });
  try {
    const result = await callClaude(
      'You are a complete local business intelligence platform. Return only valid JSON.',
      `Run a full local business analysis and return CONCISE JSON with fields: business_score (0-100), market_position, reputation_score (0-100), foot_traffic_estimate (low/medium/high), competitive_density (low/medium/high/saturated), top_opportunities (array max 3), top_threats (array max 3), customer_persona (primary age_range, income, key_pain_point), location_grade (A+/A/B/C/D), recommended_actions_priority_order (array max 5 of action slugs), executive_summary (2 sentences), confidence (object with business_score, reputation, foot_traffic, market each 0-100). Keep all arrays max 3 items. Data: ${JSON.stringify({ business_name, location, category, competitors, review_data })}`
    );
    res.json({ success: true, business_name, location, workflow: 'full_local_business_analysis', ...result, execution_gate: { ready: (result.business_score || 0) >= 40, next_api: 'serp-intelligence' }, analyzed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Full local business analysis failed', details: e.message }); }
});

export default router;
