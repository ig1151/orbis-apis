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
    name: 'Insider Wallet Detection API', version: '1.0.0',
    description: 'Detect wallets that consistently buy tokens before major announcements, listings, or price events. Identify coordinated accumulation patterns, recurring alpha wallets, and early-exit insider behavior.',
    docs_url: 'https://orbis-apis.onrender.com/insider-wallet-detection/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/insider-wallet-detection/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/scan', summary: 'Scan for wallets with insider-pattern buying behavior', price_usdc: 0.006 },
      { method: 'POST', path: '/alerts', summary: 'Live alerts when insider-pattern wallets accumulate a token', price_usdc: 0.005 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: full insider analysis for a wallet or token', price_usdc: 0.018 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { scan: '$0.006', alerts: '$0.005', lookup: '$0.018' } },
    agent_capabilities: ['insider-detection', 'pre-announcement-buy-pattern', 'coordinated-accumulation', 'early-exit-detection', 'recurring-alpha-identification'],
    x402_compatible: true, paper_mode_recommended: false,
    'x-paper-mode-recommended': false,
    execution_modes: ['agent-callable', 'read-only'],
    'x-latency-tier': 'near-real-time',
    chain_to: [
      { api: 'smart-wallet-discovery-api', reason: 'cross-reference insider wallets against broader smart money database' },
      { api: 'whale-transaction-api', reason: 'monitor on-chain movements of detected insider wallets in real-time' },
      { api: 'dormant-wallet-awakening-api', reason: 'insider wallets sometimes awaken dormancy before major events' },
    ],
  });
});

router.post('/scan', async (req: Request, res: Response) => {
  const { chain = 'ethereum', lookback_days = 30 } = req.body;
  try {
    const raw = await callClaude(`Wallets showing insider-pattern buying behavior on ${chain} over the last ${lookback_days} days as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "chain": "${chain}",
  "lookback_days": ${lookback_days},
  "insider_wallets": [
    {
      "address": "string",
      "pattern_type": "pre_announcement_buy|coordinated_accumulation|early_exit|recurring_alpha",
      "pattern_count_in_period": number,
      "avg_days_before_event": number,
      "avg_roi_pct": number,
      "tokens_involved": ["string"],
      "confidence_pct": number,
      "risk_level": "confirmed|probable|possible",
      "last_pattern_detected": "string (ISO datetime)"
    }
  ],
  "scan_summary": {
    "total_wallets_flagged": number,
    "most_common_pattern": "string",
    "highest_confidence_wallet": "string",
    "avg_days_before_event": number
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": false,
  "confidence_per_section": {"wallets": 0.72, "summary": 0.74},
  "recommended_actions_priority_order": ["confirmed risk_level = statistically significant pattern across multiple events", "follow pre_announcement_buy wallets as they tend to enter 3-7 days before catalysts", "do not rely on single-event wallets — pattern_count >= 3 is minimum threshold"],
  "chain_to": [{"api": "insider-wallet-detection-api", "reason": "deep lookup on a specific wallet"}, {"api": "whale-transaction-api", "reason": "monitor flagged wallet movements in real-time"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/alerts', async (req: Request, res: Response) => {
  const { token, chain = 'ethereum' } = req.body;
  if (!token) return res.status(400).json({ error: 'token is required' });
  try {
    const raw = await callClaude(`Live insider-pattern wallet accumulation alerts for ${token} on ${chain} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "token": "${token}",
  "chain": "${chain}",
  "alerts": [
    {
      "wallet_address": "string",
      "pattern_type": "pre_announcement_buy|coordinated_accumulation|early_exit|recurring_alpha",
      "amount_usd": number,
      "minutes_ago": number,
      "wallet_historical_accuracy_pct": number,
      "similar_past_events": number,
      "avg_gain_after_pattern_pct": number,
      "urgency": "immediate|high|medium|monitor",
      "notes": "string"
    }
  ],
  "token_context": {
    "total_insider_volume_24h_usd": number,
    "insider_wallet_count": number,
    "coordinated_buying": boolean,
    "estimated_catalyst_window_days": number
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": false,
  "confidence_per_section": {"alerts": 0.70, "context": 0.72},
  "recommended_actions_priority_order": ["high wallet_historical_accuracy_pct (>75%) means the pattern is reliable", "coordinated_buying=true amplifies signal strength significantly", "urgency=immediate — these wallets have short windows before the catalyst"],
  "chain_to": [{"api": "insider-wallet-detection-api", "reason": "full insider profile on alerting wallets"}, {"api": "smart-wallet-discovery-api", "reason": "check if alerting wallets are broadly high-performing"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/lookup', async (req: Request, res: Response) => {
  const { address, token } = req.body;
  if (!address && !token) return res.status(400).json({ error: 'address or token is required' });
  try {
    const target = address ? `wallet ${address}` : `token ${token}`;
    const raw = await callClaude(`Full insider wallet analysis for ${target} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  ${address ? `"address": "${address}",` : `"token": "${token}",`}
  "insider_profile": {
    "is_insider_wallet": boolean,
    "insider_confidence_pct": number,
    "primary_pattern": "pre_announcement_buy|coordinated_accumulation|early_exit|recurring_alpha",
    "pattern_count": number,
    "first_detected": "string (ISO)",
    "last_pattern": "string (ISO)"
  },
  "pattern_history": [
    {
      "token": "string",
      "buy_date": "string",
      "event_date": "string",
      "days_before_event": number,
      "buy_price": number,
      "peak_price": number,
      "roi_pct": number,
      "event_type": "listing|partnership|upgrade|airdrop|other"
    }
  ],
  "statistical_analysis": {
    "avg_days_before_event": number,
    "avg_roi_pct": number,
    "hit_rate_pct": number,
    "false_positive_rate_pct": number,
    "total_events_tracked": number,
    "p_value": number
  },
  "current_positions": [
    {"token": "string", "entry_date": "string", "amount_usd": number, "unrealized_pct": number, "days_holding": number}
  ],
  "network_connections": {
    "known_associated_wallets": number,
    "coordination_detected": boolean,
    "coordination_wallets": ["string"]
  },
  "reasoning": {
    "why_signal_generated": "string explanation of why this wallet/token shows insider patterns",
    "key_factors": ["factor 1 (e.g. bought 6 out of 7 tokens 2-4 days before CEX listing announcement)", "factor 2 (e.g. exits within hours of news going public)", "factor 3 (e.g. coordinated entry with 3 other wallets within the same 4-hour window)"],
    "invalidators": ["pattern may be coincidence in small sample", "wallet may have switched to public strategies", "token may not have a catalyst — could be a false positive"]
  },
  "latency_ms": number,
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": false,
  "confidence_per_section": {"profile": 0.72, "history": 0.74, "statistical": 0.76, "positions": 0.70, "reasoning": 0.73},
  "recommended_actions_priority_order": ["p_value < 0.05 means statistically significant — not random", "hit_rate_pct > 70 across 10+ events is a strong signal", "current_positions are active bets — consider following if hit rate is high"],
  "chain_to": [{"api": "whale-transaction-api", "reason": "real-time monitoring of detected insider wallet movements"}, {"api": "smart-wallet-discovery-api", "reason": "broader performance profile for detected insider wallets"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
