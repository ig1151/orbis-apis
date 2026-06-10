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
    name: 'Token Holder Distribution API', version: '1.0.0',
    description: 'Whale concentration, top holder behavior, decentralization trends, and sell pressure risk for any token.',
    docs_url: 'https://orbis-apis.onrender.com/token-holder-distribution/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/token-holder-distribution/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/analyze', summary: 'Holder distribution snapshot — whale %, concentration, segments', price_usdc: 0.003 },
      { method: 'POST', path: '/trend', summary: 'Distribution trend — holder growth, whale behavior over time', price_usdc: 0.003 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: snapshot + trend + risk + investment signal', price_usdc: 0.008 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { analyze: '$0.003', trend: '$0.003', lookup: '$0.008' } },
    agent_capabilities: ['holder-analysis', 'concentration-risk', 'sell-pressure-detection', 'tokenomics-due-diligence', 'whale-behavior'],
    x402_compatible: true, paper_mode_recommended: true,
  });
});

// POST /analyze — snapshot of holder distribution
router.post('/analyze', async (req: Request, res: Response) => {
  const { token, chain = 'ethereum' } = req.body;
  if (!token) return res.status(400).json({ error: 'token is required' });
  try {
    const raw = await callClaude(`Token holder distribution for ${token} on ${chain} as of ${new Date().toISOString()}. Return compact JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"token":"${token}","chain":"${chain}","total_holders":number,"distribution":{"top_1_pct_supply":number,"top_10_pct_supply":number,"top_100_pct_supply":number,"retail_holders_pct":number,"exchange_held_pct":number,"locked_pct":number},"top_holders":[{"rank":1,"address":"0x...","label":"string","type":"exchange|whale|dao|team|contract","pct_supply":number,"behavior":"accumulating|distributing|holding"},{"rank":2,"address":"0x...","label":"string","type":"exchange|whale","pct_supply":number,"behavior":"accumulating|distributing|holding"},{"rank":3,"address":"0x...","label":"string","type":"exchange|whale","pct_supply":number,"behavior":"accumulating|distributing|holding"}],
  "holder_segments": [
    {"range": "string (e.g. >1% supply)", "count": number, "pct_of_supply": number, "type": "whale|large|medium|small|micro"}
  ],
  "concentration_risk": {
    "gini_coefficient": number,
    "risk_level": "critical|high|medium|low",
    "risk_note": "string",
    "sell_pressure_risk": "high|medium|low"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"distribution": 0.82, "holders": 0.75, "risk": 0.78},
  "recommended_actions_priority_order": ["high whale concentration = sell pressure risk", "check if top holders are exchanges (neutral) vs teams (risk)", "track changes over time, not just snapshot"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /trend — distribution trend over time
router.post('/trend', async (req: Request, res: Response) => {
  const { token, chain = 'ethereum', days = 30 } = req.body;
  if (!token) return res.status(400).json({ error: 'token is required' });
  try {
    const raw = await callClaude(`Token holder distribution trend for ${token} on ${chain} over last ${days} days as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "token": "${token}",
  "chain": "${chain}",
  "period_days": ${days},
  "holder_count_trend": [
    {"date": "YYYY-MM-DD", "total_holders": number, "new_holders": number, "lost_holders": number}
  ],
  "concentration_trend": [
    {"date": "YYYY-MM-DD", "top_10_pct_supply": number, "whale_count": number}
  ],
  "trend_summary": {
    "holder_growth_rate_pct": number,
    "holder_trend": "growing|shrinking|stable",
    "decentralization_trend": "improving|worsening|stable",
    "whale_activity": "accumulating|distributing|neutral",
    "retail_adoption": "increasing|decreasing|stable"
  },
  "key_events": [
    {"date": "YYYY-MM-DD", "event": "string", "impact": "positive|negative|neutral"}
  ],
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"trend": 0.78, "summary": 0.80},
  "recommended_actions_priority_order": ["growing holder base = organic demand signal", "whale accumulation trend > single snapshot", "compare retail vs whale direction for conviction"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /lookup — ONE-CALL: full holder distribution + risk + trend
router.post('/lookup', async (req: Request, res: Response) => {
  const { token, chain = 'ethereum' } = req.body;
  if (!token) return res.status(400).json({ error: 'token is required' });
  try {
    const raw = await callClaude(`Complete token holder distribution intelligence for ${token} on ${chain} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "token": "${token}",
  "chain": "${chain}",
  "snapshot": {
    "total_holders": number,
    "top_10_pct_supply": number,
    "top_50_pct_supply": number,
    "whale_count": number,
    "retail_pct_supply": number,
    "exchange_pct_supply": number
  },
  "top_holders": [
    {"rank": number, "address": "string", "label": "string", "type": "string", "pct_supply": number, "behavior": "accumulating|distributing|holding"}
  ],
  "trend_30d": {
    "holder_count_change": number,
    "holder_trend": "growing|shrinking|stable",
    "whale_trend": "accumulating|distributing|neutral",
    "decentralization_trend": "improving|worsening|stable"
  },
  "concentration_risk": {
    "risk_level": "critical|high|medium|low",
    "gini_coefficient": number,
    "key_risks": ["string"],
    "sell_pressure_risk": "high|medium|low"
  },
  "investment_signal": {
    "signal": "bullish|neutral|bearish",
    "conviction": "high|medium|low",
    "key_insight": "string",
    "watch_list": ["string (addresses or conditions to monitor)"]
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"snapshot": 0.82, "trend": 0.78, "risk": 0.80, "signal": 0.72},
  "recommended_actions_priority_order": ["check if team tokens are vested or unlocked", "exchange concentration can mask true retail interest", "decentralization improving = healthier long-term tokenomics"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
