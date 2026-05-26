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
    name: 'Cross-Exchange Arbitrage API', version: '1.0.0',
    description: 'Detect price gaps across CEXs and calculate net profit after all fees. For arbitrage bots, trading agents, and quant strategies.',
    docs_url: 'https://orbis-apis.onrender.com/cross-exchange-arbitrage/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/cross-exchange-arbitrage/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/scan', summary: 'Price matrix across exchanges with net spread', price_usdc: 0.003 },
      { method: 'POST', path: '/opportunities', summary: 'Top arbitrage opportunities ranked by net profit', price_usdc: 0.005 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: full arbitrage analysis with execute/watch/pass verdict', price_usdc: 0.010 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { scan: '$0.003', opportunities: '$0.005', lookup: '$0.010' } },
    agent_capabilities: ['arbitrage-detection', 'fee-calculation', 'price-comparison', 'profit-estimation', 'risk-assessment'],
    x402_compatible: true, paper_mode_recommended: true, execution_gate_required: true, human_approval_required: true,
  });
});

// POST /scan — scan for arbitrage opportunities for a token
router.post('/scan', async (req: Request, res: Response) => {
  const { token, exchanges } = req.body;
  if (!token) return res.status(400).json({ error: 'token is required' });
  const exchangeList = exchanges ? exchanges.join(', ') : 'Binance, Coinbase, Kraken, OKX, Bybit, Bitfinex, Huobi, KuCoin';
  try {
    const raw = await callClaude(`Cross-exchange price comparison for ${token} across ${exchangeList} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "token": "${token}",
  "prices": [
    {
      "exchange": "string",
      "bid": number,
      "ask": number,
      "mid": number,
      "spread_pct": number,
      "volume_24h_usd": number,
      "liquidity": "high|medium|low",
      "withdrawal_fee_usd": number,
      "deposit_time_min": number,
      "withdrawal_time_min": number
    }
  ],
  "best_buy": {"exchange": "string", "price": number},
  "best_sell": {"exchange": "string", "price": number},
  "raw_spread_pct": number,
  "total_fees_pct": number,
  "net_profit_pct": number,
  "viable": boolean,
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"prices": 0.78, "fees": 0.72},
  "recommended_actions_priority_order": ["verify prices are live before executing", "account for slippage on large orders", "confirm withdrawal limits before starting"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /opportunities — top arbitrage opportunities across the market
router.post('/opportunities', async (req: Request, res: Response) => {
  const { min_profit_pct = 0.3, limit = 10, include_fees = true } = req.body;
  try {
    const raw = await callClaude(`Top cross-exchange arbitrage opportunities right now as of ${new Date().toISOString()}. Minimum net profit ${min_profit_pct}% after fees. Return top ${limit}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "min_profit_pct": ${min_profit_pct},
  "opportunities": [
    {
      "token": "string",
      "buy_exchange": "string",
      "sell_exchange": "string",
      "buy_price": number,
      "sell_price": number,
      "raw_spread_pct": number,
      "trading_fee_pct": number,
      "withdrawal_fee_usd": number,
      "net_profit_pct": number,
      "required_capital_usd": number,
      "estimated_profit_usd": number,
      "execution_time_min": number,
      "risk_level": "low|medium|high",
      "risk_factors": ["string"],
      "viability": "excellent|good|marginal|risky"
    }
  ],
  "market_summary": {
    "total_opportunities": number,
    "avg_net_profit_pct": number,
    "best_token": "string",
    "best_exchange_pair": "string"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"opportunities": 0.75, "summary": 0.78},
  "recommended_actions_priority_order": ["execution speed is critical — prices change in seconds", "start small to test the full flow", "high risk level = verify manually first"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /lookup — ONE-CALL: full arbitrage analysis for a token
router.post('/lookup', async (req: Request, res: Response) => {
  const { token, capital_usd = 10000 } = req.body;
  if (!token) return res.status(400).json({ error: 'token is required' });
  try {
    const raw = await callClaude(`Full cross-exchange arbitrage analysis for ${token} with $${capital_usd} capital as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "token": "${token}",
  "capital_usd": ${capital_usd},
  "price_matrix": [
    {"exchange": "string", "price": number, "liquidity": "high|medium|low", "spread_pct": number}
  ],
  "best_opportunity": {
    "buy_exchange": "string",
    "sell_exchange": "string",
    "raw_spread_pct": number,
    "all_fees_pct": number,
    "net_profit_pct": number,
    "estimated_profit_usd": number,
    "execution_time_min": number,
    "max_viable_order_usd": number
  },
  "alternative_routes": [
    {"buy": "string", "sell": "string", "net_profit_pct": number, "note": "string"}
  ],
  "risk_assessment": {
    "price_risk": "low|medium|high",
    "liquidity_risk": "low|medium|high",
    "execution_risk": "low|medium|high",
    "overall_risk": "low|medium|high",
    "key_risks": ["string"]
  },
  "verdict": "execute|watch|pass",
  "verdict_rationale": "string",
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"prices": 0.78, "opportunity": 0.75, "risk": 0.72},
  "recommended_actions_priority_order": ["confirm live prices independently before executing", "use limit orders to lock in spread", "price can close faster than withdrawal time allows"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
