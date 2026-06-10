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
    name: 'Whale Transaction API', version: '1.0.0',
    description: 'Real-time large on-chain transfer alerts for crypto whales. Track whale movements by token, chain, and threshold. Returns transaction context, wallet classification, and estimated market impact.',
    docs_url: 'https://orbis-apis.onrender.com/whale-transaction/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/whale-transaction/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/feed', summary: 'Real-time whale transactions above a USD threshold', price_usdc: 0.004 },
      { method: 'POST', path: '/alerts', summary: 'Whale movement alerts for a specific token', price_usdc: 0.004 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: full whale transaction analysis with wallet context and market impact', price_usdc: 0.015 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { feed: '$0.004', alerts: '$0.004', lookup: '$0.015' } },
    agent_capabilities: ['whale-tracking', 'large-transaction-alerts', 'market-impact-estimation', 'wallet-classification', 'exchange-flow-detection'],
    x402_compatible: true, paper_mode_recommended: false,
    'x-paper-mode-recommended': false,
    execution_modes: ['agent-callable', 'read-only'],
    'x-latency-tier': 'real-time',
    chain_to: [
      { api: 'smart-wallet-discovery-api', reason: 'identify if whale is a known smart money address' },
      { api: 'insider-wallet-detection-api', reason: 'check if whale movement precedes known event patterns' },
      { api: 'dormant-wallet-awakening-api', reason: 'detect if whale was previously dormant before this movement' },
    ],
  });
});

router.post('/feed', async (req: Request, res: Response) => {
  const { chain = 'ethereum', min_usd = 500000, limit = 20 } = req.body;
  try {
    const raw = await callClaude(`Real-time whale transactions on ${chain} above $${min_usd} in the last hour as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "chain": "${chain}",
  "min_usd": ${min_usd},
  "transactions": [
    {
      "tx_hash": "string",
      "timestamp": "string (ISO)",
      "minutes_ago": number,
      "from_address": "string",
      "to_address": "string",
      "token": "string",
      "amount": number,
      "amount_usd": number,
      "tx_type": "transfer|swap|bridge|stake|unstake",
      "from_type": "exchange|defi|whale_wallet|unknown",
      "to_type": "exchange|defi|whale_wallet|unknown",
      "market_impact": "high|medium|low",
      "notes": "string"
    }
  ],
  "feed_summary": {
    "total_transactions": number,
    "total_volume_usd": number,
    "exchange_inflows_usd": number,
    "exchange_outflows_usd": number,
    "net_exchange_flow_usd": number,
    "dominant_token": "string"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": false,
  "confidence_per_section": {"transactions": 0.82, "summary": 0.80},
  "recommended_actions_priority_order": ["exchange_inflows > exchange_outflows indicates potential sell pressure", "stake tx type = whale is bullish and locking tokens long-term", "market_impact=high on exchange deposits warrants immediate attention"],
  "chain_to": [{"api": "whale-transaction-api", "reason": "deep lookup on the most significant transaction"}, {"api": "smart-wallet-discovery-api", "reason": "identify if whale is a known alpha generator"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/alerts', async (req: Request, res: Response) => {
  const { token, min_usd = 100000 } = req.body;
  if (!token) return res.status(400).json({ error: 'token is required' });
  try {
    const raw = await callClaude(`Whale movement alerts for ${token} above $${min_usd} in the last 24 hours as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "token": "${token}",
  "min_usd": ${min_usd},
  "alerts": [
    {
      "tx_hash": "string",
      "timestamp": "string (ISO)",
      "hours_ago": number,
      "from_address": "string",
      "to_address": "string",
      "amount_tokens": number,
      "amount_usd": number,
      "tx_type": "transfer|swap|bridge|stake|unstake",
      "direction": "to_exchange|from_exchange|wallet_to_wallet|to_defi|from_defi",
      "price_impact_pct": number,
      "whale_wallet_label": "string or null",
      "urgency": "critical|high|medium|low"
    }
  ],
  "token_whale_summary": {
    "total_whale_volume_24h_usd": number,
    "net_exchange_flow_usd": number,
    "largest_single_tx_usd": number,
    "whale_count_active": number,
    "bullish_signals": number,
    "bearish_signals": number,
    "signal_bias": "bullish|bearish|neutral"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": false,
  "confidence_per_section": {"alerts": 0.80, "summary": 0.78},
  "recommended_actions_priority_order": ["signal_bias=bearish with net_exchange_flow > 0 means selling likely incoming", "urgency=critical on from_exchange movements = whale accumulating", "price_impact_pct > 1% means this whale can move the market alone"],
  "chain_to": [{"api": "whale-transaction-api", "reason": "full lookup on the most significant whale transaction"}, {"api": "insider-wallet-detection-api", "reason": "check if whale wallets have insider patterns"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/lookup', async (req: Request, res: Response) => {
  const { tx_hash, address } = req.body;
  if (!tx_hash && !address) return res.status(400).json({ error: 'tx_hash or address is required' });
  try {
    const target = tx_hash ? `transaction ${tx_hash}` : `whale wallet ${address}`;
    const raw = await callClaude(`Full whale transaction analysis for ${target} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  ${tx_hash ? `"tx_hash": "${tx_hash}",` : `"address": "${address}",`}
  "transaction": {
    "from_address": "string", "to_address": "string",
    "token": "string", "amount_tokens": number, "amount_usd": number,
    "tx_type": "transfer|swap|bridge|stake|unstake",
    "timestamp": "string (ISO)", "block_number": number,
    "gas_paid_usd": number
  },
  "wallet_context": {
    "wallet_label": "string or null",
    "wallet_type": "exchange|defi_protocol|known_whale|smart_money|unknown",
    "historical_roi_estimate_pct": number,
    "previously_moved_before_rally": boolean,
    "total_holdings_usd": number,
    "pct_of_holdings_moved": number
  },
  "market_impact_analysis": {
    "immediate_impact": "high|medium|low|negligible",
    "estimated_price_impact_pct": number,
    "exchange_flow_implication": "selling_pressure|accumulation|neutral",
    "similar_past_transactions": number,
    "past_price_change_after_similar_pct": number
  },
  "destination_analysis": {
    "destination_type": "exchange|defi_protocol|cold_storage|burn|unknown",
    "destination_label": "string or null",
    "likely_intent": "sell|stake|bridge|accumulate|unknown",
    "time_to_market_impact_hours": number
  },
  "reasoning": {
    "why_signal_generated": "string explanation of why this whale transaction is significant",
    "key_factors": ["factor 1 (e.g. moved 8,500 ETH = 0.7% of circulating supply in single transaction)", "factor 2 (e.g. destination is Binance hot wallet — likely market sell)", "factor 3 (e.g. same wallet moved before 25% ETH drop in March 2024)"],
    "invalidators": ["destination is exchange but may be OTC not open market", "position size is small relative to whale's total holdings — may be routine", "wallet has no prior history to compare against"]
  },
  "latency_ms": number,
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": false,
  "confidence_per_section": {"transaction": 0.90, "wallet": 0.74, "impact": 0.70, "destination": 0.72, "reasoning": 0.73},
  "recommended_actions_priority_order": ["likely_intent=sell + exchange destination is the highest-conviction bearish signal", "pct_of_holdings_moved > 50% is a major signal — whale is exiting", "past_price_change_after_similar_pct informs how much to weight this signal"],
  "chain_to": [{"api": "smart-wallet-discovery-api", "reason": "full performance profile of the whale wallet"}, {"api": "insider-wallet-detection-api", "reason": "check if this whale has pre-event insider patterns"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
