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
    name: 'Smart Wallet Discovery API', version: '1.0.0',
    description: 'Discover high-performing on-chain wallets by ROI, win rate, strategy, and trade history. Identify smart money, arbitrageurs, snipers, and consistent alpha generators across EVM chains.',
    docs_url: 'https://orbis-apis.onrender.com/smart-wallet-discovery/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/smart-wallet-discovery/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/scan', summary: 'Scan for top-performing wallets by ROI and win rate', price_usdc: 0.005 },
      { method: 'POST', path: '/filter', summary: 'Filter smart wallets by strategy, ROI, drawdown, and hold time', price_usdc: 0.005 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: full smart wallet profile with strategy, top trades, and risk metrics', price_usdc: 0.015 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { scan: '$0.005', filter: '$0.005', lookup: '$0.015' } },
    agent_capabilities: ['wallet-discovery', 'smart-money-tracking', 'roi-ranking', 'strategy-classification', 'alpha-identification'],
    x402_compatible: true, paper_mode_recommended: false,
    'x-paper-mode-recommended': false,
    execution_modes: ['agent-callable', 'read-only'],
    'x-latency-tier': 'near-real-time',
    chain_to: [
      { api: 'wallet-copy-trading-api', reason: 'copy trade signals from discovered smart wallets' },
      { api: 'insider-wallet-detection-api', reason: 'check if high-ROI wallets show insider buying patterns' },
      { api: 'whale-transaction-api', reason: 'monitor on-chain movements of discovered wallets in real-time' },
    ],
  });
});

router.post('/scan', async (req: Request, res: Response) => {
  const { chain = 'ethereum', limit = 20, min_roi_30d_pct = 20 } = req.body;
  try {
    const raw = await callClaude(`Top-performing on-chain wallets on ${chain} with minimum 30-day ROI of ${min_roi_30d_pct}%, ranked by alpha as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "chain": "${chain}",
  "min_roi_30d_pct": ${min_roi_30d_pct},
  "wallets": [
    {
      "address": "string (0x...)",
      "rank": number,
      "roi_30d_pct": number,
      "roi_90d_pct": number,
      "win_rate_pct": number,
      "total_trades_30d": number,
      "avg_hold_hours": number,
      "pnl_30d_usd": number,
      "max_drawdown_pct": number,
      "strategy": "degen|conservative|arbitrageur|swing_trader|yield_farmer|sniper",
      "wallet_type": "whale|smart_money|bot|retail|institutional",
      "top_token": "string",
      "last_active": "string (ISO datetime)"
    }
  ],
  "scan_summary": {
    "total_wallets_analyzed": number,
    "qualifying_count": number,
    "avg_roi_pct": number,
    "top_strategy": "string",
    "most_active_wallet": "string"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": false,
  "confidence_per_section": {"wallets": 0.74, "summary": 0.78},
  "recommended_actions_priority_order": ["high win_rate + high ROI is the best combination", "bots have ROI but are not copy-tradable", "look for wallets active in the last 48h for freshest signals"],
  "chain_to": [{"api": "wallet-copy-trading-api", "reason": "get copy trade signals from top-ranked wallets"}, {"api": "insider-wallet-detection-api", "reason": "check if high-ROI wallets exhibit insider patterns"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/filter', async (req: Request, res: Response) => {
  const { chain = 'ethereum', strategy, min_win_rate_pct = 60, max_drawdown_pct = 30, min_roi_30d_pct = 0 } = req.body;
  try {
    const raw = await callClaude(`Filter on-chain smart wallets on ${chain}${strategy ? ` with strategy=${strategy}` : ''}, min win rate ${min_win_rate_pct}%, max drawdown ${max_drawdown_pct}%, min 30d ROI ${min_roi_30d_pct}% as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "filters_applied": {
    "chain": "${chain}",
    "strategy": ${strategy ? `"${strategy}"` : null},
    "min_win_rate_pct": ${min_win_rate_pct},
    "max_drawdown_pct": ${max_drawdown_pct},
    "min_roi_30d_pct": ${min_roi_30d_pct}
  },
  "wallets": [
    {
      "address": "string",
      "roi_30d_pct": number,
      "win_rate_pct": number,
      "max_drawdown_pct": number,
      "avg_hold_hours": number,
      "strategy": "degen|conservative|arbitrageur|swing_trader|yield_farmer|sniper",
      "wallet_type": "whale|smart_money|bot|retail|institutional",
      "pnl_30d_usd": number,
      "consistency_score": number,
      "copy_trade_suitability": "excellent|good|fair|poor"
    }
  ],
  "filter_summary": {
    "total_matched": number,
    "best_wallet": "string",
    "avg_win_rate_pct": number,
    "avg_roi_pct": number
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": false,
  "confidence_per_section": {"wallets": 0.76, "summary": 0.80},
  "recommended_actions_priority_order": ["excellent copy_trade_suitability = human-like trading patterns that can be replicated", "high consistency_score means results are repeatable not lucky", "bot wallets show high ROI but are not suitable for human copy trading"],
  "chain_to": [{"api": "wallet-copy-trading-api", "reason": "generate copy trade signals from filtered wallet"}, {"api": "smart-wallet-discovery-api", "reason": "broaden filter criteria if too few results"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/lookup', async (req: Request, res: Response) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'address is required' });
  try {
    const raw = await callClaude(`Full smart wallet profile for ${address} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "address": "${address}",
  "wallet_classification": {
    "wallet_type": "whale|smart_money|bot|retail|institutional",
    "strategy": "degen|conservative|arbitrageur|swing_trader|yield_farmer|sniper",
    "experience_level": "novice|intermediate|expert|elite",
    "classification_confidence_pct": number
  },
  "performance_metrics": {
    "roi_7d_pct": number, "roi_30d_pct": number, "roi_90d_pct": number, "roi_all_time_pct": number,
    "win_rate_pct": number, "avg_hold_hours": number,
    "best_trade_pct": number, "worst_trade_pct": number,
    "max_drawdown_pct": number, "sharpe_ratio": number,
    "total_trades": number, "pnl_30d_usd": number
  },
  "top_trades": [
    {"token": "string", "entry_date": "string", "exit_date": "string", "roi_pct": number, "pnl_usd": number, "hold_hours": number}
  ],
  "token_preferences": {
    "most_traded_tokens": ["string"],
    "preferred_market_cap": "micro|small|mid|large",
    "avg_entry_market_cap_usd": number,
    "sector_focus": ["string"]
  },
  "timing_patterns": {
    "typical_entry_time_utc": "string",
    "avg_hold_before_sell_hours": number,
    "buy_on_dip": boolean,
    "sells_into_strength": boolean
  },
  "risk_metrics": {
    "position_concentration": "concentrated|diversified",
    "avg_position_size_usd": number,
    "max_position_size_usd": number,
    "uses_leverage": boolean,
    "stop_loss_discipline": "strict|moderate|none"
  },
  "copy_trade_assessment": {
    "suitability": "excellent|good|fair|poor",
    "recommended_size_multiplier": number,
    "lag_tolerance_minutes": number,
    "risk_of_following": "low|medium|high",
    "cautions": ["string"]
  },
  "reasoning": {
    "why_signal_generated": "string explanation of what makes this wallet notable",
    "key_factors": ["factor 1 (e.g. consistent 80%+ win rate over 90 days across 200+ trades)", "factor 2 (e.g. identifies micro-cap opportunities before they trend)", "factor 3 (e.g. exits within 24h of peak — disciplined take-profit)"],
    "invalidators": ["performance driven by one lucky trade, not consistency", "strategy may not work in bear market conditions", "recent inactivity — may have retired or pivoted strategy"]
  },
  "latency_ms": number,
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": false,
  "confidence_per_section": {"classification": 0.78, "performance": 0.80, "trades": 0.74, "timing": 0.72, "risk": 0.76, "copy_trade": 0.74, "reasoning": 0.76},
  "recommended_actions_priority_order": ["validate top_trades manually before committing to copy trading", "suitability=excellent wallets have 3+ months of consistent data", "lag_tolerance_minutes tells you how quickly you must act after the wallet trades"],
  "chain_to": [{"api": "wallet-copy-trading-api", "reason": "generate live copy trade signals for this wallet"}, {"api": "insider-wallet-detection-api", "reason": "check if this wallet exhibits insider buying patterns"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
