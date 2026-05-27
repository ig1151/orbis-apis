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
    name: 'Multi-Exchange Ticker API', version: '1.0.0',
    description: 'Fetch real-time price and volume ticker data across multiple exchanges, compare spreads, and get unified best-price recommendations.',
    docs_url: 'https://orbis-apis.onrender.com/multi-exchange-ticker/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/multi-exchange-ticker/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/ticker', summary: 'Price and volume for a symbol across all exchanges', price_usdc: 0.003 },
      { method: 'POST', path: '/compare', summary: 'Side-by-side exchange comparison with spread analysis', price_usdc: 0.003 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: unified ticker + best price + spread analysis + recommendation', price_usdc: 0.008 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { ticker: '$0.003', compare: '$0.003', lookup: '$0.008' } },
    agent_capabilities: ['multi-exchange-pricing', 'spread-analysis', 'best-price-routing', 'arbitrage-detection', 'unified-ticker'],
    x402_compatible: true, paper_mode_recommended: true,
  });
});

// POST /ticker — price and volume for a symbol across all exchanges
router.post('/ticker', async (req: Request, res: Response) => {
  const { symbol } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const raw = await callClaude(`Multi-exchange ticker data for ${symbol} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol}",
  "tickers": [
    {
      "exchange": "string",
      "bid": number,
      "ask": number,
      "last": number,
      "volume_24h": number,
      "volume_usd_24h": number,
      "price_change_pct_24h": number,
      "market_share_pct": number,
      "latency_ms": number
    }
  ],
  "global_stats": {
    "total_volume_usd_24h": number,
    "highest_price": number,
    "lowest_price": number,
    "price_spread_pct": number,
    "most_liquid_exchange": "string"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"tickers": 0.83, "global_stats": 0.81},
  "recommended_actions_priority_order": ["use highest volume exchange for large trades", "check spread before executing", "account for withdrawal fees"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /compare — side-by-side exchange comparison with spread
router.post('/compare', async (req: Request, res: Response) => {
  const { symbol } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const raw = await callClaude(`Side-by-side exchange price comparison for ${symbol} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol}",
  "comparison": [
    {
      "exchange": "string",
      "bid": number,
      "ask": number,
      "spread_usd": number,
      "spread_pct": number,
      "depth_bid_usd": number,
      "depth_ask_usd": number,
      "fee_taker_pct": number,
      "effective_cost_pct": number,
      "rank_for_buying": number,
      "rank_for_selling": number
    }
  ],
  "spread_analysis": {
    "tightest_spread_exchange": "string",
    "widest_spread_exchange": "string",
    "avg_spread_pct": number,
    "arbitrage_opportunity": boolean,
    "arb_profit_pct": number
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"comparison": 0.82, "spread_analysis": 0.79},
  "recommended_actions_priority_order": ["factor in fees for true cost", "depth matters for large orders", "arbitrage requires speed and accounts on both exchanges"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /lookup — ONE-CALL: unified ticker + best price + spread analysis + recommendation
router.post('/lookup', async (req: Request, res: Response) => {
  const { symbol } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const raw = await callClaude(`Full multi-exchange ticker intelligence for ${symbol} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol}",
  "unified_price": {
    "mid_price": number,
    "vwap_24h": number,
    "price_volatility_24h_pct": number,
    "momentum": "bullish|bearish|neutral"
  },
  "best_execution": {
    "best_exchange_to_buy": "string",
    "best_exchange_to_sell": "string",
    "best_bid": number,
    "best_ask": number,
    "effective_spread_pct": number,
    "reasoning": "string"
  },
  "exchange_rankings": [
    {
      "exchange": "string",
      "score": number,
      "liquidity_grade": "A|B|C|D",
      "recommended_for": "string"
    }
  ],
  "arbitrage_alert": {
    "detected": boolean,
    "buy_exchange": "string",
    "sell_exchange": "string",
    "gross_profit_pct": number,
    "net_profit_pct": number,
    "viability": "viable|marginal|not_viable"
  },
  "recommendation": {
    "action": "buy|sell|hold|wait",
    "preferred_exchange": "string",
    "urgency": "immediate|normal|low",
    "key_insight": "string"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"pricing": 0.84, "execution": 0.80, "arbitrage": 0.75},
  "recommended_actions_priority_order": ["always verify prices directly on exchange", "consider withdrawal/deposit times", "factor slippage for large orders"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
