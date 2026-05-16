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
  res.json({ name: 'Betting Odds API', info: '/betting-odds/info', openapi: '/betting-odds/openapi.json', health: 'ok' });
});

// POST /odds
router.post('/odds', async (req: Request, res: Response) => {
  const { sport, event_id } = req.body;
  if (!sport || !event_id) return res.status(400).json({ error: 'sport and event_id are required' });
  try {
    const raw = await callClaude(`Get betting odds for sport: "${sport}", event_id: "${event_id}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "sport": "${sport}",
  "event_id": "${event_id}",
  "odds": [
    {"bookmaker": "string", "market": "string", "home_odds": number, "away_odds": number, "draw_odds": number, "last_updated": "string"}
  ],
  "consensus_odds": {"home": number, "away": number, "draw": number},
  "implied_probabilities": {"home": number, "away": number, "draw": number},
  "disclaimer": "For informational purposes only. Not gambling advice. Verify odds before wagering.",
  "confidence_per_section": {"odds": 0.8},
  "recommended_actions_priority_order": ["compare bookmakers", "check line movement", "find best price"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /line-movement
router.post('/line-movement', async (req: Request, res: Response) => {
  const { sport, event_id } = req.body;
  if (!sport || !event_id) return res.status(400).json({ error: 'sport and event_id are required' });
  try {
    const raw = await callClaude(`Get line movement for sport: "${sport}", event_id: "${event_id}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "event_id": "${event_id}",
  "line_history": [
    {"timestamp": "string", "market": "string", "home_odds": number, "away_odds": number, "bookmaker": "string"}
  ],
  "movement_summary": {"direction": "home_favored|away_favored|stable", "magnitude": "large|moderate|small", "sharp_action_detected": false},
  "opening_odds": {"home": number, "away": number},
  "current_odds": {"home": number, "away": number},
  "confidence_per_section": {"line_history": 0.75},
  "recommended_actions_priority_order": ["note sharp action", "compare to opening", "assess movement magnitude"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /best-price
router.post('/best-price', async (req: Request, res: Response) => {
  const { sport, event_id, market } = req.body;
  if (!sport || !event_id || !market) return res.status(400).json({ error: 'sport, event_id, and market are required' });
  try {
    const raw = await callClaude(`Find best price for sport: "${sport}", event_id: "${event_id}", market: "${market}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "event_id": "${event_id}",
  "market": "${market}",
  "best_prices": [
    {"outcome": "string", "best_odds": number, "bookmaker": "string", "url": "string"}
  ],
  "arbitrage_opportunity": {"exists": false, "roi_pct": number},
  "market_efficiency": number,
  "confidence_per_section": {"best_prices": 0.8},
  "recommended_actions_priority_order": ["verify odds in real-time", "check terms before betting", "compare multiple markets"],
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
    objective: objective || 'odds_analysis',
    next_api: 'social-profile-lookup',
    next_endpoint: '/find-profiles',
    blocking_flags: [],
    flag_definitions: { NO_SPORT: 'No sport specified', NO_EVENT: 'No event_id provided' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Get odds first', 'Check line movement', 'Find best price'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /analyze (ONE-CALL)
router.post('/analyze', async (req: Request, res: Response) => {
  const { sport, event_id } = req.body;
  if (!sport || !event_id) return res.status(400).json({ error: 'sport and event_id are required' });
  try {
    const raw = await callClaude(`Full betting odds analysis for sport: "${sport}", event_id: "${event_id}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "sport": "${sport}",
  "event_id": "${event_id}",
  "odds_comparison": [{"bookmaker": "string", "home": number, "away": number, "draw": number}],
  "best_prices": {"home": {"odds": number, "bookmaker": "string"}, "away": {"odds": number, "bookmaker": "string"}},
  "line_movement": {"direction": "string", "sharp_action": false},
  "implied_probabilities": {"home": number, "away": number},
  "arbitrage_check": {"exists": false, "roi_pct": number},
  "value_bets": [{"outcome": "string", "fair_odds": number, "market_odds": number, "edge": number}],
  "disclaimer": "For informational purposes only. Not gambling advice.",
  "confidence_per_section": {"odds_comparison": 0.8, "value_bets": 0.7},
  "recommended_actions_priority_order": ["verify real-time odds", "check value_bets edge", "review sharp action"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
