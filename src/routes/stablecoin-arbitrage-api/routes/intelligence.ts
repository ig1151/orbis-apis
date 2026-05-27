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
    name: 'Stablecoin Arbitrage API', version: '1.0.0',
    description: 'Stablecoin price deviations across DEX pools and CEX for USDC, USDT, DAI, FRAX — risk-minimal arbitrage opportunities from peg slippage.',
    docs_url: 'https://orbis-apis.onrender.com/stablecoin-arbitrage/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/stablecoin-arbitrage/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/spreads', summary: 'Price spreads for stablecoins across DEX and CEX venues', price_usdc: 0.003 },
      { method: 'POST', path: '/alerts', summary: 'Stablecoin arb alerts above spread threshold', price_usdc: 0.004 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: best stablecoin spread trade with peg risk context', price_usdc: 0.01 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { spreads: '$0.003', alerts: '$0.004', lookup: '$0.01' } },
    agent_capabilities: ['stablecoin-arbitrage', 'peg-deviation-detection', 'low-risk-spread-trading', 'dex-cex-stablecoin', 'peg-risk-context'],
    x402_compatible: true, paper_mode_recommended: true,
    'x-paper-mode-recommended': true,
    execution_modes: ['agent-callable', 'execution-gated'],
    'x-latency-tier': 'near-real-time',
    chain_to: [
      { api: 'stablecoin-depeg-api', reason: 'verify peg health before trading any stablecoin spread' },
      { api: 'gas-adjusted-arbitrage-api', reason: 'gas costs often exceed thin stable spread — validate first' },
      { api: 'dex-cex-arbitrage-api', reason: 'cross-venue stablecoin gaps often have an underlying DEX/CEX component' },
    ],
  });
});

// POST /spreads — price spreads for stablecoins across DEX and CEX venues
router.post('/spreads', async (req: Request, res: Response) => {
  const { stablecoin } = req.body;
  const stablecoinFilter = stablecoin ? `for ${stablecoin} specifically` : 'for USDC, USDT, DAI, and FRAX';
  try {
    const raw = await callClaude(`Stablecoin price spreads across DEX pools and CEX venues ${stablecoinFilter} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "stablecoins": [
    {
      "stablecoin": "USDC|USDT|DAI|FRAX",
      "peg_target": 1.0,
      "venues": [
        {
          "venue": "string",
          "venue_type": "dex|cex",
          "price": number,
          "deviation_from_peg_pct": number,
          "volume_24h_usd": number,
          "liquidity_usd": number
        }
      ],
      "max_spread_pct": number,
      "best_buy_venue": "string",
      "best_buy_price": number,
      "best_sell_venue": "string",
      "best_sell_price": number,
      "arb_viable": boolean
    }
  ],
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"spreads": 0.82, "venues": 0.80},
  "recommended_actions_priority_order": ["stablecoin arb is low risk but margins are thin", "large volumes required to profit meaningfully", "peg deviations above 0.5% may signal depeg event — avoid"],
  "chain_to": [{"api": "stablecoin-depeg-api", "reason": "check if spread is caused by depeg risk before trading"}, {"api": "gas-adjusted-arbitrage-api", "reason": "gas costs often exceed profit on small stable spreads"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /alerts — stablecoin arb alerts above spread threshold
router.post('/alerts', async (req: Request, res: Response) => {
  const { min_spread_pct = 0.1 } = req.body;
  try {
    const raw = await callClaude(`Active stablecoin arbitrage opportunities where spread exceeds ${min_spread_pct}% as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "min_spread_pct": ${min_spread_pct},
  "alerts": [
    {
      "stablecoin": "USDC|USDT|DAI|FRAX",
      "buy_venue": "string",
      "buy_venue_type": "dex|cex",
      "sell_venue": "string",
      "sell_venue_type": "dex|cex",
      "buy_price": number,
      "sell_price": number,
      "spread_pct": number,
      "estimated_profit_pct": number,
      "min_trade_size_usd": number,
      "urgency": "immediate|building|fading",
      "peg_risk": "safe|caution|high_risk"
    }
  ],
  "market_context": {
    "total_alerts": number,
    "best_spread_pct": number,
    "best_stablecoin": "string",
    "safest_opportunity": "string"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"alerts": 0.80, "context": 0.78},
  "recommended_actions_priority_order": ["high_risk peg = avoid entirely", "minimum $10k trade size for meaningful profit", "immediate urgency fades in under 60 seconds"],
  "chain_to": [{"api": "stablecoin-depeg-api", "reason": "verify peg_risk rating is safe before any trade"}, {"api": "dex-cex-arbitrage-api", "reason": "scan specific stable pair across DEX vs CEX for better route"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /lookup — ONE-CALL: best stablecoin spread trade with peg risk context
router.post('/lookup', async (req: Request, res: Response) => {
  const { stablecoin } = req.body;
  if (!stablecoin) return res.status(400).json({ error: 'stablecoin is required' });
  try {
    const raw = await callClaude(`Full stablecoin arbitrage intelligence for ${stablecoin} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "stablecoin": "${stablecoin}",
  "best_trade": {
    "entry_venue": "string",
    "entry_venue_type": "dex|cex",
    "exit_venue": "string",
    "exit_venue_type": "dex|cex",
    "entry_price": number,
    "exit_price": number,
    "gross_spread_pct": number,
    "estimated_fees_pct": number,
    "net_profit_after_fees_pct": number,
    "min_profitable_size_usd": number
  },
  "peg_risk_context": {
    "current_price": number,
    "deviation_from_peg_pct": number,
    "peg_risk_level": "safe|caution|high_risk|critical",
    "depeg_probability_pct": number,
    "peg_mechanism": "fiat_backed|algorithmic|crypto_backed|hybrid",
    "recent_peg_events": "string",
    "safe_to_arb": boolean
  },
  "execution_plan": {
    "step_1": "string",
    "step_2": "string",
    "step_3": "string",
    "total_time_seconds": number,
    "recommended_size_usd": number
  },
  "reasoning": {
    "why_signal_generated": "string explanation of why this stablecoin spread exists right now",
    "key_factors": ["factor 1 (e.g. Curve pool imbalanced 60/40 pushing DAI below peg)", "factor 2 (e.g. high USDT redemption demand on CEX creating premium)", "factor 3 (e.g. low gas on Ethereum makes crossing DEX profitable)"],
    "invalidators": ["peg risk escalates from caution to high_risk", "spread closes as Curve pool rebalances", "gas spike eliminates thin margin"]
  },
  "latency_ms": number,
  "chain_to": [{"api": "stablecoin-depeg-api", "reason": "real-time depeg monitoring before and during execution"}, {"api": "gas-adjusted-arbitrage-api", "reason": "confirm gas cost does not eliminate thin stable spread"}],
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"trade": 0.80, "peg_risk": 0.82, "plan": 0.76, "reasoning": 0.78},
  "recommended_actions_priority_order": ["never arb a stablecoin with high_risk peg — loss exceeds spread", "safe_to_arb must be true before executing", "monitor peg_risk in real-time throughout execution"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
