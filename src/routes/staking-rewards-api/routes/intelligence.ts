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
  res.json({ name: 'Staking Rewards API', openapi: '/staking-rewards/openapi.json', health: 'ok' });
});

// POST /rates
router.post('/rates', async (req: Request, res: Response) => {
  const { symbol } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const raw = await callClaude(`Staking rates for "${symbol.toUpperCase()}" as of ${new Date().toISOString()}. Return compact JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"symbol":"${symbol.toUpperCase()}","staking":{"native_apy":number,"real_apy_after_inflation":number,"reward_token":"string","lock_up_days":number,"unbonding_days":number,"compounding":boolean,"slash_risk":"low|medium|high|none"},"providers":[{"name":"string","type":"liquid_staking|exchange|self_custody","apy":number,"fee_pct":number,"liquid":boolean,"risk_level":"low|medium|high"},{"name":"string","type":"liquid_staking|exchange|self_custody","apy":number,"fee_pct":number,"liquid":boolean,"risk_level":"low|medium|high"},{"name":"string","type":"exchange|self_custody","apy":number,"fee_pct":number,"liquid":boolean,"risk_level":"low|medium|high"}],"best_option":"string","financial_disclaimer":"For informational purposes only. Not financial advice.","confidence_per_section":{"staking":0.85,"providers":0.80},"recommended_actions_priority_order":["compare real APY after inflation","prefer liquid staking for flexibility","check slash risk"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /estimate
router.post('/estimate', async (req: Request, res: Response) => {
  const { symbol, amount, duration_days, provider } = req.body;
  if (!symbol || amount == null) return res.status(400).json({ error: 'symbol and amount are required' });
  try {
    const raw = await callClaude(`Estimate staking rewards for ${amount} ${symbol} staked for ${duration_days || 365} days via ${provider || 'best available provider'} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol.toUpperCase()}",
  "amount_staked": ${amount},
  "duration_days": ${duration_days || 365},
  "provider": "${provider || 'best_available'}",
  "estimate": {
    "apy": number,
    "rewards_tokens": number,
    "rewards_usd": number,
    "principal_usd": number,
    "total_value_usd": number,
    "daily_rewards_tokens": number,
    "daily_rewards_usd": number
  },
  "scenarios": [
    {"price_change": "-50%", "total_value_usd": number, "net_return_pct": number},
    {"price_change": "0%", "total_value_usd": number, "net_return_pct": number},
    {"price_change": "+50%", "total_value_usd": number, "net_return_pct": number},
    {"price_change": "+100%", "total_value_usd": number, "net_return_pct": number}
  ],
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "confidence_per_section": {"estimate": 0.85, "scenarios": 0.80},
  "recommended_actions_priority_order": ["account for token price risk in scenarios", "factor unbonding period into liquidity planning", "compound rewards for maximum APY"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /compare
router.post('/compare', async (req: Request, res: Response) => {
  const { symbols } = req.body;
  if (!symbols || !Array.isArray(symbols) || symbols.length < 2) return res.status(400).json({ error: 'symbols array with at least 2 items is required' });
  if (symbols.length > 15) return res.status(400).json({ error: 'maximum 15 symbols' });
  try {
    const raw = await callClaude(`Compare staking rewards across: ${symbols.join(', ')} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "results": [
    {
      "symbol": "string",
      "best_apy": number,
      "real_apy_after_inflation": number,
      "best_provider": "string",
      "lock_up_days": number or null,
      "liquid_option_available": boolean,
      "slash_risk": "low|medium|high|none",
      "rank": number
    }
  ],
  "best_yield": "string (symbol)",
  "best_risk_adjusted": "string (symbol)",
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "confidence_per_section": {"results": 0.83},
  "recommended_actions_priority_order": ["prioritize real APY over nominal APY", "liquid options beat locked for volatile markets", "rank by risk-adjusted yield not raw APY"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /lookup (ONE-CALL)
router.post('/lookup', async (req: Request, res: Response) => {
  const { symbol, amount } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const raw = await callClaude(`Full staking intelligence for ${symbol}${amount ? ' with ' + amount + ' tokens' : ''} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol.toUpperCase()}",
  "staking": {"native_apy": number, "real_apy_after_inflation": number, "lock_up_days": number or null, "slash_risk": "string"},
  "providers": [{"name": "string", "apy": number, "type": "string", "liquid": boolean, "risk_level": "string"}],
  "estimate_1yr": ${amount ? `{"amount": ${amount}, "rewards_tokens": "number", "rewards_usd": "number"}` : 'null'},
  "best_option": "string",
  "network_health": {"validators": number, "staking_ratio_pct": number, "decentralization": "high|medium|low"},
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "confidence_per_section": {"staking": 0.85, "providers": 0.80, "network_health": 0.82},
  "recommended_actions_priority_order": ["choose liquid staking unless long-term holder", "verify validator reputation before delegating", "factor tax implications of staking rewards"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
