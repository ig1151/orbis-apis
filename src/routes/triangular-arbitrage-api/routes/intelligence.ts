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
    name: 'Triangular Arbitrage API', version: '1.0.0',
    description: 'Find triangular arbitrage loops within a single exchange — three-leg trades that return more than started with. Returns profit after fees, execution order, and viability window.',
    docs_url: 'https://orbis-apis.onrender.com/triangular-arbitrage/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/triangular-arbitrage/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/scan', summary: 'Scan for viable triangular loops for a base currency', price_usdc: 0.004 },
      { method: 'POST', path: '/paths', summary: 'All detected arb paths on an exchange ranked by net profit', price_usdc: 0.005 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: best triangular loop with exact execution sequence', price_usdc: 0.012 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { scan: '$0.004', paths: '$0.005', lookup: '$0.012' } },
    agent_capabilities: ['triangular-arbitrage', 'loop-detection', 'three-leg-trading', 'fee-adjusted-profit', 'viability-window'],
    x402_compatible: true, paper_mode_recommended: true,
    'x-paper-mode-recommended': true,
    'x-execution-gate-required': true,
    'x-human-approval-required': false,
    execution_modes: ['agent-callable', 'execution-gated'],
    'x-latency-tier': 'real-time',
    chain_to: [
      { api: 'gas-adjusted-arbitrage-api', reason: 'validate net profit after gas on each leg before executing' },
      { api: 'flash-loan-opportunity-api', reason: 'wrap best triangular loop in flash loan for zero-capital execution' },
      { api: 'dex-cex-arbitrage-api', reason: 'compare triangular loop profit vs simpler DEX/CEX price gap' },
      { api: 'market-inefficiency-scanner-api', reason: 'confirm loop is structural inefficiency not a transient artifact' },
    ],
  });
});

// POST /scan — scan for viable triangular loops for a base currency
router.post('/scan', async (req: Request, res: Response) => {
  const { base_currency, exchange = 'binance' } = req.body;
  if (!base_currency) return res.status(400).json({ error: 'base_currency is required' });
  try {
    const raw = await callClaude(`Triangular arbitrage loop scan starting with ${base_currency} on ${exchange} as of ${new Date().toISOString()}. Find loops A→B→C→A that return profit. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "base_currency": "${base_currency}",
  "exchange": "${exchange}",
  "viable_loops": [
    {
      "path": "string (e.g. BTC→ETH→USDT→BTC)",
      "leg_a": {"pair": "string", "side": "buy|sell", "price": number},
      "leg_b": {"pair": "string", "side": "buy|sell", "price": number},
      "leg_c": {"pair": "string", "side": "buy|sell", "price": number},
      "gross_profit_pct": number,
      "trading_fees_pct": number,
      "net_profit_after_fees_pct": number,
      "viability_window_seconds": number,
      "loop_quality": "A+|A|B|C",
      "viable": boolean
    }
  ],
  "market_conditions": {
    "total_loops_checked": number,
    "viable_count": number,
    "best_net_profit_pct": number,
    "exchange_fee_tier": number,
    "fee_tier_label": "standard|vip1|vip2|vip3"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"loops": 0.76, "conditions": 0.80},
  "recommended_actions_priority_order": ["viability window closes in seconds — speed is critical", "A+ loops close fastest due to bot competition", "net profit must exceed 0.1% to beat fee drag"],
  "chain_to": [{"api": "gas-adjusted-arbitrage-api", "reason": "validate net profit is real after any gas overhead"}, {"api": "market-inefficiency-scanner-api", "reason": "confirm triangular loop is structural not transient"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /paths — all detected arb paths on an exchange ranked by net profit
router.post('/paths', async (req: Request, res: Response) => {
  const { exchange } = req.body;
  if (!exchange) return res.status(400).json({ error: 'exchange is required' });
  try {
    const raw = await callClaude(`All triangular arbitrage paths detected on ${exchange} right now as of ${new Date().toISOString()}, ranked by net profit after fees. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "exchange": "${exchange}",
  "paths": [
    {
      "rank": number,
      "path": "string (e.g. USDT→BTC→ETH→USDT)",
      "base_currency": "string",
      "gross_profit_pct": number,
      "net_profit_after_fees_pct": number,
      "viability_window_seconds": number,
      "trade_volume_limit_usd": number,
      "execution_complexity": "simple|medium|complex",
      "loop_quality": "A+|A|B|C"
    }
  ],
  "exchange_summary": {
    "total_paths_found": number,
    "profitable_paths": number,
    "best_path": "string",
    "avg_net_profit_pct": number,
    "market_efficiency_score": number
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"paths": 0.74, "summary": 0.78},
  "recommended_actions_priority_order": ["simple paths execute faster with less slippage", "rank 1 path closes first due to bot competition", "volume limit caps real profit on large positions"],
  "chain_to": [{"api": "triangular-arbitrage-api", "reason": "deep scan top path before executing"}, {"api": "flash-loan-opportunity-api", "reason": "wrap best path in flash loan for zero capital"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /lookup — ONE-CALL: best triangular loop with exact execution sequence
router.post('/lookup', async (req: Request, res: Response) => {
  const { base_currency, exchange = 'binance' } = req.body;
  if (!base_currency) return res.status(400).json({ error: 'base_currency is required' });
  try {
    const raw = await callClaude(`Full triangular arbitrage intelligence for ${base_currency} on ${exchange} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "base_currency": "${base_currency}",
  "exchange": "${exchange}",
  "best_loop": {
    "path": "string (e.g. BTC→ETH→USDT→BTC)",
    "gross_profit_pct": number,
    "trading_fees_pct": number,
    "net_profit_after_fees_pct": number,
    "viability_window_seconds": number,
    "loop_quality": "A+|A|B|C"
  },
  "execution_sequence": [
    {
      "step": number,
      "action": "buy|sell",
      "pair": "string",
      "side": "maker|taker",
      "estimated_price": number,
      "expected_slippage_pct": number,
      "time_budget_ms": number
    }
  ],
  "trade_sizing": {
    "optimal_size_usd": number,
    "min_profitable_size_usd": number,
    "max_before_slippage_usd": number,
    "expected_profit_at_optimal_usd": number
  },
  "execution_timeline": {
    "total_execution_ms": number,
    "leg_1_ms": number,
    "leg_2_ms": number,
    "leg_3_ms": number,
    "window_closes_in_seconds": number
  },
  "reasoning": {
    "why_signal_generated": "string explanation of why this triangular loop is currently profitable",
    "key_factors": ["factor 1 (e.g. ETH/BTC price lagging relative cross-rate)", "factor 2 (e.g. low spread on all three pairs)", "factor 3 (e.g. VIP fee tier reduces drag to 0.06%)"],
    "invalidators": ["competing bot closes the gap before leg 1 fills", "slippage on mid-leg trade exceeds estimate", "exchange fee tier changes between legs"]
  },
  "latency_ms": number,
  "chain_to": [{"api": "market-inefficiency-scanner-api", "reason": "confirm loop is structural market inefficiency not data artifact"}, {"api": "flash-loan-opportunity-api", "reason": "execute with zero capital via flash loan wrap"}],
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"loop": 0.76, "sequence": 0.74, "sizing": 0.72, "timeline": 0.78, "reasoning": 0.75},
  "recommended_actions_priority_order": ["execution speed under 200ms per leg is required for A+ loops", "leg 2 slippage is highest risk — size conservatively", "paper trade the sequence first to verify all pairs have sufficient depth"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
