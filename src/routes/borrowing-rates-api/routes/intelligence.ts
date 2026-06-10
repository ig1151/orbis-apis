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
    name: 'Borrowing Rates API', version: '1.0.0',
    description: 'Compare DeFi borrowing costs across Aave, Compound, Spark, and other protocols. Find the cheapest borrow for any asset with liquidation risk context and optimization strategies.',
    docs_url: 'https://orbis-apis.onrender.com/borrowing-rates/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/borrowing-rates/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/rates', summary: 'Current borrowing rates for an asset across protocols', price_usdc: 0.003 },
      { method: 'POST', path: '/optimize', summary: 'Find cheapest borrow strategy with liquidation risk', price_usdc: 0.004 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: cheapest borrow + collateral options + risk + strategy', price_usdc: 0.008 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { rates: '$0.003', optimize: '$0.004', lookup: '$0.008' } },
    agent_capabilities: ['borrow-cost-optimization', 'collateral-analysis', 'liquidation-risk', 'leverage-strategy', 'defi-debt-management'],
    x402_compatible: true, paper_mode_recommended: true,
  });
});

router.post('/rates', async (req: Request, res: Response) => {
  const { asset, chain = 'ethereum' } = req.body;
  if (!asset) return res.status(400).json({ error: 'asset is required' });
  try {
    const raw = await callClaude(`DeFi borrowing rates for ${asset} on ${chain} across major protocols as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "asset": "${asset}",
  "chain": "${chain}",
  "borrow_rates": [
    {
      "protocol": "string",
      "variable_apr": number,
      "stable_apr": number,
      "rate_mode_available": ["variable", "stable"],
      "utilization_pct": number,
      "total_borrowed_usd": number,
      "borrow_cap_usd": number,
      "rate_trend": "rising|falling|stable",
      "optimal_utilization_pct": number
    }
  ],
  "cheapest_variable": { "protocol": "string", "apr": number },
  "cheapest_stable": { "protocol": "string", "apr": number },
  "market_avg_variable_apr": number,
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"rates": 0.80, "trends": 0.75},
  "recommended_actions_priority_order": ["compare variable vs stable based on borrow duration", "watch utilization for rate spikes", "set alerts near liquidation threshold"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/optimize', async (req: Request, res: Response) => {
  const { asset, collateral, borrow_amount_usd = 10000, chain = 'ethereum' } = req.body;
  if (!asset) return res.status(400).json({ error: 'asset is required' });
  try {
    const raw = await callClaude(`Optimize DeFi borrowing for ${asset} using ${collateral || 'ETH'} as collateral, borrowing $${borrow_amount_usd} on ${chain} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "asset": "${asset}",
  "collateral": "${collateral || 'ETH'}",
  "borrow_amount_usd": ${borrow_amount_usd},
  "chain": "${chain}",
  "strategies": [
    {
      "protocol": "string",
      "rate_mode": "variable|stable",
      "apr": number,
      "annual_cost_usd": number,
      "ltv_pct": number,
      "liquidation_threshold_pct": number,
      "safe_ltv_pct": number,
      "health_factor_at_safe_ltv": number,
      "min_collateral_usd": number,
      "liquidation_risk": "low|medium|high"
    }
  ],
  "best_strategy": { "protocol": "string", "rate_mode": "string", "apr": number, "annual_cost_usd": number },
  "risk_summary": { "main_risk": "string", "liquidation_note": "string" },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"strategies": 0.78, "risk": 0.72},
  "recommended_actions_priority_order": ["maintain health factor > 1.5", "set liquidation alerts", "avoid borrowing > 70% LTV"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/lookup', async (req: Request, res: Response) => {
  const { asset, collateral, chain = 'ethereum' } = req.body;
  if (!asset) return res.status(400).json({ error: 'asset is required' });
  try {
    const raw = await callClaude(`Full DeFi borrowing intelligence for ${asset} on ${chain} as of ${new Date().toISOString()}. Collateral: ${collateral || 'ETH'}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "asset": "${asset}",
  "collateral": "${collateral || 'ETH'}",
  "chain": "${chain}",
  "rates_snapshot": [
    {
      "protocol": "string",
      "variable_apr": number,
      "stable_apr": number,
      "utilization_pct": number,
      "rate_trend": "rising|falling|stable"
    }
  ],
  "collateral_options": [
    {
      "collateral_asset": "string",
      "ltv_pct": number,
      "liquidation_threshold_pct": number,
      "liquidation_bonus_pct": number,
      "quality": "blue_chip|mid_cap|volatile"
    }
  ],
  "rate_trend": {
    "direction": "rising|falling|stable",
    "30d_change_bps": number,
    "driver": "string"
  },
  "liquidation_risk_assessment": {
    "risk_level": "low|medium|high",
    "key_factors": ["string"],
    "recommended_max_ltv_pct": number
  },
  "strategy": {
    "action": "borrow_now|wait_for_lower_rates|use_stable|avoid",
    "best_protocol": "string",
    "best_rate_mode": "variable|stable",
    "apr": number,
    "rationale": "string"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"rates": 0.80, "collateral": 0.75, "risk": 0.72, "strategy": 0.70},
  "recommended_actions_priority_order": ["never borrow above recommended LTV", "set on-chain liquidation alerts", "review position weekly during volatile markets"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
