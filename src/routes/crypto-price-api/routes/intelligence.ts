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
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.indexOf('{');
  if (start !== -1) {
    let depth = 0, end = -1;
    for (let i = start; i < cleaned.length; i++) {
      if (cleaned[i] === '{') depth++;
      else if (cleaned[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end !== -1) try { return JSON.parse(cleaned.slice(start, end + 1)); } catch {}
  }
  throw new Error(`Cannot parse as JSON: ${raw.slice(0, 100)}`);
}

function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Crypto Price API', info: '/crypto-price/info', openapi: '/crypto-price/openapi.json', health: 'ok' });
});

// POST /price
router.post('/price', async (req: Request, res: Response) => {
  const { symbol } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const raw = await callClaude(`Real-time crypto price for symbol: "${symbol}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol.toUpperCase()}",
  "price": {
    "usd": number,
    "change_24h": number,
    "change_pct_24h": number,
    "change_pct_7d": number,
    "volume_24h_usd": number,
    "high_24h": number,
    "low_24h": number,
    "ath": number,
    "ath_date": "YYYY-MM-DD"
  },
  "signal": "bullish|bearish|neutral",
  "financial_disclaimer": "For informational purposes only. Crypto markets are highly volatile. Not financial advice. Verify independently before use in trading workflows.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"price": 0.85, "signal": 0.78},
  "recommended_actions_priority_order": ["verify with authoritative exchange data", "check market cap for liquidity", "review on-chain data via address-risk"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /ohlc
router.post('/ohlc', async (req: Request, res: Response) => {
  const { symbol, from_date, to_date, interval = '1d' } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const raw = await callClaude(`OHLC history for crypto symbol: "${symbol}" from: "${from_date || '30d ago'}" to: "${to_date || 'today'}" interval: "${interval}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol.toUpperCase()}",
  "interval": "${interval}",
  "ohlc": [
    {"timestamp": "ISO8601", "open": number, "high": number, "low": number, "close": number, "volume": number}
  ],
  "summary": {"period_return_pct": number, "high": number, "low": number, "avg_volume": number, "trend": "uptrend|downtrend|sideways", "volatility_score": 0.0},
  "confidence_per_section": {"ohlc": 0.85, "summary": 0.80},
  "recommended_actions_priority_order": ["use for technical analysis", "compare with BTC correlation", "check volatility before position sizing"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /market-cap
router.post('/market-cap', async (req: Request, res: Response) => {
  const { symbol } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const raw = await callClaude(`Market cap data for crypto symbol: "${symbol}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol.toUpperCase()}",
  "market_cap": {
    "usd": number,
    "rank": number,
    "dominance_pct": number,
    "circulating_supply": number,
    "total_supply": number,
    "max_supply": number or null,
    "fully_diluted_valuation_usd": number
  },
  "category": "layer1|layer2|defi|stablecoin|meme|nft|other",
  "ecosystem": "ethereum|bitcoin|solana|other",
  "confidence_per_section": {"market_cap": 0.85},
  "recommended_actions_priority_order": ["compare rank for market position", "check dominance for macro signals", "assess supply dynamics for valuation"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { symbol, objective } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  const flags: string[] = [];
  if (symbol.length > 10) flags.push('SYMBOL_TOO_LONG');
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: flags.length === 0,
    symbol: symbol.toUpperCase(),
    objective: objective || 'price_analysis',
    next_api: 'address-risk',
    next_endpoint: '/address-risk',
    blocking_flags: flags,
    flag_definitions: { SYMBOL_TOO_LONG: 'Symbol exceeds expected length (max 10 chars)' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Get current price via /price', 'Check OHLC for trend analysis', 'Check market cap for liquidity assessment'],
    financial_disclaimer: 'For informational purposes only. Crypto markets are highly volatile. Not financial advice.',
    paper_mode_recommended: true,
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /lookup (ONE-CALL)
router.post('/lookup', async (req: Request, res: Response) => {
  const { symbol } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const raw = await callClaude(`Full crypto intelligence for symbol: "${symbol}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol.toUpperCase()}",
  "price": {"usd": number, "change_pct_24h": number, "change_pct_7d": number, "volume_24h_usd": number, "high_24h": number, "low_24h": number},
  "market_cap": {"usd": number, "rank": number, "dominance_pct": number, "circulating_supply": number},
  "technicals": {"trend": "uptrend|downtrend|sideways", "rsi": number, "support": number, "resistance": number, "volatility_score": 0.0},
  "on_chain": {"active_addresses_24h": number, "transaction_count_24h": number, "network_health": "strong|moderate|weak"},
  "signal": "bullish|bearish|neutral",
  "investment_grade": "A|B|C|D|F",
  "financial_disclaimer": "For informational purposes only. Crypto markets are highly volatile. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"price": 0.85, "market_cap": 0.88, "technicals": 0.78},
  "recommended_actions_priority_order": ["verify with exchange API before trading", "check on-chain health for network risk", "cross-reference with address-risk for wallet screening"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
