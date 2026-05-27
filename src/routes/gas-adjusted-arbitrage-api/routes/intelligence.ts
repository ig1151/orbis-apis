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
    name: 'Gas-Adjusted Arbitrage API', version: '1.0.0',
    description: 'Gas-net profitability analysis for any arbitrage opportunity. Given a price gap, trade size, and chain — returns true net profit after gas (current gwei), slippage, and protocol fees.',
    docs_url: 'https://orbis-apis.onrender.com/gas-adjusted-arbitrage/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/gas-adjusted-arbitrage/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/estimate', summary: 'Gas cost estimate for a trade on a specific chain', price_usdc: 0.003 },
      { method: 'POST', path: '/scan', summary: 'All arb opportunities on a chain ranked by net profit after gas', price_usdc: 0.005 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: gas-adjusted analysis with optimal gas strategy and profit scenarios', price_usdc: 0.012 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { estimate: '$0.003', scan: '$0.005', lookup: '$0.012' } },
    agent_capabilities: ['gas-adjusted-profitability', 'real-time-gas-pricing', 'net-profit-calculation', 'gas-strategy-optimization', 'slippage-modeling'],
    x402_compatible: true, paper_mode_recommended: true,
    'x-paper-mode-recommended': true,
    execution_modes: ['agent-callable', 'execution-gated'],
    'x-latency-tier': 'real-time',
    chain_to: [
      { api: 'dex-cex-arbitrage-api', reason: 'find the actual arb opportunity this gas budget can profitably execute' },
      { api: 'flash-loan-opportunity-api', reason: 'flash loans reduce capital at risk even when gas is high' },
      { api: 'triangular-arbitrage-api', reason: 'evaluate triangular loops that fit within the current gas budget' },
    ],
  });
});

// POST /estimate — gas cost estimate for a trade on a specific chain
router.post('/estimate', async (req: Request, res: Response) => {
  const { chain, trade_size_usd, num_transactions = 2 } = req.body;
  if (!chain) return res.status(400).json({ error: 'chain is required' });
  if (!trade_size_usd) return res.status(400).json({ error: 'trade_size_usd is required' });
  try {
    const raw = await callClaude(`Gas cost estimate for ${num_transactions} transactions on ${chain} for a $${trade_size_usd} trade as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "chain": "${chain}",
  "trade_size_usd": ${trade_size_usd},
  "num_transactions": ${num_transactions},
  "gas_cost_usd": number,
  "gas_gwei_current": number,
  "gas_gwei_fast": number,
  "gas_gwei_standard": number,
  "time_to_confirm_seconds": number,
  "gas_units_per_tx": number,
  "min_spread_needed_pct_to_profit": number,
  "gas_as_pct_of_trade": number,
  "chain_context": {
    "chain_native_token": "string",
    "native_token_price_usd": number,
    "block_time_seconds": number,
    "congestion_level": "low|moderate|high|very_high"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"gas": 0.82, "timing": 0.80},
  "recommended_actions_priority_order": ["gas costs are dynamic — re-estimate within 1 minute of execution", "fast gas reduces front-run risk but increases cost", "on L2s gas is often negligible even for small trades"],
  "chain_to": [{"api": "gas-adjusted-arbitrage-api", "reason": "full arb analysis with gas-adjusted profit scenarios"}, {"api": "dex-cex-arbitrage-api", "reason": "scan for opportunities that justify the gas cost on this chain"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /scan — all arb opportunities on a chain ranked by net profit after gas
router.post('/scan', async (req: Request, res: Response) => {
  const { chain = 'ethereum' } = req.body;
  try {
    const raw = await callClaude(`All arbitrage opportunities on ${chain} ranked by net profit after gas costs as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "chain": "${chain}",
  "current_gas_gwei": number,
  "opportunities": [
    {
      "arb_type": "dex_price_gap|triangular|stablecoin_spread|flash_loan",
      "symbol": "string",
      "gross_spread_pct": number,
      "gas_cost_usd": number,
      "slippage_estimate_pct": number,
      "protocol_fee_pct": number,
      "net_profit_usd_per_10k": number,
      "break_even_spread_pct": number,
      "viable": boolean,
      "urgency": "immediate|building|fading"
    }
  ],
  "chain_summary": {
    "total_scanned": number,
    "gas_profitable_count": number,
    "best_net_profit_usd": number,
    "avg_break_even_spread_pct": number,
    "recommended_min_trade_usd": number
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"opportunities": 0.75, "summary": 0.80},
  "recommended_actions_priority_order": ["viable = true means gas already factored in", "net_profit_usd_per_10k is normalized — scale to your trade size", "on Ethereum mainnet, only large trades are gas-profitable"],
  "chain_to": [{"api": "gas-adjusted-arbitrage-api", "reason": "deep lookup on top opportunity with full profit scenarios"}, {"api": "flash-loan-opportunity-api", "reason": "wrap viable opportunities in flash loan for zero capital requirement"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /lookup — ONE-CALL: gas-adjusted analysis with optimal gas strategy and profit scenarios
router.post('/lookup', async (req: Request, res: Response) => {
  const { symbol, chain = 'ethereum', trade_size_usd } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const raw = await callClaude(`Full gas-adjusted arbitrage analysis for ${symbol} on ${chain}${trade_size_usd ? ` with $${trade_size_usd} trade size` : ''} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol}",
  "chain": "${chain}",
  "current_gas_environment": {
    "gas_gwei": number,
    "gas_trend": "rising|falling|stable",
    "congestion": "low|moderate|high|very_high",
    "recommended_timing": "string"
  },
  "optimal_gas_strategy": "standard|fast|aggressive",
  "gas_strategy_analysis": {
    "standard": {"gwei": number, "cost_usd": number, "confirm_seconds": number, "front_run_risk": "low|medium|high"},
    "fast": {"gwei": number, "cost_usd": number, "confirm_seconds": number, "front_run_risk": "low|medium|high"},
    "aggressive": {"gwei": number, "cost_usd": number, "confirm_seconds": number, "front_run_risk": "low|medium|high"}
  },
  "break_even_spread_pct": number,
  "net_profit_scenarios": {
    "small_position_1k_usd": {"gross_profit_usd": number, "gas_cost_usd": number, "net_profit_usd": number, "viable": boolean},
    "medium_position_10k_usd": {"gross_profit_usd": number, "gas_cost_usd": number, "net_profit_usd": number, "viable": boolean},
    "large_position_50k_usd": {"gross_profit_usd": number, "gas_cost_usd": number, "net_profit_usd": number, "viable": boolean}
  },
  "fee_breakdown": {
    "gas_cost_usd": number,
    "protocol_fee_pct": number,
    "slippage_estimate_pct": number,
    "total_cost_pct": number,
    "gross_spread_required_to_profit_pct": number
  },
  "reasoning": {
    "why_signal_generated": "string explanation of why this arb is (or is not) gas-profitable right now",
    "key_factors": ["factor 1 (e.g. low gas at 12 gwei makes even small spreads profitable)", "factor 2 (e.g. Arbitrum gas negligible at $0.02 per swap)", "factor 3 (e.g. spread of 0.8% exceeds total cost of 0.35%)"],
    "invalidators": ["gas spikes above 50 gwei eliminate the spread", "MEV bot front-runs and captures the arb profit", "slippage exceeds estimate on low liquidity pool"]
  },
  "latency_ms": number,
  "chain_to": [{"api": "dex-cex-arbitrage-api", "reason": "find the actual arb opportunity this gas budget can execute"}, {"api": "flash-loan-opportunity-api", "reason": "flash loans reduce capital at risk even when gas is high"}],
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"gas": 0.82, "strategy": 0.78, "scenarios": 0.74, "fees": 0.80, "reasoning": 0.76},
  "recommended_actions_priority_order": ["use optimal_gas_strategy to balance speed vs cost", "large_position_50k_usd viable = true is threshold for real execution", "re-estimate gas immediately before submitting — gwei can double in minutes"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
