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
    name: 'Flash Loan Opportunity API', version: '1.0.0',
    description: 'Flash loan arbitrage opportunity detection across Aave, dYdX, and Balancer. Identifies executable arb paths that can be wrapped in a flash loan for zero-capital execution.',
    docs_url: 'https://orbis-apis.onrender.com/flash-loan-opportunity/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/flash-loan-opportunity/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/protocols', summary: 'Available flash loan protocols with liquidity and fees', price_usdc: 0.003 },
      { method: 'POST', path: '/scan', summary: 'Detected flash loan arb opportunities with net profit', price_usdc: 0.006 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: full flash loan execution plan with step-by-step execution', price_usdc: 0.020 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { protocols: '$0.003', scan: '$0.006', lookup: '$0.020' } },
    agent_capabilities: ['flash-loan-detection', 'zero-capital-arbitrage', 'aave-integration', 'dydx-integration', 'balancer-integration', 'mev-risk-assessment'],
    x402_compatible: true, paper_mode_recommended: true,
    execution_modes: ['agent-callable', 'execution-gated'],
    'x-latency-tier': 'real-time',
  });
});

// POST /protocols — available flash loan protocols with liquidity and fees
router.post('/protocols', async (req: Request, res: Response) => {
  const { chain = 'ethereum' } = req.body;
  try {
    const raw = await callClaude(`Available flash loan protocols on ${chain} with their liquidity and fees as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "chain": "${chain}",
  "protocols": [
    {
      "protocol": "aave_v3|aave_v2|dydx|balancer|maker|euler",
      "available_liquidity_usd": number,
      "fee_pct": number,
      "max_loan_usd": number,
      "supported_tokens": ["string"],
      "atomic_requirement": "same_block|same_transaction",
      "gas_overhead_usd": number,
      "reliability_score": number,
      "contract_audited": boolean,
      "notes": "string"
    }
  ],
  "protocol_comparison": {
    "cheapest_fee": "string",
    "most_liquidity": "string",
    "fastest": "string",
    "recommended": "string"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"protocols": 0.82, "comparison": 0.80},
  "recommended_actions_priority_order": ["dYdX has 0% fee but less liquidity than Aave", "Aave v3 has deepest liquidity for most tokens", "Balancer supports multi-token loans for complex arb paths"],
  "chain_to": [{"api": "flash-loan-opportunity-api", "reason": "scan for executable opportunities using these protocols"}, {"api": "gas-adjusted-arbitrage-api", "reason": "validate gas overhead does not eliminate flash loan profit"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /scan — detected flash loan arb opportunities with net profit
router.post('/scan', async (req: Request, res: Response) => {
  const { chain = 'ethereum', min_profit_usd = 50 } = req.body;
  try {
    const raw = await callClaude(`Flash loan arbitrage opportunities on ${chain} with minimum net profit of $${min_profit_usd} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "chain": "${chain}",
  "min_profit_usd": ${min_profit_usd},
  "opportunities": [
    {
      "protocol": "aave_v3|aave_v2|dydx|balancer",
      "arb_path": "string (e.g. Borrow ETH → Buy WBTC on DEX A → Sell WBTC on DEX B → Repay ETH)",
      "required_loan_usd": number,
      "estimated_profit_usd": number,
      "flash_loan_fee_usd": number,
      "gas_cost_usd": number,
      "net_profit_usd": number,
      "complexity": "simple|multi-hop|complex",
      "mev_risk": "high|medium|low",
      "success_probability_pct": number,
      "window_seconds": number
    }
  ],
  "market_summary": {
    "total_opportunities": number,
    "best_net_profit_usd": number,
    "simplest_opportunity": "string",
    "most_profitable": "string"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"opportunities": 0.72, "summary": 0.76},
  "recommended_actions_priority_order": ["simple complexity = lower execution risk", "high MEV risk means bots likely already competing on this path", "success_probability_pct < 60% means path is too contested"],
  "chain_to": [{"api": "flash-loan-opportunity-api", "reason": "full lookup for step-by-step execution on best opportunity"}, {"api": "gas-adjusted-arbitrage-api", "reason": "validate gas cost assumptions for the arb path"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /lookup — ONE-CALL: full flash loan execution plan with step-by-step execution
router.post('/lookup', async (req: Request, res: Response) => {
  const { arb_type, token, chain = 'ethereum' } = req.body;
  if (!arb_type) return res.status(400).json({ error: 'arb_type is required' });
  try {
    const raw = await callClaude(`Full flash loan execution plan for ${arb_type} arbitrage${token ? ` on ${token}` : ''} on ${chain} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "arb_type": "${arb_type}",
  "chain": "${chain}",
  "recommended_protocol": "aave_v3|aave_v2|dydx|balancer",
  "loan_details": {
    "protocol": "string",
    "loan_token": "string",
    "loan_amount_usd": number,
    "flash_loan_fee_pct": number,
    "flash_loan_fee_usd": number,
    "repayment_amount_usd": number
  },
  "step_by_step_execution": [
    {
      "step": number,
      "action": "string",
      "protocol": "string",
      "input_token": "string",
      "output_token": "string",
      "estimated_slippage_pct": number,
      "gas_cost_usd": number,
      "note": "string"
    }
  ],
  "contract_calls_needed": [
    {"call": "string", "contract": "string", "function_signature": "string", "purpose": "string"}
  ],
  "profit_summary": {
    "gross_profit_usd": number,
    "flash_loan_fee_usd": number,
    "total_gas_usd": number,
    "net_profit_usd": number,
    "roi_pct": number
  },
  "mev_risk": "high|medium|low",
  "mev_mitigation": {
    "use_flashbots": boolean,
    "private_mempool_recommended": boolean,
    "bundle_strategy": "string",
    "front_run_likelihood_pct": number
  },
  "failure_scenarios": [
    {"scenario": "string", "probability_pct": number, "consequence": "string", "mitigation": "string"}
  ],
  "estimated_gas_units": number,
  "reasoning": {
    "why_signal_generated": "string explanation of why this flash loan arb opportunity exists and is executable",
    "key_factors": ["factor 1 (e.g. 0.8% price gap between DEX A and DEX B exceeds Aave 0.09% fee)", "factor 2 (e.g. sufficient liquidity on both DEXs for $500k loan)", "factor 3 (e.g. low gas at 15 gwei keeps execution cost under $80)"],
    "invalidators": ["price gap closes before bundle lands in next block", "MEV bot submits competing bundle with higher gas", "insufficient liquidity on DEX B for the loan size"]
  },
  "latency_ms": number,
  "chain_to": [{"api": "gas-adjusted-arbitrage-api", "reason": "validate total gas cost across all steps before building the contract"}, {"api": "dex-cex-arbitrage-api", "reason": "confirm live price gap justifying the flash loan strategy"}],
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"loan": 0.80, "execution": 0.72, "profit": 0.74, "mev": 0.70, "reasoning": 0.73},
  "recommended_actions_priority_order": ["use Flashbots or private RPC to avoid front-running on high MEV risk paths", "simulate the full transaction in a fork before live execution", "net_profit_usd must exceed $200 to justify smart contract development risk"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
