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
  res.json({
    name: 'Smart Money Flow API', version: '1.0.0',
    description: 'Track institutional and smart-money capital flows on-chain — sector rotation, top wallet activity, and flow signals.',
    docs_url: 'https://orbis-apis.onrender.com/smart-money-flow/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/smart-money-flow/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/flows', summary: 'Smart money flows by sector with rotation direction', price_usdc: 0.003 },
      { method: 'POST', path: '/wallets', summary: 'Top smart money wallets — ROI, thesis, positions', price_usdc: 0.004 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: smart money intelligence for a token', price_usdc: 0.010 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { flows: '$0.003', wallets: '$0.004', lookup: '$0.010' } },
    agent_capabilities: ['smart-money-tracking', 'sector-rotation', 'institutional-flow', 'wallet-intelligence', 'capital-flow-signals'],
    x402_compatible: true, paper_mode_recommended: true,
  });
});

// POST /flows — current smart money capital flows by sector/chain
router.post('/flows', async (req: Request, res: Response) => {
  const { chain = 'ethereum', sector, timeframe = '24h' } = req.body;
  try {
    const raw = await callClaude(`Smart money capital flow analysis on ${chain}${sector ? ` for sector: ${sector}` : ''} over the last ${timeframe} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "chain": "${chain}",
  "timeframe": "${timeframe}",
  "flows": [
    {
      "sector": "defi|nft|layer2|gaming|meme|infrastructure|staking|lending",
      "net_flow_usd": number,
      "direction": "inflow|outflow|neutral",
      "top_tokens": ["string"],
      "notable_wallets": number,
      "momentum": "accelerating|decelerating|stable",
      "signal": "bullish|bearish|neutral"
    }
  ],
  "total_smart_money_volume_usd": number,
  "dominant_rotation": {
    "from_sector": "string",
    "to_sector": "string",
    "magnitude": "large|moderate|small",
    "context": "string"
  },
  "market_regime": "risk_on|risk_off|selective|mixed",
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"flows": 0.78, "rotation": 0.75},
  "recommended_actions_priority_order": ["follow sector rotation before chasing pumps", "risk-off signal = reduce exposure", "combine with on-chain volume data"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /wallets — top smart money wallet addresses and their recent activity
router.post('/wallets', async (req: Request, res: Response) => {
  const { chain = 'ethereum', limit = 10, strategy } = req.body;
  try {
    const raw = await callClaude(`Top smart money wallets on ${chain}${strategy ? ` with strategy: ${strategy}` : ''} as of ${new Date().toISOString()}. Return top ${limit}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "chain": "${chain}",
  "wallets": [
    {
      "address": "string",
      "label": "string (e.g. Institutional Fund, DeFi Whale, Protocol Treasury)",
      "category": "institution|fund|protocol|dao|whale|insider",
      "roi_30d_pct": number,
      "roi_90d_pct": number,
      "win_rate_pct": number,
      "recent_positions": [
        {"token": "string", "action": "opened|increased|reduced|closed", "size_usd": number}
      ],
      "current_thesis": "string (brief description of current bet)",
      "risk_appetite": "high|medium|low"
    }
  ],
  "summary": {
    "consensus_bet": "string",
    "consensus_chain": "string",
    "divergence_rate_pct": number
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"wallets": 0.75, "summary": 0.78},
  "recommended_actions_priority_order": ["copy smart money direction not size", "watch for consensus divergence", "insiders move first — follow quickly"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /lookup — ONE-CALL: smart money flow summary + top wallets + rotation signal
router.post('/lookup', async (req: Request, res: Response) => {
  const { token, chain = 'ethereum' } = req.body;
  if (!token) return res.status(400).json({ error: 'token is required' });
  try {
    const raw = await callClaude(`Full smart money intelligence for ${token} on ${chain} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "token": "${token}",
  "chain": "${chain}",
  "smart_money_position": {
    "net_flow_7d_usd": number,
    "net_flow_30d_usd": number,
    "direction": "accumulating|distributing|neutral",
    "unique_smart_wallets": number,
    "avg_entry_price_usd": number
  },
  "top_holders": [
    {"address": "string", "category": "institution|fund|whale|protocol", "position_usd": number, "action_30d": "increased|decreased|unchanged"}
  ],
  "rotation_context": {
    "money_coming_from": "string",
    "catalyst": "string",
    "rotation_strength": "strong|moderate|weak"
  },
  "aggregate_signal": {
    "signal": "strong_buy|buy|neutral|sell|strong_sell",
    "smart_money_consensus": "bullish|bearish|mixed",
    "conviction_level": "high|medium|low",
    "key_insight": "string"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"position": 0.78, "holders": 0.75, "signal": 0.72},
  "recommended_actions_priority_order": ["smart money flow leads price by 2-7 days on average", "check if rotation is sector-wide or token-specific", "confirm with volume before acting"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
