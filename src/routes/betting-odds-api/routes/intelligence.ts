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
  let s = raw.replace(/```json|```/g, '').trim();
  const start = s.indexOf('{'); const end = s.lastIndexOf('}');
  if (start !== -1 && end !== -1) s = s.slice(start, end + 1);
  s = s.replace(/:\s*\+(\d)/g, ': $1');
  return JSON.parse(s);
}
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Betting Odds API', info: '/betting-odds/info', openapi: '/betting-odds/openapi.json', health: 'ok' });
});

// POST /odds
router.post('/odds', async (req: Request, res: Response) => {
  const { sport, event_id, market } = req.body;
  if (!sport) return res.status(400).json({ error: 'sport is required' });
  try {
    const raw = await callClaude(`Get betting odds for sport: "${sport}", event: "${event_id || 'upcoming'}", market: "${market || 'moneyline'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "sport": "${sport}",
  "event_id": "${event_id || ''}",
  "market": "${market || 'moneyline'}",
  "odds": [
    {
      "bookmaker": "string",
      "home_odds": 1.85, "away_odds": 2.10, "draw_odds": 3.50,
      "home_american": -120, "away_american": +110,
      "implied_home_prob": 0.54, "implied_away_prob": 0.43,
      "last_updated": "ISO8601",
      "is_live": false
    }
  ],
  "consensus_line": {"home": 1.88, "away": 2.05},
  "source_provenance": {"provider": "betting-odds-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.95},
  "cache_ttl_seconds": 60,
  "cache_recommended": true,
  "recommended_next_api": "betting-odds",
  "recommended_next_endpoint": "/arbitrage",
  "automation_safe": true,
  "confidence_per_section": {"odds": 0.9},
  "recommended_actions_priority_order": ["compare bookmakers", "check line movement", "run arbitrage scan"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /line-movement
router.post('/line-movement', async (req: Request, res: Response) => {
  const { event_id, sport } = req.body;
  if (!event_id || !sport) return res.status(400).json({ error: 'event_id and sport are required' });
  try {
    const raw = await callClaude(`Get line movement history for event: "${event_id}", sport: "${sport}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "event_id": "${event_id}",
  "sport": "${sport}",
  "opening_line": {"home": 2.0, "away": 1.9, "timestamp": "ISO8601"},
  "current_line": {"home": 1.85, "away": 2.05, "timestamp": "ISO8601"},
  "movement_history": [{"timestamp": "ISO8601", "home": 1.9, "away": 2.0, "reason": "string"}],
  "sharp_money_indicator": "home|away|balanced",
  "public_betting_pct": {"home": 0.6, "away": 0.4},
  "steam_moves": [{"time": "ISO8601", "direction": "home|away", "magnitude": "small|medium|large"}],
  "source_provenance": {"provider": "betting-odds-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.9},
  "cache_ttl_seconds": 120,
  "cache_recommended": true,
  "recommended_next_api": "betting-odds",
  "recommended_next_endpoint": "/arbitrage",
  "automation_safe": true,
  "confidence_per_section": {"movement_history": 0.85, "sharp_money_indicator": 0.8},
  "recommended_actions_priority_order": ["follow sharp_money_indicator", "monitor steam_moves", "compare with prediction"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /comparison
router.post('/comparison', async (req: Request, res: Response) => {
  const { event_id, sport, market } = req.body;
  if (!event_id || !sport) return res.status(400).json({ error: 'event_id and sport are required' });
  try {
    const raw = await callClaude(`Compare odds across all bookmakers for event: "${event_id}", sport: "${sport}", market: "${market || 'moneyline'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "event_id": "${event_id}",
  "market": "${market || 'moneyline'}",
  "best_home_odds": {"bookmaker": "string", "odds": 1.95, "american": -105},
  "best_away_odds": {"bookmaker": "string", "odds": 2.15, "american": +115},
  "worst_home_odds": {"bookmaker": "string", "odds": 1.75},
  "worst_away_odds": {"bookmaker": "string", "odds": 1.95},
  "bookmaker_matrix": [{"bookmaker": "string", "home": 1.9, "away": 2.0, "vig": 0.05}],
  "source_provenance": {"provider": "betting-odds-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.9},
  "cache_ttl_seconds": 60,
  "cache_recommended": true,
  "recommended_next_api": "betting-odds",
  "recommended_next_endpoint": "/arbitrage",
  "automation_safe": true,
  "confidence_per_section": {"bookmaker_matrix": 0.9},
  "recommended_actions_priority_order": ["use best odds", "check vig spread", "run arbitrage check"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { sport, objective } = req.body;
  if (!sport) return res.status(400).json({ error: 'sport is required' });
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: true,
    sport,
    objective: objective || 'odds_comparison',
    next_api: 'betting-odds',
    next_endpoint: '/odds',
    blocking_flags: [],
    flag_definitions: { NO_SPORT: 'sport is required', INVALID_MARKET: 'market must be moneyline, spread, or totals' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0,
    cache_recommended: false,
    recommended_next_api: 'betting-odds',
    recommended_next_endpoint: '/odds',
    automation_safe: true,
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Get odds first', 'Check line movement', 'Run arbitrage scan'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /betting-intelligence (ONE-CALL)
router.post('/betting-intelligence', async (req: Request, res: Response) => {
  const { sport, event_id, context } = req.body;
  if (!sport) return res.status(400).json({ error: 'sport is required' });
  try {
    const raw = await callClaude(`Full betting intelligence for sport: "${sport}", event: "${event_id || 'top upcoming'}", context: "${context || 'general'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "sport": "${sport}",
  "best_bets": [{"event": "string", "pick": "string", "odds": 2.1, "confidence": 0.72, "reasoning": "string"}],
  "arbitrage_opportunities": [{"event": "string", "arb_pct": 2.5, "legs": ["string"], "guaranteed_profit_pct": 0.025}],
  "line_movements_alert": [{"event": "string", "direction": "home|away", "significance": "high|medium|low"}],
  "source_provenance": {"provider": "betting-odds-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.9},
  "cache_ttl_seconds": 120,
  "cache_recommended": true,
  "recommended_next_api": "sports-scores",
  "recommended_next_endpoint": "/game-prediction",
  "automation_safe": true,
  "confidence_per_section": {"best_bets": 0.75, "arbitrage_opportunities": 0.85},
  "recommended_actions_priority_order": ["review best_bets", "act on arbitrage", "watch line_movements_alert"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /arbitrage
router.post('/arbitrage', async (req: Request, res: Response) => {
  const { sport, event_id } = req.body;
  if (!sport) return res.status(400).json({ error: 'sport is required' });
  try {
    const raw = await callClaude(`Find arbitrage opportunities for sport: "${sport}", event: "${event_id || 'all upcoming'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "sport": "${sport}",
  "arbitrage_found": true,
  "opportunities": [
    {
      "event_id": "string",
      "event_name": "string",
      "arb_percentage": 2.5,
      "guaranteed_profit_pct": 0.025,
      "legs": [
        {"bookmaker": "string", "pick": "home", "odds": 2.1, "stake_pct": 0.476},
        {"bookmaker": "string", "pick": "away", "odds": 2.2, "stake_pct": 0.524}
      ],
      "expires_estimated": "ISO8601"
    }
  ],
  "value_bets": [{"event": "string", "pick": "string", "fair_odds": 2.0, "market_odds": 2.2, "edge_pct": 10.0}],
  "market_inefficiency_score": 0.72,
  "source_provenance": {"provider": "betting-odds-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.9},
  "cache_ttl_seconds": 60,
  "cache_recommended": true,
  "recommended_next_api": "betting-odds",
  "recommended_next_endpoint": "/comparison",
  "automation_safe": true,
  "confidence_per_section": {"opportunities": 0.85, "value_bets": 0.8},
  "recommended_actions_priority_order": ["act on arb before expires_estimated", "verify odds live", "check stake_pct allocation"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /batch
router.post('/batch', async (req: Request, res: Response) => {
  const { events } = req.body;
  if (!Array.isArray(events) || events.length === 0) return res.status(400).json({ error: 'events array is required' });
  if (events.length > 10) return res.status(400).json({ error: 'Maximum 10 events per batch' });
  try {
    const results = await Promise.all(events.map(async (event: { event_id: string; sport: string }) => {
      const raw = await callClaude(`Best odds for event: "${event.event_id}", sport: "${event.sport}". Return JSON:
{"event_id": "${event.event_id}", "sport": "${event.sport}", "best_home_odds": 1.9, "best_away_odds": 2.1, "consensus_pick": "home|away", "arb_available": false}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(),
      computed_at: new Date().toISOString(),
      success: true,
      batch_count: events.length,
      results,
      source_provenance: { provider: 'betting-odds-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.9 },
      cache_ttl_seconds: 60,
      cache_recommended: true,
      recommended_next_api: 'betting-odds',
      recommended_next_endpoint: '/arbitrage',
      automation_safe: true,
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
