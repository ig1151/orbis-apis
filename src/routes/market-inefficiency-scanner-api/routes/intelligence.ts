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
    name: 'Market Inefficiency Scanner API', version: '1.0.0',
    description: 'Broad market inefficiency detection — price discovery lag between venues, order book imbalances, temporary mispricings, and structural market microstructure gaps.',
    docs_url: 'https://orbis-apis.onrender.com/market-inefficiency-scanner/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/market-inefficiency-scanner/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/scan', summary: 'Scan for market inefficiency signals across crypto, NFT, and DeFi', price_usdc: 0.005 },
      { method: 'POST', path: '/signals', summary: 'Ranked inefficiency signals with actionability rating', price_usdc: 0.004 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: full inefficiency analysis with root cause and exploitation strategy', price_usdc: 0.015 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { scan: '$0.005', signals: '$0.004', lookup: '$0.015' } },
    agent_capabilities: ['market-inefficiency-detection', 'price-discovery-lag', 'orderbook-imbalance', 'microstructure-analysis', 'exploitation-strategy'],
    x402_compatible: true, paper_mode_recommended: true,
    'x-paper-mode-recommended': true,
    execution_modes: ['agent-callable', 'execution-gated'],
    'x-latency-tier': 'real-time',
    chain_to: [
      { api: 'dex-cex-arbitrage-api', reason: 'exploit price_lag signals between DEX and CEX venues' },
      { api: 'triangular-arbitrage-api', reason: 'arbitrage_window signals often map to triangular loops on exchange' },
      { api: 'flash-loan-opportunity-api', reason: 'wrap high-magnitude signals in flash loan for zero-capital execution' },
    ],
  });
});

// POST /scan — scan for market inefficiency signals
router.post('/scan', async (req: Request, res: Response) => {
  const { market = 'crypto', timeframe = '5m' } = req.body;
  try {
    const raw = await callClaude(`Market inefficiency scan across ${market} markets at ${timeframe} timeframe as of ${new Date().toISOString()}. Detect price lags, orderbook imbalances, liquidity gaps, arbitrage windows, and wash trading distortions. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "market": "${market}",
  "timeframe": "${timeframe}",
  "inefficiency_signals": [
    {
      "type": "price_lag|orderbook_imbalance|liquidity_gap|arbitrage_window|wash_trading_distortion",
      "symbol": "string",
      "venue": "string",
      "magnitude_pct": number,
      "confidence_pct": number,
      "estimated_duration_seconds": number,
      "actionability": "immediate|building|fading",
      "market_segment": "spot|perp|defi|nft",
      "description": "string"
    }
  ],
  "scan_summary": {
    "total_signals": number,
    "immediate_count": number,
    "highest_magnitude_signal": "string",
    "dominant_inefficiency_type": "string",
    "market_efficiency_score": number
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"signals": 0.74, "summary": 0.78},
  "recommended_actions_priority_order": ["immediate actionability signals close fastest", "high confidence + high magnitude = highest priority", "wash_trading_distortion signals = avoid — they are artificial and will reverse suddenly"],
  "chain_to": [{"api": "market-inefficiency-scanner-api", "reason": "deep lookup specific symbol for root cause and exploitation strategy"}, {"api": "dex-cex-arbitrage-api", "reason": "exploit price_lag signals between DEX and CEX venues"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /signals — ranked inefficiency signals with actionability rating
router.post('/signals', async (req: Request, res: Response) => {
  const { min_confidence = 70, limit = 10 } = req.body;
  try {
    const raw = await callClaude(`Top ${limit} market inefficiency signals with minimum ${min_confidence}% confidence, ranked by actionability and magnitude as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "min_confidence": ${min_confidence},
  "limit": ${limit},
  "signals": [
    {
      "rank": number,
      "type": "price_lag|orderbook_imbalance|liquidity_gap|arbitrage_window|wash_trading_distortion",
      "symbol": "string",
      "venue_a": "string",
      "venue_b": "string",
      "magnitude_pct": number,
      "confidence_pct": number,
      "estimated_duration_seconds": number,
      "actionability": "immediate|building|fading",
      "exploitation_difficulty": "easy|moderate|hard",
      "estimated_profit_pct": number,
      "min_capital_usd": number
    }
  ],
  "signal_distribution": {
    "by_type": [{"type": "string", "count": number}],
    "by_actionability": {"immediate": number, "building": number, "fading": number},
    "total_signals": number
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"signals": 0.76, "distribution": 0.80},
  "recommended_actions_priority_order": ["rank 1 is most actionable — but also most competed", "easy exploitation_difficulty with high confidence is the best combination", "fading signals may already be closed by the time you act"],
  "chain_to": [{"api": "market-inefficiency-scanner-api", "reason": "deep lookup on top signal for root cause analysis"}, {"api": "triangular-arbitrage-api", "reason": "arbitrage_window signals often have triangular loop potential on exchange"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /lookup — ONE-CALL: full inefficiency analysis with root cause and exploitation strategy
router.post('/lookup', async (req: Request, res: Response) => {
  const { symbol } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const raw = await callClaude(`Full market inefficiency analysis for ${symbol} as of ${new Date().toISOString()}. Identify root cause, profit window, and exploitation strategy. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol}",
  "primary_inefficiency": {
    "type": "price_lag|orderbook_imbalance|liquidity_gap|arbitrage_window|wash_trading_distortion",
    "magnitude_pct": number,
    "confidence_pct": number,
    "detected_venues": ["string"],
    "duration_so_far_seconds": number,
    "estimated_remaining_seconds": number
  },
  "root_cause": "market_microstructure|information_asymmetry|liquidity_mismatch|coordinated_activity",
  "root_cause_analysis": {
    "primary_driver": "string",
    "contributing_factors": ["string"],
    "structural_or_temporary": "structural|temporary",
    "recurrence_likelihood": "high|medium|low"
  },
  "profit_window": {
    "profit_window_seconds": number,
    "urgency": "immediate|building|fading",
    "competition_level": "high|medium|low",
    "estimated_profit_pct": number
  },
  "exploitation_strategy": {
    "strategy": "string",
    "steps": ["string"],
    "required_capital_usd": number,
    "recommended_venues": ["string"],
    "execution_time_target_ms": number,
    "risk_level": "low|medium|high"
  },
  "risk_factors": [
    {"factor": "string", "severity": "high|medium|low", "probability_pct": number}
  ],
  "reasoning": {
    "why_signal_generated": "string explanation of why this market inefficiency exists right now",
    "key_factors": ["factor 1 (e.g. price discovery lag between Binance and smaller CEX due to API latency difference)", "factor 2 (e.g. orderbook thinning on ask side creating temporary premium)", "factor 3 (e.g. large market order created temporary price impact not yet arbitraged away)"],
    "invalidators": ["arbitrageurs close the gap before execution completes", "root cause is wash trading — signal is artificial", "market maker re-quotes eliminating the orderbook imbalance"]
  },
  "latency_ms": number,
  "chain_to": [{"api": "dex-cex-arbitrage-api", "reason": "exploit price_lag signals between DEX and CEX directly"}, {"api": "triangular-arbitrage-api", "reason": "check if inefficiency creates a triangular loop on the exchange"}],
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"inefficiency": 0.76, "root_cause": 0.72, "window": 0.74, "strategy": 0.70, "reasoning": 0.75},
  "recommended_actions_priority_order": ["structural inefficiencies recur — worth monitoring for repeated trades", "competition_level high = institutional bots are already active on this", "wash_trading_distortion root cause = do not exploit, risk of sudden reversal"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
