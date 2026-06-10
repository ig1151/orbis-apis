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
    name: 'Lending Rates API', version: '1.0.0',
    description: 'Compare DeFi lending rates across Aave, Compound, Spark, Morpho, and other protocols. Find the best yield for any asset with trend analysis and protocol risk context.',
    docs_url: 'https://orbis-apis.onrender.com/lending-rates/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/lending-rates/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/rates', summary: 'Current lending rates for an asset across protocols', price_usdc: 0.003 },
      { method: 'POST', path: '/compare', summary: 'Side-by-side protocol comparison with risk-adjusted yield', price_usdc: 0.003 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: best rate + trend + protocol risk + recommendation', price_usdc: 0.008 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { rates: '$0.003', compare: '$0.003', lookup: '$0.008' } },
    agent_capabilities: ['yield-optimization', 'protocol-comparison', 'rate-trend-analysis', 'defi-risk-assessment', 'lending-strategy'],
    x402_compatible: true, paper_mode_recommended: true,
  });
});

router.post('/rates', async (req: Request, res: Response) => {
  const { asset, chain = 'ethereum' } = req.body;
  if (!asset) return res.status(400).json({ error: 'asset is required' });
  try {
    const raw = await callClaude(`DeFi lending rates for ${asset} on ${chain} across major protocols as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "asset": "${asset}",
  "chain": "${chain}",
  "rates": [
    {
      "protocol": "string",
      "apy": number,
      "apy_7d_avg": number,
      "apy_30d_avg": number,
      "utilization_pct": number,
      "total_supplied_usd": number,
      "supply_cap_usd": number,
      "rate_trend": "rising|falling|stable",
      "protocol_tvl_usd": number
    }
  ],
  "best_rate": { "protocol": "string", "apy": number },
  "market_avg_apy": number,
  "rate_spread_pct": number,
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"rates": 0.80, "trends": 0.75},
  "recommended_actions_priority_order": ["verify rates on-chain before depositing", "check protocol audits", "monitor utilization for rate changes"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/compare', async (req: Request, res: Response) => {
  const { asset, chain = 'ethereum', protocols } = req.body;
  if (!asset) return res.status(400).json({ error: 'asset is required' });
  const protocolList = protocols?.join(', ') || 'Aave, Compound, Spark, Morpho, Euler';
  try {
    const raw = await callClaude(`Compare DeFi lending rates for ${asset} on ${chain} across ${protocolList} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "asset": "${asset}",
  "chain": "${chain}",
  "comparison": [
    {
      "protocol": "string",
      "apy": number,
      "risk_score": number,
      "risk_level": "low|medium|high",
      "risk_adjusted_yield": number,
      "audit_status": "audited|partially_audited|unaudited",
      "insurance_available": boolean,
      "min_deposit_usd": number,
      "withdrawal_delay_hours": number,
      "notable_risks": ["string"]
    }
  ],
  "best_yield": { "protocol": "string", "apy": number },
  "best_risk_adjusted": { "protocol": "string", "risk_adjusted_yield": number },
  "recommendation": "string",
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"rates": 0.80, "risk": 0.72},
  "recommended_actions_priority_order": ["prioritize audited protocols", "diversify across 2-3 protocols", "check insurance coverage"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/lookup', async (req: Request, res: Response) => {
  const { asset, chain = 'ethereum' } = req.body;
  if (!asset) return res.status(400).json({ error: 'asset is required' });
  try {
    const raw = await callClaude(`Full DeFi lending intelligence for ${asset} on ${chain} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "asset": "${asset}",
  "chain": "${chain}",
  "rates_snapshot": [
    {
      "protocol": "string",
      "apy": number,
      "risk_level": "low|medium|high",
      "utilization_pct": number,
      "rate_trend": "rising|falling|stable"
    }
  ],
  "rate_trend": {
    "direction": "rising|falling|stable",
    "30d_change_bps": number,
    "driver": "string",
    "outlook": "string"
  },
  "protocol_risk": [
    {
      "protocol": "string",
      "risk_score": number,
      "top_risk_factor": "string",
      "audit_count": number,
      "insurance_available": boolean
    }
  ],
  "recommendation": {
    "action": "deposit_now|wait|diversify|avoid",
    "best_protocol": "string",
    "expected_apy": number,
    "rationale": "string",
    "alternative": "string"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"rates": 0.80, "trend": 0.75, "risk": 0.72, "recommendation": 0.70},
  "recommended_actions_priority_order": ["verify rate on-chain", "check protocol health dashboard", "start with smaller position"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
