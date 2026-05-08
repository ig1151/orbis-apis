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

router.post('/analyze-competitor', async (req: Request, res: Response) => {
  const { competitor_name, your_company, industry, focus_areas } = req.body;
  if (!competitor_name || !industry) return res.status(400).json({ error: 'competitor_name and industry are required' });
  try {
    const result = await callClaude(
      'You are an expert competitive intelligence analyst. Return only valid JSON.',
      `Analyze this competitor and return JSON with fields: competitor_name, threat_level (low/medium/high/critical), overall_score (0-100), strengths (array), weaknesses (array), market_position (leader/challenger/follower/niche), estimated_market_share, key_differentiators (array), vulnerability_gaps (array), recent_moves (array), strategic_direction, recommended_actions_priority_order (array of action slugs in priority order), confidence (object with threat_assessment, strengths_analysis, market_position, recent_moves each scored 0-100). Data: ${JSON.stringify({ competitor_name, your_company, industry, focus_areas })}`
    );
    res.json({ success: true, ...result, analyzed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Competitor analysis failed', details: e.message }); }
});

router.post('/compare-features', async (req: Request, res: Response) => {
  const { your_product, competitor_product, feature_list, industry } = req.body;
  if (!your_product || !competitor_product) return res.status(400).json({ error: 'your_product and competitor_product are required' });
  try {
    const result = await callClaude(
      'You are a product competitive analysis specialist. Return only valid JSON.',
      `Compare these products and return JSON with fields: comparison_matrix (array with feature, your_score, competitor_score, winner, notes), your_advantages (array), competitor_advantages (array), feature_gaps (array with gap, priority, effort_to_close), overall_winner, win_rate_impact, positioning_recommendations (array), confidence_score (0-100). Your product: ${JSON.stringify(your_product)} Competitor: ${JSON.stringify(competitor_product)} Features: ${JSON.stringify(feature_list || [])} Industry: ${industry || 'general'}`
    );
    res.json({ success: true, ...result, compared_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Feature comparison failed', details: e.message }); }
});

router.post('/pricing-intelligence', async (req: Request, res: Response) => {
  const { competitor_name, your_pricing, known_competitor_pricing, industry, segment } = req.body;
  if (!competitor_name || !industry) return res.status(400).json({ error: 'competitor_name and industry are required' });
  try {
    const result = await callClaude(
      'You are a competitive pricing intelligence analyst. Return only valid JSON.',
      `Analyze competitive pricing and return JSON with fields: pricing_position (premium/competitive/budget), price_gap_analysis (object with your_price, competitor_price, gap_percentage, gap_direction), pricing_strategy_inference, value_perception_score (0-100), pricing_vulnerabilities (array), recommended_positioning, discount_patterns (array), upsell_opportunities (array), win_loss_price_impact, pricing_recommendations (array), confidence_score (0-100). Competitor: ${competitor_name} Your pricing: ${JSON.stringify(your_pricing || {})} Known competitor pricing: ${JSON.stringify(known_competitor_pricing || {})} Industry: ${industry} Segment: ${segment || 'mid-market'}`
    );
    res.json({ success: true, competitor_name, ...result, analyzed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Pricing intelligence failed', details: e.message }); }
});

router.post('/detect-threats', async (req: Request, res: Response) => {
  const { your_company, competitors, market_signals, industry } = req.body;
  if (!your_company || !industry) return res.status(400).json({ error: 'your_company and industry are required' });
  try {
    const result = await callClaude(
      'You are a competitive threat detection specialist. Return only valid JSON.',
      `Detect and rank competitive threats and return JSON with fields: threat_summary (overall_threat_level, top_threats array), threat_matrix (array with competitor, threat_type, severity, timeline, probability, recommended_response), emerging_threats (array), market_shift_signals (array), defensive_priorities (array with priority, action, urgency), offensive_opportunities (array), early_warning_indicators (array), confidence_score (0-100). Company: ${your_company} Competitors: ${JSON.stringify(competitors || [])} Signals: ${JSON.stringify(market_signals || [])} Industry: ${industry}`
    );
    res.json({ success: true, your_company, ...result, detected_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Threat detection failed', details: e.message }); }
});

router.post('/positioning-map', async (req: Request, res: Response) => {
  const { your_company, competitors, dimensions, industry } = req.body;
  if (!your_company || !industry) return res.status(400).json({ error: 'your_company and industry are required' });
  try {
    const result = await callClaude(
      'You are a market positioning analyst. Return only valid JSON.',
      `Create a competitive positioning map and return JSON with fields: positioning_map (array with company, x_score, y_score, quadrant, positioning_statement), your_position (quadrant, white_space_opportunities array, crowded_areas array), differentiation_score (0-100), repositioning_opportunities (array with direction, rationale, effort), market_segments (array with segment, owner, opportunity_level), strategic_recommendations (array), confidence_score (0-100). Company: ${your_company} Competitors: ${JSON.stringify(competitors || [])} Dimensions: ${JSON.stringify(dimensions || ['price', 'quality'])} Industry: ${industry}`
    );
    res.json({ success: true, your_company, ...result, mapped_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Positioning map failed', details: e.message }); }
});

router.post('/battlecard', async (req: Request, res: Response) => {
  const { competitor_name, your_solution, industry, deal_context } = req.body;
  if (!competitor_name || !your_solution) return res.status(400).json({ error: 'competitor_name and your_solution are required' });
  try {
    const result = await callClaude(
      'You are a sales battlecard specialist. Return only valid JSON.',
      `Generate a sales battlecard and return JSON with fields: competitor_snapshot (strengths array, weaknesses array, typical_customers, pricing_model), your_advantages (array with advantage, proof_point, talk_track), their_advantages (array with advantage, counter_argument), discovery_questions (array), landmines_to_plant (array), objection_responses (array with objection, response), win_themes (array), trap_questions (array that expose competitor weaknesses), closing_moves (array), confidence_score (0-100). Competitor: ${competitor_name} Your solution: ${JSON.stringify(your_solution)} Industry: ${industry || 'general'} Context: ${JSON.stringify(deal_context || {})}`
    );
    res.json({ success: true, competitor_name, ...result, generated_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Battlecard generation failed', details: e.message }); }
});

router.post('/monitor-changes', async (req: Request, res: Response) => {
  const { competitor_name, previous_state, current_signals, monitoring_areas } = req.body;
  if (!competitor_name) return res.status(400).json({ error: 'competitor_name is required' });
  try {
    const result = await callClaude(
      'You are a competitive change monitoring specialist. Return only valid JSON.',
      `Analyze competitor changes and return JSON with fields: change_summary (significant_changes array, minor_changes array, no_change_areas array), change_impact_score (0-100), strategic_implications (array), threat_escalation (increased/stable/decreased), recommended_responses (array with action, urgency, owner), market_signal_interpretation, alert_triggers (array), next_monitoring_focus (array), confidence_score (0-100). Competitor: ${competitor_name} Previous state: ${JSON.stringify(previous_state || {})} Current signals: ${JSON.stringify(current_signals || [])} Areas: ${JSON.stringify(monitoring_areas || ['pricing', 'product', 'marketing', 'hiring'])}`
    );
    res.json({ success: true, competitor_name, ...result, monitored_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Change monitoring failed', details: e.message }); }
});

router.post('/win-loss-analysis', async (req: Request, res: Response) => {
  const { deals, competitor_name, industry } = req.body;
  if (!deals || !Array.isArray(deals) || deals.length === 0) return res.status(400).json({ error: 'deals array is required' });
  try {
    const result = await callClaude(
      'You are a win-loss analysis specialist. Return only valid JSON.',
      `Analyze win-loss patterns and return JSON with fields: win_rate (percentage), loss_rate (percentage), win_patterns (array with pattern, frequency, impact), loss_patterns (array with pattern, frequency, impact), top_win_reasons (array), top_loss_reasons (array), competitive_win_rate_vs (object with competitor, win_rate), improvement_opportunities (array with area, potential_impact, recommended_action), deal_size_correlation, confidence_score (0-100). Deals: ${JSON.stringify(deals)} Competitor: ${competitor_name || 'all'} Industry: ${industry || 'general'}`
    );
    res.json({ success: true, deal_count: deals.length, ...result, analyzed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Win-loss analysis failed', details: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { threat_level, competitive_score, monitoring_active, industry } = req.body;
  const score = competitive_score || 0;
  const blocking_flags: string[] = [];
  if (threat_level === 'critical') blocking_flags.push('critical_threat_detected');
  if (score < 30) blocking_flags.push('competitive_position_too_weak');
  if (monitoring_active === false) blocking_flags.push('monitoring_not_active');
  const execution_ready = blocking_flags.length === 0;
  res.json({
    execution_ready,
    threat_level: threat_level || 'unknown',
    competitive_score: score,
    blocking_flags,
    blocking_flag_definitions: {
      critical_threat_detected: 'Competitor poses critical immediate threat — requires human review',
      competitive_position_too_weak: 'Competitive score below 30 — repositioning required before proceeding',
      monitoring_not_active: 'Competitor monitoring not active — blind spots in intelligence'
    },
    next_api: execution_ready ? 'local-business' : null,
    next_endpoint: execution_ready ? '/local-business/analyze' : null,
    recommended_action: execution_ready ? 'proceed_with_strategy' : 'address_competitive_gaps',
    privacy: { data_stored: false, retention: 'none' },
    evaluated_at: new Date().toISOString()
  });
});

router.post('/analyze-competitive-landscape', async (req: Request, res: Response) => {
  const { your_company, competitors, industry, strategic_goals } = req.body;
  if (!your_company || !industry) return res.status(400).json({ error: 'your_company and industry are required' });
  try {
    const result = await callClaude(
      'You are a complete competitive intelligence platform. Return only valid JSON.',
      `Run a full competitive landscape analysis and return CONCISE JSON with fields: market_overview (size, growth_rate, maturity), competitive_intensity (score 0-100, rating), your_position (rank, strengths array max 3, vulnerabilities array max 3, differentiation_score), competitor_profiles (array max 4 with name, threat_level, key_strength, key_weakness), threat_matrix (top 3 threats with severity and response), opportunity_map (array max 3 with opportunity, potential_impact), strategic_recommendations (array max 4 with priority, action, timeline), recommended_actions_priority_order (array of action slugs in execution order e.g. launch_freemium, vertical_specialization), confidence (object with market_overview, threat_matrix, opportunity_map, your_position each scored 0-100), executive_summary (2 sentences max). Keep all arrays to max 4 items. Company: ${your_company} Competitors: ${JSON.stringify(competitors || [])} Industry: ${industry} Goals: ${JSON.stringify(strategic_goals || [])}`
    );
    res.json({ success: true, your_company, workflow: 'full_competitive_analysis', ...result, execution_gate: { ready: true, next_api: 'local-business' }, analyzed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Competitive landscape analysis failed', details: e.message }); }
});

export default router;
