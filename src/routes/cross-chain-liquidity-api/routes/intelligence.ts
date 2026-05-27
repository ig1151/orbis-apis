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
    name: 'Cross-Chain Liquidity API', version: '1.0.0',
    description: 'Liquidity depth analysis for a token across Ethereum, Base, Arbitrum, Polygon, BSC, and Solana. Returns slippage estimates for different trade sizes, optimal chain selection, and TVL trends.',
    docs_url: 'https://orbis-apis.onrender.com/cross-chain-liquidity/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/cross-chain-liquidity/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/depth', summary: 'Liquidity depth for an asset across all supported chains', price_usdc: 0.004 },
      { method: 'POST', path: '/compare', summary: 'Side-by-side chain liquidity comparison with slippage tiers', price_usdc: 0.005 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: optimal chain for a trade size with execution recommendation', price_usdc: 0.015 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { depth: '$0.004', compare: '$0.005', lookup: '$0.015' } },
    agent_capabilities: ['cross-chain-liquidity', 'slippage-modeling', 'optimal-chain-selection', 'tvl-analysis', 'trade-size-routing'],
    x402_compatible: true, paper_mode_recommended: false,
    'x-paper-mode-recommended': false,
    execution_modes: ['agent-callable', 'read-only'],
    'x-latency-tier': 'near-real-time',
    chain_to: [
      { api: 'cross-chain-arbitrage-api', reason: 'exploit liquidity depth differences across chains for arbitrage' },
      { api: 'gas-adjusted-arbitrage-api', reason: 'factor in gas costs per chain alongside liquidity depth' },
      { api: 'dex-cex-arbitrage-api', reason: 'combine on-chain liquidity depth with CEX order book analysis' },
    ],
  });
});

router.post('/depth', async (req: Request, res: Response) => {
  const { symbol } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const raw = await callClaude(`Liquidity depth for ${symbol} across Ethereum, Base, Arbitrum, Polygon, BSC, and Solana as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol}",
  "chains": [
    {
      "chain": "ethereum|base|arbitrum|polygon|bsc|solana",
      "total_liquidity_usd": number,
      "primary_pool": "string",
      "primary_dex": "string",
      "slippage_1k_usd_pct": number,
      "slippage_10k_usd_pct": number,
      "slippage_100k_usd_pct": number,
      "slippage_1m_usd_pct": number,
      "max_trade_without_10pct_slippage_usd": number,
      "liquidity_quality": "deep|adequate|thin|illiquid",
      "tvl_trend_7d": "growing|stable|declining"
    }
  ],
  "depth_summary": {
    "deepest_chain": "string",
    "most_fragmented_chain": "string",
    "total_cross_chain_liquidity_usd": number,
    "best_for_large_trades": "string",
    "best_for_small_trades": "string"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": false,
  "confidence_per_section": {"chains": 0.80, "summary": 0.82},
  "recommended_actions_priority_order": ["use deepest_chain for trades above $100k to minimize slippage", "liquidity_quality=illiquid chains should be avoided for any meaningful trade size", "tvl_trend=declining suggests liquidity is exiting — may worsen soon"],
  "chain_to": [{"api": "cross-chain-liquidity-api", "reason": "compare chains or get optimal routing for specific trade size"}, {"api": "cross-chain-arbitrage-api", "reason": "exploit liquidity differences for arbitrage profit"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/compare', async (req: Request, res: Response) => {
  const { symbol, trade_size_usd = 10000 } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const raw = await callClaude(`Side-by-side liquidity comparison for ${symbol} across chains for a $${trade_size_usd} trade as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol}",
  "trade_size_usd": ${trade_size_usd},
  "comparison": [
    {
      "rank": number,
      "chain": "ethereum|base|arbitrum|polygon|bsc|solana",
      "total_liquidity_usd": number,
      "slippage_at_trade_size_pct": number,
      "estimated_output_tokens": number,
      "gas_cost_usd": number,
      "net_cost_pct": number,
      "best_route": "string",
      "liquidity_quality": "deep|adequate|thin|illiquid",
      "verdict": "recommended|acceptable|suboptimal|avoid"
    }
  ],
  "recommendation": {
    "best_chain": "string",
    "reason": "string",
    "expected_slippage_pct": number,
    "expected_gas_usd": number,
    "total_cost_pct": number
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": false,
  "confidence_per_section": {"comparison": 0.80, "recommendation": 0.82},
  "recommended_actions_priority_order": ["total_cost_pct = slippage + gas — this is your true execution cost", "verdict=avoid chains add more than 3% total cost at this trade size", "split across two chains if single chain liquidity is thin for your trade size"],
  "chain_to": [{"api": "cross-chain-liquidity-api", "reason": "full lookup for trade routing recommendation"}, {"api": "gas-adjusted-arbitrage-api", "reason": "validate gas cost estimates per chain before executing"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/lookup', async (req: Request, res: Response) => {
  const { symbol, trade_size_usd } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  if (!trade_size_usd) return res.status(400).json({ error: 'trade_size_usd is required' });
  try {
    const raw = await callClaude(`Optimal chain selection and execution plan for trading $${trade_size_usd} of ${symbol} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol}",
  "trade_size_usd": ${trade_size_usd},
  "optimal_chain": "ethereum|base|arbitrum|polygon|bsc|solana",
  "optimal_route": {
    "chain": "string", "dex": "string", "pool": "string",
    "slippage_pct": number, "gas_cost_usd": number,
    "total_cost_pct": number, "expected_output_usd": number,
    "price_impact_pct": number
  },
  "split_strategy": {
    "recommended": boolean,
    "reason": "string",
    "splits": [
      {"chain": "string", "amount_usd": number, "slippage_pct": number, "gas_cost_usd": number}
    ],
    "combined_total_cost_pct": number,
    "savings_vs_single_chain_pct": number
  },
  "chain_breakdown": [
    {
      "chain": "string",
      "liquidity_usd": number,
      "slippage_at_trade_size_pct": number,
      "gas_cost_usd": number,
      "total_cost_pct": number,
      "max_recommended_trade_usd": number,
      "liquidity_quality": "deep|adequate|thin|illiquid"
    }
  ],
  "market_conditions": {
    "high_volatility_warning": boolean,
    "fragmented_liquidity_warning": boolean,
    "recommended_execution_window": "string",
    "avoid_times": "string"
  },
  "reasoning": {
    "why_signal_generated": "string explanation of optimal chain selection logic",
    "key_factors": ["factor 1 (e.g. Arbitrum has 3x the ETH liquidity of Base at this token's pool)", "factor 2 (e.g. gas on Arbitrum is $0.12 vs $2.80 on Ethereum mainnet)", "factor 3 (e.g. splitting 60/40 Arbitrum/Base reduces total slippage from 1.8% to 0.9%)"],
    "invalidators": ["liquidity can fragment rapidly during high volatility — re-check before execution", "gas prices can spike 10x in minutes — confirm gwei before submitting", "pool TVL may change between analysis and execution"]
  },
  "latency_ms": number,
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": false,
  "confidence_per_section": {"optimal_chain": 0.82, "route": 0.80, "split": 0.76, "conditions": 0.74, "reasoning": 0.78},
  "recommended_actions_priority_order": ["use split_strategy if savings > 0.5% — the extra complexity is worth it at large sizes", "re-run lookup immediately before execution — liquidity changes in real-time", "high_volatility_warning=true means slippage estimates are unreliable — wait"],
  "chain_to": [{"api": "gas-adjusted-arbitrage-api", "reason": "confirm gas cost breakdown per chain before routing"}, {"api": "cross-chain-arbitrage-api", "reason": "check if liquidity differences create arbitrage opportunities"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
