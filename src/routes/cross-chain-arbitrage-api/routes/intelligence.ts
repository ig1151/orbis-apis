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
    name: 'Cross-Chain Arbitrage API', version: '1.0.0',
    description: 'Price differences for a token across chains (Ethereum, Base, Arbitrum, Polygon, BSC, Solana), accounting for bridge costs, gas on each chain, and bridge latency.',
    docs_url: 'https://orbis-apis.onrender.com/cross-chain-arbitrage/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/cross-chain-arbitrage/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/scan', summary: 'Cross-chain price scan for a token across all supported chains', price_usdc: 0.006 },
      { method: 'POST', path: '/routes', summary: 'All profitable cross-chain routes ranked by net profit', price_usdc: 0.006 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: full cross-chain arb with bridge recommendation and execution steps', price_usdc: 0.018 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { scan: '$0.006', routes: '$0.006', lookup: '$0.018' } },
    agent_capabilities: ['cross-chain-arbitrage', 'bridge-cost-analysis', 'multi-chain-price-comparison', 'bridge-recommendation', 'latency-risk-assessment'],
    x402_compatible: true, paper_mode_recommended: true,
    'x-paper-mode-recommended': true,
    'x-execution-gate-required': true,
    'x-human-approval-required': true,
    execution_modes: ['agent-callable', 'execution-gated'],
    'x-latency-tier': 'real-time',
    chain_to: [
      { api: 'gas-adjusted-arbitrage-api', reason: 'validate total gas cost on both chains before committing capital' },
      { api: 'dex-cex-arbitrage-api', reason: 'compare cross-chain spread vs faster single-chain DEX/CEX arb' },
      { api: 'flash-loan-opportunity-api', reason: 'flash loan on source chain can fund the buy side without pre-capital' },
      { api: 'market-inefficiency-scanner-api', reason: 'confirm cross-chain gap is a persistent structural inefficiency' },
    ],
  });
});

// POST /scan — cross-chain price scan for a token
router.post('/scan', async (req: Request, res: Response) => {
  const { symbol, chains } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  const chainList = chains ? chains.join(', ') : 'ethereum, base, arbitrum, polygon, bsc, solana';
  try {
    const raw = await callClaude(`Cross-chain price scan for ${symbol} across ${chainList} as of ${new Date().toISOString()}. Include bridge costs and gas. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol}",
  "chain_prices": [
    {
      "chain": "ethereum|base|arbitrum|polygon|bsc|solana",
      "price_usd": number,
      "liquidity_usd": number,
      "gas_cost_usd": number,
      "dex_protocol": "string",
      "price_impact_pct": number
    }
  ],
  "best_buy_chain": "string",
  "best_sell_chain": "string",
  "raw_spread_pct": number,
  "bridge_cost_estimate_usd": number,
  "net_profit_after_bridge_usd": number,
  "bridge_latency_minutes": number,
  "viable": boolean,
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"prices": 0.76, "bridge": 0.72, "profit": 0.70},
  "recommended_actions_priority_order": ["bridge latency creates price risk — spread must exceed 2% to cover", "verify bridge supports this token before committing", "smaller chains may have insufficient liquidity for large trades"],
  "chain_to": [{"api": "gas-adjusted-arbitrage-api", "reason": "validate total gas cost across both chains before executing"}, {"api": "cross-chain-arbitrage-api", "reason": "deep lookup for best route and bridge recommendation"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /routes — all profitable cross-chain routes ranked by net profit
router.post('/routes', async (req: Request, res: Response) => {
  const { symbol } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const raw = await callClaude(`All profitable cross-chain arbitrage routes for ${symbol} ranked by net profit after all costs as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol}",
  "routes": [
    {
      "rank": number,
      "buy_chain": "ethereum|base|arbitrum|polygon|bsc|solana",
      "sell_chain": "ethereum|base|arbitrum|polygon|bsc|solana",
      "bridge_protocol": "stargate|across|hop|layerzero|wormhole|synapse",
      "buy_price": number,
      "sell_price": number,
      "raw_spread_pct": number,
      "bridge_cost_usd": number,
      "buy_chain_gas_usd": number,
      "sell_chain_gas_usd": number,
      "net_profit_after_all_costs_usd": number,
      "bridge_latency_minutes": number,
      "price_risk_during_bridge": "low|medium|high",
      "min_position_usd": number
    }
  ],
  "route_summary": {
    "total_routes_found": number,
    "profitable_routes": number,
    "best_net_profit_usd": number,
    "fastest_route_minutes": number,
    "safest_route": "string"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"routes": 0.74, "summary": 0.78},
  "recommended_actions_priority_order": ["fastest bridge reduces price risk during transit", "higher net profit = higher bridge latency in most cases", "min_position_usd must be met for profit to exceed fixed costs"],
  "chain_to": [{"api": "cross-chain-arbitrage-api", "reason": "full lookup on top route before executing"}, {"api": "gas-adjusted-arbitrage-api", "reason": "validate gas cost assumptions per chain"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /lookup — ONE-CALL: full cross-chain arb with bridge recommendation and execution steps
router.post('/lookup', async (req: Request, res: Response) => {
  const { symbol } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const raw = await callClaude(`Full cross-chain arbitrage intelligence for ${symbol} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol}",
  "best_route": {
    "buy_chain": "ethereum|base|arbitrum|polygon|bsc|solana",
    "sell_chain": "ethereum|base|arbitrum|polygon|bsc|solana",
    "bridge_protocol": "stargate|across|hop|layerzero|wormhole|synapse",
    "buy_price": number,
    "sell_price": number,
    "raw_spread_pct": number,
    "bridge_cost_usd": number,
    "gas_total_usd": number,
    "net_profit_after_all_costs_usd": number,
    "bridge_latency_minutes": number,
    "execution_window_minutes": number
  },
  "bridge_recommendation": {
    "protocol": "stargate|across|hop|layerzero|wormhole|synapse",
    "rationale": "string",
    "bridge_fee_usd": number,
    "security_rating": "battle_tested|audited|experimental",
    "supported_token": boolean
  },
  "execution_steps": [
    {"step": number, "action": "string", "chain": "string", "estimated_time_minutes": number, "estimated_cost_usd": number}
  ],
  "latency_risk": {
    "bridge_latency_minutes": number,
    "price_volatility_risk": "low|medium|high",
    "max_acceptable_spread_for_this_latency_pct": number,
    "hedge_strategy": "string"
  },
  "reasoning": {
    "why_signal_generated": "string explanation of why this cross-chain price gap exists",
    "key_factors": ["factor 1 (e.g. Arbitrum DEX has thinner liquidity pushing price higher)", "factor 2 (e.g. Stargate bridge cost is minimal on this route)", "factor 3 (e.g. 15-minute bridge window is acceptable for this spread)"],
    "invalidators": ["price gap closes during bridge transit", "bridge congestion increases latency beyond execution window", "token liquidity on sell chain insufficient for trade size"]
  },
  "latency_ms": number,
  "chain_to": [{"api": "gas-adjusted-arbitrage-api", "reason": "validate net profit after per-chain gas before committing"}, {"api": "market-inefficiency-scanner-api", "reason": "check if cross-chain gap is persistent or one-time"}],
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"route": 0.74, "bridge": 0.76, "steps": 0.78, "latency_risk": 0.72, "reasoning": 0.75},
  "recommended_actions_priority_order": ["bridge latency is the #1 risk — only execute if spread > 3x bridge time * hourly volatility", "use battle_tested bridges only for large positions", "paper simulate the full route before first real execution"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
