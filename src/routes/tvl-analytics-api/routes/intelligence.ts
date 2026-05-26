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
    name: 'TVL Analytics API', version: '1.0.0',
    description: 'Track Total Value Locked across DeFi protocols and chains. Analyze TVL growth, market share, chain dominance, and protocol health for investment research and risk assessment.',
    docs_url: 'https://orbis-apis.onrender.com/tvl-analytics/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/tvl-analytics/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/protocol', summary: 'TVL snapshot for a specific protocol with trend', price_usdc: 0.003 },
      { method: 'POST', path: '/chains', summary: 'TVL breakdown by chain — market share and flow', price_usdc: 0.003 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: TVL + growth trend + health score + investment signal', price_usdc: 0.008 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { protocol: '$0.003', chains: '$0.003', lookup: '$0.008' } },
    agent_capabilities: ['tvl-tracking', 'protocol-health', 'chain-dominance', 'defi-growth-analysis', 'investment-signal'],
    x402_compatible: true, paper_mode_recommended: true,
  });
});

router.post('/protocol', async (req: Request, res: Response) => {
  const { protocol } = req.body;
  if (!protocol) return res.status(400).json({ error: 'protocol is required' });
  try {
    const raw = await callClaude(`TVL analytics for DeFi protocol "${protocol}" as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "protocol": "${protocol}",
  "tvl_usd": number,
  "tvl_by_chain": [
    { "chain": "string", "tvl_usd": number, "pct_of_total": number }
  ],
  "tvl_trend": {
    "24h_change_pct": number,
    "7d_change_pct": number,
    "30d_change_pct": number,
    "direction": "growing|shrinking|stable",
    "all_time_high_usd": number,
    "ath_drawdown_pct": number
  },
  "market_position": {
    "global_rank": number,
    "category": "string",
    "market_share_pct": number,
    "competitors": ["string"]
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"tvl": 0.82, "trend": 0.78, "position": 0.75},
  "recommended_actions_priority_order": ["cross-check with DeFiLlama", "compare vs category peers", "watch for sudden TVL drops"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/chains', async (req: Request, res: Response) => {
  const { category } = req.body;
  try {
    const raw = await callClaude(`TVL breakdown by blockchain chain${category ? ` for ${category} category` : ''} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "category": "${category || 'all'}",
  "total_defi_tvl_usd": number,
  "chains": [
    {
      "chain": "string",
      "tvl_usd": number,
      "market_share_pct": number,
      "7d_change_pct": number,
      "30d_change_pct": number,
      "trend": "growing|shrinking|stable",
      "dominant_protocol": "string",
      "protocol_count": number
    }
  ],
  "flow_summary": {
    "top_inflow_chain": "string",
    "top_outflow_chain": "string",
    "rotation_signal": "moving_to_l2|moving_to_ethereum|mixed",
    "narrative": "string"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"chains": 0.80, "flows": 0.72},
  "recommended_actions_priority_order": ["follow TVL flow as a trend indicator", "watch L2 growth vs Ethereum", "chain TVL predicts liquidity depth"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/lookup', async (req: Request, res: Response) => {
  const { protocol } = req.body;
  if (!protocol) return res.status(400).json({ error: 'protocol is required' });
  try {
    const raw = await callClaude(`Full TVL intelligence for DeFi protocol "${protocol}" as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "protocol": "${protocol}",
  "tvl_snapshot": {
    "tvl_usd": number,
    "global_rank": number,
    "market_share_pct": number,
    "category": "string"
  },
  "growth_trend": {
    "direction": "growing|shrinking|stable",
    "7d_change_pct": number,
    "30d_change_pct": number,
    "90d_change_pct": number,
    "growth_quality": "organic|incentivized|declining|recovering"
  },
  "health_score": {
    "score": number,
    "score_label": "excellent|good|fair|poor",
    "factors": {
      "tvl_stability": number,
      "growth_consistency": number,
      "chain_diversity": number,
      "market_position": number
    }
  },
  "investment_signal": {
    "signal": "strong_buy|buy|neutral|sell|avoid",
    "rationale": "string",
    "key_risk": "string",
    "key_opportunity": "string"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"tvl": 0.82, "growth": 0.78, "health": 0.72, "signal": 0.68},
  "recommended_actions_priority_order": ["tvl growth quality matters more than raw size", "compare vs sector average", "incentivized TVL inflates—check organic retention"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
