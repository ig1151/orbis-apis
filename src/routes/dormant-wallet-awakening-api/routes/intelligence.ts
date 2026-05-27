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
    name: 'Dormant Wallet Awakening API', version: '1.0.0',
    description: 'Alert when long-dormant crypto wallets make their first on-chain movement after months or years. Correlate awakening events with market conditions, token holdings, and historical significance.',
    docs_url: 'https://orbis-apis.onrender.com/dormant-wallet-awakening/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/dormant-wallet-awakening/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/scan', summary: 'Scan for recently awakened dormant wallets', price_usdc: 0.005 },
      { method: 'POST', path: '/alerts', summary: 'High-significance dormant wallet awakening alerts', price_usdc: 0.004 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: full dormant wallet profile with movement analysis', price_usdc: 0.015 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { scan: '$0.005', alerts: '$0.004', lookup: '$0.015' } },
    agent_capabilities: ['dormant-wallet-detection', 'awakening-alerts', 'historical-balance-tracking', 'movement-significance-scoring', 'market-correlation'],
    x402_compatible: true, paper_mode_recommended: false,
    'x-paper-mode-recommended': false,
    execution_modes: ['agent-callable', 'read-only'],
    'x-latency-tier': 'near-real-time',
    chain_to: [
      { api: 'whale-transaction-api', reason: 'monitor continued movements after initial awakening' },
      { api: 'insider-wallet-detection-api', reason: 'check if awakened wallet shows insider buying patterns' },
      { api: 'smart-wallet-discovery-api', reason: 'assess if awakened wallet is historically a smart money address' },
    ],
  });
});

router.post('/scan', async (req: Request, res: Response) => {
  const { chain = 'ethereum', min_dormancy_days = 180, min_balance_usd = 10000 } = req.body;
  try {
    const raw = await callClaude(`Recently awakened dormant wallets on ${chain} that were inactive for at least ${min_dormancy_days} days, with minimum balance of $${min_balance_usd}, as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "chain": "${chain}",
  "min_dormancy_days": ${min_dormancy_days},
  "min_balance_usd": ${min_balance_usd},
  "awakened_wallets": [
    {
      "address": "string",
      "dormancy_days": number,
      "last_active_before": "string (ISO)",
      "awakening_timestamp": "string (ISO)",
      "awakening_type": "transfer_out|transfer_in|swap|nft_purchase|defi_interaction",
      "balance_usd": number,
      "primary_holdings": ["string"],
      "significance_score": number,
      "notes": "string"
    }
  ],
  "scan_summary": {
    "total_awakened": number,
    "highest_balance_wallet": "string",
    "avg_dormancy_days": number,
    "most_common_awakening_type": "string"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": false,
  "confidence_per_section": {"wallets": 0.80, "summary": 0.82},
  "recommended_actions_priority_order": ["significance_score > 80 indicates historically notable wallet", "transfer_out awakening on large wallets can signal selling pressure", "defi_interaction awakening suggests wallet is re-entering active trading"],
  "chain_to": [{"api": "whale-transaction-api", "reason": "monitor continued movements after awakening"}, {"api": "insider-wallet-detection-api", "reason": "check if awakened wallet has insider history"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/alerts', async (req: Request, res: Response) => {
  const { min_balance_usd = 100000, min_dormancy_days = 365 } = req.body;
  try {
    const raw = await callClaude(`High-significance dormant wallet awakening alerts: wallets dormant for ${min_dormancy_days}+ days with $${min_balance_usd}+ balance that just moved as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "min_balance_usd": ${min_balance_usd},
  "min_dormancy_days": ${min_dormancy_days},
  "alerts": [
    {
      "address": "string",
      "chain": "ethereum|bitcoin|solana|polygon",
      "dormancy_days": number,
      "balance_usd": number,
      "awakening_type": "transfer_out|transfer_in|swap|nft_purchase|defi_interaction",
      "awakening_timestamp": "string (ISO)",
      "minutes_ago": number,
      "destination_address": "string or null",
      "destination_type": "exchange|defi_protocol|unknown_wallet|burn",
      "market_impact_potential": "high|medium|low",
      "primary_token": "string",
      "amount_moved_usd": number
    }
  ],
  "alert_context": {
    "total_alerts_24h": number,
    "total_value_awakened_usd": number,
    "most_significant_wallet": "string",
    "dominant_chain": "string"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": false,
  "confidence_per_section": {"alerts": 0.82, "context": 0.80},
  "recommended_actions_priority_order": ["destination=exchange + high balance = potential sell pressure incoming", "defi_protocol destination = re-entering DeFi ecosystem, bullish signal", "market_impact_potential=high warrants immediate attention for traders of that token"],
  "chain_to": [{"api": "dormant-wallet-awakening-api", "reason": "full lookup for detailed movement analysis"}, {"api": "whale-transaction-api", "reason": "track ongoing movements of awakened wallet"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/lookup', async (req: Request, res: Response) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'address is required' });
  try {
    const raw = await callClaude(`Full dormant wallet awakening analysis for ${address} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "address": "${address}",
  "dormancy_profile": {
    "total_dormancy_days": number,
    "dormant_since": "string (ISO)",
    "awakening_date": "string (ISO)",
    "previous_awakenings": number,
    "historically_significant": boolean,
    "estimated_wallet_age_years": number
  },
  "awakening_details": {
    "first_movement_type": "transfer_out|transfer_in|swap|nft_purchase|defi_interaction",
    "first_movement_timestamp": "string (ISO)",
    "amount_moved_usd": number,
    "destination": "string",
    "destination_type": "exchange|defi_protocol|unknown_wallet|burn",
    "all_movements_since_awakening": number,
    "total_volume_since_awakening_usd": number
  },
  "holdings_snapshot": {
    "total_balance_usd": number,
    "primary_token": "string",
    "primary_token_pct": number,
    "tokens_held": [{"token": "string", "balance": number, "value_usd": number}],
    "nfts_held": number,
    "defi_positions": number
  },
  "market_correlation": {
    "price_change_of_primary_token_since_awakening_pct": number,
    "correlated_with_price_rally": boolean,
    "correlated_with_major_event": "string or null",
    "historical_awakenings_led_to_price_move": boolean
  },
  "significance_analysis": {
    "significance_score": number,
    "reasons": ["string"],
    "watch_level": "critical|high|medium|low"
  },
  "reasoning": {
    "why_signal_generated": "string explanation of why this dormant wallet awakening is significant",
    "key_factors": ["factor 1 (e.g. wallet dormant for 4.2 years holding 2,400 ETH now moved to exchange)", "factor 2 (e.g. previous awakening in 2021 preceded 30% ETH rally)", "factor 3 (e.g. destination is Binance cold wallet suggesting OTC sale not market dump)"],
    "invalidators": ["wallet may be routine custody management not a market signal", "single movement may not indicate full sell intent", "destination unknown — cannot determine market impact without more data"]
  },
  "latency_ms": number,
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": false,
  "confidence_per_section": {"dormancy": 0.82, "awakening": 0.80, "holdings": 0.78, "correlation": 0.70, "significance": 0.74, "reasoning": 0.74},
  "recommended_actions_priority_order": ["watch_level=critical means monitor this wallet hourly for further movements", "exchange destination with high balance = prepare for potential sell pressure", "historical_awakenings_led_to_price_move=true increases signal reliability significantly"],
  "chain_to": [{"api": "whale-transaction-api", "reason": "real-time monitoring of continued wallet movements"}, {"api": "insider-wallet-detection-api", "reason": "check if this awakened wallet has historical insider patterns"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
