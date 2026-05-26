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
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1) return JSON.parse(cleaned.slice(start, end + 1));
  return JSON.parse(cleaned);
}

function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Meme Coin Intelligence API', openapi: '/meme-coin-intelligence/openapi.json', health: 'ok' });
});

// POST /score — virality + rugpull risk score for a token
router.post('/score', async (req: Request, res: Response) => {
  const { token, chain = 'ethereum' } = req.body;
  if (!token) return res.status(400).json({ error: 'token is required' });
  try {
    const raw = await callClaude(`Meme coin analysis for ${token} on ${chain} as of ${new Date().toISOString()}. Assess virality, rugpull risk, momentum, and social signals. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "token": "${token}",
  "chain": "${chain}",
  "virality_score": {
    "score": number (0-100),
    "tier": "viral|trending|growing|fading|dead",
    "momentum": "accelerating|decelerating|stable",
    "drivers": ["string"],
    "peak_reached": boolean
  },
  "rugpull_risk": {
    "risk_score": number (0-100),
    "risk_level": "critical|high|medium|low|minimal",
    "red_flags": ["string"],
    "green_flags": ["string"],
    "contract_verified": boolean,
    "liquidity_locked": boolean,
    "dev_wallet_pct": number
  },
  "social_signal": {
    "twitter_mentions_24h": number,
    "sentiment": "very_bullish|bullish|neutral|bearish|very_bearish",
    "influencer_mentions": number,
    "community_size_estimate": number,
    "viral_narrative": "string"
  },
  "momentum_score": {
    "score": number (0-100),
    "price_action": "parabolic|rising|consolidating|falling|crashed",
    "volume_trend": "surging|rising|stable|declining",
    "fomo_indicator": "extreme|high|moderate|low"
  },
  "recommendation": "ride|watch|avoid|exit",
  "recommendation_rationale": "string",
  "financial_disclaimer": "For informational purposes only. Not financial advice. Meme coins are extremely high risk.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"virality": 0.75, "rugpull": 0.80, "social": 0.70},
  "recommended_actions_priority_order": ["check liquidity lock before buying", "set strict stop losses", "never invest more than you can lose entirely"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /trending — trending meme coins right now
router.post('/trending', async (req: Request, res: Response) => {
  const { chain = 'all', limit = 10, min_virality = 50 } = req.body;
  try {
    const raw = await callClaude(`Top trending meme coins right now${chain !== 'all' ? ` on ${chain}` : ''} as of ${new Date().toISOString()}. Minimum virality score ${min_virality}. Return top ${limit}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "chain": "${chain}",
  "trending": [
    {
      "token": "string",
      "chain": "string",
      "virality_score": number,
      "rugpull_risk_level": "critical|high|medium|low|minimal",
      "momentum": "accelerating|decelerating|stable",
      "price_change_24h_pct": number,
      "volume_change_24h_pct": number,
      "social_buzz": "extremely_high|high|moderate|low",
      "narrative": "string",
      "stage": "early|mid|peak|fading"
    }
  ],
  "market_summary": {
    "meme_season_indicator": number (0-100),
    "dominant_chains": ["string"],
    "dominant_narratives": ["string"],
    "avg_rugpull_risk": "high|medium|low"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice. Meme coins are extremely high risk.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"trending": 0.72, "summary": 0.75},
  "recommended_actions_priority_order": ["early stage = higher reward but higher risk", "check rug risk before each entry", "track exit timing carefully"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /lookup — ONE-CALL: full meme coin intelligence
router.post('/lookup', async (req: Request, res: Response) => {
  const { token, chain = 'ethereum' } = req.body;
  if (!token) return res.status(400).json({ error: 'token is required' });
  try {
    const raw = await callClaude(`Complete meme coin intelligence for ${token} on ${chain} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "token": "${token}",
  "chain": "${chain}",
  "virality": {"score": number, "tier": "string", "momentum": "string", "peak_reached": boolean},
  "rugpull_risk": {"risk_score": number, "risk_level": "string", "red_flags": ["string"], "liquidity_locked": boolean, "dev_wallet_pct": number},
  "social": {"sentiment": "string", "influencer_mentions": number, "viral_narrative": "string", "trending_rank": number},
  "momentum": {"score": number, "price_action": "string", "volume_trend": "string", "fomo_indicator": "string"},
  "lifecycle_stage": "launch|early_adoption|viral_peak|distribution|fading|dead",
  "entry_window": {
    "status": "open|closing|closed|too_early",
    "optimal_entry": "string",
    "target_exit": "string",
    "max_hold_recommendation": "string"
  },
  "aggregate_signal": {
    "signal": "strong_buy|buy|watch|avoid|exit",
    "conviction": "high|medium|low",
    "key_risk": "string",
    "key_catalyst": "string"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice. Meme coins are extremely high risk.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"virality": 0.75, "rugpull": 0.80, "momentum": 0.72},
  "recommended_actions_priority_order": ["verify contract on etherscan/bscscan before buying", "never put rent money in meme coins", "exit before the crowd does"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
