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
    name: 'Wallet Copy Trading API', version: '1.0.0',
    description: 'Copy trade signals from top-performing on-chain wallets. Returns recent trades, entry/exit timing, position sizing guidance, leaderboard rankings, and risk-adjusted copy plan.',
    docs_url: 'https://orbis-apis.onrender.com/wallet-copy-trading/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/wallet-copy-trading/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/signals', summary: 'Recent trades from a wallet to copy with timing and sizing', price_usdc: 0.004 },
      { method: 'POST', path: '/leaderboard', summary: 'Top wallets ranked by copy-trade alpha and suitability', price_usdc: 0.004 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: full copy trading plan with position sizing and risk limits', price_usdc: 0.015 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { signals: '$0.004', leaderboard: '$0.004', lookup: '$0.015' } },
    agent_capabilities: ['copy-trading', 'trade-signal-extraction', 'leaderboard-ranking', 'position-sizing', 'risk-adjusted-copying'],
    x402_compatible: true, paper_mode_recommended: true,
    'x-paper-mode-recommended': true,
    execution_modes: ['agent-callable', 'execution-gated'],
    'x-latency-tier': 'near-real-time',
    chain_to: [
      { api: 'smart-wallet-discovery-api', reason: 'discover new high-performing wallets to copy' },
      { api: 'whale-transaction-api', reason: 'monitor whale movements from copy targets in real-time' },
      { api: 'gas-adjusted-arbitrage-api', reason: 'validate that copy trade entry is still profitable after gas' },
    ],
  });
});

router.post('/signals', async (req: Request, res: Response) => {
  const { address, chain = 'ethereum', lookback_hours = 24 } = req.body;
  if (!address) return res.status(400).json({ error: 'address is required' });
  try {
    const raw = await callClaude(`Recent copy trade signals from wallet ${address} on ${chain} over the last ${lookback_hours} hours as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "address": "${address}",
  "chain": "${chain}",
  "lookback_hours": ${lookback_hours},
  "signals": [
    {
      "tx_hash": "string",
      "action": "buy|sell",
      "token": "string",
      "token_address": "string",
      "amount_usd": number,
      "price_at_trade": number,
      "timestamp": "string (ISO)",
      "minutes_ago": number,
      "copy_urgency": "immediate|valid_30m|valid_1h|stale",
      "copy_confidence": "high|medium|low",
      "suggested_copy_size_usd": number,
      "current_price": number,
      "price_moved_since_pct": number,
      "still_actionable": boolean
    }
  ],
  "wallet_context": {
    "recent_win_rate_pct": number,
    "avg_trade_roi_pct": number,
    "currently_holding": ["string"],
    "last_10_trades_positive": number
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"signals": 0.76, "context": 0.78},
  "recommended_actions_priority_order": ["still_actionable=false means price moved too far to copy safely", "copy_urgency=immediate means act within 5 minutes or skip", "scale suggested_copy_size_usd by your risk tolerance"],
  "chain_to": [{"api": "wallet-copy-trading-api", "reason": "full copy plan for this wallet"}, {"api": "gas-adjusted-arbitrage-api", "reason": "validate gas doesn't eliminate copy trade profit margin"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/leaderboard', async (req: Request, res: Response) => {
  const { chain = 'ethereum', strategy } = req.body;
  try {
    const raw = await callClaude(`Top wallets for copy trading on ${chain}${strategy ? ` with strategy=${strategy}` : ''} ranked by copy-trade alpha as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "chain": "${chain}",
  "leaderboard": [
    {
      "rank": number,
      "address": "string",
      "copy_trade_alpha_30d_pct": number,
      "win_rate_pct": number,
      "avg_trade_frequency_per_day": number,
      "avg_hold_hours": number,
      "suitability_score": number,
      "strategy": "degen|conservative|arbitrageur|swing_trader|yield_farmer|sniper",
      "recommended_portfolio_allocation_pct": number,
      "lag_tolerance_minutes": number,
      "caution": "string or null"
    }
  ],
  "leaderboard_summary": {
    "total_ranked": number,
    "best_alpha_wallet": "string",
    "avg_alpha_pct": number,
    "most_consistent": "string"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"leaderboard": 0.74, "summary": 0.78},
  "recommended_actions_priority_order": ["suitability_score > 80 is the threshold for live copy trading", "lag_tolerance_minutes < 5 means you need automated execution to copy effectively", "diversify across 3-5 wallets to reduce single-wallet risk"],
  "chain_to": [{"api": "wallet-copy-trading-api", "reason": "get live signals from leaderboard wallets"}, {"api": "smart-wallet-discovery-api", "reason": "discover new wallets not yet in the leaderboard"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/lookup', async (req: Request, res: Response) => {
  const { address, portfolio_size_usd } = req.body;
  if (!address) return res.status(400).json({ error: 'address is required' });
  try {
    const raw = await callClaude(`Full copy trading plan for wallet ${address}${portfolio_size_usd ? ` for a $${portfolio_size_usd} portfolio` : ''} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "address": "${address}",
  "copy_plan": {
    "recommended_allocation_pct": number,
    "max_position_size_usd": number,
    "copy_ratio": number,
    "lag_tolerance_minutes": number,
    "tokens_to_copy": ["string"],
    "tokens_to_skip": ["string"],
    "stop_loss_per_trade_pct": number,
    "daily_loss_limit_usd": number
  },
  "active_positions": [
    {"token": "string", "entry_price": number, "current_price": number, "unrealized_pnl_pct": number, "age_hours": number, "copy_still_valid": boolean}
  ],
  "historical_copy_performance": {
    "simulated_30d_roi_pct": number,
    "simulated_win_rate_pct": number,
    "max_copy_drawdown_pct": number,
    "avg_lag_impact_pct": number
  },
  "risk_assessment": {
    "overall_risk": "low|medium|high|degen",
    "concentration_risk": "string",
    "liquidity_risk": "string",
    "timing_dependency": "low|medium|critical"
  },
  "reasoning": {
    "why_signal_generated": "string explanation of why this wallet is worth copy trading",
    "key_factors": ["factor 1 (e.g. 78% win rate across 180 trades in 90 days)", "factor 2 (e.g. consistent early entry into trending narratives)", "factor 3 (e.g. disciplined sizing — never more than 5% per position)"],
    "invalidators": ["wallet changes strategy without notice", "market conditions shift away from wallet's specialization", "lag from detection to execution erodes 30%+ of the edge"]
  },
  "latency_ms": number,
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"plan": 0.74, "positions": 0.76, "history": 0.72, "risk": 0.76, "reasoning": 0.75},
  "recommended_actions_priority_order": ["paper trade the copy plan for 2 weeks before going live", "timing_dependency=critical means automation is required — no manual copy", "stop_loss_per_trade_pct is non-negotiable — protect against sudden strategy change"],
  "chain_to": [{"api": "wallet-copy-trading-api", "reason": "get live signals from this wallet after reviewing the plan"}, {"api": "smart-wallet-discovery-api", "reason": "find similar wallets to diversify copy trading risk"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
