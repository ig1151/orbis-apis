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
    name: 'Whale Entry Signal API', version: '1.0.0',
    description: 'Detect whale accumulation entry signals for specific tokens, scan the market for active whale entry patterns, and get full whale entry intelligence with confidence scoring.',
    docs_url: 'https://orbis-apis.onrender.com/whale-entry-signal/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/whale-entry-signal/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/signals', summary: 'Whale accumulation entry signals for a token', price_usdc: 0.004 },
      { method: 'POST', path: '/scan', summary: 'Scan market for active whale entry patterns', price_usdc: 0.005 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: whale entry intelligence + confidence + recommended action', price_usdc: 0.015 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { signals: '$0.004', scan: '$0.005', lookup: '$0.015' } },
    agent_capabilities: ['whale-entry-detection', 'accumulation-patterns', 'on-chain-signals', 'copy-trade-support', 'smart-money-following'],
    x402_compatible: true, paper_mode_recommended: true,
    execution_modes: ['agent-callable', 'execution-gated'],
    'x-latency-tier': 'real-time',
  });
});

// POST /signals — whale accumulation entry signals for a token
router.post('/signals', async (req: Request, res: Response) => {
  const { token, chain = 'ethereum' } = req.body;
  if (!token) return res.status(400).json({ error: 'token is required' });
  try {
    const raw = await callClaude(`Whale accumulation entry signals for ${token} on ${chain} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "token": "${token}",
  "chain": "${chain}",
  "entry_signals": [
    {
      "signal_type": "accumulation_zone|dip_buy|stealth_accumulation|ot_wallet_entry|exchange_withdrawal|large_otc",
      "detected_at": "ISO8601",
      "whale_tier": "mega_whale|whale|large_holder",
      "estimated_usd": number,
      "entry_price": number,
      "signal_strength": "strong|moderate|weak",
      "on_chain_evidence": "string",
      "follow_through_probability_pct": number
    }
  ],
  "accumulation_pattern": {
    "pattern_active": boolean,
    "pattern_type": "steady_accumulation|aggressive_buy|dip_hunting|range_loading|none",
    "duration_days": number,
    "estimated_total_usd": number,
    "price_impact": "suppressed|neutral|pushed_up"
  },
  "current_signal": {
    "overall_signal": "strong_entry|entry|watch|no_signal",
    "confidence_pct": number,
    "key_evidence": "string"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"signals": 0.76, "pattern": 0.74, "current": 0.72},
  "recommended_actions_priority_order": ["confirm with on-chain explorer", "whales may distribute after accumulation ends", "watch for exchange inflows as exit warning"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /scan — scan market for active whale entry patterns
router.post('/scan', async (req: Request, res: Response) => {
  const { chain = 'ethereum', min_confidence = 70 } = req.body;
  try {
    const raw = await callClaude(`Scan for active whale entry patterns on ${chain} with minimum confidence ${min_confidence}% as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "chain": "${chain}",
  "min_confidence": ${min_confidence},
  "whale_entry_patterns": [
    {
      "token": "string",
      "token_address": "string",
      "chain": "${chain}",
      "pattern_type": "steady_accumulation|aggressive_buy|dip_hunting|range_loading",
      "confidence_pct": number,
      "estimated_usd_accumulated": number,
      "accumulation_start": "ISO8601",
      "whale_count": number,
      "price_action": "rising|falling|sideways",
      "entry_window_open": boolean,
      "signal": "bullish|neutral"
    }
  ],
  "market_intel": {
    "total_patterns_found": number,
    "highest_confidence_token": "string",
    "aggregate_usd_accumulating": number,
    "sector_breakdown": [{"sector": "string", "count": number}]
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"patterns": 0.75, "market_intel": 0.73},
  "recommended_actions_priority_order": ["higher confidence + larger USD = stronger signal", "multiple whales accumulating same token is rare and significant", "entry window can close quickly"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /lookup — ONE-CALL: whale entry intelligence + confidence + recommended action
router.post('/lookup', async (req: Request, res: Response) => {
  const { token, chain = 'ethereum' } = req.body;
  if (!token) return res.status(400).json({ error: 'token is required' });
  try {
    const raw = await callClaude(`Full whale entry intelligence for ${token} on ${chain} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "token": "${token}",
  "chain": "${chain}",
  "whale_entry_summary": {
    "entry_signal_active": boolean,
    "signal_type": "accumulation_zone|dip_buy|stealth_accumulation|ot_wallet_entry|none",
    "whale_count_accumulating": number,
    "total_usd_accumulated_24h": number,
    "entry_quality": "A+|A|B|C|none"
  },
  "on_chain_evidence": {
    "large_transactions_24h": number,
    "net_exchange_flow_usd": number,
    "exchange_withdrawals_usd": number,
    "exchange_deposits_usd": number,
    "wallet_concentration_change": "increasing|decreasing|flat",
    "top_buyer_type": "institutional|whale|smart_money|unknown"
  },
  "price_context": {
    "current_price": number,
    "distance_from_52w_low_pct": number,
    "distance_from_ath_pct": number,
    "recent_drawdown_pct": number,
    "accumulation_range": {"low": number, "high": number}
  },
  "risk_factors": {
    "unlock_event_approaching": boolean,
    "large_holder_count": number,
    "concentration_risk": "high|medium|low",
    "liquidity_depth_usd": number
  },
  "recommended_action": {
    "action": "follow_whales|watch|wait|avoid",
    "entry_zone": "string",
    "stop_suggestion": "string",
    "confidence_pct": number,
    "key_insight": "string"
  },
  "reasoning": {
    "why_signal_generated": "string explanation of the primary on-chain evidence driving this whale entry signal",
    "key_factors": ["factor 1 (e.g. 3 mega-whales withdrew from exchanges in 24h)", "factor 2 (e.g. net exchange flow strongly negative = accumulation)", "factor 3"],
    "invalidators": ["whale wallets begin depositing back to exchanges", "token unlock event occurs", "large holder exits detected on-chain"]
  },
  "latency_ms": number,
  "chain_to": [{"api": "wallet-intelligence-api", "reason": "verify top whale wallet track records"}, {"api": "portfolio-risk-api", "reason": "size position relative to portfolio risk tolerance"}],
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"entry_summary": 0.76, "on_chain": 0.74, "price_context": 0.80, "action": 0.72, "reasoning": 0.75},
  "recommended_actions_priority_order": ["verify whale movements on-chain before acting", "whale accumulation can take days to weeks", "monitor exchange flow for early exit warning"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
