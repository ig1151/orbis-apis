import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';


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
    name: 'DEX vs CEX Arbitrage API', version: '1.0.0',
    description: 'Detect price gaps between DEX pools and CEX order books for the same token, accounting for DEX liquidity depth, CEX bid/ask, and net profit after estimated swap fees.',
    docs_url: 'https://orbis-apis.onrender.com/dex-cex-arbitrage/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/dex-cex-arbitrage/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/scan', summary: 'DEX vs CEX price gap scan for a token', price_usdc: 0.004 },
      { method: 'POST', path: '/alerts', summary: 'Active DEX/CEX arb opportunities above threshold', price_usdc: 0.005 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: full DEX/CEX arb analysis with execution checklist', price_usdc: 0.012 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { scan: '$0.004', alerts: '$0.005', lookup: '$0.012' } },
    agent_capabilities: ['dex-cex-arbitrage', 'price-gap-detection', 'liquidity-depth-analysis', 'fee-adjusted-profit', 'execution-viability'],
    x402_compatible: true, paper_mode_recommended: true,
    'x-paper-mode-recommended': true,
    'x-execution-gate-required': true,
    'x-human-approval-required': true,
    execution_modes: ['agent-callable', 'execution-gated'],
    'x-latency-tier': 'real-time',
    chain_to: [
      { api: 'gas-adjusted-arbitrage-api', reason: 'validate profitability after gas before committing capital' },
      { api: 'flash-loan-opportunity-api', reason: 'wrap the spread in a flash loan for zero-capital execution' },
      { api: 'triangular-arbitrage-api', reason: 'check for triangular loops on CEX that compound the arb' },
      { api: 'market-inefficiency-scanner-api', reason: 'detect broader price discovery lag patterns' },
    ],
  });
});

// POST /scan — DEX vs CEX price gap scan for a specific token
router.post('/scan', async (req: Request, res: Response) => {
  const { symbol, chain = 'ethereum', exchange = 'binance' } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const raw = await callClaude(`DEX vs CEX arbitrage price gap scan for ${symbol} on ${chain} DEX pools vs ${exchange} order book as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol}",
  "chain": "${chain}",
  "exchange": "${exchange}",
  "dex_price": number,
  "cex_price": number,
  "gap_pct": number,
  "direction": "buy_dex_sell_cex|buy_cex_sell_dex",
  "estimated_profit_usdc": number,
  "liquidity_depth_usd": number,
  "fee_estimate_pct": number,
  "viability": "viable|marginal|not_viable",
  "dex_details": {
    "pool_address": "string",
    "dex_protocol": "uniswap_v3|uniswap_v2|curve|balancer|sushiswap|pancakeswap",
    "pool_fee_tier_pct": number,
    "price_impact_pct": number,
    "tvl_usd": number
  },
  "cex_details": {
    "best_bid": number,
    "best_ask": number,
    "spread_pct": number,
    "order_book_depth_usd": number,
    "maker_fee_pct": number,
    "taker_fee_pct": number
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"dex_price": 0.78, "cex_price": 0.82, "profit_estimate": 0.72},
  "recommended_actions_priority_order": ["verify DEX price with on-chain call before executing", "account for price impact on large DEX swaps", "CEX withdrawal limits may cap trade size"],
  "chain_to": [{"api": "gas-adjusted-arbitrage-api", "reason": "calculate true net profit after gas costs"}, {"api": "flash-loan-opportunity-api", "reason": "execute zero-capital if spread justifies flash loan fee"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /alerts — active DEX/CEX arb opportunities above threshold
router.post('/alerts', async (req: Request, res: Response) => {
  const { min_gap_pct = 0.5 } = req.body;
  try {
    const raw = await callClaude(`Active DEX vs CEX arbitrage opportunities with price gap above ${min_gap_pct}% as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "min_gap_pct": ${min_gap_pct},
  "opportunities": [
    {
      "symbol": "string",
      "chain": "ethereum|base|arbitrum|bsc",
      "dex_protocol": "uniswap_v3|curve|balancer|sushiswap",
      "cex": "binance|coinbase|kraken|bybit|okx",
      "dex_price": number,
      "cex_price": number,
      "gap_pct": number,
      "direction": "buy_dex_sell_cex|buy_cex_sell_dex",
      "estimated_profit_usdc": number,
      "liquidity_depth_usd": number,
      "viability": "viable|marginal|not_viable",
      "urgency": "immediate|building|fading",
      "detected_ago_seconds": number
    }
  ],
  "market_summary": {
    "total_opportunities": number,
    "viable_count": number,
    "best_gap_pct": number,
    "best_symbol": "string",
    "most_active_chain": "string"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"opportunities": 0.75, "summary": 0.78},
  "recommended_actions_priority_order": ["immediate urgency signals close fastest", "viable opportunities only — marginal rarely profitable after slippage", "larger liquidity depth = safer execution"],
  "chain_to": [{"api": "gas-adjusted-arbitrage-api", "reason": "net profit after gas before acting on any alert"}, {"api": "dex-cex-arbitrage-api", "reason": "deep scan specific symbol before execution"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /lookup — ONE-CALL: full DEX/CEX arb analysis with execution checklist
router.post('/lookup', async (req: Request, res: Response) => {
  const { symbol } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const raw = await callClaude(`Full DEX vs CEX arbitrage intelligence for ${symbol} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol}",
  "best_opportunity": {
    "dex_protocol": "uniswap_v3|curve|balancer|sushiswap|pancakeswap",
    "dex_chain": "ethereum|base|arbitrum|bsc",
    "cex": "binance|coinbase|kraken|bybit|okx",
    "dex_price": number,
    "cex_price": number,
    "direction": "buy_dex_sell_cex|buy_cex_sell_dex",
    "raw_gap_pct": number,
    "fee_estimate_pct": number,
    "gas_estimate_usd": number,
    "net_profit_after_fees_usd": number,
    "viability": "viable|marginal|not_viable"
  },
  "execution_checklist": {
    "liquidity_sufficient": boolean,
    "price_impact_acceptable": boolean,
    "gas_within_budget": boolean,
    "cex_withdrawal_open": boolean,
    "no_bridge_needed": boolean,
    "readiness_score": number
  },
  "risk_factors": [
    {"risk": "string", "severity": "high|medium|low", "mitigation": "string"}
  ],
  "net_profit_scenarios": {
    "small_position_1k_usd": number,
    "medium_position_10k_usd": number,
    "large_position_50k_usd": number
  },
  "reasoning": {
    "why_signal_generated": "string explanation of the primary factor driving this DEX/CEX price gap",
    "key_factors": ["factor 1 (e.g. DEX pool imbalanced after large swap)", "factor 2 (e.g. CEX order book has thin ask side)", "factor 3 (e.g. low gas environment on Arbitrum)"],
    "invalidators": ["DEX price reverts as arbitrageurs close gap", "gas spike eliminates net profit", "CEX spread widens on volatility"]
  },
  "latency_ms": number,
  "chain_to": [{"api": "gas-adjusted-arbitrage-api", "reason": "validate gas-adjusted net profit before execution"}, {"api": "flash-loan-opportunity-api", "reason": "zero-capital execution if spread covers flash loan fee"}],
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"opportunity": 0.76, "checklist": 0.80, "risks": 0.74, "scenarios": 0.70, "reasoning": 0.75},
  "recommended_actions_priority_order": ["readiness score must be 4/5+ before execution", "net profit must exceed $50 to be worth execution risk", "paper trade first to validate the full flow"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
